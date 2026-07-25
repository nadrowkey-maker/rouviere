"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
} from "react";
import { useRouter } from "next/navigation";
import { gsap } from "@/lib/gsap";
import { useEffetVisuel } from "@/lib/isomorphe";
import { fenetre, PLEIN, type Boite } from "@/components/motion/plongee";
import { visuels } from "@/data/visuels";
import { useMouvement } from "@/components/motion/MotionProvider";
import { useDefilement } from "@/components/motion/LenisProvider";
import { armerReleve, useVideoProjet } from "./VideoProjet";
import "./ouverture.css";

/**
 * **L'entrée dans un projet depuis le couloir.**
 *
 * On cliquait une pièce et la page se remplaçait sous une couture : c'était
 * propre, et ce n'était rien. Le geste que le couloir appelle est celui qu'il
 * emploie déjà pour sortir — **le cadre s'ouvre**. Les quatre bords de la fenêtre
 * partent rejoindre les quatre bords de l'écran, et l'image ne bouge pas d'un
 * pixel : c'est possible parce que les pièces du couloir ne cadrent pas leur
 * photographie mais en montrent un morceau, à la taille exacte qu'elle a en plein
 * écran (voir `gl/materiaux/piece.ts`). Il n'y a donc rien à redimensionner, rien
 * à faire coïncider : on retire ce qui cachait le reste.
 *
 * Puis, une fois le cadre grand ouvert, **le contenu passe tranquillement à la
 * vidéo** du projet — la photographie et le premier plan du film sont la même
 * pièce, le fondu de matière se lit comme une prise de vue qui s'anime. La vidéo
 * qui joue alors est le nœud partagé du site : c'est **elle** que la chambre
 * adopte à l'arrivée, à la même image (voir `VideoProjet.tsx`). Aucune couture de
 * route, aucun noir : la navigation se fait sous une image qui ne s'interrompt
 * jamais.
 *
 * Le composant vit dans le chrome, jamais dans le chapitre : il doit survivre au
 * changement de route, qui démonte l'enfilade.
 */

/** Ouverture du cadre. Ample : c'est un mouvement d'appareil, pas un survol. */
const DUREE_CADRE = 1.05;
/** Le fondu vers le film, une fois le cadre ouvert. */
const DUREE_FILM = 0.72;
/**
 * Filet : si la navigation n'aboutit pas — route déjà ouverte, extension qui
 * l'empêche —, la surface ne doit pas rester posée sur le site.
 */
const FILET_MS = 2200;

type Depart = {
  slug: string;
  /** La boîte de la pièce cliquée, en coordonnées du cadre. */
  boite: Boite;
};

type Ouvreur = {
  /** Vrai si l'ouverture a été prise en charge ; faux, l'appelant navigue seul. */
  ouvrir: (depart: Depart) => boolean;
  /**
   * Rend la surface au repos. La chambre l'appelle dès qu'elle a adopté le flux :
   * à cet instant la vidéo est partie dans son hero, et ce qui resterait ici
   * serait une surface d'encre vide par-dessus la page.
   */
  ranger: () => void;
};

const ContexteOuverture = createContext<Ouvreur | null>(null);

