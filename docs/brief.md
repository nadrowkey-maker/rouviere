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

Trois temps : un écran d'entrée, une apparition, une sortie. Le hero n'est plus un overlay qui disparaît — c'est la première section du parcours, qui reste dans le DOM du début à la fin.

**L'écran d'entrée.** Avant tout, un plein cadre noir : le logotype **ROUVIÈRE** en petit, et deux choix — « Entrer avec le son » et « Entrer en silence ». Rien d'autre, pas de pourcentage de chargement. Cet écran sert aussi de préchargeur : les boutons ne deviennent actifs que lorsque la vidéo du hero et sa poster sont prêtes. Il est techniquement nécessaire, pas décoratif — c'est le geste de clic qui débloque le contexte Web Audio, sans lui aucun son n'est autorisé par le navigateur. « Avec le son » arme la nappe, « en silence » la laisse coupée. Le choix est mémorisé en `sessionStorage`.

**L'apparition.** À la sortie de l'écran d'entrée, la vidéo `public/media/hero/hero.mp4` occupe seule le plein cadre : aucun texte, aucune interface, pendant 2,5 s. Puis ROUVIÈRE paraît au centre en `mix-blend-mode: difference`, **d'un seul bloc, jamais lettre par lettre** — une apparition de générique de film : opacité 0 → 1, échelle 1,06 → 1, flou 10 px → 0, sur 1,8 s en `--e-sortie`. Il tient 1,5 s. Puis il se range en haut à gauche par le Flip existant (le même nœud DOM, du centre au coin). Une fois posé, et seulement là, le bouton son et le burger arrivent en haut à droite, décalés de 120 ms, en 0,6 s. La vidéo boucle sans coupure visible.

**La sortie du hero.** Au défilement, le hero est épinglé et **immobile** : il ne se déplace pas d'un pixel, ne grandit pas, ne glisse pas. Il s'éteint — un voile noir passe de 0 à 1 en scrub, et c'est tout ce qui se passe. On éteint une pièce, on ne fait pas défiler une image. Voile plein, le vestibule est là. C'est un scrub, jamais une durée fixe — donc entièrement réversible : on remonte, le voile se lève, la vidéo revient.

*Le point qui décide de tout, et qui est passé à côté une fois :* l'épinglage doit être en `pinType: "transform"`. `.scene-page` porte en permanence un `transform` et un `filter`, fût-ce à l'identité, ce qui en fait le bloc conteneur de ses descendants fixes ; l'épinglage par défaut, qui passe par `position: fixed`, se cale alors sur la page et non sur le cadre — et le hero remonte avec le défilement au lieu de rester. Tous les épinglages du site portent cette ligne. Il n'y a pas d'exception.

**Le retour en haut.** Un clic sur le logotype de la barre ne rembobine pas neuf écrans en défilement lissé : il passe par **le sas**. L'écran s'éteint par le passage, le saut se fait dans le noir (`lenis.scrollTo(0, { immediate: true })`), l'écran se rallume sur le hero. Pendant ces quelques dixièmes de seconde il n'y a rien qu'un plein noir et le logotype en petit, en haut à gauche, qui l'inverse — c'est l'écran de chargement du site, et il emprunte le geste signature au lieu d'en inventer un. La séquence d'apparition, elle, ne rejoue pas.

Détails d'implémentation : `autoplay muted playsinline preload="auto"` plus une `poster` en AVIF pour le LCP. `mix-blend-mode: difference` exige un `isolation: isolate` sur le conteneur commun ; sur Safari, prévoir le repli par `backdrop-filter: invert(1)` sur un calque dupliqué. L'apparition ne joue qu'une fois par session (`sessionStorage`) : au retour, le logo est déjà en place, sans écran d'entrée ni générique. Les deux boutons de l'écran d'entrée sont l'entrée clavier du site. En mouvement réduit, la poster remplace la vidéo animée, l'apparition se compose sans générique et le Flip se joue en 0,3 s.

**Effets convoqués :** GSAP Flip pour le rangement du logo, un scrub ScrollTrigger épinglé pour le voile de sortie. Pas d'effet de bibliothèque : l'apparition en bloc et le voile sont des timelines GSAP maison.

