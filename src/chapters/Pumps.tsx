import * as I from "../core/physics.ts";
import { $, fmtBig, fmtMv, loop, setText } from "../views/draw.ts";
import { Lab } from "../views/lab.ts";
import { Below, ModelNote, ViewPicker, Readout, useEngine } from "./parts.tsx";
import { Clock } from "./Rundown.tsx";

function engine() {
  let ouabain = false, frac = 1;
  const ouab = $<HTMLButtonElement>("ouabain"), pmca = $<HTMLButtonElement>("pmca"), fracIn = $<HTMLInputElement>("pump-frac"), bathK = $<HTMLInputElement>("bath-k");
  const labels = () => {
    ouab.textContent = ouabain ? "Wash out the ouabain" : "Ouabain: block the pump";
    ouab.classList.toggle("on", ouabain);
    pmca.textContent = lab.cell.pmca.on ? "PMCA running" : "PMCA stopped";
    pmca.classList.toggle("on", lab.cell.pmca.on);
  };
  const lab = new Lab({
    pump: true, ca: true, speed: 300,
    onReset: () => { ouabain = false; frac = 1; fracIn.value = "100"; setText("pump-frac-o", "100 %"); bathK.value = "5"; setText("bath-k-o", "5.0 mM"); labels(); },
  });
  lab.controls();
  const applyPump = () => { lab.cell.pump.on = !ouabain; lab.cell.pump.imax = lab.pumpFull * frac; lab.pathways(); };
  ouab.onclick = () => { ouabain = !ouabain; applyPump(); labels(); if (!lab.running) { lab.running = true; lab.labelRun?.(); } };
  fracIn.oninput = () => { frac = +fracIn.value / 100; setText("pump-frac-o", fracIn.value + " %"); applyPump(); };
  bathK.oninput = () => {
    const k = +bathK.value;
    lab.bath.K = k; lab.bath.Cl = I.BATH.Cl + (k - I.BATH.K); // added as KCl, so the bath stays neutral
    setText("bath-k-o", k.toFixed(1) + " mM");
    lab.resnap();
  };
  pmca.onclick = () => { lab.cell.pmca.on = !lab.cell.pmca.on; lab.pathways(); labels(); };
  labels();

  return loop((dt) => {
    lab.advance(dt);
    lab.draw(dt, ["Na", "K", "Cl", "Ca"]);
    const s = lab.s;
    setText("r-ip", (s.pump * I.F * 1e12).toFixed(1) + " pA");
    setText("r-atp", fmtBig(s.pump * 6.022e23));
    const off = { ...lab.cell, pump: { ...lab.cell.pump, on: false } };
    setText("r-share", fmtMv((s.V - I.snapshot(off, lab.n, lab.bath).V) * 1000));
  });
}

