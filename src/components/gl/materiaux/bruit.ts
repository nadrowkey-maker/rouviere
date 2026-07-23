/**
 * Le bruit simplex 2D d'Ashima Arts, recopié depuis
 * `references/github/shader-on-scroll/shader/resources/noise.glsl`.
 *
 * Il n'est pas réécrit : les constantes de ce shader sont dérivées à la main
 * (la projection du simplexe, l'anneau de permutation 17×17 choisi proche d'un
 * multiple de 41, le polynôme qui approche `inversesqrt`). Une reformulation
 * « équivalente » donne un autre grain.
 *
 * C'est le grain argentique des images de la fiche — et l'aléa qui fait
 * respirer le fond de la chambre.
 */
export const BRUIT_SIMPLEXE = /* glsl */ `
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec3 permute(vec3 x) { return mod289(((x * 34.0) + 10.0) * x); }

  float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187,
                        0.366025403784439,
                       -0.577350269189626,
                        0.024390243902439);

    vec2 i  = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);

    vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;

    i = mod289(i);
    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0))
                             + i.x + vec3(0.0, i1.x, 1.0));

    vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
    m = m * m;
    m = m * m;

    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;

    m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);

    vec3 g;
    g.x  = a0.x  * x0.x  + h.x  * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }
`;

/** « object-fit: cover » en UV. Même calcul dans les trois effets d'origine. */
export const UV_COUVRANT = /* glsl */ `
  vec2 uvCouvrant(vec2 uv, vec2 plan, vec2 image) {
    vec2 rapport = vec2(
      min((plan.x / plan.y) / (image.x / image.y), 1.0),
      min((plan.y / plan.x) / (image.y / image.x), 1.0)
    );
    return vec2(
      uv.x * rapport.x + (1.0 - rapport.x) * 0.5,
      uv.y * rapport.y + (1.0 - rapport.y) * 0.5
    );
  }
`;
