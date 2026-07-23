"use client";

import dynamic from "next/dynamic";

/**
 * Tout ce qui touche au WebGL entre par un import dynamique sans rendu
 * serveur. Three.js ne pèse ni sur le HTML envoyé, ni sur la première charge
 * des routes qui n'en ont pas besoin.
 */
const Plans = dynamic(() => import("./Plans"), { ssr: false });

export function Epreuve() {
  return <Plans />;
}
