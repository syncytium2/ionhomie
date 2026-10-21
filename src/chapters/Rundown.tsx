import { loop } from "../views/draw.ts";
import { Lab } from "../views/lab.ts";
import { Below, ModelNote, ViewPicker, Readout, useEngine } from "./parts.tsx";

function engine() {
  const lab = new Lab({ pump: true, speed: 300, setup: (cell) => { cell.pump.on = false; cell.pmca.on = false; } });
  lab.controls();
  return loop((dt) => { lab.advance(dt); lab.draw(dt); });
}

export function Clock({ speeds = [60, 300, 1800], initial = 300 }: { speeds?: number[]; initial?: number }) {
  const label: Record<number, string> = { 60: "1 minute per second", 300: "5 minutes per second", 1800: "30 minutes per second" };
  return (
    <>
      <button id="run">Start the clock</button>
      <label>Speed <select id="speed" defaultValue={String(initial)}>{speeds.map((s) => <option key={s} value={s}>{label[s]}</option>)}</select></label>
      <button id="reset">Reset</button>
    </>
  );
}

export default function Rundown() {
  useEngine(engine);
  return (
    <main>
      <div className="grid hero">
        <div className="panel">
          <canvas id="stage" />
          <ViewPicker />
          <div className="controls"><Clock /></div>
        </div>
        <div className="panel"><h3>Voltage ruler</h3><canvas id="ruler" /></div>
      </div>
      <div className="grid">
        <div className="panel">
          <h3>Membrane potential</h3><canvas id="trace-v" />
          <h3>Inside concentrations</h3><canvas id="trace-c" />
          <h3>Volume</h3><canvas id="trace-vol" />
        </div>
        <div className="stack">
          <div className="panel">
            <div className="readouts">
              <Readout id="r-time" k="time without a pump" />
              <Readout id="r-v" k="Vm" cls="vm" />
              <Readout id="r-vol" k="cell volume" />
              <Readout id="r-na" k="Na⁺ inside" cls="ion-na" />
              <Readout id="r-k" k="K⁺ inside" cls="ion-k" />
              <Readout id="r-cl" k="Cl⁻ inside" cls="ion-cl" />
            </div>
          </div>
          <div className="panel"><h3>Concentrations</h3><canvas id="gauges" /><p className="src">Solid: inside. Outlined: outside. Log scale.</p></div>
        </div>
      </div>

      <Below>
        <p className="lede">The last chapter ended on a problem. At rest, with Vm steady, K⁺ still leaks out and Na⁺ still leaks in. Here is
          the healthy cell with its leaks and nothing else: no pump, no transporter, no ATP. Start the clock and watch what a steady state
          does when nobody pays for it.</p>
        <div className="predict"><b>Predict.</b> Where will Vm end up? Will the gradients disappear completely, or stop somewhere? And what
          will happen to the cell's size? Remember the A⁻ trapped inside.</div>
        <ul className="notice">
          <li><b>The gradients run down.</b> Na⁺ floods in, K⁺ leaks out, and both reversal potentials collapse toward zero, taking Vm with
            them. In this 10 µm cell the collapse takes tens of minutes; a cell with more membrane per volume, or leakier membrane, goes faster.</li>
          <li><b>Cl⁻ follows.</b> As Vm depolarizes, Cl⁻ is no longer held out, and it flows in with the Na⁺.</li>
          <li><b>The cell swells, and does not stop.</b> Na⁺ and Cl⁻ in exceed K⁺ out, and water follows the solute. With impermeant A⁻ trapped
            inside, no balance is possible: any distribution of the permeable ions that is electrochemically at rest (the Donnan equilibrium)
            leaves more particles inside than out, so water keeps coming. A real cell would burst; this model does not.</li>
        </ul>
        <details>
          <summary>Clinical connection: ischemia and spreading depression</summary>
          <p>Cut the blood supply and the cell's ATP runs out within minutes, and with it every pump. What follows is this chapter: gradients
            collapse, neurons depolarize, and cells take up Na⁺, Cl⁻ and water and swell (cytotoxic edema). Spreading depression, a propagating
            loss of ion homeostasis, links the same failure to traumatic brain injury and migraine. This shows the mechanism, not the time course
            of any real tissue.</p>
        </details>
        <details>
          <summary>The model</summary>
          <p>A single compartment with leaks for K⁺, Na⁺ and Cl⁻ (GHK current equation; pK : pNa : pCl = 1 : 0.02 : 0.5), a fixed bath, and
            impermeant A⁻ inside. Vm is found at every step as the voltage where the net current is zero; it changes far faster than the
            concentrations do. Water follows instantly, so the volume always keeps the inside isosmotic with the bath.</p>
        </details>
        <ModelNote />
      </Below>
    </main>
  );
}
