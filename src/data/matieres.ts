/**
 * Les échantillons du chapitre *La Matière*.
 *
 * Trois matières, nommées par leur vrai nom, chacune tirée d'un projet réel.
 * Les textures sont des surfaces calculées par `scripts/echantillons.mjs` — un
 * échantillon de matière est une texture, pas une photographie, et il n'est
 * donc pas remplacé au poste du Livre V. Le chemin d'ombre est commun aux
 * trois : elles ont la même découpe, donc la même ombre portée.
 */

export type Matiere = {
  cle: string;
  /** Le nom de la matière, tel qu'il se dit dans le site. */
  nom: string;
  /** Le projet d'où elle vient, en couche technique. */
  provenance: string;
  texture: string;
};

export const OMBRE_ECHANTILLON = "/textures/echantillon-ombre.png";

export const matieres: Matiere[] = [
  {
    cle: "lin",
    nom: "Lin brut",
    provenance: "Villa Ostréa — Cap-Ferret",
    texture: "/textures/echantillon-lin.png",
  },
  {
    cle: "chaux",
    nom: "Chaux ferrée",
    provenance: "Maison Cyprès — Cap d'Antibes",
    texture: "/textures/echantillon-chaux.png",
  },
  {
    cle: "platre",
    nom: "Plâtre lissé",
    provenance: "Appartement Cinq Heures — Paris VIIᵉ",
    texture: "/textures/echantillon-platre.png",
  },
];

/** Le bassin de la Villa Ostréa. Une seule fois dans tout le site. */
export const bassin = {
  /** La ligne de couche technique, seule interface de l'écran. */
  technique: "Bassin — 22 m — eau douce — Cap-Ferret",
  /** La plaque affichée sans WebGL2 ou sans cible flottante. */
  repli: "/textures/bassin-repli.png",
  largeurRepli: 1440,
  hauteurRepli: 810,
};
