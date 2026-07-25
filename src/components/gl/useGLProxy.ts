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
 *
 * ## Le filet d'ordonnancement, et ce qu'il a coûté
 *
 * React attache la ref d'un élément hôte **après** avoir exécuté les effets de
 * ses descendants : la traversée de la phase de disposition remonte depuis les
 * feuilles. Une scène montée *sous* son ancre trouve donc `ancre.current` à
 * `null` au moment de s'inscrire, ne s'inscrit pas, et — les dépendances de
 * l'effet n'ayant pas bougé — ne réessaie jamais.
 *
 * Le défaut ne se voyait qu'au second passage, ce qui est le pire des cas. Au
 * premier chargement, la scène arrive par un import dynamique : elle se monte
 * dans un commit ultérieur, l'ancre est déjà là, tout fonctionne. Au retour
 * d'une page projet, le module est en cache, le composant se monte dans le
 * **même** commit que son ancre — et la scène ne se rallume plus. C'est
 * exactement le symptôme qu'on nous a signalé sur l'eau du vestibule : parfaite
 * à la première visite, absente après un aller-retour.
 *
 * L'ordre correct reste d'écrire la scène en **frère** de son ancre, et c'est
 * ce que font tous les chapitres. Mais un piège qui ne se déclenche qu'au
 * second montage n'est pas un piège dont on se souvient : la microtâche
 * ci-dessous court après la phase de commit, toutes les refs posées, et
 * toujours avant la peinture. Elle ne coûte rien quand l'ordre est bon — elle
 * n'est même pas programmée.
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
    if (rig === null) return;

    let desinscrire: (() => void) | null = null;
    let abandonne = false;

    const brancher = () => {
      if (abandonne || desinscrire !== null) return;
      const element = ancre.current;
      if (element === null) return;
      desinscrire = rig.inscrireProxy(element, (contexte: ContexteRig) =>
        derniereFabrique.current(contexte),
      );
    };

    brancher();
    /* L'ancre n'est pas encore attachée : on repasse une fois, après le commit.
       Voir l'en-tête — c'est un filet, pas le chemin nominal. */
    if (desinscrire === null) queueMicrotask(brancher);

    return () => {
      abandonne = true;
      desinscrire?.();
      desinscrire = null;
    };
    // `cle` n'est pas lue dans l'effet : elle sert justement à le rejouer,
    // donc à libérer la scène et à la refabriquer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rig, ancre, cle]);

  return rig !== null;
}
