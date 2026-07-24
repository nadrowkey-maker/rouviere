/**
 * Le bassin de la Villa Calcaire — le morceau de bravoure, une seule fois.
 *
 * Porté de `references/zip/waterwebgl-shader/src/script.ts`, qui est du WebGL2
 * brut. Ce qui en vient, à la ligne près :
 *
 * — **La simulation.** Équation d'onde sur grille, résolue en ping-pong sur
 *   deux cibles flottantes : `nv = (2c - p) + (l+r+u+d - 4c)·propagation`, puis
 *   amortissement global, puis amortissement de bord adouci sur `edgeWidth`.
 *   L'état tient dans deux canaux — hauteur courante en `r`, précédente en `g`.
 * — **La caustique.** C'est l'astuce centrale de la source, et elle ne se
 *   devine pas : la caustique n'est pas un bruit ni un `abs(sin())`, c'est la
 *   **compression d'aire de la carte des rayons réfractés**, donc le
 *   déterminant du jacobien de cette carte. D'où les dérivées secondes `hxx`,
 *   `hyy`, `hxy` et le `1/|det|`. C'est ce qui donne les nervures qui se
 *   croisent et s'illuminent au croisement, au lieu de rayures.
 * — **Le fond de sable**, en fbm avec déformation du domaine et bandes.
 * — **L'absorption par la profondeur**, exponentielle et par canal : le rouge
 *   part cinq fois plus vite que le bleu. C'est de la physique, pas une
 *   palette — le coefficient reste celui de la source.
 * — **Les deux soleils**, le Fresnel, le vignettage, l'exposition, le gamma.
 * — **Le pas de temps fixe** avec accumulateur et plafond de sous-pas : sans
 *   lui, la simulation explose sur une frame lente.
 * — **Le curseur fantôme**, dont le trajet est une somme de sinusoïdes
 *   incommensurables : il remue l'eau avant la première interaction et après
 *   une longue inaction, avec les mêmes gouttes qu'un vrai pointeur.
 *
 * Ce qui a été jeté : dat.GUI et toute la table `GROUPS` — les paramètres
 * réglés y sont figés en constantes GLSL ci-dessous, sous leurs noms d'origine
 * pour rester traçables —, les préréglages de démo, la fonction de
 * randomisation, le second contexte WebGL2 et sa boucle
 * `requestAnimationFrame`.
 *
 * Ce qui a changé : le contexte. La source ouvre le sien ; ici tout passe par
 * le renderer du rig, y compris les cibles de rendu. Le shader descend donc de
 * GLSL ES 3.00 à 1.00 — `texture()` devient `texture2D()`, `in`/`out`
 * redeviennent `varying`/`gl_FragColor`, et les boucles à borne dynamique
 * passent en test interne à borne constante, forme que GLSL ES 1.00 garantit.
 * Les couleurs, elles, viennent des jetons du site et non de la démo.
 */
import * as THREE from "three";
import type { ContexteRig, Fabrique, PlanScene } from "../moteur";
import { couleurJeton } from "../couleurs";
import { aleatoireAGraine } from "@/lib/aleatoire";

/** Nombre de gouttes injectables dans un même pas de simulation. */
const MAX_GOUTTES = 12;

/** Côté de la grille de simulation. `resolution` de la source. */
const RESOLUTION = 256;

/** `simRate` : la simulation avance à pas fixe, quelle que soit la cadence. */
const PAS = 1 / 60;
/** `maxSub` : plafond de rattrapage après une frame lente. */
const MAX_SOUS_PAS = 4;

/* --- Interaction, groupe « Interaction » de la source --- */
const BROSSE_RAYON = 0.032;
const BROSSE_BASE = 0.012;
const BROSSE_GAIN = 0.9;
const BROSSE_MAX = 0.09;
const CLIC_FORCE = 0.22;
const CLIC_RAYON = 0.05;

