// lab.ts — the pump–leak cell, running, with every shared view attached. Used by the home page and
// the rundown, pumps and chloride chapters. The model is core/physics.ts; this only steps it on a
// clock and hands its numbers to the views. Ported from prototype/demo/lab.js.

import * as I from "../core/physics.ts";
import { $, CellStage, Trace, fmtConc, fmtMv, fmtTime, gauges, ruler, setText, type Pathway, type Series, type Species } from "./draw.ts";

const mv = (v: number) => v * 1000;
const minutes = (s: number) => (s / 60).toFixed(0) + " min";

export interface LabOpts {
  pump: boolean; ca: boolean; ccc: boolean; speed: number; autorun: boolean;
  ions: Species[]; stageHeight: number; wander?: number;
  setup?: (cell: I.Cell, lab: Lab) => void;
  onReset?: () => void;
}

export class Lab {
  o: LabOpts;
  stage: CellStage;
  traceV?: Trace; traceC?: Trace; traceVol?: Trace; traceCa?: Trace;
  cell!: I.Cell; n!: I.Amounts; bath!: I.Bath; s!: I.Snapshot;
  t = 0; running = false; vol0 = 1; pumpFull = 0; ref = 1;
  private lastRec = -1e9;
  labelRun?: () => void;
  /**
   * The homeostat's hand: moles a player has dragged across, outward positive, not yet delivered.
   * Each drag is delivered as a flux decaying over `handTau` seconds of cell time, so its charge goes
   * through the zero-current solve (physics.ts, Extra) instead of appearing as a jump.
   */
  hand: I.Conc = { Na: 0, K: 0, Cl: 0, Ca: 0 };
  handTau = 20;
  extra(): I.Extra {
    const e: I.Extra = {};
    for (const ion of I.IONS) if (this.hand[ion]) e[ion] = this.hand[ion] / this.handTau;
    return e;
  }
  /** Hand one dragged dot's worth of this ion across (dir +1 out, −1 in), in moles. */
  give(ion: I.Ion, dir: number) {
    this.hand[ion] += dir * (this.stage.ionsPerDot() / 6.02214076e23);
    this.resnap();
  }

  constructor(opts: Partial<LabOpts>) {
    this.o = { pump: true, ca: false, ccc: false, speed: 300, autorun: false, ions: ["Na", "K", "Cl", "A"], stageHeight: 380, ...opts };
    this.stage = new CellStage($<HTMLCanvasElement>("stage"), { height: this.o.stageHeight, ions: this.o.ions, mode: "amounts", cellVolume: I.sphere(10e-6).volume, ...(this.o.wander ? { wander: this.o.wander } : {}) });
    const grow = { window: 600, grow: true, xFmt: minutes };
    const vSeries: Series[] = [{ key: "v", color: "--accent", label: "Vm" }];
    if (this.o.ccc) vSeries.push({ key: "ecl", color: "--cl", label: "E_Cl", dash: [5, 4] });
    if ($("trace-v")) this.traceV = new Trace($<HTMLCanvasElement>("trace-v"), {
      series: vSeries,
      ymin: -100, ymax: 20, yLabel: "mV", height: 150, yTicks: [-100, -60, -20, 20], ...grow,
    });
    if ($("trace-c")) this.traceC = new Trace($<HTMLCanvasElement>("trace-c"), {
      series: [{ key: "Na", color: "--na", label: "Na⁺ in" }, { key: "K", color: "--k", label: "K⁺ in" }, { key: "Cl", color: "--cl", label: "Cl⁻ in" }],
      ymin: 0, ymax: 160, yLabel: "mM", height: 150, yTicks: [0, 50, 100, 150], ...grow,
    });
    if ($("trace-vol")) this.traceVol = new Trace($<HTMLCanvasElement>("trace-vol"), {
      series: [{ key: "vol", color: "#e6edf3", label: "volume" }],
      ymin: 0.8, ymax: 3, yLabel: "× start", height: 130, yTicks: [1, 2, 3], yFmt: (v) => v.toFixed(0) + "×", ...grow,
    });
    if (this.o.ca && $("trace-ca")) this.traceCa = new Trace($<HTMLCanvasElement>("trace-ca"), {
      series: [{ key: "ca", color: "--ca", label: "Ca²⁺ in" }],
      ymin: 1e-5, ymax: 10, log: true, yLabel: "mM", height: 130, yTicks: [1e-4, 1e-2, 1], yFmt: (v) => fmtConc(v).replace(" ", ""), ...grow,
    });
    this.reset();
  }

