"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { ScrollTrigger } from "@/lib/gsap";
import { useMouvement } from "@/components/motion/MotionProvider";
import { useSon } from "@/components/chrome/SonProvider";
import { useLangue } from "@/i18n/LangueProvider";
import { useEffetVisuel } from "@/lib/isomorphe";
import { largeurLogotype } from "@/lib/logotype";
import "./sortie.css";

/**
 * La Sortie. Un plan, un mot, une adresse.
 *
 * **Le nœud de verre réfractant a quitté le projet**, et avec lui `glass-hero`,
 * `MeshPhysicalMaterial`, `RoomEnvironment` et le `PMREMGenerator`. Il coûtait
 * une seconde scène WebGL lourde — transmission et dispersion sont ce que
 * Three.js sait faire de plus cher — pour un effet qui, à l'échelle du parcours,
 * répondait à une question que personne ne posait à cet endroit-là. Le site n'a
 * plus qu'une seule scène lourde, le bassin, et elle est son morceau de bravoure.
 *
 * À la place, un plan large en boucle : la nuée qui passe sur la crête. Gris,
 * froid, sans personne — c'est la thèse du Livre I en une image. Le mot
 * **ROUVIÈRE** reste par-dessus, en `mix-blend-mode: difference` : il n'est
 * jamais recoloré, il est le négatif exact de ce qu'il traverse, du logotype du
 * seuil jusqu'ici. Le fil rouge se referme sur lui-même.
 *
 * **Le son change de pièce.** La nappe d'ambiance du site s'efface entièrement à
 * l'entrée du chapitre — le même bus, la même coupure d'une seconde et demie
 * qu'au bassin — et `sortie.mp3` prend le cadre. On remonte, elle s'arrête et le
 * parcours reprend là où il en était. C'est la seule autre fois du site où le
 * son dit qu'on a changé d'endroit sans qu'on ait changé de route.
 *
 * Les coordonnées tiennent **deux colonnes ancrées chacune sur sa marge**, et
 * partant de la même ligne : l'adresse et ses repères à gauche, dans le
 * prolongement du mot ; le contact et la mention d'atelier à droite. Ce n'est
 * pas un pied de page — le mot occupe le cadre, et le texte n'est qu'une bande
 * basse qui le laisse respirer.
 *
 * Sous eux, séparé d'un filet, **le colophon** : la seule ligne du site qui ne
 * soit pas de la voix de Rouvière. C'est l'auteur qui signe, et le filet dit
 * sans qu'on l'écrive que le site finit là.
 *
 * Le courriel est un lien `mailto:` qui copie l'adresse au clic, avec un retour
 * discret. Pas de formulaire à six champs, pas de « Parlons de votre projet ».
 *
 * Grammaire de mouvement : **le plan qui tourne seul**. C'est le seul chapitre
 * du site dont le mouvement ne vient pas du défilement — l'atelier qui précède
 * traverse en échelle, sous la main ; ici on a lâché la main, et l'image
 * continue sans nous. C'est ce qui en fait une fin et pas un dernier écran.
 */

/* Coordonnées volontairement inopérantes : l'atelier est une fiction, et un
   numéro ou une adresse qui auraient l'air vrais finiraient par sonner chez
   quelqu'un. Le colophon le dit en toutes lettres, ces deux lignes le montrent. */
const ADRESSE = "contact@exemple-fictif.fr";
const TELEPHONE = "+33 1 00 00 00 00";

/** L'auteur du site. Pas l'atelier — voir le colophon, plus bas. */
const AUTEUR = "contact.flaviengaude@gmail.com";

/**
 * Base de mesure, en pixels. Sa valeur n'a aucune importance : on pose le mot
 * à cette taille, on lit sa largeur, on en déduit le corps qui donne la largeur
 * voulue. Les deux écritures ont lieu dans la même tâche, donc rien n'est peint
 * entre elles.
 */
const BASE_MESURE = 100;

const PLAN = {
  mp4: "/media/sortie/plan.mp4",
  poster: "/media/sortie/plan-poster.avif",
  largeur: 1920,
  hauteur: 1080,
  alt: "Une nuée basse passe sur une crête boisée. Gris de novembre, sans horizon net.",
};

