import { useLayoutEffect, useRef, useState } from "react";
import { NavLink, Link, useLocation } from "react-router-dom";
import { useScroll, useMotionValueEvent } from "framer-motion";
import { useReadingSection, sectionLabel } from "./reading.js";

/* Two pages; three matching buttons in one recessed track: the other
   page ("Case Studies", or "← Home" on the Case Studies page), then two
   sections of the landing — Solution Offered (the tech stack) and
   Contact. A lamp marks where the reader is — the section being read —
   and nowhere else; it follows a pointer or focus as a preview of where
   a button goes, and is gone when nothing applies. (The page itself carries
   the gold calls to contact; the island is navigation.)
   A `short` label stands in on phones, where the full one won't fit; the
   link keeps the full name. */
const CASES = "/case-studies";
const SOLUTIONS = { to: "/#stack", label: "Solution Offered", short: "Solutions", section: "stack" };
const CONTACT = { to: "/#contact", label: "Contact", section: "contact" };
const TRACK = [{ to: CASES, label: "Case Studies" }, SOLUTIONS, CONTACT];
const TRACK_CASES = [{ to: "/", label: "Home", back: true }, SOLUTIONS, CONTACT];
/* "/case-studies/" is the same page: one spelling for every path test */
const normalPath = (p) => p.replace(/\/+$/, "") || "/";

function Label({ n }) {
  return n.short ? (
    <>
      <span className="nav-full">{n.label}</span>
      <span className="nav-short">{n.short}</span>
    </>
  ) : n.label;
}

/* The track and its lamp. The lamp is measured onto the lit item (left
   and width as custom properties), so it fits any label at any width;
   `lit` is -1 when no item applies, and the lamp fades out where it is.
   Its first placement is a snap, so it never slides in from the edge. */
function NavTrack({ items, lit, current, onPoint }) {
  const track = useRef(null);
  const refs = useRef([]);
  const [ready, setReady] = useState(false);
  useLayoutEffect(() => {
    const t = track.current;
    if (!t) return undefined;
    const place = () => {
      const el = refs.current[lit];
      if (!el) return;
      t.style.setProperty("--lx", `${el.offsetLeft}px`);
      t.style.setProperty("--lw", `${el.offsetWidth}px`);
    };
    const first = lit >= 0 && !t.style.getPropertyValue("--lw");
    if (first) t.classList.add("snap");
    place();
    const raf = requestAnimationFrame(() => {
      setReady(true);
      t.classList.remove("snap");
    });
    // labels change width as the web font arrives and at the phone swap
    const ro = new ResizeObserver(place);
    ro.observe(t);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [lit, items]);

  return (
    <div className={`nav-track${ready ? " ready" : ""}${lit >= 0 ? " lit" : ""}`} ref={track}
      onPointerLeave={() => onPoint(-1)}>
      <span className="nav-lamp" aria-hidden="true" />
      {items.map((n, i) => (
        <Link key={n.to} to={n.to} ref={(el) => { refs.current[i] = el; }}
          className={i === lit ? "nav-seg lit" : "nav-seg"}
          // a section is a location on the landing; the other page link is never current here
          aria-current={n.section && current === n.section ? "location" : undefined}
          aria-label={n.short ? n.label : undefined}
          // a mouse or pen points; a touch only taps (focus moves the lamp)
          onPointerEnter={(e) => { if (e.pointerType !== "touch") onPoint(i); }}
          onFocus={() => onPoint(i)}
          onBlur={() => onPoint(-1)}>
          {n.back && <span className="arr back" aria-hidden="true">←</span>}
          <Label n={n} />
        </Link>
      ))}
    </div>
  );
}

/* The top bar is a floating island: one dark capsule, centred, on a
   fully transparent strip. It holds the mark and the track, and once
   the page moves it opens to show the section being read — the way a phone's island shows what is live. */
export function Topbar() {
  const pathname = normalPath(useLocation().pathname);
  // framer's shared window listener; read here, bound to no style
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(() => window.scrollY > 24);
  useMotionValueEvent(scrollY, "change", (v) => setScrolled(v > 24));
  const items = pathname === CASES ? TRACK_CASES : TRACK;
  const reading = useReadingSection(pathname);
  // the landing section being read, if it is one the island names
  const inView = pathname === "/" && reading && items.some((n) => n.section === reading.id) ? reading.id : null;
  // the lamp: on the item pointed at or focused, else on the section being
  // read — and off (-1) anywhere the island's buttons don't name
  const [point, setPoint] = useState(-1);
  const lit = point >= 0 ? point : items.findIndex((n) => n.section && n.section === inView);
  // a section named like a nav item is already shown by that item (lit,
  // right beside the label): the island doesn't say it twice
  const named = sectionLabel(reading);
  const label = named && !items.some((n) => n.label.toLowerCase() === named.toLowerCase()) ? named : null;
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
          {/* no link here is the current page on Case Studies (the track
              names the other page): say where the reader is instead */}
          {pathname === CASES && <span className="sr-only">Current page: Case Studies.</span>}
          <NavTrack items={items} lit={lit} current={inView} onPoint={setPoint} />
        </nav>
      </div>
      {/* A hidden twin of the label, after the island. The bar centres the
          pair, so as the label opens or changes the island grows to the
          left and its buttons never move under the reader's pointer. */}
      <div className={`island-ghost${open ? " open" : ""}`} aria-hidden="true">
        <span className="island-now"><span className="island-now-t">{shown}</span></span>
      </div>
    </header>
  );
}
