"use client";

import { useCallback, useRef } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { useMouvement } from "@/components/motion/MotionProvider";
import { useEffetVisuel } from "@/lib/isomorphe";
import type { Sequence } from "@/data/visuels";
import { useSequence } from "./useSequence";
import "./sequence.css";

/**
 * La séquence de frames épinglée — *l'approche* d'une chambre.
 *
 * Un vrai plan de caméra qui traverse la villa, décomposé en images fixes et
 * redessiné sur un canvas 2D, l'index piloté par le défilement.
 *
 * Toute la mécanique — chargement en deux temps, cadrage `cover`, dessin en
 * phase de rendu — vit dans `useSequence`, que le vestibule partage. Il ne
 * reste ici que ce qui appartient en propre à ce chapitre : **son épinglage**.
 * C'est précisément ce qui ne pouvait pas être commun, le manifeste ayant déjà
 * son cadre collé et sa timeline.
 */

type Props = {
  sequence: Sequence;
  /** L'équivalent DOM de ce que peint le canvas. */
  description: string;
  className?: string;
};

export function SequenceCanvas({ sequence, description, className }: Props) {
  const { mouvementReduit } = useMouvement();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ancreRef = useRef<HTMLDivElement>(null);

  /* La hauteur de l'approche est déjà réservée (100 vh, indépendante des
     frames), mais le premier tiers vient d'arriver de façon asynchrone : on
     re-mesure une fois, pour caler les sections épinglées qui suivent sur des
     positions définitives plutôt que sur celles d'avant le chargement. */
  const surPret = useCallback(() => ScrollTrigger.refresh(), []);

  const { index, prete } = useSequence(canvasRef, ancreRef, sequence, {
    surPret,
  });

  useEffetVisuel(() => {
    const ancre = ancreRef.current;
    if (ancre === null || mouvementReduit) return;

    /* Le déclencheur est créé tout de suite, et non une fois les images
       chargées.

       Ce n'est pas un détail d'ordonnancement : il épingle, donc il insère un
       espaceur dans le flux. Créé plus tard, cet espaceur s'intercale au-dessus
       de chapitres dont ScrollTrigger a déjà mesuré la position — et la chambre
       suivante se retrouve décalée de toute la hauteur de l'épinglage. Tous les
       déclencheurs qui épinglent doivent exister au montage, dans l'ordre du
       document. Le chargement, lui, peut prendre son temps : tant qu'aucune
       image n'est prête, le dessin ne fait rien. */
    const relais = { p: 0 };
    const declencheur = ScrollTrigger.create({
      trigger: ancre,
      start: "top top",
      end: () => `+=${innerHeight * 2.4}`,
      pin: true,
      /* Le même motif que l'enfilade : `.scene-page` porte en permanence un
         `transform` et un `filter`, donc un `position: fixed` s'y calerait sur
         la page et non sur le viewport. */
      pinType: "transform",
      /* L'approche est la section épinglée la plus haute de la chambre : elle
         se re-mesure avant la profondeur qui la suit, pour que le calage de
         l'une ne parte pas d'une position encore fausse de l'autre. */
      refreshPriority: 1,
      scrub: 0.6,
      invalidateOnRefresh: true,
      animation: gsap.to(relais, {
        p: 1,
        ease: "none",
        duration: 1,
        onUpdate: () => {
          index.current = Math.min(
            sequence.nombre - 1,
            Math.max(0, Math.round(relais.p * (sequence.nombre - 1))),
          );
        },
      }),
    });

    return () => declencheur.kill();
  }, [sequence, mouvementReduit, index]);

  return (
    <div
      className={`sequence${className === undefined ? "" : ` ${className}`}`}
      ref={ancreRef}
      data-prete={prete}
    >
      <canvas
        className="sequence__toile"
        ref={canvasRef}
        role="img"
        aria-label={description}
      />
    </div>
  );
}
