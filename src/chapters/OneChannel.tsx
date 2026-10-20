import * as I from "../core/physics.ts";
import { $, CellStage, LABEL, Trace, Z, fmtMv, ledger, loop, minus, ruler, setText } from "../views/draw.ts";
import { Below, ModelNote, Readout, useEngine } from "./parts.tsx";

type Mono = "K" | "Na" | "Cl";

function engine() {
  const h = I.healthyState();
  const s0 = I.snapshot(h.cell, h.n);
  const ci = { Na: s0.ci.Na, K: s0.ci.K, Cl: s0.ci.Cl }, co = { Na: I.BATH.Na, K: I.BATH.K, Cl: I.BATH.Cl };
  const { area } = I.sphere(10e-6);
  const cm = 0.01, P1 = 1.0e-8; // one "channel" unit of permeability, m/s; illustrative
  const simPerReal = 0.005; // 5 ms per real second: slowed 200×
  let ion: Mono = "K", open = false, nCh = 3, V = 0, t = 0;
  const mv = (v: number) => v * 1000;
  const E = { K: I.nernst(1, co.K, ci.K), Na: I.nernst(1, co.Na, ci.Na), Cl: I.nernst(-1, co.Cl, ci.Cl) };

  const stage = new CellStage($<HTMLCanvasElement>("stage"), { height: 360, ions: ["Na", "K", "Cl", "A"] });
  stage.setConcentrations({ ...ci, A: s0.ci.A }, co, 1);
  const trace = new Trace($<HTMLCanvasElement>("trace"), {
    series: [{ key: "v", color: "--accent", label: "Vm" }], ymin: -100, ymax: 80, yLabel: "mV", window: 0.04,
    xFmt: (x) => (x * 1000).toFixed(0) + " ms", height: 170, yTicks: [-100, -50, 0, 50],
  });
  const P = (): Partial<I.Conc> => ({ [ion]: open ? P1 * nCh : 0 });
  const setPathways = () => stage.setPathways([{ kind: "channel", angle: -Math.PI / 4, ions: [ion], open, label: `${LABEL[ion]} channel${nCh > 1 ? "s" : ""}` }]);
  setPathways();
  const btn = $<HTMLButtonElement>("open");
  btn.onclick = () => { open = !open; btn.textContent = open ? "Close the channel" : "Open the channel"; btn.classList.toggle("on", open); setPathways(); };
  $<HTMLSelectElement>("ion").onchange = (e) => { ion = (e.target as HTMLSelectElement).value as Mono; setPathways(); };
  $<HTMLInputElement>("count").oninput = (e) => { nCh = +(e.target as HTMLInputElement).value; setText("count-o", String(nCh)); setPathways(); };
  $("zero").onclick = () => { V = 0; };

  let acc = 0;
  return loop((dt) => {
    const d = dt * simPerReal, n = Math.max(1, Math.ceil(d / 2e-6));
    for (let k = 0; k < n; k++) V += I.dVdt(P(), V, ci, co, cm) * (d / n);
    t += d;
    const pp = P();
    const I_ = I.ghkCurrent(pp[ion]!, Z[ion], V, ci[ion], co[ion]) * area; // A, outward +
    const iMax = Math.abs(I.ghkCurrent(P1 * 10, Z[ion], 0, ci[ion], co[ion]) * area) || 1;
    stage.flow([{ [ion]: Math.sign(I_) * Z[ion] * Math.min(40, 220 * Math.sqrt(Math.abs(I_) / iMax)) }], dt);
    stage.step(dt); stage.draw();
    acc += dt;
    if (acc > 0.02) { acc = 0; trace.push(t, { v: mv(V) }); }
    trace.draw();
    const g = { K: 0, Na: 0, Cl: 0 }; g[ion] = open ? 0.3 + 0.07 * nCh : 0;
    ruler($<HTMLCanvasElement>("ruler"), { V: mv(V), E: { K: mv(E.K), Na: mv(E.Na), Cl: mv(E.Cl) }, g, min: -110, max: 80, height: 360 });
    ledger($<HTMLCanvasElement>("ledger"), { V: mv(V) });
    setText("r-v", fmtMv(mv(V)));
    setText("r-e-k", `E for ${LABEL[ion]}`);
    setText("r-e", fmtMv(mv(E[ion])));
    setText("r-df", fmtMv(mv(V - E[ion])));
    setText("r-i", open ? minus((I_ * 1e12).toFixed(1)) + " pA" + (Math.abs(I_) > 1e-13 ? (I_ > 0 ? " out" : " in") : "") : "0 pA: closed");
    const gS = I.slopeConductance(pp, V, ci, co);
    setText("r-tau", open && gS > 0 ? ((1000 * cm) / gS).toFixed(2) + " ms" : "∞: nothing conducts");
  });
}

