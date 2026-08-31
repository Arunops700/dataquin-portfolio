import { useState } from "react";
import { Link } from "react-router-dom";
import { Reveal } from "../components/fx.jsx";
import { DP_ICONS } from "../components/Delivery.jsx";
import { usePageMeta } from "../seo.js";

/* The front door. Deliberately short: what we do, how we do it, one way to
   start a conversation — and, last, the invitation to go see the proof.
   Everything that backs the claims lives on /stack, /projects and /impact. */

/* Credentials, not adjectives — each one is checkable elsewhere on the site
   or on dataquin.com. */
const CREDS = [
  { v: "25+", k: "Years of experience" },
  { v: "6", k: "Production systems live" },
  { v: "100%", k: "Confidential & discreet" },
];

const STEPS = [
  { k: "understand", n: "01", t: "Understand your needs", s: "We start with your objectives, challenges, existing processes and priorities." },
  { k: "research", n: "02", t: "Assess & analyze", s: "We review your workflows, data, technology and operations to find the gaps — and the opportunities." },
  { k: "build", n: "03", t: "Build the right solution", s: "A tailored approach, drawn from the seven areas below rather than a fixed product." },
  { k: "deliver", n: "04", t: "Deliver & drive results", s: "We implement, optimize and measure — so the impact shows up in the business." },
];

const PILLARS = [
  "Business Analytics",
  "Data Science",
  "AI Solutions",
  "Automation",
  "Data Migration",
  "Patient Support Services",
  "Staffing",
];

/* Form UI only for now — no backend is wired up yet, so submitting just
   shows the confirmation state. When the delivery method is chosen
   (hosted endpoint, serverless function or mailto), post `form` from
   here; nothing else on the page needs to change. */
function ContactForm() {
  const [form, setForm] = useState({ name: "", email: "", company: "", message: "" });
  const [sent, setSent] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  if (sent) {
    return (
      <div className="lp-form lp-sent" role="status">
        <span className="lp-sent-mark" aria-hidden="true">&#10003;</span>
        <div className="lp-sent-t">Thanks — we&rsquo;ve got it.</div>
        <p className="lp-sent-s">
          We&rsquo;ll come back to you at <strong>{form.email || "your address"}</strong> shortly.
          In the meantime, the builds behind our claims are worth a look.
        </p>
      </div>
    );
  }

  return (
    <form
      className="lp-form"
      onSubmit={(e) => {
        e.preventDefault();
        setSent(true);
      }}
    >
      <div className="lp-form-head">
        <div className="kicker">Start here</div>
        <h3 className="lp-form-t">Tell us what&rsquo;s slowing you down.</h3>
      </div>

      <div className="lp-field">
        <label htmlFor="lp-name">Name</label>
        <input id="lp-name" name="name" type="text" autoComplete="name" required
          placeholder="Your name" value={form.name} onChange={set("name")} />
      </div>

      <div className="lp-field">
        <label htmlFor="lp-email">Work email</label>
        <input id="lp-email" name="email" type="email" autoComplete="email" required
          placeholder="you@company.com" value={form.email} onChange={set("email")} />
      </div>

      <div className="lp-field">
        <label htmlFor="lp-company">Company <span className="opt">optional</span></label>
        <input id="lp-company" name="company" type="text" autoComplete="organization"
          placeholder="Where you work" value={form.company} onChange={set("company")} />
      </div>

      <div className="lp-field">
        <label htmlFor="lp-msg">What do you need?</label>
        <textarea id="lp-msg" name="message" rows={4} required
          placeholder="The process, report or bottleneck you&rsquo;d like to fix."
          value={form.message} onChange={set("message")} />
      </div>

      <button type="submit" className="btn btn-grad btn-shine lp-submit">Send</button>
      <p className="lp-privacy">
        <span aria-hidden="true">&#128274;</span> Your information and business discussions are
        treated with the highest level of confidentiality and discretion.
      </p>
    </form>
  );
}

