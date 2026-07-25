/**
 * La loi de largeur du logotype quand il tient l'écran.
 *
 * Le mot ROUVIÈRE paraît deux fois en monument dans tout le site : au générique
 * du seuil, où il s'installe avant de se ranger dans la barre, et au dernier
 * écran, où il se pose sur le plan de la sortie. **Ce sont les deux extrémités
 * du même fil, donc c'est le même mot à la même échelle** — et la seule façon
 * d'en être sûr est qu'il n'existe qu'un endroit où cette échelle soit écrite.
 *
 * Elle est exprimée en largeur et non en corps, parce que c'est la largeur qui
 * se voit : deux corps identiques donneraient deux largeurs différentes au
 * moindre changement d'interlettrage, et personne ne remarquerait le corps.
 * Les deux appelants mesurent donc le mot et en déduisent le corps ; ni l'un ni
 * l'autre n'écrit de valeur en `vw`, qui dépendrait des métriques de Gambetta.
 *
 * Le plafond existe pour les très grands écrans : au-delà, un mot qui continue
 * de grandir cesse d'être un logotype et devient une bannière.
 */

/** Part de la largeur de fenêtre occupée par le mot. */
export const PART_LARGEUR = 0.86;

/** Au-delà, le mot ne grandit plus. */
export const LARGEUR_MAX = 1600;

/** La largeur visée, en pixels, pour une fenêtre donnée. */
export function largeurLogotype(largeurFenetre: number): number {
  return Math.min(largeurFenetre * PART_LARGEUR, LARGEUR_MAX);
}
