"use client";

import { useMemo } from "react";
import Link from "next/link";
import { projets } from "@/data/projets";
import { archives } from "@/data/archives";
import { useLangue } from "@/i18n/LangueProvider";
import { chemin } from "@/i18n/langues";
import "./archives.css";

/**
 * Les Archives. Une liste. Une vraie liste, austère, en Switzer, sans images —
 * projet, lieu, année. C'est ici que le vide travaille : on voit combien il y en
 * a eu, on n'en voit aucun.
 *
 * Le mot `Archives` ouvre le chapitre en très gros Gambetta et projette une
 * ombre portée dure en cascade, construite par empilement de copies décalées à
 * distances doublantes — comme si elle fuyait vers l'infini. Le filtre est
 * repris tel quel de `references/zip/beautiful-typography` (`shadow-bottom-right`
 * de `script.js`), transcrit ici en JSX statique : sept décalages 2 → 128 et
 * autant de fusions suffisent à porter l'ombre à 254 pixels. Jamais animé — un
 * filtre SVG sur du très gros texte coûte cher au repaint, et le document
 * l'interdit ici.
 *
 * Grammaire de mouvement : **la liste immobile**. Au survol d'une ligne, rien de
 * spectaculaire — elle se décale de huit pixels et la couche technique du
 * chantier paraît dans la marge. Les Archives vivent sur leur propre route,
 * atteinte par le menu : aucune adjacence de chapitre à surveiller.
 *
 * Le filtre est purement décoratif (`aria-hidden`) : la copie d'ombre est cachée
 * aux lecteurs d'écran, seul le `<h1>` net porte le mot.
 */

type Ligne = {
  nom: string;
  lieu: string;
  annee: number;
  /** Couche technique révélée au survol. */
  mention: string;
  /** Les cinq projets récents mènent à leur chambre ; les archives sont inertes. */
  href?: string;
};

/* Le corps complet de l'atelier : les cinq projets récents, puis les archives
   plus anciennes, du plus récent au plus ancien. Les récents portent un lien
   vers leur chambre — ils ont des images ailleurs ; les archives n'en ont pas,
   c'est le propos.

   La liste se construit **dans** le composant depuis qu'elle porte du texte
   traduit : au niveau du module, elle serait figée dans la langue du premier
   rendu. Elle ne se recalcule qu'au changement de langue. */
export function Archives() {
  const { t, dire, direTous, langue } = useLangue();

  const lignes = useMemo<Ligne[]>(
    () =>
      [
        ...projets.map((projet) => ({
          nom: projet.nom,
          lieu: projet.lieu,
          annee: projet.annee,
          mention: `${projet.surface} m² — ${direTous(projet.matieres).join(", ")}`,
          href: chemin(langue, `/projets/${projet.slug}`),
        })),
        ...archives.map((archive) => ({
          nom: archive.nom,
          lieu: archive.lieu,
          annee: archive.annee,
          mention: dire(archive.mention),
        })),
      ].sort((a, b) => b.annee - a.annee),
    [dire, direTous, langue],
  );

  return (
    <section
      className="archives"
      data-chapitre={t("chapitreArchives")}
      aria-labelledby="archives-titre"
    >
      <header className="archives__entete">
        <h1 className="archives__mot display-monument" id="archives-titre">
          {t("archivesMot")}
        </h1>

        {/* L'ombre en cascade : une copie du mot, cachée aux lecteurs d'écran,
            posée derrière le mot net et passée au filtre. */}
        <span className="archives__ombre display-monument" aria-hidden="true">
          {t("archivesMot")}
        </span>

        <p className="archives__compte technique">
          {lignes.length} {t("archivesCompteAvant")} {archives.length}{" "}
          {t("archivesCompteApres")}
        </p>
      </header>

      <FiltreOmbre />

      <ol className="archives__liste">
        {lignes.map((ligne) => (
          <li className="archives__ligne" key={`${ligne.nom}-${ligne.annee}`}>
            <LigneContenu ligne={ligne} />
          </li>
        ))}
      </ol>
    </section>
  );
}

function LigneContenu({ ligne }: { ligne: Ligne }) {
  const { t } = useLangue();
  const curseur = t("curseurVoir");
  const contenu = (
    <>
      <span className="archives__nom">{ligne.nom}</span>
      <span className="archives__lieu">{ligne.lieu}</span>
      <span className="archives__annee technique">{ligne.annee}</span>
      <span className="archives__mention technique" aria-hidden="true">
        {ligne.mention}
      </span>
    </>
  );

  if (ligne.href !== undefined) {
    return (
      <Link className="archives__entree" href={ligne.href} data-curseur={curseur}>
        {contenu}
      </Link>
    );
  }
  /* Une archive sans page : la ligne existe, elle ne mène nulle part. Le vide
     est un signe de richesse. */
  return <span className="archives__entree archives__entree--inerte">{contenu}</span>;
}

/**
 * Le filtre en cascade, transcrit de `beautiful-typography`. Chaque décalage
 * s'applique à toute la chaîne accumulée et double sa portée : sept fusions
 * portent l'ombre à 2 + 4 + … + 128 = 254 pixels. La teinte est le plomb — le
 * ciel de novembre —, l'ombre fuit vers le bas-droite dans l'encre.
 */
function FiltreOmbre() {
  return (
    <svg className="archives__def" aria-hidden="true" focusable="false">
      <defs>
        <filter
          id="archives-ombre"
          x="-50%"
          y="-50%"
          width="300%"
          height="300%"
          colorInterpolationFilters="sRGB"
        >
          {/* `flood-color` est posé en CSS (voir archives.css) : un attribut
              `var()` ne se résout pas côté SVG, une classe si. La couleur reste
              donc un jeton. */}
          <feFlood className="archives__flood" result="color" />
          <feComposite
            in="color"
            in2="SourceAlpha"
            operator="in"
            result="colored-text"
          />
          <feGaussianBlur in="colored-text" stdDeviation="0.2" result="b" />

          <feOffset in="b" dx="2" dy="2" result="s1" />
          <feMerge result="c1">
            <feMergeNode in="colored-text" />
            <feMergeNode in="s1" />
          </feMerge>

          <feOffset in="c1" dx="4" dy="4" result="s2" />
          <feMerge result="c2">
            <feMergeNode in="c1" />
            <feMergeNode in="s2" />
          </feMerge>

          <feOffset in="c2" dx="8" dy="8" result="s3" />
          <feMerge result="c3">
            <feMergeNode in="c2" />
            <feMergeNode in="s3" />
          </feMerge>

          <feOffset in="c3" dx="16" dy="16" result="s4" />
          <feMerge result="c4">
            <feMergeNode in="c3" />
            <feMergeNode in="s4" />
          </feMerge>

          <feOffset in="c4" dx="32" dy="32" result="s5" />
          <feMerge result="c5">
            <feMergeNode in="c4" />
            <feMergeNode in="s5" />
          </feMerge>

          <feOffset in="c5" dx="64" dy="64" result="s6" />
          <feMerge result="c6">
            <feMergeNode in="c5" />
            <feMergeNode in="s6" />
          </feMerge>

          <feOffset in="c6" dx="128" dy="128" result="s7" />
          <feMerge>
            <feMergeNode in="c6" />
            <feMergeNode in="s7" />
          </feMerge>
        </filter>
      </defs>
    </svg>
  );
}
