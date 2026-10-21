import * as I from "../core/physics.ts";
import { $, fmtBig, fmtConc, fmtMv, fmtTime, loop, setText, viewPref } from "../views/draw.ts";
import { Lab } from "../views/lab.ts";
import { Below, ModelNote, Readout, useEngine } from "./parts.tsx";

// The homeostat, level one: you are the pump. The pump is off and the leaks run, as in the rundown
// chapter; the player drags Na⁺ out and K⁺ in by hand. A drag is a crossing of one real dot
// (docs/adr/0011) and is delivered to the model as a flux through the zero-current solve
// (Lab.give, physics.ts Extra), so moving charge moves Vm and the leaks pay it back.

const HOLD = 10 * 60; // seconds of cell time to hold the cell
const NA_MAX = 30, K_MIN = 110; // mM: past either, the cell has run down
const NAV = 6.02214076e23;

function engine() {
  // The game is played on the cell view: a moved dot is a bulk dot, and the other views have their own
  // scales (docs/adr/0016). Held for this page only; the learner's saved choice is put back on leaving.
  const theirView = viewPref.view;
  viewPref.view = "cell";
  const lab = new Lab({ pump: false, speed: 5, setup: (cell) => { cell.pump.on = false; cell.pmca.on = false; }, onReset: () => restart() });
  lab.controls();
  const canvas = $<HTMLCanvasElement>("stage");
  let moved = { NaOut: 0, NaIn: 0, KIn: 0, KOut: 0 };
  let over: "won" | "lost" | null = null;
  let holding = false, downAt: readonly [number, number] = [0, 0], dragged = false;

  const status = (t: string, cls = "") => { const el = $("hs-status"); if (el) { el.textContent = t; el.className = "hs-status " + cls; } };
  const restart = () => {
    moved = { NaOut: 0, NaIn: 0, KIn: 0, KOut: 0 }; over = null;
    status(`Hold Na⁺ inside under ${NA_MAX} mM and K⁺ over ${K_MIN} mM for ${HOLD / 60} minutes of cell time. Tap a Na⁺ inside to send it out, and a K⁺ outside to bring it in.`);
  };
  restart();

  const at = (e: PointerEvent) => { const r = canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top] as const; };
  canvas.onpointerdown = (e) => {
    if (over) return;
    const [x, y] = at(e);
    if (!lab.stage.grab(x, y, ["Na", "K"], e.pointerType === "mouse" ? 12 : 16)) return;
    holding = true; downAt = [x, y]; dragged = false;
    canvas.setPointerCapture(e.pointerId);
    if (!lab.running) { lab.running = true; lab.labelRun?.(); }
  };
  canvas.onpointermove = (e) => {
    if (!holding) return;
    const [x, y] = at(e);
    if (Math.hypot(x - downAt[0], y - downAt[1]) > 8) dragged = true;
    if (dragged) lab.stage.carry(x, y);
  };
  // a tap sends the dot straight across; a drag carries it wherever it is let go
  const let_go = () => {
    if (!holding) return;
    holding = false;
    const c = dragged ? lab.stage.drop() : lab.stage.flick();
    if (!c || (c.ion !== "Na" && c.ion !== "K")) return;
    lab.give(c.ion, c.dir);
    if (c.ion === "Na") c.dir > 0 ? moved.NaOut++ : moved.NaIn++;
    else c.dir < 0 ? moved.KIn++ : moved.KOut++;
  };
  canvas.onpointerup = let_go;
  canvas.onpointercancel = let_go;

  const finish = (how: "won" | "lost") => {
    over = how; lab.running = false; lab.labelRun?.();
    if (how === "won") setText("hs-left", "0 s");
    const ipd = lab.stage.ionsPerDot();
    // the pump cycles your carrying is worth: each cycle is 3 Na⁺ out and 2 K⁺ in, and one ATP
    const atp = Math.max(Math.max(moved.NaOut - moved.NaIn, 0) / 3, Math.max(moved.KIn - moved.KOut, 0) / 2) * ipd;
    const pumpAtp = lab.ref * NAV * lab.t;
    status(how === "won"
      ? `You held the cell for ${HOLD / 60} minutes. A pump would have split about ${fmtBig(pumpAtp)} ATP doing it; your hand did the work of about ${fmtBig(atp)}. Reset to play again.`
      : `The cell ran down after ${fmtTime(lab.t)}. Reset to try again; a slower clock gives you more time per drag.`, how);
  };

  const stop = loop((dt) => {
    lab.advance(dt);
    lab.draw(dt);
    const s = lab.s, e = lab.extra();
    if (!over && lab.t > 0) {
      if (s.ci.Na > NA_MAX || s.ci.K < K_MIN) finish("lost");
      else if (lab.t >= HOLD) finish("won");
    }
    if (!over && lab.t > 0) setText("hs-left", HOLD - lab.t > 0.5 ? fmtTime(HOLD - lab.t) : "0 s");
    else if (!over) setText("hs-left", fmtTime(HOLD));
    const na = moved.NaOut - moved.NaIn, k = moved.KIn - moved.KOut;
    setText("r-moved", `${na} Na⁺ out · ${k} K⁺ in`);
    setText("r-ratio", k > 0 ? `${(na / k).toFixed(2)} : 1  (pump 1.50 : 1)` : "—");
    setText("r-hand", ((((e.Na ?? 0) + (e.K ?? 0)) * I.F) * 1e12).toFixed(1) + " pA");
    setText("r-band", `Na⁺ ${fmtConc(s.ci.Na)} / ${NA_MAX} mM · K⁺ ${fmtConc(s.ci.K)} / ${K_MIN} mM`);
    setText("r-share", fmtMv((s.V - I.snapshot(lab.cell, lab.n, lab.bath).V) * 1000));
  });
  return () => { stop(); viewPref.view = theirView; };
}

