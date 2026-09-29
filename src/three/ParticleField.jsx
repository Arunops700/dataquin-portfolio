import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { buildAttributes, spreadFor } from "./layout.js";
import { PAL } from "./palette.js";

/*
  Champagne-gold grains that tell the hero story with the scroll.

    entrance  rows → written onto the mark left to right → lifted into a
              slow dust halo (on a timer, as the page opens)
    problem   the halo drains into a ledger sheet lying in front of the
              receding mark: ruled rows, figures typed cell by cell,
              wiped and typed again
    build     the sheet empties row by row; the grains lift off the page,
              funnel through one bridge and are absorbed into the metal.
              A tenth keep streaming while the beat holds.
    result    they exhale from the strokes into four ruled orbit rings
              that pass behind the solid mark

  All positions are blended on the GPU from precomputed states
  (layout.js); the rig decides the weights. Grains are depth-tested
  against the opaque mark, so the rings and the rear halo pass behind it.
  In reduced motion they travel straight and eased, only while the reader
  scrolls: no swirl, no swing toward the camera, no streaks.
*/

const VERT = /* glsl */ `
  attribute vec3 aTarget;  // stroke point, mark-local (position = the entrance rows)
  attribute vec4 aOrbit;   // angle, radius, y squash, z (mark-local)
  attribute vec4 aCell;    // sheet u, v in -0.5..0.5; reading order 0..1; 1 on a rule
  attribute vec4 aMeta;    // seed, t (0..1 across the mark), size, stroke density comp

  uniform float uTime, uGather, uHalo, uLeave, uCross, uLoop, uSettle, uSweep, uSpeed, uTyping, uClear, uMotion;
  uniform float uPixelRatio, uSpread, uAspect, uDensity;
  uniform mat4 uMark;      // the mark's world matrix: grains register on the turning solid
  uniform mat4 uSheet;     // the ledger sheet's placement
  uniform vec3 uThroat;    // the bridge's throat, world
  uniform vec3 uLift;      // off the page, world
  uniform vec4 uLane;      // copy lane: ndc x edge, ndc y edge, feather, strength

  varying float vMark;
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
  vec3 bez(vec3 a, vec3 b, vec3 c, vec3 d, float t) { float u = 1.0 - t; return u*u*u*a + 3.0*u*u*t*b + 3.0*u*t*t*c + t*t*t*d; }
  vec3 bezT(vec3 a, vec3 b, vec3 c, vec3 d, float t) { float u = 1.0 - t; return 3.0*u*u*(b-a) + 6.0*u*t*(c-b) + 3.0*t*t*(d-c); }

  void main() {
    float seed = aMeta.x;
    float tx = aMeta.y;

    // per-grain progress: the ranks are the choreography
    float g  = stag(uGather, tx * 0.7 + seed * 0.3, 0.45);   // the mark is written left to right
    float ph = stag(uHalo,   tx * 0.8 + seed * 0.2, 0.50);   // lifts off just behind the solid's reveal
    float lv = stag(uLeave,  aCell.z, 0.45);                 // the sheet fills top row first
    float cr = stag(uCross,  aCell.z, 0.30);                 // ...and empties in reading order
    float st = stag(uSettle, tx, 0.50);                      // the rings form left to right
    float loopW = uLoop * step(seed, 0.10);                  // a tenth keep cycling the bridge
    float lc = fract(uTime * 0.11 + seed * 10.0);
    float c = mix(cr, lc, loopW);
    float loopFade = mix(1.0, smoothstep(0.0, 0.08, lc) * fall(0.9, 1.0, lc), loopW);   // no pop on the wrap

    // the states
    vec3 C = vec3(position.x * uSpread, position.y, position.z);
    float a0 = uTime * 0.05 + seed * 6.2831;                 // halo: a slow torus about the mark's Y
    vec3 h = vec3(cos(aOrbit.x) * 6.4 * aOrbit.y, sin(aOrbit.x) * 3.9 * aOrbit.y * aOrbit.z, aOrbit.w);
    h = vec3(h.x * cos(a0) - h.z * sin(a0), h.y + sin(uTime * 0.6 + seed * 9.0) * 0.08, h.x * sin(a0) + h.z * cos(a0));
    // rings: four ruled lanes, evenly spaced, turning in alternate
    // directions; tipped toward the viewer so the near arc passes in front
    // of the mark (below its centre) and the far arc behind it
    float k = floor(fract(seed * 7.31) * 4.0);
    float rr = (1.0 + 0.12 * k) * (1.0 + (fract(seed * 91.7) - 0.5) * 0.012);
    float ra = aOrbit.x + uTime * 0.018 * (1.0 + 0.15 * k) * (mod(k, 2.0) * 2.0 - 1.0);
    float tau = 0.55 + 0.04 * k;
    vec3 rl = vec3(cos(ra) * 3.3 * rr, -sin(ra) * 2.0 * rr * sin(tau), sin(ra) * 2.0 * rr * cos(tau));

    vec3 M = (uMark * vec4(aTarget, 1.0)).xyz;
    vec3 H = (uMark * vec4(h, 1.0)).xyz;
    vec3 R = (uMark * vec4(rl, 1.0)).xyz;
    vec3 S = (uSheet * vec4(aCell.xy, 0.0, 1.0)).xyz;
    vec3 K1 = S + uLift;
    vec3 K2 = uThroat + (vec3(fract(seed * 13.1), fract(seed * 29.7), fract(seed * 47.3)) - 0.5) * 0.7;
    vec3 bridge = bez(S, K1, K2, M, c);

    // the entrance carries each grain to whatever state the story asks for now
    vec3 story = mix(mix(M, H, ph), bridge, lv);
    story = mix(story, R, st);
    vec3 pos = mix(C, story, g);

    // in flight only: a swirl and a swing toward the camera (off in reduced motion)
    float gf = 4.0 * g * (1.0 - g);
    float fl = min(1.0, gf + 4.0 * lv * (1.0 - lv) * (1.0 - c) + 4.0 * st * (1.0 - st));
    float fb = 4.0 * c * (1.0 - c) * lv;
    pos += swirl(pos * 0.35 + seed * 7.0 + uTime * 0.04) * (0.45 * fl + 0.18 * fb) * uMotion;
    pos.z += 0.9 * fl * uMotion;
    float drift = 1.0 - g * 0.9;                             // the rows' own drift
    pos.x += sin(uTime * 0.5 + seed * 6.2831) * 0.09 * drift;
    pos.y += cos(uTime * 0.42 + seed * 4.71) * 0.09 * drift;

    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mv;

    // streaks only where the direction of travel is known: the bridge and the gather
    vec3 dir3 = fb > 0.001 ? bezT(S, K1, K2, M, c) : (story - C);
    vec4 p2 = projectionMatrix * modelViewMatrix * vec4(pos + normalize(dir3 + 1e-5) * 0.05, 1.0);
    vec2 d2 = (p2.xy / p2.w - gl_Position.xy / gl_Position.w) * vec2(uAspect, 1.0);
    vDir = normalize(d2 + vec2(1e-6, 0.0));
    vStretch = 1.0 + 1.2 * clamp(max(fb, 0.5 * gf) * (0.35 + uSpeed), 0.0, 1.0) * uMotion;   // up to 2.2

    // the look
    float onMark  = g * max((1.0 - ph) * (1.0 - lv), c * (1.0 - st) * lv);
    float onSheet = g * lv * (1.0 - c);
    float onRing  = g * st;
    float haloW   = ph * (1.0 - lv) * (1.0 - st);
    float typed   = step(aCell.z, uTyping) * step(uClear, aCell.z);            // written, not yet wiped
    float cursor  = fall(0.0, 0.012, abs(aCell.z - uTyping)) * (1.0 - aCell.w) * step(uTyping, 0.999);   // one lit cell, no blink
    float sheetA  = mix(mix(0.12, 0.6, typed), 0.55, aCell.w);                   // empty cells faint, rules even

    float px = aMeta.z * uPixelRatio * (46.0 / -mv.z)
             * (0.8 + 0.45 * onMark - 0.2 * onRing - 0.1 * onSheet) * (1.0 - 0.35 * haloW);
    float comp = clamp(px / 1.4, 0.3, 1.0);                  // sub-pixel grains fade instead of shimmering
    px = max(px, 1.4);
    gl_PointSize = px * vStretch;

    float wave  = fract(tx * 0.85 - uTime * 0.07);
    float sweep = fall(0.0, 0.16, abs(tx - uSweep));
    vGlow = onMark * (1.0 - lv) * fall(0.0, 0.22, wave)
          + onSheet * cursor
          + fb * (0.25 + 0.5 * uSpeed)
          + onRing * sweep;
    vMark = onMark;

    vec2 ndc = gl_Position.xy / gl_Position.w;
    float inLane = uLane.w * fall(uLane.x - uLane.z, uLane.x + uLane.z, ndc.x)
                           * fall(uLane.y - uLane.z, uLane.y + uLane.z, ndc.y);

    vAlpha = (0.22 + 0.08 * onMark + 0.16 * vGlow)
           * mix(1.0, aMeta.w, onMark)                       // dense strokes do not burn to white
           * mix(1.0, sheetA, onSheet)
           * (1.0 - 0.6 * haloW)                             // the halo is dust, not a cloud
           * mix(1.0, 0.8, onRing)
           * loopFade * (1.0 - inLane)
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
  varying float vMark;
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
    vec3 col = mix(uColorA, uColorB, clamp(vMark * 0.45 + vGlow * 0.7, 0.0, 1.0));
    gl_FragColor = vec4(col, a * vAlpha);
    #include <colorspace_fragment>
  }
`;

