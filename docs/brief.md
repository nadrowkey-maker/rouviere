# ROUVIÈRE — Brief de production

La direction artistique, les jetons de design et les règles techniques sont dans
`CLAUDE.md` à la racine, chargé automatiquement à chaque session de Claude Code.
Ce document contient le parcours, le casting des seize effets, les missions
séquencées, la préparation des actifs et le contrôle final.

---

# LIVRE II — LE PARCOURS
### Le brief écran par écran (à recoller au début de chaque mission de chapitre)

Le site n'est pas un empilement de sections : c'est une **promenade architecturale** au sens où Le Corbusier l'entendait — une séquence réglée de seuils, de compressions et de dilatations. On entre, on traverse, on ressort. Chaque chapitre a une direction de mouvement différente du précédent.

## Le Seuil

Écran noir. Une vidéo plein cadre démarre — un plan long, lent, dans une villa vide : la lumière traverse une pièce, un voilage bouge, rien ne se passe. Muette, en boucle, sans commande visible.

Le logotype **ROUVIÈRE** apparaît au centre, énorme, en `mix-blend-mode: difference` : il n'a pas de couleur propre, il inverse la vidéo derrière lui. Les lettres arrivent une à une, décalées de façon irrégulière, par un masque vertical.

Trois secondes. Puis le logo **se déplace lui-même** vers sa position définitive en haut à gauche de la barre de navigation — pas une disparition suivie d'une apparition : le même nœud DOM, la même instance, animé par GSAP Flip, qui rétrécit et se cale en un seul geste de 1,15 s. Simultanément la vidéo se rétracte par un `clip-path` en `inset()` qui la ramène à une bande horizontale, puis à rien, découvrant le vestibule.

Détails d'implémentation : `autoplay muted playsinline preload="metadata"` plus une `poster` en AVIF pour le LCP. `mix-blend-mode: difference` exige un `isolation: isolate` sur le conteneur commun ; sur Safari, prévoir le repli par `backdrop-filter: invert(1)` sur un calque dupliqué. La séquence est jouée une seule fois par session (`sessionStorage`) : au retour, le logo est déjà en place. Un lien d'évitement invisible mais focusable permet de sauter le seuil au clavier. En mouvement réduit, la poster frame remplace la vidéo et le Flip se joue en 0,3 s.

**Effets convoqués :** `fullscreen-clip-effect` pour la rétraction, `onscroll-typography-animations` pour l'arrivée des lettres.

## Le Vestibule

Fond `--encre`. Un seul bloc de texte, calé sur la colonne 2, jamais centré : le manifeste de Camille Rouvière.

Le texte ne « fade in » pas. Il **se reconstitue** : les lettres arrivent de loin, dispersées dans la profondeur, en rotation, et se rassemblent à leur place à mesure qu'on descend. C'est l'effet de vent au scroll joué à l'envers — la poussière qui se rassemble en phrase. Chaque mot du manifeste se forme, puis se disperse à nouveau quand on continue, sauf la dernière phrase, qui reste.

Dans la marge droite, en couche technique : `ATELIER FONDÉ 2011 — PARIS VII` et `CINQ CHANTIERS PAR AN`.

