import { useEffect, useState } from "react";
import { CHAPTERS } from "./chapters/index.ts";
import Home from "./chapters/Home.tsx";
import { BORN, UPDATED, VERSION, fmtDate, fmtStamp } from "./version.ts";

const slugFromHash = () => location.hash.replace(/^#\/?/, "");

/**
 * The nav bar: "ionhomie" with the born-on date and the current version on one line, then every
 * chapter, on every page, the current one marked. Nothing else sits above the action (ADR-0012).
 */
function NavBar({ index }: { index: number }) {
  const born = BORN === "unborn" ? "not yet committed" : fmtDate(BORN);
  return (
    <nav className="navbar">
      <div className="brandline">
        <a className="brand" href="#/">ionhomie</a>
        <span className="stamp" title={`Born ${BORN === "unborn" ? "—" : fmtStamp(BORN)}; this version ${UPDATED === "unborn" ? "—" : fmtStamp(UPDATED)}`}>
          born {born} · v{VERSION}, {UPDATED === "unborn" ? "unversioned" : fmtDate(UPDATED)}
        </span>
      </div>
      <div className="tabs" role="list">
        <a role="listitem" href="#/" className={index < 0 ? "tab here" : "tab"} aria-current={index < 0 ? "page" : undefined}>Home</a>
        {CHAPTERS.map((c, i) => (
          <a role="listitem" key={c.slug} href={`#/${c.slug}`} className={i === index ? "tab here" : "tab"} aria-current={i === index ? "page" : undefined}>
            <span className="n">{i + 1}</span>{c.title}
          </a>
        ))}
      </div>
    </nav>
  );
}

export default function App() {
  const [slug, setSlug] = useState(slugFromHash());
  useEffect(() => {
    const on = () => { setSlug(slugFromHash()); window.scrollTo(0, 0); };
    addEventListener("hashchange", on);
    return () => removeEventListener("hashchange", on);
  }, []);
  const index = CHAPTERS.findIndex((c) => c.slug === slug);
  const C = index >= 0 ? CHAPTERS[index].C : Home;
  useEffect(() => { document.title = index >= 0 ? `${CHAPTERS[index].title} · ionhomie` : "ionhomie: ion homeostasis, from diffusion to chloride"; }, [index]);
  useEffect(() => { document.querySelector(".tab.here")?.scrollIntoView({ block: "nearest", inline: "center" }); }, [index]);
  return (
    <>
      <NavBar index={index} />
      <C key={slug} />
    </>
  );
}
