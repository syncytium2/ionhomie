import { useEffect, useRef, useState, type ReactNode } from "react";
import * as I from "../core/physics.ts";
import * as P from "../core/protons.ts";
import * as R from "../core/reaction.ts";
import { $, Trace, fmtMv, gauges, glyph, loop, ruler, setText, viewPref, type KeyExtra } from "../views/draw.ts";
import { EnzymeView } from "../views/enzyme-view.ts";
import { ReactionBox } from "../views/reaction-box.ts";
import { ACID_ANGLE, Lab } from "../views/lab.ts";
import { CA_KEY, CaView, bufferLedger, overlay, phGauge } from "../views/protons-views.ts";
import { Below, ModelNote, Readout, ViewPicker, useEngine, IonKey } from "./parts.tsx";
import { Clock } from "./Rundown.tsx";

// The protons page (docs/adr/0022): the shared cell, whose pH NHE1 and NBC hold far from equilibrium. Two ways to see it:
// Siesjö's figure (Vm held at −60 mV by a clamp) or the cell as every other chapter runs it (Vm free, near −80 mV).
// It opens as a step-through (docs/adr/0027, 0028): the enzyme, the reaction in a box, buffers and the enzyme's speed,
// then the whole cell. "Skip to the whole cell" goes straight there, and #/protons/whole links to it.
type Mode = "siesjo" | "cell";
const ANGLE = ACID_ANGLE;

function engine() {
  let mode: Mode = "siesjo", vmMv = -60, pH0 = 7.0, restLeak = 1;
  type Co2 = "normal" | "alone" | "held";
  let co2: Co2 = "normal";
  const caView = new CaView();
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
    mark("co2", co2 === "alone", "Double CO₂", "CO₂ doubled: return it");
    mark("co2-held", co2 === "held", "Double CO₂, pHo held", "CO₂ doubled, pHo held: return it");
    const vm = $<HTMLInputElement>("vm");
    vm.disabled = mode !== "siesjo";
    setText("vm-o", mode === "siesjo" ? fmtMv(vmMv, 0) + " (held)" : "free");
  };
  // after a reset: the buffer ledger counts from here, and the trace starts over
  function after() { co2 = "normal"; restLeak = I.snapshot(lab.cell, lab.n, lab.bath).acid.leak; pH0 = lab.n.pHi; trace.clear(); lastRec = -1e9; record(true); buttons(); }
  // a change of transport starts a new count in the buffer ledger, and sets the clock going
  const changed = () => { pH0 = lab.n.pHi; lab.pathways(); buttons(); if (!lab.running) { lab.running = true; lab.labelRun?.(); } };
  const a = () => lab.cell.acid;
  $("nhe").onclick = () => { a().nhe.on = !a().nhe.on; changed(); };
  $("nbc").onclick = () => { a().nbc.on = !a().nbc.on; changed(); };
  $("both").onclick = () => { const on = !a().nhe.on && !a().nbc.on; a().nhe.on = on; a().nbc.on = on; changed(); };
  // a CO₂ step changes the bath and, at once, pHi (physics.ts, co2Step); a second press returns it
  const setCo2 = (to: Co2) => {
    if (co2 !== "normal") { const r = I.co2Step(lab.cell, lab.n, lab.bath, 0.5, co2 === "held"); lab.n = r.n; lab.bath = r.bath; caView.burst(lab.stage, r.hydrated); }
    if (to !== "normal") { const r = I.co2Step(lab.cell, lab.n, lab.bath, 2, to === "held"); lab.n = r.n; lab.bath = r.bath; caView.burst(lab.stage, r.hydrated); }
    co2 = to; lab.resnap(); changed();
  };
  $("co2").onclick = () => setCo2(co2 === "alone" ? "normal" : "alone");
  $("co2-held").onclick = () => setCo2(co2 === "held" ? "normal" : "held");
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
    if (viewPref.view === "cell") caView.step(lab.stage, dt, s.acid.ca, lab.running ? lab.o.speed : 0, ANGLE.co2);
    else caView.release(lab.stage);
    if (viewPref.view === "cell") {
      overlay(lab.stage, $<HTMLCanvasElement>("stage"), { leak: s.acid.leak, nhe: s.acid.nhe, nbc: s.acid.nbc, ref: restLeak, leakAngle: ANGLE.leak, nheAngle: ANGLE.nhe, nbcAngle: ANGLE.nbc });
      caView.draw(lab.stage, $<HTMLCanvasElement>("stage"), ANGLE.co2);
    }
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
    setText("r-ca", `${perMin(Math.abs(s.acid.ca))} ${s.acid.ca >= 0 ? "CO₂ → HCO₃⁻" : "HCO₃⁻ → CO₂"}`);
    setText("r-bath", `pH ${pHo.toFixed(2)}, CO₂ ${I.pco2(lab.bath).toFixed(0)} mmHg, HCO₃⁻ ${lab.bath.HCO3.toFixed(0)} mM`);
  });
}

