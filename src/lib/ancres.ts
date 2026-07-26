import { decalageDans } from "./mesure";

/**
 * Les ancres du parcours, et où l'on atterrit vraiment quand on les vise.
 *
 * ## Pourquoi ce fichier existe
 *
 * Une ancre du parcours peut être atteinte de **deux façons qui n'ont rien à
 * voir**, et le site n'en traitait qu'une :
 *
 *   — **depuis le parcours lui-même** — le menu ouvert sur `/fr`, entrée
 *     « Contact ». Rien ne change de route : le menu intercepte le clic et
 *     saute par le sas.
 *   — **depuis une autre route** — le menu ouvert sur une page projet ou sur
 *     les archives. Là c'est une vraie navigation, et personne n'interceptait :
 *     Next montait `/fr`, et `LenisProvider` remettait la nouvelle route en
 *     haut, comme il le fait pour toutes. On arrivait sur le hero.
 *
 * Ce module est le repère commun des deux chemins. Sans lui, la table des
 * cibles vivait dans les entrées du menu, c'est-à-dire dans un endroit que la
 * couche de défilement ne peut pas lire — et le second cas ne pouvait pas être
 * corrigé sans la dupliquer.
 *
 * ## Pourquoi une table, et pas simplement l'élément qui porte l'`id`
 *
 * Parce que le bord d'une section n'est pas toujours son commencement. La
 * section de l'atelier ouvre sur une réserve haute qui peut atteindre douze
 * rem : y arriver, c'est se poser au-dessus de tout ce qu'elle contient, avec
 * la fin du chapitre précédent encore en haut de l'écran. On vise donc son
 * en-tête. La sortie, elle, tient un plein cadre : son bord est le bon repère,
 * et sa ligne est vide.
 */
type Ancre = {
  /** L'élément à viser, si le porteur de l'`id` n'est pas le bon repère. */
  cible?: string;
  /** Décalage à l'arrivée, en fraction de hauteur de fenêtre. Négatif = plus haut. */
  decalage?: number;
};

const ANCRES: Record<string, Ancre> = {
  atelier: {
    cible: "#atelier .atelier__entete",
    /** Un dixième d'écran d'air au-dessus du titre : il se pose, il ne se colle pas. */
    decalage: -0.1,
  },
  contact: {},
};

/**
 * La position de défilement d'une ancre, ou `null` si elle n'est pas là.
 *
 * `hash` s'accommode du dièse ou non — on reçoit tantôt `location.hash`,
 * tantôt un fragment de route.
 *
 * La mesure passe par la chaîne des `offsetParent` et **jamais par un rect** :
 * le parcours porte des transformations en permanence — l'épinglage du hero,
 * la translation du couloir, le recul de la page derrière le menu — et un rect
 * les inclurait toutes. Voir `mesure.ts`.
 */
export function positionAncre(hash: string): number | null {
  const nom = hash.replace(/^#/, "");
  if (nom === "") return null;

  const reglage = ANCRES[nom] ?? {};
  const selecteur = reglage.cible ?? `#${CSS.escape(nom)}`;
  const cible = document.querySelector<HTMLElement>(selecteur);
  if (cible === null) return null;

  const y =
    decalageDans(cible, document.body).y +
    (reglage.decalage ?? 0) * window.innerHeight;
  return Math.max(0, y);
}
