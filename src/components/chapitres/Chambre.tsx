"use client";

import { useRef } from "react";
import dynamic from "next/dynamic";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import type { Projet } from "@/data/projets";
import { visuelsDe } from "@/data/visuels";
import type { EtatProfondeur } from "@/components/gl/materiaux/profondeur";
import { useRevele } from "@/components/motion/useRevele";
import { useMouvement } from "@/components/motion/MotionProvider";
import { useEffetVisuel } from "@/lib/isomorphe";
import { lireCouleur, lireDuree } from "@/lib/jetons";
import { SequenceCanvas } from "./SequenceCanvas";
import "./chambre.css";

/**
 * La Chambre — un chapitre par projet.
 *
 * Le monde bascule : dès l'entrée, la couleur du projet prend tout. Puis trois
 * temps, sans coupure visible entre eux.
 *
 *   *L'approche* — une traversée en séquence de frames, redessinée sur un
 *   canvas 2D et pilotée au défilement. Voir `SequenceCanvas`.
 *
 *   *La profondeur* — on cesse de traverser, on entre dans la scène : les
 *   images avancent vers la caméra et le fond réagit. Voir `profondeur.ts`.
 *
 *   *La fiche* — le seul moment sobre du site. Du texte, calé, sec, et rien
 *   d'autre qu'un reveal de lignes retenu.
 *
 * Grammaire de mouvement : **l'avancée dans l'axe**. L'enfilade qui précède
 * traverse latéralement ; ici on entre. Les deux ne se ressemblent pas.
 */

/** Vitesse au-delà de laquelle la traînée du fond est à son maximum, en px/frame. */
const VELOCITE_PLEINE = 60;

/* Comme pour l'enfilade : Three.js reste hors de la première charge et hors du
   rendu serveur. La fiche, elle, est du HTML rendu par le serveur. */
const SceneProfondeur = dynamic(
  () => import("@/components/gl/SceneProfondeur"),
  { ssr: false },
);

