import type { Texte } from "./langues";

/**
 * Les libellés de l'interface.
 *
 * **Ce qui vit ici et ce qui n'y vit pas.** Ici : tout ce que le site dit de
 * lui-même — commandes, titres de chapitres, textes alternatifs de ses propres
 * médias, retours d'accessibilité. Pas ici : ce que l'atelier dit de ses
 * chantiers, qui vit dans `src/data` avec les données qu'il décrit. Un
 * programme de projet n'est pas un libellé.
 *
 * L'anglais suit la même règle éditoriale que le français (Livre I) : phrases
 * courtes, présent, aucune promesse, aucun superlatif. Ce n'est pas une
 * traduction mot à mot — « Entrer en silence » devient « Enter in silence » et
 * non « Enter silently », parce que c'est un état, pas une manière.
 */

export const INTERFACE = {
  /* ---- Écran d'entrée ---- */
  entreeTitre: {
    fr: "Architecture d'intérieur",
    en: "Interior architecture",
  },
  entreeAvecSon: { fr: "Entrer avec le son", en: "Enter with sound" },
  entreeSilence: { fr: "Entrer en silence", en: "Enter in silence" },
  entreeGroupe: { fr: "Entrer sur le site", en: "Enter the site" },
  entreeAttente: { fr: "Chargement", en: "Loading" },
  entreeLangue: { fr: "Choisir la langue", en: "Choose language" },

  /* ---- Chrome ---- */
  logoAccueil: { fr: "Rouvière — accueil", en: "Rouvière — home" },
  navPrincipale: { fr: "Navigation principale", en: "Main navigation" },
  menu: { fr: "Menu", en: "Menu" },
  menuOuvrir: { fr: "Ouvrir le menu", en: "Open menu" },
  menuFermer: { fr: "Fermer le menu", en: "Close menu" },
  menuPied: {
    fr: "14 rue de Beaune, Paris VII — Atelier fondé 2011",
    en: "14 rue de Beaune, Paris VII — Studio founded 2011",
  },
  son: { fr: "Son", en: "Sound" },
  sonActiver: { fr: "Activer le son", en: "Turn sound on" },
  sonCouper: { fr: "Couper le son", en: "Turn sound off" },
  /* Le son est voulu, le navigateur ne l'a pas encore autorisé : il faut un
     geste qui vaille activation. Le libellé le dit sans jargon — l'utilisateur
     n'a pas à connaître la politique d'autoplay, il a juste à cliquer. */
  sonEnAttente: {
    fr: "Son en attente — cliquer pour l’activer",
    en: "Sound pending — click to enable",
  },
  langueBascule: { fr: "Passer en anglais", en: "Switch to French" },

  /* ---- Curseur ---- */
  curseurVoir: { fr: "VOIR", en: "VIEW" },
  curseurEntrer: { fr: "ENTRER", en: "ENTER" },
  curseurEcrire: { fr: "ÉCRIRE", en: "WRITE" },

  /* ---- Noms des chapitres ---- */
  chapitreSeuil: { fr: "Le Seuil", en: "The Threshold" },
  chapitreVestibule: { fr: "Le Vestibule", en: "The Vestibule" },
  chapitreEnfilade: { fr: "L'Enfilade", en: "The Enfilade" },
  chapitreMatiere: { fr: "La Matière", en: "Material" },
  chapitreAtelier: { fr: "L'Atelier", en: "The Studio" },
  chapitreArchives: { fr: "Les Archives", en: "Archives" },
  chapitreSortie: { fr: "La Sortie", en: "The Way Out" },

  /* ---- Entrées du menu ---- */
  entreeAtelier: { fr: "L'Atelier", en: "The Studio" },
  entreeArchives: { fr: "Les Archives", en: "Archives" },
  entreeContact: { fr: "Contact", en: "Contact" },

  /* ---- Le Seuil ---- */
  seuilTitre: {
    fr: "Rouvière — atelier d'architecture d'intérieur",
    en: "Rouvière — interior architecture studio",
  },

  /* ---- Le Vestibule : le manifeste ---- */
  manifesteUn: { fr: "Je ne décore pas.", en: "I do not decorate." },
  manifesteDeux: { fr: "Je règle la", en: "I set the" },
  manifesteLumiere: { fr: "lumière", en: "light" },
  manifesteAutourAvant: {
    fr: "la matière et le ",
    en: "the material and the ",
  },
  manifesteSilence: { fr: "silence", en: "silence" },
  manifesteSept: {
    fr: "Le reste appartient aux gens qui vivent là.",
    en: "The rest belongs to the people who live there.",
  },
  manifesteEntier: {
    fr: "Je ne décore pas. Je règle la lumière, la matière et le silence. Le reste appartient aux gens qui vivent là. Camille Rouvière.",
    en: "I do not decorate. I set the light, the material and the silence. The rest belongs to the people who live there. Camille Rouvière.",
  },
  margeFondation: {
    fr: "Atelier fondé 2011 — Paris VII",
    en: "Studio founded 2011 — Paris VII",
  },
  margeChantiers: {
    fr: "Cinq chantiers par an",
    en: "Five projects a year",
  },
  signature: { fr: "Camille Rouvière", en: "Camille Rouvière" },
  bassinAlt: {
    fr: "Le bassin, vu à plat. La surface porte quelques ondes.",
    en: "The pool, seen flat. A few ripples cross the surface.",
  },
  planAllumeAlt: {
    fr: "Le séjour d'un appartement, lumières allumées, la ville derrière les baies.",
    en: "The living room of an apartment, lights on, the city behind the windows.",
  },

  /* ---- L'Enfilade ---- */
  enfiladeTitre: { fr: "Les projets", en: "Projects" },
  enfiladeCouloir: {
    fr: "Les cinq projets, en enfilade",
    en: "The five projects, in enfilade",
  },

  /* ---- La Matière ---- */
  matiereTitre: { fr: "La matière", en: "Material" },

  /* ---- La Chambre ---- */
  chambreProgramme: { fr: "Programme", en: "Brief" },
  chambreDefiler: { fr: "Défiler", en: "Scroll" },
  chambreLivraison: { fr: "livraison", en: "delivered" },

  /* ---- Les Archives ---- */
  archivesMot: { fr: "Archives", en: "Archives" },
  archivesCompteAvant: { fr: "chantiers depuis 2011 —", en: "projects since 2011 —" },
  archivesCompteApres: { fr: "sans images", en: "without images" },

  /* ---- La Sortie ---- */
  sortieCopie: { fr: "adresse copiée", en: "address copied" },
  sortieCopieAnnonce: {
    fr: "Adresse copiée dans le presse-papier.",
    en: "Address copied to the clipboard.",
  },
  sortieMention: {
    fr: "Atelier fondé 2011 — sur recommandation",
    en: "Studio founded 2011 — by referral",
  },
  sortiePlanAlt: {
    fr: "Une nuée basse passe sur une crête boisée. Gris de novembre, sans horizon net.",
    en: "Low cloud crossing a wooded ridge. November grey, no clear horizon.",
  },

  /* ---- Le colophon ----
   *
   * **La seule ligne du site qui ne soit pas de la voix de Rouvière.** Elle
   * n'est donc pas tenue par les règles du Livre I — notamment celle qui
   * interdit la deuxième personne : ici, quelqu'un d'autre parle, et il parle
   * au visiteur.
   *
   * Elle en garde le registre, parce que c'est le registre qui la rend
   * crédible : trois mots là où une phrase de démarchage en demanderait vingt.
   * « Pour le vôtre » dit exactement ce que dirait « si vous souhaitez discuter
   * de votre projet de site internet », et le dit mieux — parce que le site
   * qu'on vient de traverser est l'argument, et qu'une ligne qui vendrait fort
   * contredirait tout ce qu'il vient de démontrer.
   */
  colophonAuteur: {
    fr: "Site conçu et développé par Flavien Gaudé.",
    en: "Site designed and built by Flavien Gaudé.",
  },
  colophonInvite: { fr: "Pour le vôtre —", en: "For yours —" },
} as const satisfies Record<string, Texte>;

export type Cle = keyof typeof INTERFACE;
