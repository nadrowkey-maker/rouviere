import type { Metadata } from "next";
import { ValeurCss } from "./ValeurCss";
import "./styleguide.css";

export const metadata: Metadata = {
  title: "Système",
  robots: { index: false, follow: false, nocache: true },
};

type Jeton = { nom: string; variable: string; usage: string };

const grisDeParis: Jeton[] = [
  {
    nom: "Encre",
    variable: "--color-encre",
    usage: "Fond du site au repos. Zinc à l'ombre, sous-ton bleu. Régime unique.",
  },
  {
    nom: "Plomb",
    variable: "--color-plomb",
    usage: "Ciel de novembre. Séparations, liserés éteints, second plan.",
  },
  {
    nom: "Zinc",
    variable: "--color-zinc",
    usage: "Toiture. Couche technique, légendes, texte de second rang.",
  },
  {
    nom: "Pierre",
    variable: "--color-pierre",
    usage: "Pierre de taille lavée. Aplats retenus, repères de grille.",
  },
  {
    nom: "Craie",
    variable: "--color-craie",
    usage: "Enduit sec. Texte courant sur l'encre. Jamais un crème chaud.",
  },
];

const mondes: Jeton[] = [
  {
    nom: "Sel",
    variable: "--color-sel",
    usage: "Villa Ostréa. Nacre, gris perle, eau.",
  },
  {
    nom: "Laque",
    variable: "--color-laque",
    usage: "Hôtel Sévigné. Rouge profond.",
  },
  {
    nom: "Ocre",
    variable: "--color-ocre",
    usage: "Maison Cyprès. Terre de Sienne.",
  },
  {
    nom: "Vert Paris",
    variable: "--color-vert-paris",
    usage: "Appartement Cinq Heures.",
  },
  {
    nom: "Outremer",
    variable: "--color-outremer",
    usage: "La Bergerie.",
  },
];

const metal: Jeton[] = [
  {
    nom: "Laiton",
    variable: "--color-laiton",
    usage: "Liserés fins, focus clavier, sélection. Jamais un aplat.",
  },
];

const courbes = [
  {
    nom: "Sortie",
    variable: "--ease-sortie",
    usage: "Out-expo. Entrées d'objets : une image, un titre qui arrive.",
  },
  {
    nom: "Douce",
    variable: "--ease-douce",
    usage: "In-out. Déplacements d'un point à un autre.",
  },
  {
    nom: "Sèche",
    variable: "--ease-seche",
    usage: "Micro-interactions : survol, curseur, focus.",
  },
];

const durees = [
  { nom: "Micro", variable: "--duree-micro", usage: "Survol, curseur, focus." },
  {
    nom: "Objet",
    variable: "--duree-objet",
    usage: "Une image, un titre qui arrive.",
  },
  {
    nom: "Chapitre",
    variable: "--duree-chapitre",
    usage: "Un changement de monde.",
  },
];

