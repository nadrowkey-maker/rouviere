"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { ScrollTrigger } from "@/lib/gsap";
import { useMouvement } from "@/components/motion/MotionProvider";
import { useSon } from "@/components/chrome/SonProvider";
import { useEffetVisuel } from "@/lib/isomorphe";
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
 * Les coordonnées restent **dispersées dans la composition** — l'adresse calée
 * bas à gauche, le contact décroché à droite, la mention d'atelier isolée dans
 * la marge haute. Jamais empilées en pied de page : ce n'est pas un pied de
 * page, c'est la dernière pièce.
 *
 * Le courriel est un lien `mailto:` qui copie l'adresse au clic, avec un retour
 * discret. Pas de formulaire à six champs, pas de « Parlons de votre projet ».
 *
 * Grammaire de mouvement : **le plan qui tourne seul**. C'est le seul chapitre
 * du site dont le mouvement ne vient pas du défilement — l'atelier qui précède
 * traverse en échelle, sous la main ; ici on a lâché la main, et l'image
 * continue sans nous. C'est ce qui en fait une fin et pas un dernier écran.
 */

const ADRESSE = "atelier@rouviere.fr";
const TELEPHONE = "+33 1 42 61 08 11";

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

  const sectionRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const [copie, setCopie] = useState(false);

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
      data-chapitre="La Sortie"
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
            aria-label={PLAN.alt}
          />
        )}
      </div>

      {/* Le mot, par-dessus, en négatif. Aucune couleur propre : c'est le même
          régime que le logotype, et c'est ici qu'il se referme. */}
      <h2 className="sortie__titre display-monument" id="sortie-titre">
        Rouvière
      </h2>

      {/* Les coordonnées ne sont pas un pied de page : elles sont posées dans
          la composition, chacune à sa place, et aucune n'est empilée sur une
          autre. */}
      <address className="sortie__coordonnees">
        <p className="sortie__adresse">
          14 rue de Beaune
          <br />
          75007 Paris
        </p>

        <p className="sortie__contact">
          <a className="sortie__lien" href={`tel:${TELEPHONE.replace(/\s/g, "")}`}>
            {TELEPHONE}
          </a>
          <a
            className="sortie__lien sortie__courriel"
            href={`mailto:${ADRESSE}`}
            data-curseur="ÉCRIRE"
            onClick={copierAdresse}
          >
            {ADRESSE}
            <span className="sortie__copie technique" aria-hidden="true" data-vu={copie}>
              adresse copiée
            </span>
          </a>
          {/* Le retour est annoncé aux lecteurs d'écran sans voler le focus. */}
          <span className="sr-only" role="status" aria-live="polite">
            {copie ? "Adresse copiée dans le presse-papier." : ""}
          </span>
        </p>
      </address>

      {/* La couche technique, décrochée dans la marge haute — à l'opposé de
          tout le reste. */}
      <p className="sortie__mention technique">
        Atelier fondé 2011 — sur recommandation
      </p>
      <p className="sortie__reperes technique">48°51′N 2°20′E</p>
    </section>
  );
}