export default function ParticleField({ count, targets, rig, tier, onFirstFrame }) {
  const framed = useRef(false);
  const attrs = useMemo(() => buildAttributes(count, targets), [count, targets]);

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(attrs.rows, 3));
    g.setAttribute("aTarget", new THREE.BufferAttribute(attrs.target, 3));
    g.setAttribute("aOrbit", new THREE.BufferAttribute(attrs.orbit, 4));
    g.setAttribute("aCell", new THREE.BufferAttribute(attrs.cell, 4));
    g.setAttribute("aMeta", new THREE.BufferAttribute(attrs.meta, 4));
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
          uTime: { value: 0 }, uGather: { value: 0 }, uHalo: { value: 0 },
          uLeave: { value: 0 }, uCross: { value: 0 }, uLoop: { value: 0 }, uSettle: { value: 0 },
          uSweep: { value: -1 }, uSpeed: { value: 0 }, uTyping: { value: 0 }, uClear: { value: 0 },
          uMotion: { value: 1 }, uPixelRatio: { value: 1 }, uSpread: { value: 1 }, uAspect: { value: 1 },
          uDensity: { value: 1 },
          uMark: { value: new THREE.Matrix4() },
          uSheet: { value: new THREE.Matrix4() },
          uThroat: { value: new THREE.Vector3() },
          uLift: { value: new THREE.Vector3() },
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
    const w = r.w;
    const u = material.uniforms;
    u.uTime.value = r.t;
    u.uGather.value = r.gather;
    u.uHalo.value = r.halo;
    u.uLeave.value = w.leave;
    u.uCross.value = w.cross;
    u.uLoop.value = w.loop;
    u.uSettle.value = w.settle;
    u.uSweep.value = r.sweep;
    u.uSpeed.value = r.speed;
    u.uTyping.value = r.typing;
    u.uClear.value = r.clear;
    u.uMotion.value = r.motion;
    u.uMark.value.copy(r.mark.matrix);
    u.uSheet.value.copy(r.sheet);
    u.uThroat.value.copy(r.throat);
    u.uLift.value.copy(r.lift);
    u.uLane.value.copy(r.lane);
    u.uPixelRatio.value = state.viewport.dpr;
    u.uAspect.value = state.size.width / Math.max(1, state.size.height);   // the canvas's, for screen directions
    u.uSpread.value = spreadFor(r.aspect);                                   // the composed window's
  });

  return <points geometry={geometry} material={material} frustumCulled={false} renderOrder={1} />;
}
