"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
} from "react";
import { useEffetVisuel } from "@/lib/isomorphe";
import { visuels } from "@/data/visuels";
import "./video-projet.css";

/**
 * **Le flux d'un projet : un seul élément vidéo dans tout le site.**
 *
 * Il y en avait deux — celui de l'aperçu du menu, celui du hero de la page
 * projet — et ils se relayaient. Un relais entre deux éléments vidéo ne peut pas
 * être invisible : le second commence à zéro, il met quelques dizaines de
 * millisecondes à décoder sa première image, et pendant ce temps-là on voit soit
 * un noir, soit une poster, soit la fin de l'autre. Quatre symptômes différents
 * pour une seule cause.
 *
 * Ce module tient donc **un unique nœud `<video>`**, créé une fois, jamais
 * démonté, jamais recréé — le même parti que le logotype. Il vit dans un foyer
 * caché du layout et il est *déplacé* d'un hôte à l'autre : l'aperçu du menu, le
 * hero de la chambre. Déplacer un élément média dans le même document ne coupe
 * pas sa lecture : la spécification n'appelle les étapes de pause que si
 * l'élément n'est **plus** dans un document une fois l'état stabilisé, et un
 * `appendChild` le réinsère dans la même tâche. C'est ce qui permet à la vidéo du
 * menu de devenir la vidéo de la page sans une image de coupure, au même instant
 * de son flux.
 *
 * Le nœud est créé impérativement, et non rendu par React : React ne doit pas
 * posséder un élément dont le parent change sous lui.
 *
 * ## Ce que la maison garantit
 *
 * — **Aucune poster, jamais.** Une image fixe posée en attendant le décodage se
 *   lit comme un bug ; c'est exactement ce qu'on nous a signalé. L'élément n'a
 *   pas d'attribut `poster`, et il n'est révélé qu'une fois **réellement en
 *   lecture** : `play()` ne résout que quand la lecture a commencé, et on attend
 *   par-dessus une image effectivement présentée quand le navigateur sait le dire
 *   (`requestVideoFrameCallback`).
 * — **Aucune mémoire d'état.** Chaque `demarrer()` remet la tête à zéro, même
 *   sur un flux déjà chargé. Survoler un projet, un autre, puis revenir au
 *   premier redonne la première image du premier — et non la position où on
 *   l'avait laissé.
 * — **Pause et retour à zéro systématiques** à la sortie, par `arreter()`.
 *
 * ## La relève, et à qui appartient le flux
 *
 * Un clic sur une entrée de projet du menu **arme une relève** : la vidéo ne
 * s'arrête pas, elle sera adoptée telle quelle par la chambre qui se monte, à sa
 * position temporelle exacte. Le drapeau vit au niveau du module et non dans un
 * contexte React, parce que `Transition` doit pouvoir le lire *pendant son
 * rendu* — c'est lui qui décide de ne pas poser de couture sur cette
 * navigation-là : la continuité du flux est la transition.
 *
 * **`arreter()` demande son hôte, et c'est tout le correctif.** La vidéo
 * arrivait figée sur sa première image dans la page projet, et la cause était un
 * ordre qu'aucun drapeau ne pouvait couvrir : le clic déplace le pointeur hors
 * des entrées du menu, ce qui déclenche une sortie de survol *après* que la
 * chambre a consommé la relève. Le verrou était alors levé, l'arrêt passait, et
 * la vidéo qu'on venait d'emmener repartait à zéro, en pause, sous les yeux du
 * visiteur.
 *
 * Il y avait plusieurs façons de quitter le menu et une seule qui devait laisser
 * le flux tranquille ; les recenser toutes est un jeu qu'on perd. La question
 * n'est donc plus *quand* on arrête, mais **qui** arrête : un appelant ne peut
 * couper que le flux qu'il héberge encore. Dès que le nœud a changé de parent,
 * l'ancien hôte n'a plus prise dessus — par construction, sans drapeau, sans
 * ordre à respecter.
 */

/**
 * Filet de la révélation. `requestVideoFrameCallback` tire dans la frame qui
 * suit la première image présentée — soit une quinzaine de millisecondes. Passé
 * ce délai, on considère qu'il ne tirera pas (élément non composé, onglet en
 * arrière-plan) et on montre : la lecture a commencé, l'image est décodée.
 */
