/*
  Particle targets sampled from the DQ logo (public/logo.png, white on
  transparent). The two sweeping arcs and the DQ letters are sampled;
  the tagline text band between them is skipped — at particle
  resolution it would only read as noise. The letters carry extra
  weight so they stay legible against the larger arcs.

  Returns positions centred on the origin in world units (about 8.8
  wide), plus a 0→1 value per point along x for the light sweep.
  Loaded once and cached; resolves to null if the image fails, in
  which case ParticleField falls back to the stream layout.
*/

const LOGO_W = 8.8;
// fractions of the image: rows holding the tagline, box holding "DQ"
const TAGLINE = [0.585, 0.69];
const LETTERS = { x: [0.36, 0.64], y: [0.34, 0.58] };
const LETTER_WEIGHT = 1.4;

let cache = null;

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export function loadLogoTargets(count, seed = 23) {
  if (cache) return cache.then((s) => (s ? sample(s, count, seed) : null));
  cache = loadImage("/logo.png")
    .then((img) => {
      const c = document.createElement("canvas");
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      const ctx = c.getContext("2d", { willReadFrequently: true });
      ctx.drawImage(img, 0, 0);
      const { data } = ctx.getImageData(0, 0, c.width, c.height);
      const px = [];
      const weights = [];
      for (let y = 0; y < c.height; y++) {
        const fy = y / c.height;
        if (fy > TAGLINE[0] && fy < TAGLINE[1]) continue;
        for (let x = 0; x < c.width; x++) {
          const a = data[(y * c.width + x) * 4 + 3];
          if (a < 40) continue;
          const fx = x / c.width;
          const letter =
            fx > LETTERS.x[0] && fx < LETTERS.x[1] && fy > LETTERS.y[0] && fy < LETTERS.y[1];
          px.push(x, y);
          weights.push((a / 255) * (letter ? LETTER_WEIGHT : 1));
        }
      }
      if (!px.length) return null;
      const cum = new Float64Array(weights.length);
      let acc = 0;
      for (let i = 0; i < weights.length; i++) { acc += weights[i]; cum[i] = acc; }
      return { px, cum, total: acc, w: c.width, h: c.height };
    })
    .catch(() => null);
  return cache.then((s) => (s ? sample(s, count, seed) : null));
}

function sample(s, count, seed) {
  let r = seed;
  const rand = () => { r = (r * 16807) % 2147483647; return (r - 1) / 2147483646; };
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
    ts[i] = x / s.w;
  }
  return { targets, ts };
}

/* Where the formed mark sits, by viewport shape. `alpha` dims the solid
   mark where it must sit behind copy.
   "hero":  large, owning the right half of the stage and bleeding off
            its edge on wide screens; peeking from the top-right corner,
            dimmed, on phones where the copy fills the stage.
   "aside": the ambient mark on the Work page — far right, clear of a
            headline that spans most of the width. */
export function logoPlacement(aspect, place = "hero") {
  if (place === "aside") {
    if (aspect >= 1.25) return { scale: 0.72, x: 6.0, y: -0.2, alpha: 1 };
    if (aspect >= 0.8) return { scale: 0.55, x: 2.8, y: 1.2, alpha: 1 };
    return { scale: 0.42, x: 1.0, y: 2.6, alpha: 1 };
  }
  if (aspect >= 1.25) return { scale: 1.15, x: 4.8, y: 0.2, alpha: 1 };
  if (aspect >= 0.8) return { scale: 1.0, x: 1.8, y: 0.8, alpha: 0.9 };
  return { scale: 0.62, x: 1.9, y: 2.6, alpha: 0.6 };
}
