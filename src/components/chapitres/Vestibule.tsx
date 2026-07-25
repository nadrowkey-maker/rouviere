"use client";

import { useRef } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import { gsap } from "@/lib/gsap";
import { bassin } from "@/data/matieres";
import { useRig } from "@/components/gl/Rig";
import type { EtatBassin } from "@/components/gl/materiaux/bassin";
import { useMouvement } from "@/components/motion/MotionProvider";
import { useSon } from "@/components/chrome/SonProvider";
import { useEffetVisuel } from "@/lib/isomorphe";
import { inscrire } from "@/lib/boucle";
import { rattraper } from "@/lib/math";
import "./vestibule.css";

/**
 * Le Vestibule. Le cœur du site.
 *
 * Ce n'était qu'un bloc de texte qui montait ligne par ligne. C'est devenu une
 * **séquence en sept temps**, entièrement pilotée au défilement, où le manifeste
 * de Camille Rouvière se dit un morceau à la fois, avec de l'air entre chaque.
 * Rien n'apparaît d'un bloc, rien ne se joue à la minuterie : tout est en scrub,
 * donc tout se rembobine.
 *
 *   **Un.**   « Je ne décore pas. » paraît seul, tient, puis se retire.
 *   **Deux.** « Je règle la » paraît.
 *   **Trois.** Le fond s'assombrit rapidement jusqu'au noir complet, et
 *             « Je règle la » s'éteint avec lui — la même course, le même
 *             instant : la phrase ne s'efface pas *puis* le noir tombe, c'est
 *             le noir qui l'emporte.
 *   **Quatre.** Dans le noir total, le mot *lumière*, dans une graisse et une
 *             taille différentes du reste. Il est là, mais il n'est pas éclairé.
 *             Un halo suit le curseur et ne révèle que la portion des lettres
 *             qu'il touche. Voir le halo, plus bas — c'est le morceau délicat.
 *   **Cinq.** « la matière et le silence. » paraît, la lumière se retire.
 *   **Six.**  Tout disparaît sauf le mot « silence », qui reste seul et à sa
 *             place dans la phrase. Puis le bassin monte en plein écran
 *             derrière lui. Aucun texte, aucune interface, rien d'autre.
 *   **Sept.** L'eau redescend, « Le reste appartient aux gens qui vivent là. »
 *             paraît, et le site reprend.
 *
 * ## Le halo, et pourquoi il n'est pas un objet
 *
 * `InteractiveLight` — le composant fourni — n'a pas été employé : son bleu, son
 * `borderRadius` et sa pile de `box-shadow` violent trois règles du document
 * d'un coup. Ici il n'y a **aucun objet lumineux à l'écran** : pas de pastille,
 * pas de forme, pas de source. Il y a un dégradé radial peint sur le mot et
 * découpé par ses lettres (`background-clip: text`) — ce que le halo ne touche
 * pas n'existe pas. Le blanc est légèrement viré vers `--laiton` : c'est une
 * lumière de tungstène, pas une lampe de bureau.
 *
 * Le suivi est une **interpolation par cadre** sur le ticker partagé, jamais une
 * transition CSS : une transition rattraperait le pointeur par paliers, et on
 * verrait la lumière avancer par saccades. Sans mouvement pendant deux secondes,
 * le halo se met à dériver de lui-même sur une somme de sinusoïdes
 * incommensurables — la mécanique se découvre alors seule, sans qu'on ait rien
 * à écrire à l'écran. Sur pointeur grossier, où il n'y a pas de survol du tout,
 * il dérive en permanence.
 *
 * Les coordonnées du halo sont celles du pointeur, telles quelles : le cadre est
 * collé en haut du viewport et occupe toute sa largeur pendant toute la
 * séquence, si bien que son repère local **est** le repère du viewport. Aucune
 * mesure n'est donc nécessaire, et aucun rect n'est lu.
 *
 * ## Le bassin
 *
 * Il vient de *La Matière*, qui n'en garde rien. Il n'existe qu'**une seule
 * scène d'eau dans tout le site**, et c'est celle-ci : deux simulations à
 * soixante pas par seconde seraient à la fois une faute de composition et un
 * coût GPU sans contrepartie.
 *
 * La nappe d'ambiance se coupe entièrement à son arrivée — fondu de sortie d'une
 * seconde et demie — pour qu'il ne reste que l'eau, dont le niveau est commandé
 * par la vélocité du pointeur. Elle revient à la sortie de la section.
 *
 * Grammaire de mouvement : **le dévoilement sur place**. Le hero qui précède
 * s'éteint sans bouger, l'enfilade qui suit traverse latéralement : aucun des
 * trois ne partage sa grammaire avec son voisin.
 */

