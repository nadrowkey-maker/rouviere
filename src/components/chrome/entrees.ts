import { projets, type Monde } from "@/data/projets";

/**
 * Les entrées du menu. Le menu n'est pas une liste de liens : c'est l'endroit
 * où « on voit où l'on va avant d'y aller ». Les cinq projets viennent en
 * premier, chacun portant son monde chromatique — c'est lui qui envahit le
 * fond au survol. Viennent ensuite les trois passages du parcours, sans monde.
 */

export type Entree = {
  label: string;
  href: string;
  /** Le monde chromatique qui envahit le fond au survol, ou `null`. */
  monde: Monde | null;
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
  monde: projet.monde,
  detail: `${projet.lieu} · ${projet.coordonnees} · ${projet.annee}`,
}));

export const entreesParcours: Entree[] = [
  { label: "L'Atelier", href: "/#atelier", monde: null },
  { label: "Les Archives", href: "/archives", monde: null },
  { label: "Contact", href: "/#contact", monde: null },
];
