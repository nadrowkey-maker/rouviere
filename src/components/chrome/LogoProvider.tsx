"use client";

import { createContext, useContext, useRef, type RefObject } from "react";

/**
 * Le logotype est un seul nœud DOM pour tout le site.
 *
 * Le geste signature du projet repose là-dessus : la même instance traverse la
 * vidéo d'intro, se déplace au centre vers la barre de navigation par GSAP
 * Flip, puis y reste et continue d'inverser tous les mondes chromatiques du
 * parcours en `mix-blend-mode: difference`. Elle ne se démonte jamais.
 *
 * Pour que le seuil puisse animer ce nœud sans le posséder, sa ref vit dans un
 * contexte : le `Logo` monté dans le layout la remplit, le chapitre du seuil la
 * lit. Aucun autre chapitre n'y touche.
 */

type Logotype = {
  ref: RefObject<HTMLAnchorElement | null>;
};

const ContexteLogo = createContext<Logotype | null>(null);

export function LogoProvider({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLAnchorElement>(null);
  return (
    <ContexteLogo.Provider value={{ ref }}>{children}</ContexteLogo.Provider>
  );
}

export function useLogo(): Logotype {
  const contexte = useContext(ContexteLogo);
  if (contexte === null) {
    throw new Error("useLogo doit être appelé sous un LogoProvider.");
  }
  return contexte;
}
