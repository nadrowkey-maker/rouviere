---
name: seuil-etat
description: État du chapitre Le Seuil — décisions et actifs provisoires à reprendre
metadata:
  type: project
---

Mission « Le Seuil » livrée (branche main, non commité). Points à connaître pour les missions suivantes :

- **Le logotype** est un nœud persistant unique monté dans `layout.tsx` via `LogoProvider`/`Logo` (dossier `components/chrome/`). Sa ref est partagée par contexte (`useLogo`). Le chapitre « Le chrome » construira la barre de nav **autour** de ce logo déjà posé en haut à gauche ; ne pas le recréer.
- **Le vol du logo n'utilise PAS GSAP Flip** mais une transformation pure (échelle + translation, calculée dans `Seuil.tsx`). Raison mesurée : l'échange de layout de Flip reflue le sous-arbre des lettres et produit un CLS ≈ 0,29 ; la version transform tient le CLS à ~0. Garder ce motif si un autre chapitre déplace le même nœud.
- **La vidéo du seuil est un PLACEHOLDER** généré à ffmpeg (dégradé sombre animé) dans `public/video/` (`seuil.mp4` 122 ko, `seuil.webm`, `seuil-poster.avif`). À remplacer par une vraie captation d'intérieur vide selon le Livre V (Les Actifs) — le pipeline d'encodage y est décrit.
- Actuellement le logo au repos chevauche la ligne technique du vestibule provisoire ; c'est la barre de nav (mission chrome) qui cadrera et poussera le contenu. Voir [[mission-chrome]].
