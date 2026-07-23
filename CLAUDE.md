# CLAUDE.md — Projet ROUVIÈRE

Ce fichier est la constitution du projet. Elle ne se renégocie pas.
Le brief de production (parcours écran par écran, casting des effets, missions,
actifs, contrôle final) est dans `docs/brief.md` — le lire quand une mission y renvoie.

---

# LIVRE I — LA CONSTITUTION
### (contenu de `CLAUDE.md`)

## Le client

**ROUVIÈRE** — atelier d'architecture d'intérieur, 14 rue de Beaune, Paris VII<sup>e</sup>, fondé en 2011 par **Camille Rouvière**.

Cinq à sept chantiers par an, jamais plus. Villas et hôtels particuliers, budgets à sept chiffres, clients qui n'apparaissent nulle part. L'atelier ne fait pas de commercial, ne fait pas d'hôtellerie, ne publie pas dans la presse déco. Le site est le seul point de contact public : il ne vend pas, il donne à voir. Un visiteur qui arrive ici sait déjà qui est Rouvière, ou n'a rien à y faire.

**Ce que dit Camille Rouvière :** « Je ne décore pas. Je règle la lumière, la matière et le silence. Le reste appartient aux gens qui vivent là. »

Cette phrase est le seul manifeste du site. Tout le reste du texte est descriptif, technique, sec. Pas un adjectif de brochure.

**Ton éditorial :** phrases courtes, présent de l'indicatif, aucune promesse, aucun superlatif, aucun point d'exclamation. Les chiffres sont précis (620 m², pas « grand »). Les matériaux sont nommés par leur vrai nom (chaux ferrée, noyer fumé, tadelakt, laiton bruni). Jamais « expérience unique », « sur-mesure », « votre projet », « prenons contact ». Le site ne s'adresse jamais au visiteur à la deuxième personne, sauf dans le formulaire de contact.

## Les cinq projets

| Projet | Lieu | Année | Surface | Matières | Monde chromatique |
|---|---|---|---|---|---|
| **Villa Ostréa** | Cap-Ferret | 2024 | 620 m² | pin maritime brûlé, béton de chaux, lin brut | Sel — nacre, gris perle, eau |
| **Hôtel Sévigné** | Paris IV<sup>e</sup> | 2023 | 840 m² | boiseries XVIII<sup>e</sup>, laque, laiton bruni | Laque — rouge profond |
| **Maison Cyprès** | Cap d'Antibes | 2022 | 480 m² | travertin, chaux ferrée, noyer fumé | Ocre — terre de Sienne |
| **Appartement Cinq Heures** | Paris VII<sup>e</sup> | 2025 | 310 m² | plâtre lissé, chêne cérusé, albâtre | Vert Paris |
| **La Bergerie** | Ménerbes, Luberon | 2021 | 390 m² | pierre sèche, tadelakt, olivier | Outremer |

Les archives contiennent une douzaine de lignes supplémentaires — nom, lieu, année — sans images. Le vide est un signe de richesse : on ne montre pas tout.

---

## Direction artistique

### La thèse

Paris n'est pas une ville chaude. Paris est **grise** — zinc des toits, pierre de taille, plomb du ciel, craie des enduits. C'est là-dessus que le site est bâti : un système de neutres froids, tenus, presque austères, dans lequel **chaque projet ouvre un monde de couleur saturée qui prend l'écran entier**.

La couleur n'est jamais un accent. Jamais un bouton coloré, jamais un soulignement, jamais un dégradé décoratif. La couleur est un **lieu où l'on entre** : quand on pénètre dans l'Hôtel Sévigné, tout devient laque — le fond, le curseur, la barre de progression, le liseré des liens. On en sort, on revient au gris. C'est ça, le « pop » : pas des touches de couleur, des immersions.

*Pourquoi ce n'est pas le réflexe par défaut :* le fond crème chaud avec serif contrasté et accent terracotta, ou le noir profond avec un seul accent acide, sont les deux directions que produit n'importe quelle IA sur n'importe quel brief de luxe. Ici la base est **froide**, les neutres portent des noms de matériaux parisiens réels, et il y a **cinq** mondes de couleur au lieu d'un accent unique. Si à un moment le site ressemble à du crème + terracotta, c'est qu'on a dérivé : revenir au tableau ci-dessous.

### Jetons de couleur

