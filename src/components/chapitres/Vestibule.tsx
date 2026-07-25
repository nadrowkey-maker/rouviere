"use client";

import { useRef } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { bassin } from "@/data/matieres";
import { MANIFESTE, PART_ALLUMAGE, PLAN_ALLUME } from "@/data/manifeste";
import { useRig } from "@/components/gl/Rig";
import type { EtatBassin } from "@/components/gl/materiaux/bassin";
import { useMouvement } from "@/components/motion/MotionProvider";
import { useSon } from "@/components/chrome/SonProvider";
import { useLangue } from "@/i18n/LangueProvider";
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
 * ## Deux temps qui ne se mêlent pas, et la charnière entre eux
 *
 * C'est la structure du chapitre, et elle a été corrigée : la suite du manifeste
 * se disait **par-dessus** le séjour éclairé, les deux sections se recouvraient.
 * Elles se suivent maintenant, et `FILM_FIN` est la charnière.
 *
 * **Le plan, d'abord, consommé d'un bout à l'autre.**
 *
 *   **Un.**   « Je ne décore pas. » paraît en haut à gauche, dans la pièce
 *             obscure, tient, puis se retire.
 *   **Deux.** « Je règle la » paraît au même endroit, tient, et **cède au mot
 *             pendant que la lumière monte** : la phrase annonce, le mot arrive.
 *   **Trois.** À l'image exacte de l'allumage, LUMIÈRE se lève au centre — et il
 *             **reste jusqu'à la dernière image du plan**. Pendant toute la
 *             traversée du séjour éclairé, il n'y a que lui à l'écran.
 *
 * **L'extinction**, ensuite : le plan est fini, on baisse la lumière de la pièce
 * jusqu'au noir complet, et le mot sort avec elle — en dernier, et au plus clair,
 * puisqu'un négatif flambe sur un fond qui tombe.
 *
 * **Le noir, enfin, et rien d'autre dedans.**
 *
 *   **Quatre.** « la matière et le silence. » paraît, au centre cette fois.
 *   **Cinq.**  Tout disparaît sauf le mot « silence », qui reste seul et à sa
 *             place dans la phrase. Puis le bassin monte en plein écran derrière
 *             lui, et la nappe d'ambiance se coupe : il ne reste que l'eau.
 *   **Six.**   L'eau redescend, « Le reste appartient aux gens qui vivent là. »
 *             paraît, et le site reprend.
 *
 * ## Le raccord avec le hero : on ne descend pas vers le plan
 *
 * `.vestibule` remonte d'une hauteur de fenêtre sur le hero. Sans ce
 * recouvrement, le voile du hero atteignait le noir complet, l'épinglage rendait
 * la main, et il fallait encore traverser un plein écran noir avant que le cadre
 * ne se colle en haut — on *descendait* vers le plan. Il est désormais là à
 * l'instant où le hero s'éteint, et il n'y a rien entre les deux. Le cadre n'est
 * posé qu'à partir de ce moment (`data-pose`), sans quoi il couvrirait la vidéo
 * du hero par le bas pendant toute sa course.
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

/**
 * Écrans de course de la séquence. La hauteur du chapitre en descend.
 *
 * Quatorze, et non plus neuf. Le chapitre porte maintenant deux temps entiers
 * qui ne se recouvrent pas — le plan filmé consommé d'un bout à l'autre, puis
 * le noir et l'eau — et chacun a besoin de sa course. La densité du plan en
 * dépend aussi : cent quatre-vingt-douze images sur près de huit écrans font un
 * pas d'environ trente-sept pixels, ce qui donne à la molette un contrôle
 * continu au lieu d'un saut d'image tous les crans.
 */
const TEMPS = 15;

/**
 * Où s'arrête le plan filmé. **C'est la charnière du chapitre.**
 *
 * Avant : la pièce, du noir à la pleine lumière, et rien d'autre à l'écran que
 * les deux premières phrases puis le mot LUMIÈRE. Après : le noir, et la suite
 * du manifeste. Les deux temps ne se mêlent jamais — c'est ce qui n'allait pas,
 * et c'est réglé ici plutôt que par des minutages qu'on rapièce.
 *
 * L'index de l'allumage étant mappé linéairement sur `[0, FILM_FIN]`, cette
 * valeur commande aussi l'instant où le mot se lève : `PART_ALLUMAGE × FILM_FIN`.
 */
const FILM_FIN = 0.62;

/** L'instant, en part de la course, où la pièce s'allume. Calculé, pas choisi. */
const ALLUMAGE = PART_ALLUMAGE * FILM_FIN;

