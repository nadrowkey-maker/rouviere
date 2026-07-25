import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { projets, projetParSlug } from "@/data/projets";
import { Chambre } from "@/components/chapitres/Chambre";

type Params = { params: Promise<{ slug: string }> };

/** Les cinq chambres sont connues à la compilation : elles sont statiques. */
export function generateStaticParams() {
  return projets.map((projet) => ({ slug: projet.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const projet = projetParSlug(slug);
  if (projet === undefined) return {};

  const description = `${projet.programme} ${projet.surface} m², ${projet.lieu}, ${projet.annee}.`;

  return {
    title: projet.nom,
    description,
    openGraph: {
      title: `${projet.nom} — Rouvière`,
      description,
      type: "article",
    },
  };
}

export default async function Page({ params }: Params) {
  const { slug } = await params;
  const projet = projetParSlug(slug);
  if (projet === undefined) notFound();

  /* JSON-LD : l'œuvre et son auteur. Les données sont celles de la fiche —
     aucune duplication, aucune valeur inventée pour le moteur. */
  const donnees = {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: projet.nom,
    dateCreated: String(projet.annee),
    locationCreated: { "@type": "Place", name: projet.lieu },
    material: projet.matieres,
    description: projet.programme,
    creator: {
      "@type": "Organization",
      name: "Rouvière",
      address: {
        "@type": "PostalAddress",
        streetAddress: "14 rue de Beaune",
        addressLocality: "Paris",
        postalCode: "75007",
        addressCountry: "FR",
      },
    },
  };

  return (
    <main id="contenu">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(donnees) }}
      />
      <Chambre projet={projet} />
    </main>
  );
}
