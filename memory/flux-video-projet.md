---
name: flux-video-projet
description: Un seul nœud vidéo pour tout le site — la vidéo du menu devient celle de la page projet, sans coupure
metadata:
  type: project
---

Correction du 25 juillet 2026. Il y avait deux éléments vidéo — celui de l'aperçu
du menu, celui du hero de la chambre — et ils se relayaient. Un relais entre deux
éléments ne peut pas être invisible : le second repart de zéro et met quelques
dizaines de millisecondes à décoder.

**Un nœud `<video>` par projet, et un seul pour toute sa vie**
(`components/chrome/VideoProjet.tsx`), créé impérativement — jamais rendu par
React, dont il changerait de parent sous les pieds —, logé dans un foyer caché du
layout, et **déplacé** d'un hôte à l'autre par `appendChild`. Un déplacement
synchrone dans le même document ne coupe pas la lecture : la spécification
n'appelle les étapes de pause que si l'élément n'est plus dans un document une
fois l'état stabilisé.

Il y avait d'abord **un** nœud réemployé pour les cinq projets, et c'était une
erreur : changer sa source à chaque survol la rechargeait, donc laissait le cadre
noir entre deux projets. Cinq nœuds, mis en chauffe à l'ouverture du menu
(`prechauffer`), n'ont plus rien à charger quand on les désigne — leur première
image est déjà décodée, on la montre à la frame même.

**Why:** c'est le seul moyen de tenir « même flux, même position temporelle,
aucune reprise à zéro, aucun noir » entre le survol du menu et l'ouverture de la
page projet — et de supprimer, du même coup, l'image fixe qui paraissait avant
que la vidéo ne démarre.

**How to apply:**

- Le nœud est créé **à la demande** (`assurer()`), pas dans un effet de montage :
  les effets de disposition remontent depuis les feuilles, donc la chambre le
  réclame avant que le fournisseur n'ait exécuté le sien. Créé au montage, il
  n'existait pas à l'ouverture directe d'une page projet.
- La relève (`armerReleve`) **verrouille** le flux : `arreter()` devient sans
  effet jusqu'à ce que la chambre l'adopte. Il y a plusieurs façons de quitter le
  menu — sortie de survol, fermeture, changement de route — et une seule doit
  laisser la vidéo tranquille ; plutôt que de les recenser, on rend l'arrêt
  impossible. Deux d'entre elles avaient déjà cassé le relais.
- `Transition` lit la relève **pendant son rendu** pour ne poser aucune couture
  sur cette navigation-là : la continuité du plan *est* la transition.
- On ne montre jamais la vidéo avant qu'elle ne joue : `play()` résolu, plus
  `requestVideoFrameCallback` quand il existe, plus un filet de 80 ms. Et l'hôte
  se cache par l'opacité, jamais par `display: none` — une vidéo non composée ne
  présente aucune image, donc ne déclenche jamais le rappel.

**L'entrée dans un projet** (`components/chrome/Ouverture.tsx`) s'appuie sur les
deux : le cadre de la pièce cliquée s'ouvre jusqu'aux quatre bords de l'écran,
son contenu passe de la photographie au film, puis la route change sous une image
qui ne s'est pas interrompue. Elle vit dans le chrome parce qu'elle doit survivre
au démontage du chapitre, et elle verrouille le défilement le temps du geste.

Cela n'est possible que parce que **les pièces du couloir sont des fenêtres** :
elles ne cadrent pas leur photographie, elles en montrent le morceau que leur
boîte laisse voir d'une image déjà à sa taille plein écran (régime de fenêtre
fixe dans `gl/materiaux/piece.ts`). Il n'y a donc jamais rien à redimensionner
pour entrer — ni au clic, ni à la sortie du chapitre. Le prix payé : les médias du
couloir ne défilent plus à une vitesse propre, seuls les noms et la couche
technique gardent leurs rythmes.

Voir [[transitions-orchestrateur]].
