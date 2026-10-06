import { useEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";

/*
  Post-processing on the composer path: a tight, jewellery-like bloom on
  the brightest gold highlights and glints, then tone mapping and sRGB
  output. Takes over rendering from R3F (useFrame priority 1). The lite
  path (touch devices) does not mount it.

  - The pixel ratio is synced (the composer caches its own) and the MSAA
    target is capped by pixel count, so big screens stay affordable.
  - A soft knee on the threshold: glints fade in instead of popping.
  - Bloom strength comes from the rig.
  - Every pass is disposed: composer.dispose() alone leaks bloom + output.
*/
export default function Effects({ tier, rig }) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const dpr = useThree((s) => s.viewport.dpr);

  const composer = useMemo(() => {
    const c = new EffectComposer(gl);
    c.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(new THREE.Vector2(size.width / 2, size.height / 2), 0.28, 0.32, 0.9);
    bloom.highPassUniforms.smoothWidth.value = 0.12;
    c.addPass(bloom);
    c.addPass(new OutputPass());
    c.bloom = bloom;
    return c;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gl, scene, camera]);

  useEffect(() => {
    composer.setPixelRatio(dpr);
    composer.setSize(size.width, size.height);
    composer.bloom.setSize(size.width / 2, size.height / 2);   // after setSize; the pass halves again → ¼ CSS res
    const n = size.width * size.height * dpr * dpr > 2.3e6 ? Math.min(2, tier.msaa) : tier.msaa;
    for (const rt of [composer.renderTarget1, composer.renderTarget2]) {
      if (rt.samples !== n) {
        rt.samples = n;
        rt.dispose();   // re-allocated with the new sample count on next use
      }
    }
    composer.bloom.enabled = tier.bloom;
  }, [composer, size, dpr, tier]);

  useEffect(
    () => () => {
      composer.passes.forEach((p) => p.dispose?.());
      composer.dispose();
    },
    [composer]
  );

  useFrame(() => {
    composer.bloom.strength = rig.current.bloom;
    composer.render();
  }, 1);
  return null;
}
