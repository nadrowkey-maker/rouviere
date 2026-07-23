"use client";

import { Burger } from "./Burger";
import { Son } from "./Son";
import "./barre-nav.css";

/**
 * La barre de navigation. Elle se construit autour du logo déjà posé en haut à
 * gauche par le layout — elle ne le contient pas, elle lui laisse son coin et
 * range à droite les deux commandes du chrome : le son, puis le burger.
 *
 * Rien n'est centré, rien n'a de fond : le chrome flotte au-dessus du parcours,
 * il ne le coiffe pas d'un bandeau.
 */
export function BarreNav() {
  return (
    <nav className="barre-nav" aria-label="Navigation principale">
      <div className="barre-nav__droite">
        <Son />
        <Burger />
      </div>
    </nav>
  );
}
