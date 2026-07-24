"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { gsap } from "@/lib/gsap";
import { useEffetVisuel } from "@/lib/isomorphe";
import { useMouvement } from "./MotionProvider";
import { projetParSlug } from "@/data/projets";
import "./transition.css";

/**
 * Les coutures entre routes.
 *
 * Le canvas et le chrome vivent dans le layout et ne se démontent jamais ; seul
 * le contenu de la route change, sous ce composant monté dans `app/template.tsx`
 * — un template se réinstancie à chaque navigation, ce qui donne le point
 * d'accroche du masque.
 *
 * Le principe, tenu de `references/github/scroll-transition` : une surface pleine
 * couvre la nouvelle route dès sa première peinture, puis se retire par un masque
 * SVG à lamelles ou en damier — la route est bien montée **sous** le masque avant
 * qu'il ne s'ouvre. Le fond du site étant déjà `--encre`, aucune navigation ne
 * peut virer au blanc : le masque est une couture, pas un cache-misère.
 *
 * Le motif dépend de la nature du passage — un motif différent selon l'endroit
 * où l'on va :
 *   — vers un projet : le **damier** (`script2.js`), on entre dans une pièce, et
 *     la surface prend le monde chromatique du projet ;
 *   — vers les archives : les **stores verticaux** (`script3.js`), sur le plomb ;
 *   — ailleurs (retour au parcours) : les **stores horizontaux** (`script.js`),
 *     sur l'encre.
 *
 * Le logo, en `mix-blend-mode: difference` au-dessus de cette surface, en reste
 * le négatif exact — la couture traverse le geste signature sans le rompre.
 *
 * En mouvement réduit, pas de couture : l'échange est instantané, et l'encre du
 * fond empêche déjà tout flash. C'est une version, pas une punition.
 */

/* Vrai une fois l'application montée : la toute première peinture (le seuil) ne
   reçoit pas de couture. Le drapeau vit hors du composant car le template se
   remonte à chaque navigation. */
let dejaCharge = false;

type Motif = "horizontal" | "vertical" | "damier";

const SVG_NS = "http://www.w3.org/2000/svg";

function passageVers(pathname: string): { motif: Motif; surface: string } {
  if (pathname.startsWith("/projets/")) {
    const slug = pathname.split("/")[2] ?? "";
    const projet = projetParSlug(slug);
    return {
      motif: "damier",
      surface: projet ? `var(--color-${projet.monde})` : "var(--color-encre)",
    };
  }
  if (pathname.startsWith("/archives")) {
    return { motif: "vertical", surface: "var(--color-plomb)" };
  }
  return { motif: "horizontal", surface: "var(--color-encre)" };
}

