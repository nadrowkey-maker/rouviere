"use client";

import { useRef } from "react";
import Image from "next/image";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { matieres, LARGEUR_MATIERE, HAUTEUR_MATIERE } from "@/data/matieres";
import { PLANCHE_SORTIE } from "@/data/visuels";
import { useMouvement } from "@/components/motion/MotionProvider";
import { useSon, type Lieu } from "@/components/chrome/SonProvider";
import { useLangue } from "@/i18n/LangueProvider";
import { useEffetVisuel } from "@/lib/isomorphe";
import { sourcesPlan } from "@/lib/media";
import "./matiere.css";

/**
 * La Matière. Un chapitre entier sans image de projet. On touche.
 *
 * **Trois matières en plein écran, et rien d'autre.** Le noyer fumé de
 * l'Appartement Laiton, le relief des Charmilles, la trame de la Villa
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
 * par lequel on venait d'arriver. Le nom *Noyer fumé* monte maintenant **sur
 * elle**, au défilement, et c'est la seule chose qui arrive.
 *
 * Le raccord est exact au pixel : les deux chapitres montrent le même fichier
 * (`PLANCHE_SORTIE`), en `cover` sur le même cadre plein, et le relais se fait à
 * l'instant précis où l'épinglage de l'enfilade rend la main — voir plus bas la
 * mécanique du recouvrement et de la pose.
 *
 * Rien d'autre ne bouge. Les noms des deux autres matières sont peints *dans* le
 * plan : ils sont découverts par le même masque que la matière, du même geste.
 * Aucun reveal typographique, aucun décalage, aucune entrée d'objet — le premier
 * nom lui-même ne fait que monter en densité. Le mouvement du chapitre, c'est la
 * matière elle-même.
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
 * **Ce qui joue est ce qui est visible**, et rien de plus. En palier, une seule
 * vidéo tourne ; le temps d'un passage, les deux plans que le masque met en
 * présence tournent ensemble — sinon celui qui arrive descendrait arrêté sur sa
 * première image, et une matière figée pendant qu'on la découvre se lit comme un
 * chargement raté. Toutes sont arrêtées dès que le chapitre quitte l'écran ou
 * que l'onglet passe en arrière-plan : trois plans macro décodés en parallèle
 * coûtent cher, deux le temps d'un masque ne coûtent rien.
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
 * **L'arrivée du premier nom.**
 *
 * Les deux autres matières n'en ont pas besoin : elles arrivent derrière un
 * masque, et leur nom est peint dans le plan — il est découvert du même geste
 * qu'elles. Le premier, lui, n'a aucun masque pour le porter : il se pose sur la
 * photographie que l'enfilade vient de laisser ouverte.
 *
 * Il n'avait donc **rien** : il paraissait avec le cadre, d'un seul coup, à
 * l'instant où l'épinglage du couloir rendait la main. Un mot monumental qui
 * s'allume sur une image ne se lit pas comme une arrivée, il se lit comme un
 * défaut d'affichage.
 *
 * Il monte maintenant en densité **au défilement**, sur les treize premiers
 * centièmes de la course, puis l'écran se tient : la photographie occupe tout le
 * cadre, le nom a fini de venir, et il reste autant de molette avant que le
 * premier masque ne s'ouvre. C'est la respiration que le chapitre réclamait — on
 * regarde la matière, puis on la nomme, puis on attend, puis on continue.
 *
 * **Sur l'opacité, et sur ce qui était écrit ici.** Une note de ce fichier et de
 * `matiere.css` interdisait toute composition sous ce nom : il vit en
 * `mix-blend-mode: difference`, et l'on avait attribué à cette isolation le
 * demi-pixel dont la photographie se déplaçait quand le nom paraissait. Mesure
 * faite — nom retiré, nom à mi-densité, nom flouté avec `will-change`, nom
 * découpé —, **la photographie ne bouge d'aucun pixel** dans aucun de ces cas.
 * Le déplacement venait d'ailleurs : de la relève entre les deux copies de
 * l'image, dont l'une défilait déjà quand l'autre se posait. Il est corrigé dans
 * `Enfilade.tsx`, et l'interdit tombe avec sa cause.
 *
 * Ce qui reste vrai, et qui n'a rien à voir avec le blend : **il n'y a ni
 * découpage en mots, ni décalage, ni flou.** Le nom monte en densité, un point.
 * Une composition typographique serait une seconde chose à regarder dans le seul
 * chapitre qui n'en veut qu'une.
 */
