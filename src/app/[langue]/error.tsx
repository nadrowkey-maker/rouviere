"use client";

import { useEffect } from "react";

/**
 * Le filet du segment de page.
 *
 * Il attrape toute exception levée par un chapitre, une donnée, un rendu —
 * tout ce qui vit *sous* le layout racine. Le canvas du rig, le son, le
 * chrome restent montés : seul le contenu de la page est remplacé.
 *
 * Il ne se contente pas d'un message poli : tant que la cause précise du bug
 * iPad n'est pas connue, il faut voir l'erreur réelle — message et pile —
 * directement sur l'appareil qui plante, sans passer par un Mac et Safari
 * distant. Une fois la cause identifiée et corrigée, ce panneau peut se
 * simplifier ou disparaître.
 */
export default function Erreur({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Visible aussi dans la console, pour qui a un inspecteur sous la main.
    console.error("[rouviere] erreur de segment :", error);
  }, [error]);

  return (
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
        Une erreur est survenue en chargeant cette page.
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
  );
}
