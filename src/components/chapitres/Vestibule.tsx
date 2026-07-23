"use client";

import { TexteSouffle } from "@/components/motion/TexteSouffle";
import "./vestibule.css";

/**
 * Le Vestibule.
 *
 * Fond encre. Le manifeste de Camille Rouvière, calé sur la colonne 2, jamais
 * centré. Le texte ne paraît pas : il **se reconstitue**. Les lettres arrivent
 * de loin, dispersées dans la profondeur, en rotation, et se rassemblent à leur
 * place à mesure qu'on descend — le vent joué à l'envers, la poussière qui
 * redevient phrase. Chaque phrase se forme puis se disperse à nouveau quand on
 * continue, sauf la dernière, qui reste.
 *
 * Les trois phrases ne partagent ni leur vent, ni leur ordre, ni leur graine :
 * la première arrive du bas-droite et repart vers le haut, la deuxième se forme
 * depuis ses deux extrémités vers son centre en portant une bourrasque, la
 * troisième s'écrit de gauche à droite et ne repart pas.
 *
 * Grammaire de mouvement du chapitre : **agrégation** — de la matière éparse
 * qui converge en profondeur. Ni l'échelle du seuil qui précède, ni la
 * traversée horizontale de l'enfilade qui suit.
 */

/* Le manifeste, la seule phrase non descriptive du site. Découpé en trois
   temps : chacun a sa fenêtre de défilement et son propre vent. */
const MANIFESTE = [
  "Je ne décore pas.",
  "Je règle la lumière, la matière et le silence.",
  "Le reste appartient aux gens qui vivent là.",
] as const;

export function Vestibule() {
  return (
    <section
      className="vestibule grille"
      data-chapitre="Le Vestibule"
      aria-labelledby="vestibule-titre"
    >
      <h2 className="sr-only" id="vestibule-titre">
        Le vestibule
      </h2>

      {/* La couche technique traîne dans la marge droite et accompagne tout le
          chapitre. Chaque donnée est vraie dans la fiction. */}
      <aside className="vestibule__marge technique" aria-hidden="true">
        <p>Atelier fondé 2011 — Paris VII</p>
        <p>Cinq chantiers par an</p>
      </aside>

      <div className="vestibule__temps vestibule__temps--un">
        <TexteSouffle
          className="vestibule__phrase display"
          texte={MANIFESTE[0]}
          graine={1109}
          /* Arrive du bas-droite, en tournant peu : la phrase est courte et
             sèche, elle se pose plus qu'elle ne vole. */
          arrivee={{
            angle: -22,
            force: 520,
            dispersion: 120,
            rotationMax: 260,
            profondeur: 340,
            decalage: 0.7,
            ordre: "droite",
            courbeOrdre: "power2.in",
            courbe: "power3.out",
          }}
          /* Repart vers le haut-gauche, plus vite qu'elle n'est venue. */
          depart={{
            angle: 158,
            force: 620,
            dispersion: 180,
            rotationMax: 420,
            profondeur: 260,
            decalage: 0.45,
            ordre: "gauche",
            courbeOrdre: "power2.out",
            courbe: "power3.in",
          }}
          debut="top 86%"
          fin="bottom 8%"
        />
      </div>

      <div className="vestibule__temps vestibule__temps--deux">
        <TexteSouffle
          className="vestibule__phrase display"
          texte={MANIFESTE[1]}
          graine={2371}
          /* La plus longue : elle se forme depuis ses deux extrémités vers son
             centre, en portant une bourrasque latérale. C'est le seul endroit
             du site où l'on voit le vent lui-même. */
          arrivee={{
            angle: 96,
            force: 380,
            dispersion: 200,
            rotationMax: 520,
            profondeur: 420,
            decalage: 1.4,
            ordre: "centre",
            hasard: 0.25,
            bourrasque: 190,
            frequenceBourrasque: 0.4,
            etalementPhase: 0.45,
            courbeOrdre: "power1.inOut",
            courbe: "power3.out",
          }}
          depart={{
            angle: 268,
            force: 460,
            dispersion: 240,
            rotationMax: 560,
            profondeur: 380,
            decalage: 1.1,
            ordre: "centre",
            hasard: 0.35,
            bourrasque: 150,
            frequenceBourrasque: 0.6,
            etalementPhase: 0.6,
            courbeOrdre: "power1.in",
            courbe: "power3.in",
          }}
          debut="top 88%"
          fin="bottom 6%"
        />
      </div>

      <div className="vestibule__temps vestibule__temps--trois">
        <TexteSouffle
          className="vestibule__phrase display"
          texte={MANIFESTE[2]}
          graine={3617}
          /* Elle s'écrit de gauche à droite, arrive de moins loin, et ne repart
             pas : c'est la phrase sur laquelle le chapitre se referme. */
          arrivee={{
            angle: 12,
            force: 340,
            dispersion: 90,
            rotationMax: 200,
            profondeur: 260,
            decalage: 1.1,
            ordre: "gauche",
            courbeOrdre: "power2.inOut",
            courbe: "power3.out",
          }}
          depart={null}
          debut="top 82%"
          fin="top 26%"
        />
        <p className="vestibule__signature technique">Camille Rouvière</p>
      </div>
    </section>
  );
}
