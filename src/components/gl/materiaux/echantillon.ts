/**
 * Un échantillon de matière — le premier temps du chapitre *La Matière*.
 *
 * Porté de `references/zip/shadow/src/script.js`. Ce qui en vient, et qui est
 * tout l'intérêt de l'effet :
 *
 * — **Le soulèvement.** Le vertex shader mesure la distance du sommet au point
 *   sous le curseur, en repère monde, et remonte `position.z` de
 *   `easeInOutCubic(1 - dist/rayon)`. La cubique compte : une interpolation
 *   linéaire donne un cône, un `smoothstep` une bosse molle. La cubique en S
 *   donne le pli d'une feuille qu'on pince — plate au loin, plate au sommet,
 *   cassée entre les deux.
 * — **L'effacement de l'ombre.** Le fragment de l'ombre mappe cette même
 *   distance sur l'alpha de sa texture : l'ombre disparaît exactement là où la
 *   matière se décolle. Un seul scalaire tient les deux moitiés de l'effet,
 *   c'est ce qui rend le geste crédible.
 * — **Les proportions.** La source travaille sur un plan de 15 unités avec un
 *   rayon d'influence de 3 et un soulèvement de 1 — un cinquième et un
 *   quinzième du côté. Ces deux rapports sont repris tels quels ; c'est eux qui
 *   sont réglés, pas les valeurs absolues.
 * — **Les deux plans coplanaires.** La matière et son ombre partagent la même
 *   géométrie et la même inclinaison ; seuls les sommets de la matière montent,
 *   l'ombre reste et s'efface. C'est le montage exact de la source.
 *
 * Ce qui a changé par rapport à la source :
 *
 * — **Un échantillon par ancre DOM.** La démo a un plan unique et le raycaste.
 *   Ici chaque plaque double une figure du chapitre : le rig la place et la met
 *   à l'échelle de la figure (« le HTML garde la mise en page ; le WebGL se cale
 *   dessus »), et les trois s'alignent d'eux-mêmes sur leurs légendes. Le
 *   soulèvement se déclenche tout seul par la distance monde — la plaque que le
 *   pointeur survole est la seule dont les sommets sont dans le rayon.
 * — **Un chemin clavier.** L'effet d'origine n'existe que sous le pointeur ; le
 *   focus d'une plaque soulève la sienne, sans quoi le chapitre n'existerait pas
 *   pour qui n'a pas de souris.
 *
 * Ce qui a été jeté : le second contexte WebGL et sa boucle
 * `requestAnimationFrame` (inscription au rig), la caméra orthographique propre
 * à l'effet (le rig n'en a qu'une), le `type: "t"` obsolète des uniforms, et les
 * deux textures base64 de la démo, qui portent son illustration et non une
 * matière.
 */
import * as THREE from "three";
import type { Fabrique } from "../moteur";
import { rattraper } from "@/lib/math";

export type EtatMatiere = {
  /** Position du pointeur en coordonnées client, ou `null` s'il est sorti. */
  pointeur: { x: number; y: number } | null;
  /** Index de l'échantillon au focus clavier, ou `null`. */
  focus: number | null;
};

export type ReglagesEchantillon = {
  texture: string;
  ombre: string;
  index: number;
  etat: { current: EtatMatiere };
};

/* --- Les rapports de la source, sur un plan de 15 unités --- */
/** Rayon d'influence du curseur : 3 / 15 du côté de la plaque. */
const PART_RAYON = 3 / 15;
/** Hauteur du soulèvement : 1 / 15 du côté. */
const PART_HAUTEUR = 1 / 15;

/**
 * L'inclinaison et l'angle de chaque plaque, dérivés du rang : une plaque posée
 * sur un établi, jamais rangée d'équerre, mais stable d'une visite à l'autre.
 * La source pose `rotation.z = π/4` — un losange, la mise en scène isométrique ;
 * trois plaques toutes à 45° feraient un motif, posées de travers elles font un
 * établi.
 */
const INCLINAISONS = [-0.16, -0.1, -0.22];
const ANGLES = [-0.12, 0.08, -0.17];

/** Segments par côté, comme la source : assez pour que le pli ne facette pas. */
const SEGMENTS = 96;

