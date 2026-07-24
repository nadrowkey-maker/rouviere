/**
 * Les trois matières du chapitre *La Matière*.
 *
 * Trois plans macro, un par matière réellement présente dans un projet :
 * le noyer fumé de l'Appartement Laiton, la chaux blanche du Domaine des
 * Charmilles, le voile de lin de la Villa Calcaire. Sources dans
 * `medias-source/matieres/` (Pexels, licence libre) ; sorties dans
 * `public/media/matieres/`.
 *
 * Trois partis pris d'encodage, et leurs raisons :
 *
 * — **Boucle par aller-retour.** Chaque plan est une dérive lente de la caméra
 *   sur la surface : bout à bout, il saute. On le retourne et on le recolle
 *   derrière lui-même, la boucle devient exacte. Sur une matière immobile, le
 *   retour arrière ne se voit pas — c'est la seule façon d'avoir une boucle
 *   propre sans coupure visible, et le chapitre est fait pour qu'on s'y arrête.
 * — **Sept secondes de source.** Doublées par l'aller-retour, cela fait
 *   quatorze secondes de boucle : assez long pour qu'on ne sente pas le
 *   cycle, assez court pour tenir le budget avec trois vidéos dans la page.
 * — **Étalonnage.** Le même que les photographies, par `filtreVideo()`. Une
 *   vidéo qui n'aurait pas la courbe des images se verrait immédiatement.
 *
 *   node scripts/matieres.mjs
 */
import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import sharp from "sharp";
import {
  etalonner,
  filtreVideo,
  LARGEUR_MAX,
  QUALITE_AVIF,
} from "./etalonnage.mjs";

const SOURCE = "medias-source/matieres";
const CIBLE = "public/media/matieres";

/** Secondes retenues de chaque source, avant l'aller-retour. */
const DUREE = 7;
/** Seconde où est prise la poster : après le fondu d'entrée du plan. */
const POSTER_A = 3;

/**
 * Ces trois plans sont les fichiers les plus lourds du site : du grain fin sur
 * toute la surface, c'est le pire cas d'un codec inter-frames — il n'y a rien
 * à prédire d'une image à l'autre. D'où deux écarts au reste des médias, tenus
 * ici et nulle part ailleurs :
 *
 * — **1600 px de large** au lieu de 1920. Une matière n'a pas de ligne droite à
 *   restituer ; l'agrandissement de vingt pour cent ne se voit pas, et il
 *   enlève un tiers du poids.
 * — **Un cran de quantification en plus.** Le mouvement lent masque le bruit de
 *   compression, et le chapitre ne montre qu'une matière à la fois : le
 *   navigateur ne charge jamais les trois ensemble.
 * — **Pas de WebM.** Le VP9 sert à peser moins que le H.264 ; mesuré sur ces
 *   trois plans, il pèse trois fois plus — le grain fin est le pire cas d'un
 *   codec qui prédit d'une image à l'autre, et VP9 y dépense davantage que
 *   H.264. Un second format qui alourdit le fichier servi n'a aucune raison
 *   d'exister : les projets, eux, gardent leur WebM, où il gagne.
 */
const LARGEUR = 1600;
const CRF_H264 = 28;

const MATIERES = [
  { cle: "noyer-fume", debut: 6 },
  { cle: "chaux-blanche", debut: 2 },
  { cle: "voile-de-lin", debut: 3 },
];

/* L'aller-retour : on coupe, on duplique, on retourne la copie, on concatène.
   `reverse` charge le segment en mémoire — d'où la coupe *avant*, jamais après. */
const ALLER_RETOUR =
  "[0:v]" +
  filtreVideo(LARGEUR) +
  ",split[a][b];[b]reverse[r];[a][r]concat=n=2:v=1:a=0[v]";

const ffmpeg = (args) => execFileSync("ffmpeg", ["-v", "error", ...args]);

mkdirSync(CIBLE, { recursive: true });

for (const { cle, debut } of MATIERES) {
  const src = `${SOURCE}/${cle}.mp4`;

  ffmpeg([
    "-ss", String(debut), "-t", String(DUREE), "-i", src,
    "-filter_complex", ALLER_RETOUR, "-map", "[v]", "-an",
    "-c:v", "libx264", "-crf", String(CRF_H264), "-preset", "slow",
    "-pix_fmt", "yuv420p", "-movflags", "+faststart",
    "-y", `${CIBLE}/${cle}.mp4`,
  ]);

  /* La poster passe par sharp, pas par ffmpeg : c'est une image fixe, elle
     suit la voie des images. Le PNG intermédiaire n'est pas étalonné — la
     courbe est posée une seule fois, au dernier moment. */
  const brut = `${CIBLE}/_${cle}.png`;
  ffmpeg([
    "-ss", String(debut + POSTER_A), "-i", src, "-frames:v", "1",
    "-vf", `scale=${LARGEUR_MAX}:-2`, "-y", brut,
  ]);
  await etalonner(sharp(brut))
    .avif({ quality: QUALITE_AVIF })
    .toFile(`${CIBLE}/${cle}-poster.avif`);
  execFileSync("node", ["-e", `require('fs').unlinkSync(${JSON.stringify(brut)})`]);

  console.log("matière", cle);
}

console.log("Trois matières encodées dans", CIBLE);