export function Sortie() {
  const { mouvementReduit } = useMouvement();
  const { jouer, reglerSortie } = useSon();
  const { t } = useLangue();

  const sectionRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const titreRef = useRef<HTMLHeadingElement>(null);

  const [copie, setCopie] = useState(false);

  /* ---- Le mot, à l'échelle exacte du logotype du seuil ----
   *
   * On ne devine pas un corps en `vw` : on mesure. Une estimation dépendrait des
   * métriques de Gambetta et serait fausse d'un pourcent ou deux — or ce qu'on
   * veut est une identité, pas une ressemblance.
   *
   * C'est la seule lecture de mise en page de ce chapitre, elle a lieu **une
   * fois** au montage et à chaque redimensionnement, jamais par frame. Le rig
   * garde son interdit : ce qu'il proscrit, c'est un rect lu dans une boucle,
   * pas une mesure de texte faite une bonne fois. Le seuil en fait une du même
   * ordre pour son vol, et l'enfilade une au clic.
   *
   * `document.fonts.ready` n'est pas une précaution : mesurer avant que Gambetta
   * ne soit là, c'est mesurer la police de repli, donc caler le mot sur une
   * largeur qui n'est pas la sienne. */
  useEffetVisuel(() => {
    const titre = titreRef.current;
    if (titre === null) return;

    let annule = false;

    const caler = () => {
      if (annule) return;
      titre.style.fontSize = `${BASE_MESURE}px`;
      const largeur = titre.getBoundingClientRect().width;
      /* Élément non peint (onglet en cours d'ouverture) : on laisse le corps de
         repli de la feuille de style plutôt que de figer une division par zéro. */
      if (largeur === 0) {
        titre.style.removeProperty("font-size");
        return;
      }
      const cible = largeurLogotype(innerWidth);
      titre.style.fontSize = `${(BASE_MESURE * cible) / largeur}px`;
    };

    void document.fonts.ready.then(caler);
    addEventListener("resize", caler, { passive: true });

    return () => {
      annule = true;
      removeEventListener("resize", caler);
    };
  }, []);

  /* ---- Le plan, et la nappe qui va avec ----

     Un seul observateur pour les deux : le plan ne décode que lorsqu'un pixel
     de la section est à l'écran, et la nappe suit exactement la même bascule.
     C'est la garantie qu'on n'entend jamais la sortie depuis l'atelier, ni
     qu'une vidéo de vingt secondes tourne pendant qu'on lit ailleurs.

     La nappe, elle, attend d'être franchement dans le chapitre : `-45%` de marge
     basse veut dire « plus de la moitié de l'écran est occupé par la sortie ».
     Un son qui entrerait dès le premier pixel visible arriverait avant l'image. */
  useEffetVisuel(() => {
    const section = sectionRef.current;
    if (section === null) return;

    /* En mouvement réduit il n'y a pas de vidéo — c'est la poster qui tient le
       cadre. La nappe, elle, change de pièce dans les deux cas : le son n'est
       pas du mouvement. */
    const video = mouvementReduit ? null : videoRef.current;

    const plan = new IntersectionObserver(
      (entrees) => {
        const vu = entrees.some((e) => e.isIntersecting);
        if (video === null) return;
        if (vu) void video.play().catch(() => {});
        else video.pause();
      },
      { threshold: 0 },
    );
    plan.observe(section);

    /* La nappe passe par ScrollTrigger et non par un second observateur : le
       seuil qu'on veut est une position dans la course, et c'est le vocabulaire
       de ScrollTrigger. `onToggle` couvre les deux sens — on descend, la nappe
       prend ; on remonte, elle rend. */
    const declencheur = ScrollTrigger.create({
      trigger: section,
      start: "top 55%",
      end: "bottom top",
      onToggle: (self) => reglerSortie(self.isActive),
    });

    /* L'onglet passe en arrière-plan : plus rien ne décode. */
    const suspendre = () => {
      if (document.visibilityState === "visible") return;
      video?.pause();
    };
    document.addEventListener("visibilitychange", suspendre);

    return () => {
      plan.disconnect();
      declencheur.kill();
      document.removeEventListener("visibilitychange", suspendre);
      video?.pause();
      /* On ne laisse jamais la sortie jouer derrière soi. */
      reglerSortie(false);
    };
  }, [reglerSortie, mouvementReduit]);

  const copierAdresse = () => {
    /* Le lien `mailto:` fait son travail par défaut ; on copie en plus, avec un
       retour qui s'efface tout seul. */
    void navigator.clipboard?.writeText(ADRESSE).then(
      () => {
        setCopie(true);
        /* La copie est la seule action du site dont le résultat est invisible :
           l'adresse part dans le presse-papier et rien ne bouge. Elle est donc
           la mieux fondée à s'entendre. */
        jouer("copie");
        setTimeout(() => setCopie(false), 2400);
      },
      () => {},
    );
  };

  return (
    <section
      className="sortie"
      id="contact"
      data-chapitre={t("chapitreSortie")}
      aria-labelledby="sortie-titre"
      ref={sectionRef}
    >
      {/* Le plan, plein cadre, en boucle. En mouvement réduit, sa poster et
          rien d'autre : une image fixe de nuée est une image, pas une punition. */}
      <div className="sortie__plan" aria-hidden="true">
        {mouvementReduit ? (
          <Image
            className="sortie__media"
            src={PLAN.poster}
            width={PLAN.largeur}
            height={PLAN.hauteur}
            alt=""
            sizes="100vw"
          />
        ) : (
          <video
            className="sortie__media"
            ref={videoRef}
            src={PLAN.mp4}
            poster={PLAN.poster}
            width={PLAN.largeur}
            height={PLAN.hauteur}
            /* Le dernier chapitre du parcours : rien ne se télécharge avant
               qu'on en approche. L'observateur ci-dessus lance la lecture, ce
               qui suffit à déclencher le chargement. */
            preload="none"
            muted
            loop
            playsInline
            aria-label={t("sortiePlanAlt")}
          />
        )}
      </div>

      {/* Le mot, par-dessus, en négatif.

          Ce n'est pas un titre de chapitre qui ressemblerait au logotype :
          **c'est le logotype**, dans la même famille, la même graisse, le même
          interlettrage de 0,18 em, les mêmes capitales et la même largeur qu'au
          générique du seuil. La structure est copiée à l'identique — un nœud qui
          porte la typographie, un mot qui porte l'interlettrage et son retrait
          de compensation — pour que rien ne puisse diverger.

          Les capitales viennent de `text-transform` et non du texte : le seuil
          peut écrire ROUVIÈRE en dur, son mot étant `aria-hidden` derrière un
          `aria-label` ; ici le mot **est** le titre du chapitre, et un lecteur
          d'écran doit lire un nom, pas huit lettres. */}
      <h2 className="sortie__titre" id="sortie-titre" ref={titreRef}>
        <span className="sortie__mot">Rouvière</span>
      </h2>

      {/* ---- Le pied : deux colonnes, deux marges, une seule ligne ----

          Les quatre blocs flottaient à quatre hauteurs sans rapport entre eux —
          l'adresse décrochée en colonne 2 alors que le mot part de la marge, le
          contact suspendu au milieu du vide, la mention seule dans le ciel. Rien
          n'était aligné sur rien, et une dispersion sans alignement ne se lit
          pas comme une composition : elle se lit comme un oubli.

          Ils sont maintenant deux colonnes ancrées chacune sur sa marge et
          partant de la même ligne. La gauche prolonge le mot — même bord, donc
          une verticale forte du logotype jusqu'aux coordonnées ; la droite tient
          l'autre bord. Ce n'est toujours pas un pied de page : le mot occupe le
          cadre, et le texte n'est qu'une bande basse qui le laisse respirer.

          La mention a quitté la marge haute pour une raison mesurée, pas pour
          une raison de goût : le ciel est la zone la plus claire du plan (156 de
          luminance contre 60 en bas à gauche), et onze pixels de couche
          technique n'y tenaient pas le seuil AA. */}
      <address className="sortie__pied">
        <div className="sortie__colonne">
          <p className="sortie__adresse">
            14 rue de Beaune
            <br />
            75007 Paris
          </p>
          <p className="sortie__reperes technique">48°51′N 2°20′E</p>
        </div>

        <div className="sortie__colonne sortie__colonne--droite">
          <p className="sortie__contact">
            <a
              className="sortie__lien"
              href={`tel:${TELEPHONE.replace(/\s/g, "")}`}
            >
              {TELEPHONE}
            </a>
            <a
              className="sortie__lien sortie__courriel"
              href={`mailto:${ADRESSE}`}
              data-curseur={t("curseurEcrire")}
              onClick={copierAdresse}
            >
              {ADRESSE}
              <span
                className="sortie__copie technique"
                aria-hidden="true"
                data-vu={copie}
              >
                {t("sortieCopie")}
              </span>
            </a>
            {/* Le retour est annoncé aux lecteurs d'écran sans voler le focus. */}
            <span className="sr-only" role="status" aria-live="polite">
              {copie ? t("sortieCopieAnnonce") : ""}
            </span>
          </p>
          <p className="sortie__mention technique">
            {t("sortieMention")}
          </p>
        </div>
      </address>

      {/* ---- Le colophon ----

          La seule ligne du site qui ne soit pas de la voix de Rouvière : c'est
          l'auteur qui signe. Le filet au-dessus d'elle le dit sans qu'on ait à
          l'écrire — le site finit là, ce qui suit appartient à quelqu'un
          d'autre. D'où aussi le zinc plutôt que la pierre : un cran plus bas
          que la couche technique de l'atelier, parce qu'elle n'en fait pas
          partie. */}
      {/* Pas la classe `technique` : elle passe tout en capitales, et une adresse
          de courriel en capitales se lit mal et n'a pas l'air d'une adresse. */}
      <p className="sortie__colophon">
        <span>{t("colophonAuteur")}</span>{" "}
        <span className="sortie__colophon-invite">
          {t("colophonInvite")}{" "}
          <a className="sortie__lien sortie__courriel" href={`mailto:${AUTEUR}`}>
            {AUTEUR}
          </a>
        </span>
        {/* La fiction levée, sur sa propre ligne et sous la signature : c'est
            l'auteur qui la déclare, pas l'atelier. Même corps, même zinc — elle
            n'attire pas l'œil, elle est là pour qui la cherche. */}
        <span className="sortie__fiction">{t("colophonFiction")}</span>
      </p>
    </section>
  );
}
