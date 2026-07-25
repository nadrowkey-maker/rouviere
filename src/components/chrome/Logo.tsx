"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLogo } from "./LogoProvider";
import { useChrome } from "./ChromeProvider";
import { useLangue } from "@/i18n/LangueProvider";
import { chemin } from "@/i18n/langues";
import { useDefilement } from "@/components/motion/LenisProvider";
import { traverserLeSas } from "./traversee";
import "./logo.css";

/**
 * Le logotype ROUVIÈRE. Un seul nœud, monté dans le layout, jamais démonté.
 *
 * C'est un lien vers l'accueil, en Gambetta capitales — la voix éditoriale. Le
 * mot est d'un seul bloc : plus de découpe lettre par lettre. Le seuil le fait
 * apparaître en générique de film (opacité, échelle, flou sur le mot entier),
 * puis le range dans la barre de navigation par un vol du centre au coin — un
 * geste de bloc, jamais de lettres.
 *
 * La couleur ne vient jamais d'un `fill` ou d'un `color` propre : le blend
 * `difference` (posé en CSS) fait du logo le négatif exact de ce qu'il
 * traverse. Livre V prévoit de remplacer ce texte par un SVG aux tracés
 * aplatis ; le contrat du nœud — un lien, un mot animable, aucun fill — ne
 * changera pas.
 *
 * Sur l'accueil, le clic ne recharge pas la page : il ramène en haut par Lenis,
 * ce qui laisse le hero rejouer sa timeline à l'envers (le voile se lève, la
 * vidéo revient) sans que la séquence d'apparition, elle, ne se rejoue.
 */

export function Logo() {
  const { ref } = useLogo();
  const { t, langue } = useLangue();
  const { lenis } = useDefilement();
  const { menuOuvert, fermerMenu } = useChrome();
  const pathname = usePathname();

  return (
    <Link
      ref={ref}
      className="logo"
      href={chemin(langue)}
      aria-label={t("logoAccueil")}
      onClick={(evenement) => {
        /* Déjà sur l'accueil : pas de navigation, mais pas non plus de
           rembobinage. Remonter neuf écrans en défilement lissé, c'est repasser
           à l'envers dans tout ce qu'on vient de traverser — les masques de la
           Matière, la plongée de l'Atelier, le bassin — pendant plusieurs
           secondes. On passe donc par le sas : l'écran s'éteint, le saut se
           fait dans le noir, l'écran se rallume sur le hero. La séquence
           d'apparition du logo, elle, ne rejoue pas. */
        if (pathname === chemin(langue)) {
          evenement.preventDefault();

          /* **Le menu ouvert, et pourquoi le geste ne marchait pas.**

             Le logotype passe au-dessus du menu (couche 50 contre 45), donc le
             clic arrivait bien. Ce qui n'arrivait pas, c'était le saut : le menu
             a posé `arreter("menu")` en s'ouvrant, et un Lenis arrêté **ignore
             purement et simplement** `scrollTo` — c'est le sens de son verrou.
             On cliquait, l'écran s'éteignait, se rallumait, et on était toujours
             au même endroit, toujours dans le menu.

             D'où les deux corrections. `force: true` fait passer le saut malgré
             le verrou : c'est déjà ce que fait `LenisProvider` au changement de
             route, pour exactement la même raison. Et le menu se ferme, sans
             animation — sa surface n'a rien à montrer, celle du sas est
             au-dessus d'elle et tout se joue derrière le noir. */
          if (menuOuvert) fermerMenu(true, true);

          traverserLeSas(() => {
            if (lenis !== null) {
              lenis.scrollTo(0, { immediate: true, force: true });
            } else {
              scrollTo({ top: 0, behavior: "auto" });
            }
          });
        }
      }}
    >
      <span className="logo__mot" aria-hidden="true">
        ROUVIÈRE
      </span>
    </Link>
  );
}
