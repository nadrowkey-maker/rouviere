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
import { PLAN_LIEU } from "@/data/manifeste";

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
const PIXELS_MAX = 1920 * 1080;

/**
 * **Le plafond quand le lieu est là.**
 *
 * Le plafond de base est dimensionné pour la vue à l'aplomb, où le fragment de
 * surface couvre tout le cadre et où la caustique tourne. Au redressement, deux
 * choses changent, et les deux vont dans le même sens : la caustique est éteinte
 * (voir `CAUSTIQUES_SEUIL`), et la surface ne couvre plus qu'environ deux
 * cinquièmes de l'image — le reste est le plan filmé, c'est-à-dire un produit
 * matriciel et une lecture de texture.
 *
 * Or c'est précisément là que le plafond se voyait : le plan filmé passait par
 * la même réduction que l'eau, et sur un écran à forte densité il était rendu à
 * une fraction de sa définition puis étiré. Un plan filmé qu'on a encodé sans
 * compression et qu'on affiche à moitié de résolution, c'est du travail perdu
 * deux fois.
 *
 * Le facteur est celui de la charge réelle : la surface ne couvre plus que deux
 * cinquièmes de l'image, le reste étant une lecture de texture. À quatre fois
 * le plafond de base, le rendu tombe à **un pour un** avec l'écran sur les
 * densités courantes — la cible n'est donc plus rééchantillonnée du tout à
 * l'affichage, et c'est cette seconde réduction, invisible dans les chiffres,
 * qui rendait le plan mou. Le coût de fragment reste voisin de celui de la vue
 * zénithale, où cent pour cent des pixels passent par le lancer de rayon.
 *
 * *Ne pas chercher ce défaut dans l'encodage.* Le grain qu'on voit dans les
 * noirs du plan vient d'ici, et non du fichier : mesuré à sa résolution native,
 * le rush ne porte aucun blocking (rapport d'énergie aux frontières de blocs :
 * 0,976, soit rien). Une première mesure disait le contraire — elle était faite
 * sur un agrandissement au plus proche voisin, qui duplique les pixels et
 * fabrique lui-même le motif périodique qu'elle croyait mesurer.
 */
const PIXELS_MAX_PLAN = Math.round(PIXELS_MAX * 4);

/** Au-delà de cette part de plan visible, on passe au plafond haut. */
const SEUIL_PLAFOND = 0.5;

/**
 * Ouverture de la marge du fond pendant la rotation.
 *
 * Elle vaut zéro à l'arrivée — les deux champs coïncident, rien n'est borné ni
 * étiré — et s'ouvre le temps du mouvement, où le tangage de la caméra n'est pas
 * encore celui du plan et où les rayons de bord sortent du secteur filmé. C'est
 * de là que venaient les deux bandes grises verticales sur les côtés.
 */
const MARGE_TRANSITION = 0.75;

/* ==========================================================================
   Le redressement — la caméra quitte l'aplomb et découvre le lieu
   ==========================================================================

   Le bassin ne se contente plus de monter puis de redescendre : au septième
   temps, **la caméra se redresse** et ce qu'on découvre au-dessus de l'eau est
   un plan filmé — la villa autour de sa piscine, `piscine.mp4`.

   ## Pourquoi un plan fixe peut se comporter comme un décor

   La caméra du plan ne bouge pas. Cela ferait un décor faux si la nôtre se
   déplaçait, mais **une rotation pure autour du point nodal ne produit aucune
   parallaxe, à aucune profondeur** — c'est le principe même du panorama
   assemblé. Reprojeté sur la sphère des directions, un plan verrouillé est donc
   un échantillon de champ lumineux rigoureusement valide tant que la caméra ne
   fait que pivoter.

   D'où le découpage du mouvement, et il n'est pas cosmétique :

   — la **translation** est jouée en tête de course (`COURSE_POSITION`), pendant
     que le cadre n'est encore que de l'eau et qu'il n'y a rien à contredire ;
   — la **rotation** déborde largement après elle (`COURSE_TANGAGE`), si bien
     que le dernier tiers de la course est une rotation *pure* ;
   — le plan n'est introduit qu'après la fin de la translation
     (`COURSE_PLAN`), c'est-à-dire uniquement pendant la portion où sa
     reprojection est exacte.

   ## La pose finale n'est pas choisie à l'œil, elle est résolue

   Elle vient d'un calage sur le plan lui-même : quatre correspondances relevées
   sur l'image (les deux coins lointains du bassin filmé et les deux bords à leur
   sortie de cadre), puis la pose qui les reproduit. Le contrôle est double, et
   c'est lui qui donne confiance : le tangage résolu place l'horizon à `y = 371`
   sur une image de 1080, et le trait de mer visible entre les deux battants du
   portail est mesuré à `y ≈ 377`. Deux méthodes indépendantes, six pixels
   d'écart.

   Le champ reste `CHAMP` — le calage a été résolu à 45°, ce qui tombe très près
   de la focale réelle du plan, et évite d'avoir à animer un zoom.

   Conséquence : à la pose finale, le plan d'eau simulé se superpose au bassin
   filmé au pixel près. **La frontière entre l'eau calculée et la vidéo n'est
   donc pas un masque tracé à la main : c'est la géométrie elle-même.** Le
   maillage de la surface se projette exactement dans le bassin du plan, et tout
   ce qui l'entoure est la vidéo. Rien à recaler si le plan change de cadrage —
   il suffit de refaire le calage.
*/

/** Position de l'œil à la pose finale, résolue par calage. */
const POSE_X = 0.0;
const POSE_Y = 0.40;
const POSE_Z = 0.41;

/**
 * Tangage final, en radians sous l'horizontale.
 *
 * `rotation.x = -PI/2` regarde à l'aplomb — c'est, à la base près, l'orientation
 * que posaient `up = (0,0,-1)` puis `lookAt` dans la version zénithale, et elle
 * est reproduite au bit près. `rotation.x = 0` regarde l'horizon. Le
 * redressement est donc, littéralement, un seul scalaire.
 */
const TANGAGE_FINAL = -(3.0 * Math.PI) / 180;

/** Hauteur de l'œil au départ : la pose zénithale historique. */
const TANGAGE_DEPART = -Math.PI / 2;

/**
 * Le minutage du mouvement, en parts de la course de redressement.
 *
 * La translation finit à 0,62 ; le plan n'entre qu'à 0,66. Les 38 % de course
 * restants sont une rotation pure, et c'est la seule portion où le plan est
 * visible. Ce décalage est la condition d'exactitude, pas un réglage de goût.
 */
const COURSE_POSITION = [0.0, 0.62] as const;
const COURSE_TANGAGE = [0.18, 1.0] as const;
/**
 * Le plan entre à 0,58 — c'est-à-dire **avant** la fin nominale de la
 * translation, et c'est mesuré, pas relâché.
 *
 * Le lissage en S de la position est déjà retombé à 1,3 % de sa course à cet
 * instant : ce qu'il reste à parcourir vaut quelques centimètres, soit trois
 * dixièmes de degré de parallaxe sur un mur à une douzaine de mètres. C'est
 * strictement invisible, et cela achète quelque chose qui, lui, se voyait —
 * l'aire du cadre que ni l'eau ni le plan ne couvraient tombe de six pour cent à
 * moins d'un, et elle se réduit à un liseré dans les coins bas.
 */
const COURSE_PLAN = [0.58, 0.8] as const;


/**
 * Part du relief de l'onde retirée au redressement complet.
 *
 * Voir uAmplitude : l'onde de la source est réglée pour une vue à l'aplomb.
 * Vue en rasant, la même crête se dresse sur une grande hauteur d'écran, et
 * l'eau cesse d'être une surface pour devenir une dalle sculptée qui semble
 * déborder du bassin. Les trois quarts sont retirés ; le miroitement, lui,
 * reste, puisque c'est la normale qui le porte et qu'elle suit le même facteur.
 */
const AMPLITUDE_RABAT = 0.45;

