import { Component, useEffect } from "react";
import { Routes, Route, NavLink, useLocation } from "react-router-dom";
import Stack from "./pages/Stack.jsx";
import Projects from "./pages/Projects.jsx";
import CaseStudy from "./pages/CaseStudy.jsx";
import Impact from "./pages/Impact.jsx";
import NotFound from "./pages/NotFound.jsx";

/* If any component throws at runtime, React 18 unmounts the whole tree,
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
        <div className="wrap" style={{ padding: "140px 0" }}>
          <div className="kicker">Recoverable error</div>
          <h1 className="h1">Something glitched — <span className="grad-text">the site is still here.</span></h1>
          <p className="lead" style={{ marginTop: 14 }}>
            A section failed to load. Use the menu to switch pages, or reload.
          </p>
          <button className="btn btn-grad" style={{ marginTop: 26 }}
            onClick={() => window.location.reload()}>
            Reload page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const NAV = [
  { to: "/", label: "Tech Stack" },
  { to: "/projects", label: "Case Studies" },
  { to: "/impact", label: "Impact" },
];

/* The official DataQuin logo (white-on-transparent PNG) is used as a CSS
   mask filled with the site's gold gradient, so it sits directly on the
   ivory background like an engraved mark — no box around it. */
function Brand() {
  return (
    <NavLink to="/" className="brand" end aria-label="DataQuin — home">
      <span className="brand-logo" role="img" aria-label="DataQuin — Driven by Purpose, Powered by Precision" />
    </NavLink>
  );
}

/* Floating dark-glass pill navigation — logo + links, centered at top */
function Header() {
  return (
    <header className="header">
      <Brand />
      <nav>
        {NAV.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.to === "/"}
            className={({ isActive }) => (isActive ? "active" : "")}>
            {n.label}
          </NavLink>
        ))}
      </nav>
    </header>
  );
}

function Footer() {
  return (
    <footer className="footer">
      <div className="wrap">
        <div className="footer-statement">
          Driven by Purpose. <span className="grad-text">Powered by Precision.</span>
        </div>
        <div className="footer-inner">
          <span>© {new Date().getFullYear()} DataQuin</span>
          <span>Data · Automation · AI Engineering</span>
        </div>
      </div>
    </footer>
  );
}

export default function App() {
  const location = useLocation();

  // Start every navigation at the top of the new page.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [location.pathname]);

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
      <div className="bg-fx"></div>
      <div className="bg-aura a"></div>
      <div className="bg-aura b"></div>
      <div className="bg-mark" aria-hidden="true">DQ</div>
      <div className="spotlight"></div>
      <div className="bg-noise"></div>
      <a className="skip-link" href="#main">Skip to content</a>
      <div className="shell">
        <Header />
        <main className="main" id="main">
          <div className="page" key={location.pathname}>
            <ErrorBoundary resetKey={location.pathname}>
              <Routes>
                <Route path="/" element={<Stack />} />
                <Route path="/projects" element={<Projects />} />
                <Route path="/projects/:id" element={<CaseStudy />} />
                <Route path="/impact" element={<Impact />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </ErrorBoundary>
            <Footer />
          </div>
        </main>
      </div>
    </>
  );
}
