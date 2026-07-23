import type { Metadata } from "next";
import { Epreuve } from "./Epreuve";

export const metadata: Metadata = {
  title: "Rig",
  robots: { index: false, follow: false, nocache: true },
};

/**
 * L'épreuve du rig. Document interne, non indexé, au même titre que
 * `/styleguide` : il ne fait pas partie du parcours.
 */
export default function EpreuveRig() {
  return (
    <main id="contenu" className="grille py-24">
      <div className="col-span-12 md:col-start-2 md:col-span-9">
        <p className="technique">Rouvière — document interne — non indexé</p>
        <h1 className="display-monument mt-8 text-monument text-craie">Rig</h1>
        <p className="mt-8 max-w-[var(--mesure)] text-corps text-pierre">
          Trois blocs, trois plans WebGL. Le liseré laiton est posé en CSS à
          l&apos;extérieur du bloc, le liseré craie est calculé dans le shader à
          l&apos;intérieur du plan. Les deux traits restent jointifs au
          défilement, au redimensionnement et au zoom navigateur. Le témoin de
          gauche est le même jeton posé en aplat CSS.
        </p>
        <p className="technique mt-8">
          Une scène s&apos;éveille 15 % d&apos;écran avant d&apos;entrer dans le
          cadre — le compteur du panneau tombe à zéro un peu après la sortie
          réelle
        </p>
      </div>

      <div className="col-span-12 mt-24 grid grid-cols-12 gap-x-[var(--gouttiere)]">
        <Epreuve />
      </div>

      <p className="technique col-span-12 md:col-start-2 md:col-span-9">
        Fin de l&apos;épreuve — le compteur de scènes actives doit afficher zéro
      </p>
    </main>
  );
}
