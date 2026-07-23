/**
 * *La profondeur* — le deuxième temps de la chambre.
 *
 * Porté de `depth-gallery` (`src/Experience/Gallery.js`,
 * `src/Experience/Background/shaders/fragment.glsl`). Ce qui en vient :
 *
 * — **Le placement.** Les plans sont posés à `z = -index × écart`, et l'on
 *   avance dedans. La source déplaçait la caméra ; ici la caméra appartient au
 *   rig et ne bouge jamais — c'est le groupe qui vient vers elle. Le résultat
 *   est identique et le rig garde sa caméra unique, réglée à une unité monde
 *   pour un pixel écran.
 * — **Le fondu par profondeur.** À tout instant deux plans seulement portent
 *   de l'opacité : celui qu'on quitte et celui qu'on aborde, mélangés par la
 *   position exacte entre les deux. C'est ce qui évite l'empilement de
 *   transparences quand on traverse.
 * — **Le fond atmosphérique.** Deux taches molles animées sur des harmoniques
 *   incommensurables (1.000/1.618, 0.794/1.272) — donc sans battement
 *   perceptible —, adoucies vers le fond avant d'être posées, relevées par la
 *   vélocité du défilement, et grainées. Les couleurs viennent du monde
 *   chromatique du projet.
 *
 * Ce qui a été jeté : `Debug.js`, Tweakpane, le témoin de vélocité en DOM, et
 * les écouteurs `wheel`/`touchmove` de `Scroll.js` — le défilement du site est
 * tenu par Lenis et ScrollTrigger, pas par une seconde capture d'événements.
 */
import * as THREE from "three";
import { geometriePlan, type Fabrique, type Taille } from "../moteur";
import { couleurJeton } from "../couleurs";
import { BRUIT_SIMPLEXE, UV_COUVRANT } from "./bruit";
import type { NomCouleur } from "@/lib/jetons";
import { melanger, rattraper } from "@/lib/math";

const SOMMET = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

/** Le fond réactif. Repris du fragment de `depth-gallery`. */
const FRAGMENT_FOND = /* glsl */ `
  precision highp float;

  uniform vec3 uFond;
  uniform vec3 uTache1;
  uniform vec3 uTache2;
  uniform float uTemps;
  uniform float uVelocite;
  uniform float uGrain;
  uniform float uRayon;
  uniform float uRayonSecondaire;
  uniform float uForceTache;

  varying vec2 vUv;

  float hasard(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453123);
  }

  void main() {
    vec3 couleur = uFond;

    /* Les deux taches dérivent sur des fréquences sans rapport simple : la
       figure ne se répète jamais tout à fait, donc l'œil n'y voit pas de
       boucle. Les coefficients sont ceux de la source. */
    float t = uTemps * 0.00028;
    vec2 centre1 = vec2(
      0.50 + sin(t * 1.000) * 0.13 + sin(t * 1.618) * 0.05,
      0.48 + cos(t * 0.794) * 0.09 + cos(t * 1.272) * 0.03
    );
    vec2 centre2 = vec2(
      0.35 + cos(t * 0.927) * 0.11 + cos(t * 1.414) * 0.04,
      0.55 + sin(t * 1.175) * 0.07 + sin(t * 0.618) * 0.03
    );

    float tache1 = smoothstep(uRayon, 0.0, distance(vUv, centre1));
    float tache2 = smoothstep(uRayonSecondaire, 0.0, distance(vUv, centre2));

    /* Adoucies vers le fond avant d'être posées : sans ce mélange préalable,
       la tache tranche au lieu de baigner. */
    vec3 douce1 = mix(uTache1, uFond, 0.35);
    vec3 douce2 = mix(uTache2, uFond, 0.35);
    couleur = mix(couleur, douce1, tache1 * uForceTache);
    couleur = mix(couleur, douce2, tache2 * uForceTache);

    /* La vélocité laisse une traînée : le fond s'éclaire quand on court. */
    couleur += uVelocite * 0.10;

    float grain = hasard(vUv * vec2(1387.13, 947.91)) - 0.5;
    couleur += grain * uGrain;

    gl_FragColor = vec4(clamp(couleur, 0.0, 1.0), 1.0);
  }
`;

