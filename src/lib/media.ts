/**
 * Les variantes mobiles des plans filmés.
 *
 * ------------------------------------------------------------------
 * Le problème
 * ------------------------------------------------------------------
 * Quatre plans du parcours sont encodés pour un grand écran — le hero, la
 * piscine du vestibule, les deux matières filmées — et pèsent ensemble 117 Mo.
 * Sur un téléphone, ce débit n'achète rien : un plan 16/9 cadré en `cover` dans
 * une fenêtre portrait n'y montre qu'un tiers de sa largeur, montée à l'échelle.
 * Ce qu'il coûte, en revanche, se voit : l'écran d'entrée attend que le hero
 * soit jouable avant d'ouvrir ses portes, et quarante-deux mégaoctets à
 * 8,9 Mb/s font tomber son filet de sécurité de six secondes à chaque visite.
 *
 * `scripts/media-mobile.mjs` produit à côté de chaque master un fichier en 720p
 * à débit plafonné, suffixé `-mobile`. Les quatre passent de 117 à 12 Mo.
 *
 * ------------------------------------------------------------------
 * Comment le bon fichier est choisi, et pourquoi dans cet ordre-là
 * ------------------------------------------------------------------
 * Par `<source media>`, que l'algorithme de sélection de ressource du HTML
 * évalue pour un élément média comme il le fait pour une `<picture>`.
 *
 * **Le master est déclaré en premier, sous une requête `min-width`**, et la
 * variante mobile ferme la liste sans condition. Ce n'est pas indifférent :
 * `media` sur un `<source>` de `<video>` a une histoire d'implémentation, et
 * l'ordre inverse — mobile d'abord, sous `max-width` — servirait le fichier
 * allégé à tout le monde sur un moteur qui ignorerait l'attribut. Écrit dans ce
 * sens-ci, le pire cas est le comportement d'avant : un grand écran garde son
 * master, ce qui est exactement ce qu'on ne veut pas dégrader.
 *
 * La sélection a lieu une fois, au chargement, et ne se réévalue pas au
 * redimensionnement — c'est le comportement voulu : on ne recharge pas un plan
 * de quarante secondes parce qu'une fenêtre a changé de largeur.
 *
 * Le seuil est celui du reste du site, `48rem`, écrit une seule fois ici.
 */

/** La portée « grand écran ». Complémentaire du `max-width: 48rem` des CSS. */
export const GRAND_ECRAN = "(min-width: 48.0625rem)";

/**
 * Le chemin de la variante mobile d'un plan. Convention de nommage tenue par
 * `scripts/media-mobile.mjs` : le suffixe est posé avant l'extension.
 */
export function varianteMobile(mp4: string): string {
  return mp4.replace(/\.mp4$/, "-mobile.mp4");
}

/**
 * Les deux `<source>` d'un plan, dans l'ordre qui compte. À étaler dans un
 * `<video>` qui ne porte **pas** d'attribut `src` — un `src` sur l'élément
 * l'emporte sur ses enfants et court-circuiterait toute la sélection.
 */
export function sourcesPlan(
  mp4: string,
): Array<{ src: string; type: string; media?: string }> {
  return [
    { src: mp4, type: "video/mp4", media: GRAND_ECRAN },
    { src: varianteMobile(mp4), type: "video/mp4" },
  ];
}
