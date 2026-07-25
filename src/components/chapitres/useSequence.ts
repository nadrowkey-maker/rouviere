"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { inscrire } from "@/lib/boucle";
import { useEffetVisuel } from "@/lib/isomorphe";
import type { Sequence } from "@/data/visuels";

/**
 * La mécanique de séquence de frames : chargement, cadrage, dessin.
 *
 * **Ce que ce hook ne fait pas : décider de l'index.** Il expose une ref que
 * l'appelant écrit, et il peint. C'est ce qui lui permet de servir deux
 * chapitres dont les courses n'ont rien à voir — l'approche d'une chambre, qui
 * épingle un écran pour elle seule (voir `SequenceCanvas`), et le manifeste du
 * vestibule, dont l'index n'est qu'une ligne parmi sept dans une timeline
 * existante. Un composant qui apporterait son propre `ScrollTrigger` ne pourrait
 * pas servir le second sans lui imposer un deuxième épinglage.
 *
 * **Ce n'est pas une vidéo dont on force le `currentTime`**, et c'est la raison
 * d'être de tout ceci : demander une position arbitraire à un décodeur vidéo
 * l'oblige à repartir de l'image-clé précédente et à décoder toutes les images
 * intermédiaires. Sur Safari et iOS le seek est de surcroît asynchrone et
 * coalescé — on demande vingt positions par seconde, on en obtient trois. Le
 * défilement saccade sans qu'aucun profil ne montre de frame longue, parce que
 * le coût n'est pas dans la page. Avec des images fixes, chaque position est un
 * `drawImage` sur une image déjà décodée : le scrub est exact dans les deux
 * sens, à la frame près, et la molette donne un contrôle continu — on avance, on
 * recule, on accélère.
 *
 * Le chargement est en deux temps. Le premier tiers est bloquant : sans lui, la
 * course commencerait sur du vide. Le reste arrive en tâche de fond, image par
 * image et **dans l'ordre**, de sorte que la suivante est prête avant qu'on y
 * arrive et que le réseau n'encaisse jamais deux cents requêtes d'un coup.
 *
 * Lecture et écriture ne se croisent jamais : la boîte est lue en phase de
 * mesure, le canvas est peint en phase de rendu. Voir `lib/boucle.ts`.
 */

/** Part de la séquence chargée avant de rendre la main. */
const PART_BLOQUANTE = 1 / 3;

function urlFrame(sequence: Sequence, index: number): string {
  const numero = String(index + 1).padStart(4, "0");
  return `${sequence.dossier}/${numero}.${sequence.extension}`;
}

type Options = {
  /**
   * Faux : rien n'est chargé ni peint. Le mouvement réduit s'en sert pour ne
   * pas télécharger quatre mégaoctets de frames qu'il ne déroulera jamais.
   */
  actif?: boolean;
  /**
   * Appelée une fois le premier tiers en place. Les chapitres qui épinglent
   * s'en servent pour re-mesurer : la course venait d'être réservée sur des
   * positions d'avant le chargement.
   */
  surPret?: () => void;
};

export type Peinture = {
  /**
   * L'index à peindre. Écrit par l'appelant — depuis un `onUpdate` de
   * ScrollTrigger, une timeline en scrub, n'importe quoi —, lu une fois par
   * frame en phase de rendu.
   */
  index: RefObject<number>;
  /** Vrai dès que le premier tiers est décodé. */
  prete: boolean;
};

export function useSequence(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  ancreRef: RefObject<HTMLElement | null>,
  sequence: Sequence,
  { actif = true, surPret }: Options = {},
): Peinture {
  const index = useRef(0);
  const [prete, setPrete] = useState(false);

  /* Le rappel passe par une ref : il changerait d'identité à chaque rendu et
     relancerait le chargement complet de la séquence. */
  const surPretRef = useRef(surPret);
  useEffect(() => {
    surPretRef.current = surPret;
  });

  useEffetVisuel(() => {
    const canvas = canvasRef.current;
    const ancre = ancreRef.current;
    if (canvas === null || ancre === null || !actif) return;

    const contexte = canvas.getContext("2d", { alpha: false });
    if (contexte === null) return;

    let annule = false;
    const images = new Array<HTMLImageElement | null>(sequence.nombre).fill(null);
    const etat = { dessine: -1, tailleSale: true };

    const charger = (i: number): Promise<void> =>
      new Promise((resoudre) => {
        const image = new Image();
        image.decoding = "async";
        image.src = urlFrame(sequence, i);
        image
          .decode()
          .then(() => {
            images[i] = image;
            resoudre();
          })
          /* Une frame manquante ne casse pas la course : on garde le trou, le
             dessin retombe sur la dernière image disponible. */
          .catch(() => resoudre());
      });

    /** Dimensionne le tampon et invalide le dessin. Phase de mesure. */
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

    const dessiner = (cible: number) => {
      /* Trou dans le chargement : on recule jusqu'à la dernière image prête
         plutôt que de laisser le canvas vide. */
      let i = cible;
      while (i >= 0 && images[i] == null) i -= 1;
      const image = i >= 0 ? images[i] : null;
      if (image == null) return;

      const cl = canvas.width;
      const ch = canvas.height;
      const rapport = Math.max(cl / image.width, ch / image.height);
      const l = image.width * rapport;
      const h = image.height * rapport;
      contexte.drawImage(image, (cl - l) / 2, (ch - h) / 2, l, h);
      etat.dessine = cible;
    };

    const surRedimensionnement = () => {
      etat.tailleSale = true;
    };
    addEventListener("resize", surRedimensionnement, { passive: true });

    const desMesure = inscrire("mesure", () => {
      if (etat.tailleSale) {
        etat.tailleSale = false;
        redimensionner();
      }
    });
    const desRendu = inscrire("rendu", () => {
      if (index.current !== etat.dessine) dessiner(index.current);
    });

    const bloquantes = Math.max(
      1,
      Math.round(sequence.nombre * PART_BLOQUANTE),
    );

    const demarrer = async () => {
      await Promise.all(
        Array.from({ length: bloquantes }, (_, i) => charger(i)),
      );
      if (annule) return;

      setPrete(true);
      etat.tailleSale = true;
      etat.dessine = -1;
      surPretRef.current?.();

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
      /* Les images sont relâchées explicitement : une séquence, c'est deux
         cents bitmaps décodés en mémoire. */
      for (let i = 0; i < images.length; i += 1) {
        const image = images[i];
        if (image != null) image.src = "";
        images[i] = null;
      }
    };
  }, [sequence, actif, canvasRef, ancreRef]);

  return { index, prete };
}
