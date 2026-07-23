"use client";

import { useRef } from "react";
import { inscrire } from "@/lib/boucle";
import { useMouvement } from "@/components/motion/MotionProvider";
import { useEffetVisuel } from "@/lib/isomorphe";
import { useSon } from "./SonProvider";
import "./curseur.css";

/**
 * Le curseur. Le natif est masqué au profit d'un anneau de 28 px en
 * `mix-blend-mode: difference`, qui suit le pointeur avec un lerp de 0.12 et se
 * magnétise aux éléments interactifs dans un rayon de 80 px. Au survol d'un
 * média il devient une pastille pleine portant un mot — `VOIR`, `ENTRER`,
 * `TIRER` — lu sur l'attribut `data-curseur`.
 *
 * Il n'ouvre pas de boucle : il lit le pointeur en phase de mesure et écrit sa
 * transformation en phase de rendu, sur le ticker partagé. Sur pointeur
 * grossier il n'existe pas du tout.
 */

const RAYON_AIMANT = 80;
/** Part de la distance rattrapée vers le centre de la cible, au plus près. */
const FORCE_AIMANT = 0.55;

/** L'élément interactif sous un nœud, ou `null`. */
function interactif(cible: EventTarget | null): HTMLElement | null {
  if (!(cible instanceof Element)) return null;
  return cible.closest<HTMLElement>(
    "[data-curseur], a[href], button, [role='button']",
  );
}

export function Curseur() {
  const { capacites, mouvementReduit } = useMouvement();
  const { jouer } = useSon();
  const anneauRef = useRef<HTMLDivElement>(null);
  const motRef = useRef<HTMLSpanElement>(null);

  const grossier = capacites.pointeurGrossier;

  useEffetVisuel(() => {
    const anneau = anneauRef.current;
    const mot = motRef.current;
    if (grossier || anneau === null || mot === null) return;

    const html = document.documentElement;
    html.classList.add("curseur-actif");

    const lerp = mouvementReduit ? 1 : 0.12;

    let sourisX = innerWidth / 2;
    let sourisY = innerHeight / 2;
    let cibleX = sourisX;
    let cibleY = sourisY;
    let x = sourisX;
    let y = sourisY;
    let cible: HTMLElement | null = null;

    const surMouvement = (e: PointerEvent) => {
      sourisX = e.clientX;
      sourisY = e.clientY;
      anneau.dataset.visible = "true";
    };
    const surSortieFenetre = () => {
      anneau.dataset.visible = "false";
    };

    const surSurvol = (e: PointerEvent) => {
      const el = interactif(e.target);
      if (el === null || el === cible) return;
      cible = el;
      const parole = el.dataset.curseur;
      if (parole !== undefined && parole !== "") {
        mot.textContent = parole;
        anneau.dataset.forme = "pastille";
        jouer("survol");
      } else {
        mot.textContent = "";
        anneau.dataset.forme = "actif";
      }
    };
    const surFuite = (e: PointerEvent) => {
      /* On ne relâche que si le pointeur quitte vraiment la cible : les
         `pointerout` internes (vers un enfant) gardent la même cible. */
      if (interactif(e.relatedTarget) !== null) return;
      cible = null;
      mot.textContent = "";
      anneau.dataset.forme = "anneau";
    };

    addEventListener("pointermove", surMouvement, { passive: true });
    document.addEventListener("pointerover", surSurvol, { passive: true });
    document.addEventListener("pointerout", surFuite, { passive: true });
    document.addEventListener("pointerleave", surSortieFenetre);

    /* Mesure : on lit le pointeur, et le rect de la seule cible survolée pour
       la magnétiser. Un rect, pas une boucle de rects — pas de thrashing. */
    const desMesure = inscrire("mesure", () => {
      let px = sourisX;
      let py = sourisY;
      if (cible !== null) {
        const r = cible.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        const dx = cx - sourisX;
        const dy = cy - sourisY;
        const d = Math.hypot(dx, dy);
        if (d < RAYON_AIMANT) {
          const t = (1 - d / RAYON_AIMANT) * FORCE_AIMANT;
          px = sourisX + dx * t;
          py = sourisY + dy * t;
        }
      }
      cibleX = px;
      cibleY = py;
    });

    /* Rendu : on écrit. L'anneau rattrape sa cible d'un lerp. */
    const desRendu = inscrire("rendu", () => {
      x += (cibleX - x) * lerp;
      y += (cibleY - y) * lerp;
      anneau.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    });

    return () => {
      html.classList.remove("curseur-actif");
      removeEventListener("pointermove", surMouvement);
      document.removeEventListener("pointerover", surSurvol);
      document.removeEventListener("pointerout", surFuite);
      document.removeEventListener("pointerleave", surSortieFenetre);
      desMesure();
      desRendu();
    };
  }, [grossier, mouvementReduit, jouer]);

  if (grossier) return null;

  return (
    <div className="curseur" ref={anneauRef} data-forme="anneau" aria-hidden="true">
      <span className="curseur__forme">
        <span className="curseur__mot" ref={motRef} />
      </span>
    </div>
  );
}