/**
 * Le minutage, en parts de la course. Il est écrit ici, en toutes lettres, et
 * pas dérivé d'un pas régulier : c'est un montage, et un montage se décide.
 * Chaque paire est un intervalle [début, fin].
 *
 * Une seule valeur n'est pas choisie : celle de l'allumage.
 *
 * **Les deux premières phrases vivent dans la pièce obscure, et n'en sortent
 * pas.** Ce n'est pas une élégance : le plafond de l'appartement s'éclaire par
 * une corniche et deux lustres, et la bande haut-gauche passe d'une luminance de
 * 21 à 139 entre les images 75 et 110. Une phrase posée là ne survivrait pas à
 * l'allumage. « Je règle la » se retire donc **pendant** que la lumière monte —
 * la phrase cède au mot qu'elle annonce, et elle a disparu à l'image 75, juste
 * avant que le plafond ne prenne.
 */
const MINUTAGE = {
  /**
   * **L'allumage du plan lui-même**, à ne pas confondre avec celui de la pièce.
   *
   * Le cadre se pose à l'instant exact où le voile du hero atteint le noir, mais
   * il se posait *à pleine exposition* : la première image, une pièce obscure où
   * l'on distingue tout de même une baie et des lumières de ville, arrivait d'un
   * coup sur du noir plein. Le raccord était juste, l'apparition ne l'était pas.
   *
   * Le plan monte donc du noir sur les premiers centièmes de la course. Deux
   * conséquences, et les deux sont bonnes : le basculement de `data-pose` se
   * fait de noir à noir, donc il est strictement invisible ; et le chapitre
   * s'ouvre par une pièce qui émerge au lieu d'une image qu'on allume. C'est le
   * pendant exact de l'extinction qui le referme.
   *
   * **La courbe compte autant que la plage, et c'est ce qui manquait.** La
   * montée était en `power2.out`, qui se jette : au dixième de sa course elle
   * avait déjà rendu un cinquième de la lumière, et les quatre-vingt-dix pour
   * cent restants ne servaient plus à rien. On voyait donc encore la pièce
   * arriver d'un coup, sur une plage pourtant longue.
   *
   * C'est exactement la leçon déjà payée sur l'entrée du son (`emerger()` dans
   * `SonProvider`) : la perception ne suit pas la valeur. Une chose qui sort du
   * noir doit partir lentement, sans quoi elle ne sort pas du noir, elle y
   * apparaît. D'où `power2.in`, et une plage franchement longue.
   */
  ignition: [0.0, 0.045],
  /**
   * **La première phrase attend que la pièce soit là.**
   *
   * Elle entrait à 0,01, c'est-à-dire pendant que le plan montait encore du
   * noir : on lisait « Je ne décore pas » sur un écran presque vide, et la pièce
   * arrivait après, comme si elle rattrapait le texte. L'ordre est inverse — on
   * entre dans une pièce, *puis* quelqu'un parle.
   *
   * Son entrée commence donc après la fin de l'ignition, et non avant.
   */
  unEntree: [0.055, 0.082],
  unSortie: [0.112, 0.138],
  deuxEntree: [0.152, 0.178],
  /** La couche technique s'efface avant la lumière, et ne revient pas. */
  margeSortie: [0.145, 0.178],
  /** « Je règle la » cède au mot : la sortie enjambe l'allumage. */
  deuxSortie: [0.2125, 0.24],
  /**
   * Le mot LUMIÈRE. Son début **est** l'index de l'allumage : il se lève avec
   * la pièce. La plage est courte — c'est une apparition de générique, pas une
   * montée en fondu. Et il ne se retire pas : il tient jusqu'au bout du plan.
   */
  lumiereEntree: [ALLUMAGE, ALLUMAGE + 0.05],
  /**
   * L'extinction. Le plan est fini, la pièce s'éteint — et le mot avec elle,
   * un rien plus tard : la lumière est la dernière chose qui sort. Le négatif
   * flambe au passage, puisqu'il se calcule sur un fond qui tombe au noir.
   */
  extinction: [FILM_FIN, FILM_FIN + 0.055],
  lumiereSortie: [FILM_FIN + 0.015, FILM_FIN + 0.065],
  /** Dans le noir, et seulement là. */
  cinqEntree: [0.725, 0.768],
  /** Tout disparaît sauf « silence ». */
  reduction: [0.795, 0.828],
  eauMontee: [0.838, 0.878],
  eauSortie: [0.925, 0.958],
  septEntree: [0.948, 0.988],
} as const;

