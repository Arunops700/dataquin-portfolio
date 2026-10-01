import { useState } from "react";
import { NavLink, Link, useLocation } from "react-router-dom";
import { useScroll, useMotionValueEvent } from "framer-motion";
import { useReadingSection, sectionLabel } from "./reading.js";

/* Two pages. The lead item, in foil, is the way to the other page: "The
   Work" everywhere but on the Work page itself, where it is "Home".
   Contact is a section of the landing page, in a hairline frame. */
const CONTACT_ITEM = { to: "/#contact", label: "Contact", path: "/", section: "contact", kind: "nav-link" };
const NAV = [
  { to: "/work", label: "The Work", path: "/work", kind: "nav-cta" },
  CONTACT_ITEM,
];
const NAV_WORK = [
  { to: "/", label: "Home", path: "/", kind: "nav-cta", back: true },
  CONTACT_ITEM,
];
const navFor = (pathname) => (pathname === "/work" ? NAV_WORK : NAV);
/* "/work/" is the Work page too: one spelling for every path test */
const normalPath = (p) => p.replace(/\/+$/, "") || "/";

/* The top bar is a floating island: one dark capsule, centred, on a
   fully transparent strip. It holds the mark and the two ways on, and
   once the page moves it opens to show the section being read — the
   way a phone's island shows what is live. */
export function Topbar() {
  const pathname = normalPath(useLocation().pathname);
  // framer's shared window listener; read here, bound to no style
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(() => window.scrollY > 24);
  useMotionValueEvent(scrollY, "change", (v) => setScrolled(v > 24));
  const nav = navFor(pathname);
  const reading = useReadingSection(pathname);
  // the nav section being read, if any: it is lit instead of the page
  const inView = nav.some((n) => n.section && n.path === pathname && n.section === reading?.id) ? reading.id : null;
  const label = sectionLabel(reading);
  // the last label stays while the island closes, so the text doesn't
  // vanish before the capsule has narrowed (state derived in render)
  const [shown, setShown] = useState(label);
  if (label && label !== shown) setShown(label);
  const open = scrolled && !!label;

  return (
    <header className={`topbar${scrolled ? " scrolled" : ""}`}>
      <div className={`island${open ? " open" : ""}`}>
        <NavLink to="/" className="brand" end aria-label="DataQuin — home">
          <span className="brand-logo" aria-hidden="true" />
        </NavLink>
        {/* decorative: the section's own heading carries the same words */}
        <span className="island-now" aria-hidden="true">
          <span className="island-now-t" key={shown ?? ""}>{shown}</span>
        </span>
        <nav aria-label="Primary">
          {/* the lead item always names the other page, so no link here is
              the current one on /work: say where the reader is instead */}
          {pathname === "/work" && <span className="sr-only">Current page: The Work.</span>}
          {nav.map((n) => {
            const onPath = n.path === pathname;
            // one item lit at a time: the section being read, else the page
            const lit = n.section ? onPath && inView === n.section : onPath && !inView;
            // the page link is always "the current page"; a section is a location in it
            const current = n.section ? (lit ? "location" : undefined) : onPath ? "page" : undefined;
            return (
              <Link key={n.to} to={n.to} className={lit ? `${n.kind} active` : n.kind} aria-current={current}>
                {n.back && <span className="arr back" aria-hidden="true">←</span>}
                {n.label}
                {n.kind === "nav-cta" && !n.back && <span className="arr" aria-hidden="true">→</span>}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
