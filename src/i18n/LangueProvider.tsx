"use client";

import { createContext, useContext, useMemo } from "react";
import { useParams } from "next/navigation";
import { useEffetVisuel } from "@/lib/isomorphe";
import {
  CLE_LANGUE,
  langueValide,
  type Langue,
  type Texte,
  type Textes,
} from "./langues";
import { INTERFACE, type Cle } from "./dictionnaire";

/**
 * La langue courante, et de quoi la dire.
 *
 * ## D'où vient la langue
 *
 * **Du segment d'URL, et de nulle part ailleurs.** `useParams()` fonctionne
 * aussi bien au rendu serveur qu'au client, si bien que le HTML servi pour
 * `/en` est déjà en anglais — ce n'est pas une correction après coup.
 *
 * Le provider vit dans le layout **racine**, au-dessus du segment de langue :
 * il traverse donc les navigations sans se remonter, comme le canvas et le
 * logotype. Il lit un paramètre qui, lui, change.
 *
 * `localStorage` ne décide plus de rien — il ne fait que **retenir** la
 * dernière langue choisie, pour que le chrome puisse la proposer. La source de
 * vérité est l'adresse.
 *
 * ## Ce que le contexte expose
 *
 * Trois choses, et rien d'autre : la langue, un traducteur d'interface (`t`) et
 * deux lecteurs de données bilingues (`dire`, `direTous`). Aucun composant ne
 * lit un dictionnaire directement — un seul point de lecture, donc une seule
 * chose à changer le jour où une troisième langue arrive.
 *
 * Il n'y a **pas** de fonction de bascule : changer de langue est une
 * navigation, donc un lien. Voir `chrome/Langue.tsx`.
 */

type Contexte = {
  langue: Langue;
  /** Un libellé d'interface. */
  t: (cle: Cle) => string;
  /** Un texte de données, déjà bilingue. */
  dire: (texte: Texte) => string;
  /** Une suite de paragraphes de données. */
  direTous: (textes: Textes) => readonly string[];
};

const ContexteLangue = createContext<Contexte | null>(null);

export function LangueProvider({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const langue = langueValide(
    typeof params?.langue === "string" ? params.langue : null,
  );

  /* L'attribut `lang` du document et la préférence retenue. Le premier fait
     changer de voix un lecteur d'écran et cale la césure typographique ; la
     seconde ne sert qu'à ce que le site sache, la prochaine fois, quelle langue
     proposer. Un script en tête de `<body>` pose déjà `lang` avant la première
     peinture — ceci le tient à jour au fil des navigations. */
  useEffetVisuel(() => {
    document.documentElement.lang = langue;
    try {
      localStorage.setItem(CLE_LANGUE, langue);
    } catch {
      /* Stockage refusé (navigation privée) : la préférence ne survit pas à la
         visite. Le site, lui, fonctionne — l'URL suffit. */
    }
  }, [langue]);

  const valeur = useMemo<Contexte>(
    () => ({
      langue,
      t: (cle) => INTERFACE[cle][langue],
      dire: (texte) => texte[langue],
      direTous: (textes) => textes[langue],
    }),
    [langue],
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
