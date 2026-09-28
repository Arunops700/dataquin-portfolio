/*
  Starting geometry for the particle field, shared by the WebGL scene
  and the static 2D poster: a tilted plane of jittered rows, like cells
  in a sheet, with a few strays thrown out of the grid. The points
  gather from here into the DQ mark (targets come from logo.js).

  Deterministic PRNG so the picture is identical on every load.
*/

export function makeLayout(count, seed = 7) {
  let s = seed;
  const rand = () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };

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
    // position across the sheet, 0 → 1, for the light sweep when no
    // logo targets are available
    ts[i] = col / Math.max(perRow - 1, 1);
    // mostly fine grains, a few larger flecks — enough to catch the
    // light without piling up into white where strokes are dense
    const big = rand() < 0.015;
    sizes[i] = 0.5 + rand() * 0.95 + (big ? 1.0 : 0);
  }

  return { count, chaos, seeds, ts, sizes };
}

/* Camera constants shared with the poster's projection. */
export const CAMERA_Z = 11;
export const CAMERA_FOV = 45;

/* Narrow viewports squeeze the scattered rows horizontally so they
   stay on screen. */
export function spreadFor(aspect) {
  return Math.min(1, Math.max(0.42, aspect / 1.78));
}
