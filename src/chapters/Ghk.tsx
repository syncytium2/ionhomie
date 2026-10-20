import * as I from "../core/physics.ts";
import { $, CellStage, LABEL, Trace, Z, color, cssVar, fit, fmtBig, fmtMv, loop, minus, ruler, setText } from "../views/draw.ts";
import { Below, ModelNote, useEngine } from "./parts.tsx";

type Mono = "K" | "Na" | "Cl";
interface ConcSet { ci: I.Monovalent; co: I.Monovalent; T: number; rest: [number, number]; A: number }

const SETS: Record<string, ConcSet> = {
  // The 578 lecture's neuronal table and "typical resting cell" ratio (ohm/Nernst/GHK deck, slides 8 and 13).
  neuron: { ci: { K: 140, Na: 10, Cl: 6 }, co: { K: 5, Na: 145, Cl: 106 }, T: I.T37, rest: [0.02, 0.5], A: 144 },
  // Historical: the squid giant axon of Hodgkin and Katz (1949). Recalled values, not yet checked against the sources.
  squid: { ci: { K: 400, Na: 50, Cl: 40 }, co: { K: 20, Na: 440, Cl: 560 }, T: 273.15 + 6.3, rest: [0.04, 0.45], A: 410 },
};

function engine() {
  let set = SETS.neuron, rNa = 0.02, rCl = 0.5;
  const PK = 3e-8, cm = 0.01, simPerReal = 0.005;
  const { area } = I.sphere(10e-6);
  const mv = (v: number) => v * 1000;
  const ghk = (rna: number, rcl: number) => I.ghkVoltage({ K: 1, Na: rna, Cl: rcl }, set.ci, set.co, set.T);
  let V = ghk(rNa, rCl), t = 0;

  const stage = new CellStage($<HTMLCanvasElement>("stage"), { height: 360, ions: ["Na", "K", "Cl", "A"] });
  const trace = new Trace($<HTMLCanvasElement>("trace"), {
    series: [{ key: "v", color: "--accent", label: "Vm" }], ymin: -100, ymax: 60, yLabel: "mV", window: 0.06,
    xFmt: (x) => (x * 1000).toFixed(0) + " ms", height: 150, yTicks: [-100, -50, 0, 50],
  });
  stage.setPathways([
    { kind: "channel", angle: -Math.PI / 3, ions: ["K"], open: true, label: "K⁺" },
    { kind: "channel", angle: Math.PI / 6, ions: ["Na"], open: true, label: "Na⁺" },
    { kind: "channel", angle: (2 * Math.PI) / 3, ions: ["Cl"], open: true, label: "Cl⁻" },
  ]);
  const P = () => ({ K: PK, Na: PK * rNa, Cl: PK * rCl });
  const E = () => ({ K: I.nernst(1, set.co.K, set.ci.K, set.T), Na: I.nernst(1, set.co.Na, set.ci.Na, set.T), Cl: I.nernst(-1, set.co.Cl, set.ci.Cl, set.T) });
  const fmtR = (r: number) => (r >= 1 ? r.toFixed(1) : r >= 0.1 ? r.toFixed(2) : r.toFixed(3));
  const pna = $<HTMLInputElement>("pna"), pcl = $<HTMLInputElement>("pcl");
  function setRatios(na: number, cl: number) {
    rNa = na; rCl = cl;
    pna.value = String(Math.log10(na)); pcl.value = String(Math.log10(cl));
    setText("pna-o", fmtR(na)); setText("pcl-o", fmtR(cl));
  }
  pna.oninput = () => setRatios(10 ** +pna.value, rCl);
  pcl.oninput = () => setRatios(rNa, 10 ** +pcl.value);
  $("p-rest").onclick = () => setRatios(set.rest[0], set.rest[1]);
  $("p-spike").onclick = () => setRatios(20, set.rest[1]);
  const useSet = (k: string) => {
    set = SETS[k];
    setRatios(set.rest[0], set.rest[1]);
    V = ghk(rNa, rCl);
    stage.setConcentrations({ ...set.ci, A: set.A }, set.co, 1);
    trace.clear();
  };
  $<HTMLSelectElement>("conc").onchange = (e) => useSet((e.target as HTMLSelectElement).value);
  useSet("neuron");

  const currents = (Vv: number) => {
    const p = P(), out = {} as Record<Mono, number>;
    for (const ion of ["K", "Na", "Cl"] as Mono[]) out[ion] = I.ghkCurrent(p[ion], Z[ion], Vv, set.ci[ion], set.co[ion], set.T) * area;
    return out;
  };

  function drawBars(cur: Record<Mono, number>) {
    const { ctx, w } = fit($<HTMLCanvasElement>("bars"), 150);
    const mid = w / 2, maxI = Math.max(5e-12, ...Object.values(cur).map(Math.abs));
    ctx.strokeStyle = cssVar("--line"); ctx.beginPath(); ctx.moveTo(mid, 4); ctx.lineTo(mid, 120); ctx.stroke();
    ctx.font = "11px system-ui, sans-serif"; ctx.textBaseline = "middle";
    (["K", "Na", "Cl"] as Mono[]).forEach((ion, i) => {
      const y = 20 + i * 34, len = (cur[ion] / maxI) * (w * 0.42);
      ctx.fillStyle = color(ion); ctx.fillRect(Math.min(mid, mid + len), y - 8, Math.abs(len), 16);
      ctx.fillStyle = cssVar("--text"); ctx.textAlign = len >= 0 ? "right" : "left";
      ctx.fillText(`${LABEL[ion]} ${minus((cur[ion] * 1e12).toFixed(1))} pA`, len >= 0 ? mid - 6 : mid + 6, y);
    });
    ctx.fillStyle = cssVar("--muted"); ctx.textAlign = "center";
    ctx.fillText("← inward current        outward current →", mid, 132);
    ctx.fillText(`sum: ${minus(((cur.K + cur.Na + cur.Cl) * 1e12).toFixed(2))} pA`, mid, 146);
  }

  function drawCurve() {
    const { ctx, w, h: H } = fit($<HTMLCanvasElement>("curve"), 220);
    const l = 44, r = 12, tp = 10, b = 26, lo = -3, hi = 1.5, vmin = -100, vmax = 70;
    const X = (lg: number) => l + ((lg - lo) / (hi - lo)) * (w - l - r), Y = (v: number) => tp + (1 - (v - vmin) / (vmax - vmin)) * (H - tp - b);
    ctx.strokeStyle = cssVar("--line"); ctx.strokeRect(l, tp, w - l - r, H - tp - b);
    const e = E();
    for (const ion of ["K", "Na"] as Mono[]) { ctx.strokeStyle = color(ion); ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(l, Y(mv(e[ion]))); ctx.lineTo(w - r, Y(mv(e[ion]))); ctx.stroke(); }
    ctx.setLineDash([]);
    ctx.strokeStyle = cssVar("--accent"); ctx.lineWidth = 2; ctx.beginPath();
    for (let i = 0; i <= 200; i++) { const lg = lo + ((hi - lo) * i) / 200, v = mv(ghk(10 ** lg, rCl)); if (i === 0) ctx.moveTo(X(lg), Y(v)); else ctx.lineTo(X(lg), Y(v)); }
    ctx.stroke(); ctx.lineWidth = 1;
    ctx.fillStyle = cssVar("--accent"); ctx.beginPath(); ctx.arc(X(Math.log10(rNa)), Y(mv(ghk(rNa, rCl))), 6, 0, 2 * Math.PI); ctx.fill();
    ctx.fillStyle = cssVar("--muted"); ctx.font = "10px ui-monospace, Menlo, monospace"; ctx.textAlign = "center"; ctx.textBaseline = "top";
    for (const lg of [-3, -2, -1, 0, 1]) ctx.fillText(lg === 0 ? "1" : "10" + ["⁻³", "⁻²", "⁻¹", "", "¹"][lg + 3], X(lg), H - b + 6);
    ctx.textAlign = "right"; ctx.textBaseline = "middle";
    for (const v of [-100, -50, 0, 50]) ctx.fillText(minus(String(v)), l - 4, Y(v));
    ctx.textAlign = "left"; ctx.fillStyle = color("Na"); ctx.fillText("E_Na", l + 4, Y(mv(e.Na)) - 8);
    ctx.fillStyle = color("K"); ctx.fillText("E_K", l + 4, Y(mv(e.K)) + 8);
  }

  let acc = 0;
  return loop((dt) => {
    const d = dt * simPerReal, n = Math.max(1, Math.ceil(d / 2e-6));
    for (let k = 0; k < n; k++) V += I.dVdt(P(), V, set.ci, set.co, cm, set.T) * (d / n);
    t += d;
    const cur = currents(V);
    const rate = (ion: Mono) => Math.sign(cur[ion] * Z[ion]) * Math.min(30, 9 * Math.sqrt(Math.abs(cur[ion]) * 1e12));
    stage.flow([{ K: rate("K") }, { Na: rate("Na") }, { Cl: rate("Cl") }], dt);
    stage.step(dt); stage.draw();
    acc += dt;
    if (acc > 0.02) { acc = 0; trace.push(t, { v: mv(V) }); }
    trace.draw();
    const e = E(), tot = 1 + rNa + rCl;
    ruler($<HTMLCanvasElement>("ruler"), { V: mv(V), E: { K: mv(e.K), Na: mv(e.Na), Cl: mv(e.Cl) }, g: { K: 1 / tot, Na: rNa / tot, Cl: rCl / tot }, min: -110, max: 80, height: 360 });
    drawBars(cur); drawCurve();
    setText("r-ghk", fmtMv(mv(ghk(rNa, rCl))));
    const kOut = cur.K / I.F, kAmount = set.ci.K * I.sphere(10e-6).volume, hours = kAmount / Math.max(1e-30, kOut) / 3600;
    setText("leak-note", kOut > 0
      ? `At this Vm, ${fmtBig(kOut * 6.022e23)} K⁺ ions leave the cell every second, and Na⁺ enters at ${fmtBig(Math.max(0, -cur.Na / I.F) * 6.022e23)} per second. ` +
        `Nothing in this chapter replaces them. At that rate the cell would lose all its K⁺ in about ${hours < 1 ? (hours * 60).toFixed(0) + " minutes" : hours.toFixed(1) + " hours"}, and long before that its gradients, and with them Vm, would be gone.`
      : "Vm is above E_K, so K⁺ is not leaving here.");
  });
}