/**
 * Prolongement de la nappe vers l'avant, en unités de demi-largeur.
 *
 * **Sans lui, un trou de trente-six degrés s'ouvre au milieu du mouvement.** La
 * pose finale est *hors* du bassin — l'œil est à `z = 1,84` pour un bassin qui
 * s'arrête à `z = 1`, ce qui est le cas de n'importe quel vrai plan de piscine,
 * pris depuis la margelle. À mi-course, le bas du cadre passe donc au-delà du
 * bord proche et ne rencontre plus rien.
 *
 * La nappe est prolongée jusqu'à `Z_MAX`, au-delà du point de vue : le champ de
 * hauteur, lui, ne couvre que `[-1, 1]` et il est **replié en miroir** au-delà
 * (voir `replier` en GLSL). Le miroir ne coûte rien, ne fait aucune couture, et
 * la zone prolongée n'est visible que pendant la transition — au cadrage final
 * elle est hors champ, sous le bas de l'image, exactement comme l'eau du plan
 * filmé qui sort elle aussi par le bas.
 */
const Z_MAX = 3.2;

/** Densité du maillage de surface. Le prolongement demande sa part en Z. */
const DETAIL_Z_FIN = 300;
const DETAIL_Z_MOBILE = 192;

/**
 * Au-delà de ce tangage, le fond du bassin n'est plus regardé de face et la
 * caustique ne se voit plus : on cesse de la calculer.
 *
 * Ce n'est pas une optimisation opportuniste, c'est la contrepartie exacte du
 * coût qu'on ajoute. La passe de caustiques parcourt la grille entière et
 * remplit une cible de 1024² — c'est la plus chère du site. Le plan filmé,
 * lui, arrive au moment précis où elle devient inutile : ce qu'elle libère paye
 * l'échantillonnage de la vidéo dans le lancer de rayon.
 */
const CAUSTIQUES_SEUIL = -(20 * Math.PI) / 180;

/**
 * Le plan filmé, et sa géométrie de prise de vue.
 *
 * Le fichier et ses dimensions viennent du manifeste : le calage de la pose a
 * été résolu sur *ces* pixels-là, et deux endroits qui déclarent la même image
 * finissent toujours par en déclarer deux différentes.
 */
/**
 * **Le trait d'eau du plan filmé**, relevé colonne par colonne.
 *
 * Le bord du bassin n'est pas droit : il descend de quatre-vingts pixels sur la
 * gauche, et une droite ajustée s'en écartait de cinquante. On range donc sa
 * vraie forme — quarante-huit échantillons, la hauteur du trait en fonction de
 * l'abscisse — dans une petite texture que le fragment interroge.
 *
 * Les valeurs sont en coordonnée verticale OpenGL (zéro en bas), encodées sur un
 * octet dans leur plage utile : la précision en ressort à 0,4 pixel sur 1080.
 */
const TRAIT_BASE = 0.15;
const TRAIT_PLAGE = 0.1;
const TRAIT_EAU = new Uint8Array([
  41, 41, 36, 26, 16, 8, 12, 19, 34, 72, 111, 147, 161, 166, 169, 171,
  172, 174, 176, 179, 181, 182, 182, 184, 185, 187, 187, 187, 187, 187,
  187, 187, 187, 187, 189, 191, 193, 194, 196, 197, 198, 199, 192, 171,
  138, 108, 86, 82,
]);

/**
 * **De combien l'eau descend sous la margelle.**
 *
 * C'est le réglage à toucher si le niveau ne va pas, et c'est le seul.
 *
 * Le trait relevé sur le plan suit la base de la margelle claire — c'est-à-dire
 * le **haut** de la paroi émergée du bassin. Or l'eau réelle commence à son
 * **bas** : entre les deux court une bande sombre de treize à quinze pixels sur
 * une image de 1080, la paroi que l'eau ne recouvre pas. Sans cette descente,
 * l'eau calculée arrive à hauteur du sol au lieu de se tenir sous le bord.
 *
 * La valeur est en part de hauteur d'image : 0,013 vaut quatorze pixels sur
 * 1080. **L'augmenter fait descendre l'eau, la diminuer la fait monter.**
 *
 * Elle est constante, et c'est une approximation assumée : la bande est plus
 * haute au premier plan qu'au fond, puisque c'est une hauteur réelle vue en
 * perspective. La corriger vraiment demande de reposer le plan d'eau à la bonne
 * altitude dans la scène, ce qui est un recalage de caméra et non un réglage.
 */
const TRAIT_DESCENTE = 0.020;

/** Demi-largeur du fondu de la lisière, en part de hauteur d'image. */
const LISIERE = 0.022;

/**
 * De combien l'onde déplace la lisière. C'est ce qui la fait clapoter : une
 * crête pousse l'eau plus haut sur le bord, un creux la retire.
 */
const CLAPOT = 1.6;

const PLAN_SOURCE = PLAN_LIEU.video;
const PLAN_LARGEUR = PLAN_LIEU.largeur;
const PLAN_HAUTEUR = PLAN_LIEU.hauteur;

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

/**
 * Le prolongement de la nappe, et la lecture du champ de hauteur qui va avec.
 *
 * Le bassin s'étend maintenant de `z = -1` à `z = Z_MAX`, au-delà du point de
 * vue (voir `Z_MAX` : sans quoi le bas du cadre sort de l'eau à mi-course). La
 * simulation, elle, reste carrée et ne couvre que `[-1, 1]` — la replier en
 * miroir est ce qui coûte le moins et ne fait aucune couture : `replier` est une
 * onde triangulaire, donc continue en tout point, y compris au raccord.
 *
 * L'anisotropie qu'aurait donnée un simple étirement du champ sur un bassin deux
 * fois plus long est ainsi évitée : les rides gardent partout la même échelle.
 * Que la copie repliée fasse courir les ondes à contresens n'a aucune
 * conséquence — cette zone n'est traversée que pendant la rotation, en
 * incidence rasante, et elle est hors champ à la pose finale.
 */
const CHUNK_ETENDUE = /* glsl */ `
  const float Z_MAX = ${Z_MAX.toFixed(4)};
  const vec3 BOITE_MIN = vec3(-1.0, -1.0, -1.0);
  const vec3 BOITE_MAX = vec3(1.0, 2.0, Z_MAX);

  /* Onde triangulaire de période 2 : replie [0, +inf[ dans [0, 1]. */
  /**
   * Amplitude du relief de la surface.
   *
   * Elle vaut 1 à l'aplomb — c'est l'onde de la source, réglée pour être vue
   * de haut — et retombe à mesure que la caméra se redresse. **Vue en incidence
   * rasante, la même onde paraît énorme** : une crête proche se dresse alors sur
   * une grande hauteur d'écran et l'eau se lit comme une dalle sculptée qui
   * déborde du bassin. Une eau de piscine a des rides de quelques millimètres,
   * pas de quelques décimètres.
   *
   * Seul le **relief** est aplati : la normale l'est du même facteur, donc les
   * reflets et le miroitement restent, et c'est eux qu'on regarde à cet angle.
   */
  uniform float uAmplitude;

  /**
   * Le niveau de l'eau, sous la margelle.
   *
   * Le calage de la pose a été fait sur le **bord intérieur du bassin filmé**,
   * c'est-à-dire sur la bande sombre de la margelle — donc sur le haut du bord,
   * et non sur l'eau elle-même. Le plan d'eau se retrouvait ainsi à ras du bord,
   * et la moindre vague passait par-dessus.
   *
   * La valeur est **relevée sur le profil du plan**, pas estimée. Au bord
   * lointain, la margelle claire tient jusqu'à y=676, puis vient une paroi
   * presque noire — 8, 13, 26 mesurés, une paroi à l'ombre et non un carrelage
   * éclairé — sur trente-six pixels, et l'eau ne commence qu'à y=715. Le calage
   * visait 678 : il fallait descendre de trente-sept pixels d'image, ce qui à
   * cette profondeur vaut 0,085 unité, soit une vingtaine de centimètres.
   *
   * Deux tentatives ont été plus timides — 0,032 laissait encore la ligne d'eau
   * près du bord, et la moindre vague passait par-dessus.
   */
  const float NIVEAU_EAU = 0.0;

  /* La paroi émergée du bassin filmé, relevée sur l'image : presque noire, à
     peine bleutée. */
  const vec3 FRANC_BORD = vec3(0.045, 0.062, 0.115);


  float replier(float v) {
    float m = mod(v, 2.0);
    return m > 1.0 ? 2.0 - m : m;
  }

  /* Le point du plan d'eau vers le texel du champ de hauteur. */
  vec2 uvChamp(vec2 xz) {
    return vec2(xz.x * 0.5 + 0.5, replier(xz.y * 0.5 + 0.5));
  }
`;

