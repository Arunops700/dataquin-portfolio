import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { makeLayout, spreadFor } from "./layout.js";
import { isCoarsePointer } from "../motion/prefs.js";

/*
  The signature scene: champagne-gold points that begin as scattered
  rows and, as `progress` runs 0 → 1, pour into one stream that
  converges on a single bright point. A slow glow travels the stream
  once it has formed. Pointer parallax tilts the whole field a little.

  `progress` is a framer-motion MotionValue (read with .get() every
  frame, never subscribed — no React re-renders on scroll). In
  `ambient` mode the field sits fully formed and just breathes.
*/

const VERT = /* glsl */ `
  attribute vec3 aChaos;
  attribute vec3 aStream;
  attribute float aSeed;
  attribute float aT;
  attribute float aSize;
  uniform float uProgress;
  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uSpread;
  varying float vP;
  varying float vGlow;
  varying float vT;

  void main() {
    // staggered arrival: each point starts its journey at a different moment
    float p = smoothstep(0.0, 1.0, clamp((uProgress - aSeed * 0.42) / 0.58, 0.0, 1.0));
    vec3 pos = mix(aChaos, aStream, p);
    pos.x *= uSpread;

    float drift = 1.0 - p * 0.78;
    pos.x += sin(uTime * 0.5 + aSeed * 6.2831) * 0.09 * drift;
    pos.y += cos(uTime * 0.42 + aSeed * 4.71) * 0.09 * drift
           + sin(uTime * 0.9 + aT * 14.0) * 0.028 * p;

    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = aSize * uPixelRatio * (36.0 / -mv.z) * (0.85 + 0.55 * p);

    vP = p;
    vT = aT;
    float wave = fract(aT - uTime * 0.085);
    vGlow = p * smoothstep(0.14, 0.0, wave);
  }
`;

const FRAG = /* glsl */ `
  precision mediump float;
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  varying float vP;
  varying float vGlow;
  varying float vT;

  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    float a = smoothstep(0.5, 0.1, d);
    vec3 col = mix(uColorA, uColorB, clamp(vP * 0.55 + vGlow + vT * vP * 0.45, 0.0, 1.0));
    float alpha = a * (0.32 + 0.42 * vP + 0.55 * vGlow);
    gl_FragColor = vec4(col, alpha);
  }
`;

export default function ParticleField({ progress, count = 9000, ambient = false, onFirstFrame }) {
  const pointsRef = useRef(null);
  const groupRef = useRef(null);
  const mouse = useRef({ x: 0, y: 0 });
  const current = useRef(ambient ? 1 : 0);
  const framed = useRef(false);
  const { viewport, gl } = useThree();

  const layout = useMemo(() => makeLayout(count), [count]);

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(layout.chaos, 3));
    g.setAttribute("aChaos", new THREE.BufferAttribute(layout.chaos, 3));
    g.setAttribute("aStream", new THREE.BufferAttribute(layout.stream, 3));
    g.setAttribute("aSeed", new THREE.BufferAttribute(layout.seeds, 1));
    g.setAttribute("aT", new THREE.BufferAttribute(layout.ts, 1));
    g.setAttribute("aSize", new THREE.BufferAttribute(layout.sizes, 1));
    return g;
  }, [layout]);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: FRAG,
        transparent: true,
        depthWrite: false,
        depthTest: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uProgress: { value: ambient ? 1 : 0 },
          uTime: { value: 0 },
          uPixelRatio: { value: Math.min(gl.getPixelRatio(), 2) },
          uSpread: { value: 1 },
          uColorA: { value: new THREE.Color("#b39877") },
          uColorB: { value: new THREE.Color("#f6ead0") },
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  useEffect(() => () => { geometry.dispose(); material.dispose(); }, [geometry, material]);

  // Pointer parallax from the window, not the canvas — hero copy sits
  // above the canvas and would otherwise swallow the events.
  useEffect(() => {
    if (isCoarsePointer()) return;
    const onMove = (e) => {
      mouse.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  useFrame((state, dt) => {
    // The fade-in waits for a drawn frame, never for a blank canvas.
    if (!framed.current) {
      framed.current = true;
      onFirstFrame?.();
    }
    const u = material.uniforms;
    const target = ambient ? 1 : progress ? progress.get() : 0;
    const k = Math.min(1, dt * 3.2);
    current.current += (target - current.current) * k;
    u.uProgress.value = current.current;
    u.uTime.value = state.clock.elapsedTime * (ambient ? 0.7 : 1);
    u.uSpread.value = spreadFor(viewport.aspect);

    const g = groupRef.current;
    if (g) {
      const tx = -mouse.current.y * 0.07;
      const ty = mouse.current.x * 0.11;
      g.rotation.x += (tx - g.rotation.x) * Math.min(1, dt * 2.5);
      g.rotation.y += (ty - g.rotation.y) * Math.min(1, dt * 2.5);
    }
  });

  return (
    <group ref={groupRef}>
      <points ref={pointsRef} geometry={geometry} material={material} frustumCulled={false} />
    </group>
  );
}
