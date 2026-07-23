"use client";

import { useRef } from "react";
import { ScrollTrigger } from "@/lib/gsap";
import { useEffetVisuel } from "@/lib/isomorphe";
import "./progression.css";

/**
 * La barre de progression du parcours : 1 px sur le bord gauche, une jauge qui
 * se remplit de haut en bas à mesure qu'on descend.
 *
 * Elle est pilotée par ScrollTrigger — la même autorité de défilement que le
 * reste du site, mise à jour par Lenis — et n'ouvre donc pas sa propre boucle.
 * Sa couleur passe par une variable : quand un projet basculera son monde, il
 * la repeindra sans toucher à ce composant.
 */
export function Progression() {
  const jaugeRef = useRef<HTMLDivElement>(null);

  useEffetVisuel(() => {
    const jauge = jaugeRef.current;
    if (jauge === null) return;

    const declencheur = ScrollTrigger.create({
      trigger: document.documentElement,
      start: "top top",
      end: "bottom bottom",
      onUpdate: (self) => {
        jauge.style.transform = `scaleY(${self.progress})`;
      },
    });

    return () => declencheur.kill();
  }, []);

  return (
    <div className="progression" aria-hidden="true">
      <div className="progression__jauge" ref={jaugeRef} />
    </div>
  );
}
