import { useEffect, useState } from "react";

/*
  Where the reader is: the page section on the reading line, 35% down the
  viewport. The top bar reads it twice — the island's label and the lit
  Contact item. One IntersectionObserver over the page's sections, its
  root a 0.1%-tall band at that line, so nothing runs per scroll frame;
  the sections are collected again whenever the route's content mounts
  (a lazy page arrives after its route). Over the footer, or anywhere no
  section crosses the line, it is null.
*/
const LINE = "-35% 0px -64.9% 0px";

export function useReadingSection(pathname) {
  const [section, setSection] = useState(null);
  useEffect(() => {
    const main = document.getElementById("main");
    if (!main || typeof IntersectionObserver !== "function") return undefined;
    const onLine = new Set();
    // the first on the line in document order: an outer section wins
    const pick = () => {
      let hit = null;
      for (const el of main.querySelectorAll("section")) {
        if (onLine.has(el)) { hit = el; break; }
      }
      setSection(hit);
    };
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) onLine.add(e.target);
        else onLine.delete(e.target);
      }
      pick();
    }, { rootMargin: LINE });
    const collect = () => {
      io.disconnect();
      onLine.clear();
      main.querySelectorAll("section").forEach((el) => io.observe(el));
      pick();
    };
    collect();
    const mo = new MutationObserver(collect);
    mo.observe(main, { childList: true });
    return () => {
      io.disconnect();
      mo.disconnect();
    };
  }, [pathname]);
  return section;
}

/* What the island reads out for a section: its data-island (every page
   section names itself this way — the island is the only place the
   section's name is shown), else its first mono label. */
export function sectionLabel(sec) {
  if (!sec) return null;
  if (sec.dataset.island) return sec.dataset.island;
  return sec.querySelector(".mlabel")?.textContent.trim() || null;
}
