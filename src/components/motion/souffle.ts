/**
 * Le moteur du souffle — porté de `references/zip/gsap-wind-blown-text`.
 *
 * Ce qui est repris de la source, et pourquoi :
 *
 * — **La mesure par Range API.** Chaque caractère est mesuré à sa position
 *   rendue réelle (`range.getBoundingClientRect()`), puis doublé par un span
 *   absolu posé exactement là. C'est ce qui fait tenir l'effet sur du texte qui
 *   passe à la ligne : aucun découpage en `<span>` ne survit à un retour de
 *   ligne, une mesure de rect, si.
 * — **La sinusoïde de bourrasque dé-tendue.** `bourrasqueSinus` retranche la
 *   rampe linéaire entre ses deux valeurs d'extrémité, ce qui l'épingle
 *   exactement à zéro en t = 0 et t = 1 quelle que soit la phase. Sans cette
 *   soustraction, la lettre n'atterrit pas à sa place : elle rate sa ligne de
 *   quelques pixels, et tout le texte tremble.
 * — **Le PRNG à graine** (voir `lib/aleatoire`), re-semé à chaque
 *   reconstruction : l'animation est identique après un redimensionnement.
 * — **Le motif d'accessibilité** : le texte lisible reste dans le DOM, la
 *   couche animée est `aria-hidden`. C'est le composant qui le pose.
 *
 * Ce qui change par rapport à la source :
 *
 * — Les imports `esm.sh` passent par le paquet gsap local (`@/lib/gsap`).
 * — Le `console.log(d)` de la ligne 309 et le `console.clear()` de la ligne 4
 *   sont retirés.
 * — La source joue **un** sens par élément (`data-reverse`). Le vestibule en
 *   demande deux à la suite — la poussière se rassemble en phrase, puis se
 *   disperse quand on continue. La timeline enchaîne donc deux passes du même
 *   calcul, chacune avec son propre tirage : la lettre ne repart pas d'où elle
 *   est venue, sinon le geste se lit comme un rembobinage.
 * — Le décalage par lettre passe par une courbe (`courbeOrdre`) au lieu d'une
 *   rampe linéaire : la constitution interdit le stagger uniforme.
 */
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { aleatoireAGraine } from "@/lib/aleatoire";
import { borne01, melanger } from "@/lib/math";

/** Dans quel ordre les lettres partent — indexé sur leur position réelle en X. */
export type Ordre = "aleatoire" | "gauche" | "droite" | "centre";

export type ParametresVent = {
  /** Degrés : 0 = vers la droite, 90 = vers le haut. */
  angle: number;
  /** Distance parcourue dans l'axe du vent, en pixels. */
  force: number;
  /** Déviation perpendiculaire aléatoire, en pixels. */
  dispersion: number;
  /** Rotation maximale sur un axe, en degrés. */
  rotationMax: number;
  /** Étalement des départs par lettre, en fraction de la durée. */
  decalage: number;
  /** Déplacement maximal sur Z, en pixels. */
  profondeur: number;
  ordre: Ordre;
  /** 0 = ordre strict, 1 = départs entièrement tirés au sort. */
  hasard: number;
  /** Dérive latérale pendant le vol, en pixels. 0 = pas de bourrasque. */
  bourrasque: number;
  /** Nombre de cycles de sinusoïde pendant le vol. */
  frequenceBourrasque: number;
  /** 0 = toutes les lettres en phase, 1 = phase étalée sur 2π. */
  etalementPhase: number;
  /** Courbe appliquée à la distribution des départs. */
  courbeOrdre: string;
  /** Courbe du vol lui-même. */
  courbe: string;
};

/**
 * Réglages de base. Les valeurs viennent des `DEFAULTS` de la source, ajustées
 * à l'échelle typographique du site : Gambetta au corps du manifeste est bien
 * plus grande que l'Inter de la démo, donc le vent doit porter plus loin pour
 * que la lettre sorte vraiment du champ.
 */
