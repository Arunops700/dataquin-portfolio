import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { logoPlacement } from "./logo.js";

/*
  The solid DQ mark: the traced logo outline extruded into a bevelled
  gold object, lit by an environment map so it carries real
  reflections. It materialises through the particles (opacity/scale
  driven by the shared timeline) and then idles: a slow sway, a light
  that travels round it (environment rotation), pointer parallax.

  `timeline.start` is stamped by the first frame of the scene; the
  mark fades in between MATERIALISE_AT and MATERIALISE_AT + MATERIALISE.
*/

export const GATHER = 2.2;       // seconds the particles take to gather
export const MATERIALISE = 1.2;  // seconds the solid mark takes to appear

const GOLD = new THREE.Color("#b08a48");

export default function GoldMark({ outers, place = "hero", timeline, still = false, progress }) {
  const group = useRef(null);
  const inner = useRef(null);
  const { scene, gl, viewport, invalidate } = useThree();
  const mouse = useRef({ x: 0, y: 0 });

  const geometry = useMemo(() => {
    const shapes = outers.map((o) => {
      const s = new THREE.Shape(o.points.map(([x, y]) => new THREE.Vector2(x, y)));
      o.holes.forEach((h) => s.holes.push(new THREE.Path(h.map(([x, y]) => new THREE.Vector2(x, y)))));
      return s;
    });
    const g = new THREE.ExtrudeGeometry(shapes, {
      depth: 0.3,
      bevelEnabled: true,
      bevelThickness: 0.035,
      bevelSize: 0.028,
      bevelOffset: 0,
      bevelSegments: 3,
      curveSegments: 6,
    });
    // keep x/y as traced (centred on the image centre, like the
    // particle targets); only centre the extrusion depth
    g.translate(0, 0, -0.15);
    return g;
  }, [outers]);

  const material = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: GOLD,
        metalness: 1,
        roughness: 0.38,
        clearcoat: 0.35,
        clearcoatRoughness: 0.3,
        envMapIntensity: 0.75,
        emissive: new THREE.Color("#3a2a12"),
        emissiveIntensity: 0.16,
        transparent: true,
        opacity: still ? 1 : 0,
      }),
    [still]
  );

  // Environment lighting: a neutral studio room, pre-filtered once.
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;
    scene.environmentRotation = new THREE.Euler(0, 0, 0);
    invalidate(); // still mode renders on demand — draw again now that it is lit
    return () => {
      scene.environment = null;
      env.dispose();
      pmrem.dispose();
    };
  }, [gl, scene, invalidate]);

  useEffect(() => () => { geometry.dispose(); material.dispose(); }, [geometry, material]);

  useEffect(() => {
    if (still || window.matchMedia("(pointer: coarse)").matches) return;
    const onMove = (e) => {
      mouse.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, [still]);

  useFrame((state, dt) => {
    const g = group.current;
    const m = inner.current;
    if (!g || !m) return;
    const pl = logoPlacement(viewport.aspect, place);
    g.position.set(pl.x, pl.y, 0);
    const now = state.clock.elapsedTime;
    const t0 = timeline.current.start ?? now;
    const age = now - t0;

    // materialise through the particles
    const f = still ? 1 : Math.min(1, Math.max(0, (age - GATHER) / MATERIALISE));
    const ease = f * f * (3 - 2 * f);
    material.opacity = ease * (pl.alpha ?? 1);
    const pop = 0.94 + 0.06 * ease;
    g.scale.setScalar(pl.scale * pop);

    // scroll: the story turns the mark a little, eases it back, lifts it
    const sc = progress ? progress.get() : 0;
    const k = Math.min(1, dt * 2.5);
    const sway = still ? 0 : Math.sin(now * 0.35) * 0.06;
    const tx = -0.12 + (still ? 0 : -mouse.current.y * 0.08);
    const ty = 0.2 + sway + (still ? 0 : mouse.current.x * 0.14) - sc * 0.35;
    m.rotation.x += (tx - m.rotation.x) * k;
    m.rotation.y += (ty - m.rotation.y) * k;
    g.position.y += sc * 0.9;
    const back = 1 - sc * 0.16;
    g.scale.multiplyScalar(back);

    // a light travelling round the mark: rotate the environment slowly
    if (!still && scene.environmentRotation) scene.environmentRotation.y = now * 0.12;
  });

  return (
    <group ref={group}>
      <group ref={inner}>
        <mesh geometry={geometry} material={material} />
      </group>
    </group>
  );
}
