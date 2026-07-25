/**
 * Détection de la classe de capacité de l'appareil.
 *
 * Trois mesures, pas une de plus : le nombre de cœurs, le support de WebGL2,
 * la grossièreté du pointeur. Elles décident du mode dégradé, c'est-à-dire du
 * moment où un chapitre rend sa version DOM/CSS plutôt que sa version WebGL.
 * Cette version doit être belle aussi — le dégradé n'est pas une punition.
 */

export type Capacites = {
  /** `navigator.hardwareConcurrency`, 0 si l'information est refusée. */
  coeurs: number;
  webgl2: boolean;
  /** Tactile ou stylet : le curseur personnalisé et les survols s'effacent. */
  pointeurGrossier: boolean;
};

/** Seuil du déclencheur de complexité — CLAUDE.md, budget de performance. */
export const SEUIL_COEURS = 4;

/** Au-delà, le premier rendu est jugé trop cher et bascule le site en dégradé. */
export const SEUIL_PREMIER_RENDU_MS = 22;

/**
 * Valeurs du rendu serveur : on suppose la machine capable pour ne pas servir
 * un HTML dégradé à tout le monde, et on corrige avant la première peinture.
 */
export const CAPACITES_SUPPOSEES: Capacites = {
  coeurs: SEUIL_COEURS,
  webgl2: true,
  pointeurGrossier: false,
};

let webgl2Detecte: boolean | null = null;

/**
 * Un contexte WebGL2 jetable, créé une seule fois, refermé aussitôt :
 * un contexte laissé ouvert compte dans la limite du navigateur (16 environ)
 * et peut faire perdre celui du rig.
 */
function supporteWebgl2(): boolean {
  if (webgl2Detecte !== null) return webgl2Detecte;

  try {
    const sonde = document.createElement("canvas");
    const contexte = sonde.getContext("webgl2");
    webgl2Detecte = contexte !== null;
    contexte?.getExtension("WEBGL_lose_context")?.loseContext();
  } catch {
    webgl2Detecte = false;
  }

  return webgl2Detecte;
}

/**
 * `Save-Data: on` — l'utilisateur a demandé à son navigateur d'économiser les
 * données. On ne lui téléverse pas une vidéo d'aperçu de menu : une photographie
 * fixe suffit. `navigator.connection` n'existe pas partout (Safari, Firefox),
 * d'où la lecture prudente.
 */
export function donneesEconomes(): boolean {
  const connexion = (
    navigator as Navigator & { connection?: { saveData?: boolean } }
  ).connection;
  return connexion?.saveData === true;
}

export function detecterCapacites(): Capacites {
  return {
    coeurs: navigator.hardwareConcurrency ?? 0,
    webgl2: supporteWebgl2(),
    pointeurGrossier: matchMedia("(pointer: coarse)").matches,
  };
}

/** Le site rend sa version DOM/CSS quand l'une des trois conditions tombe. */
export function estDegrade(
  capacites: Capacites,
  premierRenduMs: number | null,
): boolean {
  if (!capacites.webgl2) return true;
  if (capacites.coeurs > 0 && capacites.coeurs < SEUIL_COEURS) return true;
  if (premierRenduMs !== null && premierRenduMs > SEUIL_PREMIER_RENDU_MS) {
    return true;
  }
  return false;
}
