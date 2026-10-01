import * as THREE from "three";
import { PAL } from "./palette.js";

/*
  The light the gold mark reflects: a dark espresso room lit only by
  emissive cards, baked once into a PMREM environment. Every card is a
  palette colour or a shade of one, so the reflections are warm paper and
  champagne, never grey studio boxes.

  Metal shows its environment, not its lights. The front face reflects
  what sits behind the camera — a broad warm card, brighter up and to the
  right where the face points at rest — so it reads as lit gold; squared
  up toward the viewer it sits in the brightest part. The tall strips
  draw crisp lines along the bevels.
*/
export function bakeStudio(renderer, size = 256) {
  const env = new THREE.Scene();
  env.background = new THREE.Color(PAL.esp).multiplyScalar(0.5);
  const plane = new THREE.PlaneGeometry(1, 1);
  const mats = [];
  const card = (hex, intensity, pos, [w, h]) => {
    const m = new THREE.MeshBasicMaterial({ color: new THREE.Color(hex).multiplyScalar(intensity), side: THREE.DoubleSide });
    mats.push(m);
    const mesh = new THREE.Mesh(plane, m);
    mesh.position.set(...pos);
    mesh.scale.set(w, h, 1);
    mesh.lookAt(0, 0, 0);
    env.add(mesh);
  };
  card(PAL.paper, 0.55, [0, 0.5, 10.4], [22, 12]);        // FRONT, broad: the face's base light
  card(PAL.champagneHi, 1.1, [5.5, 2.5, 8], [9, 6]);      // FRONT, bright: where the face points at rest
  card(PAL.paper, 9.0, [-6.5, 2.0, 5.0], [1.1, 10]);      // KEY strip, front-left: a long streak down the bevels
  card(PAL.paper, 2.4, [0, 9.0, 2.0], [9, 5]);            // TOP softbox: sheen on the upper bevels
  card(PAL.paper, 6.0, [7.5, 1.5, -5.5], [0.8, 8]);       // RIM strip, back-right: a warm line on right contours
  card(PAL.esp2, 1.5, [0, -7.0, 0], [30, 30]);            // FLOOR bounce: down-facing bevels stay warm
  const pmrem = new THREE.PMREMGenerator(renderer);
  const rt = pmrem.fromScene(env, 0.035, 0.1, 100, { size });
  pmrem.dispose();
  plane.dispose();
  mats.forEach((m) => m.dispose());
  return rt;
}

/* The composer tone-maps the whole frame, ground included: plain #191209
   through ACES comes out near-black (#070301). This finds the linear
   colour that lands exactly on the target after ACES at `exposure` and
   the sRGB output — so the canvas ground IS the band's espresso, and the
   field fades in without darkening the hero. (three's ACES fit, in JS.) */
const IN = [[0.59719, 0.076, 0.0284], [0.35458, 0.90834, 0.13383], [0.04823, 0.01566, 0.83777]];   // columns, as in three's GLSL
const OUT = [[1.60475, -0.10208, -0.00327], [-0.53108, 1.10813, -0.07276], [-0.07367, -0.00605, 1.07602]];
const mul = (m, v) => [0, 1, 2].map((r) => m[0][r] * v[0] + m[1][r] * v[1] + m[2][r] * v[2]);
const fit = (v) => (v * (v + 0.0245786) - 0.000090537) / (v * (0.983729 * v + 0.432951) + 0.238081);
const aces = (c, exp) => mul(OUT, mul(IN, c.map((x) => (x * exp) / 0.6)).map(fit)).map((x) => Math.min(1, Math.max(0, x)));

export function groundFor(hex, exposure) {
  const t = new THREE.Color(hex);   // linear working space
  const T = [t.r, t.g, t.b];
  let L = T.map((x) => x * 6);
  for (let i = 0; i < 40; i++) {
    const o = aces(L, exposure);
    L = L.map((v, k) => v * (T[k] / Math.max(o[k], 1e-6)));
  }
  return new THREE.Color().setRGB(L[0], L[1], L[2], THREE.LinearSRGBColorSpace);
}
