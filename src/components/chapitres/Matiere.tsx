"use client";

import { useRef } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import { matieres, bassin, OMBRE_ECHANTILLON } from "@/data/matieres";
import { useRig } from "@/components/gl/Rig";
import type { EtatMatiere } from "@/components/gl/materiaux/echantillon";
import type { EtatBassin } from "@/components/gl/materiaux/bassin";
import { useMouvement } from "@/components/motion/MotionProvider";
import "./matiere.css";

/**
 * La Matière.
 *
 * Un chapitre entier sans image de projet. On touche. Deux temps.
 *
 *   *Les échantillons.* Trois surfaces planes en projection orthographique —
 *   lin, chaux, plâtre — posées de biais comme sur un établi. Elles se
 *   soulèvent sous le curseur, comme une feuille qu'on pince, et leur ombre
 *   portée s'efface à mesure qu'elles se décollent. Chaque plaque double une
 *   figure DOM : le rig la met à l'échelle de la figure, et les trois s'alignent
 *   d'elles-mêmes sur leurs légendes. Voir `materiaux/echantillon.ts`.
 *
 *   *Le bassin.* Une seule fois dans tout le site : le bassin de la Villa
 *   Ostréa, vraie simulation de surface d'eau. Plein écran, sans texte, sans
 *   interface, sinon une ligne en couche technique. Voir `materiaux/bassin.ts`.
 *
 * Grammaire de mouvement : **le soulèvement**, un déplacement dans l'axe Z
 * commandé par le pointeur, pas par le défilement. La chambre qui précède avance
 * dans l'axe au scroll ; l'atelier qui suit pivote au scroll. Ici rien ne bouge
 * au défilement : c'est la main qui déforme la matière. Aucun des trois ne
 * partage sa grammaire avec son voisin.
 *
 * Le HTML tient la mise en page et le mode dégradé ; le WebGL, isolé derrière
 * `dynamic(..., { ssr: false })`, se cale dessus et n'entre pas dans la première
 * charge.
 */

const SceneEchantillon = dynamic(
  () => import("@/components/gl/SceneEchantillon"),
  { ssr: false },
);
const SceneBassin = dynamic(() => import("@/components/gl/SceneBassin"), {
  ssr: false,
});

export function Matiere() {
  const enWebgl = useRig() !== null;
  const { degrade } = useMouvement();

  /* Une ref stable par plaque : son identité ne change pas d'un rendu à
     l'autre, sinon `useGLProxy` réinscrirait la scène à chaque rendu. Le
     callback de la figure écrit dans `.current`. */
  const ancresEchantillons = useRef(
    matieres.map(() => ({ current: null as HTMLElement | null })),
  );
  const ancreBassin = useRef<HTMLDivElement>(null);

  /* L'état des deux scènes vit dans des refs : le pointeur bouge soixante fois
     par seconde, le passer par `useState` reconstruirait l'arbre à chaque
     mouvement. Les shaders les lisent au cadre. */
  const etatMatiere = useRef<EtatMatiere>({ pointeur: null, focus: null });
  const etatBassin = useRef<EtatBassin>({ pointeur: null, clics: 0 });

  return (
    <section className="matiere" aria-labelledby="matiere-titre">
      <h2 className="sr-only" id="matiere-titre">
        La matière
      </h2>

      {/* ---- Les échantillons ---- */}
      <div
        className="matiere__echantillons"
        data-chapitre="La Matière"
        /* Le pointeur est capté au niveau du chapitre : il traverse les figures
           (les événements React remontent) et pilote la plaque qu'il survole.
           Les coordonnées passent en client, le shader les convertit avec le
           rect de la passe de mesure. */
        onPointerMove={(e) => {
          etatMatiere.current.pointeur = { x: e.clientX, y: e.clientY };
        }}
        onPointerLeave={() => {
          etatMatiere.current.pointeur = null;
        }}
      >
        <p className="matiere__intro display">
          On règle la lumière, la matière et le silence.
        </p>

        <ul className="matiere__liste">
          {matieres.map((matiere, index) => (
            <li className="matiere__echantillon" key={matiere.cle}>
              <button
                type="button"
                className="matiere__prise"
                data-curseur="TIRER"
                /* Le clavier fait ce que le pointeur fait : la plaque au focus
                   se soulève, et rien d'autre ne bouge. */
                onFocus={() => {
                  etatMatiere.current.focus = index;
                }}
                onBlur={() => {
                  if (etatMatiere.current.focus === index) {
                    etatMatiere.current.focus = null;
                  }
                }}
                onPointerEnter={() => {
                  etatMatiere.current.focus = null;
                }}
              >
                {/* L'ancre du rig : la boîte que la plaque WebGL vient couvrir.
                    L'image DOM reste dessous, hidden quand le WebGL peint,
                    visible en mode dégradé — c'est le motif de l'enfilade. */}
                <span
                  className="matiere__image"
                  data-webgl={enWebgl}
                  ref={(node) => {
                    ancresEchantillons.current[index]!.current = node;
                  }}
                >
                  <Image
                    src={matiere.texture}
                    width={512}
                    height={512}
                    alt={`Échantillon de ${matiere.nom.toLowerCase()}.`}
                    sizes="(max-width: 48rem) 44vw, 22vw"
                  />
                </span>
                <span className="matiere__nom display">{matiere.nom}</span>
                <span className="matiere__provenance technique">
                  {matiere.provenance}
                </span>
              </button>

              <SceneEchantillon
                ancre={ancresEchantillons.current[index]!}
                texture={matiere.texture}
                ombre={OMBRE_ECHANTILLON}
                index={index}
                etat={etatMatiere}
                cle={matiere.cle}
              />
            </li>
          ))}
        </ul>
      </div>

      {/* ---- Le bassin ---- */}
      <div
        className="matiere__bassin"
        data-chapitre="Le Bassin"
        aria-label="Bassin de la Villa Ostréa"
        ref={ancreBassin}
        data-webgl={enWebgl}
        onPointerMove={(e) => {
          etatBassin.current.pointeur = { x: e.clientX, y: e.clientY };
        }}
        onPointerLeave={() => {
          etatBassin.current.pointeur = null;
        }}
        onPointerDown={() => {
          etatBassin.current.clics += 1;
        }}
      >
        {/* Le repli : plaque du bassin, calculée avec les équations du shader.
            Elle reste visible tant que le moteur n'a pas pris la main, et
            définitivement sans WebGL2. */}
        <Image
          className="matiere__repli"
          src={bassin.repli}
          width={bassin.largeurRepli}
          height={bassin.hauteurRepli}
          alt="Le bassin de nage de la Villa Ostréa, vingt-deux mètres le long de la façade sud. La surface porte quelques ondes."
          sizes="100vw"
          data-cache={enWebgl && !degrade}
        />

        <p className="matiere__technique technique">{bassin.technique}</p>

        <SceneBassin ancre={ancreBassin} etat={etatBassin} repli={bassin.repli} />
      </div>
    </section>
  );
}
