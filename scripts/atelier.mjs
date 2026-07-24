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
 * paysages mêlés ; les ramener au carré la détruirait.
 *
 *   node scripts/atelier.mjs
 */
import { mkdirSync } from "node:fs";
import sharp from "sharp";
import { etalonner, LARGEUR_MAX, QUALITE_AVIF } from "./etalonnage.mjs";

const SOURCE = "medias-source/atelier";
const CIBLE = "public/media/atelier";

/** `cle` nomme le fichier de sortie ; `source` est l'identifiant Pexels. */
const PLANCHES = [
  { cle: "plans", source: "34573691" },
  { cle: "atelier", source: "3872410" },
  { cle: "maquette", source: "7883885" },
  { cle: "chantier", source: "7937304" },
  { cle: "dossiers", source: "6614786" },
  { cle: "chassis", source: "3777913" },
];

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

console.log("Six planches étalonnées dans", CIBLE);
