import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { buildAttributes, spreadFor } from "./layout.js";
import { PAL } from "./palette.js";

/*
  Champagne-gold grains. As the page opens they gather from their rows
  (a tilted sheet of cells) into six ribbons of data that flow left to
  right behind the solid mark; then they flow. All positions are computed
  on the GPU from each grain's seed; the rig sets the gather and the
  clock. Grains are depth-tested against the opaque mark, so the streams
  pass behind it. In reduced motion the clock is frozen on a finished
  frame: no swirl, no swing toward the camera, no streaks.
*/

const VERT = /* glsl */ `
  attribute vec3 aMeta;    // seed, t (0..1 across the rows), size

  uniform float uTime, uGather, uSweep, uMotion;
  uniform float uPixelRatio, uSpread, uAspect, uDensity;
  uniform mat4 uMark;      // the mark's world matrix: the streams flow behind the turning solid
  uniform vec4 uLane;      // copy lane: ndc x edge, ndc y edge, feather, strength

  varying float vGlow;
  varying float vAlpha;
  varying vec2 vDir;
  varying float vStretch;

  float ease(float t) { return t * t * t * (t * (t * 6.0 - 15.0) + 10.0); }   // smootherstep
  float stag(float w, float rank, float win) { return ease(clamp((w - rank * (1.0 - win)) / win, 0.0, 1.0)); }
  float fall(float lo, float hi, float x) { return 1.0 - smoothstep(lo, hi, x); }   // 1 below lo, 0 above hi
  vec3 swirl(vec3 p) {   // a cheap curl-like field: rotational, no texture
    return vec3(
      sin(p.y * 1.7 + 1.3) * cos(p.z * 1.1) - sin(p.z * 1.3 + 0.7) * cos(p.y * 0.9),
      sin(p.z * 1.5 + 2.1) * cos(p.x * 1.2) - sin(p.x * 1.1 + 0.4) * cos(p.z * 1.4),
      sin(p.x * 1.3 + 0.2) * cos(p.y * 1.6) - sin(p.y * 1.2 + 1.9) * cos(p.x * 0.8));
  }

  void main() {
    float seed = aMeta.x;
    float tx = aMeta.y;

    // the gather sweeps across the rows, each grain on its own rank
    float g = stag(uGather, tx * 0.7 + seed * 0.3, 0.45);

    vec3 C = vec3(position.x * uSpread, position.y, position.z);
    // six lanes behind the mark; a grain loops its lane left to right,
    // riding a slow wave, and fades at the ends
    float k = floor(fract(seed * 7.31) * 6.0);
    float lane = (k - 2.5) * 0.62;
    float z0 = -1.5 - 0.22 * k;
    float jit = (fract(seed * 91.7) - 0.5) * 0.06;
    float u = fract(fract(seed * 53.7) + uTime * (0.016 + 0.004 * k));
    float sx = (u - 0.5) * 10.0;
    float wav = 0.42 * sin(sx * 0.45 + k * 1.1 + uTime * 0.25);
    float edge = smoothstep(0.0, 0.14, u) * (1.0 - smoothstep(0.86, 1.0, u));
    vec3 R = (uMark * vec4(sx, lane + wav + jit, z0, 1.0)).xyz;

    vec3 pos = mix(C, R, g);

    // in flight only: a swirl and a swing toward the camera (off in reduced motion)
    float gf = 4.0 * g * (1.0 - g);
    pos += swirl(pos * 0.35 + seed * 7.0 + uTime * 0.04) * 0.45 * gf * uMotion;
    pos.z += 0.9 * gf * uMotion;
    float drift = 1.0 - g * 0.9;                             // the rows' own drift
    pos.x += sin(uTime * 0.5 + seed * 6.2831) * 0.09 * drift;
    pos.y += cos(uTime * 0.42 + seed * 4.71) * 0.09 * drift;

    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mv;

    // streaks along the gather, then along the flow
    vec3 flowDir = (uMark * vec4(1.0, 0.0, 0.0, 0.0)).xyz;
    vec3 dir3 = mix(R - C, flowDir, step(0.5, g));
    vec4 p2 = projectionMatrix * modelViewMatrix * vec4(pos + normalize(dir3 + 1e-5) * 0.05, 1.0);
    vec2 d2 = (p2.xy / p2.w - gl_Position.xy / gl_Position.w) * vec2(uAspect, 1.0);
    vDir = normalize(d2 + vec2(1e-6, 0.0));
    vStretch = 1.0 + 0.21 * gf * uMotion;

    float px = aMeta.z * uPixelRatio * (46.0 / -mv.z) * (0.8 - 0.2 * g);
    float comp = clamp(px / 1.4, 0.3, 1.0);                  // sub-pixel grains fade instead of shimmering
    px = max(px, 1.4);
    gl_PointSize = px * vStretch;

    // the idle glint picks out a band of grains as it passes
    vGlow = g * fall(0.0, 0.16, abs(tx - uSweep));

    vec2 ndc = gl_Position.xy / gl_Position.w;
    float inLane = uLane.w * fall(uLane.x - uLane.z, uLane.x + uLane.z, ndc.x)
                           * fall(uLane.y - uLane.z, uLane.y + uLane.z, ndc.y);

    vAlpha = (0.22 + 0.16 * vGlow)
           * mix(1.0, 0.8, g)
           * mix(1.0, edge, g)                               // no pop where a lane loops
           * (1.0 - inLane)
           * uDensity * comp / mix(1.0, vStretch, 0.5);      // a streak spreads the same light
  }
`;

