"use client";

import { useChrome } from "./ChromeProvider";
import "./burger.css";

/**
 * Le burger. Pas trois traits qui deviennent une croix : une **portée** de trois
 * traits d'un pixel, régulière au repos, qui s'ouvre en **éventail** — chaque
 * dalle pivote autour d'un bord différent, s'écarte du centre et perd un peu de
 * longueur, à 40 ms d'intervalle. Aucune ne croise sa voisine, la figure reste
 * lisible à tout instant, et les deux états ne se ressemblent pas.
 *
 * Le dessin, les amplitudes et les raisons sont dans `burger.css`. Le mouvement
 * est une micro-interaction : il vit en CSS — transitions et délais indexés — et
 * ne prend pas une frame du ticker.
 *
 * Il n'émet pas de son lui-même : c'est le menu qui joue l'ouverture et la
 * fermeture, seul endroit qui couvre aussi `Échap` et le clic sur une entrée.
 */
export function Burger() {
  const { menuOuvert, basculerMenu, burgerRef } = useChrome();

  return (
    <button
      ref={burgerRef}
      type="button"
      className="burger"
      aria-expanded={menuOuvert}
      aria-controls="menu-principal"
      aria-label={menuOuvert ? "Fermer le menu" : "Ouvrir le menu"}
      data-ouvert={menuOuvert}
      onClick={basculerMenu}
    >
      <span className="burger__dalles" aria-hidden="true">
        <span className="burger__dalle" />
        <span className="burger__dalle" />
        <span className="burger__dalle" />
      </span>
    </button>
  );
}