function Nuancier({ titre, jetons }: { titre: string; jetons: Jeton[] }) {
  return (
    <div className="mb-12">
      <p className="technique mb-4">{titre}</p>
      <ul className="grid grid-cols-1 gap-6 md:grid-cols-5">
        {jetons.map((jeton) => (
          <li key={jeton.variable}>
            <div
              className="h-24 w-full border border-plomb"
              style={{ backgroundColor: `var(${jeton.variable})` }}
            />
            <p className="mt-2 text-corps text-craie">{jeton.nom}</p>
            <p className="technique mt-1">{jeton.variable}</p>
            <ValeurCss jeton={jeton.variable} />
            <p className="mt-2 max-w-[34ch] text-corps text-zinc">
              {jeton.usage}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Section({
  titre,
  legende,
  children,
}: {
  titre: string;
  legende: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-plomb pt-8 pb-24">
      <div className="mb-12">
        <h2 className="display text-titre text-craie">{titre}</h2>
        <p className="technique mt-4">{legende}</p>
      </div>
      {children}
    </section>
  );
}

export default function Styleguide() {
  return (
    <main id="contenu" className="grille py-24">
      <div className="col-span-12 md:col-start-2 md:col-span-10">
        <p className="technique">Rouvière — document interne — non indexé</p>
        <h1 className="display-monument mt-8 text-monument text-craie">
          Système
        </h1>
        <p className="mt-8 max-w-[var(--mesure)] text-corps text-pierre">
          Toute valeur affichée ici est lue dans tokens.css au moment du rendu.
          Rien n&apos;est recopié. Si une couleur manque à cette page, elle
          n&apos;existe pas dans le site.
        </p>

        <div className="mt-24">
          <Section
            titre="Couleur"
            legende="Les gris portent 90 % de la surface — les mondes prennent l'écran entier"
          >
            <Nuancier titre="Les gris de Paris" jetons={grisDeParis} />
            <Nuancier
              titre="Les mondes — un par projet, jamais en accent"
              jetons={mondes}
            />
            <Nuancier titre="Métal" jetons={metal} />
          </Section>

          <Section
            titre="Typographie"
            legende="Deux familles. Gambetta en display, Switzer pour tout le reste"
          >
            <div className="mb-16">
              <p className="technique mb-6">
                Gambetta — voix éditoriale — jamais sous 40 px
              </p>
              <p className="technique mb-2">--text-monument · -0.03em</p>
              <p className="display-monument mb-12 text-monument text-craie">
                Sel
              </p>
              <p className="technique mb-2">--text-titre · -0.015em</p>
              <p className="display mb-12 text-titre text-craie">
                Villa Ostréa, Cap-Ferret
              </p>
              <p className="technique mb-2">
                --text-chapo · --text-corps · --text-technique — interdits en
                Gambetta : la famille display s&apos;arrête à 40 px
              </p>
            </div>

            <div>
              <p className="technique mb-6">
                Switzer — corps, navigation, légendes, couche technique
              </p>
              <p className="technique mb-2">--text-chapo</p>
              <p className="mb-12 max-w-[var(--mesure)] text-chapo text-craie">
                Le pin maritime est brûlé sur place, à la flamme, puis brossé et
                huilé.
              </p>
              <p className="technique mb-2">--text-corps · mesure 58 signes</p>
              <p className="mb-12 max-w-[var(--mesure)] text-corps text-craie">
                Les sols sont en béton de chaux, coulés en une seule journée,
                sans joint de fractionnement : la fissure viendra, elle est
                prévue. Le bassin de nage longe la façade sud sur vingt-deux
                mètres.
              </p>
              <p className="technique mb-2">--text-technique · +0.14em</p>
              <p className="technique">
                Cap-Ferret · 44°38&apos;N 1°14&apos;W · 620 m² · Livraison juin
                2024 · Chaux ferrée / pin brûlé
              </p>
            </div>
          </Section>

          <Section
            titre="Grille"
            legende="Douze colonnes · gouttière 24 px · marge clamp(1.5rem, 4vw, 5rem) · ligne de base 8 px"
          >
            <div className="sg-colonnes">
              {Array.from({ length: 12 }, (_, index) => (
                <div key={index} className="sg-colonne">
                  <span className="technique">C{index + 1}</span>
                </div>
              ))}
            </div>
            <p className="mt-6 max-w-[var(--mesure)] text-corps text-zinc">
              Rien n&apos;est centré. Le texte se cale colonne 2, l&apos;image
              déborde à droite, la légende décroche dans la marge. Une image sur
              trois sort du cadre.
            </p>
          </Section>

          <Section
            titre="Mouvement"
            legende="Trois courbes, trois durées — le déplacement dure --duree-objet, les temps d'arrêt encadrent"
          >
            <ul className="mb-16 grid grid-cols-1 gap-12 md:grid-cols-3">
              {courbes.map((courbe) => (
                <li key={courbe.variable}>
                  <p className="technique mb-4">{courbe.nom}</p>
                  <div className="sg-piste">
                    <div
                      className="sg-carre"
                      style={{ animationTimingFunction: `var(${courbe.variable})` }}
                    />
                  </div>
                  <p className="technique mt-4">{courbe.variable}</p>
                  <ValeurCss jeton={courbe.variable} />
                  <p className="mt-2 text-corps text-zinc">{courbe.usage}</p>
                </li>
              ))}
            </ul>

            <div>
              <p className="technique mb-4">Durées</p>
              <ul className="grid grid-cols-1 gap-6 md:grid-cols-3">
                {durees.map((duree) => (
                  <li key={duree.variable} className="border-t border-plomb pt-4">
                    <p className="text-corps text-craie">{duree.nom}</p>
                    <p className="technique mt-1">{duree.variable}</p>
                    <ValeurCss jeton={duree.variable} />
                    <p className="mt-2 text-corps text-zinc">{duree.usage}</p>
                  </li>
                ))}
              </ul>
              <p className="mt-8 max-w-[var(--mesure)] text-corps text-zinc">
                Aucune durée entre 0,30 s et 0,55 s sur un mouvement de grande
                amplitude. En dessous on est vif, au-dessus on est ample ; entre
                les deux on est médiocre.
              </p>
            </div>
          </Section>
        </div>
      </div>
    </main>
  );
}
