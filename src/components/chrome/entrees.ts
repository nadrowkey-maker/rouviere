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
  /**
   * L'élément à viser, quand le haut de la section ancrée n'est pas le bon
   * repère. Le sélecteur est résolu au moment du clic, dans le document réel.
   */
  cible?: string;
  /**
   * Décalage appliqué à l'arrivée, en fraction de hauteur de fenêtre. Négatif
   * pour laisser de l'air au-dessus de la cible ; positif pour descendre.
   */
  decalage?: number;
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
 * Deux d'entre eux visent une ancre de la page d'accueil, et **ce n'est pas le
 * navigateur qui les emmène** : le menu intercepte le clic et passe par le sas
 * (voir `Menu.rendreEntree`). Laissé à Next, un lien vers `/fr/#atelier` depuis
 * `/fr` est une navigation vers la même route — et une navigation remonte en
 * haut. C'est ce qui envoyait le contact sur le hero.
 */
export const entreesParcours: Entree[] = [
  {
    cle: "entreeAtelier",
    route: "/#atelier",
    /**
     * **On vise l'en-tête, pas la section.** La section ouvre sur une réserve
     * haute qui peut atteindre douze rem : arriver sur son bord posait le
     * chapitre bien au-dessous de la ligne de flottaison, et ce qu'on voyait en
     * haut de l'écran était la fin du chapitre précédent. On vise donc le
     * premier élément qui porte quelque chose.
     */
    cible: "#atelier .atelier__entete",
    /** Un dixième d'écran d'air au-dessus du titre : il se pose, il ne se colle pas. */
    decalage: -0.1,
  },
  { cle: "entreeArchives", route: "/archives" },
  /* La sortie tient un plein cadre : son bord haut est le bon repère, et c'est
     le chapitre entier qu'on veut, pas le pied de page — il n'y en a pas. */
  { cle: "entreeContact", route: "/#contact" },
];