/** Vitesse à laquelle le point de pincement rattrape sa cible. */
const SUIVI = 0.16;

const SOMMET_MATIERE = /* glsl */ `
  varying vec2 vUv;
  uniform vec3 uDisplacement;
  uniform float uRayon;
  uniform float uHauteur;

  float easeInOutCubic(float x) {
    return x < 0.5 ? 4. * x * x * x : 1. - pow(-2. * x + 2., 3.) / 2.;
  }

  float map(float value, float min1, float max1, float min2, float max2) {
    return min2 + (value - min1) * (max2 - min2) / (max1 - min1);
  }

  void main() {
    vUv = uv;
    vec3 new_position = position;

    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    float dist = length(uDisplacement - worldPosition.xyz);

    if (dist < uRayon) {
      float distance_mapped = map(dist, 0., uRayon, 1., 0.);
      new_position.z += easeInOutCubic(distance_mapped) * uHauteur;
    }

    gl_Position = projectionMatrix * modelViewMatrix * vec4(new_position, 1.0);
  }
`;

const FRAGMENT_MATIERE = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uTexture;
  uniform float uOpacite;

  void main() {
    vec4 couleur = texture2D(uTexture, vUv);
    gl_FragColor = vec4(couleur.rgb, couleur.a * uOpacite);
  }
