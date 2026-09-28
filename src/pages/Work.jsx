import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useInView } from "framer-motion";
import { useProgress } from "../motion/scroll.js";
import { Reveal, CountUp, Magnetic } from "../components/fx.jsx";
import Flow from "../components/Flow.jsx";
import { Field } from "../three/Field.jsx";
import { STUDIES, getStudy } from "../data/caseStudies.js";
import { IMPACTS, OLD_STEPS, NEW_STEPS, EVOLUTION, CATS, TECH, csHash } from "../data/site.js";
import { usePageMeta } from "../seo.js";

/* The detail page: six case-study chapters, then the impact ledger,
   then the stack. One long scroll; a fixed rail on wide screens keeps
   the reader oriented. */

const RAIL = [
  ...STUDIES.map((s) => ({ id: `cs-${s.num}`, num: s.num, t: s.title })),
  { id: "impact", num: "§", t: "Impact" },
  { id: "stack", num: "§", t: "Tech stack" },
];

function Rail({ active, show }) {
  return (
    <nav className={`rail${show ? " show" : ""}`} aria-label="Sections">
      <span className="mlabel">Contents</span>
      {RAIL.map((r) => (
        <Link key={r.id} to={`/work#${r.id}`} className={active === r.id ? "on" : ""}>
          <b>{r.num}</b><span>{r.t}</span>
        </Link>
      ))}
    </nav>
  );
}

function Metric({ m }) {
  return (
    <div className="met">
      <div className="met-v">{m.to != null ? <CountUp to={m.to} suffix={m.suffix || ""} /> : m.v}</div>
      <div className="met-k">{m.k}</div>
    </div>
  );
}

/* The flow diagram draws itself as the reader scrolls it into view. */
function ScrubbedFlow({ flow }) {
  const ref = useRef(null);
  const p = useProgress(ref, ["start 88%", "end 62%"]);
  return (
    <div ref={ref}>
      <Flow nodes={flow.nodes} edges={flow.edges} progress={p} />
    </div>
  );
}

function Chapter({ s, i }) {
  return (
    <section className={`chapter band${i % 2 ? " deep" : ""} pad`} id={`cs-${s.num}`} data-rail>
      <div className="wrap">
        <Reveal className="shead">
          <span className="mlabel">Case Study {s.num} — {s.type}</span>
          <span className="ser">DQ / CS·{s.num}</span>
        </Reveal>
        <div className="ch-head">
          <Reveal className="ch-num" aria-hidden="true">{s.num}</Reveal>
          <div>
            <Reveal as="h2" className="h1 ch-title"><span className="foil">{s.title}</span></Reveal>
            <Reveal as="p" className="lead" delay={1} style={{ marginTop: 14 }}>{s.tagline}.</Reveal>
          </div>
        </div>

        <Reveal className="met-row paper">
          {s.metrics.map((m) => <Metric key={m.k} m={m} />)}
        </Reveal>

        <div className="story-grid">
          <Reveal as="article" className="story">
            {s.intro.map((p, k) => <p key={k}>{p}</p>)}
            <ul className="story-points">
              {s.points.map(([strong, rest]) => (
                <li key={strong}><span><strong>{strong}</strong>{rest}</span></li>
              ))}
            </ul>
          </Reveal>
          <Reveal delay={1} className="tools-ledger">
            <span className="mlabel">Tools used</span>
            {s.tools.map(([name, desc]) => (
              <div className="tool-row" key={name}>
                <span className="tool-name">{name}</span>
                <span className="tool-desc">{desc}</span>
              </div>
            ))}
          </Reveal>
        </div>

        <Reveal className="flow-panel">
          <span className="mlabel">System flow · CS·{s.num}</span>
          <ScrubbedFlow flow={s.flow} />
        </Reveal>
      </div>
    </section>
  );
}

