/**
 * L'orchestrateur des coutures.
 *
 * Il existe dans le site plusieurs surfaces qui s'animent au-dessus du parcours :
 * celle du menu qui s'ouvre, celle des coutures de route. Rien n'interdisait
 * jusqu'ici que deux d'entre elles vivent en même temps — cliquer un projet
 * depuis le menu ouvert lançait la fermeture du menu *pendant* que la couture de
 * route se retirait. Deux surfaces superposées : une bouillie.
 *
 * Ce module est le créneau unique par lequel passe **tout** changement de
 * chapitre ou de route. Une seule transition est vivante à un instant donné :
 * réclamer le créneau tue la précédente si elle court encore et la finalise
 * (l'état de sa cible est remis au propre, jamais laissé à mi-course), puis
 * installe la nouvelle. Aucune simultanéité n'est possible par construction —
 * ce n'est pas une convention qu'on se rappelle de respecter, c'est la seule
 * porte d'entrée.
 *
 * Depuis la réduction du vocabulaire, toutes ces surfaces jouent **le même
 * passage** — le fondu de matière de `passage.ts`. La nature ne décide donc plus
 * d'un motif : elle nomme l'endroit d'où vient la demande, ce qui reste utile au
 * diagnostic et aux gardes-fous.
 */

import type { gsap } from "@/lib/gsap";

export type NatureTransition =
  /** L'ouverture ou la fermeture du menu. */
  | "menu"
  /** L'entrée dans un projet. */
  | "projet"
  /** Le passage de chapitre à l'intérieur du parcours. */
  | "chapitre"
  /** Le retour au parcours depuis une autre route. */
  | "parcours"
  /** L'entrée dans les archives. */
  | "archives";

type Anim = gsap.core.Timeline | gsap.core.Tween;

type Vivante = {
  nature: NatureTransition;
  anim: Anim;
  /**
   * Remet la cible dans un état terminal propre si l'anim est tuée avant sa fin.
   * Une transition préemptée ne doit jamais laisser un masque figé à mi-course.
   */
  finaliser: () => void;
};

let vivante: Vivante | null = null;

/**
 * Réclame le créneau unique. Si une transition court encore, elle est tuée et
 * finalisée avant que la nouvelle ne s'installe. C'est ici — et nulle part
 * ailleurs — que se garantit qu'un seul masque s'anime à la fois.
 *
 * L'appelant câble lui-même la fin naturelle de son anim sur `liberer`, pour que
 * le créneau se rouvre quand la couture s'achève sans avoir été préemptée.
 */
export function reclamer(entree: Vivante): void {
  if (vivante !== null && vivante.anim !== entree.anim) {
    vivante.anim.kill();
    vivante.finaliser();
  }
  vivante = entree;
}

/**
 * Libère le créneau à la fin naturelle d'une transition. Sans effet si une autre
 * transition a déjà pris la place entre-temps — c'est elle qui est vivante.
 */
export function liberer(anim: Anim): void {
  if (vivante !== null && vivante.anim === anim) vivante = null;
}
