/**
 * Le passage. **Une seule grammaire de transition dans tout le site.**
 *
 * Il y en avait trois, et elles se contredisaient : un damier de carrés qui
 * s'éteignaient un à un pour entrer dans un projet, des stores à lamelles
 * horizontales pour revenir au parcours, des lamelles encore pour ouvrir le
 * menu, plus un second damier pour dévoiler l'aperçu d'une entrée. Quatre
 * masques SVG, quatre rythmes, quatre façons de dire la même chose. Le site en
 * garde une, et une seule : le **fondu de matière**.
 *
 * Le fondu de matière n'est pas un `opacity: 0 → 1`. Une surface qui part
 * s'assombrit jusqu'au noir **et** monte très légèrement en échelle — elle
 * s'éloigne en s'éteignant, comme une pièce dont on baisse la lumière — pendant
 * que celle qui arrive se découvre dessous. Une surface qui vient fait le
 * chemin inverse. C'est le même geste que la sortie du hero, à l'échelle d'une
 * couture : on éteint, on rallume.
 *
 * Tout tient dans **un scalaire**, `--passage`, de 0 (surface retirée) à 1
 * (surface posée). L'opacité, la luminosité et l'échelle en descendent en CSS
 * (voir `transition.css`) : GSAP n'anime qu'un nombre, jamais trois propriétés
 * composites qu'il faudrait garder d'accord.
 *
 * Les durées ne sont pas libres. Le document proscrit l'intervalle 0,30–0,55 s
 * sur un mouvement de grande amplitude — et couvrir le cadre entier en est un.
 * On est donc franchement au-dessus, et la retraite reste plus rapide que la
 * pose : une couture qui s'ouvre lentement et se referme vite se lit comme une
 * respiration, l'inverse comme une hésitation.
 */
import { gsap } from "@/lib/gsap";

/** Pose de la surface : elle vient couvrir. */
export const DUREE_POSE = 0.86;
/** Retraite de la surface : elle s'assombrit, s'éloigne, se retire. */
export const DUREE_RETRAITE = 0.62;

/** L'état posé et l'état retiré, en une variable. */
export const POSE = 1;
export const RETIRE = 0;

type Options = {
  /** Durée en secondes. Par défaut celle du sens demandé. */
  duree?: number;
  /** Appelée à la fin naturelle, jamais si l'animation est tuée. */
  fini?: () => void;
};

/**
 * La surface se retire : elle s'assombrit, monte d'un rien en échelle, et
 * découvre ce qui est dessous. C'est le passage par défaut du site — celui de
 * toute entrée de route et de la fermeture du menu.
 */
export function retirer(
  surface: Element,
  { duree = DUREE_RETRAITE, fini }: Options = {},
): gsap.core.Tween {
  return gsap.to(surface, {
    "--passage": RETIRE,
    duration: duree,
    /* `power2.inOut` : la matière part doucement, traverse vite, se dépose. Un
       `out` seul ferait décrocher la surface dès la première frame. */
    ease: "power2.inOut",
    onComplete: fini,
  });
}

/** La surface vient couvrir : elle sort du noir et se rapproche. */
export function poser(
  surface: Element,
  { duree = DUREE_POSE, fini }: Options = {},
): gsap.core.Tween {
  return gsap.to(surface, {
    "--passage": POSE,
    duration: duree,
    ease: "power2.out",
    onComplete: fini,
  });
}

/** L'état terminal, sans animation : mouvement réduit, ou passage préempté. */
export function figer(surface: Element, valeur: number): void {
  gsap.set(surface, { "--passage": valeur });
}