/* --- Gouttes ambiantes, groupe « Ambient » --- */
const AMBIANT_NOMBRE = 4;
const AMBIANT_FORCE = 0.018;
const AMBIANT_CADENCE = 1;
/** Secondes sans interaction au-delà desquelles les gouttes reprennent. */
const INACTIF = 2.2;
/** Les gouttes ambiantes s'atténuent tant que quelqu'un remue l'eau. */
const MULT_ACTIF = 0.45;

/**
 * Lissage de la vitesse du pointeur, par cadre.
 *
 * La vitesse brute d'une souris est un signal en dents de scie : un système
 * d'exploitation livre les positions par paquets, et une frame sur trois n'a
 * rien bougé. Prise telle quelle, elle ferait clignoter le gain de l'eau et
 * hacher l'injection de l'onde. Le coefficient est celui d'une interpolation
 * classique — 0,12 par cadre, soit une constante de temps d'environ un
 * huitième de seconde à soixante hertz : assez court pour que le geste
 * s'entende, assez long pour que le silence entre deux paquets ne s'entende
 * pas.
 */
const LISSAGE_VITESSE = 0.12;

/* --- Curseur fantôme, groupe « Attract » --- */
const FANTOME_RETOUR = 10;
const FANTOME_FONDU = 1.5;
const FANTOME_VITESSE = 4;
const FANTOME_GAIN = 2;

const TAU = 6.283185307;

const SOMMET = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

/**
 * Le pas de simulation. `UPDATE` de la source, ligne 143.
 * Les constantes sont celles du groupe « Simulation ».
 */
const FRAGMENT_SIMULATION = /* glsl */ `
  precision highp float;

  uniform sampler2D uState;
  uniform vec2 uTexel;
  uniform float uAspect;
  uniform int uDropCount;
  uniform vec4 uDrops[${MAX_GOUTTES}];

  varying vec2 vUv;

  const float uPropagation = 0.245;
  const float uDamping = 0.996;
  const float uEdgeWidth = 0.045;
  const float uEdgeDamp = 0.9;
  const float uClampH = 1.6;

  void main() {
    vec2 uv = vUv;
    float c = texture2D(uState, uv).r, p = texture2D(uState, uv).g;
    float l = texture2D(uState, uv - vec2(uTexel.x, 0.0)).r;
    float r = texture2D(uState, uv + vec2(uTexel.x, 0.0)).r;
    float u = texture2D(uState, uv + vec2(0.0, uTexel.y)).r;
    float d = texture2D(uState, uv - vec2(0.0, uTexel.y)).r;

    float nv = (2.0 * c - p) + (l + r + u + d - 4.0 * c) * uPropagation;
    nv *= uDamping;

    /* Borne constante et test interne : GLSL ES 1.00 n'admet pas de condition
       d'arret dynamique. La source, en 3.00, sortait par break. */
    for (int i = 0; i < ${MAX_GOUTTES}; i++) {
      if (i < uDropCount) {
        vec2 dp = uv - uDrops[i].xy;
        dp.x *= uAspect;
        float rr = uDrops[i].w;
        nv += uDrops[i].z * exp(-dot(dp, dp) / (rr * rr));
      }
    }

    /* Le bord absorbe au lieu de renvoyer : un bassin maçonné, pas une cuve. */
    vec2 e = min(uv, 1.0 - uv);
    nv *= mix(uEdgeDamp, 1.0, smoothstep(0.0, uEdgeWidth, min(e.x, e.y)));

    gl_FragColor = vec4(clamp(nv, -uClampH, uClampH), c, 0.0, 1.0);
  }
`;

/**
 * Le rendu. `RENDER` de la source, ligne 162. Les constantes reprennent les
 * valeurs réglées des groupes « Caustics », « Water », « Refraction », « Sun »,
 * « Fresnel », « Sand », « Noise » et « Post ». Seules les couleurs sont des
 * uniforms : elles viennent des jetons du site.
 */
