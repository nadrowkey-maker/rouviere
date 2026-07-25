/**
 * Le matériau d'une pièce de l'enfilade.
 *
 * Deux effets de la bibliothèque se rejoignent ici, et rien n'est réécrit de
 * mémoire :
 *
 * — **`webgl-progressive-blur`** (`src/shaders/fragment.glsl`) donne la
 *   fonction de flou. Ce n'est pas un flou gaussien séparable : c'est un
 *   échantillonnage circulaire de quarante directions, deux prises par
 *   direction, chacune déplacée d'un `rand()` propre. Le bruit dans le rayon
 *   est ce qui empêche le flou de baguer sur un aplat — un gaussien à ce prix
 *   ferait des anneaux visibles sur le béton de chaux. On garde donc la boucle
 *   telle quelle, y compris `degrees()` appliqué à ce qui est déjà un angle :
 *   la conversion « de trop » disperse les directions au lieu de les répartir
 *   proprement sur le cercle, et c'est précisément ce qui donne son grain au
 *   flou. Corrigé, l'effet perd ce qu'on est venu chercher.
 *
 * — **`horizontal-parallax-gallery`** (`src/shaders/mediaFragment.glsl`) donne
 *   le `coverUv` et le parallaxe d'UV : la texture est réduite (`uEchelleUv`,
 *   0.85 à la source) pour ménager la marge dans laquelle elle glisse. L'image
 *   avance donc moins vite que son cadre, sans jamais découvrir le vide.
 *
 * Ce qui a changé : la source calculait son `gradient` sur `gl_FragCoord.y`,
 * pour une galerie qui défile verticalement — et le calcul y divisait deux fois
 * par la hauteur du viewport, si bien que le gradient valait en pratique une
 * constante. Ici l'enfilade est horizontale et le flou doit répondre à la
 * distance au centre de l'écran **et** au survol : la quantité de flou est donc
 * calculée en JavaScript, une fois par frame et par pièce, et entre par un
 * uniforme.
 */
import * as THREE from "three";
import { geometriePlan, type Fabrique, type Taille } from "../moteur";
import { adoucir, rattraper } from "@/lib/math";

const SOMMET = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAGMENT = /* glsl */ `
  precision highp float;

  uniform sampler2D uTexture;
  uniform vec2 uTaillePlan;
  uniform vec2 uTailleImage;
  uniform float uParallaxe;
  uniform float uEchelleUv;
  uniform float uFlou;
  uniform float uPresence;
  /* La fenêtre fixe : xy l'origine, zw l'échelle, en UV de la texture. */
  uniform vec4 uFenetre;
  uniform float uFenetreActive;

  varying vec2 vUv;

  /* Le rayon d'échantillonnage réglé à la main à la source. Il ne dépend pas
     de la taille du plan : c'est une fraction d'UV. */
  const float RAYON = 0.08;

  /* « object-fit: cover » en UV — identique dans les deux effets d'origine. */
  vec2 uvCouvrant(vec2 uv, vec2 plan, vec2 image) {
    vec2 rapport = vec2(
      min((plan.x / plan.y) / (image.x / image.y), 1.0),
      min((plan.y / plan.x) / (image.y / image.x), 1.0)
    );
    return vec2(
      uv.x * rapport.x + (1.0 - rapport.x) * 0.5,
      uv.y * rapport.y + (1.0 - rapport.y) * 0.5
    );
  }

  float hasard(vec2 co) {
    return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
  }

  vec3 prise(sampler2D image, vec2 uv) {
    return texture2D(image, uv).rgb;
  }

  vec3 flou(vec2 uv, sampler2D image, float quantite) {
    vec3 accumule = vec3(0.0);

    for (float i = 0.0; i < REPETITIONS; i++) {
      vec2 direction = vec2(
        cos(degrees((i / REPETITIONS) * 360.0)),
        sin(degrees((i / REPETITIONS) * 360.0))
      );

      vec2 q = direction * (hasard(vec2(i, uv.x + uv.y)) + RAYON);
      accumule += prise(image, uv + q * RAYON * quantite) / 2.0;

      q = direction * (hasard(vec2(i + 2.0, uv.x + uv.y + 24.0)) + RAYON);
      accumule += prise(image, uv + q * RAYON * quantite) / 2.0;
    }

    return accumule / REPETITIONS;
  }

  void main() {
    /* Deux régimes, et un seul uniforme les sépare — la branche est donc
       cohérente pour tout le plan.

       Le régime ordinaire : la pièce montre toute sa photographie, cadrée en
       cover dans sa boîte, avec le parallaxe d'UV.

       Le régime de fenêtre fixe, pour la dernière pièce seule : la pièce ne
       montre pas une photographie cadrée dans un cadre, elle montre **le
       morceau** d'une image plein écran immobile que son cadre laisse voir. Ce
       qu'on regarde ne bouge pas quand le couloir avance : c'est la fenêtre qui
       se déplace dessus. C'est ce qui permet à la sortie du chapitre de n'être
       qu'une ouverture de cadre, sans jamais redimensionner quoi que ce soit —
       l'image est déjà à sa taille finale depuis le début. */
    vec2 uv;

    if (uFenetreActive > 0.5) {
      uv = uFenetre.xy + vUv * uFenetre.zw;
    } else {
      uv = uvCouvrant(vUv, uTaillePlan, uTailleImage);

      /* Le parallaxe : l'image glisse dans la marge que lui laisse l'échelle. */
      uv.x += uParallaxe;
      uv -= 0.5;
      uv *= uEchelleUv;
      uv += 0.5;
    }

    /* Une pièce nette ne paie pas les quatre-vingts prises. La branche porte
       sur un uniforme : elle est cohérente pour tout le plan, donc gratuite. */
    vec3 couleur = uFlou < 0.002
      ? prise(uTexture, uv)
      : flou(uv, uTexture, uFlou);

    gl_FragColor = vec4(couleur, uPresence);
  }
`;