const SceneBassin = dynamic(() => import("@/components/gl/SceneBassin"), {
  ssr: false,
});

/** Écrans de course de la séquence. La hauteur du chapitre en descend. */
const TEMPS = 9;

/**
 * Le minutage, en parts de la course. Il est écrit ici, en toutes lettres, et
 * pas dérivé d'un pas régulier : c'est un montage, et un montage se décide.
 * Chaque paire est un intervalle [début, fin].
 */
const MINUTAGE = {
  unEntree: [0.0, 0.06],
  unSortie: [0.11, 0.15],
  deuxEntree: [0.17, 0.23],
  /**
   * Le noir, et l'extinction de « Je règle la ».
   *
   * La plage est large — un huitième de la course, plus de cent hauteurs de
   * fenêtre — et la courbe est symétrique. Le fond ne tombe pas dans le noir :
   * il y descend. Un passage court sur cette amplitude-là se lit comme une
   * coupure, et c'est exactement ce qu'on ne veut pas ici : l'écran s'éteint,
   * il ne s'interrompt pas.
   */
  noir: [0.24, 0.36],
  lumiereEntree: [0.38, 0.44],
  /** Cinq paraît pendant que la lumière se retire. */
  cinqEntree: [0.47, 0.53],
  lumiereSortie: [0.47, 0.53],
  /** Tout disparaît sauf « silence ». */
  reduction: [0.57, 0.62],
  eauMontee: [0.63, 0.71],
  eauSortie: [0.86, 0.93],
  septEntree: [0.91, 0.97],
} as const;

/** La séquence est en scrub : ces bornes disent où l'eau prend la main. */
const EAU_DEBUT = 0.6;
const EAU_FIN = 0.94;

/**
 * Course verticale d'une phrase, en pixels. Huit — la ligne de base du site,
 * une seule fois. Une phrase qui se déplace de sa propre hauteur est un effet ;
 * une phrase qui se pose de huit pixels est une phrase qui se pose.
 */
const DERIVE_PX = 8;

/** Rayon du halo, à sa pleine ouverture. */
const HALO_RAYON = "26vmax";

/** Sans mouvement pendant ce temps, le halo se met à dériver seul. */
const INACTION_MS = 2000;

/** Rattrapage du halo vers sa cible, par cadre de référence. */
const HALO_SUIVI = 0.085;

/**
 * La dérive : une somme de sinusoïdes dont les périodes n'ont pas de commun
 * multiple. Le trajet ne se referme donc jamais sur lui-même et ne se laisse pas
 * anticiper — c'est le motif du curseur fantôme du bassin, à la même fin.
 */
function derive(temps: number): { x: number; y: number } {
  return {
    x: 0.5 + 0.3 * Math.sin(temps * 0.37) + 0.11 * Math.sin(temps * 0.91 + 1.7),
    y: 0.5 + 0.21 * Math.sin(temps * 0.53 + 0.6) + 0.08 * Math.sin(temps * 1.13 + 2.4),
  };
}