**Effets :** `gsap-wind-blown-text` en mode reverse (le moteur gère les deux sens nativement, avec son PRNG à graine — l'animation reste identique après un redimensionnement). Garder son motif d'accessibilité : `span` visuellement caché + `aria-hidden` sur la couche animée.

## L'Enfilade

**Rupture d'axe.** On arrête de descendre, on se met à traverser. Le défilement vertical est capté et converti en déplacement horizontal : une enfilade de pièces, cinq projets, où les images avancent à des vitesses différentes de leur conteneur et à des profondeurs différentes.

Ce n'est pas une galerie horizontale — c'est un couloir. Les noms de projets flottent dans la marge haute en Gambetta énorme, coupés par le bord de l'écran, et ne sont entièrement lisibles qu'au moment où leur pièce est centrée. La couche technique défile en bas à un troisième rythme : `CAP-FERRET · 44°38'N · 620 M² · 2024`.

Au survol d'une pièce, le curseur devient une pastille `ENTRER` et l'image gagne en netteté pendant que les voisines se floutent — flou progressif calculé en fragment shader selon la distance au centre, pas un `filter: blur()` CSS.

Au clic, transition vers la chambre du projet : l'image cliquée se déplie en plein écran par morphing de `clip-path`, les autres partent en profondeur sur l'axe Z.

**Effets :** `horizontal-parallax-gallery` pour le socle, le fragment de `webgl-progressive-blur` transposé dans Three, `fullscreen-clip-effect` pour l'entrée dans le projet.

## La Chambre — un chapitre par projet

**Le monde bascule.** Dès l'entrée, la couleur du projet prend tout : fond, curseur, liserés, barre de progression. La transition de couleur dure 1,15 s et se fait par un dégradé calculé en GLSL, pas en CSS.

Trois temps, sans coupure visible entre eux.

*L'approche.* Une séquence d'images pilotée au défilement — un vrai plan de caméra qui traverse la villa, décomposé en frames et redessiné sur un canvas 2D. C'est le mécanisme d'Apple, pas une vidéo dont on force le `currentTime` (le seek vidéo saccade sur Safari et iOS). Cent vingt à cent soixante frames AVIF de 1600 px de large, préchargées progressivement, index piloté par ScrollTrigger. Le premier tiers des frames est bloquant, le reste se charge pendant la lecture.

*La profondeur.* On cesse de traverser, on entre **dans** la scène : les images du projet avancent vers la caméra, on scrolle dans l'axe Z. L'ambiance colorée du fond réagit à l'image active et la vélocité du défilement laisse une traînée.

*La fiche.* Le seul moment sobre du site : du texte, calé, sec. Programme, surfaces, matériaux, année, photographe fictif. Aucune animation autre qu'un reveal typographique retenu. Le calme après le mouvement fait le mouvement.

**Effets :** séquence de frames maison, `depth-gallery` pour la profondeur et le fond réactif (retirer Tweakpane et `Debug.js` en production), `shader-on-scroll` pour le grain argentique sur les images de la fiche, `onscroll-typography-animations` en retenue pour le texte.

## La Matière

Un chapitre entier sans image de projet. On touche.

Une surface plane vue en projection orthographique — un échantillon : lin, chaux, plâtre lissé. Elle **se soulève sous le curseur**, comme une feuille qu'on pincerait, et son ombre portée s'efface à mesure qu'elle se décolle. Trois échantillons, un par matière, qu'on parcourt latéralement.

Puis, une seule fois dans tout le site, le morceau de bravoure : **le bassin de la Villa Ostréa**. Une vraie simulation de surface d'eau — équation d'onde sur grille, caustiques calculées comme le déterminant jacobien de la carte des rayons réfractés, fond de sable procédural, deux soleils spéculaires, absorption par la profondeur. Le curseur crée des ondes ; sans interaction, des gouttes tombent seules. Plein écran, sans texte, sans interface, sinon une ligne en couche technique : `BASSIN — 22 M — EAU DOUCE — CAP-FERRET`.

C'est l'endroit où le visiteur se prend la claque. Il est justifié narrativement (c'est un vrai bassin dans un vrai projet), il ne dure que le temps d'un écran, et la boucle est suspendue dès qu'on en sort.

**Effets :** `shadow` pour les échantillons (extraire les textures base64 du HTML, remplacer le Three.js inliné par la version npm), `waterwebgl-shader` pour le bassin (portage lourd : WebGL2 brut à encapsuler, dat.GUI à retirer, repli obligatoire si WebGL2 ou les render targets flottantes manquent).

## L'Atelier

Retour au gris, retour au calme. Camille Rouvière, le processus, la méthode.

Le mouvement change encore : ici les images ne défilent pas, elles **pivotent**. Des photographies d'atelier — plans, échantillons, chantier — tournent en 3D et se déplacent en profondeur au fil du défilement, avec une distribution latérale en sinusoïde. Un seul portrait, en noir et blanc, contre-jour, jamais souriant.

**Effets :** `rotating-onscroll-animations` (la variante la plus spectaculaire : pause au centre, Z à −750 px, flou et luminosité réactifs à la vélocité).

## Les Archives

Une liste. Une vraie liste, austère, en Switzer, sans images — projet, lieu, année. C'est ici que le vide travaille : on voit combien il y en a eu, on n'en voit aucun.

Un seul mot en très gros Gambetta ouvre le chapitre — `ARCHIVES` — qui projette une ombre portée dure en cascade, construite par empilement de copies décalées à distances doublantes, comme si elle fuyait vers l'infini. Statique, jamais animée : un filtre SVG sur du très gros texte coûte cher au repaint.

Au survol d'une ligne d'archive, rien de spectaculaire : la ligne se décale de 8 px et la couche technique du chantier apparaît dans la marge.

**Effets :** `beautiful-typography` (recopier le `<filter>` en JSX statique, jeter le panneau de contrôle de la démo).

## La Sortie

Fond `--encre`, silence.

Le nom de l'atelier flotte une dernière fois, mais cette fois **il est en verre** : un nœud torique en verre réfractant tourne lentement devant le titre plein écran et le déforme optiquement. Transmission, dispersion chromatique, réflexions issues d'un environnement de pièce.

En dessous, sec : l'adresse, un téléphone, un courriel. Pas de formulaire à six champs, pas de « Parlons de votre projet ». Le courriel est un lien `mailto:` qui copie l'adresse au clic avec un retour discret.

Attention : le titre en verre est peint dans un canvas, donc invisible pour les moteurs et les lecteurs d'écran. Le `<h2>` réel reste en `sr-only`. Attendre `document.fonts.ready` avant de peindre. `transmission` + `dispersion` sont coûteux sur mobile → sur pointeur grossier, remplacer par le titre DOM avec un simple `backdrop-filter`.

**Effets :** `glass-hero` (Three.js `MeshPhysicalMaterial`, `transmission: 1`, `ior: 1.45`, `dispersion: 4`, `RoomEnvironment` + `PMREMGenerator`).

## Le Menu

Il ne glisse pas depuis la droite. Il **ouvre une pièce**.

Au clic sur le burger, la page courante recule dans la profondeur — elle rétrécit légèrement, se désature et se floute par le shader de flou progressif — pendant qu'une surface pleine descend par un masque SVG à lamelles, comme un store qui s'ouvre à contretemps. Les entrées du menu arrivent en enfilade, en Gambetta énorme, décalées irrégulièrement.

Au survol d'une entrée, le monde chromatique du projet correspondant envahit le fond du menu et une vidéo muette du projet apparaît derrière le texte, révélée par un masque en damier. On voit où l'on va avant d'y aller.

Le burger lui-même n'est pas trois traits qui deviennent une croix : trois dalles fines qui s'écartent et pivotent séparément, avec un décalage de 40 ms entre elles.

Ouverture 0,9 s, fermeture 0,6 s — la fermeture est toujours plus rapide que l'ouverture. `lenis.stop()` à l'ouverture, piège de focus, `Échap` ferme, restitution du focus au burger.

**Effets :** `scroll-transition` pour les masques SVG (stores et damier), `onscroll-typography-animations` pour l'arrivée des entrées, le flou progressif transposé pour la mise à distance de la page.

---
---

# LIVRE III — CASTING DES SEIZE EFFETS

Un site qui utilise seize effets n'est pas un site, c'est une démo technique. Onze sont retenus, cinq sont écartés — et écarter est une décision de direction artistique, pas un renoncement.

**Retenus, et à quel endroit :**

`fullscreen-clip-effect` → rétraction du seuil, entrée dans un projet depuis l'enfilade.
`onscroll-typography-animations` → arrivée des lettres du seuil, entrées du menu, reveals retenus des fiches projet.
`gsap-wind-blown-text` → le manifeste du vestibule, joué en reconstitution.
`horizontal-parallax-gallery` → l'enfilade (version WebGL, distorsion des bords).
`webgl-progressive-blur` → **le shader seulement**, transposé dans Three : flou de l'enfilade, mise à distance de la page derrière le menu.
`depth-gallery` → la profondeur de chaque chambre, et le fond réactif au monde chromatique.
`shader-on-scroll` → grain argentique sur les images des fiches projet.
`rotating-onscroll-animations` → l'atelier.
`scroll-transition` → les masques SVG du menu et des transitions de chapitre.
`shadow` → les échantillons de matière.
`waterwebgl-shader` → le bassin, une seule fois.
`beautiful-typography` → le mot `ARCHIVES`, statique.
`glass-hero` → la sortie.

**Écartés, et pourquoi :**

`react-scroll-rig-webgl` — on garde le **motif** (proxy DOM ↔ WebGL, canvas global) et on jette la dépendance. Importer toute la pile React Three Fiber pour un seul chapitre alors que le reste du site est en Three.js impératif, c'est deux architectures qui cohabitent mal et un poids injustifiable.

`webgl-rotating-image-gallery` — écrit en OGL, redondant avec l'enfilade et la galerie en profondeur. On ne fait pas cohabiter deux moteurs WebGL.

`webgl-fluid-simulation-with-your-text` — le plus lourd des seize, redondant avec le bassin, et son portage impose de déplacer sept shaders lus via `getElementById().innerHTML`. Le site a déjà son morceau de bravoure fluide. Deux, ce serait de la surenchère — et la surenchère, c'est exactement ce qui distingue un site cher d'un site qui veut avoir l'air cher.

Les versions CSS de `horizontal-parallax-gallery` et les variantes secondaires des dépôts multi-fichiers (`index2.js`, `index3.js`…) servent de **modes dégradés** : quand la détection de capacité échoue, c'est cette version qui est rendue.

---
---

# LIVRE IV — LES MISSIONS
### Prompts à donner à Claude Code, un par un, dans cet ordre

Règle de conduite : une mission par session, `/clear` entre chaque, un commit git à chaque définition de terminé, et jamais de mission suivante tant que la précédente n'est pas validée à l'œil. Si une mission dérape, `git reset --hard` et on recommence avec un prompt plus précis — on ne rattrape pas un chapitre raté par du rustinage.

---

### Mission — Le socle

> Initialise le projet ROUVIÈRE. Next.js 15 App Router, TypeScript strict, Tailwind v4 en configuration CSS-first. Installe gsap, lenis, three. Télécharge Gambetta et Switzer depuis Fontshare en .woff2 dans `public/fonts` et configure `next/font/local`.
>
> Crée `src/styles/tokens.css` avec exactement les jetons de couleur, l'échelle typographique, les easings et les durées définis dans CLAUDE.md — pas une valeur de plus, pas une valeur inventée. Expose-les à Tailwind via `@theme`.
>
> Crée `src/data/projets.ts` avec les cinq projets typés (slug, nom, lieu, coordonnées, année, surface, matières, monde chromatique, programme, texte de fiche) et `src/data/archives.ts` avec douze entrées supplémentaires. Écris les vrais textes Rouvière, pas de remplissage.
>
> Crée une route `/styleguide` non indexée qui affiche l'intégralité du système : chaque couleur avec son nom et son usage, chaque niveau typographique dans les deux familles, la grille avec ses colonnes visibles, les trois easings comparés côte à côte sur un carré animé.
>
> **Terminé quand** `/styleguide` s'affiche, que la police display est en Gambetta sans FOUT, et qu'aucune couleur du site n'existe en dehors de tokens.css.

---

### Mission — Le rig

> Construis la colonne vertébrale du mouvement, sans aucun contenu visuel.
>
> Un `MotionProvider` qui expose `prefers-reduced-motion`, la classe de capacité de l'appareil (`hardwareConcurrency`, support WebGL2, pointeur grossier) et l'état de la première interaction.
>
> Un `LenisProvider` branché sur le ticker GSAP, avec `lagSmoothing(0)`, `ScrollTrigger.update` sur l'événement scroll, et `lenis.stop()/start()` exposés par contexte. En mouvement réduit, Lenis démarre en défilement natif.
>
> Le `Rig` : un unique canvas fixe monté dans `app/layout.tsx`, un `WebGLRenderer` avec `setPixelRatio(Math.min(dpr, 2))`, une caméra réglée pour qu'une unité monde égale un pixel écran, et le rendu abonné au ticker GSAP en dernière position. Aucun `requestAnimationFrame` ailleurs dans le projet.
>
> Le hook `useGLProxy(ref, factory)` : enregistre un élément DOM auprès du rig, et une passe de mesure unique par frame lit tous les rects enregistrés d'un coup avant de positionner les meshes. Interdiction absolue de lire un `getBoundingClientRect` dans un composant.
>
> Un `IntersectionObserver` partagé qui suspend toute scène dont l'ancre sort du viewport, plus une suspension sur `visibilitychange`.
>
> Un panneau de debug affiché uniquement en développement : fps, nombre de draw calls, mémoire GPU, scènes actives.
>
> **Terminé quand** une page de test affiche trois divs colorées doublées par trois plans WebGL parfaitement alignés, qui restent alignés au défilement, au redimensionnement et au zoom navigateur, à 60 fps, et que le compteur de scènes actives tombe à zéro quand on les fait sortir de l'écran.

---

### Mission — Le seuil

> [Recoller la section « Le Seuil » du Livre II]
>
> Construis-le. Le logo est un composant monté dans `app/layout.tsx`, avec un `ref` partagé par contexte, qui ne se démonte jamais — c'est le même nœud DOM qui passe du centre à la barre de navigation par GSAP Flip.
>
> Traite explicitement : `isolation: isolate` pour le blend difference, le repli Safari, la poster AVIF pour le LCP, le `sessionStorage` pour ne jouer la séquence qu'une fois, le lien d'évitement clavier, et la version mouvement réduit.
>
> **Terminé quand** le Flip est fluide sur trois frames de ralenti, que le logo inverse bien la vidéo, que le CLS mesuré est à 0, et qu'un rechargement dans la même session pose le logo directement dans la nav sans clignotement.

---

### Mission — Le chrome

> [Recoller « Le Menu » du Livre II]
>
> Barre de navigation, burger, overlay de menu, curseur personnalisé, bascule de son, barre de progression du parcours, nom du chapitre courant.
>
> Le menu n'est pas un panneau qui glisse : la page recule en profondeur et se floute pendant qu'une surface descend par masque SVG à lamelles. Les entrées arrivent en enfilade. Au survol, le monde chromatique du projet envahit le fond.
>
> Accessibilité obligatoire : piège de focus, `Échap`, restitution du focus, `aria-expanded`, `lenis.stop()`, jamais `overflow: hidden` sur le body.
>
> **Terminé quand** le menu est intégralement pilotable au clavier, que l'ouverture tient 60 fps, et qu'un utilisateur en mouvement réduit obtient une ouverture instantanée mais toujours composée.

---

### Mission — Le vestibule

> [Recoller « Le Vestibule »]
>
> Porte le moteur de texte soufflé depuis `references/zip/gsap-wind-blown-text/src/script.js` : remplace les imports esm.sh par le paquet gsap local, garde le PRNG à graine et le motif d'accessibilité, retire le `console.log` ligne 309. La mesure est impossible en SSR : monte l'animation côté client après `document.fonts.ready`.
>
> **Terminé quand** le manifeste se reconstitue au défilement descendant et se disperse au remontage, que l'animation est identique après un redimensionnement, et que le texte est intégralement lisible par un lecteur d'écran.

---

### Mission — L'enfilade

> [Recoller « L'Enfilade »]
>
> Adapte `horizontal-parallax-gallery` (version WebGL) au rig existant : pas de nouveau canvas, pas de nouvelle boucle, les médias passent par `useGLProxy`. Transpose le fragment de flou progressif de `webgl-progressive-blur` (OGL) vers un `ShaderMaterial` Three.
>
> Le défilement vertical se convertit en déplacement horizontal via ScrollTrigger `pin` + `scrub`. Les noms de projets, les images et la couche technique se déplacent à trois vitesses distinctes.
>
> **Terminé quand** on traverse les cinq pièces sans accroc, que le flou est calculé en shader et non en CSS, que le curseur se magnétise, et que le mode dégradé rend la version DOM/CSS sans WebGL.

---

### Mission — La chambre

> [Recoller « La Chambre »]
>
> Construis d'abord le pipeline de séquence de frames : un composant `<SequenceCanvas>` qui reçoit un manifeste de frames, précharge le premier tiers de façon bloquante et le reste en tâche de fond, dessine sur un canvas 2D en `object-fit: cover` calculé, et pilote l'index par ScrollTrigger scrub. Pas de `video.currentTime`.
>
> Puis la profondeur : porte `depth-gallery` dans le rig, retire `Debug.js` et Tweakpane, branche la palette du projet actif sur le shader de fond.
>
> Puis la fiche, sobre, avec le grain de `shader-on-scroll` sur les images.
>
> La bascule de monde chromatique est un dégradé GLSL de 1,15 s, et elle repeint aussi le curseur, la barre de progression et les liserés.
>
> **Terminé quand** la séquence de frames est fluide dans les deux sens sur Safari iOS, que la couleur du monde bascule sans à-coup, et qu'aucune frame n'est chargée pour un projet qu'on ne visite pas.

---

### Mission — La matière

> [Recoller « La Matière »]
>
> Les échantillons d'abord : réécris proprement l'effet `shadow`. Extrais les deux textures base64 du HTML de 371 ko vers `public/textures` (n'ouvre jamais ce fichier en entier), remplace le Three.js inliné par la version npm, corrige la syntaxe `type: "t"` obsolète, garde les shaders inlinés en template strings.
>
> Le bassin ensuite, et c'est le morceau le plus difficile du site. Encapsule `waterwebgl-shader` : WebGL2 brut en TypeScript, contexte séparé du rig si nécessaire mais boucle toujours abonnée au ticker global, dat.GUI retiré, les paramètres de `GROUPS` figés en constantes après réglage, détection de WebGL2 et des render targets flottantes avec repli sur une vidéo bouclée du bassin si absent.
>
> Suspension impérative hors viewport et sur onglet inactif : cette scène tourne à 60 Hz en permanence sinon.
>
> **Terminé quand** le bassin tient 60 fps sur un M1 et 30 fps sur un iPhone 12, que la boucle est mesurablement à l'arrêt dès qu'on quitte l'écran, et que le repli s'affiche correctement sur un navigateur sans WebGL2.

---

### Mission — L'atelier, les archives, la sortie

> [Recoller les trois sections]
>
> L'atelier reprend `rotating-onscroll-animations` variante 5. Les archives sont une liste austère ouverte par le mot `ARCHIVES` en filtre SVG statique repris de `beautiful-typography` (recopier le `<filter>` en JSX, jeter le panneau de contrôle). La sortie porte `glass-hero` avec son `<h2>` doublé en `sr-only` et son repli sur pointeur grossier.
>
> **Terminé quand** les trois chapitres s'enchaînent, que le contraste des textes passe AA partout, et que le titre en verre est lu correctement par VoiceOver.

---

### Mission — Les coutures

> Les transitions entre chapitres et entre routes, avec les masques SVG de `scroll-transition` (stores horizontaux, verticaux, damier — un motif différent selon la nature du passage). La nouvelle route est montée sous le masque avant que l'ancienne ne se retire. Le canvas et le chrome ne se démontent jamais.
>
> Puis la passe de règle du parcours : parcours le site du seuil à la sortie et vérifie qu'aucun chapitre ne partage sa grammaire de mouvement avec son voisin immédiat. Liste les grammaires observées et corrige les collisions.
>
> **Terminé quand** aucune navigation ne provoque de flash blanc, que le logo ne se recharge jamais, et que la liste des grammaires ne contient aucun doublon consécutif.

---

### Mission — Le ponçage

> Passe finale. Ne construis rien de neuf, corrige.
>
> Lighthouse mobile et desktop, budget de CLAUDE.md à respecter au chiffre près. Profil de performance sur les trois chapitres les plus lourds. Traque tout `requestAnimationFrame` orphelin, toute texture non libérée, toute scène qui rend hors écran.
>
> Parcours complet au clavier seul. Parcours complet en `prefers-reduced-motion` — signale tout endroit où le site devient laid plutôt que calme. Test lecteur d'écran sur le seuil, le menu et la sortie.
>
> Métadonnées, JSON-LD, images OG, favicon, `robots.txt`.
>
> Puis fais une revue de direction artistique honnête : liste les cinq endroits du site qui ressemblent le plus à un gabarit, et propose pour chacun une correction. N'aie pas peur de dire qu'un chapitre est raté.
>
> **Terminé quand** la liste des cinq faiblesses est traitée et que le site passe le contrôle du Livre VI.

---
---

# LIVRE V — LES ACTIFS
### Là où la plupart des sites se trahissent

Le code peut être parfait : si les images ont l'air de banque d'images, le site vaut zéro. C'est le poste qui demande le plus de temps et le moins de technique.

**Les photographies.** Uniquement de la photographie d'architecture — intérieurs vides, lumière naturelle rasante, pas de personnes, pas de sourires, pas de bureau ouvert, pas de plante en pot au premier plan. Sources exploitables : Unsplash et Pexels en filtrant sur les mots-clés d'architecture d'intérieur et de photographie de bâti. Compter une trentaine d'images retenues sur trois cents regardées.

**L'étalonnage est obligatoire et non négociable.** Toutes les images du site doivent avoir l'air prises par le même photographe le même jour. Applique un traitement unique à l'ensemble : désaturation légère (−12 %), points noirs relevés (l'ombre n'est jamais à zéro dans une photo d'architecture chère), virage froid des ombres vers le bleu-vert, hautes lumières laissées chaudes. Un simple script `sharp` avec les mêmes paramètres pour tout le dossier suffit et fait 80 % du travail :

```bash
# étalonnage de masse — même traitement pour toutes les images
npx sharp-cli -i "src/*.jpg" -o "public/img" \
  --modulate saturation=0.88 --tint "#f0efe8" \
  resize 2400 --withoutEnlargement \
  --format avif --quality 62
```

**La vidéo du seuil.** Six à huit secondes, un plan fixe ou un travelling très lent, muet. Sources : Pexels Video, Coverr, Mixkit. Encoder en deux formats :

```bash
ffmpeg -i source.mov -t 8 -an -vf "scale=1920:-2" \
  -c:v libx264 -crf 23 -preset slow -movflags +faststart public/video/seuil.mp4
ffmpeg -i source.mov -t 8 -an -vf "scale=1920:-2" \
  -c:v libvpx-vp9 -crf 32 -b:v 0 public/video/seuil.webm
ffmpeg -i source.mov -vframes 1 -vf "scale=1920:-2" public/video/seuil-poster.png
```

**Les séquences de frames.** Une par projet, à partir d'un plan de traversée :

```bash
# extraction — 25 fps suffit pour un scrub, 150 frames pour 6 s
ffmpeg -i traversee.mov -vf "fps=25,scale=1600:-2" -q:v 2 tmp/%04d.jpg

# conversion AVIF + manifeste
npx sharp-cli -i "tmp/*.jpg" -o "public/frames/villa-ostrea" --format avif --quality 55
ls public/frames/villa-ostrea | wc -l   # à reporter dans le manifeste
```

Poids visé : moins de 45 ko par frame, moins de 7 Mo par séquence complète. Au-delà, réduire le nombre de frames avant de réduire la qualité — l'œil pardonne un pas de 30 ms, il ne pardonne pas les artefacts de compression sur du travertin.

**Le logotype.** `ROUVIÈRE` en Gambetta, capitales, interlettrage `0.18em`, converti en SVG avec les tracés aplatis (pas de `<text>` : le blend difference et le Flip doivent porter sur une géométrie stable). Un seul fichier, un seul `viewBox`, aucun `fill` déclaré — la couleur vient du CSS, et le blend fait le reste.

---
---

# LIVRE VI — LE CONTRÔLE DE LA CLAQUE
### Le site est fini quand toutes les réponses sont oui

Est-ce qu'on peut décrire le site à quelqu'un en une phrase qui n'est pas « un site d'architecte d'intérieur » ?

Est-ce qu'il existe un moment précis, identifiable, dont on se souvient une semaine plus tard ? Un seul suffit. Zéro est un échec, trois est de la surenchère.

Est-ce que deux chapitres consécutifs partagent leur grammaire de mouvement ? Si oui, l'un des deux est à refaire.

Est-ce qu'on peut supprimer une section entière sans que le site perde quoi que ce soit ? Si oui, la supprimer.

Est-ce que le site tient 60 fps du seuil à la sortie, sur une machine ordinaire, sans ventilateur qui s'emballe ?

Est-ce que la version en mouvement réduit est belle — pas acceptable, belle ?

Est-ce qu'on peut traverser tout le site au clavier seul, sans jamais perdre le focus ?

Est-ce qu'un seul mot du contenu pourrait apparaître tel quel sur le site d'un concurrent ? Si oui, le réécrire.

Est-ce que le fond est devenu crème chaud avec un accent terracotta pendant qu'on avait le dos tourné ? Si oui, rouvrir le Livre I.

Est-ce que le site a l'air cher, ou a-t-il l'air de vouloir avoir l'air cher ? La différence tient dans le nombre de choses qu'on a retirées.
