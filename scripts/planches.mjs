/**
 * Générateur de planches provisoires.
 *
 * ATTENTION — ces images ne sont pas les images du site. La photographie est le
 * poste du Livre V du brief : intérieurs vides, lumière rasante, étalonnage
 * commun, une trentaine d'images retenues sur trois cents regardées. Rien de
 * cela ne se fabrique en code.
 *
 * Ce script produit des **études de lumière** : des aplats tonaux dans le monde
 * chromatique de chaque projet, avec une chute de lumière, une ligne d'horizon
 * et un grain. Elles servent à une seule chose — juger la composition, le
 * parallaxe, le flou en shader et le défilement de la séquence de frames tant
 * que les vraies photographies ne sont pas là. Elles sont remplaçables fichier
 * pour fichier : le manifeste (`src/data/visuels.ts`) ne change pas.
 *
 * Les couleurs sont lues dans `src/styles/tokens.css` — aucune valeur
 * chromatique n'est écrite ici, la source de vérité reste unique.
 *
 *   node scripts/planches.mjs
 */
import { deflateSync } from "node:zlib";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const RACINE = join(dirname(fileURLToPath(import.meta.url)), "..");

// ---------------------------------------------------------------------------
// Encodage PNG — sans dépendance : Node sait déjà déflater.
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
 * `pixels` : RGB entrelacé, longueur largeur × hauteur × 3.
 *
 * Les lignes sont filtrées avant déflation — « Sub » pour la première, « Up »
 * pour les suivantes. Sur une image tonale, chaque ligne ressemble beaucoup à
 * celle du dessus : la différence est presque nulle partout, et le flux se
 * compresse d'un facteur cinquante. Sans ce filtrage, une planche pèse deux
 * mégaoctets et demi, au lieu des quelques dizaines de kilo-octets que le
 * budget de performance autorise.
 */