export default function Ghk() {
  useEngine(engine);
  return (
    <main>
      <div className="grid hero">
        <div className="panel">
          <canvas id="stage" />
          <div className="controls">
            <label><span>p<sub>Na</sub> / p<sub>K</sub></span> <input type="range" id="pna" min="-3" max="1.5" step="0.01" /><output id="pna-o" /></label>
            <label><span>p<sub>Cl</sub> / p<sub>K</sub></span> <input type="range" id="pcl" min="-3" max="0.5" step="0.01" /><output id="pcl-o" /></label>
          </div>
          <div className="controls">
            <button id="p-rest">Typical resting cell</button>
            <button id="p-spike">Peak of a spike</button>
            <label>Concentrations <select id="conc"><option value="neuron">neuron (578 lecture)</option><option value="squid">squid giant axon (historical)</option></select></label>
          </div>
        </div>
        <div className="stack">
          <div className="panel"><h3>Voltage ruler</h3><canvas id="ruler" /></div>
        </div>
      </div>
      <div className="grid">
        <div className="panel">
          <h3>Vm against the permeability ratio</h3>
          <canvas id="curve" />
          <p className="src">E_GHK as p<sub>Na</sub>/p<sub>K</sub> sweeps from K⁺-dominated to Na⁺-dominated, p<sub>Cl</sub>/p<sub>K</sub> as set. The dot is
            now. Swapping the ratio from 1 : 0.02 to 1 : 20 is, in outline, what an action potential does.</p>
        </div>
        <div className="stack">
          <div className="panel">
            <h3>Currents at this Vm</h3>
            <canvas id="bars" />
          </div>
          <div className="panel">
            <div className="readouts"><div className="readout"><div className="k">E_GHK</div><div className="v vm" id="r-ghk">—</div></div></div>
          </div>
        </div>
      </div>
      <div className="panel">
        <h3>Membrane potential</h3>
        <canvas id="trace" />
      </div>

      <Below>
        <p className="lede">A real membrane is never permeable to just one ion. Give it K⁺, Na⁺ and Cl⁻ channels at once and each ion pulls Vm
          toward its own reversal potential, harder the more permeable the membrane is to it. Vm settles where the currents cancel:
          between the ticks, weighted by permeability. That point is the Goldman–Hodgkin–Katz (GHK) voltage.</p>
        <div className="predict"><b>Predict.</b> The typical resting cell is fifty times more permeable to K⁺ than to Na⁺. Does Vm sit on E_K?
          If not, how far off? And once Vm has settled, have the ions stopped moving?</div>
        <h2>Steady, not at equilibrium</h2>
        <p className="notice">The currents sum to zero, so Vm holds still, but none of them is zero: K⁺ leaks out and Na⁺ leaks in, continuously.</p>
        <p className="notice" id="leak-note" />
        <details>
          <summary>The math</summary>
          <p>Each ion's current follows the GHK current equation. Setting the total current to zero gives the GHK voltage equation (Cl⁻ enters
            with inside and outside swapped because its charge is negative):</p>
          <div className="eq">{"E_GHK = (RT/F) ln( (pK[K]out + pNa[Na]out + pCl[Cl]in) / (pK[K]in + pNa[Na]in + pCl[Cl]out) )"}</div>
          <p>With the lecture's typical resting cell, pK : pNa : pCl = 1 : 0.02 : 0.5 and its concentrations, E_GHK = −76.8 mV. With only one
            ion left, the equation is that ion's Nernst equation.</p>
          <p>The zero-current condition says nothing about each ion's flux. This is a steady state, not an equilibrium, and a steady state with
            continuing fluxes has to be paid for. The next chapter asks what happens if it is not.</p>
          <p className="src">The squid preset (inside K⁺ 400, Na⁺ 50, Cl⁻ 40 mM; outside K⁺ 20, Na⁺ 440, Cl⁻ 560 mM; 6.3 °C; Hodgkin and Katz's
            1949 ratio 1 : 0.04 : 0.45) is historical and its numbers are recalled, not yet checked against the sources.</p>
        </details>
        <ModelNote />
      </Below>
    </main>
  );
}
