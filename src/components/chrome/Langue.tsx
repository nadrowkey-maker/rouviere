"use client";

import { useLangue } from "@/i18n/LangueProvider";
import { CODE_LANGUE, LANGUES, NOM_LANGUE } from "@/i18n/langues";
import "./langue.css";

/**
 * La bascule de langue du chrome.
 *
 * **Deux codes, pas un menu.** Le site a deux langues ; une liste déroulante
 * pour deux choix est une boîte de dialogue qu'on ouvre pour rien. Les deux
 * codes sont posés côte à côte, séparés d'un filet, et l'on clique celui qu'on
 * veut. C'est aussi le seul dispositif qui dise, sans qu'on l'ouvre, que la
 * seconde langue existe.
 *
 * **Le régime du chrome s'applique** : aucune couleur propre, tout descend de
 * `currentColor` et le `difference` est porté par le groupe de la barre. La
 * langue active se marque donc **par la densité**, jamais par une teinte — la
 * même règle que le libellé du son.
 *
 * Accessibilité : c'est un groupe de boutons à état, pas une navigation.
 * `aria-pressed` dit lequel est actif, et chaque bouton porte le nom de sa
 * langue **dans sa propre langue** — « English » ne se traduit pas, et c'est
 * précisément ce qui permet à quelqu'un qui ne lit pas le français de le
 * trouver.
 */
export function Langue() {
  const { langue, changerLangue } = useLangue();

  return (
    <div className="langue" role="group" aria-label="Langue / Language">
      {LANGUES.map((code, index) => (
        <span className="langue__cellule" key={code}>
          {index > 0 ? (
            <span className="langue__filet" aria-hidden="true" />
          ) : null}
          <button
            type="button"
            className="langue__code technique"
            lang={code}
            aria-pressed={langue === code}
            aria-label={NOM_LANGUE[code]}
            data-actif={langue === code}
            onClick={() => changerLangue(code)}
          >
            {CODE_LANGUE[code]}
          </button>
        </span>
      ))}
    </div>
  );
}
