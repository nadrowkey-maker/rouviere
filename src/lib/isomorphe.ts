import { useEffect, useLayoutEffect } from "react";

/**
 * `useLayoutEffect` côté client, `useEffect` côté serveur.
 *
 * Tout ce qui mesure ou positionne doit s'exécuter avant la peinture, sinon
 * on paie un cadre de décalage visible. React prévient si `useLayoutEffect`
 * est appelé pendant le rendu serveur — d'où la bascule.
 */
export const useEffetVisuel =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;
