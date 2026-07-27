"use client";

import { useRef } from "react";
import Image from "next/image";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { rangDe, type Projet } from "@/data/projets";
import { visuelsDe } from "@/data/visuels";
import { useRevele } from "@/components/motion/useRevele";
import { useMouvement } from "@/components/motion/MotionProvider";
import { useLangue } from "@/i18n/LangueProvider";
import { useSon, WOOSH_CRETE } from "@/components/chrome/SonProvider";
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
  const { t, dire, direTous } = useLangue();
  const { entrerProjet, quitterProjet, jouerEffet } = useSon();
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
  /**
   * **La nappe suit le menu — mais ce n'est pas elle qui la fait entrer.**
   *
   * Cet effet ne fait **rien à son premier tour**, et c'est tout le changement :
   * l'arrivée sur la page est désormais une mise en scène minutée (voir plus
   * bas, « L'entrée »), et c'est elle qui pose la nappe, sur la crête du woosh.
   * Si cet effet la posait aussi au montage, la musique partirait un demi-tour
   * de scène trop tôt et la crête n'aurait plus rien à faire arriver.
   *
   * Il ne reprend donc la main qu'aux **bascules suivantes** du menu : on
   * l'ouvre depuis la page projet, la nappe rend la main ; on le referme sans
   * être allé nulle part, elle revient — et sans cérémonie cette fois, parce
   * qu'on n'arrive pas, on revient.
   */
  const menuPrecedent = useRef<boolean | null>(null);
  useEffetVisuel(() => {
    if (menuPrecedent.current === null) {
      menuPrecedent.current = menuOuvert;
      return;
    }
    if (menuPrecedent.current === menuOuvert) return;
    menuPrecedent.current = menuOuvert;

    if (menuOuvert) quitterProjet();
    else entrerProjet(rangDe(projet.slug));
  }, [projet.slug, menuOuvert, entrerProjet, quitterProjet]);

  const heroRef = useRef<HTMLElement>(null);
  const fluxRef = useRef<HTMLDivElement>(null);
  /** Le nom du projet qui paraît à l'arrivée, puis s'en va. Voir « L'entrée ». */
  const annonceRef = useRef<HTMLParagraphElement>(null);
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

  /**
   * ---- L'entrée dans le projet ----
   *
   * Le menu s'est retiré, la vidéo tient le cadre. **Le nom du projet paraît
   * alors seul, en grand, par-dessus le plan** — puis s'en va. C'est la seconde
   * fois du site qu'un mot tient l'écran de cette façon, et c'est délibérément
   * *le même geste* que celui du logotype au seuil : opacité 0 → 1, échelle
   * 1,06 → 1, flou 10 px → 0, sur 1,8 s en sortie d'exponentielle. Le site n'a
   * qu'une apparition monumentale ; il s'en sert ici, et il ne l'invente pas.
   *
   * ## Le minutage, et pourquoi il n'y a pas deux sons
   *
   * Le woosh **est** ce qui fait arriver le mot : il part avec lui. Et la nappe
   * du projet n'entre pas après lui, elle entre **sur sa crête** — mesurée à
   * 0,45 s dans le fichier, exportée en `WOOSH_CRETE`. On n'entend donc pas un
   * effet puis une musique, on entend une montée qui débouche sur une musique.
   *
   * La synchronisation ne repose pas sur deux minuteries lancées côte à côte, ce
   * qui dériverait : `jouerEffet` reçoit le même `WOOSH_CRETE` comme échéance et
   * **cale la crête du fichier dessus** quoi qu'il arrive — décodage en retard,
   * contexte audio pas encore autorisé. La nappe, elle, part à cette échéance.
   * Les deux visent le même instant absolu, pas la même durée.
   *
   * ## Pourquoi cela vaut aussi quand on n'arrive pas du menu
   *
   * L'entrée est jouée à **toute** arrivée sur une page projet — depuis le menu,
   * depuis l'enfilade, ou par l'adresse directe. C'est la même page, et deux
   * façons d'y entrer selon la porte empruntée se remarqueraient bien plus que
   * l'uniformité. Ce qui la déclenche est l'arrivée, pas le clic.
   *
   * En mouvement réduit, il n'y a ni woosh ni mise en scène : le nom est déjà
   * dans la page, la nappe entre sur-le-champ.
   */
  useEffetVisuel(() => {
    const annonce = annonceRef.current;

    if (mouvementReduit || annonce === null) {
      entrerProjet(rangDe(projet.slug));
      return () => quitterProjet();
    }

    jouerEffet("woosh", WOOSH_CRETE);

    /* La nappe entre sur la crête. `setTimeout` suffit ici et un ticker serait
       de trop : c'est un rendez-vous unique, pas un suivi par frame. */
    const nappe = window.setTimeout(
      () => entrerProjet(rangDe(projet.slug)),
      WOOSH_CRETE * 1000,
    );

    const sequence = gsap
      .timeline()
      .fromTo(
        annonce,
        { opacity: 0, scale: 1.06, filter: "blur(10px)" },
        {
          opacity: 1,
          scale: 1,
          filter: "blur(0px)",
          duration: 1.8,
          ease: "expo.out",
        },
      )
      /* Il tient, le temps qu'on le lise et qu'on entende la nappe s'installer
         dessous. */
      .to({}, { duration: 1.2 })
      /* Et il s'en va par où il est venu — le même flou, en sens inverse. La
         durée est franchement au-dessus de la zone interdite du Livre I : on
         est ample, pas médiocre. */
      .to(annonce, {
        opacity: 0,
        filter: "blur(8px)",
        duration: 0.9,
        ease: "power2.inOut",
      });

    return () => {
      window.clearTimeout(nappe);
      sequence.kill();
      quitterProjet();
    };
  }, [
    projet.slug,
    mouvementReduit,
    entrerProjet,
    quitterProjet,
    jouerEffet,
  ]);

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

        {/* L'annonce : le nom du projet, seul, par-dessus le plan, le temps
            d'arriver. Voir « L'entrée » plus haut pour le geste et son minutage.

            **Ce n'est pas un titre, et il ne doit surtout pas en être un.** Le
            `<h1>` du projet existe déjà, sur la première vue, et le hero porte
            son nom en `aria-label`. Cette annonce-ci est purement visuelle : un
            second niveau de titre ferait deux fois le même nom pour un lecteur
            d'écran, et un `<h1>` en double casserait le plan du document. D'où
            le paragraphe, et `aria-hidden`.

            Le centrage est demandé, et il cite : c'est la place du logotype au
            seuil, dont cette apparition reprend le geste à la valeur près. Les
            deux seules autres exceptions à « rien n'est centré » sont ce
            logotype et le mot LUMIÈRE, et toutes trois sont le même moment — un
            mot seul qui tient l'écran. */}
        {mouvementReduit ? null : (
          <p className="chambre__annonce display" ref={annonceRef} aria-hidden="true">
            {projet.nom}
          </p>
        )}

        {/* Le repère de défilement. Il ne paraît qu'une fois le plan installé,
            et il s'efface au premier tour de molette.

            **Ce n'est plus un mot, c'est une marque.** « Défiler » disait à voix
            haute ce que le geste montre : sur un plan qui tient l'écran entier,
            un impératif écrit est la seule chose qu'on lit, et il devient la
            seule chose qu'on regarde. La marque, elle, se comprend sans se lire
            — et elle se comprend dans toutes les langues, ce que le mot ne
            faisait même pas (il était codé en dur en français).

            Elle reste dans le vocabulaire du site : deux filets d'un pixel,
            angles vifs, aucune couleur propre. Pas de flèche, pas de rebond, pas
            de souris arrondie — le Livre I interdit l'un et l'autre. Une piste
            verticale, et un segment qui la descend : c'est le défilement lui-même,
            pas son icône.

            Le centre est demandé, et c'est une exception assumée à « rien n'est
            centré » : le repère est sous le plan, au bord bas, là où le regard
            tombe quand il a fini de regarder. */}
        {mouvementReduit ? null : (
          <span className="chambre__defiler" aria-hidden="true">
            {/* Le segment vit **dans** la piste, qui le borne. */}
            <span className="chambre__defiler-piste">
              <span className="chambre__defiler-curseur" />
            </span>
            <span className="chambre__defiler-socle" />
          </span>
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
          <p className="technique">{t("chambreProgramme")}</p>
          <p className="chambre__revele chambre__chapo">
            {dire(projet.programme)}
          </p>
        </div>

        <div className="chambre__texte">
          {direTous(projet.fiche).map((paragraphe) => (
            <p className="chambre__revele" key={paragraphe.slice(0, 24)}>
              {paragraphe}
            </p>
          ))}
        </div>

        {/* La grille d'étiquettes, dissoute en une seule ligne décrochée. */}
        <p className="chambre__ligne chambre__revele technique">
          <span>{projet.lieu}</span>
          <span>{projet.surface} m²</span>
          <span>
            {t("chambreLivraison")} {dire(projet.livraison)}
          </span>
          <span>{direTous(projet.matieres).join(" / ")}</span>
          <span>{projet.photographe}</span>
        </p>
      </section>
    </article>
  );
}