export function Chambre({ projet }: { projet: Projet }) {
  const { mouvementReduit } = useMouvement();
  const visuels = visuelsDe(projet.slug);

  const profondeurRef = useRef<HTMLDivElement>(null);
  const ancreGL = useRef<HTMLDivElement>(null);
  const ficheRef = useRef<HTMLDivElement>(null);

  const etat = useRef<EtatProfondeur>({ progression: 0, velocite: 0 });

  useRevele(ficheRef, ".chambre__revele");

  /* ---- La bascule de monde ---- */
  useEffetVisuel(() => {
    const html = document.documentElement;
    const depuis = lireCouleur("craie");
    const vers = lireCouleur(projet.monde);
    const relais = { t: 0 };

    /* La couleur du projet ne se pose pas d'un coup : elle monte en 1,15 s —
       la durée d'un changement de monde — et elle repeint du même geste le
       curseur, la barre de progression et les liserés, qui lisent tous
       `--monde`. Le fond, lui, est un dégradé calculé en GLSL : voir le
       shader de `profondeur.ts`. */
    const tween = gsap.to(relais, {
      t: 1,
      duration: mouvementReduit ? 0 : lireDuree("chapitre"),
      ease: "power2.inOut",
      onUpdate: () => {
        html.style.setProperty(
          "--monde",
          gsap.utils.interpolate(depuis, vers, relais.t) as string,
        );
      },
    });

    return () => {
      tween.kill();
      html.style.removeProperty("--monde");
    };
  }, [projet.monde, mouvementReduit]);

  /* ---- Le temps de la profondeur ---- */
  useEffetVisuel(() => {
    const section = profondeurRef.current;
    if (section === null) return;

    if (mouvementReduit) {
      /* Une image posée, pas une traversée : on montre le premier plan et on
         laisse le chapitre se lire en défilement natif. */
      etat.current.progression = 0;
      return;
    }

    let precedent = 0;

    const declencheur = ScrollTrigger.create({
      trigger: section,
      start: "top top",
      end: () => `+=${innerHeight * 2.6}`,
      pin: true,
      /* Comme partout : `.scene-page` porte un `transform` permanent, donc un
         `position: fixed` s'y calerait au lieu du viewport. */
      pinType: "transform",
      scrub: 0.8,
      invalidateOnRefresh: true,
      /* `self`, et non la constante `declencheur` : ScrollTrigger appelle
         `onUpdate` pendant `create`, donc avant que l'affectation ne soit
         faite. Lire la constante ici lève une erreur de zone morte — et elle
         ne se voyait que sur les projets sans séquence, dont la profondeur
         commence en haut de page et se met donc à jour dès sa création. */
      onUpdate: (self) => {
        etat.current.progression = self.progress;
        /* La vélocité alimente la traînée du fond et le grain des plans. */
        const brut = self.progress - precedent;
        precedent = self.progress;
        etat.current.velocite =
          (brut * (self.end - self.start)) / VELOCITE_PLEINE;
      },
    });

    return () => declencheur.kill();
  }, [mouvementReduit]);

  const sequence = visuels.sequence;

  return (
    <article className="chambre" data-monde={projet.monde}>
      {/* ---- Premier temps : l'approche ---- */}
      {sequence === null ? null : (
        <section
          className="chambre__approche"
          data-chapitre={`${projet.nom} — l'approche`}
          aria-label={`${projet.nom}, traversée`}
        >
          <SequenceCanvas
            sequence={sequence}
            description={`Traversée de ${projet.nom}, ${projet.lieu}. La lumière parcourt les pièces d'un bout à l'autre du plan.`}
          />
          <p className="chambre__coordonnees technique">
            {projet.coordonnees} — {projet.surface} m² — livraison{" "}
            {projet.livraison}
          </p>
        </section>
      )}

      {/* ---- Deuxième temps : la profondeur ---- */}
      <section
        className="chambre__profondeur"
        ref={profondeurRef}
        data-chapitre={projet.nom}
        aria-label={`${projet.nom}, les vues`}
      >
        {/* L'ancre du rig : une boîte plein cadre, vide. Le WebGL peint
            dessous, le HTML garde la mise en page. */}
        <div className="chambre__scene" ref={ancreGL} aria-hidden="true" />
        <SceneProfondeur
          ancre={ancreGL}
          sources={visuels.planches.map((planche) => planche.src)}
          monde={projet.monde}
          etat={etat}
          cle={projet.slug}
        />

        <h1 className="chambre__titre display">{projet.nom}</h1>
        <p className="chambre__lieu technique">
          {projet.lieu} · {projet.coordonnees} · {projet.annee}
        </p>

        {/* Ce que peint le WebGL, en équivalent lisible. */}
        <ul className="sr-only">
          {visuels.planches.map((planche) => (
            <li key={planche.src}>{planche.alt}</li>
          ))}
        </ul>
      </section>

      {/* ---- Troisième temps : la fiche ---- */}
      <section
        className="chambre__fiche grille"
        ref={ficheRef}
        data-chapitre={`${projet.nom} — la fiche`}
      >
        <div className="chambre__programme">
          <p className="technique">Programme</p>
          <p className="chambre__revele chambre__chapo">{projet.programme}</p>
        </div>

        <div className="chambre__texte">
          {projet.fiche.map((paragraphe) => (
            <p className="chambre__revele" key={paragraphe.slice(0, 24)}>
              {paragraphe}
            </p>
          ))}
        </div>

        <dl className="chambre__donnees technique">
          <div>
            <dt>Lieu</dt>
            <dd>{projet.lieu}</dd>
          </div>
          <div>
            <dt>Surface</dt>
            <dd>{projet.surface} m²</dd>
          </div>
          <div>
            <dt>Livraison</dt>
            <dd>{projet.livraison}</dd>
          </div>
          <div>
            <dt>Matières</dt>
            <dd>{projet.matieres.join(", ")}</dd>
          </div>
          <div>
            <dt>Photographie</dt>
            <dd>{projet.photographe}</dd>
          </div>
        </dl>
      </section>
    </article>
  );
}
