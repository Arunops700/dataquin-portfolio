import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import "./index.css";

// Opt in to the v7 behaviours now: navigations render as transitions and
// relative paths resolve the v7 way — and the dev console stays quiet.
const ROUTER_FUTURE = { v7_startTransition: true, v7_relativeSplatPath: true };

ReactDOM.createRoot(document.getElementById("root")).render(
  <BrowserRouter future={ROUTER_FUTURE}>
    <App />
  </BrowserRouter>
);
