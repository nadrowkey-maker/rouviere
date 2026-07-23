"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { useEffetVisuel } from "@/lib/isomorphe";
import "./chapitre-courant.css";

/**
 * Le nom du chapitre courant, en couche technique, en bas à gauche.
 *
 * Il ne dépend d'aucun registre : chaque chapitre pose un attribut
 * `data-chapitre="…"` sur sa section, et un IntersectionObserver repère celui
 * qui croise une fine bande au milieu du viewport. Un chapitre qui n'existe pas
 * encore n'a rien à déclarer — l'indicateur reste simplement muet.
 */
export function ChapitreCourant() {
  const [nom, setNom] = useState<string>("");
  const pathname = usePathname();

  useEffetVisuel(() => {
    const sections = Array.from(
      document.querySelectorAll<HTMLElement>("[data-chapitre]"),
    );
    if (sections.length === 0) {
      setNom("");
      return;
    }

    const visibles = new Set<HTMLElement>();

    const observateur = new IntersectionObserver(
      (entrees) => {
        for (const entree of entrees) {
          const cible = entree.target as HTMLElement;
          if (entree.isIntersecting) visibles.add(cible);
          else visibles.delete(cible);
        }
        /* Le chapitre courant est le plus bas de ceux qui croisent la bande :
           en descendant, le suivant prend la main dès qu'il l'atteint. */
        let courant: HTMLElement | null = null;
        let meilleurHaut = -Infinity;
        for (const section of visibles) {
          const haut = section.getBoundingClientRect().top;
          if (haut > meilleurHaut) {
            meilleurHaut = haut;
            courant = section;
          }
        }
        if (courant !== null) {
          setNom(courant.dataset.chapitre ?? "");
        }
      },
      /* Une bande d'un pixel au milieu de l'écran : la section qui la touche
         est celle qu'on est en train de lire. */
      { rootMargin: "-50% 0px -50% 0px", threshold: 0 },
    );

    for (const section of sections) observateur.observe(section);
    return () => observateur.disconnect();
    /* `pathname` n'est pas lu dans le corps : il sert de déclencheur. À chaque
       changement de route on re-balaye le DOM, car les sections changent avec
       la page tandis que le chrome, lui, ne se démonte pas. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return (
    <p className="chapitre-courant technique" aria-hidden="true">
      <span className="chapitre-courant__mot" data-vide={nom === ""}>
        {nom}
      </span>
    </p>
  );
}
