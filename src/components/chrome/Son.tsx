"use client";

import { useSon } from "./SonProvider";
import "./son.css";

/**
 * Le bouton de bascule du son. Visible en permanence dans le chrome, comme
 * l'exige la direction artistique : le son ne se cache pas dans un réglage.
 *
 * Trois barres fines. Au repos elles sont couchées ; actives, elles montent en
 * une petite vague (animée en CSS, sans JS par frame). Le libellé reste en
 * couche technique.
 *
 * La confirmation sonore de la bascule n'est pas jouée ici : c'est le provider
 * qui l'émet, au bon moment de part et d'autre du fondu — après la reprise du
 * contexte quand on allume, avant la descente du maître quand on coupe.
 */
export function Son() {
  const { sonActif, basculerSon } = useSon();

  return (
    <button
      type="button"
      className="son"
      onClick={basculerSon}
      aria-pressed={sonActif}
      aria-label={sonActif ? "Couper le son" : "Activer le son"}
      data-actif={sonActif}
    >
      <span className="son__barres" aria-hidden="true">
        <span className="son__barre" />
        <span className="son__barre" />
        <span className="son__barre" />
      </span>
      <span className="son__label technique">Son</span>
    </button>
  );
}
