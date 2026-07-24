"use client";

import { useRef } from "react";
import Image from "next/image";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { rangDe, type Projet } from "@/data/projets";
import { visuelsDe } from "@/data/visuels";
import { useRevele } from "@/components/motion/useRevele";
import { useMouvement } from "@/components/motion/MotionProvider";
import { useSon } from "@/components/chrome/SonProvider";
import { useEffetVisuel } from "@/lib/isomorphe";
import { lireCouleur, lireDuree } from "@/lib/jetons";
import "./chambre.css";

/**
 * La page projet — plein cadre.
 *
 * Le monde bascule dès l'entrée : la couleur du projet, extraite de la
 * dominante réelle de ses médias, prend le curseur, la barre de progression et
 * les liserés en 1,15 s.
 *
 * Trois temps, sans jamais mettre une image dans un cadre plus petit que
 * l'écran :
 *
 *   *Le hero* — la vidéo du projet ouvre en plein cadre, sans texte, comme le
 *   hero du site.
 *
 *   *Les vues* — les trois photographies se traversent une par une, chacune en
 *   `object-fit: cover` sur 100 vh, avec une parallaxe interne et un
 *   enchaînement par masque (un store qui descend). Le titre monumental arrive
 *   en Gambetta sur la première ; la couche technique court en bas.
 *
 *   *La fiche* — le seul moment sobre. Du texte calé, sec, et une grille
 *   d'étiquettes dissoute en une seule ligne de données décrochée colonne 2.
 *
 * Grammaire de mouvement : **le masque qui descend**. L'enfilade qui précède
 * traverse latéralement ; ici les plans se recouvrent par le haut, plein cadre.
 */
