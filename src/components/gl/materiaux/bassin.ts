/**
 * Le bassin — le morceau de bravoure, une seule fois, au sixième temps du
 * vestibule.
 *
 * Porté de `references/github/water-simulator`, qui est lui-même le portage
 * WebGPU de l'eau d'Evan Wallace. **Le dépôt est en WGSL** : ses shaders ne
 * s'exécutent pas ici, ils sont traduits ligne à ligne en GLSL ES 3.00, et les
 * constantes réglées à la main sont reprises telles quelles depuis
 * `src/shaders/**` et `src/main.ts`. Aucune équation n'est réécrite de mémoire.
 *
 * ## Ce qui vient de la source, et où
 *
 * — **La simulation**, `shaders/water/update.frag.wgsl`. Champ de hauteur sur
 *   une grille de 256², quatre canaux : `r` hauteur, `g` vitesse, `ba` normale
 *   compressée. La vitesse gagne `(moyenne des voisins − hauteur) × 2`, perd
 *   `0,5 %` par pas, la hauteur intègre la vitesse. Deux pas par frame, en
 *   ping-pong sur deux cibles flottantes — c'est ce que fait la source, et le
 *   nombre compte : à un seul pas l'onde traîne, à trois elle file.
 * — **La goutte**, `drop.frag.wgsl` : décroissance en cosinus sur le rayon, pas
 *   un gaussien. C'est ce qui donne le bourrelet net au bord de l'impact.
 * — **La normale**, `normal.frag.wgsl` : produit vectoriel des deux tangentes
 *   tirées des différences de hauteur, stocké dans `ba`.
 * — **La caustique**, `caustics.vert.wgsl` + `caustics.frag.wgsl`, et c'est le
 *   cœur de l'effet. On ne dessine pas des nervures : pour chaque sommet de la
 *   surface on réfracte le rayon de soleil (Snell, IOR 1,333), on le projette
 *   sur le fond, et l'intensité est le **rapport des aires** avant/après
 *   déformation — mesuré par `dFdx`/`dFdy` sur les deux positions projetées.
 *   La lumière est brillante là où les triangles se resserrent. Le mélange est
 *   additif : plusieurs rayons tombent au même endroit et s'y ajoutent.
 * — **Le fond de piscine**, `pool.vert.wgsl` + `pool.frag.wgsl` : cube ouvert
 *   par le haut, murs et sol carrelés, occlusion ambiante analytique en
 *   `0,5 / |point|`, ombre de margelle en sigmoïde, teinte d'absorption sous
 *   l'eau. **Gardé tel quel**, y compris la texture `tiles.jpg` de la source, et
 *   y compris la transformation `y → (1 − y)·7/12 − 1` qui donne au bassin sa
 *   profondeur et pose la margelle à `2/12` — la constante qu'on retrouve dans
 *   les trois shaders d'ombre.
 * — **La surface**, `surface.vert.wgsl` + `surface-above.frag.wgsl` : lancer de
 *   rayon réfléchi et réfracté à travers la normale, mélangés par Fresnel. Le
 *   raffinement itératif de l'UV — cinq passes de `uv += info.ba * 0.005` — est
 *   repris tel quel : c'est lui qui enlève l'aspect facetté de la surface.
 *
 * ## Les deux adaptations demandées
 *
 * — **La caméra est au-dessus, à la verticale, pointée vers le bas.** La démo
 *   orbitait à −25° de site ; ici elle est posée à l'aplomb du bassin. Deux
 *   conséquences qu'il faut assumer : le terme de Fresnel tombe à son plancher
 *   (on regarde la surface de face, elle réfléchit peu), donc **ce qu'on voit
 *   est surtout le fond réfracté et ses caustiques** — ce qui est précisément
 *   le sujet ; et la hauteur est choisie pour que le cadre tienne *à
 *   l'intérieur* du bassin, si bien qu'aucun mur n'entre dans l'image et que
 *   l'eau est pleine page.
 * — **La sphère de la démo est supprimée.** Pas neutralisée par un drapeau :
 *   retirée. Avec elle sortent `sphere.ts`, `sphere.frag.wgsl`, la passe de
 *   déplacement d'eau, la flottabilité, l'intersection rayon/sphère, son
 *   occlusion ambiante, et le canal `g` d'ombre portée de la caustique — qui
 *   valait `mix(1, ombre, shadows.sphere)`, donc constamment 1 dès que la
 *   sphère n'est plus là. Le code de ces chemins n'est pas commenté, il n'existe
 *   pas.
 *
 * ## Ce qui a été jeté par ailleurs
 *
 * Le panneau `lil-gui` et toute la table `settings` — les valeurs réglées sont
 * figées en constantes ci-dessous, sous leurs noms d'origine pour rester
 * traçables. `wgpu-matrix`, remplacé par les matrices de Three. Les contrôles
 * de démo (orbite à la souris, gravité au `G`, pause à l'espace). La boucle
 * `requestAnimationFrame` de `main.ts`, remplacée par l'abonnement au ticker via
 * le rig. Le second contexte — ici tout passe par le renderer du rig.
 *
 * Le ciel : la source échantillonne un cubemap photographique de six JPEG. Il
 * n'entre pas — un ciel de vacances dans un site dont la thèse est que Paris est
 * gris serait un contresens, et le Livre I interdit toute couleur hors des
 * jetons. Il est remplacé par un dégradé calculé en GLSL entre `--encre` et
 * `--sel`, ce que le Livre I autorise explicitement, plus le spéculaire de
 * soleil de la source, à son exposant d'origine.
 *
 * ## Comment il s'inscrit dans le site
 *
 * Un seul canvas, un seul renderer, une seule boucle : les six passes par frame
 * (gouttes, deux pas, normales, caustiques, scène) sont des rendus vers cibles
 * déclenchés depuis `cadre`, c'est-à-dire depuis le ticker GSAP, avant le rendu
 * de la scène commune. La scène 3D du bassin — sa caméra propre, son test de
 * profondeur — vit dans une cible hors écran, et c'est cette cible que le rig
 * affiche sur le plan calé sur l'ancre DOM. Le rig ne sait rien de tout cela :
 * il voit un plan, comme pour les autres chapitres.
 *
 * L'espace colorimétrique traverse la chaîne sans être touché, et c'est
 * délibéré : la source écrit des valeurs d'affichage, pas des valeurs
 * linéaires. La cible est donc déclarée en sRGB et les carreaux sans espace, si
 * bien que la conversion de sortie du renderer et la décompression de lecture
 * s'annulent. Le rendu est celui de la démo, au bit près.
 */
import * as THREE from "three";
import type { ContexteRig, Fabrique, PlanScene } from "../moteur";
import { couleurJeton } from "../couleurs";
import { aleatoireAGraine } from "@/lib/aleatoire";

/* ==========================================================================
   Constantes — toutes reprises de la source, référence à l'appui
   ========================================================================== */

/** Côté de la grille de simulation. `main.ts` : `new Water(device, 256, 256, …)`. */
const RESOLUTION = 256;

/** Côté de la texture de caustiques. `water.ts` : `size: [1024, 1024]`. */
const CAUSTIQUES = 1024;

/**
 * Subdivision de la surface. `water.ts` : `const detail = 200`.
 *
 * Sur pointeur grossier on descend à 128 : la grille est parcourue **deux
 * fois** par frame — une pour la caustique, une pour la surface —, ce qui en
 * fait le poste de sommets dominant du site, et un téléphone n'a pas les
 * pixels pour voir la différence.
 */
