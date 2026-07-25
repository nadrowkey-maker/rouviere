/**
 * La séquence de frames du manifeste — l'appartement qui s'allume.
 *
 * Le décor du vestibule est un plan de huit secondes dans un appartement
 * obscur dont les lumières s'allument à 2,8 s. Il n'est **pas** servi comme
 * vidéo : le chapitre le rejoue image par image sur un canvas 2D, l'index
 * piloté au défilement.
 *
 * La raison est la même que pour l'approche des chambres, et elle est
 * technique : demander une position arbitraire à un décodeur vidéo l'oblige à
 * repartir de l'image-clé précédente et à décoder toutes les images
 * intermédiaires. Sur Safari et iOS le seek est de surcroît asynchrone et
 * coalescé — on demande vingt positions par seconde, on en obtient trois. Le
 * défilement saccade sans qu'aucun profil ne montre de frame longue, parce que
 * le coût n'est pas dans la page. Avec des images fixes, chaque position est un
 * `drawImage` sur une image déjà décodée : le scrub est exact dans les deux
 * sens, à la frame près, et la molette donne un contrôle continu.
 *
 * **L'index de l'allumage est calculé ici et exporté au manifeste**, jamais
 * estimé à l'œil dans un composant : c'est le repère sur lequel le mot LUMIÈRE
 * s'allume avec la pièce, pas avant, pas après.
 *
 * Deux partis pris :
 *
 * — **Toutes les frames, à la cadence de la source.** Vingt-quatre images par
 *   seconde sur huit secondes font cent quatre-vingt-douze positions : la
 *   molette n'atteint jamais le pas de l'échantillonnage, on ne voit donc
 *   jamais deux fois la même image en avançant lentement.
 * — **1280 px de large, la largeur native de la source.** Agrandir un plan
 *   dans le fichier n'ajoute aucune information et double le poids.
 *
 * L'étalonnage commun est posé comme sur toute image du site. Il tombe juste
 * ici : le point noir relevé du Livre V (8, 11, 15) est à trois valeurs de
 * `--encre` (13, 18, 22). L'obscurité de la pièce devient exactement l'encre du
 * site, et le raccord avec le voile du hero ne se voit pas.
 *
 *   node scripts/manifeste.mjs
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { etalonner, QUALITE_AVIF } from "./etalonnage.mjs";

const RACINE = join(dirname(fileURLToPath(import.meta.url)), "..");

const SOURCE = join(RACINE, "public/media/manifeste/allumage.mp4");
const CIBLE = join(RACINE, "public/frames/manifeste");

/** Cadence et largeur de sortie. Celles de la source : on n'invente rien. */
const IPS = 24;
const LARGEUR = 1280;

/** L'instant où les lumières s'allument, en secondes. C'est le seul repère. */
const ALLUMAGE_S = 2.8;

// ---------------------------------------------------------------------------
// Extraction
// ---------------------------------------------------------------------------

const tmp = mkdtempSync(join(tmpdir(), "rouviere-manifeste-"));

try {
  console.log("extraction…");
  execFileSync(
    "ffmpeg",
    [
      "-hide_banner",
      "-loglevel",
      "error",
      "-y",
      "-i",
      SOURCE,
      "-vf",
      `fps=${IPS},scale=${LARGEUR}:-2`,
      "-vsync",
      "0",
      join(tmp, "%04d.png"),
    ],
    { stdio: "inherit" },
  );

  const fichiers = readdirSync(tmp)
    .filter((n) => n.endsWith(".png"))
    .sort();
  if (fichiers.length === 0) throw new Error("aucune frame extraite");

  mkdirSync(CIBLE, { recursive: true });
  /* Le dossier est reconstruit à chaque passe : une frame orpheline d'un
     encodage précédent décalerait toute la séquence. */
  for (const ancien of readdirSync(CIBLE)) rmSync(join(CIBLE, ancien));

  let poids = 0;
  let plusLourde = 0;

  for (const [i, nom] of fichiers.entries()) {
    const image = await etalonner(sharp(join(tmp, nom)))
      .avif({ quality: QUALITE_AVIF, effort: 4 })
      .toBuffer();
    writeFileSync(join(CIBLE, `${String(i + 1).padStart(4, "0")}.avif`), image);
    poids += image.length;
    plusLourde = Math.max(plusLourde, image.length);
    if ((i + 1) % 24 === 0) {
      console.log(`  ${i + 1} / ${fichiers.length}`);
    }
  }

  /* La dernière image, la pièce pleinement allumée : c'est elle que rend le
     mouvement réduit, qui n'a pas de séquence à dérouler. */
  const derniere = fichiers[fichiers.length - 1];
  await etalonner(sharp(join(tmp, derniere)))
    .avif({ quality: QUALITE_AVIF, effort: 6 })
    .toFile(join(RACINE, "public/media/manifeste/allumage-poster.avif"));

  const index = Math.round(ALLUMAGE_S * IPS);

  console.log("");
  console.log(`frames        ${fichiers.length}`);
  console.log(`allumage      index ${index} (${ALLUMAGE_S} s)`);
  console.log(`poids total   ${(poids / 1024 / 1024).toFixed(2)} Mo`);
  console.log(`frame moyenne ${Math.round(poids / fichiers.length / 1024)} ko`);
  console.log(`frame max     ${Math.round(plusLourde / 1024)} ko`);
  console.log("");
  console.log("À reporter dans src/data/manifeste.ts :");
  console.log(`  nombre: ${fichiers.length}, indexAllumage: ${index}`);
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
