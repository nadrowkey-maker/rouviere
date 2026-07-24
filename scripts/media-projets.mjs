/**
 * Les médias des cinq projets : une vidéo d'ouverture et trois photographies
 * par projet. Sources dans `medias-source/projets/projet-N/`, sorties dans
 * `public/media/projets/projet-N/`.
 *
 * Ce script ne décide plus de quoi a l'air une image : il appelle
 * `scripts/etalonnage.mjs`, comme l'atelier et les matières. C'est ce qui fait
 * que l'ensemble a l'air pris par le même photographe — une seule courbe, une
 * seule désaturation, un seul point noir, pour tout ce que le site affiche.
 *
 * La poster de chaque vidéo passe par sharp et non par ffmpeg : c'est une image
 * fixe, elle suit la voie des images. Sans quoi elle porterait une courbe
 * calculée par un autre moteur, et on verrait la vidéo changer de teinte au
 * moment où elle commence à jouer.
 *
 *   node scripts/media-projets.mjs
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, unlinkSync } from "node:fs";
import sharp from "sharp";
import {
  etalonner,
  filtreVideo,
  LARGEUR_MAX,
  QUALITE_AVIF,
} from "./etalonnage.mjs";

const SOURCE = "medias-source/projets";
const CIBLE = "public/media/projets";

/** Par projet : les trois PNG sources retenus, dans l'ordre d'affichage. */
const ORDRE = {
  1: [3, 4, 2], // dressing, salle d'eau d'onyx, façade
  2: [2, 3, 4], // hall, chambre, salon de lecture
  3: [4, 2, 3], // jardin et bassin, cuisine, salle de bains
  4: [2, 3, 4], // séjour blanc, bain de marbre, cuisine
  5: [4, 3, 2], // séjour de teck, salle d'eau sombre, volume blanc
};

/** Seconde de la vidéo d'où est tirée la poster : un plan représentatif. */
const POSTER_A = { 1: 4, 2: 7, 3: 6, 4: 14, 5: 7 };

/** Secondes retenues de chaque vidéo d'ouverture. */
const DUREE = 12;

const ffmpeg = (args) => execFileSync("ffmpeg", ["-v", "error", ...args]);

for (const n of [1, 2, 3, 4, 5]) {
  const source = `${SOURCE}/projet-${n}`;
  const cible = `${CIBLE}/projet-${n}`;
  const video = `${source}/source.mp4`;
  mkdirSync(cible, { recursive: true });

  // ---- Les trois photographies ----------------------------------------
  for (let i = 0; i < 3; i += 1) {
    const image = sharp(`${source}/${ORDRE[n][i]}.png`).resize(LARGEUR_MAX, null, {
      withoutEnlargement: true,
    });
    await etalonner(image)
      .avif({ quality: QUALITE_AVIF })
      .toFile(`${cible}/${i + 1}.avif`);
  }
  console.log("photos", `projet-${n}`);

  // ---- La poster, tirée d'un plan représentatif ------------------------
  const brut = `${cible}/_poster.png`;
  ffmpeg([
    "-ss", String(POSTER_A[n]), "-i", video, "-frames:v", "1",
    "-vf", `scale=${LARGEUR_MAX}:-2`, "-y", brut,
  ]);
  await etalonner(sharp(brut))
    .avif({ quality: QUALITE_AVIF })
    .toFile(`${cible}/poster.avif`);
  unlinkSync(brut);
  console.log("poster", `projet-${n}`);

  // ---- La vidéo, muette, en deux formats -------------------------------
  ffmpeg([
    "-t", String(DUREE), "-i", video, "-an", "-vf", filtreVideo(LARGEUR_MAX),
    "-c:v", "libx264", "-crf", "24", "-preset", "slow",
    "-pix_fmt", "yuv420p", "-movflags", "+faststart",
    "-y", `${cible}/video.mp4`,
  ]);
  ffmpeg([
    "-t", String(DUREE), "-i", video, "-an", "-vf", filtreVideo(LARGEUR_MAX),
    "-c:v", "libvpx-vp9", "-crf", "34", "-b:v", "0", "-row-mt", "1",
    "-y", `${cible}/video.webm`,
  ]);
  console.log("vidéo", `projet-${n}`);
}

console.log("Cinq projets étalonnés dans", CIBLE);
