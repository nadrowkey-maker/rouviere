/**
 * Le ré-encodage des masters du parcours.
 *
 * ------------------------------------------------------------------
 * Pourquoi ce script existe
 * ------------------------------------------------------------------
 * `media-mobile.mjs` a réglé le téléphone, en déclinant les quatre plans lourds
 * en 720p sous `<source media>`. Il n'a pas touché aux masters, et les masters
 * sont encodés trois à six fois au-dessus de ce que leur image demande :
 *
 *   piscine.mp4       14,2 Mb/s   pour un plan fixe sur une eau calme
 *   voile-de-lin.mp4  10,5 Mb/s   pour un travelling de dix secondes
 *   chaux-blanche.mp4  9,8 Mb/s   idem
 *   hero.mp4           8,9 Mb/s   quarante secondes de nuée
 *
 * Un H.264 1080p bien réglé tient ces plans entre 2 et 3,5 Mb/s. Le reste est
 * du débit que personne ne voit et que tout le monde télécharge — y compris le
 * visiteur sur grand écran, qui est justement celui qu'on cherche à impressionner.
 *
 * Trois d'entre eux n'ont par ailleurs **pas d'index en tête** : `hero`,
 * `chaux-blanche` et `voile-de-lin` rangent leur `moov` après les données. Le
 * lecteur doit donc recevoir le fichier entier avant d'afficher sa première
 * image. Sur le hero, c'est l'écran d'entrée qui attend quarante-trois
 * mégaoctets pour ouvrir ses portes.
 *
 * ------------------------------------------------------------------
 * Ce que ce script ne doit jamais toucher
 * ------------------------------------------------------------------
 * **Les entrées de fabrication.** Deux rushes vivent dans `public/` sans être
 * des actifs du site : `manifeste/allumage.mp4`, dont `scripts/manifeste.mjs`
 * tire les 192 frames du vestibule, et `sortie/sortie.mp4`, dont
 * `scripts/sortie.mjs` tire `plan.mp4`. Le navigateur ne les demande jamais, et
 * le `.gitignore` les exclut de l'index pour cette raison précise.
 *
 * Les ré-encoder ne gagne rien — ils ne sont ni servis ni déployés — et coûte
 * une génération de perte sur un master dont l'historique git ne garde aucune
 * copie. Ils sont hors de la liste ci-dessous, et doivent le rester.
 *
 * La règle générale : avant d'ajouter un fichier à `MASTERS`, vérifier qu'il
 * est référencé depuis `src/` et absent du `.gitignore`.
 *
 * ------------------------------------------------------------------
 * Les réglages, et ce qui les distingue de ceux du mobile
 * ------------------------------------------------------------------
 * `-crf 21` — plus fin que le 27 du mobile, parce que ces fichiers sont vus en
 *   plein écran sur une dalle large. C'est la limite basse du visuellement sans
 *   perte pour du 1080p ; descendre à 18 doublerait le poids sans rien montrer.
 *
 * `-maxrate` par plan — le CRF seul laisse les plans agités (l'eau, la nuée)
 *   repartir très haut sur leurs passages chargés. Le plafond borne le pire cas.
 *   Il est réglé plan par plan plus bas : un travelling lent sur un mur de chaux
 *   n'a pas les besoins d'une surface d'eau.
 *
 * `-profile:v high` — contrairement au mobile, qui vise le décodeur matériel de
 *   tout appareil encore en service. Sur un ordinateur, `high` gagne du poids à
 *   qualité égale et se décode partout.
 *
 * `-g 120` — une image-clé toutes les quatre secondes. Ces plans sont des
 *   boucles longues, pas des cibles de navigation : espacer les images-clés est
 *   du poids gagné, et le raccord de boucle repart de toute façon sur l'une.
 *
 * `-an` — aucune piste sonore. Les plans sont tous montés `muted` ; le son du
 *   site est un bus Web Audio. `voile-de-lin.mp4` traînait une piste AAC que
 *   personne n'a jamais entendue.
 *
 * `-movflags +faststart` — l'index en tête, pour tous cette fois.
 *
 * ------------------------------------------------------------------
 * La prudence
 * ------------------------------------------------------------------
 * Chaque plan est encodé à côté de son master, sous un nom temporaire. Le
 * remplacement n'a lieu que si ffmpeg a rendu 0, que la durée du résultat est
 * celle de la source à un dixième de seconde près, et que le fichier a
 * effectivement maigri. Sinon le temporaire est jeté et le master reste intact.
 *
 * Les variantes `-mobile` ne sont pas concernées : elles sont déjà réglées.
 * Après un passage ici, les régénérer depuis les nouveaux masters ne change
 * rien à leur poids — elles sont bornées par leur propre plafond.
 *
 * Usage : `node scripts/media-master.mjs`
 */

