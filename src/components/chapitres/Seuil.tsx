"use client";

import { useCallback, useRef, useState } from "react";
import { gsap } from "@/lib/gsap";
import { EcranEntree } from "./EcranEntree";
import { Defilement } from "@/components/chrome/Defilement";
import { useLogo } from "@/components/chrome/LogoProvider";
import { useSon } from "@/components/chrome/SonProvider";
import { useDefilement } from "@/components/motion/LenisProvider";
import { useMouvement } from "@/components/motion/MotionProvider";
import { useLangue } from "@/i18n/LangueProvider";
import { useEffetVisuel } from "@/lib/isomorphe";
import { largeurLogotype } from "@/lib/logotype";
import { sourcesPlan } from "@/lib/media";
import "./seuil.css";

/**
 * Le Seuil.
 *
 * Trois temps, et non plus un overlay qui disparaît.
 *
 *   1. **L'écran d'entrée** (voir `EcranEntree`) : un plein cadre noir, le
 *      logotype en petit, deux choix — avec le son, ou en silence. Il sert de
 *      sas audio (le clic débloque Web Audio) et de préchargeur (les boutons ne
 *      s'activent qu'une fois la vidéo du hero et sa poster prêtes).
 *
 *   2. **L'apparition.** À la sortie de l'écran d'entrée, la vidéo du hero
 *      occupe seule le plein cadre 2,5 s, sans rien. Puis ROUVIÈRE paraît au
 *      centre, d'un seul bloc — jamais lettre par lettre — en générique de
 *      film : opacité, échelle et flou se résorbent sur 1,8 s. Il tient 1,5 s,
 *      puis vole en haut à gauche. Une fois posé, le son et le burger arrivent.
 *
 *   3. **La sortie du hero.** Le hero reste dans le DOM, épinglé et
 *      **immobile** : rien ne se déplace, rien ne grandit, rien ne glisse. Un
 *      voile noir monte simplement de 0 à 1 en scrub, et voile plein, le
 *      vestibule est là. On éteint une pièce ; on ne fait pas défiler une
 *      image. Tout est réversible : on remonte, le voile se lève, la vidéo
 *      revient. Un clic sur le logotype ramène en haut sans rejouer
 *      l'apparition.
 *
 * Le logo est un nœud partagé (monté dans le layout) : c'est le même qui paraît
 * au centre et se range dans la barre. Son placement « centre géant » est un
 * corps écrit sur un nœud en position fixe — il grandit vers le bas et la
 * droite, son coin haut-gauche ne bouge pas, donc aucun élément instable et CLS
 * à zéro — et le vol jusqu'à la barre est une translation doublée d'une
 * réduction. Jamais un grossissement : c'est ce qui tenait le mot pixelisé sur
 * iOS (la note du corps de monument, plus bas, dit tout).
 * La séquence ne joue qu'une fois par session : un script en tête de
 * `<body>` pose `seuil-a-jouer` sur `<html>` tant que `sessionStorage` ne l'a
 * pas vue. Au rechargement, la classe est absente : ni écran d'entrée, ni
 * apparition, le logo est déjà dans la barre et le hero est là.
 */

const CLE_SESSION = "rouviere:seuil-vu";
const CLE_CHOIX = "rouviere:entree-son";

const HERO_VIDEO = "/media/hero/hero.mp4";
const HERO_POSTER = "/media/hero/hero-poster.avif";

/**
 * L'instant où le logotype **est là**, compté depuis le lancement de la
 * séquence. C'est ce que le son du titre doit viser, et ce n'est pas le début
 * du tween.
 *
 * Deux secondes et demie de vidéo seule, puis une apparition de 1,8 s en
 * `expo.out` — une courbe qui donne l'essentiel de sa course dans son premier
 * cinquième. Le mot est perceptuellement arrivé bien avant la fin du tween :
 * un peu plus de trois dixièmes suffisent. D'où 2,85 et non 2,5 (le mot n'est
 * alors rien) ni 4,3 (il est posé depuis longtemps).
 */
const ARRIVEE_LOGO = 2.85;

