/**
 * Point d'entrée unique de GSAP.
 *
 * Aucun autre fichier n'importe « gsap/ScrollTrigger » ou « gsap/SplitText » directement : 
 * les plugins sont enregistrés ici, une seule fois, et le ticker est réglé ici.
 * `lagSmoothing(0)` est impératif — sans lui, GSAP ment sur le temps écoulé
 * après une frame lente et le défilement de Lenis décroche du rendu WebGL.
 */
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";

if (typeof window !== "undefined") {
  // On enregistre ScrollTrigger et SplitText pour toutes les plateformes (y compris iOS)
  gsap.registerPlugin(ScrollTrigger, SplitText);

  gsap.ticker.lagSmoothing(0);

  gsap.config({
    force3D: false,
  });
}

export { gsap, ScrollTrigger, SplitText };