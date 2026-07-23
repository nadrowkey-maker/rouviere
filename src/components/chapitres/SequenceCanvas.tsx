"use client";

import { useRef, useState } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { inscrire } from "@/lib/boucle";
import { useMouvement } from "@/components/motion/MotionProvider";
import { useEffetVisuel } from "@/lib/isomorphe";
import type { Sequence } from "@/data/visuels";
import "./sequence.css";

/**
 * La séquence de frames — *l'approche* de la chambre.
 *
 * Un vrai plan de caméra qui traverse la villa, décomposé en images fixes et
 * redessiné sur un canvas 2D, l'index piloté par le défilement.
 *
 * **Ce n'est pas une vidéo dont on force le `currentTime`.** Le point est
 * technique et il est la raison d'être de ce composant : demander une position
 * arbitraire à un décodeur vidéo l'oblige à repartir de l'image-clé précédente
 * et à décoder toutes les images intermédiaires. Sur Safari et iOS le seek est
 * de surcroît asynchrone et coalescé — on demande vingt positions par seconde,
 * on en obtient trois. Le défilement devient saccadé sans qu'aucun profil ne
 * montre de frame longue, parce que le coût n'est pas dans la page. Avec des
 * images fixes, chaque position est un `drawImage` sur une image déjà décodée :
 * le scrub est exact dans les deux sens, à la frame près.
 *
 * Le chargement est en deux temps. Le premier tiers est bloquant — sans lui, la
 * traversée commencerait sur du vide. Le reste arrive en tâche de fond pendant
 * qu'on lit, image par image et dans l'ordre, de sorte que la suivante est
 * toujours prête avant qu'on y arrive.
 */

type Props = {
  sequence: Sequence;
  /** L'équivalent DOM de ce que peint le canvas. */
  description: string;
  className?: string;
};

/** Part de la séquence chargée avant de rendre la main. */
const PART_BLOQUANTE = 1 / 3;

function urlFrame(sequence: Sequence, index: number): string {
  const numero = String(index + 1).padStart(4, "0");
  return `${sequence.dossier}/${numero}.${sequence.extension}`;
}

