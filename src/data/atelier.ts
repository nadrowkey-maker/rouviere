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

import type { Texte } from "@/i18n/langues";

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
  alt: Texte;
  /** Une donnée de couche technique, décrochée sous la planche. */
  note: Texte;
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
    alt: {
      fr: "Des plans d'exécution étalés sur une table, en désordre, sous une lumière rasante.",
      en: "Working drawings spread across a table, out of order, under raking light.",
    },
    note: {
      fr: "Relevé avant dépose — 14 rue de Beaune",
      en: "Survey before strip-out — 14 rue de Beaune",
    },
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
    alt: {
      fr: "La grande table de l'atelier : lampe d'architecte, maquette de tour, plans en pile, élévations punaisées au mur.",
      en: "The studio's long table: architect's lamp, tower model, stacked drawings, elevations pinned to the wall.",
    },
    note: { fr: "Atelier — jour du nord", en: "Studio — north light" },
    hauteur: 88,
    largeur: 108,
    cote: "droite",
    plongee: true,
  },
  {
    src: "/media/atelier/maquette.avif",
    largeurFichier: 1280,
    hauteurFichier: 1920,
    alt: {
      fr: "Une maquette de charpente en bois clair, montée à blanc, vue de près.",
      en: "A pale timber roof-frame model, dry-assembled, seen close.",
    },
    note: { fr: "Charpente au cinquantième", en: "Roof frame at 1:50" },
    hauteur: 95,
    largeur: 44,
    cote: "droite",
  },
  {
    src: "/media/atelier/chantier.avif",
    largeurFichier: 1282,
    hauteurFichier: 1920,
    alt: {
      fr: "Une pièce à blanc en chantier : enduit frais, tableaux de portes ouverts, le jour au fond.",
      en: "A stripped room on site: fresh plaster, door reveals open, daylight at the far end.",
    },
    note: {
      fr: "Après dépose — avant tracé",
      en: "After strip-out — before setting out",
    },
    hauteur: 100,
    largeur: 72,
    cote: "gauche",
  },
  {
    src: "/media/atelier/dossiers.avif",
    largeurFichier: 1920,
    hauteurFichier: 1280,
    alt: {
      fr: "Une pile de plans reliés par des pinces, posée sur une table claire.",
      en: "A stack of drawings held by clips, set on a pale table.",
    },
    note: {
      fr: "Cinq à sept chantiers par an",
      en: "Five to seven projects a year",
    },
    hauteur: 85,
    largeur: 92,
    cote: "droite",
  },
  {
    src: "/media/atelier/chassis.avif",
    largeurFichier: 1235,
    hauteurFichier: 1920,
    alt: {
      fr: "Le fond de l'atelier : des châssis appuyés contre le mur, des blouses accrochées, la verrière à droite.",
      en: "The back of the studio: frames leaning on the wall, coats hung up, the glazed roof to the right.",
    },
    note: { fr: "Aucune presse, aucune enseigne", en: "No press, no sign" },
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
  titre: { fr: "L'Atelier", en: "The Studio" } as Texte,
  chapo: {
    fr: "Camille Rouvière fonde l'atelier en 2011. Cinq à sept chantiers par an, jamais plus.",
    en: "Camille Rouvière founded the studio in 2011. Five to seven projects a year, never more.",
  } as Texte,
  paragraphes: [
    {
      apres: 0,
      texte: {
        fr: "Le travail commence par la dépose. On retire les cloisons ajoutées, les corniches fausses, les faux plafonds, jusqu'à ce que le plan d'origine réapparaisse. Rien n'est dessiné avant ce moment-là.",
        en: "The work begins by taking things out. Added partitions, false cornices, dropped ceilings — all removed, until the original plan comes back. Nothing is drawn before that moment.",
      } as Texte,
    },
    {
      apres: 2,
      texte: {
        fr: "Chaque matière est choisie pour ce qu'elle devient, pas pour ce qu'elle est le premier jour. Le laiton fonce sous les mains, le pin brûlé noircit au sel, la chaux se fend là où on l'a prévu. Le temps fait partie du projet.",
        en: "Each material is chosen for what it becomes, not for what it is on the first day. Brass darkens under the hand, burnt pine blackens in the salt, lime cracks where it was meant to. Time is part of the project.",
      } as Texte,
    },
    {
      apres: 4,
      texte: {
        fr: "L'atelier ne publie pas, ne démarche pas, ne reçoit que sur recommandation. Ce qui se voit ici est tout ce qui se montre.",
        en: "The studio does not publish, does not solicit, and takes work by referral only. What is seen here is all that is shown.",
      } as Texte,
    },
  ],
};
