"use client";

import { useRef } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import { gsap } from "@/lib/gsap";
import { bassin } from "@/data/matieres";
import { MANIFESTE, PART_ALLUMAGE, PLAN_ALLUME } from "@/data/manifeste";
import { useRig } from "@/components/gl/Rig";
import type { EtatBassin } from "@/components/gl/materiaux/bassin";
import { useMouvement } from "@/components/motion/MotionProvider";
import { useSon } from "@/components/chrome/SonProvider";
import { useEffetVisuel } from "@/lib/isomorphe";
import { useSequence } from "./useSequence";
import "./vestibule.css";

/**
 * Le Vestibule. Le cœur du site.
 *
 * Une **séquence en sept temps**, entièrement pilotée au défilement, où le
 * manifeste de Camille Rouvière se dit un morceau à la fois. Rien n'apparaît
 * d'un bloc, rien ne se joue à la minuterie : tout est en scrub, donc tout se
 * rembobine.
 *
 * ## Le décor : un appartement qui s'allume
 *
 * Le chapitre ne se joue plus sur un aplat d'encre qu'un voile éteignait, et il
 * n'y a plus de halo de curseur. **Le décor est un plan de huit secondes dans un
 * appartement obscur dont les lumières se lèvent à 2,8 s**, et c'est lui qui
 * porte toute la lumière du chapitre. On arrive sur sa première image, on
 * traverse le noir de la pièce pendant les deux premières phrases, et à l'index
 * exact de l'allumage — `PART_ALLUMAGE`, calculé, jamais estimé — le mot LUMIÈRE
 * se lève au centre, avec la pièce. Pas avant, pas après.
 *
 * Le plan n'est **pas** un élément vidéo dont on forcerait le `currentTime` :
 * c'est une séquence de frames AVIF redessinée sur un canvas 2D, l'index piloté
 * par le même scrub que le reste (voir `useSequence`, qui dit pourquoi). La
 * molette donne donc un contrôle continu — on avance, on recule, on accélère —
 * et la pièce s'allume et s'éteint sous la main.
 *
 * ## Ce qui rend le manifeste lisible, et ce qui ne l'aurait pas rendu
 *
 * Le décor passe de l'obscurité totale à un séjour éclairé au milieu du
 * chapitre : la lisibilité des phrases est un vrai problème, et il a une vraie
 * solution. Ce n'est pas `mix-blend-mode: difference`, qui a été essayé ici et
 * qui est faux — le négatif est **aveugle sur un fond de luminance moyenne** :
 * la craie sur un mi-gris rend un mi-gris. Or la bande où s'écrivent les phrases
 * sort précisément à une luminance moyenne une fois la pièce allumée. Le mot
 * disparaîtrait au meilleur moment du chapitre.
 *
 * C'est l'**exposition du plan** qui règle la question, et elle la règle une
 * fois pour toutes : le film est rendu à un peu plus de la moitié de sa lumière
 * (voir `vestibule.css`). La craie y tient largement le seuil AA, et la pièce a
 * l'exposition d'une photographie d'architecture plutôt que d'une brochure. Le
 * saut de l'allumage n'y perd rien — ce qu'on lit est un rapport, pas une
 * valeur.
 *
 * Un seul mot se mélange encore, et c'est le seul qui en ait besoin : *silence*,
 * qui tient sur l'eau, c'est-à-dire sur une surface qu'on ne contrôle pas.
 *
 * ## Le mot LUMIÈRE
 *
 * Il arrive au centre, en très grand, en `difference`, et son apparition est
 * **celle du logotype au seuil** : opacité 0 → 1, échelle 1,06 → 1, flou 10 px
 * → 0, en `--e-sortie`. Le site n'a qu'un geste d'apparition monumentale ; il
 * s'en sert deux fois, aux deux seuls endroits où un mot seul tient l'écran.
 *
 * Le centrage est la seule autre exception à la règle « rien n'est centré » du
 * Livre I, et elle est délibérée : c'est la citation du seuil qui la justifie,
 * pas un réflexe de mise en page.
 *
 * ## Les sept temps
 *
 *   **Un.**   « Je ne décore pas. » paraît seul, tient, puis se retire.
 *   **Deux.** « Je règle la » paraît, et **reste** : la phrase attend son mot.
 *   **Trois.** La pièce s'allume. Le mot LUMIÈRE se lève au centre.
 *   **Quatre.** Les deux se retirent ensemble — la phrase est dite.
 *   **Cinq.** « la matière et le silence. » paraît à la place de la première.
 *   **Six.**  Tout disparaît sauf le mot « silence », qui reste seul et à sa
 *             place dans la phrase. Puis le bassin monte en plein écran
 *             derrière lui, et la nappe d'ambiance se coupe : il ne reste que
 *             l'eau.
 *   **Sept.** L'eau redescend, « Le reste appartient aux gens qui vivent là. »
 *             paraît, et le site reprend.
 *
 * ## Le bassin
 *
 * Il vient de *La Matière*, qui n'en garde rien. Il n'existe qu'**une seule
 * scène d'eau dans tout le site**, et c'est celle-ci — la seule scène WebGL
 * lourde du projet depuis que le verre a quitté la sortie.
 *
 * Le plan de la pièce joue ici le rôle qu'avait le voile : c'est lui qui couvre
 * le cadre, et c'est en le rétractant par le bas (`--eau`) qu'on laisse monter
 * l'eau, en lock-step avec la remontée de son ancre. La ligne de partage est
 * exacte : l'eau *monte*, elle n'est pas découverte.
 *
 * **`SceneBassin` est un frère de l'ancre, jamais son enfant.** React attache la
 * ref d'un élément *après* avoir exécuté les effets de ses descendants : une
 * scène montée sous son ancre trouve `null` au moment de s'inscrire. Le piège ne
 * se voyait qu'au second passage — au premier, l'import dynamique arrivait en
 * retard et sauvait la mise. `useGLProxy` a désormais son filet, mais l'ordre
 * correct est celui-ci, et c'est celui de tous les autres chapitres.
 *
 * Grammaire de mouvement : **le temps qu'on remonte**. Le hero qui précède
 * s'éteint sans bouger, l'enfilade qui suit traverse latéralement ; ici rien ne
 * se déplace à l'écran, c'est un plan filmé qu'on parcourt dans les deux sens.
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
 *
 * Une seule valeur n'est pas choisie : celle de l'allumage. Elle vient du
 * fichier, par `PART_ALLUMAGE`.
 */