```css
/* Les gris de Paris — 90 % de la surface du site */
--encre:      #0D1216;  /* zinc à l'ombre, presque noir, sous-ton bleu */
--plomb:      #2A3238;  /* ciel de novembre */
--zinc:       #767F85;  /* toiture */
--pierre:     #B4B0A6;  /* pierre de taille lavée */
--craie:      #E7E5DE;  /* enduit sec, JAMAIS un crème chaud */

/* Les mondes — un par projet, plein écran, jamais en accent */
--sel:        #A8B8BC;  /* Villa Ostréa */
--laque:      #8E1A16;  /* Hôtel Sévigné */
--ocre:       #B26A24;  /* Maison Cyprès */
--vert-paris: #1F4237;  /* Appartement Cinq Heures */
--outremer:   #0F2FA8;  /* La Bergerie */

/* Métal — liserés fins uniquement, jamais un aplat */
--laiton:     #9A7B4F;
```

Règles de couleur non négociables :

Le fond du site au repos est `--encre` de nuit et `--craie` de jour ? Non — **un seul régime : `--encre`**. Pas de mode clair, pas de bascule. Le site est sombre, les projets s'ouvrent en lumière. Les surfaces claires (`--craie`) existent seulement à l'intérieur d'un projet, en contraste avec l'encre du parcours.

Aucun dégradé linéaire CSS visible. Les seuls dégradés autorisés sont calculés en GLSL, à l'intérieur d'une scène.

Aucune ombre portée CSS générique (`box-shadow: 0 4px 12px rgba(0,0,0,.1)` est banni). La profondeur se fait par superposition, échelle, flou, jamais par l'ombre par défaut de Tailwind. Seule exception : l'ombre calculée du chapitre *La Matière*, qui est un shader.

Le rayon de bordure global est **0**. Pas d'arrondi. Nulle part. Une seule exception : les médias circulaires du curseur.

### Typographie

**Deux familles. Pas trois.**

**Gambetta** (Fontshare, gratuit) — la voix éditoriale. Serif français, contraste élevé, détails coupants. Uniquement en display : titres de chapitres, noms de projets, le manifeste. Jamais en dessous de 40 px. Interlettrage `-0.03em` au-delà de 120 px, `-0.015em` entre 40 et 120 px. Italique autorisée pour un seul mot par écran, jamais plus.

**Switzer** (Fontshare, gratuit) — tout le reste. Grotesque neutre de facture suisse, qui fait tenir l'ensemble. Corps de texte, navigation, légendes, et **la couche technique** (voir plus bas) en capitales 11 px avec `letter-spacing: 0.14em`.

Chargement via `next/font/local` sur les fichiers `.woff2` auto-hébergés, `display: swap` interdit sur le display (crée un saut visible sur le seuil) → `display: block` avec un `fallback` métriquement ajusté, et **on attend `document.fonts.ready` avant toute mesure de texte**.

Échelle fluide, pas de paliers :

```css
--t-monument: clamp(4.5rem, 18vw, 22rem);   /* un mot, une fois par chapitre max */
--t-titre:    clamp(2.5rem, 7vw, 7.5rem);
--t-chapo:    clamp(1.25rem, 2.2vw, 2rem);
--t-corps:    clamp(1rem, 1.05vw, 1.125rem);  /* mesure max 58 caractères */
--t-technique: 0.6875rem;                      /* 11 px, capitales, +0.14em */
```

La **couche technique** est la signature d'atelier : partout dans le site, en petites capitales Switzer, des données brutes qui traînent dans les marges — `44°38'N 1°14'W`, `620 M²`, `LIVRAISON JUIN 2024`, `CHAUX FERRÉE / PIN BRÛLÉ`. Elle donne la crédibilité d'un bureau d'études. Elle n'est jamais décorative : chaque donnée est vraie dans la fiction.

### Grille et composition

Douze colonnes, gouttière 24 px, marge latérale `clamp(1.5rem, 4vw, 5rem)`. Ligne de base 8 px : toute valeur d'espacement est un multiple de 8.

**Rien n'est centré.** Aucun titre centré, aucun bloc `mx-auto`, aucun bouton au milieu. Une seule exception dans tout le site : le logo pendant les trois premières secondes du seuil. Tout le reste est en tension — texte calé sur la colonne 2, image débordant à droite hors cadre, légende décrochée dans la marge, un titre qui sort de l'écran et qu'on ne lit qu'à moitié.

Le débordement volontaire est encouragé : une image sur trois doit sortir du cadre. Un site qui respecte ses marges partout est un site de gabarit.

### Mouvement

Le mouvement est la matière première de ce site, donc il est **codifié**, pas improvisé.

