---
name: architecture-son
description: Son ROUVIÈRE — un AudioContext, trois bus, nappes commandées par le défilement, eau liée à la simulation
metadata:
  type: project
---

`src/components/chrome/SonProvider.tsx` tient tout le son. Un seul
`AudioContext`, construit au clic de l'écran d'entrée (`activerSon`, qui pose
l'état — ne jamais rebrancher le seuil sur `basculerSon`, qui le retournerait).
Sous le maître : bus `musique`, `ambiance`, `interface`. Préférence en
`localStorage` sous `rouviere:son`, restituée à la première interaction et
seulement si l'écran d'entrée ne va pas jouer.

Points à ne pas défaire :

- Les nappes passent par `createMediaElementSource`, jamais par `AudioBuffer` —
  `site.mp3` fait 4 min 40, `eau.mp3` 9 min 15.
- Le champ d'une nappe s'appelle `sortie` (un `GainNode`), pas `gain` : le
  paramètre est `nappe.sortie.gain`. Le nom court invitait à passer le nœud là
  où une `AudioParam` était attendue.
- Le fondu croisé hero → site est poussé par `reglerSortieHero(self.progress)`
  depuis le ScrollTrigger du voile du seuil. Jamais une minuterie.
- Aucun gain écrit par affectation : tout par `rampe()` — sauf **la toute
  première montée du son**, celle du hero au sortir du sas, qui passe par
  `emerger()` : une parabole (`x²`) en trente-deux segments sur quatre secondes.
  Une droite de gain n'est pas une montée douce (la sensation de volume suit à
  peu près la racine du gain, donc une droite se jette dans l'oreille), et à
  quatre dixièmes de seconde la musique arrivait avant l'image. Les segments
  plutôt que `setValueCurveAtTime` : une courbe programmée verrouille son
  intervalle et fait lever une exception à toute automatisation qui l'y croise,
  or le bouton doit pouvoir couper en pleine montée.
- **La nappe d'un projet rend la main dès que le menu s'ouvre**, et la reprend
  s'il se referme sans navigation. C'est la chambre qui le pilote, sur
  `menuOuvert` : ouvrir le menu depuis une page projet, c'est en sortir.
- `appliquer()` n'est jamais appelé dans une fonction de mise à jour de
  `useState` (React la réexécute) — l'état courant est doublé dans `actifRef`.
- L'eau : la vitesse du pointeur est mesurée et lissée **dans**
  `gl/materiaux/bassin.ts`, où elle sert déjà à l'injection de l'onde, et
  remontée par `onVitesse`. Une seconde mesure côté audio dériverait.

Vérification fonctionnelle possible sans écouter : instrumenter
`window.AudioContext` par `Page.addScriptToEvaluateOnNewDocument` et compter les
contextes, les `createGain` et les rampes. Attendus après le clic d'entrée :
1 contexte, 7 gains (maître + 3 bus + 3 nappes), et un fondu croisé dont les
deux valeurs somment à 1.

Voir [[etalonnage-medias]] et [[seuil-etat]].
