import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { toCreasedNormals } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { bakeStudio } from "./studio.js";
import { PAL } from "./palette.js";

/*
  The solid DQ mark: the logo outline extruded into a bevelled gold
  object, lit by the palette studio (studio.js) so it carries real
  reflections.

  It is opaque from the first frame. It forms by dissolving in left to
  right behind the gathering grains — a grainy front with a hot cream
  edge — rather than fading through transparency (which showed the walls
  through the face). The pose, the light and the sweep all come from the
  rig; this component only copies them.
*/
export default function GoldMark({ outers, rig, lite }) {
  const group = useRef(null);
  const gl = useThree((s) => s.gl);
  const invalidate = useThree((s) => s.invalidate);

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
    // keep x/y as traced (centred like the grain targets); centre the depth
    g.translate(0, 0, -0.15);
    // smooth across the bevel's joints (they turn up to ~33°), keep the
    // letter corners (45°+) crisp
    const creased = toCreasedNormals(g, 0.7);
    creased.computeBoundingBox();
    return creased;
  }, [outers]);

  // shared with the shader; updated in place every frame
  const U = useMemo(
    () => ({
      uReveal: { value: 1 },
      uSweep: { value: -1 },
      uSweepAmt: { value: 0 },
      uEdge: { value: new THREE.Color(PAL.champagneHi) },
      uSpan: { value: new THREE.Vector2(-2.2, 4.4) },   // the mark's x extent: 0..1 across it
    }),
    []
  );

  const material = useMemo(() => {
    const m = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(PAL.gold),
      metalness: 1,
      roughness: 0.3,
      clearcoat: 0.6,             // a crisp lacquer highlight over the metal
      clearcoatRoughness: 0.1,
      envMapIntensity: 1,
      emissive: new THREE.Color(PAL.gold),
      emissiveIntensity: 0.02,
    });
    m.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, U);
      sh.vertexShader = sh.vertexShader
        .replace("#include <common>", "#include <common>\nvarying vec3 vObj;")
        .replace("#include <begin_vertex>", "#include <begin_vertex>\nvObj = position;");
      sh.fragmentShader = sh.fragmentShader
        .replace(
          "#include <common>",
          `#include <common>
          varying vec3 vObj;
          uniform float uReveal; uniform float uSweep; uniform float uSweepAmt;
          uniform vec3 uEdge; uniform vec2 uSpan;
          float dqHash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }`
        )
        .replace(
          "#include <clipping_planes_fragment>",
          `#include <clipping_planes_fragment>
          float dqX = (vObj.x - uSpan.x) / uSpan.y + vObj.y * 0.02;            // 0..1 across, slightly diagonal
          float dqK = dqX + (dqHash(floor(vObj.xy * 40.0)) - 0.5) * 0.05;      // a grainy front, like settling dust
          float dqFront = uReveal * 1.2 - 0.1;
          if (uReveal < 0.999 && dqK > dqFront) discard;`
        )
        .replace(
          "#include <emissivemap_fragment>",
          `#include <emissivemap_fragment>
          float dqEdge = smoothstep(dqFront - 0.035, dqFront, dqK) * step(uReveal, 0.999);
          float dqQ = (dqX - uSweep) / 0.055;
          float dqBand = exp(-dqQ * dqQ);
          float dqRim = 1.0 - abs(dot(normal, normalize(vViewPosition)));      // bevels catch more of the sweep
          totalEmissiveRadiance += uEdge * (dqEdge * 2.2 + dqBand * uSweepAmt * (0.3 + 0.9 * dqRim));`
        );
    };
    m.customProgramCacheKey = () => "dq-gold-1";
    return m;
  }, [U]);

  useLayoutEffect(() => {
    const bb = geometry.boundingBox;
    U.uSpan.value.set(bb.min.x, Math.max(1e-3, bb.max.x - bb.min.x));
  }, [geometry, U]);

  // The studio light, baked once, on the material itself: with a scene
  // environment three takes the intensity from the scene and ignores the
  // material's, and the rig sets the light per placement. A layout effect, so
  // no frame ever shows the metal unlit.
  useLayoutEffect(() => {
    const rt = bakeStudio(gl, lite ? 128 : 256);
    material.envMap = rt.texture;
    material.needsUpdate = true;
    invalidate();   // reduced motion renders on demand — draw again, now lit
    return () => {
      material.envMap = null;
      rt.dispose();
    };
  }, [gl, material, invalidate, lite]);

  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => material.dispose(), [material]);

  useFrame(() => {
    const r = rig.current;
    const g = group.current;
    if (!g) return;
    g.matrix.copy(r.mark.matrix);
    g.matrixWorldNeedsUpdate = true;
    g.visible = r.reveal > 0;
    material.roughness = r.mat.roughness;
    material.envMapIntensity = r.mat.env;
    material.envMapRotation.y = r.envRot;
    material.clearcoat = r.mat.clearcoat;
    material.emissiveIntensity = r.mat.emissive;
    U.uReveal.value = r.reveal;
    U.uSweep.value = r.sweep;
    U.uSweepAmt.value = r.sweepAmt;
  });

  return (
    <group ref={group} matrixAutoUpdate={false}>
      <mesh geometry={geometry} material={material} />
    </group>
  );
}
