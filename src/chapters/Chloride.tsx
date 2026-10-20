import * as I from "../core/physics.ts";
import { $, fmtMv, loop, setText } from "../views/draw.ts";
import { Lab } from "../views/lab.ts";
import { Below, ModelNote, Readout, useEngine } from "./parts.tsx";
import { Clock } from "./Rundown.tsx";

const SUP = "⁰¹²³⁴⁵⁶⁷⁸⁹";
const fmtL = (v: number) => (v <= 0 ? "off" : v.toExponential(1).replace(/e-(\d+)$/, (_, d: string) => " × 10⁻" + d.split("").map((c) => SUP[+c]).join("")));

function engine() {
  const nk = $<HTMLInputElement>("nkcc1"), kc = $<HTMLInputElement>("kcc2");
  const sync = () => {
    nk.value = String(lab.cell.nkcc1 > 0 ? Math.log10(lab.cell.nkcc1) : -19);
    kc.value = String(lab.cell.kcc2 > 0 ? Math.log10(lab.cell.kcc2) : -19);
    setText("nkcc1-o", fmtL(lab.cell.nkcc1)); setText("kcc2-o", fmtL(lab.cell.kcc2));
  };
  const lab = new Lab({ pump: true, ccc: true, speed: 1800, autorun: true, onReset: () => sync() });
  lab.controls();
  const set = (a: number, b: number) => {
    lab.cell.nkcc1 = a; lab.cell.kcc2 = b; lab.pathways(); sync();
    if (!lab.running) { lab.running = true; lab.labelRun?.(); }
  };
  const fromSlider = (v: string) => (+v <= -18.99 ? 0 : 10 ** +v);
  nk.oninput = () => set(fromSlider(nk.value), lab.cell.kcc2);
  kc.oninput = () => set(lab.cell.nkcc1, fromSlider(kc.value));
  $("preset-none").onclick = () => set(0, 0);
  $("preset-kcc2").onclick = () => set(I.CCC_PRESETS.kcc2.nkcc1, I.CCC_PRESETS.kcc2.kcc2);
  $("preset-nkcc1").onclick = () => set(I.CCC_PRESETS.gnrh.nkcc1, I.CCC_PRESETS.gnrh.kcc2);
  sync();

  return loop((dt) => {
    lab.advance(dt);
    lab.draw(dt, ["Na", "K", "Cl"]);
    const s = lab.s, ecl = s.E.Cl * 1000, v = s.V * 1000, df = v - ecl;
    setText("r-ecl", fmtMv(ecl));
    setText("r-gaba", Math.abs(df) < 1 ? "shunting: little voltage change"
      : df < 0 ? `depolarizing, toward ${fmtMv(ecl, 0)}${ecl > -50 ? "; above a typical threshold" : ""}`
      : `hyperpolarizing, toward ${fmtMv(ecl, 0)}`);
  });
}

