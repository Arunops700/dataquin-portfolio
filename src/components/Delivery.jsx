/* Shared "how we deliver" path — gold icon medallions on a flowing
   gold thread. Used small in the landing hero and large on Impact. */

export const DP_ICONS = {
  understand: <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><circle cx="11" cy="11" r="6.2" /><path d="M15.8 15.8 20 20" /></svg>,
  research: <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M9.5 18h5" /><path d="M10.5 21h3" /><path d="M12 3a6 6 0 0 0-3.4 10.9c.7.5 1.1 1.3 1.1 2.1h4.6c0-.8.4-1.6 1.1-2.1A6 6 0 0 0 12 3z" /></svg>,
  build: <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M8.5 6.5 3.5 12l5 5.5" /><path d="M15.5 6.5 20.5 12l-5 5.5" /></svg>,
  validate: <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l7 2.8v5.1c0 4.4-2.9 7.4-7 9.1-4.1-1.7-7-4.7-7-9.1V5.8L12 3z" /><path d="M9 12l2.2 2.2L15.5 10" /></svg>,
  deliver: <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M3.5 17.5l5.5-5.5 3.8 3.8 6.7-7.6" /><path d="M15.5 8h4.2v4.2" /></svg>,
};

export function DeliveryPath({ steps, big = false }) {
  return (
    <div className={`dpath${big ? " big" : ""}`} style={{ "--n": steps.length }}>
      {steps.map((d, i) => (
        <div className="dp-step" key={d.k} style={{ "--i": i }}>
          <span className="dp-ico">{DP_ICONS[d.k]}</span>
          <span className="dp-body">
            <span className="dp-t">{d.t}</span>
            <span className="dp-s">{d.s}</span>
          </span>
          <span className="dp-num">0{i + 1}</span>
        </div>
      ))}
    </div>
  );
}
