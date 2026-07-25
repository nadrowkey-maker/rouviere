import { redirect } from "next/navigation";
import { LANGUE_PAR_DEFAUT } from "@/i18n/langues";

/**
 * La racine ne rend rien : elle oriente.
 *
 * Chaque page du site vit sous un segment de langue (`/fr`, `/en`) ; `/` n'est
 * qu'une porte. On y arrive par un lien nu, par un signet, par la barre
 * d'adresse — et l'on en repart aussitôt.
 *
 * **La redirection est faite ici et non par un `middleware`**, et c'est un
 * choix de coût : un middleware s'exécute sur chaque requête, y compris pour
 * les quatre mégaoctets de frames du vestibule. Une redirection de page est
 * statique, gratuite, et suffit — le site n'a qu'une seule adresse à orienter.
 *
 * Elle vise le français, langue de l'atelier. La préférence de la visite
 * précédente ne peut pas être lue ici (le serveur ne voit pas `localStorage`) :
 * c'est le chrome qui la relit une fois la page ouverte, et qui propose l'autre
 * langue là où on l'attend.
 */
export default function Racine() {
  redirect(`/${LANGUE_PAR_DEFAUT}`);
}
