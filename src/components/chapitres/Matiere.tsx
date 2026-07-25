"use client";

import { useRef } from "react";
import Image from "next/image";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { matieres, LARGEUR_MATIERE, HAUTEUR_MATIERE } from "@/data/matieres";
import { PLANCHE_SORTIE } from "@/data/visuels";
import { useMouvement } from "@/components/motion/MotionProvider";
import { useLangue } from "@/i18n/LangueProvider";
import { useEffetVisuel } from "@/lib/isomorphe";
import "./matiere.css";

/**
 * La Matière. Un chapitre entier sans image de projet. On touche.
 *
 * **Trois matières en plein écran, et rien d'autre.** Le noyer fumé de
 * l'Appartement Laiton, la trame des Charmilles, le relief de la Villa
 * Calcaire. On passe de l'une à l'autre **par masque** : le plan suivant
 * s'ouvre par le haut, à bord franc, et recouvre le précédent. À aucun instant un
 * pixel de l'écran ne montre deux matières mêlées — c'est ce qui distingue un
 * masque d'un fondu, et c'est la raison pour laquelle il n'y a pas une seule
 * opacité intermédiaire entre les plans de ce chapitre.
 *
 * **Le premier plan n'est pas à nous.** C'est la photographie que l'enfilade
 * vient d'ouvrir en plein cadre, et elle reste exactement où elle est : le
 * chapitre commence donc sans qu'aucune image ne change. Il y avait ici un plan
 * macro de bois qui venait la recouvrir — on ouvrait un cadre sur une image, puis
 * on la remplaçait aussitôt par une autre du même bois, ce qui annulait le geste
 * par lequel on venait d'arriver. Le nom *Noyer fumé* et sa couche technique se
 * posent maintenant **sur elle**, et c'est la seule chose qui arrive.
 *
 * Le raccord est exact au pixel : les deux chapitres montrent le même fichier
 * (`PLANCHE_SORTIE`), en `cover` sur le même cadre plein, et le relais se fait à
 * l'instant précis où l'épinglage de l'enfilade rend la main — voir plus bas la
 * mécanique du recouvrement et de la pose.
 *
 * Rien d'autre ne bouge. Le nom et la couche technique des deux autres matières
 * sont peints *dans* le plan : ils sont découverts par le même masque que la
 * matière, du même geste. Aucun reveal typographique, aucun décalage, aucune
 * entrée d'objet. Le mouvement du chapitre, c'est la matière elle-même.
 *
 * **Le bassin n'est plus ici.** Il a rejoint le vestibule, où il est le sixième
 * temps du manifeste — l'eau derrière le mot *silence*. Il n'existe donc
 * qu'**une seule scène d'eau dans tout le site** : deux simulations à soixante
 * pas par seconde seraient à la fois une faute de composition (on ne joue pas
 * deux fois le morceau de bravoure) et un coût GPU sans contrepartie. Ce
 * chapitre-ci garde ses trois matières, et s'arrête là.
 *
 * Grammaire de mouvement : **le dévoilement par masque**, sur une image qui ne
 * se déplace pas. L'enfilade qui précède traverse latéralement, l'atelier qui
 * suit traverse en échelle et en profondeur ; ici rien ne se déplace, une
 * surface s'ouvre sur une autre. Aucun des trois ne partage sa grammaire.
 *
 * Une seule vidéo joue à la fois — celle qu'on regarde. Les autres sont
 * arrêtées, et les trois le sont dès que le chapitre quitte l'écran ou que
 * l'onglet passe en arrière-plan : trois plans macro décodés en parallèle
 * coûtent cher.
 */

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
 * L'apparition du premier nom.
 *
 * Les deux autres matières n'en ont pas besoin : elles arrivent derrière un
 * masque, et leur nom est peint dans le plan — il est découvert du même geste
 * qu'elles. **Le premier nom, lui, n'a aucun masque pour le porter** : il se
 * pose sur la photographie que l'enfilade vient de laisser ouverte, et rien
 * d'autre ne se produit à cet instant. Il paraissait donc d'un coup, avec le
 * cadre. C'était brutal, et il fallait le composer.
 *
 * La composition est un reveal ligne par ligne : chaque mot monte de 110 %
 * derrière une arête, son flou se résorbe, sur neuf dixièmes de seconde en
 * `--e-sortie`. Trois précisions comptent :
 *
 * — **Le décalage est écrit, pas calculé.** Un stagger régulier est la
 *   signature d'un générateur. Les valeurs ci-dessous ne suivent aucune raison ;
 *   c'est le propos.
 * — **Rien n'anime l'opacité.** Le nom vit en `mix-blend-mode: difference`, et
 *   une densité intermédiaire posée sur un nœud qui se mélange ne donne pas la
 *   moitié du négatif : elle donne la couleur source, c'est-à-dire un blanc
 *   pâle. C'est le défaut qu'on avait, et c'est la raison pour laquelle le nom
 *   ne s'animait plus du tout. Une arête et une translation n'ont pas ce
 *   problème : à tout instant, ce qui est visible est du négatif plein.
 * — **La course est réversible.** Elle est jouée et rembobinée par la même
 *   bascule que la pose du cadre : on remonte dans le couloir, le nom se
 *   retire derrière son arête.
 */