function WholeCell({ bar }: { bar: ReactNode }) {
  useEngine(engine);
  return (
    <main>
      <div className="grid hero">
        <div className="panel">
          <canvas id="stage" />
          <IonKey ions={["Na", "K", "Cl", "A", "H", "HCO3", "CO2"]} extras={[CA_KEY]} />
          {bar}
          <ViewPicker ions={["H", "HCO3", "Na", "K", "Cl"]} />
          <div className="controls">
            <button id="nhe">Stop NHE</button>
            <button id="nbc">Stop NBC</button>
            <button id="both">Stop both</button>
          </div>
          <div className="controls">
            <button id="co2">Double CO₂</button>
            <button id="co2-held">Double CO₂, pHo held</button>
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
              <Readout id="r-ca" k="carbonic anhydrase, net" />
              <Readout id="r-bath" k="the bath" />
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
          <li><b>Double the CO₂ two ways.</b> CO₂ crosses at once and hydrates to H⁺ and HCO₃⁻ in equal amounts; only the non-bicarbonate
            buffers take up the H⁺, so pHi falls at once, here from 7.0 to 6.77. With pHo held at 7.3 (the bath's HCO₃⁻ doubled too, replacing
            Cl⁻), NHE and NBC then bring pHi back to 7.0 over a few hours as HCO₃⁻ builds inside to 25 mM: the classic recovery. With CO₂
            alone, pHo falls to 7.0 as well; the more acid bath drives more H⁺ in through the leak, and pHi keeps sliding to 6.67 instead of
            recovering. The outside pH sets the load the transporters must meet.</li>
          <li><b>Carbonic anhydrase runs backward at rest.</b> The HCO₃⁻ that NBC brings in does not pile up: the enzyme turns it back into
            CO₂, which leaves across the lipid, at exactly NBC's rate. A CO₂ step runs it forward in one burst (about 2.3 mM at once); then it
            runs backward again, more weakly while pHo is held (some of NBC's HCO₃⁻ now stays, raising the stock inside) and more strongly
            with CO₂ alone. The enzyme itself turns over about a million times a second each way; the stage shows only the net.</li>
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
            Cl⁻/HCO₃⁻ exchanger and the V-ATPase. A CO₂ step keeps CO₂ equal on both sides throughout (the bath's Pco₂ follows from
            its pH and HCO₃⁻ by Henderson–Hasselbalch, pK 6.1). The H⁺ leak's size, the 60 : 40 split between NHE and NBC, their activation and β_i are
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

// ---------- the step-through (docs/adr/0027, 0028) ----------
const STEPS = [
  { id: "enzyme", name: "The enzyme" },
  { id: "reaction", name: "The reaction" },
  { id: "buffers", name: "Buffers, and the enzyme's speed" },
  { id: "whole", name: "The whole cell" },
] as const;
const WHOLE = STEPS.length - 1;

function StepBar({ i, go }: { i: number; go: (i: number) => void }) {
  return (
    <div className="controls stepbar">
      <button id="back" disabled={i === 0} onClick={() => go(i - 1)}>← Back</button>
      <span className="stepname">{STEPS[i].name}</span>
      <span className="stepdots" aria-label={`step ${i + 1} of ${STEPS.length}`}>{STEPS.map((_, k) => (k === i ? "●" : "○")).join(" ")}</span>
      <button id="next" disabled={i === WHOLE} onClick={() => go(i + 1)}>Next →</button>
      {i < WHOLE
        ? <button id="skip" className="skip" onClick={() => go(WHOLE)}>Skip to the whole cell ⇥</button>
        : <button id="from-start" className="skip" onClick={() => go(0)}>Step through from the start</button>}
    </div>
  );
}

/** The equation over the enzyme and the box, with CA over its arrows; part lights the side that is happening. */
function Equation({ part }: { part: number }) {
  const on = (k: number) => (part === k ? "on" : "");
  return (
    <div className="eqhead" aria-label="CO₂ plus H₂O, reversibly, by carbonic anhydrase, H⁺ plus HCO₃⁻">
      <span className={on(0)}>CO₂ + H₂O</span> <span className={"arrow " + on(1)}><span className="ca">CA</span>⇌</span> <span className={on(2)}>H⁺ + HCO₃⁻</span>
    </div>
  );
}

/** The enzyme's legend: each molecule drawn as the picture draws it (Tony: no lone circle for a molecule that has three atoms). */
function MolKey() {
  const svg = (inner: ReactNode) => <svg width="36" height="24" viewBox="0 0 36 24" aria-hidden="true">{inner}</svg>;
  return (
    <div className="molkey">
      <span>{svg(<><line x1="7" y1="12" x2="29" y2="12" stroke="var(--co2)" strokeWidth="3" /><circle cx="7" cy="12" r="5.5" fill="var(--co2)" /><circle cx="29" cy="12" r="5.5" fill="var(--co2)" /><circle cx="18" cy="12" r="4" fill="#7d8590" /></>)}CO₂</span>
      <span>{svg(<><line x1="18" y1="14" x2="10" y2="7" stroke="#c9ced6" strokeWidth="2" /><line x1="18" y1="14" x2="27" y2="8" stroke="#c9ced6" strokeWidth="2" /><circle cx="10" cy="7" r="3.2" fill="#e6edf3" /><circle cx="27" cy="8" r="3.2" fill="#e6edf3" /><circle cx="18" cy="14" r="6" fill="var(--water)" /></>)}water</span>
      <span>{svg(<><g stroke="var(--hco3)" strokeWidth="2.5"><line x1="18" y1="13" x2="18" y2="4" /><line x1="18" y1="13" x2="9" y2="18" /><line x1="18" y1="13" x2="27" y2="18" /></g><line x1="9" y1="18" x2="3" y2="13" stroke="#c9ced6" strokeWidth="2" /><circle cx="3" cy="13" r="2.6" fill="#e6edf3" /><circle cx="18" cy="4" r="4" fill="var(--hco3)" /><circle cx="9" cy="18" r="4" fill="var(--hco3)" /><circle cx="27" cy="18" r="4" fill="var(--hco3)" /><circle cx="18" cy="13" r="3" fill="#b07400" /></>)}HCO₃⁻</span>
      <span>{svg(<circle cx="18" cy="12" r="4" fill="var(--h)" />)}H⁺, a lone proton</span>
      <span>{svg(<><defs><radialGradient id="zg" cx="40%" cy="38%" r="60%"><stop offset="0" stopColor="#f4f6f8" /><stop offset="1" stopColor="#7d8590" /></radialGradient></defs><circle cx="18" cy="12" r="8" fill="url(#zg)" /></>)}zinc</span>
      <span>{svg(<line x1="10" y1="20" x2="26" y2="4" stroke="#7fb069" strokeOpacity=".6" strokeWidth="7" strokeLinecap="round" />)}oily pocket</span>
    </div>
  );
}

function EnzymeStep({ bar }: { bar: ReactNode }) {
  const [part, setPart] = useState(0), [caption, setCaption] = useState("");
  const [dir, setDir] = useState<1 | -1>(1), [paused, setPaused] = useState(false);
  const view = useRef<EnzymeView | null>(null);
  useEffect(() => {
    const v = new EnzymeView($<HTMLCanvasElement>("enzyme"), (p, text) => { setPart(p); setCaption(text); });
    view.current = v;
    return loop((dt) => v.frame(dt));
  }, []);
  const run = (d: 1 | -1) => { view.current?.run(d); setDir(d); setPaused(false); };
  return (
    <main>
      <div className="panel">
        <Equation part={part} />
        <canvas id="enzyme" aria-label="One carbonic anhydrase: CO₂ and a water bind in its cleft, it turns over, and H⁺ and HCO₃⁻ leave" />
        <p className="caption" aria-live="polite">{caption}</p>
        <MolKey />
        <div className="controls centered">
          <button id="fwd" className={dir > 0 ? "on" : ""} aria-pressed={dir > 0} onClick={() => run(1)}>Forward</button>
          <button id="bwd" className={dir < 0 ? "on" : ""} aria-pressed={dir < 0} onClick={() => run(-1)}>Backward</button>
          <button id="pause" onClick={() => { const p = !paused; if (view.current) view.current.paused = p; setPaused(p); }}>{paused ? "Play" : "Pause"}</button>
          <button id="again" onClick={() => run(dir)}>Again</button>
        </div>
        {bar}
      </div>
      <Below>
        <p className="lede">Carbonic anhydrase holds a CO₂ and a water in its cleft, side by side, beside a zinc. It turns them into one HCO₃⁻
          and one H⁺, lets them go, and is ready for the next pair: up to about a million times a second.</p>
        <div className="predict"><b>Predict.</b> Press <b>Backward</b>. Is anything different about the enzyme when it runs the other way? Then
          ask: what decides which way it runs?</div>
        <p>The enzyme has no direction of its own. Run backward, it does the same steps in reverse: HCO₃⁻ and H⁺ go in, CO₂ and water come
          out. Which way it runs depends on what reaches it, which is the next step's subject.</p>
        <details>
          <summary>What the picture is, and what it leaves out</summary>
          <p>One molecule of carbonic anhydrase II, drawn as a glob with its cleft, after Domsic et al. (2008): the whole protein (their Fig. 1a),
            CO₂ held on the oily, hydrophobic green surface and HCO₃⁻ on the watery side (Fig. 4a), and a chain of waters on that side (Fig. 1),
            which carries the proton away through the residue His64. The zinc sits at the bottom of the cleft on three histidines.</p>
          <p>Simplified on purpose. The molecules are drawn far larger than the protein would make them. The order is compressed: in the real
            enzyme the water is already on the zinc, and it gives up its H⁺ in a separate half of the cycle, making the zinc's OH⁻ that attacks
            the CO₂. This is an animation, not a model: it has no rates. The turnover of about 10⁶ per second is the paper's.</p>
          <p className="src">Domsic JF, Avvaru BS, Kim CU, Gruner SM, Agbandje-McKenna M, Silverman DN, McKenna R (2008). Entrapment of carbon
            dioxide in the active site of carbonic anhydrase II. J Biol Chem 283:30766–30771. doi:10.1074/jbc.M805353200</p>
        </details>
      </Below>
    </main>
  );
}

const BUFFER_KEY: KeyExtra = { draw: (ctx, x, y) => glyph(ctx, "A", x, y, 4), text: "a buffer, about 1 mM per blob", note: "a pink dot on it: the H⁺ it holds" };

function ReactionStep({ buffers, bar }: { buffers: boolean; bar: ReactNode }) {
  const [buffered, setBuffered] = useState(buffers);
  const box = useRef<ReactionBox | null>(null);
  useEffect(() => {
    const b = new ReactionBox($<HTMLCanvasElement>("box"), buffers, buffers);
    b.ca = buffers ? R.CA_CELL : 1;
    box.current = b;
    return loop((dt) => b.frame(dt));
  }, [buffers]);
  return (
    <main>
      <div className="panel">
        <canvas id="box" aria-label="A box of solution: CO₂ and HCO₃⁻ converting both ways, with the equation, both rates, and running totals" />
        <IonKey ions={["CO2", "HCO3", "H"]} extras={buffers ? [BUFFER_KEY] : []} />
        <div className="controls">
          <button id="add-co2" onClick={() => box.current?.add("co2")}>Add CO₂ (+1 mM)</button>
          <button id="add-acid" onClick={() => box.current?.add("acid")}>Add acid (+1 mM H⁺)</button>
          <button id="add-hco3" onClick={() => box.current?.add("hco3")}>Add HCO₃⁻ (+5 mM)</button>
          {buffers && <button id="buffer" className={buffered ? "on" : ""} aria-pressed={buffered}
            onClick={() => { const on = !buffered; box.current?.setBuffered(on); setBuffered(on); }}>{buffered ? "Buffer: on" : "Buffer: off"}</button>}
          {buffers && <label>Carbonic anhydrase <select id="ca" defaultValue={String(R.CA_CELL)} onChange={(e) => { if (box.current) { box.current.ca = +e.target.value; box.current.tally(); } }}>
            <option value="1">none</option><option value="100">a little (×100)</option><option value={String(R.CA_CELL)}>as in a cell (×10,000)</option>
          </select></label>}
          <button id="reset" onClick={() => box.current?.reset()}>Reset</button>
        </div>
        {bar}
      </div>
      <Below>{buffers ? <>
        <p className="lede">Buffers take up H⁺. Proteins, phosphates and other weak acids inside a cell bind most of any H⁺ that appears, so pH moves
          far less than the acid added would suggest.</p>
        <div className="predict"><b>Predict.</b> With the buffer on, add CO₂. How much HCO₃⁻ do you get this time, and how far does pH fall? Then set
          carbonic anhydrase to none and add CO₂ again: does it end in a different place, or only take longer?</div>
        <p>With the buffer taking up the H⁺, the same 1 mM of CO₂ now makes about 0.75 mM of HCO₃⁻, and pH falls only from 7.40 to 7.33. The buffers
          are what let the reaction run forward. Turn the buffer off and on to compare.</p>
        <p><b>Now the enzyme's speed shows.</b> With real amounts to convert, the reaction without the enzyme takes seconds (here, about 6 s to get
          two-thirds of the way); with the enzyme, as in a cell, it is done within a frame. The enzyme speeds both directions by the same factor, so it
          never changes where the reaction ends up, only how fast it gets there. Which way it runs depends only on how far the concentrations sit
          from equilibrium.</p>
        <details><summary>The model, and what it does not claim</summary><BoxModel /></details>
      </> : <>
        <p className="lede">The same reaction without the enzyme, in a box of plain solution. CO₂ and water make H⁺ and HCO₃⁻, and H⁺ and HCO₃⁻ make CO₂
          and water, all the time. At equilibrium the two run equally fast, so nothing changes, though plenty is happening: watch the box, where CO₂
          rings become HCO₃⁻ triangles and back as often as each other, and the two running totals climb together while the net stays at zero.</p>
        <div className="predict"><b>Predict.</b> Add acid. Which way does the reaction run, and where does the H⁺ go? Then add CO₂. How much becomes
          HCO₃⁻?</div>
        <p>Follow the one marked carbon: it keeps changing form, and spends most of its time as HCO₃⁻, simply because there is twenty times more HCO₃⁻
          than CO₂. Water is the solvent itself (pure water is 55 mol per liter), so it never runs short and is never drawn as dots: the box is
          water. For the same reason it is left out of the equilibrium constant, which counts water's activity, about 1 in a dilute solution.</p>
        <p><b>Which way it runs depends on the concentrations.</b> Add acid and it runs back: the H⁺ meets HCO₃⁻ and leaves as CO₂, so almost all the
          acid disappears. That is bicarbonate acting as a buffer. Add HCO₃⁻ and it runs back too; add CO₂ and it runs forward.</p>
        <p><b>But adding CO₂ makes surprisingly little HCO₃⁻ here</b>: about 33 nM, while pH falls from 7.40 to 7.14. The H⁺ it would make has
          nowhere to go, so a few nanomolar is enough to reach equilibrium, in well under a millisecond. That is the next step.</p>
        <details><summary>The model, and what it does not claim</summary><BoxModel /></details>
      </>}</Below>
    </main>
  );
}

function BoxModel() {
  return <>
    <p>A sealed box of solution at 37 °C. At equilibrium [H⁺][HCO₃⁻]/[CO₂] = K, with pK 6.1, the value the cell uses. Each direction runs at its own
      rate, forward = k·[CO₂] and back = (k/K)·[H⁺][HCO₃⁻], and carbonic anhydrase multiplies both by the same factor. The buffer is one weak acid,
      25 mM with pK 6.9. The uncatalyzed rate (k = 0.13 s⁻¹), the buffer and the enzyme's factor of 10,000 are illustrative, not yet sourced; the
      equilibrium itself is not. Each ring or triangle is 0.25 mM; the conversions shown are thinned, both ways alike, when they come too fast to see.</p>
  </>;
}

const startStep = () => (location.hash.replace(/^#\/?/, "").split("/")[1] === "whole" ? WHOLE : 0);

export default function Protons() {
  const [i, setI] = useState(startStep);
  const go = (k: number) => {
    setI(k);
    history.replaceState(null, "", k === WHOLE ? "#/protons/whole" : "#/protons");
  };
  const bar = <StepBar i={i} go={go} />;
  const id = STEPS[i].id;
  if (id === "enzyme") return <EnzymeStep bar={bar} />;
  if (id === "reaction") return <ReactionStep key="reaction" buffers={false} bar={bar} />;
  if (id === "buffers") return <ReactionStep key="buffers" buffers bar={bar} />;
  return <WholeCell bar={bar} />;
}
