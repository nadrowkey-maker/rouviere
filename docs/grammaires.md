# Passe de règle du parcours — grammaires de mouvement

> La règle du parcours (CLAUDE.md, *Mouvement*) : **deux chapitres consécutifs
> ne peuvent pas partager la même grammaire de mouvement.** Si A monte en
> vertical, B se déplace en horizontal, en profondeur, en échelle ou en matière.

Relevé du seuil à la sortie, dans l'ordre réel du parcours de `app/page.tsx`,
plus les deux routes atteintes par lien.

## Le parcours principal (`/`)

| # | Chapitre | Grammaire | Entrée du mouvement |
|---|----------|-----------|---------------------|
| 1 | **Le Seuil** | échelle + découpe | le logo rétrécit par Flip, la vidéo se rétracte par `clip-path inset` |
| 2 | **Le Vestibule** | agrégation en profondeur | les lettres convergent depuis l'axe Z, en rotation, et se posent |
| 3 | **L'Enfilade** | traversée horizontale | le défilement vertical est capté et converti en déplacement latéral (pin + scrub) |
| 4 | **La Matière** | soulèvement au pointeur | la plaque se soulève en Z sous le curseur ; **rien ne bouge au défilement** |
| 5 | **L'Atelier** | pivotement en profondeur, couplé au défilement | les images basculent en 3D et reculent en Z à mesure qu'on scrolle, et **s'arrêtent quand on s'arrête** (pause au centre) |
| 6 | **La Sortie** | réfraction — la matière verre | un corps de verre unique déforme optiquement un **titre immobile** ; il tourne seul, lentement, hors de tout défilement |

### Vérification des paires consécutives

- 1 → 2 : échelle/découpe ≠ agrégation Z. ✓
- 2 → 3 : agrégation Z ≠ traversée horizontale. ✓
- 3 → 4 : traversée horizontale ≠ soulèvement au pointeur. ✓
- 4 → 5 : soulèvement au pointeur ≠ pivotement au défilement. ✓
- 5 → 6 : **la paire la plus proche, et elle tient.** Les deux mettent de la
  rotation à l'écran, mais leur grammaire diffère sur les trois axes qui
  comptent :
  - **l'entrée** : l'Atelier est *couplé au défilement* — c'est le scroll qui
    fait tourner, et le mouvement se fige quand on s'arrête. La Sortie est
    *autonome* — le verre tourne sur le temps, le défilement n'y fait rien.
  - **le sujet** : l'Atelier fait tourner *beaucoup d'images opaques* qui
    reculent ; la Sortie a *un seul solide transparent* devant un titre qui, lui,
    ne bouge pas.
  - **le phénomène** : l'Atelier est une culbute dans la profondeur ; la Sortie
    est une *réfraction* — dispersion chromatique, transmission. C'est l'axe
    « en matière » que la règle cite explicitement comme échappatoire valide.

  Un séparateur renforce la distinction : entre la dernière image de l'Atelier et
  la Sortie, une plage d'encre calme, et le titre de la Sortie est posé, fixe.
  L'œil ne lit pas « encore une galerie qui tourne » mais « un nom vu à travers
  du verre ».

**Aucun doublon consécutif.**

## Les routes atteintes par lien

- **La Chambre** (`/projets/[slug]`) — un seul chapitre en trois temps continus
  (l'approche en séquence de frames, la profondeur en Z, la fiche calme). Elle
  est atteinte depuis l'Enfilade et n'a pas de voisin linéaire dans le parcours ;
  ses trois temps sont voulus « sans coupure visible entre eux », ce ne sont donc
  pas des chapitres consécutifs au sens de la règle.
- **Les Archives** (`/archives`) — grammaire : la liste immobile (décalage de
  8 px au survol). Atteinte par le menu, sans adjacence de parcours.

## Les coutures entre ces chapitres et ces routes

Le motif de transition change avec la nature du passage (voir
`components/motion/Transition.tsx`), ce qui souligne le changement de grammaire
plutôt que de le gommer :

- vers un projet : **damier**, dans le monde chromatique du projet ;
- vers les archives : **stores verticaux**, sur le plomb ;
- retour au parcours : **stores horizontaux**, sur l'encre.