const DETAIL_FIN = 200;
const DETAIL_MOBILE = 128;

/** `main.ts` : deux `stepSimulation()` par frame, « for stability ». */
const PAS_PAR_CADRE = 2;

/**
 * Pas de temps fixe et plafond de rattrapage. La source avance d'un pas par
 * frame sans horloge ; on garde la cadence mais on la borne, sans quoi une
 * frame lente ferait exploser le champ de hauteur au retour d'un onglet.
 */
const PAS = 1 / 60;
const MAX_SOUS_PAS = 3;

/** Direction du soleil. `main.ts` : `new Vector(2.0, 2.0, -1.0).unit()`. */
const SOLEIL = [2.0, 2.0, -1.0] as const;

/** `settings` de `main.ts`, groupe « Water ». */
const INTENSITE_CAUSTIQUE = 0.2;
const IOR_EAU = 1.333;
const FRESNEL_MIN = 0.25;

/** `main.ts` : `water.addDrop(x, z, 0.03, 0.01)` au survol de la surface. */
const GOUTTE_RAYON = 0.03;

/**
 * Force de la goutte. La source en a une seule, `0,01`, parce qu'elle ne
 * connaît que le fait qu'on a bougé. Ici la force **suit la vitesse de la
 * main** — effleurer ride, balayer creuse —, et la plage est centrée sur la
 * valeur d'origine plutôt que posée à côté.
 */
const GOUTTE_BASE = 0.004;
const GOUTTE_AMPLITUDE = 0.016;

/**
 * Vitesse du pointeur, en pixels par cadre, au-delà de laquelle la goutte est à
 * son plein. **C'est le même seuil que celui du son** (`EAU_VITESSE_PLEINE`
 * dans `SonProvider`), et ce n'est pas une coïncidence : une seule vitesse
 * lissée alimente les deux, sur la même échelle, pour que ce qu'on entend soit
 * exactement ce qu'on voit.
 */
const VITESSE_PLEINE = 30;

/**
 * Lissage de la vitesse du pointeur, par cadre.
 *
 * La vitesse brute d'une souris est un signal en dents de scie : un système
 * d'exploitation livre les positions par paquets, et une frame sur trois n'a
 * rien bougé. Prise telle quelle, elle ferait clignoter le gain de l'eau et
 * hacher l'injection de l'onde. Le coefficient est celui d'une interpolation
 * classique — 0,12 par cadre, soit une constante de temps d'environ un huitième
 * de seconde à soixante hertz : assez court pour que le geste s'entende, assez
 * long pour que le silence entre deux paquets ne s'entende pas.
 */
const LISSAGE_VITESSE = 0.12;

/** Force de la goutte au clic. Franche, et sans rapport avec la vitesse. */
const CLIC_FORCE = 0.05;
const CLIC_RAYON = 0.05;

/**
 * Gouttes d'amorçage. `main.ts` en jette vingt au démarrage, alternées vers le
 * haut et vers le bas :
 * `water.addDrop(rand*2-1, rand*2-1, 0.03, i & 1 ? 0.01 : -0.01)`.
 */
const AMORCE_NOMBRE = 20;
const AMORCE_FORCE = 0.01;

/**
 * Gouttes ambiantes. Elles ne viennent pas de la source — la démo compte sur sa
 * sphère pour agiter l'eau, et la sphère est partie. Sans elles la surface
 * serait plate avant qu'on ne la touche, c'est-à-dire au moment exact où le
 * chapitre demande qu'on ait envie de jouer avec.
 *
 * Le hasard est **à graine**, comme au reste du site : deux visites donnent la
 * même pluie, et un redimensionnement ne rebat pas les cartes en cours de route.
 */
const AMBIANT_NOMBRE = 3;
const AMBIANT_FORCE = 0.0055;
const AMBIANT_RAYON = 0.035;
/** Secondes entre deux gouttes d'une même source, avant dispersion. */
const AMBIANT_PERIODE = 1.6;
/** Les gouttes ambiantes s'atténuent tant que quelqu'un remue l'eau. */
const AMBIANT_MULT_ACTIF = 0.35;
/** Secondes sans interaction au-delà desquelles elles reprennent leur plein. */
const INACTIF = 2.2;

/** Gouttes traitées au plus par frame : chacune est une passe complète. */
const MAX_GOUTTES_PAR_CADRE = 4;

/**
 * Hauteur de la caméra au-dessus de la surface.
 *
 * Elle n'est pas choisie à l'œil. Le champ vertical vaut 45° (`main.ts` :
 * `mat4.perspective(Math.PI / 4, …)`), donc à la hauteur `h` la demi-hauteur
 * visible sur le plan d'eau vaut `h · tan(22,5°) ≈ 0,414 h`, et la demi-largeur
 * autant multiplié par le rapport d'image. Le bassin s'étend sur `[-1, 1]` :
 * pour qu'aucun mur n'entre dans le cadre d'un écran large, il faut
 * `0,414 · h · 1,78 ≤ 1`, soit `h ≤ 1,36`. À 1,3, un écran 16/9 voit une
 * demi-largeur de 0,96 — tout juste à l'intérieur —, et l'eau est pleine page.
 *
 * Le plafonnement à `HAUTEUR_MAX` reprend le calcul en sens inverse pour les
 * rapports d'image plus larges encore, où 1,3 laisserait paraître les murs.
 */
const HAUTEUR_CAMERA = 1.3;
const CHAMP = 45;
/** `tan(CHAMP / 2)`, écrit une fois. */
const TANGENTE_DEMI_CHAMP = Math.tan((CHAMP * Math.PI) / 360);

/** Pas de simulation joués d'un coup pour poser une eau au repos. */
const PAS_AMORCAGE = 90;

/**
 * **Plafond de pixels du rendu de l'eau.** C'est le réglage qui décide si le
 * chapitre tient les soixante images par seconde, et il mérite son chiffre.
 *
 * Le fragment de surface est de loin le plus cher du site : cinq passes de
 * raffinement d'UV, puis **deux** lancers de rayon — le réfléchi et le
 * réfracté — dont chacun rappelle le fond du bassin et ses trois lectures de
 * texture. Une douzaine d'échantillonnages par pixel, plus les intersections.
 *
 * Rendu à la densité de l'écran, un cadre plein sur un portable 2560 × 1440 en
 * DPR 2 ferait quatorze millions de pixels, soit près de cent-soixante-dix
 * millions de lectures par image : la démo d'origine, elle, tourne sur un
 * canvas de l'ordre du million de pixels. On plafonne donc la cible et le plan
 * l'étire en filtrage linéaire.
 *
 * L'eau est la seule surface du site où cela ne se voit pas : elle n'a aucune
 * arête franche, ses caustiques sont douces par nature, et elle bouge. Le même
 * plafond posé sur une photographie d'architecture serait impardonnable ; ici
 * il est invisible, et il achète le chapitre entier.
 */
const PIXELS_MAX = 1600 * 900;

/* ==========================================================================
   GLSL — traduction des shaders WGSL de la source
   ========================================================================== */

/**
 * `shaders/common/functions.wgsl`. Intersection rayon/boîte, utilisée par la
 * caustique, le fond et la surface. Elle est incluse aussi dans un shader de
 * sommets, ce que GLSL permet sans réserve.
 */
const CHUNK_CUBE = /* glsl */ `
  vec2 intersectCube(vec3 origine, vec3 rayon, vec3 boiteMin, vec3 boiteMax) {
    vec3 tMin = (boiteMin - origine) / rayon;
    vec3 tMax = (boiteMax - origine) / rayon;
    vec3 t1 = min(tMin, tMax);
    vec3 t2 = max(tMin, tMax);
    float proche = max(max(t1.x, t1.y), t1.z);
    float loin = min(min(t2.x, t2.y), t2.z);
    return vec2(proche, loin);
  }
`;

