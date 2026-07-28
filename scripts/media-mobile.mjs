/**
 * Les variantes mobiles des plans lourds du parcours.
 *
 * ------------------------------------------------------------------
 * Pourquoi ce script existe
 * ------------------------------------------------------------------
 * Quatre plans du site sont encodés pour un grand écran et pesaient, à eux
 * seuls, 117 Mo :
 *
 *   hero.mp4          40,0 s   8,9 Mb/s    44 Mo
 *   piscine.mp4       27,4 s  14,2 Mb/s    47 Mo
 *   chaux-blanche.mp4 10,5 s   9,8 Mb/s    13 Mo
 *   voile-de-lin.mp4  10,1 s  10,5 Mb/s    13 Mo
 *
 * Sur un téléphone, ces débits n'achètent rien : le hero est cadré en `cover`
 * dans une fenêtre portrait, où l'on ne voit qu'un tiers de la largeur de
 * l'image, et l'écran d'entrée **attend que la vidéo soit jouable** avant
 * d'ouvrir ses deux portes. En 4G, quarante-quatre mégaoctets à 8,9 Mb/s, c'est
 * le filet de sécurité de six secondes qui tombe à chaque visite : on entre sur
 * un plan qui n'a pas fini d'arriver, et il bégaie.
 *
 * Les variantes ci-dessous tiennent la même image en 720p à un débit plafonné.
 * Elles ne remplacent pas les masters — un grand écran continue de recevoir le
 * fichier d'origine, par `<source media>` (voir `media.ts`).
 *
 * ------------------------------------------------------------------
 * Les réglages, et ce qu'ils cherchent
 * ------------------------------------------------------------------
 * `-vf scale=1280:-2` — 720p. C'est déjà au-dessus de ce qu'un téléphone
 *   portrait montre d'un plan 16/9 en `cover` : la mise à l'échelle est une
 *   *montée*, descendre plus bas se verrait.
 *
 * `-crf 27 -maxrate -bufsize` — une qualité constante, avec un plafond. Le CRF
 *   seul laisserait les plans agités (la nuée, l'eau) repartir à cinq mégabits ;
 *   le plafond borne le pire cas, qui est le seul qui compte sur une connexion
 *   mobile.
 *
 * `-profile:v main -level 4.0` — le profil que décode tout appareil encore en
 *   service, accélération matérielle comprise. Le `high` du master ne gagne
 *   rien à ce débit-là.
 *
 * `-g 60` — une image-clé toutes les deux secondes. Ces plans sont des boucles :
 *   le raccord repart sur une image-clé, et la reprise ne se voit pas.
 *
 * `-an` — aucune piste sonore. Les cinq plans sont muets par construction ; le
 *   son du site est un bus Web Audio, pas une piste de vidéo.
 *
 * `-movflags +faststart` — l'index en tête du fichier. Sans lui, le lecteur
 *   télécharge la fin avant de pouvoir commencer, ce qui est exactement le
 *   contraire de ce qu'on cherche ici.
 *
 * Usage : `node scripts/media-mobile.mjs`
 */

import { spawnSync } from "node:child_process";
import { existsSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const RACINE = join(dirname(fileURLToPath(import.meta.url)), "..");

/** Suffixe des variantes. Le même que lit `lib/media.ts`. */
const SUFFIXE = "-mobile";

/** Les plans à décliner. Ceux qui sont déjà légers n'y sont pas. */
const PLANS = [
  "public/media/hero/hero.mp4",
  "public/media/manifeste/piscine.mp4",
  "public/media/matieres/chaux-blanche.mp4",
  "public/media/matieres/voile-de-lin.mp4",
];

const LARGEUR = 1280;
const CRF = 27;
const PLAFOND = "1800k";
const TAMPON = "3600k";

function mega(octets) {
  return `${(octets / 1024 / 1024).toFixed(1)} Mo`;
}

let echec = false;

for (const relatif of PLANS) {
  const source = join(RACINE, relatif);
  const cible = source.replace(/\.mp4$/, `${SUFFIXE}.mp4`);

  if (!existsSync(source)) {
    console.error(`absent, ignoré : ${relatif}`);
    echec = true;
    continue;
  }

  const resultat = spawnSync(
    "ffmpeg",
    [
      "-y",
      "-i", source,
      "-vf", `scale=${LARGEUR}:-2:flags=lanczos`,
      "-c:v", "libx264",
      "-profile:v", "main",
      "-level", "4.0",
      "-preset", "slow",
      "-crf", String(CRF),
      "-maxrate", PLAFOND,
      "-bufsize", TAMPON,
      "-g", "60",
      "-pix_fmt", "yuv420p",
      "-an",
      "-movflags", "+faststart",
      cible,
    ],
    { stdio: ["ignore", "ignore", "pipe"] },
  );

  if (resultat.status !== 0) {
    console.error(`échec : ${relatif}`);
    console.error(String(resultat.stderr).split("\n").slice(-12).join("\n"));
    echec = true;
    continue;
  }

  const avant = statSync(source).size;
  const apres = statSync(cible).size;
  console.log(
    `${relatif.padEnd(44)} ${mega(avant).padStart(9)} → ${mega(apres).padStart(9)}` +
      `  (${Math.round((1 - apres / avant) * 100)} %)`,
  );
}

process.exit(echec ? 1 : 0);