const NOM_DUREE = 0.9;
const NOM_DECALAGES = [0, 0.13, 0.07];
const NOM_FLOU = 10;


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
  const { mouvementReduit } = useMouvement();
  const { t, dire } = useLangue();

  const traverseeRef = useRef<HTMLDivElement>(null);
  const cadreRef = useRef<HTMLDivElement>(null);
  const videosRef = useRef<Array<HTMLVideoElement | null>>([]);

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

      /* ---- L'apparition du premier nom ----
         Montée avant le déclencheur qui la joue. Voir `NOM_DUREE` pour le
         pourquoi de chacun de ses termes. */
      const lignesNom = gsap.utils.toArray<HTMLElement>(
        ".matiere__plan:first-child .matiere__ligne",
        cadre,
      );
      const apparition = gsap.timeline({ paused: true });
      if (lignesNom.length > 0) {
        gsap.set(lignesNom, { yPercent: 110, filter: `blur(${NOM_FLOU}px)` });
        lignesNom.forEach((ligne, i) => {
          apparition.to(
            ligne,
            {
              yPercent: 0,
              filter: "blur(0px)",
              duration: NOM_DUREE,
              ease: "expo.out",
            },
            NOM_DECALAGES[i % NOM_DECALAGES.length],
          );
        });
      }

      /* ---- Le recouvrement de l'enfilade ----
       *
       * `.matiere` remonte d'un écran sur le chapitre précédent (voir
       * `matiere.css`) : le cadre se colle donc au haut du viewport à l'instant
       * exact où l'épinglage de l'enfilade rend la main, et non un écran plus
       * bas. C'est ce qui fait que la photographie ne glisse pas entre les deux
       * chapitres — les deux copies coïncident au pixel, l'une prend la place de
       * l'autre sans que rien ne se déplace.
       *
       * Le revers de ce recouvrement : pendant le dernier écran de la course
       * épinglée, le cadre est déjà dans le viewport et le couvrirait par le bas.
       * Il n'est donc **posé** qu'à partir du moment où le chapitre commence
       * vraiment. Avant, il n'est pas là.
       */
      const pose = ScrollTrigger.create({
        trigger: traversee,
        start: "top top",
        end: "max",
        onToggle: (self) => {
          cadre.dataset.pose = self.isActive ? "true" : "false";
          if (self.isActive) apparition.play();
          else apparition.reverse();
        },
      });
      cadre.dataset.pose = pose.isActive ? "true" : "false";
      /* Rechargement en plein chapitre : le nom est déjà dit, il n'a pas à
         rejouer son arrivée sous les yeux de quelqu'un qui est déjà là. */
      if (pose.isActive) apparition.progress(1);

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
        },
      });

      /* ---- Ce qui arrête vraiment les vidéos ----
       *
       * La fin de la course **n'est pas** la sortie de l'écran, et c'était le
       * défaut : le déclencheur ci-dessus rend la main quand le bas de la
       * traversée atteint le bas du viewport, c'est-à-dire alors que le cadre
       * collé occupe encore tout l'écran. Le dernier plan s'arrêtait donc net,
       * en pleine vue, dès qu'on quittait sa plage — un plan macro qui se fige
       * pendant qu'on le regarde se lit comme un chargement raté.
       *
       * La vraie question n'est pas « la course est-elle finie ? » mais « en
       * reste-t-il un pixel à l'écran ? ». C'est exactement ce que dit un
       * observateur d'intersection à seuil nul, et rien d'autre ne le dit. Le
       * plan continue donc tant qu'on en voit quelque chose, et ne s'arrête
       * qu'une fois entièrement sorti.
       *
       * `joue` n'est pas remis à zéro en sortant : on veut retrouver la même
       * matière en revenant, et non attendre que le défilement veuille bien
       * redonner un index. C'est la reprise explicite ci-dessous qui s'en
       * charge. */
      const reprendre = () => {
        const video = videosRef.current[joue];
        if (video != null) void video.play().catch(() => {});
      };
      const suspendre = () => {
        videosRef.current.forEach((video) => video?.pause());
      };

      let aLEcran = false;
      const vue = new IntersectionObserver(
        (entrees) => {
          const visible = entrees.some((entree) => entree.isIntersecting);
          if (visible === aLEcran) return;
          aLEcran = visible;
          if (visible) reprendre();
          else suspendre();
        },
        { threshold: 0 },
      );
      vue.observe(traversee);

      /* L'onglet passe en arrière-plan : plus rien ne décode, et la matière
         reprend telle quelle au retour. C'est le seul événement qui couvre le
         cas où la page n'est plus regardée sans avoir quitté l'écran. */
      const surVisibilite = () => {
        if (document.visibilityState !== "visible") suspendre();
        else if (aLEcran) reprendre();
      };
      document.addEventListener("visibilitychange", surVisibilite);

      /* Un palier, un passage, un palier… Le masque s'ouvre par le haut : le
         plan qui arrive descend sur celui qui part, dans le sens du
         défilement. */
      plans.slice(1).forEach((plan, i) => {
        ligne.to(plan, { clipPath: OUVERT, duration: PASSAGE }, departs[i]);
      });

      /* La ligne dure exactement 1 : sans cette borne, GSAP la clôturerait sur
         le dernier masque et la troisième matière n'aurait pas son palier. */
      ligne.set(cadre, {}, 1);

      /* Ce que le contexte GSAP ne sait pas défaire tout seul : l'observateur
         et l'écouteur. Une fonction rendue ici est appelée par `revert()`. */
      return () => {
        vue.disconnect();
        document.removeEventListener("visibilitychange", surVisibilite);
        suspendre();
      };
    }, cadre);

    return () => {
      contexte.revert();
      delete cadre.dataset.pose;
    };
  }, [mouvementReduit]);

  return (
    <section
      className="matiere"
      /* Porté par la section aussi : c'est elle qui remonte d'un écran sur
         l'enfilade, et le recouvrement n'a pas lieu en mouvement réduit. */
      data-reduit={mouvementReduit}
      aria-labelledby="matiere-titre"
    >
      <h2 className="sr-only" id="matiere-titre">
        {t("matiereTitre")}
      </h2>

      {/* ---- La traversée des trois matières ---- */}
      <div
        className="matiere__traversee"
        data-chapitre={t("chapitreMatiere")}
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
              {matiere.plan.sorte === "sortie" ? (
                /* Le plan que l'enfilade a laissé ouvert : le même fichier, le
                   même cadrage plein écran, strictement immobile. Rien ne le
                   remplace, rien ne passe par-dessus. */
                <Image
                  className="matiere__media"
                  src={PLANCHE_SORTIE.src}
                  width={PLANCHE_SORTIE.largeur}
                  height={PLANCHE_SORTIE.hauteur}
                  alt={PLANCHE_SORTIE.alt}
                  sizes="100vw"
                  priority
                />
              ) : mouvementReduit ? (
                <Image
                  className="matiere__media"
                  src={matiere.plan.poster}
                  width={LARGEUR_MATIERE}
                  height={HAUTEUR_MATIERE}
                  alt={dire(matiere.plan.alt)}
                  sizes="100vw"
                />
              ) : (
                <video
                  className="matiere__media"
                  ref={(node) => {
                    videosRef.current[index] = node;
                  }}
                  src={matiere.plan.mp4}
                  poster={matiere.plan.poster}
                  width={LARGEUR_MATIERE}
                  height={HAUTEUR_MATIERE}
                  /* Le premier plan filmé du chapitre est le suivant de celui
                     qu'on regarde en arrivant : il se prépare. Le dernier attend
                     qu'on y soit. */
                  preload={index === 1 ? "metadata" : "none"}
                  muted
                  loop
                  playsInline
                  aria-label={dire(matiere.plan.alt)}
                />
              )}

              {/* Le nom est peint dans le plan : le masque le découvre en même
                  temps que la matière, du même geste.

                  **Le nom, et rien d'autre.** Les deux lignes de couche
                  technique — provenance et facture — sont retirées : sur trois
                  écrans qui ne montrent qu'une matière, elles étaient la seule
                  chose à lire, donc la seule chose qu'on lisait. Le chapitre est
                  fait pour qu'on regarde, et un nom suffit à dire ce qu'on
                  regarde. */}
              <figcaption className="matiere__legende">
                <h3 className="matiere__nom display">
                  {index === 0 ? (
                    <>
                      {/* Le nom découpé est doublé d'un équivalent lisible : les
                          mots sont des blocs, et rien ne garantit qu'un lecteur
                          d'écran restitue l'espace qui les sépare. */}
                      <span className="sr-only">{dire(matiere.nom)}</span>
                      <span className="matiere__lignes" aria-hidden="true">
                        {dire(matiere.nom).split(" ").map((mot) => (
                          <span className="matiere__mot" key={mot}>
                            <span className="matiere__ligne">{mot}</span>
                          </span>
                        ))}
                      </span>
                    </>
                  ) : (
                    dire(matiere.nom)
                  )}
                </h3>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
