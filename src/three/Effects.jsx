import { useEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";

/*
  Post-processing: a restrained bloom so the brightest gold highlights
  and the particle glints actually glow, then tone mapping + sRGB
  output. Runs at half resolution for the bloom and takes over
  rendering from R3F (useFrame priority 1).
*/
export default function Effects({ strength = 0.24, radius = 0.45, threshold = 0.96 }) {
  const { gl, scene, camera, size } = useThree();

  const composer = useMemo(() => {
    const c = new EffectComposer(gl);
    // multisampled targets: the mark's bevelled edges must not alias;
    // phones get 2x to keep the fill rate down
    const samples = window.matchMedia("(pointer: coarse)").matches ? 2 : 4;
    c.renderTarget1.samples = samples;
    c.renderTarget2.samples = samples;
    c.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(new THREE.Vector2(size.width / 2, size.height / 2), strength, radius, threshold);
    c.addPass(bloom);
    c.addPass(new OutputPass());
    c.bloom = bloom;
    return c;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gl, scene, camera]);

  useEffect(() => {
    composer.setSize(size.width, size.height);
    composer.bloom.setSize(size.width / 2, size.height / 2);
  }, [composer, size]);

  useEffect(() => () => composer.dispose(), [composer]);

  useFrame(() => composer.render(), 1);
  return null;
}
