/**
 * Le titre en verre — le chapitre de la Sortie.
 *
 * Porté de `references/zip/glass-hero/src/script.js`. Ce qui en vient, tel quel :
 *
 * — **Le matériau.** `MeshPhysicalMaterial` en transmission pleine : `roughness`
 *   nul, `transmission: 1`, `ior: 1.45`, `dispersion: 4`, `thickness: 0.7`. Ce
 *   sont ces valeurs, réglées à la main, qui donnent le verre optique — la
 *   dispersion chromatique aux arêtes, la réfraction du titre à travers le nœud.
 * — **L'environnement.** `RoomEnvironment` cuit en carte par `PMREMGenerator` :
 *   c'est lui qui donne au verre ses reflets « de pièce » plutôt qu'un miroir
 *   nu. La carte est posée sur le matériau, pas sur la scène partagée du rig —
 *   on ne veut pas éclairer les autres chapitres avec.
 * — **Le titre peint.** Un `<canvas>` 2D dessine le nom, converti en
 *   `CanvasTexture` sur un plan derrière le nœud : c'est ce plan que la
 *   transmission réfracte. On attend `document.fonts.ready` avant de peindre,
 *   sinon la mesure du texte tombe sur la police de repli.
 * — **Le nœud torique** `TorusKnotGeometry(1, 0.3, 300, 48, 2, 3)`, tournant sur
 *   le temps et le pointeur.
 *
 * Ce qui a changé : la boucle, la caméra et le renderer viennent du rig (pas de
 * second contexte, pas de `setAnimationLoop`). La caméra du rig est lointaine —
 * une unité monde vaut un pixel écran —, quasi orthographique : la réfraction et
 * la dispersion tiennent, le relief de perspective est simplement plus doux
 * qu'avec la caméra rapprochée de la démo. Le titre en verre étant peint dans un
 * canvas, il est invisible aux lecteurs d'écran : le chapitre porte le `<h2>`
 * réel en `sr-only`, et sur pointeur grossier le composant ne monte pas cette
 * scène du tout — il affiche le titre DOM.
 *
 * Le fond du titre et son encre sont des jetons du site ; les couleurs du verre
 * viennent, elles, de l'environnement.
 */
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import type { Fabrique } from "../moteur";
import { lireCouleur } from "@/lib/jetons";
import { rattraper } from "@/lib/math";

export type EtatVerre = {
  /** Pointeur en coordonnées client, ou `null`. Incline lentement le nœud. */
  pointeur: { x: number; y: number } | null;
};

export type ReglagesVerre = {
  /** Le mot à peindre, tel qu'il flotte une dernière fois. */
  titre: string;
  /** La famille Gambetta, telle que next/font la nomme. */
  police: string;
  etat: { current: EtatVerre };
};

/** Part de la plus petite dimension occupée par le nœud. */
const PART_NOEUD = 0.26;

