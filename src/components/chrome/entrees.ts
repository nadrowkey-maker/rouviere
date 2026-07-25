import { projets } from "@/data/projets";

/**
 * Les entrées du menu. Le menu n'est pas une liste de liens : c'est l'endroit
 * où « on voit où l'on va avant d'y aller ». Les cinq projets viennent en
 * premier, chacun portant son slug — c'est par lui qu'on retrouve la vidéo qui
 * apparaît au survol. Viennent ensuite les trois passages du parcours.
 *
 * Le monde chromatique a quitté cette liste : la teinte de projet qui se posait
 * en surimpression sur l'aperçu est retirée, elle fabriquait un artefact à
 * chaque changement d'entrée. Le fond montre la vidéo, sans retouche.
 */

export type Entree = {
  label: string;
  href: string;
  /** Le slug du projet, pour retrouver sa vidéo d'aperçu au survol. */
  slug?: string;
  /** Ligne de couche technique décrochée dans la marge. */
  detail?: string;
};

/**
 * Cibles provisoires : les routes `/projets/[slug]` et `/archives` sont montées
 * par les missions La Chambre et L'Atelier/Archives. Le menu les vise déjà —
 * c'est son contrat — et elles répondront quand elles existeront.
 */
export const entreesProjets: Entree[] = projets.map((projet) => ({
  label: projet.nom,
  href: `/projets/${projet.slug}`,
  slug: projet.slug,
  detail: `${projet.lieu} · ${projet.coordonnees} · ${projet.annee}`,
}));

export const entreesParcours: Entree[] = [
  { label: "L'Atelier", href: "/#atelier" },
  { label: "Les Archives", href: "/archives" },
  { label: "Contact", href: "/#contact" },
];