## Le Vestibule

**C'est le cœur du site.** Ce n'est plus un bloc de texte qui monte ligne par ligne : c'est une séquence en **sept temps**, entièrement pilotée au défilement, où le manifeste de Camille Rouvière se dit un morceau à la fois. Chaque temps a sa place, on respire entre chacun, rien n'apparaît d'un bloc. Tout est en scrub — donc tout se rembobine.

Un cadre collé en haut du viewport, une course de neuf écrans, et des couches qui se relaient dedans. Le cadre est pleine largeur et sans marge propre : son repère local est celui du viewport, ce qui permet au halo du quatrième temps de se caler sur le pointeur sans qu'aucun rect ne soit lu.

**L'apparition des phrases est délibérément nue.** Pas de ligne masquée qui monte de 110 %, pas de flou qui se résorbe, pas de découpe : la phrase paraît, et se pose de huit pixels. Le reveal masqué avec flou est *le* geste que produit n'importe quel générateur sur n'importe quel manifeste — spectaculaire une fois, reconnaissable toujours. La mise en scène de ce chapitre est ailleurs : dans le minutage, dans le noir, dans le halo. Le texte, lui, se contente d'être là.

**Un.** « Je ne décore pas. » paraît seul, tient, puis se retire.

**Deux.** « Je règle la » paraît de la même façon, au même endroit.

**Trois.** Le fond descend jusqu'au noir complet pendant que « Je règle la » s'éteint **avec** lui. La plage est large — un huitième de la course — et la courbe est symétrique (`power1.inOut`) : le fond ne *tombe* pas dans le noir, il y descend. Un passage court sur cette amplitude se lit comme une coupure, et c'est exactement ce qu'on ne veut pas : l'écran s'éteint, il ne s'interrompt pas. La phrase disparaît sur les trois premiers quarts de la plage, si bien qu'on ne voit jamais l'un attendre l'autre. La couche technique de la marge droite (`ATELIER FONDÉ 2011 — PARIS VII`, `CINQ CHANTIERS PAR AN`) part avec, et ne revient pas.

