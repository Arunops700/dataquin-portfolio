import { Component, Suspense, createRef, lazy, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Routes, Route, NavLink, Link, useLocation, useNavigationType } from "react-router-dom";
import { LazyMotion, MotionConfig, domAnimation, m, useScroll, useMotionValueEvent, frame, cancelFrame } from "framer-motion";
import Landing from "./pages/Landing.jsx";
import { SmoothScroll, scrollTo } from "./motion/SmoothScroll.jsx";
import { usePageProgress } from "./motion/scroll.js";
import { useMedia, useReducedMotion, prefersReducedMotion } from "./motion/prefs.js";
import { MQ } from "./motion/tokens.js";

/* The landing ships in the main bundle; the other pages load on demand.
   A failed load is not remembered: the promise and the lazy component
   are both dropped, so the next visit to the page (the error screen's
   Home link, Back, the menu) fetches it again instead of rethrowing the
   cached failure. `load` also warms the chunk ahead of a visit. */
function lazyPage(importer) {
  let p = null;
  const load = () => (p ??= importer().catch((e) => {
    p = null;
    Lazy = lazy(load);
    throw e;
  }));
  let Lazy = lazy(load);
  const Page = (props) => <Lazy {...props} />;
  return { Page, load };
}
const WorkPage = lazyPage(() => import("./pages/Work.jsx"));
const NotFoundPage = lazyPage(() => import("./pages/NotFound.jsx"));

/* While a page's chunk is on its way the shell stays: an empty, screen-
   tall placeholder keeps the footer down, and marks the page as pending
   so the scroll code keeps waiting for its sections. */
const PAGE_PENDING = "page-pending";
const pagePending = () => !!document.querySelector(`.${PAGE_PENDING}`);

/* Moves keyboard focus to the start of the page — its h1, else <main> —
   without scrolling, so the next Tab continues from the top of the new
   content rather than from a topbar link (or from nothing, once the
   link that had focus has been unmounted). The h1 is announced, too. */
function focusPageStart() {
  const main = document.getElementById("main");
  if (!main) return;
  const h = main.querySelector("h1");
  if (h) {
    if (!h.hasAttribute("tabindex")) h.setAttribute("tabindex", "-1");
    h.focus({ preventScroll: true });
    if (document.activeElement === h) return; // an inert heading refuses focus
  }
  main.focus({ preventScroll: true });
}

/* If any component throws at runtime (or a page's chunk fails to
   load), React unmounts the whole tree, leaving a blank page. This
   boundary catches the error, keeps the shell
   (topbar, footer) alive and shows a designed status screen built from
   nothing that could fail for the same reason — no Reveal, Magnetic or
   3D. It remounts with every path (.page is keyed), and resetKey (the
   location key) clears it on any other navigation, so "Home" on a
   failed home page retries too. An error on a freshly opened page
   arrives through componentDidMount. Focus goes to the heading either
   way. */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null, resetKey: props.resetKey };
    this.head = createRef();
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  // A new location clears the error within the same render, so a retry
  // never commits the stale error screen first (its heading would take
  // focus and be announced, then vanish)
  static getDerivedStateFromProps(props, state) {
    return props.resetKey !== state.resetKey ? { error: null, resetKey: props.resetKey } : null;
  }
  componentDidCatch(error, info) {
    console.error("Page error caught by boundary:", error, info);
  }
  componentDidMount() {
    if (this.state.error) this.head.current?.focus();
  }
  componentDidUpdate(prevProps, prevState) {
    if (this.state.error && !prevState.error) this.head.current?.focus();
    // a retry worked: the error heading that held focus has been removed
    if (prevState.error && !this.state.error) focusPageStart();
  }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <section className="band dark hero-band hero-sub pad-b status-screen">
        <div className="hero-grid" aria-hidden="true" />
        <div className="wrap">
          <div className="hero-meta">
            <span><b>Recoverable error</b></span>
            <span>DQ / ERR</span>
          </div>
          <h1 className="h-xl sm" tabIndex={-1} ref={this.head}>
            Something went wrong — <em className="foil">the site is still here.</em>
          </h1>
          <p className="lead hero-lead">
            A section failed to load. Use the menu to switch pages, or reload.
          </p>
          <div className="hero-actions">
            <button type="button" className="btn btn-gold" onClick={() => window.location.reload()}>
              Reload page
            </button>
            <Link to="/" className="btn btn-line">Home</Link>
          </div>
        </div>
      </section>
    );
  }
}

