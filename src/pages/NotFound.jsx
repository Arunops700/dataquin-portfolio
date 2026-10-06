import { Link, useLocation } from "react-router-dom";
import { STUDIES } from "../data/caseStudies.js";
import { PAGE_META, usePageMeta } from "../seo.js";
import "../styles/notfound.css";

/* The rest of the site, beside the case-study index: the sections a
   visitor most often came looking for. */
const ELSEWHERE = [
  ["/#stack", "Tech Stack"],
  ["/#contact", "Contact"],
];

/* The failed address as a reader would type it, capped so a long (or
   hostile) URL can't take over the slip. */
function shownPath(pathname) {
  let p = pathname;
  try { p = decodeURI(pathname); } catch { /* malformed escape: show it as sent */ }
  return p.length > 80 ? `${p.slice(0, 79)}…` : p;
}

/* Any unknown URL is filed as an entry not on file: what was asked for,
   its status, and every way back, as ruled rows. (The retired /stack,
   /projects, /impact and /work addresses redirect — vercel.json.) */
export default function NotFound() {
  const { pathname } = useLocation();
  usePageMeta({ ...PAGE_META.notFound, path: pathname });

  return (
    <>
      <section className="band dark hero-band hero-sub pad-b" data-island="Page not found">
        <div className="hero-grid" aria-hidden="true" />
        <div className="wrap">
          <h1 className="h-xl sm hero-title nf-title">
            <span className="row"><span>That page</span></span>
            <span className="row"><span><em className="foil">doesn&rsquo;t exist.</em></span></span>
          </h1>
          <p className="lead hero-lead nf-lead fade-in">
            The link may be out of date, or the address mistyped. Everything we&rsquo;ve
            built is one click away.
          </p>
          <dl className="entry fade-in">
            <div className="entry-row">
              <dt>Requested</dt>
              <dd className="path">{shownPath(pathname)}</dd>
            </div>
            <div className="entry-row">
              <dt>Status</dt>
              <dd className="st">Not on file</dd>
            </div>
          </dl>
          <div className="hero-actions fade-in">
            <Link to="/" className="btn btn-gold">Home</Link>
            <Link to="/case-studies" className="btn btn-line">Case Studies</Link>
          </div>
        </div>
      </section>

      <section className="band pad-s">
        <div className="wrap nf-index">
          <nav className="nf-list" aria-labelledby="nf-studies">
            <span className="mlabel" id="nf-studies">All case studies</span>
            {STUDIES.map((s) => (
              <Link key={s.id} to={`/case-studies#cs-${s.num}`} className="nf-link">
                <span className="nf-num">{s.num}</span>
                <span>{s.title}</span>
                <span className="arr nf-arr" aria-hidden="true">→</span>
              </Link>
            ))}
          </nav>
          <nav className="nf-list" aria-labelledby="nf-elsewhere">
            <span className="mlabel" id="nf-elsewhere">Elsewhere on the site</span>
            {ELSEWHERE.map(([to, label]) => (
              <Link key={to} to={to} className="nf-link">
                <span className="nf-num" aria-hidden="true">§</span>
                <span>{label}</span>
                <span className="arr nf-arr" aria-hidden="true">→</span>
              </Link>
            ))}
          </nav>
        </div>
      </section>
    </>
  );
}