export const VENT_PAR_DEFAUT: ParametresVent = {
  angle: 25,
  force: 400,
  dispersion: 80,
  rotationMax: 360,
  decalage: 0.5,
  profondeur: 120,
  ordre: "aleatoire",
  hasard: 0,
  bourrasque: 0,
  frequenceBourrasque: 1,
  etalementPhase: 1,
  courbeOrdre: "power2.inOut",
  courbe: "power3.out",
};

export type ReglagesSouffle = {
  /** L'élément qui porte la mise en page et la position relative. */
  element: HTMLElement;
  /** Le gabarit : porte le texte, donne ses dimensions naturelles au bloc. */
  gabarit: HTMLElement;
  /** La couche animée, vidée et re-remplie à chaque mesure. */
  couche: HTMLElement;
  /** Le texte, exactement tel qu'il est rendu dans le gabarit. */
  texte: string;
  /** Le vol d'arrivée : d'où viennent les lettres. */
  arrivee: Partial<ParametresVent>;
  /** Le vol de départ, ou `null` si le texte reste en place pour de bon. */
  depart: Partial<ParametresVent> | null;
  /** Deux blocs de même graine se dispersent pareil : varier par bloc. */
  graine: number;
  debut: string;
  fin: string;
};

/** Une lettre mesurée : son nœud, sa position en X, sa position normalisée. */
type Lettre = {
  noeud: HTMLSpanElement;
  x: number;
  /** 0 = la lettre la plus à gauche du bloc, 1 = la plus à droite. */
  normX: number;
};

/** Temps de maintien du texte formé, entre l'arrivée et le départ. */
const MAINTIEN = 0.6;

/**
 * Mesure chaque caractère à sa position rendue et lui crée son double absolu.
 *
 * Le `getBoundingClientRect` lu ici n'enfreint pas la règle du rig : la règle
 * interdit de lire un rect **par frame** dans un composant. Celui-ci est lu une
 * fois par construction, après `document.fonts.ready`, hors de toute boucle.
 */
function mesurerLettres(
  element: HTMLElement,
  texte: string,
  gabarit: HTMLElement,
  couche: HTMLElement,
): Lettre[] {
  const cadre = element.getBoundingClientRect();
  const noeudTexte = gabarit.firstChild;
  if (noeudTexte === null) return [];

  const lettres: Lettre[] = [];

  for (let i = 0; i < texte.length; i += 1) {
    if (texte[i] === " ") continue;

    const portee = document.createRange();
    portee.setStart(noeudTexte, i);
    portee.setEnd(noeudTexte, i + 1);
    const r = portee.getBoundingClientRect();

    const span = document.createElement("span");
    span.textContent = texte[i]!;
    span.className = "souffle__lettre";
    const x = r.left - cadre.left;
    span.style.cssText = [
      "position:absolute",
      `left:${x}px`,
      `top:${r.top - cadre.top}px`,
      `width:${r.width}px`,
      `height:${r.height}px`,
      "white-space:nowrap",
    ].join(";");

    couche.appendChild(span);
    lettres.push({ noeud: span, x, normX: 0 });
  }

  /* Normalisation des X sur l'ensemble du bloc : sur un texte multiligne, 0
     reste la lettre la plus à gauche de n'importe quelle ligne et 1 la plus à
     droite, si bien qu'un ordre « de la gauche vers la droite » balaye le bloc
     entier et non chaque ligne séparément. */
  let min = Infinity;
  let max = -Infinity;
  for (const lettre of lettres) {
    if (lettre.x < min) min = lettre.x;
    if (lettre.x > max) max = lettre.x;
  }
  const etendue = max - min || 1;
  for (const lettre of lettres) lettre.normX = (lettre.x - min) / etendue;

  return lettres;
}

/**
 * Où, dans la fenêtre de décalage, la lettre commence son vol.
 *
 * La position réelle en X pilote l'ordre — c'est l'une des deux formes de
 * décalage autorisées par la constitution ; la seconde, l'`ease` posé sur la
 * distribution elle-même, est appliquée juste après par `courbeOrdre`.
 */
