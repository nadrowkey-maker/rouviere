import { projets } from "@/data/projets";
import type { Cle } from "@/i18n/dictionnaire";

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
  /**
   * Le nom propre d'un projet, affiché tel quel — « Villa Calcaire » ne se
   * traduit dans aucune langue. Absent pour les passages du parcours.
   */
  label?: string;
  /**
   * La clé de dictionnaire d'un passage du parcours, que le menu résout à
   * l'affichage. Absente pour les projets.
   */
  cle?: Cle;
  /** La route **sans** segment de langue : le menu la préfixe à l affichage. */
  route: string;
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
  route: `/projets/${projet.slug}`,
  slug: projet.slug,
  detail: `${projet.lieu} · ${projet.coordonnees} · ${projet.annee}`,
}));

/**
 * Les trois passages du parcours.
 *
 * Deux d'entre eux visent une ancre de la page d'accueil, et l'on y arrive par
 * **deux chemins qu'il a fallu traiter séparément** : depuis le parcours, le
 * menu intercepte le clic et saute par le sas ; depuis une autre route, c'est
 * une vraie navigation, et c'est `LenisProvider` qui honore l'ancre une fois la
 * page montée. Où l'on atterrit exactement — l'élément visé, l'air au-dessus —
 * est décidé au même endroit pour les deux : voir `lib/ancres.ts`.
 */
export const entreesParcours: Entree[] = [
  { cle: "entreeAtelier", route: "/#atelier" },
  { cle: "entreeArchives", route: "/archives" },
  { cle: "entreeContact", route: "/#contact" },
];
