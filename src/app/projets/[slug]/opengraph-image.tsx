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
    surtitre: `Rouvière — ${projet.nomMonde}`,
    titre: projet.nom,
    sousTitre: `${projet.lieu} · ${projet.annee}`,
    technique: `${projet.coordonnees} · ${projet.surface} m² · ${projet.matieres.join(" / ")}`,
  });
}