const MINUTAGE = {
  unEntree: [0.0, 0.06],
  unSortie: [0.11, 0.15],
  deuxEntree: [0.17, 0.23],
  /** La couche technique s'efface avant l'allumage, et ne revient pas. */
  margeSortie: [0.26, 0.31],
  /**
   * Le mot LUMIÈRE. Son début **est** l'index de l'allumage : il se lève avec
   * la pièce. La plage est courte — c'est une apparition de générique, pas une
   * montée en fondu.
   */
  lumiereEntree: [PART_ALLUMAGE, PART_ALLUMAGE + 0.055],
  /** « Je règle la » se retire, puis la lumière avec elle : la phrase est dite. */
  deuxSortie: [0.41, 0.46],
  lumiereSortie: [0.44, 0.5],
  cinqEntree: [0.47, 0.53],
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

export function Vestibule() {
  const enWebgl = useRig() !== null;
  const { mouvementReduit, degrade } = useMouvement();
  const { reglerEau, couperNappes } = useSon();

  const courseRef = useRef<HTMLDivElement>(null);
  const cadreRef = useRef<HTMLDivElement>(null);
  const filmRef = useRef<HTMLCanvasElement>(null);
  const lumiereRef = useRef<HTMLParagraphElement>(null);
  const ancreBassin = useRef<HTMLDivElement>(null);

  /* L'état du bassin vit dans une ref : le pointeur bouge soixante fois par
     seconde, le passer par `useState` reconstruirait l'arbre à chaque geste.
     Le shader le lit au cadre. */
  const etatBassin = useRef<EtatBassin>({ pointeur: null, clics: 0 });

  /* Le plan de la pièce. Le hook charge et peint ; c'est la timeline ci-dessous
     qui écrit l'index, comme elle écrit tout le reste du chapitre. */
  const film = useSequence(filmRef, cadreRef, MANIFESTE, {
    actif: !mouvementReduit,
  });

  /* ---- La séquence ---- */
  useEffetVisuel(() => {
    const course = courseRef.current;
    const cadre = cadreRef.current;
    const ancre = ancreBassin.current;
    const plan = filmRef.current;
    if (course === null || cadre === null) return;

    /* En mouvement réduit, la séquence n'existe pas : les sept temps sont
       simplement posés les uns sous les autres, la pièce est montrée allumée et
       le bassin montre sa plaque. La composition tient sans le mouvement —
       c'est une version, pas une punition. */
    if (mouvementReduit) return;

    const index = film.index;

    const contexte = gsap.context(() => {
      const ligne = (nom: string) =>
        cadre.querySelector<HTMLElement>(`[data-temps="${nom}"] .vestibule__ligne`);

      const un = ligne("un");
      const deux = ligne("deux");
      const cinq = ligne("cinq");
      const sept = ligne("sept");
      const mot = lumiereRef.current?.querySelector<HTMLElement>(
        ".vestibule__lumiere-mot",
      ) ?? null;
      const marge = cadre.querySelector<HTMLElement>(".vestibule__marge");
      const autour = cadre.querySelectorAll<HTMLElement>(".vestibule__autour");
      const silence = cadre.querySelector<HTMLElement>(".vestibule__silence");

      /* L'état de départ : toutes les phrases absentes, le mot éteint, la
         pièce sur sa première image, l'eau hors du cadre par le bas. */
      const cache = { y: DERIVE_PX, opacity: 0 };
      gsap.set(
        [un, deux, cinq, sept].filter((n): n is HTMLElement => n !== null),
        cache,
      );
      if (silence !== null) gsap.set(silence, { opacity: 1 });
      if (mot !== null) {
        gsap.set(mot, { opacity: 0, scale: 1.06, filter: "blur(10px)" });
      }
      if (plan !== null) gsap.set(plan, { "--eau": 0 });
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

      /* ---- Le plan de la pièce, d'un bout à l'autre de la course ----
         Un relais linéaire, et rien d'autre : l'index suit la course au
         prorata, ce qui met l'allumage à `PART_ALLUMAGE` par construction. Une
         courbe ici décalerait le repère et il faudrait le recalculer. */
      const dernierIndex = MANIFESTE.nombre - 1;
      const relais = { p: 0 };
      tl.to(
        relais,
        {
          p: 1,
          duration: 1,
          ease: "none",
          onUpdate: () => {
            index.current = Math.min(
              dernierIndex,
              Math.max(0, Math.round(relais.p * dernierIndex)),
            );
          },
        },
        0,
      );

      /**
       * Une entrée. **Rien ne se découpe, rien ne monte derrière une arête,
       * rien ne se déflouté.** La phrase paraît, et se pose de huit pixels.
       *
       * C'est un retrait volontaire : la ligne masquée qui monte de 110 % avec
       * un flou qui se résorbe est *le* geste que produit n'importe quel
       * générateur sur n'importe quel manifeste. Il est spectaculaire une fois
       * et reconnaissable toujours. Ici la mise en scène est ailleurs — dans le
       * minutage, dans la pièce qui s'allume — et le texte, lui, se contente
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

      /* Deux — il paraît, et il attend son mot. */
      entree(deux, MINUTAGE.deuxEntree);

      /* La couche technique part avant l'allumage et ne revient pas : à partir
         de là, l'écran ne porte plus que le manifeste. */
      if (marge !== null) {
        const [md, mf] = MINUTAGE.margeSortie;
        tl.to(marge, { opacity: 0, duration: mf - md, ease: "power1.inOut" }, md);
      }

      /* Trois — la pièce s'allume, et le mot avec elle. L'apparition est celle
         du logotype au seuil : opacité, échelle et flou, en `--e-sortie`. Elle
         est portée par le mot et non par le nœud qui se mélange — voir
         l'en-tête. */
      if (mot !== null) {
        const [ld, lf] = MINUTAGE.lumiereEntree;
        tl.to(
          mot,
          {
            opacity: 1,
            scale: 1,
            filter: "blur(0px)",
            duration: lf - ld,
            ease: "expo.out",
          },
          ld,
        );
        const [sd, sf] = MINUTAGE.lumiereSortie;
        tl.to(
          mot,
          {
            opacity: 0,
            scale: 1.02,
            filter: "blur(6px)",
            duration: sf - sd,
            ease: "power2.in",
          },
          sd,
        );
      }

      /* Quatre — « Je règle la » se retire. */
      sortie(deux, MINUTAGE.deuxSortie);

      /* Cinq. */
      entree(cinq, MINUTAGE.cinqEntree);

      /* Six — tout disparaît sauf « silence ». Le mot ne bouge pas : c'est ce
         qui l'entoure qui s'en va, et il reste à sa place dans la phrase. */
      const [rd, rf] = MINUTAGE.reduction;
      if (autour.length > 0) {
        tl.to(autour, { opacity: 0, duration: rf - rd, ease: "power2.in" }, rd);
      }

      /* Six, suite — le bassin monte. Le plan se rétracte par le haut pendant
         que l'ancre remonte du bas : les deux sont sur la même course et la
         même courbe, donc la ligne de partage est exacte au pixel. C'est ce
         qui donne l'eau qui *monte*, et non l'eau qu'on découvre. */
      const [ed, ef] = MINUTAGE.eauMontee;
      if (plan !== null) {
        tl.to(plan, { "--eau": 1, duration: ef - ed, ease: "none" }, ed);
      }
      if (ancre !== null) {
        tl.to(ancre, { yPercent: 0, duration: ef - ed, ease: "none" }, ed);
      }

      /* Sept — l'eau redescend, exactement comme elle est montée, et la pièce
         allumée reprend le cadre. */
      const [xd, xf] = MINUTAGE.eauSortie;
      if (plan !== null) {
        tl.to(plan, { "--eau": 0, duration: xf - xd, ease: "none" }, xd);
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
  }, [mouvementReduit, couperNappes, reglerEau, film.index]);

  /* ------------------------------------------------------------------
     Mouvement réduit : le manifeste posé
     ------------------------------------------------------------------
     Pas une séquence dont on aurait retiré le mouvement — un autre objet, plus
     court, qui dit la même chose. Le manifeste tient d'un bloc sur la colonne 2,
     le mot *lumière* est en italique (le seul du site à l'être, et c'est la
     lumière), puis les deux plans du chapitre sont donnés en plaques : la pièce
     allumée, et le bassin calculé. C'est une version, pas une punition. */
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
            src={PLAN_ALLUME.src}
            width={PLAN_ALLUME.largeur}
            height={PLAN_ALLUME.hauteur}
            alt={PLAN_ALLUME.alt}
            sizes="100vw"
          />
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
          {/* Le décor : l'appartement, image par image. C'est aussi la seule
              surface opaque du cadre — le canvas du rig est fixe *derrière* la
              page, et c'est en rétractant ce plan-ci qu'on découvre l'eau. */}
          <canvas className="vestibule__film" ref={filmRef} />

          {/* L'eau. Elle attend sous le cadre et monte au sixième temps.
              Hors de sa plage, son ancre n'a pas de boîte : l'observateur
              d'intersection la déclare hors champ et le rig suspend la
              simulation. */}
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
          </div>

          {/* L'inscription WebGL est un **frère** de l'ancre, jamais son
              enfant : la ref d'un élément est attachée après les effets de ses
              descendants. Voir l'en-tête. */}
          <SceneBassin
            ancre={ancreBassin}
            etat={etatBassin}
            repli={bassin.repli}
            onVitesse={reglerEau}
          />

          {/* Le mot, au centre, en négatif de la pièce. Son apparition est
              celle du logotype au seuil ; elle est portée par le mot, le blend
              par le paragraphe. */}
          <p className="vestibule__lumiere display-monument" ref={lumiereRef}>
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

          {/* La couche technique traîne dans la marge droite — jusqu'à
              l'allumage, qui l'emporte avec lui. */}
          <aside className="vestibule__marge technique">
            <p>Atelier fondé 2011 — Paris VII</p>
            <p>Cinq chantiers par an</p>
          </aside>
        </div>
      </div>
    </section>
  );
}
