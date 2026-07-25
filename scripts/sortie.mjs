/**
 * Le plan de fond de *La Sortie* — la nuée qui passe sur la crête.
 *
 * Le nœud de verre réfractant a quitté le chapitre : à sa place, un plan large
 * en boucle, gris, froid, sans personne. Le mot ROUVIÈRE se pose dessus en
 * `mix-blend-mode: difference`, comme le logotype se pose sur tout le reste.
 *
 * Trois choses sont faites ici, et une seule fois :
 *
 * — **L'étalonnage commun.** Le plan sort du même laboratoire que les
 *   photographies et que les matières : `filtreVideo()`, jamais une courbe
 *   écrite à la main. Sans lui, la dernière image du site serait la seule à ne
 *   pas avoir été prise par le même photographe le même jour.
 * — **La boucle par fondu enchaîné.** La nuée dérive dans un sens : bout à
 *   bout, elle saute. On prend la queue du plan et on la fond sur sa tête, ce
 *   qui rend le raccord invisible sur une matière aussi molle qu'un brouillard.
 *   L'aller-retour des matières ne conviendrait pas ici : sur un nuage qui
 *   avance, la marche arrière se voit immédiatement.
 * — **Le poids.** La source pèse dix-sept mégaoctets pour cinquante-quatre
 *   secondes. Un fond de chapitre n'a pas le droit de coûter ça : le grain est
 *   inexistant, le mouvement très lent, la quantification peut monter sans
 *   qu'on voie quoi que ce soit.
 *
 *   node scripts/sortie.mjs
 */
import { execFileSync } from "node:child_process";
import { statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import {
  filtreVideo,
  FILTRE_FFMPEG,
  LARGEUR_MAX,
  QUALITE_AVIF,
} from "./etalonnage.mjs";

const RACINE = join(dirname(fileURLToPath(import.meta.url)), "..");
const DOSSIER = join(RACINE, "public/media/sortie");

const SOURCE = join(DOSSIER, "sortie.mp4");
const CIBLE = join(DOSSIER, "plan.mp4");
const POSTER = join(DOSSIER, "plan-poster.avif");

/** Durée retenue, fondu compris. La source en fait 54,3. */
const DUREE = 50;
/** Longueur du fondu enchaîné qui referme la boucle. */
const FONDU = 2;
/** Une nuée n'a pas de détail : la quantification peut monter. */
const CRF = 28;
/** Seconde d'où est tirée la poster. */
const POSTER_A = 6;

const ko = (chemin) => `${Math.round(statSync(chemin).size / 1024)} ko`;

/* La queue du plan se fond sur sa tête : `[queue][tête]xfade` produit les deux
   dernières secondes, qu'on recolle derrière le corps. La boucle se referme
   donc sur elle-même sans raccord. */
const corps = DUREE - FONDU;
const chaine = [
  `[0:v]${filtreVideo(LARGEUR_MAX)},split=3[a][b][c]`,
  `[a]trim=0:${corps},setpts=PTS-STARTPTS[corps]`,
  `[b]trim=${corps}:${DUREE},setpts=PTS-STARTPTS[queue]`,
  `[c]trim=0:${FONDU},setpts=PTS-STARTPTS[tete]`,
  `[queue][tete]xfade=transition=fade:duration=${FONDU}:offset=0[raccord]`,
  `[corps][raccord]concat=n=2:v=1:a=0[sortie]`,
].join(";");

console.log("encodage du plan…");
execFileSync(
  "ffmpeg",
  [
    "-hide_banner",
    "-loglevel",
    "error",
    "-y",
    "-i",
    SOURCE,
    "-filter_complex",
    chaine,
    "-map",
    "[sortie]",
    "-an",
    "-c:v",
    "libx264",
    "-crf",
    String(CRF),
    "-preset",
    "slow",
    "-pix_fmt",
    "yuv420p",
    "-movflags",
    "+faststart",
    CIBLE,
  ],
  { stdio: "inherit" },
);

console.log("poster…");
const brut = execFileSync(
  "ffmpeg",
  [
    "-hide_banner",
    "-loglevel",
    "error",
    "-ss",
    String(POSTER_A),
    "-i",
    SOURCE,
    "-frames:v",
    "1",
    "-vf",
    `scale=${LARGEUR_MAX}:-2,${FILTRE_FFMPEG}`,
    "-f",
    "image2pipe",
    "-vcodec",
    "png",
    "-",
  ],
  { maxBuffer: 1 << 28 },
);
/* L'étalonnage est déjà posé par ffmpeg ci-dessus : sharp ne fait plus que
   l'encodage. On ne l'applique pas deux fois. */
await sharp(brut).avif({ quality: QUALITE_AVIF, effort: 6 }).toFile(POSTER);

console.log("");
console.log(`plan.mp4         ${ko(CIBLE)}`);
console.log(`plan-poster.avif ${ko(POSTER)}`);