/* Two pages. "The Work" is a page; Contact is a section of the landing page. */
const NAV = [
  { to: "/work", label: "The Work", path: "/work" },
  { to: "/#contact", label: "Contact", path: "/", section: "contact" },
];

/* Which of the open page's nav sections the reader is in, judged by the
   same reading band as the Work rail (35–45% down the viewport, see
   Work.jsx). A section item is lit while its section is actually on
   screen — not because the URL once carried its hash, which went stale
   the moment the reader scrolled away. Both pages render their sections
   on mount; one that isn't there leaves the page item lit. */
function useSectionInView(ids, pathname) {
  const [inView, setInView] = useState(null);
  const key = ids.join(" ");
  useEffect(() => {
    setInView(null);
    const els = key ? key.split(" ").map((id) => document.getElementById(id)).filter(Boolean) : [];
    if (!els.length || typeof IntersectionObserver !== "function") return;
    const inBand = new Set();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) inBand.add(e.target.id);
          else inBand.delete(e.target.id);
        }
        setInView(els.find((el) => inBand.has(el.id))?.id ?? null);
      },
      { rootMargin: "-35% 0px -55% 0px" }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [key, pathname]);
  return inView;
}

function Topbar() {
  const { pathname } = useLocation();
  // framer's shared window listener; read here, bound to no style
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(() => window.scrollY > 24);
  useMotionValueEvent(scrollY, "change", (v) => setScrolled(v > 24));
  const sections = NAV.filter((n) => n.section && n.path === pathname).map((n) => n.section);
  const inView = useSectionInView(sections, pathname);

  return (
    <header className={`topbar${scrolled ? " scrolled" : ""}`}>
      <div className="wrap topbar-in">
        <NavLink to="/" className="brand" end aria-label="DataQuin — home">
          <span className="brand-logo" aria-hidden="true" />
        </NavLink>
        <nav aria-label="Primary">
          {NAV.map((n) => {
            const onPath = n.path === pathname;
            // one item lit at a time: the section being read, else the page
            const lit = n.section ? onPath && inView === n.section : onPath && !inView;
            // the page link is always "the current page"; a section is a location in it
            const current = n.section ? (lit ? "location" : undefined) : onPath ? "page" : undefined;
            return (
              <Link key={n.to} to={n.to} className={lit ? "active" : undefined} aria-current={current}>
                {n.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}

/* Gold hairline that fills as the reader moves through the page. It is
   scroll-linked only, so it stays under reduced motion. framer measures
   on scroll and window resize; a page that grows or shrinks in place
   (a lazy page arriving, late web fonts) is caught by the ResizeObserver. */
function Progress() {
  const p = usePageProgress();
  useEffect(() => {
    if (typeof ResizeObserver !== "function") return;
    const root = document.documentElement;
    const sync = () => {
      const max = root.scrollHeight - root.clientHeight;
      p.set(max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0);
    };
    const ro = new ResizeObserver(sync);
    ro.observe(document.body);
    return () => ro.disconnect();
  }, [p]);
  return (
    <div className="progress" aria-hidden="true">
      <m.div className="progress-bar" style={{ scaleX: p }} />
    </div>
  );
}

/* Cursor-following warm light, for mouse users with motion allowed.
   One fixed disc moved by transform: a pointer move restyles nothing
   else (custom properties on <html> used to restyle the whole document
   on every move). */
function Spotlight() {
  const fine = useMedia(MQ.fine);
  const reduced = useReducedMotion();
  const on = fine && !reduced;
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!on || !el) return;
    const half = el.offsetWidth / 2;
    let raf = 0;
    let x = 0;
    let y = 0;
    let dark = false;
    let lit = false;
    let seen = false;   // a pointer position exists to probe from
    // The light only shows over espresso: on paper it would sit over the
    // ink and pull the faintest text under 4.5:1. The nearest surface
    // decides (a paper blueprint panel inside a dark chapter is paper);
    // over fixed chrome (topbar, rail) it rests, rather than light the
    // paper that may lie under the disc.
    const tone = (t) => {
      const s = t?.closest?.(".flow-panel, .band");
      return !!s && (s.classList.contains("flow-panel") ? !s.classList.contains("is-paper") : s.classList.contains("dark"));
    };
    const paint = () => {
      raf = 0;
      el.style.transform = `translate3d(${x - half}px, ${y - half}px, 0)`;
      if (dark !== lit) { lit = dark; el.style.opacity = dark ? "1" : "0"; }
    };
    const onMove = (e) => {
      if (e.pointerType === "touch") return;
      x = e.clientX;
      y = e.clientY;
      seen = true;
      dark = tone(e.target);
      if (!raf) raf = requestAnimationFrame(paint);
    };
    // The page can scroll under a still pointer: re-read the surface there
    // in framer's read phase, ahead of its scroll-linked writes (so no
    // forced style flush), and paint in its render phase.
    const probe = () => {
      dark = tone(document.elementFromPoint(x, y));
      frame.render(paint);
    };
    const onScroll = () => { if (seen) frame.read(probe); };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
      cancelFrame(probe);
      cancelFrame(paint);
    };
  }, [on]);
  return on ? <div className="spotlight" ref={ref} aria-hidden="true" /> : null;
}

/* The close: the sign-off and the mark. */
function Footer() {
  return (
    <footer className="footer band dark">
      <div className="wrap">
        <div className="foot-top">
          <p className="foot-state">
            Driven by Purpose. <em className="foil">Powered by Precision.</em>
          </p>
          <span className="brand-logo foot-mark" role="img" aria-label="DataQuin" />
        </div>
      </div>
    </footer>
  );
}

/* After a hash landing, the section's header plays its arrival cue
   (layout.css): the foil tab runs out along the rule and settles back.
   It stands in for a focus ring round the whole section. Waits out a
   glide so the reader sees it; skipped under reduced motion. */
function markLanding(el, glide) {
  if (!el.matches("section, article") || prefersReducedMotion()) return;
  const head = el.querySelector(".shead");
  if (!head) return;
  if (head.hasAttribute("data-landed")) {
    head.removeAttribute("data-landed");
    void head.offsetWidth; // restart a cue that is still running
  }
  // after a jump, let the header's own reveal finish drawing first
  head.style.setProperty("--land-delay", glide ? "1s" : "0.6s");
  head.setAttribute("data-landed", "");
  const done = (e) => {
    if (e.animationName !== "tabLand") return;
    head.removeAttribute("data-landed");
    head.removeEventListener("animationend", done);
  };
  head.addEventListener("animationend", done);
}

/* Where each history entry was read to, so Back and Forward return to
   it. The browser's own restoration is switched off: it would aim
   before the new page has laid out, and against the smooth scroller.
   Kept in sessionStorage, so a reload or a return from another site
   finds it too. An entry with no router state (the first page of a
   visit) has the key "default"; it is filed by its address instead. */
if (typeof history !== "undefined" && "scrollRestoration" in history) history.scrollRestoration = "manual";
const SCROLLS = "dq:scroll";
const entryKey = (loc) => (loc.key && loc.key !== "default" ? loc.key : `@${loc.pathname}${loc.search}${loc.hash}`);
function readScrolls() {
  try { return JSON.parse(sessionStorage.getItem(SCROLLS)) || {}; } catch { return {}; }
}
function saveScroll(key, y) {
  try {
    const all = readScrolls();
    delete all[key]; // re-filed last, so the oldest entries drop first
    all[key] = Math.round(y);
    const keys = Object.keys(all);
    for (let i = 0; i < keys.length - 50; i++) delete all[keys[i]];
    sessionStorage.setItem(SCROLLS, JSON.stringify(all));
  } catch { /* storage blocked or full: Back opens at the top instead */ }
}
/* The first load returns to an offset only when the browser came back
   to the entry (a reload, Back from another site), never on a fresh visit */
function returningLoad() {
  const t = performance.getEntriesByType?.("navigation")?.[0]?.type;
  return t === "reload" || t === "back_forward";
}

/* Focus on a landed section's heading: a focused section can be read
   out whole by a screen reader (the cue still marks the section) */
function focusSection(el) {
  const head = el.matches("section, article") ? el.querySelector("h1, h2, h3") : null;
  const target = head || el;
  if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
  target.focus({ preventScroll: true });
  if (head && document.activeElement !== head) { // an inert heading refuses focus
    if (!el.hasAttribute("tabindex")) el.setAttribute("tabindex", "-1");
    el.focus({ preventScroll: true });
  }
}

/* Route + hash navigation.
   - A new path starts at the top; the path already open glides back up
     instead. Either way focus moves to the page's h1 (never on the
     first load), so a link at the foot of the page doesn't keep focus
     far below the reader.
   - A hash scrolls to its section once it exists in the DOM (the page
     may still be mounting, or its chunk loading, when the effect first
     runs) and moves focus there, so the next Tab continues from the
     section. A hash that never resolves (a stale link, a typo) still
     opens a new page at its top, not at the old page's offset.
   - Back and Forward return to the offset the entry was left at, once
     the page is tall enough to hold it; focus goes where an arrival
     would put it, without scrolling.
   - A cold deep link re-aims once web fonts arrive (the target moves as
     they swap) — unless the reader has started scrolling meanwhile. */
function useScrollNavigation() {
  const location = useLocation();
  const navType = useNavigationType();
  const lastPath = useRef(null);
  // the open entry and the reader's last offset in it
  const here = useRef({ key: null, y: 0 });

  useEffect(() => {
    const onScroll = () => { here.current.y = window.scrollY; };
    // leaving the site or reloading files the open entry too
    const onHide = () => { if (here.current.key) saveScroll(here.current.key, window.scrollY); };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pagehide", onHide);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pagehide", onHide);
    };
  }, []);

  useLayoutEffect(() => {
    const id = location.hash.slice(1);
    const first = lastPath.current === null;
    // a hash on a freshly mounted page jumps (there is nothing to glide
    // from); a move on the page already open glides
    const newPage = lastPath.current !== location.pathname;
    lastPath.current = location.pathname;
    // file the entry being left at its last offset (read from the scroll
    // events: the swapped page may already have clamped window.scrollY)
    const at = here.current;
    if (at.key) saveScroll(at.key, at.y);
    at.key = entryKey(location);
    const back = navType === "POP" && (!first || returningLoad()) ? readScrolls()[at.key] : undefined;

    let raf = 0;
    let alive = true;
    // Runs `done` once `ready()` holds, checking each frame. Frames spent
    // while a lazy page is still loading don't count against the budget
    // (capped at ~10s in all); `fail` runs when it is spent.
    const when = (ready, done, fail) => {
      let tries = 0;
      let frames = 0;
      const step = () => {
        if (!alive) return;
        if (ready()) done();
        else if ((pagePending() || tries++ < 30) && frames++ < 600) raf = requestAnimationFrame(step);
        else fail?.();
      };
      step();
    };
    const cleanup = () => { alive = false; cancelAnimationFrame(raf); };

    if (typeof back === "number") {
      // Back / Forward: the entry's own offset, once the page can hold it
      // (the tall landing, a lazy page still loading)
      const root = document.documentElement;
      const go = () => {
        scrollTo(back, { immediate: newPage });
        at.y = window.scrollY;
        if (first || !newPage) return;
        // the link that had focus left with the old page
        const el = id && document.getElementById(id);
        if (el) focusSection(el);
        else focusPageStart();
      };
      when(() => !pagePending() && root.scrollHeight - root.clientHeight >= back - 1, go, go);
      return cleanup;
    }

    if (!id) {
      scrollTo(0, { immediate: newPage });
      at.y = window.scrollY;
      // a lazy page's h1 arrives with its chunk
      if (!first) when(() => !pagePending(), focusPageStart, focusPageStart);
      return cleanup;
    }
    if (newPage) scrollTo(0, { immediate: true });
    at.y = window.scrollY;
    const land = () => {
      const el = document.getElementById(id);
      scrollTo(el, { immediate: newPage });
      focusSection(el);
      markLanding(el, !newPage);
      if (newPage && document.fonts && document.fonts.status !== "loaded") {
        const landed = window.scrollY;
        document.fonts.ready.then(() => {
          // two frames: the swapped layout (and the hero's lead-in,
          // re-measured by its ResizeObserver) settles before the aim
          requestAnimationFrame(() => requestAnimationFrame(() => {
            if (alive && Math.abs(window.scrollY - landed) < 4) scrollTo(el, { immediate: true });
          }));
        });
      }
    };
    when(() => document.getElementById(id), land, () => {
      if (newPage && !first) focusPageStart(); // a stale hash: the link that had focus is gone
    });
    return cleanup;
  }, [location.pathname, location.hash, location.key, navType]);
}

