"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import { useEffetVisuel } from "@/lib/isomorphe";
import { useMouvement } from "@/components/motion/MotionProvider";

/**
 * Le son. Web Audio natif, pas de bibliothèque.
 *
 * **Un seul `AudioContext` dans tout le site**, construit au clic de l'écran
 * d'entrée et jamais avant : un navigateur n'autorise le démarrage audio que
 * dans un geste explicite, et un contexte ouvert pour rien coûte du CPU en
 * continu. Il est suspendu dès que l'onglet passe en arrière-plan, et dès qu'on
 * coupe le son.
 *
 * ## Les trois bus
 *
 * Tout passe par un gain maître, que le bouton du chrome pilote et dont la
 * préférence est persistée. Sous lui, trois bus qui ne se mélangent jamais :
 *
 *   `musique`   — les nappes. Une seule s'entend à la fois : celle du hero,
 *                 celle du site, ou celle du projet qu'on visite.
 *   `ambiance`  — l'eau du bassin, qui tourne en permanence à gain nul et ne
 *                 monte que sous la main.
 *   `interface` — les micro-sons, synthétisés, jamais chargés d'un fichier.
 *
 * ## Les nappes, et pourquoi elles ne sont pas des `AudioBuffer`
 *
 * `site.mp3` dure quatre minutes quarante, `eau.mp3` neuf minutes. Décodés en
 * mémoire, ils feraient des centaines de mégaoctets — un `AudioBuffer` est du
 * flottant non compressé. Ils passent donc par des `<audio>` et
 * `createMediaElementSource` : le navigateur diffuse et décode au fil de l'eau,
 * la mémoire reste plate, et la boucle est native (`audio.loop`).
 *
 * ## Les fondus
 *
 * Aucun gain n'est jamais écrit par affectation. Tout passe par `rampe()`, donc
 * par `linearRampToValueAtTime` : une affectation directe produit une
 * discontinuité que l'oreille entend comme un claquement, et c'est audible même
 * à des niveaux aussi bas que ceux-ci.
 *
 * Le fondu croisé hero → site n'est pas minuté : il est **commandé par la
 * progression du défilement hors du hero**, poussée ici par le seuil
 * (`reglerSortieHero`). On remonte, la nappe du hero revient — exactement comme
 * le voile noir se relève. Une minuterie ne saurait pas faire ça.
 */

/** Les micro-sons de l'interface. Chacun est une impulsion filtrée. */
export type Micro =
  | "survol"
  | "ouvrir"
  | "fermer"
  | "projet"
  | "copie"
  | "bascule";

type Son = {
  /** Le son est-il actif — état d'interface, piloté par le bouton de bascule. */
  sonActif: boolean;
  basculerSon: () => void;
  /** Pose l'état sans le basculer. Utilisé par l'écran d'entrée. */
  activerSon: (actif: boolean) => void;
  /** Joue un micro-son. Sans effet tant que le son est coupé. */
  jouer: (micro: Micro) => void;
  /** 0 : dans le hero. 1 : entièrement sorti. Poussé par le seuil au scrub. */
  reglerSortieHero: (progression: number) => void;
  /** Entre dans la nappe d'un projet, par son rang (1 à 5). */
  entrerProjet: (rang: number) => void;
  /** Rend la main à la nappe du site. */
  quitterProjet: () => void;
  /**
   * Vitesse lissée du pointeur sur le bassin, en pixels par frame, ou `null`
   * quand il en est sorti. C'est la seule commande du niveau de l'eau.
   */
  reglerEau: (vitesse: number | null) => void;
};

const ContexteSon = createContext<Son | null>(null);

/* --- Niveaux. Tout est bas : c'est une nappe de pièce, pas une bande-son. --- */

/** Niveau du bus des nappes. */
const NIVEAU_MUSIQUE = 0.5;
/** Niveau du bus des micro-sons, sous les nappes. */
const NIVEAU_INTERFACE = 0.32;
/** Niveau du bus d'ambiance. L'eau y monte jusqu'à `EAU_MAX`. */
const NIVEAU_AMBIANCE = 1;

/** Montée et descente du maître : aucune bascule ne claque. */
const FONDU_MAITRE = 0.4;
/** Fondu d'entrée et de sortie d'une nappe de projet. */
const FONDU_PROJET = 1.2;
/**
 * Fondu des gains suivis en continu (le fondu croisé du hero, l'eau sous la
 * main). Assez court pour coller au geste, assez long pour lisser l'escalier
 * de valeurs que produit une commande par frame.
 */
const FONDU_SUIVI = 0.08;
/** Retour de l'eau au silence quand le pointeur quitte le bassin. */
const FONDU_EAU_SORTIE = 0.4;