export function fabriquerVerre(reglages: ReglagesVerre): Fabrique {
  return ({ renderer }) => {
    const groupe = new THREE.Group();

    // ---- L'environnement de pièce, cuit une fois --------------------------
    const pmrem = new THREE.PMREMGenerator(renderer);
    const environnement = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    /* Le générateur a fait son travail : sa cible interne peut partir. La
       texture cuite, elle, vit tant que le matériau la référence. */
    pmrem.dispose();

    // ---- Le titre peint, derrière le nœud ---------------------------------
    const toile = document.createElement("canvas");
    const ctx = toile.getContext("2d");
    let texteTexture: THREE.CanvasTexture | null = null;

    const materiauTitre = new THREE.MeshBasicMaterial({ toneMapped: false });
    const planTitre = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      materiauTitre,
    );
    groupe.add(planTitre);

    const fond = lireCouleur("encre");
    const encre = lireCouleur("craie");

    /** Peint le nom, calé à gauche, jamais centré — la règle du site tient
        jusque dans le canvas. Ajusté à la largeur, laissé haut dans le cadre. */
    const peindre = (largeur: number, hauteur: number) => {
      if (ctx === null) return;
      const dpr = Math.min(devicePixelRatio, 2);
      toile.width = Math.max(2, Math.round(largeur * dpr));
      toile.height = Math.max(2, Math.round(hauteur * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      ctx.fillStyle = fond;
      ctx.fillRect(0, 0, largeur, hauteur);

      ctx.fillStyle = encre;
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";

      /* On ajuste la taille pour que le mot tienne dans la largeur utile, marge
         gauche comprise. */
      const marge = largeur * 0.08;
      const utile = largeur - marge * 2;
      const base = 200;
      ctx.font = `400 ${base}px ${reglages.police}`;
      const mesure = ctx.measureText(reglages.titre).width || 1;
      const taille = base * (utile / mesure);
      ctx.font = `400 ${taille}px ${reglages.police}`;

      /* Calé haut-gauche : le nom flotte dans le tiers supérieur, pas au
         centre. */
      ctx.fillText(reglages.titre, marge, hauteur * 0.42);

      texteTexture?.dispose();
      texteTexture = new THREE.CanvasTexture(toile);
      texteTexture.colorSpace = THREE.SRGBColorSpace;
      texteTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();
      materiauTitre.map = texteTexture;
      materiauTitre.needsUpdate = true;
    };

    /* La première peinture attend la police : sans elle, le repli métrique
       donnerait une taille fausse, corrigée par un saut visible ensuite. */
    let policePrete = false;
    let dernierRect = { largeur: 0, hauteur: 0 };
    void document.fonts.ready.then(() => {
      policePrete = true;
      if (dernierRect.largeur > 0) {
        peindre(dernierRect.largeur, dernierRect.hauteur);
      }
    });

    // ---- Le nœud en verre -------------------------------------------------
    const geometrieNoeud = new THREE.TorusKnotGeometry(1, 0.3, 300, 48, 2, 3);
    const materiauNoeud = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      metalness: 0,
      roughness: 0,
      transmission: 1,
      thickness: 0.7,
      ior: 1.45,
      dispersion: 4,
      envMap: environnement,
      envMapIntensity: 1,
      toneMapped: false,
    });
    const noeud = new THREE.Mesh(geometrieNoeud, materiauNoeud);
    groupe.add(noeud);

    let inclinaisonX = 0;
    let inclinaisonY = 0;

    return {
      objet: groupe,
      /* Le groupe tient ses propres tailles : le rig le place sur l'ancre, il
         ne l'étire pas. */
      ajusterEchelle: false,

      cadre: ({ rect, temps, delta, mouvementReduit }) => {
        /* Le plan du titre couvre la section ; on ne le repeint que si la
           taille change, et seulement une fois la police prête. */
        if (
          rect.width !== dernierRect.largeur ||
          rect.height !== dernierRect.hauteur
        ) {
          dernierRect = { largeur: rect.width, hauteur: rect.height };
          if (policePrete) peindre(rect.width, rect.height);
        }
        planTitre.scale.set(rect.width, rect.height, 1);
        planTitre.position.z = 0;

        /* Le nœud, devant le titre, dimensionné sur la plus petite dimension. */
        const cote = Math.min(rect.width, rect.height) * PART_NOEUD;
        noeud.scale.setScalar(cote);
        noeud.position.z = cote * 1.1;
        /* Décalé à droite du centre : le titre est à gauche, le verre flotte
           au-dessus de sa fin. Rien n'est centré. */
        noeud.position.x = rect.width * 0.16;
        noeud.position.y = -rect.height * 0.04;

        const etat = reglages.etat.current;
        if (mouvementReduit) {
          /* Une pose fixe, nette, détaillée : le verre est là, il ne tourne
             pas. */
          noeud.rotation.set(0.6, 0.4, 0);
          return;
        }

        /* Le pointeur incline lentement le nœud, en plus de sa rotation propre.
           Converti en repère [-1, 1] à partir du rect de la passe de mesure. */
        let viseX = 0;
        let viseY = 0;
        if (etat.pointeur !== null && rect.width > 0 && rect.height > 0) {
          viseX = ((etat.pointeur.x - rect.left) / rect.width) * 2 - 1;
          viseY = ((etat.pointeur.y - rect.top) / rect.height) * 2 - 1;
        }
        inclinaisonX = rattraper(inclinaisonX, viseX, 0.08, delta);
        inclinaisonY = rattraper(inclinaisonY, viseY, 0.08, delta);

        noeud.rotation.x = temps * 0.35 + inclinaisonY * 0.15;
        noeud.rotation.y = temps * 0.5 + inclinaisonX * 0.2;
      },

      liberer: () => {
        planTitre.geometry.dispose();
        materiauTitre.dispose();
        texteTexture?.dispose();
        geometrieNoeud.dispose();
        materiauNoeud.dispose();
        environnement.dispose();
      },
    };
  };
}