export function SequenceCanvas({ sequence, description, className }: Props) {
  const { mouvementReduit } = useMouvement();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ancreRef = useRef<HTMLDivElement>(null);
  const [prete, setPrete] = useState(false);

  useEffetVisuel(() => {
    const canvas = canvasRef.current;
    const ancre = ancreRef.current;
    if (canvas === null || ancre === null) return;

    const contexte = canvas.getContext("2d", { alpha: false });
    if (contexte === null) return;

    let annule = false;
    const images = new Array<HTMLImageElement | null>(sequence.nombre).fill(null);

    /* L'index est écrit par le défilement et lu par la phase de rendu : on ne
       dessine jamais depuis le rappel de ScrollTrigger, qui s'exécute dans la
       phase de défilement — c'est-à-dire avant la passe de mesure. */
    const etat = { index: 0, dessine: -1, tailleSale: true };

    const charger = (i: number): Promise<void> =>
      new Promise((resoudre) => {
        const image = new Image();
        image.decoding = "async";
        image.src = urlFrame(sequence, i);
        const fini = () => {
          images[i] = image;
          resoudre();
        };
        image
          .decode()
          .then(fini)
          /* Une frame manquante ne casse pas la traversée : on garde le
             trou, le dessin retombe sur la dernière image disponible. */
          .catch(() => resoudre());
      });

    /** Dimensionne le tampon et recalcule le cadrage « cover ». */
    const redimensionner = () => {
      const rect = ancre.getBoundingClientRect();
      const dpr = Math.min(devicePixelRatio, 2);
      const largeur = Math.round(rect.width * dpr);
      const hauteur = Math.round(rect.height * dpr);
      if (largeur === 0 || hauteur === 0) return;
      if (canvas.width === largeur && canvas.height === hauteur) return;
      canvas.width = largeur;
      canvas.height = hauteur;
      etat.dessine = -1;
    };

    const dessiner = (index: number) => {
      /* Trou dans le chargement : on recule jusqu'à la dernière image prête
         plutôt que de laisser le canvas vide. */
      let i = index;
      while (i >= 0 && images[i] == null) i -= 1;
      const image = i >= 0 ? images[i] : null;
      if (image == null) return;

      const cl = canvas.width;
      const ch = canvas.height;
      const rapport = Math.max(cl / image.width, ch / image.height);
      const l = image.width * rapport;
      const h = image.height * rapport;
      contexte.drawImage(image, (cl - l) / 2, (ch - h) / 2, l, h);
      etat.dessine = index;
    };

    const surRedimensionnement = () => {
      etat.tailleSale = true;
    };
    addEventListener("resize", surRedimensionnement, { passive: true });

    /* Mesure : on lit la boîte. Rendu : on peint. Jamais l'inverse. */
    const desMesure = inscrire("mesure", () => {
      if (etat.tailleSale) {
        etat.tailleSale = false;
        redimensionner();
      }
    });
    const desRendu = inscrire("rendu", () => {
      if (etat.index !== etat.dessine) dessiner(etat.index);
    });

    /* Le déclencheur est créé tout de suite, et non une fois les images
       chargées.

       Ce n'est pas un détail d'ordonnancement : il épingle, donc il insère un
       espaceur dans le flux. Créé plus tard, cet espaceur s'intercale au-dessus
       de chapitres dont ScrollTrigger a déjà mesuré la position — et la chambre
       suivante se retrouve décalée de toute la hauteur de l'épinglage. Tous les
       déclencheurs qui épinglent doivent exister au montage, dans l'ordre du
       document. Le chargement, lui, peut prendre son temps : tant qu'aucune
       image n'est prête, `dessiner` ne fait rien. */
    let declencheur: ScrollTrigger | null = null;

    if (!mouvementReduit) {
      const relais = { p: 0 };
      declencheur = ScrollTrigger.create({
        trigger: ancre,
        start: "top top",
        end: () => `+=${innerHeight * 2.4}`,
        pin: true,
        /* Le même motif que l'enfilade : `.scene-page` porte en permanence
           un `transform` et un `filter`, donc un `position: fixed` s'y
           calerait sur la page et non sur le viewport. */
        pinType: "transform",
        scrub: 0.6,
        invalidateOnRefresh: true,
        animation: gsap.to(relais, {
          p: 1,
          ease: "none",
          duration: 1,
          onUpdate: () => {
            etat.index = Math.min(
              sequence.nombre - 1,
              Math.max(0, Math.round(relais.p * (sequence.nombre - 1))),
            );
          },
        }),
      });
    }

    const bloquantes = Math.max(
      1,
      Math.round(sequence.nombre * PART_BLOQUANTE),
    );

    const demarrer = async () => {
      /* Le premier tiers, en parallèle : c'est ce qui doit être là avant que
         la traversée ne commence. */
      await Promise.all(
        Array.from({ length: bloquantes }, (_, i) => charger(i)),
      );
      if (annule) return;

      setPrete(true);
      etat.tailleSale = true;
      etat.dessine = -1;

      /* Le reste arrive dans l'ordre, une image à la fois : la suivante est
         prête avant qu'on l'atteigne, et le réseau n'est jamais saturé par
         cent requêtes simultanées. */
      for (let i = bloquantes; i < sequence.nombre; i += 1) {
        if (annule) return;
        await charger(i);
      }
    };

    void demarrer();

    return () => {
      annule = true;
      removeEventListener("resize", surRedimensionnement);
      desMesure();
      desRendu();
      declencheur?.kill();
      /* Les images sont relâchées explicitement : une séquence, c'est cent
         cinquante bitmaps décodés en mémoire. */
      for (let i = 0; i < images.length; i += 1) {
        const image = images[i];
        if (image != null) image.src = "";
        images[i] = null;
      }
    };
  }, [sequence, mouvementReduit]);

  return (
    <div
      className={`sequence${className === undefined ? "" : ` ${className}`}`}
      ref={ancreRef}
      data-prete={prete}
    >
      <canvas
        className="sequence__toile"
        ref={canvasRef}
        role="img"
        aria-label={description}
      />
    </div>
  );
}