/** Le plan plein cadre des passes de simulation. */
const SOMMET_PLEIN_CADRE = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

/** `shaders/water/drop.frag.wgsl`. Décroissance en cosinus, pas un gaussien. */
const FRAGMENT_GOUTTE = /* glsl */ `
  precision highp float;
  uniform sampler2D uEtat;
  uniform vec2 uCentre;
  uniform float uRayon;
  uniform float uForce;
  varying vec2 vUv;

  void main() {
    vec4 info = texture2D(uEtat, vUv);
    float goutte = max(0.0, 1.0 - length(uCentre * 0.5 + 0.5 - vUv) / uRayon);
    goutte = 0.5 - cos(goutte * 3.14159265) * 0.5;
    info.r += goutte * uForce;
    gl_FragColor = info;
  }
`;

/** `shaders/water/update.frag.wgsl`. Le pas de simulation, à la ligne près. */
const FRAGMENT_SIMULATION = /* glsl */ `
  precision highp float;
  uniform sampler2D uEtat;
  uniform vec2 uTexel;
  varying vec2 vUv;

  void main() {
    vec4 info = texture2D(uEtat, vUv);

    vec2 dx = vec2(uTexel.x, 0.0);
    vec2 dy = vec2(0.0, uTexel.y);

    float moyenne = (
      texture2D(uEtat, vUv - dx).r +
      texture2D(uEtat, vUv - dy).r +
      texture2D(uEtat, vUv + dx).r +
      texture2D(uEtat, vUv + dy).r
    ) * 0.25;

    /* La vitesse gagne l'écart à la moyenne des voisins, perd un demi-pour-cent
       par pas, et la hauteur l'intègre. Trois lignes, et c'est toute l'onde. */
    info.g += (moyenne - info.r) * 2.0;
    info.g *= 0.995;
    info.r += info.g;

    gl_FragColor = info;
  }
`;

/** `shaders/water/normal.frag.wgsl`. La normale dans les canaux `ba`. */
const FRAGMENT_NORMALE = /* glsl */ `
  precision highp float;
  uniform sampler2D uEtat;
  uniform vec2 uTexel;
  varying vec2 vUv;

  void main() {
    vec4 info = texture2D(uEtat, vUv);

    float hx = texture2D(uEtat, vec2(vUv.x + uTexel.x, vUv.y)).r;
    float hy = texture2D(uEtat, vec2(vUv.x, vUv.y + uTexel.y)).r;

    vec3 dx = vec3(uTexel.x, hx - info.r, 0.0);
    vec3 dy = vec3(0.0, hy - info.r, uTexel.y);

    vec3 normale = normalize(cross(dy, dx));
    info.b = normale.x;
    info.a = normale.z;

    gl_FragColor = info;
  }
`;

/**
 * `shaders/water/caustics.vert.wgsl`.
 *
 * **Le seul endroit du portage où une ligne change de signe.** La source écrit
 * `vec4f(projectedPos.x, -projectedPos.y, …)` parce que WebGPU place l'origine
 * de texture en haut à gauche : la négation y remet le sommet en face du texel
 * que le fond ira lire. WebGL place l'origine en bas à gauche, où la relation
 * `v = (y_clip + 1) / 2` est déjà celle de la lecture `uv = projete * 0,5 + 0,5`
 * du fond — la négation ferait donc exactement le contraire de ce qu'elle fait
 * là-bas, et retournerait la caustique par rapport à l'onde qui la produit.
 */
const SOMMET_CAUSTIQUE = /* glsl */ `
  uniform sampler2D uEtat;
  uniform vec3 uSoleil;

  varying vec3 vAncien;
  varying vec3 vNouveau;

  ${CHUNK_CUBE}

  /* Projette un rayon depuis la surface jusqu'au fond du bassin. */
  vec3 projeter(vec3 origine, vec3 rayon, vec3 lumiereRefractee) {
    float hauteurBassin = 1.0;
    vec3 point = origine;
    vec2 tcube = intersectCube(origine, rayon,
                               vec3(-1.0, -hauteurBassin, -1.0), vec3(1.0, 2.0, 1.0));
    point += rayon * tcube.y;
    float tplan = (-point.y - 1.0) / lumiereRefractee.y;
    return point + lumiereRefractee * tplan;
  }

  void main() {
    vec2 uvEtat = position.xy * 0.5 + 0.5;
    vec4 info = textureLod(uEtat, uvEtat, 0.0);

    /* Normale reconstruite, à demi-amplitude : la source amortit ici pour que
       la caustique ne parte pas en aiguilles sur les crêtes. */
    vec2 ba = info.ba * 0.5;
    vec3 normale = vec3(ba.x, sqrt(max(0.0, 1.0 - dot(ba, ba))), ba.y);

    const float IOR_AIR = 1.0;
    const float IOR = 1.333;
    vec3 dirSoleil = normalize(uSoleil);

    /* Eau plate : la référence. Eau déformée : le rayon réel. */
    vec3 lumiereRefractee = refract(-dirSoleil, vec3(0.0, 1.0, 0.0), IOR_AIR / IOR);
    vec3 rayon = refract(-dirSoleil, normale, IOR_AIR / IOR);

    vec3 pos = vec3(position.x, 0.0, position.y);
    vAncien = projeter(pos, lumiereRefractee, lumiereRefractee);
    vNouveau = projeter(pos + vec3(0.0, info.r, 0.0), rayon, lumiereRefractee);

    vec2 projete = 0.75 * (vNouveau.xz
                           - vNouveau.y * lumiereRefractee.xz / lumiereRefractee.y);
    gl_Position = vec4(projete.x, projete.y, 0.0, 1.0);
  }
`;

/**
 * `shaders/water/caustics.frag.wgsl`.
 *
 * L'intensité est le rapport des aires avant et après réfraction — le
 * déterminant du jacobien de la carte des rayons, mesuré par les dérivées
 * d'écran. La lumière converge là où les triangles se resserrent.
 *
 * Le canal vert portait l'ombre de la sphère. Sans sphère, la source y écrivait
 * `mix(1.0, ombre, 0.0)`, c'est-à-dire 1 ; il vaut donc 1, et le fond continue
 * de le multiplier sans le savoir.
 */
const FRAGMENT_CAUSTIQUE = /* glsl */ `
  precision highp float;
  uniform vec3 uSoleil;
  uniform float uIntensite;

  varying vec3 vAncien;
  varying vec3 vNouveau;

  ${CHUNK_CUBE}

  void main() {
    float aireAncienne = length(dFdx(vAncien)) * length(dFdy(vAncien));
    float aireNouvelle = length(dFdx(vNouveau)) * length(dFdy(vNouveau));
    float intensite = aireAncienne / aireNouvelle * uIntensite;

    const float IOR_AIR = 1.0;
    const float IOR = 1.333;
    vec3 lumiereRefractee =
      refract(-normalize(uSoleil), vec3(0.0, 1.0, 0.0), IOR_AIR / IOR);

    /* Ombre de margelle : le bord du bassin arrête le soleil rasant. */
    float hauteurBassin = 1.0;
    vec2 t = intersectCube(vNouveau, -lumiereRefractee,
                           vec3(-1.0, -hauteurBassin, -1.0), vec3(1.0, 2.0, 1.0));
    float ombreBord = 1.0 / (1.0 + exp(
      -200.0 / (1.0 + 10.0 * (t.y - t.x))
      * (vNouveau.y - lumiereRefractee.y * t.y - 2.0 / 12.0)));
    intensite *= ombreBord;

    gl_FragColor = vec4(intensite, 1.0, 0.0, 1.0);
  }
`;

