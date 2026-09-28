import { useEffect, useRef } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import * as THREE from "three";
import ParticleField from "./ParticleField.jsx";
import GoldMark from "./GoldMark.jsx";
import Effects from "./Effects.jsx";
import { CAMERA_FOV, CAMERA_Z } from "./layout.js";

/*
  Lazy-loaded WebGL entry point. This file — and three.js with it —
  only downloads when Field.jsx decides the device can run it.

  The canvas is opaque espresso: bloom needs a real background to
  composite against, and the band behind it is the same colour.

  `still` (reduced motion): the finished picture, rendered on demand —
  a handful of frames to settle the environment map, then nothing.
*/

function Settle({ still }) {
  const { invalidate } = useThree();
  useEffect(() => {
    if (!still) return;
    let n = 0;
    let raf = 0;
    const tick = () => { invalidate(); if (++n < 6) raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [still, invalidate]);
  return null;
}

export default function HeroScene({ progress, count, targets, outers, place, still = false, active = true, onReady }) {
  const timeline = useRef({ start: null });
  return (
    <Canvas
      dpr={[1, 1.5]}
      frameloop={still ? "demand" : active ? "always" : "never"}
      camera={{ position: [0, 0, CAMERA_Z], fov: CAMERA_FOV, near: 0.1, far: 60 }}
      gl={{ antialias: false, alpha: false, powerPreference: "high-performance", stencil: false }}
      resize={{ scroll: false, debounce: { scroll: 50, resize: 80 } }}
      onCreated={({ gl, scene }) => {
        gl.setClearColor(0x191209, 1);
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 0.95;
        scene.background = new THREE.Color(0x191209);
      }}
    >
      <directionalLight position={[-4, 6, 8]} intensity={0.7} color="#ffe6c0" />
      <directionalLight position={[6, -2, -4]} intensity={0.4} color="#d8bc8a" />
      {outers && (
        <GoldMark outers={outers} place={place} timeline={timeline} still={still} progress={progress} />
      )}
      <ParticleField count={count} targets={targets} place={place} timeline={timeline} still={still} onFirstFrame={onReady} />
      <Effects />
      <Settle still={still} />
    </Canvas>
  );
}
