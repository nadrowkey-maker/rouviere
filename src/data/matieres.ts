/**
 * Les trois matières du chapitre *La Matière*.
 *
 * Une matière, un projet, un plan macro. Chacune est nommée par son vrai nom et
 * vient d'un chantier réel : rien ici n'est un échantillon de démonstration. La
 * ligne de facture dit comment elle est mise en œuvre — c'est la couche
 * technique du chapitre, et comme partout dans le site elle est vraie dans la
 * fiction.
 *
 * Les fichiers sont produits par `scripts/matieres.mjs` : sept secondes de
 * dérive lente, recollées en aller-retour pour que la boucle soit exacte, et
 * passées par l'étalonnage commun.
 */

export type Matiere = {
  cle: string;
  /** Le nom, en Gambetta monumental. Un mot, deux au plus. */
  nom: string;
  /** D'où elle vient : projet, lieu, année. */
  provenance: string;
  /** Comment elle est mise en œuvre. Sec, technique, exact. */
  facture: string;
  /** Un seul format : voir `scripts/matieres.mjs` pour la raison. */
  video: { mp4: string; poster: string };
  /** Ce que montre le plan. Descriptif. */
  alt: string;
};

/* Les trois plans sortent tous en 1600 × 900 — voir `scripts/matieres.mjs`.
   `next/image` et le CLS ont besoin du chiffre avant le chargement. */
export const LARGEUR_MATIERE = 1600;
export const HAUTEUR_MATIERE = 900;

const media = (cle: string) => ({
  mp4: `/media/matieres/${cle}.mp4`,
  poster: `/media/matieres/${cle}-poster.avif`,
});

export const matieres: Matiere[] = [
  {
    cle: "noyer-fume",
    nom: "Noyer fumé",
    provenance: "Appartement Laiton — Paris XVIᵉ — 2024",
    facture: "Placage 0,9 mm — fumage à l'ammoniac — huile dure",
    video: media("noyer-fume"),
    alt: "Gros plan sur un panneau de noyer fumé. La lumière rase le fil du bois et creuse les pores.",
  },
  {
    cle: "chaux-blanche",
    nom: "Chaux blanche",
    provenance: "Domaine des Charmilles — Médoc — 2025",
    facture: "Badigeon trois couches — chaux aérienne CL 90 — talochée",
    video: media("chaux-blanche"),
    alt: "Gros plan sur un badigeon de chaux blanche. Les passes de taloche prennent le jour à plat.",
  },
  {
    cle: "voile-de-lin",
    nom: "Voile de lin",
    provenance: "Villa Calcaire — Cap d'Antibes — 2022",
    facture: "Lin lavé 165 g/m² — pleine hauteur — plissé simple",
    video: media("voile-de-lin"),
    alt: "Gros plan sur un voile de lin à trame ouverte. Le jour passe entre les fils.",
  },
];

/** Le bassin de la Villa Calcaire. Une seule fois dans tout le site. */
export const bassin = {
  /** La ligne de couche technique, seule interface de l'écran. */
  technique: "Bassin — 25 m — eau douce — Cap d'Antibes",
  /** La plaque affichée sans WebGL2 ou sans cible flottante. */
  repli: "/textures/bassin-repli.png",
  largeurRepli: 1440,
  hauteurRepli: 810,
};
