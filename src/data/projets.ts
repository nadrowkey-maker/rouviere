/**
 * Les cinq projets. Cinq à sept chantiers par an, jamais plus.
 * Chaque donnée de la couche technique est vraie dans la fiction :
 * les coordonnées, les surfaces et les dates de livraison sont cohérentes
 * entre elles et ne sont jamais approximatives.
 */

/** Les cinq mondes chromatiques. Un par projet. Jamais un accent.
 *  Chaque teinte est extraite de la dominante réelle des médias du projet —
 *  voir `tokens.css`. */
export type Monde = "ambre" | "paon" | "prairie" | "jade" | "nuit";

export type Projet = {
  slug: string;
  nom: string;
  lieu: string;
  /** Couche technique, format sexagésimal abrégé. */
  coordonnees: string;
  annee: number;
  /** Mois et année de livraison, pour la couche technique. */
  livraison: string;
  /** En mètres carrés. */
  surface: number;
  /** Nommées par leur vrai nom. Trois au plus. */
  matieres: string[];
  monde: Monde;
  /** Le monde en toutes lettres, tel qu'il se nomme dans le site. */
  nomMonde: string;
  /** Ce qu'on a demandé à l'atelier. Deux phrases au plus. */
  programme: string;
  /** Le texte de la fiche. Descriptif, technique, sec. */
  fiche: string[];
  photographe: string;
};

export const PHOTOGRAPHE = "Mathis Delaunay";

