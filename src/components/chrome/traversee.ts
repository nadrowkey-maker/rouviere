/**
 * Le sas : le point de passage par lequel on quitte l'écran et on y revient.
 *
 * Il existe dans le site un geste qui n'est ni une navigation ni un défilement :
 * cliquer le logotype alors qu'on est déjà sur le parcours. Rien ne change de
 * route, donc aucune couture ne se monte ; et remonter neuf écrans en défilement
 * lissé n'est pas un retour, c'est un rembobinage — on repasse à l'envers dans
 * tout ce qu'on vient de traverser, chapitre par chapitre, pendant plusieurs
 * secondes.
 *
 * Le sas éteint l'écran, fait le saut derrière le noir, et rallume. C'est le
 * même fondu de matière que partout ailleurs (voir `motion/passage.ts`), et
 * pendant ces quelques dixièmes de seconde il n'y a rien à regarder qu'un plein
 * noir et le logotype en petit, en haut à gauche, qui l'inverse — l'écran de
 * chargement du site, et il n'en existe qu'un.
 *
 * Ce module est le registre par lequel on l'atteint : un singleton, comme
 * l'orchestrateur. Le logotype ne connaît donc pas le composant qui peint le
 * sas, et le sas n'a pas besoin d'être un contexte React qu'il faudrait faire
 * descendre jusqu'à lui.
 *
 * Il s'appelle `traversee` et non `sas` pour une raison prosaïque : `Sas.tsx`
 * existe déjà, et les deux noms se confondraient sur un système de fichiers
 * insensible à la casse — TypeScript refuse de compiler les deux ensemble.
 */

/** Ce qu'on fait derrière le noir. Instantané par construction. */
export type Traversee = () => void;

let ouvrir: ((traversee: Traversee) => void) | null = null;

/**
 * Le composant qui peint le sas s'enregistre ici. Retourne sa désinscription.
 */
export function enregistrerSas(
  ouvrirSas: (traversee: Traversee) => void,
): () => void {
  ouvrir = ouvrirSas;
  return () => {
    if (ouvrir === ouvrirSas) ouvrir = null;
  };
}

/**
 * Traverse le sas : l'écran s'éteint, `traversee` s'exécute dans le noir, puis
 * l'écran se rallume.
 *
 * Sans sas monté — rendu serveur, hydratation en cours —, la traversée a lieu
 * quand même, sans le noir. Un geste ne doit jamais être perdu parce que sa
 * mise en scène n'est pas prête.
 */
export function traverserLeSas(traversee: Traversee): void {
  if (ouvrir === null) {
    traversee();
    return;
  }
  ouvrir(traversee);
}
