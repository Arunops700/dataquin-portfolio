import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { buildAttributes, spreadFor } from "./layout.js";
import { PAL } from "./palette.js";

/*
  Champagne-gold grains that tell the hero story with the scroll.

    entrance  rows → written onto the mark left to right → lifted into a
              slow drift of dust along flowing lanes (on a timer, as the page opens)
    beat 1    precision: the drift pulls taut into six dead-straight,
              evenly ruled lines behind the mark, a bright tick running
              along each
    beat 2    data through the mark: the lines are drawn together as they
              pass behind the DQ, racing through it in streaks
    result    they exhale from the strokes into six ribbons of data that
              flow left to right behind the solid mark

  All positions are blended on the GPU from precomputed states
  (layout.js); the rig decides the weights. Grains are depth-tested
  against the opaque mark, so the streams pass behind it.
  In reduced motion they travel straight and eased, only while the reader
  scrolls: no swirl, no swing toward the camera, no streaks.
*/

const VERT = /* glsl */ `
  attribute vec3 aTarget;  // stroke point, mark-local (position = the entrance rows)
  attribute vec2 aOrbit;   // the halo's drift: x = y spread, y = depth
  attribute vec4 aMeta;    // seed, t (0..1 across the mark), size, stroke density comp

  uniform float uTime, uGather, uHalo, uLeave, uCross, uSettle, uSweep, uSpeed, uMotion;
  uniform float uPixelRatio, uSpread, uAspect, uDensity;
  uniform mat4 uMark;      // the mark's world matrix: grains register on the turning solid
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

  void main() {
    float seed = aMeta.x;
    float tx = aMeta.y;

    // per-grain progress: the ranks are the choreography
    float g  = stag(uGather, tx * 0.7 + seed * 0.3, 0.45);   // the mark is written left to right
    float ph = stag(uHalo,   tx * 0.8 + seed * 0.2, 0.50);   // lifts off just behind the solid's reveal
    float lv = stag(uLeave,  fract(seed * 3.7), 0.45);       // beat 1: the drift pulls taut, lane by lane
    float cr = stag(uCross,  tx, 0.40);                      // beat 2: the lines are drawn through the mark
    float st = stag(uSettle, tx, 0.50);                      // result: they loosen into waves

    // the states — every one after the entrance is a line of flowing data
    vec3 C = vec3(position.x * uSpread, position.y, position.z);
    // six lanes behind the mark; a grain loops its lane left to right and
    // fades at the ends
    float k = floor(fract(seed * 7.31) * 6.0);
    float lane = (k - 2.5) * 0.62;
    float z0 = -1.5 - 0.22 * k;
    float jit = (fract(seed * 91.7) - 0.5) * 0.06;
    float u = fract(fract(seed * 53.7) + uTime * (0.016 + 0.004 * k));
    float sx = (u - 0.5) * 10.0;
    float wav = 0.42 * sin(sx * 0.45 + k * 1.1 + uTime * 0.25);
    float edge = smoothstep(0.0, 0.14, u) * (1.0 - smoothstep(0.86, 1.0, u));
    // opening: loose dust drifting along the lanes
    vec3 h = vec3(sx * 1.05, lane * 1.25 + wav * 0.8 + (aOrbit.x - 1.0) * 0.9, aOrbit.y - 0.6);
    // beat 1, precision: dead-straight, evenly ruled lines
    vec3 pr = vec3(sx, lane, z0);
    // beat 2, data through the mark: the lanes pinch together behind the DQ
    float pin = exp(-sx * sx / 2.6);                         // 1 at the mark, 0 away from it
    vec3 pc = vec3(sx, lane * mix(1.0, 0.12, pin) + jit, mix(z0, -0.7, pin));
    // result: the lines loosen into slow waves
    vec3 rl = vec3(sx, lane + wav + jit, z0);

    vec3 M = (uMark * vec4(aTarget, 1.0)).xyz;
    vec3 H = (uMark * vec4(h, 1.0)).xyz;
    vec3 P = (uMark * vec4(pr, 1.0)).xyz;
    vec3 B = (uMark * vec4(pc, 1.0)).xyz;
    vec3 R = (uMark * vec4(rl, 1.0)).xyz;

    // the entrance carries each grain to whatever state the story asks for now
    vec3 story = mix(mix(M, H, ph), P, lv);
    story = mix(story, B, cr);
    story = mix(story, R, st);
    vec3 pos = mix(C, story, g);

    // in flight only: a swirl and a swing toward the camera (off in reduced motion)
    float gf = 4.0 * g * (1.0 - g);
    float fl = min(1.0, gf + 4.0 * lv * (1.0 - lv) + 4.0 * cr * (1.0 - cr) + 4.0 * st * (1.0 - st));
    pos += swirl(pos * 0.35 + seed * 7.0 + uTime * 0.04) * 0.45 * fl * uMotion;
    pos.z += 0.9 * fl * uMotion;
    float drift = 1.0 - g * 0.9;                             // the rows' own drift
    pos.x += sin(uTime * 0.5 + seed * 6.2831) * 0.09 * drift;
    pos.y += cos(uTime * 0.42 + seed * 4.71) * 0.09 * drift;

    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mv;

    // streaks: along the gather, then along the flow — longest where the
    // lines race through the mark in beat 2
    float rush = cr * (1.0 - st) * pin;
    vec3 flowDir = (uMark * vec4(1.0, 0.0, 0.0, 0.0)).xyz;
    vec3 dir3 = mix(story - C, flowDir, step(0.5, g * max(ph, max(lv, max(cr, st)))));
    vec4 p2 = projectionMatrix * modelViewMatrix * vec4(pos + normalize(dir3 + 1e-5) * 0.05, 1.0);
    vec2 d2 = (p2.xy / p2.w - gl_Position.xy / gl_Position.w) * vec2(uAspect, 1.0);
    vDir = normalize(d2 + vec2(1e-6, 0.0));
    vStretch = 1.0 + 1.2 * clamp(max(rush * (0.6 + uSpeed), 0.5 * gf * (0.35 + uSpeed)), 0.0, 1.0) * uMotion;   // up to 2.2

    // the look
    float onMark  = g * (1.0 - ph) * (1.0 - lv);
    float onRule  = g * lv * (1.0 - cr) * (1.0 - st);
    float onPinch = g * cr * (1.0 - st);
    float onWave  = g * st;
    float haloW   = ph * (1.0 - lv) * (1.0 - cr) * (1.0 - st);

    float px = aMeta.z * uPixelRatio * (46.0 / -mv.z)
             * (0.8 + 0.45 * onMark - 0.2 * onWave - 0.15 * onRule - 0.1 * onPinch) * (1.0 - 0.35 * haloW);
    float comp = clamp(px / 1.4, 0.3, 1.0);                  // sub-pixel grains fade instead of shimmering
    px = max(px, 1.4);
    gl_PointSize = px * vStretch;

    float wave  = fract(tx * 0.85 - uTime * 0.07);
    float sweep = fall(0.0, 0.16, abs(tx - uSweep));
    float scan  = fall(0.0, 0.05, abs(u - fract(uTime * 0.09 + k * 0.17)));   // a bright tick runs each ruled line
    vGlow = onMark * fall(0.0, 0.22, wave)
          + onRule * scan * 0.8
          + onPinch * pin * (0.3 + 0.5 * uSpeed)
          + onWave * sweep;
    vMark = onMark;

    vec2 ndc = gl_Position.xy / gl_Position.w;
    float inLane = uLane.w * fall(uLane.x - uLane.z, uLane.x + uLane.z, ndc.x)
                           * fall(uLane.y - uLane.z, uLane.y + uLane.z, ndc.y);

    vAlpha = (0.22 + 0.08 * onMark + 0.16 * vGlow)
           * mix(1.0, aMeta.w, onMark)                       // dense strokes do not burn to white
           * (1.0 - 0.6 * haloW)                             // the halo is dust, not a cloud
           * mix(1.0, 0.8, onWave)
           * mix(1.0, edge, max(max(onWave, haloW), max(onRule, onPinch)))   // no pop where a lane loops
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
    g.setAttribute("aOrbit", new THREE.BufferAttribute(attrs.orbit, 2));
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
          uLeave: { value: 0 }, uCross: { value: 0 }, uSettle: { value: 0 },
          uSweep: { value: -1 }, uSpeed: { value: 0 },
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
    const w = r.w;
    const u = material.uniforms;
    u.uTime.value = r.t;
    u.uGather.value = r.gather;
    u.uHalo.value = r.halo;
    u.uLeave.value = w.leave;
    u.uCross.value = w.cross;
    u.uSettle.value = w.settle;
    u.uSweep.value = r.sweep;
    u.uSpeed.value = r.speed;
    u.uMotion.value = r.motion;
    u.uMark.value.copy(r.mark.matrix);
    u.uLane.value.copy(r.lane);
    u.uPixelRatio.value = state.viewport.dpr;
    u.uAspect.value = state.size.width / Math.max(1, state.size.height);   // the canvas's, for screen directions
    u.uSpread.value = spreadFor(r.aspect);                                   // the composed window's
  });

  return <points geometry={geometry} material={material} frustumCulled={false} renderOrder={1} />;
}
