import type { Metadata } from "next";
import { Archives } from "@/components/chapitres/Archives";

export const metadata: Metadata = {
  title: "Archives",
  description:
    "Le corps de l'atelier Rouvière depuis 2011 — projet, lieu, année. Une liste, sans images.",
  openGraph: {
    title: "Archives — Rouvière",
    description:
      "Le corps de l'atelier Rouvière depuis 2011 — projet, lieu, année. Une liste, sans images.",
    type: "website",
  },
};

export default function PageArchives() {
  return (
    <main id="contenu">
      <Archives />
    </main>
  );
}
