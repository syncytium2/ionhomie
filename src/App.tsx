import { useEffect, useState } from "react";
import { CHAPTERS } from "./chapters/index.ts";
import Home from "./chapters/Home.tsx";
import { BORN, UPDATED, VERSION, fmtDate, fmtStamp } from "./version.ts";

const slugFromHash = () => location.hash.replace(/^#\/?/, "");

/**
 * The title row: back, the title with the born-on date and the current version beside it, forward.
 * Nothing else sits above the action (docs/adr/0008).
 */
function TitleRow({ index }: { index: number }) {
  const here = index < 0 ? null : CHAPTERS[index];
  const back = index < 0 ? null : index === 0 ? { href: "#/", title: "ionhomie" } : { href: `#/${CHAPTERS[index - 1].slug}`, title: CHAPTERS[index - 1].title };
  const next = index + 1 < CHAPTERS.length ? { href: `#/${CHAPTERS[index + 1].slug}`, title: CHAPTERS[index + 1].title } : null;
  const born = BORN === "unborn" ? "not yet committed" : fmtDate(BORN);
  return (
    <nav className="navrow">
      <div>{back ? <a href={back.href}>← {back.title}</a> : <span className="none" />}</div>
      <div className="titleblock">
        <h1>{here ? here.title : "ionhomie"}</h1>
        <span className="stamp" title={`Born ${BORN === "unborn" ? "—" : fmtStamp(BORN)}; this version ${UPDATED === "unborn" ? "—" : fmtStamp(UPDATED)}`}>
          born {born} · v{VERSION}, {UPDATED === "unborn" ? "unversioned" : fmtDate(UPDATED)}
        </span>
      </div>
      <div className="fwd">{next ? <a href={next.href}>{next.title} →</a> : <a href="#/">ionhomie</a>}</div>
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
  return (
    <>
      <TitleRow index={index} />
      <C key={slug} />
    </>
  );
}