```css
--e-sortie:  cubic-bezier(0.16, 1, 0.30, 1);      /* out-expo : entrées d'objets */
--e-douce:   cubic-bezier(0.65, 0.05, 0.36, 1);   /* in-out : déplacements */
--e-seche:   cubic-bezier(0.22, 1, 0.36, 1);      /* micro-interactions */

--d-micro:   0.24s;   /* survol, curseur, focus */
--d-objet:   0.72s;   /* une image, un titre qui arrive */
--d-chapitre: 1.15s;  /* un changement de monde */
```

Interdit : toute durée entre 0.30 s et 0.55 s sur un mouvement de grande amplitude. C'est la zone qui fait « site de template ». En dessous on est vif, au-dessus on est ample ; entre les deux on est médiocre.

Interdit : le décalage (`stagger`) uniforme. Un stagger régulier de 0.05 s sur douze éléments, c'est la signature de l'IA. Utiliser `gsap.utils.distribute()` avec un `from: "start"` et un `ease` sur la distribution elle-même, ou un décalage indexé sur la position réelle en X de l'élément.

**La règle du parcours** — la plus importante du document : *deux chapitres consécutifs ne peuvent pas partager la même grammaire de mouvement.* Si le chapitre A monte en vertical, le chapitre B se déplace en horizontal, en profondeur, en échelle ou en matière. Le site ne doit jamais être un mur vertical qui défile. À la fin de chaque mission, vérifier ce point avant de commit.

### Curseur, son, chrome

Le curseur natif est masqué au profit d'un anneau de 28 px, `mix-blend-mode: difference`, qui suit avec un lerp de 0.12. Il se magnétise aux éléments interactifs (attraction dans un rayon de 80 px), et se transforme en pastille pleine portant un mot — `VOIR`, `SUIVANT`, `TIRER` — au survol des médias. Sur pointeur grossier (tactile), le curseur personnalisé est désactivé entièrement.

Un son d'ambiance discret (nappe de pièce, très basse) plus quelques micro-sons d'interface, coupés par défaut, avec un bouton de bascule visible en permanence dans le chrome. Web Audio natif, pas de bibliothèque. Le son ne démarre jamais sans clic explicite.

Le chrome persiste au-dessus de tout : le logo en haut à gauche, le burger en haut à droite, une barre de progression du parcours de 1 px sur le bord gauche, et le nom du chapitre courant en couche technique en bas à gauche.

### Le geste signature

**Le logotype vit en `mix-blend-mode: difference` du début à la fin.** Il n'est jamais recoloré : il est toujours le négatif exact de ce qu'il traverse. Blanc sur l'encre, noir sur la craie, cyan sur la laque, orange sur l'outremer. C'est un seul nœud DOM, monté dans le layout racine, qui ne se démonte jamais — il traverse la vidéo d'intro, se pose dans la barre de navigation, et continue d'inverser tous les mondes chromatiques du parcours.

C'est le fil rouge du site. Toute la hardiesse est dépensée ici. Autour, on reste tenu.

---

## Architecture technique

**Pile :** Next.js 15 (App Router) · TypeScript strict · Tailwind v4 en configuration CSS-first (`@theme`) pour les jetons et la mise en page · CSS de composant dès que le mouvement devient complexe (clip-path, filtres, masques) · GSAP + ScrollTrigger + Flip + SplitText · Lenis · Three.js.

**Un seul moteur WebGL : Three.js.** OGL est écarté. Les effets de la bibliothèque écrits en OGL sont soit abandonnés, soit leur shader est reporté dans Three (le fragment de flou progressif, notamment, se transpose tel quel).

**Le rig** — c'est la colonne vertébrale, à construire avant tout chapitre :

Un unique `<canvas>` en `position: fixed`, monté dans `app/layout.tsx`, jamais démonté, jamais recréé à la navigation. Un unique `WebGLRenderer`, une unique `Scene`, une `OrthographicCamera` réglée pour que **une unité monde = un pixel écran** (ou une `PerspectiveCamera` avec la distance calculée par `fov = 2 * atan(hauteur / (2 * distance))`, même résultat, meilleure profondeur).

Une seule boucle `requestAnimationFrame` dans tout le projet, portée par le ticker GSAP :

```ts
gsap.ticker.lagSmoothing(0)
gsap.ticker.add((time) => lenis.raf(time * 1000))
lenis.on('scroll', ScrollTrigger.update)
// le rendu WebGL s'abonne au même ticker, en dernier
```

Aucun composant n'a le droit d'ouvrir son propre `requestAnimationFrame`. Aucun. Si un effet importé en contient un, il est réécrit pour s'abonner au ticker.

