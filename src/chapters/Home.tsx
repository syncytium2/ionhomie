import { $, drawKey, loop } from "../views/draw.ts";
import { Lab } from "../views/lab.ts";
import { CHAPTERS } from "./index.ts";
import { Below, ModelNote, useEngine } from "./parts.tsx";

function engine() {
  // The healthy cell, alive: leaks and pump running, every concentration held still.
  const lab = new Lab({ pump: true, speed: 60, autorun: true });
  const key = () => drawKey($<HTMLCanvasElement>("key"), ["Na", "K", "Cl", "Ca", "A"]);
  key();
  addEventListener("resize", key);
  const stop = loop((dt) => { lab.advance(dt); lab.draw(dt); });
  return () => { stop(); removeEventListener("resize", key); };
}

export default function Home() {
  useEngine(engine);
  return (
    <main>
      <div className="grid hero home-hero">
        <div className="panel"><canvas id="stage" /></div>
        <div className="panel"><h3>Voltage ruler</h3><canvas id="ruler" /></div>
      </div>
      <div className="panel"><canvas id="key" /></div>

      <ol className="chapters">
        {CHAPTERS.map((c, i) => (
          <li key={c.slug}><span className="n">{i + 1}</span><a href={`#/${c.slug}`}>{c.title}</a><br /><span>{c.line}</span></li>
        ))}
        <li className="later"><b>Sandbox</b><br /><span>Everything unlocked at once. Not built yet.</span></li>
      </ol>

      <Below>
        <p className="lede">Above: a living cell. K⁺ leaks out, Na⁺ leaks in, Cl⁻ sits where Vm puts it, and the Na⁺/K⁺ pump turns, putting back
          exactly what the leaks take. Nothing in the gauges changes; everything is moving. That is ion homeostasis.</p>
        <p className="lede">These chapters build it one mechanism at a time, each kept switched on in the next: diffusion, drift, a membrane, one
          channel, two, the leaks running the cell down, the pump that stops them, and the transporters that set chloride. Written for
          graduate and medical students, alongside the Physiol 578 lectures.</p>
        <h2>The two views that stay with you</h2>
        <ul className="notice">
          <li><b>The voltage ruler.</b> A tick at each ion's reversal potential, a needle at Vm, and an arrow from the needle toward each tick:
            that ion's "driving force", wider when the membrane conducts it better.</li>
          <li><b>The charge ledger.</b> The handful of ions that actually set Vm, magnified, beside the arithmetic that says how few they are.</li>
        </ul>
        <p className="src">Color names the ion, as in the 578 lectures (K⁺ blue, Cl⁻ red, Ca²⁺ green, Na⁺ black there and white here); shape
          carries the charge: circles are cations (a double ring for Ca²⁺), diamonds are anions, and the large rounded shapes are impermeant anions
          trapped inside the cell (A⁻).</p>
        <p className="src">Source: <a href="https://github.com/syncytium2/ionhomie">github.com/syncytium2/ionhomie</a> (MIT).</p>
        <ModelNote />
      </Below>
    </main>
  );
}
