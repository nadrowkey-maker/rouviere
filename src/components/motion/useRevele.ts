"use client";

import { useRef, type RefObject } from "react";
import { gsap, SplitText } from "@/lib/gsap";
import { useMouvement } from "./MotionProvider";
import { useEffetVisuel } from "@/lib/isomorphe";



/**
 * Le reveal typographique retenu — la fiche de projet.
 *
 * Repris de `onscroll-typography-animations`, mais de sa version la plus sobre :
 * la source propose quinze effets, dont des rotations aléatoires et des mises à
 * l'échelle par caractère. Ici les lignes montent derrière une arête, et c'est
 * tout. La fiche est le seul moment calme du site — « le calme après le
 * mouvement fait le mouvement ». Un titre qui se disloque ici ferait de la
 * chambre une suite d'effets au lieu d'une descente.
 *
 * Ce qui est repris de la source : le découpage en lignes masquées, le
 * `will-change` posé sur ce qui bouge, et le déclenchement par ScrollTrigger.
 * Ce qui ne l'est pas : le scrub. Le texte se pose une fois et reste — on lit
 * une fiche, on ne la fait pas défiler à la main.
 */
export function useRevele(
  racine: RefObject<HTMLElement | null>,
  /** Sélecteur des blocs à révéler, dans la racine. */
  selecteur: string,
): void {
  const { mouvementReduit } = useMouvement();
  const selecteurRef = useRef(selecteur);
  selecteurRef.current = selecteur;

  useEffetVisuel(() => {
    const element = racine.current;
    if (element === null) return;

    /* En mouvement réduit le texte est simplement là. Découper puis tout
       rendre à l'état final coûterait un reflow pour rien. */
    if (mouvementReduit) return;

    let annule = false;
    let decoupe: SplitText | null = null;
    let declencheur: gsap.core.Tween | null = null;

    /* On ne découpe pas un texte dont la police n'est pas arrivée : les lignes
       se casseraient ailleurs et les masques seraient posés de travers. */
    void document.fonts.ready.then(() => {
      if (annule) return;

      const blocs = element.querySelectorAll<HTMLElement>(selecteurRef.current);
      if (blocs.length === 0) return;

      /* `mask: "lines"` fabrique l'arête au-dessus de chaque ligne — c'est le
         motif `.oh` de la source, tenu par le plugin plutôt qu'à la main. */
      decoupe = SplitText.create(blocs, {
        type: "lines",
        mask: "lines",
        linesClass: "revele__ligne",
      });

      declencheur = gsap.from(decoupe.lines, {
        yPercent: 110,
        duration: 0.72,
        ease: "expo.out",
        /* Jamais un pas constant : la distribution porte sa propre courbe. */
        stagger: { each: 0.055, from: "start", ease: "power2.in" },
        scrollTrigger: {
          trigger: element,
          start: "top 78%",
          once: true,
        },
      });
    });

    return () => {
      annule = true;
      declencheur?.scrollTrigger?.kill();
      declencheur?.kill();
      decoupe?.revert();
    };
  }, [racine, mouvementReduit]);
}

