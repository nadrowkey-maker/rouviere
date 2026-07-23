"use client";

import { useCallback, useRef } from "react";
import Link from "next/link";
import { gsap } from "@/lib/gsap";
import { useEffetVisuel } from "@/lib/isomorphe";
import { useDefilement } from "@/components/motion/LenisProvider";
import { useMouvement } from "@/components/motion/MotionProvider";
import { useChrome } from "./ChromeProvider";
import { useSon } from "./SonProvider";
import { entreesParcours, entreesProjets, type Entree } from "./entrees";
import "./menu.css";

/**
 * Le menu. Il ne glisse pas depuis la droite : il ouvre une pièce.
 *
 * Au clic sur le burger, la page recule dans la profondeur — elle rétrécit, se
 * désature et se floute (en CSS : la surface qui recule est le document, pas
 * une scène WebGL) — pendant qu'une surface d'encre descend par un masque SVG à
 * lamelles, chaque lamelle s'ouvrant depuis sa propre ligne médiane, décalée à
 * contretemps. Les entrées arrivent ensuite en enfilade, en Gambetta énorme.
 *
 * Au survol d'une entrée de projet, son monde chromatique envahit le fond,
 * révélé par un masque en damier. Le mécanisme des masques est repris tel quel
 * de `scroll-transition` (lamelles : script.js ; damier : script2.js) ; la
 * grammaire de reveal des entrées, de `onscroll-typography-animations`.
 *
 * Accessibilité : `lenis.stop()` à l'ouverture (jamais `overflow: hidden`),
 * piège de focus, `Échap` ferme, le focus revient au burger.
 */

const N_LAMELLES = 22;
const BANDE = 100 / N_LAMELLES;
const DEMI = BANDE / 2;
const SVG_NS = "http://www.w3.org/2000/svg";

const SELECTEUR_FOCUS = 'a[href], button:not([disabled])';

type Lamelle = { centre: number; haut: SVGRectElement; bas: SVGRectElement };

