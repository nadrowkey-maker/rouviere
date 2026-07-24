"use client";

import { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { projets } from "@/data/projets";
import { visuelsDe } from "@/data/visuels";
import { useRig } from "@/components/gl/Rig";
import type { EtatEnfilade } from "@/components/gl/materiaux/piece";
import { useMouvement } from "@/components/motion/MotionProvider";
import { useSon } from "@/components/chrome/SonProvider";
import { useDefilement } from "@/components/motion/LenisProvider";
import { useEffetVisuel } from "@/lib/isomorphe";
import "./enfilade.css";

/**
 * L'Enfilade.
 *
 * Rupture d'axe : on arrête de descendre, on se met à traverser. Le défilement
 * vertical est capté par un `pin` et converti en déplacement horizontal. Ce
 * n'est pas une galerie — c'est un couloir, et trois choses y avancent à trois
 * vitesses : les pièces, les noms de projets qui flottent dans la marge haute,
 * la couche technique en bas.
 *
 * Grammaire de mouvement : **traversée latérale**. Le vestibule qui précède
 * agrège en profondeur, la chambre qui suit avance dans l'axe : aucun des trois
 * ne partage sa grammaire avec son voisin.
 *
 * Le troisième rythme mérite un mot. Un nom pourrait simplement défiler plus
 * vite que sa pièce, mais il ne serait alors lisible que par accident. Ici son
 * décalage est **une contre-parallaxe indexée sur la position de sa pièce à
 * l'écran** : il vaut exactement zéro au moment où la pièce passe au centre —
 * le nom est alors à sa place, entier, lisible — et croît à mesure qu'elle
 * s'en écarte. Comme cette quantité est affine en la progression du
 * défilement, elle s'exprime en une simple interpolation par nom, calculée au
 * rafraîchissement : aucun rect n'est lu pendant l'animation.
 */

/**
 * Part de l'écart au centre reprise par le nom. Le deuxième rythme.
 *
 * Positive : le nom **devance** sa pièce, il file vers le bord plus vite
 * qu'elle. Une valeur négative le ferait traîner vers le centre de l'écran —
 * et les cinq noms, qui font chacun la moitié de la largeur du cadre, s'y
 * empileraient les uns sur les autres. En les poussant vers l'extérieur, on
 * obtient à la fois le rythme distinct et la lisibilité : un seul nom occupe
 * le centre à la fois.
 */
const PARALLAXE_NOM = 0.3;

/** La couche technique traîne : elle avance à sept dixièmes du couloir. */
const RYTHME_TECHNIQUE = 0.72;

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

  return (
    <article className="enfilade__piece" onFocusCapture={onFocusPiece}>
      {/* Le nom flotte dans la marge haute, en Gambetta énorme, coupé par le
          bord de l'écran. Doublé en `sr-only` dans le lien. */}
      <span className="enfilade__nom display-monument" aria-hidden="true">
        {projet.nom}
      </span>

      {/* `next/link`, et non un `<a>` : une navigation dure rechargerait le
          document, donc démonterait le canvas du rig, le logotype et le
          contexte audio — les trois choses que le site tient précisément à ne
          jamais reconstruire. Elle sauterait aussi les masques de transition
          entre routes. C'est le même lien que celui des entrées du menu. */}
      <Link
        className="enfilade__lien"
        href={`/projets/${projet.slug}`}
        data-curseur="ENTRER"
        /* Le seul son du couloir : celui du passage de seuil. On entre dans une
           pièce, la nappe va changer — l'impulsion le dit avant elle. */
        onClick={() => jouer("projet")}
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
        {projet.matieres.join(" / ")}
      </p>

      <ScenePiece
        ancre={ancre}
        source={planche.src}
        index={index}
        etat={etat}
        cle={projet.slug}
      />
    </article>
  );
}

export function Enfilade() {
  const { mouvementReduit, degrade } = useMouvement();
  const { lenis } = useDefilement();

  const sectionRef = useRef<HTMLElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const couloirRef = useRef<HTMLDivElement>(null);
  const bandeauRef = useRef<HTMLDivElement>(null);
  const declencheurRef = useRef<ScrollTrigger | null>(null);

  /* L'état du survol vit dans une ref : il change à chaque entrée de pointeur
     et doit être lu par le shader à chaque frame. Le passer par `useState`
     reconstruirait l'arbre React soixante fois par seconde. */
  const etat = useRef<EtatEnfilade>({ survol: null });

  useEffetVisuel(() => {
    const section = sectionRef.current;
    const scene = sceneRef.current;
    const couloir = couloirRef.current;
    const bandeau = bandeauRef.current;
    if (section === null || scene === null || couloir === null) return;
    if (bandeau === null) return;

    /* En mouvement réduit, le couloir n'est pas épinglé : il devient une
       région à défilement horizontal natif, que l'on parcourt à la main ou au
       clavier. La composition ne change pas, le mouvement forcé disparaît. */
    if (mouvementReduit) return;

    const noms = Array.from(
      couloir.querySelectorAll<HTMLElement>(".enfilade__nom"),
    );

    const distance = () => couloir.scrollWidth - innerWidth;

    const contexte = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "none", duration: 1 } });

      /* Premier rythme : le couloir lui-même. */
      tl.fromTo(couloir, { x: 0 }, { x: () => -distance() }, 0);

      /* Deuxième rythme : chaque nom reprend une part de l'écart de sa pièce
         au centre de l'écran. Nul au passage au centre, donc lisible là et
         seulement là. Les bornes sont des fonctions : elles se recalculent à
         chaque rafraîchissement, donc à chaque redimensionnement. */
      tl.fromTo(
        noms,
        {
          x: (_index: number, cible: HTMLElement) =>
            PARALLAXE_NOM * (centreDeLaPiece(cible) - innerWidth / 2),
        },
        {
          x: (_index: number, cible: HTMLElement) =>
            PARALLAXE_NOM * (centreDeLaPiece(cible) - innerWidth / 2) -
            PARALLAXE_NOM * distance(),
        },
        0,
      );

      /* Troisième rythme : la couche technique traîne derrière. */
      tl.fromTo(
        bandeau,
        { x: 0 },
        { x: () => -distance() * RYTHME_TECHNIQUE },
        0,
      );

      declencheurRef.current = ScrollTrigger.create({
        trigger: section,
        start: "top top",
        end: () => `+=${distance()}`,
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
    }, section);

    return () => {
      contexte.revert();
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
    const progression = index / Math.max(1, projets.length - 1);
    const cible =
      declencheur.start + (declencheur.end - declencheur.start) * progression;
    if (lenis !== null) lenis.scrollTo(cible, { immediate: false });
    else scrollTo({ top: cible, behavior: "smooth" });
  };

  return (
    <section
      className="enfilade"
      ref={sectionRef}
      data-chapitre="L'Enfilade"
      data-reduit={mouvementReduit}
      aria-labelledby="enfilade-titre"
    >
      <h2 className="sr-only" id="enfilade-titre">
        Cinq projets
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
      </div>
    </section>
  );
}

/**
 * Position horizontale du centre d'une pièce dans la mise en page du couloir,
 * transformations exclues. Lue au rafraîchissement de ScrollTrigger, jamais
 * pendant l'animation.
 */
function centreDeLaPiece(nom: HTMLElement): number {
  const piece = nom.closest<HTMLElement>(".enfilade__piece");
  if (piece === null) return 0;
  return piece.offsetLeft + piece.offsetWidth / 2;
}
