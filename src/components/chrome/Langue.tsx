"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLangue } from "@/i18n/LangueProvider";
import {
  CODE_LANGUE,
  LANGUES,
  NOM_LANGUE,
  memeCheminAutreLangue,
} from "@/i18n/langues";
import "./langue.css";

/**
 * La bascule de langue.
 *
 * **Ce sont des liens, pas des boutons**, et c'est la conséquence directe du
 * routage : la langue est dans l'adresse, donc en changer est une navigation.
 * Un lien s'ouvre dans un nouvel onglet, se copie, se met en signet — ce
 * qu'aucun bouton ne fait. C'est précisément ce qu'on est venu chercher.
 *
 * Le lien vise **la même page dans l'autre langue**, jamais l'accueil : on lit
 * une fiche projet en français, on la relit en anglais, on ne recommence pas le
 * parcours.
 *
 * **Deux codes, pas un menu.** Le site a deux langues ; une liste déroulante
 * pour deux choix est une boîte de dialogue qu'on ouvre pour rien. Les deux
 * codes sont posés côte à côte, séparés d'un filet. C'est aussi le seul
 * dispositif qui dise, sans qu'on l'ouvre, que la seconde langue existe.
 *
 * **Le régime du chrome s'applique** : aucune couleur propre, tout descend de
 * `currentColor` et le `difference` est porté par le groupe de la barre. La
 * langue active se marque donc par la densité, jamais par une teinte — la même
 * règle que le libellé du son.
 *
 * Accessibilité : `hreflang` dit à quelle langue mène chaque lien,
 * `aria-current` marque celle qu'on lit, et chaque lien porte le nom de sa
 * langue **dans sa propre langue** — « English » ne se traduit pas, et c'est
 * précisément ce qui permet à quelqu'un qui ne lit pas le français de le
 * trouver.
 */
export function Langue() {
  const { langue } = useLangue();
  const pathname = usePathname();

  return (
    <div className="langue" role="group" aria-label="Langue / Language">
      {LANGUES.map((code, index) => {
        const actif = langue === code;
        return (
          <span className="langue__cellule" key={code}>
            {index > 0 ? (
              <span className="langue__filet" aria-hidden="true" />
            ) : null}
            <Link
              className="langue__code technique"
              href={memeCheminAutreLangue(pathname, code)}
              hrefLang={code}
              lang={code}
              aria-label={NOM_LANGUE[code]}
              aria-current={actif ? "true" : undefined}
              data-actif={actif}
              /* La langue qu'on lit déjà n'est pas une destination. Elle reste
                 un lien — pour le copier, pour l'ouvrir ailleurs — mais elle ne
                 se survole pas comme un choix. */
              tabIndex={actif ? -1 : undefined}
            >
              {CODE_LANGUE[code]}
            </Link>
          </span>
        );
      })}
    </div>
  );
}