/**
 * Le fond du bassin, éclairé.
 *
 * C'est le corps commun de `pool.frag.wgsl` et de `getWallColor` dans
 * `surface-above.frag.wgsl` — les deux étaient déjà identiques dans la source à
 * l'occlusion de la sphère près, qui n'existe plus. Un seul texte pour les deux
 * : c'est la seule façon d'être sûr que ce qu'on voit à travers l'eau et ce
 * qu'on voit au bord du cadre sont la même piscine.
 */
const CHUNK_MUR = /* glsl */ `
  uniform sampler2D uCarreaux;
  uniform sampler2D uEtat;
  uniform sampler2D uCaustiques;
  uniform vec3 uSoleil;

  /* Les deux indices de réfraction, déclarés une seule fois pour tout le
     fichier qui inclut ce bloc. Ils étaient locaux à la fonction et redéclarés
     au-dessus dans le shader de surface : légal, mais deux noms identiques dans
     deux portées d'un même fichier sont exactement le genre de détail qu'un
     pilote strict refuse un jour, sur une machine qu'on n'a pas. */
  const float IOR_AIR = 1.0;
  const float IOR_EAU = 1.333;

  vec3 couleurMur(vec3 point) {
    vec3 couleur;
    vec3 normale = vec3(0.0, 1.0, 0.0);

    /* Le carrelage se lit selon la face : les murs prennent deux axes, le sol
       les deux autres. */
    if (abs(point.x) > 0.999) {
      couleur = texture2D(uCarreaux, point.yz * 0.5 + vec2(1.0, 0.5)).rgb;
      normale = vec3(-point.x, 0.0, 0.0);
    } else if (abs(point.z) > 0.999) {
      couleur = texture2D(uCarreaux, point.yx * 0.5 + vec2(1.0, 0.5)).rgb;
      normale = vec3(0.0, 0.0, -point.z);
    } else {
      couleur = texture2D(uCarreaux, point.xz * 0.5 + 0.5).rgb;
    }

    float hauteurBassin = 1.0;

    /* Occlusion ambiante analytique : les angles du bassin sont plus sombres,
       et ça ne coûte qu'une division. */
    float echelle = 0.5 / length(point);

    vec3 lumiereRefractee =
      -refract(-uSoleil, vec3(0.0, 1.0, 0.0), IOR_AIR / IOR_EAU);
    float diffus = max(0.0, dot(lumiereRefractee, normale));

    vec4 info = texture2D(uEtat, point.xz * 0.5 + 0.5);
    if (point.y < info.r) {
      /* Sous l'eau : la caustique éclaire. */
      vec2 uvCaustique = 0.75 * (point.xz
        - point.y * lumiereRefractee.xz / lumiereRefractee.y) * 0.5 + 0.5;
      vec4 caustique = texture2D(uCaustiques, uvCaustique);
      echelle += diffus * caustique.r * 2.0 * caustique.g;
    } else {
      /* Au-dessus : l'ombre de la margelle, en sigmoïde. */
      vec2 t = intersectCube(point, lumiereRefractee,
                             vec3(-1.0, -hauteurBassin, -1.0), vec3(1.0, 2.0, 1.0));
      float ombre = 1.0 / (1.0 + exp(
        -200.0 / (1.0 + 10.0 * (t.y - t.x))
        * (point.y + lumiereRefractee.y * t.y - 2.0 / 12.0)));
      echelle += diffus * ombre * 0.5;
    }

    return couleur * echelle;
  }
`;

/**
 * `shaders/pool/pool.vert.wgsl`. La transformation qui creuse le bassin :
 * l'arête haute du cube tombe à `2/12` au-dessus de l'eau, le fond à `-1`.
 */
const SOMMET_BASSIN = /* glsl */ `
  varying vec3 vPos;
  void main() {
    vec3 p = position;
    p.y = (1.0 - position.y) * (7.0 / 12.0) - 1.0;
    vPos = p;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

/** `shaders/pool/pool.frag.wgsl`, moins la sphère. */
const FRAGMENT_BASSIN = /* glsl */ `
  precision highp float;
  varying vec3 vPos;
  uniform vec3 uTeinteSousEau;

  ${CHUNK_CUBE}
  ${CHUNK_MUR}

  void main() {
    vec3 couleur = couleurMur(vPos);
    vec4 info = texture2D(uEtat, vPos.xz * 0.5 + 0.5);
    if (vPos.y < info.r) couleur *= uTeinteSousEau * 1.2;
    gl_FragColor = vec4(couleur, 1.0);
  }
