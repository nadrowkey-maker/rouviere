import { Seuil } from "@/components/chapitres/Seuil";
import { Vestibule } from "@/components/chapitres/Vestibule";
import { Enfilade } from "@/components/chapitres/Enfilade";
import { Matiere } from "@/components/chapitres/Matiere";

/**
 * Le parcours. Une promenade, pas un empilement de sections : chaque chapitre
 * a une direction de mouvement différente du précédent.
 *
 * Seuil (échelle et clip) → Vestibule (agrégation en profondeur) → Enfilade
 * (traversée latérale) → Matière (soulèvement sous la main). L'atelier et la
 * sortie rejoignent ce parcours à la mission suivante.
 */
export default function Parcours() {
  return (
    <main id="contenu">
      <Seuil />
      <Vestibule />
      <Enfilade />
      <Matiere />
    </main>
  );
}
