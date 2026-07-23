---
name: mission-chrome
description: État du chrome (nav, burger, menu, curseur, son, progression, chapitre) — décisions et cibles provisoires
metadata:
  type: project
---

Mission « Le chrome » livrée (branche main, non commité). Tout vit dans `src/components/chrome/`, monté dans `layout.tsx` sous `SonProvider > ChromeProvider` via `<Chrome/>`, avec un wrapper `<div id="scene-page">` autour de `{children}`.

Décisions à connaître pour la suite :

- **Le recul de la page derrière le menu est en DOM/CSS, pas en WebGL.** La surface qui recule est le document, pas une scène. Un seul scalaire `--recul` (0→1, animé par GSAP) porte échelle + flou + désaturation sur `.scene-page` (voir `base.css`). Le vrai *shader* de flou progressif (`webgl-progressive-blur`) reste le travail de l'Enfilade, sur des plans texturés — ne pas le rapatrier ici. Voir [[seuil-etat]].
- **Masques du menu portés de `scroll-transition`** : lamelles = `js/script.js` (paire de rects par bande, ouverture depuis la ligne médiane), damier = `js/script2.js` (cellules mélangées). Reveal des entrées = grammaire de `onscroll-typography-animations`. Différence assumée avec la source : viewBox `0 0 100 100` + `preserveAspectRatio="none"` → **insensible au redimensionnement, aucun rebuild** (la démo recalculait en vw). Le damier, lui, est construit une fois selon la largeur initiale ; il s'étire au resize (acceptable pour un survol transitoire).
- **Entrées du menu : `y: 0` épinglé partout** où GSAP les touche. Leur `translateY(110%)` CSS serait sinon lu comme une base en pixels à laquelle `yPercent` s'ajoute — exactement le piège rencontré au seuil. GSAP en prend possession dès la construction.
- **Repère z-index du chrome** documenté dans `barre-nav.css` : canvas 0, `.scene-page` 1, menu 45, logo 50, progression/chapitre 55, barre-nav (burger/son) 60, évitement 100, curseur 9000. Le logo (négatif) et le burger restent **au-dessus** du menu ouvert.
- **Son** : Web Audio natif, `AudioContext` créé au premier clic seulement (jamais avant), suspendu dès qu'on recoupe. Nappe très basse + micro-sons (`ouvrir`/`fermer`/`survol`/`clic`). C'est le **menu** qui joue ouverture/fermeture (couvre aussi Échap et clic d'entrée), pas le burger.
- **Curseur** : lit en phase `mesure`, écrit en phase `rendu` (ticker partagé, aucune boucle propre). Aimantation 80 px = un seul `getBoundingClientRect` par frame, sur la seule cible survolée. Désactivé sur pointeur grossier ; masque le curseur natif via `html.curseur-actif`. Pastille à mot via `data-curseur` sur l'élément.
- **Chapitre courant** : piloté par attribut `data-chapitre="…"` sur les sections + IntersectionObserver (bande d'1 px au milieu), re-balayé au changement de route. La page provisoire porte `data-chapitre="Le Vestibule"`. Les chapitres à venir n'ont qu'à poser l'attribut.
- **Cibles de liens provisoires** : les entrées projets visent `/projets/[slug]` et « Les Archives » vise `/archives` — routes montées par les missions La Chambre et L'Atelier/Archives. Elles renvoient 404 tant qu'elles n'existent pas ; c'est attendu.
