import { Component, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Routes, Route, NavLink, Link, useLocation } from "react-router-dom";
import { LazyMotion, MotionConfig, domAnimation } from "framer-motion";
import Landing from "./pages/Landing.jsx";
import Work from "./pages/Work.jsx";
import NotFound from "./pages/NotFound.jsx";
import { SmoothScroll, scrollTo } from "./motion/SmoothScroll.jsx";

/* If any component throws at runtime, React unmounts the whole tree,
   leaving a blank page. This boundary catches the error, keeps the shell
   alive, and recovers automatically on the next navigation. */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    console.error("Page error caught by boundary:", error, info);
  }
  componentDidUpdate(prevProps) {
    if (this.state.error && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }
  render() {
    if (this.state.error) {
      return (
        <section className="band dark pad" style={{ minHeight: "70vh" }}>
          <div className="wrap" style={{ paddingTop: 90 }}>
            <div className="kicker">Recoverable error</div>
            <h1 className="h1">Something glitched — <em className="foil">the site is still here.</em></h1>
            <p className="lead" style={{ marginTop: 16 }}>
              A section failed to load. Use the menu to switch pages, or reload.
            </p>
            <button className="btn btn-gold" style={{ marginTop: 28 }}
              onClick={() => window.location.reload()}>
              Reload page
            </button>
          </div>
        </section>
      );
    }
    return this.props.children;
  }
}

/* Two pages. Hash links land on sections of the Work page. */
const NAV = [
  { to: "/work", label: "The Work", path: "/work", hash: "" },
  { to: "/work#impact", label: "Impact", path: "/work", hash: "#impact" },
  { to: "/#contact", label: "Contact", path: "/", hash: "#contact" },
];

function Topbar() {
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <header className={`topbar${scrolled ? " scrolled" : ""}`}>
      <div className="wrap topbar-in">
        <NavLink to="/" className="brand" end aria-label="DataQuin — home">
          <span className="brand-logo" role="img" aria-label="DataQuin — Driven by Purpose, Powered by Precision" />
        </NavLink>
        <nav aria-label="Primary">
          {NAV.map((n) => {
            const active =
              location.pathname === n.path &&
              (n.hash ? location.hash === n.hash : !NAV.some((o) => o.path === n.path && o.hash && o.hash === location.hash));
            return (
              <Link key={n.to} to={n.to} className={active ? "active" : ""} aria-current={active ? "page" : undefined}>
                {n.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}

/* Gold hairline that fills as the reader moves through the document. */
function Progress() {
  const ref = useRef(null);
  useEffect(() => {
    let raf = 0;
    const paint = () => {
      raf = 0;
      const el = ref.current;
      if (!el) return;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      el.style.transform = `scaleX(${max > 0 ? Math.min(window.scrollY / max, 1) : 0})`;
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(paint); };
    paint();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);
  return (
    <div className="progress" aria-hidden="true">
      <div className="progress-bar" ref={ref} />
    </div>
  );
}

function Footer() {
  return (
    <footer className="footer band dark">
      <div className="wrap">
        <div className="foot-state">
          Driven by Purpose. <em className="foil">Powered by Precision.</em>
        </div>
        <div className="foot-grid">
          <div className="foot-col">
            <div className="foot-k">Explore</div>
            <Link to="/">Home</Link>
            <Link to="/work">The Work</Link>
            <Link to="/work#impact">Impact</Link>
            <Link to="/work#stack">Tech Stack</Link>
            <Link to="/#contact">Contact</Link>
          </div>
          <div className="foot-col">
            <div className="foot-k">Contact</div>
            <a href="mailto:kavita@dataquin.com">kavita@dataquin.com</a>
            <a href="tel:+19086720809">+1 908 672 0809</a>
          </div>
          <div className="foot-col foot-brand-col">
            <div className="foot-brand">
              <span className="brand-logo" role="img" aria-label="DataQuin" />
            </div>
          </div>
        </div>
        <div className="foot-rule">
          <span>© {new Date().getFullYear()} DataQuin</span>
          <span>Data · Automation · AI Engineering</span>
        </div>
      </div>
    </footer>
  );
}

/* Route + hash navigation. A new path starts at the top; a hash scrolls
   to its section once it exists in the DOM (the page may still be
   mounting when the effect first runs), moves keyboard focus there so
   the next Tab continues from the section, and re-aims once web fonts
   have arrived on a cold deep link (the target moves as they swap). */
function useScrollNavigation() {
  const location = useLocation();
  const lastPath = useRef(null);
  useLayoutEffect(() => {
    const id = location.hash.slice(1);
    // a hash on a freshly mounted page jumps (there is nothing to glide
    // from); a hash on the page already open glides
    const newPage = lastPath.current !== location.pathname;
    lastPath.current = location.pathname;
    if (!id) {
      scrollTo(0, { immediate: true });
      return;
    }
    let tries = 0;
    let raf = 0;
    let alive = true;
    const go = () => {
      const el = document.getElementById(id);
      if (el) {
        scrollTo(el, { immediate: newPage });
        if (!el.hasAttribute("tabindex")) el.setAttribute("tabindex", "-1");
        el.focus({ preventScroll: true });
        if (document.fonts?.status !== "loaded") {
          document.fonts?.ready?.then(() => { if (alive) scrollTo(el, { immediate: true }); });
        }
      } else if (tries++ < 30) {
        raf = requestAnimationFrame(go);
      }
    };
    go();
    return () => { alive = false; cancelAnimationFrame(raf); };
  }, [location.pathname, location.hash, location.key]);
}

function Shell() {
  const location = useLocation();
  useScrollNavigation();

  // Cursor-following warm light — fine pointers, motion allowed.
  useEffect(() => {
    const noMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    if (noMotion || coarse) return;

    let raf = 0;
    let x = 0;
    let y = 0;
    const paint = () => {
      raf = 0;
      const root = document.documentElement.style;
      root.setProperty("--sx", x + "px");
      root.setProperty("--sy", y + "px");
    };
    const onMove = (e) => {
      x = e.clientX;
      y = e.clientY;
      if (!raf) raf = requestAnimationFrame(paint);
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => {
      window.removeEventListener("mousemove", onMove);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <>
      <Progress />
      <div className="spotlight" aria-hidden="true"></div>
      <div className="grain" aria-hidden="true"></div>
      <a className="skip-link" href="#main">Skip to content</a>
      <Topbar />
      <main id="main">
        <div className="page" key={location.pathname}>
          <ErrorBoundary resetKey={location.pathname}>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/work" element={<Work />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </ErrorBoundary>
          <Footer />
        </div>
      </main>
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