export default function Homeostat() {
  useEngine(engine);
  return (
    <main>
      <div className="grid hero">
        <div className="panel">
          <canvas id="stage" className="grabbable" />
          <div className="controls">
            <button id="run">Start the clock</button>
            <label>Speed <select id="speed" defaultValue="5">
              <option value="2">2 seconds per second</option>
              <option value="5">5 seconds per second</option>
              <option value="10">10 seconds per second</option>
            </select></label>
            <button id="reset">Reset</button>
            <span className="hs-left">time left <b id="hs-left">—</b></span>
          </div>
          <p id="hs-status" className="hs-status" />
          <p className="src">Each dot you move is delivered over 20 s of cell time. Carrying charge moves Vm: carry a Na⁺ out alone and Vm jumps
            negative, then the leaks pay the charge back.</p>
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
              <Readout id="r-time" k="cell time" />
              <Readout id="r-v" k="Vm" cls="vm" />
              <Readout id="r-band" k="inside, against the limits" />
              <Readout id="r-moved" k="your hand so far" />
              <Readout id="r-ratio" k="your Na⁺ out : K⁺ in" />
              <Readout id="r-hand" k="your hand's current now" />
              <Readout id="r-share" k="your hand's share of Vm now" />
              <Readout id="r-vol" k="cell volume" />
              <Readout id="r-cl" k="Cl⁻ inside" cls="ion-cl" />
            </div>
          </div>
          <div className="panel"><h3>Concentrations</h3><canvas id="gauges" /><p className="src">Solid: inside. Outlined: outside. Log scale.</p></div>
        </div>
      </div>

      <Below>
        <p className="lede">The homeostat: you are the pump. This is the rundown chapter's cell, leaks running and no ATP. Tap a dot and it crosses
          the membrane; or drag it across and let go. Na⁺ (white circles) leak in; send them out. K⁺ (blue circles) leak out; fetch them back in from the
          bath. Hold the cell for ten minutes of cell time.</p>
        <div className="predict"><b>Predict.</b> You can move Na⁺ and K⁺ in any ratio you like. The real pump moves 3 Na⁺ out for every 2 K⁺ in.
          If you move only Na⁺, what happens to Vm while you do it? And what keeps happening afterwards?</div>
        <ul className="notice">
          <li><b>Every dot you move is billions of ions</b>, the same scale as every other stage (it is printed on the canvas). At this cell's
            leak rates a Na⁺ dot leaks in about every 40 seconds of cell time and a K⁺ dot leaks out about every 50, which is why the clock runs
            a few times faster than real time, and says so.</li>
          <li><b>Carrying charge moves Vm.</b> A Na⁺ carried out is a positive charge leaving: Vm dips, then the leaks pay the charge back and it
            returns. That dip is your hand's electrogenic share, the same thing as the pump's few millivolts. A K⁺ carried in pushes the other
            way. Watch "your hand's share of Vm".</li>
          <li><b>Losing looks like the rundown chapter</b>: Na⁺ climbs, K⁺ falls, Vm drifts toward zero, and the cell swells.</li>
          <li><b>The real pump does this about 70 million times a second</b> in this one small cell, and each time splits one ATP.</li>
        </ul>
        <details>
          <summary>The model</summary>
          <p>The rundown model (leaks for K⁺, Na⁺ and Cl⁻ by the GHK current equation, pK : pNa : pCl = 1 : 0.02 : 0.5, impermeant A⁻ inside,
            water following instantly), with the pump and PMCA stopped. Each dot you move across is that many ions taken from one side and given to
            the other, delivered to the model as a flux that dies away over 20 seconds of cell time. That flux is included where Vm is found (the
            voltage at which the net membrane current is zero), so an unbalanced carry moves Vm and the leaks return its charge, as they do for the
            pump's. Only Na⁺ and K⁺ can be carried; Cl⁻ is left to distribute itself. The limits, Na⁺ inside under {NA_MAX} mM and K⁺ over
            {" "}{K_MIN} mM, are the game's, not a physiological threshold.</p>
        </details>
        <ModelNote />
      </Below>
    </main>
  );
}
