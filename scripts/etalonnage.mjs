/**
 * L'étalonnage. Un seul, pour tout le site.
 *
 * « Toutes les images du site doivent avoir l'air prises par le même
 * photographe le même jour » — Livre V. C'est ce fichier, et lui seul, qui
 * décide de quoi a l'air une image de Rouvière. Aucun autre script ne pose une
 * courbe : ils appellent `etalonner()` pour une image fixe et `FILTRE_FFMPEG`
 * pour une vidéo. Les deux expriment les **mêmes** chiffres, ceux du bloc
 * ci-dessous.
 *
 * Le traitement, dans l'ordre du Livre V :
 *
 * — **Désaturation légère (−12 %).** Une photographie d'architecture chère
 *   n'est jamais saturée : la couleur vient des matériaux, pas du fichier.
 * — **Points noirs relevés.** L'ombre n'est jamais à zéro. Un noir bouché est
 *   la signature du fichier téléversé sans regarder.
 * — **Virage froid des ombres vers le bleu-vert.** C'est la thèse du site :
 *   Paris est gris, le gris a un sous-ton bleu. On le pose dans les basses.
 * — **Hautes lumières laissées chaudes.** Le blanc du site ne bascule pas au
 *   bleu ; il reste un blanc de chaux, très légèrement crème dans les hauts —
 *   c'est le seul endroit du site où le chaud est autorisé, et il est de
 *   l'ordre de trois valeurs sur 255.
 *
 * Techniquement, les deux derniers points sont un seul geste : une droite par
 * canal, définie par son point noir et son point blanc. Le point noir est
 * bleu-vert (R le plus bas, B le plus haut), le point blanc est chaud (R à
 * fond, B rentré). Rien d'autre — pas de courbe en S, pas de vignette, pas de
 * grain : ce qui doit rester photographique ne se maquille pas.
 */

/** Désaturation, en facteur multiplicatif. −12 % du Livre V. */
export const SATURATION = 0.88;

/**
 * Le point noir, par canal, sur 255. Bleu-vert : le rouge est le plus bas.
 * C'est ce qui interdit à une ombre d'être neutre — et au site d'être crème.
 */
export const NOIR = { r: 8, g: 11, b: 15 };

/**
 * Le point blanc, par canal, sur 255. Chaud : le bleu est rentré de neuf
 * valeurs. Assez pour que la craie ne vire pas au bleu, trop peu pour qu'on
 * puisse appeler ça un filtre.
 */
export const BLANC = { r: 255, g: 252, b: 246 };

/** Largeur maximale servie. Au-delà, on ne gagne que du poids. */
export const LARGEUR_MAX = 1920;

/** Qualité AVIF. 58 tient sous les 45 ko/frame visés au Livre V. */
export const QUALITE_AVIF = 58;

/* La droite par canal : sortie = a·entrée + b, avec b le point noir et a la
   pente qui amène 255 sur le point blanc. Calculée une fois, ici, pour que les
   deux moteurs (sharp et ffmpeg) ne puissent pas diverger. */
const canaux = ["r", "g", "b"];
const PENTES = canaux.map((c) => (BLANC[c] - NOIR[c]) / 255);
const ORIGINES = canaux.map((c) => NOIR[c]);

/**
 * Pose l'étalonnage sur une image `sharp`. Retourne l'instance, chaînable.
 *
 *   etalonner(sharp(source)).avif({ quality: QUALITE_AVIF }).toFile(cible)
 */
export function etalonner(image) {
  return image
    .modulate({ saturation: SATURATION })
    .linear(PENTES, ORIGINES)
    .toColorspace("srgb");
}

/**
 * Le même étalonnage, pour ffmpeg. `eq` porte la désaturation, `curves` porte
 * les deux points par canal — exprimés en fraction, d'où la division par 255.
 * À concaténer avec les autres filtres de la chaîne, jamais à réécrire.
 */
const frac = (v) => (v / 255).toFixed(4);
export const FILTRE_FFMPEG = [
  `eq=saturation=${SATURATION}`,
  `curves=` +
    `r='0/${frac(NOIR.r)} 1/${frac(BLANC.r)}':` +
    `g='0/${frac(NOIR.g)} 1/${frac(BLANC.g)}':` +
    `b='0/${frac(NOIR.b)} 1/${frac(BLANC.b)}'`,
].join(",");

/**
 * La chaîne de filtres complète d'une vidéo : mise à l'échelle, puis
 * étalonnage. La hauteur est calculée en multiple de deux, contrainte de
 * H.264.
 */
export function filtreVideo(largeur = LARGEUR_MAX) {
  return `scale=${largeur}:-2,${FILTRE_FFMPEG}`;
}
