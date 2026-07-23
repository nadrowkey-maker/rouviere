"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import {
  CAPACITES_SUPPOSEES,
  detecterCapacites,
  estDegrade,
  type Capacites,
} from "@/lib/capacites";
import { useEffetVisuel } from "@/lib/isomorphe";

type Mouvement = {
  /** `prefers-reduced-motion: reduce`, suivi en direct. */
  mouvementReduit: boolean;
  capacites: Capacites;
  /** Vrai dès qu'une des trois conditions du budget tombe. */
  degrade: boolean;
  /** Faux jusqu'au premier geste de l'utilisateur — le son en dépend. */
  premiereInteraction: boolean;
  /** Le rig remonte ici le coût de sa première frame, en millisecondes. */
  signalerPremierRendu: (millisecondes: number) => void;
};

const ContexteMouvement = createContext<Mouvement | null>(null);

export function MotionProvider({ children }: { children: React.ReactNode }) {
  const [mouvementReduit, setMouvementReduit] = useState(false);
  const [capacites, setCapacites] = useState<Capacites>(CAPACITES_SUPPOSEES);
  const [premierRenduMs, setPremierRenduMs] = useState<number | null>(null);
  const [premiereInteraction, setPremiereInteraction] = useState(false);

  /* Le rendu serveur suppose la machine capable et le mouvement complet ;
     on corrige ici, avant la peinture, pour qu'aucun cadre ne s'anime chez
     quelqu'un qui a demandé le contraire. */
  useEffetVisuel(() => {
    setCapacites(detecterCapacites());

    const requete = matchMedia("(prefers-reduced-motion: reduce)");
    const suivre = () => setMouvementReduit(requete.matches);
    suivre();
    requete.addEventListener("change", suivre);

    const pointeur = matchMedia("(pointer: coarse)");
    const suivrePointeur = () =>
      setCapacites((precedentes) => ({
        ...precedentes,
        pointeurGrossier: pointeur.matches,
      }));
    pointeur.addEventListener("change", suivrePointeur);

    return () => {
      requete.removeEventListener("change", suivre);
      pointeur.removeEventListener("change", suivrePointeur);
    };
  }, []);

  /* Première interaction : le son ne démarre jamais sans geste explicite, et
     les chargements lourds attendent ce signal. */
  useEffetVisuel(() => {
    const gestes = ["pointerdown", "keydown", "wheel", "touchstart"] as const;
    const marquer = () => setPremiereInteraction(true);

    for (const geste of gestes) {
      addEventListener(geste, marquer, { once: true, passive: true });
    }
    return () => {
      for (const geste of gestes) removeEventListener(geste, marquer);
    };
  }, []);

  const signalerPremierRendu = useCallback((millisecondes: number) => {
    setPremierRenduMs((precedent) => precedent ?? millisecondes);
  }, []);

  const valeur = useMemo<Mouvement>(
    () => ({
      mouvementReduit,
      capacites,
      degrade: estDegrade(capacites, premierRenduMs),
      premiereInteraction,
      signalerPremierRendu,
    }),
    [
      mouvementReduit,
      capacites,
      premierRenduMs,
      premiereInteraction,
      signalerPremierRendu,
    ],
  );

  return (
    <ContexteMouvement.Provider value={valeur}>
      {children}
    </ContexteMouvement.Provider>
  );
}

export function useMouvement(): Mouvement {
  const contexte = useContext(ContexteMouvement);
  if (contexte === null) {
    throw new Error("useMouvement doit être appelé sous un MotionProvider.");
  }
  return contexte;
}
