"use client";

import { useRef, useState } from "react";
import { useRig } from "./Rig";
import type { StatsRig } from "./moteur";
import { compterAbonnes } from "@/lib/boucle";
import { useEffetVisuel } from "@/lib/isomorphe";
import "./debug.css";

/**
 * Panneau de contrôle du rig. Développement seulement — le layout ne le monte
 * pas en production.
 *
 * Il n'écrit pas dans l'état React : cinq fois par seconde, il pose du texte
 * directement dans ses propres nœuds. Un panneau qui redéclenche un rendu
 * React à chaque frame mesure surtout son propre coût.
 */

type Ligne = { cle: string; intitule: string };

const LIGNES: readonly Ligne[] = [
  { cle: "ips", intitule: "Images par seconde" },
  { cle: "appels", intitule: "Appels de dessin" },
  { cle: "triangles", intitule: "Triangles" },
  { cle: "gpu", intitule: "Mémoire GPU" },
  { cle: "scenes", intitule: "Scènes actives" },
  { cle: "boucle", intitule: "Boucle" },
  { cle: "dpr", intitule: "Densité" },
  { cle: "premier", intitule: "Premier rendu" },
  { cle: "etat", intitule: "État" },
];

export function PanneauDebug() {
  const rig = useRig();
  const [ouvert, setOuvert] = useState(true);
  const valeurs = useRef<Record<string, HTMLSpanElement | null>>({});

  useEffetVisuel(() => {
    const ecrire = (cle: string, texte: string) => {
      const noeud = valeurs.current[cle];
      if (noeud !== null && noeud !== undefined && noeud.textContent !== texte) {
        noeud.textContent = texte;
      }
    };

    if (rig === null) {
      ecrire("etat", "Sans moteur — mode dégradé ou chargement");
      ecrire(
        "boucle",
        `${compterAbonnes("defilement")} · ${compterAbonnes("mesure")} · ${compterAbonnes("rendu")}`,
      );
      return;
    }

    return rig.abonnerStats((stats: StatsRig) => {
      ecrire("ips", `${stats.ips}`);
      ecrire("appels", `${stats.appels}`);
      ecrire("triangles", `${stats.triangles}`);
      ecrire(
        "gpu",
        `${stats.geometries} géo · ${stats.textures} tex · ${stats.programmes} prg`,
      );
      ecrire("scenes", `${stats.scenesActives} / ${stats.scenesInscrites}`);
      ecrire(
        "boucle",
        `${compterAbonnes("defilement")} · ${compterAbonnes("mesure")} · ${compterAbonnes("rendu")}`,
      );
      ecrire("dpr", stats.dpr.toFixed(2));
      ecrire(
        "premier",
        stats.premierRenduMs === null
          ? "—"
          : `${stats.premierRenduMs.toFixed(1)} ms`,
      );
      ecrire("etat", stats.suspendu ? "Suspendu" : "En rendu");
    });
  }, [rig]);

  return (
    <div className="rig-debug technique">
      <button
        type="button"
        className="rig-debug-bascule"
        aria-expanded={ouvert}
        onClick={() => setOuvert((etat) => !etat)}
      >
        Rig
      </button>
      {ouvert ? (
        <dl className="rig-debug-liste">
          {LIGNES.map((ligne) => (
            <div key={ligne.cle} className="rig-debug-ligne">
              <dt>{ligne.intitule}</dt>
              <dd>
                <span
                  ref={(noeud) => {
                    valeurs.current[ligne.cle] = noeud;
                  }}
                >
                  —
                </span>
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
    </div>
  );
}