function Impact() {
  return (
    <section className="band pad" id="impact" data-rail>
      <div className="wrap">
        <Reveal className="shead">
          <span className="mlabel">Measured outcomes</span>
          <span className="ser">§ 07 · six entries</span>
        </Reveal>
        <Reveal className="sec-intro">
          <h2 className="h1">We don't sell effort. <em className="foil">We sell outcomes.</em></h2>
          <p className="lead">
            Every build is judged on hours returned, errors removed and decisions unblocked.
            Each number below traces back to a chapter above.
          </p>
        </Reveal>
        <div className="ledg">
          {IMPACTS.map((m, i) => (
            <Reveal key={m.cs + m.label} as={Link} to={`/work${csHash(m.cs)}`} className="ledg-row" delay={Math.min(i, 4)}>
              <span className="ledg-num">
                {m.to != null ? <CountUp to={m.to} suffix={m.suffix || ""} /> : m.v}
              </span>
              <span className="ledg-main">
                <span className="ledg-label">{m.label}</span>
                <span className="ledg-sub" style={{ display: "block" }}>{m.sub}</span>
              </span>
              <span className="ledg-go">
                Case Study {getStudy(m.cs).num} <span className="arr" aria-hidden="true">→</span>
              </span>
            </Reveal>
          ))}
        </div>

        <Reveal className="shead" style={{ marginTop: 96 }}>
          <span className="mlabel">The difference in practice</span>
          <span className="ser">§ 08</span>
        </Reveal>
        <Reveal className="sec-intro">
          <h2 className="h1">The same request, <em className="foil">two journeys.</em></h2>
          <p className="lead">
            "I need a regional dashboard, secured per role, by Friday." Here is what
            actually happens next — with and without DataQuin.
          </p>
        </Reveal>
        <div className="journey">
          <Reveal className="j-col old">
            <span className="j-badge">The traditional route</span>
            <div className="j-steps">
              {OLD_STEPS.map(([t, d, time], i) => (
                <div className="j-step" key={t}>
                  <span className="n">0{i + 1}</span>
                  <span className="j-body">
                    <span className="t">{t}</span>
                    <span className="d">{d}</span>
                  </span>
                  <span className="j-time">{time}</span>
                </div>
              ))}
            </div>
            <div className="j-total">
              <span className="k">Total</span>
              <span className="v">3–5 days · ~28 hrs effort</span>
            </div>
          </Reveal>
          <Reveal className="j-col new" delay={1}>
            <span className="j-badge">With DataQuin</span>
            <div className="j-steps">
              {NEW_STEPS.map(([t, d, time], i) => (
                <div className="j-step" key={t}>
                  <span className="n">0{i + 1}</span>
                  <span className="j-body">
                    <span className="t">{t}</span>
                    <span className="d">{d}</span>
                  </span>
                  <span className="j-time">{time}</span>
                </div>
              ))}
            </div>
            <div className="j-total">
              <span className="k">Total</span>
              <span className="v">&lt;4 hours · &lt;3 hrs effort</span>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function Stack() {
  const [cat, setCat] = useState("all");
  const list = useMemo(() => (cat === "all" ? TECH : TECH.filter((t) => t.cat === cat)), [cat]);
  return (
    <section className="band deep pad" id="stack" data-rail>
      <div className="wrap">
        <Reveal className="shead">
          <span className="mlabel">Who we are</span>
          <span className="ser">§ 09</span>
        </Reveal>
        <Reveal className="sec-intro">
          <h2 className="h1">Technology keeps evolving. <em className="foil">So do we.</em></h2>
          <p className="lead">
            Every time the data landscape shifts, we master the new layer and put it into
            production. From spreadsheet automation to dashboards, from integration to AI
            engineering — as the stack evolves, so does the way we deliver.
          </p>
        </Reveal>
        <div className="evo">
          {EVOLUTION.map((e, i) => (
            <Reveal className={`evo-step${e.now ? " now" : ""}`} key={e.t} delay={Math.min(i, 4)}>
              <span className="era">{e.now && <span className="evo-dot"></span>}{e.era}</span>
              <div className="t">{e.t}</div>
              <div className="s">{e.s}</div>
            </Reveal>
          ))}
        </div>

        <Reveal className="shead" style={{ marginTop: 96 }}>
          <span className="mlabel">Tech stack</span>
          <span className="ser">§ 10 · {TECH.length} tools</span>
        </Reveal>
        <Reveal className="sec-intro">
          <h2 className="h1">The tools <em className="foil">we build with.</em></h2>
          <p className="lead">
            Every tool below is proven in a production build — open any line to jump to
            the chapter where we used it.
          </p>
        </Reveal>

        <div className="filters">
          <button className={`filter-btn ${cat === "all" ? "active" : ""}`}
            aria-pressed={cat === "all"} onClick={() => setCat("all")}>
            All<span className="count">{TECH.length}</span>
          </button>
          {Object.entries(CATS).map(([key, label]) => (
            <button key={key} className={`filter-btn ${cat === key ? "active" : ""}`}
              aria-pressed={cat === key} onClick={() => setCat(key)}>
              {label}<span className="count">{TECH.filter((t) => t.cat === key).length}</span>
            </button>
          ))}
        </div>

        <div className="ti-rows" key={cat}>
          {list.map((t, i) => (
            <Link
              className="ti-row"
              key={t.name}
              to={`/work${csHash(t.proj)}`}
              style={{ animationDelay: `${Math.min(i * 0.04, 0.5)}s` }}
            >
              <span className="ti-ico">
                <img src={`/icons/${t.ico}`} alt={t.name} loading="lazy" />
              </span>
              <span className="ti-name">{t.name}</span>
              <span className="ti-role">{t.role}</span>
              <span className="ti-go">
                Proven in CS {getStudy(t.proj).num} <span className="arr" aria-hidden="true">→</span>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function Work() {
  usePageMeta({
    title: "The Work",
    description:
      "Six production systems built for professional services firms — cross-system integration, AI-accelerated BI delivery, fraud alerting, client activity reporting, centralized reporting and an AI documentation coworker. Anonymized, measured, still running.",
    path: "/work",
  });

  const heroRef = useRef(null);
  // Field keeps rendering while any of the hero is on screen; the rail
  // appears once most of it has gone.
  const heroIn = useInView(heroRef);
  const heroMostly = useInView(heroRef, { margin: "0px 0px -40% 0px" });
  const [active, setActive] = useState("cs-01");

  // Track which section the reader is in for the rail.
  useEffect(() => {
    const els = Array.from(document.querySelectorAll("[data-rail]"));
    if (!els.length) return;
    const obs = new IntersectionObserver(
      (entries) => {
        const hit = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (hit) setActive(hit.target.id);
      },
      { rootMargin: "-35% 0px -55% 0px", threshold: [0, 0.1, 0.25, 0.5] }
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  return (
    <>
      <section className="band dark hero-band hero-sub hero-work pad-b" ref={heroRef}>
        <div className="hero-grid" aria-hidden="true" />
        <div className="hero-aura" aria-hidden="true" />
        <Field ambient active={heroIn} />
        <div className="stage-scrim" aria-hidden="true" />
        <div className="wrap">
          <div className="hero-meta fade-in">
            <span><b>The work</b> — six systems, still running</span>
            <span>DQ / 02</span>
          </div>
          <h1 className="h-xl sm hero-title">
            <span className="row"><span>Systems we've shipped.</span></span>
            <span className="row"><span><em className="foil">Bottlenecks we've deleted.</em></span></span>
          </h1>
          <p className="lead hero-lead fade-in">
            Six production systems built for professional services firms — anonymized,
            measured, and still running today. Each chapter holds the story, the tools
            behind it and the system flow, drawn as you scroll.
          </p>
          <div className="hero-actions fade-in">
            {STUDIES.map((s) => (
              <Link key={s.id} to={`/work#cs-${s.num}`} className="tag tag-link">{s.num} · {s.type}</Link>
            ))}
          </div>
        </div>
      </section>

      <Rail active={active} show={!heroMostly} />

      {STUDIES.map((s, i) => <Chapter key={s.id} s={s} i={i} />)}

      <Impact />
      <Stack />

      <section className="band dark pad-s">
        <div className="wrap">
          <Reveal className="cta-split">
            <div>
              <h2 className="h1">Built once. <em className="foil">Running every day.</em></h2>
              <div className="mono-note">Six production systems · secured · validated · self-service</div>
            </div>
            <Magnetic><Link to="/#contact" className="btn btn-gold">Start a conversation <span className="arr" aria-hidden="true">→</span></Link></Magnetic>
          </Reveal>
        </div>
      </section>
    </>
  );
}