const FRAGMENT_RENDU = /* glsl */ `
  precision highp float;

  uniform sampler2D uState;
  uniform vec2 uTexel;
  uniform vec2 uResolution;
  uniform float uTime;
  uniform float uAspect;

  uniform vec3 uVeinColor;
  uniform vec3 uDeepColor;
  uniform vec3 uGlintColor;
  uniform vec3 uSkyColor;
  uniform vec3 uSandHi;
  uniform vec3 uSandLo;

  varying vec2 vUv;

  const float uCausticA = 9.0;
  const float uDetFloor = 0.06;
  const float uClamp1 = 6.0;
  const float uContrast = 1.22;
  const float uClamp2 = 8.0;
  const float uFloorBase = 0.34;
  const float uCausticGain = 0.3;
  const float uVeinThresh = 1.0;
  const float uVeinGain = 0.1;

  const float uBaseDepth = 1.05;
  const float uDepthScale = 1.4;
  const float uDepthNoise = 2.0;
  const float uDepthNoiseAmp = 0.25;
  /* Coefficient d'absorption de l'eau, par canal. Physique, pas palette. */
  const vec3 uAbsorb = vec3(107.0, 33.0, 20.0) / 255.0;
  const float uAbsorbScale = 1.7;
  const float uDeepGain = 0.3;

  const float uParallax = 2.4;
  const float uNScale = 8.5;

  const vec3 uSun1 = vec3(0.3, 0.45, 0.82);
  const vec3 uSun2 = vec3(-0.5, 0.15, 0.78);
  const float uSpec1 = 150.0;
  const float uSpec2 = 70.0;
  const float uSpec2Gain = 0.35;
  const float uGlintGain = 0.85;

  const float uFresnelPow = 4.0;
  const float uFresnelGain = 0.22;

  const float uRippleScale = 6.5;
  const float uWarpScale = 3.0;
  const float uWarp = 0.6;
  const float uBandFreq = 9.0;
  const float uBandSkew = 4.0;
  const float uBandGain = 0.06;
  const float uGrainScale = 240.0;
  const float uGrainAmp = 0.045;

  const int uOctaves = 4;
  const float uLacunarity = 2.03;
  const float uGain = 0.5;

  const float uExposure = 1.55;
  const float uGrain = 0.022;
  const float uGamma = 0.4545;
  const float uVigOuter = 1.28;
  const float uVigInner = 0.32;
  const float uVigDark = 0.6;
  const float uVigBright = 1.05;

  float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  float vnoise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(i), b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0)), d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  float fbm(vec2 p) {
    float s = 0.0, a = 0.5;
    for (int i = 0; i < 8; i++) {
      if (i < uOctaves) {
        s += a * vnoise(p);
        p *= uLacunarity;
        a *= uGain;
      }
    }
    return s;
  }

  vec3 sand(vec2 uv) {
    vec2 p = uv * vec2(uAspect, 1.0);
    float rip = fbm(p * uRippleScale + fbm(p * uWarpScale) * uWarp);
    float band = 0.5 + 0.5 * sin(rip * uBandFreq + p.x * uBandSkew);
    vec3 b = mix(uSandHi, uSandLo, rip);
    b = mix(b, b * (1.0 + uBandGain), band);
    return b + (vnoise(p * uGrainScale) - 0.5) * uGrainAmp;
  }

  void main() {
    vec2 uv = vUv, t = uTexel;

    float hc = texture2D(uState, uv).r;
    float hl = texture2D(uState, uv - vec2(t.x, 0.0)).r;
    float hr = texture2D(uState, uv + vec2(t.x, 0.0)).r;
    float hu = texture2D(uState, uv + vec2(0.0, t.y)).r;
    float hd = texture2D(uState, uv - vec2(0.0, t.y)).r;
    float hpp = texture2D(uState, uv + t).r;
    float hmm = texture2D(uState, uv - t).r;
    float hpm = texture2D(uState, uv + vec2(t.x, -t.y)).r;
    float hmp = texture2D(uState, uv + vec2(-t.x, t.y)).r;

    float hx = (hr - hl) * 0.5, hy = (hu - hd) * 0.5;
    float hxx = hr - 2.0 * hc + hl;
    float hyy = hu - 2.0 * hc + hd;
    float hxy = (hpp - hpm - hmp + hmm) * 0.25;

    /* La caustique est la compression d'aire de la carte des rayons
       réfractés — le déterminant de son jacobien. */
    float jxx = 1.0 - uCausticA * hxx;
    float jyy = 1.0 - uCausticA * hyy;
    float jxy = -uCausticA * hxy;
    float det = jxx * jyy - jxy * jxy;
    float ca = clamp(1.0 / max(abs(det), uDetFloor), 0.0, uClamp1);
    ca = clamp(pow(ca, uContrast), 0.0, uClamp2);

    vec2 land = uv + vec2(hx, hy) * uParallax;
    vec3 col = sand(land) * (uFloorBase + ca * uCausticGain);
    col += uVeinColor * max(ca - uVeinThresh, 0.0) * uVeinGain;

    float depth = clamp(
      uBaseDepth - hc * uDepthScale + fbm(land * uDepthNoise) * uDepthNoiseAmp,
      0.2, 3.0);
    col *= exp(-uAbsorb * depth * uAbsorbScale);
    col += uDeepColor * depth * uDeepGain;

    vec3 N = normalize(vec3(-hx * uNScale, -hy * uNScale, 1.0));
    vec3 V = vec3(0.0, 0.0, 1.0);
    vec3 s1 = normalize(uSun1 + vec3(0.0, 0.0, 1e-4));
    vec3 s2 = normalize(uSun2 + vec3(0.0, 0.0, 1e-4));
    float sp = pow(max(dot(N, normalize(s1 + V)), 0.0), uSpec1)
             + pow(max(dot(N, normalize(s2 + V)), 0.0), uSpec2) * uSpec2Gain;
    col += sp * uGlintColor * uGlintGain;

    col = mix(col, uSkyColor, pow(1.0 - N.z, uFresnelPow) * uFresnelGain);
    col *= mix(uVigDark, uVigBright,
               smoothstep(uVigOuter, uVigInner,
                          length((uv - 0.5) * vec2(uAspect, 1.0))));

    col = vec3(1.0) - exp(-col * uExposure);
    col += (hash(uv * uResolution + fract(uTime)) - 0.5) * uGrain;

    gl_FragColor = vec4(pow(max(col, vec3(0.0)), vec3(uGamma)), 1.0);
  }
`;

