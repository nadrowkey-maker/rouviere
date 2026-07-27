"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { useEffetVisuel } from "@/lib/isomorphe";
import { useMouvement } from "./MotionProvider";
import { reclamer, liberer, type NatureTransition } from "./orchestrateur";
import { retirer, figer, RETIRE } from "./passage";
import { releveArmee, annulerReleve } from "@/components/chrome/VideoProjet";
import { LANGUES } from "@/i18n/langues";
import "./transition.css";

/**
 * Les coutures entre routes.
 *
 * Le canvas et le chrome vivent dans le layout et ne se démontent jamais ; seul
 * le contenu de la route change, sous ce composant monté dans `app/template.tsx`
 * — un template se réinstancie à chaque navigation, ce qui donne le point
 * d'accroche de la surface.
 *
 * Une surface d'encre couvre la nouvelle route dès sa première peinture, puis se
 * retire par le **passage** — le fondu de matière, seule grammaire de transition
 * du site (voir `passage.ts`). La route est bien montée **sous** la surface avant
 * qu'elle ne s'efface. Le fond du site étant déjà `--encre`, aucune navigation ne
 * peut virer au blanc : la couture est une respiration, pas un cache-misère.
 *
 * Il n'y a plus de motif par destination. Le damier des projets, les stores
 * horizontaux du retour au parcours et les stores verticaux des archives sont
 * sortis du code avec `scroll-transition` : trois masques SVG qui se
 * contredisaient là où un seul geste suffit. La nature du passage survit, mais
 * pour une seule raison — l'orchestrateur en a besoin pour tenir son créneau
 * unique.
 *
 * Le logo, en `mix-blend-mode: difference` au-dessus de cette surface, en reste
 * le négatif exact — la couture traverse le geste signature sans le rompre.
 *
 * En mouvement réduit, pas de couture : l'échange est instantané, et l'encre du
 * fond empêche déjà tout flash. C'est une version, pas une punition.
 *
 * **Une seule navigation n'a pas de couture, et pour une bonne raison :** celle
 * qui vient d'une entrée de projet du menu. Là, la vidéo qui jouait derrière le
 * titre devient le hero de la page — le même élément, le même flux, la même
 * image (voir `chrome/VideoProjet.tsx`). La continuité du plan *est* la
 * transition ; poser une surface par-dessus reviendrait à éteindre l'écran au
 * milieu du seul raccord du site qui n'en a pas besoin. Le drapeau est lu
 * pendant le rendu, avant que la moindre surface ne soit montée.
 */

/* Vrai une fois l'application montée : la toute première peinture (le seuil) ne
   reçoit pas de couture. Le drapeau vit hors du composant car le template se
   remonte à chaque navigation. */
let dejaCharge = false;

/** Où l'on va. Sert au créneau de l'orchestrateur, plus à aucun motif.
 *
 * Le chemin porte toujours son segment de langue en tête (`/fr/projets/…`) :
 * on le retire avant de lire la destination, sinon aucune route n'est jamais
 * reconnue et tout passait pour du « parcours ». */
function natureVers(pathname: string): NatureTransition {
  const tete = pathname.split("/")[1] ?? "";
  const sansLangue = LANGUES.includes(tete as (typeof LANGUES)[number])
    ? pathname.slice(tete.length + 1)
    : pathname;
  if (sansLangue.startsWith("/projets/")) return "projet";
  if (sansLangue.startsWith("/archives")) return "archives";
  return "parcours";
}

export function Transition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { mouvementReduit } = useMouvement();

  /* Calculé au premier rendu de ce montage : premier chargement de
     l'application, ou navigation ? Sur navigation, la surface couvre dès la
     première peinture — pas d'état posé après coup, donc pas de frame où la
     nouvelle route se voit avant d'être couverte. */
  const premierRef = useRef(!dejaCharge);
  /* Lu au rendu, jamais consommé ici : c'est la chambre qui consomme la relève,
     dans son effet de montage — donc avant celui-ci, les effets des enfants
     précédant ceux de leurs parents. */
  const releveRef = useRef(releveArmee() !== null);
  const [couvert, setCouvert] = useState(
    premierRef.current || releveRef.current ? false : !mouvementReduit,
  );

  const surfaceRef = useRef<HTMLDivElement>(null);

  useEffetVisuel(() => {
    dejaCharge = true;
    /* Si personne n'a réclamé la relève, elle ne doit pas survivre à cette
       navigation : la suivante mériterait sa couture. */
    annulerReleve();
    if (premierRef.current) return; // premier chargement : pas de couture
    if (releveRef.current) return; // relève du flux : le plan fait le raccord
    if (mouvementReduit) {
      setCouvert(false);
      return;
    }

    const surface = surfaceRef.current;
    if (surface === null) {
      setCouvert(false);
      return;
    }

    const decouvrir = () => setCouvert(false);
    /* La couture réclame le créneau unique : elle tue et finalise toute
       transition encore vivante (typiquement la fermeture du menu, quand on
       entre dans un projet depuis le menu ouvert). La surface de route reste
       alors la seule à s'animer. */
    const animation = retirer(surface, {
      fini: () => {
        liberer(animation);
        decouvrir();
      },
    });
    reclamer({
      nature: natureVers(pathname),
      anim: animation,
      finaliser: () => {
        figer(surface, RETIRE);
        decouvrir();
      },
    });

    return () => {
      animation.kill();
      liberer(animation);
    };
    // Une seule fois par montage, c'est-à-dire par navigation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      {children}
      {couvert
        ? createPortal(
            <div className="passage" ref={surfaceRef} aria-hidden="true" />,
            document.body,
          )
        : null}
    </>
  );
}
