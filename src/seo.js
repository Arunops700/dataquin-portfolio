import { useEffect } from "react";

/*
  Per-route document metadata.

  The static tags in index.html are what link-preview scrapers (LinkedIn,
  WhatsApp, Slack) read, because they don't run JavaScript — those describe
  the site as a whole. This hook updates the same tags at runtime so the
  browser tab, screen-reader page announcement, canonical URL and Google's
  JS-rendered crawl are correct per page.

  ── HOSTING ──────────────────────────────────────────────────────────
  Live on Vercel at dataquin.vercel.app, auto-deployed from the main
  branch of Arunops700/dataquin-portfolio.

  The host is written in four places: here, index.html, public/robots.txt
  and public/sitemap.xml. To move to a custom domain (e.g. a subdomain of
  dataquin.com), add it in the Vercel dashboard first, then rewrite all
  four at once:

    grep -rl "dataquin.vercel.app" index.html public src \
      | xargs sed -i 's|dataquin\.vercel\.app|YOUR-NEW-HOST|g'

  Rebuild and push — Vercel redeploys on push. Keep the old domain
  redirecting to the new one so existing links and search results survive.
  ─────────────────────────────────────────────────────────────────────
*/
export const SITE_URL = "https://dataquin.vercel.app";

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
