"use client";

import { useRef } from "react";
import * as THREE from "three";
import { useGLProxy } from "@/components/gl/useGLProxy";
import { geometriePlan, type Fabrique } from "@/components/gl/moteur";
import { couleurJeton } from "@/components/gl/couleurs";
import type { NomCouleur } from "@/lib/jetons";
import "./epreuve.css";

/**
 * L'épreuve du rig : trois blocs DOM doublés par trois plans WebGL.
 *
 * Ce qu'on vérifie à l'œil, sans instrument :
 *
 * — l'alignement. Le bloc DOM porte un liseré laiton de 1 px posé en `outline`,
 *   donc à l'extérieur de sa boîte ; le plan WebGL dessine un liseré craie de
 *   1 px à l'intérieur du sien. Les deux traits doivent être jointifs sur les
 *   quatre côtés, au défilement, au redimensionnement et au zoom navigateur.
 *   Un décalage d'un pixel se voit immédiatement.
 *
 * — l'échelle. Le liseré du shader est calculé en pixels CSS. S'il apparaît
 *   plus épais ou plus fin que le liseré CSS, la caméra n'est pas réglée à une
 *   unité monde pour un pixel écran.
 *
 * — la couleur. Le témoin à gauche de chaque bloc est le même jeton posé en
 *   CSS. Les deux aplats doivent être indiscernables.
 *
 * — la suspension. Le panneau de debug affiche le nombre de scènes actives :
 *   il tombe à zéro quand les trois blocs sont sortis du cadre, et l'état passe
 *   à « suspendu » quand l'onglet passe en arrière-plan.
 */

/* Les shaders du site sont inlinés en template strings — c'est la méthode
   retenue, à l'exclusion d'un chargeur `.glsl` dans next.config.ts. */

const SOMMET = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAGMENT = /* glsl */ `
  precision highp float;

  uniform vec3 uCouleur;
  uniform vec3 uTrait;
  uniform vec2 uTaille;

  varying vec2 vUv;

  void main() {
    // Position en pixels CSS à l'intérieur du plan.
    vec2 px = vUv * uTaille;
    vec2 bord = min(px, uTaille - px);

    // Liseré intérieur de 1 px, exactement.
    float lisere = 1.0 - step(1.0, min(bord.x, bord.y));

    // Croix de centrage : deux traits de 1 px sur 24 px de long.
    vec2 centre = abs(px - uTaille * 0.5);
    float horizontale = (1.0 - step(0.5, centre.y)) * (1.0 - step(12.0, centre.x));
    float verticale = (1.0 - step(0.5, centre.x)) * (1.0 - step(12.0, centre.y));

    float trait = clamp(lisere + horizontale + verticale, 0.0, 1.0);
    gl_FragColor = vec4(mix(uCouleur, uTrait, trait), 1.0);
  }
`;

/**
 * Une fabrique de scène : appelée une fois par le rig, à l'inscription, avec
 * le renderer et la caméra du site. Elle n'ouvre aucune boucle, ne lit aucun
 * rect, ne crée aucun contexte.
 */
function fabriquerPlan(nom: NomCouleur, legende: HTMLElement | null): Fabrique {
  return () => {
    const materiau = new THREE.ShaderMaterial({
      uniforms: {
        uCouleur: { value: couleurJeton(nom) },
        uTrait: { value: couleurJeton("craie") },
        uTaille: { value: new THREE.Vector2(1, 1) },
      },
      vertexShader: SOMMET,
      fragmentShader: FRAGMENT,
    });

    const maille = new THREE.Mesh(geometriePlan(), materiau);
    let derniereLegende = "";

    return {
      objet: maille,
      cadre: ({ rect }) => {
        materiau.uniforms.uTaille!.value.set(rect.width, rect.height);

        /* La légende est écrite depuis la scène, pas lue depuis le composant :
           le rect vient de la passe de mesure du rig. C'est une écriture, elle
           a donc sa place ici, dans la phase de rendu. */
        const texte = `x ${Math.round(rect.left)} · y ${Math.round(rect.top)} · ${Math.round(rect.width)} × ${Math.round(rect.height)}`;
        if (texte !== derniereLegende && legende !== null) {
          derniereLegende = texte;
          legende.textContent = texte;
        }
      },
      liberer: () => {
        /* La géométrie unitaire est partagée par tout le site : on ne la
           libère pas ici. Le matériau, lui, appartient à cette scène. */
        materiau.dispose();
      },
    };
  };
}

function Bloc({ nom, titre }: { nom: NomCouleur; titre: string }) {
  const ancre = useRef<HTMLDivElement>(null);
  const legende = useRef<HTMLParagraphElement>(null);

  /* La fabrique est appelée par le rig au moment de l'inscription, donc après
     le montage : `legende.current` est posé. */
  const inscrit = useGLProxy(ancre, (contexte) =>
    fabriquerPlan(nom, legende.current)(contexte),
  );

  return (
    <article className="epreuve-bloc">
      <p className="technique epreuve-titre">{titre}</p>
      <div className="epreuve-paire">
        <div
          className="epreuve-temoin"
          style={{ backgroundColor: `var(--color-${nom})` }}
        />
        <div ref={ancre} className="epreuve-cadre" />
      </div>
      <p ref={legende} className="technique epreuve-legende">
        —
      </p>
      <p className="technique epreuve-etat">
        {inscrit ? "Inscrit au rig" : "Sans moteur — version DOM"}
      </p>
    </article>
  );
}

export default function Plans() {
  return (
    <>
      <Bloc nom="ambre" titre="Plan — ambre — Appartement Laiton" />
      <Bloc nom="prairie" titre="Plan — prairie — Domaine des Charmilles" />
      <Bloc nom="jade" titre="Plan — jade — Villa Calcaire" />
    </>
  );
}
