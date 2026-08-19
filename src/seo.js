import { useEffect } from "react";

/*
  Per-route document metadata.

  The static tags in index.html are what link-preview scrapers (LinkedIn,
  WhatsApp, Slack) read, because they don't run JavaScript — those describe
  the site as a whole. This hook updates the same tags at runtime so the
  browser tab, screen-reader page announcement, canonical URL and Google's
  JS-rendered crawl are correct per page.

  ── HOSTING ──────────────────────────────────────────────────────────
  SITE_URL is the one place the deployed origin is written. After the
  Vercel deploy, set it to the real hostname and run the same replacement
  over index.html, public/robots.txt and public/sitemap.xml, e.g.:

    grep -rl "dq-portfolio.vercel.app" index.html public src \
      | xargs sed -i 's|dq-portfolio\.vercel\.app|YOUR-REAL-HOST|g'
  ─────────────────────────────────────────────────────────────────────
*/
export const SITE_URL = "https://dq-portfolio.vercel.app";

const BRAND = "DataQuin";

/* Create the tag on first use, then just update it on later navigations. */
function upsert(selector, create) {
  let el = document.head.querySelector(selector);
  if (!el) {
    el = create();
    document.head.appendChild(el);
  }
  return el;
}

function setMeta(attr, key, content) {
  const el = upsert(`meta[${attr}="${key}"]`, () => {
    const m = document.createElement("meta");
    m.setAttribute(attr, key);
    return m;
  });
  el.setAttribute("content", content);
}

export function usePageMeta({ title, description, path, noindex = false }) {
  useEffect(() => {
    const full = title === BRAND ? title : `${title} — ${BRAND}`;
    const url = SITE_URL + path;

    document.title = full;
    setMeta("name", "description", description);
    setMeta("property", "og:title", full);
    setMeta("property", "og:description", description);
    setMeta("property", "og:url", url);
    setMeta("name", "twitter:title", full);
    setMeta("name", "twitter:description", description);
    // Unknown URLs still resolve with a 200 through the SPA rewrite, so the
    // "not found" page has to opt out of indexing by hand.
    setMeta("name", "robots", noindex ? "noindex, follow" : "index, follow");

    upsert('link[rel="canonical"]', () => {
      const l = document.createElement("link");
      l.setAttribute("rel", "canonical");
      return l;
    }).setAttribute("href", url);
  }, [title, description, path, noindex]);
}
