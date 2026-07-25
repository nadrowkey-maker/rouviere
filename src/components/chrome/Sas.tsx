"use client";

import { useRef } from "react";
import { gsap } from "@/lib/gsap";
import { useEffetVisuel } from "@/lib/isomorphe";
import { useMouvement } from "@/components/motion/MotionProvider";
import { reclamer, liberer } from "@/components/motion/orchestrateur";
import {
  poser,
  retirer,
  figer,
  RETIRE,
  DUREE_RETRAITE,
} from "@/components/motion/passage";
import { enregistrerSas } from "./traversee";
import "@/components/motion/transition.css";
import "./sas.css";

/**
 * La surface du sas, et rien d'autre.
 *
 * Elle vit dans le chrome, donc elle ne se démonte jamais, donc elle est
 * disponible à tout instant sans qu'on ait à la monter au moment du geste — ce
 * qui coûterait une frame, exactement celle qu'on cherche à cacher.
 *
 * Elle passe **sous le logotype** (couche 50) et non au-dessus : c'est le point
 * de tout l'écran. Le logo est en `mix-blend-mode: difference` et devient le
 * négatif du noir qu'il traverse — l'écran de chargement n'a donc pas besoin
 * d'un logotype à lui, il emprunte celui qui est déjà là. C'est le geste
 * signature qui sert d'attente.
 *
 * La traversée passe par l'orchestrateur comme toutes les autres : une seule
 * transition vivante à la fois, y compris celle-ci.
 */

/** Temps passé dans le noir, une fois le saut fait. */
const TENUE = 0.22;

export function Sas() {
  const { mouvementReduit } = useMouvement();
  const surfaceRef = useRef<HTMLDivElement>(null);
  const ligneRef = useRef<gsap.core.Timeline | null>(null);

  useEffetVisuel(() => {
    const surface = surfaceRef.current;
    if (surface === null) return;
    figer(surface, RETIRE);

    const desinscrire = enregistrerSas((traversee) => {
      /* En mouvement réduit, le saut a lieu, et c'est tout : un écran qui
         s'éteint et se rallume est du mouvement, même s'il ne se déplace pas. */
      if (mouvementReduit) {
        traversee();
        return;
      }

      ligneRef.current?.kill();

      const finaliser = () => {
        figer(surface, RETIRE);
      };

      const ligne = gsap.timeline({
        onComplete: () => {
          liberer(ligne);
          ligneRef.current = null;
        },
      });
      /* L'extinction est un peu plus vive que la pose d'une couture de route :
         on répond à un clic, pas à un changement de monde. Elle reste très
         au-delà de la zone 0,30–0,55 s que le document proscrit. */
      ligne.add(poser(surface, { duree: DUREE_RETRAITE }), 0);
      /* Le saut, derrière le noir. Il est instantané par contrat. */
      ligne.add(traversee);
      ligne.to({}, { duration: TENUE });
      ligne.add(retirer(surface));

      ligneRef.current = ligne;
      reclamer({ nature: "parcours", anim: ligne, finaliser });
    });

    return () => {
      desinscrire();
      ligneRef.current?.kill();
      ligneRef.current = null;
    };
  }, [mouvementReduit]);

  return <div className="sas passage" ref={surfaceRef} aria-hidden="true" />;
}
