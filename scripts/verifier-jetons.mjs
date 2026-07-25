/**
 * Réconciliation des jetons : `tokens.css` d'un côté, ce que le JavaScript
 * demande de l'autre.
 *
 * Ce fichier existe à cause d'un bug précis. `--color-sel` était bien déclaré
 * dans `tokens.css`, mais Tailwind v4 n'émet d'un `@theme` que les variables
 * qu'il voit consommées — une utilitaire générée, ou un `var(--…)` trouvé dans
 * une source. Un jeton lu seulement depuis le JavaScript est invisible à cette
 * analyse : il était supprimé de la feuille compilée, `getComputedStyle`
 * rendait la chaîne vide, et le garde-fou de `lireJeton` levait au premier
 * rendu du bassin. Rien dans le typage ne pouvait le voir : côté TypeScript,
 * `"sel"` était un membre parfaitement valide de `NomCouleur`.
 *
 * La vérification tient donc en quatre points, et elle casse la compilation —
 * elle est branchée sur `prebuild` et sur `typecheck` :
 *
 *   1. `tokens.css` déclare bien `@theme static`, la seule forme qui garantit
 *      que tout le bloc part dans la feuille, y compris les jetons que seul le
 *      JS consomme.
 *   2. Tout nom demandé par `lireJeton`, `lireCouleur`, `couleurJeton` ou
 *      `lireDuree` existe dans `tokens.css`.
 *   3. Les unions `NomCouleur` et `NomDuree` correspondent exactement aux
 *      jetons `--color-*` et `--duree-*` déclarés — dans les deux sens. Un
 *      monde ajouté au CSS sans être ouvert au JS est signalé, et l'inverse
 *      aussi.
 *   4. Aucun de ces appels ne se fait à l'évaluation d'un module. Un jeton lu
 *      au chargement du fichier peut l'être avant que la feuille de style ne
 *      soit appliquée ; la lecture appartient à l'initialisation de scène.
 *
 * L'analyse passe par le parseur de TypeScript, pas par des expressions
 * régulières : les shaders sont des littéraux gabarits pleins d'accolades, et
 * seul un vrai arbre syntaxique dit avec certitude si un appel est enveloppé
 * dans une fonction.
 *
 *   node scripts/verifier-jetons.mjs
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const RACINE = join(dirname(fileURLToPath(import.meta.url)), "..");
const TOKENS = join(RACINE, "src", "styles", "tokens.css");
const SOURCES = join(RACINE, "src");
const JETONS_TS = join(RACINE, "src", "lib", "jetons.ts");

/** Les quatre portes d'entrée vers un jeton depuis le JavaScript. */
const LECTEURS = {
  /* Prend la propriété complète ; les trois autres composent un préfixe. */
  lireJeton: "",
  lireCouleur: "--color-",
  couleurJeton: "--color-",
  lireDuree: "--duree-",
};

const anomalies = [];
const signaler = (message) => anomalies.push(message);

// ---------------------------------------------------------------------------
// 1. Ce que `tokens.css` déclare réellement
// ---------------------------------------------------------------------------

const css = readFileSync(TOKENS, "utf8");

if (!/@theme\s+static\b/.test(css)) {
  signaler(
    "tokens.css : le bloc doit être `@theme static`. Sans `static`, Tailwind\n" +
      "  ne garde que les jetons qu'une règle CSS nomme, et ceux que seul le\n" +
      "  JavaScript lit disparaissent silencieusement de la feuille compilée.",
  );
}

/* Les déclarations, et elles seules : `--color-*: initial` est une remise à
   zéro d'échelle Tailwind, pas un jeton — l'astérisque ne passe pas la classe
   de caractères. Le côté droit d'un `var(--x)` non plus, faute de deux-points. */
const declares = new Set();
for (const trouve of css.matchAll(/^\s*(--[a-z0-9-]+)\s*:/gm)) {
  declares.add(trouve[1]);
}

if (declares.size === 0) {
  signaler("tokens.css : aucune déclaration de jeton lue. Fichier déplacé ?");
}

// ---------------------------------------------------------------------------
// 2 et 4. Ce que le code demande, et à quel moment
// ---------------------------------------------------------------------------

/** Tous les `.ts`/`.tsx` de `src`, sans jamais descendre dans `references`. */
function fichiers(racine) {
  const trouves = [];
  for (const entree of readdirSync(racine)) {
    const chemin = join(racine, entree);
    if (statSync(chemin).isDirectory()) {
      trouves.push(...fichiers(chemin));
    } else if (/\.tsx?$/.test(entree)) {
      trouves.push(chemin);
    }
  }
  return trouves;
}

/** Vrai si l'appel est enveloppé dans une fonction — donc différé. */
function dansUneFonction(noeud) {
  for (let p = noeud.parent; p !== undefined; p = p.parent) {
    if (
      ts.isFunctionDeclaration(p) ||
      ts.isFunctionExpression(p) ||
      ts.isArrowFunction(p) ||
      ts.isMethodDeclaration(p) ||
      ts.isConstructorDeclaration(p) ||
      ts.isGetAccessorDeclaration(p) ||
      ts.isSetAccessorDeclaration(p)
    ) {
      return true;
    }
  }
  return false;
}

