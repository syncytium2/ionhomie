import * as I from "../core/physics.ts";
import * as P from "../core/protons.ts";
import { $, Trace, drawKey, fmtMv, gauges, loop, ruler, setText, viewPref } from "../views/draw.ts";
import { ACID_ANGLE, Lab } from "../views/lab.ts";
import { bufferLedger, overlay, phGauge } from "../views/protons-views.ts";
import { Below, ModelNote, Readout, ViewPicker, useEngine } from "./parts.tsx";
import { Clock } from "./Rundown.tsx";

// The protons page (docs/adr/0022): the shared cell, whose pH NHE1 and NBC hold far from equilibrium. Two ways to see it:
// Siesjö's figure (Vm held at −60 mV by a clamp) or the cell as every other chapter runs it (Vm free, near −80 mV).
type Mode = "siesjo" | "cell";
const ANGLE = ACID_ANGLE;

function engine() {
  let mode: Mode = "siesjo", vmMv = -60, pH0 = 7.0, restLeak = 1;
  const lab = new Lab({
    pump: true, acid: true, speed: 1800, autorun: true, ions: ["Na", "K", "Cl", "A", "HCO3"], stageHeight: 420,
    setup: (cell) => { if (mode === "siesjo") P.toSiesjo(cell, vmMv / 1000); },
    onReset: () => { after(); },
  });
  const trace = new Trace($<HTMLCanvasElement>("trace-ph"), {
    series: [{ key: "ph", color: "--h", label: "pHi" }, { key: "pass", color: "--muted", label: "passive", dash: [5, 4] }],
    ymin: 5.8, ymax: 7.6, yLabel: "pH", height: 150, yTicks: [6.0, 6.4, 6.8, 7.2, 7.6], yFmt: (v) => v.toFixed(1),
    window: 6 * 3600, grow: true, xFmt: (s) => (s / 3600).toFixed(1) + " h",
  });
  let lastRec = -1e9;
  const record = (force = false) => {
    if (!force && lab.t - lastRec < lab.o.speed / 30) return;
    lastRec = lab.t; trace.push(lab.t, { ph: lab.n.pHi, pass: P.passivePHi(lab.s.V * 1000, lab.bath.pHo) });
  };

  const buttons = () => {
    const a = lab.cell.acid;
    const mark = (id: string, pressed: boolean, on: string, off: string) => { const b = $<HTMLButtonElement>(id); b.textContent = pressed ? off : on; b.classList.toggle("on", pressed); b.setAttribute("aria-pressed", String(pressed)); };
    mark("nhe", !a.nhe.on, "Stop NHE", "Restart NHE");
    mark("nbc", !a.nbc.on, "Stop NBC", "Restart NBC");
    mark("both", !a.nhe.on && !a.nbc.on, "Stop both", "Restart both");
    const vm = $<HTMLInputElement>("vm");
    vm.disabled = mode !== "siesjo";
    setText("vm-o", mode === "siesjo" ? fmtMv(vmMv, 0) + " (held)" : "free");
  };
  // after a reset: the buffer ledger counts from here, and the trace starts over
  function after() { restLeak = I.snapshot(lab.cell, lab.n, lab.bath).acid.leak; pH0 = lab.n.pHi; trace.clear(); lastRec = -1e9; record(true); buttons(); }
  // a change of transport starts a new count in the buffer ledger, and sets the clock going
  const changed = () => { pH0 = lab.n.pHi; lab.pathways(); buttons(); if (!lab.running) { lab.running = true; lab.labelRun?.(); } };
  const a = () => lab.cell.acid;
  $("nhe").onclick = () => { a().nhe.on = !a().nhe.on; changed(); };
  $("nbc").onclick = () => { a().nbc.on = !a().nbc.on; changed(); };
  $("both").onclick = () => { const on = !a().nhe.on && !a().nbc.on; a().nhe.on = on; a().nbc.on = on; changed(); };
  const vm = $<HTMLInputElement>("vm");
  vm.oninput = () => { vmMv = +vm.value; if (lab.cell.clamp) lab.cell.clamp.V = vmMv / 1000; pH0 = lab.n.pHi; lab.resnap(); buttons(); };
  const pick = $<HTMLSelectElement>("cell");
  pick.onchange = () => { mode = pick.value as Mode; vmMv = -60; vm.value = "-60"; lab.reset(); lab.labelRun?.(); after(); };
  lab.controls();
  vm.value = String(vmMv);
  after();

  let wasNarrow = lab.stage.geometry().w < 560;
  return loop((dt) => {
    const isNarrow = lab.stage.geometry().w < 560;
    if (isNarrow !== wasNarrow) { wasNarrow = isNarrow; lab.pathways(); }
    lab.advance(dt);
    record();
    lab.draw(dt, ["Na", "K", "Cl"]); // the stage; this page draws its own ruler and gauges
    const s = lab.s, c = s.ci, pHo = lab.bath.pHo, Vmv = s.V * 1000, EH = s.acid.EH * 1000;
    if (viewPref.view === "cell") overlay(lab.stage, $<HTMLCanvasElement>("stage"), {
      leak: s.acid.leak, nhe: s.acid.nhe, nbc: s.acid.nbc, ref: restLeak, clock: lab.t / Math.max(1, lab.o.speed),
      leakAngle: ANGLE.leak, nheAngle: ANGLE.nhe, nbcAngle: ANGLE.nbc, co2Angle: ANGLE.co2,
    });
    drawKey($<HTMLCanvasElement>("key"), ["Na", "K", "Cl", "A", "H", "HCO3", "CO2"]);
    ruler($<HTMLCanvasElement>("ruler-ph"), { V: Vmv, E: { K: s.E.K * 1000, H: EH, HCO3: EH }, g: { K: 1, H: 0.3, HCO3: 0 }, min: -110, max: 40, height: 400 });
    const pass = P.passivePHi(Vmv, pHo);
    phGauge($<HTMLCanvasElement>("phgauge"), { pHi: c.pHi, pHo, passive: pass, measured: P.SIESJO.pHi });
    gauges($<HTMLCanvasElement>("gauges-ph"), { ions: ["H", "HCO3", "Na"], ci: { H: c.H, HCO3: c.HCO3, Na: c.Na }, co: { H: I.hFree(pHo), HCO3: lab.bath.HCO3, Na: lab.bath.Na } });
    const bound = I.boundAcid(lab.cell, lab.bath, pH0, c.pHi), free = c.H - I.hFree(pH0);
    bufferLedger($<HTMLCanvasElement>("buffer"), { pH0, pHi: c.pHi, freePerUm3: free * P.PER_UM3_PER_MM, boundPerUm3: bound * P.PER_UM3_PER_MM, boundMm: bound });
    trace.draw();
    const perMin = (molPerS: number) => ((molPerS / s.volume) * 60).toFixed(3) + " mM/min";
    const df = Vmv - EH;
    setText("r-ph", c.pHi.toFixed(2));
    setText("r-pass", pass.toFixed(2));
    setText("r-eh", fmtMv(EH));
    setText("r-df", `${fmtMv(df, 0)} (${df < -1 ? "H⁺ driven in" : df > 1 ? "H⁺ driven out" : "at equilibrium"})`);
    setText("r-hco3", c.HCO3.toFixed(1) + " mM");
    setText("r-free", `${Math.round(c.H * P.PER_UM3_PER_MM)} per µm³`);
    setText("r-leak", perMin(s.acid.leak));
    setText("r-out", perMin(s.acid.nhe + s.acid.nbc));
  });
}