export function Seuil() {
  const { ref: logoRef } = useLogo();
  const { activerSon, reglerSortieHero, jouerEffet } = useSon();
  const { arreter, reprendre } = useDefilement();
  const { mouvementReduit } = useMouvement();
  const { t } = useLangue();

  const [pret, setPret] = useState(false);

  /**
   * **Le repère de défilement du hero.**
   *
   * La première image du site est une vidéo qui tient l'écran entier, sans un
   * mot, et le logotype vient d'aller se ranger dans la barre : il ne se passe
   * plus rien, et rien ne dit qu'il y a une suite. C'est exactement la situation
   * que la marque commune traite déjà dans le hero d'un projet — on lui donne
   * donc le même repère, au même endroit, avec le même dessin.
   *
   * **Il arrive en dernier.** Pas pendant l'apparition, où il ferait concurrence
   * au seul mot de l'écran : une fois le logotype posé et le chrome revenu. Le
   * décalage final est dans le CSS, sur la transition d'entrée seule.
   *
   * **Il ne revient pas.** Congédié, il l'est pour de bon — un repère qui
   * reparaît à chaque remontée en haut de page cesse d'être un repère et devient
   * un rappel. Deux gestes le congédient, et ce sont les deux façons de répondre
   * à ce qu'il demande : le premier cran de défilement, et le clic sur le hero.
   *
   * **On ne congédie que ce qui a été offert**, et ce n'est pas une précaution
   * de style. L'écran d'entrée est un enfant du hero : le clic qui choisit le
   * son ou le silence descend donc jusqu'à l'écouteur du hero. Sans ce verrou,
   * le premier geste de la visite congédiait pour de bon un repère qui n'était
   * pas encore né, et il ne paraissait jamais.
   */
  const [defilementLa, setDefilementLa] = useState(false);
  const defilementOffert = useRef(false);
  const defilementCongedie = useRef(false);

  const congedierDefilement = useCallback(() => {
    if (!defilementOffert.current || defilementCongedie.current) return;
    defilementCongedie.current = true;
    setDefilementLa(false);
  }, []);

  const offrirDefilement = useCallback(() => {
    if (defilementCongedie.current) return;
    defilementOffert.current = true;
    setDefilementLa(true);
  }, []);

  const heroRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const voileRef = useRef<HTMLDivElement>(null);
  const ecranRef = useRef<HTMLDivElement>(null);
  /* La fonction qui lance l'apparition, créée dans l'effet une fois la scène
     prête, appelée par le clic d'un des deux boutons de l'écran d'entrée. */
  const entrerRef = useRef<((avecSon: boolean) => void) | null>(null);

  /* `MotionProvider` corrige `mouvementReduit` dans son propre effet, qui court
     après celui, enfant, du seuil. On lit donc la préférence par ref, au moment
     du clic — bien après que le provider a tranché — jamais dans l'effet même. */
  const mouvementReduitRef = useRef(mouvementReduit);
  mouvementReduitRef.current = mouvementReduit;

  /* Le geste de clic : c'est lui qui autorise le son (Web Audio n'ouvre que dans
     un geste utilisateur). « Avec le son » arme la nappe, « en silence » la
     laisse coupée, puis on lance l'apparition. */
  const handleEntrer = (avecSon: boolean) => {
    /* `activerSon` pose l'état, il ne le bascule pas : le choix de l'écran
       d'entrée doit valoir quelle que soit la préférence retenue de la visite
       précédente. Une bascule rendrait le silence à qui vient de demander le
       son. */
    activerSon(avecSon);
    entrerRef.current?.(avecSon);
  };

  /* --- La sortie du hero : voile en scrub, réversible. Indépendante de
     l'intro, montée dans tous les cas. --- */
  useEffetVisuel(() => {
    const hero = heroRef.current;
    const voile = voileRef.current;
    const video = videoRef.current;
    if (hero === null || voile === null || video === null) return;

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: hero,
        start: "top top",
        end: "+=100%",
        pin: true,
        /* **C'est la ligne qui décide si le hero s'éteint ou s'en va.**
           `.scene-page` — la surface qui recule derrière le menu — porte en
           permanence un `transform` et un `filter`, fût-ce à l'identité. L'un
           comme l'autre font d'un élément le bloc conteneur de ses descendants
           fixes : l'épinglage par défaut, qui passe par `position: fixed`, se
           calait donc sur la page et non sur le cadre, et le hero remontait
           avec le défilement au lieu de rester. Une translation, elle, se moque
           du bloc conteneur. Tous les autres épinglages du site portent déjà
           cette ligne ; celui-ci l'avait perdue. */
        pinType: "transform",
        scrub: true,
        invalidateOnRefresh: true,
        /* Le son sort du hero exactement comme l'image : sur la même
           progression, dans le même sens, réversible de la même façon. C'est
           la seule commande du fondu croisé hero → site — il n'y a nulle part
           de minuterie qui compterait les secondes passées en haut de page. */
        onUpdate: (self) => {
          reglerSortieHero(self.progress);
          /* Le premier cran de molette congédie le repère : il a dit ce qu'il
             avait à dire. Un seuil, et non `> 0` : au repos la progression
             oscille au millième près sur un redimensionnement ou un rebond
             élastique, et le repère partirait sans que personne n'ait rien
             demandé. Deux centièmes de la course valent une vingtaine de
             pixels — c'est un geste, plus un tremblement. */
          if (self.progress > 0.02) congedierDefilement();
        },
      },
    });
    /* Le hero ne se déplace pas, et ne bouge pas du tout : il s'éteint. Pas de
       montée d'échelle sur la vidéo, pas de glissement, pas de dérive
       verticale. On éteint une pièce, on ne fait pas défiler une image. Un
       scrub, jamais une durée fixe : la progression suit la main, et se
       rembobine avec elle.

       **L'extinction est une multiplication, pas une superposition**, et c'est
       tout le sujet. Le facteur tombe de 1 à 0 et le `calc()` de `seuil.css`
       le répercute sur la luminosité du plan : les ombres s'éteignent bien
       avant les hautes lumières, comme le fait la vraie lumière. Un voile noir
       monté en opacité aurait terni l'image uniformément, ce qui ne ressemble
       à rien qu'on ait déjà vu ailleurs que sur un site.

       `ease: "none"` sur les deux : la courbe est déjà dans la physique de la
       multiplication, en ajouter une seconde la déformerait.

       Le voile n'entre que sur le dernier quart. Il ne fait pas la sortie, il
       la pose : il amène le noir pur de l'extinction sur l'`--encre` du reste
       du site, et il tient le rendez-vous du vestibule à la progression 1. */
    tl.to(video, { "--extinction": 0, duration: 1, ease: "none" }, 0);
    tl.to(voile, { opacity: 1, duration: 0.25, ease: "none" }, 0.75);

    /* L'autre geste qui congédie le repère : le clic sur l'image. C'est un
       écouteur et non un `onClick` en JSX — une section n'est pas un contrôle,
       et lui accrocher un gestionnaire de clic obligerait à lui inventer un rôle
       et un équivalent clavier pour rien. Ici il n'y a rien à activer : on
       observe un geste qui se produit, on ne propose pas une commande.
       `pointerdown` plutôt que `click` : le repère s'en va sous le doigt, pas au
       relâchement. */
    hero.addEventListener("pointerdown", congedierDefilement);

    return () => {
      hero.removeEventListener("pointerdown", congedierDefilement);
      tl.scrollTrigger?.kill();
      tl.kill();
      /* Le facteur revient à sa valeur de repos. Sans cette ligne, un effet qui
         se remonterait laisserait la vidéo à l'extinction où la timeline a été
         tuée, et la nouvelle animerait 0 vers 0 : le hero rouvrirait éteint,
         définitivement. */
      gsap.set(video, { "--extinction": 1 });
      /* Le seuil se démonte à la navigation : le parcours n'est plus dans le
         hero, la nappe du site prend toute la place. */
      reglerSortieHero(1);
    };
  }, [reglerSortieHero, congedierDefilement]);

  /* --- L'intro : préchargeur, puis apparition sur choix. --- */
  useEffetVisuel(() => {
    const html = document.documentElement;
    /* Rechargement dans la même session : ni écran d'entrée, ni apparition. Le
       logo est déjà posé, le hero est là, le défilement n'est pas verrouillé.
       Le repère, lui, est offert tout de suite : il n'y a plus d'apparition à
       attendre, et la question qu'il répond est la même. */
    if (!html.classList.contains("seuil-a-jouer")) {
      offrirDefilement();
      return;
    }

    const logo = logoRef.current;
    const mot = logo?.querySelector<HTMLElement>(".logo__mot") ?? null;
    const ecran = ecranRef.current;
    const video = videoRef.current;
    if (logo === null || mot === null || ecran === null) return;

    let annule = false;
    let fini = false;
    let sequence: gsap.core.Timeline | null = null;

    arreter("seuil");
    /* L'apparition se calcule en coordonnées viewport : il faut être en haut. */
    window.scrollTo(0, 0);

    /* -- Le préchargeur : les boutons ne s'ouvrent qu'une fois la vidéo et la
       poster prêtes. Un filet de sécurité les débloque si un média cale, pour
       ne jamais enfermer le visiteur devant un écran noir. -- */
    let videoOk = video === null;
    let posterOk = false;
    const majPret = () => {
      if (videoOk && posterOk && !annule) setPret(true);
    };

    const surVideoPrete = () => {
      videoOk = true;
      majPret();
    };
    if (video !== null) {
      if (video.readyState >= 3) videoOk = true;
      else {
        video.addEventListener("canplay", surVideoPrete, { once: true });
        video.addEventListener("loadeddata", surVideoPrete, { once: true });
      }
    }

    const poster = new Image();
    const surPoster = () => {
      posterOk = true;
      majPret();
    };
    poster.onload = surPoster;
    /* Poster manquante ou refusée : on ne bloque pas l'entrée pour si peu. */
    poster.onerror = surPoster;
    poster.src = HERO_POSTER;

    majPret();
    const filet = window.setTimeout(() => {
      videoOk = true;
      posterOk = true;
      majPret();
    }, 6000);

    /* -- L'apparition, lancée par le clic. -- */
    const reduit = mouvementReduitRef.current;

    /**
     * **Le son du titre, et pourquoi il ne part pas sur l'apparition.**
     *
     * Il partait sur le `onStart` du tween, c'est-à-dire à l'instant exact où le
     * mot commence à paraître — et il arrivait « beaucoup trop tard ». Il fallait
     * regarder le fichier pour comprendre : `titre.mp3` dure 6,8 s et **c'est une
     * montée**. Elle part à −60 dB et culmine à 3,9 s. Déclenchée sur
     * l'apparition, elle faisait donc arriver son sommet quatre secondes *après*
     * le logotype, sur une image déjà rangée dans la barre.
     *
     * Une montée n'accompagne pas un geste, elle l'annonce : elle doit partir
     * avant lui, et c'est son sommet — pas son début — qui doit tomber dessus.
     * D'où le déclenchement **ici**, au clic, avec le temps qui reste à courir
     * jusqu'à l'apparition ; le provider fait le reste, en entrant dans le
     * fichier en cours de route puisque 3,9 s de montée ne tiennent pas dans les
     * quelques secondes disponibles (voir `jouerEffetSur`).
     *
     * Le verrou reste : l'apparition ne joue déjà qu'une fois par session, mais
     * un son qui date un geste ne doit jamais dater deux fois le même.
     */
    let titreJoue = false;
    const sonnerTitre = (dansSecondes: number) => {
      if (titreJoue) return;
      titreJoue = true;
      jouerEffet("titre", dansSecondes);
    };

    const revelerChrome = () => {
      const droite = document.querySelector<HTMLElement>(".barre-nav__droite");
      html.classList.remove("seuil-a-jouer");
      /* Le repère de défilement arrive avec le chrome, et c'est le dernier
         élément à se poser sur la première image. */
      offrirDefilement();
      if (droite === null) return;
      const boutons = Array.from(droite.children) as HTMLElement[];
      if (reduit) return; // la classe ôtée suffit : les commandes sont là.

      /* Le groupe est encore caché par la règle `.seuil-a-jouer` au moment où on
         arme le tween ; on le relève en inline (opacité et visibilité), puis on
         révèle le son et le burger décalés de 120 ms. */
      gsap.set(droite, { opacity: 1, visibility: "visible" });
      gsap.fromTo(
        boutons,
        { opacity: 0, y: -8 },
        {
          opacity: 1,
          y: 0,
          duration: 0.6,
          ease: "expo.out",
          stagger: 0.12,
          onComplete: () => gsap.set([droite, ...boutons], { clearProps: "all" }),
        },
      );
    };

    const rangerDansNav = (duree: number, reduction: number) => {
      /* Le vol du centre au coin : le mot **rétrécit** jusqu'à sa boîte de
         repos, il ne redescend pas d'un grossissement. Arrivé, on échange en un
         seul tick le corps de monument réduit contre le corps de repos à
         l'identité — même largeur, même coin, rien ne reflue. */
      gsap.to(logo, {
        x: 0,
        y: 0,
        scale: reduction,
        duration: duree,
        ease: "power4.inOut",
        onComplete: () => {
          gsap.set(logo, { clearProps: "transform,transformOrigin" });
          logo.style.removeProperty("font-size");
          revelerChrome();
          reprendre("seuil");
          fini = true;
        },
      });
    };

    const demarrer = (avecSon: boolean) => {
      if (annule || fini) return;
      /* Le choix, et le fait d'être entré, mémorisés : un rechargement tombera
         droit sur le hero. */
      try {
        sessionStorage.setItem(CLE_SESSION, "1");
        sessionStorage.setItem(CLE_CHOIX, avecSon ? "son" : "silence");
      } catch {
        /* Stockage refusé (navigation privée) : la séquence rejouera. */
      }

      /* L'écran d'entrée se retire, découvrant la vidéo seule. */
      gsap.to(ecran, {
        opacity: 0,
        duration: reduit ? 0.2 : 0.6,
        ease: "power2.inOut",
        onComplete: () => gsap.set(ecran, { display: "none" }),
      });

      /* Aucune mesure avant que Gambetta ne soit là : sur le repli, la boîte du
         logo est décalée et le centrage porterait à côté. */
      void document.fonts.ready.then(() => {
        if (annule) return;

        /**
         * **Le monument est un corps, pas un grossissement.**
         *
         * Le mot était peint à son corps de repos — dix-sept pixels — et
         * multiplié par la transformation : deux fois et demie sur un
         * téléphone, près de dix sur un grand écran. Sur iOS, c'est un mot
         * pixelisé, et la cause n'est pas le facteur mais le calque : `.logo`
         * porte `mix-blend-mode: difference` et un `will-change: transform`
         * permanent (voir `logo.css`), donc Safari le compose à part, le
         * tramant **une fois** à l'échelle où il l'a trouvé, et ne le retrame
         * pas tant que le hint est là. Le compositeur étirait donc une texture
         * de dix-sept pixels, et la tenait ainsi pendant la pose d'une seconde
         * et demie. Les moteurs de bureau retrament à l'arrêt du tween : le
         * défaut ne se voyait que sur iOS.
         *
         * On fait donc ici ce que la sortie fait déjà à l'autre bout du
         * parcours (`Sortie.tsx`) : on écrit un **corps**, et le mot est peint
         * net à sa taille de monument. La transformation ne sert plus qu'à le
         * centrer, puis à le réduire jusqu'à la barre — et une réduction, elle,
         * ne pixelise sur aucun moteur.
         *
         * Le corps n'est pas décidé ici : la largeur vient de la loi commune de
         * `lib/logotype.ts`, et le corps s'en déduit par mesure. Les deux
         * extrémités du fil restent le même mot à la même échelle.
         */
        const repos = logo.getBoundingClientRect();
        const corpsRepos = parseFloat(getComputedStyle(logo).fontSize);
        const largeurCible = largeurLogotype(innerWidth);
        /* Mot non peint (onglet ouvert en arrière-plan) : pas de monument
           plutôt qu'une division par zéro qui emporterait toute la séquence —
           et le défilement resterait verrouillé. */
        const facteur =
          repos.width > 0 && corpsRepos > 0 ? largeurCible / repos.width : 1;

        logo.style.fontSize = `${corpsRepos * facteur}px`;
        /* La boîte a grandi vers le bas et la droite : son coin haut-gauche n'a
           pas bougé d'un pixel — `.logo` est calé en `top`/`left` —, donc pas
           d'élément instable, donc CLS toujours à zéro. */
        const monument = logo.getBoundingClientRect();
        /* La réduction qui rend exactement la boîte de repos, mesurée et non
           supposée : `1 / facteur` ne serait juste qu'à l'arrondi près. */
        const reduction =
          monument.width > 0 ? repos.width / monument.width : 1;

        /* Reste à le centrer. Origine au coin pour que la réduction du vol
           ramène le mot sur le coin de la barre, translation vers le centre de
           l'écran. Le mot est encore à opacité 0 — rien de visible ne saute. */
        gsap.set(logo, {
          transformOrigin: "0 0",
          scale: 1,
          x: (innerWidth - monument.width) / 2 - monument.left,
          y: (innerHeight - monument.height) / 2 - monument.top,
        });

        if (reduit) {
          /* Pas de générique : le mot est simplement là, puis se range. Le son
             n'a donc rien à annoncer — il tombe sur l'instant même, et le
             provider n'en gardera que la retombée. */
          gsap.set(mot, { opacity: 1, scale: 1, filter: "blur(0px)" });
          sonnerTitre(0);
          sequence = gsap
            .timeline({ delay: 0.4 })
            .add(() => rangerDansNav(0.3, reduction));
          return;
        }

        /* **Le son part maintenant, l'image dans presque trois secondes.** La
           montée a besoin de tout ce temps-là pour arriver avec le mot et non
           derrière lui. C'est le seul son du site qui précède ce qu'il marque. */
        sonnerTitre(ARRIVEE_LOGO);

        /* 2,5 s de vidéo seule, puis l'apparition en générique de film, puis
           1,5 s de pose, puis le rangement dans la barre. */
        sequence = gsap.timeline({ delay: 2.5 });
        sequence
          .fromTo(
            mot,
            {
              opacity: 0,
              scale: 1.06,
              /* Le flou était écrit en pixels avant la transformation, donc
                 multiplié par elle : dix pixels devenaient vingt-sept sur un
                 téléphone et près de cent sur un grand écran. Le monument étant
                 désormais peint à son corps, la transformation ne multiplie plus
                 rien — on porte le facteur ici, et le générique garde à l'écran
                 exactement le flou qu'il avait. */
              filter: `blur(${(10 * facteur).toFixed(2)}px)`,
            },
            {
              opacity: 1,
              scale: 1,
              filter: "blur(0px)",
              duration: 1.8,
              ease: "expo.out",
            },
          )
          .to({}, { duration: 1.5 })
          .add(() => rangerDansNav(1.15, reduction));
      });
    };
    entrerRef.current = demarrer;

    return () => {
      annule = true;
      entrerRef.current = null;
      window.clearTimeout(filet);
      if (video !== null) {
        video.removeEventListener("canplay", surVideoPrete);
        video.removeEventListener("loadeddata", surVideoPrete);
      }
      poster.onload = null;
      poster.onerror = null;
      sequence?.kill();
      gsap.killTweensOf([logo, mot, ecran]);
      if (!fini) {
        /* Démontage en pleine intro : le logo est un nœud persistant, on ne le
           laisse ni géant ni figé à la page suivante. Retour au repos, verrou
           levé.
           **La classe de session, elle, reste.** Elle partait ici, et c'était le
           bug : le seul geste qui démonte le seuil sans qu'on soit entré est le
           changement de langue, qui change de route. La classe ôtée, le seuil
           remontait en croyant l'intro déjà vue — l'écran d'entrée ne jouait
           plus et l'on tombait sur le hero, sans avoir rien choisi. Cliquer EN
           doit changer la langue de l'écran d'entrée, et rien d'autre. */
        gsap.set(logo, { clearProps: "transform,transformOrigin" });
        gsap.set(mot, { clearProps: "opacity,transform,filter" });
        /* Le corps de monument est écrit en inline sur un nœud qui, lui, ne se
           démonte pas : sans cette ligne, le logotype partait géant à la page
           suivante. */
        logo.style.removeProperty("font-size");
        reprendre("seuil");
      }
    };
    /* Le seuil est un geste unique joué au montage : il ne se rejoue pour aucune
       dépendance. La préférence de mouvement est lue par ref, au bon moment. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="hero" data-chapitre={t("chapitreSeuil")} ref={heroRef}>
      {/* Le titre principal de la page vit ici, dans le hero qui reste toujours
          monté — jamais dans l'écran d'entrée, masqué au rechargement. */}
      <h1 className="sr-only">
        Rouvière — atelier d’architecture d’intérieur
      </h1>
      <video
        ref={videoRef}
        className="hero__video"
        aria-hidden="true"
        poster={HERO_POSTER}
        autoPlay={!mouvementReduit}
        muted
        loop
        playsInline
        preload="auto"
      >
        {/* Le master sur grand écran, la variante 720p ailleurs. L'ordre est
            celui de `lib/media.ts`, et il n'est pas indifférent. */}
        {sourcesPlan(HERO_VIDEO).map((source) => (
          <source
            key={source.src}
            src={source.src}
            type={source.type}
            media={source.media}
          />
        ))}
      </video>
      {/* Le repère de défilement — la marque commune (voir `chrome/Defilement`).

          Il est **sous le voile** dans l'ordre du DOM, et c'est voulu : le hero
          s'éteint, et tout ce qu'il porte s'éteint avec lui. Un repère qui
          survivrait à l'extinction serait la seule chose encore allumée dans une
          pièce qu'on vient de quitter.

          En mouvement réduit, il n'est pas rendu du tout : une marque qui bouge
          en boucle est exactement ce qu'on ne veut pas là. Le hero est alors
          posé, et la barre de défilement native fait le travail. */}
      {mouvementReduit ? null : (
        <Defilement className="hero__defilement" visible={defilementLa} />
      )}

      {/* Le voile de sortie : noir, monté en scrub au défilement. */}
      <div className="hero__voile" aria-hidden="true" ref={voileRef} />
      <EcranEntree pret={pret} onEntrer={handleEntrer} conteneurRef={ecranRef} />
    </section>
  );
}
