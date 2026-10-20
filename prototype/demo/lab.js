// lab.js — the pump–leak cell, running, with every shared view attached.
// Used by the rundown, pumps and chloride pages. The model is Ions (physics.js); this file
// only steps it on a clock and hands its numbers to the views.

const CellLab = (() => {
  const $ = Views.$;
  const mv = (v) => v * 1000;

  class Lab {
    /**
     * opts: { pump: bool (draw it), ca: bool, ccc: bool, speed: sim s per real s,
     *         setup(cell) to change the healthy cell before the clock starts }
     */
    constructor(opts) {
      this.o = Object.assign({ pump: true, ca: false, ccc: false, speed: 300, ions: ["Na", "K", "Cl", "A"] }, opts);
      this.stage = new Views.CellStage($("stage"), { height: 360, ions: this.o.ions });
      this.traceV = new Views.Trace($("trace-v"), {
        series: [{ key: "v", color: "--accent", label: "Vm" }].concat(this.o.ccc ? [{ key: "ecl", color: "--cl", label: "E_Cl", dash: [5, 4] }] : []),
        ymin: -100, ymax: 20, yLabel: "mV", window: 600, grow: true, xFmt: (s) => (s / 60).toFixed(0) + " min", height: 150, yTicks: [-100, -60, -20, 20],
      });
      this.traceC = new Views.Trace($("trace-c"), {
        series: [{ key: "Na", color: "--na", label: "Na⁺ in" }, { key: "K", color: "--k", label: "K⁺ in" }, { key: "Cl", color: "--cl", label: "Cl⁻ in" }],
        ymin: 0, ymax: 160, yLabel: "mM", window: 600, grow: true, xFmt: (s) => (s / 60).toFixed(0) + " min", height: 150, yTicks: [0, 50, 100, 150],
      });
      this.traceVol = $("trace-vol") && new Views.Trace($("trace-vol"), {
        series: [{ key: "vol", color: "#e6edf3", label: "volume" }].concat(this.o.ca ? [] : []),
        ymin: 0.8, ymax: 3, yLabel: "× start", window: 600, grow: true, xFmt: (s) => (s / 60).toFixed(0) + " min", height: 130, yTicks: [1, 2, 3], yFmt: (v) => v.toFixed(0) + "×",
      });
      this.traceCa = this.o.ca && $("trace-ca") && new Views.Trace($("trace-ca"), {
        series: [{ key: "ca", color: "--ca", label: "Ca²⁺ in" }],
        ymin: 1e-5, ymax: 10, log: true, yLabel: "mM", window: 600, grow: true, xFmt: (s) => (s / 60).toFixed(0) + " min", height: 130,
        yTicks: [1e-4, 1e-2, 1], yFmt: (v) => Views.fmtConc(v).replace(" ", ""),
      });
      this.reset();
    }
    reset() {
      const h = Ions.healthyState();
      this.cell = h.cell; this.n = h.n; this.t = 0;
      this.bath = { ...Ions.BATH };
      this.vol0 = Ions.sphere(this.cell.radius).volume;
      this.pumpFull = this.cell.pump.imax;
      if (this.o.setup) this.o.setup(this.cell, this);
      this.running = !!this.o.autorun;
      for (const tr of [this.traceV, this.traceC, this.traceVol, this.traceCa]) if (tr) tr.clear();
      this.s = Ions.snapshot(this.cell, this.n, this.bath);
      this.ref = Math.max(1e-30, this.s.pump || Ions.snapshot(Ions.healthyState().cell, Ions.healthyState().n).pump);
      this.pathways();
      this.record(true);
    }
    pathways() {
      const list = [
        { kind: "channel", angle: -Math.PI / 2.6, ions: ["K"], open: true, label: "K⁺ leak", key: "K" },
        { kind: "channel", angle: -Math.PI / 9, ions: ["Na"], open: true, label: "Na⁺ leak", key: "Na" },
        { kind: "channel", angle: Math.PI * 0.22, ions: ["Cl"], open: true, label: "Cl⁻ leak", key: "Cl" },
      ];
      if (this.o.pump) {
        const on = this.cell.pump.on && this.cell.pump.imax > 0;
        list.push({ kind: "pump", angle: Math.PI * 0.62, label: on ? "Na⁺/K⁺ pump" : "pump: no ATP", key: "pump", on });
      }
      if (this.o.ca) list.push({ kind: "pmca", angle: Math.PI * 1.0, label: "PMCA", key: "pmca", on: this.cell.pmca.on });
      if (this.o.ccc) {
        list.push({ kind: "nkcc1", angle: Math.PI * 0.95, label: "NKCC1", key: "nkcc1", on: this.cell.nkcc1 > 0 });
        list.push({ kind: "kcc2", angle: Math.PI * 1.28, label: "KCC2", key: "kcc2", on: this.cell.kcc2 > 0 });
      }
      this.stage.setPathways(list);
    }
    record(force) {
      const s = this.s;
      if (!force && this.t - (this.lastRec ?? -1e9) < Math.max(1, this.o.speed / 40)) return;
      this.lastRec = this.t;
      this.traceV.push(this.t, { v: mv(s.V), ecl: mv(s.E.Cl) });
      this.traceC.push(this.t, { Na: s.ci.Na, K: s.ci.K, Cl: s.ci.Cl });
      if (this.traceVol) this.traceVol.push(this.t, { vol: s.volume / this.vol0 });
      if (this.traceCa) this.traceCa.push(this.t, { ca: s.ci.Ca });
    }
    advance(dtReal) {
      if (!this.running) return;
      const total = dtReal * this.o.speed;
      const n = Math.max(1, Math.ceil(total / 1));
      const h = total / n;
      for (let k = 0; k < n; k++) this.n = Ions.step(this.cell, this.n, h, this.bath).n;
      this.t += total;
      this.s = Ions.snapshot(this.cell, this.n, this.bath);
      this.record(false);
    }
    /** Tokens: direction of each ion's movement; rate on a square-root scale against the healthy pump. */
    flows(dt) {
      const s = this.s, r = (x) => Math.sign(x) * Math.min(26, 10 * Math.sqrt(Math.abs(x) / this.ref));
      const rates = [{ K: r(s.leak.K) }, { Na: r(s.leak.Na) }, { Cl: r(s.leak.Cl) }];
      if (this.o.pump) rates.push(s.pump > 0 ? { Na: r(3 * s.pump), K: r(-2 * s.pump) } : null);
      if (this.o.ca) rates.push(s.pmca > 0 ? { Ca: r(s.pmca * 1e4) } : null);
      if (this.o.ccc) {
        rates.push(s.nkcc1 ? { Na: r(-s.nkcc1), K: r(-s.nkcc1), Cl: r(-2 * s.nkcc1) } : null);
        rates.push(s.kcc2 ? { K: r(s.kcc2), Cl: r(s.kcc2) } : null);
      }
      // the pump's rotor turns at its cycle rate
      for (const pw of this.stage.pathways) {
        if (pw.key === "pump") pw.phase = (pw.phase || 0) + dt * 6 * (s.pump / this.ref);
        if (pw.key === "pmca") pw.phase = (pw.phase || 0) + dt * 4 * Math.min(2, s.pmca * area0 / 1e-21);
      }
      this.stage.flow(this.running ? rates : rates.map(() => null), dt);
    }
    draw(dt, ions = ["Na", "K", "Cl"]) {
      const s = this.s;
      this.flows(dt);
      this.stage.setConcentrations({ Na: s.ci.Na, K: s.ci.K, Cl: s.ci.Cl, A: s.ci.A, Ca: s.ci.Ca }, this.bath, s.volume / this.vol0);
      this.stage.step(dt); this.stage.draw();
      const E = {}; for (const ion of ions) E[ion] = mv(s.E[ion]);
      const gAll = { K: 1, Na: 0.04, Cl: 0.1, Ca: 0.02 }; const g = {}; for (const ion of ions) g[ion] = gAll[ion] / 1.14;
      Views.ruler($("ruler"), { V: mv(s.V), E, g, min: -110, max: ions.includes("Ca") ? 150 : 80, height: 360 });
      const gi = ["Na", "K", "Cl"].concat(ions.includes("Ca") ? ["Ca"] : []).concat(["A"]);
      Views.gauges($("gauges"), { ions: gi, ci: { ...s.ci }, co: { Na: this.bath.Na, K: this.bath.K, Cl: this.bath.Cl, Ca: this.bath.Ca } });
      for (const tr of [this.traceV, this.traceC, this.traceVol, this.traceCa]) if (tr) tr.draw();
      Views.setText("r-time", Views.fmtTime(this.t));
      Views.setText("r-v", Views.fmtMv(mv(s.V)));
      Views.setText("r-vol", (s.volume / this.vol0).toFixed(2) + "× the start");
      Views.setText("r-na", Views.fmtConc(s.ci.Na));
      Views.setText("r-k", Views.fmtConc(s.ci.K));
      Views.setText("r-cl", Views.fmtConc(s.ci.Cl));
      Views.setText("r-ca", Views.fmtConc(s.ci.Ca));
    }
    /** Wire the shared clock controls if the page has them. */
    controls() {
      const run = $("run"), speed = $("speed"), reset = $("reset");
      if (run) {
        const label = () => { run.textContent = this.running ? "Pause" : (this.t > 0 ? "Resume" : "Start the clock"); run.classList.toggle("on", this.running); };
        run.onclick = () => { this.running = !this.running; label(); };
        this.labelRun = label; label();
      }
      if (speed) {
        speed.onchange = (e) => { this.o.speed = +e.target.value; };
        this.o.speed = +speed.value;
      }
      if (reset) reset.onclick = () => { this.reset(); if (this.labelRun) this.labelRun(); if (this.o.onReset) this.o.onReset(); };
    }
  }
  const area0 = Ions.sphere(10e-6).area;
  return { Lab };
})();
