/**
 * L'allègement des nappes et des ambiances.
 *
 * ------------------------------------------------------------------
 * Pourquoi ce script existe
 * ------------------------------------------------------------------
 * Les seize fichiers de `public/audio` pèsent 71 Mo, soit un quart du site, et
 * quatorze d'entre eux sont encodés entre 228 et 288 kb/s. C'est un débit de
 * masterisation musicale appliqué à des nappes de pièce : `eau.mp3` est neuf
 * minutes de fond d'eau en mono à 256 kb/s, `trame.mp3` est décrit dans
 * `SonProvider` comme n'ayant rien au-dessus de 120 Hz — et coûte 288 kb/s.
 *
 * Ces contenus sont lents, sans transitoires, souvent sous-graves. Ils sont
 * transparents à 128 kb/s, et le fond mono l'est à 80.
 *
 * ------------------------------------------------------------------
 * Ce que ce script ne fait surtout pas
 * ------------------------------------------------------------------
 * **Aucun filtre.** Pas de normalisation, pas de `loudnorm`, pas de `volume`.
 *
 * C'est la contrainte qui gouverne tout le fichier. `SonProvider.tsx` porte des
 * gains réglés à la main sur des mesures réelles — `atelier.mp3` à −31,9 LUFS
 * pour un gain de 2,2, `trame.mp3` à −40,1 LUFS pour un gain de 5,5. Ces
 * nombres sont un mixage, pas des valeurs par défaut. Un ré-encodage sans
 * filtre conserve la loudness à un dixième de décibel près et les laisse
 * valides ; le moindre `-af` les invaliderait tous d'un coup, et le site
 * ressortirait avec des nappes qui s'écrasent les unes les autres.
 *
 * Le nombre de canaux et la fréquence d'échantillonnage sont conservés pour la
 * même raison : `eau.mp3` est mono par construction, les nappes stéréo portent
 * une image qui est travaillée.
 *
 * ------------------------------------------------------------------
 * Les trois exclus
 * ------------------------------------------------------------------
 * `sfx/woosh`, `sfx/lumiere` et `sfx/titre` ne sont pas dans la liste : ils
 * pèsent 36, 44 et 164 ko. Il n'y a rien à y gagner, et ce sont les seuls
 * fichiers du lot à être des transitoires — exactement le matériau sur lequel
 * une génération de perte s'entendrait.
 *
 * ------------------------------------------------------------------
 * La prudence
 * ------------------------------------------------------------------
 * Même protocole que `media-master.mjs` : encodage sous un nom temporaire,
 * remplacement seulement si ffmpeg a rendu 0, que la durée est conservée au
 * dixième de seconde, et que le fichier a maigri.
 *
 * Un ré-encodage MP3 vers MP3 est une génération de perte. Sur ce matériau elle
 * est inaudible, mais elle est réelle : après passage, réécouter le parcours
 * une fois avec un casque avant de commiter.
 *
 * Usage : `node scripts/audio-alleger.mjs`
 */

