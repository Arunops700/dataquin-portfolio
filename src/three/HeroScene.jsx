import { useCallback, useEffect, useRef, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import * as THREE from "three";
import ParticleField from "./ParticleField.jsx";
import GoldMark from "./GoldMark.jsx";
import Effects from "./Effects.jsx";
import { StoryRig, createRig } from "./rig.js";
import { TIERS, Governor, dprRange, initialTierIndex, nextTier } from "./quality.js";
import { groundFor } from "./studio.js";
import { CAMERA_FOV, CAMERA_Z } from "./shared.js";
import { PAL } from "./palette.js";

/*
  Lazy-loaded WebGL entry point. This file — and three.js with it — only
  downloads when Field.jsx decides the device can run it.

  Two render paths, fixed when the canvas is created:
  - composer (desktop): an opaque canvas whose ground is pre-compensated
    for the tone mapping, so it renders as the band's exact espresso;
    bloom and tone mapping in Effects.
  - lite (touch devices, the Work band): a transparent canvas over the
    CSS ground, native antialiasing, no post-processing.

  Frameloop: "always" while on screen, "never" off it. Reduced motion
  (`still`): "demand" — a few frames to settle the lighting, then one
  frame per scroll step (the rig asks), nothing at rest.
*/

const EXPOSURE = 0.95;   // ACES, as approved for the gold
const COMPOSER_GL = { antialias: false, alpha: false, powerPreference: "default", stencil: false };
const LITE_GL = { antialias: true, alpha: true, powerPreference: "default", stencil: false };
const CAMERA = { position: [0, 0, CAMERA_Z], fov: CAMERA_FOV, near: 0.1, far: 60 };
const RESIZE = { scroll: false, debounce: { scroll: 50, resize: 80 } };
const INERT = { pointerEvents: "none" };   // decoration: the page keeps every pointer event

function Settle({ still }) {
  const invalidate = useThree((s) => s.invalidate);
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

export default function HeroScene({ place, settled, progress, yaw, count, targets, outers, still, active, box, win, onReady, onLost }) {
  const [tierIdx, setTierIdx] = useState(() => initialTierIndex(place));
  const tier = TIERS[tierIdx];
  const lite = !!tier.lite;
  const rig = useRef(null);
  if (!rig.current) rig.current = createRig();
  const stepDown = useCallback(() => setTierIdx(nextTier), []);

  // R3F forces a context loss when it tears the canvas down on unmount;
  // only a loss while mounted is a failure
  const alive = useRef(true);
  const lost = useRef(onLost);
  lost.current = onLost;
  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; };
  }, []);

  return (
    <Canvas
      dpr={dprRange(tier, place, box)}
      frameloop={!active ? "never" : still ? "demand" : "always"}
      camera={CAMERA}
      gl={lite ? LITE_GL : COMPOSER_GL}
      resize={RESIZE}
      style={INERT}
      onCreated={({ gl, scene }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = EXPOSURE;
        if (lite) {
          gl.setClearColor(0x000000, 0);
          scene.background = null;
        } else {
          const ground = groundFor(PAL.esp, EXPOSURE);
          gl.setClearColor(ground, 1);
          scene.background = ground;
        }
        gl.domElement.addEventListener(
          "webglcontextlost",
          () => { if (alive.current) lost.current?.(); },
          { once: true }
        );
        // a program that fails to compile draws nothing, silently: the
        // poster is better than a mark without its grains or metal
        gl.debug.onShaderError = (ctx, program, vs, fs) => {
          console.error(
            "3D scene disabled: shader error",
            ctx.getProgramInfoLog(program),
            ctx.getShaderInfoLog(vs),
            ctx.getShaderInfoLog(fs)
          );
          if (alive.current) lost.current?.();
        };
      }}
    >
      <StoryRig
        rig={rig}
        place={place}
        progress={progress}
        yaw={yaw}
        fixed={settled ? 1 : undefined}
        still={still}
        active={active}
        skipEntrance={place === "band"}
        win={win}
      />
      <Governor enabled={!still && active} onStepDown={stepDown} />
      <directionalLight position={[-4, 6, 8]} intensity={0.6} color={PAL.champagneHi} />
      {outers && <GoldMark outers={outers} rig={rig} lite={lite} />}
      <ParticleField count={count} targets={targets} rig={rig} tier={tier} onFirstFrame={onReady} />
      {!lite && <Effects tier={tier} rig={rig} />}
      <Settle still={still} />
    </Canvas>
  );
}