**Le pont DOM ↔ WebGL :** un hook `useGLProxy(ref, factory)` qui enregistre un élément DOM auprès du rig. Une passe de mesure unique par frame lit les `getBoundingClientRect` de tous les proxies enregistrés (jamais un rect lu dans une boucle par composant — c'est la garantie de zéro layout thrashing), et positionne les meshes correspondants. Le HTML garde la mise en page ; le WebGL se cale dessus. C'est le motif du tutoriel `scroll-rig` de la bibliothèque, dont on reprend l'idée sans en prendre la dépendance React Three Fiber.

**Structure des dossiers :**

```
src/
  app/
    layout.tsx           → fonts, providers, canvas, chrome
    page.tsx             → le parcours
    projets/[slug]/page.tsx
    archives/page.tsx
  components/
    chrome/              → Logo, Burger, MenuOverlay, Curseur, Son, Progression
    chapitres/           → Seuil, Vestibule, Enfilade, Chambre, Matiere, Atelier, Sortie
    gl/
      Rig.tsx  useGLProxy.ts  materials/  shaders/*.glsl
    motion/              → useReveal, useFlip, transitions/
  lib/                   → lenis.ts, gsap.ts, math.ts, easings.ts, media.ts
  data/                  → projets.ts, archives.ts
  styles/                → tokens.css, base.css
public/
  video/  frames/  textures/  fonts/
```

**Chargement :** tout ce qui touche WebGL est importé en `dynamic(..., { ssr: false })`. Les shaders `.glsl` passent par un chargeur webpack/turbopack configuré dans `next.config.ts`, ou sont inlinés en `template strings` — choisir une seule des deux méthodes et s'y tenir.

**Persistance à la navigation :** le canvas et le chrome vivent dans le layout racine ; seul le contenu du chapitre change. Les transitions inter-pages sont pilotées par GSAP, avec la nouvelle route montée sous un masque SVG avant que l'ancienne ne se retire.

---

## Bibliothèque d'effets

Les seize effets du casting existent en code réel sur ce disque. Ils ne sont **jamais** réécrits de mémoire.

**Où ils sont.** `references/github/` — dix dépôts clonés. `references/zip/` — six exports CodePen extraits. Le dossier `references/` n'est pas versionné (`.gitignore`) : il vit sur la machine, pas dans le dépôt.

**Comment on les trouve.** `references/CATALOGUE.md` est l'index, et le seul point d'entrée. Pour chacun des seize : la source, la description du mécanisme, **les fichiers clés avec la ligne où se trouve le cœur de l'effet**, la pile réelle, et le coût d'adaptation à Next. On ne cherche pas un effet en fouillant l'arborescence : on ouvre le catalogue, on lit l'entrée, on ouvre les fichiers qu'elle nomme.

**La règle, non négociable.** Toute mission qui convoque un effet commence par lire son entrée dans `CATALOGUE.md`, puis **lit le code source réel** des fichiers désignés. Écrire un effet à partir de son nom, de son résumé ou du souvenir qu'on en a est un échec de mission, même si le résultat tourne. Ces effets ont été choisis pour leurs détails d'implémentation — le jacobien des caustiques, la mesure par Range API, la dé-tendance de la sinusoïde de bourrasque, les offsets doublants du filtre SVG. Ce sont précisément ces détails qu'une réécriture perd.

**Ce qu'on lit et ce qu'on ignore.** Uniquement `src/`. Les `dist/` des zips sont des builds générés, ils ne prouvent rien et n'apprennent rien. `references/zip/shadow/src/index.html` fait 371 ko sur onze lignes — Three.js inliné et deux textures en base64 : ne jamais l'ouvrir en entier, en extraire ce qui est nommé au catalogue.

**Ce qu'on garde du code d'origine.** Le mécanisme, les shaders, les constantes réglées à la main, et les motifs d'accessibilité déjà corrects (`gsap-wind-blown-text` a le bon : span visuellement caché doublé d'un overlay `aria-hidden`). Le PRNG à graine de ce même effet est gardé tel quel : c'est lui qui rend l'animation identique après un redimensionnement.

**Ce qu'on jette systématiquement.** Les imports par CDN — `esm.sh`, `jsdelivr`, import maps — remplacés par les paquets npm du projet. Les panneaux de contrôle de démo : dat.GUI, lil-gui, Tweakpane, `Debug.js`, les sélecteurs de couleur maison. Les `console.log` oubliés. Les libs vendorées dans `js/`. Toute boucle `requestAnimationFrame` propre à l'effet, réécrite en abonnement au ticker. Tout second contexte WebGL, remplacé par une inscription au rig. Tout ce qui est écrit en OGL est porté dans Three ou abandonné.

