"use client";

import { useRef } from "react";
import Image from "next/image";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { planchesAtelier, texteAtelier } from "@/data/atelier";
import { useMouvement } from "@/components/motion/MotionProvider";
import { useEffetVisuel } from "@/lib/isomorphe";
import { decalageDans } from "@/lib/mesure";
import {
  fenetre,
  cadrage,
  PLEIN,
  type Boite,
} from "@/components/motion/plongee";
import "./atelier.css";

/**
 * L'Atelier. Retour au gris, retour au calme.
 *
 * Ce chapitre est une **séquence filmée**, pas une galerie. La différence est
 * entière et tient en une phrase : dans une galerie, on fait défiler des
 * images devant un œil fixe ; ici le cadre est fixe et c'est le sujet qui le
 * traverse.
 *
 * Trois mécanismes, et rien d'autre.
 *
 * — **Le guichet.** Chaque planche est enfermée dans une fenêtre de 85 à 100 vh
 *   qui, elle, ne bouge jamais. L'image à l'intérieur est plus haute que sa
 *   fenêtre et remonte au défilement : c'est un vrai travelling interne, pas
 *   une image qu'on pousse. C'est ce décalage entre le cadre immobile et le
 *   sujet mobile qui fait le plan de cinéma.
 * — **La dominance.** Une planche gagne son échelle pleine quand elle est au
 *   centre du cadre et la perd en s'en éloignant. Une seule est donc dominante
 *   à la fois ; les voisines sont là, plus petites, en retrait de lumière. La
 *   courbe est un cosinus de la distance au centre — continue, sans palier,
 *   donc jamais un « effet » qui se déclenche.
 * — **La variance d'échelle et le débordement.** Ils ne sont pas calculés :
 *   ils sont écrits planche par planche dans `data/atelier.ts`. Une planche à
 *   44 % de large suivie d'une à 108 % qui sort du cadre par la droite, c'est
 *   un montage ; une largeur dérivée de l'index en serait la caricature.
 *
 * ## La plongée — le point culminant
 *
 * Une séquence qui ne fait que traverser n'a pas de sommet : elle a un rythme,
 * puis elle s'arrête. Il en manquait un.
 *
 * **Une seule fois**, sur la planche déclarée `plongee` dans le manifeste — la
 * grande table de l'atelier, la seule qui déborde des deux marges —, la
 * séquence s'interrompt : le temps est épinglé au centre du cadre, et **on entre
 * dans le plan**. Les quatre bords de son guichet partent rejoindre les
 * quatre bords de l'écran pendant que son contenu se magnifie d'autant (voir
 * `motion/plongee.ts` : c'est une caméra qui avance, pas une image qui grossit).
 * Puis l'image **tient le plein écran**, et l'épinglage rend la main : la suite
 * de la séquence reprend par le défilement, sous elle.
 *
 * Il n'y a **pas de retour**. L'échelle ne redescend pas, la planche ne
 * réapparaît pas à sa taille d'avant : on est entré, on y reste, et c'est le
 * défilement qui emmène ailleurs. Une plongée qui se rembobine toute seule au
 * milieu de sa propre course se lit comme un tour de passe-passe.
 *
 * **Ce plan-là est filmé, et il est le seul du chapitre.** Une plongée qui aboutit
 * à une photographie n'est qu'un agrandissement : au sommet, quand les bords du
 * guichet ont rejoint ceux de l'écran, il faut qu'il reste quelque chose de vivant
 * dans l'image. Le plan avance très lentement sur la grande table — c'est un
 * mouvement d'appareil, pas un effet, et il ne fait rien d'autre. Le guichet et le
 * plein cadre montrent le même fichier ; le second se cale sur le premier à
 * l'entrée, faute de quoi le relais serait un saut de quelques images.
 *
 * Tout cela est **en scrub**, jamais en durée fixe : le palier lui-même est une
 * plage de la course, pas une seconde qui s'écoule. On remonte, la fenêtre se
 * referme sur la planche — c'est la main qui commande, du début à la fin.
 *
 * Et parce qu'un sommet n'existe que par ce qui l'entoure, **les deux planches
 * voisines s'assagissent** : un peu plus du tiers de leur travelling et de leur
 * retrait d'échelle et de lumière. La séquence se calme avant, se calme après,
 * et la plongée devient le seul endroit du chapitre où quelque chose arrive
 * vraiment.
 *
 * Ce qui a été retiré, et qui ne revient pas : la rotation en 3D des
 * photographies, leur envol en profondeur, le flou réactif à la vélocité. Le
 * texte du chapitre se cale dans les respirations de la séquence, entre deux
 * planches, jamais à côté d'une planche dominante.
 *
 * Grammaire de mouvement : **la traversée en échelle**, cadre fixe et sujet
 * mobile. La matière qui précède ne bouge pas d'un pixel et s'ouvre par masque ;
 * la sortie qui suit réfracte un titre immobile. Aucun des trois ne partage sa
 * grammaire avec son voisin.
 */

