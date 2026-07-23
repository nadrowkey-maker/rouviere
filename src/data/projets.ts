/**
 * Les cinq projets. Cinq à sept chantiers par an, jamais plus.
 * Chaque donnée de la couche technique est vraie dans la fiction :
 * les coordonnées, les surfaces et les dates de livraison sont cohérentes
 * entre elles et ne sont jamais approximatives.
 */

/** Les cinq mondes chromatiques. Un par projet. Jamais un accent. */
export type Monde = "sel" | "laque" | "ocre" | "vert-paris" | "outremer";

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
    slug: "villa-ostrea",
    nom: "Villa Ostréa",
    lieu: "Cap-Ferret",
    coordonnees: "44°38'N 1°14'W",
    annee: 2024,
    livraison: "Juin 2024",
    surface: 620,
    matieres: ["pin maritime brûlé", "béton de chaux", "lin brut"],
    monde: "sel",
    nomMonde: "Sel",
    programme:
      "Maison de famille sur la dune. Restructuration complète, extension basse côté bassin, bassin de nage de vingt-deux mètres.",
    fiche: [
      "La maison regardait la route. Elle regarde maintenant l'eau. Le mur porteur nord tombe, le plancher haut monte de quarante centimètres, la charpente reste apparente et non traitée.",
      "Le pin maritime est brûlé sur place, à la flamme, puis brossé et huilé. Il noircit au sel au lieu de griser. Les sols sont en béton de chaux, coulés en une seule journée, sans joint de fractionnement : la fissure viendra, elle est prévue.",
      "Le bassin de nage longe la façade sud sur vingt-deux mètres. Il n'y a pas de terrasse. On marche sur le sable, puis sur la pierre, puis on est dedans.",
    ],
    photographe: PHOTOGRAPHE,
  },
  {
    slug: "hotel-sevigne",
    nom: "Hôtel Sévigné",
    lieu: "Paris IVᵉ",
    coordonnees: "48°51'N 2°21'E",
    annee: 2023,
    livraison: "Novembre 2023",
    surface: 840,
    matieres: ["boiseries XVIIIᵉ", "laque", "laiton bruni"],
    monde: "laque",
    nomMonde: "Laque",
    programme:
      "Hôtel particulier du XVIIIᵉ. Restauration des boiseries d'origine, création d'un niveau de réception au premier étage.",
    fiche: [
      "Quatre-vingt-dix mètres carrés de boiseries d'origine dormaient sous onze couches de peinture. Elles ont été décapées à la main pendant sept mois.",
      "Ce qui manquait n'a pas été imité. Les parties refaites sont en laque rouge, pleine, sans moulure, et la couture reste visible. Le grand salon reçoit soixante personnes debout.",
      "Les tringles, les crémones et les garde-corps sont en laiton bruni, posés sans vernis : ils foncent avec les mains. L'escalier de service est conservé tel quel, marches creusées comprises.",
    ],
    photographe: PHOTOGRAPHE,
  },
  {
    slug: "maison-cypres",
    nom: "Maison Cyprès",
    lieu: "Cap d'Antibes",
    coordonnees: "43°33'N 7°07'E",
    annee: 2022,
    livraison: "Avril 2022",
    surface: 480,
    matieres: ["travertin", "chaux ferrée", "noyer fumé"],
    monde: "ocre",
    nomMonde: "Ocre",
    programme:
      "Villa de 1963 redécoupée trois fois. Dépose des cloisons ajoutées, ouverture du pignon ouest, cuisine d'été extérieure.",
    fiche: [
      "Les cloisons ajoutées tombent, les proportions d'origine reviennent. Rien n'est ajouté au volume : on retire jusqu'à ce que le plan de 1963 réapparaisse.",
      "Le travertin des sols est posé en dalles de quatre-vingts centimètres, à joint vif, sans plinthe. Le mur descend dans le sol. Les murs sont en chaux ferrée, lissée à la truelle chaude jusqu'à ce qu'elle réfléchisse la lumière. Le noyer fumé sert aux menuiseries et à rien d'autre.",
      "À l'ouest, le pignon est ouvert sur trois mètres cinquante. À dix-neuf heures en août, la lumière traverse toute la maison.",
    ],
    photographe: PHOTOGRAPHE,
  },
  {
    slug: "appartement-cinq-heures",
    nom: "Appartement Cinq Heures",
    lieu: "Paris VIIᵉ",
    coordonnees: "48°51'N 2°19'E",
    annee: 2025,
    livraison: "Février 2025",
    surface: 310,
    matieres: ["plâtre lissé", "chêne cérusé", "albâtre"],
    monde: "vert-paris",
    nomMonde: "Vert Paris",
    programme:
      "Dernier étage sur cour. Remise à nu, redistribution complète, éclairage entièrement indirect.",
    fiche: [
      "Tout a été déposé, y compris les corniches, qui étaient fausses. Les murs sont en plâtre lissé au couteau, sans peinture : la matière est la finition.",
      "Le chêne cérusé court en lambris bas sur cent dix centimètres, hauteur d'appui. Deux plaques d'albâtre de six millimètres ferment les luminaires du couloir ; la lumière y devient jaune vers dix-sept heures, et l'appartement tient son nom de cette heure-là.",
      "Aucune source lumineuse n'est visible depuis les pièces de réception. Il n'y a pas d'interrupteur dans le salon.",
    ],
    photographe: PHOTOGRAPHE,
  },
  {
    slug: "la-bergerie",
    nom: "La Bergerie",
    lieu: "Ménerbes, Luberon",
    coordonnees: "43°49'N 5°12'E",
    annee: 2021,
    livraison: "Septembre 2021",
    surface: 390,
    matieres: ["pierre sèche", "tadelakt", "olivier"],
    monde: "outremer",
    nomMonde: "Outremer",
    programme:
      "Bergerie du XIXᵉ sans eau ni électricité, remise agricole depuis quarante ans. Consolidation, trois chambres, adduction d'eau.",
    fiche: [
      "Les murs en pierre sèche sont repris à l'identique par un murailler de Gordes, sans mortier. La toiture n'est pas touchée : les trois chambres sont creusées dans le volume existant.",
      "Les salles d'eau sont en tadelakt outremer, poli à la pierre d'agate puis savonné. La couleur vient du pigment, pas d'une peinture, et elle change avec l'humidité.",
      "L'olivier de la cour a deux cent quarante ans. Il est resté où il est ; la maison s'est écartée pour lui.",
    ],
    photographe: PHOTOGRAPHE,
  },
];

export const projetParSlug = (slug: string): Projet | undefined =>
  projets.find((projet) => projet.slug === slug);
