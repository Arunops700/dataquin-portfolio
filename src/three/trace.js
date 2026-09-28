/*
  Vector outline of the DQ logo, traced from public/logo.png at runtime.

  The PNG is upscaled 4x with bilinear filtering, lightly blurred and
  thresholded, then contoured with marching squares. Contours are
  simplified (Douglas-Peucker), rounded (Chaikin) and nested: even
  depth = outer outline, odd depth = hole in its nearest outer. The
  tagline band between the arcs is cleared first.

  Returns plain arrays only (no three.js import here — this file is in
  the main bundle; the lazy 3D chunk turns them into shapes):
    outers: [{ points: [[x, y]...], holes: [[[x, y]...]] }] in world
            units (LOGO_W wide, centred on the origin, y up)
    polys:  the raw image-space polygons for the 2D poster

  Loaded once and cached; resolves to null if the image fails to load.
*/

export const LOGO_W = 8.8;
// The source PNG is only 216x121: a 6x bilinear upscale, two blur
// passes and heavier smoothing keep the traced edges from showing the
// pixel steps as lumps on the extruded mark.
const UP = 6;
const TAGLINE = [0.585, 0.69];
const THRESHOLD = 0.5;

let cache = null;
export function loadLogoShapes() {
  if (!cache) cache = build().catch(() => null);
  return cache;
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function build() {
  const img = await loadImage("/logo.png");
  const W = img.naturalWidth * UP;
  const H = img.naturalHeight * UP;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, W, H);
  const { data } = ctx.getImageData(0, 0, W, H);

  const field = new Float32Array(W * H);
  for (let y = 0; y < H; y++) {
    const fy = y / H;
    const clear = fy > TAGLINE[0] && fy < TAGLINE[1];
    for (let x = 0; x < W; x++) field[y * W + x] = clear ? 0 : data[(y * W + x) * 4 + 3] / 255;
  }

  const smooth = blur3(blur3(field, W, H), W, H);
  const loops = marchingSquares(smooth, W, H, THRESHOLD);
  const polys = loops
    .map((pts) => chaikin(simplify(pts, 1.6), 3))
    .filter((p) => p.length >= 8 && Math.abs(signedArea(p)) > 90);
  if (!polys.length) return null;

  // nesting: depth = number of larger polygons containing this one
  const areas = polys.map((p) => Math.abs(signedArea(p)));
  const parents = polys.map((p, i) => {
    let best = -1;
    let bestArea = Infinity;
    let depth = 0;
    for (let j = 0; j < polys.length; j++) {
      if (j === i || areas[j] <= areas[i]) continue;
      if (contains(polys[j], p[0])) {
        depth++;
        if (areas[j] < bestArea) { bestArea = areas[j]; best = j; }
      }
    }
    return { depth, parent: best };
  });

  const toWorld = ([x, y]) => [(x / W - 0.5) * LOGO_W, -(y / H - 0.5) * LOGO_W * (H / W)];
  const outers = [];
  const byIndex = new Map();
  polys.forEach((p, i) => {
    if (parents[i].depth % 2 === 0) {
      const o = { points: p.map(toWorld), holes: [] };
      outers.push(o);
      byIndex.set(i, o);
    }
  });
  polys.forEach((p, i) => {
    if (parents[i].depth % 2 === 1) {
      const owner = byIndex.get(parents[i].parent);
      if (owner) owner.holes.push(p.map(toWorld));
    }
  });

  return { outers, polys, W, H, aspect: H / W };
}

/* ---------- raster helpers ---------- */

function blur3(a, W, H) {
  const out = new Float32Array(W * H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let s = 0;
      let n = 0;
      for (let dy = -1; dy <= 1; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= H) continue;
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx;
          if (xx < 0 || xx >= W) continue;
          s += a[yy * W + xx];
          n++;
        }
      }
      out[y * W + x] = s / n;
    }
  }
  return out;
}

/* Marching squares → closed loops of [x, y] points. Segment endpoints
   on shared cell edges are computed identically from both sides, so
   they link by exact key. */
