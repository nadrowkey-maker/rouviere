/**
 * Le manifeste des visuels.
 *
 * Les chapitres ne connaissent aucun chemin de fichier : ils lisent ici. C'est
 * ce qui permet de remplacer les planches provisoires par les vraies
 * photographies — poste du Livre V — sans toucher à une ligne de composant.
 *
 * **État actuel : les fichiers de `public/planches` et `public/frames` sont
 * provisoires.** Ce sont des études de lumière fabriquées par
 * `scripts/planches.mjs`, pas des photographies. Elles servent à juger la
 * composition, le parallaxe, le flou en shader et le défilement de la séquence.
 * Le jour où les vraies images arrivent, on remplace les fichiers et on met à
 * jour les dimensions et les textes de remplacement ci-dessous.
 */

export type Planche = {
  src: string;
  /** Dimensions réelles du fichier : `next/image` en a besoin, le CLS aussi. */
  largeur: number;
  hauteur: number;
  /** Descriptif, sec. Ce que montre l'image, pas ce qu'on doit en penser. */
  alt: string;
};

export type Sequence = {
  /** Dossier des frames, sans barre finale. */
  dossier: string;
  /** Nombre de frames. Le nom du fichier est l'index sur quatre chiffres. */
  nombre: number;
  extension: string;
  largeur: number;
  hauteur: number;
};

export type VisuelsProjet = {
  /** Les planches du projet. La première est celle de l'enfilade. */
  planches: Planche[];
  /** La traversée au défilement, ou `null` tant qu'elle n'est pas tournée. */
  sequence: Sequence | null;
};

const LARGEUR_PLANCHE = 1200;
const HAUTEUR_PLANCHE = 1500;

const planche = (slug: string, index: number, alt: string): Planche => ({
  src: `/planches/${slug}-${index}.png`,
  largeur: LARGEUR_PLANCHE,
  hauteur: HAUTEUR_PLANCHE,
  alt,
});

export const visuels: Record<string, VisuelsProjet> = {
  "villa-ostrea": {
    planches: [
      planche("villa-ostrea", 1, "Villa Ostréa — le séjour ouvert au nord, charpente apparente."),
      planche("villa-ostrea", 2, "Villa Ostréa — le sol de béton de chaux et le pin brûlé du mur bas."),
      planche("villa-ostrea", 3, "Villa Ostréa — le bassin de nage le long de la façade sud."),
    ],
    sequence: {
      dossier: "/frames/villa-ostrea",
      nombre: 48,
      extension: "png",
      largeur: 1000,
      hauteur: 625,
    },
  },
  "hotel-sevigne": {
    planches: [
      planche("hotel-sevigne", 1, "Hôtel Sévigné — les boiseries décapées du grand salon."),
      planche("hotel-sevigne", 2, "Hôtel Sévigné — la reprise en laque rouge, couture apparente."),
      planche("hotel-sevigne", 3, "Hôtel Sévigné — l'escalier de service, marches creusées."),
    ],
    sequence: null,
  },
  "maison-cypres": {
    planches: [
      planche("maison-cypres", 1, "Maison Cyprès — le pignon ouest ouvert sur trois mètres cinquante."),
      planche("maison-cypres", 2, "Maison Cyprès — le travertin à joint vif, sans plinthe."),
      planche("maison-cypres", 3, "Maison Cyprès — la chaux ferrée du mur nord à dix-neuf heures."),
    ],
    sequence: null,
  },
  "appartement-cinq-heures": {
    planches: [
      planche("appartement-cinq-heures", 1, "Appartement Cinq Heures — le plâtre lissé au couteau, sans peinture."),
      planche("appartement-cinq-heures", 2, "Appartement Cinq Heures — le lambris de chêne cérusé à hauteur d'appui."),
      planche("appartement-cinq-heures", 3, "Appartement Cinq Heures — l'albâtre du couloir, à dix-sept heures."),
    ],
    sequence: null,
  },
  "la-bergerie": {
    planches: [
      planche("la-bergerie", 1, "La Bergerie — le mur de pierre sèche repris sans mortier."),
      planche("la-bergerie", 2, "La Bergerie — le tadelakt outremer de la salle d'eau."),
      planche("la-bergerie", 3, "La Bergerie — la cour et l'olivier de deux cent quarante ans."),
    ],
    sequence: null,
  },
};

/** Les visuels d'un projet. Lève si le slug n'est pas au manifeste. */
export function visuelsDe(slug: string): VisuelsProjet {
  const trouve = visuels[slug];
  if (trouve === undefined) {
    throw new Error(`Aucun visuel au manifeste pour le projet : ${slug}`);
  }
  return trouve;
}