/**
 * Part de la course prise par la montée du premier nom.
 *
 * Treize centièmes de 390 vh font quatre cent cinquante pixels de molette : une
 * demi-page pour que le mot vienne. Le premier palier en compte huit cent
 * quarante ; il reste donc autant de pause, l'image installée et nommée, avant
 * que le premier masque ne s'ouvre. C'est le rythme du chapitre — on regarde, on
 * nomme, on attend, on continue.
 */
const ARRIVEE_NOM = 0.13;

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

/**
 * **Le son de chaque plan**, dans l'ordre du manifeste.
 *
 * Le premier plan — celui que l'enfilade vient d'ouvrir en plein cadre — n'a pas
 * de son propre : la nappe du site y joue, comme partout. Les deux suivants en
 * ont un, et tous deux **coupent la nappe** (voir `LIEUX` dans `SonProvider`) :
 * sur ces plans-là il ne doit rester qu'eux.
 *
 * C'est donc dans ce chapitre que la nappe s'éteint, tient sur deux plans, puis
 * revient — un troisième endroit du site où le son dit qu'on a changé de pièce,
 * après le bassin et la sortie. Le chapitre s'y prête : c'est celui où l'on
 * touche, et où il n'y a rien d'autre à l'écran que la matière.
 */
const SONS_MATIERES: Array<Lieu | null> = [null, "relief", "trame"];

