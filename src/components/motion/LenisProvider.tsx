"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePathname } from "next/navigation";
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
  const pathname = usePathname();
  const premiereRoute = useRef(true);

  /* ---- Chaque route commence en haut ----
   *
   * Le navigateur restaure la position de défilement d'une page qu'il croit
   * revoir, et Lenis, lui, tient sa **propre** position : il écrit à chaque
   * frame la valeur qu'il a mémorisée, laquelle survit à une navigation puisque
   * l'instance ne se démonte jamais. Le remède habituel — laisser Next remonter
   * en haut — ne servait donc à rien : Next posait zéro, et la frame suivante
   * Lenis rendait le défilement à sa dernière valeur. On cliquait une image de
   * l'enfilade six écrans plus bas et on arrivait six écrans plus bas dans la
   * page du projet.
   *
   * On remet donc les deux à zéro, dans cet ordre — le natif d'abord, puisque
   * c'est de lui que Lenis se cale —, on force le geste (un verrou peut être
   * posé au moment du changement de route), et on rafraîchit ScrollTrigger : les
   * épinglages de la nouvelle route se mesurent depuis le haut, pas depuis une
   * position qui n'existe plus.
   */
  useEffetVisuel(() => {
    /* `scrollRestoration` manuel : sans lui, un rechargement rendrait la page à
       une position dont les épinglages ne savent rien. */
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";

    if (premiereRoute.current) {
      premiereRoute.current = false;
      return;
    }

    scrollTo(0, 0);
    const instance = instanceCourante.current;
    if (instance !== null) {
      instance.scrollTo(0, { immediate: true, force: true });
      instance.resize();
    }
    ScrollTrigger.refresh();
    /* `pathname` n'est pas lu dans le corps : il sert de déclencheur. C'est son
       changement, et lui seul, qui dit qu'on vient d'arriver sur une route. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

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

    /* Les polices display chargent en `display: block` : elles ne s'appliquent
       qu'une fois le fichier arrivé, donc APRÈS ce premier refresh. Tant
       qu'elles ne sont pas là, les chapitres en texte — le manifeste du
       vestibule au premier chef — occupent la hauteur du repli. Quand Gambetta
       se pose, ces hauteurs changent et poussent les sections plus bas ; mais
       les positions épinglées, elles, restent calées sur les métriques du repli
       et un chapitre en recouvre un autre. On refait donc la mesure une fois les
       vraies polices posées — c'est le correctif canonique du décalage induit
       par le chargement des polices. */
    let annuleFonts = false;
    void document.fonts.ready.then(() => {
      if (annuleFonts) return;
      ScrollTrigger.refresh();
    });

    return () => {
      annuleFonts = true;
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
