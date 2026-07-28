"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePathname } from "next/navigation";
import Lenis from "lenis";
import "lenis/dist/lenis.css";
import { ScrollTrigger } from "@/lib/gsap";
import { inscrire } from "@/lib/boucle";
import { positionAncre } from "@/lib/ancres";
import { useEffetVisuel } from "@/lib/isomorphe";
import { useMouvement } from "./MotionProvider";

type Defilement = {
  lenis: Lenis | null;
  /**
   * Verrouille le défilement. Le verrou est nominatif : le menu, le seuil et
   * une transition peuvent le poser en même temps sans se déverrouiller
   * mutuellement. Le défilement ne repart qu'au dernier retrait.
   */
  arreter: (raison: string) => void;
  reprendre: (raison: string) => void;
};

const ContexteDefilement = createContext<Defilement | null>(null);

export function LenisProvider({ children }: { children: React.ReactNode }) {
  const { mouvementReduit, capacites } = useMouvement();
  const [lenis, setLenis] = useState<Lenis | null>(null);
  const verrous = useRef<Set<string>>(new Set());
  /* L'instance vit aussi dans une ref : les deux rappels ci-dessous restent
     stables quand elle est recréée. */
  const instanceCourante = useRef<Lenis | null>(null);
  const pathname = usePathname();
  const premiereRoute = useRef(true);

  /* ---- Chaque route commence en haut ----
   *
   * Le navigateur restaure la position de défilement d'une page qu'il croit
   * revoir, et Lenis, lui, tient sa **propre** position : il écrit à chaque
   * frame la valeur qu'il a mémorisée, laquelle survit à une navigation puisque
   * l'instance ne se démonte jamais. Le remède habituel — laisser Next remonter
   * en haut — ne servait donc à rien : Next posait zéro, et la frame suivante
   * Lenis rendait le défilement à sa dernière valeur. On cliquait une image de
   * l'enfilade six écrans plus bas et on arrivait six écrans plus bas dans la
   * page du projet.
   *
   * On remet donc les deux à zéro, dans cet ordre — le natif d'abord, puisque
   * c'est de lui que Lenis se cale —, on force le geste (un verrou peut être
   * posé au moment du changement de route), et on rafraîchit ScrollTrigger : les
   * épinglages de la nouvelle route se mesurent depuis le haut, pas depuis une
   * position qui n'existe plus.
   *
   * ## Sauf si la route porte une ancre
   *
   * Et c'est le correctif : « chaque route commence en haut » est juste pour
   * une navigation ordinaire, et **faux** quand l'adresse dit où aller. Le menu
   * ouvert depuis une page projet renvoyait vers `/fr#contact` ; Next montait le
   * parcours, cette remise à zéro passait derrière lui, et l'on arrivait sur le
   * hero. L'ancre était perdue par le remède d'un autre bug.
   *
   * Elle est donc honorée **après** le rafraîchissement, jamais avant : la
   * position d'une section du bas dépend de tout ce qui la précède, épinglages
   * compris, et la mesurer sur une page dont les déclencheurs ne sont pas
   * encore calés donnerait un chiffre qui ne veut rien dire.
   */
  useEffetVisuel(() => {
    /* `scrollRestoration` manuel : sans lui, un rechargement rendrait la page à
       une position dont les épinglages ne savent rien. */
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";

    if (premiereRoute.current) {
      premiereRoute.current = false;
      return;
    }

    scrollTo(0, 0);
    const instance = instanceCourante.current;
    if (instance !== null) {
      instance.scrollTo(0, { immediate: true, force: true });
      instance.resize();
    }
    ScrollTrigger.refresh();

    /* L'ancre, s'il y en a une. `force` parce qu'un verrou peut être posé —
       la couture de route, le menu qui n'a pas fini de se retirer. */
    const ancre = positionAncre(location.hash);
    if (ancre !== null) {
      scrollTo(0, ancre);
      instance?.scrollTo(ancre, { immediate: true, force: true });
      ScrollTrigger.update();
    }
    /* `pathname` n'est pas lu dans le corps : il sert de déclencheur. C'est son
       changement, et lui seul, qui dit qu'on vient d'arriver sur une route. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffetVisuel(() => {
    /* ------------------------------------------------------------------
       Le tremblement du swipe, et pourquoi il n'était pas une animation
       ------------------------------------------------------------------
       `syncTouch` valait `false` : sur un appareil tactile, le défilement était
       donc **natif**, c'est-à-dire porté par le fil de composition du
       navigateur, à côté du fil principal.

       Or tout ce qui, dans ce site, doit rester immobile ou se déplacer avec la
       page est repositionné par JavaScript, sur le fil principal, une fois par
       frame :

         — les six sections épinglées, dont `pinType: "transform"` écrit à chaque
           frame la translation qui **annule** le défilement pour tenir la scène
           en place ;
         — les plans WebGL, calés sur des `getBoundingClientRect` lus dans la
           passe de mesure ;
         — les parallaxes des vues d'une chambre, les masques, les jauges.

       Le compositeur déplace le contenu immédiatement ; la correction arrive une
       frame plus tard. L'écart est exactement le delta de défilement de la
       frame — quelques dizaines de pixels à la vitesse d'un swipe —, appliqué
       puis repris, soixante fois par seconde. **C'est ça, le tremblement**, et
       c'est pour cette raison qu'il touchait tout à la fois : ce n'est pas un
       défaut d'animation, c'est un défaut de synchronisation. Aucun réglage de
       courbe, de durée ou de `scrub` ne pouvait l'atteindre. Sur iOS, où le
       ticker est affamé pendant l'inertie, les corrections arrivent en paquets
       et le tremblement devient une secousse.

       `syncTouch` rend le geste tactile à Lenis : c'est lui qui pose la position
       de défilement, sur le fil principal, dans la frame où tout le reste est
       calculé. Le défilement et ce qui s'y accroche ne peuvent plus diverger
       d'une frame, parce qu'ils sont écrits dans la même.

       Deux bénéfices viennent avec, et ils ne sont pas mineurs : le geste ne
       défile plus la page nativement, donc la barre d'URL cesse d'entrer et de
       sortir — `innerHeight` devient constant pour toute la visite —, et le
       « tirer pour recharger » ne peut plus se déclencher au milieu du parcours.

       En mouvement réduit, rien de tout cela : il n'y a plus ni épinglage ni
       scène animée à synchroniser, et le défilement natif est ce qu'on doit à
       quelqu'un qui a demandé qu'on lui fiche la paix.
       ------------------------------------------------------------------ */

    /* Lu directement, et non pris au provider : `MotionProvider` est un parent,
       son effet court **après** celui-ci, et sa valeur est encore la supposition
       du rendu serveur au moment où l'on construit l'instance. La dépendance,
       elle, reste la valeur du provider : si la mesure change pour de bon, on
       reconstruit. */
    const tactile = matchMedia("(pointer: coarse)").matches;
    const synchroniser = tactile && !mouvementReduit;

    const instance = new Lenis({
      autoRaf: false,
      smoothWheel: !mouvementReduit,
      syncTouch: synchroniser,
      /* La même inertie que la molette. Le défaut de Lenis (0,075) décolle le
         contenu du doigt d'un cran de trop : sur un site qui ne fait que du
         défilement, on veut sentir qu'on tient la page. */
      syncTouchLerp: 0.1,
      lerp: 0.1,
      overscroll: false,
      anchors: true,
    });

    /* ScrollTrigger se met à jour sur la position de Lenis, pas sur celle du
       navigateur : les deux divergent d'une frame pendant le lissage. */
    const desabonnerScroll = instance.on("scroll", () => ScrollTrigger.update());

    /* Le seul point d'entrée de la boucle pour le défilement. Lenis attend des
       millisecondes, le ticker GSAP compte en secondes. */
    const desinscrire = inscrire("defilement", (temps) => {
      instance.raf(temps * 1000);
    });

    /* Les verrous survivent à une recréation d'instance (bascule de mouvement
       réduit pendant qu'un menu est ouvert). */
    if (verrous.current.size > 0) instance.stop();

    instanceCourante.current = instance;
    setLenis(instance);
    ScrollTrigger.refresh();

    /* Les polices display chargent en `display: block` : elles ne s'appliquent
       qu'une fois le fichier arrivé, donc APRÈS ce premier refresh. Tant
       qu'elles ne sont pas là, les chapitres en texte — le manifeste du
       vestibule au premier chef — occupent la hauteur du repli. Quand Gambetta
       se pose, ces hauteurs changent et poussent les sections plus bas ; mais
       les positions épinglées, elles, restent calées sur les métriques du repli
       et un chapitre en recouvre un autre. On refait donc la mesure une fois les
       vraies polices posées — c'est le correctif canonique du décalage induit
       par le chargement des polices. */
    let annuleFonts = false;
    void document.fonts.ready.then(() => {
      if (annuleFonts) return;
      ScrollTrigger.refresh();
    });

    return () => {
      annuleFonts = true;
      desinscrire();
      desabonnerScroll();
      instance.destroy();
      instanceCourante.current = null;
      setLenis(null);
    };
    /* `capacites.pointeurGrossier` n'est pas lu dans le corps — c'est
       `matchMedia` qui donne la valeur au bon moment, le provider étant un
       parent dont l'effet court après celui-ci. Il est ici comme déclencheur, et
       lui seul : quand la nature du pointeur change pour de bon (un clavier
       branché sur une tablette, un écran tactile débranché), l'instance doit se
       refaire avec ou sans `syncTouch`. Même motif que `pathname` plus haut. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mouvementReduit, capacites.pointeurGrossier]);

  const arreter = useCallback((raison: string) => {
    verrous.current.add(raison);
    instanceCourante.current?.stop();
  }, []);

  const reprendre = useCallback((raison: string) => {
    verrous.current.delete(raison);
    if (verrous.current.size === 0) instanceCourante.current?.start();
  }, []);

  const valeur = useMemo<Defilement>(
    () => ({ lenis, arreter, reprendre }),
    [lenis, arreter, reprendre],
  );

  return (
    <ContexteDefilement.Provider value={valeur}>
      {children}
    </ContexteDefilement.Provider>
  );
}

export function useDefilement(): Defilement {
  const contexte = useContext(ContexteDefilement);
  if (contexte === null) {
    throw new Error("useDefilement doit être appelé sous un LenisProvider.");
  }
  return contexte;
}
