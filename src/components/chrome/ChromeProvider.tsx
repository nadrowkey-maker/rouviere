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
  /**
   * `restaurerFocus` est faux quand la fermeture suit un clic de navigation :
   * le focus part alors avec la nouvelle page, on ne le ramène pas au burger.
   *
   * `immediat` ferme **sans animation et sans passer par l'orchestrateur**. Un
   * seul cas s'en sert, et il est précis : quand le geste qui ferme le menu
   * enchaîne sur le sas — le logotype, une ancre du parcours. L'orchestrateur ne
   * tient qu'une transition vivante à la fois et **tue la précédente en la
   * finalisant** ; une fermeture animée réclamée juste après le sas le tuerait
   * donc en plein vol, et avec lui le saut qu'il porte dans son noir. Le menu
   * n'a de toute façon rien à montrer en se retirant : la surface du sas est
   * au-dessus de lui (couche 46 contre 45), tout se passe derrière le noir.
   */
  fermerMenu: (restaurerFocus?: boolean, immediat?: boolean) => void;
  basculerMenu: () => void;
  burgerRef: RefObject<HTMLButtonElement | null>;
  /** Levé le temps d'une fermeture qui doit rendre le focus au burger. */
  focusARestaurer: RefObject<boolean>;
  /** Levé le temps d'une fermeture sans animation. Voir `fermerMenu`. */
  fermetureImmediate: RefObject<boolean>;
};

const ContexteChrome = createContext<Chrome | null>(null);

export function ChromeProvider({ children }: { children: React.ReactNode }) {
  const [menuOuvert, setMenuOuvert] = useState(false);
  const burgerRef = useRef<HTMLButtonElement>(null);
  const focusARestaurer = useRef(false);
  const fermetureImmediate = useRef(false);

  const ouvrirMenu = useCallback(() => setMenuOuvert(true), []);

  const fermerMenu = useCallback((restaurerFocus = true, immediat = false) => {
    focusARestaurer.current = restaurerFocus;
    fermetureImmediate.current = immediat;
    setMenuOuvert(false);
  }, []);

  const basculerMenu = useCallback(() => {
    setMenuOuvert((ouvert) => {
      /* Ouvrir puis fermer par le même bouton : la fermeture rend le focus, et
         elle s'anime — c'est le geste ordinaire. */
      if (ouvert) {
        focusARestaurer.current = true;
        fermetureImmediate.current = false;
      }
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
      fermetureImmediate,
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
