import { useEffect, useRef, useState } from "react";
import { CONTACT } from "../data/site.js";
import { pad2 } from "../data/format.js";

/* There is no backend: the form writes the email for the visitor and
   hands it to their own email app (mailto:). The page never claims a
   message was sent — the status says what should have happened, and
   offers copy fallbacks for visitors with no email app set up. The form
   keeps its values, so the visitor can edit and try again. */
const IDS = { name: "lp-name", email: "lp-email", company: "lp-company", message: "lp-msg" };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MAX_MSG = 1000;   // encoded (a space takes 3 characters, a line break 6), this keeps the link near ~2,000
const COUNT_FROM = 800; // the counter appears only when it matters
const LONG_LINK = 1900; // past this, some email apps may shorten the message

function check(f) {
  const e = {};
  if (!f.name.trim()) e.name = "Please add your name.";
  if (!f.email.trim()) e.email = "Please add an email address we can reply to.";
  else if (!EMAIL_RE.test(f.email.trim())) e.email = "That email address looks incomplete.";
  if (!f.message.trim()) e.message = "Tell us a little about what you need.";
  return e;
}

/* RFC 6068: CRLF line breaks — the message's own too (a textarea gives
   bare LF) — and every part percent-encoded (spaces as %20) */
function compose(f) {
  const name = f.name.trim();
  const company = f.company.trim();
  const subject = `Inquiry from ${name}${company ? `, ${company}` : ""}`;
  const body = [f.message.trim().replace(/\r?\n/g, "\r\n"), "", "—", name, company, f.email.trim()]
    .filter((line, i) => i < 3 || line)
    .join("\r\n");
  const href = `mailto:${CONTACT.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  return { subject, body, href };
}

/* Clipboard fallback for browsers without the async API (or an
   insecure context): a hidden textarea and the legacy copy command.
   Selecting it takes focus, so focus goes back to the button after. */
function legacyCopy(text) {
  const back = document.activeElement;
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.setAttribute("readonly", "");
  ta.style.cssText = "position:fixed;top:0;left:0;opacity:0;pointer-events:none";
  document.body.appendChild(ta);
  ta.select();
  let ok = false;
  try { ok = document.execCommand("copy"); } catch { /* reported below */ }
  ta.remove();
  if (back instanceof HTMLElement && back.isConnected) back.focus({ preventScroll: true });
  return ok;
}

function CopyButton({ text, label }) {
  const [state, setState] = useState("idle"); // idle | done | failed
  useEffect(() => {
    if (state === "idle") return;
    const t = setTimeout(() => setState("idle"), 2400);
    return () => clearTimeout(t);
  }, [state]);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setState("done");
    } catch {
      setState(legacyCopy(text) ? "done" : "failed");
    }
  };
  return (
    <button type="button" className="btn btn-line btn-sm" onClick={copy}>
      <span aria-live="polite">
        {state === "done" ? "Copied" : state === "failed" ? "Couldn’t copy" : label}
      </span>
    </button>
  );
}

function CField({ id, n, label, optional, error, hint, children }) {
  return (
    <div className={`cfield${error ? " invalid" : ""}`}>
      <label htmlFor={id}>
        <span className="cf-n" aria-hidden="true">{pad2(n)}</span>
        {label}
        {optional && <span className="opt">optional</span>}
      </label>
      {children}
      {hint && <p className="cfield-hint" id={`${id}-hint`}>{hint}</p>}
      {error && <p className="cfield-err" id={`${id}-err`}>{error}</p>}
    </div>
  );
}

export default function ContactForm() {
  const [form, setForm] = useState({ name: "", email: "", company: "", message: "" });
  const [errors, setErrors] = useState({});
  const [tried, setTried] = useState(false);
  const [draft, setDraft] = useState(null);       // the composed email, once handed to the email app
  const [focusReq, setFocusReq] = useState(null); // { k, t, msg }: focus a field AFTER its error has rendered
  const statusRef = useRef(null);
  const liveRef = useRef(null);

  const set = (k) => (e) => {
    const next = { ...form, [k]: e.target.value };
    setForm(next);
    if (tried) setErrors(check(next)); // live re-check only after the first attempt
    if (draft) setDraft(null);         // edited after the hand-off: that draft is stale
    if (liveRef.current) liveRef.current.textContent = ""; // said once; don't linger for browse mode
  };

  // Focus moves in effects, after render, so the error text (or the
  // status) is in the DOM — and read out — when focus lands.
  useEffect(() => { if (draft) statusRef.current?.focus(); }, [draft]);
  useEffect(() => {
    const el = focusReq && document.getElementById(IDS[focusReq.k]);
    if (!el) return;
    if (el !== document.activeElement) { el.focus(); return; }
    // Enter pressed in the failing field itself: focus can't move, so
    // nothing would read the new error out. Say it (emptied first, so
    // the same message is announced again on a second try).
    const live = liveRef.current;
    if (!live) return;
    live.textContent = "";
    const raf = requestAnimationFrame(() => { live.textContent = focusReq.msg; });
    return () => cancelAnimationFrame(raf);
  }, [focusReq]);

  const onSubmit = (e) => {
    e.preventDefault();
    const errs = check(form);
    setTried(true);
    setErrors(errs);
    const first = ["name", "email", "message"].find((k) => errs[k]);
    if (first) {
      setFocusReq({ k: first, t: Date.now(), msg: errs[first] });
      return;
    }
    const mail = compose(form);
    setDraft(mail);
    window.location.assign(mail.href); // inside the submit gesture, so browsers allow it
  };

  const msgHint = form.message.length >= COUNT_FROM ? `${form.message.length} / ${MAX_MSG} characters` : null;
  const described = (k, hintId) => ({
    "aria-invalid": errors[k] ? true : undefined,
    "aria-describedby": [errors[k] && `${IDS[k]}-err`, hintId].filter(Boolean).join(" ") || undefined,
  });

  return (
    <form className="cform" noValidate onSubmit={onSubmit} aria-labelledby="lp-form-t">
      <div className="cform-head">
        <span className="mlabel">Start here</span>
        <span className="cform-ser" aria-hidden="true">DQ / Intake</span>
      </div>
      <h3 className="cform-t" id="lp-form-t">Tell us what&rsquo;s slowing you down.</h3>
      <p className="sr-only" aria-live="assertive" aria-atomic="true" ref={liveRef} />

      <div className="cform-row">
      <CField id={IDS.name} n={1} label="Name" error={errors.name}>
        <input id={IDS.name} name="name" type="text" autoComplete="name" required
          placeholder="Your name" value={form.name} onChange={set("name")} {...described("name")} />
      </CField>

      <CField id={IDS.email} n={2} label="Work email" error={errors.email}>
        <input id={IDS.email} name="email" type="email" autoComplete="email" required
          placeholder="you@company.com" value={form.email} onChange={set("email")} {...described("email")} />
      </CField>
      </div>

      <CField id={IDS.company} n={3} label="Company" optional>
        <input id={IDS.company} name="company" type="text" autoComplete="organization"
          placeholder="Where you work" value={form.company} onChange={set("company")} />
      </CField>

      <CField id={IDS.message} n={4} label="What do you need?" error={errors.message} hint={msgHint}>
        {/* data-lenis-prevent: the wheel scrolls a long message, not the page */}
        <textarea id={IDS.message} name="message" rows={3} required maxLength={MAX_MSG} data-lenis-prevent
          placeholder="The process, report or bottleneck you'd like to fix."
          value={form.message} onChange={set("message")}
          {...described("message", msgHint && `${IDS.message}-hint`)} />
      </CField>

      <button type="submit" className="btn btn-gold btn-shine" aria-describedby="lp-form-note">
        Continue in email <span className="arr" aria-hidden="true">→</span>
      </button>
      <p className="cform-note" id="lp-form-note">Opens your email app with this message ready to send.</p>

      {draft && (
        <div className="cform-status">
          <span className="mlabel">Next step</span>
          <p className="cform-status-t" tabIndex={-1} ref={statusRef}>Press send in your email app.</p>
          <p className="cform-status-s">
            A new email to <strong>{CONTACT.email}</strong> should have opened with your message
            filled in. Nothing is sent from this page — it goes when you press send. If no email
            app opened, copy the address or the message instead.
          </p>
          {draft.href.length > LONG_LINK && (
            <p className="cform-status-s">
              Your message is long, so some email apps may shorten it. If it looks cut off, use
              Copy message.
            </p>
          )}
          <div className="cform-status-acts">
            <CopyButton text={CONTACT.email} label="Copy address" />
            <CopyButton text={`Subject: ${draft.subject}\n\n${draft.body.replace(/\r\n/g, "\n")}`} label="Copy message" />
            <a className="btn btn-line btn-sm" href={draft.href}>Open email again</a>
          </div>
        </div>
      )}

      <p className="cform-privacy">
        Everything you share here stays confidential and is never passed on.
      </p>
    </form>
  );
}
