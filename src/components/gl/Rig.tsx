"use client";

import { createContext, useContext, useRef, useState } from "react";
import type { Rig as Moteur } from "./moteur";
import { useMouvement } from "@/components/motion/MotionProvider";
import { estDegrade } from "@/lib/capacites";
import { useEffetVisuel } from "@/lib/isomorphe";
import "./rig.css";

/**
 * Le canvas du site. Un seul, monté dans le layout racine, jamais démonté,
 * jamais recréé à la navigation.
 *
 * Le moteur — et avec lui tout Three.js — est chargé en import dynamique après
 * le montage : la première charge du site ne porte pas le poids du WebGL, et
 * une machine qui ne peut pas le faire tourner ne le télécharge pas du tout.
 * Le contexte, lui, est disponible immédiatement : il vaut `null` tant que le
 * moteur n'est pas là, et les proxies s'inscrivent d'eux-mêmes à son arrivée.
 */

const ContexteRig = createContext<Moteur | null>(null);

export function RigProvider({ children }: { children: React.ReactNode }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [rig, setRig] = useState<Moteur | null>(null);
  const { mouvementReduit, capacites, signalerPremierRendu } = useMouvement();

  /* Décision prise sur le matériel seul : le coût du premier rendu, qui entre
     aussi dans le mode dégradé, ne peut évidemment pas être connu avant
     d'avoir rendu une frame. */
  const materielInsuffisant = estDegrade(capacites, null);

  useEffetVisuel(() => {
    const noeud = canvas.current;
    if (noeud === null || materielInsuffisant) return;

    let annule = false;
    let moteur: Moteur | null = null;

    void import("./moteur").then(({ Rig }) => {
      if (annule || canvas.current === null) return;
      moteur = new Rig();
      moteur.attacher(canvas.current, {
        mouvementReduit,
        pointeurGrossier: capacites.pointeurGrossier,
        auPremierRendu: signalerPremierRendu,
      });
      setRig(moteur);
    });

    return () => {
      annule = true;
      moteur?.detacher();
      setRig(null);
    };
    // Le mouvement réduit et la finesse du pointeur sont poussés par l'effet
    // suivant : ils ne justifient pas de reconstruire le contexte WebGL.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [materielInsuffisant, signalerPremierRendu]);

  useEffetVisuel(() => {
    rig?.mettreAJourOptions({
      mouvementReduit,
      pointeurGrossier: capacites.pointeurGrossier,
    });
  }, [rig, mouvementReduit, capacites.pointeurGrossier]);

  return (
    <ContexteRig.Provider value={rig}>
      {materielInsuffisant ? null : (
        <canvas ref={canvas} className="rig-canvas" aria-hidden="true" />
      )}
      {children}
    </ContexteRig.Provider>
  );
}

/** Le moteur, ou `null` tant qu'il charge — ou pour toujours, en dégradé. */
export function useRig(): Moteur | null {
  return useContext(ContexteRig);
}
