"use client";

import { Burger } from "./Burger";
import { Langue } from "./Langue";
import { Son } from "./Son";
import { useLangue } from "@/i18n/LangueProvider";
import "./barre-nav.css";

/**
 * La barre de navigation. Elle se construit autour du logo déjà posé en haut à
 * gauche par le layout — elle ne le contient pas, elle lui laisse son coin et
 * range à droite les commandes du chrome : la langue, le son, puis le burger.
 *
 * **L'ordre n'est pas indifférent.** La langue vient en premier parce qu'elle se
 * décide en arrivant et ne se rouvre presque plus ; le burger vient en dernier
 * parce qu'il est le geste le plus fréquent, donc celui qu'on veut le plus près
 * du coin. Entre les deux, le son, qu'on règle une fois.
 *
 * Rien n'est centré, rien n'a de fond : le chrome flotte au-dessus du parcours,
 * il ne le coiffe pas d'un bandeau.
 */
export function BarreNav() {
  const { t } = useLangue();

  return (
    <nav className="barre-nav" aria-label={t("navPrincipale")}>
      <div className="barre-nav__droite">
        <Langue />
        <Son />
        <Burger />
      </div>
    </nav>
  );
}
