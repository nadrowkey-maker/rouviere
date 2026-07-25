---
name: etalonnage-medias
description: Chaîne des médias ROUVIÈRE — sources hors index, étalonnage unique, scripts par chapitre
metadata:
  type: project
---

Tout média servi par le site passe par `scripts/etalonnage.mjs`, qui est la
**seule** autorité sur l'aspect d'une image : désaturation 0,88, point noir
relevé et viré bleu-vert (8/11/15), point blanc laissé chaud (255/252/246). Il
s'exprime en deux moteurs à partir des mêmes chiffres — `etalonner()` pour
sharp, `FILTRE_FFMPEG` / `filtreVideo()` pour la vidéo. Ne jamais poser une
courbe ailleurs : une image qui n'aurait pas celle-là se verrait immédiatement.

Les appelants : `scripts/atelier.mjs` (cinq planches **et un plan filmé**, celui
de la plongée), `scripts/matieres.mjs` (deux plans macro — le noyer fumé n'a plus
de fichier, il emprunte la photographie de sortie de l'enfilade),
`scripts/media-projets.mjs` (cinq projets).

Les rushes bruts vivent dans `medias-source/`, **hors index** (`.gitignore`) —
132 Mo de PNG et de vidéos téléchargées. `public/` ne contient que le produit
de l'étalonnage.

**Poids en dépôt, décision non tranchée :** `public/audio` (45 Mo) et
`public/media/hero` + `public/media/projets` (90 Mo) sont restés **non suivis**,
comme ils l'étaient avant. Seuls `public/media/atelier` et
`public/media/matieres` (7 Mo) sont commités. À trancher : soit tout ignorer et
documenter la fabrication, soit passer par Git LFS. Les mp3 ne sont
régénérables par aucun script — les ignorer sans sauvegarde les exposerait.

Voir [[chapitres-matiere-atelier]] et [[architecture-son]].