**Quatre.** Dans le noir total, le mot **lumière**, dans une graisse et une taille différentes du reste — mais dans l'autre sens que le réflexe. Il est **plus petit** que les phrases qui l'entourent (0,58 × l'échelle titre, plancher de 40 px tenu), dans le maigre de Gambetta et en italique — le seul italique du site, et c'est la lumière. Un mot seul et monumental au milieu du noir est le monolithe que produit n'importe quel générateur ; la différence se lit ici à la retenue, pas à la taille. Il n'est pas éclairé au départ : il est là, invisible. Un halo doux suit le curseur et ne révèle que la portion des lettres qu'il touche.

*Aucun objet lumineux n'est visible à l'écran* — pas de pastille, pas de forme, pas de source. Uniquement un dégradé radial peint sur toute la surface du cadre et découpé par les lettres (`background-clip: text`) : ce que le halo ne touche pas n'est pas peint, donc n'existe pas. Le blanc de `--craie` vire vers `--laiton` à mi-course, ce qui donne une lumière de tungstène plutôt qu'une lampe de bureau.

Le composant `InteractiveLight` fourni n'est **pas** employé : son bleu, son `borderRadius` et sa pile de `box-shadow` violent trois règles du Livre I d'un coup. Le masque est écrit à la main. Le suivi est une **interpolation par cadre** sur le ticker partagé, jamais une transition CSS — une transition rattraperait le pointeur par paliers et on verrait la lumière avancer par saccades. Sans mouvement pendant deux secondes, le halo dérive de lui-même sur une somme de sinusoïdes incommensurables, pour que la mécanique se découvre seule ; sur pointeur grossier il dérive en permanence. En mouvement réduit, le mot est simplement éclairé en entier.

**Cinq.** « la matière et le silence. » paraît, la lumière se retire — la même course pour les deux.

**Six.** Tout disparaît **sauf le mot « silence »**, qui reste seul et à sa place dans la phrase : ce n'est pas lui qui bouge, c'est ce qui l'entoure qui s'en va. Puis, au défilement, le bassin d'eau interactif monte en plein écran derrière lui. Le voile se rétracte par le haut pendant que l'ancre du bassin remonte du bas, sur la même course et la même courbe : la ligne de partage est exacte, et l'eau *monte* au lieu d'être découverte. Le mot silence reste par-dessus, en `mix-blend-mode: difference`.

La nappe d'ambiance du site **se coupe entièrement ici** — fondu de sortie de 1,5 s sur le bus des nappes — pour ne laisser que le son de l'eau, piloté par la vélocité du curseur. Elle revient à la sortie de la section. Aucun texte, aucune interface, rien d'autre que le mot : c'est l'endroit où l'on doit avoir envie de jouer avec l'eau.

**Sept.** L'eau redescend exactement comme elle est montée, le noir rend la main à l'encre, et « Le reste appartient aux gens qui vivent là. » paraît. Le site reprend.

**Point structurel.** Le bassin a quitté *La Matière* pour venir ici. Il n'existe qu'**une seule scène d'eau dans tout le site** — deux seraient une faute de composition et un coût GPU sans contrepartie. *La Matière* garde ses trois matières en plein écran, et rien d'autre.

**Accessibilité.** La séquence fragmente le manifeste : il est donc donné d'un seul tenant en `sr-only`, dans l'ordre, et les couches visuelles sont `aria-hidden`. C'est la seule façon de rendre un texte découpé en sept temps lisible d'un trait. En mouvement réduit, le composant rend un autre sous-arbre — le manifeste posé d'un bloc sur la colonne 2, *lumière* en italique, et la plaque du bassin plein cadre — et non la séquence à laquelle on aurait retiré le mouvement.

**Effets :** la montée derrière une arête vient de `onscroll-typography-animations` ; `waterwebgl-shader` pour le bassin. Le halo, le voile et le minutage sont des timelines GSAP maison.

## L'Enfilade

**Rupture d'axe.** On arrête de descendre, on se met à traverser. Le défilement vertical est capté et converti en déplacement horizontal : une enfilade de pièces, cinq projets, où les images avancent à des vitesses différentes de leur conteneur et à des profondeurs différentes.

Ce n'est pas une galerie horizontale — c'est un couloir. La couche technique défile en bas à un troisième rythme : `CAP-FERRET · 44°38'N · 620 M² · 2024`.

**Les noms : un seul dominant à la fois.** Un nom de projet fait la moitié de la largeur du cadre ; poussés par une contre-parallaxe affine, ils se chevauchaient et sortaient de l'écran coupés en deux. Chaque nom est donc **calé sur sa pièce**, et sa dominance est une courbe en S de la distance de cette pièce au centre du cadre : pleine au passage au centre, nulle un tiers de cadre plus loin. Le nom dominant est entier, à pleine échelle et pleine densité ; ses voisins ont déjà reculé en échelle et se sont retirés en opacité. Et il n'est **jamais coupé** : sa position est bornée au cadre, sa demi-largeur comprise.

**Le flou est une règle qu'on comprend sans avoir bougé la souris.** Il est en deux étages, et l'ordre compte. D'abord la position dans le cadre commande le flou de base — courbe en S, vraie plage nette au centre, vraie plage floue aux bords : la pièce centrée est **toujours** nettement moins floue que ses voisines, pointeur ou pas. Ensuite le curseur **accentue, localement** : il divise le flou sur la pièce qu'on désigne et l'augmente d'un cran sur les autres. Il ne pose jamais la valeur, il la module. Le calcul reste un flou progressif en fragment shader selon la distance au centre, pas un `filter: blur()` CSS. Au survol, le curseur devient une pastille `ENTRER`.

**Le point de sortie de l'axe horizontal : on plonge dans la dernière image.** Ce n'est **pas** elle qui grandit et vient vers nous — ça, c'est une carte qu'on approche de l'œil. C'est la caméra qui entre dans sa fenêtre : les quatre bords du cadre partent rejoindre les quatre bords de l'écran pendant que le contenu se magnifie d'autant. Techniquement, un `clip-path` qui s'ouvre sur un plan déjà plein cadre, plus une transformation sur l'image qui la fait partir du cadrage exact de la fenêtre.

Puis l'image **tient le plein écran**, un tiers de la course de sortie durant : elle est entièrement installée avant que quoi que ce soit d'autre ne bouge. C'est elle, et pas un fond d'encre, qui est derrière le noyer fumé quand La Matière prend la main.

Le plan DOM prend le relais du plan WebGL sur le premier cinquième de la plongée. Pour que l'échange ne se voie pas, il part du **même grossissement** : le shader échantillonne sa texture sur 85 % de sa surface, le doublon doit donc partir à 1/0,85. C'est la seule raison pour laquelle cette constante est exportée.

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

Trois matières en plein écran, une par écran, et **rien d'autre**. Chacune est un plan macro qui dérive lentement sur sa surface. On passe de l'une à l'autre par masque à bord franc : à aucun instant un pixel de l'écran ne montre deux matières mêlées. Le nom et la couche technique sont peints *dans* le plan, découverts par le même masque, du même geste.

**Le bassin n'est plus ici.** Il a rejoint *Le Vestibule*, où il est le sixième temps du manifeste — l'eau derrière le mot *silence*. Il n'existe qu'une seule scène d'eau dans tout le site : deux simulations à soixante pas par seconde seraient à la fois une faute de composition (on ne joue pas deux fois le morceau de bravoure) et un coût GPU sans contrepartie.

**Effets :** aucun effet de bibliothèque. Le masque et son minutage sont une timeline GSAP maison ; les trois plans sont des vidéos étalonnées.

## L'Atelier

Retour au gris, retour au calme. Camille Rouvière, le processus, la méthode.

Le mouvement change encore : c'est une **séquence filmée**, pas une galerie. Chaque planche est enfermée dans un guichet de 85 à 100 vh qui ne bouge jamais, et c'est l'image qui le traverse. Une planche gagne son échelle pleine au centre du cadre et la perd en s'en éloignant : une seule est dominante à la fois. La variance de largeur et les débordements sont écrits planche par planche dans le manifeste, jamais dérivés de l'index.

**La plongée — le point culminant.** Une séquence qui ne fait que traverser n'a pas de sommet. **Une seule fois**, sur la planche déclarée `plongee` dans le manifeste — la grande pièce de l'atelier, la seule qui déborde des deux marges —, la traversée s'interrompt et **on entre dans la photographie** : même mécanique que la sortie de l'enfilade, les quatre bords du guichet rejoignent ceux de l'écran pendant que le contenu se magnifie. La note de couche technique se retire : au sommet, il n'y a que la photographie.

Puis l'image **tient le plein écran**, et l'épinglage rend la main : la suite de la séquence reprend par le défilement, sous elle. Il n'y a **pas de retour** — l'échelle ne redescend pas, la planche ne réapparaît pas à sa taille d'avant. Une plongée qui se rembobine toute seule au milieu de sa propre course se lit comme un tour de passe-passe.

*Le piège du repère, et il a été payé une fois :* ScrollTrigger enveloppe l'élément épinglé dans un `pin-spacer` positionné. Mesurer le guichet par rapport à la section et le temps par ses `offsetTop` bruts revient alors à comparer deux repères différents — la translation calculée vaut des milliers de pixels et la planche part hors du cadre, d'où l'écran noir et le retour « par magie » en fin de course. **On ne compare que des mesures prises depuis la même racine :** les deux décalages traversent le spacer, qui s'annule dans leur différence.

Tout cela est **en scrub** : le palier lui-même est une plage de la course, pas une seconde qui s'écoule. Et parce qu'un sommet n'existe que par ce qui l'entoure, les deux planches voisines s'assagissent : un peu plus du tiers de leur travelling et de leur retrait d'échelle et de lumière. La séquence se calme avant, se calme après.

**Effets :** aucun effet de bibliothèque. La rotation en 3D de `rotating-onscroll-animations` a été abandonnée avec le reste de sa grammaire ; le guichet, la dominance et la plongée sont des ScrollTriggers maison.

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

Au clic sur le burger, la page courante recule dans la profondeur — elle rétrécit légèrement, se désature et se floute — pendant qu'une surface d'encre vient couvrir le cadre par **le passage**, la seule grammaire de transition du site (voir Livre III). Les entrées du menu arrivent en enfilade, en Gambetta énorme, décalées irrégulièrement.

Au survol d'une entrée de projet, une vidéo muette du projet apparaît derrière le texte. Le passage d'une entrée à l'autre est **instantané** : plus de damier qui s'efface case à case, plus de teinte de monde en surimpression. Ces deux-là fabriquaient un artefact à chaque changement — la nouvelle vidéo se découvrait sous les cellules de l'ancienne, et le calque de couleur multipliait un instant le mauvais monde. Une vidéo remplace l'autre, sec, et rien ne se mélange.

*Et la vidéo ne se montre que quand elle a des images à donner.* L'élément vidéo est unique et réemployé : tant que le nouveau `src` n'a pas décodé sa première image, il affiche encore celle du projet précédent. La montrer tout de suite revenait à faire clignoter, quelques dizaines de millisecondes, la vidéo du dernier projet survolé. On attend donc `loadeddata` ; jusque-là c'est la **photographie du bon projet** qui tient le cadre, posée dans la frame même du survol. À aucun instant le fond ne montre autre chose que le projet désigné.

**Les titres de projets sont en couleur inversée** — `mix-blend-mode: difference`, aucune couleur propre — pour rester lisibles par-dessus n'importe quelle vidéo : clairs sur une pièce sombre, sombres sur un mur de chaux. Cela impose que rien n'isole entre eux et la vidéo : l'empilement interne du menu est rendu à l'ordre du DOM, sans aucun `z-index` positif, sans quoi le blend ne se mélangerait qu'avec du vide.

Ce qui signale l'entrée survolée n'est donc plus le fond, c'est **le titre lui-même** : il se décale vers la droite pendant que ses voisines perdent leur densité et reculent. On sait sans ambiguïté sur quoi le curseur se trouve, même sans média derrière.

**Au clic sur une entrée, la couverture ne s'interrompt jamais.** La surface du menu **reste posée** au lieu de se retirer : la retirer tout de suite découvrait la page qu'on est en train de quitter, le temps que Next aille chercher la nouvelle route et que sa couture se monte — un aller-retour visible. La couture de route s'installe dessous, et la surface du menu s'efface au changement de `pathname`, quand il n'y a plus rien à cacher. Un filet d'une seconde la libère si le `pathname` ne change jamais.

Le burger lui-même n'est pas trois traits qui deviennent une croix : trois dalles fines qui **s'écartent** et pivotent séparément, avec un décalage de 40 ms entre elles. L'écart de l'état ouvert est plus petit que celui qui sépare deux dalles au repos : l'ordre vertical est conservé, aucune ne croise sa voisine, et la figure reste lisible à tout instant de la course.

Ouverture 0,86 s, fermeture 0,62 s — la fermeture est toujours plus rapide que l'ouverture. `lenis.stop()` à l'ouverture, piège de focus, `Échap` ferme, restitution du focus au burger.

**Effets :** `onscroll-typography-animations` pour l'arrivée des entrées ; le flou progressif transposé pour la mise à distance de la page. La surface joue le passage commun.

---
---

# LIVRE III — CASTING DES SEIZE EFFETS

Un site qui utilise seize effets n'est pas un site, c'est une démo technique. Onze sont retenus, cinq sont écartés — et écarter est une décision de direction artistique, pas un renoncement.

**Retenus, et à quel endroit :**

`fullscreen-clip-effect` → entrée dans un projet depuis l'enfilade.
`onscroll-typography-animations` → les sept temps du manifeste au vestibule, les entrées du menu, les reveals retenus des fiches projet.
`horizontal-parallax-gallery` → l'enfilade (version WebGL, distorsion des bords).
`webgl-progressive-blur` → **le shader seulement**, transposé dans Three : flou de l'enfilade, mise à distance de la page derrière le menu.
`depth-gallery` → la profondeur de chaque chambre, et le fond réactif au monde chromatique.
`shader-on-scroll` → grain argentique sur les images des fiches projet.
`rotating-onscroll-animations` → l'atelier.
`shadow` → les échantillons de matière.
`waterwebgl-shader` → le bassin, une seule fois, au sixième temps du vestibule.
`beautiful-typography` → le mot `ARCHIVES`, statique.
`glass-hero` → la sortie.

**Le passage : une seule grammaire de transition.**

Il y en avait trois, et elles se contredisaient : un damier de carrés qui s'éteignaient un à un pour entrer dans un projet, des stores à lamelles horizontales pour revenir au parcours, des lamelles encore pour ouvrir le menu, plus un second damier pour dévoiler l'aperçu d'une entrée. Quatre masques SVG, quatre rythmes, quatre façons de dire la même chose.

Le site n'en garde qu'une, **le fondu de matière**, et elle sert partout — coutures de route, ouverture et fermeture du menu. Ce n'est pas un `opacity: 0 → 1` : une surface qui part s'assombrit jusqu'au noir **et** monte très légèrement en échelle — elle s'éloigne en s'éteignant, comme une pièce dont on baisse la lumière — pendant que celle qui arrive se découvre dessous. Une surface qui vient fait le chemin inverse. C'est le même geste que la sortie du hero, à l'échelle d'une couture : on éteint, on rallume.

Tout tient dans un scalaire, `--passage`, de 0 (surface retirée) à 1 (surface posée) ; l'opacité, la luminosité et l'échelle en descendent en CSS. L'orchestrateur reste le créneau unique par lequel passe tout changement de chapitre ou de route — une seule transition vivante à la fois —, mais il ne décide plus d'un motif : la nature d'un passage ne fait plus que nommer l'endroit d'où vient la demande.

**Écartés, et pourquoi :**

`scroll-transition` — il fournissait les masques SVG du menu et des transitions de chapitre. Le vocabulaire de transition est réduit à un seul passage : le quadrillage qui fait apparaître et disparaître des carrés et la transition par barres horizontales successives sortent du projet, et avec eux la dépendance entière. Une seule grammaire de transition dans tout le site vaut mieux que trois qui se contredisent.


`react-scroll-rig-webgl` — on garde le **motif** (proxy DOM ↔ WebGL, canvas global) et on jette la dépendance. Importer toute la pile React Three Fiber pour un seul chapitre alors que le reste du site est en Three.js impératif, c'est deux architectures qui cohabitent mal et un poids injustifiable.

`gsap-wind-blown-text` — le manifeste se reconstituait par dispersion de lettres au scroll ; l'entrée du site l'abandonne pour un reveal ligne par ligne, plus sobre et plus lisible. Le moteur de vent, son PRNG à graine et sa couche animée `aria-hidden` sortent du projet. (Le PRNG à graine survit ailleurs, pour l'atelier et le bassin, où la reproductibilité au redimensionnement compte encore.)

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
> Construis-le. Le logo est un composant monté dans `app/layout.tsx`, avec un `ref` partagé par contexte, qui ne se démonte jamais — c'est le même nœud DOM qui paraît au centre puis passe à la barre de navigation par GSAP Flip. Le hero n'est pas un overlay : c'est la première section du parcours, qui reste dans le DOM, épinglée, pour que la sortie soit réversible.
>
> Traite explicitement : l'écran d'entrée comme sas audio (le clic ouvre Web Audio) et comme préchargeur (boutons actifs quand la vidéo et la poster sont prêtes) ; `isolation: isolate` pour le blend difference ; le repli Safari ; la poster AVIF pour le LCP ; le `sessionStorage` pour ne jouer l'apparition qu'une fois ; le voile de sortie en scrub épinglé ; le retour en haut par `lenis.scrollTo(0)` sans rejouer l'apparition ; et la version mouvement réduit.
>
> **Terminé quand** le Flip est fluide sur trois frames de ralenti, que le logo inverse bien la vidéo, que le CLS mesuré est à 0, que la sortie du hero se dévide et se rembobine sans à-coup, et qu'un rechargement dans la même session pose le logo directement dans la nav sans écran d'entrée ni clignotement.

---

### Mission — Le chrome

> [Recoller « Le Menu » du Livre II]
>
> Barre de navigation, burger, overlay de menu, curseur personnalisé, bascule de son, barre de progression du parcours, nom du chapitre courant.
>
> **Un seul régime pour tout le chrome, celui du logotype :** `mix-blend-mode: difference`, aucune couleur propre, et un contexte d'isolation unique — `isolation: isolate` sur `<body>`, dont chacun de ces nœuds est un enfant direct. La règle qui va avec, et qui est la seule façon de la tenir : aucun ancêtre d'un nœud qui se mélange ne porte de propriété groupante (opacité intermédiaire, filtre, `will-change` sur l'une des deux). C'est pour cela que le blend est porté par le nœud qui porte aussi la transformation, et que les opacités d'apparition descendent d'un cran. Le curseur est doublé d'un trait sombre légèrement décalé, qui ne paraît que là où le blend est neutralisé.
>
> Le menu n'est pas un panneau qui glisse : la page recule en profondeur et se floute pendant qu'une surface d'encre vient couvrir le cadre par le passage. Les entrées arrivent en enfilade. Au survol, c'est le titre lui-même qui se signale — décalage horizontal, densité perdue par les voisines.
>
> Le burger n'est pas trois traits qui deviennent une croix : trois dalles qui **s'écartent** et pivotent séparément, à 40 ms d'intervalle, sans jamais se superposer.
>
> Le **sas** vit ici aussi : une surface de passage montée en permanence dans le chrome, sous le logotype, qu'un geste peut traverser — l'écran s'éteint, le saut se fait dans le noir, l'écran se rallume. Un seul geste s'en sert aujourd'hui, le retour en haut par le logotype. Elle n'a pas de logotype à elle : celui du chrome, en `difference`, devient le négatif du noir et fait l'écran de chargement à lui seul.
>
> Accessibilité obligatoire : piège de focus, `Échap`, restitution du focus, `aria-expanded`, `lenis.stop()`, jamais `overflow: hidden` sur le body.
>
> **Terminé quand** le menu est intégralement pilotable au clavier, que l'ouverture tient 60 fps, que le curseur reste visible sur n'importe quelle surface — y compris la craie d'une matière claire —, que les titres de projets restent lisibles par-dessus n'importe quelle vidéo, qu'aucun survol ne montre le média d'un autre projet, qu'un clic sur une entrée ne découvre jamais la page qu'on quitte, que le burger reste lisible à tout instant de son ouverture, et qu'un utilisateur en mouvement réduit obtient une ouverture instantanée mais toujours composée.

---

### Mission — Le vestibule

> [Recoller « Le Vestibule »]
>
> Sept temps, un cadre collé, une course de neuf écrans, tout en scrub. Chaque phrase monte de `translateY(110%)` derrière une arête en `overflow: hidden`, flou de 6 px qui se résorbe ; les temps se relaient dans la même cellule de grille, ils ne se poussent pas.
>
> Traite explicitement : le fond en un seul élément et deux scalaires (`--nuit` de l'encre au noir, `--eau` qui le rétracte pour laisser monter le bassin) ; le halo écrit à la main en `background-clip: text`, suivi par interpolation sur le ticker partagé, dérive après deux secondes d'inaction et en permanence sur pointeur grossier ; le lock-step entre le retrait du voile et la remontée de l'ancre du bassin ; la coupure du bus des nappes en 1,5 s à l'entrée de l'eau et son retour à la sortie ; le manifeste en `sr-only` d'un seul tenant, les couches visuelles en `aria-hidden` ; et un sous-arbre distinct en mouvement réduit, pas la séquence dont on aurait retiré le mouvement.
>
> N'emploie pas `InteractiveLight` : son bleu, son `borderRadius` et sa pile de `box-shadow` violent trois règles du Livre I.
>
> **Terminé quand** les sept temps s'enchaînent sans qu'aucun n'apparaisse d'un bloc, que la séquence se rembobine à l'identique, que le halo se découvre seul sans qu'on ait bougé la souris, qu'il n'existe qu'une seule scène d'eau dans tout le projet, et que le manifeste est intégralement lisible par un lecteur d'écran.

---

### Mission — L'enfilade

> [Recoller « L'Enfilade »]
>
> Adapte `horizontal-parallax-gallery` (version WebGL) au rig existant : pas de nouveau canvas, pas de nouvelle boucle, les médias passent par `useGLProxy`. Transpose le fragment de flou progressif de `webgl-progressive-blur` (OGL) vers un `ShaderMaterial` Three.
>
> Le défilement vertical se convertit en déplacement horizontal via ScrollTrigger `pin` + `scrub`. Les images et la couche technique se déplacent à deux vitesses distinctes ; les noms, eux, ne sont pas un tween mais une **loi de dominance** appliquée à chaque cadre, bornée au cadre pour qu'aucun ne soit jamais coupé.
>
> Le flou est en deux étages : la position dans le cadre commande le flou de base, le curseur ne fait que l'accentuer localement. Toutes les mesures de mise en page (centre des pièces, largeur des noms, boîte du plan de sortie) sont lues au rafraîchissement de ScrollTrigger, par la chaîne des `offsetParent` et jamais par un rect — les transformations en cours les fausseraient dès la seconde frame.
>
> La course d'épinglage est prolongée d'un quart pour le plan de sortie : la dernière image grandit jusqu'à couvrir l'écran, en scrub, puis la page reprend sa descente.
>
> **Terminé quand** on traverse les cinq pièces sans accroc, qu'un seul nom est lisible à la fois et qu'aucun n'est coupé, que la règle du flou se comprend sans avoir bougé la souris, que le flou est calculé en shader et non en CSS, que le curseur se magnétise, et que le mode dégradé rend la version DOM/CSS sans WebGL.

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
> Trois matières en plein écran, une par écran, et rien d'autre. Le cadre tient par `sticky`, pas par un `pin` : rien n'est sorti du flux, le retour en arrière est exact au pixel. Le passage d'un plan à l'autre est un masque à bord franc, jamais un fondu — aucune opacité intermédiaire dans ce chapitre. Une seule vidéo décode à la fois ; les trois s'arrêtent hors du chapitre et sur onglet inactif.
>
> Le bassin n'appartient pas à ce chapitre : il est le sixième temps du vestibule. Vérifie qu'il n'existe qu'une seule scène d'eau dans tout le projet.
>
> **Terminé quand** les trois matières s'enchaînent sans qu'aucun pixel n'en montre deux mêlées, qu'aucune vidéo ne décode hors du chapitre, et qu'aucune scène d'eau ne subsiste ici.

---

### Mission — L'atelier, les archives, la sortie

> [Recoller les trois sections]
>
> L'atelier est une séquence filmée : guichet fixe, image qui le traverse, dominance au centre du cadre — et **une plongée**, une seule, sur la planche déclarée `plongee` dans le manifeste. Pilotée en scrub, palier compris ; les deux planches voisines s'assagissent pour la préparer. Les archives sont une liste austère ouverte par le mot `ARCHIVES` en filtre SVG statique repris de `beautiful-typography` (recopier le `<filter>` en JSX, jeter le panneau de contrôle). La sortie porte `glass-hero` avec son `<h2>` doublé en `sr-only` et son repli sur pointeur grossier.
>
> **Terminé quand** les trois chapitres s'enchaînent, que la plongée se rembobine à l'identique et n'a lieu qu'une fois, que le contraste des textes passe AA partout, et que le titre en verre est lu correctement par VoiceOver.

---

### Mission — Les coutures

> Les transitions entre chapitres et entre routes, avec **le passage** et lui seul : le fondu de matière du Livre III. Aucun masque SVG, aucun motif par destination. La nouvelle route est montée sous la surface avant qu'elle ne se retire. Le canvas et le chrome ne se démontent jamais, et l'orchestrateur garantit qu'une seule transition est vivante à un instant donné.
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
