/**
 * Les actifs du chapitre *La Matière*.
 *
 * Trois échantillons de matière, leur ombre portée commune, et la plaque de
 * repli du bassin. Rien ici n'est une photographie : ce sont des surfaces
 * calculées, et c'est volontaire — un échantillon de lin ou de chaux ferrée est
 * une texture, pas une image de bâtiment. Les photographies du Livre V ne les
 * remplaceront pas.
 *
 * Pourquoi ce fichier existe plutôt qu'une extraction. La mission demandait
 * d'extraire les deux textures base64 de `references/zip/shadow/src/index.html`.
 * Elles en sont bien sorties (2048², RGBA) — et elles portent le mot « HAPPY
 * DAYS » suivi d'un visage souriant. C'est l'illustration de la démo, pas une
 * matière, et l'émoji est interdit partout dans ce site. On garde donc du
 * `shadow` ce qui a de la valeur — le mécanisme, dans `materiaux/echantillon.ts`
 * — et on fabrique ici les surfaces qu'il lui faut.
 *
 * Les couleurs sont lues dans `src/styles/tokens.css`. Aucune valeur
 * chromatique n'est écrite dans ce fichier.
 *
 *   node scripts/echantillons.mjs
 */
import { deflateSync } from "node:zlib";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const RACINE = join(dirname(fileURLToPath(import.meta.url)), "..");

// ---------------------------------------------------------------------------
// Encodage PNG — même schéma que `planches.mjs`, avec l'alpha en plus.
// ---------------------------------------------------------------------------

