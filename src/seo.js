import { useEffect } from "react";
import { WORK_DESCRIPTION } from "./data/work.js";

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

/* The home page passes the full brand line; other pages get " — DataQuin". */
export const fullTitle = (title) => (title.startsWith(BRAND) ? title : `${title} — ${BRAND}`);

/*
  Each page's title and description, derived from the data so no count
  can drift. Pages can pass these straight to usePageMeta
  (`usePageMeta(PAGE_META.home)`), and scripts/route-heads.mjs writes the
  Case Studies head into the build from the same object — its description
  itself lives in data/work.js, which Work.jsx reads too. This module
  only touches the DOM inside the hook, so Node can import it.
*/
export const PAGE_META = {
  home: {
    title: "DataQuin — Data · Automation · AI Engineering",
    description: `DataQuin turns manual days into automated hours — dashboards and reporting, system-to-system integration and AI pipelines for professional services firms, shown through selected case studies.`,
    path: "/",
  },
  work: { title: "Case Studies", description: WORK_DESCRIPTION, path: "/case-studies" },
  // path is the address that failed; NotFound adds it
  notFound: {
    title: "Page not found",
    description: "That page doesn't exist. Browse the DataQuin case studies and tech stack instead.",
    noindex: true,
  },
};

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
    const full = fullTitle(title);
    const url = SITE_URL + path;

    document.title = full;
    setMeta("name", "description", description);
    setMeta("property", "og:title", full);
    setMeta("property", "og:description", description);
    setMeta("property", "og:url", url);
    setMeta("name", "twitter:title", full);
    setMeta("name", "twitter:description", description);
    // An unknown URL opened directly gets dist/404.html (a 404, noindex);
    // one reached inside the app is only a route, so it opts out here too.
    setMeta("name", "robots", noindex ? "noindex, follow" : "index, follow");

    // A noindex page must not also declare a canonical: the two
    // contradict each other. The 404 page drops it.
    const canonical = document.head.querySelector('link[rel="canonical"]');
    if (noindex) {
      canonical?.remove();
    } else {
      upsert('link[rel="canonical"]', () => {
        const l = document.createElement("link");
        l.setAttribute("rel", "canonical");
        return l;
      }).setAttribute("href", url);
    }
  }, [title, description, path, noindex]);
}
