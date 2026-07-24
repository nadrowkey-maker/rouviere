"use client";

import { useCallback, useRef } from "react";
import Link from "next/link";
import { gsap } from "@/lib/gsap";
import { useEffetVisuel } from "@/lib/isomorphe";
import { useDefilement } from "@/components/motion/LenisProvider";
import { useMouvement } from "@/components/motion/MotionProvider";
import {
  reclamer,
  liberer,
  natureVivante,
} from "@/components/motion/orchestrateur";
import { donneesEconomes } from "@/lib/capacites";
import { visuels } from "@/data/visuels";
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
 * Au survol d'une entrée de projet, on voit **où l'on va** : la vidéo du projet,
 * muette et bouclée, apparaît en fond, dévoilée par un damier de cellules
 * d'encre qui s'effacent dans un ordre mélangé, et le monde chromatique du
 * projet passe en surimpression légère par-dessus. La vidéo n'est chargée qu'au
 * premier survol, après un anti-rebond de 80 ms, mise en pause dès qu'on quitte
 * l'entrée ; **une seule** vidéo vit à un instant donné (un unique élément
 * réemployé). Sur `prefers-reduced-motion` ou `Save-Data`, la première
 * photographie du projet remplace la vidéo — fixe, jamais téléversée en boucle.
 *
 * Le store (lamelles) et le damier (aperçu) ne s'animent jamais ensemble : le
 * store passe par l'orchestrateur de transitions (nature « menu »), et l'aperçu
 * ne se dévoile qu'une fois le store posé — tant qu'une transition « menu » est
 * vivante, le damier attend. Aucune superposition possible.
 *
 * Accessibilité : `lenis.stop()` à l'ouverture (jamais `overflow: hidden`),
 * piège de focus, `Échap` ferme, le focus revient au burger.
 */

const N_LAMELLES = 22;
const BANDE = 100 / N_LAMELLES;
const DEMI = BANDE / 2;
const SVG_NS = "http://www.w3.org/2000/svg";

