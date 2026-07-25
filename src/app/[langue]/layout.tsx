import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LANGUES, langueValide, type Langue } from "@/i18n/langues";

/**
 * Le segment de langue.
 *
 * Il ne rend aucun cadre — le layout racine tient déjà les polices, les
 * providers, le canvas et le chrome, et **c'est justement le point** : le
 * segment de langue vit *sous* lui, donc changer de langue ne démonte ni le
 * contexte WebGL, ni le logotype, ni le contexte audio. Un layout par langue
 * les recréerait à chaque bascule.
 *
 * Son travail est ailleurs : valider le segment, produire les métadonnées dans
 * la bonne langue, et déclarer les deux versions l'une à l'autre.
 */

export function generateStaticParams(): Array<{ langue: Langue }> {
  return LANGUES.map((langue) => ({ langue }));
}

/** Tout segment qui n'est pas une langue connue est un 404, pas un repli. */
export const dynamicParams = false;

const META: Record<Langue, { titre: string; description: string }> = {
  fr: {
    titre: "Rouvière — atelier d'architecture d'intérieur",
    description:
      "Atelier d'architecture d'intérieur fondé en 2011 par Camille Rouvière. Cinq à sept chantiers par an. 14 rue de Beaune, Paris VIIᵉ.",
  },
  en: {
    titre: "Rouvière — interior architecture studio",
    description:
      "Interior architecture studio founded in 2011 by Camille Rouvière. Five to seven projects a year. 14 rue de Beaune, Paris VII.",
  },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ langue: string }>;
}): Promise<Metadata> {
  const { langue: brut } = await params;
  const langue = langueValide(brut);
  const { titre, description } = META[langue];

  return {
    title: { default: titre, template: "%s — Rouvière" },
    description,
    openGraph: { locale: langue === "fr" ? "fr_FR" : "en_GB", title: titre, description },
    alternates: {
      canonical: `/${langue}`,
      /* Les deux versions se déclarent l'une l'autre : c'est ce qui dit à un
         moteur qu'elles sont la même page, et non deux contenus concurrents. */
      languages: { fr: "/fr", en: "/en", "x-default": "/fr" },
    },
  };
}

export default async function LayoutLangue({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ langue: string }>;
}) {
  const { langue } = await params;
  if (!LANGUES.includes(langue as Langue)) notFound();
  return children;
}