export default function Chloride() {
  useEngine(engine);
  return (
    <main>
      <div className="grid hero">
        <div className="panel">
          <canvas id="stage" />
          <div className="controls">
            <button id="preset-none">Passive: neither</button>
            <button id="preset-kcc2">KCC2, as in adult cortex</button>
            <button id="preset-nkcc1">NKCC1, to a GnRH neuron's E_GABA</button>
          </div>
          <div className="controls">
            <label>NKCC1 <input type="range" id="nkcc1" min="-19" max="-15" step="0.05" /><output id="nkcc1-o">off</output></label>
            <label>KCC2 <input type="range" id="kcc2" min="-19" max="-15" step="0.05" /><output id="kcc2-o">off</output></label>
          </div>
          <div className="controls"><Clock speeds={[300, 1800]} initial={1800} /></div>
        </div>
        <div className="panel"><h3>Voltage ruler</h3><canvas id="ruler" /></div>
      </div>
      <div className="grid">
        <div className="panel">
          <h3>Vm and E_Cl</h3><canvas id="trace-v" />
          <h3>Inside concentrations</h3><canvas id="trace-c" />
        </div>
        <div className="stack">
          <div className="panel">
            <div className="readouts">
              <Readout id="r-ecl" k="E_Cl = E_GABA here" cls="ion-cl" />
              <Readout id="r-v" k="Vm" cls="vm" />
              <Readout id="r-gaba" k={<>GABA<sub>A</sub> at this Vm</>} />
              <Readout id="r-cl" k="Cl⁻ inside" cls="ion-cl" />
              <Readout id="r-vol" k="cell volume" />
              <Readout id="r-time" k="time" />
            </div>
          </div>
          <div className="panel"><h3>Volume</h3><canvas id="trace-vol" /></div>
          <div className="panel"><h3>Concentrations</h3><canvas id="gauges" /></div>
        </div>
      </div>

      <Below>
        <p className="lede">No pump moves Cl⁻. In the cell so far it has simply settled wherever Vm put it: E_Cl equal to Vm, a passive
          distribution, with 5.2 mM inside (the 578 chloride lecture's cortical pyramidal neurons: about 5.3 mM). Two cotransporters change
          that, each running on a gradient the Na⁺/K⁺ pump built. NKCC1 carries 1 Na⁺, 1 K⁺ and 2 Cl⁻ in together, riding the Na⁺ gradient.
          KCC2 carries 1 K⁺ and 1 Cl⁻ out together, riding the K⁺ gradient. Neither moves any net charge.</p>
        <p className="lede">E_Cl matters because GABA<sub>A</sub> receptors are Cl⁻ channels. Where E_Cl sits relative to Vm decides whether GABA
          hyperpolarizes a neuron or depolarizes it.</p>
        <div className="predict"><b>Predict.</b> Switch on KCC2 alone. How far down can it push E_Cl: as far as you like, or is there a floor?
          Then try NKCC1 alone. Where does Vm go while E_Cl moves?</div>
        <ul className="notice">
          <li><b>KCC2 has a floor.</b> It pushes Cl⁻ out only while the K⁺ gradient pays for it, so E_Cl can approach E_K but never pass it.</li>
          <li><b>NKCC1 loads Cl⁻ above passive</b>, paid for by the Na⁺ gradient, and E_Cl rises above Vm. Opening GABA<sub>A</sub> channels then
            lets Cl⁻ out, and the cell depolarizes. NKCC1 strong enough to bring E_Cl to −36.5 mV, the E_GABA measured in adult mouse GnRH
            neurons (about 27 mM Cl⁻ inside, in the 578 chloride lecture), puts it well above a typical spike threshold.</li>
          <li><b>Vm follows E_Cl part of the way.</b> In the lecture's typical resting cell Cl⁻ is a third of the resting permeability
            (pCl = 0.5 against pK = 1), so loading Cl⁻ drags Vm from −80 to about −60 mV. In a cell with little resting Cl⁻ permeability,
            E_Cl could move a long way while Vm barely changed.</li>
          <li><b>NKCC1 swells the cell</b>: it brings in four ions at a time, and water follows. Cells use exactly this to recover their volume
            after shrinking.</li>
          <li><b>Everything here stands on the pump.</b> Block it in the pumps chapter and both transporters lose the gradients they run on.</li>
        </ul>
        <details>
          <summary>The model, and what it does not claim</summary>
          <p>Each cotransporter's rate is proportional to the logarithm of its driving ratio, so it runs forward, stops, or reverses exactly as
            thermodynamics allows:</p>
          <div className="eq">{"NKCC1 inward ∝ ln( [Na]out[K]out[Cl]out² / [Na]in[K]in[Cl]in² )\nKCC2 outward ∝ ln( [K]in[Cl]in / [K]out[Cl]out )"}</div>
          <p>E_GABA is taken to equal E_Cl. Real GABA<sub>A</sub> channels also pass some bicarbonate, which pulls E_GABA a little positive of
            E_Cl; this model leaves bicarbonate out.</p>
          <p>The cell is generic. The presets show what transport could bring this cell to each E_Cl; they do not claim what any real neuron
            expresses. The KCC2 preset's −85 mV is illustrative. The −36.5 mV figure is the E_GABA measured with gramicidin perforated patch in
            adult mouse GnRH neurons (DeFazio et al. 2002, Mol Endocrinol 16:2872), the recording mode that leaves internal Cl⁻ undisturbed.</p>
        </details>
        <ModelNote />
      </Below>
    </main>
  );
}
