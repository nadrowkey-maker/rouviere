/**
 * Les archives : douze lignes de plus, sans images.
 * Le vide est un signe de richesse. On ne montre pas tout.
 *
 * `mention` n'apparaît qu'au survol, dans la marge, en couche technique.
 */

export type Archive = {
  nom: string;
  lieu: string;
  annee: number;
  /** Surface et nature de l'intervention. Couche technique, jamais du récit. */
  mention: string;
};

export const archives: Archive[] = [
  {
    nom: "Maison Verrière",
    lieu: "Saint-Cloud",
    annee: 2020,
    mention: "410 m² — surélévation, verrière d'atelier reconstituée",
  },
  {
    nom: "Appartement Furstemberg",
    lieu: "Paris VIᵉ",
    annee: 2019,
    mention: "220 m² — parquet Versailles déposé et reposé",
  },
  {
    nom: "Le Chai",
    lieu: "Saint-Émilion",
    annee: 2019,
    mention: "1 200 m² — chai de vieillissement, sol en terre battue stabilisée",
  },
  {
    nom: "Villa Trémoulet",
    lieu: "Biarritz",
    annee: 2018,
    mention: "560 m² — façade océan reprise, menuiseries en iroko",
  },
  {
    nom: "Duplex Bonaparte",
    lieu: "Paris VIᵉ",
    annee: 2018,
    mention: "290 m² — escalier hélicoïdal en chêne, marches sans contremarche",
  },
  {
    nom: "Ferme des Aulnes",
    lieu: "Montfort-l'Amaury",
    annee: 2017,
    mention: "470 m² — charpente consolidée, sols en tomettes de récupération",
  },
  {
    nom: "Appartement Marsollier",
    lieu: "Paris IIᵉ",
    annee: 2016,
    mention: "180 m² — cloisonnement complet, plâtre teinté dans la masse",
  },
  {
    nom: "Maison Blanche-de-Castille",
    lieu: "Chantilly",
    annee: 2016,
    mention: "630 m² — orangerie transformée en bibliothèque",
  },
  {
    nom: "Cabanon Piraillan",
    lieu: "Lège-Cap-Ferret",
    annee: 2015,
    mention: "84 m² — ostréicole, structure bois conservée intégralement",
  },
  {
    nom: "Hôtel Fieubet",
    lieu: "Paris IVᵉ",
    annee: 2014,
    mention: "720 m² — trois niveaux, stucs restaurés au calibre",
  },
  {
    nom: "Villa Sainte-Claire",
    lieu: "Hyères",
    annee: 2013,
    mention: "340 m² — béton brut décoffré nettoyé, aucune peinture",
  },
  {
    nom: "Atelier Vaugirard",
    lieu: "Paris XVᵉ",
    annee: 2012,
    mention: "150 m² — premier chantier de l'atelier après la fondation",
  },
];
