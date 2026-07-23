"use client";

import type { RefObject } from "react";
import { useGLProxy } from "./useGLProxy";
import {
  fabriquerProfondeur,
  type EtatProfondeur,
} from "./materiaux/profondeur";
import type { NomCouleur } from "@/lib/jetons";

/**
 * L'inscription WebGL de la profondeur d'une chambre. Aucun DOM.
 *
 * Même raison que `ScenePiece` : `materiaux/profondeur` importe Three.js, et
 * Three.js n'a rien à faire dans la première charge. Monté en
 * `dynamic(..., { ssr: false })` par le chapitre.
 */

type Props = {
  ancre: RefObject<HTMLElement | null>;
  sources: string[];
  monde: NomCouleur;
  etat: { current: EtatProfondeur };
  cle: string;
};

export default function SceneProfondeur({
  ancre,
  sources,
  monde,
  etat,
  cle,
}: Props) {
  useGLProxy(ancre, fabriquerProfondeur({ sources, monde, etat }), cle);
  return null;
}
