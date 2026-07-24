"use client";

import { useRef } from "react";
import Image from "next/image";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { planchesAtelier, texteAtelier } from "@/data/atelier";
import { useMouvement } from "@/components/motion/MotionProvider";
import { useEffetVisuel } from "@/lib/isomorphe";
import "./atelier.css";

/**
 * L'Atelier. Retour au gris, retour au calme.
 *
 * Ce chapitre est une **séquence filmée**, pas une galerie. La différence est
 * entière et tient en une phrase : dans une galerie, on fait défiler des
 * images devant un œil fixe ; ici le cadre est fixe et c'est le sujet qui le
 * traverse.
 *
 * Trois mécanismes, et rien d'autre.
 *
 * — **Le guichet.** Chaque planche est enfermée dans une fenêtre de 85 à 100 vh
 *   qui, elle, ne bouge jamais. L'image à l'intérieur est plus haute que sa
 *   fenêtre et remonte au défilement : c'est un vrai travelling interne, pas
 *   une image qu'on pousse. C'est ce décalage entre le cadre immobile et le
 *   sujet mobile qui fait le plan de cinéma.
 * — **La dominance.** Une planche gagne son échelle pleine quand elle est au
 *   centre du cadre et la perd en s'en éloignant. Une seule est donc dominante
 *   à la fois ; les voisines sont là, plus petites, en retrait de lumière. La
 *   courbe est un cosinus de la distance au centre — continue, sans palier,
 *   donc jamais un « effet » qui se déclenche.
 * — **La variance d'échelle et le débordement.** Ils ne sont pas calculés :
 *   ils sont écrits planche par planche dans `data/atelier.ts`. Une planche à
 *   44 % de large suivie d'une à 108 % qui sort du cadre par la droite, c'est
 *   un montage ; une largeur dérivée de l'index en serait la caricature.
 *
 * Ce qui a été retiré, et qui ne revient pas : la rotation en 3D des
 * photographies, leur envol en profondeur, le flou réactif à la vélocité. Le
 * texte du chapitre se cale dans les respirations de la séquence, entre deux
 * planches, jamais à côté d'une planche dominante.
 *
 * Grammaire de mouvement : **la traversée en échelle**, cadre fixe et sujet
 * mobile. La matière qui précède ne bouge pas d'un pixel et s'ouvre par masque ;
 * la sortie qui suit réfracte un titre immobile. Aucun des trois ne partage sa
 * grammaire avec son voisin.
 */

/**
 * Course du travelling interne, en pourcentage de la hauteur de l'image. La
 * planche est débordée de deux fois cette valeur (voir `atelier.css`) : c'est
 * ce surplus qui donne au sujet de quoi traverser sans jamais découvrir de
 * bord blanc.
 */
const TRAVELLING = 9;

/** Échelle perdue par une planche quand elle quitte le centre du cadre. */
const RETRAIT_ECHELLE = 0.14;

/** Lumière perdue par une planche hors du centre. Jamais jusqu'au noir. */
const RETRAIT_LUMIERE = 0.42;

export function Atelier() {
  const { mouvementReduit } = useMouvement();
  const sectionRef = useRef<HTMLElement>(null);

  useEffetVisuel(() => {
    const section = sectionRef.current;
    if (section === null) return;

    /* En mouvement réduit, la séquence devient un montage posé : les planches
       gardent leurs échelles et leurs débordements — c'est la composition, elle
       reste — mais plus rien ne traverse. Une version, pas une punition. */
    if (mouvementReduit) return;

    const contexte = gsap.context(() => {
      const plans = gsap.utils.toArray<HTMLElement>(".atelier__plan", section);

      plans.forEach((plan) => {
        const image = plan.querySelector<HTMLElement>(".atelier__image");
        if (image === null) return;

        const poserPlan = gsap.quickSetter(plan, "css");
        const poserImage = gsap.quickSetter(image, "y", "%");

        ScrollTrigger.create({
          trigger: plan,
          /* La course commence quand la planche entre par le bas et finit
             quand elle sort par le haut : sa progression est exactement sa
             position à l'écran, et le centre du cadre tombe donc à 0,5. */
          start: "top bottom",
          end: "bottom top",
          scrub: true,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            const t = self.progress;

            /* Le travelling : l'image descend du haut de son débord vers le
               bas. Linéaire — un travelling qui accélère est un travelling
               raté. */
            poserImage(gsap.utils.interpolate(-TRAVELLING, TRAVELLING, t));

            /* La dominance : pleine au centre, en retrait aux bords. `sin(πt)`
               vaut 1 au centre et 0 aux deux extrémités, sans palier. */
            const centre = Math.sin(t * Math.PI);
            poserPlan({
              scale: 1 - RETRAIT_ECHELLE * (1 - centre),
              filter: `brightness(${1 - RETRAIT_LUMIERE * (1 - centre)})`,
            });
          },
        });
      });
    }, section);

    return () => contexte.revert();
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

      <div className="atelier__sequence">
        {planchesAtelier.map((planche, index) => {
          const paragraphe = texteAtelier.paragraphes.find(
            (p) => p.apres === index,
          );

          return (
            <div className="atelier__temps" key={planche.src}>
              <figure
                className="atelier__plan"
                data-cote={planche.cote}
                /* Les proportions de la planche viennent du manifeste et
                   descendent dans la feuille de style par ces deux variables :
                   aucune largeur de planche n'est écrite en CSS. */
                style={
                  {
                    "--hauteur": `${planche.hauteur}vh`,
                    "--largeur": `${planche.largeur}%`,
                  } as React.CSSProperties
                }
              >
                <div className="atelier__guichet">
                  <Image
                    className="atelier__image"
                    src={planche.src}
                    width={planche.largeurFichier}
                    height={planche.hauteurFichier}
                    alt={planche.alt}
                    sizes={`(max-width: 48rem) 100vw, ${Math.round(planche.largeur)}vw`}
                  />
                </div>
                <figcaption className="atelier__note technique">
                  {planche.note}
                </figcaption>
              </figure>

              {/* La respiration : le texte se cale entre deux planches, dans la
                  marge opposée à celle qui vient de passer. */}
              {paragraphe !== undefined ? (
                <p className="atelier__texte" data-cote={planche.cote}>
                  {paragraphe.texte}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
