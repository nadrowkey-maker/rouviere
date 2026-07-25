/**
 * Le chapitre *L'Atelier* : le processus, la méthode.
 *
 * Six planches, produites par `scripts/atelier.mjs` et passées par
 * l'étalonnage commun. Ce ne sont plus des études de lumière provisoires : ce
 * sont des photographies, et elles suivent la règle du Livre V — intérieurs et
 * plans de travail, lumière rasante, aucune personne.
 *
 * **Le portrait est sorti du chapitre.** Il y avait ici un visage à
 * contre-jour ; la règle « aucune personne » ne souffre pas d'exception qu'on
 * ne pourrait tenir sans tomber dans le portrait de banque d'images. Camille
 * Rouvière reste dans le texte, où elle a toujours été le mieux : l'atelier se
 * raconte par ce qu'il laisse sur les tables.
 *
 * **La variance d'échelle est écrite ici, pas calculée.** `hauteur` et
 * `largeur` sont les proportions réelles de chaque planche à l'écran, et elles
 * sont choisies une à une : une planche à 44 % de large suivie d'une à 108 %
 * qui déborde du cadre, c'est un montage. Un rapport tiré au hasard ou dérivé
 * de l'index en serait la caricature.
 *
 * **La plongée aussi est écrite ici.** Une seule planche du chapitre porte
 * `plongee` : c'est celle dans laquelle on entre entièrement, jusqu'à en perdre
 * les bords. Le choix ne se dérive pas d'une position dans la liste, il se
 * décide — c'est la grande table de l'atelier, le sujet même du chapitre, la
 * seule planche qui déborde des deux marges. Ses deux voisines s'assagissent
 * pour la préparer (voir `Atelier.tsx`).
 *
 * **Et c'est la seule qui soit filmée.** On ne plonge pas dans une
 * photographie : au sommet, quand les quatre bords du guichet ont rejoint ceux
 * de l'écran, il faut que quelque chose vive encore dans l'image — sinon le
 * plein écran n'est qu'un agrandissement, et le point culminant du chapitre est
 * une image fixe très grande. Les cinq autres planches restent des
 * photographies : la séquence est *montée*, et un seul de ses plans bouge de
 * lui-même.
 */

export type PlancheAtelier = {
  src: string;
  /**
   * Le plan est filmé, et `src` désigne alors un `.mp4` ; `poster` en donne la
   * première surface, pour le cadre réservé et pour le mouvement réduit. Une
   * seule planche du chapitre est dans ce cas : celle de la plongée. Voir
   * `plongee` plus bas, et `scripts/atelier.mjs` pour la raison.
   */
  poster?: string;
  /** Dimensions réelles du fichier : `next/image` en a besoin, le CLS aussi. */
  largeurFichier: number;
  hauteurFichier: number;
  alt: string;
  /** Une donnée de couche technique, décrochée sous la planche. */
  note: string;
  /** Hauteur du guichet, en unités de hauteur de fenêtre. Jamais sous 85. */
  hauteur: number;
  /** Largeur du guichet, en pourcentage de la colonne. Peut dépasser 100. */
  largeur: number;
  /** Le bord sur lequel la planche est calée — et par lequel elle déborde. */
  cote: "gauche" | "droite";
  /**
   * Le point culminant du chapitre. **Une seule planche de la liste** le porte :
   * c'est dans celle-là qu'on plonge jusqu'au plein écran. Elle est filmée, et
   * elle est la seule à l'être — un sommet dans lequel on entre pour y trouver
   * une image fixe n'est qu'un agrandissement.
   */
  plongee?: true;
};

export const planchesAtelier: PlancheAtelier[] = [
  {
    src: "/media/atelier/plans.avif",
    largeurFichier: 1440,
    hauteurFichier: 1920,
    alt: "Des plans d'exécution étalés sur une table, en désordre, sous une lumière rasante.",
    note: "Relevé avant dépose — 14 rue de Beaune",
    hauteur: 100,
    largeur: 62,
    cote: "gauche",
  },
  {
    /* Le seul plan filmé du chapitre, et le seul dans lequel on entre. */
    src: "/media/atelier/atelier.mp4",
    poster: "/media/atelier/atelier-poster.avif",
    largeurFichier: 1920,
    hauteurFichier: 1080,
    alt: "La grande table de l'atelier : lampe d'architecte, maquette de tour, plans en pile, élévations punaisées au mur.",
    note: "Atelier — jour du nord",
    hauteur: 88,
    largeur: 108,
    cote: "droite",
    plongee: true,
  },
  {
    src: "/media/atelier/maquette.avif",
    largeurFichier: 1280,
    hauteurFichier: 1920,
    alt: "Une maquette de charpente en bois clair, montée à blanc, vue de près.",
    note: "Charpente au cinquantième",
    hauteur: 95,
    largeur: 44,
    cote: "droite",
  },
  {
    src: "/media/atelier/chantier.avif",
    largeurFichier: 1282,
    hauteurFichier: 1920,
    alt: "Une pièce à blanc en chantier : enduit frais, tableaux de portes ouverts, le jour au fond.",
    note: "Après dépose — avant tracé",
    hauteur: 100,
    largeur: 72,
    cote: "gauche",
  },
  {
    src: "/media/atelier/dossiers.avif",
    largeurFichier: 1920,
    hauteurFichier: 1280,
    alt: "Une pile de plans reliés par des pinces, posée sur une table claire.",
    note: "Cinq à sept chantiers par an",
    hauteur: 85,
    largeur: 92,
    cote: "droite",
  },
  {
    src: "/media/atelier/chassis.avif",
    largeurFichier: 1235,
    hauteurFichier: 1920,
    alt: "Le fond de l'atelier : des châssis appuyés contre le mur, des blouses accrochées, la verrière à droite.",
    note: "Aucune presse, aucune enseigne",
    hauteur: 100,
    largeur: 56,
    cote: "gauche",
  },
];

/**
 * Le texte du chapitre. Descriptif, sec, à la troisième personne.
 *
 * `apres` dit derrière quelle planche le paragraphe se cale : dans les
 * respirations de la séquence, jamais à côté d'une planche dominante.
 */
export const texteAtelier = {
  titre: "L'Atelier",
  chapo:
    "Camille Rouvière fonde l'atelier en 2011. Cinq à sept chantiers par an, jamais plus.",
  paragraphes: [
    {
      apres: 0,
      texte:
        "Le travail commence par la dépose. On retire les cloisons ajoutées, les corniches fausses, les faux plafonds, jusqu'à ce que le plan d'origine réapparaisse. Rien n'est dessiné avant ce moment-là.",
    },
    {
      apres: 2,
      texte:
        "Chaque matière est choisie pour ce qu'elle devient, pas pour ce qu'elle est le premier jour. Le laiton fonce sous les mains, le pin brûlé noircit au sel, la chaux se fend là où on l'a prévu. Le temps fait partie du projet.",
    },
    {
      apres: 4,
      texte:
        "L'atelier ne publie pas, ne démarche pas, ne reçoit que sur recommandation. Ce qui se voit ici est tout ce qui se montre.",
    },
  ],
};
