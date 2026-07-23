"use client";

import { useEffect, useState } from "react";

/**
 * Lit la valeur calculée d'un jeton sur `<html>`.
 *
 * Le styleguide ne recopie aucune valeur : il interroge tokens.css. C'est ce
 * qui garantit qu'aucune couleur du site n'existe en dehors de tokens.css,
 * y compris sur la page qui les documente.
 */
export function ValeurCss({ jeton }: { jeton: string }) {
  const [valeur, setValeur] = useState<string>("");

  useEffect(() => {
    const lue = getComputedStyle(document.documentElement)
      .getPropertyValue(jeton)
      .trim();
    setValeur(lue);
  }, [jeton]);

  return (
    <span className="technique" suppressHydrationWarning>
      {valeur || " "}
    </span>
  );
}
