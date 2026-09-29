/*
  Per-grain geometry for the particle story. Three-free: plain typed
  arrays, turned into buffer attributes by ParticleField.

  Every state a grain can be in is precomputed here; the vertex shader
  only blends between them:
    rows    — the entrance: a tilted plane of jittered rows, like cells in
              a sheet, with a few strays thrown out of the grid
    target  — its point on the DQ mark's strokes (logo.js)
    orbit   — dust-drift depth and spread (the halo); the streams key on the seed

  Deterministic PRNGs, so the picture is identical on every load.
*/
import { rng } from "./shared.js";

function makeLayout(count, seed = 7) {
  const rand = rng(seed);
  const chaos = new Float32Array(count * 3);
  const seeds = new Float32Array(count);
  const ts = new Float32Array(count);
  const sizes = new Float32Array(count);

  const W = 21;
  const H = 9.5;
  const perRow = Math.ceil(Math.sqrt(count * (W / H)));
  const rows = Math.ceil(count / perRow);

  for (let i = 0; i < count; i++) {
    const row = Math.floor(i / perRow);
    const col = i % perRow;
    let x = (col / (perRow - 1) - 0.5) * W + (rand() - 0.5) * 0.3;
    let y = (row / Math.max(rows - 1, 1) - 0.5) * H + (rand() - 0.5) * 0.24;
    let z = (rand() - 0.5) * 1.8;
    if (rand() < 0.07) {
      x += (rand() - 0.5) * 7;
      y += (rand() - 0.5) * 5;
      z += (rand() - 0.5) * 6;
    }
    chaos[i * 3] = x;
    chaos[i * 3 + 1] = y;
    chaos[i * 3 + 2] = z;

    seeds[i] = rand();
    // position across the rows, 0 → 1: the sweep's axis when no logo
    // targets are available
    ts[i] = col / Math.max(perRow - 1, 1);
    // fine grains only — dust, not glitter
    sizes[i] = 0.32 + rand() * 0.5;
  }

  return { count, chaos, seeds, ts, sizes };
}

/* Narrow viewports squeeze the scattered rows horizontally so they
   stay on screen. */
export function spreadFor(aspect) {
  return Math.min(1, Math.max(0.42, aspect / 1.78));
}

/* All attributes for `count` grains. `logo` is loadLogoTargets() output,
   or null (the story then plays from and back to the entrance rows).

   Any prefix of the grains is a uniform sample of every state — the
   quality tiers draw a prefix (setDrawRange) — so the entrance rows are
   shuffled, and the logo targets already come in random order. */
export function buildAttributes(count, logo) {
  const L = makeLayout(count);
  const shuffle = rng(8);
  const perm = Array.from({ length: count }, (_, i) => i);
  for (let i = count - 1; i > 0; i--) {
    const j = Math.floor(shuffle() * (i + 1));
    [perm[i], perm[j]] = [perm[j], perm[i]];
  }
  const rows = new Float32Array(count * 3);
  const rowT = new Float32Array(count);
  perm.forEach((p, i) => {
    rows[i * 3] = L.chaos[p * 3];
    rows[i * 3 + 1] = L.chaos[p * 3 + 1];
    rows[i * 3 + 2] = L.chaos[p * 3 + 2];
    rowT[i] = L.ts[p];
  });

  const hasLogo = !!(logo && logo.targets && logo.targets.length === count * 3);
  const target = hasLogo ? logo.targets : rows.slice();
  const t = hasLogo ? logo.ts : rowT;

  // meta: seed (stagger rank, loop share, stream lane), t (0..1 across the
  // mark), size, stroke-density compensation
  const meta = new Float32Array(count * 4);
  for (let i = 0; i < count; i++) {
    meta[i * 4] = L.seeds[i];
    meta[i * 4 + 1] = t[i];
    meta[i * 4 + 2] = L.sizes[i];
    meta[i * 4 + 3] = hasLogo ? logo.dens[i] : 1;
  }

  // orbit: the halo's loose drift along the lanes — z: y spread,
  // w: depth (x, y unused)
  const rand = rng(41);
  const orbit = new Float32Array(count * 4);
  for (let i = 0; i < count; i++) {
    orbit[i * 4 + 2] = 0.7 + rand() * 0.6;
    orbit[i * 4 + 3] = (rand() - 0.5) * 2.4;
  }

  return { rows, target, orbit, meta };
}
