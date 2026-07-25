/**
 * Les planches du chapitre *L'Atelier*.
 *
 * Ce script remplace le générateur d'études de lumière qui tenait la place :
 * les photographies sont maintenant de vraies photographies. Sources dans
 * `medias-source/atelier/` (Pexels, licence libre), sorties dans
 * `public/media/atelier/`.
 *
 * Les six plans, et pourquoi ceux-là. Le chapitre raconte une méthode en trois
 * registres — on dessine, on choisit la matière, on dépose — et chaque registre
 * a deux plans, un large et un serré. Aucun ne montre de personne : c'est la
 * règle du Livre V, et elle vaut aussi pour le portrait, qui sort donc du
 * chapitre. L'atelier se raconte par ce qu'il laisse sur les tables, pas par un
 * visage de banque d'images.
 *
 * Le cadrage est conservé tel quel — pas de recadrage automatique. La variance
 * d'échelle du chapitre vient des proportions réelles des plans, portraits et
 * paysages mêlés ; les ramener au carré la détruirait. La seule exception est le
 * plan de plongée, et elle est motivée plus bas.
 *
 * **La planche de plongée est filmée, et c'est la seule du chapitre.** On ne
 * plonge pas dans une photographie : au sommet, quand les quatre bords du
 * guichet rejoignent ceux de l'écran, il faut qu'il reste quelque chose de
 * vivant dans l'image — sinon le plein écran n'est qu'un agrandissement, et le
 * point culminant du chapitre est une image fixe très grande. Ce plan-là est
 * donc une vidéo : la table à tréteaux, la lampe d'architecte, la maquette et
 * les élévations punaisées, en très lente avancée d'appareil. Les cinq autres
 * planches restent des photographies — le chapitre est une séquence *montée*,
 * et un seul de ses plans bouge de lui-même.
 *
 *   node scripts/atelier.mjs
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

const SOURCE = "medias-source/atelier";
const CIBLE = "public/media/atelier";

/** `cle` nomme le fichier de sortie ; `source` est l'identifiant Pexels. */
const PLANCHES = [
  { cle: "plans", source: "34573691" },
  { cle: "maquette", source: "7883885" },
  { cle: "chantier", source: "7937304" },
  { cle: "dossiers", source: "6614786" },
  { cle: "chassis", source: "3777913" },
];

/* ---- Le plan de plongée, filmé ------------------------------------------
 *
 * Source : `medias-source/atelier/atelier.mp4` (Pexels 6615058, licence libre).
 *
 * Trois partis pris, et leurs raisons :
 *
 * — **Recadré.** Le plan d'origine laisse entrer une fronde de palmier par le
 *   bord droit. Le Livre V interdit la plante en pot ; on coupe donc les vingt
 *   pour cent de droite, en tenant le 16/9 par une coupe symétrique en hauteur.
 *   C'est le seul recadrage du chapitre, et il n'est pas une commodité : il
 *   retire quelque chose que la règle proscrit.
 * — **Huit secondes, recollées en aller-retour.** Même mécanique que les
 *   matières : l'avancée d'appareil est trop lente pour que le retour arrière se
 *   voie, et la boucle devient exacte. Seize secondes de cycle sur un mouvement
 *   de cette lenteur, on ne le sent pas.
 * — **Étalonnage commun.** `filtreVideo()`, comme tout le reste. Une vidéo qui
 *   n'aurait pas la courbe des photographies se verrait au premier coup d'œil,
 *   et elle serait ici juste à côté de cinq d'entre elles.
 */
const PLONGEE = {
  cle: "atelier",
  source: "atelier.mp4",
  /** Seconde d'entrée : l'avancée est alors installée, le cadre posé. */
  debut: 8,
  /** Secondes retenues avant l'aller-retour. */
  duree: 8,
  /** Le recadrage, en pixels de la source (2560 × 1440). */
  recadrage: "1980:1114:0:250",
  /** Seconde d'où est tirée la poster, comptée depuis `debut`. */
  posterA: 3,
};

/** La boucle par aller-retour : on coupe, on duplique, on retourne, on colle. */
const ALLER_RETOUR =
  `[0:v]crop=${PLONGEE.recadrage},` +
  filtreVideo(LARGEUR_MAX) +
  ",split[a][b];[b]reverse[r];[a][r]concat=n=2:v=1:a=0[v]";

const ffmpeg = (args) => execFileSync("ffmpeg", ["-v", "error", ...args]);

mkdirSync(CIBLE, { recursive: true });

for (const { cle, source } of PLANCHES) {
  /* `fit: inside` borne le plus grand côté sans jamais déformer : un portrait
     sort en 1920 de haut, un paysage en 1920 de large. C'est la définition
     qu'il faut pour une planche à 85 vh sur un écran à deux pixels par point,
     et pas un de plus. */
  const image = sharp(`${SOURCE}/${source}.jpg`).resize(
    LARGEUR_MAX,
    LARGEUR_MAX,
    { fit: "inside", withoutEnlargement: true },
  );

  const info = await etalonner(image)
    .avif({ quality: QUALITE_AVIF })
    .toFile(`${CIBLE}/${cle}.avif`);

  console.log(
    "planche",
    cle,
    `${info.width}×${info.height}`,
    `${Math.round(info.size / 1024)} ko`,
  );
}

/* ---- Le plan filmé ------------------------------------------------------ */

const src = `${SOURCE}/${PLONGEE.source}`;

ffmpeg([
  "-ss", String(PLONGEE.debut), "-t", String(PLONGEE.duree), "-i", src,
  "-filter_complex", ALLER_RETOUR, "-map", "[v]", "-an",
  "-c:v", "libx264", "-crf", "23", "-preset", "slow",
  "-pix_fmt", "yuv420p", "-movflags", "+faststart",
  "-y", `${CIBLE}/${PLONGEE.cle}.mp4`,
]);

/* La poster passe par sharp, pas par ffmpeg : c'est une image fixe, elle suit
   la voie des images. Le PNG intermédiaire n'est pas étalonné — la courbe est
   posée une seule fois, au dernier moment. */
const brut = `${CIBLE}/_${PLONGEE.cle}.png`;
ffmpeg([
  "-ss", String(PLONGEE.debut + PLONGEE.posterA), "-i", src, "-frames:v", "1",
  "-vf", `crop=${PLONGEE.recadrage},scale=${LARGEUR_MAX}:-2`, "-y", brut,
]);
await etalonner(sharp(brut))
  .avif({ quality: QUALITE_AVIF })
  .toFile(`${CIBLE}/${PLONGEE.cle}-poster.avif`);
unlinkSync(brut);

console.log("plan filmé", PLONGEE.cle);
console.log("Cinq planches et un plan filmé, étalonnés dans", CIBLE);