import { spawnSync } from "node:child_process";
import { existsSync, renameSync, statSync, unlinkSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const RACINE = join(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * Les masters à reprendre, avec leur plafond de débit.
 *
 * Absents de la liste, et c'est volontaire : `sortie/plan.mp4` (691 kb/s) et
 * `atelier/atelier.mp4` (892 kb/s) sont déjà sous le seuil — les reprendre ne
 * ferait que leur infliger une génération de perte pour rien. Et
 * `manifeste/allumage.mp4` comme `sortie/sortie.mp4` sont des rushes, pas des
 * actifs : voir l'en-tête.
 */
const MASTERS = [
  /* La nuée du seuil : beaucoup de grain en mouvement, c'est le plan qui
     demande le plus de débit du site. */
  { chemin: "public/media/hero/hero.mp4", plafond: "4500k" },
  /* Une surface d'eau : le pire cas pour un encodeur, chaque ride est du
     détail neuf à chaque image. */
  { chemin: "public/media/manifeste/piscine.mp4", plafond: "5000k" },
  /* Travellings lents sur des surfaces mates : peu de mouvement, peu de besoin. */
  { chemin: "public/media/matieres/chaux-blanche.mp4", plafond: "3500k" },
  { chemin: "public/media/matieres/voile-de-lin.mp4", plafond: "3500k" },
  /* Les cinq plans de projet, joués en vignette dans le curseur. */
  { chemin: "public/media/projets/projet-1/video.mp4", plafond: "3000k" },
  { chemin: "public/media/projets/projet-2/video.mp4", plafond: "3000k" },
  { chemin: "public/media/projets/projet-3/video.mp4", plafond: "3000k" },
  { chemin: "public/media/projets/projet-4/video.mp4", plafond: "3000k" },
  { chemin: "public/media/projets/projet-5/video.mp4", plafond: "3000k" },
];

const CRF = 21;

/**
 * La marge au-dessus du plafond en deçà de laquelle un master est considéré
 * comme déjà traité.
 *
 * Elle existe parce que `-maxrate` borne une moyenne glissante sur la durée du
 * tampon, pas le débit du fichier fini : un plan encodé sous un plafond de
 * 5 000 k ressort à 5 133 k, ce qui est le comportement normal. Sans marge, le
 * script se croirait en retard sur son propre travail et ré-encoderait à chaque
 * exécution — chaque passage empilant une génération de perte sur la précédente.
 *
 * Vingt-cinq pour cent séparent proprement les deux états mesurés ici : les
 * masters d'origine étaient à deux ou trois fois leur plafond, les masters
 * traités sont à moins de cinq pour cent au-dessus.
 */
const MARGE = 1.25;

function mega(octets) {
  return `${(octets / 1024 / 1024).toFixed(1)} Mo`;
}

/** Le débit d'un média, en kb/s. `null` si ffprobe n'en tire rien. */
function debit(fichier) {
  const sortie = spawnSync(
    "ffprobe",
    [
      "-v", "error",
      "-show_entries", "format=bit_rate",
      "-of", "csv=p=0",
      fichier,
    ],
    { encoding: "utf8" },
  );
  const valeur = Number.parseInt(String(sortie.stdout).trim(), 10);
  return Number.isFinite(valeur) ? Math.round(valeur / 1000) : null;
}

/** La durée d'un média, en secondes. `null` si ffprobe n'en tire rien. */
function duree(fichier) {
  const sortie = spawnSync(
    "ffprobe",
    [
      "-v", "error",
      "-show_entries", "format=duration",
      "-of", "csv=p=0",
      fichier,
    ],
    { encoding: "utf8" },
  );
  const valeur = Number.parseFloat(String(sortie.stdout).trim());
  return Number.isFinite(valeur) ? valeur : null;
}

let echec = false;
let avantTotal = 0;
let apresTotal = 0;

for (const { chemin, plafond } of MASTERS) {
  const source = join(RACINE, chemin);
  const temporaire = source.replace(/\.mp4$/, ".encodage.mp4");

  if (!existsSync(source)) {
    console.error(`absent, ignoré : ${chemin}`);
    echec = true;
    continue;
  }

  const cap = Number.parseInt(plafond, 10);
  const actuel = debit(source);

  if (actuel !== null && actuel <= cap * MARGE) {
    console.log(
      `${chemin.replace("public/media/", "").padEnd(34)}` +
        `déjà traité (${actuel}k ≤ ${Math.round(cap * MARGE)}k), laissé tel quel`,
    );
    continue;
  }

  const tampon = `${cap * 2}k`;

  const resultat = spawnSync(
    "ffmpeg",
    [
      "-y",
      "-i", source,
      "-c:v", "libx264",
      "-profile:v", "high",
      "-preset", "slow",
      "-crf", String(CRF),
      "-maxrate", plafond,
      "-bufsize", tampon,
      "-g", "120",
      "-pix_fmt", "yuv420p",
      "-an",
      "-movflags", "+faststart",
      temporaire,
    ],
    { stdio: ["ignore", "ignore", "pipe"] },
  );

  if (resultat.status !== 0) {
    console.error(`échec d'encodage : ${chemin}`);
    console.error(String(resultat.stderr).split("\n").slice(-12).join("\n"));
    if (existsSync(temporaire)) unlinkSync(temporaire);
    echec = true;
    continue;
  }

  const dureeSource = duree(source);
  const dureeCible = duree(temporaire);

  if (
    dureeSource === null ||
    dureeCible === null ||
    Math.abs(dureeSource - dureeCible) > 0.1
  ) {
    console.error(
      `durée divergente, master conservé : ${chemin} ` +
        `(${dureeSource} s → ${dureeCible} s)`,
    );
    unlinkSync(temporaire);
    echec = true;
    continue;
  }

  const avant = statSync(source).size;
  const apres = statSync(temporaire).size;

  if (apres >= avant) {
    console.log(`${chemin.padEnd(44)} déjà optimal, master conservé`);
    unlinkSync(temporaire);
    continue;
  }

  renameSync(temporaire, source);
  avantTotal += avant;
  apresTotal += apres;

  console.log(
    `${chemin.replace("public/media/", "").padEnd(34)}` +
      `${mega(avant).padStart(9)} → ${mega(apres).padStart(9)}` +
      `  (−${Math.round((1 - apres / avant) * 100)} %)`,
  );
}

if (avantTotal === 0) {
  console.log("\nrien à reprendre : tous les masters sont déjà sous leur plafond.");
} else {
  console.log(
    `\n${"total".padEnd(34)}${mega(avantTotal).padStart(9)} → ` +
      `${mega(apresTotal).padStart(9)}  ` +
      `(−${Math.round((1 - apresTotal / avantTotal) * 100)} %)`,
  );
}

process.exit(echec ? 1 : 0);
