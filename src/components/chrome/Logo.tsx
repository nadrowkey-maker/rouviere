"use client";

import Link from "next/link";
import { useLogo } from "./LogoProvider";
import "./logo.css";

/**
 * Le logotype ROUVIÈRE. Un seul nœud, monté dans le layout, jamais démonté.
 *
 * C'est un lien vers l'accueil, en Gambetta capitales — la voix éditoriale. Le
 * mot est découpé lettre par lettre : chaque lettre est doublée d'un masque à
 * débordement caché, ce qui permet au seuil de les faire monter une à une
 * derrière une arête horizontale (le motif de reveal repris de
 * `onscroll-typography-animations`). En dehors du seuil, les lettres sont à
 * plat et le mot se lit normalement.
 *
 * La couleur ne vient jamais d'un `fill` ou d'un `color` propre : le blend
 * `difference` (posé en CSS) fait du logo le négatif exact de ce qu'il
 * traverse. Livre V prévoit de remplacer ce texte par un SVG aux tracés
 * aplatis ; le contrat du nœud — un lien, des lettres masquables, aucun fill —
 * ne changera pas.
 */

/* Séparé en lettres réelles : le « È » accentué reste une seule lettre. */
const LETTRES = [..."ROUVIÈRE"];

export function Logo() {
  const { ref } = useLogo();

  return (
    <Link ref={ref} className="logo" href="/" aria-label="Rouvière — accueil">
      <span className="logo__mot" aria-hidden="true">
        {LETTRES.map((lettre, index) => (
          <span className="logo__masque" key={index}>
            <span className="logo__lettre">{lettre}</span>
          </span>
        ))}
      </span>
    </Link>
  );
}
