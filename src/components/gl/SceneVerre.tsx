"use client";

import type { RefObject } from "react";
import { useGLProxy } from "./useGLProxy";
import { fabriquerVerre, type EtatVerre } from "./materiaux/verre";

/**
 * L'inscription WebGL du titre en verre — et rien d'autre. Ce composant ne rend
 * aucun DOM.
 *
 * Comme les autres scènes, `materiaux/verre` importe Three.js et l'environnement
 * de pièce ; on l'isole derrière `dynamic(..., { ssr: false })` pour qu'il ne
 * pèse pas sur la première charge. Le chapitre monte cette scène seulement quand
 * le verre est réellement rendu — jamais sur pointeur grossier, où le titre DOM
 * prend le relais.
 */

type Props = {
  ancre: RefObject<HTMLElement | null>;
  titre: string;
  police: string;
  etat: { current: EtatVerre };
};

export default function SceneVerre({ ancre, titre, police, etat }: Props) {
  useGLProxy(ancre, fabriquerVerre({ titre, police, etat }), "verre");
  return null;
}