  reset() {
    const h = I.healthyState();
    this.cell = h.cell; this.n = h.n; this.t = 0; this.lastRec = -1e9;
    this.hand = { Na: 0, K: 0, Cl: 0, Ca: 0 };
    this.bath = { ...I.BATH };
    this.vol0 = I.sphere(this.cell.radius).volume;
    this.pumpFull = this.cell.pump.imax;
    this.ref = I.snapshot(h.cell, h.n).pump;           // the healthy pump rate: the token scale
    if (this.o.setup) this.o.setup(this.cell, this);
    this.running = this.o.autorun;
    for (const tr of [this.traceV, this.traceC, this.traceVol, this.traceCa]) tr?.clear();
    this.s = I.snapshot(this.cell, this.n, this.bath, this.extra());
    this.pathways();
    this.record(true);
  }

  pathways() {
    const list: Pathway[] = [
      { kind: "channel", angle: -Math.PI / 2.6, ions: ["K"], open: true, label: "K⁺ leak", key: "K" },
      { kind: "channel", angle: -Math.PI / 9, ions: ["Na"], open: true, label: "Na⁺ leak", key: "Na" },
      { kind: "channel", angle: Math.PI * 0.22, ions: ["Cl"], open: true, label: "Cl⁻ leak", key: "Cl" },
    ];
    if (this.o.pump) {
      const on = this.cell.pump.on && this.cell.pump.imax > 0;
      list.push({ kind: "pump", angle: Math.PI * 0.62, label: on ? "Na⁺/K⁺ pump" : "pump: no ATP", key: "pump", on });
    }
    if (this.o.ca) list.push({ kind: "pmca", angle: Math.PI, label: "PMCA", key: "pmca", on: this.cell.pmca.on });
    if (this.o.ccc) {
      list.push({ kind: "nkcc1", angle: Math.PI * 0.95, label: "NKCC1", key: "nkcc1", on: this.cell.nkcc1 > 0 });
      list.push({ kind: "kcc2", angle: Math.PI * 1.28, label: "KCC2", key: "kcc2", on: this.cell.kcc2 > 0 });
    }
    const phases = new Map(this.stage.pathways.map((p) => [p.key, p.phase]));
    for (const p of list) p.phase = phases.get(p.key) ?? 0;
    this.stage.setPathways(list);
  }

  resnap() { this.s = I.snapshot(this.cell, this.n, this.bath, this.extra()); }

  private record(force: boolean) {
    if (!force && this.t - this.lastRec < Math.max(1, this.o.speed / 40)) return;
    this.lastRec = this.t;
    const s = this.s;
    this.traceV?.push(this.t, { v: mv(s.V), ecl: mv(s.E.Cl) });
    this.traceC?.push(this.t, { Na: s.ci.Na, K: s.ci.K, Cl: s.ci.Cl });
    this.traceVol?.push(this.t, { vol: s.volume / this.vol0 });
    this.traceCa?.push(this.t, { ca: s.ci.Ca });
  }

  advance(dtReal: number) {
    if (!this.running) return;
    const total = dtReal * this.o.speed;
    const n = Math.max(1, Math.ceil(total));
    for (let k = 0; k < n; k++) {
      const dt = total / n, e = this.extra();
      this.n = I.step(this.cell, this.n, dt, this.bath, e).n;
      for (const ion of I.IONS) if (e[ion]) this.hand[ion] -= e[ion]! * dt;
    }
    this.t += total;
    this.resnap();
    this.record(false);
  }

