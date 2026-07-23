/**
 * Lecture des jetons de `tokens.css` depuis le JavaScript.
 *
 * Le WebGL a besoin de couleurs en nombre, pas en CSS. Plutôt que de recopier
 * les hexadécimaux dans un fichier TypeScript — ce qui créerait une seconde
 * source de vérité et laisserait entrer des couleurs hors jetons — on les lit
 * sur `<html>` au moment où on en a besoin, puis on les met en cache.
 */

export type NomCouleur =
  | "encre"
  | "plomb"
  | "zinc"
  | "pierre"
  | "craie"
  | "sel"
  | "laque"
  | "ocre"
  | "vert-paris"
  | "outremer"
  | "laiton";

export type NomDuree = "micro" | "objet" | "chapitre";

const cache = new Map<string, string>();

/** Valeur calculée d'une propriété personnalisée, telle que tokens.css la pose. */
export function lireJeton(propriete: string): string {
  const enCache = cache.get(propriete);
  if (enCache !== undefined) return enCache;

  const valeur = getComputedStyle(document.documentElement)
    .getPropertyValue(propriete)
    .trim();

  if (valeur === "" && process.env.NODE_ENV !== "production") {
    throw new Error(
      `Jeton introuvable : ${propriete}. tokens.css n'est pas chargé, ou le nom est faux.`,
    );
  }

  cache.set(propriete, valeur);
  return valeur;
}

/** Couleur d'un monde ou d'un gris, en hexadécimal sRGB. */
export function lireCouleur(nom: NomCouleur): string {
  return lireJeton(`--color-${nom}`);
}

/** Durée codifiée, convertie en secondes pour GSAP. */
export function lireDuree(nom: NomDuree): number {
  return Number.parseFloat(lireJeton(`--duree-${nom}`));
}

/** Vide le cache. Utile au rechargement à chaud en développement. */
export function oublierJetons(): void {
  cache.clear();
}
