import { Component, createRef } from "react";
import { Link } from "react-router-dom";
import { focusPageStart } from "./focus.js";

/* If any component throws at runtime (or a page's chunk fails to
   load), React unmounts the whole tree, leaving a blank page. This
   boundary catches the error, keeps the shell
   (topbar, footer) alive and shows a designed status screen built from
   nothing that could fail for the same reason — no Reveal, Magnetic or
   3D. It remounts with every path (.page is keyed), and resetKey (the
   location key) clears it on any other navigation, so "Home" on a
   failed home page retries too. An error on a freshly opened page
   arrives through componentDidMount. Focus goes to the heading either
   way. */
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null, resetKey: props.resetKey };
    this.head = createRef();
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  // A new location clears the error within the same render, so a retry
  // never commits the stale error screen first (its heading would take
  // focus and be announced, then vanish)
  static getDerivedStateFromProps(props, state) {
    return props.resetKey !== state.resetKey ? { error: null, resetKey: props.resetKey } : null;
  }
  componentDidCatch(error, info) {
    console.error("Page error caught by boundary:", error, info);
  }
  componentDidMount() {
    if (this.state.error) this.head.current?.focus();
  }
  componentDidUpdate(prevProps, prevState) {
    if (this.state.error && !prevState.error) this.head.current?.focus();
    // a retry worked: the error heading that held focus has been removed
    if (prevState.error && !this.state.error) focusPageStart();
  }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <section className="band dark hero-band hero-sub pad-b status-screen" data-island="Something went wrong">
        <div className="hero-grid" aria-hidden="true" />
        <div className="wrap">
          <h1 className="h-xl sm" tabIndex={-1} ref={this.head}>
            Something went wrong — <em className="foil">the site is still here.</em>
          </h1>
          <p className="lead hero-lead">
            A section failed to load. Use the menu to switch pages, or reload.
          </p>
          <div className="hero-actions">
            <button type="button" className="btn btn-gold" onClick={() => window.location.reload()}>
              Reload page
            </button>
            <Link to="/" className="btn btn-line">Home</Link>
          </div>
        </div>
      </section>
    );
  }
}
