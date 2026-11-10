import * as P from "../core/protons.ts";
import { sphere } from "../core/physics.ts";
import { $, CellStage, Trace, drawKey, fmtMv, fmtTime, gauges, loop, ruler, setText, viewPref, type Pathway } from "../views/draw.ts";
import { bufferLedger, overlay, phGauge } from "../views/protons-views.ts";
import { Below, Readout, ViewPicker, useEngine } from "./parts.tsx";

// The protons page (docs/adr/0022): Siesjö's cell, its pH held far from equilibrium by NHE and NBC.
const NA_IN = 10, NA_OUT = 145; // mM, ionhomie's lecture values; Siesjö's figure gives no Na⁺
const NA = 6.02214076e23;
const ANGLE = { leak: Math.PI * 0.84, nhe: -Math.PI * 0.36, nbc: Math.PI * 0.12 };

function engine() {
  const c = P.siesjoCell();
  let pHi: number = P.SIESJO.pHi, pH0 = pHi, t = 0, running = true, speed = 60;
  const cellVolume = sphere(10e-6).volume;
  const stage = new CellStage($<HTMLCanvasElement>("stage"), { height: 420, ions: ["Na", "HCO3"], mode: "fixed", cellVolume });
  const ref = P.LEAK_REST + P.METAB; // the resting acid load, mM/s: the arrows' scale
  const rest = P.fluxes(c, pHi);
  const trace = new Trace($<HTMLCanvasElement>("trace-ph"), {
    series: [{ key: "ph", color: "--h", label: "pHi" }, { key: "pass", color: "--muted", label: "passive", dash: [5, 4] }],
    ymin: 6.0, ymax: 7.6, yLabel: "pH", height: 150, yTicks: [6.0, 6.4, 6.8, 7.2, 7.6], yFmt: (v) => v.toFixed(1),
    window: 1800, grow: true, xFmt: (s) => (s / 60).toFixed(0) + " min",
  });
  let lastRec = -1e9;
  const record = (force = false) => {
    if (!force && t - lastRec < speed / 30) return;
    lastRec = t; trace.push(t, { ph: pHi, pass: P.passivePHi(c.Vm, c.pHo) });
  };

  const pathways = () => {
    const old = new Map(stage.pathways.map((p) => [p.key, p.phase]));
    const narrow = stage.geometry().w < 560; // the long labels would run off a phone's stage
    const list: Pathway[] = [
      { kind: "channel", angle: ANGLE.leak, ions: ["H"], open: true, label: "H⁺ leak", key: "leak" },
      { kind: "nhe", angle: ANGLE.nhe, label: narrow ? (c.nhe.on ? "NHE1" : "NHE1: off") : c.nhe.on ? "NHE1: H⁺ out, Na⁺ in" : "NHE1: stopped", key: "nhe", on: c.nhe.on },
      { kind: "nbc", angle: ANGLE.nbc, label: narrow ? (c.nbc.on ? "NBC" : "NBC: off") : c.nbc.on ? "NBC: Na⁺ + 2 HCO₃⁻ in" : "NBC: stopped", key: "nbc", on: c.nbc.on },
    ];
    for (const p of list) p.phase = old.get(p.key) ?? 0;
    stage.setPathways(list);
  };
  const buttons = () => {
    const mark = (id: string, stopped: boolean, on: string, off: string) => { const b = $<HTMLButtonElement>(id); b.textContent = stopped ? off : on; b.classList.toggle("on", stopped); b.setAttribute("aria-pressed", String(stopped)); };
    mark("nhe", !c.nhe.on, "Stop NHE", "Restart NHE");
    mark("nbc", !c.nbc.on, "Stop NBC", "Restart NBC");
    mark("both", !c.nhe.on && !c.nbc.on, "Stop both", "Restart both");
    mark("metab", !c.metabOn, "Metabolic acid: on", "Metabolic acid: off");
    $<HTMLButtonElement>("run").textContent = running ? "Pause" : "Run";
    $<HTMLButtonElement>("run").classList.toggle("on", running);
  };
  // the buffer ledger counts from the last pH the cell rested at; a change of transport starts a new count
  const changed = () => { pH0 = pHi; pathways(); buttons(); if (!running) { running = true; buttons(); } };
  $("nhe").onclick = () => { c.nhe.on = !c.nhe.on; changed(); };
  $("nbc").onclick = () => { c.nbc.on = !c.nbc.on; changed(); };
  $("both").onclick = () => { const on = !c.nhe.on && !c.nbc.on; c.nhe.on = on; c.nbc.on = on; changed(); };
  $("metab").onclick = () => { c.metabOn = !c.metabOn; changed(); };
  const vm = $<HTMLInputElement>("vm");
  vm.oninput = () => { c.Vm = +vm.value; setText("vm-o", fmtMv(c.Vm, 0)); pH0 = pHi; };
  $("run").onclick = () => { running = !running; buttons(); };
  const sp = $<HTMLSelectElement>("speed");
  sp.onchange = () => { speed = +sp.value; };
  $("reset").onclick = () => {
    const fresh = P.siesjoCell();
    Object.assign(c, fresh); pHi = P.SIESJO.pHi; pH0 = pHi; t = 0; running = true; vm.value = String(c.Vm); setText("vm-o", fmtMv(c.Vm, 0));
    trace.clear(); record(true); pathways(); buttons();
  };
  vm.value = String(c.Vm); setText("vm-o", fmtMv(c.Vm, 0));
  pathways(); buttons(); record(true);
  let wasNarrow = stage.geometry().w < 560;

  return loop((dt) => {
    const isNarrow = stage.geometry().w < 560;
    if (isNarrow !== wasNarrow) { wasNarrow = isNarrow; pathways(); }
    if (running && dt > 0) { pHi = P.stepPh(c, pHi, dt * speed); t += dt * speed; record(); }
    const f = P.fluxes(c, pHi), hco3i = P.hco3In(pHi, c.pHo, c.hco3o), pass = P.passivePHi(c.Vm, c.pHo);
    stage.setConcentrations({ Na: NA_IN, HCO3: hco3i, H: P.hFree(pHi) }, { Na: NA_OUT, HCO3: c.hco3o, H: P.hFree(c.pHo) });
    stage.setV(c.Vm);
    // NBC carries real dots (1 Na⁺ and 2 HCO₃⁻ a cycle) at the model's rate × the clock, thinned so a cycle shows in
    // about 3 s; the stage says when it thins. NHE's H⁺ is too dilute to draw, so it rocks at its rate.
    const at = (k: string) => stage.pathways.findIndex((p) => p.key === k);
    const nbcCycles = ((f.nbc / 2) * cellVolume * NA * (running ? speed : 0)) / stage.ionsPerDot();
    const thin = Math.max(1, nbcCycles / 0.3);
    stage.thinning = thin;
    stage.flowGroup(at("nbc"), [{ ion: "Na", dir: -1 }, { ion: "HCO3", dir: -1 }, { ion: "HCO3", dir: -1 }], nbcCycles / thin, dt);
    const nhe = stage.pathways[at("nhe")];
    if (nhe) nhe.phase = (nhe.phase || 0) + dt * 2 * (running ? Math.min(3, f.nhe / rest.nhe) : 0);
    stage.step(dt); stage.draw();
    if (viewPref.view === "cell") overlay(stage, $<HTMLCanvasElement>("stage"), {
      leak: f.leak, nhe: f.nhe, nbc: f.nbc, metab: f.metab, ref, clock: t / Math.max(1, speed),
      leakAngle: ANGLE.leak, nheAngle: ANGLE.nhe, nbcAngle: ANGLE.nbc,
    });
    drawKey($<HTMLCanvasElement>("key"), ["Na", "H", "HCO3", "CO2"]);
    const E = P.eH(pHi, c.pHo);
    ruler($<HTMLCanvasElement>("ruler"), { V: c.Vm, E: { H: E, HCO3: E }, g: { H: 0.5, HCO3: 0 }, min: -110, max: 40, height: 400 });
    phGauge($<HTMLCanvasElement>("phgauge"), { pHi, pHo: c.pHo, passive: pass, measured: P.SIESJO.pHi });
    gauges($<HTMLCanvasElement>("gauges"), { ions: ["H", "HCO3", "Na"], ci: { H: P.hFree(pHi), HCO3: hco3i, Na: NA_IN }, co: { H: P.hFree(c.pHo), HCO3: c.hco3o, Na: NA_OUT } });
    const bound = P.boundAcid(c, pH0, pHi), free = P.hFree(pHi) - P.hFree(pH0);
    bufferLedger($<HTMLCanvasElement>("buffer"), { pH0, pHi, freePerUm3: free * P.PER_UM3_PER_MM, boundPerUm3: bound * P.PER_UM3_PER_MM, boundMm: bound });
    trace.draw();
    const perMin = (x: number) => (x * 60).toFixed(2) + " mM/min";
    setText("r-ph", pHi.toFixed(2));
    setText("r-pass", pass.toFixed(2));
    setText("r-eh", fmtMv(E));
    setText("r-df", `${fmtMv(c.Vm - E, 0)} (${c.Vm - E < -1 ? "H⁺ driven in" : c.Vm - E > 1 ? "H⁺ driven out" : "at equilibrium"})`);
    setText("r-hco3", hco3i.toFixed(1) + " mM");
    setText("r-free", `${Math.round(P.hFree(pHi) * P.PER_UM3_PER_MM)} per µm³`);
    setText("r-leak", perMin(f.leak));
    setText("r-out", perMin(f.nhe + f.nbc));
    setText("r-time", fmtTime(t));
  });
}