export function Transition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { mouvementReduit } = useMouvement();

  /* Calculé au premier rendu de ce montage : premier chargement de
     l'application, ou navigation ? Sur navigation, la surface couvre dès la
     première peinture — pas d'état posé après coup, donc pas de frame où la
     nouvelle route se voit avant d'être couverte. */
  const premierRef = useRef(!dejaCharge);
  const [couvert, setCouvert] = useState(
    premierRef.current ? false : !mouvementReduit,
  );

  const groupeRef = useRef<SVGGElement>(null);

  useEffetVisuel(() => {
    dejaCharge = true;
    if (premierRef.current) return; // premier chargement : pas de couture
    if (mouvementReduit) {
      setCouvert(false);
      return;
    }

    const groupe = groupeRef.current;
    if (groupe === null) {
      setCouvert(false);
      return;
    }

    const { motif } = passageVers(pathname);
    const animation = ouvrir(groupe, motif, () => setCouvert(false));
    return () => {
      animation.kill();
    };
    // Une seule fois par montage, c'est-à-dire par navigation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { surface } = passageVers(pathname);

  return (
    <>
      {children}
      {couvert
        ? createPortal(
            <div className="transition" aria-hidden="true">
              <svg
                className="transition__svg"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
              >
                <defs>
                  <mask id="transition-masque">
                    <g ref={groupeRef} />
                  </mask>
                </defs>
                <rect
                  x="0"
                  y="0"
                  width="100"
                  height="100"
                  mask="url(#transition-masque)"
                  /* La couleur de surface est un jeton, posée en style inline
                     pour que `var()` se résolve (un attribut SVG `fill` ne le
                     ferait pas). */
                  style={{ fill: surface }}
                />
              </svg>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

/**
 * Construit le masque fermé (couvrant) puis l'anime vers l'ouvert (révélant).
 * Blanc dans le masque = surface visible ; on part donc tout blanc et on rétracte
 * jusqu'au noir. Le décalage n'est jamais uniforme : la distribution porte sa
 * propre courbe, ou l'ordre est mélangé.
 */
function ouvrir(
  groupe: SVGGElement,
  motif: Motif,
  fini: () => void,
): gsap.core.Tween | gsap.core.Timeline {
  groupe.replaceChildren();

  if (motif === "damier") {
    const largeur = innerWidth;
    const colonnes = largeur <= 599 ? 6 : largeur <= 1024 ? 10 : 16;
    const lignes = Math.max(3, Math.round(colonnes * 0.6));
    const lc = 100 / colonnes;
    const ll = 100 / lignes;
    const cellules: SVGRectElement[] = [];
    for (let y = 0; y < lignes; y += 1) {
      for (let x = 0; x < colonnes; x += 1) {
        const cell = document.createElementNS(SVG_NS, "rect");
        cell.setAttribute("x", String(x * lc));
        cell.setAttribute("y", String(y * ll));
        cell.setAttribute("width", String(lc + 0.05));
        cell.setAttribute("height", String(ll + 0.05));
        cell.setAttribute("fill", "#fff");
        cell.setAttribute("shape-rendering", "crispEdges");
        groupe.appendChild(cell);
        cellules.push(cell);
      }
    }
    /* Damier : les cellules s'éteignent dans un ordre mélangé, jamais en
       balayage régulier. */
    return gsap.to(gsap.utils.shuffle([...cellules]), {
      attr: { opacity: 0 },
      duration: 0.5,
      ease: "power2.in",
      stagger: { each: 0.012 },
      onComplete: fini,
    });
  }

  const horizontal = motif === "horizontal";
  const N = horizontal ? 22 : 14;
  const bande = 100 / N;
  const demi = bande / 2;

  type Lamelle = { a: SVGRectElement; b: SVGRectElement; centre: number };
  const lamelles: Lamelle[] = [];
  const rects: SVGRectElement[] = [];

  for (let i = 0; i < N; i += 1) {
    const centre = (i + 0.5) * bande;
    const a = document.createElementNS(SVG_NS, "rect");
    const b = document.createElementNS(SVG_NS, "rect");
    for (const r of [a, b]) {
      r.setAttribute("fill", "#fff");
      r.setAttribute("shape-rendering", "crispEdges");
      if (horizontal) {
        /* Fermé : deux demi-bandes couvrent la bande de haut en bas. */
        r.setAttribute("x", "0");
        r.setAttribute("width", "100");
        r.setAttribute("height", String(demi + 0.02));
      } else {
        r.setAttribute("y", "0");
        r.setAttribute("height", "100");
        r.setAttribute("width", String(demi + 0.02));
      }
      groupe.appendChild(r);
    }
    if (horizontal) {
      a.setAttribute("y", String(centre - demi));
      b.setAttribute("y", String(centre));
    } else {
      a.setAttribute("x", String(centre - demi));
      b.setAttribute("x", String(centre));
    }
    lamelles.push({ a, b, centre });
    rects.push(a, b);
  }

  /* Ouvert : chaque demi-lamelle se rétracte vers sa ligne médiane. Le
     décalage suit la position, du début vers la fin, avec une courbe sur la
     distribution — pas un pas constant. */
  return gsap.to(rects, {
    attr: horizontal
      ? {
          height: 0.001,
          y: (i: number) => lamelles[Math.floor(i / 2)]!.centre,
        }
      : {
          width: 0.001,
          x: (i: number) => lamelles[Math.floor(i / 2)]!.centre,
        },
    duration: 0.62,
    ease: "power3.inOut",
    stagger: { each: 0.02, from: "start", ease: "power2.in" },
    onComplete: fini,
  });
}
