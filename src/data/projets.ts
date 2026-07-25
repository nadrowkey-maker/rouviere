import type { Texte, Textes } from "@/i18n/langues";

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

/**
 * **Ce qui se traduit, et ce qui ne se traduit pas.**
 *
 * Les noms propres restent : « Villa Calcaire » ne devient pas « Limestone
 * Villa », pas plus que Chanel ne devient Channel. Les lieux non plus — un
 * atelier parisien écrit « Cap d'Antibes » dans les deux langues, et
 * « Paris XVIᵉ » est une adresse, pas une phrase.
 *
 * Se traduit tout ce qui est **dit** : le programme, la fiche, les matières, le
 * mois de livraison, le nom du monde chromatique. Le type l'impose — un `Texte`
 * exige ses deux versions, et la compilation refuse la traduction oubliée.
 */
export type Projet = {
  slug: string;
  nom: string;
  lieu: string;
  /** Couche technique, format sexagésimal abrégé. */
  coordonnees: string;
  annee: number;
  /** Mois et année de livraison, pour la couche technique. */
  livraison: Texte;
  /** En mètres carrés. */
  surface: number;
  /** Nommées par leur vrai nom. Trois au plus. */
  matieres: Textes;
  monde: Monde;
  /** Le monde en toutes lettres, tel qu'il se nomme dans le site. */
  nomMonde: Texte;
  /** Ce qu'on a demandé à l'atelier. Deux phrases au plus. */
  programme: Texte;
  /** Le texte de la fiche. Descriptif, technique, sec. */
  fiche: Textes;
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
    livraison: { fr: "Juin 2024", en: "June 2024" },
    surface: 96,
    matieres: {
      fr: ["noyer fumé", "laiton bruni", "onyx"],
      en: ["smoked walnut", "burnished brass", "onyx"],
    },
    monde: "ambre",
    nomMonde: { fr: "Ambre", en: "Amber" },
    programme: {
      fr: "Pied-à-terre au dernier étage d'un immeuble de verre. Redistribution en une seule enfilade, dressing et salle d'eau taillés dans la masse.",
      en: "A pied-à-terre on the top floor of a glass building. Replanned as a single enfilade, dressing room and bathroom cut from the solid.",
    },
    fiche: {
      fr: [
        "L'appartement tient dans une longueur. On a supprimé les cloisons de refend et gardé un seul geste : une enfilade qui va de l'entrée à la baie, sans porte, sans couloir perdu.",
        "Le noyer fumé habille le dressing d'un seul tenant — portes vitrées, tablettes, un panneau ondé sculpté dans la masse. Le laiton bruni tient les cadres et les tringles ; il n'est pas verni, il fonce avec les mains.",
        "La salle d'eau est en onyx, scié en tranches de six millimètres et appairé. Un bandeau rétroéclairé passe derrière la pierre : le mur devient lampe à la tombée du jour.",
      ],
      en: [
        "The apartment is one long room. The dividing walls came out and a single move remained: an enfilade running from the entrance to the window, no doors, no wasted corridor.",
        "Smoked walnut lines the dressing room in one piece — glazed doors, shelves, a fluted panel carved from the solid. Burnished brass holds the frames and the rails; it is unlacquered, and darkens under the hand.",
        "The bathroom is onyx, sawn into six-millimetre slices and book-matched. A backlit band runs behind the stone: at dusk the wall becomes a lamp.",
      ],
    },
    photographe: PHOTOGRAPHE,
  },
  {
    slug: "grand-hotel-des-bains",
    nom: "Grand Hôtel des Bains",
    lieu: "Hyères, Var",
    coordonnees: "43°07'N 6°08'E",
    annee: 2023,
    livraison: { fr: "Mai 2023", en: "May 2023" },
    surface: 2400,
    matieres: {
      fr: ["chêne ciré", "laque bleu paon", "laiton poli"],
      en: ["waxed oak", "peacock blue lacquer", "polished brass"],
    },
    monde: "paon",
    nomMonde: { fr: "Paon", en: "Peacock" },
    programme: {
      fr: "Restauration d'un grand hôtel balnéaire de 1912. Reprise du hall d'honneur, des salons et de l'aile des chambres ; patio planté et bassin côté mer.",
      en: "Restoration of a 1912 seaside hotel. The main hall, the salons and the bedroom wing; a planted courtyard and a pool on the sea side.",
    },
    fiche: {
      fr: [
        "Le hall avait perdu sa hauteur sous un faux plafond des années soixante-dix. On l'a rouvert : caissons de chêne, laque bleu paon dans les fonds, la proportion d'origine revient d'un coup.",
        "Les salons gardent leurs boiseries et leurs lustres de cristal. Rien n'est redoré à neuf ; le laiton est poli puis laissé tel quel, les marbres sont recalés sur l'ancien plan.",
        "Côté mer, l'aile basse s'ouvre sur un patio planté et un bassin. La nuit, la façade se règle en lumière chaude et l'eau tient le seul froid de l'ensemble.",
      ],
      en: [
        "The hall had lost its height under a false ceiling from the seventies. We opened it again: oak coffers, peacock blue lacquer in the recesses, and the original proportion comes back at once.",
        "The salons keep their panelling and their crystal chandeliers. Nothing is regilded; the brass is polished and then left alone, the marbles reset on the old layout.",
        "On the sea side, the low wing opens onto a planted courtyard and a pool. At night the façade is set to warm light, and the water holds the only cold in the place.",
      ],
    },
    photographe: PHOTOGRAPHE,
  },
  {
    slug: "domaine-des-charmilles",
    nom: "Domaine des Charmilles",
    lieu: "Médoc, Gironde",
    coordonnees: "45°12'N 0°45'W",
    annee: 2025,
    livraison: { fr: "Mars 2025", en: "March 2025" },
    surface: 540,
    matieres: {
      fr: ["chaux blanche", "chêne peint", "pierre de Bourgogne"],
      en: ["white lime plaster", "painted oak", "Burgundy stone"],
    },
    monde: "prairie",
    nomMonde: { fr: "Prairie", en: "Meadow" },
    programme: {
      fr: "Maison de maître à pignons, au bout d'un parc clos de charmilles. Remise à blanc des intérieurs, cuisine de famille, terrasse et bassin dans le jardin muré.",
      en: "A gabled manor house at the end of a park enclosed by hornbeam. Interiors brought back to white, a family kitchen, a terrace and a pool in the walled garden.",
    },
    fiche: {
      fr: [
        "La maison est basse et longue, blanche sous ses pignons. On a tout ramené au blanc de chaux à l'intérieur pour que le parc entre par les fenêtres : c'est le vert qui fait la couleur, pas les murs.",
        "La cuisine est en chêne peint gris, plans de pierre claire, sans îlot inutile. Elle donne de plain-pied sur la charmille taillée qui ceint le jardin.",
        "La salle de bains est blanche, robinetterie de laiton, une baignoire posée sous la fenêtre. Au fond du parc, le bassin est bordé de pierre de Bourgogne ; l'été, il disparaît sous les vivaces.",
      ],
      en: [
        "The house is low and long, white beneath its gables. Inside, everything came back to lime white so the park could come in through the windows: the colour is the green, not the walls.",
        "The kitchen is grey painted oak, pale stone worktops, no island for the sake of one. It opens level onto the clipped hornbeam that rings the garden.",
        "The bathroom is white, brass fittings, a tub set under the window. At the far end of the park the pool is edged in Burgundy stone; in summer it disappears under the perennials.",
      ],
    },
    photographe: PHOTOGRAPHE,
  },
  {
    slug: "villa-calcaire",
    nom: "Villa Calcaire",
    lieu: "Cap d'Antibes",
    coordonnees: "43°33'N 7°07'E",
    annee: 2022,
    livraison: { fr: "Septembre 2022", en: "September 2022" },
    surface: 720,
    matieres: {
      fr: ["marbre de Calacatta", "plâtre lissé", "acier noirci"],
      en: ["Calacatta marble", "polished plaster", "blackened steel"],
    },
    monde: "jade",
    nomMonde: { fr: "Jade", en: "Jade" },
    programme: {
      fr: "Villa des années 2000 reprise à blanc. Séjour traversant ouvert sur le parc, cuisine ouverte, bassin le long de la façade.",
      en: "A villa from the 2000s taken back to white. A through living room open to the park, an open kitchen, a pool along the façade.",
    },
    fiche: {
      fr: [
        "La villa était grise de partout. On l'a passée au blanc — plâtre lissé, marbre veiné, verre — pour ne garder qu'un contraste : le noir des menuiseries d'acier et l'eau du bassin.",
        "Le séjour est traversant. Voilages du sol au plafond d'un côté, parc de l'autre ; à midi la lumière rebondit sur le marbre de Calacatta et le sol renvoie le jardin.",
        "La cuisine ouvre sur la salle à manger par un pan de noyer sombre. Le reste est blanc, laqué, sans poignée. Dehors, le bassin longe la façade et tient la seule couleur franche de la maison.",
      ],
      en: [
        "The villa was grey throughout. We took it to white — polished plaster, veined marble, glass — to keep a single contrast: the black of the steel frames and the water of the pool.",
        "The living room runs through the house. Floor-to-ceiling sheers on one side, the park on the other; at noon the light comes off the Calacatta and the floor gives the garden back.",
        "The kitchen opens to the dining room through a panel of dark walnut. The rest is white, lacquered, without handles. Outside, the pool runs the length of the façade and holds the only plain colour in the house.",
      ],
    },
    photographe: PHOTOGRAPHE,
  },
  {
    slug: "villa-basalte",
    nom: "Villa Basalte",
    lieu: "Lanzarote, Canaries",
    coordonnees: "29°03'N 13°34'W",
    annee: 2021,
    livraison: { fr: "Octobre 2021", en: "October 2021" },
    surface: 410,
    matieres: {
      fr: ["teck massif", "pierre de lave", "enduit à la chaux"],
      en: ["solid teak", "lava stone", "lime render"],
    },
    monde: "nuit",
    nomMonde: { fr: "Nuit", en: "Night" },
    programme: {
      fr: "Villa neuve sur un champ de lave. Un socle de pierre sèche, une dalle de teck, un grand toit plat qui porte l'ombre ; piscine à ras du sol, face au couchant.",
      en: "A new villa on a lava field. A dry-stone base, a teak deck, a wide flat roof that carries the shade; a pool flush with the ground, facing the sunset.",
    },
    fiche: {
      fr: [
        "Le terrain est noir, la maison est blanche. Elle pose ses volumes d'enduit sur un socle de pierre de lave montée à sec, et laisse le jardin de gravier volcanique et de palmiers venir jusqu'au seuil.",
        "Dedans, tout est teck : le plafond du séjour à double hauteur, le sol, les persiennes qui filtrent le plein soleil. Le béton reste brut, la lumière fait le reste.",
        "La salle d'eau est sombre — panneaux noirs, mur de bois, un miroir rond. Dehors, la piscine affleure la terrasse ; à l'heure bleue, l'eau, le ciel et la lave passent au même outremer.",
      ],
      en: [
        "The ground is black, the house is white. Its rendered volumes sit on a base of dry-laid lava stone, and the garden of volcanic gravel and palms is allowed to come right up to the threshold.",
        "Inside, everything is teak: the ceiling of the double-height living room, the floor, the louvres that filter the full sun. The concrete stays raw, the light does the rest.",
        "The bathroom is dark — black panels, a timber wall, a round mirror. Outside, the pool sits flush with the terrace; at blue hour the water, the sky and the lava all turn the same ultramarine.",
      ],
    },
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
