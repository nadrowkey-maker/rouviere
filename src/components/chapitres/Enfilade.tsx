"use client";

import { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { projets } from "@/data/projets";
import { visuelsDe, PLANCHE_SORTIE } from "@/data/visuels";
import { useRig } from "@/components/gl/Rig";
import { type EtatEnfilade } from "@/components/gl/materiaux/piece";
import { fenetre, PLEIN, type Boite } from "@/components/motion/plongee";
import { useMouvement } from "@/components/motion/MotionProvider";
import { useSon } from "@/components/chrome/SonProvider";
import { useLangue } from "@/i18n/LangueProvider";
import { chemin } from "@/i18n/langues";
import { useOuverture } from "@/components/chrome/Ouverture";
import { useDefilement } from "@/components/motion/LenisProvider";
import { useEffetVisuel } from "@/lib/isomorphe";
import { adoucir, borner } from "@/lib/math";
import { decalageDans } from "@/lib/mesure";
import "./enfilade.css";

/**
 * L'Enfilade.
 *
 * Rupture d'axe : on arrête de descendre, on se met à traverser. Le défilement
 * vertical est capté par un `pin` et converti en déplacement horizontal. Ce
 * n'est pas une galerie — c'est un couloir, et trois choses y avancent à trois
 * vitesses : les pièces, les noms de projets, la couche technique.
 *
 * Grammaire de mouvement : **traversée latérale**. Le vestibule qui précède
 * agrège en profondeur, la chambre qui suit avance dans l'axe : aucun des trois
 * ne partage sa grammaire avec son voisin.
 *
 * ## Les noms : un seul dominant à la fois
 *
 * Un nom de projet fait la moitié de la largeur du cadre. Poussés par une
 * contre-parallaxe affine — c'est ce qu'ils étaient —, ils se chevauchaient et
 * sortaient du cadre en même temps, coupés en deux et illisibles.
 *
 * La règle est maintenant explicite. Chaque nom est **calé sur sa pièce**, et sa
 * **dominance** est une courbe en S de la distance de cette pièce au centre du
 * cadre : pleine au passage au centre, nulle un tiers de cadre plus loin. Le nom
 * dominant est entier, à pleine échelle et pleine densité ; ses voisins ont déjà
 * reculé en échelle et se sont retirés en opacité. Un seul est lisible à la
 * fois, parce qu'un seul est là.
 *
 * Et il n'est jamais coupé : sa position est **bornée au cadre**, sa demi-largeur
 * comprise. Quand sa pièce s'échappe, le nom bute au bord — mais il a déjà
 * disparu quand cela arrive, la borne ne fait que garantir qu'aucun caractère ne
 * se perde entre-temps.
 *
 * Ces quantités ne coûtent aucune lecture du DOM : le centre de chaque pièce et
 * la largeur de chaque nom sont mesurés au rafraîchissement de ScrollTrigger,
 * jamais pendant l'animation. Le reste est de l'arithmétique sur la progression.
 *
 * ## Les pièces sont des fenêtres, pas des cadres
 *
 * Une pièce du couloir ne montre pas une photographie mise à l'échelle dans une
 * boîte : elle montre **le morceau** d'une image plein écran immobile que sa
 * boîte laisse voir. L'image est déjà à la taille qu'elle aura quand on entrera
 * dedans ; ce qui se déplace au défilement, c'est la fenêtre, pas ce qu'il y a
 * derrière (voir le régime de fenêtre fixe dans `gl/materiaux/piece.ts`).
 *
 * C'est ce qui rend les deux entrées du chapitre exactes, et c'est la raison
 * d'être du dispositif : qu'on sorte par la dernière pièce ou qu'on clique
 * n'importe laquelle, **il n'y a rien à redimensionner**. Le cadre s'ouvre, et
 * l'image dessous n'a pas bougé d'un pixel. Un couloir dont on pousse les portes,
 * plutôt qu'une galerie dont on agrandit les tirages.
 *
 * ## La sortie : le cadre s'ouvre, l'image ne bouge pas
 *
 * L'axe horizontal a besoin d'un point de sortie, sinon le couloir s'interrompt
 * et la page se remet à descendre sans qu'on ait rien conclu.
 *
 * Les quatre bords de la dernière fenêtre partent rejoindre les quatre bords de
 * l'écran. On ne fait pas grandir un objet : on retire ce qui le cachait. Le
 * relais du plan WebGL vers le doublon DOM se fait sec, au même cadrage exact —
 * les deux montrent le même morceau de la même image à la même taille, l'échange
 * n'a rien à voir.
 *
 * Puis l'image **tient le plein écran** : elle est entièrement installée avant
 * que quoi que ce soit d'autre ne bouge. C'est elle, et pas un fond d'encre, qui
 * porte le nom du noyer fumé quand La Matière prend la main — le chapitre suivant
 * n'a pas de plan à lui pour ce temps-là, il reprend celui-ci au pixel près (voir
 * `Matiere.tsx` et `PLANCHE_SORTIE`).
 *
 * Tout est en scrub, donc réversible comme le reste : on remonte, la fenêtre se
 * referme sur la dernière pièce et le couloir repart.
 */

/** La couche technique traîne : elle avance à sept dixièmes du couloir. */
const RYTHME_TECHNIQUE = 0.72;

/**
 * Part de la course d'épinglage réservée au plan de sortie. Le reste est la
 * traversée elle-même, à sa vitesse d'origine : prolonger la course sans
 * réserver cette part ralentirait tout le couloir.
 */
const PART_SORTIE = 0.3;

/**
 * Les deux temps du plan de sortie, en parts de `PART_SORTIE`. Ils somment à 1.
 *
 *   `OUVERTURE` — la fenêtre s'ouvre jusqu'aux quatre bords de l'écran. L'image,
 *                 elle, ne bouge pas d'un pixel.
 *   `TENUE`     — plus rien ne se passe. L'image est installée, et c'est dans cet
 *                 état que le chapitre suivant la reprend.
 *
 * Le relais du plan WebGL vers le doublon DOM n'a pas de durée : il est **sec**,
 * et il est invisible. Les pièces étant des fenêtres sur leur image plein écran,
 * le doublon part exactement du morceau que la pièce montrait, à la même taille :
 * il n'y a ni saut d'échelle à masquer, ni surimpression à fondre. Un fondu
 * n'aurait rien à fondre.
 */
const PART_OUVERTURE = 0.7;
const PART_TENUE = 1 - PART_OUVERTURE;

/** Demi-largeur de la plage où un nom est pleinement dominant, en fraction de cadre. */
const NOM_PLEIN = 0.06;
/** Au-delà, le nom s'est entièrement retiré. */
const NOM_RETIRE = 0.28;
/** Échelle d'un nom entièrement retiré. Il ne disparaît pas : il recule. */
const NOM_ECHELLE_RETRAIT = 0.76;
/** Air laissé entre un nom et le bord du cadre, en pixels. */
const NOM_MARGE = 24;

/* Three.js ne descend qu'avec le chapitre, et jamais côté serveur : le HTML de
   l'enfilade — mise en page, textes, images du mode dégradé — est rendu
   normalement, seule l'inscription WebGL est différée. */
const ScenePiece = dynamic(() => import("@/components/gl/ScenePiece"), {
  ssr: false,
});

type ProprietesPiece = {
  index: number;
  etat: { current: EtatEnfilade };
  /** Le focus est entré dans la pièce : le couloir doit l'amener au centre. */
  onFocusPiece: () => void;
};

/**
 * Une pièce du couloir. Le HTML tient la mise en page, le WebGL se cale
 * dessus : la figure est un cadre vide que le rig double d'un plan texturé.
 * L'image DOM reste en place et redevient visible dès que le WebGL n'est pas
 * là — mode dégradé, machine sans WebGL2, ou simplement le temps du
 * chargement du moteur.
 */
function Piece({ index, etat, onFocusPiece }: ProprietesPiece) {
  const projet = projets[index]!;
  const planche = visuelsDe(projet.slug).planches[0]!;
  const ancre = useRef<HTMLElement>(null);
  /* Le rig est là ou il ne l'est pas : c'est lui qui décide si l'image DOM
     s'efface au profit du plan WebGL. */
  const enWebgl = useRig() !== null;
  const { jouer } = useSon();
  const { ouvrir } = useOuverture();
  const { direTous, langue } = useLangue();

  return (
    <article className="enfilade__piece" onFocusCapture={onFocusPiece}>
      {/* Le nom flotte dans la marge haute, en Gambetta énorme, calé sur sa
          pièce. Doublé en `sr-only` dans le lien. */}
      <span className="enfilade__nom display-monument" aria-hidden="true">
        {projet.nom}
      </span>

      {/* `next/link`, et non un `<a>` : une navigation dure rechargerait le
          document, donc démonterait le canvas du rig, le logotype et le
          contexte audio — les trois choses que le site tient précisément à ne
          jamais reconstruire. Elle sauterait aussi la couture de route.
          C'est le même lien que celui des entrées du menu. */}
      <Link
        className="enfilade__lien"
        href={chemin(langue, `/projets/${projet.slug}`)}
        data-curseur="ENTRER"
        /* Le seul son du couloir : celui du passage de seuil. On entre dans une
           pièce, la nappe va changer — l'impulsion le dit avant elle. */
        onClick={(e) => {
          jouer("projet");
          /* Un clic avec modificateur, ou un clic du milieu, veut ouvrir dans un
             autre onglet : on ne lui prend pas la main. Le lien fait alors son
             travail de lien, et il n'y a rien à ouvrir ici. */
          if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) {
            return;
          }
          /* On n'entre pas dans un projet par un remplacement de page : **le
             cadre de la pièce s'ouvre**, exactement comme celui par lequel le
             couloir sort, et son contenu passe à la vidéo du projet. La
             navigation se fait dessous, quand il n'y a plus rien à voir d'autre
             que le film. C'est l'ouverture qui la déclenchera.

             Le rect est lu **ici**, une fois, sur un clic : c'est la seule
             lecture de mise en page hors de la passe du rig, et elle ne se
             répète pas. */
          const cadre = ancre.current;
          if (cadre === null) return;
          const r = cadre.getBoundingClientRect();
          const pris = ouvrir({
            slug: projet.slug,
            boite: {
              gauche: r.left,
              haut: r.top,
              largeur: r.width,
              hauteur: r.height,
            },
          });
          if (pris) e.preventDefault();
        }}
        onPointerEnter={() => {
          etat.current.survol = index;
        }}
        onPointerLeave={() => {
          if (etat.current.survol === index) etat.current.survol = null;
        }}
        /* Le clavier fait ce que le pointeur fait : la pièce au focus se
           détache et ses voisines reculent. */
        onFocus={() => {
          etat.current.survol = index;
        }}
        onBlur={() => {
          if (etat.current.survol === index) etat.current.survol = null;
        }}
      >
        <span className="sr-only">
          {projet.nom} — {projet.lieu}, {projet.annee}. {projet.surface} mètres
          carrés.
        </span>
        <figure className="enfilade__media" ref={ancre} data-webgl={enWebgl}>
          <Image
            className="enfilade__image"
            src={planche.src}
            width={planche.largeur}
            height={planche.hauteur}
            alt={planche.alt}
            sizes="(max-width: 48rem) 78vw, 34vw"
            priority={index === 0}
          />
        </figure>
      </Link>

      <p className="enfilade__legende technique">
        {direTous(projet.matieres).join(" / ")}
      </p>

      <ScenePiece
        ancre={ancre}
        source={planche.src}
        index={index}
        etat={etat}
        cle={projet.slug}
        fenetreFixe
      />
    </article>
  );
}