/** La séquence est en scrub : ces bornes disent où l'eau prend la main. */
const EAU_DEBUT = 0.818;
const EAU_FIN = 0.965;

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
  const { t, dire } = useLangue();

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
      /* Le plan part **absent**, pas seulement éteint : c'est ce qui rend le
         basculement de `data-pose` strictement invisible — on découvre l'encre
         du site, qui est ce que le voile du hero vient de poser — et ce qui
         donne au chapitre une pièce qui émerge plutôt qu'une image qui surgit. */
      if (plan !== null) gsap.set(plan, { "--eau": 0, opacity: 0 });
      if (ancre !== null) gsap.set(ancre, { yPercent: 100 });

      /* ---- Le cadre n'est là qu'à partir de son chapitre ----
       *
       * `.vestibule` remonte d'un écran sur le hero (voir `vestibule.css`) : le
       * cadre se colle donc au haut du viewport à l'instant exact où le voile du
       * hero atteint le plein noir, et non un écran plus bas. C'est ce qui
       * supprime le rectangle noir qu'on traversait entre les deux — on ne
       * descend plus vers le plan, il est là quand le hero s'éteint.
       *
       * Le revers du recouvrement : pendant toute la course épinglée du hero, le
       * cadre est déjà dans le viewport et le couvrirait par le bas. Il n'est
       * donc **posé** qu'à partir du moment où le chapitre commence. Avant, il
       * n'est pas là. Même mécanique qu'entre l'enfilade et *La Matière*. */
      const pose = ScrollTrigger.create({
        trigger: course,
        start: "top top",
        /* `max` et non la fin de la course : le cadre se décolle au dernier
           écran et remonte avec la page. Le cacher à cet instant ferait
           disparaître la dernière image sous les yeux. */
        end: "max",
        onToggle: (self) => {
          cadre.dataset.pose = self.isActive ? "true" : "false";
        },
      });
      cadre.dataset.pose = pose.isActive ? "true" : "false";

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

      /* ---- Le plan de la pièce : consommé d'un bout à l'autre, puis fini ----
         Un relais linéaire sur `[0, FILM_FIN]`, et rien d'autre : l'index suit
         la course au prorata, ce qui met l'allumage à `ALLUMAGE` par
         construction. Une courbe ici décalerait le repère et il faudrait le
         recalculer — et la molette perdrait son pas constant.

         Passé `FILM_FIN`, l'index reste sur la dernière image : la pièce est
         pleinement allumée, et c'est son extinction, plus bas, qui rend le
         cadre au noir. Le reste du manifeste se dit là-dedans. */
      const dernierIndex = MANIFESTE.nombre - 1;
      const relais = { p: 0 };
      tl.to(
        relais,
        {
          p: 1,
          duration: FILM_FIN,
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

      /* ---- La pièce monte du noir ----
       *
       * **Sur `opacity`, et plus sur l'exposition.** Le fondu a été manqué trois
       * fois, et la raison n'était pas la courbe : c'était la propriété. Faire
       * varier `brightness()` par une propriété personnalisée demande, à chaque
       * frame, un recalcul de style puis un refiltrage d'un canvas plein écran —
       * et il suffit que la propriété ne s'anime pas pour que la valeur saute
       * d'un bout à l'autre sans qu'aucune erreur ne le signale.
       *
       * `opacity` n'a aucun de ces défauts. Elle est composée sur le GPU, donc
       * le fondu est gratuit ; et c'est la propriété que GSAP anime depuis
       * toujours, donc elle ne peut pas ne pas fonctionner. Ce qu'on découvre en
       * dessous est le fond du site, c'est-à-dire l'encre : la pièce sort de
       * l'encre au lieu de s'allumer, ce qui est exactement l'image qu'on
       * cherchait.
       *
       * L'exposition, elle, redevient ce qu'elle aurait toujours dû être : une
       * valeur d'étalonnage écrite une fois dans la feuille de style.
       */
      if (plan !== null) {
        const [debutIgnition, finIgnition] = MINUTAGE.ignition;
        tl.to(
          plan,
          {
            opacity: 1,
            duration: finIgnition - debutIgnition,
            ease: "power2.inOut",
          },
          debutIgnition,
        );
      }

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

      /* Quatre — « Je règle la » cède au mot pendant que la lumière monte. */
      sortie(deux, MINUTAGE.deuxSortie);

      /* ---- L'extinction : le plan est fini, on éteint la pièce ----
       *
       * C'est ce qui sépare franchement les deux temps du chapitre, et c'est ce
       * qui manquait : la suite du manifeste se disait *par-dessus* le séjour
       * éclairé au lieu de se dire après lui. On ne pose pas un voile par-dessus
       * la pièce — on la retire, et le cadre rend l'encre du site. Le reste du
       * chapitre s'y joue.
       *
       * Le retrait est l'exact symétrique de l'arrivée, sur la même propriété et
       * pour les mêmes raisons.
       *
       * Effet de bord heureux : le mot LUMIÈRE se calculant en négatif de ce
       * qu'il traverse, il flambe à mesure que la pièce s'en va. Il sort donc au
       * plus clair, et il sort en dernier. */
      if (plan !== null) {
        const [xd, xf] = MINUTAGE.extinction;
        tl.to(
          plan,
          { opacity: 0, duration: xf - xd, ease: "power2.inOut" },
          xd,
        );
      }

      /* Cinq — dans le noir, et seulement là. */
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

      /* Sept — l'eau redescend, exactement comme elle est montée, et le noir
         reprend le cadre. */
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
        data-reduit="true"
        data-chapitre={t("chapitreVestibule")}
        aria-labelledby="vestibule-titre"
      >
        <h2 className="sr-only" id="vestibule-titre">
          Le vestibule
        </h2>

        <div className="vestibule__pose grille">
          <p className="vestibule__manifeste display">
            {t("manifesteUn")} {t("manifesteDeux")} <em>{t("manifesteLumiere")}</em>
            , {t("manifesteAutourAvant")}
            {t("manifesteSilence")}. {t("manifesteSept")}
          </p>
          <p className="vestibule__signature technique">{t("signature")}</p>
          <aside className="vestibule__marge technique">
            <p>{t("margeFondation")}</p>
            <p>{t("margeChantiers")}</p>
          </aside>
        </div>

        <div className="vestibule__plaque">
          <Image
            className="vestibule__repli"
            src={PLAN_ALLUME.src}
            width={PLAN_ALLUME.largeur}
            height={PLAN_ALLUME.hauteur}
            alt={t("planAllumeAlt")}
            sizes="100vw"
          />
        </div>

        <div className="vestibule__plaque">
          <Image
            className="vestibule__repli"
            src={bassin.repli}
            width={bassin.largeurRepli}
            height={bassin.hauteurRepli}
            alt={t("bassinAlt")}
            sizes="100vw"
          />
          <p className="vestibule__technique technique">
            {dire(bassin.technique)}
          </p>
        </div>
      </section>
    );
  }

  return (
    <section
      className="vestibule"
      /* Porté par la section : c'est elle qui remonte d'un écran sur le hero,
         et le recouvrement n'a pas lieu en mouvement réduit. */
      data-reduit="false"
      data-chapitre={t("chapitreVestibule")}
      aria-labelledby="vestibule-titre"
    >
      <h2 className="sr-only" id="vestibule-titre">
        Le vestibule
      </h2>

      {/* La séquence fragmente le manifeste en sept temps : il est donné ici
          d'un seul tenant, dans l'ordre, pour être lu intact. Les couches
          visuelles qui suivent en sont la mise en scène, et rien d'autre. */}
      <p className="sr-only">{t("manifesteEntier")}</p>

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
            <span className="vestibule__lumiere-mot">{t("manifesteLumiere")}</span>
          </p>

          {/* Les deux premières phrases : **en haut à gauche, et en retrait.**
              Elles annoncent le mot, elles ne le concurrencent pas — et surtout
              elles ne peuvent pas partager sa cellule, sans quoi le monument du
              centre leur passe dessus. C'est le défaut qu'on corrige ici : ce
              n'est pas une question de taille seule, c'est une question de
              place. Elles ont donc leur bloc, calé en haut, et une échelle
              retenue. */}
          <div className="vestibule__bloc vestibule__bloc--haut">
            <p
              className="vestibule__temps vestibule__temps--annonce display"
              data-temps="un"
            >
              <span className="vestibule__ligne">{t("manifesteUn")}</span>
            </p>

            <p
              className="vestibule__temps vestibule__temps--annonce display"
              data-temps="deux"
            >
              <span className="vestibule__ligne">{t("manifesteDeux")}</span>
            </p>
          </div>

          {/* La suite du manifeste, elle, se dit dans le noir d'après le plan :
              plus rien ne lui dispute le cadre, elle reprend donc la cellule
              centrale et la pleine échelle. */}
          <div className="vestibule__bloc vestibule__bloc--centre">
            <p className="vestibule__temps display" data-temps="cinq">
              <span className="vestibule__ligne">
                <span className="vestibule__autour">
                  {t("manifesteAutourAvant")}
                </span>
                <span className="vestibule__silence">{t("manifesteSilence")}</span>
                <span className="vestibule__autour">.</span>
              </span>
            </p>

            <p className="vestibule__temps display" data-temps="sept">
              <span className="vestibule__ligne">
                {t("manifesteSept")}
              </span>
            </p>
          </div>

          {/* La couche technique traîne dans la marge droite — jusqu'à
              l'allumage, qui l'emporte avec lui. */}
          <aside className="vestibule__marge technique">
            <p>{t("margeFondation")}</p>
            <p>{t("margeChantiers")}</p>
          </aside>
        </div>
      </div>
    </section>
  );
}
