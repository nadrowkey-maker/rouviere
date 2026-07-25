import type { MetadataRoute } from "next";

const SITE = "https://rouviere.fr";

/**
 * `robots.txt`. Le parcours et les chambres sont ouverts ; les deux routes
 * internes — l'épreuve du rig et le styleguide — sont tenues hors de l'index,
 * comme leur `metadata.robots` le dit déjà page à page. Le plan du site pointe
 * le reste.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/rig", "/styleguide"],
    },
    sitemap: `${SITE}/sitemap.xml`,
  };
}