const demandes = new Map(); // propriété -> [origines]

for (const chemin of fichiers(SOURCES)) {
  const texte = readFileSync(chemin, "utf8");
  const arbre = ts.createSourceFile(
    chemin,
    texte,
    ts.ScriptTarget.Latest,
    /* setParentNodes */ true,
    chemin.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const court = relative(RACINE, chemin).split(sep).join("/");

  const visiter = (noeud) => {
    if (ts.isCallExpression(noeud) && ts.isIdentifier(noeud.expression)) {
      const nom = noeud.expression.text;
      if (Object.hasOwn(LECTEURS, nom)) {
        const ligne =
          arbre.getLineAndCharacterOfPosition(noeud.getStart(arbre)).line + 1;
        const origine = `${court}:${ligne}`;

        /* 4. Une lecture à l'évaluation du module peut précéder la feuille de
           style. Elle doit descendre dans la fabrique de scène. */
        if (!dansUneFonction(noeud)) {
          signaler(
            `${origine} : \`${nom}\` est appelé à l'évaluation du module.\n` +
              "  Un jeton s'y lit peut-être avant que la feuille de style ne\n" +
              "  soit appliquée. Déplacer la lecture dans l'initialisation de\n" +
              "  scène, à l'intérieur de la fabrique.",
          );
        }

        /* 2. Le nom demandé, quand il est littéral. Un argument calculé est
           couvert par le typage, donc par la réconciliation des unions. */
        const arg = noeud.arguments[0];
        if (arg !== undefined && ts.isStringLiteral(arg)) {
          const propriete = `${LECTEURS[nom]}${arg.text}`;
          const liste = demandes.get(propriete);
          if (liste === undefined) demandes.set(propriete, [origine]);
          else liste.push(origine);
        }
      }
    }
    ts.forEachChild(noeud, visiter);
  };
  visiter(arbre);
}

for (const [propriete, origines] of demandes) {
  if (!declares.has(propriete)) {
    signaler(
      `Jeton introuvable : ${propriete}\n` +
        `  demandé par ${origines.join(", ")}\n` +
        "  — absent de src/styles/tokens.css.",
    );
  }
}

// ---------------------------------------------------------------------------
// 3. Les unions de `jetons.ts` face aux jetons déclarés
// ---------------------------------------------------------------------------

const arbreJetons = ts.createSourceFile(
  JETONS_TS,
  readFileSync(JETONS_TS, "utf8"),
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TS,
);

/** Les membres littéraux d'un `type X = "a" | "b"`. */
function union(nomType) {
  let membres = null;
  ts.forEachChild(arbreJetons, (noeud) => {
    if (!ts.isTypeAliasDeclaration(noeud) || noeud.name.text !== nomType) return;
    const branches = ts.isUnionTypeNode(noeud.type)
      ? noeud.type.types
      : [noeud.type];
    membres = branches
      .filter((b) => ts.isLiteralTypeNode(b) && ts.isStringLiteral(b.literal))
      .map((b) => b.literal.text);
  });
  if (membres === null) {
    signaler(`src/lib/jetons.ts : type \`${nomType}\` introuvable.`);
    return [];
  }
  return membres;
}

/** Les deux listes doivent coïncider, sans reste d'aucun côté. */
function reconcilier(nomType, prefixe) {
  const cotedJS = new Set(union(nomType));
  const coteCSS = new Set(
    [...declares]
      .filter((p) => p.startsWith(prefixe))
      .map((p) => p.slice(prefixe.length)),
  );

  for (const nom of cotedJS) {
    if (!coteCSS.has(nom)) {
      signaler(
        `${nomType} accepte "${nom}", mais ${prefixe}${nom} n'existe pas dans\n` +
          "  tokens.css. Le typage laisse donc passer un jeton vide.",
      );
    }
  }
  for (const nom of coteCSS) {
    if (!cotedJS.has(nom)) {
      signaler(
        `${prefixe}${nom} est déclaré dans tokens.css mais absent de\n` +
          `  ${nomType}. Le JavaScript ne peut pas le demander : soit on\n` +
          "  l'ouvre à l'union, soit on le retire du CSS.",
      );
    }
  }
}

reconcilier("NomCouleur", "--color-");
reconcilier("NomDuree", "--duree-");

// ---------------------------------------------------------------------------

if (anomalies.length > 0) {
  console.error(
    `\nJetons — ${anomalies.length} anomalie${anomalies.length > 1 ? "s" : ""} :\n`,
  );
  for (const anomalie of anomalies) console.error(`• ${anomalie}\n`);
  process.exit(1);
}

console.log(
  `Jetons — ${declares.size} déclarés, ${demandes.size} demandés nommément, tout concorde.`,
);