export function Menu() {
  const { menuOuvert, fermerMenu, burgerRef, focusARestaurer } = useChrome();
  const { arreter, reprendre } = useDefilement();
  const { mouvementReduit } = useMouvement();
  const { jouer } = useSon();

  const menuRef = useRef<HTMLDivElement>(null);
  const groupeLamellesRef = useRef<SVGGElement>(null);
  const groupeCellulesRef = useRef<SVGGElement>(null);

  const lamellesRef = useRef<Lamelle[]>([]);
  const rectsLamellesRef = useRef<SVGRectElement[]>([]);
  const cellulesRef = useRef<SVGRectElement[]>([]);
  const damierRef = useRef<gsap.core.Timeline | null>(null);
  const masterRef = useRef<gsap.core.Timeline | null>(null);
  const monteRef = useRef(false);

  /* ---- Construction des masques, une fois ---- */
  useEffetVisuel(() => {
    const groupeLamelles = groupeLamellesRef.current;
    const groupeCellules = groupeCellulesRef.current;
    if (groupeLamelles === null || groupeCellules === null) return;

    /* Lamelles : chaque bande est une paire de rects partant de sa ligne
       médiane, l'un vers le haut, l'autre vers le bas. Fermées, hauteur nulle.
       Coordonnées en pourcentage du viewBox 100×100, donc insensibles au
       redimensionnement (l'aspect est étiré par `preserveAspectRatio="none"`). */
    const lamelles: Lamelle[] = [];
    const rects: SVGRectElement[] = [];
    for (let i = 0; i < N_LAMELLES; i += 1) {
      const centre = (i + 0.5) * BANDE;
      const haut = document.createElementNS(SVG_NS, "rect");
      const bas = document.createElementNS(SVG_NS, "rect");
      for (const r of [haut, bas]) {
        r.setAttribute("x", "0");
        r.setAttribute("width", "100");
        r.setAttribute("y", String(centre));
        r.setAttribute("height", "0");
        r.setAttribute("fill", "#fff");
        r.setAttribute("shape-rendering", "crispEdges");
        groupeLamelles.appendChild(r);
      }
      lamelles.push({ centre, haut, bas });
      rects.push(haut, bas);
    }
    lamellesRef.current = lamelles;
    rectsLamellesRef.current = rects;

    /* Damier : une grille de cellules, densité selon la largeur, révélées dans
       un ordre mélangé. Leur teinte suit `--monde-menu`. */
    const largeur = window.innerWidth;
    const colonnes = largeur <= 599 ? 6 : largeur <= 1024 ? 10 : 14;
    const lignes = Math.max(3, Math.round(colonnes * 0.6));
    const largeurCell = 100 / colonnes;
    const hauteurCell = 100 / lignes;
    const cellules: SVGRectElement[] = [];
    for (let y = 0; y < lignes; y += 1) {
      for (let x = 0; x < colonnes; x += 1) {
        const cell = document.createElementNS(SVG_NS, "rect");
        cell.setAttribute("x", String(x * largeurCell));
        cell.setAttribute("y", String(y * hauteurCell));
        cell.setAttribute("width", String(largeurCell + 0.05));
        cell.setAttribute("height", String(hauteurCell + 0.05));
        cell.setAttribute("fill", "#fff");
        cell.setAttribute("shape-rendering", "crispEdges");
        cell.setAttribute("opacity", "0");
        groupeCellules.appendChild(cell);
        cellules.push(cell);
      }
    }
    cellulesRef.current = cellules;
    damierRef.current = gsap
      .timeline({ paused: true })
      .to(gsap.utils.shuffle([...cellules]), {
        opacity: 1,
        duration: 0.5,
        ease: "power2.out",
        stagger: { each: 0.012 },
      });

    /* État fermé, avant toute ouverture. Les entrées passent sous contrôle de
       GSAP dès maintenant : leur `translateY(110%)` CSS serait sinon lu comme
       une base en pixels à laquelle `yPercent` s'ajouterait — le piège que le
       seuil a déjà rencontré. On épingle donc `y: 0` partout où on les touche. */
    gsap.set(rects, { attr: { y: (i: number) => lamelles[Math.floor(i / 2)]!.centre, height: 0 } });
    const liens = menuRef.current?.querySelectorAll<HTMLElement>(".menu__lien");
    if (liens !== undefined) gsap.set(liens, { yPercent: 110, y: 0 });

    return () => {
      damierRef.current?.kill();
      masterRef.current?.kill();
      groupeLamelles.replaceChildren();
      groupeCellules.replaceChildren();
    };
  }, []);

  /* ---- Le monde chromatique révélé au survol ---- */
  const revelerMonde = useCallback(
    (entree: Entree, anime: boolean) => {
      const menu = menuRef.current;
      const damier = damierRef.current;
      const cellules = cellulesRef.current;
      if (menu === null || damier === null) return;

      if (entree.monde !== null) {
        menu.style.setProperty("--monde-menu", `var(--color-${entree.monde})`);
        if (!anime) gsap.set(cellules, { opacity: 1 });
        else damier.timeScale(1).play();
      } else {
        if (!anime) gsap.set(cellules, { opacity: 0 });
        else damier.timeScale(1.5).reverse();
      }
    },
    [],
  );

  /* ---- Ouverture et fermeture ---- */
  const ouvrir = useCallback(
    (anime: boolean) => {
      const scene = document.getElementById("scene-page");
      const menu = menuRef.current;
      if (menu === null) return;
      const rects = rectsLamellesRef.current;
      const lamelles = lamellesRef.current;
      const liens = menu.querySelectorAll<HTMLElement>(".menu__lien");

      masterRef.current?.kill();

      const attrOuvert = {
        y: (i: number) =>
          i % 2 === 0 ? lamelles[Math.floor(i / 2)]!.centre - DEMI : lamelles[Math.floor(i / 2)]!.centre,
        height: DEMI + 0.02,
      };

      if (!anime) {
        gsap.set(rects, { attr: attrOuvert });
        gsap.set(liens, { yPercent: 0, y: 0 });
        if (scene) gsap.set(scene, { "--recul": 1 });
        return;
      }

      const tl = gsap.timeline();
      tl.to(
        rects,
        {
          attr: attrOuvert,
          duration: 0.7,
          ease: "power3.out",
          stagger: { each: 0.028, from: "start", ease: "power1.in" },
        },
        0,
      );
      if (scene) {
        tl.to(scene, { "--recul": 1, duration: 0.9, ease: "power2.out" }, 0);
      }
      tl.to(
        liens,
        {
          yPercent: 0,
          y: 0,
          duration: 0.72,
          ease: "expo.out",
          stagger: { each: 0.09, from: "start", ease: "power2.in" },
        },
        0.3,
      );
      masterRef.current = tl;
    },
    [],
  );

  const fermer = useCallback(
    (anime: boolean, apres: () => void) => {
      const scene = document.getElementById("scene-page");
      const menu = menuRef.current;
      if (menu === null) {
        apres();
        return;
      }
      const rects = rectsLamellesRef.current;
      const lamelles = lamellesRef.current;
      const liens = menu.querySelectorAll<HTMLElement>(".menu__lien");

      masterRef.current?.kill();
      gsap.set(cellulesRef.current, { opacity: 0 });

      const attrFerme = {
        y: (i: number) => lamelles[Math.floor(i / 2)]!.centre,
        height: 0,
      };

      if (!anime) {
        gsap.set(liens, { yPercent: 110, y: 0 });
        gsap.set(rects, { attr: attrFerme });
        if (scene) gsap.set(scene, { "--recul": 0 });
        apres();
        return;
      }

      /* La fermeture est toujours plus rapide que l'ouverture. */
      const tl = gsap.timeline({ onComplete: apres });
      tl.to(
        liens,
        {
          yPercent: 110,
          y: 0,
          duration: 0.38,
          ease: "power2.in",
          stagger: { each: 0.04, from: "end" },
        },
        0,
      );
      tl.to(
        rects,
        {
          attr: attrFerme,
          duration: 0.5,
          ease: "power2.in",
          stagger: { each: 0.02, from: "end" },
        },
        0.1,
      );
      if (scene) {
        tl.to(scene, { "--recul": 0, duration: 0.6, ease: "power2.inOut" }, 0);
      }
      masterRef.current = tl;
    },
    [],
  );

  /* ---- Réaction à l'état d'ouverture ---- */
  useEffetVisuel(() => {
    const menu = menuRef.current;
    if (menu === null) return;

    /* Au tout premier rendu, le menu est déjà fermé (état posé à la
       construction) : rien à animer, rien à verrouiller. */
    if (!monteRef.current) {
      monteRef.current = true;
      if (!menuOuvert) return;
    }

    const anime = !mouvementReduit;
    const html = document.documentElement;

    if (menuOuvert) {
      arreter("menu");
      html.classList.add("menu-ouvert");
      jouer("ouvrir");
      ouvrir(anime);

      const focusables = Array.from(
        menu.querySelectorAll<HTMLElement>(SELECTEUR_FOCUS),
      );
      focusables[0]?.focus();

      const surTouche = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          e.preventDefault();
          fermerMenu(true);
          return;
        }
        if (e.key !== "Tab" || focusables.length === 0) return;
        const premier = focusables[0]!;
        const dernier = focusables[focusables.length - 1]!;
        if (e.shiftKey && document.activeElement === premier) {
          e.preventDefault();
          dernier.focus();
        } else if (!e.shiftKey && document.activeElement === dernier) {
          e.preventDefault();
          premier.focus();
        }
      };
      document.addEventListener("keydown", surTouche);
      return () => document.removeEventListener("keydown", surTouche);
    }

    jouer("fermer");
    html.classList.remove("menu-ouvert");
    fermer(anime, () => reprendre("menu"));
    if (focusARestaurer.current) {
      burgerRef.current?.focus();
      focusARestaurer.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [menuOuvert, mouvementReduit]);

  const rendreEntree = (entree: Entree, projet: boolean) => (
    <li className="menu__item" key={entree.href}>
      <span className="menu__ligne">
        <Link
          className="menu__lien"
          href={entree.href}
          data-monde={entree.monde ?? undefined}
          onClick={() => fermerMenu(false)}
          onMouseEnter={() => revelerMonde(entree, !mouvementReduit)}
          onFocus={() => revelerMonde(entree, !mouvementReduit)}
        >
          {entree.label}
        </Link>
      </span>
      {projet && entree.detail ? (
        <span className="menu__detail technique">{entree.detail}</span>
      ) : null}
    </li>
  );

  return (
    <div
      className="menu"
      id="menu-principal"
      ref={menuRef}
      aria-hidden={!menuOuvert}
      inert={!menuOuvert ? true : undefined}
    >
      {/* La surface d'encre qui descend par lamelles. */}
      <svg
        className="menu__store"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          <mask id="menu-masque-store">
            <g ref={groupeLamellesRef} />
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100"
          height="100"
          mask="url(#menu-masque-store)"
        />
      </svg>

      {/* Le monde chromatique révélé au survol, par le damier. */}
      <svg
        className="menu__monde"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          <mask id="menu-masque-damier">
            <g ref={groupeCellulesRef} />
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100"
          height="100"
          mask="url(#menu-masque-damier)"
        />
      </svg>

      <nav
        className="menu__contenu"
        aria-label="Menu"
        onMouseLeave={() => revelerMonde({ label: "", href: "", monde: null }, !mouvementReduit)}
      >
        <ul className="menu__liste menu__liste--projets">
          {entreesProjets.map((entree) => rendreEntree(entree, true))}
        </ul>
        <ul className="menu__liste menu__liste--parcours">
          {entreesParcours.map((entree) => rendreEntree(entree, false))}
        </ul>
        <p className="menu__pied technique">
          14 rue de Beaune, Paris VII — Atelier fondé 2011
        </p>
      </nav>
    </div>
  );
}
