/*
  Post-build: give /work its own <head> for link-preview scrapers, and
  check that index.html's static copy (contact details, the case-study
  count, the home description) still matches the data.

  The SPA serves one index.html for every route, so LinkedIn, Slack and
  WhatsApp (which run no JavaScript) would show the home page's title
  and description for a shared /work link. Vercel serves static files
  before applying rewrites, so writing dist/work/index.html with the
  Work page's meta gives that route a correct preview while the app
  itself behaves exactly as before. The meta comes from PAGE_META in
  src/seo.js, whose /work description is the one the page itself sets
  (src/data/work.js), so the preview can't drift from the page.
*/
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { PAGE_META, SITE_URL, fullTitle } from "../src/seo.js";
import { CONTACT } from "../src/data/site.js";
import { STUDIES } from "../src/data/caseStudies.js";
import { countWord } from "../src/data/format.js";

const dist = join(process.cwd(), "dist");
const src = readFileSync(join(dist, "index.html"), "utf8");

const esc = (s) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
const list = (a) => a.map((s) => `"${s}"`).join(", ");

/* index.html repeats the contact details statically (the JSON-LD and
   the noscript copy). A drift fails the build instead of shipping a
   stale phone number to crawlers. */
const phoneIntl = CONTACT.phoneIntl ?? CONTACT.phone.replace(/\s+/g, "-"); // JSON-LD form
const missing = [CONTACT.email, CONTACT.phone, phoneIntl].filter((s) => !src.includes(s));
// every copy must match, not just one of them
const stray = [
  ...(src.match(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g) ?? []).filter((s) => s !== CONTACT.email),
  ...(src.match(/\+\d[\d -]{8,}\d/g) ?? []).filter((s) => s !== CONTACT.phone && s !== phoneIntl),
];
if (missing.length || stray.length) {
  console.error(
    "route-heads: index.html is out of step with CONTACT in src/data/site.js —" +
      (missing.length ? ` missing ${list(missing)};` : "") +
      (stray.length ? ` unexpected ${list(stray)}` : "")
  );
  process.exitCode = 1;
}

/* The static copy also counts the case studies in words ("six production
   builds" in the description, "Six production systems" in the og and
   twitter previews and the noscript text). Scrapers read those as
   written, so every count must be the data's, and the description must
   be the one the home page sets at runtime (PAGE_META.home). A new case
   study fails the build until index.html says so. */
const count = countWord(STUDIES.length);
const counts = [...src.matchAll(/\b(\d+|[a-z]+(?:-[a-z]+)?) production (?:builds|systems)\b/gi)].map((m) => m[1]);
const wrong = counts.filter((w) => w.toLowerCase() !== count && w !== String(STUDIES.length));
if (wrong.length) {
  console.error(
    `route-heads: index.html counts ${list(wrong)} production builds/systems; ` +
      `the data (src/data/caseStudies.js) has ${count}`
  );
  process.exitCode = 1;
}
if (!src.includes(`<meta name="description" content="${esc(PAGE_META.home.description)}"`)) {
  console.error("route-heads: index.html's meta description differs from PAGE_META.home in src/seo.js");
  process.exitCode = 1;
}

/* Every swap must find its tag: a silent no-op (markup reordered or
   minified) would ship the home page's preview for the route. */
function swap(html, re, value, label) {
  if (!re.test(html)) throw new Error(`route-heads: ${label} not found in dist/index.html`);
  return html.replace(re, (_, open, close) => `${open}${value}${close}`);
}

const ROUTES = { work: PAGE_META.work };

for (const [route, meta] of Object.entries(ROUTES)) {
  const title = esc(fullTitle(meta.title));
  const description = esc(meta.description);
  const url = SITE_URL + meta.path;
  let html = src;
  html = swap(html, /(<title>)[^<]*(<\/title>)/, title, "<title>");
  html = swap(html, /(<meta name="description" content=")[^"]*(")/, description, "meta description");
  html = swap(html, /(<link rel="canonical" href=")[^"]*(")/, url, "canonical link");
  html = swap(html, /(<meta property="og:url" content=")[^"]*(")/, url, "og:url");
  html = swap(html, /(<meta property="og:title" content=")[^"]*(")/, title, "og:title");
  html = swap(html, /(<meta property="og:description" content=")[^"]*(")/, description, "og:description");
  html = swap(html, /(<meta name="twitter:title" content=")[^"]*(")/, title, "twitter:title");
  html = swap(html, /(<meta name="twitter:description" content=")[^"]*(")/, description, "twitter:description");
  const dir = join(dist, route);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "index.html"), html);
  console.log(`route head written: /${route}`);
}