/**
 * Les plans du projet. Le grain argentique vient de `shader-on-scroll` : bruit
 * simplex sur les coordonnées écran, et déplacement d'UV proportionnel à la
 * vélocité du défilement — l'image se trouble quand on court, se repose quand
 * on s'arrête.
 */
const FRAGMENT_PLAN = /* glsl */ `
  precision highp float;

  uniform sampler2D uTexture;
  uniform vec2 uTaillePlan;
  uniform vec2 uTailleImage;
  uniform float uOpacite;
  uniform float uVelocite;
  uniform float uGrain;

  varying vec2 vUv;

  ${BRUIT_SIMPLEXE}
  ${UV_COUVRANT}

  void main() {
    vec2 uv = uvCouvrant(vUv, uTaillePlan, uTailleImage);

    float bruit = snoise(gl_FragCoord.xy);

    /* Le déplacement de la source, réduit : ici l'image est déjà en mouvement
       dans l'axe, il ne s'agit que de la faire vibrer. */
    uv += bruit * 0.006 * uVelocite;

    vec3 couleur = texture2D(uTexture, uv).rgb;

    /* Le grain se pose après l'image, comme à la prise de vue. */
    couleur += bruit * uGrain;

    gl_FragColor = vec4(couleur, uOpacite);
  }
`;

export type EtatProfondeur = {
  /** Progression du chapitre, 0 → 1, écrite par ScrollTrigger. */
  progression: number;
  /** Vélocité du défilement, normalisée. */
  velocite: number;
};

export type ReglagesProfondeur = {
  sources: string[];
  /** Le monde chromatique du projet. */
  monde: NomCouleur;
  etat: { current: EtatProfondeur };
};

/** Écart entre deux plans, en pixels monde. */
const ECART = 900;
/** Part de la hauteur du viewport occupée par un plan à z = 0. */
const PART_HAUTEUR = 0.7;

