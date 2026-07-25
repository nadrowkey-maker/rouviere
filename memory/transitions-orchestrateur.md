---
name: transitions-orchestrateur
description: L'orchestrateur unique des coutures (masques) et l'aperçu vidéo du menu — contraintes à respecter
metadata:
  type: project
---

`src/components/motion/orchestrateur.ts` est le **créneau unique** par lequel passe toute transition à masque (couture de route, ouverture/fermeture du menu, et à terme les passages de chapitre). Une seule est vivante à la fois : `reclamer({nature, anim, finaliser})` tue et **finalise** la précédente (snap à l'état terminal propre) avant d'installer la nouvelle ; `liberer(anim)` rouvre le créneau à la fin naturelle. C'est ce qui a corrigé la bouillie damier (route) + lamelles (store du menu) qui se jouaient ensemble.

**Why:** rien n'empêchait deux masques plein cadre de s'animer simultanément — cliquer un projet depuis le menu ouvert lançait la fermeture du store *pendant* le damier de route.

**How to apply:** toute nouvelle transition à masque DOIT passer par `reclamer`/`liberer` — ne jamais lancer un masque plein cadre en dehors. Chaque nature porte son motif (menu=lamelles, projet=damier, parcours=stores horizontaux, archives=stores verticaux).

Garde-fous en place :
- **Fermeture du menu par navigation = instantanée** (clic sur un lien → `fermerMenu(false)` → `focusARestaurer` faux → `anime=false`). La couture de route est alors seule à s'animer. La fermeture animée (lamelles) n'arrive que sur burger/Échap, quand il n'y a pas de changement de route.
- L'aperçu du menu ne se dévoile **jamais** pendant que le store s'anime (`ouvertureFinieRef` + `natureVivante()==='menu'`) ; le survol resté en attente est rappelé à la fin de l'ouverture.

**Aperçu vidéo du menu** (remplace l'ancien envahissement de couleur brutal, voir [[mission-chrome]]) : au survol d'une entrée projet, la **vidéo** du projet (`visuels[slug].video.mp4`, muette, bouclée) apparaît en fond via `.menu__apercu`, dévoilée par le damier (cellules d'encre `currentColor` qui s'effacent), avec le monde chromatique en surimpression (`.menu__teinte`, multiply). Un **seul** `<video>` réemployé (src remplacé = un média à la fois) ; chargement au premier survol après **anti-rebond 80 ms** ; pause à la sortie (scellée par `onReverseComplete` du damier). Repli sur `planches[0]` (photo) si `prefers-reduced-motion` ou `Save-Data` (`donneesEconomes()` dans `capacites.ts`). `.menu__apercu[data-mode="vide"]` est `visibility:hidden` — sinon les cellules d'encre couvriraient tout le site.