/** L'état partagé du chapitre, lu à chaque frame — jamais une prop React. */
export type EtatEnfilade = {
  /** Index de la pièce survolée, ou `null`. */
  survol: number | null;
  /**
   * Une pièce désignée par le parcours lui-même, et non par le pointeur : elle
   * prime sur le survol tant qu'elle est posée. Le plan de sortie s'en sert pour
   * rendre la dernière pièce franchement nette avant d'ouvrir son cadre — on ne
   * conclut pas un chapitre sur une image floue, et le doublon DOM qui prend le
   * relais, lui, est net.
   */
  fige: number | null;
};

export type ReglagesPiece = {
  source: string;
  index: number;
  etat: { current: EtatEnfilade };
  /** Nombre de directions échantillonnées. 40 à la source. */
  repetitions: number;
  /**
   * La pièce ne cadre pas sa photographie : elle est une fenêtre posée sur une
   * image plein écran immobile. Voir le fragment. Une seule pièce du couloir est
   * dans ce cas — la dernière, celle par laquelle on sort.
   */
  fenetreFixe?: boolean;
  /**
   * L'ancre DOM, uniquement pour le témoin de développement ci-dessous.
   * La scène ne la lit jamais : ses rects lui viennent du rig.
   */
  ancre?: { current: HTMLElement | null };
};

/**
 * En développement seulement, la quantité de flou est recopiée sur l'ancre en
 * `data-flou`. C'est ce qui permet de vérifier de l'extérieur — au ponçage,
 * dans un test — que la pièce survolée se fait nette et que ses voisines
 * reculent, sans avoir à mesurer des pixels de shader. L'écriture a lieu en
 * phase de rendu, la seule où l'on a le droit de toucher au DOM.
 */
const TEMOIN = process.env.NODE_ENV !== "production";

/* ------------------------------------------------------------------
   Le flou : une règle qu'on comprend sans avoir bougé la souris
   ------------------------------------------------------------------
   La quantité de flou était pilotée par une rampe linéaire de la distance au
   centre, puis écrasée par le survol : la pièce survolée tombait à zéro et
   **toutes** les autres prenaient un supplément fixe. Sans pointeur, rien ne
   distinguait franchement la pièce centrée de ses voisines ; avec le pointeur,
   c'était lui qui décidait de tout. La mécanique ne se lisait donc jamais.

   Elle est maintenant en deux étages, et l'ordre compte :

   1. **La position dans le cadre commande le flou de base.** Une courbe en S
      (`adoucir`) donne une vraie plage nette au centre, une vraie plage floue
      aux bords, et rien d'anguleux entre les deux. La pièce centrée est donc
      toujours nettement moins floue que ses voisines, pointeur ou pas.
   2. **Le curseur ne fait qu'accentuer, localement.** Il ne remplace pas le
      flou de base : il le divise sur la pièce qu'on regarde et l'augmente d'un
      cran sur les autres. Sans lui, la règle est déjà là ; avec lui, elle se
      creuse.
   ------------------------------------------------------------------ */