/**
 * La reprojection du plan filmé.
 *
 * Le plan a été tourné caméra bloquée. Reprojeté sur la sphère des directions,
 * il est un échantillon de champ lumineux exact **tant que notre caméra ne fait
 * que pivoter** — une rotation pure autour du point nodal ne produit aucune
 * parallaxe, à aucune profondeur. C'est pourquoi la translation est terminée
 * avant que le plan n'apparaisse (voir `COURSE_POSITION` et `COURSE_PLAN`).
 *
 * `uVersPlan` est la matrice qui amène une direction du monde dans le repère de
 * la caméra du plan ; elle absorbe d'un coup l'orientation courante et celle du
 * plan, et n'est recalculée qu'une fois par frame, sur le processeur. Le
 * fragment n'a donc qu'un produit matriciel et une division à faire.
 *
 * Une direction qui sort du champ couvert par le plan n'est pas extrapolée : le
 * plan n'a pas vu ces pixels-là, et les inventer serait pire que de ne rien
 * montrer. On rend alors le ciel calculé, c'est-à-dire l'encre du site.
 */
const CHUNK_PLAN = /* glsl */ `
  uniform sampler2D uPlan;
  uniform mat3 uVersPlan;
  uniform vec2 uTanDemiPlan;
  uniform float uPlanForce;
  uniform float uPlanExposition;

  /**
   * Renvoie la part de couverture du plan pour cette direction, et l'UV où la
   * lire. Zéro : le plan n'a pas vu cette direction-là.
   *
   * Ce n'est pas un booléen, et c'est réfléchi. À la pose finale, le cadre
   * coïncide exactement avec le plan — mêmes rotation, même champ —, si bien que
   * les rayons des bords tombent pile sur la frontière : un test strict y
   * laisserait un liseré d'un pixel qui clignoterait au gré de l'arrondi. La
   * marge est donc franchie en douceur, sur six centièmes, et l'UV est bornée.
   * À l'intérieur du plan la valeur vaut exactement un, donc rien n'est
   * assombri là où le plan répond.
   */
  float viserPlan(vec3 direction, vec2 marge, out vec2 uv) {
    vec3 d = uVersPlan * direction;
    if (d.z > -1e-4) return 0.0;
    vec2 n = (d.xy / -d.z) / uTanDemiPlan;
    uv = clamp(n * 0.5 + 0.5, 0.0, 1.0);
    /**
     * La marge est **donnée par l'appelant**, et les deux usages n'ont pas les
     * mêmes besoins.
     *
     * Pour le fond du cadre, elle est nulle ou presque : ce qu'on voit doit être
     * le plan, pas son dernier pixel étiré. C'est ce qui manquait — avec une
     * marge large, un écran plus large que 16/9 bornait les bords et les
     * étirait sur toute la hauteur.
     *
     * Pour le reflet, elle est large **en vertical seulement**. Un rayon de vue
     * qui descend de vingt degrés se réfléchit vingt degrés au-dessus de
     * l'horizontale, or le plan ne monte qu'à quinze : avec une marge serrée,
     * tous les reflets sortaient du champ et l'eau devenait une surface peinte,
     * six fois moins contrastée que celle du plan. Prolonger par le bord haut —
     * qui est du ciel — rend au reflet ce qu'il doit refléter.
     */
    vec2 f = 1.0 - smoothstep(vec2(1.0), marge, abs(n));
    return min(f.x, f.y);
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
  uniform float uCaustiquesForce;
  uniform float uFondFusion;
  uniform vec3 uFondCouleur;

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
       les deux autres. Le bassin étant prolongé vers l'avant, la face +z n'est
       plus à +1 mais à Z_MAX. */
    if (abs(point.x) > 0.999) {
      couleur = texture2D(uCarreaux, point.yz * 0.5 + vec2(1.0, 0.5)).rgb;
      normale = vec3(-point.x, 0.0, 0.0);
    } else if (point.z < -0.999 || point.z > Z_MAX - 0.001) {
      couleur = texture2D(uCarreaux, point.yx * 0.5 + vec2(1.0, 0.5)).rgb;
      normale = vec3(0.0, 0.0, point.z < 0.0 ? 1.0 : -1.0);
    } else {
      couleur = texture2D(uCarreaux, point.xz * 0.5 + 0.5).rgb;
    }

    /* **Le fond rejoint le bassin filmé à mesure que la caméra se redresse.**

       À l'aplomb, on garde le carrelage de la démo : c'est le rendu d'origine,
       et c'est le moment où l'on joue avec l'eau. Mais dès que le lieu paraît,
       ce carrelage devient un contresens — sa trame de piscine municipale et
       son cyan (141, 170, 178 mesurés) n'ont rien à voir avec l'eau du plan,
       qui est neutre (144, 150, 152) et sans motif. Deux bassins se lisaient au
       lieu d'un.

       Le fondu dissout la trame et rejoint la teinte : ce n'est pas un
       étalonnage posé sur l'image, c'est le fond de la piscine qui devient
       celui qu'on filme. L'occlusion, les caustiques et l'ombre de margelle
       continuent de le moduler par-dessus.

       **Seule la trame s'estompe. Ni la teinte ni la profondeur ne bougent.**
       Deux essais l'ont montré : un fondu vers un aplat supprime toute
       variation, le fond disparaît et l'eau se lit comme une tôle ; et rejoindre
       une teinte relevée sur la vidéo grise le bassin, alors qu'il doit garder
       exactement le bleu qu'on a vu en arrivant dans la section. La couleur du
       carrelage est de toute façon neutre — le bleu vient de l'absorption, pas
       d'ici. uFondCouleur est donc sa propre moyenne, et ce fondu ne fait plus
       qu'une chose : dissoudre le quadrillage à mesure qu'on s'en approche. */
    float luma = dot(couleur, vec3(0.299, 0.587, 0.114));
    couleur = mix(couleur, uFondCouleur * (0.62 + 0.52 * luma), uFondFusion);

    /* Occlusion ambiante analytique : les angles du bassin sont plus sombres,
       et ça ne coûte qu'une division. Sur la partie prolongée elle continue de
       descendre, ce qui donne à l'eau proche la profondeur qu'elle doit avoir. */
    float echelle = 0.5 / length(point);

    vec3 lumiereRefractee =
      -refract(-uSoleil, vec3(0.0, 1.0, 0.0), IOR_AIR / IOR_EAU);
    float diffus = max(0.0, dot(lumiereRefractee, normale));

    vec4 info = texture2D(uEtat, uvChamp(point.xz));
    if (point.y < info.r * uAmplitude + NIVEAU_EAU) {
      /* Sous l'eau : la caustique éclaire.

         uCaustiquesForce tombe à zéro quand la caméra se redresse — le fond
         n'est alors plus regardé de face et la caustique ne se voit plus. La
         carte n'est même plus calculée à ce moment-là (voir CAUSTIQUES_SEUIL) ;
         le facteur est ce qui rend l'extinction continue plutôt que brutale, et
         ce qui évite d'aller lire une carte périmée sur la zone prolongée, que
         la projection de la caustique ne couvre pas. */
      vec2 uvCaustique = 0.75 * (point.xz
        - point.y * lumiereRefractee.xz / lumiereRefractee.y) * 0.5 + 0.5;
      vec4 caustique = texture2D(uCaustiques, uvCaustique);
      echelle += diffus * caustique.r * 2.0 * caustique.g * uCaustiquesForce;
    } else {
      /* Au-dessus : l'ombre de la margelle, en sigmoïde. */
      vec2 t = intersectCube(point, lumiereRefractee, BOITE_MIN, BOITE_MAX);
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
  ${CHUNK_ETENDUE}
  varying vec3 vPos;
  void main() {
    vec3 p = position;
    p.y = (1.0 - position.y) * (7.0 / 12.0) - 1.0;
    /* Le bassin est prolongé vers l'avant : la face -z reste à -1, la face +z
       part à Z_MAX, au-delà du point de vue final. */
    p.z = (position.z * 0.5 + 0.5) * (Z_MAX + 1.0) - 1.0;
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
  ${CHUNK_ETENDUE}
  ${CHUNK_MUR}

  void main() {
    /* **Le bassin s'arrête à la ligne d'eau.** Au-delà, c'est le plan filmé qui
       fournit la margelle, et c'est la seule façon de ne pas voir apparaître le
       carrelage bleu de la démo au bord de l'image dès que la caméra se
       redresse. La coupe se fait à la hauteur locale de l'onde et non à zéro :
       une coupe droite laisserait un cheveu de jour entre la paroi et une
       surface qui, elle, ondule. */
    /* La coupe se fait a la **margelle**, pas a la ligne d eau. Le bandeau
       entre les deux est la paroi emergee du bassin — le franc-bord — et c est
       lui qui manquait : sans lui, un liseré de l eau du plan filmé se voyait
       le long du bord, et le masquer par un debord faisait sortir la nappe du
       bassin. Le rendre resout les deux, et il permet surtout a l onde de
       clapoter librement contre le mur au lieu d etre aplatie pour cacher le
       trou. */
    if (vPos.y > 0.0) discard;
    vec4 info = texture2D(uEtat, uvChamp(vPos.xz));
    float niveau = info.r * uAmplitude + NIVEAU_EAU;
    vec3 c = couleurMur(vPos);
    if (vPos.y < niveau) {
      c *= uTeinteSousEau * 1.2;
    } else {
      /* Le franc-bord. Dans le plan filmé c'est une paroi à l'ombre, presque
         noire, et non un carrelage éclairé : la rendre claire posait un liseré
         blanc tout autour du bassin. On garde un souffle de sa matière, et
         rien de plus. */
      float l = dot(c, vec3(0.299, 0.587, 0.114));
      c = FRANC_BORD * (0.72 + 0.56 * l);
    }
    gl_FragColor = vec4(c, 1.0);
  }
`;

