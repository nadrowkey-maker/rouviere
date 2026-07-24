import { Seuil } from "@/components/chapitres/Seuil";
import { Vestibule } from "@/components/chapitres/Vestibule";
import { Enfilade } from "@/components/chapitres/Enfilade";
import { Matiere } from "@/components/chapitres/Matiere";
import { Atelier } from "@/components/chapitres/Atelier";
import { Sortie } from "@/components/chapitres/Sortie";

/**
 * Le parcours. Une promenade, pas un empilement de sections : chaque chapitre
 * a une direction de mouvement différente du précédent.
 *
 * Seuil (échelle et clip) → Vestibule (agrégation en profondeur) → Enfilade
 * (traversée latérale) → Matière (soulèvement sous la main) → Atelier
 * (pivotement en profondeur) → Sortie (réfraction). Les Archives vivent sur
 * leur propre route, atteinte par le menu.
 */
export default function Parcours() {
  return (
    <main id="contenu">
      <Seuil />
      <Vestibule />
      <Enfilade />
      <Matiere />
      <Atelier />
      <Sortie />
    </main>
  );
}
