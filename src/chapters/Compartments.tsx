import * as I from "../core/physics.ts";
import { $, CellStage, fmtMv, gauges, ledger, loop, minus, ruler, setText } from "../views/draw.ts";
import { Below, ModelNote, useEngine } from "./parts.tsx";

function engine() {
  const h = I.healthyState();
  const s = I.snapshot(h.cell, h.n);
  const bath = I.BATH;
  const mv = (v: number) => v * 1000;
  let V = 0;
  const stage = new CellStage($<HTMLCanvasElement>("stage"), { height: 380, ions: ["Na", "K", "Cl", "A"] });
  const ci = { Na: s.ci.Na, K: s.ci.K, Cl: s.ci.Cl, A: s.ci.A };
  stage.setConcentrations(ci, { Na: bath.Na, K: bath.K, Cl: bath.Cl }, 1);

  const inPos = s.ci.Na + s.ci.K + 2 * s.ci.Ca, inNeg = s.ci.Cl - h.cell.zA * s.ci.A;
  const outPos = bath.Na + bath.K + 2 * bath.Ca, outNeg = bath.Cl + bath.X;
  const f1 = (x: number) => x.toFixed(1);
  $("neutral").innerHTML =
    "<tr><th></th><th>inside</th><th>outside</th></tr>" +
    `<tr><td>positive charge</td><td>${f1(inPos)} mM</td><td>${f1(outPos)} mM</td></tr>` +
    `<tr><td>negative charge</td><td>${f1(inNeg)} mM</td><td>${f1(outNeg)} mM</td></tr>` +
    `<tr><td>osmolarity</td><td>${f1(s.ci.Na + s.ci.K + s.ci.Cl + s.ci.Ca + s.ci.A)} mOsm</td><td>${f1(I.osmolarity(bath))} mOsm</td></tr>` +
    `<tr><td colspan="3" class="src">Outside, X⁻ (${bath.X} mM) stands for bicarbonate, phosphate and the other anions; each A⁻ carries ${minus(h.cell.zA.toFixed(2))} charges.</td></tr>`;

  const draw = () => {
    ruler($<HTMLCanvasElement>("ruler"), { V, E: { K: mv(s.E.K), Na: mv(s.E.Na), Cl: mv(s.E.Cl) }, g: { K: 0, Na: 0, Cl: 0 }, min: -110, max: 80, height: 380 });
    ledger($<HTMLCanvasElement>("ledger"), { V });
    gauges($<HTMLCanvasElement>("gauges"), { ions: ["Na", "K", "Cl", "A"], ci, co: { Na: bath.Na, K: bath.K, Cl: bath.Cl } });
  };
  $<HTMLInputElement>("charge").oninput = (e) => { V = +(e.target as HTMLInputElement).value; setText("charge-o", fmtMv(V, 0)); draw(); };
  draw();
  addEventListener("resize", draw);
  const stop = loop((dt) => { stage.step(dt); stage.draw(); });
  return () => { stop(); removeEventListener("resize", draw); };
}

export default function Compartments() {
  useEngine(engine);
  return (
    <main>
      <div className="grid hero">
        <div className="panel">
          <canvas id="stage" />
          <div className="controls">
            <label>Charge the membrane to <input type="range" id="charge" min="-100" max="100" step="1" defaultValue="0" /><output id="charge-o">0 mV</output></label>
          </div>
        </div>
        <div className="panel"><h3>Voltage ruler</h3><canvas id="ruler" /></div>
      </div>
      <div className="panel">
        <h3>The charge ledger</h3>
        <canvas id="ledger" />
      </div>
      <div className="grid">
        <div className="panel">
          <h3>Concentrations</h3>
          <canvas id="gauges" />
          <p className="src">Solid bars: inside. Outlined bars: outside. Log scale.</p>
        </div>
        <div className="panel">
          <h3>Each compartment is neutral</h3>
          <table id="neutral" />
        </div>
      </div>

      <Below>
        <p className="lede">Wrap a membrane around some of the solution and you have a cell: two compartments, each well mixed, each with
          its own concentrations. This cell already has a neuron's gradients, the ones in the 578 lecture's table: K⁺ high inside,
          Na⁺ and Cl⁻ high outside. Inside are also large anions that can never cross (A⁻): proteins, nucleic acids, metabolites.</p>
        <p className="lede">The membrane is closed: nothing crosses it. But it can still hold charge, like a capacitor: a thin film of excess
          cations on one face and anions on the other. That film is the membrane potential.</p>
        <div className="predict"><b>Predict.</b> To charge this membrane to −80 mV, about where this cell will rest, roughly what fraction of
          the cell's K⁺ has to cross it: a tenth, a hundredth, or much less? Move the slider and read the ledger.</div>
        <ul className="notice">
          <li><b>The gradients already define an equilibrium potential for each ion</b> (the ruler's ticks). With the membrane closed, no
            ion can act on it: the arrows are faint because nothing conducts.</li>
          <li><b>The bulk of each compartment carries no net charge</b> (electroneutrality). The excess that sets Vm is so small it does
            not show in these sums at all.</li>
          <li><b>Equal osmolarity inside and out means no water moves.</b> Remember the trapped A⁻: they will matter in the rundown chapter.</li>
        </ul>
        <details>
          <summary>The math: the membrane as a capacitor</summary>
          <div className="eq">{"Q = C · Vm          C = c_m · area,  c_m ≈ 1 µF/cm²\nions = Q / e"}</div>
          <p>For a sphere 10 µm in radius the area is 1.26 × 10⁻⁵ cm², so C ≈ 12.6 pF. Charging it by 100 mV takes 1.26 pC: about 7.8
            million monovalent ions. The cell holds about 3.5 × 10¹¹ K⁺ at 140 mM, so that is about 1 in 45,000.</p>
          <p className="src">The 578 diffusion lecture gives c_m ≈ 0.9 µF/cm²; these pages use the round 1 µF/cm², about 10% more charge.</p>
        </details>
        <ModelNote />
      </Below>
    </main>
  );
}
