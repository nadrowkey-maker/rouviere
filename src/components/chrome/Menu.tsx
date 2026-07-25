"use client";

import { useCallback, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { gsap } from "@/lib/gsap";
import { useEffetVisuel } from "@/lib/isomorphe";
import { useDefilement } from "@/components/motion/LenisProvider";
import { useMouvement } from "@/components/motion/MotionProvider";
import { reclamer, liberer } from "@/components/motion/orchestrateur";
import {
  poser,
  retirer,
  figer,
  POSE,
  RETIRE,
} from "@/components/motion/passage";
import { donneesEconomes } from "@/lib/capacites";
import { visuels } from "@/data/visuels";
import { useChrome } from "./ChromeProvider";
import { useSon } from "./SonProvider";
import { useVideoProjet, armerReleve } from "./VideoProjet";
import { entreesParcours, entreesProjets, type Entree } from "./entrees";
/* La surface du menu joue le passage : elle en porte la classe, donc sa
   feuille. L'import est explicite pour ne pas dépendre de l'ordre de
   chargement des routes. */
import "@/components/motion/transition.css";
import "./menu.css";

/**
 * Le menu. Il ne glisse pas depuis la droite : il ouvre une pièce.
 *
 * Au clic sur le burger, la page recule dans la profondeur — elle rétrécit, se
 * désature et se floute (en CSS : la surface qui recule est le document, pas une
 * scène WebGL) — pendant qu'une surface d'encre vient couvrir le cadre par le
 * **passage**, le fondu de matière (voir `motion/passage.ts`). Les entrées
 * arrivent ensuite en enfilade, en Gambetta énorme.
 *
 * Le store à lamelles a été retiré avec `scroll-transition` : le site n'a plus
 * qu'une seule grammaire de transition, et le menu la partage avec les coutures
 * de route.
 *
 * Au survol d'une entrée de projet, on voit **où l'on va** : la vidéo du projet,
 * muette et bouclée, apparaît en fond. Le passage d'une entrée à l'autre est
 * **instantané** — plus de damier qui s'efface case à case, plus de teinte de
 * monde en surimpression. Ces deux-là fabriquaient un artefact à chaque
 * changement : la nouvelle vidéo se découvrait sous les cellules de l'ancienne,
 * et le calque de couleur multipliait un instant le mauvais monde. Une vidéo
 * remplace l'autre, sec, et rien ne se mélange.
 *
 * **La vidéo paraît déjà en lecture, depuis sa première image, et rien ne paraît
 * avant elle.** Il y avait ici une photographie posée le temps du décodage : une
 * image fixe qui s'immobilise un dixième de seconde puis se met à bouger se lit
 * comme un bug, et c'est ce qu'on voyait. Il n'y a donc plus de poster, plus
 * d'image d'attente, plus rien : le cadre reste vide jusqu'à ce que la vidéo
 * joue vraiment (voir `VideoProjet.tsx`, qui attend une image effectivement
 * présentée). Et **aucune mémoire d'état** : chaque survol rembobine, y compris
 * le retour sur un projet déjà vu ; chaque sortie met en pause et remet à zéro.
 *
 * Le nœud vidéo n'appartient pas au menu : c'est celui du site, unique, que le
 * menu emprunte le temps d'un survol et qu'il **laisse partir** au clic — la
 * chambre l'adopte tel quel, à la même image. Sur `prefers-reduced-motion` ou
 * `Save-Data`, la première photographie du projet remplace la vidéo — fixe,
 * jamais téléversée en boucle.
 *
 * Ce qui signale l'entrée survolée n'est donc plus le fond : c'est **le titre
 * lui-même**. Il se décale vers la droite pendant que ses voisines perdent leur
 * densité et reculent. On sait sans ambiguïté sur quoi le curseur se trouve,
 * même sans média derrière.
 *
 * Accessibilité : `lenis.stop()` à l'ouverture (jamais `overflow: hidden`),
 * piège de focus, `Échap` ferme, le focus revient au burger.
 */

/**
 * Filet de la couverture de navigation. Si le `pathname` ne change pas — clic
 * sur la route déjà ouverte, navigation empêchée par une extension —, la
 * surface du menu se retirerait sinon jamais et couvrirait le site. Une seconde
 * est très au-delà de toute navigation client, et très en deçà de ce qu'un
 * visiteur remarquerait.
 */
const FILET_NAVIGATION_MS = 1000;

const SELECTEUR_FOCUS = 'a[href], button:not([disabled])';

export function Menu() {
  const { menuOuvert, fermerMenu, burgerRef, focusARestaurer } = useChrome();
  const { arreter, reprendre } = useDefilement();
  const { mouvementReduit } = useMouvement();
  const { jouer } = useSon();
  const flux = useVideoProjet();

  const menuRef = useRef<HTMLDivElement>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const apercuRef = useRef<HTMLDivElement>(null);
  /* L'hôte du nœud vidéo partagé. Le menu ne possède pas la vidéo : il la loge. */
  const hoteRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const masterRef = useRef<gsap.core.Timeline | null>(null);
  const monteRef = useRef(false);

  /* La couverture de navigation : levée tant que la surface du menu doit rester
     posée en attendant la nouvelle route, avec son filet de sécurité. */
  const couvertureRef = useRef(false);
  const filetRef = useRef<number | null>(null);
  const pathname = usePathname();

  /* L'aperçu au survol : l'entrée sous le pointeur. Le flux, lui, sait seul
     quel projet il porte, et il les tient tous les cinq en chauffe. */
  const survolRef = useRef<Entree | null>(null);
  /**
   * Levé par le clic sur une entrée de projet, et lu par la fermeture : la vidéo
   * part avec la page, il ne faut pas l'arrêter.
   *
   * Le drapeau du module ne peut pas servir ici : la chambre le consomme dans son
   * effet de montage, et selon l'ordre des effets d'un même commit la fermeture
   * du menu peut passer après elle. Elle trouvait alors un drapeau vide et
   * coupait le flux qu'elle venait de laisser partir — la vidéo repartait de zéro,
   * à l'arrêt, dans le hero. Ce que la fermeture doit savoir, c'est ce qu'elle a
   * fait, pas ce qu'il reste du drapeau : d'où cette ref, posée par le clic.
   */
  const releveRef = useRef(false);
  /* Levé le temps du focus programmatique posé sur la première entrée à
     l'ouverture (piège de focus) : ce focus-là ne doit pas déclencher l'aperçu —
     seul un vrai survol, ou un focus clavier, le fait. */
  const focusInitialRef = useRef(false);

  /* ---- État fermé, avant toute ouverture ---- */
  useEffetVisuel(() => {
    const surface = surfaceRef.current;
    if (surface !== null) figer(surface, RETIRE);

    /* Les entrées passent sous contrôle de GSAP dès maintenant : leur
       `translateY(110%)` CSS serait sinon lu comme une base en pixels à laquelle
       `yPercent` s'ajouterait — le piège que le seuil a déjà rencontré. On
       épingle donc `y: 0` partout où on les touche. */
    const liens = menuRef.current?.querySelectorAll<HTMLElement>(".menu__lien");
    if (liens !== undefined) gsap.set(liens, { yPercent: 110, y: 0 });

    return () => {
      if (filetRef.current !== null) clearTimeout(filetRef.current);
      masterRef.current?.kill();
    };
  }, []);

  /* ---- La relève de la couverture ----
     La nouvelle route est montée, et sa propre couture la couvre déjà : la
     surface du menu n'a plus rien à cacher et s'efface, sans animation — il n'y
     a rien à voir puisque rien ne se découvre. */
  useEffetVisuel(() => {
    if (!couvertureRef.current) return;
    couvertureRef.current = false;
    if (filetRef.current !== null) {
      clearTimeout(filetRef.current);
      filetRef.current = null;
    }
    const surface = surfaceRef.current;
    if (surface !== null) figer(surface, RETIRE);
    /* Le cadre d'aperçu est rendu à son état vide. S'il y a eu relève, le nœud
       vidéo est déjà parti dans le hero de la chambre : il n'y a rien à cacher
       et rien à arrêter — seulement un attribut à remettre au propre. */
    if (apercuRef.current !== null) apercuRef.current.dataset.mode = "vide";
    /* `pathname` n'est pas lu dans le corps : il sert de déclencheur. C'est son
       changement, et lui seul, qui dit que la nouvelle route est montée. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  /* ---- L'aperçu vidéo, posé sec au survol ---- */

  /**
   * Entrée du pointeur (ou focus clavier) sur une entrée de projet.
   *
   * Le cadre ne montre **rien** jusqu'à ce que la vidéo joue : ni poster, ni
   * photographie d'attente, ni la vidéo du projet précédent. C'est la correction
   * — l'image fixe qui paraissait un instant avant que le plan démarre passait
   * pour un défaut, et elle en était un.
   *
   * Le flux rembobine à chaque survol, même sur un projet déjà chargé : on n'a
   * pas de mémoire d'état, on revoit toujours la première image.
   */
  const survolerProjet = useCallback(
    (entree: Entree) => {
      const apercu = apercuRef.current;
      const hote = hoteRef.current;
      if (apercu === null || entree.slug === undefined) return;
      /* Le focus programmatique d'ouverture ne dévoile rien. */
      if (focusInitialRef.current) return;
      const v = visuels[entree.slug];
      if (v === undefined) return;

      survolRef.current = entree;
      const slug = entree.slug;

      /* Repli : la photographie du projet, fixe, posée dans la frame même. La
         vidéo n'a alors aucune raison d'être chargée. */
      if (mouvementReduit || donneesEconomes()) {
        const img = imgRef.current;
        const source = v.planches[0]!.src;
        if (img !== null && img.getAttribute("src") !== source) img.src = source;
        apercu.dataset.mode = "photo";
        return;
      }

      /* Le nœud du projet vient se loger dans le cadre, et lui seul : les
         quatre autres rentrent au foyer. Aucun anti-rebond — les flux sont en
         chauffe depuis l'ouverture du menu, il n'y a rien à charger, donc rien
         à différer. Un délai ici ne ferait qu'ajouter du noir. */
      if (hote !== null) flux.accueillir(slug, hote);
      flux.demarrer(slug, () => {
        /* Dernière vérification au moment de montrer : la lecture a pu démarrer
           après que le pointeur soit parti. */
        if (survolRef.current?.slug !== slug) return;
        apercu.dataset.mode = "video";
      });
    },
    [flux, mouvementReduit],
  );

  /** Sortie de la zone des entrées, ou survol d'une entrée sans projet : le
   *  cadre se vide, sec, et le flux revient à zéro.
   *
   *  Sauf si une relève est armée : le clic sur une entrée fait sortir le pointeur
   *  de la zone des entrées, donc passe **ici** juste après. Vider le cadre à cet
   *  instant découvrirait le noir sous la vidéo qu'on est en train d'emmener. */
  const quitterApercu = useCallback(() => {
    if (releveRef.current) return;
    survolRef.current = null;
    /* On arrête **le flux qu'on héberge**, jamais celui d'un autre : un clic
       vient peut-être de l'envoyer dans une chambre, et cette sortie de survol
       est justement ce que le clic déclenche en éloignant le pointeur. Voir
       `VideoProjet.arreter`. */
    flux.arreter(hoteRef.current);
    if (apercuRef.current !== null) apercuRef.current.dataset.mode = "vide";
  }, [flux]);

  /* ---- Ouverture et fermeture ---- */

  /**
   * L'ouverture. `apres` court à la fin naturelle de la course, et pas si elle
   * est préemptée.
   *
   * **Ce qui saccadait, et ce qui a été fait.** Trois choses se produisaient
   * dans la même frame, et une seule était l'animation :
   *
   *   1. `--recul` était une propriété personnalisée non déclarée, donc
   *      héritée. L'écrire sur `.scene-page` invalidait le style de tout le
   *      parcours, à chaque frame. C'est le poste principal, et il est traité
   *      dans `tokens.css` par un `@property … inherits: false` — le reste de
   *      cette fonction n'a pas bougé d'une ligne pour ça.
   *   2. Les cinq flux vidéo se mettaient en chauffe **ici**, c'est-à-dire cinq
   *      `load()` lancés pendant la course : cinq requêtes et cinq décodages de
   *      première image en concurrence avec l'animation. Ils sont maintenant
   *      différés à la fin de l'ouverture (voir l'appelant). On ne peut de toute
   *      façon pas survoler une entrée qui n'est pas encore arrivée.
   *   3. La durée n'a **pas** été allongée. Rallonger une course pour cacher un
   *      coût de style, c'est déplacer la saccade, pas la retirer.
   */
  const ouvrir = useCallback((anime: boolean, apres: () => void) => {
    const scene = document.getElementById("scene-page");
    const menu = menuRef.current;
    const surface = surfaceRef.current;
    if (menu === null || surface === null) return;
    const liens = menu.querySelectorAll<HTMLElement>(".menu__lien");

    masterRef.current?.kill();

    /* Finalisation si l'ouverture est préemptée : la surface posée, les liens
       en place. L'orchestrateur l'appelle avant de céder le créneau. */
    const finaliser = () => {
      figer(surface, POSE);
      gsap.set(liens, { yPercent: 0, y: 0 });
      if (scene) gsap.set(scene, { "--recul": 1 });
    };

    if (!anime) {
      finaliser();
      apres();
      return;
    }

    const tl = gsap.timeline({
      onComplete: () => {
        liberer(tl);
        apres();
      },
    });
    tl.add(poser(surface), 0);
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
  }, []);

  /**
   * Ferme le menu, de trois façons qui ne se ressemblent pas :
   *
   *   `"animee"`     — burger ou `Échap` : on reste sur la page, la surface se
   *                    retire par le passage.
   *   `"instantanee"`— mouvement réduit : tout est posé, rien ne s'anime.
   *   `"navigation"` — clic sur une entrée : **la surface reste posée**. C'est
   *                    la correction du saut qu'on voyait au clic. Retirer la
   *                    surface tout de suite découvrait la page qu'on est en
   *                    train de quitter, le temps que Next aille chercher la
   *                    nouvelle route et que sa couture se monte — un aller-
   *                    retour visible. En la laissant en place, la couverture ne
   *                    s'interrompt jamais : la couture de route s'installe
   *                    dessous, et la surface du menu s'efface au changement de
   *                    `pathname`, quand il n'y a plus rien à cacher.
   */
  const fermer = useCallback((
    mode: "animee" | "instantanee" | "navigation",
    apres: () => void,
  ) => {
    const scene = document.getElementById("scene-page");
    const menu = menuRef.current;
    const surface = surfaceRef.current;
    if (menu === null || surface === null) {
      apres();
      return;
    }
    const liens = menu.querySelectorAll<HTMLElement>(".menu__lien");

    masterRef.current?.kill();
    /* L'aperçu est coupé net à la fermeture : plus aucune entrée survolée, plus
       de chargement en attente.

       **Sauf si une relève est armée.** Un clic sur une entrée de projet ne
       coupe pas la vidéo : c'est elle qui devient le hero de la page, à la même
       image, et l'arrêter ici rendrait le relais impossible. Elle reste donc en
       lecture dans l'aperçu — qui couvre encore le cadre — jusqu'à ce que la
       chambre l'adopte. */
    const releve = releveRef.current;
    releveRef.current = false;
    survolRef.current = null;
    if (!releve) {
      flux.arreter(hoteRef.current);
      if (apercuRef.current !== null) apercuRef.current.dataset.mode = "vide";
    }

    const finaliser = () => {
      gsap.set(liens, { yPercent: 110, y: 0 });
      figer(surface, RETIRE);
      if (scene) gsap.set(scene, { "--recul": 0 });
    };

    if (mode === "navigation") {
      /* **Tout s'en va, la vidéo reste.**

         Les entrées étaient posées d'un coup hors du cadre, et la page derrière
         reprenait sa netteté dans la même frame : on quittait le menu par une
         disparition sèche, pas par un geste. Elles se retirent maintenant comme
         à la fermeture ordinaire — un peu plus vite, parce qu'on est déjà
         ailleurs — et ce qui reste à l'écran est la vidéo du projet, plein cadre,
         qui ne s'est pas interrompue et deviendra le hero de la page.

         La surface d'encre, elle, ne bouge pas : elle couvre encore la page qu'on
         quitte, sous la vidéo, jusqu'à ce que la nouvelle route soit là. Le filet
         ci-dessous la libère si le `pathname` ne change jamais — clic sur la
         route déjà ouverte, navigation empêchée. */
      /* Sa finalisation ne touche pas à la surface : préemptée ou non, la
         couverture tient jusqu'à la nouvelle route. */
      const poserSortie = () => {
        gsap.set(liens, { yPercent: 110, y: 0 });
        if (scene) gsap.set(scene, { "--recul": 0 });
      };
      const sortie = gsap.timeline({ onComplete: () => liberer(sortie) });
      sortie.to(
        liens,
        {
          yPercent: 110,
          y: 0,
          duration: 0.22,
          ease: "power2.in",
          stagger: { each: 0.03, from: "start" },
        },
        0,
      );
      if (scene) {
        sortie.to(scene, { "--recul": 0, duration: 0.5, ease: "power2.out" }, 0);
      }
      masterRef.current = sortie;
      reclamer({ nature: "menu", anim: sortie, finaliser: poserSortie });

      couvertureRef.current = true;
      if (filetRef.current !== null) clearTimeout(filetRef.current);
      filetRef.current = window.setTimeout(() => {
        filetRef.current = null;
        if (!couvertureRef.current) return;
        couvertureRef.current = false;
        figer(surface, RETIRE);
      }, FILET_NAVIGATION_MS);
      apres();
      return;
    }

    if (mode === "instantanee") {
      finaliser();
      apres();
      return;
    }

    /* La fermeture est toujours plus rapide que l'ouverture. Les entrées se
       retirent en 0,26 s — franchement vif, et surtout hors de la zone
       0,30–0,55 s que le document proscrit sur un déplacement de grande
       amplitude (ici tout le corps du lien, sur 110 % de sa hauteur). La
       surface, elle, se retire après, plus lentement, et scelle la retraite. */
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
    tl.add(retirer(surface), 0.1);
    if (scene) {
      tl.to(scene, { "--recul": 0, duration: 0.6, ease: "power2.inOut" }, 0);
    }
    masterRef.current = tl;
    reclamer({ nature: "menu", anim: tl, finaliser });
  }, [flux]);

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
      /* Les cinq flux se mettent en chauffe **une fois la pièce ouverte**, et
         non pendant qu'elle s'ouvre. C'est le geste qui supprime le noir entre
         deux survols — quand on désigne un projet, sa première image est déjà
         décodée —, mais cinq `load()` simultanés dans la frame de départ
         faisaient décoder cinq vidéos par-dessus l'animation. On ne perd rien à
         attendre : aucune entrée ne peut être survolée avant d'être arrivée. */
      ouvrir(!mouvementReduit, () => {
        if (!mouvementReduit && !donneesEconomes()) flux.prechauffer();
      });

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
       donc `focusARestaurer` est faux) → la surface reste posée jusqu'à la
       nouvelle route. Par burger ou Échap (on reste sur la page) → animée. En
       mouvement réduit, instantanée. */
    const navigation = !focusARestaurer.current;
    const mode = navigation
      ? "navigation"
      : mouvementReduit
        ? "instantanee"
        : "animee";

    jouer("fermer");
    html.classList.remove("menu-ouvert");
    fermer(mode, () => reprendre("menu"));
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
          onClick={() => {
            if (projet) {
              jouer("projet");
              /* La vidéo qui joue derrière le texte **est** la vidéo
                 d'ouverture de la page : on arme la relève, elle ne s'arrête
                 pas et la chambre l'adoptera à cette image-là. Le drapeau du
                 module dit à la chambre quoi adopter ; la ref dit à la fermeture
                 de ne rien couper. */
              if (entree.slug !== undefined) {
                armerReleve(entree.slug);
                releveRef.current = true;
              }
            }
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
      {/* La surface d'encre, posée et retirée par le passage. */}
      <div className="menu__surface passage" ref={surfaceRef} aria-hidden="true" />

      {/* L'aperçu du projet : le flux partagé du site (ou la photographie de
          repli), plein cadre, posé sec. Rien par-dessus.

          L'hôte est un cadre vide : c'est le nœud vidéo unique du layout qui
          vient s'y loger au survol, et qui repart dans le hero de la chambre au
          clic — sans jamais s'interrompre. */}
      <div className="menu__apercu" ref={apercuRef} data-mode="vide" aria-hidden="true">
        <div className="menu__media menu__media--video" ref={hoteRef} />
        {/* Repli décoratif, `src` posé impérativement au survol sur un unique
            nœud réemployé : `next/image` ne s'y prête pas. Il est aria-hidden,
            hors du flux LCP. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="menu__media menu__media--photo" ref={imgRef} alt="" />
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
