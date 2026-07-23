import type { Metadata } from "next";
import { variablesPolices } from "@/lib/fonts";
import "@/styles/base.css";

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

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" className={variablesPolices}>
      <body>
        <a className="evitement" href="#contenu">
          Aller au contenu
        </a>
        {children}
      </body>
    </html>
  );
}
