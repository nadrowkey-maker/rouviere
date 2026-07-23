/**
 * Le rig. La colonne vertébrale du mouvement.
 *
 * Un canvas, un renderer, une scène, une caméra. Montés une fois dans le
 * layout racine, jamais démontés, jamais recréés à la navigation. Tout le
 * WebGL du site passe par ici — il n'y a pas de second contexte, pas de
 * seconde boucle, pas de second `getBoundingClientRect` isolé dans un coin.
 *
 * Le cœur est impératif et sans React : `Rig.tsx` ne fait que l'accrocher au
 * cycle de vie du layout.
 */
import * as THREE from "three";
import { inscrire } from "@/lib/boucle";

/** Pixels CSS, tels que `getBoundingClientRect` les compte. */
export type Taille = { largeur: number; hauteur: number; dpr: number };

export type ContexteRig = {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  taille: Taille;
  mouvementReduit: boolean;
  pointeurGrossier: boolean;
};

export type EtatCadre = {
  /** Secondes depuis le démarrage du ticker. */
  temps: number;
  /** Millisecondes depuis le battement précédent. */
  delta: number;
  /** Le rect de l'ancre, lu pendant la passe de mesure de cette frame. */
  rect: DOMRectReadOnly;
  taille: Taille;
  mouvementReduit: boolean;
};

/**
 * Ce qu'une scène rend au rig. `objet` est ajouté à la scène commune ; le rig
 * le positionne sur l'ancre DOM à chaque frame.
 */
export type PlanScene = {
  objet: THREE.Object3D;
  /**
   * Par défaut, le rig cale l'échelle de l'objet sur la taille de l'ancre —
   * ce qui suppose une géométrie unitaire de 1 × 1 (voir `geometriePlan`).
   * Une scène qui gère elle-même ses dimensions passe `false`.
   */
  ajusterEchelle?: boolean;
  /** Appelée une fois par frame, uniquement quand l'ancre est à l'écran. */
  cadre?: (etat: EtatCadre) => void;
  redimensionne?: (taille: Taille) => void;
  /** Entrée et sortie du viewport, pour allumer ou éteindre ce qui coûte. */
  visibilite?: (visible: boolean) => void;
  /** Géométries, matériaux, textures, cibles de rendu : tout y passe. */
  liberer: () => void;
};

export type Fabrique = (contexte: ContexteRig) => PlanScene;

export type StatsRig = {
  ips: number;
  appels: number;
  triangles: number;
  geometries: number;
  textures: number;
  programmes: number;
  scenesActives: number;
  scenesInscrites: number;
  dpr: number;
  suspendu: boolean;
  premierRenduMs: number | null;
};

type Options = {
  mouvementReduit: boolean;
  pointeurGrossier: boolean;
  /** Coût de la toute première frame, remonté au MotionProvider. */
  auPremierRendu?: (millisecondes: number) => void;
};

type Inscription = {
  element: HTMLElement;
  fabrique: Fabrique;
  plan: PlanScene | null;
  visible: boolean;
  rect: DOMRect | null;
  /** Position et taille de la frame précédente, pour ne rendre que si ça bouge. */
  empreinte: string;
};

/**
 * La caméra est à mille unités du plan zéro et son champ est calculé pour que
 * ce plan mesure exactement la hauteur du viewport en pixels :
 * `fov = 2 · atan(hauteur / (2 · distance))`. Une unité monde vaut donc un
 * pixel écran à z = 0, et l'axe Z reste disponible pour la profondeur.
 */
const DISTANCE_CAMERA = 1000;

/** Marge d'allumage : une scène s'éveille un peu avant d'entrer dans le cadre. */
const MARGE_OBSERVATEUR = "15% 0px";

/** Cadence d'émission des statistiques. Cinq fois par seconde suffit à l'œil. */
const PERIODE_STATS_MS = 200;

let geometrieUnitaire: THREE.PlaneGeometry | null = null;

/**
 * Le plan unitaire partagé par toutes les scènes qui doublent un élément DOM.
 * Une seule géométrie pour tout le site : le rig s'occupe de l'échelle.
 */
export function geometriePlan(): THREE.PlaneGeometry {
  geometrieUnitaire ??= new THREE.PlaneGeometry(1, 1, 1, 1);
  return geometrieUnitaire;
}

export class Rig {
  private canvas: HTMLCanvasElement | null = null;
  private renderer: THREE.WebGLRenderer | null = null;
  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;

  private options: Options = {
    mouvementReduit: false,
    pointeurGrossier: false,
  };

  private taille: Taille = { largeur: 0, hauteur: 0, dpr: 1 };

  /** Tableau et non Map : parcouru deux fois par frame, sans allocation. */
  private readonly inscriptions: Inscription[] = [];