function marchingSquares(f, W, H, t) {
  const segs = [];
  const at = (x, y) => f[y * W + x];
  const lerp = (x0, y0, x1, y1) => {
    const a = at(x0, y0);
    const b = at(x1, y1);
    const u = (t - a) / (b - a || 1e-6);
    return [x0 + (x1 - x0) * u, y0 + (y1 - y0) * u];
  };
  for (let y = 0; y < H - 1; y++) {
    for (let x = 0; x < W - 1; x++) {
      const v0 = at(x, y) >= t, v1 = at(x + 1, y) >= t, v2 = at(x + 1, y + 1) >= t, v3 = at(x, y + 1) >= t;
      const idx = (v0 << 3) | (v1 << 2) | (v2 << 1) | (v3 ? 1 : 0);
      if (idx === 0 || idx === 15) continue;
      const T = () => lerp(x, y, x + 1, y);
      const R = () => lerp(x + 1, y, x + 1, y + 1);
      const B = () => lerp(x, y + 1, x + 1, y + 1);
      const L = () => lerp(x, y, x, y + 1);
      switch (idx) {
        case 1: case 14: segs.push([L(), B()]); break;
        case 2: case 13: segs.push([B(), R()]); break;
        case 3: case 12: segs.push([L(), R()]); break;
        case 4: case 11: segs.push([T(), R()]); break;
        case 6: case 9: segs.push([T(), B()]); break;
        case 7: case 8: segs.push([T(), L()]); break;
        case 5: segs.push([T(), L()], [B(), R()]); break;
        case 10: segs.push([T(), R()], [L(), B()]); break;
        default: break;
      }
    }
  }
  // link segments into loops
  const key = (p) => `${p[0].toFixed(3)},${p[1].toFixed(3)}`;
  const adj = new Map();
  segs.forEach((s, i) => {
    for (const p of s) {
      const k = key(p);
      if (!adj.has(k)) adj.set(k, []);
      adj.get(k).push(i);
    }
  });
  const used = new Uint8Array(segs.length);
  const loops = [];
  for (let i = 0; i < segs.length; i++) {
    if (used[i]) continue;
    used[i] = 1;
    const loop = [segs[i][0], segs[i][1]];
    let cur = segs[i][1];
    for (let guard = 0; guard < segs.length; guard++) {
      const cands = adj.get(key(cur)) || [];
      const next = cands.find((j) => !used[j]);
      if (next == null) break;
      used[next] = 1;
      const [a, b] = segs[next];
      cur = key(a) === key(cur) ? b : a;
      if (key(cur) === key(loop[0])) break;
      loop.push(cur);
    }
    if (loop.length >= 3) loops.push(loop);
  }
  return loops;
}

/* ---------- polygon helpers ---------- */

function signedArea(p) {
  let a = 0;
  for (let i = 0, n = p.length; i < n; i++) {
    const [x1, y1] = p[i];
    const [x2, y2] = p[(i + 1) % n];
    a += x1 * y2 - x2 * y1;
  }
  return a / 2;
}

function contains(poly, [px, py]) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi || 1e-9) + xi) inside = !inside;
  }
  return inside;
}

function simplify(pts, eps) {
  if (pts.length < 4) return pts;
  const keep = new Uint8Array(pts.length);
  keep[0] = 1;
  keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [s, e] = stack.pop();
    let maxD = 0;
    let idx = -1;
    const [ax, ay] = pts[s];
    const [bx, by] = pts[e];
    const dx = bx - ax;
    const dy = by - ay;
    const len = Math.hypot(dx, dy) || 1e-9;
    for (let i = s + 1; i < e; i++) {
      const [px, py] = pts[i];
      const d = Math.abs(dy * px - dx * py + bx * ay - by * ax) / len;
      if (d > maxD) { maxD = d; idx = i; }
    }
    if (maxD > eps && idx > 0) {
      keep[idx] = 1;
      stack.push([s, idx], [idx, e]);
    }
  }
  return pts.filter((_, i) => keep[i]);
}

function chaikin(pts, iterations) {
  let p = pts;
  for (let k = 0; k < iterations; k++) {
    const out = [];
    for (let i = 0, n = p.length; i < n; i++) {
      const [x1, y1] = p[i];
      const [x2, y2] = p[(i + 1) % n];
      out.push([0.75 * x1 + 0.25 * x2, 0.75 * y1 + 0.25 * y2]);
      out.push([0.25 * x1 + 0.75 * x2, 0.25 * y1 + 0.75 * y2]);
    }
    p = out;
  }
  return p;
}