/** Flou de repos d'une pièce sortie du centre, en unités du shader. */
const FLOU_BORD = 1.15;
/**
 * Demi-largeur de la plage nette, en fraction de la largeur du cadre. En deçà,
 * la pièce est franchement nette : c'est elle qu'on regarde.
 */
const NET_JUSQUA = 0.1;
/** Au-delà, la pièce a pris tout son flou. */
const FLOU_DES = 0.4;
/**
 * La pièce que le pointeur désigne devient **franchement nette**, où qu'elle
 * soit dans le cadre.
 *
 * Elle ne gardait qu'une fraction de son flou de base, ce qui suffisait au
 * centre du cadre mais laissait floue une pièce désignée près d'un bord — la
 * première du couloir, en particulier, ne passe jamais par le centre et restait
 * donc trouble quoi qu'on fasse. Une image qu'on désigne et qui refuse de se
 * faire nette se lit comme une panne, pas comme une règle. Le premier étage — la
 * position dans le cadre — continue de tenir la mécanique tant que personne n'a
 * bougé la souris ; le pointeur, lui, tranche.
 */
const ACCENT_NETTETE = 0;
/** Supplément pris par les autres pièces pendant qu'on en survole une. */
const ACCENT_VOISINE = 0.45;
/** Décalage d'UV maximal du parallaxe — `parallaxIntensity` de la source. */
const INTENSITE_PARALLAXE = 0.4;

/**
 * Réduction d'UV du parallaxe — `uEchelleUv`, 0.85 à la source. La texture est
 * échantillonnée sur 85 % de sa surface pour ménager la marge dans laquelle
 * elle glisse, ce qui la **magnifie** d'autant à l'écran.
 *
 * Elle ne s'applique pas à la pièce en fenêtre fixe : celle-là ne cadre pas une
 * image, elle en montre un morceau à la taille exacte où le plan de sortie le
 * reprendra.
 */
const ECHELLE_UV = 0.85;

