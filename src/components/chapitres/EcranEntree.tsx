"use client";

import type { RefObject } from "react";
import "./ecran-entree.css";

/**
 * L'écran d'entrée.
 *
 * Un écran noir plein cadre, avant tout le reste : le logotype ROUVIÈRE en
 * petit, et deux choix — entrer avec le son, ou en silence. Rien d'autre, pas
 * de pourcentage de chargement.
 *
 * Il est techniquement nécessaire, pas décoratif. Deux rôles :
 *
 *   1. **Le sas audio.** Un navigateur n'autorise le démarrage de Web Audio que
 *      dans un geste explicite de l'utilisateur. Le clic sur l'un des deux
 *      boutons est ce geste : « avec le son » débloque et démarre la nappe,
 *      « en silence » ne l'arme pas. Sans ce clic, aucun son n'est possible.
 *
 *   2. **Le préchargeur.** Les boutons ne deviennent actifs que lorsque la
 *      vidéo du hero et sa poster sont prêtes : l'écran d'entrée masque le temps
 *      de chargement au lieu de l'afficher en pourcentage. C'est le seuil vidéo
 *      qui sert de préchargeur, pas une barre de progression.
 *
 * Le composant est volontairement passif : il ne connaît ni le son, ni le hero.
 * Il signale seulement le choix par `onEntrer(avecSon)`, et le seuil orchestre
 * la suite (activation du son, sortie de l'écran, apparition du logotype).
 */

type Props = {
  /** Vrai quand la vidéo du hero et sa poster sont chargées. */
  pret: boolean;
  /** Le choix de l'utilisateur — appelé dans le geste de clic. */
  onEntrer: (avecSon: boolean) => void;
  /** Tenu par le seuil, qui anime la sortie de l'écran. */
  conteneurRef: RefObject<HTMLDivElement | null>;
};

export function EcranEntree({ pret, onEntrer, conteneurRef }: Props) {
  return (
    <div className="ecran-entree" ref={conteneurRef} data-pret={pret}>
      <div className="ecran-entree__bloc">
        <p className="ecran-entree__logo" aria-hidden="true">
          ROUVIÈRE
        </p>

        <div className="ecran-entree__choix" role="group" aria-label="Entrer sur le site">
          <button
            type="button"
            className="ecran-entree__bouton"
            disabled={!pret}
            onClick={() => onEntrer(true)}
          >
            Entrer avec le son
          </button>
          <button
            type="button"
            className="ecran-entree__bouton"
            disabled={!pret}
            onClick={() => onEntrer(false)}
          >
            Entrer en silence
          </button>
        </div>
      </div>
    </div>
  );
}
