/**
 * Géométrie de mise en page, lue sans jamais passer par un rect.
 *
 * Deux chapitres ont besoin de savoir où se trouve un élément **dans la mise en
 * page**, pas où il se trouve à l'écran : l'enfilade, pour poser le cadre de son
 * plan de sortie, et l'atelier, pour centrer sa plongée. Un
 * `getBoundingClientRect` répondrait à la mauvaise question — il inclut toutes
 * les transformations, et ces deux chapitres en portent en permanence
 * (l'épinglage de la section, la translation du couloir, l'échelle d'une
 * planche). La mesure serait donc fausse dès la seconde frame.
 *
 * `offsetLeft` et `offsetTop`, eux, ignorent les transformations. Sommés le long
 * de la chaîne des `offsetParent`, ils donnent une position de mise en page
 * stable, valable quelle que soit l'animation en cours.
 *
 * Cela reste une lecture du DOM : elle appartient au rafraîchissement de
 * ScrollTrigger, jamais à une frame d'animation.
 */

/**
 * Décalage d'un élément dans un de ses ancêtres, transformations exclues.
 *
 * L'ancêtre doit être sur la chaîne des `offsetParent` de l'élément — donc
 * positionné (`relative`, `absolute`, `fixed`, `sticky`). Sinon la remontée le
 * dépasse et s'arrête à la racine : le décalage rendu est alors celui dans le
 * document, ce qui est encore cohérent mais rarement ce qu'on voulait.
 */
export function decalageDans(
  element: HTMLElement,
  ancetre: HTMLElement,
): { x: number; y: number } {
  let x = 0;
  let y = 0;
  let noeud: HTMLElement | null = element;
  while (noeud !== null && noeud !== ancetre) {
    x += noeud.offsetLeft;
    y += noeud.offsetTop;
    noeud = noeud.offsetParent as HTMLElement | null;
  }
  return { x, y };
}
