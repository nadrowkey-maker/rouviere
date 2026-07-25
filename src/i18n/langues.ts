/**
 * Les deux langues du site, et le type qui les porte.
 *
 * ## La langue est dans l'URL
 *
 * Chaque page existe deux fois — `/fr/archives` et `/en/archives` — et le
 * segment de tête **est** la source de vérité. On peut donc envoyer un lien
 * déjà en anglais, et un moteur de recherche indexe les deux versions.
 *
 * Le segment est `app/[langue]/`, c'est-à-dire **sous** le layout racine : le
 * canvas du rig, le logotype et le contexte audio ne se démontent pas en
 * changeant de langue. C'était la condition pour que ce soit tenable ici — un
 * site dont l'architecture repose sur des nœuds persistants ne peut pas se
 * permettre un layout par langue.
 *
 * `/` ne sert rien : il redirige vers la langue retenue de la dernière visite,
 * ou à défaut vers celle de l'atelier.
 *
 * La contrepartie, et elle est réelle : changer de langue est une navigation.
 * Le parcours se remonte et le défilement repart du haut. C'est le
 * comportement de tous les sites qui ont des URL par langue, et c'est le prix
 * d'un lien qu'on peut envoyer.
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

/**
 * Un chemin interne, préfixé de la langue.
 *
 * **Aucun lien du site ne s'écrit en dur.** Tous passent par ici, sinon un
 * anglophone qui clique une entrée du menu retomberait en français sans que
 * rien ne le lui dise. `chemin("en", "/archives")` donne `/en/archives`, et
 * `chemin("fr", "/")` donne `/fr`.
 */
export function chemin(langue: Langue, route = "/"): string {
  if (route === "/") return `/${langue}`;
  /* Les ancres du parcours (`/#atelier`) gardent leur fragment : c'est la même
     page, on ne fait que préfixer ce qui précède le dièse. */
  if (route.startsWith("/#")) return `/${langue}${route.slice(1)}`;
  return `/${langue}${route}`;
}

/**
 * Le même chemin dans l'autre langue, à partir du chemin courant.
 *
 * C'est ce qui permet à la bascule d'être un vrai lien : on ne renvoie pas à
 * l'accueil en changeant de langue, on reste sur la page qu'on lisait. Un
 * chemin qui ne commence pas par une langue connue est rendu tel quel, préfixé.
 */
export function memeCheminAutreLangue(
  cheminCourant: string,
  cible: Langue,
): string {
  const segments = cheminCourant.split("/").filter((s) => s !== "");
  if (segments.length > 0 && LANGUES.includes(segments[0] as Langue)) {
    segments[0] = cible;
    return `/${segments.join("/")}`;
  }
  return chemin(cible, cheminCourant === "" ? "/" : cheminCourant);
}
