---
name: chapitres-matiere-atelier
description: La Matière et L'Atelier refaits — masque à bord franc, guichet fixe, et ce qui a été retiré
metadata:
  type: project
---

Refonte du 24 juillet 2026, après un constat de ratage sur les deux chapitres.

**La Matière.** Trois matières plein écran, une par écran, traversées par un
masque `clip-path: inset()` à **bord franc** : jamais d'opacité intermédiaire,
jamais deux matières mêlées sur un même pixel — c'est ce qui distingue un
masque d'un fondu, et c'était la demande. Le cadre tient par `position: sticky`
et non par un `pin` GSAP (pas d'espace inséré, retour en arrière exact).
Minutage par `minutage()` : paliers égaux, sinon la première matière garderait
l'écran deux fois plus longtemps que la dernière. Une seule vidéo joue à la
fois, la suivante est mise en chauffe.

Retiré et à ne pas ressusciter : l'effet `shadow`, les échantillons penchés,
`SceneEchantillon`, `materiaux/echantillon.ts`, `scripts/echantillons.mjs`. Le
bassin reste.

**Correction du 25 juillet 2026 — le premier temps n'a plus de média à lui.** Le
plan macro de bois du noyer fumé est supprimé (fichier compris) : il recouvrait
la photographie que l'enfilade venait d'ouvrir en plein cadre, donc annulait
l'arrivée. Le nom et la couche technique se posent maintenant sur cette image-là
(`PLANCHE_SORTIE`, la première planche du dernier projet). Le raccord tient à
deux choses, et elles sont fragiles ensemble : `.matiere` remonte de `-100vh` sur
l'enfilade pour que le cadre `sticky` se colle **à l'instant exact** où
l'épinglage du couloir rend la main ; et le cadre porte `data-pose="false"` tant
que le chapitre n'a pas commencé, sans quoi il monterait par le bas et couvrirait
la sortie du couloir pendant le dernier écran épinglé. Si l'un des deux saute,
l'image glisse entre les chapitres.

**L'Atelier.** Séquence filmée : le guichet (85 à 100 vh) est **fixe**, l'image
le traverse au scrub. Dominance par `sin(πt)` — pleine au centre, en retrait
aux bords. Retiré : la rotation 3D des photographies et leur envol en
profondeur (`rotating-onscroll-animations`), jugés laids et datés.

**La planche de plongée est une vidéo** (25 juillet 2026), et la seule du
chapitre : on ne plonge pas dans une photographie, sinon le sommet n'est qu'un
agrandissement. Deux instances du même fichier — le guichet et le plan plein
cadre — que la plongée cale l'une sur l'autre à son entrée. Piège payé une fois :
le déclencheur de lecture ne peut pas s'écrire `bottom top` sur un temps épinglé
(sa boîte ne bouge plus, la course se terminait au milieu du sommet et figeait
l'image), il faut écrire la course en toutes lettres.

Deux règles de composition apprises à l'œil :

- Les largeurs (44 % à 108 %) et les côtés de débordement sont **écrits planche
  par planche** dans `data/atelier.ts`. Dérivés de l'index, ils font gabarit.
- Le coin bas-gauche est occupé en permanence par le nom du chapitre courant du
  chrome. Toute couche technique de chapitre doit s'en écarter : les notes de
  l'atelier sont calées à droite, la légende des matières est remontée.

**Le portrait de Camille Rouvière est sorti du chapitre** : la règle « aucune
personne » du Livre V ne souffre pas d'exception tenable sans tomber dans le
portrait de banque d'images. Elle reste dans le texte.

Voir [[etalonnage-medias]].