export const projets: Projet[] = [
  {
    slug: "appartement-laiton",
    nom: "Appartement Laiton",
    lieu: "Paris XVIᵉ",
    coordonnees: "48°51'N 2°16'E",
    annee: 2024,
    livraison: "Juin 2024",
    surface: 96,
    matieres: ["noyer fumé", "laiton bruni", "onyx"],
    monde: "ambre",
    nomMonde: "Ambre",
    programme:
      "Pied-à-terre au dernier étage d'un immeuble de verre. Redistribution en une seule enfilade, dressing et salle d'eau taillés dans la masse.",
    fiche: [
      "L'appartement tient dans une longueur. On a supprimé les cloisons de refend et gardé un seul geste : une enfilade qui va de l'entrée à la baie, sans porte, sans couloir perdu.",
      "Le noyer fumé habille le dressing d'un seul tenant — portes vitrées, tablettes, un panneau ondé sculpté dans la masse. Le laiton bruni tient les cadres et les tringles ; il n'est pas verni, il fonce avec les mains.",
      "La salle d'eau est en onyx, scié en tranches de six millimètres et appairé. Un bandeau rétroéclairé passe derrière la pierre : le mur devient lampe à la tombée du jour.",
    ],
    photographe: PHOTOGRAPHE,
  },
  {
    slug: "grand-hotel-des-bains",
    nom: "Grand Hôtel des Bains",
    lieu: "Hyères, Var",
    coordonnees: "43°07'N 6°08'E",
    annee: 2023,
    livraison: "Mai 2023",
    surface: 2400,
    matieres: ["chêne ciré", "laque bleu paon", "laiton poli"],
    monde: "paon",
    nomMonde: "Paon",
    programme:
      "Restauration d'un grand hôtel balnéaire de 1912. Reprise du hall d'honneur, des salons et de l'aile des chambres ; patio planté et bassin côté mer.",
    fiche: [
      "Le hall avait perdu sa hauteur sous un faux plafond des années soixante-dix. On l'a rouvert : caissons de chêne, laque bleu paon dans les fonds, la proportion d'origine revient d'un coup.",
      "Les salons gardent leurs boiseries et leurs lustres de cristal. Rien n'est redoré à neuf ; le laiton est poli puis laissé tel quel, les marbres sont recalés sur l'ancien plan.",
      "Côté mer, l'aile basse s'ouvre sur un patio planté et un bassin. La nuit, la façade se règle en lumière chaude et l'eau tient le seul froid de l'ensemble.",
    ],
    photographe: PHOTOGRAPHE,
  },
  {
    slug: "domaine-des-charmilles",
    nom: "Domaine des Charmilles",
    lieu: "Médoc, Gironde",
    coordonnees: "45°12'N 0°45'W",
    annee: 2025,
    livraison: "Mars 2025",
    surface: 540,
    matieres: ["chaux blanche", "chêne peint", "pierre de Bourgogne"],
    monde: "prairie",
    nomMonde: "Prairie",
    programme:
      "Maison de maître à pignons, au bout d'un parc clos de charmilles. Remise à blanc des intérieurs, cuisine de famille, terrasse et bassin dans le jardin muré.",
    fiche: [
      "La maison est basse et longue, blanche sous ses pignons. On a tout ramené au blanc de chaux à l'intérieur pour que le parc entre par les fenêtres : c'est le vert qui fait la couleur, pas les murs.",
      "La cuisine est en chêne peint gris, plans de pierre claire, sans îlot inutile. Elle donne de plain-pied sur la charmille taillée qui ceint le jardin.",
      "La salle de bains est blanche, robinetterie de laiton, une baignoire posée sous la fenêtre. Au fond du parc, le bassin est bordé de pierre de Bourgogne ; l'été, il disparaît sous les vivaces.",
    ],
    photographe: PHOTOGRAPHE,
  },
  {
    slug: "villa-calcaire",
    nom: "Villa Calcaire",
    lieu: "Cap d'Antibes",
    coordonnees: "43°33'N 7°07'E",
    annee: 2022,
    livraison: "Septembre 2022",
    surface: 720,
    matieres: ["marbre de Calacatta", "plâtre lissé", "acier noirci"],
    monde: "jade",
    nomMonde: "Jade",
    programme:
      "Villa des années 2000 reprise à blanc. Séjour traversant ouvert sur le parc, cuisine ouverte, bassin le long de la façade.",
    fiche: [
      "La villa était grise de partout. On l'a passée au blanc — plâtre lissé, marbre veiné, verre — pour ne garder qu'un contraste : le noir des menuiseries d'acier et l'eau du bassin.",
      "Le séjour est traversant. Voilages du sol au plafond d'un côté, parc de l'autre ; à midi la lumière rebondit sur le marbre de Calacatta et le sol renvoie le jardin.",
      "La cuisine ouvre sur la salle à manger par un pan de noyer sombre. Le reste est blanc, laqué, sans poignée. Dehors, le bassin longe la façade et tient la seule couleur franche de la maison.",
    ],
    photographe: PHOTOGRAPHE,
  },
  {
    slug: "villa-basalte",
    nom: "Villa Basalte",
    lieu: "Lanzarote, Canaries",
    coordonnees: "29°03'N 13°34'W",
    annee: 2021,
    livraison: "Octobre 2021",
    surface: 410,
    matieres: ["teck massif", "pierre de lave", "enduit à la chaux"],
    monde: "nuit",
    nomMonde: "Nuit",
    programme:
      "Villa neuve sur un champ de lave. Un socle de pierre sèche, une dalle de teck, un grand toit plat qui porte l'ombre ; piscine à ras du sol, face au couchant.",
    fiche: [
      "Le terrain est noir, la maison est blanche. Elle pose ses volumes d'enduit sur un socle de pierre de lave montée à sec, et laisse le jardin de gravier volcanique et de palmiers venir jusqu'au seuil.",
      "Dedans, tout est teck : le plafond du séjour à double hauteur, le sol, les persiennes qui filtrent le plein soleil. Le béton reste brut, la lumière fait le reste.",
      "La salle d'eau est sombre — panneaux noirs, mur de bois, un miroir rond. Dehors, la piscine affleure la terrasse ; à l'heure bleue, l'eau, le ciel et la lave passent au même outremer.",
    ],
    photographe: PHOTOGRAPHE,
  },
];

export const projetParSlug = (slug: string): Projet | undefined =>
  projets.find((projet) => projet.slug === slug);

/**
 * Le rang d'un projet, de 1 à 5. C'est le numéro que portent ses fichiers —
 * `media/projets/projet-3`, `audio/projets/projet-3.mp3` — et il vient de
 * l'ordre de la liste ci-dessus, pas d'un champ à tenir à jour en double.
 * Retourne 0 si le slug n'existe pas.
 */
export const rangDe = (slug: string): number =>
  projets.findIndex((projet) => projet.slug === slug) + 1;
