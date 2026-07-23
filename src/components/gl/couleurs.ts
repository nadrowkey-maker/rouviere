import * as THREE from "three";
import { lireCouleur, type NomCouleur } from "@/lib/jetons";

/**
 * Un jeton de couleur, prêt pour un shader, et identique au pixel près à la
 * même couleur posée en CSS.
 *
 * Le détail qui compte : un `ShaderMaterial` écrit ses valeurs telles quelles
 * dans le tampon, sans la conversion d'espace colorimétrique que Three
 * applique à ses matériaux natifs. Si on laissait `setStyle` traiter le jeton
 * comme du sRGB, il le convertirait en linéaire et le fond WebGL sortirait
 * plus sombre que l'aplat CSS voisin. On déclare donc la valeur comme déjà
 * linéaire : elle traverse la chaîne sans être touchée.
 *
 * Une scène qui utilise des matériaux natifs de Three — `MeshPhysicalMaterial`
 * du chapitre de la sortie, par exemple — doit au contraire passer par le sRGB.
 */
export function couleurJeton(nom: NomCouleur): THREE.Color {
  return new THREE.Color().setStyle(
    lireCouleur(nom),
    THREE.LinearSRGBColorSpace,
  );
}
