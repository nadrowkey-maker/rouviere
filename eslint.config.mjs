import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({ baseDirectory: __dirname });

const eslintConfig = [
  {
    // La bibliothèque de références est en lecture seule : on ne la lint pas,
    // on ne la compile pas, on n'y touche pas.
    ignores: [
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "references/**",
    ],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    // `useEffetVisuel` est notre `useLayoutEffect` : il doit être vérifié
    // comme tel, sinon la moitié des effets du site échappe au contrôle des
    // dépendances.
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "react-hooks/exhaustive-deps": [
        "warn",
        { additionalHooks: "(useEffetVisuel)" },
      ],
    },
  },
  {
    // « Une seule boucle requestAnimationFrame dans tout le projet, portée par
    // le ticker GSAP. Aucun composant n'a le droit d'ouvrir la sienne. »
    // La règle est dans CLAUDE.md ; elle est tenue ici.
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/lib/boucle.ts", "src/lib/gsap.ts"],
    rules: {
      "no-restricted-globals": [
        "error",
        {
          name: "requestAnimationFrame",
          message:
            "Une seule boucle dans le projet : s'abonner à une phase de src/lib/boucle.ts.",
        },
        {
          name: "cancelAnimationFrame",
          message:
            "Une seule boucle dans le projet : voir src/lib/boucle.ts.",
        },
      ],
      "no-restricted-properties": [
        "error",
        {
          object: "window",
          property: "requestAnimationFrame",
          message:
            "Une seule boucle dans le projet : s'abonner à une phase de src/lib/boucle.ts.",
        },
        {
          object: "gsap",
          property: "ticker",
          message:
            "Le ticker n'est branché qu'une fois, dans src/lib/boucle.ts.",
        },
      ],
    },
  },
];

export default eslintConfig;