export default function Protons() {
  useEngine(engine);
  return (
    <main>
      <div className="grid hero">
        <div className="panel">
          <canvas id="stage" />
          <canvas id="key" aria-label="Key: Na⁺, K⁺, Cl⁻, A⁻, H⁺, HCO₃⁻, CO₂" />
          <ViewPicker ions={["H", "HCO3", "Na", "K", "Cl"]} />
          <div className="controls">
            <button id="nhe">Stop NHE</button>
            <button id="nbc">Stop NBC</button>
            <button id="both">Stop both</button>
          </div>
          <div className="controls">
            <label>Cell <select id="cell" defaultValue="siesjo">
              <option value="siesjo">Siesjö's figure: Vm held at −60 mV</option>
              <option value="cell">ionhomie's cell: Vm free (about −80 mV)</option>
            </select></label>
            <label>Vm <input type="range" id="vm" min="-90" max="-30" step="1" /><output id="vm-o">−60 mV</output></label>
          </div>
          <div className="controls"><Clock speeds={[300, 1800]} initial={1800} /></div>
        </div>
        <div className="panel"><h3>Voltage ruler</h3><canvas id="ruler-ph" /></div>
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
              <Readout id="r-v" k="Vm" cls="vm" />
              <Readout id="r-df" k="Vm − E_H" />
              <Readout id="r-hco3" k="HCO₃⁻ inside" cls="ion-hco3" />
              <Readout id="r-free" k="free H⁺ inside" cls="ion-h" />
              <Readout id="r-leak" k="H⁺ leaking in" />
              <Readout id="r-out" k="acid carried out (NHE + NBC)" />
              <Readout id="r-na" k="Na⁺ inside" cls="ion-na" />
              <Readout id="r-time" k="time" />
            </div>
          </div>
          <div className="panel"><h3 className="keepcase">pH, inside and out</h3><canvas id="phgauge" /></div>
          <div className="panel"><h3>Concentrations</h3><canvas id="gauges-ph" /></div>
        </div>
      </div>

      <Below>
        <p className="lede">H⁺ is held the way the chloride chapter's Cl⁻ is held: far from where it would settle on its own, by transporters
          running on the Na⁺ gradient the pump built. In Siesjö's figure, at −60 mV with pHo 7.3, H⁺ in equilibrium would sit at pHi 6.3 and
          bicarbonate at 2.5 mM inside. The cell keeps pHi at 7.0 and bicarbonate at 12.5 mM. E_H is −18 mV, so H⁺ is driven in by 42 mV all
          the time, and acid must be carried out all the time: H⁺ out by NHE1, which takes Na⁺ in, and HCO₃⁻ in with Na⁺ by NBC.</p>
        <div className="predict"><b>Predict.</b> Stop both NHE and NBC. Where does pHi go: 7.4, 7.2, or about 6.3? How long does it take, and how
          many H⁺ does the cell take up on the way? Then switch to ionhomie's cell, near −80 mV. Where would pHi go there?</div>
        <ul className="notice">
          <li><b>Without transport, pHi falls to the passive value</b>, the pH at which E_H equals Vm: pHi = pHo + Vm/S, with
            S = RT·ln10/F = 61.5 mV per pH unit at 37 °C. At −60 mV that is 6.32; in ionhomie's cell, near −80 mV, it is 6.0. Move the Vm
            slider in Siesjö's figure: the passive pHi moves 1 pH unit for every 61.5 mV. Siesjö chose −60 mV "to facilitate calculations";
            real neurons rest between −60 and −90 mV.</li>
          <li><b>It takes hours.</b> The H⁺ leak is small (here about 0.2 mM of acid a minute), and nearly all of that acid is bound on arrival,
            so pHi falls slowly; the clock runs at 30 minutes a second.</li>
          <li><b>pH barely moves while a great deal of acid crosses.</b> Free H⁺ inside at pH 7.0 is about 60 ions per µm³ (the census view
            shows every one). Falling to 6.32 adds about 225 free H⁺ per µm³ while the buffers take up about 10 million: about 45,000 bound
            for every one that stays free. It is the charge ledger's lesson again. (That this is close to the charge ledger's own "one in
            45,000" is a coincidence of the illustrative buffering power, not a law.)</li>
          <li><b>Bicarbonate follows pH.</b> CO₂ crosses the lipid freely and carbonic anhydrase keeps CO₂, H⁺ and HCO₃⁻ in equilibrium, so
            with CO₂ equal on both sides [HCO₃⁻]i falls tenfold with each unit of pHi, and E_HCO₃ = E_H. That is why bicarbonate through
            GABA<sub>A</sub> channels pulls E_GABA positive of E_Cl (the chloride chapter's caveat).</li>
          <li><b>Stopping the pump does not, by itself, acidify this cell.</b> NHE and NBC slow as the Na⁺ gradient fails, but the cell also
            depolarizes, which cuts the H⁺ leak about as much. The acidosis of ischemia comes from lactic acid made faster than it can be
            removed, which this model does not include.</li>
        </ul>
        <details>
          <summary>The model, and what it does not claim</summary>
          <p>This is the same cell every chapter runs, with acid and base added. The state includes pHi. Acid that enters is mostly bound,
            so pHi changes by the net acid gained divided by the buffering power:</p>
          <div className="eq">{"dpHi/dt = −(H⁺ leak − NHE − NBC) / (volume · β)\nβ = β_i + 2.3·[HCO₃⁻]i        (β_i = 10 mM per pH unit; the CO₂/HCO₃⁻ system is open, CO₂ held equal)\nH⁺ leak = GHK flux of H⁺ at Vm   (zero exactly at E_H; its current is in the Vm solve)\nNHE = k · act(pHi) · ln( [Na]out[H]in / [Na]in[H]out )\nNBC = k · act(pHi) · ln( [Na]out[HCO₃]out / [Na]in[HCO₃]in )\nact(pHi) = 1 / (1 + 10^(2·(pHi − 6.9)))"}</div>
          <p>NHE and NBC run on the Na⁺ gradient and stop or reverse as thermodynamics allows; the pump returns the Na⁺ they bring in. NBC is
            taken as the electroneutral NBCn1 (1 Na⁺ : 1 HCO₃⁻); the astrocyte's electrogenic NBCe1 is left out, as are MCT and lactic acid, the
            Cl⁻/HCO₃⁻ exchanger and the V-ATPase. The H⁺ leak's size, the 60 : 40 split between NHE and NBC, their activation and β_i are
            illustrative (several are sour's values); k is solved so that pHi rests at exactly 7.0. In Siesjö's figure a clamp holds Vm
            (and K⁺ inside), and NHE and NBC are re-solved to hold 7.0 at −60 mV.</p>
          <p>How to read the stage: free H⁺ is nanomolar, far too dilute for the stage's scale, so on the cell view it appears only as rates.
            The arrows' widths are each acid flux relative to the resting H⁺ leak, and NHE rocks at its rate. The census view counts free H⁺
            one dot per ion; NBC carries real Na⁺ and HCO₃⁻ dots.</p>
          <p>The cell in Siesjö's figure: Siesjö BK (1985), Acid-base homeostasis in the brain: physiology, chemistry, and neurochemical
            pathology, Prog Brain Res 63:121–154, Fig. 8 (p. 132), doi:10.1016/S0079-6123(08)61980-9, as shown in the Physiol 578 acid/sour
            lecture.</p>
        </details>
        <ModelNote />
      </Below>
    </main>
  );
}