const TABLE_CRC = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(octets) {
  let c = -1;
  for (let i = 0; i < octets.length; i += 1) {
    c = TABLE_CRC[(c ^ octets[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ -1) >>> 0;
}

function bloc(type, donnees) {
  const nom = Buffer.from(type, "ascii");
  const corps = Buffer.concat([nom, donnees]);
  const entete = Buffer.alloc(4);
  entete.writeUInt32BE(donnees.length, 0);
  const somme = Buffer.alloc(4);
  somme.writeUInt32BE(crc32(corps), 0);
  return Buffer.concat([entete, corps, somme]);
}

/**
 * `canaux` vaut 3 (RGB) ou 4 (RGBA). Le filtrage par ligne est celui de
 * `planches.mjs` : « Sub » sur la première ligne, « Up » sur les suivantes.
 * Sur une matière, deux lignes voisines se ressemblent beaucoup — la différence
 * est presque nulle et le flux se compresse.
 */
function encoderPng(largeur, hauteur, pixels, canaux) {
  const pas = largeur * canaux;
  const lignes = Buffer.alloc(hauteur * (pas + 1));

  for (let y = 0; y < hauteur; y += 1) {
    const source = y * pas;
    const cible = y * (pas + 1);

    if (y === 0) {
      lignes[cible] = 1;
      for (let i = 0; i < pas; i += 1) {
        const gauche = i >= canaux ? pixels[source + i - canaux] : 0;
        lignes[cible + 1 + i] = (pixels[source + i] - gauche) & 0xff;
      }
    } else {
      lignes[cible] = 2;
      for (let i = 0; i < pas; i += 1) {
        lignes[cible + 1 + i] =
          (pixels[source + i] - pixels[source - pas + i]) & 0xff;
      }
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(largeur, 0);
  ihdr.writeUInt32BE(hauteur, 4);
  ihdr[8] = 8;
  ihdr[9] = canaux === 4 ? 6 : 2;

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    bloc("IHDR", ihdr),
    bloc("IDAT", deflateSync(lignes, { level: 9 })),
    bloc("IEND", Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------------------
// Outils
// ---------------------------------------------------------------------------

function lireJetons() {
  const css = readFileSync(join(RACINE, "src/styles/tokens.css"), "utf8");
  const jetons = {};
  for (const [, nom, hex] of css.matchAll(
    /--color-([a-z-]+):\s*#([0-9a-fA-F]{6})/g,
  )) {
    jetons[nom] = [
      parseInt(hex.slice(0, 2), 16),
      parseInt(hex.slice(2, 4), 16),
      parseInt(hex.slice(4, 6), 16),
    ];
  }
  return jetons;
}

const borne01 = (v) => Math.max(0, Math.min(1, v));
const melanger = (a, b, t) => a + (b - a) * t;
const lisser = (t) => t * t * (3 - 2 * t);

const melangerCouleur = (a, b, t) => [
  melanger(a[0], b[0], t),
  melanger(a[1], b[1], t),
  melanger(a[2], b[2], t),
];

/**
 * Bruit de valeur à graine.
 *
 * Le `hash` du shader du bassin — `fract(p*vec2(123.34,456.21))` puis
 * `p+=dot(p,p+45.32)` — repose sur la précision flottante 32 bits du GPU pour
 * décorréler. En double précision côté Node il produit des motifs alignés : le
 * premier jet de ces échantillons ressortait uniformément gris. On mélange donc
 * ici des entiers, ce qui ne dépend d'aucune précision.
 */
function hachage(x, y) {
  let n = (Math.round(x) * 374761393 + Math.round(y) * 668265263) | 0;
  n = (n ^ (n >>> 13)) | 0;
  n = Math.imul(n, 1274126177) | 0;
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

function bruitValeur(x, y) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = lisser(x - ix);
  const fy = lisser(y - iy);
  const a = hachage(ix, iy);
  const b = hachage(ix + 1, iy);
  const c = hachage(ix, iy + 1);
  const d = hachage(ix + 1, iy + 1);
  return melanger(melanger(a, b, fx), melanger(c, d, fx), fy);
}

function fbm(x, y, octaves = 4, lacunarite = 2.03, gain = 0.5) {
  let somme = 0;
  let amplitude = 0.5;
  let px = x;
  let py = y;
  for (let i = 0; i < octaves; i += 1) {
    somme += amplitude * bruitValeur(px, py);
    px *= lacunarite;
    py *= lacunarite;
    amplitude *= gain;
  }
  return somme;
}

// ---------------------------------------------------------------------------
// Les échantillons
//
// Une plaque de matière posée au centre du carré, avec de la marge autour :
// c'est cette marge qui laisse la place à l'ombre portée, dont le décalage est
// gravé dans sa propre texture. C'est le montage de `shadow` — deux plans
// superposés de même géométrie, l'un l'objet, l'autre son ombre — et il tient
// précisément parce que le décalage vit dans les pixels et non dans la scène.
// ---------------------------------------------------------------------------

/**
 * 512 et non 1024 : l'échantillon s'affiche autour de quatre cents pixels de
 * côté. Une texture de 1024² serait quatre fois plus lourde en mémoire GPU pour
 * un détail que personne ne voit — « dimensionnées à la puissance de deux la
 * plus proche du besoin réel ».
 */
const COTE = 512;
/** Le bord de la plaque, en fraction du carré. */
const MARGE = 0.13;

/**
 * Les trois matières.
 *
 * Chacune rend un `relief` — la quantité de lumière que la surface renvoie, à
 * garder autour de [0, 1]. Les poids d'une matière somment donc à peu près à
 * un : au premier jet ils sommaient à 1,6, le relief saturait à son plafond
 * presque partout et les trois échantillons sortaient uniformément gris.
 */
const MATIERES = {
  /* Lin brut : une toile. Chaîne et trame se croisent, et les flammes du fil
     — les irrégularités d'épaisseur — traversent la surface.
     Le fil est gros : un lin brut d'ameublement compte une trentaine de fils
     au centimètre, pas cent trente. Un tissage trop fin ne se lit plus comme
     une matière, il se lit comme une trame d'écran. */
  lin: (u, v, jetons) => {
    const fil = 26;
    /* Le fil n'est pas droit : il ondule autour de son voisin. */
    const ondeU = u * fil + Math.sin(v * fil * 0.5) * 0.14;
    const ondeV = v * fil * 0.96 + Math.sin(u * fil * 0.5) * 0.14;
    const chaine = Math.sin(ondeU * Math.PI) * 0.5 + 0.5;
    const trame = Math.sin(ondeV * Math.PI) * 0.5 + 0.5;
    /* Le tissage : là où la chaîne passe devant, la trame s'efface. */
    const croisement = chaine * (1 - trame) + trame * (1 - chaine);
    /* Les flammes : des épaississements du fil, longs dans le sens de la
       chaîne et minces en travers — d'où les deux fréquences très inégales.
       C'est ce qui distingue un lin brut d'un coton, et c'est ce qu'on doit
       voir en premier : le tissage n'est qu'une modulation par-dessus. */
    const flamme = fbm(u * 2, v * 13, 3);
    /* Les fils tirés, ou doublés : la toile n'est jamais régulière. */
    const irregulier = fbm(u * 6 + 3, v * 6 + 3, 3);
    const relief = flamme * 0.5 + irregulier * 0.26 + croisement * 0.24;
    return {
      base: melangerCouleur(jetons.zinc, jetons.pierre, 0.72),
      clair: jetons.craie,
      relief,
      contraste: 0.72,
    };
  },

  /* Chaux ferrée : lissée à la truelle chaude jusqu'à ce qu'elle réfléchisse.
     Les passes de fer laissent des balayages larges, et la matière nuage en
     dessous. */
  chaux: (u, v, jetons) => {
    /* Le balayage : le bruit est étiré le long de la passe de truelle, donc
       très basse fréquence dans un axe et haute dans l'autre. */
    const angle = 0.38;
    const su = u * Math.cos(angle) - v * Math.sin(angle);
    const sv = u * Math.sin(angle) + v * Math.cos(angle);
    const passe = fbm(su * 4.5, sv * 28, 4);
    const nuage = fbm(u * 6.5 + 40, v * 6.5 + 40, 5);
    /* Le ferrage brille par plaques : c'est le haut de la passe qui prend. */
    const ferre = lisser(borne01((passe - 0.46) * 5.5));
    const relief = nuage * 0.34 + passe * 0.3 + ferre * 0.36;
    return {
      base: melangerCouleur(jetons.pierre, jetons.craie, 0.28),
      clair: jetons.craie,
      relief,
      contraste: 0.7,
    };
  },

  /* Plâtre lissé au couteau, sans peinture : la matière est la finition.
     Presque rien à voir — quelques reprises de lame, et c'est tout. C'est le
     plus difficile des trois : il doit être plat sans être vide. */
  platre: (u, v, jetons) => {
    const nuage = fbm(u * 9 + 90, v * 9 + 90, 5);
    /* Les reprises de lame : des arêtes franches, longues, peu nombreuses.
       La valeur absolue autour de la médiane fait une crête là où le champ
       traverse — c'est la trace du couteau, pas une rayure dessinée. */
    const champ = fbm(u * 3.2 + 7, v * 3.8 + 7, 3);
    const arete = lisser(borne01(1 - Math.abs(champ - 0.5) * 16));
    const relief = nuage * 0.66 + arete * 0.3;
    return {
      base: melangerCouleur(jetons.craie, jetons.pierre, 0.18),
      clair: jetons.craie,
      relief,
      contraste: 0.42,
    };
  },
};

function echantillon(nom, jetons) {
  const matiere = MATIERES[nom];
  const pixels = Buffer.alloc(COTE * COTE * 4);

  for (let y = 0; y < COTE; y += 1) {
    const v = y / (COTE - 1);
    for (let x = 0; x < COTE; x += 1) {
      const u = x / (COTE - 1);
      const p = (y * COTE + x) * 4;

      /* Hors de la plaque : rien. C'est la marge où l'ombre travaille. */
      const dedans =
        u > MARGE && u < 1 - MARGE && v > MARGE && v < 1 - MARGE;
      if (!dedans) continue;

      /* Coordonnées internes à la plaque, pour que la matière ne soit pas
         coupée par un motif qui commencerait au bord du fichier. */
      const pu = (u - MARGE) / (1 - 2 * MARGE);
      const pv = (v - MARGE) / (1 - 2 * MARGE);

      const { base, clair, relief, contraste } = matiere(pu, pv, jetons);
      let couleur = melangerCouleur(base, clair, borne01(relief) * contraste);

      /* La lumière rasante d'un atelier : elle vient du haut à gauche et
         tombe. Un échantillon posé à plat n'est jamais éclairé également. */
      const chute = 1 - (pu * 0.13 + pv * 0.2);
      couleur = couleur.map((c) => c * chute);

      /* Le bord coupé : deux pixels d'ombre, la tranche de l'échantillon. */
      const bord = Math.min(
        pu,
        1 - pu,
        pv,
        1 - pv,
      );
      const tranche = lisser(borne01(bord / 0.012));
      couleur = melangerCouleur(jetons.plomb, couleur, tranche);

      pixels[p] = Math.round(borne01(couleur[0] / 255) * 255);
      pixels[p + 1] = Math.round(borne01(couleur[1] / 255) * 255);
      pixels[p + 2] = Math.round(borne01(couleur[2] / 255) * 255);
      pixels[p + 3] = 255;
    }
  }

  return encoderPng(COTE, COTE, pixels, 4);
}

/**
 * L'ombre portée, commune aux trois : les trois plaques ont la même découpe,
 * donc la même ombre. Elle est décalée dans sa propre texture — vers le bas et
 * la droite, comme la lumière de l'échantillon l'impose — et s'adoucit vers
 * l'extérieur. Son alpha est ce que le fragment de `shadow` efface à mesure que
 * la feuille se décolle.
 */
function ombre(jetons) {
  const pixels = Buffer.alloc(COTE * COTE * 4);
  const DECALAGE_X = 0.045;
  const DECALAGE_Y = 0.055;
  /** Étalement du flou, en fraction du carré. La marge en fait 0.13. */
  const DOUCEUR = 0.062;
  const OPACITE = 0.62;

  for (let y = 0; y < COTE; y += 1) {
    const v = y / (COTE - 1) - DECALAGE_Y;
    for (let x = 0; x < COTE; x += 1) {
      const u = x / (COTE - 1) - DECALAGE_X;
      const p = (y * COTE + x) * 4;

      /* Distance signée au rectangle de la plaque : positive dedans. */
      const dx = Math.min(u - MARGE, 1 - MARGE - u);
      const dy = Math.min(v - MARGE, 1 - MARGE - v);
      const dedans = Math.min(dx, dy);

      /* Une ombre de contact n'a pas la même dureté partout : elle est dense
         et nette près du bord posé, diffuse au loin. */
      const densite = lisser(borne01(dedans / DOUCEUR + 0.5));
      const alpha = densite * OPACITE;
      if (alpha <= 0.002) continue;

      pixels[p] = jetons.encre[0];
      pixels[p + 1] = jetons.encre[1];
      pixels[p + 2] = jetons.encre[2];
      pixels[p + 3] = Math.round(alpha * 255);
    }
  }

  return encoderPng(COTE, COTE, pixels, 4);
}

// ---------------------------------------------------------------------------
// La plaque de repli du bassin
//
// Une frame unique du bassin, calculée avec les équations du shader de
// `waterwebgl-shader` : le champ de hauteur est figé, mais la caustique reste
// le déterminant jacobien de la carte des rayons réfractés, le fond reste un
// fbm, l'absorption reste exponentielle. C'est ce qu'on montre à une machine
// sans WebGL2 — le chapitre garde son morceau de bravoure, immobile.
// ---------------------------------------------------------------------------

const REPLI_L = 1440;
const REPLI_H = 810;

/** Les constantes du bassin, figées après réglage. Voir `materiaux/bassin.ts`. */
const EAU = {
  causticA: 9,
  detFloor: 0.06,
  clamp1: 6,
  contrast: 1.22,
  clamp2: 8,
  floorBase: 0.34,
  causticGain: 0.3,
  veinThresh: 1,
  veinGain: 0.1,
  baseDepth: 1.05,
  depthScale: 1.4,
  depthNoise: 2,
  depthNoiseAmp: 0.25,
  absorb: [107 / 255, 33 / 255, 20 / 255],
  absorbScale: 1.7,
  deepGain: 0.3,
  parallax: 2.4,
  nScale: 8.5,
  sun1: [0.3, 0.45, 0.82],
  sun2: [-0.5, 0.15, 0.78],
  spec1: 150,
  spec2: 70,
  spec2Gain: 0.35,
  glintGain: 0.85,
  fresnelPow: 4,
  fresnelGain: 0.22,
  rippleScale: 6.5,
  warpScale: 3,
  warp: 0.6,
  bandFreq: 9,
  bandSkew: 4,
  bandGain: 0.06,
  grainScale: 240,
  grainAmp: 0.045,
  exposure: 1.55,
  gamma: 0.4545,
  vigOuter: 1.28,
  vigInner: 0.32,
  vigDark: 0.6,
  vigBright: 1.05,
};

/**
 * Un champ de hauteur figé : quelques gouttes qui se sont propagées, telles que
 * l'équation d'onde les aurait laissées. Une onde radiale amortie fait
 * exactement cela, et se calcule d'un trait.
 */
function champDeHauteur(taille) {
  const gouttes = [
    { x: 0.34, y: 0.58, a: 0.85, k: 46, phi: 0.4, sigma: 0.3 },
    { x: 0.68, y: 0.36, a: 0.62, k: 58, phi: 2.1, sigma: 0.24 },
    { x: 0.52, y: 0.78, a: 0.44, k: 68, phi: 1.2, sigma: 0.18 },
    { x: 0.18, y: 0.24, a: 0.36, k: 52, phi: 3.4, sigma: 0.22 },
    { x: 0.84, y: 0.7, a: 0.3, k: 74, phi: 0.9, sigma: 0.16 },
  ];

  const h = new Float32Array(taille * taille);
  for (let y = 0; y < taille; y += 1) {
    const v = y / (taille - 1);
    for (let x = 0; x < taille; x += 1) {
      const u = x / (taille - 1);
      let somme = 0;
      for (const g of gouttes) {
        const dx = u - g.x;
        const dy = v - g.y;
        const r = Math.sqrt(dx * dx + dy * dy);
        somme +=
          g.a * Math.cos(r * g.k - g.phi) * Math.exp(-(r * r) / (g.sigma * g.sigma));
      }
      /* La houle de fond : ce qui reste quand les gouttes se sont tues. */
      somme += 0.12 * Math.sin(u * 21 + v * 9) * Math.sin(v * 17 - u * 6);
      h[y * taille + x] = somme * 0.045;
    }
  }
  return h;
}

function plaqueBassin(jetons) {
  const N = 512;
  const h = champDeHauteur(N);
  const lire = (x, y) => {
    const cx = Math.max(0, Math.min(N - 1, x));
    const cy = Math.max(0, Math.min(N - 1, y));
    return h[cy * N + cx];
  };

  /* Les couleurs du bassin viennent des jetons — voir `materiaux/bassin.ts`,
     qui fait la même dérivation côté shader. */
  const sable = jetons.pierre.map((c) => c / 255);
  const sableBas = jetons.zinc.map((c) => c / 255);
  const profond = jetons.encre.map((c) => c / 255);
  const ciel = jetons.sel.map((c) => c / 255);
  const eclat = jetons.craie.map((c) => c / 255);
  const veine = jetons.sel.map((c) => c / 255);

  const aspect = REPLI_L / REPLI_H;
  const pixels = Buffer.alloc(REPLI_L * REPLI_H * 3);

  const sableEn = (u, v) => {
    const px = u * aspect;
    const py = v;
    const rip = fbm(
      px * EAU.rippleScale + fbm(px * EAU.warpScale, py * EAU.warpScale) * EAU.warp,
      py * EAU.rippleScale + fbm(px * EAU.warpScale, py * EAU.warpScale) * EAU.warp,
    );
    const bande = 0.5 + 0.5 * Math.sin(rip * EAU.bandFreq + px * EAU.bandSkew);
    let b = melangerCouleur(sable, sableBas, rip);
    b = melangerCouleur(b, b.map((c) => c * (1 + EAU.bandGain)), bande);
    const grain =
      (bruitValeur(px * EAU.grainScale, py * EAU.grainScale) - 0.5) * EAU.grainAmp;
    return b.map((c) => c + grain);
  };

  for (let y = 0; y < REPLI_H; y += 1) {
    const v = 1 - y / (REPLI_H - 1);
    const gy = Math.round(v * (N - 1));
    for (let x = 0; x < REPLI_L; x += 1) {
      const u = x / (REPLI_L - 1);
      const gx = Math.round(u * (N - 1));

      const hc = lire(gx, gy);
      const hl = lire(gx - 1, gy);
      const hr = lire(gx + 1, gy);
      const hu = lire(gx, gy + 1);
      const hd = lire(gx, gy - 1);
      const hpp = lire(gx + 1, gy + 1);
      const hmm = lire(gx - 1, gy - 1);
      const hpm = lire(gx + 1, gy - 1);
      const hmp = lire(gx - 1, gy + 1);

      const hx = (hr - hl) * 0.5;
      const hy = (hu - hd) * 0.5;
      const hxx = hr - 2 * hc + hl;
      const hyy = hu - 2 * hc + hd;
      const hxy = (hpp - hpm - hmp + hmm) * 0.25;

      /* La caustique : compression d'aire de la carte des rayons réfractés,
         c'est-à-dire le déterminant du jacobien. L'astuce centrale de la
         source, et elle se transpose telle quelle hors du GPU. */
      const jxx = 1 - EAU.causticA * hxx * N * N * 1e-4;
      const jyy = 1 - EAU.causticA * hyy * N * N * 1e-4;
      const jxy = -EAU.causticA * hxy * N * N * 1e-4;
      const det = jxx * jyy - jxy * jxy;
      let ca = Math.min(1 / Math.max(Math.abs(det), EAU.detFloor), EAU.clamp1);
      ca = Math.min(Math.pow(Math.max(ca, 0), EAU.contrast), EAU.clamp2);

      const landU = u + hx * N * 1e-2 * EAU.parallax;
      const landV = v + hy * N * 1e-2 * EAU.parallax;

      let col = sableEn(landU, landV).map(
        (c) => c * (EAU.floorBase + ca * EAU.causticGain),
      );
      const excedent = Math.max(ca - EAU.veinThresh, 0) * EAU.veinGain;
      col = col.map((c, i) => c + veine[i] * excedent);

      const prof = Math.max(
        0.2,
        Math.min(
          3,
          EAU.baseDepth -
            hc * EAU.depthScale +
            fbm(landU * EAU.depthNoise, landV * EAU.depthNoise) * EAU.depthNoiseAmp,
        ),
      );
      col = col.map((c, i) => c * Math.exp(-EAU.absorb[i] * prof * EAU.absorbScale));
      col = col.map((c, i) => c + profond[i] * prof * EAU.deepGain);

      /* Deux soleils spéculaires sur la normale de la surface. */
      const nx = -hx * N * 1e-2 * EAU.nScale;
      const ny = -hy * N * 1e-2 * EAU.nScale;
      const nl = Math.sqrt(nx * nx + ny * ny + 1);
      const N3 = [nx / nl, ny / nl, 1 / nl];
      const demi = (s) => {
        const hx2 = s[0];
        const hy2 = s[1];
        const hz2 = s[2] + 1;
        const l = Math.sqrt(hx2 * hx2 + hy2 * hy2 + hz2 * hz2);
        return Math.max(
          0,
          (N3[0] * hx2 + N3[1] * hy2 + N3[2] * hz2) / l,
        );
      };
      const sp =
        Math.pow(demi(EAU.sun1), EAU.spec1) +
        Math.pow(demi(EAU.sun2), EAU.spec2) * EAU.spec2Gain;
      col = col.map((c, i) => c + sp * eclat[i] * EAU.glintGain);

      /* Fresnel : le ciel se pose sur ce qu'on voit de biais. */
      const f = Math.pow(1 - N3[2], EAU.fresnelPow) * EAU.fresnelGain;
      col = col.map((c, i) => melanger(c, ciel[i], f));

      /* Vignettage, exposition, gamma. */
      const d = Math.hypot((u - 0.5) * aspect, v - 0.5);
      const vig = melanger(
        EAU.vigDark,
        EAU.vigBright,
        lisser(borne01((EAU.vigOuter - d) / (EAU.vigOuter - EAU.vigInner))),
      );
      col = col.map((c) => 1 - Math.exp(-c * vig * EAU.exposure));

      const p = (y * REPLI_L + x) * 3;
      for (let c = 0; c < 3; c += 1) {
        pixels[p + c] = Math.round(
          borne01(Math.pow(Math.max(col[c], 0), EAU.gamma)) * 255,
        );
      }
    }
  }

  return encoderPng(REPLI_L, REPLI_H, pixels, 3);
}

// ---------------------------------------------------------------------------
// Production
// ---------------------------------------------------------------------------

const jetons = lireJetons();
const dossier = join(RACINE, "public/textures");
mkdirSync(dossier, { recursive: true });

let total = 0;
const ecrire = (nom, donnees) => {
  writeFileSync(join(dossier, nom), donnees);
  total += donnees.length;
  console.log(`${nom.padEnd(28)} ${(donnees.length / 1024).toFixed(0)} ko`);
};

for (const nom of Object.keys(MATIERES)) {
  ecrire(`echantillon-${nom}.png`, echantillon(nom, jetons));
}
ecrire("echantillon-ombre.png", ombre(jetons));
ecrire("bassin-repli.png", plaqueBassin(jetons));

console.log(`total                        ${(total / 1024).toFixed(0)} ko`);
