/*
  The DQ logo as the scene uses it, and where things sit on the stage.
  Three-free (main bundle).

  - loadLogoShapes(): the mark's vector outline, precomputed by
    scripts/trace-logo.mjs (nothing is traced in the browser). The solid
    mark and the 2D poster both draw it.
  - loadLogoTargets(): grain targets sampled from public/logo.png (white
    on transparent). The two arcs and the DQ letters are sampled; the
    tagline band between them is skipped — at grain resolution it would
    only read as noise — and the letters carry extra weight so they stay
    legible against the larger arcs. Resolves to null if the image fails;
    the grains then run the story from their entrance rows instead.
  - logoPlacement() / stageLayout() / POSE: where the mark, the copy
    lane sit, by the shape of the window they are
    seen in.
*/
import { LOGO_W, TAGLINE, halfHeightAt, loadLogoImage, rng } from "./shared.js";

let outline = null;
export function loadLogoShapes() {
  // a failed fetch resolves null but isn't kept: the next mount retries
  if (!outline) outline = import("./logo-outline.json").then((m) => m.default, () => { outline = null; return null; });
  return outline;
}

// box holding "DQ", as fractions of the image
const LETTERS = { x: [0.36, 0.64], y: [0.34, 0.58] };
const LETTER_WEIGHT = 1.4;

let source = null;
export function loadLogoTargets(count, seed = 23) {
  if (!source) {
    source = loadLogoImage().then((img) => {
      if (!img) { source = null; return null; } // not kept: the next mount retries
      const c = document.createElement("canvas");
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      const ctx = c.getContext("2d", { willReadFrequently: true });
      ctx.drawImage(img, 0, 0);
      const { data } = ctx.getImageData(0, 0, c.width, c.height);
      const px = [];
      const weights = [];
      let x0 = c.width;
      let x1 = 0;
      for (let y = 0; y < c.height; y++) {
        const fy = y / c.height;
        if (fy > TAGLINE[0] && fy < TAGLINE[1]) continue;
        for (let x = 0; x < c.width; x++) {
          const a = data[(y * c.width + x) * 4 + 3];
          if (a < 40) continue;
          const fx = x / c.width;
          const letter = fx > LETTERS.x[0] && fx < LETTERS.x[1] && fy > LETTERS.y[0] && fy < LETTERS.y[1];
          px.push(x, y);
          weights.push((a / 255) * (letter ? LETTER_WEIGHT : 1));
          if (x < x0) x0 = x;
          if (x > x1) x1 = x;
        }
      }
      if (!px.length) return null;
      const cum = new Float64Array(weights.length);
      let acc = 0;
      for (let i = 0; i < weights.length; i++) { acc += weights[i]; cum[i] = acc; }
      return { px, cum, total: acc, w: c.width, h: c.height, x0, x1: x1 + 1 };
    }).catch(() => { source = null; return null; });
  }
  return source.then((s) => (s ? sample(s, count, seed) : null));
}

/* Targets in random order, so any prefix of them is a uniform subset of
   the mark (the quality tiers draw a prefix). */
function sample(s, count, seed) {
  const rand = rng(seed);
  const targets = new Float32Array(count * 3);
  const ts = new Float32Array(count);
  const scale = LOGO_W / s.w;
  const cx = s.w / 2;
  const cy = s.h / 2;
  for (let i = 0; i < count; i++) {
    // weighted pick by binary search on the cumulative weights
    const u = rand() * s.total;
    let lo = 0;
    let hi = s.cum.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (s.cum[mid] < u) lo = mid + 1; else hi = mid;
    }
    const x = s.px[lo * 2] + rand();
    const y = s.px[lo * 2 + 1] + rand();
    targets[i * 3] = (x - cx) * scale;
    targets[i * 3 + 1] = -(y - cy) * scale;
    targets[i * 3 + 2] = (rand() - 0.5) * 0.55;
    // 0 → 1 across the drawn mark (not the whole image, which has wide
    // transparent margins): the writing, the glints and the sweep all
    // travel over the mark itself
    ts[i] = Math.min(1, Math.max(0, (x - s.x0) / (s.x1 - s.x0)));
  }

  // Additive grains burn to white where strokes are dense: dim each grain
  // by the square root of its cell's crowding against the mean.
  const CELL = 0.09;
  const counts = new Map();
  const keys = new Int32Array(count);
  for (let i = 0; i < count; i++) {
    const k = ((Math.floor(targets[i * 3] / CELL) + 512) << 10) | (Math.floor(targets[i * 3 + 1] / CELL) + 512);
    keys[i] = k;
    counts.set(k, (counts.get(k) || 0) + 1);
  }
  const mean = count / counts.size;
  const dens = new Float32Array(count);
  for (let i = 0; i < count; i++) dens[i] = Math.min(1, Math.max(0.45, 1 / Math.sqrt(counts.get(keys[i]) / mean)));

  return { targets, ts, dens };
}

/* The mark's pose as the rig plays it: at rest it is turned `yaw` (a 3/4
   view); idle sway and the pointer turn it by up to `lean` either way. */