/** Anti-rebond du chargement de la vidéo d'aperçu. */
const ANTIREBOND_MS = 80;

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
  const apercuRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const lamellesRef = useRef<Lamelle[]>([]);
  const rectsLamellesRef = useRef<SVGRectElement[]>([]);
  const cellulesRef = useRef<SVGRectElement[]>([]);
  const damierRef = useRef<gsap.core.Timeline | null>(null);
  const masterRef = useRef<gsap.core.Timeline | null>(null);
  const monteRef = useRef(false);

  /* L'aperçu au survol : l'entrée sous le pointeur, le slug actuellement chargé
     sur l'unique élément vidéo, et le minuteur d'anti-rebond. */
  const survolRef = useRef<Entree | null>(null);
  const slugChargeRef = useRef<string | null>(null);
  const minuteurRef = useRef<number | null>(null);
  const ouvertureFinieRef = useRef(false);
  /* Levé le temps du focus programmatique posé sur la première entrée à
     l'ouverture (piège de focus) : ce focus-là ne doit pas déclencher l'aperçu —
     seul un vrai survol, ou un focus clavier, le fait. */
  const focusInitialRef = useRef(false);

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

    /* Damier de l'aperçu : une grille de cellules d'encre qui **couvrent** la
       vidéo, densité selon la largeur, et s'effacent dans un ordre mélangé au
       survol pour la dévoiler. Repartent opaques à la sortie. */
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
        cell.setAttribute("fill", "currentColor");
        cell.setAttribute("shape-rendering", "crispEdges");
        cell.setAttribute("opacity", "1");
        groupeCellules.appendChild(cell);
        cellules.push(cell);
      }
    }
    cellulesRef.current = cellules;
    /* Le damier joue vers le dévoilement : cellules opaques → transparentes,
       ordre mélangé, jamais un balayage régulier. `reverse()` recouvre ; une
       fois recouvert, l'aperçu est remis au repos (masqué) et la vidéo en pause —
       sauf si un nouveau survol a déjà repris la main entre-temps. */
    damierRef.current = gsap
      .timeline({
        paused: true,
        onReverseComplete: () => {
          if (survolRef.current !== null) return;
          if (apercuRef.current !== null) apercuRef.current.dataset.mode = "vide";
          videoRef.current?.pause();
        },
      })
      .to(gsap.utils.shuffle([...cellules]), {
        opacity: 0,
        duration: 0.5,
        ease: "power2.out",
        stagger: { each: 0.012 },
      });

    /* État fermé, avant toute ouverture. Les entrées passent sous contrôle de
       GSAP dès maintenant : leur `translateY(110%)` CSS serait sinon lu comme
       une base en pixels à laquelle `yPercent` s'ajouterait — le piège que le
       seuil a déjà rencontré. On épingle donc `y: 0` partout où on les touche. */
    gsap.set(rects, { attr: { y: (i: number) => lamelles[Math.floor(i / 2)]!.centre, height: 0 } });
    gsap.set(cellules, { opacity: 1 });
    const liens = menuRef.current?.querySelectorAll<HTMLElement>(".menu__lien");
    if (liens !== undefined) gsap.set(liens, { yPercent: 110, y: 0 });

    return () => {
      if (minuteurRef.current !== null) clearTimeout(minuteurRef.current);
      damierRef.current?.kill();
      masterRef.current?.kill();
      groupeLamelles.replaceChildren();
      groupeCellules.replaceChildren();
    };
  }, []);

  /* ---- L'aperçu vidéo révélé au survol ---- */

  /** Joue le damier vers le dévoilement (cellules d'encre → transparentes). */
  const devoiler = useCallback(() => {
    const damier = damierRef.current;
    if (damier === null) return;
    if (mouvementReduit) gsap.set(cellulesRef.current, { opacity: 0 });
    else damier.timeScale(1).play();
  }, [mouvementReduit]);

  /** Charge et joue le média, après l'anti-rebond. Un seul média à la fois :
   *  l'unique <video> voit son `src` remplacé, ce qui libère le précédent. */
  const chargerMedia = useCallback((entree: Entree) => {
    if (entree.slug === undefined) return;
    const v = visuels[entree.slug];
    const video = videoRef.current;
    const img = imgRef.current;
    const apercu = apercuRef.current;
    if (v === undefined || apercu === null) return;

    /* Repli photographique : mouvement réduit ou Save-Data. On ne charge jamais
       de vidéo en boucle, on affiche la première planche du projet. */
    if (mouvementReduit || donneesEconomes()) {
      video?.pause();
      if (img !== null && img.getAttribute("src") !== v.planches[0]!.src) {
        img.src = v.planches[0]!.src;
      }
      apercu.dataset.mode = "photo";
      return;
    }

    if (video === null) return;
    if (slugChargeRef.current !== entree.slug) {
      video.pause();
      video.poster = v.video.poster;
      video.src = v.video.mp4;
      video.load();
      slugChargeRef.current = entree.slug;
    }
    apercu.dataset.mode = "video";
    /* `play()` rejette si le survol a déjà cessé : on avale silencieusement,
       la pause de sortie fait foi. */
    void video.play().catch(() => {});
  }, [mouvementReduit]);

  /** Prépare l'aperçu et lance le dévoilement. N'est appelée qu'une fois le
   *  store posé — jamais pendant l'ouverture du menu, donc jamais superposée à
   *  ses lamelles. */
  const devoilerProjet = useCallback(
    (entree: Entree) => {
      const apercu = apercuRef.current;
      if (apercu === null || entree.slug === undefined) return;
      const v = visuels[entree.slug];
      if (v === undefined) return;

      /* La poster (ou la photo de repli) est posée tout de suite pour que le
         dévoilement ne montre pas de noir avant le premier plan de la vidéo. */
      const repli = mouvementReduit || donneesEconomes();
      if (!repli && videoRef.current !== null) {
        videoRef.current.poster = v.video.poster;
        apercu.dataset.mode = "video";
      } else {
        if (
          imgRef.current !== null &&
          imgRef.current.getAttribute("src") !== v.planches[0]!.src
        ) {
          imgRef.current.src = v.planches[0]!.src;
        }
        apercu.dataset.mode = "photo";
      }

      devoiler();

      if (minuteurRef.current !== null) clearTimeout(minuteurRef.current);
      minuteurRef.current = window.setTimeout(() => {
        minuteurRef.current = null;
        /* Le pointeur a-t-il tenu ? Sinon la sortie a déjà tout remis. */
        if (survolRef.current === entree) chargerMedia(entree);
      }, ANTIREBOND_MS);
    },
    [devoiler, chargerMedia, mouvementReduit],
  );

  /** Entrée du pointeur (ou focus clavier) sur une entrée de projet. */
  const survolerProjet = useCallback(
    (entree: Entree) => {
      const menu = menuRef.current;
      if (menu === null || entree.monde === null) return;
      /* Le focus programmatique d'ouverture ne dévoile rien. */
      if (focusInitialRef.current) return;

      survolRef.current = entree;
      menu.style.setProperty("--monde-menu", `var(--color-${entree.monde})`);

      /* Tant que le store s'anime (transition « menu » vivante, ou ouverture
         pas encore posée), on ne dévoile pas : l'aperçu reste masqué et
         l'ouverture rappellera ce survol à sa fin. Aucune superposition de
         masques n'est possible. */
      if (!ouvertureFinieRef.current || natureVivante() === "menu") return;
      devoilerProjet(entree);
    },
    [devoilerProjet],
  );

  /** Sortie de la zone des entrées, ou survol d'une entrée sans monde : on
   *  recouvre par le damier, la pause de la vidéo et le retour au repos étant
   *  scellés par `onReverseComplete`. */
  const quitterApercu = useCallback(() => {
    survolRef.current = null;
    if (minuteurRef.current !== null) {
      clearTimeout(minuteurRef.current);
      minuteurRef.current = null;
    }
    const damier = damierRef.current;
    if (mouvementReduit || damier === null) {
      gsap.set(cellulesRef.current, { opacity: 1 });
      videoRef.current?.pause();
      if (apercuRef.current !== null) apercuRef.current.dataset.mode = "vide";
    } else {
      damier.timeScale(1.5).reverse();
    }
  }, [mouvementReduit]);

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

      /* Finalisation si l'ouverture est préemptée : le store posé, les liens en
         place. L'orchestrateur l'appelle avant de céder le créneau. */
      const finaliser = () => {
        gsap.set(rects, { attr: attrOuvert });
        gsap.set(liens, { yPercent: 0, y: 0 });
        if (scene) gsap.set(scene, { "--recul": 1 });
        ouvertureFinieRef.current = true;
      };

      if (!anime) {
        finaliser();
        return;
      }

      const tl = gsap.timeline({
        onComplete: () => {
          liberer(tl);
          ouvertureFinieRef.current = true;
          /* Le store est posé : on peut enfin dévoiler l'entrée restée sous le
             pointeur pendant l'ouverture, sans jamais l'avoir superposée. */
          if (survolRef.current !== null) devoilerProjet(survolRef.current);
        },
      });
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
      reclamer({ nature: "menu", anim: tl, finaliser });
    },
    [devoilerProjet],
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
      ouvertureFinieRef.current = false;
      /* L'aperçu est coupé net à la fermeture : cellules recouvrantes, vidéo en
         pause, plus aucune entrée survolée. */
      survolRef.current = null;
      if (minuteurRef.current !== null) {
        clearTimeout(minuteurRef.current);
        minuteurRef.current = null;
      }
      /* Le damier est remis à son état couvrant (tête de lecture à 0) pour que
         le prochain survol reparte d'un dévoilement complet, jamais d'un état
         figé à mi-course. L'aperçu masqué, ces cellules opaques ne peignent pas. */
      damierRef.current?.pause(0);
      videoRef.current?.pause();
      if (apercuRef.current !== null) apercuRef.current.dataset.mode = "vide";

      const attrFerme = {
        y: (i: number) => lamelles[Math.floor(i / 2)]!.centre,
        height: 0,
      };

      /* Fermeture instantanée : mouvement réduit, ou fermeture par navigation —
         la couture de route est alors la seule transition qui s'anime, le store
         se retire sans bruit pour ne pas s'y superposer. */
      if (!anime) {
        gsap.set(liens, { yPercent: 110, y: 0 });
        gsap.set(rects, { attr: attrFerme });
        if (scene) gsap.set(scene, { "--recul": 0 });
        apres();
        return;
      }

      const finaliser = () => {
        gsap.set(liens, { yPercent: 110, y: 0 });
        gsap.set(rects, { attr: attrFerme });
        if (scene) gsap.set(scene, { "--recul": 0 });
      };

      /* La fermeture est toujours plus rapide que l'ouverture. Les entrées se
         retirent en 0,26 s — franchement vif, et surtout hors de la zone
         0,30–0,55 s que le document proscrit sur un déplacement de grande
         amplitude (ici tout le corps du lien, sur 110 % de sa hauteur). Le
         store, lui, se referme après, plus lentement, et scelle la retraite. */
      const tl = gsap.timeline({
        onComplete: () => {
          liberer(tl);
          apres();
        },
      });
      tl.to(
        liens,
        {
          yPercent: 110,
          y: 0,
          duration: 0.26,
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
      reclamer({ nature: "menu", anim: tl, finaliser });
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

    const html = document.documentElement;

    if (menuOuvert) {
      arreter("menu");
      html.classList.add("menu-ouvert");
      jouer("ouvrir");
      ouvrir(!mouvementReduit);

      const focusables = Array.from(
        menu.querySelectorAll<HTMLElement>(SELECTEUR_FOCUS),
      );
      /* Le focus posé ici est dispatché de façon synchrone : on encadre l'appel
         pour que le `onFocus` de l'entrée, s'il tire, se sache programmatique. */
      focusInitialRef.current = true;
      focusables[0]?.focus();
      focusInitialRef.current = false;

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

    /* Fermeture. Par navigation (clic sur un lien : le focus part avec la page,
       donc `focusARestaurer` est faux) → instantanée, pour laisser la couture
       de route animer seule. Par burger ou Échap (on reste sur la page) →
       animée. En mouvement réduit, toujours instantanée. */
    const navigation = !focusARestaurer.current;
    const anime = !mouvementReduit && !navigation;

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
          onClick={() => {
            if (projet) jouer("projet");
            fermerMenu(false);
          }}
          onMouseEnter={() => {
            jouer("survol");
            if (projet) survolerProjet(entree);
            else quitterApercu();
          }}
          onFocus={() => (projet ? survolerProjet(entree) : quitterApercu())}
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

      {/* L'aperçu du projet, révélé au survol : la vidéo (ou la photographie de
          repli) en fond, le monde chromatique en surimpression, et par-dessus le
          damier d'encre qui s'efface pour dévoiler. */}
      <div className="menu__apercu" ref={apercuRef} data-mode="vide" aria-hidden="true">
        <video
          className="menu__media menu__media--video"
          ref={videoRef}
          muted
          loop
          playsInline
          preload="none"
          tabIndex={-1}
        />
        {/* Repli décoratif, `src` posé impérativement au survol sur un unique
            nœud réemployé : `next/image` ne s'y prête pas. Il est aria-hidden,
            hors du flux LCP. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="menu__media menu__media--photo" ref={imgRef} alt="" />
        <div className="menu__teinte" />
        <svg
          className="menu__damier"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          <g ref={groupeCellulesRef} />
        </svg>
      </div>

      <nav
        className="menu__contenu"
        aria-label="Menu"
        onMouseLeave={quitterApercu}
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
