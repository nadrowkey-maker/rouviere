"use client";

import { useRef } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import { gsap } from "@/lib/gsap";
import {
  matieres,
  bassin,
  LARGEUR_MATIERE,
  HAUTEUR_MATIERE,
} from "@/data/matieres";
import { useRig } from "@/components/gl/Rig";
import type { EtatBassin } from "@/components/gl/materiaux/bassin";
import { useMouvement } from "@/components/motion/MotionProvider";
import { useEffetVisuel } from "@/lib/isomorphe";
import "./matiere.css";

/**
 * La Matière. Un chapitre entier sans image de projet. On touche.
 *
 * Deux temps, et le premier est contemplatif.
 *
 *   *La traversée.* Trois matières, une par écran, plein cadre : le noyer fumé
 *   de l'Appartement Laiton, la chaux blanche des Charmilles, le voile de lin
 *   de la Villa Calcaire. Chacune est un plan macro qui dérive lentement sur la
 *   surface. On passe de l'une à l'autre **par masque** : le plan suivant
 *   s'ouvre par le haut, à bord franc, et recouvre le précédent. À aucun
 *   instant un pixel de l'écran ne montre deux matières mêlées — c'est ce qui
 *   distingue un masque d'un fondu, et c'est la raison pour laquelle il n'y a
 *   pas une seule opacité intermédiaire dans ce chapitre.
 *
 *   Rien d'autre ne bouge. Le nom et la couche technique sont peints *dans* le
 *   plan : ils sont découverts par le même masque que la matière, du même
 *   geste. Aucun reveal typographique, aucun décalage, aucune entrée d'objet.
 *   Le mouvement du chapitre, c'est la matière elle-même.
 *
 *   *Le bassin.* Une seule fois dans tout le site : le bassin de la Villa
 *   Calcaire, vraie simulation de surface d'eau. Plein écran, sans texte, sans
 *   interface, sinon une ligne en couche technique. Voir `materiaux/bassin.ts`.
 *
 * Grammaire de mouvement : **le dévoilement par masque**, sur une image qui ne
 * se déplace pas. L'enfilade qui précède traverse latéralement, l'atelier qui
 * suit traverse en échelle et en profondeur ; ici rien ne se déplace, une
 * surface s'ouvre sur une autre. Aucun des trois ne partage sa grammaire.
 *
 * Une seule vidéo joue à la fois — celle qu'on regarde. Les autres sont
 * arrêtées, et les trois le sont dès que le chapitre quitte l'écran ou que
 * l'onglet passe en arrière-plan : trois plans macro décodés en parallèle
 * coûtent plus cher que toute la scène WebGL du bassin.
 */

const SceneBassin = dynamic(() => import("@/components/gl/SceneBassin"), {
  ssr: false,
});

/**
 * Part de la course prise par un passage de masque. Le reste est réparti en
 * paliers égaux, un par matière : on est venu regarder la matière, pas la
 * transition. `PASSAGE` est délibérément court — un masque qui traîne devient
 * un effet, et le chapitre n'en veut aucun.
 */
const PASSAGE = 0.14;

/** Le masque fermé et le masque ouvert. Bord franc, jamais de flou. */
const FERME = "inset(0% 0% 100% 0%)";
const OUVERT = "inset(0% 0% 0% 0%)";

/**
 * Le minutage de la traversée, en fractions de la progression.
 *
 * `n` matières, `n − 1` passages, et des paliers **égaux** : sans ce calcul, la
 * première matière garderait l'écran deux fois plus longtemps que la dernière,
 * et le chapitre aurait un rythme sans raison d'être.
 *
 * Retourne, pour chaque passage, l'instant où son masque commence à s'ouvrir.
 */
function minutage(nombre: number): number[] {
  const palier = (1 - (nombre - 1) * PASSAGE) / nombre;
  return Array.from(
    { length: nombre - 1 },
    (_, i) => (i + 1) * palier + i * PASSAGE,
  );
}