/* True once the reader has moved to a second path. The page turn never
   plays on the first load (it would compete with the hero's entrance)
   nor on hash moves within a page (the pathname key holds). */
function usePathChanged(pathname) {
  const [first] = useState(pathname);
  const [moved, setMoved] = useState(false);
  if (!moved && pathname !== first) setMoved(true);
  return moved;
}

function Shell() {
  const location = useLocation();
  const turned = usePathChanged(location.pathname);
  // film grain is a full-screen layer: kept off touch screens
  const coarse = useMedia(MQ.coarse);
  useScrollNavigation();

  // warm the Work page's chunk once the landing is idle (not on Save-Data)
  useEffect(() => {
    if (navigator.connection?.saveData) return;
    const idle = window.requestIdleCallback ?? ((cb) => setTimeout(cb, 2000));
    const cancel = window.cancelIdleCallback ?? clearTimeout;
    const t = idle(() => WorkPage.load().catch(() => {})); // a failure retries on the visit
    return () => cancel(t);
  }, []);

  return (
    <>
      <Progress />
      {turned && <div className="page-turn" key={location.pathname} aria-hidden="true" />}
      <Spotlight />
      {!coarse && <div className="grain" aria-hidden="true"></div>}
      <a className="skip-link" href="#main">Skip to content</a>
      <Topbar />
      <div className="page" key={location.pathname}>
        {/* focusable by script only: route changes land here */}
        <main id="main" tabIndex={-1}>
          <ErrorBoundary resetKey={location.key}>
            <Suspense fallback={<div className={PAGE_PENDING} aria-hidden="true" />}>
              <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/work" element={<WorkPage.Page />} />
                <Route path="*" element={<NotFoundPage.Page />} />
              </Routes>
            </Suspense>
          </ErrorBoundary>
        </main>
        {/* outside <main>, so assistive tech gets it as the site footer
            (contentinfo); inside .page, so it fades in with the page */}
        <Footer />
      </div>
    </>
  );
}

export default function App() {
  // LazyMotion + `m` components keep framer-motion's runtime small; the
  // pages only bind MotionValues to style, which needs no extra features.
  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">
        <SmoothScroll>
          <Shell />
        </SmoothScroll>
      </MotionConfig>
    </LazyMotion>
  );
}