import { spawnSync } from "node:child_process";
import { existsSync, renameSync, statSync, unlinkSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const RACINE = join(dirname(fileURLToPath(import.meta.url)), "..");

/** Le débit cible des nappes stéréo. Transparent sur ce matériau. */
const NAPPE = "128k";

/**
 * Les fichiers à reprendre. Les trois brefs de `sfx/` en sont absents, et c'est
 * volontaire — voir l'en-tête.
 */
const PISTES = [
  /* Neuf minutes de fond d'eau, en mono, à 256 kb/s. Le plus gros gain du lot. */
  { chemin: "public/audio/eau.mp3", debit: "80k" },

  /* Les cinq mondes de projet : trois minutes chacun, tous au-dessus de 240. */
  { chemin: "public/audio/projets/projet-1.mp3", debit: NAPPE },
  { chemin: "public/audio/projets/projet-2.mp3", debit: NAPPE },
  { chemin: "public/audio/projets/projet-3.mp3", debit: NAPPE },
  { chemin: "public/audio/projets/projet-4.mp3", debit: NAPPE },
  { chemin: "public/audio/projets/projet-5.mp3", debit: NAPPE },

  /* Les deux nappes qui se croisent au seuil. */
  { chemin: "public/audio/hero.mp3", debit: NAPPE },
  { chemin: "public/audio/site.mp3", debit: NAPPE },

  /* Les nappes de chapitre. */
  { chemin: "public/audio/atelier.mp3", debit: NAPPE },
  { chemin: "public/audio/relief.mp3", debit: NAPPE },
  { chemin: "public/audio/trame.mp3", debit: NAPPE },
  { chemin: "public/audio/sortie.mp3", debit: NAPPE },

  /* L'ambiance de nature du dernier chapitre. */
  { chemin: "public/audio/sfx/nature1.mp3", debit: NAPPE },
];

/**
 * La marge au-dessus du débit cible en deçà de laquelle une piste est
 * considérée comme déjà traitée.
 *
 * Même raison que dans `media-master.mjs` : sans ce garde-fou, une seconde
 * exécution ré-encoderait des fichiers déjà encodés et empilerait les
 * générations de perte. LAME vise le débit demandé de près, une marge de dix
 * pour cent suffit à séparer le traité de l'original — les sources étaient
 * toutes au-dessus de 228 k pour une cible à 128.
 */
const MARGE = 1.1;

function mega(octets) {
  return `${(octets / 1024 / 1024).toFixed(1)} Mo`;
}

/** Le débit d'une piste, en kb/s. `null` si ffprobe n'en tire rien. */
function debit(fichier) {
  const sortie = spawnSync(
    "ffprobe",
    [
      "-v", "error",
      "-select_streams", "a:0",
      "-show_entries", "stream=bit_rate",
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

for (const { chemin, debit: debitVoulu } of PISTES) {
  const source = join(RACINE, chemin);
  const temporaire = source.replace(/\.mp3$/, ".encodage.mp3");

  if (!existsSync(source)) {
    console.error(`absent, ignoré : ${chemin}`);
    echec = true;
    continue;
  }

  const cible = Number.parseInt(debitVoulu, 10);
  const actuel = debit(source);

  if (actuel !== null && actuel <= cible * MARGE) {
    console.log(
      `${chemin.replace("public/audio/", "").padEnd(24)}` +
        `déjà traité (${actuel}k ≤ ${Math.round(cible * MARGE)}k), laissé tel quel`,
    );
    continue;
  }

  const resultat = spawnSync(
    "ffmpeg",
    [
      "-y",
      "-i", source,
      "-c:a", "libmp3lame",
      "-b:a", debitVoulu,
      /* Ni `-ac` ni `-ar` : les canaux et la fréquence de la source sont
         conservés tels quels. Et surtout aucun `-af`. */
      "-map_metadata", "-1",
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
      `durée divergente, original conservé : ${chemin} ` +
        `(${dureeSource} s → ${dureeCible} s)`,
    );
    unlinkSync(temporaire);
    echec = true;
    continue;
  }

  const avant = statSync(source).size;
  const apres = statSync(temporaire).size;

  if (apres >= avant) {
    console.log(`${chemin.padEnd(40)} déjà optimal, original conservé`);
    unlinkSync(temporaire);
    continue;
  }

  renameSync(temporaire, source);
  avantTotal += avant;
  apresTotal += apres;

  console.log(
    `${chemin.replace("public/audio/", "").padEnd(24)}` +
      `${mega(avant).padStart(9)} → ${mega(apres).padStart(9)}` +
      `  (−${Math.round((1 - apres / avant) * 100)} %)`,
  );
}

if (avantTotal === 0) {
  console.log("\nrien à reprendre : toutes les pistes sont déjà à leur débit cible.");
} else {
  console.log(
    `\n${"total".padEnd(24)}${mega(avantTotal).padStart(9)} → ` +
      `${mega(apresTotal).padStart(9)}  ` +
      `(−${Math.round((1 - apresTotal / avantTotal) * 100)} %)`,
  );
}

process.exit(echec ? 1 : 0);