export default function OneChannel() {
  useEngine(engine);
  return (
    <main>
      <div className="grid hero">
        <div className="panel">
          <canvas id="stage" />
          <div className="controls">
            <button id="open">Open the channel</button>
            <label>It passes <select id="ion"><option value="K">K⁺</option><option value="Na">Na⁺</option><option value="Cl">Cl⁻</option></select></label>
            <label>Channels <input type="range" id="count" min="1" max="10" step="1" defaultValue="3" /><output id="count-o">3</output></label>
            <button id="zero">Discharge to 0 mV</button>
          </div>
        </div>
        <div className="panel"><h3>Voltage ruler</h3><canvas id="ruler" /></div>
      </div>
      <div className="grid">
        <div className="panel">
          <h3>Membrane potential</h3>
          <canvas id="trace" />
          <p className="src">Time slowed 200×; simulated milliseconds on the axis.</p>
        </div>
        <div className="panel">
          <div className="readouts">
            <Readout id="r-v" k="Vm" cls="vm" />
            <Readout id="r-e" k={<span id="r-e-k">E</span>} />
            <Readout id="r-df" k={'"driving force", Vm − E'} />
            <Readout id="r-i" k="current through the channels" />
            <Readout id="r-tau" k="time constant, C/g" />
          </div>
        </div>
      </div>
      <div className="panel">
        <h3>The charge ledger</h3>
        <canvas id="ledger" />
      </div>

      <Below>
        <p className="lede">The same cell, gradients and all, sitting at 0 mV: its membrane carries no charge yet. Now put in one kind of
          channel, a pore that passes only one ion. When it opens, that ion runs down its concentration gradient, and each ion that
          crosses carries its charge with it. The charge builds a voltage that pushes back, until push and gradient balance. That
          balance is the drift chapter's zero net flux, now across a membrane.</p>
        <div className="predict"><b>Predict.</b> Open a K⁺ channel. Which way does Vm go, and where does it stop? Then close the channel.
          Does Vm fall back to zero?</div>
        <ul className="notice">
          <li><b>Vm runs to E for that ion, and stops.</b> At E the ion's flux is zero: the reversal potential.</li>
          <li><b>Closing the channel does not bring Vm back.</b> Nothing else conducts, so nothing discharges the membrane. A real
            membrane always has some leak; leaks are the next chapter.</li>
          <li><b>The concentrations are held fixed here, and the ledger says why that is fair</b>: the ions that charged the membrane are
            far too few to move the gauges.</li>
        </ul>
        <details>
          <summary>The math</summary>
          <p>Each open channel passes its ion at a rate given by the GHK current equation. With one kind of channel, the current is zero at
            exactly one voltage, that ion's reversal potential:</p>
          <div className="eq">{"C · dVm/dt = −I_S(Vm)\nI_S = g_S (Vm − E_S)          near E_S\nE_S = (26.7 mV / z) ln( [S]out / [S]in )"}</div>
          <p>The time constant τ = C/g sets how fast Vm gets there: more channels, faster.</p>
        </details>
        <ModelNote />
      </Below>
    </main>
  );
}
