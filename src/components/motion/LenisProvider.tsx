"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import Lenis from "lenis";
import "lenis/dist/lenis.css";
import { ScrollTrigger } from "@/lib/gsap";
import { inscrire } from "@/lib/boucle";
import { useEffetVisuel } from "@/lib/isomorphe";
import { useMouvement } from "./MotionProvider";

type Defilement = {
  lenis: Lenis | null;
  /**
   * Verrouille le défilement. Le verrou est nominatif : le menu, le seuil et
   * une transition peuvent le poser en même temps sans se déverrouiller
   * mutuellement. Le défilement ne repart qu'au dernier retrait.
   */
  arreter: (raison: string) => void;
  reprendre: (raison: string) => void;
};

const ContexteDefilement = createContext<Defilement | null>(null);

export function LenisProvider({ children }: { children: React.ReactNode }) {
  const { mouvementReduit } = useMouvement();
  const [lenis, setLenis] = useState<Lenis | null>(null);
  const verrous = useRef<Set<string>>(new Set());
  /* L'instance vit aussi dans une ref : les deux rappels ci-dessous restent
     stables quand elle est recréée. */
  const instanceCourante = useRef<Lenis | null>(null);

  useEffetVisuel(() => {
    /* En mouvement réduit, Lenis reste en place — il porte les verrous et
       l'événement de défilement — mais il ne lisse plus rien : la molette et
       le tactile repassent au natif. */
    const instance = new Lenis({
      autoRaf: false,
      smoothWheel: !mouvementReduit,
      syncTouch: false,
      lerp: 0.1,
      overscroll: false,
      anchors: true,
    });

    /* ScrollTrigger se met à jour sur la position de Lenis, pas sur celle du
       navigateur : les deux divergent d'une frame pendant le lissage. */
    const desabonnerScroll = instance.on("scroll", () => ScrollTrigger.update());

    /* Le seul point d'entrée de la boucle pour le défilement. Lenis attend des
       millisecondes, le ticker GSAP compte en secondes. */
    const desinscrire = inscrire("defilement", (temps) => {
      instance.raf(temps * 1000);
    });

    /* Les verrous survivent à une recréation d'instance (bascule de mouvement
       réduit pendant qu'un menu est ouvert). */
    if (verrous.current.size > 0) instance.stop();

    instanceCourante.current = instance;
    setLenis(instance);
    ScrollTrigger.refresh();

    return () => {
      desinscrire();
      desabonnerScroll();
      instance.destroy();
      instanceCourante.current = null;
      setLenis(null);
    };
  }, [mouvementReduit]);

  const arreter = useCallback((raison: string) => {
    verrous.current.add(raison);
    instanceCourante.current?.stop();
  }, []);

  const reprendre = useCallback((raison: string) => {
    verrous.current.delete(raison);
    if (verrous.current.size === 0) instanceCourante.current?.start();
  }, []);

  const valeur = useMemo<Defilement>(
    () => ({ lenis, arreter, reprendre }),
    [lenis, arreter, reprendre],
  );

  return (
    <ContexteDefilement.Provider value={valeur}>
      {children}
    </ContexteDefilement.Provider>
  );
}

export function useDefilement(): Defilement {
  const contexte = useContext(ContexteDefilement);
  if (contexte === null) {
    throw new Error("useDefilement doit être appelé sous un LenisProvider.");
  }
  return contexte;
}
