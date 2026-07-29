"use client";

import type { RefObject } from "react";
import "./defilement.css";

/**
 * Le repère de défilement — la marque, jamais le mot.
 *
 * Il est né dans le hero d'un projet (`Chambre`), et il sert désormais aux trois
 * endroits du site où l'on peut croire qu'il n'y a plus rien à faire : la
 * première image du parcours, le hero d'un projet, et le temps mort du
 * vestibule où l'on ne voit que de l'eau. Une seule marque, un seul fichier :
 * deux repères de défilement qui ne se ressemblent pas, c'est deux fois le même
 * mot dit de deux voix.
 *
 * **Ce n'est pas un mot.** « Défiler » disait à voix haute ce que le geste
 * montre : sur un plan qui tient l'écran entier, un impératif écrit est la seule
 * chose qu'on lit, et il devient la seule chose qu'on regarde. La marque, elle,
 * se comprend sans se lire — et dans toutes les langues, ce que le mot ne
 * faisait même pas.
 *
 * Elle reste dans le vocabulaire du site : deux filets d'un pixel, angles vifs,
 * aucune couleur propre. Pas de flèche, pas de rebond, pas de souris arrondie —
 * le Livre I interdit l'un et l'autre. Une piste verticale, et un segment qui la
 * descend : c'est le défilement lui-même, pas son icône.
 *
 * **Ce que le composant ne fait pas.** Il ne se place pas et ne décide pas de sa
 * présence. Le chapitre hôte donne la classe de placement, et lève l'opacité —
 * soit par la bascule `visible` (transition CSS), soit en pilotant l'opacité en
 * direct depuis une timeline en scrub, auquel cas `visible` reste omis et c'est
 * le CSS de l'hôte qui pose l'opacité de départ.
 */

type Props = {
  /** La classe de placement du chapitre hôte. */
  className?: string;
  /**
   * Bascule CSS. **Omis** quand une timeline pilote l'opacité en direct : un
   * attribut posé là ferait deux mains sur la même valeur.
   */
  visible?: boolean;
  /** Tenu par l'hôte quand c'est une timeline qui lève et baisse le repère. */
  conteneurRef?: RefObject<HTMLSpanElement | null>;
};

export function Defilement({ className, visible, conteneurRef }: Props) {
  return (
    <span
      ref={conteneurRef}
      className={
        className === undefined ? "defilement" : `defilement ${className}`
      }
      data-visible={visible}
      aria-hidden="true"
    >
      {/* Le segment vit **dans** la piste, qui le borne. */}
      <span className="defilement__piste">
        <span className="defilement__curseur" />
      </span>
      <span className="defilement__socle" />
    </span>
  );
}
