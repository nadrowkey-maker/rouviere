import { Seuil } from "@/components/chapitres/Seuil";
import { Vestibule } from "@/components/chapitres/Vestibule";
import { Enfilade } from "@/components/chapitres/Enfilade";
import { Matiere } from "@/components/chapitres/Matiere";
import { Atelier } from "@/components/chapitres/Atelier";
import { Sortie } from "@/components/chapitres/Sortie";

/* JSON-LD de l'atelier. `CreativeWork` vit sur chaque chambre ; `Organization`,
   lui, est sitewide et se pose ici, à la racine du parcours. Toute donnée est
   celle du Livre I — rien d'inventé pour le moteur. */
const ORGANISATION = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Rouvière",
  description:
    "Atelier d'architecture d'intérieur fondé en 2011 par Camille Rouvière. Cinq à sept chantiers par an.",
  url: "https://rouviere.fr",
  foundingDate: "2011",
  founder: { "@type": "Person", name: "Camille Rouvière" },
  address: {
    "@type": "PostalAddress",
    streetAddress: "14 rue de Beaune",
    addressLocality: "Paris",
    postalCode: "75007",
    addressCountry: "FR",
  },
  /* Les mêmes coordonnées inopérantes que la sortie. Les données structurées
     sortent du site — un moteur les recopie, un annuaire les indexe — donc elles
     ne peuvent pas dire autre chose que le pied de page. */
  telephone: "+33100000000",
  email: "contact@exemple-fictif.fr",
};

/**
 * Le parcours. Une promenade, pas un empilement de sections : chaque chapitre
 * a une direction de mouvement différente du précédent.
 *
 * Seuil (extinction sur place) → Vestibule (dévoilement sur place, en sept
 * temps) → Enfilade (traversée latérale) → Matière (ouverture par masque) →
 * Atelier (traversée en échelle, et une plongée) → Sortie (réfraction). Les
 * Archives vivent sur leur propre route, atteinte par le menu.
 */
export default function Parcours() {
  return (
    <main id="contenu">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ORGANISATION) }}
      />
      <Seuil />
      <Vestibule />
      <Enfilade />
      <Matiere />
      <Atelier />
      <Sortie />
    </main>
  );
}
