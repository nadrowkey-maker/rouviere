/**
 * Le décor du manifeste : l'appartement qui s'allume.
 *
 * Huit secondes dans une pièce obscure dont les lumières se lèvent à 2,8 s,
 * décomposées en cent quatre-vingt-douze images AVIF par
 * `scripts/manifeste.mjs`. Le vestibule les rejoue sur un canvas 2D, l'index
 * piloté au défilement — jamais un `video.currentTime`, qui saccade sur Safari
 * et iOS (voir le commentaire d'en-tête du script, et `useSequence`).
 *
 * **`indexAllumage` est le seul repère de mise en scène du chapitre.** C'est
 * l'image où la pièce s'allume, calculée et non estimée : `round(2,8 × 24)`.
 * Le mot LUMIÈRE s'y lève, avec la pièce — pas avant, pas après.
 */
import type { Sequence } from "./visuels";

export const MANIFESTE: Sequence = {
  dossier: "/frames/manifeste",
  nombre: 192,
  extension: "avif",
  largeur: 1280,
  hauteur: 720,
};

/**
 * L'image où les lumières s'allument. Reportée depuis la sortie du script, qui
 * l'imprime : `node scripts/manifeste.mjs`.
 */
export const INDEX_ALLUMAGE = 67;

/**
 * L'allumage, en part de la séquence — donc en part de la course du chapitre,
 * puisque l'index y est mappé linéairement. C'est de cette seule valeur que
 * descend le minutage du mot LUMIÈRE.
 */
export const PART_ALLUMAGE = INDEX_ALLUMAGE / (MANIFESTE.nombre - 1);

/** La pièce pleinement allumée. Le mouvement réduit n'a qu'elle à montrer. */
export const PLAN_ALLUME = {
  src: "/media/manifeste/allumage-poster.avif",
  largeur: MANIFESTE.largeur,
  hauteur: MANIFESTE.hauteur,
  alt: "Le séjour d'un appartement, lumières allumées, la ville derrière les baies.",
};

/**
 * Le lieu — ce que la caméra découvre en se redressant, au septième temps.
 *
 * Le plan lui-même est une boucle de 20,2 s, verrouillée, choisie parmi les
 * 3978 images du rush comme la paire dont les deux extrémités coïncident le
 * mieux : l'écart au raccord y est **plus petit que la plus grande rafale de
 * vent du plan**, si bien que la boucle ne peut pas se voir. Il ne porte aucun
 * étalonnage cuit — l'exposition est un uniforme, réglé par le chapitre.
 *
 * La poste sert au mouvement réduit, où le redressement n'a pas lieu mais où ce
 * qu'il découvre reste dû.
 */
export const PLAN_LIEU = {
  video: "/media/manifeste/piscine.mp4",
  src: "/media/manifeste/piscine-poster.avif",
  largeur: 1920,
  hauteur: 1080,
};
