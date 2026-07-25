"use client";

import { useSon } from "./SonProvider";
import { useLangue } from "@/i18n/LangueProvider";
import "./son.css";

/**
 * Le bouton de bascule du son. Visible en permanence dans le chrome, comme
 * l'exige la direction artistique : le son ne se cache pas dans un réglage.
 *
 * Trois barres fines. Au repos elles sont couchées ; actives, elles montent en
 * une petite vague (animée en CSS, sans JS par frame). Le libellé reste en
 * couche technique.
 *
 * La confirmation sonore de la bascule n'est pas jouée ici : c'est le provider
 * qui l'émet, au bon moment de part et d'autre du fondu — après la reprise du
 * contexte quand on allume, avant la descente du maître quand on coupe.
 *
 * ## Le troisième état, et pourquoi il existe
 *
 * Le bouton n'affiche pas la préférence de l'utilisateur, il affiche **ce qui
 * sort**. Entre les deux il y a un cas réel, et fréquent au rechargement : le
 * son est voulu, mais le navigateur n'a pas encore accordé l'activation qu'il
 * exige pour laisser démarrer Web Audio. Le bouton disait alors « actif » et
 * mentait — pire, le cliquer *coupait* un son qu'on n'avait jamais entendu.
 *
 * Il montre donc l'attente : les barres restent couchées, le libellé le dit, et
 * un point vient marquer que quelque chose est en suspens. Le clic, lui, est
 * précisément le geste qui manquait — il allume, il ne coupe pas.
 */
export function Son() {
  const { sonActif, sonEnAttente, basculerSon } = useSon();
  const { t } = useLangue();

  const libelle = sonEnAttente
    ? t("sonEnAttente")
    : sonActif
      ? t("sonCouper")
      : t("sonActiver");

  return (
    <button
      type="button"
      className="son"
      onClick={basculerSon}
      /* L'état pressé est celui du son qui sort, pas celui du souhait : en
         attente, le son n'est pas là, et le bouton ne doit pas dire qu'il l'est. */
      aria-pressed={sonActif}
      aria-label={libelle}
      title={libelle}
      data-actif={sonActif}
      data-attente={sonEnAttente}
    >
      <span className="son__barres" aria-hidden="true">
        <span className="son__barre" />
        <span className="son__barre" />
        <span className="son__barre" />
      </span>
      <span className="son__label technique">{t("son")}</span>
    </button>
  );
}