/** Gain de l'eau à pleine vitesse. */
const EAU_MAX = 0.6;
/**
 * Vitesse du pointeur, en pixels par frame, au-delà de laquelle l'eau est à
 * son plein. Trente pixels par frame à soixante hertz, c'est un balayage franc
 * de l'écran en une seconde environ.
 */
const EAU_VITESSE_PLEINE = 30;

/** La préférence de son, persistée d'une visite à l'autre. */
const CLE_PREFERENCE = "rouviere:son";

type AudioContextConstructeur = typeof AudioContext;

function obtenirConstructeur(): AudioContextConstructeur | null {
  if (typeof window === "undefined") return null;
  return (
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: AudioContextConstructeur })
      .webkitAudioContext ??
    null
  );
}

/**
 * Fait glisser un gain vers sa cible. C'est le seul écrivain de gain du
 * fichier : `param.value = x` n'apparaît nulle part.
 *
 * `setValueAtTime(param.value, t)` ancre la rampe sur la valeur courante — sans
 * cet ancrage, une rampe posée pendant qu'une autre court repartirait de la
 * dernière valeur *programmée* et non de celle qu'on entend.
 */
function rampe(param: AudioParam, cible: number, duree: number, t: number) {
  param.cancelScheduledValues(t);
  param.setValueAtTime(param.value, t);
  param.linearRampToValueAtTime(cible, t + Math.max(duree, 0.005));
}

/**
 * Une nappe : son élément et le nœud de gain par lequel elle rejoint son bus.
 * Le champ s'appelle `sortie` et non `gain` — c'est un nœud, pas un paramètre,
 * et `nappe.sortie.gain` dit exactement ce qu'on manipule.
 */
type Nappe = {
  element: HTMLAudioElement;
  sortie: GainNode;
};

/** Le profil d'une impulsion d'interface : sa bande, sa finesse, sa durée. */
type Profil = { frequence: number; q: number; duree: number; gain: number };

/**
 * Les micro-sons. Rien de mélodique, aucune hauteur : ce sont des repères de
 * matière, pas des notes. Une impulsion de bruit passée dans une bande étroite
 * et coupée en quelques dizaines de millisecondes — la même façon de faire
 * qu'un claquement de bois ou de papier, qui n'a pas de note non plus.
 */
const PROFILS: Record<Micro, Profil> = {
  survol: { frequence: 2400, q: 1.2, duree: 0.026, gain: 0.18 },
  ouvrir: { frequence: 900, q: 0.8, duree: 0.07, gain: 0.5 },
  fermer: { frequence: 620, q: 0.9, duree: 0.055, gain: 0.45 },
  projet: { frequence: 1400, q: 1, duree: 0.06, gain: 0.4 },
  copie: { frequence: 3200, q: 2, duree: 0.034, gain: 0.3 },
  bascule: { frequence: 1800, q: 1.4, duree: 0.04, gain: 0.3 },
};

type Moteur = {
  ctx: AudioContext;
  maitre: GainNode;
  musique: GainNode;
  ambiance: GainNode;
  interface: GainNode;
  hero: Nappe;
  site: Nappe;
  eau: Nappe;
  /** La nappe du projet visité, montée à la demande puis libérée. */
  projet: (Nappe & { rang: number }) | null;
  /** Bruit blanc court, source de toutes les impulsions d'interface. */
  bruit: AudioBuffer;
};

/**
 * Joue une impulsion sur le bus d'interface. Hors du composant : la bascule du
 * son doit pouvoir se confirmer elle-même dès que le contexte reprend, sans
 * dépendre d'un rappel mémoïsé qui n'existe pas encore à cet instant.
 */
function impulsion(moteur: Moteur, micro: Micro) {
  const { ctx, interface: bus, bruit } = moteur;
  if (ctx.state !== "running") return;

  const p = PROFILS[micro];
  const t = ctx.currentTime;

  const source = ctx.createBufferSource();
  source.buffer = bruit;
  /* Un point de départ tiré au hasard dans le bruit : deux impulsions
     consécutives ne sont jamais le même échantillon, et l'oreille cesse de
     reconnaître un fichier qui se répète. */
  const debut = Math.random() * (bruit.duration - p.duree);

  const filtre = ctx.createBiquadFilter();
  filtre.type = "bandpass";
  filtre.frequency.value = p.frequence;
  filtre.Q.value = p.q;

  const enveloppe = ctx.createGain();
  enveloppe.gain.setValueAtTime(0, t);
  /* Attaque de trois millisecondes : au-dessous on entend le clic de la
     discontinuité elle-même, au-dessus l'impulsion perd son tranchant. */
  enveloppe.gain.linearRampToValueAtTime(p.gain, t + 0.003);
  enveloppe.gain.exponentialRampToValueAtTime(0.0001, t + p.duree);

  source.connect(filtre);
  filtre.connect(enveloppe);
  enveloppe.connect(bus);
  source.start(t, debut, p.duree + 0.02);
  source.stop(t + p.duree + 0.02);
  source.onended = () => {
    source.disconnect();
    filtre.disconnect();
    enveloppe.disconnect();
  };
}