`;

const SOMMET_OMBRE = /* glsl */ `
  varying vec2 vUv;
  varying float dist;
  uniform vec3 uDisplacement;

  void main() {
    vUv = uv;
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    dist = length(uDisplacement - worldPosition.xyz);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAGMENT_OMBRE = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  varying float dist;
  uniform sampler2D uTexture;
  uniform float uRayon;
  uniform float uOpacite;

  float map(float value, float min1, float max1, float min2, float max2) {
    return min2 + (value - min1) * (max2 - min2) / (max1 - min1);
  }

  void main() {
    vec4 couleur = texture2D(uTexture, vUv);

    /* L'ombre s'efface à mesure que la matière se décolle : à distance nulle
       du pincement elle vaut zéro, au bord du rayon elle est intacte. */
    if (dist < uRayon) {
      couleur.a = map(dist, uRayon, 0., couleur.a, 0.);
    }

    gl_FragColor = vec4(couleur.rgb, couleur.a * uOpacite);
  }
`;

export function fabriquerEchantillon(reglages: ReglagesEchantillon): Fabrique {
  return ({ camera }) => {
    const index = reglages.index;
    const groupe = new THREE.Group();
    groupe.rotation.x = INCLINAISONS[index % INCLINAISONS.length]!;
    groupe.rotation.z = ANGLES[index % ANGLES.length]!;

    const chargeur = new THREE.TextureLoader();
    const textures: THREE.Texture[] = [];
    const chargerDans = (source: string, materiau: THREE.ShaderMaterial) => {
      chargeur.load(source, (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        texture.anisotropy = 4;
        materiau.uniforms.uTexture!.value = texture;
        textures.push(texture);
      });
    };

    /* Le point de pincement, en repère monde. Part au loin : plaque au repos. */
    const deplacement = new THREE.Vector3(0, 0, -1e5);

    const materiauOmbre = new THREE.ShaderMaterial({
      uniforms: {
        uTexture: { value: null },
        uDisplacement: { value: deplacement },
        uRayon: { value: 1 },
        uOpacite: { value: 1 },
      },
      vertexShader: SOMMET_OMBRE,
      fragmentShader: FRAGMENT_OMBRE,
      transparent: true,
      depthWrite: false,
      depthTest: false,
    });
    chargerDans(reglages.ombre, materiauOmbre);

    const materiauMatiere = new THREE.ShaderMaterial({
      uniforms: {
        uTexture: { value: null },
        uDisplacement: { value: deplacement },
        uRayon: { value: 1 },
        uHauteur: { value: 0 },
        uOpacite: { value: 1 },
      },
      vertexShader: SOMMET_MATIERE,
      fragmentShader: FRAGMENT_MATIERE,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      /* La plaque se soulève : on en voit la tranche par en dessous quand le
         pli passe le bord. */
      side: THREE.DoubleSide,
    });
    chargerDans(reglages.texture, materiauMatiere);

    /* Le plan unitaire partagé du rig n'a qu'un segment : le pli faceterait.
       Celui-ci est dense et propre à la plaque — c'est la seule géométrie du
       site qui a besoin de subdivision. */
    const geometrie = new THREE.PlaneGeometry(1, 1, SEGMENTS, SEGMENTS);

    const ombre = new THREE.Mesh(geometrie, materiauOmbre);
    const matiere = new THREE.Mesh(geometrie, materiauMatiere);
    /* Sans tampon de profondeur, l'ordre de peinture fait l'empilement :
       l'ombre d'abord, la matière par-dessus. */
    ombre.renderOrder = 0;
    matiere.renderOrder = 1;
    ombre.frustumCulled = false;
    matiere.frustumCulled = false;
    groupe.add(ombre, matiere);

    /* Le plan de la plaque en repère monde, pour y projeter le pointeur. La
       source posait un maillage invisible et le raycastait ; un plan
       mathématique donne le même point sans maillage ni intersection allouée. */
    const rayon = new THREE.Raycaster();
    const planMonde = new THREE.Plane();
    const normale = new THREE.Vector3();
    const origine = new THREE.Vector3();
    const impact = new THREE.Vector3();
    const ndc = new THREE.Vector2();
    const cible = new THREE.Vector3(0, 0, -1e5);

    let cote = 0;

    return {
      objet: groupe,
      /* Le rig met le groupe à l'échelle de la figure : la plaque couvre
         exactement l'échantillon DOM, et le soulèvement reste un quinzième de
         son côté quelle que soit la taille à l'écran. */

      cadre: ({ rect, taille, delta, mouvementReduit }) => {
        /* Le côté vaut la plus petite dimension de la figure : la plaque est
           carrée dans une figure qui peut ne pas l'être. Le rig a déjà posé
           l'échelle du groupe (largeur, hauteur, 1) ; on en déduit le rayon et
           la hauteur du pli en pixels monde. */
        cote = Math.min(rect.width, rect.height);
        materiauMatiere.uniforms.uRayon!.value = cote * PART_RAYON;
        materiauMatiere.uniforms.uHauteur!.value = cote * PART_HAUTEUR;
        materiauOmbre.uniforms.uRayon!.value = cote * PART_RAYON;

        const etat = reglages.etat.current;

        /* Les matrices monde sont recalculées au rendu, donc après ce cadre :
           le rig vient de poser position et échelle, on force la mise à jour
           pour projeter sur la plaque de cette frame, pas de la précédente. */
        groupe.updateMatrixWorld(true);

        if (etat.focus !== null) {
          /* Le focus clavier commande seul : la plaque au focus se soulève en
             son centre, les autres se reposent. */
          if (etat.focus === index) {
            groupe.getWorldPosition(cible);
          } else {
            cible.set(0, 0, -1e5);
          }
        } else if (etat.pointeur !== null) {
          normale.set(0, 0, 1).applyQuaternion(groupe.quaternion).normalize();
          groupe.getWorldPosition(origine);
          planMonde.setFromNormalAndCoplanarPoint(normale, origine);

          ndc.set(
            (etat.pointeur.x / taille.largeur) * 2 - 1,
            -(etat.pointeur.y / taille.hauteur) * 2 + 1,
          );
          rayon.setFromCamera(ndc, camera);

          /* Le pointeur est projeté sur le plan de CETTE plaque. S'il survole
             une voisine, le point tombe hors du rayon et rien ne se lève : le
             gate par distance monde suffit, aucune logique de sélection. */
          if (rayon.ray.intersectPlane(planMonde, impact) !== null) {
            cible.copy(impact);
          } else {
            cible.set(0, 0, -1e5);
          }
        } else {
          cible.set(0, 0, -1e5);
        }

        if (mouvementReduit) {
          deplacement.copy(cible);
        } else {
          deplacement.x = rattraper(deplacement.x, cible.x, SUIVI, delta);
          deplacement.y = rattraper(deplacement.y, cible.y, SUIVI, delta);
          deplacement.z = rattraper(deplacement.z, cible.z, SUIVI, delta);
        }
      },

      liberer: () => {
        geometrie.dispose();
        materiauMatiere.dispose();
        materiauOmbre.dispose();
        for (const texture of textures) texture.dispose();
      },
    };
  };
}
