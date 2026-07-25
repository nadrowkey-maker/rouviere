import type { Metadata } from "next";
import { variablesPolices } from "@/lib/fonts";
import { LangueProvider } from "@/i18n/LangueProvider";
import { MotionProvider } from "@/components/motion/MotionProvider";
import { LenisProvider } from "@/components/motion/LenisProvider";
import { RigProvider } from "@/components/gl/Rig";
import { PanneauDebug } from "@/components/gl/PanneauDebug";
import { LogoProvider } from "@/components/chrome/LogoProvider";
import { Logo } from "@/components/chrome/Logo";
import { SonProvider } from "@/components/chrome/SonProvider";
import { VideoProjetProvider } from "@/components/chrome/VideoProjet";
import { OuvertureProvider } from "@/components/chrome/Ouverture";
import { ChromeProvider } from "@/components/chrome/ChromeProvider";
import { Chrome } from "@/components/chrome/Chrome";
import "@/styles/base.css";

/**
 * Décide, avant la première peinture et sans attendre React, si le seuil doit
 * jouer : oui tant que la session ne l'a pas vu. La classe posée ici commande
 * le placement du logo et l'affichage de l'overlay en CSS pur — c'est ce qui
 * garantit qu'un rechargement ne fait pas clignoter l'intro.
 */
const SCRIPT_SEUIL = `try{if(sessionStorage.getItem('rouviere:seuil-vu')!=='1')document.documentElement.classList.add('seuil-a-jouer')}catch(e){}`;

/**
 * Pose `lang` sur le document avant la première peinture, d'après le segment
 * d'URL.
 *
 * Le layout racine vit **au-dessus** du segment de langue — c'est ce qui permet
 * au canvas, au logotype et au contexte audio de survivre à un changement de
 * langue — et il ne peut donc pas connaître ce segment au rendu. Le contenu,
 * lui, est bien servi dans la bonne langue : les composants clients lisent le
 * paramètre de route, y compris au rendu serveur.
 *
 * Il ne reste que cet attribut-là à rattraper, et il compte : c'est lui qui fait
 * changer de voix un lecteur d'écran et qui cale la césure typographique. Une
 * ligne lue dans l'adresse suffit, et elle court avant tout affichage.
 */
const SCRIPT_LANGUE = `try{var l=location.pathname.split('/')[1];if(l==='fr'||l==='en')document.documentElement.lang=l}catch(e){}`;

export const metadata: Metadata = {
  metadataBase: new URL("https://rouviere.fr"),
  title: {
    default: "Rouvière — atelier d'architecture d'intérieur",
    template: "%s — Rouvière",
  },
  description:
    "Atelier d'architecture d'intérieur fondé en 2011 par Camille Rouvière. Cinq à sept chantiers par an. 14 rue de Beaune, Paris VIIᵉ.",
  openGraph: {
    type: "website",
    locale: "fr_FR",
    siteName: "Rouvière",
  },
  /* La carte de partage — l'image vient de `opengraph-image.tsx`, reprise par X
     à défaut d'image propre. */
  twitter: {
    card: "summary_large_image",
  },
  alternates: {
    canonical: "/",
  },
};

/**
 * Le layout racine tient ce qui ne se démonte jamais : les polices, les
 * providers de mouvement, le canvas du rig. Seul le contenu du chapitre
 * change à la navigation.
 */
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    /* `suppressHydrationWarning` porte sur ce seul nœud : React ne l'applique
       qu'aux attributs de l'élément marqué, jamais à ses descendants. Il est
       ici parce que `SCRIPT_SEUIL` ajoute `seuil-a-jouer` à la classe de
       <html> avant l'hydratation, ce que le serveur ne peut pas prédire — la
       session n'existe que côté client. Les deux autres attributs, `lang` et
       `variablesPolices`, sont des constantes de build : ils sont identiques
       des deux côtés, et rien d'autre ne doit être ajouté ici sans l'être
       aussi au rendu serveur. */
    <html lang="fr" className={variablesPolices} suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_SEUIL }} />
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_LANGUE }} />
        <a className="evitement" href="#contenu">
          Aller au contenu
        </a>
        {/* La langue enveloppe tout : le chrome comme les chapitres en
            dépendent, et elle ne doit jamais se remonter. */}
        <LangueProvider>
        <MotionProvider>
          <LenisProvider>
            <RigProvider>
              <LogoProvider>
                <SonProvider>
                  {/* Le flux d'un projet : un unique nœud vidéo, monté ici et
                      jamais démonté, que le menu et la chambre se passent sans
                      couper la lecture. Même parti que le logotype. */}
                  <VideoProjetProvider>
                    {/* L'ouverture d'un projet depuis le couloir : elle doit
                        survivre au changement de route, donc elle vit ici. */}
                    <OuvertureProvider>
                      <ChromeProvider>
                        <Logo />
                        <Chrome />
                        {/* La surface qui recule derrière le menu : c'est le
                            document lui-même, d'où le wrapper. Le canvas et le
                            chrome vivent dehors et ne reculent pas. */}
                        <div className="scene-page" id="scene-page">
                          {children}
                        </div>
                        {process.env.NODE_ENV === "development" ? (
                          <PanneauDebug />
                        ) : null}
                      </ChromeProvider>
                    </OuvertureProvider>
                  </VideoProjetProvider>
                </SonProvider>
              </LogoProvider>
            </RigProvider>
          </LenisProvider>
        </MotionProvider>
        </LangueProvider>
      </body>
    </html>
  );
}
