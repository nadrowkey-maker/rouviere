"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

/**
 * Le son. Web Audio natif, pas de bibliothèque.
 *
 * Une nappe de pièce très basse, plus quelques micro-sons d'interface. Coupé
 * par défaut, et il ne démarre jamais sans un clic explicite : le contexte
 * audio n'est même pas créé avant la première activation, et il est suspendu
 * dès qu'on recoupe — un contexte qui tourne pour rien coûte du CPU en continu.
 *
 * Aucune boucle `requestAnimationFrame` ici : les oscillateurs et les
 * enveloppes sont programmés dans l'horloge audio, sur son propre fil.
 */

/** Les micro-sons de l'interface. Chacun est une brève enveloppe. */
export type Micro = "ouvrir" | "fermer" | "survol" | "clic";

type Son = {
  /** Le son est-il actif — état d'interface, piloté par le bouton de bascule. */
  sonActif: boolean;
  basculerSon: () => void;
  /** Joue un micro-son. Sans effet tant que le son est coupé. */
  jouer: (micro: Micro) => void;
};

const ContexteSon = createContext<Son | null>(null);

/** Niveau de la nappe une fois montée. Volontairement à la limite du perçu. */
const NIVEAU_NAPPE = 0.09;
/** Niveau des micro-sons, sous la nappe. */
const NIVEAU_MICRO = 0.06;
/** Montée et descente du maître, pour qu'aucune bascule ne claque. */
const FONDU = 0.4;

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

type Moteur = {
  ctx: AudioContext;
  maitre: GainNode;
  /** Bus des micro-sons, sous le maître : ils suivent la coupure générale. */
  micro: GainNode;
};

export function SonProvider({ children }: { children: React.ReactNode }) {
  const [sonActif, setSonActif] = useState(false);
  const moteurRef = useRef<Moteur | null>(null);
  /** Anti-spam du survol : les entrées interactives se frôlent vite. */
  const dernierSurvol = useRef(0);

  /* Le contexte n'est construit qu'à la première activation — donc dans le
     geste de clic, seul moment où un navigateur autorise le démarrage audio. */
  const construire = useCallback((): Moteur | null => {
    if (moteurRef.current !== null) return moteurRef.current;

    const Constructeur = obtenirConstructeur();
    if (Constructeur === null) return null;

    const ctx = new Constructeur();

    const maitre = ctx.createGain();
    maitre.gain.value = 0;
    maitre.connect(ctx.destination);

    /* La nappe : deux basses désaccordées et une quinte, filtrées haut-coupe,
       avec un très lent balayage du filtre pour qu'elle respire. Une pièce
       vide, pas une note. */
    const nappe = ctx.createGain();
    nappe.gain.value = NIVEAU_NAPPE;
    nappe.connect(maitre);

    const filtre = ctx.createBiquadFilter();
    filtre.type = "lowpass";
    filtre.frequency.value = 220;
    filtre.Q.value = 0.6;
    filtre.connect(nappe);

    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.05;
    const lfoAmpleur = ctx.createGain();
    lfoAmpleur.gain.value = 80;
    lfo.connect(lfoAmpleur);
    lfoAmpleur.connect(filtre.frequency);
    lfo.start();

    for (const [frequence, type, gain] of [
      [57.5, "sine", 0.6],
      [58.3, "sine", 0.5],
      [87, "triangle", 0.25],
    ] as const) {
      const osc = ctx.createOscillator();
      osc.type = type;
      osc.frequency.value = frequence;
      const g = ctx.createGain();
      g.gain.value = gain;
      osc.connect(g);
      g.connect(filtre);
      osc.start();
    }

    const micro = ctx.createGain();
    micro.gain.value = NIVEAU_MICRO;
    micro.connect(maitre);

    const moteur: Moteur = { ctx, maitre, micro };
    moteurRef.current = moteur;
    return moteur;
  }, []);

  const basculerSon = useCallback(() => {
    setSonActif((actif) => {
      const prochainActif = !actif;

      if (prochainActif) {
        const moteur = construire();
        if (moteur === null) return false; // Web Audio absent : on reste coupé.
        const { ctx, maitre } = moteur;
        void ctx.resume();
        const t = ctx.currentTime;
        maitre.gain.cancelScheduledValues(t);
        maitre.gain.setValueAtTime(maitre.gain.value, t);
        maitre.gain.linearRampToValueAtTime(1, t + FONDU);
      } else {
        const moteur = moteurRef.current;
        if (moteur !== null) {
          const { ctx, maitre } = moteur;
          const t = ctx.currentTime;
          maitre.gain.cancelScheduledValues(t);
          maitre.gain.setValueAtTime(maitre.gain.value, t);
          maitre.gain.linearRampToValueAtTime(0, t + FONDU);
          /* Suspendre après le fondu : le fil audio s'arrête, plus de CPU. */
          window.setTimeout(() => {
            if (!moteurRef.current) return;
            void moteurRef.current.ctx.suspend();
          }, FONDU * 1000 + 60);
        }
      }

      return prochainActif;
    });
  }, [construire]);

  const jouer = useCallback((micro: Micro) => {
    const moteur = moteurRef.current;
    if (moteur === null) return;
    const { ctx, micro: bus } = moteur;
    if (ctx.state !== "running") return;

    if (micro === "survol") {
      const maintenant = performance.now();
      if (maintenant - dernierSurvol.current < 110) return;
      dernierSurvol.current = maintenant;
    }

    /* Un profil par micro-son : fréquence de départ, fréquence d'arrivée,
       durée, forme. Rien de mélodique — des repères, pas une musique. */
    const profils: Record<
      Micro,
      { de: number; a: number; duree: number; type: OscillatorType; gain: number }
    > = {
      ouvrir: { de: 320, a: 520, duree: 0.22, type: "sine", gain: 0.9 },
      fermer: { de: 480, a: 240, duree: 0.18, type: "sine", gain: 0.8 },
      survol: { de: 900, a: 900, duree: 0.05, type: "triangle", gain: 0.35 },
      clic: { de: 440, a: 300, duree: 0.08, type: "triangle", gain: 0.6 },
    };
    const p = profils[micro];

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = p.type;
    osc.frequency.setValueAtTime(p.de, t);
    osc.frequency.exponentialRampToValueAtTime(p.a, t + p.duree);

    const enveloppe = ctx.createGain();
    enveloppe.gain.setValueAtTime(0, t);
    enveloppe.gain.linearRampToValueAtTime(p.gain, t + 0.006);
    enveloppe.gain.exponentialRampToValueAtTime(0.0001, t + p.duree);

    osc.connect(enveloppe);
    enveloppe.connect(bus);
    osc.start(t);
    osc.stop(t + p.duree + 0.02);
  }, []);

  useEffect(() => {
    return () => {
      const moteur = moteurRef.current;
      moteurRef.current = null;
      void moteur?.ctx.close();
    };
  }, []);

  const valeur = useMemo<Son>(
    () => ({ sonActif, basculerSon, jouer }),
    [sonActif, basculerSon, jouer],
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