export function Matiere() {
  const enWebgl = useRig() !== null;
  const { mouvementReduit, degrade } = useMouvement();

  const traverseeRef = useRef<HTMLDivElement>(null);
  const cadreRef = useRef<HTMLDivElement>(null);
  const videosRef = useRef<Array<HTMLVideoElement | null>>([]);
  const ancreBassin = useRef<HTMLDivElement>(null);

  /* L'état du bassin vit dans une ref : le pointeur bouge soixante fois par
     seconde, le passer par `useState` reconstruirait l'arbre à chaque geste.
     Le shader le lit au cadre. */
  const etatBassin = useRef<EtatBassin>({ pointeur: null, clics: 0 });

  useEffetVisuel(() => {
    const traversee = traverseeRef.current;
    const cadre = cadreRef.current;
    if (traversee === null || cadre === null) return;

    /* En mouvement réduit, les trois matières sont simplement empilées, chacune
       sur son écran, découvertes par le défilement natif : pas d'épinglage, pas
       de masque, pas de vidéo. Trois plans fixes et leurs noms. La composition
       tient sans le mouvement — c'est une version, pas une punition. */
    if (mouvementReduit) return;

    const contexte = gsap.context(() => {
      const plans = gsap.utils.toArray<HTMLElement>(".matiere__plan", cadre);
      /* Le premier plan est le fond : il n'a pas de masque, il est là. Les
         suivants arrivent fermés. */
      gsap.set(plans.slice(1), { clipPath: FERME });

      const departs = minutage(matieres.length);

      /**
       * Quelle matière occupe l'écran. Le passage de relais est pris à
       * mi-masque : c'est l'instant où la nouvelle matière couvre la moitié du
       * cadre, donc celui où c'est elle qu'on regarde.
       */
      const indexActif = (progression: number) => {
        let index = 0;
        departs.forEach((depart, i) => {
          if (progression >= depart + PASSAGE * 0.5) index = i + 1;
        });
        return index;
      };

      let joue = -1;
      const nAJouer = (index: number) => {
        if (index === joue) return;
        joue = index;
        videosRef.current.forEach((video, i) => {
          if (video === null) return;
          if (i === index) {
            /* La lecture peut être refusée (onglet en fond, économie
               d'énergie) : on ne traite pas le refus comme une erreur. */
            void video.play().catch(() => {});
          } else {
            video.pause();
          }
        });

        /* La matière suivante est mise en chauffe pendant qu'on regarde
           celle-ci. Sans cela, elle commencerait son téléchargement au moment
           exact où le masque l'ouvre, et on la verrait arriver arrêtée sur sa
           poster. On ne chauffe qu'elle : deux d'avance ne servent à rien. */
        const suivante = videosRef.current[index + 1];
        if (suivante !== null && suivante !== undefined && suivante.preload === "none") {
          suivante.preload = "auto";
          suivante.load();
        }
      };

      /* Le cadre tient par `position: sticky`, pas par `pin` : la mise en page
         du chapitre est un empilement, elle n'a pas besoin qu'on lui insère de
         l'espace ni qu'on la sorte du flux. ScrollTrigger ne fait donc ici
         qu'une chose — donner l'avancement du masque. */
      const ligne = gsap.timeline({
        defaults: { ease: "power2.inOut" },
        scrollTrigger: {
          trigger: traversee,
          start: "top top",
          end: "bottom bottom",
          scrub: true,
          invalidateOnRefresh: true,
          onUpdate: (self) => nAJouer(indexActif(self.progress)),
          onToggle: (self) => {
            /* Hors du chapitre, plus rien ne décode. C'est le point qui tue
               les sites mal finis : la vidéo qui tourne pendant qu'on lit
               ailleurs. */
            if (self.isActive) return;
            joue = -1;
            videosRef.current.forEach((video) => video?.pause());
          },
        },
      });

      /* Un palier, un passage, un palier… Le masque s'ouvre par le haut : le
         plan qui arrive descend sur celui qui part, dans le sens du
         défilement. */
      plans.slice(1).forEach((plan, i) => {
        ligne.to(plan, { clipPath: OUVERT, duration: PASSAGE }, departs[i]);
      });

      /* La ligne dure exactement 1 : sans cette borne, GSAP la clôturerait sur
         le dernier masque et la troisième matière n'aurait pas son palier. */
      ligne.set(cadre, {}, 1);
    }, cadre);

    return () => contexte.revert();
  }, [mouvementReduit]);

  /* L'onglet passe en arrière-plan : on arrête tout. `visibilitychange` est le
     seul événement qui couvre le cas où la page n'est plus regardée sans avoir
     quitté l'écran. */
  useEffetVisuel(() => {
    const suspendre = () => {
      if (document.visibilityState === "visible") return;
      videosRef.current.forEach((video) => video?.pause());
    };
    document.addEventListener("visibilitychange", suspendre);
    return () => document.removeEventListener("visibilitychange", suspendre);
  }, []);

  return (
    <section className="matiere" aria-labelledby="matiere-titre">
      <h2 className="sr-only" id="matiere-titre">
        La matière
      </h2>

      {/* ---- La traversée des trois matières ---- */}
      <div
        className="matiere__traversee"
        data-chapitre="La Matière"
        data-reduit={mouvementReduit}
        ref={traverseeRef}
        /* Un écran de course par matière : la hauteur vient du manifeste, pas
           d'un chiffre écrit dans la feuille de style. Ajouter une matière au
           manifeste allonge la traversée d'elle-même. */
        style={{ "--matieres": matieres.length } as React.CSSProperties}
      >
        <div className="matiere__cadre" ref={cadreRef}>
          {matieres.map((matiere, index) => (
            <figure className="matiere__plan" key={matiere.cle}>
              {mouvementReduit ? (
                <Image
                  className="matiere__media"
                  src={matiere.video.poster}
                  width={LARGEUR_MATIERE}
                  height={HAUTEUR_MATIERE}
                  alt={matiere.alt}
                  sizes="100vw"
                  priority={index === 0}
                />
              ) : (
                <video
                  className="matiere__media"
                  ref={(node) => {
                    videosRef.current[index] = node;
                  }}
                  src={matiere.video.mp4}
                  poster={matiere.video.poster}
                  width={LARGEUR_MATIERE}
                  height={HAUTEUR_MATIERE}
                  /* La première matière est celle du LCP du chapitre : elle
                     se prépare. Les deux autres attendent qu'on arrive. */
                  preload={index === 0 ? "metadata" : "none"}
                  muted
                  loop
                  playsInline
                  aria-label={matiere.alt}
                />
              )}

              {/* Le nom est peint dans le plan : le masque le découvre en même
                  temps que la matière, du même geste. */}
              <figcaption className="matiere__legende">
                <h3 className="matiere__nom display">{matiere.nom}</h3>
                <p className="matiere__provenance technique">
                  {matiere.provenance}
                </p>
                <p className="matiere__facture technique">{matiere.facture}</p>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>

      {/* ---- Le bassin ---- */}
      <div
        className="matiere__bassin"
        data-chapitre="Le Bassin"
        aria-label="Bassin de la Villa Calcaire"
        ref={ancreBassin}
        data-webgl={enWebgl}
        onPointerMove={(e) => {
          etatBassin.current.pointeur = { x: e.clientX, y: e.clientY };
        }}
        onPointerLeave={() => {
          etatBassin.current.pointeur = null;
        }}
        onPointerDown={() => {
          etatBassin.current.clics += 1;
        }}
      >
        {/* Le repli : plaque du bassin, calculée avec les équations du shader.
            Elle reste visible tant que le moteur n'a pas pris la main, et
            définitivement sans WebGL2. */}
        <Image
          className="matiere__repli"
          src={bassin.repli}
          width={bassin.largeurRepli}
          height={bassin.hauteurRepli}
          alt="Le bassin de la Villa Calcaire, à Cap d'Antibes, le long de la façade. La surface porte quelques ondes."
          sizes="100vw"
          data-cache={enWebgl && !degrade}
        />

        <p className="matiere__technique technique">{bassin.technique}</p>

        <SceneBassin ancre={ancreBassin} etat={etatBassin} repli={bassin.repli} />
      </div>
    </section>
  );
}