export function fabriquerProfondeur(reglages: ReglagesProfondeur): Fabrique {
  return ({ taille }) => {
    const groupe = new THREE.Group();
    const nombre = reglages.sources.length;

    const couleurMonde = couleurJeton(reglages.monde);
    const couleurEncre = couleurJeton("encre");
    const couleurPierre = couleurJeton("pierre");

    /* Le fond, à z = 0 et sans test de profondeur : il est peint le premier,
       toujours, et occupe exactement le viewport — une unité monde valant un
       pixel écran à cette distance. */
    const materiauFond = new THREE.ShaderMaterial({
      uniforms: {
        uFond: { value: couleurEncre.clone().lerp(couleurMonde, 0.35) },
        uTache1: { value: couleurMonde.clone() },
        uTache2: { value: couleurPierre.clone().lerp(couleurMonde, 0.6) },
        uTemps: { value: 0 },
        uVelocite: { value: 0 },
        uGrain: { value: 0.020 },
        uRayon: { value: 0.55 },
        uRayonSecondaire: { value: 0.42 },
        uForceTache: { value: 0.85 },
      },
      vertexShader: SOMMET,
      fragmentShader: FRAGMENT_FOND,
      depthTest: false,
      depthWrite: false,
    });
    const fond = new THREE.Mesh(geometriePlan(), materiauFond);
    fond.renderOrder = -10;
    fond.frustumCulled = false;
    groupe.add(fond);

    const chargeur = new THREE.TextureLoader();
    const textures: THREE.Texture[] = [];
    const plans: THREE.Mesh[] = [];
    const materiaux: THREE.ShaderMaterial[] = [];

    reglages.sources.forEach((source, index) => {
      const materiau = new THREE.ShaderMaterial({
        uniforms: {
          uTexture: { value: null },
          uTaillePlan: { value: new THREE.Vector2(1, 1) },
          uTailleImage: { value: new THREE.Vector2(1, 1) },
          uOpacite: { value: index === 0 ? 1 : 0 },
          uVelocite: { value: 0 },
          uGrain: { value: 0.016 },
        },
        vertexShader: SOMMET,
        fragmentShader: FRAGMENT_PLAN,
        transparent: true,
        depthTest: false,
        depthWrite: false,
      });

      chargeur.load(source, (texture) => {
        texture.colorSpace = THREE.NoColorSpace;
        texture.minFilter = THREE.LinearFilter;
        texture.generateMipmaps = false;
        materiau.uniforms.uTexture!.value = texture;
        materiau.uniforms.uTailleImage!.value.set(
          texture.image.width,
          texture.image.height,
        );
        textures.push(texture);
      });

      const plan = new THREE.Mesh(geometriePlan(), materiau);
      plan.position.z = -index * ECART;
      /* Le plus profond est peint en premier : l'alpha se compose de l'arrière
         vers l'avant, sans tampon de profondeur. */
      plan.renderOrder = -index;
      plan.frustumCulled = false;

      groupe.add(plan);
      plans.push(plan);
      materiaux.push(materiau);
    });

    /** Dimensionne le fond au viewport et les plans à leur part de hauteur. */
    const dimensionner = (t: Taille) => {
      fond.scale.set(t.largeur, t.hauteur, 1);

      const hauteur = t.hauteur * PART_HAUTEUR;
      plans.forEach((plan, index) => {
        const materiau = materiaux[index]!;
        const image = materiau.uniforms.uTailleImage!.value as THREE.Vector2;
        const rapport = image.x > 0 && image.y > 0 ? image.x / image.y : 0.8;
        const largeur = hauteur * rapport;
        plan.scale.set(largeur, hauteur, 1);
        materiau.uniforms.uTaillePlan!.value.set(largeur, hauteur);

        /* Aucun plan n'est centré, pas même le premier — traverser des images
           toutes posées sur l'axe donnerait un tunnel, et le site n'a rien de
           centré. Les décrochements sont dérivés du rang, donc stables d'une
           visite à l'autre, et jamais réguliers. */
        const decalages = [-0.13, 0.11, -0.06, 0.15, -0.09];
        const hauteurs = [0.05, -0.03, 0.07, -0.06, 0.02];
        plan.position.x = t.largeur * decalages[index % decalages.length]!;
        plan.position.y = t.hauteur * hauteurs[index % hauteurs.length]!;
      });
    };

    dimensionner(taille);

    let velociteLissee = 0;

    return {
      objet: groupe,
      /* Le groupe tient ses propres dimensions : le rig ne doit pas l'étirer
         à la taille de l'ancre. */
      ajusterEchelle: false,
      cadre: ({ temps, delta, taille: t, mouvementReduit: reduit }) => {
        const etat = reglages.etat.current;

        /* On avance dans la scène : le groupe vient vers la caméra. En bout de
           course, le dernier plan est à hauteur du premier. */
        const avance = etat.progression * (nombre - 1) * ECART;
        groupe.position.z = avance;

        velociteLissee = reduit
          ? 0
          : rattraper(velociteLissee, etat.velocite, 0.12, delta);

        materiauFond.uniforms.uTemps!.value = reduit ? 0 : temps * 1000;
        materiauFond.uniforms.uVelocite!.value = Math.min(
          1,
          Math.abs(velociteLissee),
        );

        /* Deux plans portent de l'opacité à la fois : celui qu'on quitte et
           celui qu'on aborde. */
        const place = etat.progression * (nombre - 1);
        const courant = Math.floor(place);
        const melange = place - courant;

        for (let i = 0; i < materiaux.length; i += 1) {
          const materiau = materiaux[i]!;
          let cible = 0;
          if (i === courant) cible = 1 - melange;
          if (i === courant + 1) cible = Math.max(cible, melange);
          /* Le dernier reste posé une fois atteint, sinon la fin du chapitre
             se vide. */
          if (i === nombre - 1 && place >= nombre - 1) cible = 1;

          const uniforme = materiau.uniforms.uOpacite!;
          uniforme.value = reduit
            ? cible
            : melanger(uniforme.value as number, cible, 0.12);
          materiau.uniforms.uVelocite!.value = velociteLissee;
        }

        /* Le fond suit le groupe pour rester collé au viewport. */
        fond.position.z = -avance;
        fond.scale.set(t.largeur, t.hauteur, 1);
      },
      redimensionne: dimensionner,
      liberer: () => {
        materiauFond.dispose();
        for (const materiau of materiaux) materiau.dispose();
        for (const texture of textures) texture.dispose();
      },
    };
  };
}
