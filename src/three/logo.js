/*
  The DQ logo as the scene uses it, and where things sit on the stage.
  Three-free (main bundle).

  - loadLogoShapes(): the mark's vector outline, precomputed by
    scripts/trace-logo.mjs (nothing is traced in the browser). The solid
    mark and the 2D poster both draw it.
  - logoPlacement() / stageLayout() / POSE: where the mark and the copy
    lane sit, by the shape of the canvas they are seen in.
*/
import { halfHeightAt } from "./shared.js";

let outline = null;
export function loadLogoShapes() {
  // a failed fetch resolves null but isn't kept: the next mount retries
  if (!outline) outline = import("./logo-outline.json").then((m) => m.default, () => { outline = null; return null; });
  return outline;
}

/* The mark's pose as the rig plays it: at rest it is turned `yaw` (a 3/4
   view); idle sway and the pointer turn it from there. */
export const POSE = { yaw: 0.2 };

/* Where the formed mark sits, by the shape of the window it is seen in
   (the drawn mark is about 4.4 × 4.6 world units at scale 1). `win` is
   that window's height in CSS px, so px rules can be kept. `alpha` dims
   the mark where it must sit behind copy — by light, never by
   transparency.
   "hero":  on desktops, sized to and centred in the free space right of
            the copy (heroDesktop); on landscape phones, beside the copy;
            on phones and portrait tablets the copy fills the width, so it
            sits dimmed in the top-right corner, behind the headline.
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
  // desktops: centred in the free space right of the copy
  if (width > 860 && win > 0) return heroDesktop(width, win);
  // landing.css: the lead's 620px measure; the headline, at 5.9vw, runs ~0.56 of the width
  const reach = () => Math.max(Math.min(620, wrapOf(width)), 0.56 * width);
  if (aspect >= 1.25) {
    const wide = { scale: 1.15, x: 4.8, y: 0.2, alpha: 1 };
    if (width > 560 && width <= 860) return { ...wide, ...besideCopy(width, win, reach(), 1.15) };
    return wide;
  }
  if (aspect >= 0.8 && !win) return { scale: 1.0, x: 1.8, y: 0.8, alpha: 0.9 };
  return phonePlacement(width, win);
}

const wrapOf = (width) => (width > 860 ? Math.min(1200, width - 88) : width - 44);   // .wrap

/* The landing hero on a desktop: the mark sits in the free space right
   of the copy — sized to it and centred in it, at least 40px clear of
   the copy, 48px of the window's right edge, the island above (100px)
   and the foot (40px). The copy's widest line is the larger of the
   lead (620px), the headline (~8.3em at clamp(2.6rem, 5.9vw, 5.5rem))
   and the credentials row (min(800px, 62vw)) — landing.css. The drawn
   mark is ~4.66 × 4.85 world units at scale 1 with its swell and turn;
   too little room even at the smallest scale and it is dimmed. */
function heroDesktop(width, win) {
  const k = win / (2 * halfHeightAt(0));   // CSS px per world unit at the mark's depth
  const font = Math.min(88, Math.max(41.6, 0.059 * width));
  const reach = Math.max(Math.min(620, wrapOf(width)), 8.3 * font, Math.min(800, 0.62 * width));
  const left = (width - wrapOf(width)) / 2 + reach + 40;
  const right = width - 48;
  const top = 100;
  const bottom = win - 40;
  const fitW = (right - left) / (4.66 * k);
  const fitH = (bottom - top) / (4.85 * k);
  const scale = Math.max(0.4, Math.min(1.25, fitW, fitH));
  return {
    scale,
    x: ((left + right) / 2 - width / 2) / k,
    y: (win / 2 - (top + bottom) / 2) / k,
    alpha: fitW < 0.4 ? 0.6 : 1,
  };
}

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

/* Phones and portrait tablets: the copy fills the width, so the mark sits
   dimmed in the top-right corner, behind the headline. It shrinks only
   where that would leave less than 65% of it below the top bar, and moves
   in from the right only as far as it must to keep its right edge inside
   the window (its right half is 2.21 units; 2.5 covers its 3% swell, the
   turn and its depth in perspective). Without a window height, the
   tall-phone values. */
function phonePlacement(width, win) {
  const H0 = halfHeightAt(0);
  const k = win / (2 * H0);   // CSS px per world unit at the mark's depth
  const base = { scale: 0.62, x: 1.9, y: 2.6, alpha: 0.6 };
  if (!(k > 0)) return base;
  const scale = Math.max(0.4, Math.min(0.62, (H0 - 180 / k - 0.05) / 3.09));
  const x = Math.min(base.x, (width / 2 - 12) / k - 2.5 * scale);
  return { ...base, scale, x, y: 118 / k + 2.37 * scale + 0.05 };
}

/* The copy lane, for a window of `width` × `win` CSS px (its `aspect`)
   on the landing hero: [ndc x edge, ndc y edge, feather] — grains inside
   are dimmed so the copy always reads. Wide screens: the text column on
   the left (the .wrap gutter plus an 860px measure). Narrow screens:
   everything below the top of the copy. */
export function stageLayout(width, aspect, win = 0) {
  const wrap = wrapOf(width);
  const laneX = (((width - wrap) / 2 + Math.min(860, wrap)) / width) * 2 - 1;
  const free = (1 - laneX) * halfHeightAt(1.0) * aspect;
  if (aspect >= 0.8 && free >= 3) return { lane: [laneX, 2, 0.12] };
  return { lane: [2, win > 0 ? Math.min(0.9, Math.max(0.2, 300 / win)) : 0.45, 0.12] };
}