export default function Pumps() {
  useEngine(engine);
  return (
    <main>
      <div className="grid hero">
        <div className="panel">
          <canvas id="stage" />
          <ViewPicker />
          <div className="controls"><Clock /></div>
          <div className="controls">
            <button id="ouabain" className="danger">Ouabain: block the pump</button>
            <label>Pump capacity <input type="range" id="pump-frac" min="0" max="100" step="5" defaultValue="100" /><output id="pump-frac-o">100 %</output></label>
          </div>
          <div className="controls">
            <label>Bath K⁺ <input type="range" id="bath-k" min="2" max="12" step="0.5" defaultValue="5" /><output id="bath-k-o">5.0 mM</output></label>
            <button id="pmca" className="on">PMCA running</button>
          </div>
        </div>
        <div className="panel"><h3>Voltage ruler</h3><canvas id="ruler" /></div>
      </div>
      <div className="grid">
        <div className="panel">
          <h3>Membrane potential</h3><canvas id="trace-v" />
          <h3>Inside concentrations</h3><canvas id="trace-c" />
        </div>
        <div className="stack">
          <div className="panel"><h3>Volume</h3><canvas id="trace-vol" /></div>
          <div className="panel"><h3>Ca²⁺ inside</h3><canvas id="trace-ca" /></div>
        </div>
      </div>
      <div className="grid">
        <div className="panel">
          <div className="readouts">
            <Readout id="r-time" k="time" />
            <Readout id="r-v" k="Vm" cls="vm" />
            <Readout id="r-ip" k="pump current" />
            <Readout id="r-atp" k="ATP split per second" />
            <Readout id="r-share" k="the pump's direct share of Vm" />
            <Readout id="r-vol" k="cell volume" />
            <Readout id="r-na" k="Na⁺ inside" cls="ion-na" />
            <Readout id="r-k" k="K⁺ inside" cls="ion-k" />
            <Readout id="r-ca" k="Ca²⁺ inside" cls="ion-ca" />
          </div>
        </div>
        <div className="panel"><h3>Concentrations</h3><canvas id="gauges" /></div>
      </div>

      <Below>
        <p className="lede">The fix for rundown is a machine that carries ions back up their gradients, paid for with ATP. Pumps use ATP to move
          ions against gradients; transporters only spend gradients that already exist. The Na⁺/K⁺-ATPase moves 3 Na⁺ out and 2 K⁺ in for each
          ATP it splits. Running exactly as fast as the leaks run, it holds every concentration still: the pump–leak steady state. Here is the
          healthy cell again, pump running.</p>
        <div className="predict"><b>Predict.</b> Block the pump with ouabain. Does Vm jump, creep, or both? The pump moves one net charge out per
          cycle, so part of Vm is its own current. How big a part?</div>
        <ul className="notice">
          <li><b>Block the pump and Vm jumps a few mV at once, then creeps.</b> The jump is the pump's own current, gone: its direct, electrogenic
            share of Vm, about 2.6 mV here. The creep is the gradients running down, as in the last chapter. The pump's real job is the second
            thing, not the first.</li>
          <li><b>Wash the ouabain out and the cell recovers.</b> High Na⁺ inside drives the pump faster than at rest; the gradients rebuild and the
            cell shrinks back as the extra solute and water leave.</li>
          <li><b>Raise bath K⁺ and Vm depolarizes at once</b>, because E_K moves and K⁺ dominates the resting permeability. That is hyperkalemia's
            danger to excitable tissue.</li>
          <li><b>Stop the PMCA and Ca²⁺ climbs</b> toward its own equilibrium, tens of thousands of times higher. It barely touches Vm: there is
            too little Ca²⁺ permeability at rest. The danger of Ca²⁺ overload is what it does inside the cell, not to the voltage.</li>
        </ul>
        <p className="notice">Ion homeostasis is one of the cell's largest energy costs: the Na⁺/K⁺-ATPase and the Ca²⁺-ATPases are the major ATP
          consumers named in the 578 ion homeostasis lecture.</p>
        <details>
          <summary>Clinical connections</summary>
          <p><b>Digoxin</b> and the other cardiac glycosides partly inhibit the Na⁺/K⁺-ATPase, as ouabain does completely; the pump-capacity
            slider shows a partial block. <b>Hyperkalemia</b> raises extracellular K⁺; the bath K⁺ slider shows its first effect, the shift in
            E_K and Vm. <b>Ischemia</b> takes away the ATP for every pump at once: the rundown chapter.</p>
        </details>
        <details>
          <summary>The model</summary>
          <p>The rundown model plus two pumps. The Na⁺/K⁺-ATPase cycles at a rate set by internal Na⁺ (Hill coefficient 3, half-activation 10 mM)
            and external K⁺ (Hill coefficient 2, half-activation 1.5 mM); each cycle is 3 Na⁺ out, 2 K⁺ in, one net charge out, one ATP. Its
            maximum rate is not tuned by hand: it is solved so the healthy cell is an exact steady state at the lecture's Na⁺ 10 mM and K⁺
            140 mM. The PMCA extrudes Ca²⁺ (Hill coefficient 2, half-activation 0.2 µM), treated as electroneutral, solved to hold Ca²⁺ at
            0.1 µM. There is no Ca²⁺ buffering, so Ca²⁺ changes here far faster than in a real cell, where most of it is bound. The
            activation constants are recalled, not yet checked against a source.</p>
        </details>
        <ModelNote />
      </Below>
    </main>
  );
}
