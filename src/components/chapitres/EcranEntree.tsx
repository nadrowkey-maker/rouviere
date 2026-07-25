"use client";

import type { RefObject } from "react";
import { Langue } from "@/components/chrome/Langue";
import { useLangue } from "@/i18n/LangueProvider";
import "./ecran-entree.css";

/**
 * L'écran d'entrée — le sas.
 *
 * ## Ce qui a changé, et pourquoi
 *
 * Il ressemblait à un menu : deux grandes phrases en Gambetta, empilées en bas à
 * gauche, de la taille d'un titre de chapitre. Deux titres qui se font face au
 * même corps, ce n'est pas un choix, c'est une liste — et une liste, c'est ce
 * que propose une application, pas une maison.
 *
 * Le parti est maintenant celui d'une devanture. **Le nom d'abord, seul, au
 * centre**, avec son interlettrage large et un filet sous lui ; sous le filet,
 * une ligne de qualité, sèche. Puis, franchement plus bas et franchement plus
 * petits, les deux choix, **côte à côte et en petites capitales** — on n'entre
 * pas dans une maison en lisant un titre, on pousse une porte. La langue se
 * choisit dans le coin haut droit, exactement là où le chrome la tiendra ensuite.
 *
 * C'est un centrage, et c'est l'exception que le Livre I réserve au seuil. Le
 * mot LUMIÈRE du vestibule et le nom de la sortie citent ce même centre ; rien
 * d'autre n'y a droit.
 *
 * ## L'arrivée
 *
 * Rien n'apparaissait : tout était là d'un coup, ce qui est la façon la plus
 * sûre d'avoir l'air d'un écran de chargement. La composition se pose maintenant
 * en quatre temps — le nom, le filet qui se tire, la ligne, puis les choix — en
 * pure CSS, sans une frame de JavaScript. En mouvement réduit, elle est posée.
 *
 * ## Ce qu'il fait, et qui n'a pas changé
 *
 *   1. **Le sas audio.** Un navigateur n'autorise Web Audio que dans un geste
 *      explicite. Le clic sur l'un des deux choix est ce geste.
 *   2. **Le préchargeur.** Les choix ne s'activent qu'une fois la vidéo du hero
 *      et sa poster prêtes. Pas de pourcentage : c'est le seuil vidéo qui sert
 *      de préchargeur, et l'attente ne s'affiche pas, elle se tait.
 *
 * Le composant reste passif : il ne connaît ni le son, ni le hero. Il signale le
 * choix par `onEntrer(avecSon)` et le seuil orchestre la suite.
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
  const { t } = useLangue();

  return (
    <div className="ecran-entree" ref={conteneurRef} data-pret={pret}>
      {/* La langue, dans le coin haut droit — là où le chrome la tiendra une
          fois qu'on sera entré. Elle est au même endroit avant et après : on ne
          la cherche pas deux fois. */}
      <div className="ecran-entree__langue">
        <Langue />
      </div>

      <div className="ecran-entree__bloc">
        <p className="ecran-entree__logo" aria-hidden="true">
          ROUVIÈRE
        </p>

        {/* Le filet se tire depuis le centre. C'est le seul trait de l'écran, et
            il porte à lui seul l'idée de plaque gravée. */}
        <span className="ecran-entree__filet" aria-hidden="true" />

        <p className="ecran-entree__qualite technique">
          {t("entreeTitre")} — {t("entreeLieu")}
        </p>

        {/* Les deux portes, **dans le même bloc que le nom et juste sous lui**.
            Elles étaient renvoyées en bas de l'écran, en capitales de onze
            pixels et sans contour : le regard tombait sur le nom, n'y trouvait
            rien à faire, et devait chercher. Un sas qu'il faut déchiffrer a raté
            son seul travail.

            Le contour d'un pixel fait le reste : ce qui est encadré se clique,
            et l'on n'a rien à expliquer. */}
        <div
          className="ecran-entree__choix"
          role="group"
          aria-label={t("entreeGroupe")}
        >
          <button
            type="button"
            className="ecran-entree__bouton"
            disabled={!pret}
            onClick={() => onEntrer(true)}
          >
            {t("entreeAvecSon")}
          </button>

          <button
            type="button"
            className="ecran-entree__bouton"
            disabled={!pret}
            onClick={() => onEntrer(false)}
          >
            {t("entreeSilence")}
          </button>
        </div>
      </div>
    </div>
  );
}