export const POSE = { yaw: 0.2, lean: 0.255 };

/* Where the formed mark sits, by the shape of the window it is seen in
   (the drawn mark is about 4.4 × 4.6 world units at scale 1). `win` is
   that window's height in CSS px, so px rules can be kept. `alpha` dims
   the mark where it must sit behind copy — by light, never by
   transparency.
   "hero":  large, owning the right of the stage. Where the copy runs
            wider than half the window (near-square desktop windows,
            landscape phones) the mark takes the room right of it, smaller.
            On phones and tablets the copy fills the width, so it sits
            dimmed in the top-right corner, above the beat titles.
   "aside": the Work page's desktop mark — far right, clear of a headline
            that spans most of the width; beside the copy when the window
            is near square.
   "band":  the Work page on phones — centred in its own ruled strip, two
            thirds of its height, the data streams inside its faded
            edges. */
export function logoPlacement(aspect, place = "hero", win = 0) {
  const width = aspect * win;
  if (place === "band") return { scale: Math.min(1.3, (0.8 * halfHeightAt(0) * aspect) / 4.5), x: 0, y: 0, alpha: 1 };
  if (place === "aside") {
    if (aspect >= 1.25) return { scale: 0.72, x: 6.0, y: -0.2, alpha: 1 };
    if (aspect >= 0.8 && width > 860) {
      // work.css: the lead's 660px measure; the headline, at 5.4vw, runs ~0.6 of the width
      return { ...besideCopy(width, win, Math.max(Math.min(660, wrapOf(width)), 0.6 * width), 0.55), y: 1.2 };
    }
    if (aspect >= 0.8) return { scale: 0.55, x: 2.8, y: 1.2, alpha: 1 };
    return { scale: 0.42, x: 1.0, y: 2.6, alpha: 1 };
  }
  // landing.css: the lead's 620px measure; the headline, at 5.9vw, runs ~0.56 of the width
  const reach = () => Math.max(Math.min(620, wrapOf(width)), 0.56 * width);
  if (aspect >= 1.25) {
    const wide = { scale: 1.15, x: 4.8, y: 0.2, alpha: 1 };
    return width > 560 && width <= 860 ? { ...wide, ...besideCopy(width, win, reach(), 1.15) } : wide;
  }
  if (aspect >= 0.8 && width > 860) return { ...besideCopy(width, win, reach(), 1.0), y: 0.3 };
  if (aspect >= 0.8 && !win) return { scale: 1.0, x: 1.8, y: 0.8, alpha: 0.9 };
  return phonePlacement(win);
}

const wrapOf = (width) => (width > 860 ? Math.min(1200, width - 88) : width - 44);   // .wrap

/* The room right of copy that reaches `reach` px past the .wrap's left
   edge: the mark's scale (at most `max`, 5% spare for its turn) and x. Too
   little room even at the smallest scale: it is dimmed where it overlaps. */
function besideCopy(width, win, reach, max) {
  const k = win / (2 * halfHeightAt(0));   // CSS px per world unit at the mark's depth
  const from = (width - wrapOf(width)) / 2 + reach + 24;
  const room = width - 16 - from;
  const fit = room / (4.66 * k);
  return { scale: Math.max(0.4, Math.min(max, fit)), x: (from + room / 2 - width / 2) / k, alpha: fit < 0.4 ? 0.6 : 1 };
}

/* Phones: each beat's copy (at most ~300px) is centred in the window, its
   titles starting about 108px above the middle. The mark's lowest point
   stays 10px above them (idle bob and the result's 3% swell included). It
   shrinks only where that would leave less than 65% of it below the
   topbar (~62px); without a window height, the tall-phone values. */
function phonePlacement(win) {
  const H0 = halfHeightAt(0);
  const k = win / (2 * H0);   // CSS px per world unit at the mark's depth
  const base = { scale: 0.62, x: 1.9, y: 2.6, alpha: 0.6 };
  if (!(k > 0)) return base;
  const scale = Math.max(0.4, Math.min(0.62, (H0 - 180 / k - 0.05) / 3.09));
  return { ...base, scale, y: 118 / k + 2.37 * scale + 0.05 };
}

/* The copy lane, for a window of `width` × `win` CSS px (its `aspect`)
   on the landing hero: [ndc x edge, ndc y edge, feather] — grains inside
   are dimmed so the beat copy always reads. Wide screens: the text column
   on the left (the .wrap gutter plus .beat-t's 860px measure). Narrow
   screens: everything below the top of the centred beat copy. */
export function stageLayout(width, aspect, win = 0) {
  const wrap = wrapOf(width);
  const laneX = (((width - wrap) / 2 + Math.min(860, wrap)) / width) * 2 - 1;
  const free = (1 - laneX) * halfHeightAt(1.0) * aspect;
  if (aspect >= 0.8 && free >= 3) return { lane: [laneX, 2, 0.12] };
  return { lane: [2, win > 0 ? Math.min(0.9, Math.max(0.2, 300 / win)) : 0.45, 0.12] };
}
