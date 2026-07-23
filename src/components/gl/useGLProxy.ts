"use client";

import { useRef, type RefObject } from "react";
import { useRig } from "./Rig";
import type { Fabrique, ContexteRig } from "./moteur";
import { useEffetVisuel } from "@/lib/isomorphe";

/**
 * Le pont DOM ↔ WebGL.
 *
 * Un élément DOM tient la mise en page, une scène WebGL se cale dessus. Le
 * composant ne mesure rien lui-même : il donne son ancre au rig, qui lit tous
 * les rects inscrits d'un coup, une fois par frame, avant de positionner quoi
 * que ce soit.
 *
 * Interdiction absolue de lire un `getBoundingClientRect` dans un composant.
 * Un rect lu ici, un mesh écrit là, et le navigateur recalcule le layout
 * autant de fois qu'il y a d'effets à l'écran.
 *
 * La fabrique est appelée une fois, à l'inscription. Si elle dépend d'une
 * donnée qui change, lire cette donnée par une ref dans `cadre`, ou faire
 * varier `cle` pour reconstruire la scène.
 *
 * Retourne `true` quand la scène est effectivement inscrite dans le rig — un
 * chapitre s'en sert pour rendre sa version DOM/CSS le temps du chargement,
 * ou définitivement en mode dégradé.
 */
export function useGLProxy(
  ancre: RefObject<HTMLElement | null>,
  fabrique: Fabrique,
  /** Change de valeur pour forcer la reconstruction de la scène. */
  cle: string = "",
): boolean {
  const rig = useRig();
  const derniereFabrique = useRef(fabrique);
  derniereFabrique.current = fabrique;

  useEffetVisuel(() => {
    const element = ancre.current;
    if (rig === null || element === null) return;

    return rig.inscrireProxy(element, (contexte: ContexteRig) =>
      derniereFabrique.current(contexte),
    );
    // `cle` n'est pas lue dans l'effet : elle sert justement à le rejouer,
    // donc à libérer la scène et à la refabriquer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rig, ancre, cle]);

  return rig !== null;
}
