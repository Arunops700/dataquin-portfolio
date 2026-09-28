import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

/* Form UI only for now — no backend is wired up yet, so submitting just
   shows the confirmation state. When the delivery method is chosen
   (hosted endpoint, serverless function or mailto), post `form` from
   here; nothing else on the page needs to change. */
export default function ContactForm() {
  const [form, setForm] = useState({ name: "", email: "", company: "", message: "" });
  const [sent, setSent] = useState(false);
  const doneRef = useRef(null);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  // After submit the form unmounts under the keyboard user; move focus
  // to the confirmation so it is read out and Tab continues from here.
  useEffect(() => { if (sent) doneRef.current?.focus(); }, [sent]);

  if (sent) {
    return (
      <div className="cform cform-sent" role="status" tabIndex={-1} ref={doneRef}>
        <span className="cform-sent-mark" aria-hidden="true">&#10003;</span>
        <div className="cform-sent-t">Thanks — we&rsquo;ve got it.</div>
        <p className="cform-sent-s">
          We&rsquo;ll come back to you at <strong>{form.email || "your address"}</strong> shortly.
          In the meantime, <Link to="/work">the builds behind our claims</Link> are worth a look.
        </p>
      </div>
    );
  }

  return (
    <form
      className="cform"
      onSubmit={(e) => {
        e.preventDefault();
        setSent(true);
      }}
    >
      <div className="cform-head">
        <span className="mlabel">Start here</span>
        <span className="mlabel" style={{ opacity: 0.5 }}>DQ / Intake</span>
      </div>
      <h3 className="cform-t">Tell us what&rsquo;s slowing you down.</h3>

      <div className="cfield">
        <label htmlFor="lp-name">Name</label>
        <input id="lp-name" name="name" type="text" autoComplete="name" required
          placeholder="Your name" value={form.name} onChange={set("name")} />
      </div>

      <div className="cfield">
        <label htmlFor="lp-email">Work email</label>
        <input id="lp-email" name="email" type="email" autoComplete="email" required
          placeholder="you@company.com" value={form.email} onChange={set("email")} />
      </div>

      <div className="cfield">
        <label htmlFor="lp-company">Company <span className="opt">optional</span></label>
        <input id="lp-company" name="company" type="text" autoComplete="organization"
          placeholder="Where you work" value={form.company} onChange={set("company")} />
      </div>

      <div className="cfield">
        <label htmlFor="lp-msg">What do you need?</label>
        <textarea id="lp-msg" name="message" rows={4} required
          placeholder="The process, report or bottleneck you'd like to fix."
          value={form.message} onChange={set("message")} />
      </div>

      <button type="submit" className="btn btn-gold btn-shine">Send</button>
      <p className="cform-privacy">
        Everything you share here stays confidential and is never passed on.
      </p>
    </form>
  );
}
