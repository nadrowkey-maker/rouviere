"use client";

import { useEffect } from "react";

/**
 * Le filet du layout racine.
 *
 * `error.tsx` (dans `[langue]/`) n'attrape rien de ce qui casse **au-dessus**
 * de lui : les providers du layout racine — son, mouvement, défilement,
 * canvas WebGL — vivent tous là. Une exception levée à leur montage ou à leur
 * premier rendu ne peut être attrapée que par `global-error.tsx`, le seul
 * fichier spécial de Next.js qui vaille pour le layout racine lui-même.
 *
 * Il doit redéclarer `<html>` et `<body>` : il remplace tout, y compris le
 * layout qui les posait.
 */
export default function ErreurGlobale({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[rouviere] erreur globale (layout racine) :", error);
  }, [error]);

  return (
    <html lang="fr">
      <body>
        <div
          style={{
            minHeight: "100svh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "1rem",
            padding: "2rem",
            textAlign: "center",
            fontFamily: "monospace",
            background: "#0b0b0b",
            color: "#f2f2f2",
          }}
        >
          <p style={{ fontSize: "1rem", opacity: 0.8 }}>
            Une erreur est survenue au chargement du site.
          </p>
          <pre
            style={{
              maxWidth: "90vw",
              maxHeight: "50vh",
              overflow: "auto",
              textAlign: "left",
              fontSize: "0.75rem",
              lineHeight: 1.4,
              background: "#1a1a1a",
              border: "1px solid #333",
              borderRadius: "8px",
              padding: "1rem",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
          >
            {error.name}: {error.message}
            {error.digest ? `\ndigest: ${error.digest}` : ""}
            {error.stack ? `\n\n${error.stack}` : ""}
          </pre>
          <button
            onClick={reset}
            style={{
              padding: "0.6rem 1.2rem",
              fontSize: "0.9rem",
              borderRadius: "999px",
              border: "1px solid #f2f2f2",
              background: "transparent",
              color: "#f2f2f2",
              cursor: "pointer",
            }}
          >
            Réessayer
          </button>
        </div>
      </body>
    </html>
  );
}
