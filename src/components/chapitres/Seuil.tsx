"use client";

import { useRef } from "react";
import { gsap } from "@/lib/gsap";
import { useLogo } from "@/components/chrome/LogoProvider";
import { useDefilement } from "@/components/motion/LenisProvider";
import { useMouvement } from "@/components/motion/MotionProvider";
import { useEffetVisuel } from "@/lib/isomorphe";
import "./seuil.css";

/**
 * Le Seuil.
 *
 * Écran noir, une vidéo plein cadre dans une villa vide. Le logotype apparaît
 * au centre, énorme, en `difference` sur la vidéo, ses lettres montant une à
 * une derrière une arête. Trois secondes. Puis le même nœud logo se déplace de
 * lui-même vers la barre de navigation, pendant que la vidéo se rétracte en
 * bande horizontale puis à rien, découvrant le vestibule.
 *
 * Le déplacement du logo est une transformation pure — échelle et translation,
 * jamais un changement de mise en page. C'est délibéré : le logo garde sa boîte
 * de repos du début à la fin, si bien que son vol du centre au coin n'entraîne
 * aucun recalcul de flux et le CLS reste à zéro. (GSAP Flip ferait le même
 * geste plus court à écrire, mais son échange de layout reflue le sous-arbre
 * des lettres et se compte, lui, comme un décalage — mesuré à ~0,29.)
 *
 * La séquence ne joue qu'une fois par session : un script en tête de `<body>`
 * pose la classe `seuil-a-jouer` sur `<html>` avant la première peinture, et
 * seulement si `sessionStorage` ne l'a pas déjà vue. Au rechargement, la classe
 * est absente : l'overlay est masqué et le logo est déjà dans la nav, sans le
 * moindre clignotement.
 */

const CLE_SESSION = "rouviere:seuil-vu";

