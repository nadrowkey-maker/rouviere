---
name: seuil-etat
description: État du chapitre Le Seuil — architecture de l'entrée et actifs
metadata:
  type: project
---

Le Seuil a été refondu (spec du 2026-07-24 dans `docs/brief.md`, section « Le Seuil »). Points à connaître :

- **Trois temps** : un écran d'entrée (`components/chapitres/EcranEntree.tsx`, plein cadre noir, logo en petit + deux boutons « avec le son » / « en silence »), une apparition, une sortie. Le hero n'est plus un overlay qui disparaît : c'est la première section du parcours (`components/chapitres/Seuil.tsx`, `<section className="hero">`), qui reste dans le DOM et est épinglée par ScrollTrigger.
- **L'écran d'entrée = sas audio + préchargeur.** Le clic d'un bouton est le geste qui ouvre Web Audio (`basculerSon` de `SonProvider`). Les boutons ne s'activent (`pret`) qu'une fois la vidéo du hero et sa poster chargées ; filet de sécurité de 6 s. Choix mémorisé en `sessionStorage` (`rouviere:entree-son`), gate d'intro en `rouviere:seuil-vu` (posé par le script inline de `layout.tsx`, classe `seuil-a-jouer` sur `<html>`).
- **L'apparition** : 2,5 s de vidéo seule, puis le mot ROUVIÈRE en bloc (jamais lettre par lettre) — opacité/échelle 1,06→1/flou 10→0 px sur 1,8 s (`expo.out` = `--e-sortie`), tenu 1,5 s, sur `.logo__mot`. Puis le vol du logo vers la nav.
- **Le vol du logo** reste une transformation pure (échelle + translation sur `.logo`, effacée à l'arrivée), PAS GSAP Flip : l'échange de layout de Flip refluait le sous-arbre et donnait un CLS ≈ 0,29. Garder ce motif. Après pose, le son et le burger (`.barre-nav__droite`) sont révélés décalés de 120 ms (cachés avant par `.seuil-a-jouer` en CSS : opacité 0 + `visibility: hidden`).
- **La sortie du hero** est réversible : voile noir `.hero__voile` en scrub épinglé (0→1) + vidéo scale 1→1,06. Remonter lève le voile. Un clic sur le logotype de la nav fait `lenis.scrollTo(0)` (dans `Logo.tsx`, si `pathname === "/"`) sans rejouer l'apparition.
- **Actifs vidéo** : `public/media/hero/hero.mp4` (fourni, ~44 Mo — À RÉENCODER selon le Livre V, trop lourd pour le budget perf) et `public/media/hero/hero-poster.avif` (extrait à ffmpeg, ~60 ko). Les anciens `public/video/seuil.*` ne sont plus référencés — orphelins, supprimables.
- **Le manifeste du vestibule** n'utilise plus `gsap-wind-blown-text` (effet retiré du projet avec `souffle.ts/.css`, `TexteSouffle.tsx`) : reveal ligne par ligne via SplitText (`mask: "lines"`), voir `Vestibule.tsx`. Le PRNG à graine `lib/aleatoire.ts` reste (utilisé par l'atelier et le bassin).