/**
 * Le fond du cadre : tout ce qui n'est ni l'eau ni le bassin.
 *
 * Un plan plein cadre rendu avant le reste, sans test ni écriture de
 * profondeur. Chaque pixel reconstitue sa direction de visée, et va la chercher
 * dans le plan filmé — ou, s'il en sort, dans le ciel calculé, c'est-à-dire
 * l'encre du site. C'est la même fonction `viserPlan` que celle du lancer de
 * rayon de la surface : ce qu'on voit au-dessus de l'eau et ce que l'eau
 * réfléchit sont, par construction, la même image.
 */
const SOMMET_FOND = /* glsl */ `
  varying vec2 vNdc;
  void main() {
    vNdc = position.xy;
    gl_Position = vec4(position.xy, 1.0, 1.0);
  }
`;

const FRAGMENT_FOND = /* glsl */ `
  precision highp float;
  varying vec2 vNdc;

  uniform mat3 uCadreVersMonde;
  uniform vec2 uTanDemiCadre;
  uniform vec2 uMargeFond;
  uniform vec3 uCielBas;
  uniform vec3 uCielHaut;
  uniform vec3 uEclat;
  uniform vec3 uSoleil;
  uniform float uExtinction;

  ${CHUNK_PLAN}

  void main() {
    vec3 d = normalize(uCadreVersMonde * vec3(vNdc * uTanDemiCadre, -1.0));

    vec3 fond = mix(uCielBas, uCielHaut, clamp(d.y * 0.5 + 0.5, 0.0, 1.0));
    float soleil = pow(max(0.0, dot(normalize(uSoleil), d)), 5000.0);
    fond += soleil * uEclat * 10.0;

    /**
     * **La marge se resserre à mesure que la caméra rejoint la pose du plan.**
     *
     * Au cadrage final, les deux champs coïncident : la marge est nulle, rien
     * n'est borné, rien n'est étiré. Mais **pendant la rotation, le tangage de
     * la caméra n'est pas celui du plan**, et les rayons des bords sortent alors
     * du secteur filmé — c'est de là que venaient les deux bandes grises
     * verticales sur les côtés. Le champ visé par la caméra balaie plus que le
     * plan n'a vu.
     *
     * On élargit donc la marge le temps du mouvement, et ce qui reste malgré
     * tout au-dehors tombe vers l'encre du site plutôt que vers le ciel calculé,
     * qui est clair : un bord qui s'assombrit se lit comme un cadre, un bord
     * gris clair se lit comme un défaut.
     */
    vec2 uv;
    float couverture = uPlanForce > 0.0 ? viserPlan(d, uMargeFond, uv) : 0.0;
    if (uPlanForce > 0.0) {
      vec3 plan = texture2D(uPlan, uv).rgb * uPlanExposition;
      fond = mix(fond, mix(uCielBas, plan, couverture), uPlanForce);
    }
    gl_FragColor = vec4(mix(fond, uCielBas, uExtinction), 1.0);
  }
`;

