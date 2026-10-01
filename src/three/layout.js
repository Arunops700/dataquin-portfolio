/*
  Per-grain geometry for the particles. Three-free: plain typed arrays,
  turned into buffer attributes by ParticleField.

    rows  — the entrance: a tilted plane of jittered rows, like cells in a
            sheet, with a few strays thrown out of the grid
    meta  — seed (stagger rank, loop share, stream lane), t (0 → 1 across
            the rows: the gather's order and the glint's axis), size

  The streams themselves are computed in the vertex shader from the seed.
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
    ts[i] = col / Math.max(perRow - 1, 1);   // position across the rows, 0 → 1
    // fine grains only — dust, not glitter
    sizes[i] = 0.32 + rand() * 0.5;
  }

  return { chaos, seeds, ts, sizes };
}

/* Narrow viewports squeeze the scattered rows horizontally so they
   stay on screen. */
export function spreadFor(aspect) {
  return Math.min(1, Math.max(0.42, aspect / 1.78));
}

/* All attributes for `count` grains. Any prefix of the grains is a
   uniform sample — the quality tiers draw a prefix (setDrawRange) — so
   the entrance rows are shuffled. */
export function buildAttributes(count) {
  const L = makeLayout(count);
  const shuffle = rng(8);
  const perm = Array.from({ length: count }, (_, i) => i);
  for (let i = count - 1; i > 0; i--) {
    const j = Math.floor(shuffle() * (i + 1));
    [perm[i], perm[j]] = [perm[j], perm[i]];
  }
  const rows = new Float32Array(count * 3);
  const meta = new Float32Array(count * 3);
  perm.forEach((p, i) => {
    rows[i * 3] = L.chaos[p * 3];
    rows[i * 3 + 1] = L.chaos[p * 3 + 1];
    rows[i * 3 + 2] = L.chaos[p * 3 + 2];
    meta[i * 3] = L.seeds[i];
    meta[i * 3 + 1] = L.ts[p];
    meta[i * 3 + 2] = L.sizes[i];
  });
  return { rows, meta };
}