export function Vestibule() {
  const enWebgl = useRig() !== null;
  const { mouvementReduit, capacites, degrade } = useMouvement();
  const { reglerEau, couperNappes } = useSon();

  const courseRef = useRef<HTMLDivElement>(null);
  const cadreRef = useRef<HTMLDivElement>(null);
  const lumiereRef = useRef<HTMLParagraphElement>(null);
  const ancreBassin = useRef<HTMLDivElement>(null);

  /* L'état du bassin vit dans une ref : le pointeur bouge soixante fois par
     seconde, le passer par `useState` reconstruirait l'arbre à chaque geste.
     Le shader le lit au cadre. */
  const etatBassin = useRef<EtatBassin>({ pointeur: null, clics: 0 });

  const grossier = capacites.pointeurGrossier;

  /* ---- Le halo de la lumière ---- */
  useEffetVisuel(() => {
    const lumiere = lumiereRef.current;
    if (lumiere === null) return;

    /* En mouvement réduit, le mot est simplement éclairé en entier : le halo
       n'a pas de raison d'être, et la feuille de style s'en charge. */
    if (mouvementReduit) return;

    let sourisX = innerWidth * 0.5;
    let sourisY = innerHeight * 0.5;
    let x = sourisX;
    let y = sourisY;
    let dernierGeste = grossier ? -Infinity : performance.now();

    const surMouvement = (e: PointerEvent) => {
      sourisX = e.clientX;
      sourisY = e.clientY;
      dernierGeste = performance.now();
    };
    addEventListener("pointermove", surMouvement, { passive: true });

    /* Le halo n'existe que dans son chapitre. Sans cette garde, il écrirait deux
       propriétés personnalisées par frame pendant tout le reste du site — une
       invalidation de style pour rien, à soixante hertz. */
    let visible = false;
    const observateur = new IntersectionObserver(
      (entrees) => {
        visible = entrees.some((entree) => entree.isIntersecting);
      },
      { threshold: 0 },
    );
    observateur.observe(lumiere);

    /* Écriture seule, en phase de rendu. Le cadre est collé en haut du viewport
       et pleine largeur : les coordonnées du pointeur sont directement celles du
       repère de peinture du dégradé. */
    const desRendu = inscrire("rendu", (temps, delta) => {
      if (!visible) return;
      const inactif = performance.now() - dernierGeste > INACTION_MS;
      let cibleX = sourisX;
      let cibleY = sourisY;
      if (grossier || inactif) {
        const d = derive(temps);
        cibleX = d.x * innerWidth;
        cibleY = d.y * innerHeight;
      }
      x = rattraper(x, cibleX, HALO_SUIVI, delta);
      y = rattraper(y, cibleY, HALO_SUIVI, delta);
      lumiere.style.setProperty("--halo-x", `${x}px`);
      lumiere.style.setProperty("--halo-y", `${y}px`);
    });

    return () => {
      removeEventListener("pointermove", surMouvement);
      observateur.disconnect();
      desRendu();
    };
  }, [mouvementReduit, grossier]);

  /* ---- La séquence ---- */
  useEffetVisuel(() => {
    const course = courseRef.current;
    const cadre = cadreRef.current;
    const ancre = ancreBassin.current;
    if (course === null || cadre === null) return;

    /* En mouvement réduit, la séquence n'existe pas : les sept temps sont
       simplement posés les uns sous les autres, le mot est éclairé en entier et
       le bassin montre sa plaque. La composition tient sans le mouvement —
       c'est une version, pas une punition. */
    if (mouvementReduit) return;

    const contexte = gsap.context(() => {
      const ligne = (nom: string) =>
        cadre.querySelector<HTMLElement>(`[data-temps="${nom}"] .vestibule__ligne`);

      const un = ligne("un");
      const deux = ligne("deux");
      const cinq = ligne("cinq");
      const sept = ligne("sept");
      const lumiere = lumiereRef.current;
      const voile = cadre.querySelector<HTMLElement>(".vestibule__voile");
      const marge = cadre.querySelector<HTMLElement>(".vestibule__marge");
      const autour = cadre.querySelectorAll<HTMLElement>(".vestibule__autour");
      const silence = cadre.querySelector<HTMLElement>(".vestibule__silence");

      /* L'état de départ : toutes les phrases absentes, le fond en encre,
         l'eau hors du cadre par le bas. */
      const cache = { y: DERIVE_PX, opacity: 0 };
      gsap.set(
        [un, deux, cinq, sept].filter((n): n is HTMLElement => n !== null),
        cache,
      );
      if (silence !== null) gsap.set(silence, { opacity: 1 });
      if (lumiere !== null) gsap.set(lumiere, { "--halo-rayon": "0vmax" });
      if (voile !== null) gsap.set(voile, { "--nuit": 1, "--eau": 0 });
      if (ancre !== null) gsap.set(ancre, { yPercent: 100 });

      /* Le passage du son et de l'interactivité de l'eau. Ni l'un ni l'autre
         n'est une animation : ce sont deux bascules, franchies une fois dans
         chaque sens, sur des seuils qui encadrent la montée et la descente. */
      let eauTenue = false;
      const basculerEau = (avancee: number) => {
        const dans = avancee > EAU_DEBUT && avancee < EAU_FIN;
        if (dans === eauTenue) return;
        eauTenue = dans;
        couperNappes(dans);
        if (ancre !== null) ancre.dataset.actif = String(dans);
        /* En sortant, on rend le silence à l'eau : sans cela le dernier gain
           poussé par le pointeur resterait ouvert derrière nous. */
        if (!dans) reglerEau(null);
      };

      const tl = gsap.timeline({
        defaults: { ease: "power2.inOut" },
        scrollTrigger: {
          trigger: course,
          start: "top top",
          end: "bottom bottom",
          scrub: true,
          invalidateOnRefresh: true,
          onUpdate: (self) => basculerEau(self.progress),
          onLeaveBack: () => basculerEau(0),
          onLeave: () => basculerEau(1),
        },
      });

      /**
       * Une entrée. **Rien ne se découpe, rien ne monte derrière une arête,
       * rien ne se déflouté.** La phrase paraît, et se pose de huit pixels.
       *
       * C'est un retrait volontaire : la ligne masquée qui monte de 110 % avec
       * un flou qui se résorbe est *le* geste que produit n'importe quel
       * générateur sur n'importe quel manifeste. Il est spectaculaire une fois
       * et reconnaissable toujours. Ici la mise en scène est ailleurs — dans le
       * minutage, dans le noir, dans le halo — et le texte, lui, se contente
       * d'être là.
       */
      const entree = (
        cible: HTMLElement | null,
        [debut, fin]: readonly [number, number],
      ) => {
        if (cible === null) return;
        tl.to(
          cible,
          { y: 0, opacity: 1, duration: fin - debut, ease: "power2.out" },
          debut,
        );
      };

      /** Une sortie : la phrase s'efface, et remonte d'autant. */
      const sortie = (
        cible: HTMLElement | null,
        [debut, fin]: readonly [number, number],
      ) => {
        if (cible === null) return;
        tl.to(
          cible,
          {
            y: -DERIVE_PX,
            opacity: 0,
            duration: fin - debut,
            ease: "power2.in",
          },
          debut,
        );
      };

      /* Un — seul, il tient, il se retire. */
      entree(un, MINUTAGE.unEntree);
      sortie(un, MINUTAGE.unSortie);

      /* Deux. */
      entree(deux, MINUTAGE.deuxEntree);

      /* Trois — le fond s'assombrit jusqu'au noir complet, et « Je règle la »
         s'éteint **avec** lui : même début, même fin, même courbe. La couche
         technique part au même moment et ne revient pas : à partir d'ici,
         l'écran ne porte plus que le manifeste. */
      const [noirDebut, noirFin] = MINUTAGE.noir;
      const courseNoir = noirFin - noirDebut;
      if (voile !== null) {
        /* `power1.inOut` : le fond quitte l'encre sans à-coup et se pose sur le
           noir sans le heurter. Une courbe `in` faisait tomber la lumière d'un
           coup au milieu de la plage — c'était ça, la brutalité. */
        tl.to(
          voile,
          { "--nuit": 0, duration: courseNoir, ease: "power1.inOut" },
          noirDebut,
        );
      }
      if (deux !== null) {
        /* La phrase s'éteint **dans** la plage du noir, sur ses trois premiers
           quarts : elle a disparu quand le fond finit de descendre, si bien
           qu'on ne voit jamais l'un attendre l'autre. */
        tl.to(
          deux,
          {
            opacity: 0,
            duration: courseNoir * 0.75,
            ease: "power1.inOut",
          },
          noirDebut,
        );
      }
      if (marge !== null) {
        tl.to(
          marge,
          { opacity: 0, duration: courseNoir * 0.5, ease: "power1.inOut" },
          noirDebut,
        );
      }

      /* Quatre — le halo s'ouvre. Le mot était déjà là, dans le noir. */
      if (lumiere !== null) {
        const [ld, lf] = MINUTAGE.lumiereEntree;
        tl.to(
          lumiere,
          { "--halo-rayon": HALO_RAYON, duration: lf - ld, ease: "power2.out" },
          ld,
        );
        const [sd, sf] = MINUTAGE.lumiereSortie;
        tl.to(
          lumiere,
          { "--halo-rayon": "0vmax", duration: sf - sd, ease: "power2.in" },
          sd,
        );
      }

      /* Cinq. */
      entree(cinq, MINUTAGE.cinqEntree);

      /* Six — tout disparaît sauf « silence ». Le mot ne bouge pas : c'est ce
         qui l'entoure qui s'en va, et il reste à sa place dans la phrase. */
      const [rd, rf] = MINUTAGE.reduction;
      if (autour.length > 0) {
        tl.to(
          autour,
          { opacity: 0, duration: rf - rd, ease: "power2.in" },
          rd,
        );
      }

      /* Six, suite — le bassin monte. Le voile se rétracte par le haut pendant
         que l'ancre remonte du bas : les deux sont sur la même course et la
         même courbe, donc la ligne de partage est exacte au pixel. C'est ce
         qui donne l'eau qui *monte*, et non l'eau qu'on découvre. */
      const [ed, ef] = MINUTAGE.eauMontee;
      if (voile !== null) {
        tl.to(voile, { "--eau": 1, duration: ef - ed, ease: "none" }, ed);
      }
      if (ancre !== null) {
        tl.to(ancre, { yPercent: 0, duration: ef - ed, ease: "none" }, ed);
      }

      /* Sept — l'eau redescend, exactement comme elle est montée. */
      const [xd, xf] = MINUTAGE.eauSortie;
      if (voile !== null) {
        tl.to(voile, { "--eau": 0, duration: xf - xd, ease: "none" }, xd);
      }
      if (ancre !== null) {
        tl.to(ancre, { yPercent: 100, duration: xf - xd, ease: "none" }, xd);
      }
      if (silence !== null) {
        tl.to(
          silence,
          { opacity: 0, duration: (xf - xd) * 0.5, ease: "power2.in" },
          xd,
        );
      }
      /* Le noir rend la main à l'encre : le site reprend son régime. */
      if (voile !== null) {
        tl.to(voile, { "--nuit": 1, duration: xf - xd, ease: "power2.out" }, xd);
      }

      entree(sept, MINUTAGE.septEntree);

      /* La ligne dure exactement 1 : sans cette borne, GSAP la clôturerait sur
         le dernier tween et le septième temps n'aurait pas son air. */
      tl.set(cadre, {}, 1);
    }, cadre);

    return () => {
      contexte.revert();
      /* On ne laisse jamais le site muet derrière soi. */
      couperNappes(false);
      reglerEau(null);
    };
  }, [mouvementReduit, couperNappes, reglerEau]);

  /* ------------------------------------------------------------------
     Mouvement réduit : le manifeste posé
     ------------------------------------------------------------------
     Pas une séquence dont on aurait retiré le mouvement — un autre objet, plus
     court, qui dit la même chose. Le manifeste tient d'un bloc sur la colonne 2,
     le mot *lumière* est en italique (le seul du site à l'être, et c'est la
     lumière), et le bassin est la plaque calculée, plein cadre, sans simulation.
     C'est une version, pas une punition. */
  if (mouvementReduit) {
    return (
      <section
        className="vestibule vestibule--pose"
        data-chapitre="Le Vestibule"
        aria-labelledby="vestibule-titre"
      >
        <h2 className="sr-only" id="vestibule-titre">
          Le vestibule
        </h2>

        <div className="vestibule__pose grille">
          <p className="vestibule__manifeste display">
            Je ne décore pas. Je règle la <em>lumière</em>, la matière et le
            silence. Le reste appartient aux gens qui vivent là.
          </p>
          <p className="vestibule__signature technique">Camille Rouvière</p>
          <aside className="vestibule__marge technique">
            <p>Atelier fondé 2011 — Paris VII</p>
            <p>Cinq chantiers par an</p>
          </aside>
        </div>

        <div className="vestibule__plaque">
          <Image
            className="vestibule__repli"
            src={bassin.repli}
            width={bassin.largeurRepli}
            height={bassin.hauteurRepli}
            alt="Le bassin, vu à plat. La surface porte quelques ondes."
            sizes="100vw"
          />
          <p className="vestibule__technique technique">{bassin.technique}</p>
        </div>
      </section>
    );
  }

  return (
    <section
      className="vestibule"
      data-chapitre="Le Vestibule"
      aria-labelledby="vestibule-titre"
    >
      <h2 className="sr-only" id="vestibule-titre">
        Le vestibule
      </h2>

      {/* La séquence fragmente le manifeste en sept temps : il est donné ici
          d'un seul tenant, dans l'ordre, pour être lu intact. Les couches
          visuelles qui suivent en sont la mise en scène, et rien d'autre. */}
      <p className="sr-only">
        Je ne décore pas. Je règle la lumière, la matière et le silence. Le reste
        appartient aux gens qui vivent là. Camille Rouvière.
      </p>

      <div
        className="vestibule__course"
        ref={courseRef}
        style={{ "--temps": TEMPS } as React.CSSProperties}
      >
        <div className="vestibule__cadre" ref={cadreRef} aria-hidden="true">
          {/* L'eau. Elle attend sous le cadre et monte au sixième temps.
              Hors de sa plage, elle ne capte pas le pointeur — et son ancre
              étant hors du viewport, le rig suspend la simulation. */}
          <div
            className="vestibule__bassin"
            ref={ancreBassin}
            data-webgl={enWebgl}
            data-actif="false"
            onPointerMove={(e) => {
              etatBassin.current.pointeur = { x: e.clientX, y: e.clientY };
            }}
            onPointerLeave={() => {
              etatBassin.current.pointeur = null;
            }}
            onPointerDown={() => {
              etatBassin.current.clics += 1;
            }}
          >
            {/* Le repli : plaque du bassin, calculée avec les équations du
                shader. Elle reste visible tant que le moteur n'a pas pris la
                main, et définitivement sans WebGL2. */}
            <Image
              className="vestibule__repli"
              src={bassin.repli}
              width={bassin.largeurRepli}
              height={bassin.hauteurRepli}
              alt=""
              sizes="100vw"
              data-cache={enWebgl && !degrade}
            />

            {/* La vitesse du pointeur sur l'eau sort de la simulation et entre
                dans le son : c'est la même grandeur qui creuse l'onde et qui
                ouvre le gain. On n'entend jamais autre chose que ce qu'on
                voit. */}
            <SceneBassin
              ancre={ancreBassin}
              etat={etatBassin}
              repli={bassin.repli}
              onVitesse={reglerEau}
            />
          </div>

          {/* Le fond. Un seul élément, deux scalaires : `--nuit` l'éteint de
              l'encre au noir complet, `--eau` le rétracte par le haut pour
              laisser monter le bassin. */}
          <div className="vestibule__voile" />

          {/* Le mot, et le halo qui le découvre. Le dégradé est peint sur toute
              la surface du cadre et découpé par les lettres : il n'y a rien
              d'autre à l'écran, et surtout aucun objet lumineux. Il est un
              enfant direct du cadre, sans marge intercalée, pour que son repère
              de peinture soit exactement celui du pointeur. */}
          <p className="vestibule__lumiere" ref={lumiereRef}>
            <span className="vestibule__lumiere-mot">lumière</span>
          </p>

          <div className="vestibule__bloc">
            <p className="vestibule__temps display" data-temps="un">
              <span className="vestibule__ligne">Je ne décore pas.</span>
            </p>

            <p className="vestibule__temps display" data-temps="deux">
              <span className="vestibule__ligne">Je règle la</span>
            </p>

            <p className="vestibule__temps display" data-temps="cinq">
              <span className="vestibule__ligne">
                <span className="vestibule__autour">la matière et le </span>
                <span className="vestibule__silence">silence</span>
                <span className="vestibule__autour">.</span>
              </span>
            </p>

            <p className="vestibule__temps display" data-temps="sept">
              <span className="vestibule__ligne">
                Le reste appartient aux gens qui vivent là.
              </span>
            </p>
          </div>

          {/* La couche technique traîne dans la marge droite — jusqu'au noir du
              troisième temps, qui l'emporte avec le reste. */}
          <aside className="vestibule__marge technique">
            <p>Atelier fondé 2011 — Paris VII</p>
            <p>Cinq chantiers par an</p>
          </aside>
        </div>
      </div>
    </section>
  );
}
