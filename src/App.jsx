import { Suspense, lazy, useEffect, useState } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import { LazyMotion, MotionConfig, domAnimation } from "framer-motion";
import Landing from "./pages/Landing.jsx";
import { SmoothScroll } from "./motion/SmoothScroll.jsx";
import { useMedia } from "./motion/prefs.js";
import { MQ } from "./motion/tokens.js";
import { ErrorBoundary } from "./shell/ErrorBoundary.jsx";
import { Topbar } from "./shell/Topbar.jsx";
import { Progress, Spotlight, Footer } from "./shell/Chrome.jsx";
import { useScrollNavigation, PAGE_PENDING } from "./shell/scrollNavigation.js";

/* The app shell: routes, and the layers every page shares. The pieces
   live in src/shell/ — the top bar (Topbar), the fixed layers and footer
   (Chrome), route and hash scrolling with Back/Forward memory
   (scrollNavigation), focus moves (focus), the error screen
   (ErrorBoundary) and where the reader is (reading). */

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

  // warm the Case Studies page's chunk once the landing is idle (not on Save-Data)
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
                <Route path="/case-studies" element={<WorkPage.Page />} />
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