/** `shaders/water/surface.vert.wgsl`. Le plan XY devient le plan XZ, hauteur lue. */
const SOMMET_SURFACE = /* glsl */ `
  ${CHUNK_ETENDUE}
  uniform sampler2D uEtat;
  varying vec3 vMonde;

  void main() {
    vec4 info = textureLod(uEtat, uvChamp(position.xy), 0.0);
    /* Le relief s'aplatit quand la caméra se redresse. Voir uAmplitude. */
    vec3 p = vec3(position.x, info.r * uAmplitude + NIVEAU_EAU, position.y);
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

  /* La lisière : le trait d'eau du plan filmé, et de quoi le faire clapoter. */
  uniform sampler2D uTrait;
  uniform mat4 uPlanVue;
  uniform float uLisiere;
  uniform float uClapot;
  uniform float uTraitBase;
  uniform float uTraitPlage;
  uniform float uDescente;
  uniform float uExtinction;

  ${CHUNK_CUBE}
  ${CHUNK_ETENDUE}
  ${CHUNK_MUR}
  ${CHUNK_PLAN}

  /* Teinte de l'eau vue d'au-dessus — ABOVEwaterColor de la source. C'est un
     coefficient d'absorption, pas une palette : il rend le rouge plus vite que
     le bleu quand le rayon descend. */
  const vec3 TEINTE_EAU = vec3(0.295, 0.93, 0.95);

  /**
   * Ce qu'il y a au-dessus de l'eau.
   *
   * Tant que le plan n'est pas là, c'est le ciel calculé de la version
   * zénithale : le cubemap photographique de la démo n'entre pas, deux jetons et
   * un dégradé GLSL, plus le spéculaire de soleil d'origine.
   *
   * Dès qu'il est là, **c'est le plan filmé** — et c'est le point qui fait toute
   * la différence entre un composite et deux images collées. Ce que le rayon
   * réfléchi va chercher n'est pas une teinte de remplacement : c'est le mur, les
   * palmiers, le ciel du plan, à la direction exacte où ils se trouvent. La villa
   * se reflète donc réellement dans la houle, et son reflet ondule sous la main
   * qui remue l'eau. Aucune quantité de réglage ne fabrique cette image-là.
   */
  vec3 ciel(vec3 rayon) {
    vec3 fond = mix(uCielBas, uCielHaut, clamp(rayon.y * 0.5 + 0.5, 0.0, 1.0));
    float soleil = pow(max(0.0, dot(normalize(uSoleil), rayon)), 5000.0);
    fond += soleil * uEclat * 10.0;

    vec2 uv;
    /* Marge serrée en horizontal, large en vertical : voir viserPlan. */
    float couverture =
      uPlanForce > 0.0 ? viserPlan(rayon, vec2(1.04, 2.2), uv) : 0.0;
    if (couverture > 0.0) {
      vec3 plan = texture2D(uPlan, uv).rgb * uPlanExposition;
      return mix(fond, plan, uPlanForce * couverture);
    }
    return fond;
  }

  /**
   * Le lancer de rayon depuis la surface.
   *
   * Vers le bas, le fond du bassin et l'eau qui absorbe au passage. Vers le
   * haut, ce qu'il y a au-dessus de l'eau, et **rien d'autre**.
   *
   * La branche intermédiaire de la source — un rayon montant qui frappe le mur
   * sous la margelle rend la couleur du mur — a été retirée, et c'est délibéré.
   * Elle ne se déclenchait jamais à l'aplomb, où les rayons réfléchis montent
   * raide ; en incidence rasante elle se déclenche au contraire tout le temps, et
   * elle irait chercher le carrelage de la démo là où il faut désormais lire le
   * lieu filmé. C'est le plan qui fournit la margelle, comme il fournit tout ce
   * qui est au-dessus de l'eau.
   */
  vec3 couleurRayon(vec3 origine, vec3 rayon) {
    if (rayon.y >= 0.0) return ciel(rayon);
    vec2 t = intersectCube(origine, rayon, BOITE_MIN, BOITE_MAX);
    /* **L'absorption n'est jamais neutralisée, et c'est tout le bleu de l'eau.**
       Le carrelage de la source est gris (0,724 sur les trois canaux, mesuré) :
       la couleur ne vient pas de lui, elle vient d'ici — le rouge est rendu
       quatre fois moins vite que le bleu, ce qui est la physique de l'eau.
       L'avoir rabattue vers du neutre a grisé le bassin au moment même où il
       devait rester le bleu qu'on a vu en arrivant. */
    return couleurMur(origine + rayon * t.y) * TEINTE_EAU;
  }

  void main() {
    /* Raffinement itératif de l'UV : cinq passes, pas de la source. Sans elles
       la surface est facettée — on lit la normale du texel voisin de celui qui
       porte réellement le point. */
    vec2 uvEtat = uvChamp(vMonde.xz);
    vec4 info = texture2D(uEtat, uvEtat);
    for (int i = 0; i < 5; i++) {
      uvEtat += info.ba * 0.005;
      info = texture2D(uEtat, uvEtat);
    }

    /* La normale s'aplatit du même facteur que le relief : les deux décrivent
       la même surface, et les séparer donnerait une eau plate qui brille comme
       une eau agitée. */
    vec2 ba = info.ba * uAmplitude;
    vec3 normale = vec3(ba.x, sqrt(max(0.0, 1.0 - dot(ba, ba))), ba.y);

    vec3 incident = normalize(vMonde - cameraPosition);
    vec3 reflechi = reflect(incident, normale);
    vec3 refracte = refract(incident, normale, IOR_AIR / uIOR);

    /* Vue à l'aplomb, ce terme reste près de son plancher : la surface réfléchit
       peu et laisse voir le fond. C'est la conséquence assumée de la caméra
       zénithale, et c'est ce qu'on veut — le sujet est la caustique. */
    float fresnel = mix(uFresnelMin, 1.0,
                        pow(1.0 - dot(normale, -incident), 3.0));

    /* **On laisse voir le fond plus qu'il ne le faudrait, et c'est délibéré.**
       En incidence rasante, Fresnel physique passe 0,8 et l'eau devient un
       miroir opaque : c'est juste, et c'est illisible — on ne reconnaît plus une
       piscine, on voit une plaque de métal posée dans une cour. Le terme est
       donc rabattu d'un quart quand le lieu est là, ce qui rend à l'eau sa
       transparence sans lui retirer ses reflets. */
    /* **Rabattu de moitié quand le lieu est là.** À cet angle rasant, Fresnel
       physique fait dominer le reflet — et ce que l'eau réfléchit ici est un mur
       de véranda blanc, qui la ramène vers le neutre. L'eau du plan, elle, reste
       franchement verte : son corps l'emporte sur son miroir. Sans ce rabat,
       notre eau sortait trop neutre. Le fond, lui, est réglé séparément. */
    fresnel *= mix(1.0, 0.72, uFondFusion);

    vec3 cReflechi = couleurRayon(vMonde, reflechi);
    vec3 cRefracte = couleurRayon(vMonde, refracte);

    vec3 couleur = mix(cRefracte, cReflechi, fresnel);

    /**
     * **La frontière avec l'eau filmée n'est pas une ligne.**
     *
     * C'est le point sur lequel tout se joue. Une découpe droite se lit
     * instantanément comme un montage : l'eau du plan bouge, la nôtre bouge, et
     * entre les deux un trait parfaitement immobile et parfaitement horizontal.
     *
     * La lisière est donc **modulée par l'onde elle-même** : là où une crête
     * arrive, l'eau calculée monte un peu plus haut sur le bord ; dans un creux
     * elle se retire. Le trait ondule, et il ondule *en phase avec ce qu'on
     * voit*, puisque c'est la même hauteur qui déplace la surface et la lisière.
     *
     * Le trait de référence, lui, est relevé sur le plan et rangé dans une
     * table : le bord du bassin filmé n'est pas droit — il descend de quatre-
     * vingts pixels sur la gauche — et une droite ajustée s'en écartait de
     * cinquante. On lit donc sa vraie forme.
     *
     * Rien de tout cela n'existe tant que le plan n'est pas là : à l'aplomb,
     * l'eau occupe tout le cadre et la lisière n'a pas de sens.
     */
    vec4 cp = uPlanVue * vec4(vMonde, 1.0);
    float alpha = 1.0;
    if (uPlanForce > 0.0 && cp.w > 0.0) {
      vec2 uvPlan = cp.xy / cp.w * 0.5 + 0.5;
      float trait = uTraitBase
        + texture2D(uTrait, vec2(clamp(uvPlan.x, 0.0, 1.0), 0.5)).r * uTraitPlage;
      /* Le trait suit la base de la margelle ; l'eau, elle, commence au bas de
         la paroi émergée. On descend donc d'autant. Voir TRAIT_DESCENTE. */
      trait -= uDescente;
      trait += info.r * uClapot;
      float masque = smoothstep(trait + uLisiere, trait - uLisiere, uvPlan.y);
      alpha = mix(1.0, masque, uPlanForce);
    }

    /* La sortie du chapitre éteint le cadre vers l'encre du site — la couleur
       de la page — et non vers le noir : c'est ce qui rend le raccord avec le
       chapitre suivant invisible. */
    gl_FragColor = vec4(mix(couleur, uCielBas, uExtinction), alpha);
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
  /**
   * Le redressement de la caméra, de 0 (à l'aplomb) à 1 (vers l'horizon).
   *
   * Écrit par le scrub du chapitre, lu au cadre. Il passe par la ref d'état et
   * non par une prop : il change soixante fois par seconde, et le faire
   * traverser React reconstruirait l'arbre à chaque cran de molette.
   */
  redressement: number;
  /**
   * L'exposition du plan filmé, de 1 (telle quelle) vers le bas.
   *
   * Elle existe pour une raison mesurée, et c'est la même que celle qui règle
   * déjà la lisibilité du manifeste sur la pièce allumée : la craie sur le mur
   * du plan ne donne que **1,85:1**, très loin des 3:1 qu'un grand texte doit
   * tenir. Ce n'est pas `mix-blend-mode` qui répare cela — le négatif est
   * aveugle sur une luminance moyenne, et c'est exactement ce qu'est ce mur —,
   * et le Livre I interdit le dégradé de CSS qui ferait office de voile.
   *
   * C'est donc l'exposition du plan, comme pour le film du même chapitre. La
   * valeur retenue est mesurée **sur le rendu** et non sur le fichier source :
   * le mur nu derrière la phrase donne 1,36:1 à pleine exposition, et 3,4:1
   * à **0,38**. La dernière phrase du manifeste se dit sur une lumière qui
   * baisse — ce qui est aussi, accessoirement, la bonne image pour finir.
   */
  exposition: number;
  /**
   * L'extinction du chapitre, de 0 (le lieu) à 1 (le noir).
   *
   * Elle éteint **tout le cadre** et non le seul plan filmé : l'eau part avec
   * le lieu, puisque c'est la scène entière qu'on quitte. Sans elle, le cadre se
   * décollait sur une image en pleine lumière et l'encre arrivait à la frame
   * suivante — un raccord franc, le seul du chapitre, là où tout le reste est en
   * fondu.
   *
   * Elle est appliquée sur la couleur du plan d'affichage plutôt que dans les
   * shaders : un `MeshBasicMaterial` multiplie sa carte par sa couleur, donc
   * l'extinction ne coûte rien et n'ajoute aucune passe.
   */
  extinction: number;
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
    const detailZ = pointeurGrossier ? DETAIL_Z_MOBILE : DETAIL_Z_FIN;

    /* ---- Les couleurs, lues ici et non à l'évaluation du module ---------
       Un jeton lu au chargement du fichier peut l'être avant que la feuille de
       style ne soit appliquée. Voir `scripts/verifier-jetons.mjs`. */
    const cielBas = new THREE.Color("#0e1317");
    const cielHaut = couleurJeton("sel");
    const eclat = couleurJeton("craie");
    const teinteSousEau = couleurJeton("sel");

    /**
     * Le fond du bassin filmé, vers lequel le carrelage de la démo se fond
     * quand la caméra se redresse.
     *
     * La valeur n'est pas choisie : c'est la teinte relevée sur l'eau du plan,
     * neutre et à peine bleutée, divisée par l'éclairement moyen que le shader
     * applique ensuite. Elle est déclarée ici, en clair, plutôt que d'être un
     * jeton — ce n'est pas une couleur du site, c'est la mesure d'une image.
     */
    const fondDuLieu = new THREE.Color(0.329, 0.613, 0.653);

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

    /* ---- Le plan filmé ---------------------------------------------------
       `NoColorSpace`, comme les carreaux et pour la même raison : ses valeurs
       sont des valeurs d'affichage et traversent la chaîne sans être touchées.
       Ce qu'il y a dans le fichier est ce qu'on voit — aucun étalonnage n'est
       cuit ici, `uPlanExposition` reste disponible si on veut en poser un.

       L'élément n'est jamais dans le DOM : il n'est qu'une source de décodage
       pour la texture. Il ne démarre pas tout seul — voir `reglerLecture`, qui
       ne le lance que lorsqu'on le regarde vraiment, et l'arrête sinon. */
    const video = document.createElement("video");
    video.src = PLAN_SOURCE;
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.preload = "auto";
    /* Sans lui, iOS refuse la lecture en ligne d'un média sans contrôles. */
    video.setAttribute("playsinline", "");

    const texturePlan = new THREE.VideoTexture(video);
    texturePlan.colorSpace = THREE.NoColorSpace;
    texturePlan.minFilter = THREE.LinearFilter;
    texturePlan.magFilter = THREE.LinearFilter;
    texturePlan.generateMipmaps = false;
    texturePlan.wrapS = THREE.ClampToEdgeWrapping;
    texturePlan.wrapT = THREE.ClampToEdgeWrapping;

    let enLecture = false;
    const reglerLecture = (doit: boolean) => {
      if (doit === enLecture) return;
      enLecture = doit;
      if (doit) void video.play().catch(() => undefined);
      else video.pause();
    };

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
       `position.xy` dans `[-1, 1]`, `z` nul. C'est le domaine simulé, et c'est
       celui de la caustique. */
    const grille = new THREE.PlaneGeometry(2, 2, detail, detail);

    /* La surface, elle, déborde le domaine simulé : elle court jusqu'à `Z_MAX`,
       au-delà du point de vue final, sans quoi le bas du cadre sortirait de
       l'eau à mi-rotation (voir `Z_MAX`). La translation remet `position.y`
       dans `[-1, Z_MAX]`, si bien que le shader de sommets continue de lire
       `position.xy` comme les coordonnées du plan d'eau — et le champ de
       hauteur, lui, est replié en miroir au-delà de 1. */
    const grilleSurface = new THREE.PlaneGeometry(
      2,
      Z_MAX + 1,
      detail,
      detailZ,
    );
    grilleSurface.translate(0, (Z_MAX - 1) / 2, 0);

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
    /* Le fond du cadre. Le plan plein cadre le recouvre entièrement, mais un
       tampon non effacé se verrait, lui, au premier redimensionnement. */
    sceneEau.background = cielBas.clone();

    const cameraEau = new THREE.PerspectiveCamera(CHAMP, 1, 0.01, 100);
    /**
     * **L'orientation est un seul scalaire, et c'est tout le chapitre.**
     *
     * La version zénithale posait `up = (0, 0, -1)` puis `lookAt(0,0,0)`. Cette
     * base est exactement celle de `rotation.x = -PI/2` en ordre XYZ — on peut
     * le vérifier terme à terme —, si bien que le redressement n'est pas une
     * reconstruction mais la continuation de la même chose : `rotation.x` monte
     * de `-PI/2` (l'aplomb) à `TANGAGE_FINAL` (l'horizon du plan filmé).
     */
    cameraEau.rotation.order = "XYZ";
    cameraEau.rotation.set(TANGAGE_DEPART, 0, 0);
    cameraEau.position.set(0, HAUTEUR_CAMERA, 0);

    /**
     * La caméra du plan filmé — celle qui a tourné, et qui n'a jamais bougé.
     *
     * Elle n'existe que pour porter une orientation : `uVersPlan` en est
     * l'inverse, et c'est elle qui reprojette une direction du monde dans
     * l'image. Sa position n'entre nulle part, et c'est le fond du sujet — une
     * direction n'a pas d'origine.
     */
    const rotationPlan = new THREE.Matrix4().makeRotationX(TANGAGE_FINAL);
    const versPlan = new THREE.Matrix3()
      .setFromMatrix4(rotationPlan)
      .transpose();

    /* Demi-champ du plan, en tangentes : la moitié de son champ vertical, et
       autant multiplié par son rapport d'image. Ce sont les deux nombres qui
       transforment une direction en pixel du plan. */
    const tanDemiPlan = new THREE.Vector2(
      TANGENTE_DEMI_CHAMP * (PLAN_LARGEUR / PLAN_HAUTEUR),
      TANGENTE_DEMI_CHAMP,
    );

    /* Les mêmes pour le cadre courant : le rapport suit l'ancre, donc ils sont
       réécrits à chaque redimensionnement. */
    const tanDemiCadre = new THREE.Vector2(
      TANGENTE_DEMI_CHAMP,
      TANGENTE_DEMI_CHAMP,
    );
    const cadreVersMonde = new THREE.Matrix3();
    const margeFond = new THREE.Vector2(1.006, 1.006);

    /**
     * La caméra du plan, avec sa **position** cette fois.
     *
     * `uVersPlan` ne porte qu'une orientation, ce qui suffit pour aller chercher
     * une direction — un reflet n'a pas d'origine. La lisière, elle, demande de
     * savoir où un *point* du plan d'eau tombe dans l'image filmée : il faut
     * donc la matrice complète, position comprise.
     */
    const cameraPlan = new THREE.PerspectiveCamera(
      CHAMP,
      PLAN_LARGEUR / PLAN_HAUTEUR,
      0.01,
      100,
    );
    cameraPlan.rotation.order = "XYZ";
    cameraPlan.rotation.set(TANGAGE_FINAL, 0, 0);
    cameraPlan.position.set(POSE_X, POSE_Y, POSE_Z);
    cameraPlan.updateMatrixWorld();
    const planVue = new THREE.Matrix4().multiplyMatrices(
      cameraPlan.projectionMatrix,
      cameraPlan.matrixWorldInverse,
    );

    /* Le trait d'eau relevé sur le plan. Une ligne de texels, filtrée
       linéairement : la lisière suit une courbe, pas des marches. */
    const textureTrait = new THREE.DataTexture(
      TRAIT_EAU,
      TRAIT_EAU.length,
      1,
      THREE.RedFormat,
      THREE.UnsignedByteType,
    );
    textureTrait.minFilter = THREE.LinearFilter;
    textureTrait.magFilter = THREE.LinearFilter;
    textureTrait.wrapS = THREE.ClampToEdgeWrapping;
    textureTrait.wrapT = THREE.ClampToEdgeWrapping;
    textureTrait.needsUpdate = true;

    const uniformsPlan = () => ({
      uPlan: { value: texturePlan },
      uVersPlan: { value: versPlan },
      uTanDemiPlan: { value: tanDemiPlan },
      uPlanForce: { value: 0 },
      uPlanExposition: { value: 1 },
    });

    const uniformsMur = () => ({
      uCarreaux: { value: carreaux },
      uEtat: { value: etats[0].texture },
      uCaustiques: { value: cibleCaustiques.texture },
      uSoleil: { value: soleil },
      uCaustiquesForce: { value: 1 },
      uFondFusion: { value: 0 },
      uFondCouleur: { value: fondDuLieu },
      uAmplitude: { value: 1 },
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

    /* **Le bassin n'est plus dessiné.** Le nouveau plan est pris au ras de
       l'eau : il n'y a plus de margelle ni de paroi à raccorder, donc plus rien
       à faire coïncider — c'est tout le bénéfice du changement de plan. La
       boîte survit uniquement comme géométrie analytique, pour que les rayons
       réfractés aient un fond où tomber ; elle n'entre pas dans la scène. */
    const geometrieBassinMaillage = geometrieBassin();

    const materiauSurface = new THREE.ShaderMaterial({
      uniforms: {
        ...uniformsMur(),
        ...uniformsPlan(),
        uCielBas: { value: cielBas },
        uCielHaut: { value: cielHaut },
        uEclat: { value: eclat },
        uIOR: { value: IOR_EAU },
        uFresnelMin: { value: FRESNEL_MIN },
        uTrait: { value: textureTrait },
        uPlanVue: { value: planVue },
        uLisiere: { value: LISIERE },
        uClapot: { value: CLAPOT },
        uTraitBase: { value: TRAIT_BASE },
        uTraitPlage: { value: TRAIT_PLAGE },
        uDescente: { value: TRAIT_DESCENTE },
        uExtinction: { value: 0 },
      },
      vertexShader: SOMMET_SURFACE,
      fragmentShader: FRAGMENT_SURFACE,
      side: THREE.DoubleSide,
      /* La nappe se pose **sur** le plan filmé : sa lisière est un fondu, donc
         elle est transparente. Rien d'autre n'occupe la scène — le bassin n'est
         plus dessiné —, donc ni test ni écriture de profondeur. */
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });

    const maillageSurface = new THREE.Mesh(grilleSurface, materiauSurface);
    maillageSurface.frustumCulled = false;
    sceneEau.add(maillageSurface);

    /* ---- Le fond du cadre : le plan filmé, reprojeté ------------------- */

    const materiauFond = new THREE.ShaderMaterial({
      uniforms: {
        ...uniformsPlan(),
        uCadreVersMonde: { value: cadreVersMonde },
        uExtinction: { value: 0 },
        uMargeFond: { value: margeFond },
        uTanDemiCadre: { value: tanDemiCadre },
        uCielBas: { value: cielBas },
        uCielHaut: { value: cielHaut },
        uEclat: { value: eclat },
        uSoleil: { value: soleil },
      },
      vertexShader: SOMMET_FOND,
      fragmentShader: FRAGMENT_FOND,
      depthTest: false,
      depthWrite: false,
    });

    const maillageFond = new THREE.Mesh(geometriePleinCadre, materiauFond);
    maillageFond.frustumCulled = false;
    /* Avant tout le reste, et sans profondeur : c'est un fond, pas un objet. */
    maillageFond.renderOrder = -10;
    sceneEau.add(maillageFond);

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

    /**
     * Hauteur de l'œil au départ du redressement, c'est-à-dire la pose
     * zénithale. Elle dépend du rapport d'image — sur un cadre très large, la
     * hauteur nominale laisserait paraître les murs — et n'est donc recalculée
     * qu'au redimensionnement. Voir `HAUTEUR_CAMERA`.
     */
    let hauteurDepart = HAUTEUR_CAMERA;

    /** Dernier redressement posé, pour ne rien recalculer quand rien ne bouge. */
    let redressementPose = -1;

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

      /* La passe la plus chère du site ne tourne que tant qu'on la voit : dès
         que la caméra s'est assez redressée, le fond n'est plus regardé de face
         et la caustique ne se lit plus. C'est exactement le budget que réclame
         l'échantillonnage du plan filmé, qui arrive au même moment. */
      if (!caustiquesUtiles()) return;

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

    /* ==================================================================
       Le redressement
       ================================================================== */

    /** Lissage en S — dérivée nulle aux deux bouts, donc pas d'à-coup. */
    const lissage = (t: number) => t * t * (3 - 2 * t);

    /** La part parcourue d'un intervalle de la course, bornée. */
    const part = (p: number, [debut, fin]: readonly [number, number]) =>
      Math.min(1, Math.max(0, (p - debut) / (fin - debut)));

    /**
     * Pose la caméra pour un redressement donné, et met à jour tout ce qui en
     * dépend.
     *
     * **La translation et la rotation ne partagent pas le même intervalle**, et
     * c'est la condition d'exactitude de tout le chapitre : la position est
     * arrivée à `COURSE_POSITION[1]`, le plan n'entre qu'à `COURSE_PLAN[0]`, si
     * bien que le plan filmé n'est jamais visible pendant que la caméra se
     * déplace. Ce qu'il reste alors est une rotation pure, et une rotation pure
     * ne produit aucune parallaxe — le plan est donc juste, pas approché.
     */
    const poserCamera = (p: number) => {
      if (p === redressementPose) return;
      redressementPose = p;
      /* La pose a changé : en mouvement réduit, où l'on ne rend qu'une fois, il
         faut redessiner — sinon le cadre garderait l'ancienne orientation. */
      cadreAJour = false;

      const tp = lissage(part(p, COURSE_POSITION));
      const tr = lissage(part(p, COURSE_TANGAGE));

      cameraEau.position.set(
        POSE_X * tp,
        hauteurDepart + (POSE_Y - hauteurDepart) * tp,
        POSE_Z * tp,
      );
      cameraEau.rotation.x =
        TANGAGE_DEPART + (TANGAGE_FINAL - TANGAGE_DEPART) * tr;
      cameraEau.updateMatrixWorld();

      /* La rotation courante, pour que le fond sache reconstruire ses rayons. */
      cadreVersMonde.setFromMatrix4(cameraEau.matrixWorld);

      /* La marge du fond suit l'ecart de tangage a la pose du plan : nulle a
         l'arrivee, ouverte pendant la rotation. Voir uMargeFond. */
      const ecart =
        Math.abs(cameraEau.rotation.x - TANGAGE_FINAL) /
        Math.abs(TANGAGE_DEPART - TANGAGE_FINAL);
      const marge = 1.006 + MARGE_TRANSITION * Math.min(1, ecart * 4);
      margeFond.set(marge, marge);

      const force = lissage(part(p, COURSE_PLAN));
      materiauFond.uniforms.uPlanForce!.value = force;
      materiauSurface.uniforms.uPlanForce!.value = force;

      /* Le fond du bassin, lui, rejoint celui du lieu **pendant la descente** :
         c'est elle qui rend la trame du carrelage lisible, donc c'est elle qui
         doit la dissoudre. Voir `COURSE_FOND`. */
      /* Le fond est uni **de bout en bout**. La trame de carrelage de la démo
         ne s'accorde pas avec ce bassin-ci, qui n'en montre aucune, et le bleu
         de la démo non plus : la couleur de l'eau est désormais celle du plan,
         relevée sur l'image, et elle vaut dès la première seconde du chapitre.
         Il n'y a donc plus rien à faire fondre en cours de route. */
      const fond = 1.0;
      materiauSurface.uniforms.uFondFusion!.value = fond;

      /* Le relief de l'onde s'aplatit avec le redressement. Voir uAmplitude :
         la même vague, vue en rasant, se dresse sur une grande hauteur d'écran
         et l'eau se lit comme une dalle. */
      const amplitude = 1 - AMPLITUDE_RABAT * fond;
      materiauBassin.uniforms.uAmplitude!.value = amplitude;
      materiauSurface.uniforms.uAmplitude!.value = amplitude;

      /* Le plan ne décode que lorsqu'on le regarde. */
      reglerLecture(force > 0);

      /* La caustique s'éteint quand le fond cesse d'être regardé de face — et
         ce qu'elle libère paye l'échantillonnage du plan. Voir
         `CAUSTIQUES_SEUIL`.

         Le tangage vaut `-PI/2` à l'aplomb et monte vers zéro : la force est
         donc pleine au départ et nulle passé le seuil. */
      const forceCaustiques = Math.min(
        1,
        Math.max(
          0,
          (cameraEau.rotation.x - CAUSTIQUES_SEUIL) /
            (TANGAGE_DEPART - CAUSTIQUES_SEUIL),
        ),
      );
      materiauBassin.uniforms.uCaustiquesForce!.value = forceCaustiques;
      materiauSurface.uniforms.uCaustiquesForce!.value = forceCaustiques;
    };

    /** La caustique ne vaut d'être calculée que si quelqu'un la regarde. */
    const caustiquesUtiles = () =>
      (materiauBassin.uniforms.uCaustiquesForce!.value as number) > 0.002;

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
        /* Le plafond suit la scène : haut dès que le plan filmé tient l'image,
           où la caustique est éteinte et où la surface ne couvre plus tout.
           Le seuil est franchi une fois, donc la cible n'est redimensionnée
           qu'une fois — un plafond continu la reconstruirait à chaque frame. */
        const plafond =
          (materiauFond.uniforms.uPlanForce!.value as number) >= SEUIL_PLAFOND
            ? PIXELS_MAX_PLAN
            : PIXELS_MAX;

        const demandes = rect.width * rect.height * taille.dpr * taille.dpr;
        const reduction = Math.min(1, Math.sqrt(plafond / demandes));
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

          /**
           * **Le champ de la caméra tient dans celui du plan, toujours.**
           *
           * C'est le point qui manquait, et il ne se voyait pas en 16/9 parce
           * qu'en 16/9 il n'y a rien à corriger. Le plan couvre un secteur fixe :
           * la moitié de son champ vertical, et autant multiplié par son rapport
           * d'image. Sur un écran **plus large** que lui — et 2,06:1 n'a rien
           * d'exotique —, la caméra voyait plus large que le plan n'avait vu, et
           * les colonnes de bord se bornaient au dernier pixel : les deux côtés
           * de l'image partaient en traînées verticales.
           *
           * On resserre donc le champ vertical juste assez pour que le cadre
           * tienne dans le secteur filmé. C'est un recadrage, pas une
           * déformation, et **le composite reste exact** : le plan est
           * échantillonné par direction et la géométrie projetée par la même
           * caméra, si bien que les deux se recadrent ensemble. On voit moins de
           * hauteur du plan, et rien d'autre ne bouge.
           */
          const tanPlanH =
            TANGENTE_DEMI_CHAMP * (PLAN_LARGEUR / PLAN_HAUTEUR);
          const tanV = Math.min(TANGENTE_DEMI_CHAMP, tanPlanH / rapport);

          cameraEau.aspect = rapport;
          cameraEau.fov = (2 * Math.atan(tanV) * 180) / Math.PI;

          /* Sur un cadre très large, la hauteur nominale laisserait paraître
             les murs : on rapproche juste assez pour que le cadre reste à
             l'intérieur du bassin. Voir `HAUTEUR_CAMERA`. Ce n'est plus posé
             sur la caméra ici — c'est le point de départ du redressement, et
             c'est `poserCamera` qui l'applique. */
          hauteurDepart = Math.min(
            HAUTEUR_CAMERA,
            1 / (tanV * Math.max(rapport, 1)),
          );

          /* Le demi-champ du cadre courant, dont le fond tire ses rayons. */
          tanDemiCadre.set(tanV * rapport, tanV);

          cameraEau.updateProjectionMatrix();
          /* La pose dépend de `hauteurDepart` : elle est à refaire. */
          redressementPose = -1;
        }

        poserCamera(reglages.etat.current.redressement ?? 0);

        /* L'exposition du plan. Elle ne passe pas par `poserCamera` : elle ne
           descend pas du redressement mais du minutage du texte, et les deux ne
           se recouvrent qu'en partie. Voir `EtatBassin.exposition`. */
        /* **L'extinction va vers l'encre du site, pas vers le noir.**
           Elle multipliait la couleur du plan d'affichage, ce qui la menait au
           noir pur — plus sombre que le fond de page. Le cadre s'éteignait donc
           sur du noir, et le chapitre suivant reprenait sur l'encre : une marche
           de couleur franche, exactement là où le raccord devait être invisible.
           Les deux shaders mélangent maintenant leur sortie vers `uCielBas`,
           c'est-à-dire vers la couleur même de la page. */
        const extinction = reglages.etat.current.extinction ?? 0;
        if (materiauFond.uniforms.uExtinction!.value !== extinction) {
          materiauFond.uniforms.uExtinction!.value = extinction;
          materiauSurface.uniforms.uExtinction!.value = extinction;
          cadreAJour = false;
        }

        const exposition = reglages.etat.current.exposition ?? 1;
        if (materiauFond.uniforms.uPlanExposition!.value !== exposition) {
          materiauFond.uniforms.uPlanExposition!.value = exposition;
          materiauSurface.uniforms.uPlanExposition!.value = exposition;
          cadreAJour = false;
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
        if (visible) {
          /* **On revient dans la section.** La pose est inchangée, donc le
             garde-fou de `poserCamera` la considérerait comme déjà appliquée et
             ne rejouerait rien — dont la remise en lecture du plan filmé, qui
             restait alors en pause. On invalide donc la pose : la prochaine
             frame réapplique tout. */
          redressementPose = -1;
        }
        if (!visible) {
          /* Le chapitre sort de l'écran : le plan filmé n'a plus personne pour
             le regarder, et un décodage vidéo qui continue en arrière-plan est
             exactement ce que le budget interdit. */
          reglerLecture(false);
        }
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

        /* Le plan filmé : on arrête le décodage, on coupe la source, et on
           demande un chargement à vide. Sans ce dernier geste, Chrome garde le
           tampon de décodage vivant après le simple `pause()`. */
        reglerLecture(false);
        texturePlan.dispose();
        textureTrait.dispose();
        video.removeAttribute("src");
        video.load();

        geometriePleinCadre.dispose();
        grille.dispose();
        grilleSurface.dispose();
        geometrieBassinMaillage.dispose();
        geometrieAffichage.dispose();

        materiauGoutte.dispose();
        materiauSimulation.dispose();
        materiauNormale.dispose();
        materiauCaustique.dispose();
        materiauBassin.dispose();
        materiauSurface.dispose();
        materiauFond.dispose();
        materiauAffichage.dispose();
      },
    };
  };
}