/**
 * Course du travelling interne, en pourcentage de la hauteur de l'image. La
 * planche est débordée de deux fois cette valeur (voir `atelier.css`) : c'est
 * ce surplus qui donne au sujet de quoi traverser sans jamais découvrir de
 * bord blanc.
 */
const TRAVELLING = 9;

/** Échelle perdue par une planche quand elle quitte le centre du cadre. */
const RETRAIT_ECHELLE = 0.14;

/** Lumière perdue par une planche hors du centre. Jamais jusqu'au noir. */
const RETRAIT_LUMIERE = 0.42;

/**
 * Ce que gardent les deux planches qui encadrent la plongée. Elles ne sont pas
 * arrêtées — une planche figée se remarquerait autant qu'une planche agitée —
 * elles sont mises en sourdine.
 */
const APAISEMENT = 0.36;

/** Course de la plongée, en hauteurs de fenêtre. */
const PLONGEE_COURSE = 1.7;

/**
 * Les deux temps de la plongée, en parts de sa course : on entre, on y reste.
 * Le palier est une **plage de défilement**, pas une pause minutée — c'est ce
 * qui rend le sommet réversible comme le reste. Il n'y a pas de troisième
 * temps : la traversée ne revient pas, elle repart d'ici.
 */
const PLONGEE_ENTREE = 0.64;
const PLONGEE_PALIER = 1 - PLONGEE_ENTREE;

/** Part de l'entrée pendant laquelle le plan plein cadre prend le relais. */
const PLONGEE_RELAIS = 0.2;

