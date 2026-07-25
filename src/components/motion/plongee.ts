/**
 * La plongée : entrer dans une image par sa fenêtre.
 *
 * Il y a deux façons de faire grandir une photographie jusqu'au plein écran, et
 * elles ne racontent pas la même chose.
 *
 * La première met le cadre entier à l'échelle et le ramène au centre. Le sujet
 * grossit, oui — mais le cadre aussi, en gardant ses proportions, et il se
 * déplace vers nous. On lit **un objet qui vient**. C'est le geste d'une carte
 * qu'on approche de l'œil.
 *
 * La seconde tient le cadre plein écran et **ouvre une fenêtre dedans** : au
 * départ la fenêtre a exactement la boîte de l'image dans la page, puis chacun
 * de ses quatre bords part rejoindre le bord d'écran qui lui fait face, pendant
 * que le contenu de l'image se magnifie d'autant. On lit **une caméra qui
 * plonge**. C'est ce qu'on veut, et c'est ce que ce module calcule.
 *
 * Deux quantités suffisent, et toutes deux se mesurent une fois par
 * rafraîchissement :
 *
 *   — `fenetre()` donne le `clip-path` de départ, c'est-à-dire les quatre
 *     retraits qui découpent la boîte de l'image dans le cadre plein ;
 *   — `cadrage()` donne la transformation de départ de l'image, celle qui fait
 *     que le morceau visible dans la fenêtre est **exactement** celui qu'on
 *     voyait avant la plongée. Sans elle, une image en `object-fit: cover`
 *     dimensionnée pour le plein cadre montrerait à travers une petite fenêtre
 *     un cadrage bien plus serré que l'original, et la plongée commencerait par
 *     un saut.
 *
 * Les deux animées ensemble, de leur valeur de départ à l'identité, donnent la
 * plongée. Rien d'autre n'est nécessaire : ni masque SVG, ni seconde image, ni
 * changement de mise en page.
 */

/** Une boîte, en pixels, dans le repère du cadre. */
export type Boite = {
  gauche: number;
  haut: number;
  largeur: number;
  hauteur: number;
};

/** Le cadre plein — le viewport, en pratique. */
export type Cadre = { largeur: number; hauteur: number };

/** L'état d'arrivée : la fenêtre a rejoint les quatre bords. */
export const PLEIN = "inset(0px 0px 0px 0px)";

/**
 * Le `clip-path` de départ : la boîte découpée dans le cadre plein.
 *
 * Les retraits sont bornés à zéro. Une boîte qui déborde déjà d'un bord — cela
 * arrive à la dernière pièce de l'enfilade sur un écran étroit — donne un
 * retrait négatif, que `inset()` refuserait.
 */
export function fenetre(boite: Boite, cadre: Cadre): string {
  const haut = Math.max(0, boite.haut);
  const gauche = Math.max(0, boite.gauche);
  const droite = Math.max(0, cadre.largeur - (boite.gauche + boite.largeur));
  const bas = Math.max(0, cadre.hauteur - (boite.haut + boite.hauteur));
  return `inset(${haut}px ${droite}px ${bas}px ${gauche}px)`;
}

/**
 * Le cadrage de départ d'une image en `object-fit: cover` sur le cadre plein,
 * pour qu'elle montre dans la fenêtre le même morceau que la boîte d'origine.
 *
 * `cover` rend l'image à la plus petite échelle qui remplit la boîte : sa
 * largeur rendue vaut `max(largeur, hauteur × aspect)`. Le rapport des deux
 * largeurs rendues — celle de la boîte, celle du cadre — est donc exactement
 * l'échelle qu'il faut appliquer. La translation, elle, ramène le centre du
 * cadre sur le centre de la boîte.
 *
 * `aspect` est le rapport largeur/hauteur du fichier, pas celui de la boîte.
 */
export function cadrage(
  boite: Boite,
  cadre: Cadre,
  aspect: number,
): { x: number; y: number; echelle: number } {
  const renduBoite = Math.max(boite.largeur, boite.hauteur * aspect);
  const renduCadre = Math.max(cadre.largeur, cadre.hauteur * aspect);
  return {
    echelle: renduCadre === 0 ? 1 : renduBoite / renduCadre,
    x: boite.gauche + boite.largeur / 2 - cadre.largeur / 2,
    y: boite.haut + boite.hauteur / 2 - cadre.hauteur / 2,
  };
}
