"use client";

import { useRef } from "react";
import Image from "next/image";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { rangDe, type Projet } from "@/data/projets";
import { visuelsDe } from "@/data/visuels";
import { useRevele } from "@/components/motion/useRevele";
import { useMouvement } from "@/components/motion/MotionProvider";
import { useSon } from "@/components/chrome/SonProvider";
import { useChrome } from "@/components/chrome/ChromeProvider";
import {
  useVideoProjet,
  consommerReleve,
} from "@/components/chrome/VideoProjet";
import { useOuverture } from "@/components/chrome/Ouverture";
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
 *   hero du site. **C'est le même élément vidéo que celui de l'aperçu du menu**,
 *   déplacé et non recréé (voir `chrome/VideoProjet.tsx`) : quand on entre par le
 *   menu, le plan qui jouait derrière le titre continue ici, à la même image, au
 *   même instant de son flux, sans reprise à zéro et sans noir intermédiaire.
 *   Une fois qu'il est en place, un repère `DÉFILER` paraît en bas et s'efface
 *   au premier tour de molette.
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
  const { menuOuvert } = useChrome();
  const flux = useVideoProjet();
  const { ranger } = useOuverture();
  const { video, planches } = visuelsDe(projet.slug);

  /* ---- La nappe du projet ----
     Le monde chromatique bascule à l'entrée ; la nappe fait de même. Celle du
     site cède la place en 1,2 s et la reprend à la sortie, là où le parcours en
     était resté — c'est le pendant sonore exact du fond qui se recolore.

     **Et elle rend la main dès que le menu s'ouvre.** Ouvrir le menu depuis une
     page projet, c'est en sortir : on va choisir ailleurs. La nappe du projet
     tenait pourtant jusqu'au changement de route, si bien qu'on parcourait les
     cinq titres avec la musique de celui qu'on quittait — puis elle cédait
     brusquement la place à celle du suivant. Elle repasse maintenant à la nappe
     du site en même temps que la page recule, et si l'on referme le menu sans
     aller nulle part, elle revient. */
  useEffetVisuel(() => {
    if (menuOuvert) quitterProjet();
    else entrerProjet(rangDe(projet.slug));
    return () => quitterProjet();
  }, [projet.slug, menuOuvert, entrerProjet, quitterProjet]);

  const heroRef = useRef<HTMLElement>(null);
  const fluxRef = useRef<HTMLDivElement>(null);
  const vuesRef = useRef<HTMLElement>(null);
  const ficheRef = useRef<HTMLDivElement>(null);

  useRevele(ficheRef, ".chambre__revele");

  /* ---- Le flux du projet : adopté, jamais recréé ----
     Si une relève est armée pour ce projet — on vient de cliquer son entrée dans
     le menu —, la vidéo joue déjà : `adopter` la déplace dans le hero **et
     garantit qu'elle continue**. Elle est révélée sur-le-champ, sans fondu : à
     cet instant elle occupe exactement le même rectangle qu'une frame plus tôt
     dans l'aperçu du menu, et le déplacement ne se voit donc pas.

     Sinon — arrivée directe, ou entrée depuis l'enfilade — on la démarre, et le
     hero tient sur sa poster jusqu'à ce qu'elle joue vraiment.

     L'hôte est capturé ici, dans une variable locale, et non relu au nettoyage :
     React détache les refs au démontage, et un `null` à cet instant priverait
     l'arrêt de son propriétaire. */
  useEffetVisuel(() => {
    const hero = heroRef.current;
    const hote = fluxRef.current;
    if (hero === null || hote === null || mouvementReduit) return;

    /* La relève n'est consommée qu'une fois qu'on est sûr de pouvoir l'honorer :
       une chambre en mouvement réduit n'a pas de flux à adopter, et le drapeau
       doit rester intact pour que `Transition` sache quoi en faire. */
    const attendu = consommerReleve();

    if (attendu === projet.slug) {
      flux.adopter(projet.slug, hote);
      hero.dataset.flux = "releve";
    } else {
      flux.accueillir(projet.slug, hote);
      flux.demarrer(projet.slug, () => {
        hero.dataset.flux = "pret";
      });
    }

    /* La surface d'ouverture a fait son travail : le flux est ici. Elle se range
       dans la même frame, avant toute peinture — sans quoi son encre vide
       couvrirait la page qu'elle vient de découvrir. */
    ranger();

    return () => {
      flux.arreter(hote);
      flux.accueillir(projet.slug, null);
    };
  }, [projet.slug, mouvementReduit, flux, ranger]);

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
      .to(hero.querySelector(".chambre__voile"), { opacity: 0.55, ease: "none" }, 0)
      /* Le repère s'efface dès qu'on défile : il a dit ce qu'il avait à dire.
         Un huitième de la course des deux autres tweens (0,5 s par défaut),
         donc bien avant que le hero ne s'assombrisse — et réversible comme le
         reste : on remonte, le repère revient. */
      .to(
        hero.querySelector(".chambre__defiler"),
        { opacity: 0, ease: "none", duration: 0.0625 },
        0,
      );

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
        data-flux={mouvementReduit ? "poster" : "attente"}
        aria-label={`${projet.nom}, ${projet.lieu}`}
      >
        <div className="chambre__media">
          {/* La poster : le LCP du chapitre, et la surface sur laquelle le flux
              se pose quand on arrive sans relève. En mouvement réduit, c'est
              elle et rien d'autre. */}
          <Image
            src={video.poster}
            width={video.largeur}
            height={video.hauteur}
            alt=""
            className="chambre__image"
            priority
            sizes="100vw"
          />
          {/* L'hôte du flux partagé. Vide au rendu : le nœud vidéo unique du
              layout vient s'y loger, en venant du menu ou du foyer. */}
          {mouvementReduit ? null : (
            <div className="chambre__flux" ref={fluxRef} aria-hidden="true" />
          )}
        </div>
        <div className="chambre__voile" aria-hidden="true" />

        {/* Le repère de défilement. Il ne paraît qu'une fois le plan installé,
            et il s'efface au premier tour de molette — c'est un repère, pas une
            invitation à cliquer : pas de flèche, pas de rebond, pas de centre. */}
        {mouvementReduit ? null : (
          <p className="chambre__defiler technique" aria-hidden="true">
            Défiler
          </p>
        )}
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