const FILET_IMAGE_MS = 80;

/**
 * Durée pendant laquelle une adoption garde la lecture ouverte. Une demi-seconde
 * couvre largement le délai qu'un moteur média peut mettre à décider d'une pause
 * après un changement de parent ; au-delà, une pause est une pause voulue.
 */
const GARDE_RELEVE_MS = 500;

/* ---- La relève, au niveau du module ---- */

let releve: string | null = null;

/**
 * Le clic sur une entrée de projet : la vidéo qui joue devient celle de la page.
 *
 * Le drapeau ne verrouille rien — c'est l'appartenance du nœud qui protège le
 * flux (voir `arreter`). Il dit seulement deux choses, à deux endroits : à
 * `Transition`, qu'il ne faut pas de couture sur cette navigation ; à la
 * chambre, qu'elle doit adopter au lieu de démarrer.
 */
export function armerReleve(slug: string): void {
  releve = slug;
}

/** Lecture seule, pour `Transition` pendant son rendu. */
export function releveArmee(): string | null {
  return releve;
}

/** La chambre prend la relève : le drapeau est consommé. */
export function consommerReleve(): string | null {
  const attendu = releve;
  releve = null;
  return attendu;
}

/** Abandonne une relève que personne n'a réclamée. */
export function annulerReleve(): void {
  releve = null;
}

/* ---- Le contexte ---- */

type Flux = {
  /**
   * Déplace le nœud d'un projet dans `hote`, sans interrompre sa lecture, et
   * renvoie tous les autres au foyer. `hote` à `null` rend celui-ci au foyer.
   */
  accueillir: (slug: string, hote: HTMLElement | null) => void;
  /**
   * Rembobine le flux du projet, le lance, et n'appelle `montrer` qu'une fois
   * qu'il a une image à donner — tout de suite s'il est déjà chargé.
   */
  demarrer: (slug: string, montrer: () => void) => void;
  /**
   * **Adopte** un flux qui joue déjà : le déplace chez `hote` sans le rembobiner
   * et garantit qu'il continue. Ne rembobine rien, ne remet rien à zéro — c'est
   * tout l'intérêt de la relève.
   */
  adopter: (slug: string, hote: HTMLElement) => void;
  /**
   * Pause et retour à zéro du flux en cours — **si `hote` le tient encore.**
   *
   * L'hôte n'est pas une précaution : c'est ce qui rend l'arrêt impossible pour
   * qui a déjà lâché le nœud. Le menu ne peut plus couper une vidéo partie dans
   * une chambre, quel que soit l'ordre dans lequel leurs effets s'exécutent.
   */
  arreter: (hote: HTMLElement | null) => void;
  /**
   * Met tous les flux en chauffe. Appelé à l'ouverture du menu : c'est ce qui
   * fait qu'un survol n'attend plus rien.
   */
  prechauffer: () => void;
};

const ContexteFlux = createContext<Flux | null>(null);

