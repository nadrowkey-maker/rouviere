"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";

/**
 * L'état du chrome que plusieurs pièces se partagent : l'ouverture du menu, et
 * la ref du burger.
 *
 * Le burger et l'overlay du menu sont deux composants distincts (l'un dans la
 * barre de nav, l'autre plein cadre) mais ils commandent le même état. La ref
 * du burger vit ici parce que c'est l'overlay qui doit lui rendre le focus à la
 * fermeture — accessibilité obligatoire — sans le connaître directement.
 */

type Chrome = {
  menuOuvert: boolean;
  ouvrirMenu: () => void;
  /** `restaurerFocus` est faux quand la fermeture suit un clic de navigation :
   *  le focus part alors avec la nouvelle page, on ne le ramène pas au burger. */
  fermerMenu: (restaurerFocus?: boolean) => void;
  basculerMenu: () => void;
  burgerRef: RefObject<HTMLButtonElement | null>;
  /** Levé le temps d'une fermeture qui doit rendre le focus au burger. */
  focusARestaurer: RefObject<boolean>;
};

const ContexteChrome = createContext<Chrome | null>(null);

export function ChromeProvider({ children }: { children: React.ReactNode }) {
  const [menuOuvert, setMenuOuvert] = useState(false);
  const burgerRef = useRef<HTMLButtonElement>(null);
  const focusARestaurer = useRef(false);

  const ouvrirMenu = useCallback(() => setMenuOuvert(true), []);

  const fermerMenu = useCallback((restaurerFocus = true) => {
    focusARestaurer.current = restaurerFocus;
    setMenuOuvert(false);
  }, []);

  const basculerMenu = useCallback(() => {
    setMenuOuvert((ouvert) => {
      /* Ouvrir puis fermer par le même bouton : la fermeture rend le focus. */
      if (ouvert) focusARestaurer.current = true;
      return !ouvert;
    });
  }, []);

  const valeur = useMemo<Chrome>(
    () => ({
      menuOuvert,
      ouvrirMenu,
      fermerMenu,
      basculerMenu,
      burgerRef,
      focusARestaurer,
    }),
    [menuOuvert, ouvrirMenu, fermerMenu, basculerMenu],
  );

  return (
    <ContexteChrome.Provider value={valeur}>{children}</ContexteChrome.Provider>
  );
}

export function useChrome(): Chrome {
  const contexte = useContext(ContexteChrome);
  if (contexte === null) {
    throw new Error("useChrome doit être appelé sous un ChromeProvider.");
  }
  return contexte;
}