export default function Landing() {
  usePageMeta({
    title: "DataQuin",
    description:
      "DataQuin helps organizations identify what's holding them back and delivers practical, data-driven solutions — analytics, data science, AI, automation, data migration, patient support services and staffing.",
    path: "/",
  });

  return (
    <>
      {/* ===== HERO ===== */}
      <section className="wrap lp-hero">
        <div className="lp-hero-wash" aria-hidden="true" />
        {/* The page has no header, so the mark carries the brand here. */}
        <span className="lp-mark fade-in" role="img" aria-label="DataQuin" />
        <div className="kicker fade-in">Your partner in success</div>
        <h1 className="h-hero hero-title lp-title" style={{ maxWidth: 900 }}>
          <span className="row"><span>Accelerate your business</span></span>
          <span className="row"><span className="grad-text lp-shine">with DataQuin.</span></span>
        </h1>
        <p className="lead fade-in" style={{ marginTop: 22, maxWidth: 720 }}>
          Looking for the right solution, the right talent, or a smarter way to streamline
          your operations? We help organizations identify what&rsquo;s holding them back — and
          deliver practical, data-driven solutions designed to move the business forward.
        </p>
        <div className="lp-creds fade-in">
          {CREDS.map((c) => (
            <div className="lp-cred" key={c.k}>
              <span className="lp-cred-v">{c.v}</span>
              <span className="lp-cred-k">{c.k}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ===== FOUR STEPS ===== */}
      <section className="wrap section-tight">
        <Reveal className="section-head" style={{ marginBottom: 38 }}>
          <div className="kicker">How we make it happen</div>
          <h2 className="h1">Four steps, <span className="grad-text">start to impact.</span></h2>
        </Reveal>
        <div className="lp-steps">
          {STEPS.map((s, i) => (
            <Reveal className="lp-step" key={s.n} delay={Math.min(i, 4)}>
              <span className="lp-step-n" aria-hidden="true">{s.n}</span>
              <span className="lp-step-ico">{DP_ICONS[s.k]}</span>
              <div className="lp-step-t">{s.t}</div>
              <div className="lp-step-s">{s.s}</div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ===== PILLARS ===== */}
      <section className="wrap section-tight" style={{ paddingTop: 0 }}>
        <Reveal className="lp-pillars">
          <div className="lp-pillars-k">What we build</div>
          <div className="lp-pillar-row">
            {PILLARS.map((p) => (
              <span className="lp-pill" key={p}>{p}</span>
            ))}
          </div>
        </Reveal>
      </section>

      {/* ===== WHY + FORM ===== */}
      <section className="wrap section-tight" id="contact">
        <div className="lp-contact">
          <Reveal className="lp-why">
            <div className="kicker">Why DataQuin</div>
            <h2 className="h1">
              Your challenges are unique.<br />
              <span className="grad-text">Your solution should be too.</span>
            </h2>
            <p className="lead" style={{ marginTop: 16 }}>
              We combine business expertise, data, technology and AI to deliver solutions that
              are practical, scalable and aligned with your goals — then prove it with systems
              that are still running today.
            </p>
            <div className="lp-values">
              {["Precision", "Accuracy", "Agile", "Reliable"].map((v) => (
                <span className="lp-value" key={v}>{v}</span>
              ))}
            </div>
            <p className="lp-close">
              Let&rsquo;s turn your business challenges into measurable opportunities.
            </p>
            <div className="lp-reach">
              <a href="mailto:kavita@dataquin.com">kavita@dataquin.com</a>
              <span aria-hidden="true">·</span>
              <a href="tel:+19086720809">+1 908 672 0809</a>
            </div>
          </Reveal>
          <Reveal delay={1}>
            <ContactForm />
          </Reveal>
        </div>
      </section>

      {/* ===== CLOSING CTA — the one button onward ===== */}
      <section className="wrap section-tight">
        <Reveal className="lp-cta">
          <span className="lp-cta-glow" aria-hidden="true" />
          <div className="lp-cta-k">Proof, not promises</div>
          <h2 className="lp-cta-h">
            Every claim on this page<br />
            <span className="lp-cta-em">has a build behind it.</span>
          </h2>
          <p className="lp-cta-s">
            Six production systems, the exact stack we built them with, and the measured
            impact they delivered — all of it open for you to read.
          </p>
          <Link to="/stack" className="btn btn-grad btn-shine lp-cta-btn">
            Explore Our Tech Stack &amp; Solutions
            <span className="lp-cta-arr" aria-hidden="true">→</span>
          </Link>
          <div className="lp-cta-meta">
            <span>21 tools</span>
            <span>6 production builds</span>
            <span>90%+ faster delivery</span>
          </div>
        </Reveal>
      </section>
    </>
  );
}