export type EtatBassin = {
  /** Pointeur en coordonnées client, ou `null` hors du bassin. */
  pointeur: { x: number; y: number } | null;
  /** Incrémenté à chaque clic : le chapitre pousse, le shader consomme. */
  clics: number;
};

export type ReglagesBassin = {
  etat: { current: EtatBassin };
  /** La plaque affichée quand les cibles flottantes manquent. */
  repli: string;
  /**
   * La vitesse lissée du pointeur sur le bassin, en pixels par frame, remontée
   * à chaque cadre — `null` dès qu'il en est sorti.
   *
   * C'est **la même grandeur** qui creuse l'onde dans le shader et qui ouvre le
   * gain de l'eau : elle est calculée une fois, ici, et distribuée. Deux
   * mesures parallèles, si proches soient leurs formules, dériveraient — et on
   * entendrait de l'eau là où on n'en verrait pas.
   */
  onVitesse?: (vitesse: number | null) => void;
};

/** Une source de gouttes ambiantes : un point qui dérive et goutte. */
type Source = {
  px: number;
  py: number;
  ax: number;
  ay: number;
  sx: number;
  sy: number;
  phx: number;
  phy: number;
  prochaine: number;
  periode: number;
};

/**
 * Le bassin ne rend pas si les cibles flottantes manquent : il affiche la
 * plaque. C'est aussi ce que voit une machine sans WebGL2 — mais celle-là
 * n'arrive jamais jusqu'ici, le rig entier s'y éteint et le chapitre montre son
 * `<img>`.
 */
