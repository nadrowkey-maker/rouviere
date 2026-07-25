import { ImageResponse } from "next/og";

/**
 * Le rendu des images de partage — 1200×630, par `next/og`.
 *
 * Une image serveur ne lit ni CSS ni `var()` : les jetons de `tokens.css` sont
 * donc recopiés ici en hexadécimal. C'est le **seul** endroit du site où une
 * couleur est écrite hors de `tokens.css`, et c'est une nécessité de la
 * mécanique de `next/og`, pas une dérive — toute modification d'un jeton doit
 * être reportée là.
 *
 * La police est celle que `next/og` embarque (Noto Sans, sous-ensemble latin) :
 * un grotesque neutre, proche de la voix Switzer du site, et qui porte les
 * accents français (È, é, è). Gambetta n'existe qu'en `.woff2`, format que le
 * moteur de rendu de `next/og` ne sait pas décompresser — la carte de partage
 * parle donc la voix technique du site, pas sa voix éditoriale. C'est un choix
 * tenu, pas un défaut : rien n'est centré, la couche technique est là, et le
 * monde chromatique entre par la droite.
 */

export const OG_COULEURS = {
  encre: "#0d1216",
  plomb: "#2a3238",
  zinc: "#767f85",
  pierre: "#b4b0a6",
  craie: "#e7e5de",
  laiton: "#9a7b4f",
  sel: "#a8b8bc",
  ambre: "#8a5a22",
  paon: "#0f4c5c",
  prairie: "#5b7327",
  jade: "#155e4c",
  nuit: "#17325c",
} as const;

export type MondeOG = keyof typeof OG_COULEURS;

export const OG_TAILLE = { width: 1200, height: 630 } as const;
export const OG_TYPE = "image/png" as const;

type OptionsOG = {
  /** Le monde chromatique, s'il y en a un : il entre par une bande à droite. */
  monde?: MondeOG | null;
  /** La ligne technique du haut, en petites capitales. */
  surtitre: string;
  /** Le grand titre, en craie. */
  titre: string;
  /** La ligne sous le titre, en pierre : lieu, année. Facultative. */
  sousTitre?: string;
  /** La couche technique du bas, en petites capitales. */
  technique: string;
};

const CADRE = 76;

export function imageOG({
  monde = null,
  surtitre,
  titre,
  sousTitre,
  technique,
}: OptionsOG) {
  const teinteMonde = monde === null ? null : OG_COULEURS[monde];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "row",
          backgroundColor: OG_COULEURS.encre,
          color: OG_COULEURS.craie,
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: `${CADRE}px`,
          }}
        >
          {/* Haut : la couche technique, décrochée à gauche. */}
          <div
            style={{
              display: "flex",
              fontSize: 22,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: OG_COULEURS.zinc,
            }}
          >
            {surtitre}
          </div>

          {/* Milieu : le titre, calé à gauche, jamais centré. */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                display: "flex",
                fontSize: titre.length > 16 ? 96 : 132,
                lineHeight: 1,
                letterSpacing: "0.02em",
                color: OG_COULEURS.craie,
              }}
            >
              {titre}
            </div>
            {sousTitre === undefined ? null : (
              <div
                style={{
                  display: "flex",
                  marginTop: 24,
                  fontSize: 30,
                  color: OG_COULEURS.pierre,
                }}
              >
                {sousTitre}
              </div>
            )}
          </div>

          {/* Bas : la couche technique, la donnée brute. */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
            }}
          >
            <div
              style={{
                width: 40,
                height: 1,
                backgroundColor: OG_COULEURS.laiton,
              }}
            />
            <div
              style={{
                display: "flex",
                fontSize: 20,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: OG_COULEURS.zinc,
              }}
            >
              {technique}
            </div>
          </div>
        </div>

        {/* Le monde entre par la droite — un aplat plein, jamais un accent.
            Sans monde, un liseré de laiton tient le bord. */}
        {teinteMonde === null ? (
          <div style={{ width: 6, backgroundColor: OG_COULEURS.laiton }} />
        ) : (
          <div style={{ width: 132, backgroundColor: teinteMonde }} />
        )}
      </div>
    ),
    { ...OG_TAILLE },
  );
}