export function Atelier() {
  const { mouvementReduit } = useMouvement();
  const sectionRef = useRef<HTMLElement>(null);
  /* Les deux instances du plan filmé : celle du guichet, celle du plein cadre.
     Elles montrent le même fichier, et la seconde se cale sur la première à
     l'entrée de la plongée. */
  const guichetRef = useRef<HTMLVideoElement | null>(null);
  const pleinRef = useRef<HTMLVideoElement | null>(null);

  /* L'onglet passe en arrière-plan : plus rien ne décode. Même règle que pour
     les matières — c'est le point qui tue les sites mal finis. */
  useEffetVisuel(() => {
    const suspendre = () => {
      if (document.visibilityState === "visible") return;
      guichetRef.current?.pause();
      pleinRef.current?.pause();
    };
    document.addEventListener("visibilitychange", suspendre);
    return () => document.removeEventListener("visibilitychange", suspendre);
  }, []);

  useEffetVisuel(() => {
    const section = sectionRef.current;
    if (section === null) return;

    /* En mouvement réduit, la séquence devient un montage posé : les planches
       gardent leurs échelles et leurs débordements — c'est la composition, elle
       reste — mais plus rien ne traverse, et on ne plonge nulle part. Une
       version, pas une punition. */
    if (mouvementReduit) return;

    const contexte = gsap.context(() => {
      const plans = gsap.utils.toArray<HTMLElement>(".atelier__plan", section);
      const rangPlongee = plans.findIndex(
        (plan) => plan.dataset.plongee === "true",
      );

      plans.forEach((plan, rang) => {
        const image = plan.querySelector<HTMLElement>(".atelier__image");
        if (image === null) return;

        if (rang === rangPlongee) {
          construirePlongee(section, plan, guichetRef, pleinRef);
          return;
        }

        /* Les deux voisines immédiates du sommet se mettent en sourdine : le
           calme avant et après est ce qui fait la plongée. */
        const voisine = rangPlongee !== -1 && Math.abs(rang - rangPlongee) === 1;
        const facteur = voisine ? APAISEMENT : 1;

        const poserPlan = gsap.quickSetter(plan, "css");
        const poserImage = gsap.quickSetter(image, "y", "%");

        ScrollTrigger.create({
          trigger: plan,
          /* La course commence quand la planche entre par le bas et finit
             quand elle sort par le haut : sa progression est exactement sa
             position à l'écran, et le centre du cadre tombe donc à 0,5. */
          start: "top bottom",
          end: "bottom top",
          scrub: true,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            const t = self.progress;

            /* Le travelling : l'image descend du haut de son débord vers le
               bas. Linéaire — un travelling qui accélère est un travelling
               raté. */
            const course = TRAVELLING * facteur;
            poserImage(gsap.utils.interpolate(-course, course, t));

            /* La dominance : pleine au centre, en retrait aux bords. `sin(πt)`
               vaut 1 au centre et 0 aux deux extrémités, sans palier. */
            const centre = Math.sin(t * Math.PI);
            const retrait = (1 - centre) * facteur;
            poserPlan({
              scale: 1 - RETRAIT_ECHELLE * retrait,
              filter: `brightness(${1 - RETRAIT_LUMIERE * retrait})`,
            });
          },
        });
      });
    }, section);

    return () => contexte.revert();
  }, [mouvementReduit]);

  return (
    <section
      className="atelier"
      id="atelier"
      ref={sectionRef}
      data-chapitre="L'Atelier"
      data-reduit={mouvementReduit}
      aria-labelledby="atelier-titre"
    >
      <header className="atelier__entete grille">
        <h2 className="atelier__titre display" id="atelier-titre">
          {texteAtelier.titre}
        </h2>
        <p className="atelier__chapo">{texteAtelier.chapo}</p>
      </header>

      <div className="atelier__sequence">
        {planchesAtelier.map((planche, index) => {
          const paragraphe = texteAtelier.paragraphes.find(
            (p) => p.apres === index,
          );

          return (
            <div className="atelier__temps" key={planche.src}>
              <figure
                className="atelier__plan"
                data-cote={planche.cote}
                data-plongee={planche.plongee === true}
                /* Les proportions de la planche viennent du manifeste et
                   descendent dans la feuille de style par ces deux variables :
                   aucune largeur de planche n'est écrite en CSS. */
                style={
                  {
                    "--hauteur": `${planche.hauteur}vh`,
                    "--largeur": `${planche.largeur}%`,
                  } as React.CSSProperties
                }
              >
                <div className="atelier__guichet">
                  {planche.poster !== undefined ? (
                    /* Le plan filmé. En mouvement réduit, sa poster : une
                       version, pas une punition — la composition tient, le
                       mouvement disparaît. */
                    mouvementReduit ? (
                      <Image
                        className="atelier__image"
                        src={planche.poster}
                        width={planche.largeurFichier}
                        height={planche.hauteurFichier}
                        alt={planche.alt}
                        sizes="100vw"
                      />
                    ) : (
                      <video
                        className="atelier__image"
                        ref={(node) => {
                          guichetRef.current = node;
                        }}
                        src={planche.src}
                        poster={planche.poster}
                        width={planche.largeurFichier}
                        height={planche.hauteurFichier}
                        preload="metadata"
                        muted
                        loop
                        playsInline
                        aria-label={planche.alt}
                      />
                    )
                  ) : (
                    <Image
                      className="atelier__image"
                      src={planche.src}
                      width={planche.largeurFichier}
                      height={planche.hauteurFichier}
                      alt={planche.alt}
                      sizes={`(max-width: 48rem) 100vw, ${Math.round(planche.largeur)}vw`}
                    />
                  )}
                </div>
                <figcaption className="atelier__note technique">
                  {planche.note}
                </figcaption>
              </figure>

              {/* Le plan de la plongée : plein cadre dès le départ, avec une
                  fenêtre découpée dessus qui s'ouvre jusqu'aux quatre bords.
                  C'est la même photographie que le guichet — donc rien de neuf
                  à annoncer, elle est déjà décrite là. En mouvement réduit il
                  n'y a pas de plongée : le plan n'est pas rendu du tout. */}
              {planche.plongee === true && !mouvementReduit ? (
                <div
                  className="atelier__plongee"
                  data-aspect={planche.largeurFichier / planche.hauteurFichier}
                  aria-hidden="true"
                >
                  <video
                    className="atelier__plongee-image"
                    ref={(node) => {
                      pleinRef.current = node;
                    }}
                    src={planche.src}
                    poster={planche.poster}
                    width={planche.largeurFichier}
                    height={planche.hauteurFichier}
                    preload="auto"
                    muted
                    loop
                    playsInline
                    tabIndex={-1}
                  />
                </div>
              ) : null}

              {/* La respiration : le texte se cale entre deux planches, dans la
                  marge opposée à celle qui vient de passer. */}
              {paragraphe !== undefined ? (
                <p className="atelier__texte" data-cote={planche.cote}>
                  {paragraphe.texte}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}

/**
 * La plongée. On entre dans la photographie par son guichet, jusqu'au plein
 * écran, et on y reste.
 *
 * ## Le repère, et pourquoi il était faux
 *
 * La première version mesurait le guichet et le temps chacun **dans son propre
 * repère** : le guichet par rapport à la section, le temps par ses `offsetLeft`
 * et `offsetTop` bruts. Or ScrollTrigger enveloppe un élément épinglé dans un
 * `pin-spacer` positionné : dès le premier rafraîchissement, `temps.offsetTop`
 * ne valait plus sa position dans la section mais zéro dans son spacer, tandis
 * que le guichet, lui, comptait toujours depuis la section. Les deux quantités
 * ne parlaient plus de la même chose, la translation calculée valait plusieurs
 * milliers de pixels, et la planche partait hors du cadre — d'où l'écran noir,
 * et le retour « par magie » à la fin de la course.
 *
 * La correction tient en une idée : **on ne compare que des mesures prises
 * depuis la même racine**. Les deux décalages sont relevés par rapport à la
 * section, en sommant la chaîne des `offsetParent` ; ils traversent donc tous
 * deux le spacer, qui s'annule dans leur différence. Le repère est juste, que la
 * planche soit épinglée ou non.
 *
 * ## Le cadre de la plongée
 *
 * L'épinglage se fait sur « center center » : pendant toute la plongée, le
 * centre du temps est exactement le centre de l'écran. Un plan absolument
 * positionné, centré sur le temps et mesurant une fenêtre entière, coïncide
 * donc au pixel près avec le viewport — sans `position: fixed`, que le
 * `transform` de `.scene-page` rendrait faux de toute façon.
 */
function construirePlongee(
  section: HTMLElement,
  plan: HTMLElement,
  videoGuichet: React.RefObject<HTMLVideoElement | null>,
  videoPlein: React.RefObject<HTMLVideoElement | null>,
): void {
  const guichet = plan.querySelector<HTMLElement>(".atelier__guichet");
  const note = plan.querySelector<HTMLElement>(".atelier__note");
  const temps = plan.closest<HTMLElement>(".atelier__temps");
  const cadre = temps?.querySelector<HTMLElement>(".atelier__plongee") ?? null;
  /* Par la classe, et non par le nom de balise : le plan de plongée est une
     vidéo. C'est la seule planche filmée du chapitre, et chercher un `img` ici
     revenait à ne jamais construire la plongée du tout. */
  const image =
    cadre?.querySelector<HTMLElement>(".atelier__plongee-image") ?? null;
  if (guichet === null || temps === null || cadre === null || image === null) {
    return;
  }

  const aspect = Number(cadre.dataset.aspect ?? "1");

  /* Muté au rafraîchissement, relu par les valeurs fonctionnelles du tween. */
  const depart = { clip: PLEIN, x: 0, y: 0, echelle: 1 };

  const mesurer = () => {
    /* Les deux décalages sont pris depuis la même racine : leur différence est
       la position du guichet dans le temps, épinglage ou pas. */
    const g = decalageDans(guichet, section);
    const t = decalageDans(temps, section);

    const ecran = { largeur: innerWidth, hauteur: innerHeight };
    /* Coin haut-gauche du plan plein cadre, dans le repère du temps. */
    const originX = temps.offsetWidth / 2 - ecran.largeur / 2;
    const originY = temps.offsetHeight / 2 - ecran.hauteur / 2;

    const boite: Boite = {
      gauche: g.x - t.x - originX,
      haut: g.y - t.y - originY,
      largeur: guichet.offsetWidth,
      hauteur: guichet.offsetHeight,
    };

    depart.clip = fenetre(boite, ecran);
    const cadrageDepart = cadrage(boite, ecran, aspect);
    depart.x = cadrageDepart.x;
    depart.y = cadrageDepart.y;
    depart.echelle = cadrageDepart.echelle;
  };

  const ligne = gsap.timeline({ defaults: { ease: "none" } });

  /* Le relais : le plan plein cadre prend la place du guichet. Même image, même
     cadrage — l'échange ne se voit pas, il n'y a rien à voir. */
  ligne.fromTo(
    cadre,
    { autoAlpha: 0 },
    { autoAlpha: 1, duration: PLONGEE_ENTREE * PLONGEE_RELAIS },
    0,
  );

  /* L'entrée : la fenêtre s'ouvre jusqu'aux quatre bords, l'image se magnifie
     d'autant. `power1.inOut` — on avance sans à-coup et on se pose. */
  ligne.fromTo(
    cadre,
    { clipPath: () => depart.clip },
    { clipPath: PLEIN, duration: PLONGEE_ENTREE, ease: "power1.inOut" },
    0,
  );
  ligne.fromTo(
    image,
    {
      x: () => depart.x,
      y: () => depart.y,
      scale: () => depart.echelle,
    },
    { x: 0, y: 0, scale: 1, duration: PLONGEE_ENTREE, ease: "power1.inOut" },
    0,
  );
  /* La couche technique se retire : au sommet, il n'y a que la photographie. */
  if (note !== null) {
    ligne.to(note, { opacity: 0, duration: PLONGEE_ENTREE * 0.4 }, 0);
  }

  /* Le palier : une plage de course où rien ne bouge. C'est le « on y reste ».
     Après lui, l'épinglage rend la main et la séquence repart par le défilement,
     sous une image qui est restée plein cadre. */
  ligne.to({}, { duration: PLONGEE_PALIER }, PLONGEE_ENTREE);

  /* ---- Le plan filmé, et le seul du chapitre ----
   *
   * La règle de décodage tient en une phrase : **rien ne joue hors de l'écran.**
   * C'est ce déclencheur-là, et lui seul, qui la fait respecter — pour les deux
   * instances. Il couvre la traversée de la planche du bas de l'écran au haut, ce
   * qui englobe la plongée : le plan plein cadre reste donc en lecture après que
   * l'épinglage a rendu la main, tant qu'on le voit. C'était le piège — la
   * plongée n'a pas de retour, l'image tient le plein écran pendant que la
   * séquence reprend dessous, et l'arrêter à la fin de l'épinglage la figeait
   * sous nos yeux.
   */
  ScrollTrigger.create({
    trigger: temps,
    start: "top bottom",
    /* La course est écrite, et non déduite d'un `bottom top`. Ce temps-ci est
       épinglé : pendant toute la plongée il ne se déplace pas, si bien qu'un
       `bottom top` — calculé sur sa boîte, qui ne bouge plus — tombait au milieu
       de l'épinglage et coupait les deux vidéos en plein sommet. On additionne
       donc explicitement ce que la planche traverse : sa propre hauteur, une
       hauteur d'écran, et la course de la plongée. */
    end: () =>
      `+=${temps.offsetHeight + innerHeight * (1 + PLONGEE_COURSE)}`,
    invalidateOnRefresh: true,
    onToggle: (self) => {
      const guichetVideo = videoGuichet.current;
      const pleinVideo = videoPlein.current;
      if (self.isActive) {
        if (guichetVideo !== null) void guichetVideo.play().catch(() => {});
        /* Le plein cadre ne se lance pas ici : il attend la plongée, qui le
           calera d'abord sur le guichet. */
      } else {
        guichetVideo?.pause();
        pleinVideo?.pause();
      }
    },
  });

  /** Cale le plein cadre sur le guichet, puis le lance. */
  const caler = () => {
    const plein = videoPlein.current;
    if (plein === null) return;
    const source = videoGuichet.current;
    if (source !== null && source.readyState > 0 && plein.readyState > 0) {
      plein.currentTime = source.currentTime;
    }
    void plein.play().catch(() => {});
  };

  ScrollTrigger.create({
    trigger: temps,
    start: "center center",
    end: () => `+=${innerHeight * PLONGEE_COURSE}`,
    pin: true,
    /* Même raison que sur l'enfilade : `.scene-page` porte en permanence un
       `transform` et un `filter`, ce qui fait d'elle le bloc conteneur de ses
       descendants fixes. Un épinglage par `position: fixed` s'y calerait sur la
       page et non sur le cadre. Une translation, elle, s'en moque. */
    pinType: "transform",
    scrub: true,
    invalidateOnRefresh: true,
    onRefreshInit: mesurer,
    /* Le plan plein cadre montre le même fichier que le guichet, mais c'est un
       second élément : deux flux du même film ne sont pas au même endroit s'ils
       n'ont pas démarré ensemble. On **cale donc le second sur le premier** à
       l'entrée de la plongée, et de là ils avancent d'un même pas — le relais est
       un fondu entre deux images quasi identiques, ce qui revient à n'en montrer
       qu'une. */
    onEnter: caler,
    onEnterBack: caler,
    /* On remonte au-dessus de la plongée : le plein cadre est redevenu
       invisible, il n'a plus à décoder. En avant, au contraire, il reste à
       l'écran et continue — c'est le déclencheur de traversée qui l'arrêtera. */
    onLeaveBack: () => videoPlein.current?.pause(),
    animation: ligne,
  });

  mesurer();
}
