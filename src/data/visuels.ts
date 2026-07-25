/**
 * Le manifeste des visuels.
 *
 * Les chapitres ne connaissent aucun chemin de fichier : ils lisent ici. C'est
 * ce qui permet de remplacer les médias sans toucher à une ligne de composant.
 *
 * **État actuel : les vrais médias sont en place.** Pour chaque projet, une
 * vidéo (hero de la page projet, doublée d'une poster et d'un repli WebM) et
 * trois photographies plein cadre. Les fichiers vivent dans
 * `public/media/projets/projet-1` … `projet-5` ; ils ont été ré-encodés en
 * AVIF (photos, poster) et H.264/VP9 (vidéo) par `scripts/media-projets.mjs`.
 * La première planche est celle que l'enfilade montre dans le couloir et celle
 * qui porte le titre monumental en tête de la page projet.
 */

import { projets } from "./projets";

export type Planche = {
  src: string;
  /** Dimensions réelles du fichier : `next/image` en a besoin, le CLS aussi. */
  largeur: number;
  hauteur: number;
  /** Descriptif, sec. Ce que montre l'image, pas ce qu'on doit en penser. */
  alt: string;
};

/** La vidéo d'ouverture d'un projet : hero plein cadre, muet, en boucle. */
export type Video = {
  mp4: string;
  webm: string;
  /** Poster AVIF, pour le LCP et le CLS : la place est réservée avant lecture. */
  poster: string;
  largeur: number;
  hauteur: number;
};

/**
 * La séquence de frames de traversée. Conservée pour `SequenceCanvas`, qui n'est
 * plus monté par la page projet (passée au plein cadre photographique) mais
 * reste disponible pour un usage ultérieur.
 */
export type Sequence = {
  dossier: string;
  nombre: number;
  extension: string;
  largeur: number;
  hauteur: number;
};

export type VisuelsProjet = {
  /** L'ouverture : la vidéo du projet, plein cadre, sans texte. */
  video: Video;
  /** Les trois photographies. La première porte le titre et ouvre l'enfilade. */
  planches: Planche[];
};

/* Toutes les vidéos et photographies sont en 16/9, 1920 × 1080 à la source. */
const LARGEUR = 1920;
const HAUTEUR = 1080;

/** Un projet : son dossier de médias et les trois textes de remplacement. */
function media(dossier: string, alts: [string, string, string]): VisuelsProjet {
  const base = `/media/projets/${dossier}`;
  return {
    video: {
      mp4: `${base}/video.mp4`,
      webm: `${base}/video.webm`,
      poster: `${base}/poster.avif`,
      largeur: LARGEUR,
      hauteur: HAUTEUR,
    },
    planches: alts.map((alt, i) => ({
      src: `${base}/${i + 1}.avif`,
      largeur: LARGEUR,
      hauteur: HAUTEUR,
      alt,
    })),
  };
}

export const visuels: Record<string, VisuelsProjet> = {
  "appartement-laiton": media("projet-1", [
    "Appartement Laiton — le dressing de noyer fumé, cadres de laiton et panneau ondé.",
    "Appartement Laiton — la salle d'eau d'onyx, bandeau rétroéclairé derrière la pierre.",
    "Appartement Laiton — l'immeuble de verre, dernier étage sur balcon.",
  ]),
  "grand-hotel-des-bains": media("projet-2", [
    "Grand Hôtel des Bains — le hall d'honneur, caissons de chêne et laque bleu paon.",
    "Grand Hôtel des Bains — une chambre, boiseries sombres et plâtre ciré.",
    "Grand Hôtel des Bains — le salon de lecture, banquettes claires sous les rayonnages éclairés.",
  ]),
  "domaine-des-charmilles": media("projet-3", [
    "Domaine des Charmilles — la terrasse et le bassin dans le jardin muré.",
    "Domaine des Charmilles — la cuisine de chêne peint gris, plans de pierre claire.",
    "Domaine des Charmilles — la salle de bains blanche, robinetterie de laiton.",
  ]),
  "villa-calcaire": media("projet-4", [
    "Villa Calcaire — le séjour traversant, voilages et marbre de Calacatta.",
    "Villa Calcaire — la salle de bains, marbre veiné et menuiserie d'acier noirci.",
    "Villa Calcaire — la cuisine laquée blanche, sans poignée.",
  ]),
  "villa-basalte": media("projet-5", [
    "Villa Basalte — le séjour à double hauteur, plafond et persiennes de teck.",
    "Villa Basalte — la salle d'eau sombre, mur de bois et miroir rond.",
    "Villa Basalte — le volume d'enduit blanc, jardin de gravier volcanique et palmiers.",
  ]),
};

/**
 * **La planche de sortie du parcours.** La première photographie du dernier
 * projet : c'est elle que la dernière pièce du couloir montre, c'est dans sa
 * fenêtre que l'enfilade s'ouvre jusqu'au plein cadre, et c'est sur elle que *La
 * Matière* pose son premier nom.
 *
 * Elle est nommée ici, et non calculée deux fois, précisément parce que deux
 * chapitres doivent en montrer **le même fichier au même cadrage** : c'est la
 * condition pour que le relais entre eux ne se voie pas.
 */
export const PLANCHE_SORTIE: Planche = visuels[
  projets[projets.length - 1]!.slug
]!.planches[0]!;

/** Les visuels d'un projet. Lève si le slug n'est pas au manifeste. */
export function visuelsDe(slug: string): VisuelsProjet {
  const trouve = visuels[slug];
  if (trouve === undefined) {
    throw new Error(`Aucun visuel au manifeste pour le projet : ${slug}`);
  }
  return trouve;
}