`;

/** `shaders/water/surface.vert.wgsl`. Le plan XY devient le plan XZ, hauteur lue. */
const SOMMET_SURFACE = /* glsl */ `
  uniform sampler2D uEtat;
  varying vec3 vMonde;

  void main() {
    vec2 uvEtat = position.xy * 0.5 + 0.5;
    vec4 info = textureLod(uEtat, uvEtat, 0.0);
    vec3 p = vec3(position.x, info.r, position.y);
    vMonde = p;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

/**
 * `shaders/water/surface-above.frag.wgsl`, moins la sphère et moins le cubemap.
 *
 * `cameraPosition` est fourni par Three à tout `ShaderMaterial` : c'est
 * exactement l'`eyePosition` que la source transportait à la main dans son
 * tampon d'uniformes, et nos maillages sont à l'identité, donc l'espace du
 * bassin *est* l'espace monde.
 */
const FRAGMENT_SURFACE = /* glsl */ `
  precision highp float;
  varying vec3 vMonde;

  uniform vec3 uCielBas;
  uniform vec3 uCielHaut;
  uniform vec3 uEclat;
  uniform float uIOR;
  uniform float uFresnelMin;

  ${CHUNK_CUBE}
  ${CHUNK_MUR}

  /* Teinte de l'eau vue d'au-dessus — ABOVEwaterColor de la source. C'est un
     coefficient d'absorption, pas une palette : il rend le rouge plus vite que
     le bleu quand le rayon descend. */
  const vec3 TEINTE_EAU = vec3(0.25, 1.0, 1.25);

  /* Le ciel, calculé. Le cubemap photographique de la démo n'entre pas ici :
     deux jetons et un dégradé GLSL, plus le spéculaire de soleil d'origine. */
  vec3 ciel(vec3 rayon) {
    vec3 fond = mix(uCielBas, uCielHaut, clamp(rayon.y * 0.5 + 0.5, 0.0, 1.0));
    float soleil = pow(max(0.0, dot(normalize(uSoleil), rayon)), 5000.0);
    return fond + soleil * uEclat * 10.0;
  }

  /* Le lancer de rayon depuis la surface. */
  vec3 couleurRayon(vec3 origine, vec3 rayon) {
    float hauteurBassin = 1.0;
    vec2 t = intersectCube(origine, rayon,
                           vec3(-1.0, -hauteurBassin, -1.0), vec3(1.0, 2.0, 1.0));
    vec3 impact = origine + rayon * t.y;

    vec3 couleur;
    if (rayon.y < 0.0) {
      /* Vers le bas : le fond du bassin, et l'eau qui absorbe au passage. */
      couleur = couleurMur(impact) * TEINTE_EAU;
    } else if (impact.y < 2.0 / 12.0) {
      /* Vers le haut, mais sous la margelle : encore le mur. */
      couleur = couleurMur(impact);
    } else {
      couleur = ciel(rayon);
    }
    return couleur;
  }

  void main() {
    /* Raffinement itératif de l'UV : cinq passes, pas de la source. Sans elles
       la surface est facettée — on lit la normale du texel voisin de celui qui
       porte réellement le point. */
    vec2 uvEtat = vMonde.xz * 0.5 + 0.5;
    vec4 info = texture2D(uEtat, uvEtat);
    for (int i = 0; i < 5; i++) {
      uvEtat += info.ba * 0.005;
      info = texture2D(uEtat, uvEtat);
    }

    vec2 ba = info.ba;
    vec3 normale = vec3(ba.x, sqrt(max(0.0, 1.0 - dot(ba, ba))), ba.y);

    vec3 incident = normalize(vMonde - cameraPosition);
    vec3 reflechi = reflect(incident, normale);
    vec3 refracte = refract(incident, normale, IOR_AIR / uIOR);

    /* Vue à l'aplomb, ce terme reste près de son plancher : la surface réfléchit
       peu et laisse voir le fond. C'est la conséquence assumée de la caméra
       zénithale, et c'est ce qu'on veut — le sujet est la caustique. */
    float fresnel = mix(uFresnelMin, 1.0,
                        pow(1.0 - dot(normale, -incident), 3.0));

    vec3 cReflechi = couleurRayon(vMonde, reflechi);
    vec3 cRefracte = couleurRayon(vMonde, refracte);

    gl_FragColor = vec4(mix(cRefracte, cReflechi, fresnel), 1.0);
  }
`;

/* ==========================================================================
   Types publics — inchangés : le chapitre ne sait pas que l'eau a changé
   ========================================================================== */

export type EtatBassin = {
  /** Pointeur en coordonnées client, ou `null` hors du bassin. */
  pointeur: { x: number; y: number } | null;
  /** Incrémenté à chaque clic : le chapitre pousse, le shader consomme. */
  clics: number;
};

export type ReglagesBassin = {
  etat: { current: EtatBassin };
  /** La plaque affichée quand WebGL2 ou les cibles flottantes manquent. */
  repli: string;
  /**
   * La vitesse lissée du pointeur sur le bassin, en pixels par frame, remontée
   * à chaque cadre — `null` dès qu'il en est sorti.
   *
   * C'est **la même grandeur** qui creuse l'onde et qui ouvre le gain de l'eau :
   * elle est calculée une fois, ici, et distribuée. Deux mesures parallèles, si
   * proches soient leurs formules, dériveraient — et on entendrait de l'eau là
   * où on n'en verrait pas.
   */
  onVitesse?: (vitesse: number | null) => void;
};

/** Une goutte en attente : position dans `[-1, 1]`, force, rayon. */
type Goutte = { x: number; z: number; force: number; rayon: number };

/** Une source de gouttes ambiantes : un point qui dérive et goutte. */
type Source = {
  x: number;
  z: number;
  amplitude: number;
  vitesse: number;
  phase: number;
  prochaine: number;
};

/* ==========================================================================
   Le repli
   ========================================================================== */

/**
 * Sans WebGL2 ou sans cible flottante, on ne dégrade pas la simulation : on
 * l'abandonne et on montre la plaque. Une eau sans champ de hauteur signé n'est
 * pas une eau moins fine, c'est une autre image.
 */
function planDeRepli(source: string): PlanScene {
  const materiau = new THREE.MeshBasicMaterial({ transparent: true });
  materiau.opacity = 0;

  let texture: THREE.Texture | null = null;
  new THREE.TextureLoader().load(source, (chargee) => {
    chargee.colorSpace = THREE.SRGBColorSpace;
    materiau.map = chargee;
    materiau.opacity = 1;
    materiau.needsUpdate = true;
    texture = chargee;
  });

  const plan = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), materiau);
  plan.frustumCulled = false;

  return {
    objet: plan,
    liberer: () => {
      plan.geometry.dispose();
      materiau.dispose();
      texture?.dispose();
    },
  };
}

/* ==========================================================================
   La géométrie du bassin — `pool.ts`, `createGeometry()`
   ========================================================================== */

/**
 * Le cube ouvert par le haut : quatre murs et un sol, cinq faces sur six.
 *
 * La source tire ses sommets par « octant picking » — chaque bit de l'indice
 * commande un axe. On garde la technique et la table des faces telles quelles ;
 * seule la face `-y`, celle qui fermerait le bassin par le haut, reste absente.
 */
function geometrieBassin(): THREE.BufferGeometry {
  const octant = (i: number): [number, number, number] => [
    (i & 1) * 2 - 1,
    (i & 2) - 1,
    (i & 4) / 2 - 1,
  ];

  /* `cubeData` de la source, sans la face `-y`. */
  const faces = [
    [0, 4, 2, 6], // -x
    [1, 3, 5, 7], // +x
    [2, 6, 3, 7], // +y — le sol
    [0, 2, 1, 3], // -z
    [4, 5, 6, 7], // +z
  ];

  const positions: number[] = [];
  const indices: number[] = [];
  let n = 0;

  for (const face of faces) {
    const base = n;
    for (const sommet of face) {
      positions.push(...octant(sommet));
      n += 1;
    }
    indices.push(base, base + 1, base + 2);
    indices.push(base + 2, base + 1, base + 3);
  }

  const geometrie = new THREE.BufferGeometry();
  geometrie.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometrie.setIndex(indices);
  return geometrie;
}

/* ==========================================================================
   La fabrique
   ========================================================================== */

