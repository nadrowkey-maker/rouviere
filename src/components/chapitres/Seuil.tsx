"use client";

import { useRef, useState } from "react";
import { gsap } from "@/lib/gsap";
import { EcranEntree } from "./EcranEntree";
import { useLogo } from "@/components/chrome/LogoProvider";
import { useSon } from "@/components/chrome/SonProvider";
import { useDefilement } from "@/components/motion/LenisProvider";
import { useMouvement } from "@/components/motion/MotionProvider";
import { useEffetVisuel } from "@/lib/isomorphe";
import { largeurLogotype } from "@/lib/logotype";
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
 * au centre et se range dans la barre. Son placement « centre géant » est une
 * transformation pure (échelle + translation) qui n'entraîne aucun reflux —
 * CLS à zéro. La séquence ne joue qu'une fois par session : un script en tête de
 * `<body>` pose `seuil-a-jouer` sur `<html>` tant que `sessionStorage` ne l'a
 * pas vue. Au rechargement, la classe est absente : ni écran d'entrée, ni
 * apparition, le logo est déjà dans la barre et le hero est là.
 */

const CLE_SESSION = "rouviere:seuil-vu";
const CLE_CHOIX = "rouviere:entree-son";

const HERO_VIDEO = "/media/hero/hero.mp4";
const HERO_POSTER = "/media/hero/hero-poster.avif";

export function Seuil() {
  const { ref: logoRef } = useLogo();
  const { activerSon, reglerSortieHero } = useSon();
  const { arreter, reprendre } = useDefilement();
  const { mouvementReduit } = useMouvement();

  const [pret, setPret] = useState(false);

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
    if (hero === null || voile === null) return;

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
        onUpdate: (self) => reglerSortieHero(self.progress),
      },
    });
    /* Le hero ne se déplace pas, et ne bouge pas du tout : il s'éteint.
       Le voile passe de 0 à 1, et c'est tout ce qui se passe — pas de montée
       d'échelle sur la vidéo, pas de glissement, pas de dérive verticale. On
       éteint une pièce, on ne fait pas défiler une image. Un scrub, jamais une
       durée fixe : la progression suit la main, et se rembobine avec elle. */
    tl.to(voile, { opacity: 1, ease: "none" }, 0);

    return () => {
      tl.scrollTrigger?.kill();
      tl.kill();
      /* Le seuil se démonte à la navigation : le parcours n'est plus dans le
         hero, la nappe du site prend toute la place. */
      reglerSortieHero(1);
    };
  }, [reglerSortieHero]);

  /* --- L'intro : préchargeur, puis apparition sur choix. --- */
  useEffetVisuel(() => {
    const html = document.documentElement;
    /* Rechargement dans la même session : ni écran d'entrée, ni apparition. Le
       logo est déjà posé, le hero est là, le défilement n'est pas verrouillé. */
    if (!html.classList.contains("seuil-a-jouer")) return;

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

    const revelerChrome = () => {
      const droite = document.querySelector<HTMLElement>(".barre-nav__droite");
      html.classList.remove("seuil-a-jouer");
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

    const rangerDansNav = (duree: number) => {
      /* Le vol du centre au coin : on efface la transformation qui tenait le
         logo géant et centré, il reprend sa boîte de repos. Rien ne reflue. */
      gsap.to(logo, {
        x: 0,
        y: 0,
        scale: 1,
        duration: duree,
        ease: "power4.inOut",
        onComplete: () => {
          gsap.set(logo, { clearProps: "transform,transformOrigin" });
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

        /* On mesure la boîte de repos (petite, en haut à gauche), puis on pose
           la transformation qui rend le logo géant et centré : origine au coin,
           échelle pour couvrir la largeur voulue, translation vers le centre.
           Le mot est encore à opacité 0 — rien de visible ne saute. */
        const repos = logo.getBoundingClientRect();
        /* La largeur du monument n'est pas décidée ici : elle vient de la loi
           commune, que la sortie applique à l'autre bout du parcours. Voir
           `lib/logotype.ts` — les deux extrémités du fil sont le même mot. */
        const largeurCible = largeurLogotype(innerWidth);
        const echelle = largeurCible / repos.width;
        gsap.set(logo, {
          transformOrigin: "0 0",
          scale: echelle,
          x: (innerWidth - repos.width * echelle) / 2 - repos.left,
          y: (innerHeight - repos.height * echelle) / 2 - repos.top,
        });

        if (reduit) {
          /* Pas de générique : le mot est simplement là, puis se range. */
          gsap.set(mot, { opacity: 1, scale: 1, filter: "blur(0px)" });
          sequence = gsap
            .timeline({ delay: 0.4 })
            .add(() => rangerDansNav(0.3));
          return;
        }

        /* 2,5 s de vidéo seule, puis l'apparition en générique de film, puis
           1,5 s de pose, puis le rangement dans la barre. */
        sequence = gsap.timeline({ delay: 2.5 });
        sequence
          .fromTo(
            mot,
            { opacity: 0, scale: 1.06, filter: "blur(10px)" },
            {
              opacity: 1,
              scale: 1,
              filter: "blur(0px)",
              duration: 1.8,
              ease: "expo.out",
            },
          )
          .to({}, { duration: 1.5 })
          .add(() => rangerDansNav(1.15));
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
           levé, classe ôtée. */
        gsap.set(logo, { clearProps: "transform,transformOrigin" });
        gsap.set(mot, { clearProps: "opacity,transform,filter" });
        html.classList.remove("seuil-a-jouer");
        reprendre("seuil");
      }
    };
    /* Le seuil est un geste unique joué au montage : il ne se rejoue pour aucune
       dépendance. La préférence de mouvement est lue par ref, au bon moment. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="hero" data-chapitre="Le Seuil" ref={heroRef}>
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
        <source src={HERO_VIDEO} type="video/mp4" />
      </video>
      {/* Le voile de sortie : noir, monté en scrub au défilement. */}
      <div className="hero__voile" aria-hidden="true" ref={voileRef} />
      <EcranEntree pret={pret} onEntrer={handleEntrer} conteneurRef={ecranRef} />
    </section>
  );
}
