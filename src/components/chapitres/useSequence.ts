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

    /* Le plafond de densité et le pas d'échantillonnage lisent la même mesure ;
       on ne la refait pas soixante fois par seconde. */
    const grossier = matchMedia("(pointer: coarse)").matches;

    /* ---- Une image sur deux sur un téléphone ----
     *
     * Cent quatre-vingt-douze images de 1280 × 720 décodées et gardées en
     * mémoire, ce sont sept cents mégaoctets de bitmaps. Un ordinateur les
     * encaisse ; un téléphone déclenche sa pression mémoire, et Safari recharge
     * l'onglet — le parcours repart au seuil, au milieu du manifeste. C'était le
     * défaut le plus brutal du chapitre sur mobile, et le plus difficile à
     * imputer puisqu'il ne ressemble pas à un bug de rendu.
     *
     * **On n'échantillonne que le chargement, jamais la course.** L'index reste
     * mappé sur les 192 images : le minutage du chapitre, l'instant de l'allumage
     * et les bornes de l'eau ne bougent pas d'un centième. Simplement, une image
     * sur deux n'est pas là — et `dessiner` sait déjà quoi en faire, puisqu'il
     * recule jusqu'à la dernière disponible pour survivre à un trou de
     * chargement. Le scrub passe de 192 à 96 pas sur deux écrans de course : la
     * cadence reste très au-dessus de ce que l'œil sépare.
     *
     * La dernière image est toujours chargée, quel que soit le pas : c'est elle
     * qu'on regarde à l'arrêt en fin de course, et retomber sur l'avant-dernière
     * y serait la seule substitution qui se verrait. */
    const pas = grossier ? 2 : 1;
    const indices: number[] = [];
    for (let i = 0; i < sequence.nombre; i += pas) indices.push(i);
    if (indices[indices.length - 1] !== sequence.nombre - 1) {
      indices.push(sequence.nombre - 1);
    }

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
      /* Le plafond de densité du budget : deux sur une machine de bureau, un et
         demi sur un pointeur grossier. C'est la même règle que le rig applique
         à son tampon de rendu — un `drawImage` par frame sur un tampon deux fois
         trop grand est un coût de remplissage pur, et c'est le poste le plus
         cher d'un scrub d'images sur téléphone. */
      const dpr = Math.min(devicePixelRatio, grossier ? 1.5 : 2);
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

    /* Le premier tiers **de ce qu'on charge**, et non le premier tiers de la
       séquence : c'est la même part de course couverte dans les deux cas. */
    const bloquantes = Math.max(1, Math.round(indices.length * PART_BLOQUANTE));

    const demarrer = async () => {
      await Promise.all(indices.slice(0, bloquantes).map(charger));
      if (annule) return;

      setPrete(true);
      etat.tailleSale = true;
      etat.dessine = -1;
      surPretRef.current?.();

      for (let i = bloquantes; i < indices.length; i += 1) {
        if (annule) return;
        await charger(indices[i]!);
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
