import type { Texte } from "@/i18n/langues";

/**
 * Les archives : douze lignes de plus, sans images.
 * Le vide est un signe de richesse. On ne montre pas tout.
 *
 * `mention` n'apparaît qu'au survol, dans la marge, en couche technique.
 */

export type Archive = {
  /** Nom propre : il ne se traduit pas, dans aucune langue. */
  nom: string;
  /** Un lieu-dit non plus. Un atelier parisien écrit Saint-Cloud partout. */
  lieu: string;
  annee: number;
  /** Surface et nature de l'intervention. Couche technique, jamais du récit. */
  mention: Texte;
};

export const archives: Archive[] = [
  {
    nom: "Maison Verrière",
    lieu: "Saint-Cloud",
    annee: 2020,
    mention: {
      fr: "410 m² — surélévation, verrière d'atelier reconstituée",
      en: "410 m² — additional storey, studio glazing reinstated",
    },
  },
  {
    nom: "Appartement Furstemberg",
    lieu: "Paris VIᵉ",
    annee: 2019,
    mention: {
      fr: "220 m² — parquet Versailles déposé et reposé",
      en: "220 m² — Versailles parquet lifted and relaid",
    },
  },
  {
    nom: "Le Chai",
    lieu: "Saint-Émilion",
    annee: 2019,
    mention: {
      fr: "1 200 m² — chai de vieillissement, sol en terre battue stabilisée",
      en: "1,200 m² — ageing cellar, stabilised rammed-earth floor",
    },
  },
  {
    nom: "Villa Trémoulet",
    lieu: "Biarritz",
    annee: 2018,
    mention: {
      fr: "560 m² — façade océan reprise, menuiseries en iroko",
      en: "560 m² — ocean façade rebuilt, iroko joinery",
    },
  },
  {
    nom: "Duplex Bonaparte",
    lieu: "Paris VIᵉ",
    annee: 2018,
    mention: {
      fr: "290 m² — escalier hélicoïdal en chêne, marches sans contremarche",
      en: "290 m² — helical oak stair, open risers",
    },
  },
  {
    nom: "Ferme des Aulnes",
    lieu: "Montfort-l'Amaury",
    annee: 2017,
    mention: {
      fr: "470 m² — charpente consolidée, sols en tomettes de récupération",
      en: "470 m² — roof frame strengthened, reclaimed terracotta floors",
    },
  },
  {
    nom: "Appartement Marsollier",
    lieu: "Paris IIᵉ",
    annee: 2016,
    mention: {
      fr: "180 m² — cloisonnement complet, plâtre teinté dans la masse",
      en: "180 m² — fully replanned, plaster pigmented throughout",
    },
  },
  {
    nom: "Maison Blanche-de-Castille",
    lieu: "Chantilly",
    annee: 2016,
    mention: {
      fr: "630 m² — orangerie transformée en bibliothèque",
      en: "630 m² — orangery turned into a library",
    },
  },
  {
    nom: "Cabanon Piraillan",
    lieu: "Lège-Cap-Ferret",
    annee: 2015,
    mention: {
      fr: "84 m² — ostréicole, structure bois conservée intégralement",
      en: "84 m² — oyster hut, timber structure kept entire",
    },
  },
  {
    nom: "Hôtel Fieubet",
    lieu: "Paris IVᵉ",
    annee: 2014,
    mention: {
      fr: "720 m² — trois niveaux, stucs restaurés au calibre",
      en: "720 m² — three floors, plasterwork restored to profile",
    },
  },
  {
    nom: "Villa Sainte-Claire",
    lieu: "Hyères",
    annee: 2013,
    mention: {
      fr: "340 m² — béton brut décoffré nettoyé, aucune peinture",
      en: "340 m² — raw struck concrete cleaned, no paint",
    },
  },
  {
    nom: "Atelier Vaugirard",
    lieu: "Paris XVᵉ",
    annee: 2012,
    mention: {
      fr: "150 m² — premier chantier de l'atelier après la fondation",
      en: "150 m² — the studio's first project after it was founded",
    },
  },
];
