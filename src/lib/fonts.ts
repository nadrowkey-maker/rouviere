import localFont from "next/font/local";

/**
 * Deux familles. Pas trois.
 *
 * Gambetta est la voix éditoriale, uniquement en display, jamais sous 40 px.
 * `display: "block"` et non `swap` : un échange de police à chaud produit un
 * saut visible sur le seuil. Le repli est ajusté métriquement par next/font,
 * qui lit les métriques du fichier et pose le `size-adjust` correspondant.
 */
export const gambetta = localFont({
  src: [
    {
      path: "../../public/fonts/Gambetta-Variable.woff2",
      weight: "300 700",
      style: "normal",
    },
    {
      path: "../../public/fonts/Gambetta-VariableItalic.woff2",
      weight: "300 700",
      style: "italic",
    },
  ],
  variable: "--police-gambetta",
  display: "block",
  preload: true,
  fallback: ["Times New Roman", "serif"],
  adjustFontFallback: "Times New Roman",
});

/**
 * Switzer tient tout le reste : corps, navigation, légendes, couche technique.
 */
export const switzer = localFont({
  src: [
    {
      path: "../../public/fonts/Switzer-Variable.woff2",
      weight: "100 900",
      style: "normal",
    },
  ],
  variable: "--police-switzer",
  display: "swap",
  preload: true,
  fallback: ["Arial", "sans-serif"],
  adjustFontFallback: "Arial",
});

/**
 * Les deux variables CSS à poser sur `<html>`. Chacune porte déjà la pile
 * complète — police réelle, repli ajusté, générique — telle que next/font la
 * compose au build ; `tokens.css` se contente de les lire.
 */
export const variablesPolices = [gambetta.variable, switzer.variable].join(" ");
