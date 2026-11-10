import * as I from "../core/physics.ts";
import { $, fmtMv, loop, setText } from "../views/draw.ts";
import { Lab } from "../views/lab.ts";
import { Below, ModelNote, ViewPicker, Readout, useEngine } from "./parts.tsx";
import { Clock } from "./Rundown.tsx";

// a cotransporter's capacity: its rate per unit of ln(driving ratio), in femtomoles per second (1 fmol/s ≈ 600 million
// cycles per second, in this one small cell); "off" at the bottom of the slider
const fmtL = (v: number) => (v <= 0 ? "off" : (v * 1e15 >= 0.1 ? (v * 1e15).toFixed(2) : (v * 1e15).toFixed(3)) + " fmol/s");

function engine() {
  const nk = $<HTMLInputElement>("nkcc1"), kc = $<HTMLInputElement>("kcc2");
  const sync = () => {
    nk.value = String(lab.cell.nkcc1 > 0 ? Math.log10(lab.cell.nkcc1) : -19);
    kc.value = String(lab.cell.kcc2 > 0 ? Math.log10(lab.cell.kcc2) : -19);
    setText("nkcc1-o", fmtL(lab.cell.nkcc1)); setText("kcc2-o", fmtL(lab.cell.kcc2));
  };
  const bathK = $<HTMLInputElement>("bath-k"), furo = $<HTMLButtonElement>("furosemide"), clamp = $<HTMLButtonElement>("clamp");
  let held: { nkcc1: number; kcc2: number } | null = null; // the capacities furosemide is blocking, to restore on washout
  const labels = () => {
    furo.textContent = held ? "Wash out the furosemide" : "Furosemide: block NKCC1 and KCC2";
    furo.classList.toggle("on", !!held);
    clamp.textContent = lab.cell.clamp ? "Release the clamp" : "Clamp: hold Vm at −70 mV and K⁺ inside";
    clamp.classList.toggle("on", !!lab.cell.clamp);
  };
  const setBathK = (k: number) => {
    lab.bath.K = k; lab.bath.Cl = I.BATH.Cl + (k - I.BATH.K); // added as KCl, so the bath stays neutral
    bathK.value = String(k); setText("bath-k-o", k.toFixed(1) + " mM");
    lab.resnap();
  };
  const lab = new Lab({ pump: true, ccc: true, speed: 1800, autorun: true, onReset: () => { held = null; setBathK(I.BATH.K); sync(); labels(); } });
  lab.controls();
  const set = (a: number, b: number) => {
    held = null; labels();
    lab.cell.nkcc1 = a; lab.cell.kcc2 = b; lab.pathways(); sync();
    if (!lab.running) { lab.running = true; lab.labelRun?.(); }
  };
  const fromSlider = (v: string) => (+v <= -18.99 ? 0 : 10 ** +v);
  nk.oninput = () => set(fromSlider(nk.value), lab.cell.kcc2);
  kc.oninput = () => set(lab.cell.nkcc1, fromSlider(kc.value));
  $("preset-none").onclick = () => set(0, 0);
  $("preset-kcc2").onclick = () => set(I.CCC_PRESETS.kcc2.nkcc1, I.CCC_PRESETS.kcc2.kcc2);
  $("preset-nkcc1").onclick = () => set(I.CCC_PRESETS.gnrh.nkcc1, I.CCC_PRESETS.gnrh.kcc2);
  $("preset-recording").onclick = () => {
    set(I.CCC_PRESETS.recording.nkcc1, I.CCC_PRESETS.recording.kcc2);
    lab.cell.clamp = { ...I.RECORDING }; lab.resnap(); labels();
  };
  bathK.oninput = () => setBathK(+bathK.value);
  furo.onclick = () => {
    if (held) { const h = held; set(h.nkcc1, h.kcc2); }
    else { const h = { nkcc1: lab.cell.nkcc1, kcc2: lab.cell.kcc2 }; set(0, 0); held = h; labels(); }
  };
  clamp.onclick = () => { lab.cell.clamp = lab.cell.clamp ? null : { ...I.RECORDING }; lab.resnap(); labels(); if (!lab.running) { lab.running = true; lab.labelRun?.(); } };
  sync(); labels();

  return loop((dt) => {
    lab.advance(dt);
    lab.draw(dt, ["Na", "K", "Cl"]);
    const s = lab.s, ecl = s.E.Cl * 1000, v = s.V * 1000, df = v - ecl;
    setText("r-ecl", fmtMv(ecl));
    setText("r-ek", fmtMv(s.E.K * 1000));
    setText("r-clamp", lab.cell.clamp ? `holding ${fmtMv(v, 0)}, ${(s.iClamp * 1e12).toFixed(0).replace("-", "−")} pA` : "off: Vm runs free");
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
          <ViewPicker />
          <div className="controls">
            <button id="preset-none">Passive: neither</button>
            <button id="preset-kcc2">KCC2, as in adult cortex</button>
            <button id="preset-nkcc1">NKCC1, to a GnRH neuron's E_GABA</button>
            <button id="preset-recording">The recording: KCC2 ×10, clamped</button>
          </div>
          <div className="controls">
            <label>Bath K⁺ <input type="range" id="bath-k" min="2.5" max="15" step="0.5" defaultValue="5" /><output id="bath-k-o">5.0 mM</output></label>
            <button id="furosemide" className="danger">Furosemide: block NKCC1 and KCC2</button>
            <button id="clamp">Clamp: hold Vm at −70 mV and K⁺ inside</button>
          </div>
          <div className="controls">
            <label>NKCC1 capacity <input type="range" id="nkcc1" min="-19" max="-15" step="0.05" /><output id="nkcc1-o">off</output></label>
            <label>KCC2 capacity <input type="range" id="kcc2" min="-19" max="-14.5" step="0.05" /><output id="kcc2-o">off</output></label>
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
              <Readout id="r-ek" k="E_K" cls="ion-k" />
              <Readout id="r-clamp" k="clamp" />
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
          <li><b>Raise bath K⁺ and E_Cl rises with it</b>, in the running cell, whether KCC2 is there or not: E_K moves, Vm follows it,
            and with a Cl⁻ leak this large, Cl⁻ follows Vm. Block both transporters with furosemide and try again: E_Cl still moves. In the
            running cell you cannot tell KCC2's part from Vm's.</li>
          <li><b>So hold Vm, as a recording does.</b> DeFazio, Keros, Quick and Hablitz (2000) recorded mature rat neocortical pyramidal
            neurons in whole-cell clamp, which holds Vm and sets the K⁺ inside from the pipette, and found that raising or lowering bath K⁺
            moved the Cl⁻ inside with it. Neurons from newborn rats, with little KCC2, showed no K⁺ effect. Press <i>The recording</i>: now
            E_Cl follows E_K as bath K⁺ changes, because KCC2's driving force is ln([K]in[Cl]in / [K]out[Cl]out). Above about 10 mM bath
            K⁺, E_K rises past the holding potential and KCC2 turns around and loads Cl⁻. Block it with furosemide and E_Cl settles at the
            holding potential whatever the bath K⁺.</li>
          <li><b>Everything here stands on the pump.</b> Block it in the pumps chapter and both transporters lose the gradients they run on.</li>
        </ul>
        <details>
          <summary>The model, and what it does not claim</summary>
          <p>Each cotransporter's rate is proportional to the logarithm of its driving ratio, so it runs forward, stops, or reverses exactly as
            thermodynamics allows:</p>
          <div className="eq">{"NKCC1 inward = capacity × ln( [Na]out[K]out[Cl]out² / [Na]in[K]in[Cl]in² )\nKCC2 outward = capacity × ln( [K]in[Cl]in / [K]out[Cl]out )"}</div>
          <p>The sliders set each transporter's capacity, its rate in cycles per unit of that logarithm, shown in femtomoles per second
            (fmol/s; 1 fmol/s is about 600 million cycles a second in this one small cell). Each cycle moves its whole set of ions.</p>
          <p>The clamp holds Vm at −70 mV and holds the K⁺ inside, as a whole-cell pipette would; the current it supplies is shown, and is not
            carried by the cell's ions. The −70 mV and the recording's KCC2 capacity (ten times the cortex preset, so KCC2 rather than the Cl⁻
            leak sets Cl⁻) are chosen to show the effect, not taken from the paper's protocol (J Neurosci 20:8069). Furosemide blocks both
            cotransporters here.</p>
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