export function Seuil() {
  const { ref: logoRef } = useLogo();
  const { arreter, reprendre } = useDefilement();
  const { mouvementReduit } = useMouvement();

  const overlayRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  /* Le bouton d'évitement, rendu par React, déclenche une fonction créée dans
     l'effet une fois les polices prêtes : elle transite par cette ref. */
  const sauterRef = useRef<(() => void) | null>(null);
  /* `MotionProvider` corrige `mouvementReduit` dans son propre effet de layout,
     qui s'exécute après celui, enfant, du seuil. L'effet ci-dessous ne le lit
     donc pas directement — il le lirait avant correction — mais par cette ref,
     tenue à jour à chaque rendu et consultée seulement une fois les polices
     prêtes, bien après que le provider a tranché. */
  const mouvementReduitRef = useRef(mouvementReduit);
  mouvementReduitRef.current = mouvementReduit;

  useEffetVisuel(() => {
    const html = document.documentElement;
    /* Rechargement dans la même session : rien à jouer. Le logo est déjà posé,
       l'overlay est masqué par CSS. On ne verrouille même pas le défilement. */
    if (!html.classList.contains("seuil-a-jouer")) return;

    const logo = logoRef.current;
    const overlay = overlayRef.current;
    const video = videoRef.current;
    if (logo === null || overlay === null) return;
    const lettres = logo.querySelectorAll<HTMLElement>(".logo__lettre");

    let annule = false;
    let fini = false;
    let enTransition = false;
    let poser: gsap.core.Tween | null = null;

    arreter("seuil");
    /* Le vol du logo se calcule en coordonnées viewport : il faut être en haut
       de la page, sinon un défilement restauré fausse le centrage. */
    window.scrollTo(0, 0);

    const finaliser = () => {
      fini = true;
      gsap.set(overlay, { display: "none", visibility: "hidden" });
      video?.pause();
      reprendre("seuil");
      try {
        sessionStorage.setItem(CLE_SESSION, "1");
      } catch {
        /* Navigation privée ou stockage refusé : la séquence rejouera au
           prochain chargement. Ce n'est pas une erreur. */
      }
    };

    const transiter = (dureeVol: number, dureeClip: number) => {
      if (enTransition) return;
      enTransition = true;

      poser?.kill();
      gsap.killTweensOf(lettres);
      gsap.set(lettres, { yPercent: 0, y: 0 });

      /* L'overlay ne se montre que sous `seuil-a-jouer` ; on le fige visible en
         inline avant de retirer la classe, sinon il disparaît d'un coup au lieu
         de se laisser rétracter par le clip. */
      gsap.set(overlay, { display: "block" });

      /* Le geste signature : un seul nœud, du centre au coin, en un mouvement.
         On efface simplement la transformation qui le tenait géant et centré —
         il reprend sa boîte de repos, échelle 1, translation nulle. Rien ne
         reflue, donc rien ne décale. À la fin, on rend le logo à son CSS. */
      gsap.to(logo, {
        x: 0,
        y: 0,
        scale: 1,
        duration: dureeVol,
        ease: "power4.inOut",
        onComplete: () => {
          gsap.set(logo, { clearProps: "transform,transformOrigin" });
          html.classList.remove("seuil-a-jouer");
        },
      });

      /* En même temps, la vidéo se referme : d'abord une bande horizontale,
         puis plus rien. Le fond de l'overlay est l'encre du site, donc le
         vestibule apparaît sans coupure de couleur. */
      gsap
        .timeline({ onComplete: finaliser })
        .to(overlay, {
          clipPath: "inset(45% 0% 45% 0%)",
          duration: dureeClip * 0.55,
          ease: "power2.inOut",
        })
        .to(overlay, {
          clipPath: "inset(50% 0% 50% 0%)",
          duration: dureeClip * 0.45,
          ease: "power2.in",
        });
    };

    /* On ne mesure aucun texte avant que sa police ne soit là : Gambetta charge
       en `display: block`, et le calcul du vol porterait sinon sur la géométrie
       du repli, décalée. */
    document.fonts.ready.then(() => {
      if (annule) return;

      /* Le logo occupe déjà sa boîte de repos (petite, en haut à gauche). On la
         mesure, puis on pose la transformation qui le fait paraître énorme et
         centré : origine au coin haut-gauche, mise à l'échelle pour couvrir la
         largeur voulue, translation vers le centre du viewport. Les lettres
         sont encore cachées sous l'arête — rien de visible ne saute. */
      const repos = logo.getBoundingClientRect();
      const largeurCible = Math.min(innerWidth * 0.82, 1200);
      const echelle = largeurCible / repos.width;
      gsap.set(logo, {
        transformOrigin: "0 0",
        scale: echelle,
        x: (innerWidth - repos.width * echelle) / 2 - repos.left,
        y: (innerHeight - repos.height * echelle) / 2 - repos.top,
      });

      sauterRef.current = () => transiter(0.3, 0.3);

      if (mouvementReduitRef.current) {
        /* Pas de reveal lettre à lettre : le seuil se compose, il ne s'agite
           pas. La vidéo cède la place à sa poster (première image), une courte
           pause, puis le geste en 0,3 s. */
        if (video !== null) {
          video.pause();
          video.currentTime = 0;
        }
        gsap.set(lettres, { yPercent: 0, y: 0 });
        poser = gsap.delayedCall(0.5, () => transiter(0.3, 0.3));
        return;
      }

      /* Les lettres montent derrière l'arête, décalées de façon irrégulière —
         un ease sur la distribution du stagger, jamais un pas constant.

         `y: 0` est explicite et non décoratif : la règle CSS qui cache les
         lettres avant l'hydratation pose `transform: translateY(120%)`, que
         GSAP lit comme un `y` de base en pixels. Sans l'épingler à zéro,
         l'animation de `yPercent` s'ajouterait à cette base et les lettres
         ne remonteraient jamais jusqu'à l'arête. */
      gsap.fromTo(
        lettres,
        { yPercent: 120, y: 0 },
        {
          yPercent: 0,
          y: 0,
          duration: 0.72,
          ease: "expo.out",
          stagger: { each: 0.09, from: "start", ease: "power2.in" },
        },
      );
      /* Trois secondes, puis le logo part et la vidéo se referme, en 1,15 s. */
      poser = gsap.delayedCall(3, () => transiter(1.15, 1.15));
    });

    return () => {
      annule = true;
      sauterRef.current = null;
      poser?.kill();
      gsap.killTweensOf(lettres);
      gsap.killTweensOf(overlay);
      if (!fini) {
        /* Démontage en pleine intro (rare : défilement verrouillé, logo inerte).
           Le logo est un nœud persistant du layout — on ne le laisse pas figé,
           géant, à la page suivante : retour au repos, verrou levé, classe ôtée. */
        gsap.killTweensOf(logo);
        gsap.set(logo, { clearProps: "transform,transformOrigin" });
        html.classList.remove("seuil-a-jouer");
        reprendre("seuil");
      }
    };
    /* Le seuil est un geste unique joué au montage : il ne se rejoue pour aucune
       dépendance. La préférence de mouvement est lue par ref, au bon moment,
       et `arreter`/`reprendre` sont stables par construction. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="seuil" ref={overlayRef} aria-hidden="true">
      <button
        type="button"
        className="seuil__passer"
        onClick={() => sauterRef.current?.()}
      >
        Passer l&apos;introduction
      </button>
      <video
        ref={videoRef}
        className="seuil__video"
        poster="/video/seuil-poster.avif"
        autoPlay={!mouvementReduit}
        muted
        loop
        playsInline
        preload="metadata"
      >
        <source src="/video/seuil.webm" type="video/webm" />
        <source src="/video/seuil.mp4" type="video/mp4" />
      </video>
    </div>
  );
}
