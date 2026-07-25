"use client";

import { BarreNav } from "./BarreNav";
import { Menu } from "./Menu";
import { Progression } from "./Progression";
import { ChapitreCourant } from "./ChapitreCourant";
import { Curseur } from "./Curseur";
import { Sas } from "./Sas";

/**
 * Le chrome, assemblé. Il persiste au-dessus de tout et ne se démonte jamais :
 * monté dans le layout racine, il traverse chaque navigation avec le canvas et
 * le logo.
 *
 * Le logo, lui, est monté à part (c'est un nœud partagé du geste signature) et
 * la barre de nav se range autour de lui.
 */
export function Chrome() {
  return (
    <>
      <BarreNav />
      <Menu />
      <Sas />
      <Progression />
      <ChapitreCourant />
      <Curseur />
    </>
  );
}
