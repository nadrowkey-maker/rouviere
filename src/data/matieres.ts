/**
 * Les trois matières du chapitre *La Matière*.
 *
 * Une matière, un plan, un nom. Chacune est nommée par son vrai nom et vient
 * d'un chantier réel : rien ici n'est un échantillon de démonstration.
 *
 * **Le nom est tout ce que le chapitre écrit.** Il y avait sous lui deux lignes
 * de couche technique — la provenance et la facture — et elles ont été retirées :
 * sur un écran qui ne montre qu'une matière, la seule chose à lire devient la
 * seule chose qu'on lit. Ce chapitre est fait pour qu'on regarde.
 *
 * Les fichiers sont produits par `scripts/matieres.mjs` : sept secondes de
 * dérive lente, recollées en aller-retour pour que la boucle soit exacte, et
 * passées par l'étalonnage commun.
 *
 * **La première matière n'a pas de fichier.** Son plan est la photographie que
 * l'enfilade laisse ouverte en plein cadre à la fin de sa course. Il y avait ici
 * un plan macro de bois qui venait la recouvrir : deux images de la même matière
 * l'une sur l'autre, la seconde annulant le geste par lequel on venait
 * d'arriver. Le nom se pose donc sur l'image qui est déjà là.
 */

/**
 * Le plan d'une matière.
 *
 * `video` — un plan macro étalonné, qui dérive lentement sur la surface.
 *
 * `sortie` — **pas de média propre.** C'est la photographie que l'enfilade
 * laisse installée en plein cadre à la fin de sa course : la première planche du
 * dernier projet, immobile. Le premier temps du chapitre se joue donc *sur elle*.
 * Il y avait ici un plan macro de bois qui la recouvrait — deux images du même
 * bois, l'une par-dessus l'autre, dont la seconde annulait le geste par lequel on
 * venait d'arriver. Le nom se pose maintenant sur l'image qui est déjà là, et
 * rien ne vient la remplacer.
 */
import type { Texte } from "@/i18n/langues";

export type PlanMatiere =
  /** Une vidéo à elle. `alt` décrit ce que montre le plan, descriptif et sec. */
  | { sorte: "video"; mp4: string; poster: string; alt: Texte }
  /**
   * L'image de sortie de l'enfilade. Elle n'a pas d'`alt` ici : elle est déjà
   * décrite à son manifeste (`PLANCHE_SORTIE.alt`), et une seconde description
   * du même fichier finirait par en dire autre chose.
   */
  | { sorte: "sortie" };

export type Matiere = {
  cle: string;
  /** Le nom, en Gambetta monumental. Un mot, deux au plus. */
  nom: Texte;
  /** Le plan : une vidéo à elle, ou l'image que le chapitre précédent a posée. */
  plan: PlanMatiere;
};

/* Les trois plans sortent tous en 1600 × 900 — voir `scripts/matieres.mjs`.
   `next/image` et le CLS ont besoin du chiffre avant le chargement. */
export const LARGEUR_MATIERE = 1600;
export const HAUTEUR_MATIERE = 900;

const media = (cle: string, alt: Texte): PlanMatiere => ({
  sorte: "video",
  mp4: `/media/matieres/${cle}.mp4`,
  poster: `/media/matieres/${cle}-poster.avif`,
  alt,
});

export const matieres: Matiere[] = [
  {
    cle: "noyer-fume",
    nom: { fr: "Noyer fumé", en: "Smoked walnut" },
    /* Le plan est celui que l'enfilade vient d'ouvrir en plein cadre. */
    plan: { sorte: "sortie" },
  },
  {
    /* La clé nomme le fichier, pas la matière : les deux plans ont changé de
       sujet après coup, et renommer les médias casserait `scripts/matieres.mjs`
       et sa source. Le nom affiché, lui, est celui de la matière. */
    cle: "chaux-blanche",
    nom: { fr: "La trame", en: "The weave" },
    plan: media("chaux-blanche", {
      fr: "Un salon sombre. Des banquettes de cuir capitonné se suivent le long de la pièce, des palmiers en bac derrière elles, une guirlande d'ampoules au plafond. La caméra glisse lentement.",
      en: "A dark lounge. Buttoned leather benches follow one another down the room, potted palms behind them, a string of bulbs overhead. The camera drifts slowly.",
    }),
  },
  {
    cle: "voile-de-lin",
    nom: { fr: "Le relief", en: "The relief" },
    plan: media("voile-de-lin", {
      fr: "Un séjour vitré ouvert sur un jardin. Canapé bas, table basse, tapis rayé, baies toute hauteur d'un mur à l'autre. La caméra glisse lentement.",
      en: "A glazed living room open onto a garden. Low sofa, low table, striped rug, full-height glazing from wall to wall. The camera drifts slowly.",
    }),
  },
];

/**
 * Le bassin de la Villa Calcaire. **Une seule fois dans tout le site**, et ce
 * n'est plus dans ce chapitre : il est le sixième temps du vestibule, l'eau
 * derrière le mot *silence*. Ses données restent ici, avec les matières du même
 * chantier — c'est le manifeste des médias, pas celui d'un chapitre.
 */
export const bassin = {
  /** La ligne de couche technique, seule interface de l'écran. */
  technique: {
    fr: "Bassin — 25 m — eau douce — Cap d'Antibes",
    en: "Pool — 25 m — fresh water — Cap d'Antibes",
  } as Texte,
  /** La plaque affichée sans WebGL2 ou sans cible flottante. */
  repli: "/textures/bassin-repli.png",
  largeurRepli: 1440,
  hauteurRepli: 810,
};
