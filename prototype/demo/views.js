// views.js — the views every demo page shares: glyphs, the voltage ruler, the gauges,
// the charge ledger, traces, and the cell stage. Drawing only: every number arrives from
// physics.js (docs/adr/0004).

const Views = (() => {
  const cssVar = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  const COLOR = {};
  const color = (ion) => COLOR[ion] || (COLOR[ion] = cssVar({ Na: "--na", K: "--k", Cl: "--cl", Ca: "--ca", A: "--a" }[ion] || "--text"));
  const LABEL = { Na: "Na⁺", K: "K⁺", Cl: "Cl⁻", Ca: "Ca²⁺", A: "A⁻", X: "X⁰" };
  const Z = { Na: 1, K: 1, Cl: -1, Ca: 2, A: -1, X: 0 };

  // ---------- formatting ----------
  const minus = (s) => s.replace(/^-/, "−");
  const fmtMv = (mv, d = 1) => minus((Math.abs(mv) < 0.05 ? 0 : mv).toFixed(d)) + " mV";
  function fmtConc(mM) {
    if (mM >= 1) return mM.toFixed(mM >= 100 ? 0 : 1) + " mM";
    if (mM >= 1e-3) return (mM * 1e3).toFixed(mM >= 0.01 ? 0 : 1) + " µM";
    return (mM * 1e6).toFixed(0) + " nM";
  }
  function fmtTime(s) {
    if (s < 1e-6) return (s * 1e9).toFixed(1) + " ns";
    if (s < 1e-3) return (s * 1e6).toFixed(1) + " µs";
    if (s < 1) return (s * 1e3).toFixed(s < 0.01 ? 2 : 1) + " ms";
    if (s < 60) return s.toFixed(1) + " s";
    if (s < 3600) return Math.floor(s / 60) + " min " + String(Math.floor(s % 60)).padStart(2, "0") + " s";
    return Math.floor(s / 3600) + " h " + String(Math.floor((s % 3600) / 60)).padStart(2, "0") + " min";
  }
  const fmtBig = (x) => {
    if (x >= 1e9) return (x / 1e9).toFixed(1) + " billion";
    if (x >= 1e6) return (x / 1e6).toFixed(1) + " million";
    return Math.round(x).toLocaleString("en-US");
  };

  // ---------- canvas plumbing ----------
  function fit(canvas, cssH) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(50, canvas.clientWidth);
    const h = cssH;
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.height = h + "px";
    }
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    return { ctx, w, h };
  }
  /** requestAnimationFrame loop handing fn the real seconds since the last frame (capped). */
  function loop(fn) {
    let last = performance.now();
    const tick = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      fn(dt);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
  const gauss = () => {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };

  // ---------- glyphs: shape carries the charge, color the identity ----------
  function glyph(ctx, ion, x, y, r, alpha = 1) {
    ctx.save();
    ctx.globalAlpha = alpha;
    const c = color(ion);
    ctx.fillStyle = c;
    ctx.strokeStyle = c;
    if (ion === "Cl") {
      ctx.beginPath();
      ctx.moveTo(x, y - r * 1.25); ctx.lineTo(x + r * 1.25, y); ctx.lineTo(x, y + r * 1.25); ctx.lineTo(x - r * 1.25, y);
      ctx.closePath(); ctx.fill();
    } else if (ion === "A") {
      ctx.beginPath();
      const k = 1.7;
      ctx.moveTo(x - r * k, y);
      ctx.quadraticCurveTo(x - r * k, y - r * k, x, y - r * 0.9);
      ctx.quadraticCurveTo(x + r * k, y - r * k, x + r * k, y);
      ctx.quadraticCurveTo(x + r * k, y + r * k, x, y + r * 0.9);
      ctx.quadraticCurveTo(x - r * k, y + r * k, x - r * k, y);
      ctx.fill();
    } else if (ion === "X") {
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(x, y, r, 0, 2 * Math.PI); ctx.stroke();
    } else {
      ctx.beginPath(); ctx.arc(x, y, r, 0, 2 * Math.PI); ctx.fill();
      if (ion === "Ca") {
        ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.arc(x, y, r + 2.2, 0, 2 * Math.PI); ctx.stroke();
      }
    }
    if (r >= 5.5) {
      ctx.fillStyle = "#0d1117";
      ctx.font = `700 ${Math.round(r * 1.3)}px system-ui, sans-serif`;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      const sign = Z[ion] > 0 ? "+" : Z[ion] < 0 ? "−" : "";
      if (ion !== "X") ctx.fillText(sign, x, y + 0.5);
    }
    ctx.restore();
  }

  /** A key of glyphs, drawn into a canvas. */
  function drawKey(canvas, ions, height = 34) {
    const { ctx, w } = fit(canvas, height);
    let x = 12;
    ctx.font = "14px system-ui, sans-serif";
    ctx.textBaseline = "middle";
    for (const ion of ions) {
      glyph(ctx, ion, x + 7, height / 2, 7);
      ctx.fillStyle = cssVar("--text");
      ctx.fillText(LABEL[ion], x + 20, height / 2);
      x += 30 + ctx.measureText(LABEL[ion]).width + 18;
      if (x > w - 40) break;
    }
  }

  // ---------- the voltage ruler ----------
  /**
   * draw(canvas, { V, E: {ion: mV}, g: {ion: 0..1}, min, max, height })
   * A vertical mV scale with a tick at each ion's equilibrium potential, a needle at Vm and an
   * arrow from the needle toward each tick, its width set by that ion's relative conductance.
   */
  function ruler(canvas, st) {
    const H = st.height || 420;
    const { ctx, w } = fit(canvas, H);
    const min = st.min ?? -110, max = st.max ?? 80;
    const top = 18, bot = H - 18;
    const y = (mv) => bot - ((Math.max(min, Math.min(max, mv)) - min) / (max - min)) * (bot - top);
    const ax = 44;
    const muted = cssVar("--muted"), text = cssVar("--text");
    ctx.strokeStyle = cssVar("--line"); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(ax, top); ctx.lineTo(ax, bot); ctx.stroke();
    ctx.font = "11px ui-monospace, Menlo, monospace"; ctx.fillStyle = muted; ctx.textAlign = "right"; ctx.textBaseline = "middle";
    const step = (max - min) > 150 ? 40 : 20;
    for (let v = Math.ceil(min / step) * step; v <= max; v += step) {
      ctx.fillText(minus(String(v)), ax - 6, y(v));
      ctx.beginPath(); ctx.moveTo(ax - 3, y(v)); ctx.lineTo(ax, y(v)); ctx.stroke();
    }
    ctx.save(); ctx.translate(10, (top + bot) / 2); ctx.rotate(-Math.PI / 2); ctx.textAlign = "center"; ctx.fillText("mV", 0, 0); ctx.restore();
    // zero line
    ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.moveTo(ax, y(0)); ctx.lineTo(w - 6, y(0)); ctx.stroke(); ctx.setLineDash([]);

    const ions = Object.keys(st.E || {});
    // driving-force arrows, one column per ion
    const colW = Math.min(26, (w - ax - 150) / Math.max(1, ions.length));
    ions.forEach((ion, i) => {
      const E = st.E[ion], g = st.g ? st.g[ion] ?? 0 : 0;
      const x = ax + 16 + i * colW;
      if (st.V === undefined || Math.abs(E - st.V) < 1.5) return;
      const y0 = y(st.V), y1 = y(E);
      ctx.strokeStyle = color(ion); ctx.fillStyle = color(ion);
      ctx.globalAlpha = g > 0 ? 0.95 : 0.25;
      ctx.lineWidth = 1 + 5 * Math.sqrt(Math.max(0, Math.min(1, g)));
      ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, y1 + Math.sign(y0 - y1) * 7); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x, y1); ctx.lineTo(x - 5, y1 + Math.sign(y0 - y1) * 8); ctx.lineTo(x + 5, y1 + Math.sign(y0 - y1) * 8); ctx.closePath(); ctx.fill();
      ctx.globalAlpha = 1;
    });
    // equilibrium-potential ticks and the Vm label, nudged apart in one column
    const labels = ions.map((ion) => ({ ion, E: st.E[ion], ly: y(st.E[ion]) }));
    if (st.V !== undefined) labels.push({ ion: "V", E: st.V, ly: y(st.V) });
    labels.sort((a, b) => a.ly - b.ly);
    for (let i = 1; i < labels.length; i++) if (labels[i].ly - labels[i - 1].ly < 16) labels[i].ly = labels[i - 1].ly + 16;
    const over = labels.length ? labels[labels.length - 1].ly - bot : 0;
    if (over > 0) for (const L of labels) L.ly -= over;
    const tickX0 = ax + 8, tickX1 = ax + 16 + ions.length * colW + 4;
    ctx.textAlign = "left"; ctx.textBaseline = "middle";
    for (const L of labels) {
      if (L.ion === "V") continue;
      ctx.strokeStyle = color(L.ion); ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(tickX0, y(L.E)); ctx.lineTo(tickX1, y(L.E)); ctx.stroke();
    }
    // the needle
    if (st.V !== undefined) {
      const yv = y(st.V);
      ctx.strokeStyle = cssVar("--accent"); ctx.fillStyle = cssVar("--accent"); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(ax - 2, yv); ctx.lineTo(tickX1 + 4, yv); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(ax, yv); ctx.lineTo(ax - 12, yv - 7); ctx.lineTo(ax - 12, yv + 7); ctx.closePath(); ctx.fill();
    }
    for (const L of labels) {
      const c = L.ion === "V" ? cssVar("--accent") : color(L.ion);
      ctx.strokeStyle = c; ctx.lineWidth = 1; ctx.globalAlpha = 0.6;
      ctx.beginPath(); ctx.moveTo(tickX1 + 4, y(L.E)); ctx.lineTo(tickX1 + 12, L.ly); ctx.stroke(); ctx.globalAlpha = 1;
      ctx.fillStyle = c;
      const off = L.E < min || L.E > max ? " (off scale)" : "";
      let x = tickX1 + 16;
      if (L.ion === "V") {
        ctx.font = "700 12px ui-monospace, Menlo, monospace";
        ctx.fillText("Vm " + fmtMv(L.E), x, L.ly);
      } else {
        ctx.font = "12px ui-monospace, Menlo, monospace";
        ctx.fillText("E", x, L.ly); x += ctx.measureText("E").width;
        ctx.font = "9px ui-monospace, Menlo, monospace";
        ctx.fillText(sub(L.ion), x, L.ly + 4); x += ctx.measureText(sub(L.ion)).width + 4;
        ctx.font = "12px ui-monospace, Menlo, monospace";
        ctx.fillText(fmtMv(L.E, 0) + off, x, L.ly);
      }
    }
  }
  const sub = (ion) => ({ Na: "Na", K: "K", Cl: "Cl", Ca: "Ca" }[ion]);

  // ---------- concentration gauges (log scale, so Ca²⁺ fits beside Na⁺) ----------
  function gauges(canvas, { ions, ci, co, height }) {
    const narrow = canvas.clientWidth < 440;
    const rowH = narrow ? 50 : 34;
    const H = height || ions.length * rowH + 30;
    const { ctx, w } = fit(canvas, H);
    const lo = Math.log10(1e-5), hi = Math.log10(500);
    const x0 = 46, x1 = narrow ? w - 8 : w - 96;
    const x = (mM) => x0 + ((Math.log10(Math.max(mM, 1e-5)) - lo) / (hi - lo)) * (x1 - x0);
    ctx.font = "10px ui-monospace, Menlo, monospace"; ctx.fillStyle = cssVar("--muted"); ctx.textAlign = "center"; ctx.textBaseline = "top";
    for (const [v, lab] of [[1e-4, "0.1µM"], [1e-2, "10µM"], [1, "1mM"], [100, "100mM"]]) {
      ctx.fillText(lab, x(v), H - 14);
      ctx.strokeStyle = cssVar("--line"); ctx.beginPath(); ctx.moveTo(x(v), 4); ctx.lineTo(x(v), H - 16); ctx.stroke();
    }
    ions.forEach((ion, i) => {
      const yy = 6 + i * rowH;
      glyph(ctx, ion, 12, yy + 12, 6);
      ctx.fillStyle = cssVar("--text"); ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.font = "12px system-ui, sans-serif";
      ctx.fillText(LABEL[ion], 22, yy + 12);
      // inside: solid; outside: outlined
      ctx.fillStyle = color(ion);
      if (ci[ion] !== undefined) ctx.fillRect(x0, yy + 2, x(ci[ion]) - x0, 9);
      if (co[ion] !== undefined) {
        ctx.strokeStyle = color(ion); ctx.lineWidth = 1.5;
        ctx.strokeRect(x0, yy + 14, x(co[ion]) - x0, 8);
      }
      ctx.font = "11px ui-monospace, Menlo, monospace";
      const tIn = ci[ion] !== undefined ? "in " + fmtConc(ci[ion]) : "", tOut = co[ion] !== undefined ? "out " + fmtConc(co[ion]) : "";
      if (narrow) {
        ctx.fillStyle = cssVar("--text"); ctx.fillText(tIn, x0, yy + 33);
        ctx.fillStyle = cssVar("--muted"); ctx.fillText(tOut, x0 + 92, yy + 33);
      } else {
        ctx.fillStyle = cssVar("--text"); ctx.fillText(tIn, x1 + 4, yy + 6);
        ctx.fillStyle = cssVar("--muted"); ctx.fillText(tOut, x1 + 4, yy + 19);
      }
    });
  }

  // ---------- the charge ledger ----------
  /**
   * A magnified patch of membrane: the excess charge that sets Vm, drawn as pairs across the
   * membrane, and the arithmetic that says how few ions that is.
   */
  function ledger(canvas, { V, radius = 10e-6, kIn = 140, height = 170 }) {
    const { ctx, w, h } = fit(canvas, height);
    const mid = 62, band = 14;
    ctx.fillStyle = cssVar("--membrane"); ctx.globalAlpha = 0.85;
    ctx.fillRect(8, mid - band / 2, w - 16, band); ctx.globalAlpha = 1;
    ctx.font = "11px system-ui, sans-serif"; ctx.fillStyle = cssVar("--muted"); ctx.textAlign = "left"; ctx.textBaseline = "middle";
    ctx.fillText("outside", 10, 12); ctx.fillText("inside", 10, mid + 46);
    const pairs = Math.min(14, Math.round(Math.abs(V) / 8));
    const neg = V < 0; // inside negative: + lines the outside face, − the inside face
    for (let i = 0; i < pairs; i++) {
      const xx = 60 + ((w - 90) * (i + 0.5)) / 14;
      drawSign(ctx, xx, mid - band / 2 - 9, neg ? "+" : "−");
      drawSign(ctx, xx, mid + band / 2 + 9, neg ? "−" : "+");
    }
    const L = Ions.chargeLedger(radius, V / 1000, kIn);
    ctx.fillStyle = cssVar("--text"); ctx.font = "12px system-ui, sans-serif";
    const lines = Math.abs(V) < 0.5
      ? ["No net charge on the membrane: Vm is 0 mV."]
      : [
          `${fmtBig(L.ions)} ions crossed to charge this ${(radius * 2e6).toFixed(0)} µm cell to ${fmtMv(V, 0)}.`,
          `That is about 1 in ${fmtBig(round2(1 / L.fraction))} of the K⁺ inside: the gauges cannot show it.`,
        ];
    lines.forEach((t, i) => ctx.fillText(t, 10, mid + 70 + i * 17));
    ctx.fillStyle = cssVar("--muted"); ctx.font = "10px system-ui, sans-serif";
    ctx.fillText("Each sign ≈ 8 mV of charge; magnified, not to scale.", 10, h - 8);
  }
  const round2 = (x) => { const p = 10 ** (Math.floor(Math.log10(x)) - 1); return Math.round(x / p) * p; };
  function drawSign(ctx, x, y, s) {
    ctx.save();
    ctx.fillStyle = s === "+" ? "#ffb4a2" : "#9ad1ff";
    ctx.font = "700 15px system-ui, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(s, x, y);
    ctx.restore();
  }

  // ---------- traces ----------
  class Trace {
    /** opts: { series: [{key, color, label}], ymin, ymax, yLabel, window (x units), xFmt, height, log } */
    constructor(canvas, opts) { this.c = canvas; this.o = opts; this.t = []; this.d = {}; for (const s of opts.series) this.d[s.key] = []; }
    clear() { this.t = []; for (const k in this.d) this.d[k] = []; }
    push(t, vals) {
      this.t.push(t);
      for (const s of this.o.series) this.d[s.key].push(vals[s.key]);
      if (this.t.length > 4000) { this.t.splice(0, 1000); for (const k in this.d) this.d[k].splice(0, 1000); }
    }
    draw() {
      const o = this.o, H = o.height || 160;
      const { ctx, w } = fit(this.c, H);
      const l = 52, r = 10, tp = 10, b = 26;
      const tEnd = this.t.length ? this.t[this.t.length - 1] : 0;
      const tFirst = this.t.length ? this.t[0] : 0;
      const t0 = o.grow ? tFirst : Math.max(tFirst, tEnd - o.window);
      const t1 = o.grow ? Math.max(tFirst + o.window, tEnd) : Math.max(t0 + o.window, tEnd);
      if (o.autoY) {
        let m = o.ymin + 1e-12;
        for (const k in this.d) for (const v of this.d[k]) if (v > m) m = v;
        const nice = (x) => { const p = 10 ** Math.floor(Math.log10(x)); for (const f of [1, 2, 5, 10]) if (f * p >= x) return f * p; return 10 * p; };
        o.ymax = nice(m * 1.05);
        o.yTicks = [o.ymin, (o.ymin + o.ymax) / 2, o.ymax];
      }
      const tf = o.log ? (v) => Math.log10(Math.max(v, 1e-12)) : (v) => v;
      const y0 = tf(o.ymin), y1 = tf(o.ymax);
      const X = (t) => l + ((t - t0) / (t1 - t0)) * (w - l - r);
      const Y = (v) => tp + (1 - (tf(v) - y0) / (y1 - y0)) * (H - tp - b);
      ctx.strokeStyle = cssVar("--line"); ctx.lineWidth = 1;
      ctx.strokeRect(l, tp, w - l - r, H - tp - b);
      ctx.font = "10px ui-monospace, Menlo, monospace"; ctx.fillStyle = cssVar("--muted");
      ctx.textAlign = "right"; ctx.textBaseline = "middle";
      for (const v of o.yTicks || [o.ymin, (o.ymin + o.ymax) / 2, o.ymax]) {
        ctx.fillText(o.yFmt ? o.yFmt(v) : minus(String(v)), l - 4, Y(v));
        ctx.beginPath(); ctx.moveTo(l, Y(v)); ctx.lineTo(l + 4, Y(v)); ctx.stroke();
      }
      ctx.textAlign = "center"; ctx.textBaseline = "top";
      for (let i = 0; i <= 4; i++) { const t = t0 + ((t1 - t0) * i) / 4; ctx.fillText(o.xFmt ? o.xFmt(t) : t.toFixed(0), X(t), H - b + 6); }
      ctx.save(); ctx.translate(10, tp + (H - tp - b) / 2); ctx.rotate(-Math.PI / 2); ctx.fillText(o.yLabel || "", 0, -4); ctx.restore();
      ctx.save(); ctx.beginPath(); ctx.rect(l, tp, w - l - r, H - tp - b); ctx.clip();
      for (const s of o.series) {
        const arr = this.d[s.key];
        ctx.strokeStyle = s.color.startsWith("--") ? cssVar(s.color) : s.color; ctx.lineWidth = s.width || 2;
        if (s.dash) ctx.setLineDash(s.dash); else ctx.setLineDash([]);
        ctx.beginPath(); let started = false;
        for (let i = 0; i < this.t.length; i++) {
          if (this.t[i] < t0 || arr[i] === undefined || arr[i] === null) continue;
          const px = X(this.t[i]), py = Y(arr[i]);
          if (!started) { ctx.moveTo(px, py); started = true; } else ctx.lineTo(px, py);
        }
        ctx.stroke();
      }
      ctx.restore(); ctx.setLineDash([]);
      // legend
      ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.font = "11px system-ui, sans-serif";
      let lx = l + 8;
      for (const s of o.series) {
        if (!s.label) continue;
        ctx.fillStyle = s.color.startsWith("--") ? cssVar(s.color) : s.color;
        ctx.fillRect(lx, tp + 9, 10, 3);
        ctx.fillText(s.label, lx + 14, tp + 10);
        lx += 24 + ctx.measureText(s.label).width;
      }
    }
  }

  // ---------- the cell stage ----------
  /**
   * A 2D slice: bath around a cell. Particle density follows the concentrations it is handed
   * (a view of the model, not the model). Pathways sit on the membrane; moving tokens show the
   * direction and relative size of each flux, not its true number.
   */
  class CellStage {
    constructor(canvas, opts = {}) {
      this.c = canvas;
      this.o = Object.assign({ height: 420, density: 0.0062, ions: ["Na", "K", "Cl", "A"], caBoost: 0, maxPer: 900 }, opts);
      this.parts = [];
      this.tokens = [];
      this.pathways = [];
      this.inside = {}; this.outside = {};
      this.volumeRel = 1;
      this.t = 0;
    }
    geometry() {
      const w = Math.max(50, this.c.clientWidth), h = this.o.height;
      const R0 = Math.min(w, h) * 0.34;
      const R = R0 * Math.cbrt(Math.max(0.2, this.volumeRel));
      return { w, h, cx: w / 2, cy: h / 2, R: Math.min(R, Math.min(w, h) * 0.47), R0 };
    }
    setConcentrations(inside, outside, volumeRel = 1) { this.inside = inside; this.outside = outside; this.volumeRel = volumeRel; }
    target(ion, where, g) {
      let c = (where === "in" ? this.inside : this.outside)[ion];
      if (c === undefined) return 0;
      if (ion === "Ca" && this.o.caBoost) c *= this.o.caBoost;
      const area = where === "in" ? Math.PI * g.R * g.R : g.w * g.h - Math.PI * g.R * g.R;
      const n = Math.round((c * area * this.o.density) / 1000);
      if (n > this.o.maxPer && !this.warned) { this.warned = true; console.warn(`CellStage: ${ion} ${where} wants ${n} particles, capped at ${this.o.maxPer}; densities no longer comparable`); }
      return Math.min(this.o.maxPer, n);
    }
    spawn(ion, where, g) {
      for (let k = 0; k < 40; k++) {
        const x = Math.random() * g.w, y = Math.random() * g.h;
        const d = Math.hypot(x - g.cx, y - g.cy);
        if (where === "in" ? d < g.R - 8 : d > g.R + 8 && x > 6 && x < g.w - 6 && y > 6 && y < g.h - 6) {
          this.parts.push({ ion, where, x, y, a: 0, dying: false });
          return;
        }
      }
    }
    /** Pathways: [{kind: 'channel'|'pump'|'nkcc1'|'kcc2'|'pmca', angle, ions, open, label}] */
    setPathways(list) { this.pathways = list; }
    /** Emit a token for ion through pathway index p; dir +1 outward, −1 inward. */
    emit(p, ion, dir) {
      if (this.tokens.length > 120) return;
      this.tokens.push({ p, ion, dir, s: 0, jitter: (Math.random() - 0.5) * 0.08 });
    }
    /** rates: per pathway, {ion: tokens per second, signed (+ outward)}. Accumulates and emits. */
    flow(rates, dt) {
      rates.forEach((r, p) => {
        if (!r) return;
        const pw = this.pathways[p];
        pw.acc = pw.acc || {};
        for (const ion in r) {
          pw.acc[ion] = (pw.acc[ion] || 0) + Math.abs(r[ion]) * dt;
          while (pw.acc[ion] >= 1) { pw.acc[ion] -= 1; this.emit(p, ion, Math.sign(r[ion])); }
        }
      });
    }
    step(dt) {
      this.t += dt;
      const g = this.geometry();
      // reconcile counts to the model's concentrations, gradually
      for (const where of ["in", "out"]) {
        for (const ion of this.o.ions) {
          const live = this.parts.filter((q) => q.ion === ion && q.where === where && !q.dying);
          const tgt = this.target(ion, where, g);
          const diff = tgt - live.length;
          const n = Math.min(Math.abs(diff), Math.max(1, Math.round(Math.abs(diff) * 0.08)));
          if (diff > 0) for (let i = 0; i < n; i++) this.spawn(ion, where, g);
          else if (diff < 0) for (let i = 0; i < n; i++) live[(Math.random() * live.length) | 0].dying = true;
        }
      }
      // jitter and confinement
      const sig = 26 * Math.sqrt(dt);
      for (const q of this.parts) {
        const big = q.ion === "A" ? 0.35 : 1;
        q.x += gauss() * sig * big; q.y += gauss() * sig * big;
        const d = Math.hypot(q.x - g.cx, q.y - g.cy) || 1;
        if (q.where === "in" && d > g.R - 8) { const k = (g.R - 8) / d; q.x = g.cx + (q.x - g.cx) * k; q.y = g.cy + (q.y - g.cy) * k; }
        if (q.where === "out") {
          if (d < g.R + 8) { const k = (g.R + 8) / d; q.x = g.cx + (q.x - g.cx) * k; q.y = g.cy + (q.y - g.cy) * k; }
          q.x = Math.max(6, Math.min(g.w - 6, q.x)); q.y = Math.max(6, Math.min(g.h - 6, q.y));
        }
        q.a = q.dying ? q.a - dt * 2 : Math.min(1, q.a + dt * 2);
      }
      this.parts = this.parts.filter((q) => !(q.dying && q.a <= 0));
      for (const tk of this.tokens) tk.s += dt / 0.9;
      this.tokens = this.tokens.filter((tk) => tk.s < 1);
    }
    draw() {
      const g = this.geometry();
      const { ctx } = fit(this.c, this.o.height);
      // bath
      ctx.fillStyle = "#101826"; ctx.fillRect(0, 0, g.w, g.h);
      // cytoplasm
      ctx.fillStyle = "#1a1626"; ctx.beginPath(); ctx.arc(g.cx, g.cy, g.R, 0, 2 * Math.PI); ctx.fill();
      ctx.font = "11px system-ui, sans-serif"; ctx.fillStyle = cssVar("--muted"); ctx.textAlign = "left"; ctx.textBaseline = "top";
      ctx.fillText("outside (bath)", 8, 8);
      ctx.textAlign = "center"; ctx.fillText("inside", g.cx, g.cy - g.R + 14);
      for (const q of this.parts) glyph(ctx, q.ion, q.x, q.y, q.ion === "A" ? 4.2 : 3.6, Math.max(0, q.a) * 0.9);
      // membrane
      ctx.strokeStyle = cssVar("--membrane"); ctx.lineWidth = 7; ctx.globalAlpha = 0.9;
      ctx.beginPath(); ctx.arc(g.cx, g.cy, g.R, 0, 2 * Math.PI); ctx.stroke(); ctx.globalAlpha = 1;
      // pathways
      this.pathways.forEach((pw) => this.drawPathway(ctx, g, pw));
      // tokens
      for (const tk of this.tokens) {
        const pw = this.pathways[tk.p]; if (!pw) continue;
        const a = pw.angle + tk.jitter;
        const r0 = g.R - 34, r1 = g.R + 34;
        const s = tk.dir > 0 ? tk.s : 1 - tk.s;
        const rr = r0 + (r1 - r0) * s;
        glyph(ctx, tk.ion, g.cx + Math.cos(a) * rr, g.cy + Math.sin(a) * rr, 5, Math.sin(Math.PI * tk.s));
      }
      if (this.o.caBoost) {
        ctx.fillStyle = cssVar("--ca"); ctx.font = "11px system-ui, sans-serif"; ctx.textAlign = "right"; ctx.textBaseline = "bottom";
        ctx.fillText(`Ca²⁺ drawn ${this.o.caBoost.toLocaleString("en-US")}× denser than it is`, g.w - 8, g.h - 6);
      }
    }
    drawPathway(ctx, g, pw) {
      const x = g.cx + Math.cos(pw.angle) * g.R, y = g.cy + Math.sin(pw.angle) * g.R;
      ctx.save();
      ctx.translate(x, y); ctx.rotate(pw.angle + Math.PI / 2);
      const col = pw.ions && pw.ions.length === 1 ? color(pw.ions[0]) : cssVar("--text");
      if (pw.kind === "channel") {
        ctx.fillStyle = "#101826"; ctx.fillRect(-7, -6, 14, 12);
        ctx.fillStyle = col;
        ctx.fillRect(-11, -9, 5, 18); ctx.fillRect(6, -9, 5, 18);
        if (!pw.open) { ctx.fillStyle = cssVar("--muted"); ctx.fillRect(-6, -2, 12, 4); }
      } else if (pw.kind === "pump" || pw.kind === "pmca") {
        ctx.fillStyle = pw.on === false ? "#3a3a3a" : (pw.kind === "pump" ? "#b9a3ff" : cssVar("--ca"));
        ctx.beginPath(); ctx.arc(0, 0, 13, 0, 2 * Math.PI); ctx.fill();
        ctx.strokeStyle = "#0d1117"; ctx.lineWidth = 2;
        const rot = (pw.phase || 0);
        for (let i = 0; i < 3; i++) { const a = rot + (i * 2 * Math.PI) / 3; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * 11, Math.sin(a) * 11); ctx.stroke(); }
      } else {
        ctx.fillStyle = pw.on === false ? "#3a3a3a" : (pw.kind === "nkcc1" ? "#7fb069" : "#e07a5f");
        ctx.beginPath(); ctx.roundRect(-14, -9, 28, 18, 5); ctx.fill();
      }
      ctx.restore();
      if (pw.label) {
        const lx = g.cx + Math.cos(pw.angle) * (g.R + 26), ly = g.cy + Math.sin(pw.angle) * (g.R + 26);
        ctx.font = "600 11px system-ui, sans-serif"; ctx.fillStyle = cssVar("--text"); ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(pw.label, lx, ly);
      }
    }
  }

  // ---------- small DOM helpers ----------
  const $ = (id) => document.getElementById(id);
  const setText = (id, s) => { const e = $(id); if (e && e.textContent !== s) e.textContent = s; };

  return { color, LABEL, Z, glyph, drawKey, ruler, gauges, ledger, Trace, CellStage, fit, loop, gauss, fmtMv, fmtConc, fmtTime, fmtBig, minus, $, setText, cssVar };
})();