function tempsDeDepart(
  lettre: Lettre,
  p: ParametresVent,
  tirer: () => number,
  courbe: (t: number) => number,
): number {
  const x = lettre.normX;
  let ordonne: number;

  switch (p.ordre) {
    case "gauche":
      ordonne = courbe(x);
      break;
    case "droite":
      ordonne = courbe(1 - x);
      break;
    case "centre":
      /* 0 aux bords, 1 au centre : le texte se forme depuis ses extrémités. */
      ordonne = courbe(1 - Math.abs(x - 0.5) * 2);
      break;
    default:
      return tirer() * p.decalage;
  }

  const aleatoire = tirer() * p.decalage;
  return ordonne * p.decalage * (1 - p.hasard) + aleatoire * p.hasard;
}

/**
 * Ajoute une passe de vol à la timeline. `sens` décide du sens de lecture :
 * `rassemble` amène les lettres du néant à leur place, `disperse` les emporte.
 */
function ajouterPasse(
  tl: gsap.core.Timeline,
  lettres: Lettre[],
  p: ParametresVent,
  sens: "rassemble" | "disperse",
  depart: number,
  tirer: () => number,
  poserEtatInitial: boolean,
): void {
  const alea = (min: number, max: number) => min + tirer() * (max - min);
  const courbeOrdre = gsap.parseEase(p.courbeOrdre);

  const rad = (p.angle * Math.PI) / 180;
  const ventX = Math.cos(rad);
  /* Y du CSS inversé : un vent « vers le haut » doit monter à l'écran. */
  const ventY = -Math.sin(rad);

  /* L'axe perpendiculaire au vent, sur lequel porte la bourrasque : (ventX,
     ventY) tourné de 90° dans le repère CSS. */
  const perpX = Math.sin(rad);
  const perpY = Math.cos(rad);

  const amplitudePartagee =
    p.bourrasque > 0 ? alea(0.1, 1) * p.bourrasque * (tirer() > 0.5 ? 1 : -1) : 0;

  lettres.forEach((lettre, i) => {
    const debut = tempsDeDepart(lettre, p, tirer, courbeOrdre);
    const duree = alea(1 - p.hasard * 0.5, 1 + p.hasard * 0.5);

    const angleDispersion = alea(0, Math.PI * 2);
    const distanceDispersion = alea(0, p.dispersion);

    const fx = ventX * p.force + Math.cos(angleDispersion) * distanceDispersion;
    const fy = ventY * p.force + Math.sin(angleDispersion) * distanceDispersion;
    const fz = alea(-p.profondeur, p.profondeur);
    const rx = alea(-p.rotationMax, p.rotationMax);
    const ry = alea(-p.rotationMax * 0.7, p.rotationMax * 0.7);
    const rz = alea(-p.rotationMax * 0.3, p.rotationMax * 0.3);

    /* La phase de la bourrasque : synchronisée sur l'heure de départ, ou
       étalée sur un tour complet selon l'index. */
    const phaseSync = Math.PI * p.frequenceBourrasque * debut;
    const phaseIndex = (i / Math.max(1, lettres.length - 1)) * Math.PI * 2;
    const phase = melanger(phaseSync, phaseIndex, p.etalementPhase);

    let bourrasqueSinus: (t: number) => number = () => 0;

    if (p.bourrasque > 0) {
      const amplitudeIndividuelle =
        alea(0.1, 1) * p.bourrasque * (tirer() > 0.5 ? 1 : -1);
      const amplitude = melanger(
        amplitudePartagee,
        amplitudeIndividuelle,
        p.etalementPhase,
      );

      /* Dé-tendance : on retranche la rampe linéaire entre les deux valeurs
         d'extrémité, ce qui épingle la sinusoïde à zéro en t = 0 et t = 1 sans
         changer la forme du trajet entre les deux. C'est ce qui garantit que la
         lettre arrive exactement sur sa ligne. */
      const s0 = Math.sin(phase);
      const s1 = Math.sin(Math.PI * p.frequenceBourrasque + phase);
      bourrasqueSinus = (t: number) =>
        amplitude *
        (Math.sin(Math.PI * p.frequenceBourrasque * t + phase) -
          s0 -
          t * (s1 - s0));
    }

    /* `s` va de 0 (la lettre est à sa place) à 1 (elle est au loin). */
    const etatA = (t: number) => {
      const s = sens === "rassemble" ? 1 - t : t;
      const derive = bourrasqueSinus(t);
      return {
        x: s * fx + perpX * derive,
        y: s * fy + perpY * derive,
        z: s * fz,
        rotationX: rx * s,
        rotationY: ry * s,
        rotationZ: rz * s,
        opacity: borne01((1 - s) / 0.6),
      };
    };

    /* Sans cet état posé d'avance, la toute première frame de la passe saute
       à la mauvaise place — la timeline étant en pause, GSAP n'a encore rien
       écrit sur la lettre. */
    if (poserEtatInitial) gsap.set(lettre.noeud, etatA(0));

    const relais = { t: 0 };
    tl.to(
      relais,
      {
        t: 1,
        duration: duree,
        ease: p.courbe,
        onUpdate: () => {
          gsap.set(lettre.noeud, etatA(relais.t));
        },
      },
      depart + debut,
    );
  });
}

