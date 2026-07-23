/**
 * La boucle. Une seule, pour tout le site.
 *
 * Un unique `gsap.ticker.add` existe dans le projet : celui de ce fichier.
 * Aucun composant, aucun effet importé n'a le droit d'ouvrir son propre
 * `requestAnimationFrame` — la règle est tenue par ESLint (voir
 * `eslint.config.mjs`, `no-restricted-globals`).
 *
 * L'ordre n'est pas laissé au hasard des montages React. Il est porté par
 * trois phases fixes, exécutées dans cet ordre à chaque battement :
 *
 *   1. `defilement` — Lenis avance sa position, ScrollTrigger se met à jour.
 *   2. `mesure`     — on lit le DOM. Uniquement des lectures.
 *   3. `rendu`      — on écrit : meshes positionnés, puis rendu WebGL.
 *
 * Lire dans la phase de rendu ou écrire dans la phase de mesure ramène le
 * layout thrashing qu'on a passé le rig à éliminer.
 */
import { gsap } from "@/lib/gsap";

export type Phase = "defilement" | "mesure" | "rendu";

/** `temps` en secondes depuis le démarrage, `delta` en millisecondes. */
export type Battement = (temps: number, delta: number) => void;

const ORDRE: readonly Phase[] = ["defilement", "mesure", "rendu"];

/**
 * Les listes sont remplacées, jamais mutées : une désinscription qui survient
 * pendant un battement ne perturbe pas l'itération en cours, et le parcours
 * par index n'alloue rien à chaque frame.
 */
const abonnes: Record<Phase, readonly Battement[]> = {
  defilement: [],
  mesure: [],
  rendu: [],
};

let branchee = false;

function battre(temps: number, delta: number) {
  for (let p = 0; p < ORDRE.length; p += 1) {
    const liste = abonnes[ORDRE[p]!];
    for (let i = 0; i < liste.length; i += 1) {
      liste[i]!(temps, delta);
    }
  }
}

/**
 * Inscrit un rappel dans une phase. Retourne sa désinscription.
 * La boucle se branche au premier abonné et reste branchée : un ticker vide
 * coûte un appel de fonction par frame, un branchement/débranchement répété
 * coûte plus cher que ça.
 */
export function inscrire(phase: Phase, rappel: Battement): () => void {
  if (typeof window === "undefined") return () => {};

  abonnes[phase] = [...abonnes[phase], rappel];

  if (!branchee) {
    branchee = true;
    gsap.ticker.add(battre);
  }

  return () => {
    abonnes[phase] = abonnes[phase].filter((inscrit) => inscrit !== rappel);
  };
}

/** Nombre d'abonnés d'une phase — lu par le panneau de debug. */
export function compterAbonnes(phase: Phase): number {
  return abonnes[phase].length;
}
