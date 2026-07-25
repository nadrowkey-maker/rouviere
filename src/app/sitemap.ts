import type { MetadataRoute } from "next";
import { projets } from "@/data/projets";

const SITE = "https://rouviere.fr";

/**
 * Le plan du site. Le parcours, les archives, les cinq chambres. Les routes
 * internes (`/rig`, `/styleguide`) n'y figurent pas — elles ne font pas partie
 * du site public.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const chambres: MetadataRoute.Sitemap = projets.map((projet) => ({
    url: `${SITE}/projets/${projet.slug}`,
    changeFrequency: "yearly",
    priority: 0.8,
  }));

  return [
    { url: SITE, changeFrequency: "monthly", priority: 1 },
    { url: `${SITE}/archives`, changeFrequency: "yearly", priority: 0.5 },
    ...chambres,
  ];
}