export function Chambre({ projet }: { projet: Projet }) {
  const { mouvementReduit } = useMouvement();
  const { entrerProjet, quitterProjet } = useSon();
  const { video, planches } = visuelsDe(projet.slug);

  /* ---- La nappe du projet ----
     Le monde chromatique bascule à l'entrée ; la nappe fait de même. Celle du
     site cède la place en 1,2 s et la reprend à la sortie, là où le parcours en
     était resté — c'est le pendant sonore exact du fond qui se recolore. */
  useEffetVisuel(() => {
    entrerProjet(rangDe(projet.slug));
    return () => quitterProjet();
  }, [projet.slug, entrerProjet, quitterProjet]);

  const heroRef = useRef<HTMLElement>(null);
  const vuesRef = useRef<HTMLElement>(null);
  const ficheRef = useRef<HTMLDivElement>(null);

  useRevele(ficheRef, ".chambre__revele");

  /* ---- La bascule de monde ---- */
  useEffetVisuel(() => {
    const html = document.documentElement;
    const depuis = lireCouleur("encre");
    const vers = lireCouleur(projet.monde);
    const relais = { t: 0 };

    /* La couleur du projet monte en 1,15 s et repeint du même geste le curseur,
       la barre de progression et les liserés, qui lisent tous `--monde`. */
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

  /* ---- Le hero : la vidéo monte très légèrement en échelle et s'assombrit à
     mesure qu'on la quitte. Un scrub, donc réversible. ---- */
  useEffetVisuel(() => {
    const hero = heroRef.current;
    if (hero === null || mouvementReduit) return;

    const declencheur = gsap.timeline({
      scrollTrigger: {
        trigger: hero,
        start: "top top",
        end: "bottom top",
        scrub: true,
      },
    });
    declencheur
      .to(hero.querySelector(".chambre__media"), { scale: 1.06, ease: "none" }, 0)
      .to(hero.querySelector(".chambre__voile"), { opacity: 0.55, ease: "none" }, 0);

    return () => {
      declencheur.scrollTrigger?.kill();
      declencheur.kill();
    };
  }, [mouvementReduit]);

  /* ---- Les vues : masque qui descend + parallaxe interne ---- */
  useEffetVisuel(() => {
    const section = vuesRef.current;
    if (section === null || mouvementReduit) return;

    const vues = Array.from(
      section.querySelectorAll<HTMLElement>(".chambre__vue"),
    );
    const images = vues.map(
      (v) => v.querySelector<HTMLElement>(".chambre__parallaxe")!,
    );
    const n = vues.length;
    if (n === 0) return;

    /* Au départ, seule la première est visible ; les suivantes sont masquées
       par le haut, prêtes à descendre. */
    gsap.set(vues.slice(1), { clipPath: "inset(0 0 100% 0)" });

    const HOLD = 0.55;
    const WIPE = 1;

    const tl = gsap.timeline({
      defaults: { ease: "none" },
      scrollTrigger: {
        trigger: section,
        start: "top top",
        end: () => `+=${innerHeight * (n + 1)}`,
        pin: true,
        /* `.scene-page` porte un transform permanent : `position: fixed` s'y
           calerait au lieu du viewport. On épingle donc en transform. */
        pinType: "transform",
        scrub: 0.8,
        invalidateOnRefresh: true,
      },
    });

    let t = 0;
    /* Le premier plan respire pendant qu'il tient. */
    tl.fromTo(images[0]!, { yPercent: -6 }, { yPercent: 6, duration: HOLD }, t);
    t += HOLD;

    for (let i = 1; i < n; i += 1) {
      const vue = vues[i]!;
      const image = images[i]!;
      /* Le store descend : la vue entrante se dévoile du haut vers le bas. */
      tl.fromTo(
        vue,
        { clipPath: "inset(0 0 100% 0)" },
        { clipPath: "inset(0 0 0% 0)", ease: "power2.inOut", duration: WIPE },
        t,
      );
      /* Sa photographie glisse pendant tout le temps où elle est à l'écran. */
      tl.fromTo(image, { yPercent: -6 }, { yPercent: 6, duration: WIPE + HOLD }, t);
      t += WIPE + HOLD;
    }

    return () => {
      tl.scrollTrigger?.kill();
      tl.kill();
      ScrollTrigger.refresh();
    };
    /* `projet.slug` : si la même instance sert un autre projet, la timeline
       doit se reconstruire sur les nouvelles photographies. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mouvementReduit, projet.slug]);

  return (
    <article
      className="chambre"
      data-monde={projet.monde}
      data-reduit={mouvementReduit ? "" : undefined}
    >
      {/* ---- Le hero : la vidéo du projet, plein cadre, sans texte ---- */}
      <section
        className="chambre__hero"
        ref={heroRef}
        aria-label={`${projet.nom}, ${projet.lieu}`}
      >
        <div className="chambre__media">
          {mouvementReduit ? (
            <Image
              src={video.poster}
              width={video.largeur}
              height={video.hauteur}
              alt=""
              className="chambre__image"
              priority
              sizes="100vw"
            />
          ) : (
            <video
              className="chambre__image"
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              poster={video.poster}
            >
              <source src={video.webm} type="video/webm" />
              <source src={video.mp4} type="video/mp4" />
            </video>
          )}
        </div>
        <div className="chambre__voile" aria-hidden="true" />
      </section>

      {/* ---- Les vues : trois photographies plein cadre ---- */}
      <section className="chambre__vues" ref={vuesRef}>
        {planches.map((planche, i) => (
          <figure
            className="chambre__vue"
            key={planche.src}
            style={{ zIndex: i }}
          >
            <div className="chambre__parallaxe">
              <Image
                src={planche.src}
                fill
                alt={planche.alt}
                className="chambre__photo"
                sizes="100vw"
                priority={i === 0}
              />
            </div>

            {i === 0 ? (
              <h1 className="chambre__titre display-monument">{projet.nom}</h1>
            ) : null}
          </figure>
        ))}

        {/* La couche technique court en bas, au-dessus des plans, tout du long. */}
        <p className="chambre__technique technique">
          {projet.lieu} · {projet.coordonnees} · {projet.surface} m² ·{" "}
          {projet.annee}
        </p>
      </section>

      {/* ---- La fiche : sobre, dernière ---- */}
      <section className="chambre__fiche grille" ref={ficheRef}>
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

        {/* La grille d'étiquettes, dissoute en une seule ligne décrochée. */}
        <p className="chambre__ligne chambre__revele technique">
          <span>{projet.lieu}</span>
          <span>{projet.surface} m²</span>
          <span>livraison {projet.livraison}</span>
          <span>{projet.matieres.join(" / ")}</span>
          <span>{projet.photographe}</span>
        </p>
      </section>
    </article>
  );
}