function planDeRepli(contexte: ContexteRig, source: string): PlanScene {
  const materiau = new THREE.MeshBasicMaterial({ transparent: true });
  materiau.opacity = 0;

  const chargeur = new THREE.TextureLoader();
  let texture: THREE.Texture | null = null;
  chargeur.load(source, (chargee) => {
    chargee.colorSpace = THREE.SRGBColorSpace;
    materiau.map = chargee;
    materiau.opacity = 1;
    materiau.needsUpdate = true;
    texture = chargee;
  });

  const plan = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), materiau);
  plan.frustumCulled = false;
  void contexte;

  return {
    objet: plan,
    liberer: () => {
      plan.geometry.dispose();
      materiau.dispose();
      texture?.dispose();
    },
  };
}

export function fabriquerBassin(reglages: ReglagesBassin): Fabrique {
  return (contexte) => {
    const { renderer } = contexte;

    /* La simulation écrit des hauteurs signées : il lui faut des cibles
       flottantes. Sans elles, on ne dégrade pas la simulation, on l'abandonne
       et on montre la plaque. */
    const flottantes =
      renderer.extensions.has("EXT_color_buffer_float") ||
      renderer.extensions.has("EXT_color_buffer_half_float");
    if (!flottantes) return planDeRepli(contexte, reglages.repli);

    // ---- Les deux cibles, en ping-pong ----------------------------------
    const faireCible = () =>
      new THREE.WebGLRenderTarget(RESOLUTION, RESOLUTION, {
        type: THREE.HalfFloatType,
        format: THREE.RGBAFormat,
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        wrapS: THREE.ClampToEdgeWrapping,
        wrapT: THREE.ClampToEdgeWrapping,
        depthBuffer: false,
        stencilBuffer: false,
        generateMipmaps: false,
      });

    const cibles: [THREE.WebGLRenderTarget, THREE.WebGLRenderTarget] = [
      faireCible(),
      faireCible(),
    ];
    let lecture = 0;

    // ---- La passe de simulation, hors de la scène du rig ----------------
    const gouttes: THREE.Vector4[] = Array.from(
      { length: MAX_GOUTTES },
      () => new THREE.Vector4(),
    );

    const materiauSimulation = new THREE.ShaderMaterial({
      uniforms: {
        uState: { value: null },
        uTexel: { value: new THREE.Vector2(1 / RESOLUTION, 1 / RESOLUTION) },
        uAspect: { value: 1 },
        uDropCount: { value: 0 },
        uDrops: { value: gouttes },
      },
      vertexShader: SOMMET,
      fragmentShader: FRAGMENT_SIMULATION,
      depthTest: false,
      depthWrite: false,
    });

    const geometrieSimulation = new THREE.PlaneGeometry(2, 2);
    const sceneSimulation = new THREE.Scene();
    sceneSimulation.add(new THREE.Mesh(geometrieSimulation, materiauSimulation));
    const cameraSimulation = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    // ---- La surface visible, dans la scène du rig -----------------------
    const materiauRendu = new THREE.ShaderMaterial({
      uniforms: {
        uState: { value: cibles[0].texture },
        uTexel: { value: new THREE.Vector2(1 / RESOLUTION, 1 / RESOLUTION) },
        uResolution: { value: new THREE.Vector2(1, 1) },
        uTime: { value: 0 },
        uAspect: { value: 1 },
        /* Les couleurs de l'eau : le sable est de la pierre de taille lavée, le
           fond est l'encre du site, le ciel et les nervures sont le sel (jeton
           conservé pour l'eau du bassin). Aucune valeur hors jetons. */
        uSandHi: { value: couleurJeton("pierre") },
        uSandLo: { value: couleurJeton("zinc") },
        uDeepColor: { value: couleurJeton("encre") },
        uSkyColor: { value: couleurJeton("sel") },
        uGlintColor: { value: couleurJeton("craie") },
        uVeinColor: { value: couleurJeton("sel") },
      },
      vertexShader: SOMMET,
      fragmentShader: FRAGMENT_RENDU,
      depthTest: false,
      depthWrite: false,
    });

    const geometrieRendu = new THREE.PlaneGeometry(1, 1);
    const surface = new THREE.Mesh(geometrieRendu, materiauRendu);
    surface.frustumCulled = false;
    surface.renderOrder = -5;

    // ---- Gouttes en attente ---------------------------------------------
    let enAttente: Array<[number, number, number, number]> = [];
    const enfiler = (x: number, y: number, force: number, rayon: number) => {
      if (enAttente.length < MAX_GOUTTES) enAttente.push([x, y, force, rayon]);
    };

    const televerserGouttes = (): number => {
      const n = Math.min(enAttente.length, MAX_GOUTTES);
      for (let k = 0; k < n; k += 1) {
        const [x, y, force, rayon] = enAttente[k]!;
        gouttes[k]!.set(x, y, force, rayon);
      }
      enAttente = [];
      return n;
    };

    // ---- Sources ambiantes ----------------------------------------------
    /* Le hasard est à graine : deux visites donnent la même pluie, et un
       redimensionnement ne rebat pas les cartes en cours de route. */
    const tirer = aleatoireAGraine(0x0a5104);
    const sources: Source[] = Array.from({ length: AMBIANT_NOMBRE }, () => ({
      px: 0.2 + 0.6 * tirer(),
      py: 0.2 + 0.6 * tirer(),
      ax: 0.1 + 0.1 * tirer(),
      ay: 0.1 + 0.1 * tirer(),
      sx: 0.05 + 0.08 * tirer(),
      sy: 0.05 + 0.08 * tirer(),
      phx: tirer() * TAU,
      phy: tirer() * TAU,
      prochaine: tirer() * 1.2,
      periode: 0.7 + tirer() * 1.1,
    }));

    // ---- État de l'interaction ------------------------------------------
    let temps = 0;
    let derniereInteraction = -1e9;
    let precedentX = 0.5;
    let precedentY = 0.5;
    let aPointeur = false;
    let clicsVus = reglages.etat.current.clics;
    /** Vitesse lissée du pointeur, en pixels par cadre. */
    let vitesse = 0;
    /** Dernière valeur remontée, pour ne pas répéter le `null` à vide. */
    let vitesseRemontee: number | null = null;

    /* Curseur fantôme : son enveloppe monte quand l'inaction dure. */
    let enveloppe = 0;
    let fantomeX = 0.5;
    let fantomeY = 0.5;
    let fantomeInitialise = false;

    let accumulateur = 0;
    let posee = false;

    const positionFantome = (t: number): [number, number] => {
      const s = FANTOME_VITESSE;
      const x =
        0.5 +
        0.3 * Math.sin(t * 0.037 * TAU * s) +
        0.12 * Math.sin(t * 0.011 * TAU * s + 1.7);
      const y =
        0.5 +
        0.28 * Math.cos(t * 0.043 * TAU * s) +
        0.13 * Math.cos(t * 0.017 * TAU * s + 4.1);
      return [
        Math.min(Math.max(x, 0.06), 0.94),
        Math.min(Math.max(y, 0.06), 0.94),
      ];
    };

    const collecterAmbiantes = (t: number, pas: number) => {
      const inactif = t - derniereInteraction > INACTIF;
      for (const source of sources) {
        source.prochaine -= pas;
        if (source.prochaine > 0) continue;
        source.prochaine =
          (source.periode / Math.max(AMBIANT_CADENCE, 0.05)) *
          (0.7 + tirer() * 0.6);
        const x = Math.min(
          Math.max(source.px + source.ax * Math.sin(t * source.sx * TAU + source.phx), 0.06),
          0.94,
        );
        const y = Math.min(
          Math.max(source.py + source.ay * Math.cos(t * source.sy * TAU + source.phy), 0.06),
          0.94,
        );
        enfiler(
          x,
          y,
          AMBIANT_FORCE * (inactif ? 1 : MULT_ACTIF),
          0.03 + tirer() * 0.02,
        );
      }
    };

    const collecterFantome = (t: number, pas: number) => {
      const engage = t - derniereInteraction > FANTOME_RETOUR;
      const vitesse = pas / Math.max(FANTOME_FONDU, 0.05);
      enveloppe += Math.max(
        -vitesse,
        Math.min(vitesse, (engage ? 1 : 0) - enveloppe),
      );

      const [gx, gy] = positionFantome(t);
      if (!fantomeInitialise) {
        fantomeX = gx;
        fantomeY = gy;
        fantomeInitialise = true;
      }
      if (enveloppe > 0.001) {
        const distance = Math.hypot(gx - fantomeX, gy - fantomeY);
        const force =
          Math.min(BROSSE_BASE + distance * BROSSE_GAIN, BROSSE_MAX) *
          enveloppe *
          FANTOME_GAIN;
        if (force > 1e-4) enfiler(gx, gy, force, BROSSE_RAYON);
      }
      fantomeX = gx;
      fantomeY = gy;
    };

    const avancer = (pas: number, aspect: number) => {
      collecterAmbiantes(temps, pas);
      collecterFantome(temps, pas);

      const nombre = televerserGouttes();
      const source = cibles[lecture]!;
      const destination = cibles[lecture ^ 1]!;

      materiauSimulation.uniforms.uState!.value = source.texture;
      materiauSimulation.uniforms.uAspect!.value = aspect;
      materiauSimulation.uniforms.uDropCount!.value = nombre;

      renderer.setRenderTarget(destination);
      renderer.render(sceneSimulation, cameraSimulation);
      renderer.setRenderTarget(null);

      lecture ^= 1;
      materiauRendu.uniforms.uState!.value = cibles[lecture]!.texture;
    };

    return {
      objet: surface,
      ajusterEchelle: false,

      cadre: ({ rect, delta, taille, mouvementReduit }) => {
        surface.scale.set(rect.width, rect.height, 1);

        const aspect = rect.height > 0 ? rect.width / rect.height : 1;
        materiauRendu.uniforms.uAspect!.value = aspect;
        materiauRendu.uniforms.uResolution!.value.set(
          rect.width * taille.dpr,
          rect.height * taille.dpr,
        );

        /* En mouvement réduit, on ne simule pas en continu : on jette de quoi
           rider la surface, on laisse l'onde s'établir une fois, et on
           n'avance plus jamais. L'écran reste une eau calme et détaillée,
           immobile. C'est une version, pas une punition. */
        if (mouvementReduit) {
          if (posee) return;
          posee = true;
          temps = 0;
          enfiler(0.36, 0.58, 0.18, 0.05);
          enfiler(0.67, 0.37, 0.14, 0.045);
          enfiler(0.52, 0.76, 0.1, 0.04);
          for (let i = 0; i < 120; i += 1) {
            temps += PAS;
            avancer(PAS, aspect);
          }
          return;
        }

        temps += delta / 1000;
        materiauRendu.uniforms.uTime!.value = temps;

        const etat = reglages.etat.current;

        /* Le pointeur, converti en coordonnées du bassin. Le rect vient de la
           passe de mesure : rien n'est lu dans le DOM ici. */
        if (etat.pointeur !== null && rect.width > 0 && rect.height > 0) {
          const x = Math.min(
            Math.max((etat.pointeur.x - rect.left) / rect.width, 0),
            1,
          );
          /* L'axe Y du DOM descend, celui de la texture monte. */
          const y = Math.min(
            Math.max(1 - (etat.pointeur.y - rect.top) / rect.height, 0),
            1,
          );

          /* La vitesse, mesurée en pixels d'écran et lissée. C'est cette
             valeur — et elle seule — qui creuse l'onde ci-dessous et qui ouvre
             le gain de l'eau : ce qu'on entend est exactement ce qu'on voit. */
          if (aPointeur) {
            const brute = Math.hypot(
              (x - precedentX) * rect.width,
              (y - precedentY) * rect.height,
            );
            vitesse += (brute - vitesse) * LISSAGE_VITESSE;
          } else {
            /* Première frame sous le pointeur : aucun déplacement à mesurer,
               et surtout aucun saut à injecter depuis la position précédente,
               qui date d'un autre endroit de l'écran. */
            vitesse = 0;
          }

          if (etat.clics !== clicsVus) {
            clicsVus = etat.clics;
            enfiler(x, y, CLIC_FORCE, CLIC_RAYON);
          } else if (aPointeur) {
            /* La force suit la vitesse de la main : effleurer ride, balayer
               creuse. La vitesse revient en fraction de la largeur, unité dans
               laquelle la brosse de la source est réglée. */
            const part = rect.width > 0 ? vitesse / rect.width : 0;
            enfiler(
              x,
              y,
              Math.min(BROSSE_BASE + part * BROSSE_GAIN, BROSSE_MAX),
              BROSSE_RAYON,
            );
          }

          precedentX = x;
          precedentY = y;
          aPointeur = true;
          derniereInteraction = temps;

          reglages.onVitesse?.(vitesse);
          vitesseRemontee = vitesse;
        } else {
          aPointeur = false;
          vitesse = 0;
          /* Le `null` ne part qu'une fois : c'est un ordre de fondu de sortie,
             pas un état à répéter soixante fois par seconde. */
          if (vitesseRemontee !== null) {
            vitesseRemontee = null;
            reglages.onVitesse?.(null);
          }
        }

        /* Pas de temps fixe : la simulation ne dépend pas de la cadence, et
           une frame lente est rattrapée en quatre sous-pas au plus, jamais
           plus — au-delà, on laisse filer plutôt que d'entrer dans la spirale
           où le rattrapage coûte plus cher que le retard. */
        let seconds = delta / 1000;
        if (seconds > 0.25) seconds = 0.25;
        accumulateur += seconds;

        let n = 0;
        while (accumulateur >= PAS && n < MAX_SOUS_PAS) {
          avancer(PAS, aspect);
          accumulateur -= PAS;
          n += 1;
        }
        if (n === 0) {
          avancer(PAS, aspect);
          accumulateur = 0;
        }
      },

      visibilite: (visible) => {
        /* On revient au bassin après l'avoir quitté : l'accumulateur est remis
           à zéro, sinon la première frame rattraperait le temps passé
           ailleurs et l'eau exploserait d'un coup. */
        if (visible) return;
        accumulateur = 0;
        /* Le chapitre sort de l'écran : le cadre ne sera plus appelé, et le
           gain de l'eau resterait figé sur sa dernière valeur. On le referme
           ici — sinon on emporterait le bruit du bassin dans le chapitre
           suivant. */
        vitesse = 0;
        aPointeur = false;
        if (vitesseRemontee !== null) {
          vitesseRemontee = null;
          reglages.onVitesse?.(null);
        }
      },

      liberer: () => {
        cibles[0].dispose();
        cibles[1].dispose();
        geometrieSimulation.dispose();
        geometrieRendu.dispose();
        materiauSimulation.dispose();
        materiauRendu.dispose();
      },
    };
  };
}
