/*
  Geometry for the particle field, shared by the WebGL scene and the
  static 2D poster so both draw the same picture.

  Two positions per point:
  - chaos:  a tilted plane of jittered rows, like cells in a sheet,
            with a few strays thrown out of the grid.
  - stream: the same points laid along an S-curve that narrows from a
            wide mouth on the left to a single bright point on the right.

  Deterministic PRNG so the picture is identical on every load.
*/

const PATH = [
  [-10.4, -2.4, 0.5],
  [-6.2, -2.9, -0.4],
  [-2.4, -0.9, 0.5],
  [1.4, 1.0, -0.4],
  [4.6, 1.9, 0.3],
  [6.6, 2.3, 0.0],
];

function catmull(pts, t) {
  const n = pts.length - 1;
  const ft = Math.min(Math.max(t, 0), 0.99999) * n;
  const i = Math.floor(ft);
  const u = ft - i;
  const p0 = pts[Math.max(i - 1, 0)];
  const p1 = pts[i];
  const p2 = pts[Math.min(i + 1, n)];
  const p3 = pts[Math.min(i + 2, n)];
  const out = [0, 0, 0];
  for (let k = 0; k < 3; k++) {
    out[k] = 0.5 * (
      2 * p1[k] +
      (-p0[k] + p2[k]) * u +
      (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * u * u +
      (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * u * u * u
    );
  }
  return out;
}

export function makeLayout(count, seed = 7) {
  let s = seed;
  const rand = () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };

  const chaos = new Float32Array(count * 3);
  const stream = new Float32Array(count * 3);
  const seeds = new Float32Array(count);
  const ts = new Float32Array(count);
  const sizes = new Float32Array(count);

  const W = 21;
  const H = 9.5;
  const perRow = Math.ceil(Math.sqrt(count * (W / H)));
  const rows = Math.ceil(count / perRow);

  for (let i = 0; i < count; i++) {
    // --- chaos: gridded rows with jitter and strays
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

    // --- stream: along the curve, radius narrowing to the end
    const t = Math.min((i + rand() * 0.95) / count, 0.9999);
    const p = catmull(PATH, t);
    const radius = Math.pow(1 - t, 1.45) * 1.4 + 0.015;
    const ang = rand() * Math.PI * 2;
    const rr = Math.sqrt(rand()) * radius;
    stream[i * 3] = p[0] + Math.cos(ang) * rr * 0.9;
    stream[i * 3 + 1] = p[1] + Math.sin(ang) * rr;
    stream[i * 3 + 2] = p[2] + (rand() - 0.5) * rr * 1.3;

    seeds[i] = rand();
    ts[i] = t;
    // mostly fine grains, a few larger flecks — enough to catch the
    // light without piling up into white where strokes are dense
    const big = rand() < 0.015;
    sizes[i] = 0.5 + rand() * 0.95 + (big ? 1.0 : 0);
  }

  return { count, chaos, stream, seeds, ts, sizes };
}

/* Camera constants shared with the poster's projection. */
export const CAMERA_Z = 11;
export const CAMERA_FOV = 45;
export const BASE_ASPECT = 1.78;

/* Narrow viewports squeeze the scattered rows (and the stream
   fallback) horizontally so they stay on screen. */
export function spreadFor(aspect) {
  return Math.min(1, Math.max(0.42, aspect / BASE_ASPECT));
}