export function Matiere() {
  const { mouvementReduit } = useMouvement();
  const { t, dire } = useLangue();
  const { reglerLieu, quitterLieu } = useSon();

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
       *
       * **Et c'est ce même moment qui ouvre la course.** Le déclencheur du masque
       * ci-dessous part sur la même ligne (`top top`) : la progression zéro est
       * donc exactement l'instant où la photographie prend le plein écran. C'est
       * de là que part la montée du premier nom, et c'est pourquoi elle n'a besoin
       * d'aucun minutage propre.
       */
      const pose = ScrollTrigger.create({
        trigger: traversee,
        start: "top top",
        end: "max",
        onToggle: (self) => {
          cadre.dataset.pose = self.isActive ? "true" : "false";
        },
      });
      cadre.dataset.pose = pose.isActive ? "true" : "false";

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

      /**
       * **Qui doit tourner, et non plus qui occupe l'écran.**
       *
       * Une seule vidéo jouait — celle que `indexActif` désignait, c'est-à-dire
       * celle qui avait passé la moitié du masque. Conséquence : le plan qui
       * arrive était **arrêté sur sa première image pendant toute la première
       * moitié de son entrée**, et il se mettait en marche une fois découvert
       * jusqu'à mi-cadre. On voyait donc une plaque descendre, puis s'animer. Un
       * plan macro qui démarre sous les yeux se lit comme un chargement, pas
       * comme un mouvement de caméra.
       *
       * Le critère juste n'est pas « quelle matière regarde-t-on ? » mais
       * **« quelle matière est visible, ne fût-ce que d'un pixel ? »** — la même
       * question, exactement, que celle qui commande déjà l'arrêt du chapitre
       * entier par intersection.
       *
       * Un passage rend donc ses deux plans, celui qui part et celui qui arrive,
       * et ce dans les deux sens de défilement : on remonte, le plan qu'on
       * redécouvre est déjà en marche lui aussi.
       *
       * `LEVEE` est l'avance prise sur l'ouverture du masque : la vidéo est
       * lancée un peu avant que le moindre pixel n'en paraisse. Ce n'est pas de
       * la marge de confort, c'est le temps qu'il faut au décodeur pour rendre
       * sa première image — une `play()` n'est pas instantanée.
       */
      const LEVEE = 0.05;

      const aJouer = (progression: number) => {
        const jeu = new Set<number>([indexActif(progression)]);
        departs.forEach((depart, i) => {
          if (
            progression >= depart - LEVEE &&
            progression <= depart + PASSAGE + LEVEE
          ) {
            jeu.add(i);
            jeu.add(i + 1);
          }
        });
        return jeu;
      };

      /** Deux jeux d'indices sont-ils le même ? */
      const memeJeu = (a: Set<number>, b: Set<number>) =>
        a.size === b.size && [...a].every((i) => b.has(i));

      /* Ce que le chapitre veut voir tourner. Distinct de ce qui tourne
         vraiment : hors de l'écran, plus rien ne décode — voir l'observateur
         d'intersection plus bas. */
      let voulu = new Set<number>();
      let aLEcran = false;

      /* Le son suit le plan dominant, et rien d'autre : c'est `indexActif` qui
         le désigne, si bien que le son ne peut pas être celui d'un autre plan
         que celui qu'on regarde.

         Le passage par une variable locale n'est pas une optimisation de
         confort : ce déclencheur est en `scrub` et tire à chaque frame. Le
         moteur ignore déjà les demandes qui ne changent rien, autant ne pas
         l'appeler soixante fois par seconde pour rien. */
      let lieuPose: Lieu | null = null;
      const poserLieu = (lieu: Lieu | null) => {
        if (lieu === lieuPose) return;
        const precedent = lieuPose;
        lieuPose = lieu;
        if (lieu !== null) {
          reglerLieu(lieu);
        } else if (precedent !== null) {
          /* On ne libère que **le sien**. Ce chapitre sort de l'écran après que
             l'atelier a pris la main — son observateur d'intersection attend le
             dernier pixel, le seuil du voisin est à 55 % du cadre. Un
             `reglerLieu(null)` éteindrait donc l'atelier qui vient de
             s'allumer, et c'est exactement ce qui arrivait. */
          quitterLieu(precedent);
        }
      };

      const appliquer = () => {
        videosRef.current.forEach((video, i) => {
          if (video === null) return;
          if (aLEcran && voulu.has(i)) {
            /* La lecture peut être refusée (onglet en fond, économie
               d'énergie) : on ne traite pas le refus comme une erreur. */
            void video.play().catch(() => {});
          } else {
            video.pause();
          }
        });
      };

      const nAJouer = (jeu: Set<number>) => {
        if (memeJeu(jeu, voulu)) return;
        voulu = jeu;
        appliquer();

        /* La matière suivante est mise en chauffe pendant qu'on regarde
           celle-ci. Sans cela, elle commencerait son téléchargement au moment
           exact où le masque l'ouvre, et on la verrait arriver arrêtée sur sa
           poster. On ne chauffe qu'elle : deux d'avance ne servent à rien.

           **La condition portait sur `"none"`, et c'était le défaut.** La
           deuxième matière est servie en `preload="metadata"` — elle ne
           correspondait donc à aucune chauffe, et restait à ses métadonnées
           jusqu'à ce qu'un `play()` déclenche le téléchargement du média. C'est
           exactement ce qu'on voyait : le plan ne partait qu'une fois arrivé
           dessus. Ce qui compte n'est pas de quoi on part, c'est qu'on soit en
           `"auto"` avant d'en avoir besoin. */
        const suivante = videosRef.current[Math.max(...jeu) + 1];
        if (suivante !== null && suivante !== undefined && suivante.preload !== "auto") {
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
          onUpdate: (self) => {
            nAJouer(aJouer(self.progress));
            /* Le son ne se pose que si le chapitre est à l'écran : la course
               commence avant qu'on n'en voie quoi que ce soit, et couper la
               nappe du site pour un plan qu'on ne regarde pas encore
               s'entendrait comme un trou. */
            if (aLEcran) {
              poserLieu(SONS_MATIERES[indexActif(self.progress)] ?? null);
            }
          },
        },
      });

      /* La chauffe n'est **pas** amorcée ici, et c'est délibéré : le premier
         `onUpdate` a lieu quand le chapitre entre dans sa course, pas au
         chargement de la page. Un appel posé à cet endroit téléchargerait les
         plans macro dès l'accueil, pour un chapitre qui vit six écrans plus bas.
         `voulu` part vide, donc le premier `onUpdate` fait bien son travail. */

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
       * `voulu` n'est pas vidé en sortant : on veut retrouver les mêmes plans en
       * revenant, et non attendre que le défilement veuille bien redonner un
       * index. C'est `appliquer()` qui tranche, et il ne fait que croiser ce que
       * le chapitre veut avec ce que l'écran montre. */
      const suspendre = () => {
        videosRef.current.forEach((video) => video?.pause());
      };

      const vue = new IntersectionObserver(
        (entrees) => {
          const visible = entrees.some((entree) => entree.isIntersecting);
          if (visible === aLEcran) return;
          aLEcran = visible;
          appliquer();
          /* On quitte le chapitre : on rend la nappe. Sans cela elle resterait
             coupée sous le chapitre suivant si l'on sort par un plan qui la
             coupait — c'est-à-dire dans les deux cas sur trois. */
          if (!visible) poserLieu(null);
        },
        { threshold: 0 },
      );
      vue.observe(traversee);

      /* L'onglet passe en arrière-plan : plus rien ne décode, et la matière
         reprend telle quelle au retour. C'est le seul événement qui couvre le
         cas où la page n'est plus regardée sans avoir quitté l'écran. */
      const surVisibilite = () => {
        if (document.visibilityState !== "visible") suspendre();
        else appliquer();
      };
      document.addEventListener("visibilitychange", surVisibilite);

      /* La montée du premier nom, sur la photographie que l'enfilade vient
         d'ouvrir. C'est la seule chose que ce chapitre joue en dehors des
         masques, et elle est délibérément la plus simple possible : une densité
         qui monte au défilement, rien d'autre. Voir « L'arrivée du premier nom ».

         L'ease est celui du chapitre, `power1.inOut`, et il compte ici plus
         qu'ailleurs. Un `out` avait été essayé : il porte le nom à la moitié de sa
         densité dans le premier cinquième de la course, si bien que le mot **est
         là** presque tout de suite et passe le reste du temps à finir — ce qu'on
         voulait éviter était précisément cela. La courbe en S le fait émerger du
         néant sans le poser d'un coup, franchir le milieu vite, et se stabiliser
         sans butée. C'est la seule des trois formes qui se lise comme une
         apparition et non comme un allumage.

         ---- La densité se pose sur le nom, jamais sur sa légende ----

         C'est `.matiere__nom` qu'on anime, et le choix n'a rien d'indifférent :
         c'est **le nœud qui porte le `mix-blend-mode`**.

         La densité vivait sur `.matiere__legende`, son parent. Or une opacité
         inférieure à un fait de l'élément qui la porte un contexte
         d'empilement — donc un groupe isolé —, et un `mix-blend-mode` ne se
         mélange qu'avec le fond de *son* groupe. Le nom ne voyait plus la
         photographie : il se peignait en craie pleine, blanc sur l'image. Puis
         l'opacité atteignait exactement un, l'isolation disparaissait avec elle,
         et le mot basculait d'un coup dans son négatif. C'est ce qu'on a vu.

         Posée sur le nom lui-même, l'opacité ne l'isole plus de quoi que ce
         soit : l'élément est mélangé à la photographie, *puis* composé avec son
         alpha. Chaque état intermédiaire est donc un vrai négatif, simplement
         moins dense — le mot est le négatif de ce qu'il traverse dès son premier
         pixel, comme le logotype, et comme le veut le Livre I. */
      const premierNom = plans[0]?.querySelector<HTMLElement>(".matiere__nom");
      if (premierNom != null) {
        ligne.fromTo(
          premierNom,
          { opacity: 0 },
          { opacity: 1, duration: ARRIVEE_NOM, ease: "power1.inOut" },
          0,
        );
      }

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
        /* On ne quitte jamais le chapitre en laissant la nappe coupée. */
        poserLieu(null);
      };
    }, cadre);

    return () => {
      contexte.revert();
      delete cadre.dataset.pose;
    };
  }, [mouvementReduit, reglerLieu, quitterLieu]);

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
                  /* Pas d'attribut `src` : il l'emporterait sur les `<source>`
                     et court-circuiterait le choix de la variante. */
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
                >
                  {/* Le master sur grand écran, la variante 720p ailleurs.
                      Ces deux plans font douze mégaoctets chacun ; sur mobile,
                      ils en font deux. Voir `lib/media.ts`. */}
                  {sourcesPlan(matiere.plan.mp4).map((source) => (
                    <source
                      key={source.src}
                      src={source.src}
                      type={source.type}
                      media={source.media}
                    />
                  ))}
                </video>
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
                {/* Les trois noms sont rendus de la même façon, et le premier
                    n'est plus découpé en mots — voir « L'arrivée du premier
                    nom » dans `matiere.css` pour ce qui a été retiré et
                    pourquoi. Le découpage n'existait que pour porter une
                    animation qui n'existe plus ; sans elle il ne restait qu'une
                    complication et un doublon `sr-only`. */}
                <h3 className="matiere__nom display">{dire(matiere.nom)}</h3>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
