import { Canvas } from "@react-three/fiber";
import ParticleField from "./ParticleField.jsx";
import { CAMERA_FOV, CAMERA_Z } from "./layout.js";

/* Lazy-loaded WebGL entry point. This file — and three.js with it —
   only ever downloads when Field.jsx decides the device can run it. */
export default function HeroScene({ progress, count, ambient, active = true, onReady }) {
  return (
    <Canvas
      dpr={[1, 1.75]}
      frameloop={active ? "always" : "never"}
      camera={{ position: [0, 0, CAMERA_Z], fov: CAMERA_FOV, near: 0.1, far: 60 }}
      gl={{ antialias: false, alpha: true, powerPreference: "high-performance", stencil: false, depth: false }}
      resize={{ scroll: false, debounce: { scroll: 50, resize: 80 } }}
      onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
    >
      <ParticleField progress={progress} count={count} ambient={ambient} onFirstFrame={onReady} />
    </Canvas>
  );
}