export default function Protons() {
  useEngine(engine);
  return (
    <main>
      <div className="grid hero">
        <div className="panel">
          <canvas id="stage" />
          <canvas id="key" aria-label="Key: Na⁺, H⁺, HCO₃⁻, CO₂" />
          <ViewPicker ions={["H", "HCO3", "Na"]} />
          <div className="controls">
            <button id="nhe">Stop NHE</button>
            <button id="nbc">Stop NBC</button>
            <button id="both">Stop both</button>
            <button id="metab">Metabolic acid: on</button>
          </div>
          <div className="controls">
            <label>Vm <input type="range" id="vm" min="-90" max="-30" step="1" /><output id="vm-o">−60 mV</output></label>
            <span className="viewlabel">Siesjö's cell: pHo 7.3, CO₂ equal on both sides</span>
          </div>
          <div className="controls">
            <button id="run">Pause</button>
            <label>Speed <select id="speed" defaultValue="60"><option value="15">15 seconds per second</option><option value="60">1 minute per second</option></select></label>
            <button id="reset">Reset</button>
          </div>
        </div>
        <div className="panel"><h3>Voltage ruler</h3><canvas id="ruler" /></div>
      </div>
      <div className="grid">
        <div className="panel">
          <h3 className="keepcase">pHi over time</h3><canvas id="trace-ph" />
          <h3>Buffer ledger</h3><canvas id="buffer" />
        </div>
        <div className="stack">
          <div className="panel">
            <div className="readouts">
              <Readout id="r-ph" k="pHi" cls="ion-h" />
              <Readout id="r-pass" k="passive pHi (E_H = Vm)" />
              <Readout id="r-eh" k="E_H = E_HCO₃ here" cls="ion-h" />
              <Readout id="r-df" k="Vm − E_H" />
              <Readout id="r-hco3" k="HCO₃⁻ inside" cls="ion-hco3" />
              <Readout id="r-free" k="free H⁺ inside" cls="ion-h" />
              <Readout id="r-leak" k="acid leaking in" />
              <Readout id="r-out" k="acid carried out (NHE + NBC)" />
              <Readout id="r-time" k="time" />
            </div>
          </div>
          <div className="panel"><h3 className="keepcase">pH, inside and out</h3><canvas id="phgauge" /></div>
          <div className="panel"><h3>Concentrations</h3><canvas id="gauges" /></div>
        </div>
      </div>

      <Below>
        <p className="lede">H⁺ is held the way the chloride chapter's Cl⁻ is held: far from where it would settle on its own, by transporters
          running on the Na⁺ gradient the pump built. In Siesjö's cell, at −60 mV with pHo 7.3, H⁺ in equilibrium would sit at pHi 6.3,
          and bicarbonate at 2.5 mM inside. The cell keeps pHi at 7.0 and bicarbonate at 12.5 mM. E_H is −18 mV, so H⁺ is driven in by 42 mV
          all the time, and acid must be carried out all the time: H⁺ out by NHE1, which takes Na⁺ in, and HCO₃⁻ in by NBC.</p>
        <div className="predict"><b>Predict.</b> Stop both NHE and NBC. Where does pHi go: 7.4, 7.2, or about 6.3? How long does it take, and how
          many H⁺ does the cell take up on the way? Then move Vm. Where would pHi go now?</div>
        <ul className="notice">
          <li><b>Without transport, pHi falls to the passive value</b>, the pH at which E_H equals Vm: pHi = pHo + Vm/S, with
            S = RT·ln10/F = 61.5 mV per pH unit at 37 °C. At −60 mV that is 6.32. With metabolism still making acid, it settles lower
            (6.25 here), because the leak must then carry acid back out. Switch metabolic acid off to see exactly 6.32.</li>
          <li><b>pH barely moves while a great deal of acid crosses.</b> Free H⁺ inside at pH 7.0 is about 60 ions per µm³ (the census view
            shows every one). Falling to 6.32 adds about 225 free H⁺ per µm³, while the buffers take up about 10 million: about 45,000 bound
            for every one that stays free. It is the charge ledger's lesson again. (That this is close to the charge ledger's own "one in
            45,000" is a coincidence of the illustrative buffering power, not a law.)</li>
          <li><b>Bicarbonate follows pH.</b> CO₂ crosses the lipid freely and carbonic anhydrase keeps CO₂, H⁺ and HCO₃⁻ in equilibrium, so
            with CO₂ equal on both sides [HCO₃⁻]i falls tenfold with each unit of pHi, and E_HCO₃ = E_H. That is why bicarbonate through
            GABA<sub>A</sub> channels pulls E_GABA positive of E_Cl (the chloride chapter's caveat).</li>
          <li><b>Where pHi would go depends on Vm.</b> Move the slider: the passive pHi moves 1 pH unit for every 61.5 mV. The transporters
            then hold pHi above it by a different margin.</li>
          <li><b>Everything here stands on the pump.</b> NHE1 and NBC run on the Na⁺ gradient. In the rundown chapter that gradient collapses;
            a cell there would acidify too. This page holds Na⁺ fixed and does not show that.</li>
        </ul>
        <details>
          <summary>The model, and what it does not claim</summary>
          <p>The state is pHi. Acid that enters is mostly bound, so pHi changes by the net acid gained divided by the buffering power:</p>
          <div className="eq">{"dpHi/dt = −(leak + metabolic acid − NHE − NBC) / β\nβ = β_i + 2.3·[HCO₃⁻]i        (β_i = 10 mM per pH unit; the CO₂/HCO₃⁻ system is open, CO₂ held equal)\nleak = k · GHK flux of H⁺ at Vm   (zero exactly at E_H)\nNHE, NBC = Vmax / (1 + 10^(2·(pHi − 6.9)))"}</div>
          <p>Vm is set by the slider, not solved: H⁺ and HCO₃⁻ carry far too little current to move it. Na⁺ is held at 10 mM inside and
            145 outside. The leak's size, the metabolic load (a quarter of the resting leak), the 60 : 40 split between NHE and NBC, their
            activation constants and β_i are illustrative, several of them sour's values; each carrier's Vmax is solved so that pHi rests at
            exactly 7.0. Bicarbonate has no leak of its own here, and MCT, the Cl⁻/HCO₃⁻ exchanger, the V-ATPase and the astrocyte's
            bicarbonate shuttle are left out.</p>
          <p>How to read the stage: the Na⁺ and HCO₃⁻ dots are on the same scale as every other chapter's (the count is printed). Free H⁺ is
            nanomolar, far too dilute for that scale, so on the cell view it appears only as rates: the arrows' widths are each flux
            relative to the resting acid load, and NHE rocks at its rate. The census view counts free H⁺ one dot per ion.</p>
          <p>The cell is Siesjö's: after Siesjö BK (1985), Acid-base homeostasis in the brain: physiology, chemistry, and neurochemical
            pathology, Prog Brain Res 63:121–154, Fig. 8 (p. 132), doi:10.1016/S0079-6123(08)61980-9, as shown in the Physiol 578 acid/sour lecture.</p>
        </details>
      </Below>
    </main>
  );
}
