/**
 * Les deux langues du site, et le type qui les porte.
 *
 * ## Le parti pris, et ce qu'il coûte
 *
 * La langue est un **état de client**, pas un segment d'URL. Le site n'a donc
 * ni `/fr` ni `/en` : on bascule sans navigation, et le parcours ne se remonte
 * pas. C'est un choix, et il a un prix qu'il faut dire — un moteur de recherche
 * ne verra jamais que la version française, et l'on ne peut pas envoyer à
 * quelqu'un un lien déjà en anglais.
 *
 * Trois raisons de l'assumer ici :
 *
 * — **L'atelier ne vit pas du référencement.** « Sur recommandation » est écrit
 *   dans le pied du site ; on ne cherche pas Rouvière, on vous en parle.
 * — **Le site est un parcours continu**, et son architecture repose sur des
 *   nœuds qui ne se démontent jamais : le canvas du rig, le logotype, le
 *   contexte audio. Changer de langue par changement de route ferait passer
 *   tout cela par une couture, au milieu d'un chapitre, sans raison.
 * — **La bascule est instantanée**, ce qu'aucune navigation ne peut être.
 *
 * Le jour où il faut des URL par langue — un vrai client, un vrai référencement
 * —, c'est un segment `app/[langue]/` et les dictionnaires ci-contre ne bougent
 * pas d'une ligne. C'est pour cela qu'ils sont séparés du reste : le travail de
 * traduction est fait, le routage est une autre affaire.
 */

export const LANGUES = ["fr", "en"] as const;

export type Langue = (typeof LANGUES)[number];

/** La langue de l'atelier. Le français n'est pas un repli, c'est l'original. */
export const LANGUE_PAR_DEFAUT: Langue = "fr";

/** La préférence, persistée d'une visite à l'autre. */
export const CLE_LANGUE = "rouviere:langue";

/**
 * Un texte dans les deux langues.
 *
 * Le français est **obligatoire**, l'anglais aussi : un type qui autoriserait
 * l'absence laisserait passer des trous qu'on ne découvrirait qu'à l'écran, sur
 * la page d'un client. TypeScript refuse la traduction oubliée.
 */
export type Texte = Record<Langue, string>;

/** Plusieurs paragraphes, dans les deux langues. */
export type Textes = Record<Langue, readonly string[]>;

/** Choisit la version d'un texte. Le seul point de lecture d'un `Texte`. */
export function dire(texte: Texte, langue: Langue): string {
  return texte[langue];
}

/** Idem pour une suite de paragraphes. */
export function direTous(textes: Textes, langue: Langue): readonly string[] {
  return textes[langue];
}

/**
 * Valide une valeur venue du stockage ou d'un attribut. Tout ce qui n'est pas
 * une langue connue retombe sur l'original.
 */
export function langueValide(valeur: string | null | undefined): Langue {
  return LANGUES.includes(valeur as Langue)
    ? (valeur as Langue)
    : LANGUE_PAR_DEFAUT;
}

/** Le nom de la langue dans sa propre langue — jamais traduit. */
export const NOM_LANGUE: Record<Langue, string> = {
  fr: "Français",
  en: "English",
};

/** Le code court, pour la bascule du chrome. */
export const CODE_LANGUE: Record<Langue, string> = {
  fr: "FR",
  en: "EN",
};