export function VideoProjetProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const foyerRef = useRef<HTMLDivElement>(null);
  /* Un nœud par projet, créé au premier besoin et jamais détruit. */
  const nœudsRef = useRef<Map<string, HTMLVideoElement>>(new Map());
  /* Le projet dont le flux est en cours : celui qu'`arreter` regarde. */
  const actifRef = useRef<string | null>(null);
  /* Un jeton par demande : la révélation d'une demande périmée est jetée. Sans
     lui, une image décodée tardivement dévoilerait le projet qu'on ne survole
     plus. */
  const jetonRef = useRef(0);

  /**
   * Le nœud d'un projet, créé au premier besoin.
   *
   * **Pas dans un effet de montage**, et la raison est un piège d'ordre : les
   * effets de disposition remontent l'arbre depuis les feuilles, si bien que la
   * chambre — qui est un descendant — réclame son flux *avant* que ce
   * fournisseur-ci n'ait exécuté le sien. Un élément créé au montage n'existe
   * donc pas encore quand la page projet s'ouvre directement, et le hero restait
   * sur sa poster, indéfiniment.
   *
   * **Un nœud par projet, et non un seul réemployé.** Le nœud unique imposait de
   * changer sa source à chaque survol, donc de la recharger et de la redécoder :
   * entre deux projets, le cadre restait noir le temps que la nouvelle image
   * arrive. Cinq éléments, mis en chauffe à l'ouverture du menu, n'ont plus rien
   * à charger quand on les désigne — leur première image est déjà décodée, on la
   * montre à la frame même. Et c'est toujours **le** nœud du projet qui part dans
   * le hero de la chambre au clic : un flux, une instance, du survol à la page.
   */
  const assurer = useCallback((slug: string): HTMLVideoElement | null => {
    const existant = nœudsRef.current.get(slug);
    if (existant !== undefined) return existant;
    const foyer = foyerRef.current;
    if (foyer === null) return null;
    const v = visuels[slug];
    if (v === undefined) return null;

    const video = document.createElement("video");
    video.className = "video-projet";
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.preload = "auto";
    video.tabIndex = -1;
    /* Décoratif : le média est toujours doublé par le texte de son hôte. */
    video.setAttribute("aria-hidden", "true");
    video.dataset.slug = slug;
    video.src =
      video.canPlayType("video/webm") !== "" ? v.video.webm : v.video.mp4;
    foyer.appendChild(video);
    nœudsRef.current.set(slug, video);
    return video;
  }, []);

  const prechauffer = useCallback(() => {
    for (const slug of Object.keys(visuels)) assurer(slug)?.load();
  }, [assurer]);

  useEffetVisuel(() => {
    const nœuds = nœudsRef.current;
    return () => {
      for (const video of nœuds.values()) {
        video.pause();
        video.removeAttribute("src");
        video.load();
        video.remove();
      }
      nœuds.clear();
    };
  }, []);

  const accueillir = useCallback(
    (slug: string, hote: HTMLElement | null) => {
      const video = assurer(slug);
      const foyer = foyerRef.current;
      if (video === null || foyer === null) return;
      /* Un seul nœud chez l'hôte à la fois : les autres rentrent. */
      for (const [autre, nœud] of nœudsRef.current) {
        if (autre !== slug && nœud.parentElement !== foyer) {
          foyer.appendChild(nœud);
        }
      }
      const cible = hote ?? foyer;
      /* Déplacement synchrone : l'élément ne quitte jamais le document entre le
         retrait et l'insertion, donc la lecture ne s'interrompt pas. */
      if (video.parentElement !== cible) cible.appendChild(video);
    },
    [assurer],
  );

  const demarrer = useCallback(
    (slug: string, montrer: () => void) => {
      const video = assurer(slug);
      if (video === null) return;

      jetonRef.current += 1;
      const mien = jetonRef.current;

      /* Le flux précédent s'efface : il ne doit ni continuer à décoder, ni
         reparaître si on revient sur lui. */
      const precedent = actifRef.current;
      if (precedent !== null && precedent !== slug) {
        const autre = nœudsRef.current.get(precedent);
        if (autre !== undefined) {
          autre.pause();
          if (autre.readyState > 0) autre.currentTime = 0;
        }
      }
      actifRef.current = slug;

      /* Aucune mémoire d'état : on rembobine avant de montrer, toujours. */
      if (video.readyState > 0) video.currentTime = 0;

      let montre = false;
      const reveler = () => {
        if (montre || mien !== jetonRef.current) return;
        montre = true;
        montrer();
      };

      void video.play().catch(() => {});

      /* **Déjà chargé : on montre à la frame même.** L'image courante est
         décodée, la lecture est lancée dans la foulée — attendre `play()` ne
         ferait qu'ajouter un ou deux cadres de noir, et c'est précisément le
         noir qu'on est venu supprimer. */
      if (video.readyState >= 2) {
        reveler();
        return;
      }

      /* Froid : on ne montre rien tant que la lecture n'a pas commencé.
         `requestVideoFrameCallback` attend une image réellement présentée au
         compositeur ; il n'existe pas partout et ne tire jamais sur un élément
         non composé, d'où le filet. */
      const attendreImage = () => {
        if (mien !== jetonRef.current) return;
        const demander = video.requestVideoFrameCallback?.bind(video);
        if (demander !== undefined) {
          demander(() => reveler());
          window.setTimeout(reveler, FILET_IMAGE_MS);
        } else {
          reveler();
        }
      };
      video.addEventListener("playing", attendreImage, { once: true });
      window.setTimeout(attendreImage, 400);
    },
    [assurer],
  );

  /**
   * La relève : le flux joue déjà, la chambre l'adopte.
   *
   * Rien n'est rembobiné et rien n'est révélé en différé — à cet instant le nœud
   * occupe exactement le même rectangle qu'une frame plus tôt dans l'aperçu du
   * menu, et le déplacement ne se voit pas.
   *
   * Deux garanties, et elles sont le correctif de la vidéo figée :
   *
   * — **On vérifie la lecture au lieu de la supposer.** Déplacer un élément média
   *   dans le même document ne devrait pas l'interrompre : la spécification
   *   n'appelle les étapes de pause que si l'élément n'est plus dans un document
   *   une fois l'état stabilisé, et l'insertion a lieu dans la même tâche que le
   *   retrait. « Ne devrait pas » n'est pas « ne peut pas », et le seul coût de
   *   la vérification est un booléen.
   * — **On tient la garde ouverte un instant.** Une pause décidée par le moteur
   *   média n'arrive pas forcément dans la frame du déplacement. Pendant une
   *   demi-seconde après l'adoption, toute pause qu'on n'a pas demandée est
   *   annulée. Passé ce délai, le flux appartient à la page et on ne le
   *   surveille plus.
   */
  const adopter = useCallback(
    (slug: string, hote: HTMLElement) => {
      const video = assurer(slug);
      if (video === null) return;

      /* Toute révélation encore en attente est périmée : celle-ci prend la
         main, et elle est immédiate. */
      jetonRef.current += 1;
      actifRef.current = slug;

      accueillir(slug, hote);

      const reprendre = () => {
        if (video.paused) void video.play().catch(() => {});
      };
      reprendre();

      video.addEventListener("pause", reprendre);
      window.setTimeout(
        () => video.removeEventListener("pause", reprendre),
        GARDE_RELEVE_MS,
      );
    },
    [assurer, accueillir],
  );

  /**
   * L'arrêt, et ses **deux** gardes. Elles couvrent deux fenêtres différentes,
   * et c'est parce qu'une seule était posée que la vidéo arrivait figée.
   *
   *   1. `releve !== null` — entre le clic et l'adoption. Le nœud est encore
   *      chez le menu, mais il est promis : personne ne le coupe.
   *   2. `parentElement !== hote` — après l'adoption. Le drapeau est consommé,
   *      donc la première garde est retombée ; c'est l'appartenance qui prend le
   *      relais. Le menu, qui reçoit sa sortie de survol quelque part par là,
   *      n'a plus prise sur un nœud qu'il ne loge plus.
   */
  const arreter = useCallback((hote: HTMLElement | null) => {
    if (releve !== null) return;
    const slug = actifRef.current;
    if (slug === null) return;
    const video = nœudsRef.current.get(slug);
    if (video === undefined) return;
    if (video.parentElement !== hote) return;
    /* La demande en cours est périmée : rien de ce qu'elle attend ne paraîtra. */
    jetonRef.current += 1;
    video.pause();
    if (video.readyState > 0) video.currentTime = 0;
  }, []);

  const valeur = useMemo<Flux>(
    () => ({ accueillir, demarrer, adopter, arreter, prechauffer }),
    [accueillir, demarrer, adopter, arreter, prechauffer],
  );

  return (
    <ContexteFlux.Provider value={valeur}>
      {/* Le foyer : hors écran, jamais peint. Le nœud y attend qu'un hôte le
          réclame, et y revient quand plus personne ne le tient. */}
      <div className="video-projet__foyer" ref={foyerRef} aria-hidden="true" />
      {children}
    </ContexteFlux.Provider>
  );
}

export function useVideoProjet(): Flux {
  const contexte = useContext(ContexteFlux);
  if (contexte === null) {
    throw new Error(
      "useVideoProjet doit être appelé sous un VideoProjetProvider.",
    );
  }
  return contexte;
}
