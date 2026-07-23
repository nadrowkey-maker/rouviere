"use client";

import { useRef } from "react";
import { monterSouffle, type ParametresVent } from "./souffle";
import { useMouvement } from "./MotionProvider";
import { useEffetVisuel } from "@/lib/isomorphe";
import "./souffle.css";

/**
 * Un bloc de texte que le vent rassemble, puis emporte.
 *
 * Trois nœuds, et le motif d'accessibilité de la source conservé tel quel :
 *
 *   1. un span `sr-only` qui porte le texte pour les lecteurs d'écran ;
 *   2. le **gabarit**, qui tient les dimensions naturelles du bloc — et qui est
 *      le texte réellement visible tant que le moteur n'a pas mesuré, donc sans
 *      JavaScript, avant hydratation, et en mouvement réduit ;
 *   3. la **couche animée**, `aria-hidden`, remplie par le moteur.
 *
 * React n'écrit jamais dans la couche : elle est rendue vide, le moteur en est
 * seul propriétaire. C'est ce qui permet de manipuler le DOM à la main sans
 * jamais entrer en conflit avec le rendu de React.
 */

type Props = {
  texte: string;
  className?: string;
  /** D'où viennent les lettres. */
  arrivee: Partial<ParametresVent>;
  /** Où elles repartent, ou `null` si le bloc reste — la dernière phrase. */
  depart?: Partial<ParametresVent> | null;
  /** Deux blocs de même graine se dispersent pareil : une graine par bloc. */
  graine: number;
  debut?: string;
  fin?: string;
};

export function TexteSouffle({
  texte,
  className,
  arrivee,
  depart = null,
  graine,
  debut = "top 88%",
  fin = "bottom 15%",
}: Props) {
  const { mouvementReduit } = useMouvement();
  const blocRef = useRef<HTMLParagraphElement>(null);
  const gabaritRef = useRef<HTMLSpanElement>(null);
  const coucheRef = useRef<HTMLSpanElement>(null);

  useEffetVisuel(() => {
    const element = blocRef.current;
    const gabarit = gabaritRef.current;
    const couche = coucheRef.current;
    if (element === null || gabarit === null || couche === null) return;

    /* En mouvement réduit, le manifeste ne s'agite pas : il est simplement là,
       composé, lisible, à sa place. C'est une version du chapitre, pas une
       punition — et c'est plus beau qu'un fondu d'opacité. */
    if (mouvementReduit) return;

    let annule = false;
    let deposer: (() => void) | null = null;

    /* Aucune mesure avant que Gambetta ne soit chargée : le repli n'a pas ses
       métriques, et chaque lettre serait posée à côté de sa vraie place. */
    void document.fonts.ready.then(() => {
      if (annule) return;
      deposer = monterSouffle({
        element,
        gabarit,
        couche,
        texte,
        arrivee,
        depart,
        graine,
        debut,
        fin,
      });
    });

    return () => {
      annule = true;
      deposer?.();
    };
    /* `arrivee` et `depart` sont des littéraux d'objet : les lister ici
       reconstruirait la timeline à chaque rendu du parent. Ce sont des réglages
       fixes, écrits dans le chapitre, pas un état. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [texte, graine, debut, fin, mouvementReduit]);

  return (
    <p className={`souffle${className === undefined ? "" : ` ${className}`}`} ref={blocRef}>
      <span className="sr-only">{texte}</span>
      <span className="souffle__gabarit" aria-hidden="true" ref={gabaritRef}>
        {texte}
      </span>
      <span className="souffle__couche" aria-hidden="true" ref={coucheRef} />
    </p>
  );
}
