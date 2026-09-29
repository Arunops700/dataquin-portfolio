/*
  Per-grain geometry for the particle story. Three-free: plain typed
  arrays, turned into buffer attributes by ParticleField.

  Every state a grain can be in is precomputed here; the vertex shader
  only blends between them:
    rows    — the entrance: a tilted plane of jittered rows, like cells in
              a sheet, with a few strays thrown out of the grid
    target  — its point on the DQ mark's strokes (logo.js)
    orbit   — its place in the dust halo, and in the ruled orbit rings
    cell    — its place on the ledger sheet of the "problem" beat

  Deterministic PRNGs, so the picture is identical on every load.
*/
import { rng } from "./shared.js";

export function makeLayout(count, seed = 7) {
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

/* The ledger sheet: 15 ruled rows (row 0 the header) × 7 columns, in unit
   sheet space (u, v in −0.5..0.5, v up). A quarter of the grains sit on
   the 16 hairlines (the one under the header twice as dense); the rest
   are the "figures" — one dash per cell, labels left-aligned, amounts
   right-aligned, grains shared out by dash length. Each slot also carries
   its reading order (row-major, 0..1), which the typing and the hand-off
   follow. Returned sorted by u. */
const ROWS = 15;
const COLS = 7;
const COL_W = [0.26, ...Array(COLS - 1).fill(0.74 / (COLS - 1))];

export function makeSheet(count, seed = 11) {
  const rand = rng(seed);
  const rh = 1 / ROWS;
  const last = ROWS * COLS - 1;
  const lefts = [];
  COL_W.reduce((x, w) => (lefts.push(x), x + w), -0.5);

  const u = new Float32Array(count);
  const v = new Float32Array(count);
  const order = new Float32Array(count);
  const rule = new Float32Array(count);
  let n = 0;
  const put = (su, sv, so, sr) => {
    if (n >= count) return;
    u[n] = su; v[n] = sv; order[n] = so; rule[n] = sr; n++;
  };

  // share `total` grains over items in proportion to their weight, with
  // cumulative rounding so the shares always add up exactly
  const share = (items, weight, total, place) => {
    const sum = items.reduce((s, it) => s + weight(it), 0);
    let acc = 0;
    for (const it of items) {
      const a = Math.round((acc / sum) * total);
      acc += weight(it);
      const k = Math.round((acc / sum) * total) - a;
      for (let j = 0; j < k; j++) place(it);
    }
  };

  const dashes = [];
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const pad = 0.012;
      const inner = COL_W[col] - 2 * pad;
      const frac = row === 0 ? 0.55 + rand() * 0.1 : col === 0 ? 0.45 + rand() * 0.45 : 0.3 + rand() * 0.55;
      const len = inner * frac;
      const left = lefts[col] + pad;
      dashes.push({
        u0: col === 0 ? left : left + inner - len,
        len,
        v: 0.5 - (row + 0.5) * rh,
        order: (row * COLS + col) / last,
      });
    }
  }
  const nRule = Math.round(count * 0.24);
  share(dashes, (d) => d.len, count - nRule, (d) =>
    put(d.u0 + rand() * d.len + (rand() - 0.5) * 0.004, d.v + (rand() - 0.5) * 0.34 * rh, d.order, 0)
  );

  // a rule appears with the row above it
  const lines = Array.from({ length: ROWS + 1 }, (_, k) => ({
    k,
    v: 0.5 - k * rh,
    order: (Math.max(0, k - 1) * COLS) / last,
  }));
  share(lines, (l) => (l.k === 1 ? 2 : 1), nRule, (l) => put(rand() - 0.5, l.v + (rand() - 0.5) * 0.004, l.order, 1));

  const idx = Array.from({ length: n }, (_, i) => i).sort((a, b) => u[a] - u[b]);
  const pick = (arr) => Float32Array.from(idx, (i) => arr[i]);
  return { u: pick(u), v: pick(v), order: pick(order), rule: pick(rule), n };
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

  // meta: seed (stagger rank, loop share, ring lane), t (0..1 across the
  // mark), size, stroke-density compensation
  const meta = new Float32Array(count * 4);
  for (let i = 0; i < count; i++) {
    meta[i * 4] = L.seeds[i];
    meta[i * 4 + 1] = t[i];
    meta[i * 4 + 2] = L.sizes[i];
    meta[i * 4 + 3] = hasLogo ? logo.dens[i] : 1;
  }

  // orbit: (angle, radius, y squash, z). The halo keeps its dust-cloud
  // distributions. The angle points from the mark's centre through the
  // grain's stroke point, so mark → rings is a radial exhale; ranked onto
  // an even spread, so the rings are ruled evenly all the way round.
  const rand = rng(41);
  const orbit = new Float32Array(count * 4);
  const raw = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    // (the rings' angle runs clockwise on screen: the near arc is below)
    raw[i] = hasLogo ? Math.atan2(-target[i * 3 + 1] / 1.3, target[i * 3] / 3.9) : rand() * Math.PI * 2;
    orbit[i * 4 + 1] = 0.75 + Math.pow(rand(), 0.6) * 0.55;   // ring around the mark's extent
    orbit[i * 4 + 2] = 0.7 + rand() * 0.6;
    orbit[i * 4 + 3] = (rand() - 0.5) * 2.4;
  }
  const byAngle = Array.from({ length: count }, (_, i) => i).sort((a, b) => raw[a] - raw[b]);
  byAngle.forEach((i, rank) => {
    orbit[i * 4] = -Math.PI + ((rank + 0.5) / count) * Math.PI * 2 + (rand() - 0.5) * 0.3;
  });

  // cell: the sheet's slots are sorted by u; hand them out by rank of t,
  // so the mark's left side lands on the sheet's left columns
  const sheet = makeSheet(count);
  const cell = new Float32Array(count * 4);
  Array.from({ length: count }, (_, i) => i)
    .sort((a, b) => t[a] - t[b])
    .forEach((i, rank) => {
      const s = Math.min(rank, sheet.n - 1);
      cell[i * 4] = sheet.u[s];
      cell[i * 4 + 1] = sheet.v[s];
      cell[i * 4 + 2] = sheet.order[s];
      cell[i * 4 + 3] = sheet.rule[s];
    });

  return { rows, target, orbit, cell, meta };
}