export function fabriquerBassin(reglages: ReglagesBassin): Fabrique {
  return (contexte: ContexteRig) => {
    const { renderer, pointeurGrossier } = contexte;

    /**
     * **Le repli.**
     *
     * La simulation écrit des hauteurs et des vitesses signées : sans cible
     * flottante, elle n'a pas de mémoire où vivre. On ne la dégrade pas — une
     * eau sans champ signé n'est pas une eau moins fine, c'est une autre image —
     * on montre la plaque.
     *
     * L'absence de WebGL2 n'est **pas** testée ici, et ce n'est pas un oubli :
     * Three ne sait plus ouvrir de contexte WebGL1 depuis la r163, si bien qu'un
     * navigateur qui n'a que WebGL1 fait échouer le rig entier bien avant
     * d'arriver jusqu'à cette ligne — et le chapitre rend alors son `<img>`.
     * `capabilities.isWebGL2` existe encore mais vaut `true` en dur, par
     * compatibilité ascendante : le lire ici ne testerait rien.
     */
    const flottantes =
      renderer.extensions.has("EXT_color_buffer_float") ||
      renderer.extensions.has("EXT_color_buffer_half_float");
    if (!flottantes) return planDeRepli(reglages.repli);

    const detail = pointeurGrossier ? DETAIL_MOBILE : DETAIL_FIN;

    /* ---- Les couleurs, lues ici et non à l'évaluation du module ---------
       Un jeton lu au chargement du fichier peut l'être avant que la feuille de
       style ne soit appliquée. Voir `scripts/verifier-jetons.mjs`. */
    const cielBas = couleurJeton("encre");
    const cielHaut = couleurJeton("sel");
    const eclat = couleurJeton("craie");
    const teinteSousEau = couleurJeton("sel");

    /* ---- Les cibles ----------------------------------------------------- */

    const faireEtat = () =>
      new THREE.WebGLRenderTarget(RESOLUTION, RESOLUTION, {
        type: THREE.HalfFloatType,
        format: THREE.RGBAFormat,
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        wrapS: THREE.ClampToEdgeWrapping,
        wrapT: THREE.ClampToEdgeWrapping,
        depthBuffer: false,
        stencilBuffer: false,
        generateMipmaps: false,
      });

    const etats: [THREE.WebGLRenderTarget, THREE.WebGLRenderTarget] = [
      faireEtat(),
      faireEtat(),
    ];
    let lecture = 0;

    const cibleCaustiques = new THREE.WebGLRenderTarget(
      CAUSTIQUES,
      CAUSTIQUES,
      {
        type: THREE.UnsignedByteType,
        format: THREE.RGBAFormat,
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        wrapS: THREE.ClampToEdgeWrapping,
        wrapT: THREE.ClampToEdgeWrapping,
        depthBuffer: false,
        stencilBuffer: false,
        generateMipmaps: false,
      },
    );

    /**
     * La scène 3D du bassin est rendue ici, puis affichée par le rig sur le plan
     * calé sur l'ancre. C'est ce qui permet à une scène qui a sa propre caméra
     * et son propre tampon de profondeur de vivre dans un canvas partagé avec
     * des plans qui n'en ont ni l'une ni l'autre.
     *
     * `SRGBColorSpace` : la source écrit des valeurs d'affichage. Déclarée
     * ainsi, la lecture les délinéarise et la sortie du renderer les
     * relinéarise — les deux conversions s'annulent, et le rendu est celui de la
     * démo.
     */
    const cibleCadre = new THREE.WebGLRenderTarget(2, 2, {
      type: THREE.UnsignedByteType,
      format: THREE.RGBAFormat,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      depthBuffer: true,
      stencilBuffer: false,
      generateMipmaps: false,
    });
    cibleCadre.texture.colorSpace = THREE.SRGBColorSpace;

    /* ---- La texture de carrelage ---------------------------------------
       `NoColorSpace` : la source l'échantillonne brute et utilise ses valeurs
       telles quelles. Lui déclarer du sRGB la délinéariserait une fois de trop,
       et le fond du bassin sortirait sombre. */
    const carreaux = new THREE.TextureLoader().load(
      "/textures/bassin-carreaux.jpg",
    );
    carreaux.colorSpace = THREE.NoColorSpace;
    carreaux.wrapS = THREE.RepeatWrapping;
    carreaux.wrapT = THREE.RepeatWrapping;
    carreaux.minFilter = THREE.LinearFilter;
    carreaux.magFilter = THREE.LinearFilter;
    carreaux.generateMipmaps = false;

    const soleil = new THREE.Vector3(...SOLEIL).normalize();
    const texel = new THREE.Vector2(1 / RESOLUTION, 1 / RESOLUTION);

    /* ---- Les passes de simulation, hors de la scène du rig -------------- */

    const geometriePleinCadre = new THREE.PlaneGeometry(2, 2);
    const scenePasse = new THREE.Scene();
    const cameraPasse = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const materiauGoutte = new THREE.ShaderMaterial({
      uniforms: {
        uEtat: { value: null },
        uCentre: { value: new THREE.Vector2() },
        uRayon: { value: GOUTTE_RAYON },
        uForce: { value: 0 },
      },
      vertexShader: SOMMET_PLEIN_CADRE,
      fragmentShader: FRAGMENT_GOUTTE,
      depthTest: false,
      depthWrite: false,
    });

    const materiauSimulation = new THREE.ShaderMaterial({
      uniforms: { uEtat: { value: null }, uTexel: { value: texel } },
      vertexShader: SOMMET_PLEIN_CADRE,
      fragmentShader: FRAGMENT_SIMULATION,
      depthTest: false,
      depthWrite: false,
    });

    const materiauNormale = new THREE.ShaderMaterial({
      uniforms: { uEtat: { value: null }, uTexel: { value: texel } },
      vertexShader: SOMMET_PLEIN_CADRE,
      fragmentShader: FRAGMENT_NORMALE,
      depthTest: false,
      depthWrite: false,
    });

    /* Le maillage est un porteur : `passe()` lui pose le matériau de l'étape en
       cours. Il naît avec celui de la goutte plutôt qu'avec le matériau par
       défaut de Three, qu'il faudrait sinon libérer pour rien. */
    const maillagePasse = new THREE.Mesh(geometriePleinCadre, materiauGoutte);
    maillagePasse.frustumCulled = false;
    scenePasse.add(maillagePasse);

    /* ---- La grille de la surface, partagée par deux passes -------------- */

    /* `PlaneGeometry(2, 2, d, d)` donne exactement la grille de la source :
       `position.xy` dans `[-1, 1]`, `z` nul. Une seule géométrie sert la
       caustique et la surface — c'est la même grille, il n'y a aucune raison
       d'en téléverser deux. */
    const grille = new THREE.PlaneGeometry(2, 2, detail, detail);

    const materiauCaustique = new THREE.ShaderMaterial({
      uniforms: {
        uEtat: { value: null },
        uSoleil: { value: soleil },
        uIntensite: { value: INTENSITE_CAUSTIQUE },
      },
      vertexShader: SOMMET_CAUSTIQUE,
      fragmentShader: FRAGMENT_CAUSTIQUE,
      /* Additif : plusieurs rayons tombent au même endroit et s'y ajoutent.
         C'est le mécanisme même de la caustique, pas un effet de rendu. */
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    const sceneCaustiques = new THREE.Scene();
    const maillageCaustiques = new THREE.Mesh(grille, materiauCaustique);
    maillageCaustiques.frustumCulled = false;
    sceneCaustiques.add(maillageCaustiques);

    /* ---- La scène du bassin : le fond, puis la surface ------------------ */

    const sceneEau = new THREE.Scene();
    /* Le fond du cadre. Il ne se voit pas — la surface couvre tout —, mais un
       tampon non effacé se verrait, lui, au premier redimensionnement. */
    sceneEau.background = cielBas.clone();

    const cameraEau = new THREE.PerspectiveCamera(CHAMP, 1, 0.01, 100);
    /* **La caméra est au-dessus, à la verticale, pointée vers le bas.** Le
       vecteur haut ne peut pas être l'axe Y, qui est la direction du regard :
       on prend −Z, ce qui met le fond du bassin dans le sens de l'écran. */
    cameraEau.position.set(0, HAUTEUR_CAMERA, 0);
    cameraEau.up.set(0, 0, -1);
    cameraEau.lookAt(0, 0, 0);

    const uniformsMur = () => ({
      uCarreaux: { value: carreaux },
      uEtat: { value: etats[0].texture },
      uCaustiques: { value: cibleCaustiques.texture },
      uSoleil: { value: soleil },
    });

    const materiauBassin = new THREE.ShaderMaterial({
      uniforms: {
        ...uniformsMur(),
        uTeinteSousEau: { value: teinteSousEau },
      },
      vertexShader: SOMMET_BASSIN,
      fragmentShader: FRAGMENT_BASSIN,
      /* On regarde le bassin depuis l'intérieur : ce sont ses faces internes
         qu'il faut voir, et `DoubleSide` évite d'avoir à raisonner sur
         l'enroulement d'une table de faces reprise d'un autre moteur. */
      side: THREE.DoubleSide,
    });

    const geometrieBassinMaillage = geometrieBassin();
    const maillageBassin = new THREE.Mesh(
      geometrieBassinMaillage,
      materiauBassin,
    );
    maillageBassin.frustumCulled = false;
    sceneEau.add(maillageBassin);

    const materiauSurface = new THREE.ShaderMaterial({
      uniforms: {
        ...uniformsMur(),
        uCielBas: { value: cielBas },
        uCielHaut: { value: cielHaut },
        uEclat: { value: eclat },
        uIOR: { value: IOR_EAU },
        uFresnelMin: { value: FRESNEL_MIN },
      },
      vertexShader: SOMMET_SURFACE,
      fragmentShader: FRAGMENT_SURFACE,
      side: THREE.DoubleSide,
    });

    const maillageSurface = new THREE.Mesh(grille, materiauSurface);
    maillageSurface.frustumCulled = false;
    sceneEau.add(maillageSurface);

    /* ---- Le plan que voit le rig ---------------------------------------- */

    const geometrieAffichage = new THREE.PlaneGeometry(1, 1);
    const materiauAffichage = new THREE.MeshBasicMaterial({
      map: cibleCadre.texture,
    });
    const surface = new THREE.Mesh(geometrieAffichage, materiauAffichage);
    surface.frustumCulled = false;
    surface.renderOrder = -5;

    /* ==================================================================
       État de la simulation
       ================================================================== */

    let temps = 0;
    let accumulateur = 0;
    let amorce = false;
    /**
     * Les deux drapeaux du mouvement réduit, et ils ne disent pas la même
     * chose — c'est ce qui rendait le cadre noir après un redimensionnement.
     *
     * `ondeEtablie` : l'onde a été calculée une fois, et n'a plus à l'être.
     * `cadreAJour` : la cible porte une image valide. Redimensionner une cible
     * la vide ; il faut donc redessiner, mais surtout **pas** relancer les
     * quatre-vingt-dix pas de simulation, qui donneraient une autre eau.
     */
    let ondeEtablie = false;
    let cadreAJour = false;

    let enAttente: Goutte[] = [];
    /* La file est bornée : chaque goutte est une passe de rendu complète, et
       une file qui grossirait plus vite qu'on ne la vide ferait payer à la
       frame suivante un retard qu'elle ne rattraperait jamais. Au-delà, la
       goutte est perdue — c'est la bonne perte. */
    const FILE_MAX = MAX_GOUTTES_PAR_CADRE * 4;
    const enfiler = (x: number, z: number, force: number, rayon: number) => {
      if (enAttente.length >= FILE_MAX) return;
      enAttente.push({ x, z, force, rayon });
    };

    /* Le hasard est à graine : deux visites donnent la même pluie. */
    const tirer = aleatoireAGraine(0x0a5104);
    const sources: Source[] = Array.from({ length: AMBIANT_NOMBRE }, () => ({
      x: -0.6 + 1.2 * tirer(),
      z: -0.6 + 1.2 * tirer(),
      amplitude: 0.1 + 0.15 * tirer(),
      vitesse: 0.05 + 0.09 * tirer(),
      phase: tirer() * Math.PI * 2,
      prochaine: tirer() * AMBIANT_PERIODE,
    }));

    /* Interaction */
    let derniereInteraction = -1e9;
    let precedentX = 0;
    let precedentY = 0;
    let aPointeur = false;
    let clicsVus = reglages.etat.current.clics;
    /** Vitesse lissée du pointeur, en pixels par cadre. */
    let vitesse = 0;
    /** Dernière valeur remontée, pour ne pas répéter le `null` à vide. */
    let vitesseRemontee: number | null = null;

    /* Dimensions courantes de la cible de cadre, pour ne la redimensionner que
       lorsqu'elle change vraiment. */
    let largeurCadre = 0;
    let hauteurCadre = 0;

    /* ==================================================================
       Les passes
       ================================================================== */

    /** Rend `materiau` de l'état courant vers l'autre, puis échange. */
    const passe = (materiau: THREE.ShaderMaterial) => {
      materiau.uniforms.uEtat!.value = etats[lecture]!.texture;
      maillagePasse.material = materiau;
      renderer.setRenderTarget(etats[lecture ^ 1]!);
      renderer.render(scenePasse, cameraPasse);
      lecture ^= 1;
    };

    const goutte = (x: number, z: number, force: number, rayon: number) => {
      materiauGoutte.uniforms.uCentre!.value.set(x, z);
      materiauGoutte.uniforms.uForce!.value = force;
      materiauGoutte.uniforms.uRayon!.value = rayon;
      passe(materiauGoutte);
    };

    /**
     * Un pas de physique : les gouttes en attente, puis les deux pas de la
     * source. **Rien d'autre** — surtout pas la caustique.
     *
     * Le découpage n'est pas cosmétique. La caustique parcourt la grille
     * entière et remplit une cible de 1024², c'est la passe la plus chère de
     * tout le site ; la rejouer une fois par sous-pas de rattrapage ferait
     * exactement l'inverse de ce qu'un rattrapage doit faire — plus la frame
     * serait lente, plus on lui donnerait de travail. La source la joue une
     * fois par frame, après les pas ; c'est ce que fait `finaliser`.
     */
    const pasPhysique = () => {
      const n = Math.min(enAttente.length, MAX_GOUTTES_PAR_CADRE);
      for (let i = 0; i < n; i += 1) {
        const g = enAttente[i]!;
        goutte(g.x, g.z, g.force, g.rayon);
      }
      if (n > 0) enAttente = enAttente.slice(n);

      for (let i = 0; i < PAS_PAR_CADRE; i += 1) passe(materiauSimulation);
    };

    /** Les normales, puis la caustique. Une fois par frame, après les pas. */
    const finaliser = () => {
      passe(materiauNormale);

      /* L'état courant alimente maintenant tous les shaders qui le lisent. */
      const etat = etats[lecture]!.texture;
      materiauCaustique.uniforms.uEtat!.value = etat;
      materiauBassin.uniforms.uEtat!.value = etat;
      materiauSurface.uniforms.uEtat!.value = etat;

      renderer.setRenderTarget(cibleCaustiques);
      renderer.render(sceneCaustiques, cameraPasse);
      renderer.setRenderTarget(null);
    };

    /** Le rendu de la scène 3D vers la cible que le rig affichera. */
    const rendreCadre = () => {
      renderer.setRenderTarget(cibleCadre);
      renderer.render(sceneEau, cameraEau);
      renderer.setRenderTarget(null);
    };

    /** Les gouttes ambiantes — voir `AMBIANT_NOMBRE`. */
    const collecterAmbiantes = (pas: number) => {
      const inactif = temps - derniereInteraction > INACTIF;
      const force = AMBIANT_FORCE * (inactif ? 1 : AMBIANT_MULT_ACTIF);
      for (const source of sources) {
        source.prochaine -= pas;
        if (source.prochaine > 0) continue;
        source.prochaine = AMBIANT_PERIODE * (0.7 + tirer() * 0.6);
        const derive = source.amplitude;
        const x = source.x + derive * Math.sin(temps * source.vitesse + source.phase);
        const z = source.z + derive * Math.cos(temps * source.vitesse * 1.3 + source.phase);
        enfiler(
          Math.min(Math.max(x, -0.92), 0.92),
          Math.min(Math.max(z, -0.92), 0.92),
          force,
          AMBIANT_RAYON,
        );
      }
    };

    /** Les vingt gouttes d'amorçage de `main.ts`. */
    const amorcer = () => {
      if (amorce) return;
      amorce = true;
      for (let i = 0; i < AMORCE_NOMBRE; i += 1) {
        goutte(
          tirer() * 2 - 1,
          tirer() * 2 - 1,
          i & 1 ? AMORCE_FORCE : -AMORCE_FORCE,
          GOUTTE_RAYON,
        );
      }
      renderer.setRenderTarget(null);
    };

    /**
     * Le pointeur, converti en un point du plan d'eau.
     *
     * On ne passe pas par un `Raycaster` : la caméra ne bouge jamais, la cible
     * est un plan connu, et l'inversion tient en trois lignes. Le rect vient de
     * la passe de mesure du rig — rien n'est lu dans le DOM ici.
     */
    const visee = new THREE.Vector3();
    const viser = (
      clientX: number,
      clientY: number,
      rect: DOMRectReadOnly,
    ): [number, number] | null => {
      const nx = ((clientX - rect.left) / rect.width) * 2 - 1;
      const ny = -(((clientY - rect.top) / rect.height) * 2 - 1);

      const direction = visee
        .set(nx, ny, 0.5)
        .unproject(cameraEau)
        .sub(cameraEau.position)
        .normalize();
      if (Math.abs(direction.y) < 1e-6) return null;

      const t = -cameraEau.position.y / direction.y;
      if (t < 0) return null;

      const x = cameraEau.position.x + direction.x * t;
      const z = cameraEau.position.z + direction.z * t;
      if (Math.abs(x) > 1 || Math.abs(z) > 1) return null;
      return [x, z];
    };

    /** Ferme le gain de l'eau, une fois et une seule. */
    const taire = () => {
      vitesse = 0;
      aPointeur = false;
      if (vitesseRemontee === null) return;
      vitesseRemontee = null;
      reglages.onVitesse?.(null);
    };

    return {
      objet: surface,
      ajusterEchelle: false,

      cadre: ({ rect, delta, taille, mouvementReduit }) => {
        surface.scale.set(rect.width, rect.height, 1);
        if (rect.width <= 0 || rect.height <= 0) return;

        /* -- La cible de cadre suit l'ancre, et le champ suit le rapport --
           La densité demandée est celle du rig, puis rabattue sous le plafond
           de pixels. Voir `PIXELS_MAX` : c'est ce qui tient la cadence. */
        const demandes = rect.width * rect.height * taille.dpr * taille.dpr;
        const reduction = Math.min(1, Math.sqrt(PIXELS_MAX / demandes));
        const densite = taille.dpr * reduction;
        const largeur = Math.max(2, Math.round(rect.width * densite));
        const hauteur = Math.max(2, Math.round(rect.height * densite));
        if (largeur !== largeurCadre || hauteur !== hauteurCadre) {
          largeurCadre = largeur;
          hauteurCadre = hauteur;
          cibleCadre.setSize(largeur, hauteur);
          /* La cible vient d'être vidée : en mouvement réduit, où l'on ne rend
             qu'une fois, il faut redessiner — sinon le cadre reste noir. */
          cadreAJour = false;

          const rapport = rect.width / rect.height;
          cameraEau.aspect = rapport;
          /* Sur un cadre très large, la hauteur nominale laisserait paraître
             les murs : on rapproche juste assez pour que le cadre reste à
             l'intérieur du bassin. Voir `HAUTEUR_CAMERA`. */
          const maximum = 1 / (TANGENTE_DEMI_CHAMP * Math.max(rapport, 1));
          cameraEau.position.y = Math.min(HAUTEUR_CAMERA, maximum);
          cameraEau.updateProjectionMatrix();
          cameraEau.updateMatrixWorld();
        }

        /* -- Mouvement réduit : une eau posée, calculée une fois ----------
           On amorce, on laisse l'onde s'établir, on rend un cadre, et on
           n'avance plus jamais. L'écran garde une eau détaillée et immobile.
           C'est une version, pas une punition. */
        if (mouvementReduit) {
          if (cadreAJour) return;
          cadreAJour = true;
          if (!ondeEtablie) {
            ondeEtablie = true;
            amorcer();
            for (let i = 0; i < PAS_AMORCAGE; i += 1) pasPhysique();
            finaliser();
          }
          rendreCadre();
          return;
        }

        amorcer();
        temps += delta / 1000;

        /* -- Le pointeur, la vitesse, l'onde et le son ------------------- */
        const etat = reglages.etat.current;
        if (etat.pointeur !== null) {
          const vise = viser(etat.pointeur.x, etat.pointeur.y, rect);

          if (vise !== null) {
            const [x, z] = vise;

            /* La vitesse, mesurée en pixels d'écran et lissée. C'est cette
               valeur — et elle seule — qui creuse l'onde et qui ouvre le gain
               de l'eau : ce qu'on entend est exactement ce qu'on voit. */
            if (aPointeur) {
              const brute = Math.hypot(
                etat.pointeur.x - precedentX,
                etat.pointeur.y - precedentY,
              );
              vitesse += (brute - vitesse) * LISSAGE_VITESSE;
            } else {
              /* Première frame sous le pointeur : aucun déplacement à mesurer,
                 et surtout aucun saut à injecter depuis une position qui date
                 d'un autre endroit de l'écran. */
              vitesse = 0;
            }

            if (etat.clics !== clicsVus) {
              clicsVus = etat.clics;
              enfiler(x, z, CLIC_FORCE, CLIC_RAYON);
            } else if (aPointeur) {
              const part = Math.min(vitesse / VITESSE_PLEINE, 1);
              enfiler(x, z, GOUTTE_BASE + part * GOUTTE_AMPLITUDE, GOUTTE_RAYON);
            }

            precedentX = etat.pointeur.x;
            precedentY = etat.pointeur.y;
            aPointeur = true;
            derniereInteraction = temps;

            reglages.onVitesse?.(vitesse);
            vitesseRemontee = vitesse;
          } else {
            taire();
          }
        } else {
          taire();
        }

        /* -- Pas de temps fixe -------------------------------------------
           La simulation ne dépend pas de la cadence, et une frame lente est
           rattrapée en trois sous-pas au plus — au-delà, on laisse filer plutôt
           que d'entrer dans la spirale où le rattrapage coûte plus que le
           retard. */
        let secondes = delta / 1000;
        if (secondes > 0.25) secondes = 0.25;
        accumulateur += secondes;

        let n = 0;
        while (accumulateur >= PAS && n < MAX_SOUS_PAS) {
          collecterAmbiantes(PAS);
          pasPhysique();
          accumulateur -= PAS;
          n += 1;
        }
        if (n === 0) {
          collecterAmbiantes(PAS);
          pasPhysique();
          accumulateur = 0;
        }

        finaliser();
        rendreCadre();
      },

      visibilite: (visible) => {
        if (visible) return;
        /* On revient au bassin après l'avoir quitté : l'accumulateur est remis
           à zéro, sinon la première frame rattraperait le temps passé ailleurs
           et l'eau exploserait d'un coup. */
        accumulateur = 0;
        /* Le chapitre sort de l'écran : le cadre ne sera plus appelé, et le
           gain de l'eau resterait figé sur sa dernière valeur. On le referme
           ici — sinon on emporterait le bruit du bassin dans le chapitre
           suivant. */
        taire();
      },

      liberer: () => {
        etats[0].dispose();
        etats[1].dispose();
        cibleCaustiques.dispose();
        cibleCadre.dispose();
        carreaux.dispose();

        geometriePleinCadre.dispose();
        grille.dispose();
        geometrieBassinMaillage.dispose();
        geometrieAffichage.dispose();

        materiauGoutte.dispose();
        materiauSimulation.dispose();
        materiauNormale.dispose();
        materiauCaustique.dispose();
        materiauBassin.dispose();
        materiauSurface.dispose();
        materiauAffichage.dispose();
      },
    };
  };
}