  /**
   * Crossings at the bulk scale: every leak's two one-way fluxes, every pump and cotransporter
   * cycle, at the model's rates × the clock speed, in dots per real second (docs/adr/0011).
   */
  private flows(dt: number) {
    const s = this.s, NA = 6.02214076e23, ipd = this.stage.ionsPerDot();
    const pw = this.stage.pathways;
    const at = (key: string) => pw.findIndex((p) => p.key === key);
    const one = (["K", "Na", "Cl"] as const).map((ion) => ({ ion, u: I.ghkUnidirectional(this.cell.P[ion], I.ION_Z[ion], s.V, s.ci[ion], this.bath[ion]) }));
    let perReal = this.running ? (NA * this.o.speed) / ipd : 0; // mol/s → dots per real second
    // At a fast clock the true one-way rates outrun the eye. Show 1 in k of them, in both directions
    // alike, so the ratio of in to out is kept; any net change still arrives as crossings (the stage
    // corrects its counts through the ion's own leak). The stage says when it is thinning.
    const fastest = Math.max(...one.map(({ u }) => Math.max(u.efflux, u.influx) * s.area), 5 * s.pump, 4 * Math.abs(s.nkcc1), 2 * Math.abs(s.kcc2)) * perReal;
    const k = Math.max(1, fastest / 6);
    this.stage.thinning = k;
    perReal /= k;
    for (const { ion, u } of one) this.stage.flowBulk(at(ion), ion, u.efflux * s.area * perReal, u.influx * s.area * perReal, dt);
    if (this.o.pump && at("pump") >= 0) this.stage.flowGroup(at("pump"), [{ ion: "Na", dir: 1 }, { ion: "Na", dir: 1 }, { ion: "Na", dir: 1 }, { ion: "K", dir: -1 }, { ion: "K", dir: -1 }], s.pump * perReal, dt);
    if (this.o.ccc) {
      this.stage.flowGroup(at("nkcc1"), [{ ion: "Na", dir: -1 }, { ion: "K", dir: -1 }, { ion: "Cl", dir: -1 }, { ion: "Cl", dir: -1 }], s.nkcc1 * perReal, dt);
      this.stage.flowGroup(at("kcc2"), [{ ion: "K", dir: 1 }, { ion: "Cl", dir: 1 }], s.kcc2 * perReal, dt);
    }
    // rotors turn with their cycle rates, relative to the healthy pump
    for (const p of pw) {
      if (p.key === "pump") p.phase = (p.phase || 0) + dt * 3 * (s.pump / this.ref) * (this.running ? 1 : 0.2);
      if (p.key === "pmca") p.phase = (p.phase || 0) + dt * 2 * (s.pmca > 0 ? 1 : 0);
    }
  }

  draw(dt: number, ions: ("Na" | "K" | "Cl" | "Ca")[] = ["Na", "K", "Cl"], rulerHeight = 380) {
    const s = this.s;
    this.flows(dt);
    const NA = 6.02214076e23;
    this.stage.setConcentrations({ Na: s.ci.Na, K: s.ci.K, Cl: s.ci.Cl, A: s.ci.A, Ca: s.ci.Ca }, this.bath, s.volume / this.vol0);
    this.stage.setAmounts({ Na: this.n.Na * NA, K: this.n.K * NA, Cl: this.n.Cl * NA, A: this.n.A * NA });
    this.stage.setV(s.V * 1000);
    this.stage.step(dt); this.stage.draw();
    const E: Partial<Record<Species, number>> = {}, g: Partial<Record<Species, number>> = {};
    const tot = this.cell.P.K + this.cell.P.Na + this.cell.P.Cl;
    for (const ion of ions) { E[ion] = mv(s.E[ion]); g[ion] = ion === "Ca" ? 0.02 : this.cell.P[ion] / tot; }
    if ($("ruler")) ruler($<HTMLCanvasElement>("ruler"), { V: mv(s.V), E, g, min: -110, max: ions.includes("Ca") ? 150 : 80, height: rulerHeight });
    const gi: Species[] = ["Na", "K", "Cl", ...(ions.includes("Ca") ? (["Ca"] as Species[]) : []), "A"];
    if ($("gauges")) gauges($<HTMLCanvasElement>("gauges"), { ions: gi, ci: { ...s.ci }, co: { Na: this.bath.Na, K: this.bath.K, Cl: this.bath.Cl, Ca: this.bath.Ca } });
    for (const tr of [this.traceV, this.traceC, this.traceVol, this.traceCa]) tr?.draw();
    setText("r-time", fmtTime(this.t));
    setText("r-v", fmtMv(mv(s.V)));
    setText("r-vol", (s.volume / this.vol0).toFixed(2) + "× the start");
    setText("r-na", fmtConc(s.ci.Na));
    setText("r-k", fmtConc(s.ci.K));
    setText("r-cl", fmtConc(s.ci.Cl));
    setText("r-ca", fmtConc(s.ci.Ca));
  }

  /** Wire the shared clock controls if the page has them. */
  controls() {
    const run = $<HTMLButtonElement>("run"), speed = $<HTMLSelectElement>("speed"), reset = $<HTMLButtonElement>("reset");
    if (run) {
      const label = () => { run.textContent = this.running ? "Pause" : this.t > 0 ? "Resume" : "Start the clock"; run.classList.toggle("on", this.running); };
      run.onclick = () => { this.running = !this.running; label(); };
      this.labelRun = label; label();
    }
    if (speed) { speed.onchange = () => { this.o.speed = +speed.value; }; this.o.speed = +speed.value; }
    if (reset) reset.onclick = () => { this.reset(); this.labelRun?.(); this.o.onReset?.(); };
  }
}
