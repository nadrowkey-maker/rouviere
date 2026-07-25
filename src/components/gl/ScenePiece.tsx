"use client";

import type { RefObject } from "react";
import { useGLProxy } from "./useGLProxy";
import { fabriquerPiece, type EtatEnfilade } from "./materiaux/piece";

/**
 * L'inscription WebGL d'une pièce de l'enfilade — et rien d'autre. Ce
 * composant ne rend aucun DOM.
 *
 * Il existe pour une raison de poids, pas de découpage : `materiaux/piece`
 * importe Three.js. Importé depuis le chapitre, il ferait entrer tout le moteur
 * dans le paquet de première charge — celui-là même que `Rig.tsx` prend soin de
 * charger à la demande. Isolé ici et monté en `dynamic(..., { ssr: false })`,
 * Three.js reste dans son propre morceau, chargé quand le chapitre arrive.
 *
 * Le HTML du chapitre, lui, continue d'être rendu par le serveur : c'est la
 * mise en page, le texte et le mode dégradé, qui ne doivent pas attendre le
 * moteur.
 */

type Props = {
  ancre: RefObject<HTMLElement | null>;
  source: string;
  index: number;
  etat: { current: EtatEnfilade };
  cle: string;
  /** La dernière pièce : une fenêtre sur l'image de sortie, déjà à sa taille. */
  fenetreFixe?: boolean;
};

export default function ScenePiece({
  ancre,
  source,
  index,
  etat,
  cle,
  fenetreFixe,
}: Props) {
  useGLProxy(
    ancre,
    fabriquerPiece({
      source,
      index,
      etat,
      fenetreFixe,
      /* La source en pose quarante. Chacune coûte deux prises de texture, et
         trois pièces sont à l'écran en même temps. Vingt-huit garde la douceur
         du bruit — c'est lui qui empêche le flou de baguer — pour trois
         cinquièmes du coût. */
      repetitions: 28,
      ancre,
    }),
    cle,
  );

  return null;
}
