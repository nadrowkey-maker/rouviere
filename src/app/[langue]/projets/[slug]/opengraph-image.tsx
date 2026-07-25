import { projets, projetParSlug } from "@/data/projets";
import { imageOG, OG_TAILLE, OG_TYPE, type MondeOG } from "@/lib/og";

export const alt = "Projet Rouvière";
export const size = OG_TAILLE;
export const contentType = OG_TYPE;

/** Une carte par chambre, connue à la compilation. */
export function generateStaticParams() {
  return projets.map((projet) => ({ slug: projet.slug }));
}

/** La carte de partage d'un projet : son monde chromatique entre par la droite. */
export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const projet = projetParSlug(slug);

  if (projet === undefined) {
    return imageOG({
      surtitre: "Rouvière",
      titre: "ROUVIÈRE",
      technique: "14 rue de Beaune · Paris VIIe",
    });
  }

  return imageOG({
    monde: projet.monde as MondeOG,
    surtitre: `Rouvière — ${projet.nomMonde.fr}`,
    titre: projet.nom,
    sousTitre: `${projet.lieu} · ${projet.annee}`,
    /* L'image de partage est rendue au build, hors de tout contexte client :
       elle ne connaît pas la langue du visiteur et reste donc dans celle de
       l'atelier. C'est la contrepartie assumée d'une langue tenue côté client
       (voir `i18n/langues.ts`). */
    technique: `${projet.coordonnees} · ${projet.surface} m² · ${projet.matieres.fr.join(" / ")}`,
  });
}