function encoderPng(largeur, hauteur, pixels) {
  const pas = largeur * 3;
  const lignes = Buffer.alloc(hauteur * (pas + 1));

  for (let y = 0; y < hauteur; y += 1) {
    const source = y * pas;
    const cible = y * (pas + 1);

    if (y === 0) {
      lignes[cible] = 1; // Sub : différence avec le pixel de gauche
      for (let i = 0; i < pas; i += 1) {
        const gauche = i >= 3 ? pixels[source + i - 3] : 0;
        lignes[cible + 1 + i] = (pixels[source + i] - gauche) & 0xff;
      }
    } else {
      lignes[cible] = 2; // Up : différence avec la ligne précédente
      for (let i = 0; i < pas; i += 1) {
        lignes[cible + 1 + i] =
          (pixels[source + i] - pixels[source - pas + i]) & 0xff;
      }
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(largeur, 0);
  ihdr.writeUInt32BE(hauteur, 4);
  ihdr[8] = 8; // 8 bits par canal
  ihdr[9] = 2; // couleur vraie, sans alpha
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    bloc("IHDR", ihdr),
    bloc("IDAT", deflateSync(lignes, { level: 9 })),
    bloc("IEND", Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------------------
// Les couleurs viennent de tokens.css, jamais d'ici.
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

const melanger = (a, b, t) => a + (b - a) * t;
const borne01 = (v) => Math.max(0, Math.min(1, v));
const lisser = (t) => t * t * (3 - 2 * t);

function melangerCouleur(a, b, t) {
  return [
    melanger(a[0], b[0], t),
    melanger(a[1], b[1], t),
    melanger(a[2], b[2], t),
  ];
}

// ---------------------------------------------------------------------------
// La planche : une étude de lumière.
//
// Un mur, une chute de lumière oblique, une ligne de sol, une masse verticale
// en amorce, un grain. `avance` (0 → 1) fait traverser la pièce : c'est ce
// paramètre qui produit une séquence de frames.
// ---------------------------------------------------------------------------

function planche({ largeur, hauteur, monde, ombre, lumiere, avance = 0, variante = 0 }) {
  const pixels = Buffer.alloc(largeur * hauteur * 3);

  /* Les constantes de mise en scène sont tirées une fois par planche : deux
     planches d'un même projet ne cadrent pas la même chose. */
  const horizon = 0.58 + (variante % 3) * 0.07 - avance * 0.06;
  const angleLumiere = 0.42 + ((variante * 7) % 5) * 0.06;
  const largeurLumiere = 0.3 + ((variante * 3) % 4) * 0.05;
  /* La traversée : la fenêtre balaye le mur pendant qu'on avance. */
  const centreLumiere = 0.28 + variante * 0.11 + avance * 0.42;
  const amorce = 0.1 + ((variante * 5) % 4) * 0.05 - avance * 0.12;

  for (let y = 0; y < hauteur; y += 1) {
    const v = y / (hauteur - 1);
    for (let x = 0; x < largeur; x += 1) {
      const u = x / (largeur - 1);

      /* Le mur : le monde chromatique désaturé vers l'ombre, plus sombre en
         haut — la lumière d'architecture tombe, elle ne monte pas. */
      let couleur = melangerCouleur(ombre, monde, 0.22 + (1 - v) * 0.1);

      /* Le sol : plus froid, plus mat, et il prend la lumière de biais. */
      const surSol = v > horizon;
      if (surSol) {
        const profondeur = borne01((v - horizon) / (1 - horizon));
        couleur = melangerCouleur(
          melangerCouleur(ombre, monde, 0.3),
          ombre,
          profondeur * 0.55,
        );
      }

      /* La chute de lumière : une bande oblique, franche sur un bord, douce
         sur l'autre — une fenêtre haute, pas un projecteur. */
      const long = u - centreLumiere - (v - horizon) * angleLumiere;
      const dansLaLumiere =
        lisser(borne01(1 - Math.abs(long) / largeurLumiere)) *
        (surSol ? 0.62 : 1);
      couleur = melangerCouleur(
        couleur,
        lumiere,
        dansLaLumiere * (0.52 - avance * 0.06),
      );

      /* L'amorce : une masse verticale coupée par le bord gauche du cadre.
         Une image sur trois sort du cadre — celle-ci commence dehors. */
      if (u < amorce) {
        const bord = lisser(borne01((amorce - u) / 0.06));
        couleur = melangerCouleur(couleur, ombre, bord * 0.8);
      }

      /* Vignettage doux : l'ombre n'est jamais à zéro dans une photographie
         d'architecture chère — on la relève, on ne l'écrase pas. */
      const dx = (u - 0.5) * 1.7;
      const dy = (v - 0.5) * 1.25;
      const vignette = 1 - borne01(Math.sqrt(dx * dx + dy * dy) - 0.42) * 0.34;

      /* Pas de grain ici. Il en faudra un — mais c'est un shader qui le pose
         (`shader-on-scroll`, chapitre de la chambre), pas le fichier. Un grain
         gravé dans le PNG ne se compresse pas, ne se règle plus, et se
         retrouverait doublé le jour où le shader arrive. */
      const p = (y * largeur + x) * 3;
      for (let c = 0; c < 3; c += 1) {
        pixels[p + c] = Math.max(
          0,
          Math.min(255, Math.round(couleur[c] * vignette)),
        );
      }
    }
  }

  return encoderPng(largeur, hauteur, pixels);
}

// ---------------------------------------------------------------------------
// Production
// ---------------------------------------------------------------------------

const jetons = lireJetons();

/* Un projet, son monde, et le nombre de planches qu'il lui faut. */
const PROJETS = [
  { slug: "villa-ostrea", monde: "sel" },
  { slug: "hotel-sevigne", monde: "laque" },
  { slug: "maison-cypres", monde: "ocre" },
  { slug: "appartement-cinq-heures", monde: "vert-paris" },
  { slug: "la-bergerie", monde: "outremer" },
];

/** Planches fixes : l'enfilade en prend une, la chambre les trois. */
const PLANCHES_PAR_PROJET = 3;
const LARGEUR_PLANCHE = 1200;
const HAUTEUR_PLANCHE = 1500;

/** Séquence de traversée : basse résolution, elle défile au scroll. */
const FRAMES = 48;
const LARGEUR_FRAME = 1000;
const HAUTEUR_FRAME = 625;

const dossierPlanches = join(RACINE, "public/planches");
mkdirSync(dossierPlanches, { recursive: true });

let poidsTotal = 0;

for (const [indexProjet, projet] of PROJETS.entries()) {
  const monde = jetons[projet.monde];
  if (monde === undefined) {
    throw new Error(`Monde chromatique introuvable dans tokens.css : ${projet.monde}`);
  }
  const ombre = jetons.encre;
  const lumiere = jetons.craie;

  for (let i = 0; i < PLANCHES_PAR_PROJET; i += 1) {
    const png = planche({
      largeur: LARGEUR_PLANCHE,
      hauteur: HAUTEUR_PLANCHE,
      monde,
      ombre,
      lumiere,
      variante: i + indexProjet,
    });
    const chemin = join(dossierPlanches, `${projet.slug}-${i + 1}.png`);
    writeFileSync(chemin, png);
    poidsTotal += png.length;
  }
  console.log(`planches  ${projet.slug} — ${PLANCHES_PAR_PROJET} images`);
}

/* La séquence n'est produite que pour un projet : elle sert à prouver que le
   mécanisme de scrub tient, pas à meubler les quatre autres chambres. */
const projetSequence = PROJETS[0];
const dossierSequence = join(RACINE, "public/frames", projetSequence.slug);
mkdirSync(dossierSequence, { recursive: true });

for (let i = 0; i < FRAMES; i += 1) {
  const png = planche({
    largeur: LARGEUR_FRAME,
    hauteur: HAUTEUR_FRAME,
    monde: jetons[projetSequence.monde],
    ombre: jetons.encre,
    lumiere: jetons.craie,
    avance: i / (FRAMES - 1),
    variante: 1,
  });
  writeFileSync(
    join(dossierSequence, `${String(i + 1).padStart(4, "0")}.png`),
    png,
  );
  poidsTotal += png.length;
}
console.log(`séquence  ${projetSequence.slug} — ${FRAMES} frames`);
console.log(`total     ${(poidsTotal / 1024 / 1024).toFixed(1)} Mo`);
