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
 *
 * Une seule montée fait exception et n'est pas une rampe : **la toute première**,
 * celle du hero au sortir du sas. Elle passe par `emerger()`, sur une parabole et
 * sur quatre secondes — une droite arrive trop vite pour l'oreille, et le son
 * doublait la vidéo au lieu de la rejoindre. Voir `FONDU_ENTREE`.
 */

/** Les micro-sons de l'interface. Chacun est une impulsion filtrée. */
export type Micro =
  | "survol"
  | "ouvrir"
  | "fermer"
  | "projet"
  | "copie"
  | "bascule";

/**
 * Les deux effets ponctuels du parcours. Ce ne sont pas des impulsions
 * synthétisées comme les `Micro` : ce sont deux fichiers, courts, décodés en
 * `AudioBuffer` à la construction du moteur — et décodés d'avance précisément
 * parce qu'ils doivent partir **à la frame du geste visuel**. Un `fetch` au
 * moment du déclenchement arriverait deux cents millisecondes trop tard, et
 * l'oreille entend parfaitement ce décalage-là.
 *
 * Ils passent par le bus `interface`, comme les micro-sons : ce sont des
 * ponctuations, pas des nappes.
 */
export type Effet = "titre" | "lumiere";

type Son = {
  /**
   * Le son **sort-il réellement** ? Pas « l'utilisateur en veut-il » : la
   * distinction n'est pas cosmétique, voir `sonEnAttente`.
   */
  sonActif: boolean;
  /**
   * Le son est voulu, mais le navigateur n'a pas encore laissé le contexte
   * démarrer — il faut un geste qui vaille activation. Le bouton le dit au
   * lieu de prétendre que tout va bien.
   */
  sonEnAttente: boolean;
  basculerSon: () => void;
  /** Pose l'état sans le basculer. Utilisé par l'écran d'entrée. */
  activerSon: (actif: boolean) => void;
  /** Joue un micro-son. Sans effet tant que le son est coupé. */
  jouer: (micro: Micro) => void;
  /**
   * Joue un des deux effets ponctuels. Sans effet si le son est coupé ou si
   * le contexte n'a pas encore été autorisé — il n'y a pas de file d'attente :
   * un son qui devait marquer un geste n'a plus rien à marquer une fois le
   * geste passé.
   */
  jouerEffet: (effet: Effet) => void;
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
  /**
   * Coupe entièrement le bus des nappes, ou le rend. Un seul endroit du site
   * s'en sert : le bassin du vestibule, où il ne doit plus rester que l'eau.
   */
  couperNappes: (coupees: boolean) => void;
  /**
   * L'entrée et la sortie du dernier chapitre. La nappe du site s'efface, celle
   * de la sortie prend le cadre ; on remonte, elle s'arrête et le site revient.
   */
  reglerSortie: (dans: boolean) => void;
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
/**
 * **La toute première arrivée du son**, celle du hero, quand on entre par le sas.
 *
 * Elle empruntait le fondu du bouton — quatre dixièmes de seconde —, et c'était
 * beaucoup trop brutal : on cliquait « entrer avec le son » et la nappe était
 * là, d'un coup, par-dessus une vidéo qui, elle, tient l'écran seule pendant deux
 * secondes et demie. La musique arrivait avant l'image.
 *
 * Quatre secondes, et par une courbe (voir `emerger`) : le son ne commence pas,
 * il se met à exister. Il atteint son plein à peu près quand le logotype se pose,
 * ce qui est le bon moment — c'est là que le site commence vraiment.
 *
 * La bascule du bouton, elle, garde ses quatre dixièmes : on lui demande
 * d'obéir, pas de faire une entrée.
 */
const FONDU_ENTREE = 4;
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
/**
 * Coupure complète des nappes, et leur retour. Un seul endroit du site s'en
 * sert : le bassin du vestibule. Une seconde et demie, c'est assez long pour
 * qu'on ne remarque pas la coupure et assez court pour qu'au moment où l'eau
 * emplit l'écran, il n'y ait plus qu'elle.
 */
const FONDU_NAPPES = 1.5;

/** Gain de l'eau à pleine vitesse. */
const EAU_MAX = 0.6;
/**
 * Niveau de la nappe de la sortie. Elle vit sur le bus d'ambiance, qui est à
 * gain plein : cette valeur la met à peu près au niveau qu'avaient les nappes
 * du parcours (0,5), pour que l'échange ne s'entende pas comme une montée.
 */
const SORTIE_MAX = 0.55;
/**
 * Vitesse du pointeur, en pixels par frame, au-delà de laquelle l'eau est à
 * son plein. Trente pixels par frame à soixante hertz, c'est un balayage franc
 * de l'écran en une seconde environ.
 */
const EAU_VITESSE_PLEINE = 30;

/** La préférence de son, persistée d'une visite à l'autre. */
const CLE_PREFERENCE = "rouviere:son";

/** Les deux effets ponctuels, et leur niveau sur le bus d'interface. */
const FICHIERS_EFFETS: Record<Effet, string> = {
  titre: "/audio/sfx/titre.mp3",
  lumiere: "/audio/sfx/lumiere.mp3",
};

/**
 * Niveau des effets ponctuels. Au-dessus des micro-sons — ce sont des
 * ponctuations de mise en scène, pas des accusés de réception d'interface —
 * mais toujours sous le bus, qui est lui-même bas.
 */
const NIVEAU_EFFET = 0.85;

/**
 * **Les gestes qui réarment le contexte audio.**
 *
 * Il faut ici distinguer deux choses que le site confondait, et c'est toute
 * l'histoire du bug de rechargement (voir `useEffetVisuel` du réarmement) :
 *
 *   — *un geste*, au sens du site : l'utilisateur a fait quelque chose. La
 *     molette en est un.
 *   — *une activation*, au sens du navigateur : le seul état qui autorise
 *     `AudioContext.resume()` et `HTMLMediaElement.play()`. La molette n'en
 *     est **pas** une, ni `touchstart`, ni `scroll`. Seuls `pointerdown`,
 *     `mousedown`, `touchend` et `keydown` en délivrent une.
 *
 * On écoute donc les deux familles. Les gestes qui n'activent pas sont dans la
 * liste parce qu'ils ne coûtent rien et que, le jour où un navigateur les
 * accepterait, le son partirait plus tôt ; ceux qui activent sont ceux qui
 * feront réellement le travail. La liste est réécoutée tant que le contexte
 * n'a pas démarré — c'est cela qui compte, bien plus que son contenu exact.
 */
const GESTES_REARMEMENT = [
  "pointerdown",
  "mousedown",
  "touchend",
  "keydown",
  "touchstart",
  "wheel",
  "scroll",
] as const;

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

/** Nombre de segments de la courbe d'émergence. Au-delà, on n'entend plus rien
 *  de plus ; en deçà, l'escalier redevient audible sur une longue montée. */
const SEGMENTS_EMERGENCE = 32;

/**
 * Fait **émerger** un gain du silence, par une courbe et non par une droite.
 *
 * Une rampe linéaire de gain n'est pas une montée douce : la sensation de
 * volume suit à peu près la racine du gain, si bien qu'une droite se jette dans
 * l'oreille pendant son premier tiers puis n'a plus grand-chose à donner. Une
 * parabole (`x²`) corrige exactement cette courbure : le son sort de rien, prend
 * son temps, et arrive sans qu'on ait su dire quand il a commencé.
 *
 * Elle est écrite en segments de `linearRampToValueAtTime` plutôt qu'en
 * `setValueCurveAtTime` : une courbe programmée verrouille l'intervalle et fait
 * lever une exception à toute automatisation qui l'y croise — or le bouton du
 * chrome doit pouvoir couper le son en plein milieu de cette montée-là.
 */
function emerger(param: AudioParam, cible: number, duree: number, t: number) {
  param.cancelScheduledValues(t);
  const depart = param.value;
  param.setValueAtTime(depart, t);
  const pas = Math.max(duree, 0.005) / SEGMENTS_EMERGENCE;
  for (let i = 1; i <= SEGMENTS_EMERGENCE; i += 1) {
    const x = i / SEGMENTS_EMERGENCE;
    param.linearRampToValueAtTime(depart + (cible - depart) * x * x, t + i * pas);
  }
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
  /**
   * La nappe du dernier chapitre, montée au premier passage et gardée ensuite.
   * Elle vit sur le bus d'**ambiance** et non sur celui des nappes — c'est ce
   * dernier qu'on est justement en train de couper en entrant. Le bassin y est
   * déjà, pour la même raison : ce ne sont pas des bandes-son, ce sont les
   * pièces dans lesquelles on entre.
   */
  sortie: Nappe | null;
  /** Bruit blanc court, source de toutes les impulsions d'interface. */
  bruit: AudioBuffer;
  /** Les deux effets ponctuels, décodés d'avance. Voir `Effet`. */
  effets: Map<Effet, AudioBuffer>;
};

/** Toutes les lectures en cours, celles du moteur. Sert aux bascules globales. */
function lectures(moteur: Moteur): Array<Nappe | null> {
  return [moteur.hero, moteur.site, moteur.eau, moteur.projet, moteur.sortie];
}

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

/**
 * Joue un des deux effets ponctuels sur le bus d'interface.
 *
 * Aucune file d'attente, et c'est délibéré : ces deux sons **datent** un geste
 * visuel — l'arrivée du logotype, l'allumage de la pièce. Si le contexte n'est
 * pas en marche à cet instant précis, il n'y a plus rien à dater ; le jouer
 * trois secondes plus tard, quand le son se débloque, ne serait pas un rattrapage,
 * ce serait un bruit sans cause.
 */
function jouerEffetSur(moteur: Moteur, effet: Effet): void {
  const { ctx, interface: bus } = moteur;
  if (ctx.state !== "running") return;

  const buffer = moteur.effets.get(effet);
  if (buffer === undefined) return;

  const source = ctx.createBufferSource();
  source.buffer = buffer;

  const gain = ctx.createGain();
  gain.gain.value = NIVEAU_EFFET;

  source.connect(gain);
  gain.connect(bus);
  source.start();
  source.onended = () => {
    source.disconnect();
    gain.disconnect();
  };
}

/** L'état de la montée du maître. Voir `monterMaitre`. */
type EtatMaitre = {
  /** L'émergence de quatre secondes a-t-elle déjà été jouée ? */
  emerge: boolean;
  /** Une montée est-elle déjà programmée et non annulée depuis ? */
  monte: boolean;
};

/**
 * Monte le gain maître — mais **seulement si le contexte tourne pour de bon**,
 * et **seulement si une montée n'est pas déjà en route**.
 *
 * Les deux garde-fous corrigent deux défauts distincts, et les deux se
 * paieraient à l'oreille :
 *
 * `state !== "running"` — écrire une automatisation sur un contexte suspendu
 * est permis et parfaitement silencieux : l'horloge est arrêtée, la rampe
 * attend. Le problème n'est pas là, il est dans le compte : si l'on comptait
 * cette écriture-là comme « la première montée », le vrai démarrage, plus tard,
 * hériterait du fondu court.
 *
 * `monte` — la mise en marche est signalée **deux fois** : par la promesse de
 * `resume()` et par le `statechange` du contexte, dans un ordre qui ne se
 * prédit pas. Sans ce drapeau, le second appel voyait `emerge` déjà posé et
 * lançait la rampe de quatre dixièmes, qui **annule** l'émergence de quatre
 * secondes en cours. La nappe du hero arrivait d'un coup — exactement le défaut
 * que `FONDU_ENTREE` existe pour corriger, réintroduit par sa propre garde.
 */
function monterMaitre(moteur: Moteur, maitre: { current: EtatMaitre }): void {
  if (moteur.ctx.state !== "running") return;
  if (maitre.current.monte) return;
  maitre.current.monte = true;

  const t = moteur.ctx.currentTime;
  if (maitre.current.emerge) {
    rampe(moteur.maitre.gain, 1, FONDU_MAITRE, t);
    return;
  }
  maitre.current.emerge = true;
  emerger(moteur.maitre.gain, 1, FONDU_ENTREE, t);
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
  /**
   * **Trois états, et non deux.** Le site n'en connaissait que deux — le son
   * est allumé, le son est coupé — et c'est ce qui a produit le pire des
   * défauts possibles pour un bouton : il disait « actif » alors que rien ne
   * sortait.
   *
   *   `souhaiteRef`   — ce que l'utilisateur veut. Persisté.
   *   `sonActif`      — ce qui sort réellement, c'est-à-dire `souhaite` **et**
   *                     un contexte en marche.
   *   `sonEnAttente`  — voulu, pas encore autorisé. C'est le seul état neuf, et
   *                     c'est lui qui arme les écouteurs de réarmement.
   *
   * `souhaite` vit dans une ref et non dans un état : il est lu depuis des
   * écouteurs d'événements natifs, qui capturent la valeur du rendu où ils ont
   * été posés.
   */
  const souhaiteRef = useRef(false);
  const [sonActif, setSonActif] = useState(false);
  const [sonEnAttente, setSonEnAttente] = useState(false);
  const moteurRef = useRef<Moteur | null>(null);
  /** L'état de la montée du maître. Voir `monterMaitre`, qui l'explique. */
  const etatMaitre = useRef<EtatMaitre>({ emerge: false, monte: false });
  /**
   * Le son sort-il réellement, lu depuis un écouteur natif ? `sonActif` est un
   * état de rendu ; la bascule, elle, s'exécute dans le geste et a besoin de la
   * valeur de l'instant.
   */
  const actifRef = useRef(false);
  /** Anti-spam du survol : les entrées interactives se frôlent vite. */
  const dernierSurvol = useRef(0);
  /**
   * La progression hors du hero, retenue même quand le moteur n'existe pas
   * encore : le seuil commence à la pousser avant qu'on ait cliqué, et la
   * nappe doit démarrer au bon niveau, pas à zéro.
   */
  const sortieHero = useRef(0);
  /**
   * Est-on dans le dernier chapitre ? Lu par la bascule du son — qui ne doit
   * pas relancer une nappe qu'on a quittée — et par la minuterie d'arrêt, qui
   * ne doit pas couper une nappe qu'on vient de reprendre.
   */
  const sortieDans = useRef(false);

  /**
   * Recalcule les deux booléens publics depuis la vérité : ce que veut
   * l'utilisateur, et l'état réel du contexte.
   *
   * C'est la seule fonction du fichier qui écrive `sonActif`. Toutes les
   * autres se contentent de changer le souhait ou de pousser le contexte, puis
   * l'appellent — et le `statechange` du contexte l'appelle aussi tout seul,
   * ce qui couvre les transitions qu'on ne provoque pas nous-mêmes (la
   * politique d'autoplay qui lâche prise, l'onglet qui revient au premier plan).
   */
  const synchroniser = useCallback(() => {
    const moteur = moteurRef.current;
    const souhaite = souhaiteRef.current;
    const tourne = souhaite && moteur !== null && moteur.ctx.state === "running";
    actifRef.current = tourne;
    setSonActif(tourne);
    setSonEnAttente(souhaite && !tourne);
  }, []);

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
      sortie: null,
      bruit,
      effets: new Map(),
    };

    /* Le contexte dit lui-même quand il démarre ou s'arrête. C'est plus sûr que
       d'inférer son état des promesses de `resume()` : sur les navigateurs qui
       diffèrent l'autorisation, cette promesse se résout sans que le contexte
       ait bougé, et il se met en marche plus tard, tout seul. */
    ctx.onstatechange = () => {
      synchroniser();
      /* Le contexte s'est mis en marche de lui-même — autorisation accordée
         après coup, onglet revenu au premier plan : la nappe monte maintenant,
         et c'est ici seulement qu'on peut le savoir. */
      if (souhaiteRef.current) monterMaitre(moteur, etatMaitre);
    };

    /* Les deux effets ponctuels, décodés d'avance. Un échec est silencieux :
       `jouerEffetSur` ne trouvera pas son tampon et ne jouera rien, ce qui est
       exactement le bon comportement pour une ponctuation. */
    for (const nom of Object.keys(FICHIERS_EFFETS) as Effet[]) {
      void fetch(FICHIERS_EFFETS[nom])
        .then((reponse) => reponse.arrayBuffer())
        .then((donnees) => ctx.decodeAudioData(donnees))
        .then((tampon) => {
          moteur.effets.set(nom, tampon);
        })
        .catch(() => {
          /* Fichier absent ou format refusé : l'effet ne joue pas. */
        });
    }

    moteurRef.current = moteur;
    return moteur;
  }, [synchroniser]);

  /* --- Bascule et préférence --- */

  /**
   * **Le réveil du moteur.** Idempotente, et elle doit l'être : elle est
   * appelée par la bascule, par l'écran d'entrée, et de nouveau à *chaque*
   * geste tant que le contexte n'a pas démarré. La rappeler quand tout va déjà
   * bien ne fait rien de plus qu'une reprise sur un contexte en marche, qui est
   * un non-événement.
   */
  const reveiller = useCallback(
    (avecRetour: boolean) => {
      const moteur = construire();
      if (moteur === null) return;

      /* La confirmation est jouée *après* la reprise : au moment du clic, le
         contexte vient d'être créé ou est encore suspendu, et l'impulsion
         serait perdue. */
      void moteur.ctx
        .resume()
        .then(() => {
          monterMaitre(moteur, etatMaitre);
          synchroniser();
          if (avecRetour) impulsion(moteur, "bascule");
        })
        .catch(() => {
          /* Reprise refusée : ce n'est pas une erreur, c'est l'état d'attente.
             Le prochain geste réessaiera. */
          synchroniser();
        });

      for (const lecture of lectures(moteur)) {
        if (lecture === null) continue;
        /* La nappe de la sortie ne se relance que si l'on y est : sinon elle
           décoderait en silence tout le reste du parcours. */
        if (lecture === moteur.sortie && !sortieDans.current) continue;
        /* La lecture peut être refusée : on ne traite pas le refus comme
           une erreur, le gain restera simplement muet. */
        void lecture.element.play().catch(() => {});
      }

      /* Contexte déjà en marche : on monte tout de suite, sans attendre le
         tour de boucle de la promesse. */
      monterMaitre(moteur, etatMaitre);
      synchroniser();
    },
    [construire, synchroniser],
  );

  /** L'arrêt : fondu du maître, puis on arrête vraiment. */
  const endormir = useCallback(
    (avecRetour: boolean) => {
      const moteur = moteurRef.current;
      if (moteur === null) return;

      /* En coupant, la confirmation part avant le fondu : après, elle serait
         inaudible — c'est justement ce qu'on vient de demander. */
      if (avecRetour) impulsion(moteur, "bascule");

      /* La montée est annulée : le prochain réveil devra en reprogrammer une. */
      etatMaitre.current.monte = false;
      rampe(moteur.maitre.gain, 0, FONDU_MAITRE, moteur.ctx.currentTime);
      /* Après le fondu, on arrête vraiment : les éléments sont mis en pause
         *et* le contexte est suspendu. Suspendre seul ne suffit pas — un
         `<audio>` en lecture continue de télécharger et de décoder même si
         sa sortie ne rejoint plus la destination. */
      window.setTimeout(() => {
        const courant = moteurRef.current;
        if (courant === null || souhaiteRef.current) return;
        for (const n of lectures(courant)) n?.element.pause();
        void courant.ctx.suspend();
      }, FONDU_MAITRE * 1000 + 60);
    },
    [],
  );

  /**
   * Pose le souhait, le persiste, et pousse le moteur dans le sens demandé.
   *
   * C'est ici, et nulle part ailleurs, que `souhaiteRef` change de valeur : le
   * réarmement, lui, ne fait qu'obéir à un souhait déjà pris.
   */
  const poser = useCallback(
    (souhaite: boolean, avecRetour: boolean) => {
      souhaiteRef.current = souhaite;
      ecrirePreference(souhaite);
      if (souhaite) reveiller(avecRetour);
      else endormir(avecRetour);
      synchroniser();
    },
    [reveiller, endormir, synchroniser],
  );

  /**
   * **La bascule a trois cas, pas deux**, et le troisième est celui qui piégeait.
   *
   * Le bouton en attente affiche « cliquer pour l'activer ». Si la bascule lisait
   * le *souhait*, ce clic verrait `souhaite = true` et **couperait** un son que
   * l'utilisateur n'a jamais entendu — le bouton aurait menti une seconde fois,
   * en sens inverse.
   *
   * En attente, le clic n'est donc pas une bascule : c'est le geste d'activation
   * qui manquait, et il ne fait qu'une chose, réveiller. C'est d'ailleurs le
   * meilleur geste possible pour cela — un clic de souris vaut activation là où
   * le défilement qui l'a précédé n'en accordait aucune.
   */
  const basculerSon = useCallback(() => {
    if (souhaiteRef.current && !actifRef.current) {
      reveiller(true);
      return;
    }
    poser(!souhaiteRef.current, true);
  }, [poser, reveiller]);

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

  /**
   * La coupure des nappes. C'est le bus entier qui descend, pas une nappe en
   * particulier : peu importe laquelle joue — celle du hero, celle du site,
   * celle d'un projet —, il n'en reste aucune. Le fondu croisé du parcours
   * continue de se régler sous la coupure, si bien qu'à la sortie la nappe qui
   * revient est celle que commande la position réelle du défilement.
   */
  const couperNappes = useCallback((coupees: boolean) => {
    const moteur = moteurRef.current;
    if (moteur === null) return;
    rampe(
      moteur.musique.gain,
      coupees ? 0 : NIVEAU_MUSIQUE,
      FONDU_NAPPES,
      moteur.ctx.currentTime,
    );
  }, []);

  /* --- La sortie ---
     Le dernier chapitre est le seul du parcours à avoir sa propre nappe. Elle
     ne remplace pas celle du site sur le même bus : c'est le bus des nappes
     entier qui s'efface — la même coupure qu'au bassin, pour la même raison —
     et la sortie entre par le bus d'ambiance. On remonte, elle s'arrête et le
     parcours reprend là où il en était. */
  const reglerSortie = useCallback((dans: boolean) => {
    sortieDans.current = dans;
    const moteur = moteurRef.current;
    if (moteur === null) return;

    const { ctx, ambiance } = moteur;
    const t = ctx.currentTime;

    if (dans && moteur.sortie === null) {
      const element = new Audio("/audio/sortie.mp3");
      element.loop = true;
      element.preload = "auto";
      const gain = ctx.createGain();
      gain.gain.value = 0;
      ctx.createMediaElementSource(element).connect(gain);
      gain.connect(ambiance);
      moteur.sortie = { element, sortie: gain };
    }

    rampe(moteur.musique.gain, dans ? 0 : NIVEAU_MUSIQUE, FONDU_NAPPES, t);

    const nappe = moteur.sortie;
    if (nappe === null) return;

    if (dans) void nappe.element.play().catch(() => {});
    rampe(nappe.sortie.gain, dans ? SORTIE_MAX : 0, FONDU_NAPPES, t);

    if (!dans) {
      /* On arrête vraiment après le fondu : un `<audio>` en lecture continue de
         télécharger et de décoder même à gain nul. La garde est là parce qu'on
         peut être redescendu entre-temps — auquel cas c'est la nappe en cours
         qu'on couperait. */
      window.setTimeout(() => {
        if (sortieDans.current) return;
        moteurRef.current?.sortie?.element.pause();
      }, FONDU_NAPPES * 1000 + 80);
    }
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

  const jouerEffet = useCallback((effet: Effet) => {
    const moteur = moteurRef.current;
    if (moteur === null) return;
    jouerEffetSur(moteur, effet);
  }, []);

  /* --- Suspension sur onglet caché --- */

  useEffetVisuel(() => {
    const surVisibilite = () => {
      const moteur = moteurRef.current;
      if (moteur === null) return;
      if (document.visibilityState === "hidden") {
        void moteur.ctx.suspend().then(synchroniser);
      } else if (souhaiteRef.current) {
        /* L'onglet revient : on redemande la marche. Si l'autorisation manque
           toujours — l'onglet a pu être rechargé en arrière-plan —, on retombe
           simplement en attente et le prochain geste s'en chargera. */
        void moteur.ctx.resume().then(() => {
          monterMaitre(moteur, etatMaitre);
          synchroniser();
        });
      }
    };
    document.addEventListener("visibilitychange", surVisibilite);
    return () => document.removeEventListener("visibilitychange", surVisibilite);
  }, [synchroniser]);

  /**
   * **Restitution de la préférence — et le bug qu'elle a causé.**
   *
   * Elle ne peut pas s'appliquer au montage : aucun navigateur n'ouvre un
   * contexte audio sans geste. Elle attendait donc la première interaction, et
   * n'essayait **qu'une fois**. C'est ce qui rendait le site muet après un
   * rechargement, et le diagnostic tient en une distinction :
   *
   * `premiereInteraction` se lève sur `wheel` — or la molette n'accorde
   * *aucune* activation au sens du navigateur. Le seul essai partait donc dans
   * le vide : le contexte se construisait bien, restait suspendu, personne ne
   * réessayait — et l'état d'interface, lui, passait à « actif ». Le bouton
   * affichait un son qui n'existait pas, et le cliquer le *coupait*.
   *
   * Ce que fait le code maintenant : on ne pose ici que le **souhait**. C'est
   * l'état d'attente qui en découle qui arme les écouteurs ci-dessous, et ils
   * réessaient à chaque geste jusqu'à ce que le contexte tourne pour de bon.
   * L'écran d'entrée n'est pas forcé de reparaître, et rien ne démarre sans
   * geste : les deux contraintes tiennent ensemble.
   */
  const preferenceRendue = useRef(false);

  useEffetVisuel(() => {
    if (preferenceRendue.current) return;
    preferenceRendue.current = true;

    /* L'écran d'entrée ne joue qu'une fois par session ; tant qu'il doit
       jouer, c'est lui qui décide. Sans cette réserve, un visiteur qui a coupé
       le son la dernière fois puis clique « Entrer avec le son » verrait les
       deux commandes se disputer la bascule dans le même geste. */
    let seuilAJouer = true;
    try {
      seuilAJouer = sessionStorage.getItem("rouviere:seuil-vu") !== "1";
    } catch {
      /* Stockage refusé : on laisse la main à l'écran d'entrée. */
    }
    if (seuilAJouer) return;

    if (!lirePreference()) return;

    /* Le souhait, et rien d'autre : pas de contexte ouvert hors d'un geste,
       pas d'écran d'entrée rappelé. L'attente qui suit fera le travail. */
    souhaiteRef.current = true;
    setSonEnAttente(true);
  }, []);

  /**
   * **Le réarmement.** Tant que le son est voulu sans être obtenu, tout geste
   * est une chance de le débloquer, et on la prend — sans `once`, sans compteur,
   * sans limite : l'écoute ne s'arrête que lorsque le contexte tourne, c'est-à-dire
   * quand `sonEnAttente` retombe et que cet effet se démonte.
   *
   * En capture, parce qu'un composant du parcours peut arrêter la propagation
   * d'un `pointerdown` avant qu'il n'atteigne la fenêtre ; en passif, parce
   * qu'aucun de ces écouteurs n'annule quoi que ce soit et qu'on ne veut pas
   * peser sur le défilement.
   */
  useEffetVisuel(() => {
    if (!sonEnAttente) return;

    const essayer = () => {
      if (!souhaiteRef.current) return;
      reveiller(false);
    };

    for (const geste of GESTES_REARMEMENT) {
      addEventListener(geste, essayer, { passive: true, capture: true });
    }
    return () => {
      for (const geste of GESTES_REARMEMENT) {
        removeEventListener(geste, essayer, { capture: true });
      }
    };
  }, [sonEnAttente, reveiller]);

  useEffetVisuel(() => {
    return () => {
      const moteur = moteurRef.current;
      moteurRef.current = null;
      if (moteur === null) return;
      for (const nappe of lectures(moteur)) nappe?.element.pause();
      void moteur.ctx.close();
    };
  }, []);

  const valeur = useMemo<Son>(
    () => ({
      sonActif,
      sonEnAttente,
      basculerSon,
      activerSon,
      jouer,
      jouerEffet,
      reglerSortieHero,
      entrerProjet,
      quitterProjet,
      reglerEau,
      couperNappes,
      reglerSortie,
    }),
    [
      sonActif,
      sonEnAttente,
      basculerSon,
      activerSon,
      jouer,
      jouerEffet,
      reglerSortieHero,
      entrerProjet,
      quitterProjet,
      reglerEau,
      couperNappes,
      reglerSortie,
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