// Only the colours cross into the fragment stage; everything else reaches
// it through varyings (a uniform shared by both stages must agree on
// precision). colorspace_fragment is a no-op into the composer's linear
// target and converts to sRGB on the lite path's direct canvas.
const FRAG = /* glsl */ `
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  varying float vGlow;
  varying float vAlpha;
  varying vec2 vDir;
  varying float vStretch;

  void main() {
    vec2 c = gl_PointCoord - 0.5;
    vec2 dir = vec2(vDir.x, -vDir.y);                        // gl_PointCoord runs top-down
    vec2 q = vec2(dot(c, dir), dot(c, vec2(-dir.y, dir.x)) * vStretch);
    float a = 1.0 - smoothstep(0.06, 0.5, length(q));
    a *= mix(1.0, 0.6 + 0.4 * smoothstep(-0.5, 0.35, q.x), step(1.05, vStretch));   // bright head, soft tail
    vec3 col = mix(uColorA, uColorB, clamp(vGlow * 0.7, 0.0, 1.0));
    gl_FragColor = vec4(col, a * vAlpha);
    #include <colorspace_fragment>
  }
`;

export default function ParticleField({ count, rig, tier, onFirstFrame }) {
  const framed = useRef(false);
  const attrs = useMemo(() => buildAttributes(count), [count]);

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(attrs.rows, 3));
    g.setAttribute("aMeta", new THREE.BufferAttribute(attrs.meta, 3));
    return g;
  }, [attrs]);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: FRAG,
        transparent: true,
        depthWrite: false,
        depthTest: true,
        blending: THREE.AdditiveBlending,
        // additive light is summed before tone mapping: the composer's
        // output pass tone-maps the frame; the lite path shows it as is
        toneMapped: false,
        uniforms: {
          uTime: { value: 0 }, uGather: { value: 0 }, uSweep: { value: -1 },
          uMotion: { value: 1 }, uPixelRatio: { value: 1 }, uSpread: { value: 1 }, uAspect: { value: 1 },
          uDensity: { value: 1 },
          uMark: { value: new THREE.Matrix4() },
          uLane: { value: new THREE.Vector4(2, 2, 0.12, 0) },
          uColorA: { value: new THREE.Color(PAL.goldSoft) },
          uColorB: { value: new THREE.Color(PAL.champagneHi) },
        },
      }),
    []
  );

  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => material.dispose(), [material]);

  // a tier draws a prefix of the grains (every prefix is a uniform sample)
  // and brightens them to keep the same light
  useEffect(() => {
    geometry.setDrawRange(0, Math.round(count * tier.grains));
    material.uniforms.uDensity.value = Math.min(1.35, Math.sqrt(1 / tier.grains) * 0.9 + 0.1) * (tier.lite ? 1.15 : 1);
  }, [geometry, material, count, tier]);

  useFrame((state) => {
    if (!framed.current) {
      framed.current = true;
      onFirstFrame?.();
    }
    const r = rig.current;
    const u = material.uniforms;
    u.uTime.value = r.t;
    u.uGather.value = r.gather;
    u.uSweep.value = r.sweep;
    u.uMotion.value = r.motion;
    u.uMark.value.copy(r.mark.matrix);
    u.uLane.value.copy(r.lane);
    u.uPixelRatio.value = state.viewport.dpr;
    u.uAspect.value = state.size.width / Math.max(1, state.size.height);   // the canvas's, for screen directions
    u.uSpread.value = spreadFor(r.aspect);                                   // the composed window's
  });

  return <points geometry={geometry} material={material} frustumCulled={false} renderOrder={1} />;
}
