/*
  Writes src/three/logo-outline.json: the DQ mark's vector outline, traced
  once from public/logo.png. The logo is fixed, so the site ships the
  result instead of tracing on every visit. Re-run only if the logo file
  ever changes:

    node scripts/trace-logo.mjs [out.json]

  (An explicit output path leaves the shipped file alone — for checking
  that the output is byte-for-byte reproducible.)

  No dependencies: a minimal PNG decoder (zlib from Node) feeds the same
  pure pipeline the site used to run in the browser (src/three/trace.js).
*/
import { readFileSync, writeFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import { inflateSync } from "node:zlib";
import { fileURLToPath } from "node:url";
import { traceOutline } from "../src/three/trace.js";

const root = (p) => fileURLToPath(new URL(`../${p}`, import.meta.url));
const SRC = root("public/logo.png");
const OUT = process.argv[2] ? resolve(process.argv[2]) : root("src/three/logo-outline.json");

/* 8-bit, non-interlaced PNG → alpha channel as 0..1 floats. Handles the
   colour types a logo export uses (palette + tRNS, grey/RGB with or
   without alpha); anything else fails loudly rather than tracing junk. */
function decodeAlpha(buf) {
  const SIG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (!SIG.every((b, i) => buf[i] === b)) throw new Error("not a PNG");
  let ihdr = null;
  let trns = null;
  const idat = [];
  for (let o = 8; o < buf.length; ) {
    const len = buf.readUInt32BE(o);
    const type = buf.toString("latin1", o + 4, o + 8);
    const data = buf.subarray(o + 8, o + 8 + len);
    if (type === "IHDR") {
      ihdr = { w: data.readUInt32BE(0), h: data.readUInt32BE(4), depth: data[8], ctype: data[9], interlace: data[12] };
    } else if (type === "tRNS") trns = data;
    else if (type === "IDAT") idat.push(data);
    else if (type === "IEND") break;
    o += 12 + len;
  }
  if (!ihdr) throw new Error("PNG without IHDR");
  const { w, h, depth, ctype, interlace } = ihdr;
  const ch = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[ctype];
  if (depth !== 8 || interlace || !ch) throw new Error(`unsupported PNG (depth ${depth}, colour type ${ctype}, interlace ${interlace})`);

  const raw = inflateSync(Buffer.concat(idat));
  const stride = w * ch;
  const px = new Uint8Array(stride * h);
  for (let y = 0; y < h; y++) {
    const filter = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const cur = px.subarray(y * stride, (y + 1) * stride);
    const prev = y ? px.subarray((y - 1) * stride, y * stride) : null;
    for (let x = 0; x < stride; x++) {
      const a = x >= ch ? cur[x - ch] : 0;
      const b = prev ? prev[x] : 0;
      const c = prev && x >= ch ? prev[x - ch] : 0;
      let v = line[x];
      if (filter === 1) v += a;
      else if (filter === 2) v += b;
      else if (filter === 3) v += (a + b) >> 1;
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      cur[x] = v & 255;
    }
  }

  const alpha = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    if (ctype === 6) alpha[i] = px[i * 4 + 3] / 255;
    else if (ctype === 4) alpha[i] = px[i * 2 + 1] / 255;
    else if (ctype === 3) alpha[i] = (trns && px[i] < trns.length ? trns[px[i]] : 255) / 255;
    else alpha[i] = 1;
  }
  return { w, h, alpha };
}

const round = (v) => Math.round(v * 1000) / 1000;
const t0 = performance.now();
const { w, h, alpha } = decodeAlpha(readFileSync(SRC));
const traced = traceOutline(alpha, w, h);
if (!traced) throw new Error("trace found no outline");

const out = {
  source: "public/logo.png",
  aspect: round(traced.aspect),
  outers: traced.outers.map((o) => ({
    points: o.points.map((p) => p.map(round)),
    holes: o.holes.map((hole) => hole.map((p) => p.map(round))),
  })),
};
writeFileSync(OUT, JSON.stringify(out) + "\n");
const pts = out.outers.reduce((n, o) => n + o.points.length + o.holes.reduce((m, hh) => m + hh.length, 0), 0);
console.log(
  `${basename(OUT)}: ${out.outers.length} outlines, ${out.outers.reduce((n, o) => n + o.holes.length, 0)} holes, ` +
    `${pts} points, ${(JSON.stringify(out).length / 1024).toFixed(1)} KB (${Math.round(performance.now() - t0)} ms)`
);
