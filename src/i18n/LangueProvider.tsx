"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import { useEffetVisuel } from "@/lib/isomorphe";
import {
  CLE_LANGUE,
  LANGUE_PAR_DEFAUT,
  langueValide,
  type Langue,
  type Texte,
  type Textes,
} from "./langues";
import { INTERFACE, type Cle } from "./dictionnaire";

/**
 * La langue courante, et de quoi la dire.
 *
 * Le contexte expose trois choses et rien d'autre : la langue, de quoi en
 * changer, et un traducteur. Les composants ne lisent jamais un dictionnaire
 * directement — ils appellent `t("cle")` pour l'interface, ou `dire(texte)`
 * pour un texte de données. Un seul point de lecture, donc une seule chose à
 * changer le jour où le routage par langue arrive.
 *
 * ## L'hydratation, et pourquoi le premier rendu est toujours en français
 *
 * La préférence vit dans `localStorage`, que le serveur ne peut pas lire. Le
 * HTML rendu est donc toujours l'original ; l'effet de disposition corrige
 * avant la première peinture, si bien qu'un visiteur anglophone ne voit pas
 * clignoter le français. C'est le même parti que la classe `seuil-a-jouer`, à
 * ceci près qu'on ne peut pas le faire en script inline : le texte est dans
 * l'arbre React, pas dans une classe.
 *
 * ## `lang` sur le document
 *
 * Ce n'est pas une formalité. C'est ce qui fait qu'un lecteur d'écran change de
 * voix, que la césure typographique suit la bonne langue et qu'un traducteur
 * automatique ne se déclenche pas sur du texte déjà traduit. L'attribut est
 * donc écrit à chaque bascule.
 */

type Contexte = {
  langue: Langue;
  changerLangue: (langue: Langue) => void;
  basculerLangue: () => void;
  /** Un libellé d'interface. */
  t: (cle: Cle) => string;
  /** Un texte de données, déjà bilingue. */
  dire: (texte: Texte) => string;
  /** Une suite de paragraphes de données. */
  direTous: (textes: Textes) => readonly string[];
};

const ContexteLangue = createContext<Contexte | null>(null);

export function LangueProvider({ children }: { children: React.ReactNode }) {
  const [langue, setLangue] = useState<Langue>(LANGUE_PAR_DEFAUT);
  /* Vrai une fois la préférence relue : elle ne doit être écrite qu'ensuite,
     sinon le premier rendu écraserait le choix de la visite précédente. */
  const relue = useRef(false);

  useEffetVisuel(() => {
    let stockee: string | null = null;
    try {
      stockee = localStorage.getItem(CLE_LANGUE);
    } catch {
      /* Stockage refusé (navigation privée) : on reste sur l'original. */
    }
    relue.current = true;
    const choisie = langueValide(stockee);
    if (choisie !== LANGUE_PAR_DEFAUT) setLangue(choisie);
  }, []);

  useEffetVisuel(() => {
    document.documentElement.lang = langue;
    if (!relue.current) return;
    try {
      localStorage.setItem(CLE_LANGUE, langue);
    } catch {
      /* La préférence ne survivra pas à la visite. Le site, lui, fonctionne. */
    }
  }, [langue]);

  const changerLangue = useCallback((suivante: Langue) => {
    setLangue(suivante);
  }, []);

  const basculerLangue = useCallback(() => {
    setLangue((courante) => (courante === "fr" ? "en" : "fr"));
  }, []);

  const valeur = useMemo<Contexte>(
    () => ({
      langue,
      changerLangue,
      basculerLangue,
      t: (cle) => INTERFACE[cle][langue],
      dire: (texte) => texte[langue],
      direTous: (textes) => textes[langue],
    }),
    [langue, changerLangue, basculerLangue],
  );

  return (
    <ContexteLangue.Provider value={valeur}>{children}</ContexteLangue.Provider>
  );
}

export function useLangue(): Contexte {
  const contexte = useContext(ContexteLangue);
  if (contexte === null) {
    throw new Error("useLangue doit être appelé sous un LangueProvider.");
  }
  return contexte;
}
