/**
 * Point d'entrée unique de GSAP.
 *
 * Aucun autre fichier n'importe « gsap/ScrollTrigger » directement : les
 * plugins sont enregistrés ici, une seule fois, et le ticker est réglé ici.
 * `lagSmoothing(0)` est impératif — sans lui, GSAP ment sur le temps écoulé
 * après une frame lente et le défilement de Lenis décroche du rendu WebGL.
 */
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";

/**
 * Seul ScrollTrigger est enregistré ici : il est utilisé par le rig lui-même,
 * donc présent sur toutes les routes. Flip et SplitText rejoindront ce fichier
 * quand un chapitre en aura vraiment besoin — le seuil, lui, déplace son
 * logotype par une transformation pure (voir Seuil.tsx), sans plugin.
 *
 * Enregistrer un plugin, c'est le mettre dans la première charge — on ne le
 * fait donc qu'au fil des besoins réels.
 */
if (typeof window !== "undefined") {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

  if (isIOS) {
    gsap.registerPlugin(ScrollTrigger); // ❌ pas de SplitText
  } else {
    gsap.registerPlugin(ScrollTrigger, SplitText);
  }

  gsap.ticker.lagSmoothing(0);

  gsap.config({
    force3D: false
  });
}

export { gsap, ScrollTrigger, SplitText };
