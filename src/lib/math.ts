/** Petites fonctions d'interpolation, partagées par les chapitres. */

export const borne01 = (v: number): number => Math.max(0, Math.min(1, v));

export const borner = (v: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, v));

export const melanger = (a: number, b: number, t: number): number =>
  a + (b - a) * t;

/**
 * Rattrapage progressif, exprimé pour une frame de référence de 60 Hz.
 *
 * Un `lerp` brut appliqué une fois par frame va deux fois plus vite sur un
 * écran à 120 Hz. La correction exponentielle rend le mouvement identique
 * quelle que soit la cadence — indispensable ici, où la même valeur pilote un
 * défilement horizontal sur des machines très différentes.
 */
export const rattraper = (
  actuel: number,
  cible: number,
  facteur: number,
  delta: number,
): number => {
  const t = 1 - Math.pow(1 - facteur, delta / (1000 / 60));
  return actuel + (cible - actuel) * t;
};

/** Remappe `v` de l'intervalle [a1, a2] vers [b1, b2], sans borner. */
export const remapper = (
  v: number,
  a1: number,
  a2: number,
  b1: number,
  b2: number,
): number => b1 + ((v - a1) / (a2 - a1)) * (b2 - b1);
