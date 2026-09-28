/*
  Post-build: give /work its own <head> for link-preview scrapers.

  The SPA serves one index.html for every route, so LinkedIn, Slack and
  WhatsApp (which run no JavaScript) would show the home page's title
  and description for a shared /work link. Vercel serves static files
  before applying rewrites, so writing dist/work/index.html with the
  Work page's meta gives that route a correct preview while the app
  itself behaves exactly as before.
*/
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const dist = join(process.cwd(), "dist");
const src = readFileSync(join(dist, "index.html"), "utf8");

const ROUTES = {
  work: {
    title: "The Work — DataQuin",
    description:
      "Six production systems built for professional services firms — cross-system integration, AI-accelerated BI delivery, fraud alerting, client activity reporting, centralized reporting and an AI documentation coworker. Anonymized, measured, still running.",
    url: "https://dataquin.vercel.app/work",
  },
};

const esc = (s) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

for (const [route, meta] of Object.entries(ROUTES)) {
  let html = src
    .replace(/<title>[^<]*<\/title>/, `<title>${esc(meta.title)}</title>`)
    .replace(/(<meta name="description" content=")[^"]*(")/, `$1${esc(meta.description)}$2`)
    .replace(/(<link rel="canonical" href=")[^"]*(")/, `$1${meta.url}$2`)
    .replace(/(<meta property="og:url" content=")[^"]*(")/, `$1${meta.url}$2`)
    .replace(/(<meta property="og:title" content=")[^"]*(")/, `$1${esc(meta.title)}$2`)
    .replace(/(<meta property="og:description" content=")[^"]*(")/, `$1${esc(meta.description)}$2`)
    .replace(/(<meta name="twitter:title" content=")[^"]*(")/, `$1${esc(meta.title)}$2`)
    .replace(/(<meta name="twitter:description" content=")[^"]*(")/, `$1${esc(meta.description)}$2`);
  const dir = join(dist, route);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "index.html"), html);
  console.log(`route head written: /${route}`);
}
