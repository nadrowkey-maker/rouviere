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
  gsap.registerPlugin(ScrollTrigger, SplitText);
  gsap.ticker.lagSmoothing(0);

  /* ------------------------------------------------------------------
     La barre d'URL des navigateurs mobiles, et pourquoi elle cassait tout
     ------------------------------------------------------------------
     Sur un téléphone, descendre replie la barre d'adresse et remonter la
     redéploie. Le navigateur émet un `resize` à chaque fois, et `innerHeight`
     change d'une centaine de pixels — **en plein geste de défilement**.

     ScrollTrigger se rafraîchit par défaut à chaque `resize` : il re-mesure les
     neuf chapitres, recalcule les six épinglages et leurs espaceurs, et
     repositionne le défilement sur les nouvelles bornes. C'est une passe de
     plusieurs dizaines de millisecondes, déclenchée au moment précis où l'on
     bouge, et elle se solde par un saut de position parce que les courses
     `+=innerHeight` viennent de changer de valeur sous la main. C'est
     l'explication du « ça saute et ça saccade » du parcours mobile, et aucun
     réglage d'animation ne pouvait le corriger : rien n'était mal animé, tout
     était re-mesuré au mauvais moment.

     `ignoreMobileResize` dit à ScrollTrigger d'ignorer les `resize` d'un
     appareil tactile qui ne changent **que** la hauteur — c'est-à-dire
     exactement la signature de la barre d'URL. Une rotation d'écran change la
     largeur : elle passe, et le rafraîchissement a bien lieu.

     Les hauteurs de la feuille de style sont écrites en `--ecran`, donc sur la
     grande fenêtre, qui ne bouge pas non plus : CSS et ScrollTrigger restent
     d'accord d'un bout à l'autre du parcours.
     ------------------------------------------------------------------ */
  ScrollTrigger.config({ ignoreMobileResize: true });
}

export { gsap, ScrollTrigger, SplitText };