/**
 * D'où part le plan de sortie, mesuré au rafraîchissement : la fenêtre découpée
 * dans le cadre plein, sur la boîte exacte de la dernière pièce. Il n'y a rien
 * d'autre à mesurer — l'image, elle, ne bouge jamais.
 */
type Sortie = { clip: string };

export function Enfilade() {
  const { mouvementReduit, degrade } = useMouvement();
  const { t } = useLangue();
  const { lenis } = useDefilement();

  const sectionRef = useRef<HTMLElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const couloirRef = useRef<HTMLDivElement>(null);
  const bandeauRef = useRef<HTMLDivElement>(null);
  const finalRef = useRef<HTMLDivElement>(null);
  const declencheurRef = useRef<ScrollTrigger | null>(null);

  /* L'état du survol vit dans une ref : il change à chaque entrée de pointeur
     et doit être lu par le shader à chaque frame. Le passer par `useState`
     reconstruirait l'arbre React soixante fois par seconde. */
  const etat = useRef<EtatEnfilade>({ survol: null, fige: null });

  useEffetVisuel(() => {
    const section = sectionRef.current;
    const scene = sceneRef.current;
    const couloir = couloirRef.current;
    const bandeau = bandeauRef.current;
    const final = finalRef.current;
    if (section === null || scene === null || couloir === null) return;
    if (bandeau === null) return;

    /* En mouvement réduit, le couloir n'est pas épinglé : il devient une
       région à défilement horizontal natif, que l'on parcourt à la main ou au
       clavier. La composition ne change pas, le mouvement forcé disparaît. */
    if (mouvementReduit) return;

    const distance = () => couloir.scrollWidth - innerWidth;

    /* --- Les noms : mesures au rafraîchissement, écritures au cadre --- */
    const noms = Array.from(
      couloir.querySelectorAll<HTMLElement>(".enfilade__nom"),
    ).map((element) => ({
      element,
      /* Centre de la pièce dans la mise en page du couloir, transformations
         exclues, et demi-largeur du nom. Les deux sont relus au
         rafraîchissement, donc à chaque redimensionnement. */
      centre: 0,
      demi: 0,
      poserX: gsap.quickSetter(element, "x", "px") as (v: number) => void,
      poserEchelle: gsap.quickSetter(element, "scale") as (v: number) => void,
      poserOpacite: gsap.quickSetter(element, "opacity") as (v: number) => void,
    }));

    /* Le départ du plan de sortie. Muté au rafraîchissement, lu par les valeurs
       fonctionnelles du tween — d'où l'objet plutôt que des variables : GSAP les
       relit après `invalidate`. */
    const sortie: Sortie = { clip: PLEIN };

    /**
     * Toutes les lectures de mise en page du chapitre, en un seul endroit et à
     * un seul moment : l'initialisation d'un rafraîchissement ScrollTrigger.
     * Rien d'ici n'est relu pendant l'animation.
     */
    const mesurer = () => {
      for (const nom of noms) {
        const piece = nom.element.closest<HTMLElement>(".enfilade__piece");
        nom.centre =
          piece === null ? 0 : piece.offsetLeft + piece.offsetWidth / 2;
        nom.demi = nom.element.offsetWidth / 2;
      }

      if (final === null) return;
      const derniere = couloir.querySelector<HTMLElement>(
        ".enfilade__piece:last-child .enfilade__media",
      );
      if (derniere === null) return;

      /* ---- La boîte de la dernière image, au sous-pixel ----
       *
       * C'est ici que se jouait le petit décalage de la cinquième image, et il
       * n'avait rien d'aléatoire : **`offsetLeft`, `offsetTop`, `offsetWidth` et
       * `offsetHeight` rendent des entiers.** Le plan WebGL, lui, est posé sur le
       * `getBoundingClientRect` que lit la passe de mesure du rig — donc au
       * sous-pixel. Les deux ne décrivaient pas tout à fait la même boîte.
       *
       * L'écart n'est pas partout le même, et c'est ce qui le rendait visible
       * *sur la dernière pièce seulement* : les retraits du couloir et ses
       * gouttières sont en `clamp()` de `vw`, donc fractionnaires, et la
       * sommation des `offsetLeft` arrondit à chaque étage. L'erreur s'accumule
       * le long du couloir et culmine exactement là où la seule relève du
       * chapitre a lieu.
       *
       * La mesure passe donc par des rects — mais **par une différence de
       * rects**, qui est ce qui rend la lecture licite ici. Le média et le
       * couloir portent tous deux la translation du couloir et celle de
       * l'épinglage ; leur soustraction les élimine l'une comme l'autre, et ce
       * qui reste est la position de mise en page exacte, insensible à l'état de
       * l'animation au moment du rafraîchissement. C'est la propriété que
       * `decalageDans` allait chercher — on la garde, sans l'arrondi.
       *
       * Le couloir, lui, est repéré dans la scène par ses offsets : il en est
       * l'enfant direct, il n'y a donc aucune chaîne où accumuler quoi que ce
       * soit. */
      const rMedia = derniere.getBoundingClientRect();
      const rCouloir = couloir.getBoundingClientRect();
      const couloirDansScene = decalageDans(couloir, scene);

      /* En fin de traversée le couloir est translaté de −distance : c'est là
         que la dernière image se trouve au moment où la plongée prend la main.
         La scène, elle, est épinglée en haut du cadre — son repère est donc
         celui de l'écran. */
      const boite: Boite = {
        gauche: rMedia.left - rCouloir.left + couloirDansScene.x - distance(),
        haut: rMedia.top - rCouloir.top + couloirDansScene.y,
        largeur: rMedia.width,
        hauteur: rMedia.height,
      };

      /* ---- Le cadre plein est la scène, pas la fenêtre du navigateur ----
       *
       * `innerWidth` était employé ici, et c'est **faux d'une largeur de barre de
       * défilement** — quinze pixels sur une machine à barre classique.
       *
       * Le `clip-path` s'applique à `.enfilade__final`, qui est posé sur
       * `.enfilade__scene` : ses retraits se comptent donc dans la boîte de la
       * scène, large de `clientWidth`. `innerWidth`, lui, compte la barre. Le
       * retrait droit sortait donc quinze pixels trop grand, et la fenêtre de
       * départ du plan de sortie était quinze pixels plus étroite, à droite, que
       * la pièce qu'elle prétendait doubler.
       *
       * Ce qu'on voyait est exactement ce qui a été rapporté : au moment du
       * relais, juste avant que le cadre ne s'ouvre, le bord droit de l'image
       * sautait vers l'intérieur ; et comme ce bord-là avait quinze pixels de
       * moins à parcourir que les trois autres, l'ouverture ne se terminait pas
       * au même rythme qu'elle — d'où le second décrochage, une fois le plein
       * cadre atteint. Un seul chiffre faux, aux deux bouts du même geste.
       *
       * La règle est donc : **le cadre plein est mesuré sur l'élément qui porte
       * la découpe**, jamais sur un global. C'est aussi ce qui le met dans le
       * repère exact du rig, dont le canvas est `position: fixed; inset: 0` et
       * dont la taille est le `clientWidth` de ce canvas — barre exclue. Le plan
       * WebGL et son doublon DOM décrivent enfin la même boîte. */
      const rScene = scene.getBoundingClientRect();
      const cadre = { largeur: rScene.width, hauteur: rScene.height };

      /* La seule mesure du plan de sortie : la fenêtre de départ. Il n'y a pas
         de cadrage à calculer — l'image reste à son cadrage plein écran, et c'est
         justement ce qui fait que le geste est une ouverture de cadre et non un
         grossissement. */
      sortie.clip = fenetre(boite, cadre);
    };

    /** Répartit les noms pour une progression de la traversée donnée. */
    const distribuer = (avancee: number) => {
      const cadre = innerWidth;
      const course = distance();
      for (const nom of noms) {
        const surEcran = nom.centre - course * avancee;
        const ecart = Math.abs(surEcran - cadre / 2) / cadre;
        const dominance = 1 - adoucir(ecart, NOM_PLEIN, NOM_RETIRE);

        /* La densité tombe plus vite que l'échelle : le nom voisin s'efface
           avant d'avoir fini de reculer, et jamais deux ne se disputent la
           lecture. */
        nom.poserOpacite(dominance * dominance);
        nom.poserEchelle(
          NOM_ECHELLE_RETRAIT + (1 - NOM_ECHELLE_RETRAIT) * dominance,
        );

        /* Calé sur sa pièce, mais borné au cadre : aucun nom n'est jamais
           coupé par un bord. Plus large que le cadre — un très grand écran
           étroit —, il se centre : c'est encore la position la plus lisible. */
        const min = nom.demi + NOM_MARGE;
        const max = cadre - nom.demi - NOM_MARGE;
        const cible = min > max ? cadre / 2 : borner(surEcran, min, max);
        nom.poserX(cible - surEcran);
      }
    };

    const contexte = gsap.context(() => {
      const tl = gsap.timeline({
        defaults: { ease: "none" },
        /* Les noms suivent la ligne, pas le déclencheur : avec `scrub: 1` la
           ligne est en retard d'une inertie sur le défilement, et c'est cette
           position-là que les pièces occupent réellement à l'écran. */
        onUpdate: () => {
          const avancee = tl.progress();
          distribuer(Math.min(1, avancee / (1 - PART_SORTIE)));
          /* Dès que le plan de sortie prend la main, la dernière pièce est
             désignée par le parcours lui-même : elle se fait franchement nette,
             ses voisines reculent d'un cran. On ne conclut pas un chapitre sur
             une image trouble — et le doublon DOM qui la relaie, lui, est net :
             sans cela l'échange se verrait comme une mise au point. */
          etat.current.fige =
            avancee >= 1 - PART_SORTIE ? projets.length - 1 : null;
        },
      });

      const traversee = 1 - PART_SORTIE;

      /* Premier rythme : le couloir lui-même. */
      tl.fromTo(
        couloir,
        { x: 0 },
        { x: () => -distance(), duration: traversee },
        0,
      );

      /* Deuxième rythme : la couche technique traîne derrière. */
      tl.fromTo(
        bandeau,
        { x: 0 },
        { x: () => -distance() * RYTHME_TECHNIQUE, duration: traversee },
        0,
      );

      /* Le troisième rythme est celui des noms : il n'est pas un tween, c'est
         la loi de dominance appliquée à chaque cadre par `distribuer`. */

      /* Le plan de sortie. Le couloir est arrêté depuis le début de cette part,
         et il ne se passe que deux choses :

           1. sec, sans durée, le plan DOM prend la place du plan WebGL, sur le
              cadre exact de la dernière pièce ;
           2. la fenêtre s'ouvre jusqu'aux quatre bords de l'écran. L'image reste
              exactement où elle est, à l'échelle où elle est — aucune
              transformation ne lui est appliquée, nulle part.

         Puis la tenue, où plus rien n'arrive. */
      if (final !== null) {
        const ouverture = PART_SORTIE * PART_OUVERTURE;

        /* L'état de départ, posé au début de la ligne : c'est lui que la marche
           arrière retrouve, et c'est ce qui rend la coupe réversible. */
        tl.set(final, { autoAlpha: 0, clipPath: () => sortie.clip }, 0);
        tl.set(final, { autoAlpha: 1 }, traversee);
        tl.to(
          final,
          { clipPath: PLEIN, duration: ouverture, ease: "power1.inOut" },
          traversee,
        );
      }

      /* La tenue est la part qui reste, et c'est cette borne qui la fait
         exister : sans elle, GSAP clôturerait la ligne sur la fin de l'ouverture
         et l'image n'aurait pas le temps de s'installer. La somme vaut exactement
         1, par construction des trois parts. */
      tl.set(scene, {}, traversee + PART_SORTIE * (PART_OUVERTURE + PART_TENUE));

      declencheurRef.current = ScrollTrigger.create({
        trigger: section,
        start: "top top",
        /* La course couvre la traversée **et** le plan de sortie. Diviser par
           la part restante garde à la traversée sa vitesse d'origine. */
        end: () => `+=${distance() / (1 - PART_SORTIE)}`,
        /* On épingle la SECTION elle-même, pas la scène intérieure.
           `.enfilade` porte un `height: 100vh` en CSS ; épingler un enfant
           (`.enfilade__scene`) y insérait le pin-spacer, mais cette hauteur fixe
           du parent le plafonnait — le spacer ne réservait alors jamais la
           distance de l'épinglage, et la Matière remontait sous le couloir
           encore figé (deux chapitres à l'écran). En épinglant la section, le
           spacer se pose à son niveau, hors de tout plafond, et réserve la
           course entière — c'est le motif déjà en place sur la chambre et la
           séquence, qui n'ont jamais chevauché. La scène intérieure garde son
           `overflow: clip` et cadre le couloir comme avant. */
        pin: true,
        /* `1` et non `true` : le couloir rattrape le défilement en une seconde
           plutôt que de lui coller. C'est ce qui donne l'inertie d'un travelling
           au lieu d'un panoramique nerveux. */
        scrub: 1,
        invalidateOnRefresh: true,
        anticipatePin: 1,
        /* Toutes les mesures avant que GSAP ne réévalue ses valeurs
           fonctionnelles : `onRefreshInit` est la première étape du cycle. */
        onRefreshInit: mesurer,
        /* Épinglage par transformation, et non par `position: fixed`.
           `.scene-page` — la surface qui recule derrière le menu — porte en
           permanence un `transform` et un `filter`, fût-ce à l'identité. L'un
           comme l'autre font d'un élément le bloc conteneur de ses descendants
           fixes : un `position: fixed` posé ici ne se cale plus sur le
           viewport mais sur la page, et ScrollTrigger calculait un décalage de
           plusieurs milliers de pixels — le couloir partait hors de l'écran.
           Une translation, elle, se moque du bloc conteneur. */
        pinType: "transform",
        animation: tl,
      });

      /* Créer le déclencheur a déjà provoqué un rafraîchissement, donc une
         mesure et un premier rendu de la ligne. On distribue à la progression
         réelle — et non à zéro : une page rechargée au milieu du couloir doit
         trouver ses noms en place dès la première peinture. */
      mesurer();
      distribuer(Math.min(1, tl.progress() / (1 - PART_SORTIE)));
    }, section);

    return () => {
      contexte.revert();
      /* Les `quickSetter` écrivent hors du contexte GSAP : c'est à nous de
         rendre les noms à leur état de feuille de style. Sans cela, un passage
         en mouvement réduit hériterait des opacités de la dernière frame. */
      gsap.set(
        noms.map((nom) => nom.element),
        { clearProps: "transform,opacity" },
      );
      declencheurRef.current = null;
    };
  }, [mouvementReduit]);

  /**
   * Le focus clavier entre dans une pièce : on amène le défilement au point du
   * couloir où cette pièce est centrée. Sans cela le navigateur tenterait de
   * faire défiler la zone épinglée pour révéler le lien, et se battrait avec
   * l'épinglage — c'est l'accroc classique d'un couloir horizontal.
   */
  const amenerAuFocus = (index: number) => {
    const declencheur = declencheurRef.current;
    if (declencheur === null) return;
    /* La progression vise la traversée seule : le plan de sortie occupe la fin
       de la course et n'appartient à aucune pièce. */
    const progression =
      (index / Math.max(1, projets.length - 1)) * (1 - PART_SORTIE);
    const cible =
      declencheur.start + (declencheur.end - declencheur.start) * progression;
    if (lenis !== null) lenis.scrollTo(cible, { immediate: false });
    else scrollTo({ top: cible, behavior: "smooth" });
  };

  return (
    <section
      className="enfilade"
      ref={sectionRef}
      data-chapitre={t("chapitreEnfilade")}
      data-reduit={mouvementReduit}
      aria-labelledby="enfilade-titre"
    >
      <h2 className="sr-only" id="enfilade-titre">
        {t("enfiladeTitre")}
      </h2>

      <div className="enfilade__scene" ref={sceneRef}>
        <div
          className="enfilade__couloir"
          ref={couloirRef}
          /* En mouvement réduit le couloir se parcourt lui-même : il devient
             une région défilante, donc focusable et annoncée comme telle. */
          tabIndex={mouvementReduit ? 0 : -1}
          role={mouvementReduit ? "region" : undefined}
          aria-label={mouvementReduit ? "Les cinq projets, à parcourir latéralement" : undefined}
        >
          {projets.map((projet, index) => (
            <Piece
              key={projet.slug}
              index={index}
              etat={etat}
              onFocusPiece={() => {
                if (!mouvementReduit) amenerAuFocus(index);
              }}
            />
          ))}
        </div>

        {/* La couche technique, au troisième rythme, en bas du cadre. */}
        <div className="enfilade__bandeau" ref={bandeauRef} aria-hidden="true">
          {projets.map((projet) => (
            <p className="enfilade__donnees technique" key={projet.slug}>
              {projet.lieu} · {projet.coordonnees} · {projet.surface} m² ·{" "}
              {projet.annee}
            </p>
          ))}
        </div>

        {degrade ? null : (
          <p className="enfilade__consigne technique" aria-hidden="true">
            Cinq pièces
          </p>
        )}

        {/* Le plan de sortie : le cadre plein, dans lequel une fenêtre s'ouvre.
            C'est la même image que la dernière pièce, donc rien de neuf à
            annoncer — elle est déjà décrite dans son lien. C'est aussi, au même
            fichier et au même cadrage, celle que *La Matière* garde derrière le
            noyer fumé. En mouvement réduit il n'y a pas d'axe horizontal à
            conclure : le couloir se parcourt à la main et se termine de
            lui-même. */}
        {mouvementReduit ? null : (
          <div className="enfilade__final" ref={finalRef} aria-hidden="true">
            <Image
              className="enfilade__final-image"
              src={PLANCHE_SORTIE.src}
              width={PLANCHE_SORTIE.largeur}
              height={PLANCHE_SORTIE.hauteur}
              alt=""
              sizes="100vw"
            />
          </div>
        )}
      </div>
    </section>
  );
}
