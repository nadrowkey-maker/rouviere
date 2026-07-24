"use client";

import type { RefObject } from "react";
import { useGLProxy } from "./useGLProxy";
import {
  fabriquerEchantillon,
  type EtatMatiere,
} from "./materiaux/echantillon";

/**
 * L'inscription WebGL d'une plaque de matière — et rien d'autre. Ce composant
 * ne rend aucun DOM.
 *
 * Même raison d'être que `ScenePiece` : `materiaux/echantillon` importe Three.js,
 * on l'isole donc derrière un `dynamic(..., { ssr: false })` pour qu'il ne pèse
 * pas sur la première charge. Le HTML du chapitre — la mise en page, les noms
 * des matières, la version dégradée — est rendu par le serveur, et cette scène
 * se cale sur la figure que le rig mesure.
 */

type Props = {
  ancre: RefObject<HTMLElement | null>;
  texture: string;
  ombre: string;
  index: number;
  etat: { current: EtatMatiere };
  cle: string;
};

export default function SceneEchantillon({
  ancre,
  texture,
  ombre,
  index,
  etat,
  cle,
}: Props) {
  useGLProxy(
    ancre,
    fabriquerEchantillon({ texture, ombre, index, etat }),
    cle,
  );
  return null;
}
