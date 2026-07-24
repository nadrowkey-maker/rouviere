/**
 * Le chapitre *L'Atelier* : le processus, la méthode, un portrait.
 *
 * Les images sont provisoires — des études de lumière en gris produites par
 * `scripts/atelier.mjs`, remplaçables fichier pour fichier au poste du Livre V.
 * Le texte, lui, est définitif : c'est du contenu Rouvière.
 */

export type PlancheAtelier = {
  src: string;
  largeur: number;
  hauteur: number;
  alt: string;
  /** Une donnée de couche technique, décrochée dans la marge. */
  note: string;
  /** Le portrait est traité à part : centré, jamais pivoté au même rythme. */
  portrait?: boolean;
};

const L = 1000;
const H = 1250;

export const planchesAtelier: PlancheAtelier[] = [
  {
    src: "/atelier/atelier-1.png",
    largeur: L,
    hauteur: H,
    alt: "Le plan de travail de l'atelier, plans posés sous une lumière rasante.",
    note: "14 rue de Beaune",
  },
  {
    src: "/atelier/atelier-2.png",
    largeur: L,
    hauteur: H,
    alt: "Échantillons de matière alignés sur l'établi.",
    note: "Cinq à sept chantiers par an",
  },
  {
    src: "/atelier/atelier-3.png",
    largeur: L,
    hauteur: H,
    alt: "Un mur d'atelier, la lumière tombe de la verrière.",
    note: "Aucune presse, aucune enseigne",
  },
  {
    src: "/atelier/atelier-portrait.png",
    largeur: L,
    hauteur: H,
    alt: "Camille Rouvière, à contre-jour devant une fenêtre. Le visage reste dans l'ombre.",
    note: "Camille Rouvière — fondatrice, 2011",
    portrait: true,
  },
  {
    src: "/atelier/atelier-4.png",
    largeur: L,
    hauteur: H,
    alt: "Un coin de chantier, l'enduit frais et l'étai de bois.",
    note: "On retire jusqu'à ce que le plan revienne",
  },
  {
    src: "/atelier/atelier-5.png",
    largeur: L,
    hauteur: H,
    alt: "Une pile de planches et un pan de lumière oblique.",
    note: "La matière est la finition",
  },
  {
    src: "/atelier/atelier-6.png",
    largeur: L,
    hauteur: H,
    alt: "Le fond de l'atelier, une porte entrouverte sur le jour.",
    note: "Le reste appartient à ceux qui vivent là",
  },
];

/** Le texte du chapitre. Descriptif, sec, à la troisième personne. */
export const texteAtelier = {
  titre: "L'Atelier",
  chapo:
    "Camille Rouvière fonde l'atelier en 2011. Cinq à sept chantiers par an, jamais plus.",
  paragraphes: [
    "Le travail commence par la dépose. On retire les cloisons ajoutées, les corniches fausses, les faux plafonds, jusqu'à ce que le plan d'origine réapparaisse. Rien n'est dessiné avant ce moment-là.",
    "Chaque matière est choisie pour ce qu'elle devient, pas pour ce qu'elle est le premier jour. Le laiton fonce sous les mains, le pin brûlé noircit au sel, la chaux se fend là où on l'a prévu. Le temps fait partie du projet.",
    "L'atelier ne publie pas, ne démarche pas, ne reçoit que sur recommandation. Ce qui se voit ici est tout ce qui se montre.",
  ],
};
