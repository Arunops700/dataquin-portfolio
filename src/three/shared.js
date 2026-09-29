/*
  Constants and loaders shared by the grain sampler (main bundle), the
  outline generator (Node, scripts/trace-logo.mjs) and the 3D chunk.
  No three.js import and no browser API at module level: Node imports
  this file too.
*/
const LOGO_SRC = "/logo.png";
export const LOGO_W = 8.8;              // world units across the logo
export const TAGLINE = [0.585, 0.69];   // image rows holding the tagline (skipped)
export const CAMERA_Z = 11;
export const CAMERA_FOV = 45;

/* Half the visible height, in world units, of a plane at depth z facing
   the camera. The poster and the placements frame things with it. */
export const halfHeightAt = (z = 0) => (CAMERA_Z - z) * Math.tan((CAMERA_FOV / 2) * (Math.PI / 180));

/* Park–Miller minimal standard. Deterministic, so the picture is the same
   on every load (and the same as the three inline copies it replaced). */
export function rng(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

let logoImg = null;
/* One fetch, one decode. Resolves to null on failure. */
export function loadLogoImage() {
  if (!logoImg) {
    logoImg = new Promise((resolve, reject) => {
      const img = new Image();
      img.decoding = "async";
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = LOGO_SRC;
    })
      .then((img) => (img.decode ? img.decode().then(() => img, () => img) : img))
      .catch(() => { logoImg = null; return null; }); // not kept: the next mount retries
  }
  return logoImg;
}