function lirePreference(): boolean {
  try {
    return localStorage.getItem(CLE_PREFERENCE) === "1";
  } catch {
    return false;
  }
}

function ecrirePreference(actif: boolean) {
  try {
    localStorage.setItem(CLE_PREFERENCE, actif ? "1" : "0");
  } catch {
    /* Stockage refusé (navigation privée) : la préférence ne survit pas. */
  }
}

export function SonProvider({ children }: { children: React.ReactNode }) {
  const [sonActif, setSonActif] = useState(false);
  const moteurRef = useRef<Moteur | null>(null);
  /** Anti-spam du survol : les entrées interactives se frôlent vite. */
  const dernierSurvol = useRef(0);
  /**
   * La progression hors du hero, retenue même quand le moteur n'existe pas
   * encore : le seuil commence à la pousser avant qu'on ait cliqué, et la
   * nappe doit démarrer au bon niveau, pas à zéro.
   */
  const sortieHero = useRef(0);

  /* --- Construction, une seule fois, dans le geste de l'utilisateur --- */

  const construire = useCallback((): Moteur | null => {
    if (moteurRef.current !== null) return moteurRef.current;

    const Constructeur = obtenirConstructeur();
    if (Constructeur === null) return null;

    const ctx = new Constructeur();

    const maitre = ctx.createGain();
    maitre.gain.value = 0; // valeur initiale, avant toute rampe
    maitre.connect(ctx.destination);

    const bus = (niveau: number) => {
      const gain = ctx.createGain();
      gain.gain.value = niveau;
      gain.connect(maitre);
      return gain;
    };
    const musique = bus(NIVEAU_MUSIQUE);
    const ambiance = bus(NIVEAU_AMBIANCE);
    const interfaceBus = bus(NIVEAU_INTERFACE);

    /**
     * Une nappe diffusée. `loop` est natif : rien à reprogrammer, aucune
     * couture audible, et surtout aucun rappel par frame.
     */
    const nappe = (source: string, destination: GainNode, depart: number): Nappe => {
      const element = new Audio(source);
      element.loop = true;
      element.preload = "auto";
      const sortie = ctx.createGain();
      sortie.gain.value = depart;
      ctx.createMediaElementSource(element).connect(sortie);
      sortie.connect(destination);
      return { element, sortie };
    };

    /* Le hero démarre à son niveau réel : si l'on a déjà défilé avant de
       cliquer, il ne doit pas entrer à plein pour redescendre aussitôt. */
    const p = sortieHero.current;
    const hero = nappe("/audio/hero.mp3", musique, 1 - p);
    const site = nappe("/audio/site.mp3", musique, p);
    /* L'eau tourne du début à la fin, à gain nul. Elle ne démarre donc jamais
       au moment où on la survole : pas de latence, pas d'attaque. */
    const eau = nappe("/audio/eau.mp3", ambiance, 0);

    /* Un quart de seconde de bruit blanc, tiré une fois. Toutes les impulsions
       d'interface en sont découpées : c'est ce qui leur donne un grain de
       matière plutôt qu'un timbre d'oscillateur. */
    const bruit = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * 0.25), ctx.sampleRate);
    const canal = bruit.getChannelData(0);
    for (let i = 0; i < canal.length; i += 1) canal[i] = Math.random() * 2 - 1;

    const moteur: Moteur = {
      ctx,
      maitre,
      musique,
      ambiance,
      interface: interfaceBus,
      hero,
      site,
      eau,
      projet: null,
      bruit,
    };
    moteurRef.current = moteur;
    return moteur;
  }, []);

  /* --- Bascule et préférence --- */

  const appliquer = useCallback(
    (actif: boolean, avecRetour = false) => {
      ecrirePreference(actif);

      if (actif) {
        const moteur = construire();
        if (moteur === null) return false;
        /* La confirmation est jouée *après* la reprise : au moment du clic, le
           contexte vient d'être créé ou est encore suspendu, et l'impulsion
           serait perdue. */
        void moteur.ctx.resume().then(() => {
          if (avecRetour) impulsion(moteur, "bascule");
        });
        for (const lecture of [moteur.hero, moteur.site, moteur.eau, moteur.projet]) {
          /* La lecture peut être refusée : on ne traite pas le refus comme
             une erreur, le gain restera simplement muet. */
          void lecture?.element.play().catch(() => {});
        }
        rampe(moteur.maitre.gain, 1, FONDU_MAITRE, moteur.ctx.currentTime);
        return true;
      }

      /* En coupant, la confirmation part avant le fondu : après, elle serait
         inaudible — c'est justement ce qu'on vient de demander. */
      if (avecRetour && moteurRef.current !== null) {
        impulsion(moteurRef.current, "bascule");
      }

      const moteur = moteurRef.current;
      if (moteur !== null) {
        rampe(moteur.maitre.gain, 0, FONDU_MAITRE, moteur.ctx.currentTime);
        /* Après le fondu, on arrête vraiment : les éléments sont mis en pause
           *et* le contexte est suspendu. Suspendre seul ne suffit pas — un
           `<audio>` en lecture continue de télécharger et de décoder même si
           sa sortie ne rejoint plus la destination. */
        window.setTimeout(() => {
          const courant = moteurRef.current;
          if (courant === null) return;
          for (const n of [courant.hero, courant.site, courant.eau, courant.projet]) {
            n?.element.pause();
          }
          void courant.ctx.suspend();
        }, FONDU_MAITRE * 1000 + 60);
      }
      return false;
    },
    [construire],
  );

  /* L'état courant est doublé dans une ref, et la bascule le lit **là**, jamais
     dans la fonction de mise à jour de `useState`. Un `setSonActif(a => …)` qui
     ouvrirait le contexte et jouerait une impulsion ferait deux fois les deux
     en développement — React réexécute les fonctions de mise à jour pour
     débusquer les effets de bord, et c'en sont. */
  const actifRef = useRef(false);

  const poser = useCallback(
    (souhaite: boolean, avecRetour: boolean) => {
      const obtenu = appliquer(souhaite, avecRetour);
      actifRef.current = obtenu;
      setSonActif(obtenu);
    },
    [appliquer],
  );

  const basculerSon = useCallback(() => {
    poser(!actifRef.current, true);
  }, [poser]);

  const activerSon = useCallback(
    (actif: boolean) => {
      poser(actif, false);
    },
    [poser],
  );

  /* --- Les nappes --- */

  const reglerSortieHero = useCallback((progression: number) => {
    const p = Math.min(Math.max(progression, 0), 1);
    sortieHero.current = p;

    const moteur = moteurRef.current;
    if (moteur === null) return;
    /* Pendant qu'un projet joue, le fondu croisé du parcours est suspendu :
       c'est la nappe du projet qui tient le bus, et elle la rendra intacte. */
    if (moteur.projet !== null) return;

    const t = moteur.ctx.currentTime;
    rampe(moteur.hero.sortie.gain, 1 - p, FONDU_SUIVI, t);
    rampe(moteur.site.sortie.gain, p, FONDU_SUIVI, t);
  }, []);

  const entrerProjet = useCallback(
    (rang: number) => {
      const moteur = moteurRef.current;
      if (moteur === null) return;
      if (moteur.projet?.rang === rang) return;

      const { ctx, musique } = moteur;
      const t = ctx.currentTime;

      /* Une nappe de projet déjà en place cède la sienne d'abord. */
      if (moteur.projet !== null) {
        const sortante = moteur.projet;
        rampe(sortante.sortie.gain, 0, FONDU_PROJET, t);
        window.setTimeout(() => {
          sortante.element.pause();
          sortante.sortie.disconnect();
        }, FONDU_PROJET * 1000 + 80);
      }

      /* Le parcours s'efface : hero et site descendent ensemble, quelle que
         soit la position du fondu croisé au moment de l'entrée. */
      rampe(moteur.hero.sortie.gain, 0, FONDU_PROJET, t);
      rampe(moteur.site.sortie.gain, 0, FONDU_PROJET, t);

      const element = new Audio(`/audio/projets/projet-${rang}.mp3`);
      element.loop = true;
      element.preload = "auto";
      const sortie = ctx.createGain();
      sortie.gain.value = 0;
      ctx.createMediaElementSource(element).connect(sortie);
      sortie.connect(musique);
      void element.play().catch(() => {});
      rampe(sortie.gain, 1, FONDU_PROJET, t);

      moteur.projet = { element, sortie, rang };
    },
    [],
  );

  const quitterProjet = useCallback(() => {
    const moteur = moteurRef.current;
    if (moteur === null || moteur.projet === null) return;

    const { ctx } = moteur;
    const t = ctx.currentTime;
    const sortante = moteur.projet;
    moteur.projet = null;

    rampe(sortante.sortie.gain, 0, FONDU_PROJET, t);
    window.setTimeout(() => {
      sortante.element.pause();
      sortante.sortie.disconnect();
    }, FONDU_PROJET * 1000 + 80);

    /* Le parcours reprend là où il en était : la nappe qui revient est celle
       que commande la position réelle du défilement, pas celle d'avant. */
    const p = sortieHero.current;
    rampe(moteur.hero.sortie.gain, 1 - p, FONDU_PROJET, t);
    rampe(moteur.site.sortie.gain, p, FONDU_PROJET, t);
  }, []);

  /* --- L'eau --- */

  const reglerEau = useCallback((vitesse: number | null) => {
    const moteur = moteurRef.current;
    if (moteur === null) return;
    const t = moteur.ctx.currentTime;

    if (vitesse === null) {
      rampe(moteur.eau.sortie.gain, 0, FONDU_EAU_SORTIE, t);
      return;
    }

    const part = Math.min(vitesse / EAU_VITESSE_PLEINE, 1);
    rampe(moteur.eau.sortie.gain, part * EAU_MAX, FONDU_SUIVI, t);
  }, []);

  /* --- Les micro-sons --- */

  const jouer = useCallback((micro: Micro) => {
    const moteur = moteurRef.current;
    if (moteur === null) return;

    /* Anti-rebond du survol, et de lui seul : les entrées interactives se
       frôlent vite, et une rafale d'impulsions devient un grésillement. */
    if (micro === "survol") {
      const maintenant = performance.now();
      if (maintenant - dernierSurvol.current < 110) return;
      dernierSurvol.current = maintenant;
    }

    impulsion(moteur, micro);
  }, []);

  /* --- Suspension sur onglet caché --- */

  useEffetVisuel(() => {
    const surVisibilite = () => {
      const moteur = moteurRef.current;
      if (moteur === null) return;
      if (document.visibilityState === "hidden") {
        void moteur.ctx.suspend();
      } else if (sonActif) {
        void moteur.ctx.resume();
      }
    };
    document.addEventListener("visibilitychange", surVisibilite);
    return () => document.removeEventListener("visibilitychange", surVisibilite);
  }, [sonActif]);

  /**
   * Restitution de la préférence.
   *
   * Elle ne peut pas s'appliquer au montage : aucun navigateur n'ouvre un
   * contexte audio sans geste. Elle attend donc la première interaction — et
   * seulement dans le cas où l'écran d'entrée ne va pas la poser lui-même. Sans
   * cette réserve, un visiteur qui a coupé le son la dernière fois puis clique
   * « Entrer avec le son » verrait les deux commandes se disputer la bascule
   * dans le même geste.
   */
  const { premiereInteraction } = useMouvement();
  const preferenceRendue = useRef(false);

  useEffetVisuel(() => {
    if (!premiereInteraction || preferenceRendue.current) return;
    preferenceRendue.current = true;

    /* L'écran d'entrée ne joue qu'une fois par session ; tant qu'il doit
       jouer, c'est lui qui décide. */
    let seuilAJouer = true;
    try {
      seuilAJouer = sessionStorage.getItem("rouviere:seuil-vu") !== "1";
    } catch {
      /* Stockage refusé : on laisse la main à l'écran d'entrée. */
    }
    if (seuilAJouer) return;

    if (lirePreference()) activerSon(true);
  }, [premiereInteraction, activerSon]);

  useEffetVisuel(() => {
    return () => {
      const moteur = moteurRef.current;
      moteurRef.current = null;
      if (moteur === null) return;
      for (const nappe of [moteur.hero, moteur.site, moteur.eau, moteur.projet]) {
        nappe?.element.pause();
      }
      void moteur.ctx.close();
    };
  }, []);

  const valeur = useMemo<Son>(
    () => ({
      sonActif,
      basculerSon,
      activerSon,
      jouer,
      reglerSortieHero,
      entrerProjet,
      quitterProjet,
      reglerEau,
    }),
    [
      sonActif,
      basculerSon,
      activerSon,
      jouer,
      reglerSortieHero,
      entrerProjet,
      quitterProjet,
      reglerEau,
    ],
  );

  return <ContexteSon.Provider value={valeur}>{children}</ContexteSon.Provider>;
}

export function useSon(): Son {
  const contexte = useContext(ContexteSon);
  if (contexte === null) {
    throw new Error("useSon doit être appelé sous un SonProvider.");
  }
  return contexte;
}