**Quand la source manque.** Si un fichier nommé par le catalogue est introuvable, la mission s'arrête et le signale. Elle n'improvise pas un effet de remplacement.

**La bibliothèque est en lecture seule.** On n'y écrit rien, on n'y corrige rien, on ne la lint pas, on ne la compile pas — `eslint.config.mjs` et `tsconfig.json` l'excluent déjà.

---

## Budget de performance

Ces chiffres sont des seuils d'échec, pas des objectifs.

LCP sous 2,5 s sur une connexion 4G simulée. CLS strictement 0 — la vidéo d'intro et le logo réservent leur place avant de bouger. 60 fps constants sur un MacBook Air M1, 30 fps plancher sur un iPhone 12. JS de première charge sous 250 ko compressé, hors WebGL chargé à la demande.

`renderer.setPixelRatio(Math.min(devicePixelRatio, 2))`, et 1.5 sur mobile.

**Une seule scène lourde visible à la fois.** Jamais deux effets WebGL coûteux dans le même viewport. Toute boucle GL est suspendue par `IntersectionObserver` dès que son ancre sort de l'écran, et par `visibilitychange` dès que l'onglet passe en arrière-plan. C'est le point qui tue les sites Awwwards mal finis : la simulation d'eau qui tourne à 60 Hz pendant qu'on lit le chapitre suivant.

Les textures sont dimensionnées à la puissance de deux la plus proche du besoin réel, jamais un JPEG 4000 px téléversé sur le GPU. Toutes les images DOM en AVIF avec repli WebP, servies par `next/image`, `sizes` toujours renseigné.

Le déclencheur de complexité : si `navigator.hardwareConcurrency < 4` ou si le premier rendu dépasse 22 ms, on bascule sur le mode dégradé — les chapitres WebGL rendent leur version DOM/CSS, qui doit être belle aussi.

---

## Accessibilité et référencement

Ce sont les deux endroits où les sites primés sont invariablement mauvais. Ici ils ne le seront pas.

Tout texte peint dans un canvas est doublé d'un équivalent DOM en `sr-only`, et l'overlay visuel porte `aria-hidden="true"`. Cela concerne le titre du chapitre verre et tout titre passé par SplitText.

`prefers-reduced-motion: reduce` est traité globalement, pas effet par effet : un `MotionProvider` expose le flag, Lenis démarre en mode natif, les timelines se rendent à leur état final immédiatement, la vidéo d'intro est remplacée par sa poster frame, et les scènes WebGL rendent une frame unique et fixe. **Le site en mouvement réduit doit rester beau** — c'est une version, pas une punition.

Navigation clavier complète, `:focus-visible` avec un liseré `--laiton` de 1 px et un décalage de 3 px, lien d'évitement en tête de document, `<main>`/`<nav>`/`<article>` sémantiques. Le menu overlay piège le focus et rend la main à l'élément déclencheur à la fermeture. Le défilement est verrouillé par `lenis.stop()`, jamais par `overflow: hidden` sur le body.

Métadonnées complètes par projet, JSON-LD `Organization` + `CreativeWork`, image OG générée à `1200×630` par `next/og`.

---

## Interdits absolus

Aucune grille de trois cartes à coins arrondis avec ombre douce. Aucune section « Nos services » à icônes. Aucun carrousel de témoignages. Aucun dégradé violet, aucun `bg-gradient-to-r`. Aucun emoji, nulle part, ni dans le code ni dans l'interface. Aucun texte de remplissage : chaque mot est du contenu Rouvière définitif. Aucune classe `text-gray-500` ni couleur hors des jetons. Aucun `rounded-lg`, `shadow-md`, `p-4` par réflexe.

Aucun compteur numéroté `01 / 02 / 03` pour rythmer les sections. Le site n'est pas une liste — c'est un parcours. Les chapitres portent des noms, pas des numéros. Un marqueur numérique n'est légitime que si l'ordre porte une information réelle, ce qui n'est le cas nulle part ici.

Aucun bouton d'appel à l'action centré avec effet de rebond. Aucun compteur de statistiques qui s'incrémente. Aucun « Découvrir » avec une flèche qui saute. Aucun préchargeur avec pourcentage — le seuil vidéo est le préchargeur.

Aucun scroll-jacking dur : Lenis lisse le défilement, mais l'utilisateur garde le contrôle. Le défilement d'une page complète par cran est interdit. La barre de défilement native peut être stylée, jamais supprimée sans substitut.

---
---
