import type { Metadata } from "next";
import { variablesPolices } from "@/lib/fonts";
import { MotionProvider } from "@/components/motion/MotionProvider";
import { LenisProvider } from "@/components/motion/LenisProvider";
import { RigProvider } from "@/components/gl/Rig";
import { PanneauDebug } from "@/components/gl/PanneauDebug";
import { LogoProvider } from "@/components/chrome/LogoProvider";
import { Logo } from "@/components/chrome/Logo";
import { SonProvider } from "@/components/chrome/SonProvider";
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
    <html lang="fr" className={variablesPolices}>
      <body>
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_SEUIL }} />
        <a className="evitement" href="#contenu">
          Aller au contenu
        </a>
        <MotionProvider>
          <LenisProvider>
            <RigProvider>
              <LogoProvider>
                <SonProvider>
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
                </SonProvider>
              </LogoProvider>
            </RigProvider>
          </LenisProvider>
        </MotionProvider>
      </body>
    </html>
  );
}
