/**
 * Hasard à graine.
 *
 * Repris tel quel de `gsap-wind-blown-text` (`sfc32` + `seededRandom`), et
 * gardé tel quel volontairement : c'est ce générateur qui rend une animation
 * de dispersion **reproductible**. Au redimensionnement, le moteur du souffle
 * re-mesure les lettres et reconstruit sa timeline ; s'il tirait ses valeurs de
 * `Math.random`, chaque lettre repartirait dans une autre direction et le
 * manifeste changerait de forme sous les yeux du visiteur. Avec la même graine,
 * il se reconstruit à l'identique.
 *
 * Deux étages, comme à la source : `splitmix32` étale la graine en quatre mots
 * d'état, `sfc32` produit la suite. Le préchauffage de douze tirages mélange
 * l'état avant la première valeur utile.
 */

/** Générateur sfc32 : quatre mots d'état, une valeur dans [0, 1). */
function sfc32(
  a: number,
  b: number,
  c: number,
  d: number,
): () => number {
  return function () {
    a |= 0;
    b |= 0;
    c |= 0;
    d |= 0;
    const t = (((a + b) | 0) + d) | 0;
    d = (d + 1) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    c = (c + t) | 0;
    return (t >>> 0) / 4294967296;
  };
}

/** Une suite de nombres dans [0, 1), identique pour une graine identique. */
export function aleatoireAGraine(graine: number): () => number {
  let s = graine >>> 0;

  const splitmix32 = () => {
    s = (s + 0x9e3779b9) | 0;
    let t = s ^ (s >>> 16);
    t = Math.imul(t, 0x21f0aaad);
    t = t ^ (t >>> 15);
    t = Math.imul(t, 0x735a2d97);
    return (t ^ (t >>> 15)) >>> 0;
  };

  const tirer = sfc32(splitmix32(), splitmix32(), splitmix32(), splitmix32());
  for (let i = 0; i < 12; i += 1) tirer();
  return tirer;
}
