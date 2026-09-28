import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { makeLayout, spreadFor } from "./layout.js";
import { logoPlacement } from "./logo.js";
import { GATHER, MATERIALISE } from "./GoldMark.jsx";

/*
  Champagne-gold grains. Three states, driven by the shared timeline:
    chaos  — scattered rows, like cells in a sheet (on load)
    mark   — gathered onto the DQ logo's strokes (by GATHER seconds)
    halo   — dispersed into a slow-orbiting dust cloud around the solid
             mark once it has materialised
  A soft band of light sweeps the gathered mark. In `still` mode the
  grains sit in the halo state and nothing moves.

  `targets` comes from logo.js (sampled from the logo image). Without
  it the grains gather nowhere and simply drift as rows.
*/

const VERT = /* glsl */ `
  attribute vec3 aChaos;
  attribute vec3 aTarget;
  attribute vec3 aHalo;
  attribute float aSeed;
  attribute float aT;
  attribute float aSize;
  uniform float uProgress;
  uniform float uPhase;
  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uSpread;
  uniform float uScale;
  uniform vec2 uOffset;
  varying float vP;
  varying float vGlow;
  varying float vHalo;

  void main() {
    float p = smoothstep(0.0, 1.0, clamp((uProgress - aSeed * 0.42) / 0.58, 0.0, 1.0));
    vec3 chaos = vec3(aChaos.x * uSpread, aChaos.y, aChaos.z);
    vec3 mark = vec3(aTarget.xy * uScale + uOffset, aTarget.z);

    // halo: orbit slowly round the mark's centre
    float ang = uTime * 0.05 + aSeed * 6.2831;
    vec3 h = aHalo;
    float cx = h.x * cos(ang) - h.z * sin(ang);
    float cz = h.x * sin(ang) + h.z * cos(ang);
    h = vec3(cx, h.y + sin(uTime * 0.6 + aSeed * 9.0) * 0.08, cz);
    vec3 halo = vec3(h.xy * uScale + uOffset, h.z);

    float ph = smoothstep(0.0, 1.0, clamp((uPhase - aSeed * 0.5) / 0.5, 0.0, 1.0));
    vec3 pos = mix(mix(chaos, mark, p), halo, ph);
    pos.y += sin(p * 3.14159) * (0.6 + aSeed * 0.9) * (1.0 - aSeed * 0.5) * (1.0 - ph);

    float drift = 1.0 - p * 0.9;
    pos.x += sin(uTime * 0.5 + aSeed * 6.2831) * 0.09 * drift;
    pos.y += cos(uTime * 0.42 + aSeed * 4.71) * 0.09 * drift;

    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mv;
    float size = aSize * uPixelRatio * (46.0 / -mv.z) * (0.8 + 0.45 * p) * (1.0 - 0.35 * ph);
    gl_PointSize = size;

    vP = p;
    vHalo = ph;
    float wave = fract(aT * 0.85 - uTime * 0.07);
    vGlow = p * (1.0 - ph) * smoothstep(0.22, 0.0, wave);
  }
`;

const FRAG = /* glsl */ `
  precision mediump float;
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  varying float vP;
  varying float vGlow;
  varying float vHalo;

  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    float a = smoothstep(0.5, 0.08, d);
    vec3 col = mix(uColorA, uColorB, clamp(vP * 0.45 + vGlow * 0.7, 0.0, 1.0));
    float alpha = a * (0.22 + 0.08 * vP + 0.16 * vGlow) * (1.0 - 0.6 * vHalo);
    gl_FragColor = vec4(col, alpha);
  }
`;

/* Dust cloud around the mark, in the mark's local units. */
function makeHalo(count, seed = 41) {
  let s = seed;
  const rand = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  const out = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const ang = rand() * Math.PI * 2;
    const r = 0.75 + Math.pow(rand(), 0.6) * 0.55; // ring around the mark's extent
    const rx = 6.4 * r;
    const ry = 3.9 * r;
    out[i * 3] = Math.cos(ang) * rx;
    out[i * 3 + 1] = Math.sin(ang) * ry * (0.7 + rand() * 0.6);
    out[i * 3 + 2] = (rand() - 0.5) * 2.4;
  }
  return out;
}

export default function ParticleField({ count = 9000, targets, place = "hero", timeline, still = false, onFirstFrame }) {
  const framed = useRef(false);
  const { viewport, gl } = useThree();

  const layout = useMemo(() => makeLayout(count), [count]);
  const halo = useMemo(() => makeHalo(count), [count]);
  const hasLogo = !!(targets && targets.targets && targets.targets.length === count * 3);

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(layout.chaos, 3));
    g.setAttribute("aChaos", new THREE.BufferAttribute(layout.chaos, 3));
    g.setAttribute("aTarget", new THREE.BufferAttribute(hasLogo ? targets.targets : layout.chaos, 3));
    g.setAttribute("aHalo", new THREE.BufferAttribute(halo, 3));
    g.setAttribute("aSeed", new THREE.BufferAttribute(layout.seeds, 1));
    g.setAttribute("aT", new THREE.BufferAttribute(hasLogo ? targets.ts : layout.ts, 1));
    g.setAttribute("aSize", new THREE.BufferAttribute(layout.sizes, 1));
    return g;
  }, [layout, halo, targets, hasLogo]);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: FRAG,
        transparent: true,
        depthWrite: false,
        depthTest: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
        uniforms: {
          uProgress: { value: still ? 1 : 0 },
          uPhase: { value: still ? 1 : 0 },
          uTime: { value: 0 },
          uPixelRatio: { value: Math.min(gl.getPixelRatio(), 2) },
          uSpread: { value: 1 },
          uScale: { value: 1 },
          uOffset: { value: new THREE.Vector2(0, 0) },
          uColorA: { value: new THREE.Color("#b39877") },
          uColorB: { value: new THREE.Color("#f6ead0") },
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  useEffect(() => () => { geometry.dispose(); material.dispose(); }, [geometry, material]);

  useFrame((state) => {
    if (!framed.current) {
      framed.current = true;
      if (timeline.current.start == null) timeline.current.start = state.clock.elapsedTime;
      onFirstFrame?.();
    }
    const u = material.uniforms;
    const age = state.clock.elapsedTime - (timeline.current.start ?? state.clock.elapsedTime);
    if (!still) {
      const t = Math.min(1, age / GATHER);
      u.uProgress.value = t * t * (3 - 2 * t);
      u.uPhase.value = Math.min(1, Math.max(0, (age - GATHER - 0.2) / (MATERIALISE + 0.6)));
      u.uTime.value = state.clock.elapsedTime;
    }
    u.uSpread.value = spreadFor(viewport.aspect);
    const pl = logoPlacement(viewport.aspect, place);
    u.uScale.value = pl.scale;
    u.uOffset.value.set(pl.x, pl.y);
  });

  return <points geometry={geometry} material={material} frustumCulled={false} />;
}