  private observateur: IntersectionObserver | null = null;
  private desinscriptions: Array<() => void> = [];
  private nettoyages: Array<() => void> = [];

  private redimensionnementDemande = true;
  private ongletCache = false;
  private contextePerdu = false;
  /** Un rendu est dû même sans scène animée : quelque chose a bougé. */
  private sale = true;

  private premierRenduMs: number | null = null;
  private ips = 0;
  private dernierEnvoiStats = 0;
  private readonly auditeursStats = new Set<(stats: StatsRig) => void>();

  // ----------------------------------------------------------------------
  // Cycle de vie
  // ----------------------------------------------------------------------

  attacher(canvas: HTMLCanvasElement, options: Options): void {
    if (this.canvas === canvas) return;
    if (this.canvas !== null) this.detacher();

    this.canvas = canvas;
    this.options = options;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: false,
      powerPreference: "high-performance",
      stencil: false,
    });
    renderer.setClearAlpha(0);
    renderer.autoClear = true;

    this.renderer = renderer;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(50, 1, 1, DISTANCE_CAMERA * 4);
    this.camera.position.z = DISTANCE_CAMERA;

    this.redimensionnementDemande = true;
    this.sale = true;
    this.appliquerRedimensionnement();

    this.observateur = new IntersectionObserver(
      (entrees) => this.surIntersection(entrees),
      { rootMargin: MARGE_OBSERVATEUR, threshold: 0 },
    );

    /* Les inscriptions posées avant l'attache — les effets React des enfants
       s'exécutent avant celui du parent — sont construites maintenant. */
    for (const inscription of this.inscriptions) {
      this.construire(inscription);
      this.observateur.observe(inscription.element);
    }

    this.brancherEcouteurs();

    this.desinscriptions = [
      inscrire("mesure", () => this.mesurer()),
      inscrire("rendu", (temps, delta) => this.rendre(temps, delta)),
    ];
  }

  detacher(): void {
    for (const desinscrire of this.desinscriptions) desinscrire();
    this.desinscriptions = [];

    for (const nettoyer of this.nettoyages) nettoyer();
    this.nettoyages = [];

    this.observateur?.disconnect();
    this.observateur = null;

    /* Les scènes sont détruites, les inscriptions restent : une réattache —
       double montage du mode strict, contexte WebGL restauré — les reconstruit
       à l'identique. */
    for (const inscription of this.inscriptions) this.detruire(inscription);

    this.renderer?.dispose();
    this.renderer = null;
    this.scene = null;
    this.camera = null;
    this.canvas = null;
  }

  mettreAJourOptions(options: Partial<Options>): void {
    const avant = this.options;
    this.options = { ...avant, ...options };

    if (this.options.pointeurGrossier !== avant.pointeurGrossier) {
      this.redimensionnementDemande = true;
    }
    this.sale = true;
  }

  // ----------------------------------------------------------------------
  // Inscription des proxies
  // ----------------------------------------------------------------------

  /**
   * Enregistre un élément DOM et sa fabrique de scène. Renvoie la
   * désinscription, qui libère la scène. Appelable avant l'attache du canvas.
   */
  inscrireProxy(element: HTMLElement, fabrique: Fabrique): () => void {
    const inscription: Inscription = {
      element,
      fabrique,
      plan: null,
      visible: false,
      rect: null,
      empreinte: "",
    };

    this.inscriptions.push(inscription);

    if (this.renderer !== null) {
      this.construire(inscription);
      this.observateur?.observe(element);
    }

    return () => {
      const index = this.inscriptions.indexOf(inscription);
      if (index !== -1) this.inscriptions.splice(index, 1);
      this.observateur?.unobserve(element);
      this.detruire(inscription);
      this.sale = true;
    };
  }

  private construire(inscription: Inscription): void {
    if (this.renderer === null || this.scene === null || this.camera === null) {
      return;
    }
    if (inscription.plan !== null) return;

    const plan = inscription.fabrique({
      renderer: this.renderer,
      scene: this.scene,
      camera: this.camera,
      taille: this.taille,
      mouvementReduit: this.options.mouvementReduit,
      pointeurGrossier: this.options.pointeurGrossier,
    });

    plan.objet.visible = false;
    plan.redimensionne?.(this.taille);
    this.scene.add(plan.objet);
    inscription.plan = plan;
    inscription.empreinte = "";
    this.sale = true;
  }

  private detruire(inscription: Inscription): void {
    const plan = inscription.plan;
    if (plan === null) return;

    this.scene?.remove(plan.objet);
    plan.liberer();
    inscription.plan = null;
    inscription.visible = false;
    inscription.rect = null;
  }

  // ----------------------------------------------------------------------
  // Écouteurs — aucun d'eux ne lit le DOM : ils lèvent un drapeau, la passe
  // de mesure s'en occupe au bon moment.
  // ----------------------------------------------------------------------

  private brancherEcouteurs(): void {
    const surRedimensionnement = () => {
      this.redimensionnementDemande = true;
    };
    addEventListener("resize", surRedimensionnement, { passive: true });
    this.nettoyages.push(() =>
      removeEventListener("resize", surRedimensionnement),
    );

    /* Le zoom navigateur et le changement d'écran modifient la densité sans
       toujours déclencher `resize` : on écoute la résolution elle-même. */
    const suivreDensite = () => {
      const requete = matchMedia(`(resolution: ${devicePixelRatio}dppx)`);
      const surChangement = () => {
        this.redimensionnementDemande = true;
        requete.removeEventListener("change", surChangement);
        suivreDensite();
      };
      requete.addEventListener("change", surChangement);
      this.nettoyages.push(() =>
        requete.removeEventListener("change", surChangement),
      );
    };
    suivreDensite();

    /* Onglet en arrière-plan : plus une seule frame. C'est le point qui tue
       les sites mal finis — la simulation qui tourne pendant qu'on lit
       ailleurs. */
    const surVisibilite = () => {
      this.ongletCache = document.hidden;
      if (!document.hidden) this.sale = true;
    };
    document.addEventListener("visibilitychange", surVisibilite);
    this.nettoyages.push(() =>
      document.removeEventListener("visibilitychange", surVisibilite),
    );

    const canvas = this.canvas;
    if (canvas === null) return;

    const surPerte = (evenement: Event) => {
      evenement.preventDefault();
      this.contextePerdu = true;
    };
    const surRestauration = () => {
      this.contextePerdu = false;
      for (const inscription of this.inscriptions) {
        this.detruire(inscription);
        this.construire(inscription);
      }
      this.redimensionnementDemande = true;
      this.sale = true;
    };
    canvas.addEventListener("webglcontextlost", surPerte);
    canvas.addEventListener("webglcontextrestored", surRestauration);
    this.nettoyages.push(() => {
      canvas.removeEventListener("webglcontextlost", surPerte);
      canvas.removeEventListener("webglcontextrestored", surRestauration);
    });
  }

  private surIntersection(entrees: IntersectionObserverEntry[]): void {
    for (const entree of entrees) {
      const inscription = this.inscriptions.find(
        (candidate) => candidate.element === entree.target,
      );
      if (inscription === undefined) continue;
      if (inscription.visible === entree.isIntersecting) continue;

      inscription.visible = entree.isIntersecting;
      inscription.plan?.visibilite?.(entree.isIntersecting);
      if (inscription.plan !== null) {
        inscription.plan.objet.visible = entree.isIntersecting;
      }
      this.sale = true;
    }
  }

  // ----------------------------------------------------------------------
  // Phase de mesure — que des lectures
  // ----------------------------------------------------------------------

  private mesurer(): void {
    if (this.renderer === null) return;

    if (this.redimensionnementDemande) this.appliquerRedimensionnement();
    if (this.ongletCache || this.contextePerdu) return;

    for (let i = 0; i < this.inscriptions.length; i += 1) {
      const inscription = this.inscriptions[i]!;
      if (!inscription.visible || inscription.plan === null) continue;

      const rect = inscription.element.getBoundingClientRect();
      inscription.rect = rect;

      /* Rien n'a bougé, rien à repeindre : c'est ce qui permet au mouvement
         réduit de tenir sur une frame unique et fixe. */
      const empreinte = `${rect.left}|${rect.top}|${rect.width}|${rect.height}`;
      if (empreinte !== inscription.empreinte) {
        inscription.empreinte = empreinte;
        this.sale = true;
      }
    }
  }

  /** Lecture du viewport et remise à l'échelle. Fait dans la phase de mesure. */
  private appliquerRedimensionnement(): void {
    const canvas = this.canvas;
    const renderer = this.renderer;
    const camera = this.camera;
    if (canvas === null || renderer === null || camera === null) return;

    /* `clientWidth` du canvas fixe, et non `innerWidth` : c'est l'espace de
       coordonnées de `getBoundingClientRect`, barre de défilement exclue. */
    const largeur = canvas.clientWidth;
    const hauteur = canvas.clientHeight;

    /* Canvas sans dimensions — onglet en cours d'ouverture, ancêtre masqué :
       on garde la demande en attente plutôt que de figer une taille nulle. */
    if (largeur === 0 || hauteur === 0) return;

    this.redimensionnementDemande = false;

    const plafond = this.options.pointeurGrossier ? 1.5 : 2;
    const dpr = Math.min(devicePixelRatio, plafond);

    if (
      largeur === this.taille.largeur &&
      hauteur === this.taille.hauteur &&
      dpr === this.taille.dpr
    ) {
      return;
    }

    this.taille = { largeur, hauteur, dpr };

    renderer.setPixelRatio(dpr);
    /* `false` : la taille CSS du canvas est tenue par la feuille de style,
       le renderer ne touche qu'au tampon. */
    renderer.setSize(largeur, hauteur, false);

    camera.aspect = largeur / hauteur;
    camera.fov =
      2 * Math.atan(hauteur / (2 * DISTANCE_CAMERA)) * (180 / Math.PI);
    camera.updateProjectionMatrix();

    for (const inscription of this.inscriptions) {
      inscription.plan?.redimensionne?.(this.taille);
      inscription.empreinte = "";
    }

    this.sale = true;
  }

  // ----------------------------------------------------------------------
  // Phase de rendu — que des écritures
  // ----------------------------------------------------------------------

  private rendre(temps: number, delta: number): void {
    const renderer = this.renderer;
    const scene = this.scene;
    const camera = this.camera;
    if (renderer === null || scene === null || camera === null) return;

    if (delta > 0) {
      const instantane = 1000 / delta;
      this.ips =
        this.ips === 0 ? instantane : this.ips + (instantane - this.ips) * 0.1;
    }

    if (this.ongletCache || this.contextePerdu) {
      this.emettreStats(temps, 0);
      return;
    }

    let actives = 0;

    for (let i = 0; i < this.inscriptions.length; i += 1) {
      const inscription = this.inscriptions[i]!;
      const plan = inscription.plan;
      const rect = inscription.rect;
      if (plan === null) continue;
      if (!inscription.visible || rect === null) {
        plan.objet.visible = false;
        continue;
      }

      actives += 1;
      plan.objet.visible = true;
      this.positionner(plan, rect);

      plan.cadre?.({
        temps,
        delta,
        rect,
        taille: this.taille,
        mouvementReduit: this.options.mouvementReduit,
      });
    }

    /* Rien à l'écran et rien de sale : on ne rend pas du tout. Le GPU dort. */
    const anime = actives > 0 && !this.options.mouvementReduit;
    if (!anime && !this.sale) {
      this.emettreStats(temps, actives);
      return;
    }

    if (this.premierRenduMs === null) {
      const debut = performance.now();
      renderer.render(scene, camera);
      this.premierRenduMs = performance.now() - debut;
      this.options.auPremierRendu?.(this.premierRenduMs);
    } else {
      renderer.render(scene, camera);
    }

    this.sale = false;
    this.emettreStats(temps, actives);
  }

  /**
   * Le canvas est fixe : le rect du DOM est déjà en coordonnées viewport, donc
   * l'alignement tient au défilement sans qu'on ait à soustraire quoi que ce
   * soit. On passe du repère écran (origine en haut à gauche, Y vers le bas)
   * au repère monde (origine au centre, Y vers le haut).
   */
  private positionner(plan: PlanScene, rect: DOMRectReadOnly): void {
    const x = rect.left + rect.width / 2 - this.taille.largeur / 2;
    const y = this.taille.hauteur / 2 - (rect.top + rect.height / 2);

    plan.objet.position.x = x;
    plan.objet.position.y = y;

    if (plan.ajusterEchelle !== false) {
      plan.objet.scale.set(rect.width, rect.height, 1);
    }
  }

  // ----------------------------------------------------------------------
  // Statistiques — lues par le panneau de debug, en développement seulement
  // ----------------------------------------------------------------------

  abonnerStats(auditeur: (stats: StatsRig) => void): () => void {
    this.auditeursStats.add(auditeur);
    return () => {
      this.auditeursStats.delete(auditeur);
    };
  }

  private emettreStats(temps: number, actives: number): void {
    if (this.auditeursStats.size === 0) return;

    const millisecondes = temps * 1000;
    if (millisecondes - this.dernierEnvoiStats < PERIODE_STATS_MS) return;
    this.dernierEnvoiStats = millisecondes;

    const info = this.renderer?.info;
    const stats: StatsRig = {
      ips: Math.round(this.ips),
      appels: info?.render.calls ?? 0,
      triangles: info?.render.triangles ?? 0,
      geometries: info?.memory.geometries ?? 0,
      textures: info?.memory.textures ?? 0,
      programmes: this.renderer?.info.programs?.length ?? 0,
      scenesActives: actives,
      scenesInscrites: this.inscriptions.length,
      dpr: this.taille.dpr,
      suspendu: this.ongletCache || this.contextePerdu,
      premierRenduMs: this.premierRenduMs,
    };

    for (const auditeur of this.auditeursStats) auditeur(stats);
  }
}