/**
 * Monte l'effet sur un bloc. Retourne sa dépose.
 *
 * L'appelant a déjà attendu `document.fonts.ready` : mesurer avant que Gambetta
 * ne soit là placerait chaque lettre sur la géométrie du repli.
 */
export function monterSouffle(reglages: ReglagesSouffle): () => void {
  const { element, gabarit, couche, texte, graine } = reglages;

  const arrivee: ParametresVent = { ...VENT_PAR_DEFAUT, ...reglages.arrivee };
  const depart: ParametresVent | null =
    reglages.depart === null
      ? null
      : { ...VENT_PAR_DEFAUT, ...reglages.depart };

  let declencheur: ScrollTrigger | null = null;
  let timeline: gsap.core.Timeline | null = null;
  let attente: ReturnType<typeof setTimeout> | undefined;

  function construire(): void {
    declencheur?.kill();
    timeline?.kill();
    couche.replaceChildren();

    const lettres = mesurerLettres(element, texte, gabarit, couche);
    if (lettres.length === 0) return;

    /* Le gabarit a fini son office : il gardera les dimensions du bloc, sans
       plus se voir. Tant que la mesure n'avait pas eu lieu, il était le texte
       visible — c'est lui qui s'affiche sans JavaScript. */
    gabarit.style.visibility = "hidden";
    couche.style.visibility = "visible";

    gsap.set(
      lettres.map((lettre) => lettre.noeud),
      { transformPerspective: 500 },
    );

    /* Re-semé à chaque construction : c'est la condition pour que le
       redimensionnement redonne exactement la même animation. */
    const tirer = aleatoireAGraine(graine);

    const tl = gsap.timeline({ paused: true });
    ajouterPasse(tl, lettres, arrivee, "rassemble", 0, tirer, true);

    if (depart !== null) {
      ajouterPasse(
        tl,
        lettres,
        depart,
        "disperse",
        tl.duration() + MAINTIEN,
        tirer,
        false,
      );
    }

    declencheur = ScrollTrigger.create({
      trigger: element,
      start: reglages.debut,
      end: reglages.fin,
      scrub: 1,
      animation: tl,
    });
    timeline = tl;
  }

  construire();

  /* Re-mesure quand la boîte change — fenêtre redimensionnée, police enfin
     appliquée, zoom navigateur. Le délai évite de reconstruire soixante fois
     pendant qu'on tire le coin de la fenêtre. */
  let derniereLargeur = 0;
  let derniereHauteur = 0;
  const observateur = new ResizeObserver(([entree]) => {
    if (entree === undefined) return;
    const boite = entree.contentBoxSize[0];
    if (boite === undefined) return;
    if (
      boite.inlineSize === derniereLargeur &&
      boite.blockSize === derniereHauteur
    ) {
      return;
    }
    derniereLargeur = boite.inlineSize;
    derniereHauteur = boite.blockSize;
    clearTimeout(attente);
    attente = setTimeout(construire, 200);
  });
  observateur.observe(element);

  return () => {
    observateur.disconnect();
    clearTimeout(attente);
    declencheur?.kill();
    timeline?.kill();
    couche.replaceChildren();
    gabarit.style.visibility = "";
    couche.style.visibility = "";
  };
}
