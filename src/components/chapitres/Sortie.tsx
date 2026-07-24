"use client";

import { useRef, useState } from "react";
import dynamic from "next/dynamic";
import { gambetta } from "@/lib/fonts";
import { useRig } from "@/components/gl/Rig";
import { useMouvement } from "@/components/motion/MotionProvider";
import type { EtatVerre } from "@/components/gl/materiaux/verre";
import "./sortie.css";

/**
 * La Sortie. Fond encre, silence.
 *
 * Le nom de l'atelier flotte une dernière fois, mais cette fois il est en verre :
 * un nœud torique réfractant tourne devant le titre plein écran et le déforme
 * optiquement. Voir `materiaux/verre.ts`.
 *
 * En dessous, sec : l'adresse, un téléphone, un courriel. Pas de formulaire à six
 * champs, pas de « Parlons de votre projet ». Le courriel est un lien `mailto:`
 * qui copie l'adresse au clic, avec un retour discret.
 *
 * Grammaire de mouvement : **la réfraction** — un objet unique qui tourne
 * lentement sur lui-même et déforme un titre immobile. L'atelier qui précède
 * fait pivoter des images au défilement ; ici rien ne défile, un seul corps
 * tourne sur le temps. Les deux ne se ressemblent pas.
 *
 * Le titre en verre est peint dans un canvas, donc invisible aux moteurs et aux
 * lecteurs d'écran : le `<h2>` réel reste lisible, en `sr-only` quand le verre
 * peint, en clair quand il ne peint pas. Sur pointeur grossier, la scène ne
 * monte pas : le titre DOM prend le relais, frosté d'un simple `backdrop-filter`.
 */

const SceneVerre = dynamic(() => import("@/components/gl/SceneVerre"), {
  ssr: false,
});

const ADRESSE = "atelier@rouviere.fr";
const TELEPHONE = "+33 1 42 61 08 11";

export function Sortie() {
  const enWebgl = useRig() !== null;
  const { capacites, degrade } = useMouvement();

  /* Le verre ne monte que si la machine le porte et si le pointeur est fin :
     sur tactile ou en dégradé, le titre DOM tient le rôle. */
  const verreActif = enWebgl && !degrade && !capacites.pointeurGrossier;

  const ancreVerre = useRef<HTMLDivElement>(null);
  const etatVerre = useRef<EtatVerre>({ pointeur: null });

  const [copie, setCopie] = useState(false);

  const copierAdresse = () => {
    /* Le lien `mailto:` fait son travail par défaut ; on copie en plus, avec un
       retour qui s'efface tout seul. */
    void navigator.clipboard?.writeText(ADRESSE).then(
      () => {
        setCopie(true);
        setTimeout(() => setCopie(false), 2400);
      },
      () => {},
    );
  };

  return (
    <section
      className="sortie"
      id="contact"
      data-chapitre="La Sortie"
      aria-labelledby="sortie-titre"
      onPointerMove={(e) => {
        etatVerre.current.pointeur = { x: e.clientX, y: e.clientY };
      }}
      onPointerLeave={() => {
        etatVerre.current.pointeur = null;
      }}
    >
      <h2 className="sortie__titre display-monument" id="sortie-titre" data-verre={verreActif}>
        Rouvière
      </h2>

      {verreActif ? (
        <>
          <div className="sortie__scene" ref={ancreVerre} aria-hidden="true" />
          <SceneVerre
            ancre={ancreVerre}
            titre="ROUVIÈRE"
            police={gambetta.style.fontFamily}
            etat={etatVerre}
          />
        </>
      ) : null}

      <address className="sortie__coordonnees">
        <p className="sortie__adresse">
          14 rue de Beaune
          <br />
          75007 Paris
        </p>

        <p className="sortie__contact">
          <a className="sortie__lien" href={`tel:${TELEPHONE.replace(/\s/g, "")}`}>
            {TELEPHONE}
          </a>
          <a
            className="sortie__lien sortie__courriel"
            href={`mailto:${ADRESSE}`}
            data-curseur="ÉCRIRE"
            onClick={copierAdresse}
          >
            {ADRESSE}
            <span className="sortie__copie technique" aria-hidden="true" data-vu={copie}>
              adresse copiée
            </span>
          </a>
          {/* Le retour est annoncé aux lecteurs d'écran sans voler le focus. */}
          <span className="sr-only" role="status" aria-live="polite">
            {copie ? "Adresse copiée dans le presse-papier." : ""}
          </span>
        </p>

        <p className="sortie__pied technique">
          Atelier fondé 2011 — sur recommandation
        </p>
      </address>
    </section>
  );
}