export function OuvertureProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { mouvementReduit } = useMouvement();
  const { arreter: arreterDefilement, reprendre } = useDefilement();
  const flux = useVideoProjet();
  const router = useRouter();

  const surfaceRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const hoteRef = useRef<HTMLDivElement>(null);
  const ligneRef = useRef<gsap.core.Timeline | null>(null);
  const filetRef = useRef<number | null>(null);

  /** Referme tout, rend la surface au repos et le défilement à la page. */
  const ranger = useCallback(() => {
    reprendre("ouverture");
    const surface = surfaceRef.current;
    const image = imageRef.current;
    if (image !== null) image.style.opacity = "0";
    ligneRef.current?.kill();
    ligneRef.current = null;
    if (filetRef.current !== null) {
      clearTimeout(filetRef.current);
      filetRef.current = null;
    }
    if (surface === null) return;
    surface.dataset.etat = "repos";
    gsap.set(surface, { clipPath: PLEIN, autoAlpha: 0 });
  }, [reprendre]);

  useEffetVisuel(() => ranger, [ranger]);

  const ouvrir = useCallback(
    ({ slug, boite }: Depart) => {
      const surface = surfaceRef.current;
      const image = imageRef.current;
      const hote = hoteRef.current;
      const v = visuels[slug];
      /* En mouvement réduit, aucun cadre ne s'ouvre : la couture de route fait
         l'affaire, et elle est instantanée. */
      if (
        mouvementReduit ||
        surface === null ||
        image === null ||
        hote === null ||
        v === undefined
      ) {
        return false;
      }

      ligneRef.current?.kill();
      /* Le cadre s'ouvre : la page ne défile plus sous lui. Sans ce verrou, le
         couloir continue de courir derrière la fenêtre — et le focus que le clic
         pose sur le lien demande en plus au chapitre d'amener sa pièce au
         centre. On regarderait une image immobile pendant que tout glisse
         autour. */
      arreterDefilement("ouverture");

      /* La photographie de départ : la même que la pièce, à la même taille
         qu'elle a en plein écran. Elle est déjà décodée — le couloir la montre. */
      image.src = v.planches[0]!.src;
      image.style.opacity = "1";

      /* Le nœud du projet vient se loger sous la photographie. Il joue déjà si
         l'on survolait la pièce ; sinon il démarre ici. */
      flux.accueillir(slug, hote);
      hote.style.opacity = "0";
      flux.demarrer(slug, () => {
        hote.style.opacity = "1";
      });

      /* La relève est armée avant la navigation : la chambre adoptera ce
         flux-là, à sa position, et n'aura pas de couture. */
      armerReleve(slug);

      surface.dataset.etat = "ouvre";
      const ligne = gsap.timeline({
        onComplete: () => {
          /* La photographie s'efface une fois le film installé : sous elle, il
             n'y a plus que la vidéo, qui partira dans le hero. */
          router.push(`/projets/${slug}`);
        },
      });
      ligne.fromTo(
        surface,
        { autoAlpha: 1, clipPath: fenetre(boite, { largeur: innerWidth, hauteur: innerHeight }) },
        { clipPath: PLEIN, duration: DUREE_CADRE, ease: "power2.inOut" },
        0,
      );
      /* Le fondu vers le film commence quand le cadre a fait les deux tiers de
         sa course : on a alors assez d'image pour que le passage se voie, et il
         se termine bien avant que la page ne change. */
      ligne.to(
        image,
        { opacity: 0, duration: DUREE_FILM, ease: "power1.inOut" },
        DUREE_CADRE * 0.62,
      );
      ligneRef.current = ligne;

      /* Si la route ne change jamais, on ne laisse pas la surface posée. */
      if (filetRef.current !== null) clearTimeout(filetRef.current);
      filetRef.current = window.setTimeout(ranger, FILET_MS);

      return true;
    },
    [arreterDefilement, flux, mouvementReduit, ranger, router],
  );

  const valeur = useMemo<Ouvreur>(() => ({ ouvrir, ranger }), [ouvrir, ranger]);

  return (
    <ContexteOuverture.Provider value={valeur}>
      {children}
      {/* La surface d'ouverture : plein cadre, découpée par la fenêtre de la
          pièce cliquée. Au repos elle n'est pas peinte. */}
      <div
        className="ouverture"
        ref={surfaceRef}
        data-etat="repos"
        aria-hidden="true"
      >
        {/* L'hôte du flux, dessous ; la photographie par-dessus, qui s'efface. */}
        <div className="ouverture__flux" ref={hoteRef} />
        {/* `src` posé impérativement au clic sur un nœud réemployé : `next/image`
            ne s'y prête pas. Décoratif, hors du flux LCP. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="ouverture__image" ref={imageRef} alt="" />
      </div>
    </ContexteOuverture.Provider>
  );
}

export function useOuverture(): Ouvreur {
  const contexte = useContext(ContexteOuverture);
  if (contexte === null) {
    throw new Error("useOuverture doit être appelé sous un OuvertureProvider.");
  }
  return contexte;
}
