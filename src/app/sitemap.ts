import type { MetadataRoute } from "next";
import { projets } from "@/data/projets";
import { LANGUES } from "@/i18n/langues";

const SITE = "https://rouviere.fr";

/**
 * Le plan du site. Le parcours, les archives, les cinq chambres. Les routes
 * internes (`/rig`, `/styleguide`) n'y figurent pas — elles ne font pas partie
 * du site public.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  /* Chaque page existe dans les deux langues, et chacune se déclare comme
     l alternative de l autre : c est ce qui dit à un moteur qu il regarde une
     même page en deux versions, et non deux contenus concurrents. */
  const alternatives = (route: string) => ({
    languages: Object.fromEntries(
      LANGUES.map((langue) => [langue, `${SITE}/${langue}${route}`]),
    ),
  });

  return LANGUES.flatMap((langue) => [
    {
      url: `${SITE}/${langue}`,
      changeFrequency: "monthly" as const,
      priority: 1,
      alternates: alternatives(""),
    },
    {
      url: `${SITE}/${langue}/archives`,
      changeFrequency: "yearly" as const,
      priority: 0.5,
      alternates: alternatives("/archives"),
    },
    ...projets.map((projet) => ({
      url: `${SITE}/${langue}/projets/${projet.slug}`,
      changeFrequency: "yearly" as const,
      priority: 0.8,
      alternates: alternatives(`/projets/${projet.slug}`),
    })),
  ]);
}