export function fabriquerPiece(reglages: ReglagesPiece): Fabrique {
  return ({ mouvementReduit, pointeurGrossier }) => {
    const materiau = new THREE.ShaderMaterial({
      uniforms: {
        uTexture: { value: null },
        uTaillePlan: { value: new THREE.Vector2(1, 1) },
        uTailleImage: { value: new THREE.Vector2(1, 1) },
        uParallaxe: { value: 0 },
        uEchelleUv: { value: ECHELLE_UV },
        uFlou: { value: 0 },
        uPresence: { value: 1 },
        uFenetre: { value: new THREE.Vector4(0, 0, 1, 1) },
        uFenetreActive: { value: reglages.fenetreFixe === true ? 1 : 0 },
      },
      defines: {
        /* Le shader coûte deux prises de texture par répétition. Quarante sur
           une machine de bureau, seize sur un pointeur grossier : le budget
           impose 30 ips au plancher sur un iPhone 12. */
        REPETITIONS: `${pointeurGrossier ? 16 : reglages.repetitions}.0`,
      },
      vertexShader: SOMMET,
      fragmentShader: FRAGMENT,
      transparent: true,
    });

    const maillage = new THREE.Mesh(geometriePlan(), materiau);
    maillage.frustumCulled = false;

    let texture: THREE.Texture | null = null;

    const chargeur = new THREE.TextureLoader();
    chargeur.load(reglages.source, (chargee) => {
      /* Pas de conversion d'espace colorimétrique : un `ShaderMaterial` écrit
         ses valeurs telles quelles, et l'image doit sortir identique à ce que
         le navigateur peindrait pour le même fichier en DOM. Voir couleurs.ts. */
      chargee.colorSpace = THREE.NoColorSpace;
      chargee.minFilter = THREE.LinearFilter;
      chargee.generateMipmaps = false;
      /* Le flou échantillonne au-delà des bords : sans pinces, il ramène le
         bord opposé et l'image se replie sur elle-même. */
      chargee.wrapS = THREE.ClampToEdgeWrapping;
      chargee.wrapT = THREE.ClampToEdgeWrapping;
      texture = chargee;
      materiau.uniforms.uTexture!.value = chargee;
      materiau.uniforms.uTailleImage!.value.set(
        chargee.image.width,
        chargee.image.height,
      );
    });

    let flouActuel = mouvementReduit ? 0 : FLOU_BORD;

    return {
      objet: maillage,
      cadre: ({ rect, taille, delta }) => {
        materiau.uniforms.uTaillePlan!.value.set(rect.width, rect.height);

        /* Position de la pièce dans l'écran, de -1 (sortie à gauche) à 1
           (sortie à droite). Le rect vient de la passe de mesure du rig : le
           chapitre ne lit jamais le DOM lui-même. */
        const centre = rect.left + rect.width / 2;
        const ecart = (centre - taille.largeur / 2) / taille.largeur;

        materiau.uniforms.uParallaxe!.value = ecart * INTENSITE_PARALLAXE;

        /* La fenêtre fixe. On calcule, une fois par frame, la portion de
           l'image plein écran que ce cadre-ci laisse voir.

           L'image plein écran est rendue en `cover` sur le cadre entier : sa
           largeur rendue vaut `max(largeurCadre, hauteurCadre × rapport)`, et
           elle est centrée. Le rect de la pièce, ramené dans ce repère, donne
           directement l'origine et l'échelle en UV. La coordonnée verticale
           s'inverse au passage — l'écran compte vers le bas, la texture vers le
           haut.

           Aucune lecture du DOM ici : le rect vient de la passe de mesure du
           rig, comme partout ailleurs. */
        if (reglages.fenetreFixe === true) {
          const image = materiau.uniforms.uTailleImage!.value as THREE.Vector2;
          const rapport = image.y === 0 ? 1 : image.x / image.y;
          const rendueL = Math.max(taille.largeur, taille.hauteur * rapport);
          const rendueH = rendueL / rapport;
          const origineX = (taille.largeur - rendueL) / 2;
          const origineY = (taille.hauteur - rendueH) / 2;

          const fenetre = materiau.uniforms.uFenetre!.value as THREE.Vector4;
          fenetre.set(
            (rect.left - origineX) / rendueL,
            1 - (rect.top - origineY + rect.height) / rendueH,
            rect.width / rendueL,
            rect.height / rendueH,
          );
        }

        /* Premier étage : la position dans le cadre. Plage nette au centre,
           plage floue aux bords, courbe en S entre les deux. C'est la seule
           chose qui joue tant que personne n'a bougé la souris — et elle
           suffit à ce qu'on voie la règle. */
        let cible =
          adoucir(Math.abs(ecart), NET_JUSQUA, FLOU_DES) * FLOU_BORD;

        /* Second étage : le pointeur — ou le parcours, quand il fige une pièce
           pour conclure — désigne une pièce. Elle se fait nette, les autres
           prennent un cran de plus. */
        const survol = reglages.etat.current.fige ?? reglages.etat.current.survol;
        if (survol !== null) {
          cible =
            survol === reglages.index
              ? cible * ACCENT_NETTETE
              : cible + ACCENT_VOISINE;
        }

        if (mouvementReduit) {
          flouActuel = cible;
        } else {
          flouActuel = rattraper(flouActuel, cible, 0.12, delta);
        }
        materiau.uniforms.uFlou!.value = flouActuel;

        if (TEMOIN) {
          const noeud = reglages.ancre?.current;
          if (noeud !== null && noeud !== undefined) {
            noeud.dataset.flou = flouActuel.toFixed(3);
          }
        }
      },
      redimensionne: (taille: Taille) => {
        materiau.uniforms.uTaillePlan!.value.set(taille.largeur, taille.hauteur);
      },
      liberer: () => {
        materiau.dispose();
        texture?.dispose();
      },
    };
  };
}
