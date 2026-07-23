import { Seuil } from "@/components/chapitres/Seuil";
import { Vestibule } from "@/components/chapitres/Vestibule";
import { Enfilade } from "@/components/chapitres/Enfilade";

/**
 * Le parcours. Une promenade, pas un empilement de sections : chaque chapitre
 * a une direction de mouvement différente du précédent.
 *
 * Seuil (échelle et clip) → Vestibule (agrégation en profondeur) → les
 * chapitres suivants sont montés par les missions à venir.
 */
export default function Parcours() {
  return (
    <main id="contenu">
      <Seuil />
      <Vestibule />
      <Enfilade />
    </main>
  );
}
