"use client";

import { useRef } from "react";
import Image from "next/image";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { planchesAtelier, texteAtelier } from "@/data/atelier";
import { useMouvement } from "@/components/motion/MotionProvider";
import { useEffetVisuel } from "@/lib/isomorphe";
import { aleatoireAGraine } from "@/lib/aleatoire";
import "./atelier.css";

/**
 * L'Atelier. Retour au gris, retour au calme.
 *
 * Porté de `references/github/rotating-onscroll-animations/js/index5.js` — la
 * variante la plus spectaculaire. Ce qui en vient, au coefficient près :
 *
 * — **La pause au centre.** `holdAtMiddle` fige la progression sur un plateau
 *   au milieu de la course : l'image se stabilise, de face, le temps qu'on la
 *   regarde, puis repart. C'est ce plateau qui distingue l'effet d'un simple
 *   défilement pivoté.
 * — **La rotation et la profondeur.** À l'entrée et à la sortie l'image est
 *   couchée (rotationX ±) et poussée au fond (`z = sin(t·π)·−750`) ; au centre
 *   elle est droite et près de nous. Le flou (`cos²`), la luminosité (`sin⁶`) et
 *   les deux échelles suivent la même horloge — l'image naît noire et floue du
 *   fond, s'éclaire net au centre, y replonge.
 * — **La distribution latérale en sinusoïde.** `x = sin(i·0.9)·amplitude` sur
 *   l'enveloppe : les images ne tombent pas sur un axe, elles ondulent. Ce n'est
 *   pas un stagger uniforme — l'interdit du document —, c'est un décalage indexé
 *   sur la position réelle de chaque image.
 *
 * Ce qui a changé : la boucle et le lissage viennent du rig (pas de nouveau
 * Lenis, pas de nouveau ticker), et la rotation aléatoire est tirée d'un PRNG à
 * graine plutôt que de `Math.random` — elle reste identique après un
 * redimensionnement, comme le veut le site. Le portrait tourne moins que les
 * autres : c'est un visage, pas une carte qui tournoie.
 *
 * Grammaire de mouvement : **le pivotement en profondeur**. La matière qui
 * précède se soulève sous la main sans défiler ; la sortie qui suit réfracte un
 * titre immobile. Aucun des trois ne partage sa grammaire.
 */

/** Amplitude de l'ondulation latérale, en fraction de la largeur. */
const PART_AMPLITUDE = 0.05;
/** Largeur du plateau central, en fraction de la course. */
const PLATEAU = 0.25;

/**
 * Fige la progression sur un plateau au milieu. Repris de `holdAtMiddle` de la
 * source : avant le plateau on remappe [0, 0.5−h] sur [0, 0.5], après on remappe
 * [0.5+h, 1] sur [0.5, 1], et au milieu on reste à 0.5.
 */
function pauseAuCentre(progression: number, largeur = PLATEAU): number {
  const demi = largeur * 0.5;
  if (progression < 0.5 - demi) {
    return gsap.utils.mapRange(0, 0.5 - demi, 0, 0.5, progression);
  }
  if (progression > 0.5 + demi) {
    return gsap.utils.mapRange(0.5 + demi, 1, 0.5, 1, progression);
  }
  return 0.5;
}

export function Atelier() {
  const { mouvementReduit } = useMouvement();
  const sectionRef = useRef<HTMLElement>(null);

  useEffetVisuel(() => {
    const section = sectionRef.current;
    if (section === null) return;

    /* En mouvement réduit, aucune rotation : les images sont posées, droites,
       nettes. La composition tient sans le mouvement — c'est une version, pas
       une punition. */
    if (mouvementReduit) return;

    const items = gsap.utils.toArray<HTMLElement>(".atelier__item", section);
    /* La graine fixe la rotation de chaque image : identique d'une visite à
       l'autre, et surtout inchangée après un redimensionnement. */
    const tirer = aleatoireAGraine(0x0a7e11e);

    /* L'ondulation latérale, posée sur l'enveloppe de chaque image, et recalée
       sur la largeur à chaque rafraîchissement. Le rappel est global à
       ScrollTrigger : il est retiré à la main au démontage, `gsap.context` ne
       le suit pas. */
    const amplitude = () => innerWidth * PART_AMPLITUDE;
    const ondulerEnveloppes = () => {
      items.forEach((item, i) => {
        const enveloppe = item.parentElement;
        if (enveloppe !== null) {
          gsap.set(enveloppe, { x: Math.sin(i * 0.9) * amplitude() });
        }
      });
    };
    ondulerEnveloppes();
    ScrollTrigger.addEventListener("refreshInit", ondulerEnveloppes);

    const contexte = gsap.context(() => {
      items.forEach((item) => {
        /* Le portrait pivote moins : un visage se présente, il ne tournoie
           pas. Les autres sont couchées franchement à l'entrée et à la sortie. */
        const portrait = item.dataset.portrait === "true";
        const rotationX = portrait
          ? 60 + tirer() * 30
          : 130 + tirer() * 90;
        const rotationZ = portrait ? -18 : -50;

        const poserTransform = gsap.quickSetter(item, "css");
        const poserFiltre = gsap.quickSetter(item, "filter");

        ScrollTrigger.create({
          trigger: item,
          start: "top bottom+=20%",
          end: "bottom top-=20%",
          scrub: true,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            const t = pauseAuCentre(self.progress);

            const rX = gsap.utils.interpolate(-rotationX, rotationX, t);
            const rZ = gsap.utils.interpolate(-rotationZ, rotationZ, t);
            const z = Math.sin(t * Math.PI) * -750;
            const flou = Math.pow(Math.cos(t * Math.PI), 2) * 12;
            const echelleX = 1 + Math.pow(Math.cos(t * Math.PI), 2) * 0.6;
            const echelleY = 0.5 + Math.pow(Math.sin(t * Math.PI), 2) * 0.5;
            const clarte = Math.pow(Math.sin(t * Math.PI), 6);

            poserTransform({
              scaleX: echelleX,
              scaleY: echelleY,
              rotationX: rX,
              rotationZ: rZ,
              z,
            });
            poserFiltre(`blur(${flou}px) brightness(${clarte})`);
          },
        });
      });
    }, section);

    return () => {
      ScrollTrigger.removeEventListener("refreshInit", ondulerEnveloppes);
      contexte.revert();
    };
  }, [mouvementReduit]);

  return (
    <section
      className="atelier"
      id="atelier"
      ref={sectionRef}
      data-chapitre="L'Atelier"
      data-reduit={mouvementReduit}
      aria-labelledby="atelier-titre"
    >
      <header className="atelier__entete grille">
        <h2 className="atelier__titre display" id="atelier-titre">
          {texteAtelier.titre}
        </h2>
        <p className="atelier__chapo">{texteAtelier.chapo}</p>
      </header>

      <div className="atelier__galerie">
        {planchesAtelier.map((planche, index) => (
          <div className="atelier__enveloppe" key={planche.src}>
            <figure
              className="atelier__item"
              data-portrait={planche.portrait ? "true" : undefined}
            >
              <Image
                className="atelier__image"
                src={planche.src}
                width={planche.largeur}
                height={planche.hauteur}
                alt={planche.alt}
                sizes="(max-width: 48rem) 70vw, 34vw"
              />
              <figcaption className="atelier__note technique">
                {planche.note}
              </figcaption>
            </figure>

            {/* Le texte est décroché entre les images, dans la marge : on lit
                la méthode en même temps qu'on la regarde tourner. */}
            {index < texteAtelier.paragraphes.length ? (
              <p className="atelier__texte">
                {texteAtelier.paragraphes[index]}
              </p>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}
