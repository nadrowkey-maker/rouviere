import { imageOG, OG_TAILLE, OG_TYPE } from "@/lib/og";

export const alt = "Rouvière — atelier d'architecture d'intérieur";
export const size = OG_TAILLE;
export const contentType = OG_TYPE;

/** La carte de partage du site. Encre, wordmark, couche technique. */
export default function Image() {
  return imageOG({
    surtitre: "Atelier d'architecture d'intérieur — Paris VIIe",
    titre: "ROUVIÈRE",
    technique: "14 rue de Beaune · cinq chantiers par an · fondé 2011",
  });
}
