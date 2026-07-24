"use client";

import { useRef, type RefObject } from "react";
import { useGLProxy } from "./useGLProxy";
import { fabriquerBassin, type EtatBassin } from "./materiaux/bassin";

/**
 * L'inscription WebGL du bassin — et rien d'autre. Ce composant ne rend aucun
 * DOM.
 *
 * Le bassin est le plus lourd des effets du site : deux cibles flottantes en
 * ping-pong et une simulation à soixante pas par seconde. Il est donc isolé
 * derrière `dynamic(..., { ssr: false })` comme les autres scènes, et surtout
 * il n'existe que le temps d'un écran — sa boucle est suspendue par le rig dès
 * que l'ancre sort du viewport. Le HTML du chapitre, lui, garde son `<img>` de
 * repli, qui reste visible tant que le moteur n'a pas pris la main.
 */

type Props = {
  ancre: RefObject<HTMLElement | null>;
  etat: { current: EtatBassin };
  repli: string;
  /** La vitesse lissée du pointeur, remontée au cadre. Voir `bassin.ts`. */
  onVitesse?: (vitesse: number | null) => void;
};

export default function SceneBassin({ ancre, etat, repli, onVitesse }: Props) {
  /* `onVitesse` passe par une ref : la fabrique n'est appelée qu'à
     l'inscription, et un rappel qui changerait d'identité entre deux rendus
     reconstruirait toute la simulation. */
  const rappel = useRef(onVitesse);
  rappel.current = onVitesse;

  useGLProxy(
    ancre,
    fabriquerBassin({
      etat,
      repli,
      onVitesse: (vitesse) => rappel.current?.(vitesse),
    }),
    "bassin",
  );
  return null;
}
