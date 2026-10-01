/*
  Post-build: give /work its own <head> for link-preview scrapers, write
  the 404 page, and check that index.html's static copy (contact details,
  the home description) still matches the data.

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

/* The home description is the one the page sets at runtime
   (PAGE_META.home): scrapers read index.html's copy as written. */
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

/* dist/404.html: Vercel serves it, with a real 404 status, for every
   address that isn't a page (vercel.json rewrites only the two routes).
   The app boots from it and the router shows the NotFound page; its
   static head is already the 404's — not indexed, no canonical. */
{
  const meta = PAGE_META.notFound;
  const title = esc(fullTitle(meta.title));
  let html = src;
  html = swap(html, /(<title>)[^<]*(<\/title>)/, title, "<title>");
  html = swap(html, /(<meta name="description" content=")[^"]*(")/, esc(meta.description), "meta description");
  html = swap(html, /(<link rel="canonical" href=")[^"]*(")/, "", "canonical link")
    .replace(/<link rel="canonical" href="" \/?>\s*/, "");
  html = html.replace("</head>", '  <meta name="robots" content="noindex, follow" />\n</head>');
  writeFileSync(join(dist, "404.html"), html);
  console.log("404 page written: /404.html");
}
