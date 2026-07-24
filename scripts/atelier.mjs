/**
 * Les planches provisoires du chapitre *L'Atelier*.
 *
 * Mêmes règles que `scripts/planches.mjs` : ce ne sont pas les images du site.
 * L'atelier revient au gris — plans, échantillons, chantier — et un portrait à
 * contre-jour. Ces études de lumière servent à juger la rotation en profondeur
 * et la distribution en sinusoïde tant que les vraies photographies ne sont pas
 * là. Elles sont remplaçables fichier pour fichier ; le manifeste
 * (`src/data/atelier.ts`) ne bouge pas.
 *
 * Les couleurs sont lues dans `tokens.css` — que des gris de Paris ici, aucun
 * monde chromatique : c'est le retour au calme.
 *
 *   node scripts/atelier.mjs
 */
import { deflateSync } from "node:zlib";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const RACINE = join(dirname(fileURLToPath(import.meta.url)), "..");

// --- Encodage PNG (RGB), identique à planches.mjs ---------------------------

const TABLE_CRC = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();
function crc32(o) {
  let c = -1;
  for (let i = 0; i < o.length; i += 1) c = TABLE_CRC[(c ^ o[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}
function bloc(type, donnees) {
  const corps = Buffer.concat([Buffer.from(type, "ascii"), donnees]);
  const entete = Buffer.alloc(4);
  entete.writeUInt32BE(donnees.length, 0);
  const somme = Buffer.alloc(4);
  somme.writeUInt32BE(crc32(corps), 0);
  return Buffer.concat([entete, corps, somme]);
}
function encoderPng(largeur, hauteur, pixels) {
  const pas = largeur * 3;
  const lignes = Buffer.alloc(hauteur * (pas + 1));
  for (let y = 0; y < hauteur; y += 1) {
    const src = y * pas;
    const dst = y * (pas + 1);
    if (y === 0) {
      lignes[dst] = 1;
      for (let i = 0; i < pas; i += 1) {
        const g = i >= 3 ? pixels[src + i - 3] : 0;
        lignes[dst + 1 + i] = (pixels[src + i] - g) & 0xff;
      }
    } else {
      lignes[dst] = 2;
      for (let i = 0; i < pas; i += 1) {
        lignes[dst + 1 + i] = (pixels[src + i] - pixels[src - pas + i]) & 0xff;
      }
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(largeur, 0);
  ihdr.writeUInt32BE(hauteur, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    bloc("IHDR", ihdr),
    bloc("IDAT", deflateSync(lignes, { level: 9 })),
    bloc("IEND", Buffer.alloc(0)),
  ]);
}

// --- Couleurs et outils -----------------------------------------------------

function lireJetons() {
  const css = readFileSync(join(RACINE, "src/styles/tokens.css"), "utf8");
  const j = {};
  for (const [, nom, hex] of css.matchAll(/--color-([a-z-]+):\s*#([0-9a-fA-F]{6})/g)) {
    j[nom] = [
      parseInt(hex.slice(0, 2), 16),
      parseInt(hex.slice(2, 4), 16),
      parseInt(hex.slice(4, 6), 16),
    ];
  }
  return j;
}
const borne01 = (v) => Math.max(0, Math.min(1, v));
const melange = (a, b, t) => a + (b - a) * t;
const lisser = (t) => t * t * (3 - 2 * t);
const melangeC = (a, b, t) => [melange(a[0], b[0], t), melange(a[1], b[1], t), melange(a[2], b[2], t)];

function hachage(x, y) {
  let n = (Math.round(x) * 374761393 + Math.round(y) * 668265263) | 0;
  n = (n ^ (n >>> 13)) | 0;
  n = Math.imul(n, 1274126177) | 0;
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}
function bruit(x, y) {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = lisser(x - ix), fy = lisser(y - iy);
  const a = hachage(ix, iy), b = hachage(ix + 1, iy);
  const c = hachage(ix, iy + 1), d = hachage(ix + 1, iy + 1);
  return melange(melange(a, b, fx), melange(c, d, fx), fy);
}
function fbm(x, y, oct = 4) {
  let s = 0, a = 0.5;
  for (let i = 0; i < oct; i += 1) { s += a * bruit(x, y); x *= 2.03; y *= 2.03; a *= 0.5; }
  return s;
}

// --- Une étude d'atelier : un plan de travail sous lumière rasante ----------
//
// Un mur gris, une chute de lumière oblique, un plan (une table) qui coupe le
// bas du cadre, et une masse en amorce. `variante` déplace tout : deux études
// ne cadrent pas la même chose.

const L = 1000;
const H = 1250;

function etude(jetons, variante) {
  const px = Buffer.alloc(L * H * 3);
  const ombre = jetons.encre;
  const mur = melangeC(jetons.plomb, jetons.zinc, 0.35 + (variante % 3) * 0.1);
  const lumiere = jetons.craie;

  const horizonTable = 0.62 + (variante % 4) * 0.05;
  const centreLum = 0.3 + variante * 0.14;
  const angleLum = 0.4 + ((variante * 7) % 5) * 0.05;
  const largeurLum = 0.28 + ((variante * 3) % 4) * 0.06;
  const amorce = 0.08 + ((variante * 5) % 4) * 0.05;

  for (let y = 0; y < H; y += 1) {
    const v = y / (H - 1);
    for (let x = 0; x < L; x += 1) {
      const u = x / (L - 1);
      let c = melangeC(ombre, mur, 0.42 + (1 - v) * 0.12);

      const surTable = v > horizonTable;
      if (surTable) {
        const p = borne01((v - horizonTable) / (1 - horizonTable));
        /* Le plan de travail : plus clair, mat, il prend la lumière à plat.
           Quelques feuilles claires y traînent — des plans posés. */
        let table = melangeC(mur, jetons.pierre, 0.4);
        const feuille = fbm(u * 5 + variante, v * 7, 3);
        if (feuille > 0.62) table = melangeC(table, lumiere, (feuille - 0.62) * 1.6);
        c = melangeC(table, ombre, p * 0.4);
      }

      /* La chute de lumière : bande oblique franche d'un côté. */
      const long = u - centreLum - (v - horizonTable) * angleLum;
      const dans = lisser(borne01(1 - Math.abs(long) / largeurLum)) * (surTable ? 0.55 : 1);
      c = melangeC(c, lumiere, dans * 0.4);

      /* Amorce sombre à gauche, hors cadre. */
      if (u < amorce) {
        const bord = lisser(borne01((amorce - u) / 0.05));
        c = melangeC(c, ombre, bord * 0.82);
      }

      /* Vignettage relevé — l'ombre n'est jamais à zéro. Pas de grain gravé :
         il ne se compresse pas et se poserait au shader de toute façon. */
      const dx = (u - 0.5) * 1.7, dy = (v - 0.5) * 1.25;
      const vig = 1 - borne01(Math.sqrt(dx * dx + dy * dy) - 0.45) * 0.32;

      const p = (y * L + x) * 3;
      for (let k = 0; k < 3; k += 1) {
        px[p + k] = Math.max(0, Math.min(255, Math.round(c[k] * vig)));
      }
    }
  }
  return encoderPng(L, H, px);
}

// --- Le portrait : contre-jour, noir et blanc, jamais souriant --------------
//
// Une fenêtre claire, une figure sombre décentrée qui s'y découpe. Pas de
// visage : le contre-jour n'en montre pas, et c'est le propos.

function portrait(jetons) {
  const px = Buffer.alloc(L * H * 3);
  const noir = jetons.encre;
  const clair = jetons.craie;
  const gris = jetons.zinc;

  /* La fenêtre : un grand rectangle clair, décalé à droite. */
  const fenLeft = 0.34, fenRight = 0.94, fenTop = 0.1, fenBot = 0.82;
  /* La figure : une masse verticale, épaules et tête, calée à gauche du centre. */
  const figX = 0.42, figLarg = 0.2;
  const epaules = 0.5, tete = 0.3, tour = 0.11;

  for (let y = 0; y < H; y += 1) {
    const v = y / (H - 1);
    for (let x = 0; x < L; x += 1) {
      const u = x / (L - 1);

      /* Le mur autour de la fenêtre, très sombre. */
      let c = melangeC(noir, gris, 0.12 + (1 - v) * 0.06);

      /* La vitre : claire, avec une chute vers le bas et un léger voile. */
      const dansFen = u > fenLeft && u < fenRight && v > fenTop && v < fenBot;
      if (dansFen) {
        const monteLumiere = borne01(1 - (v - fenTop) / (fenBot - fenTop));
        const voile = fbm(u * 3, v * 4, 3) * 0.12;
        c = melangeC(melangeC(gris, clair, 0.55), clair, monteLumiere * 0.5 + voile);
        /* Le meneau : une croix sombre dans la fenêtre. */
        const meneauV = Math.abs(u - (fenLeft + fenRight) / 2) < 0.006;
        const meneauH = Math.abs(v - (fenTop + fenBot) * 0.46) < 0.006;
        if (meneauV || meneauH) c = melangeC(c, noir, 0.7);
      }

      /* La figure en contre-jour : presque noire, un liseré de lumière au bord.
         Silhouette = épaules (une gaussienne large) surmontées d'une tête. */
      const largeurEpaules = figLarg * (1 + Math.max(0, (v - epaules) * 2.2));
      const dansEpaules = v > epaules && Math.abs(u - figX) < largeurEpaules;
      const dTete = Math.hypot((u - figX) * 1.15, v - tete);
      const dansTete = v <= epaules && dTete < tour;
      const colDansCou =
        v > tete && v <= epaules && Math.abs(u - figX) < tour * 0.62;
      if (dansEpaules || dansTete || colDansCou) {
        /* Liseré : le bord de la silhouette attrape la lumière de la fenêtre. */
        const bordDroit = dansEpaules ? largeurEpaules - Math.abs(u - figX) : tour - dTete;
        const liseré = lisser(borne01(1 - bordDroit / 0.012));
        c = melangeC(melangeC(noir, gris, 0.08), clair, liseré * 0.5 * (u > figX ? 1 : 0.35));
      }

      /* Noir et blanc : on tire vers la luminance, le portrait ne porte pas de
         couleur. */
      const lum = c[0] * 0.2126 + c[1] * 0.7152 + c[2] * 0.0722;
      c = [lum, lum, lum];

      const dx = (u - 0.5) * 1.6, dy = (v - 0.5) * 1.2;
      const vig = 1 - borne01(Math.sqrt(dx * dx + dy * dy) - 0.4) * 0.4;

      const p = (y * L + x) * 3;
      for (let k = 0; k < 3; k += 1) {
        px[p + k] = Math.max(0, Math.min(255, Math.round(c[k] * vig)));
      }
    }
  }
  return encoderPng(L, H, px);
}

// --- Production -------------------------------------------------------------

const jetons = lireJetons();
const dossier = join(RACINE, "public/atelier");
mkdirSync(dossier, { recursive: true });

let total = 0;
const ecrire = (nom, buf) => {
  writeFileSync(join(dossier, nom), buf);
  total += buf.length;
  console.log(`${nom.padEnd(22)} ${(buf.length / 1024).toFixed(0)} ko`);
};

const NB_ETUDES = 6;
for (let i = 0; i < NB_ETUDES; i += 1) {
  ecrire(`atelier-${i + 1}.png`, etude(jetons, i));
}
ecrire("atelier-portrait.png", portrait(jetons));

console.log(`total                 ${(total / 1024).toFixed(0)} ko`);
