// draw.ts — the views every chapter shares: glyphs, the voltage ruler, the gauges, the charge
// ledger, traces, and the cell stage. Drawing only: every number arrives from core/physics.ts
// (docs/adr/0004). Ported from prototype/demo/views.js.

import { chargeLedger } from "../core/physics.ts";
import { DOT_DENSITY, IONS_PER_SIGN, STAGE } from "./stage-style.ts";
export { DOT_DENSITY, IONS_PER_SIGN };

export type Species = "Na" | "K" | "Cl" | "Ca" | "A" | "X";

export const cssVar = (n: string) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const COLOR: Partial<Record<string, string>> = {};
const VAR: Record<string, string> = { Na: "--na", K: "--k", Cl: "--cl", Ca: "--ca", A: "--a", X: "--text" };
export const color = (ion: string) => COLOR[ion] || (COLOR[ion] = cssVar(VAR[ion] || "--text"));
export const LABEL: Record<Species, string> = { Na: "Na⁺", K: "K⁺", Cl: "Cl⁻", Ca: "Ca²⁺", A: "A⁻", X: "X⁰" };
export const Z: Record<Species, number> = { Na: 1, K: 1, Cl: -1, Ca: 2, A: -1, X: 0 };

// ---------- formatting ----------
export const minus = (s: string) => s.replace(/^-/, "−");
export const fmtMv = (mv: number, d = 1) => minus((Math.abs(mv) < 0.05 ? 0 : mv).toFixed(d)) + " mV";
export function fmtConc(mM: number) {
  if (mM >= 1) return mM.toFixed(mM >= 100 ? 0 : 1) + " mM";
  if (mM >= 1e-3) return (mM * 1e3).toFixed(mM >= 0.01 ? 0 : 1) + " µM";
  return (mM * 1e6).toFixed(0) + " nM";
}
export function fmtTime(s: number) {
  if (s < 1e-6) return (s * 1e9).toFixed(1) + " ns";
  if (s < 1e-3) return (s * 1e6).toFixed(1) + " µs";
  if (s < 1) return (s * 1e3).toFixed(s < 0.01 ? 2 : 1) + " ms";
  if (s < 60) return s.toFixed(1) + " s";
  if (s < 3600) return Math.floor(s / 60) + " min " + String(Math.floor(s % 60)).padStart(2, "0") + " s";
  return Math.floor(s / 3600) + " h " + String(Math.floor((s % 3600) / 60)).padStart(2, "0") + " min";
}
export const fmtBig = (x: number) => {
  if (x >= 1e9) return (x / 1e9).toFixed(1) + " billion";
  if (x >= 1e6) return (x / 1e6).toFixed(1) + " million";
  return Math.round(x).toLocaleString("en-US");
};
const round2 = (x: number) => { const p = 10 ** (Math.floor(Math.log10(x)) - 1); return Math.round(x / p) * p; };

// ---------- DOM and canvas plumbing ----------
export const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
export const setText = (id: string, s: string) => { const e = $(id); if (e && e.textContent !== s) e.textContent = s; };

export function fit(canvas: HTMLCanvasElement, cssH: number) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = Math.max(50, canvas.clientWidth);
  const h = cssH;
  if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.height = h + "px";
  }
  const ctx = canvas.getContext("2d")!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  return { ctx, w, h };
}
/** requestAnimationFrame loop handing fn the real seconds since the last frame (capped). Returns a stop function. */
export function loop(fn: (dt: number) => void) {
  let last = performance.now(), id = 0, live = true;
  const tick = (now: number) => {
    if (!live) return;
    // a frame's timestamp can predate the loop's start, so the first step can come out negative
    const dt = Math.max(0, Math.min(0.05, (now - last) / 1000));
    last = Math.max(last, now);
    fn(dt);
    id = requestAnimationFrame(tick);
  };
  id = requestAnimationFrame(tick);
  return () => { live = false; cancelAnimationFrame(id); };
}
export const gauss = () => {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
};

// ---------- glyphs: shape carries the charge, color the identity ----------
export function glyph(ctx: CanvasRenderingContext2D, ion: Species, x: number, y: number, r: number, alpha = 1) {
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
    const k = 1.7;
    ctx.beginPath();
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
    if (ion === "Ca") { ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(x, y, r + 2.2, 0, 2 * Math.PI); ctx.stroke(); }
  }
  if (r >= 5.5 && ion !== "X") {
    ctx.fillStyle = "#0d1117";
    ctx.font = `700 ${Math.round(r * 1.3)}px system-ui, sans-serif`;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(Z[ion] > 0 ? "+" : Z[ion] < 0 ? "−" : "", x, y + 0.5);
  }
  ctx.restore();
}

/** A key of glyphs, drawn into a canvas. */
export function drawKey(canvas: HTMLCanvasElement, ions: Species[], height = 34) {
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
export interface RulerState { V?: number; E: Partial<Record<Species, number>>; g?: Partial<Record<Species, number>>; min?: number; max?: number; height?: number }
/**
 * A vertical mV scale with a tick at each ion's equilibrium potential, a needle at Vm and an arrow
 * from the needle toward each tick, its width set by that ion's relative conductance.
 */
export function ruler(canvas: HTMLCanvasElement, st: RulerState) {
  const H = st.height || 420;
  const { ctx, w } = fit(canvas, H);
  const min = st.min ?? -110, max = st.max ?? 80;
  const top = 30, bot = H - 30;
  const y = (mv: number) => bot - ((Math.max(min, Math.min(max, mv)) - min) / (max - min)) * (bot - top);
  const ax = 48;
  // inside positive above zero, inside negative below: shaded, and said in words
  ctx.fillStyle = "rgba(255,138,101,0.07)"; ctx.fillRect(ax, top, w - ax - 4, y(0) - top);
  ctx.fillStyle = "rgba(86,180,233,0.07)"; ctx.fillRect(ax, y(0), w - ax - 4, bot - y(0));
  ctx.font = "11px system-ui, sans-serif"; ctx.textAlign = "left"; ctx.textBaseline = "bottom";
  ctx.fillStyle = "rgba(255,180,162,0.9)"; ctx.fillText("↑ inside positive", ax, top - 6);
  ctx.textBaseline = "top"; ctx.fillStyle = "rgba(154,209,255,0.9)"; ctx.fillText("↓ inside negative", ax, bot + 6);
  const stepMv = max - min > 150 ? 40 : 20;
  ctx.strokeStyle = "rgba(154,165,177,0.18)"; ctx.lineWidth = 1;
  for (let v = Math.ceil(min / 20) * 20; v <= max; v += 20) { if (v === 0) continue; ctx.beginPath(); ctx.moveTo(ax, y(v)); ctx.lineTo(w - 4, y(v)); ctx.stroke(); }
  ctx.strokeStyle = cssVar("--muted"); ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(ax, top); ctx.lineTo(ax, bot); ctx.stroke();
  ctx.font = "12px ui-monospace, Menlo, monospace"; ctx.fillStyle = cssVar("--text"); ctx.textAlign = "right"; ctx.textBaseline = "middle";
  for (let v = Math.ceil(min / stepMv) * stepMv; v <= max; v += stepMv) {
    if (v === 0) continue;
    ctx.fillText(minus(String(v)), ax - 7, y(v));
    ctx.beginPath(); ctx.moveTo(ax - 5, y(v)); ctx.lineTo(ax, y(v)); ctx.stroke();
  }
  ctx.save(); ctx.translate(11, (top + bot) / 2); ctx.rotate(-Math.PI / 2); ctx.textAlign = "center"; ctx.fillStyle = cssVar("--muted"); ctx.font = "11px system-ui, sans-serif"; ctx.fillText("Vm, inside relative to outside (mV)", 0, 0); ctx.restore();
  // the zero line: where the membrane carries no charge
  ctx.strokeStyle = "#e6edf3"; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(ax - 6, y(0)); ctx.lineTo(w - 4, y(0)); ctx.stroke();
  ctx.font = "700 13px ui-monospace, Menlo, monospace"; ctx.fillStyle = "#ffffff"; ctx.textAlign = "right"; ctx.fillText("0", ax - 8, y(0));

  const ions = Object.keys(st.E) as Species[];
  const colW = Math.min(26, (w - ax - 150) / Math.max(1, ions.length));
  ions.forEach((ion, i) => {
    const E = st.E[ion]!, g = st.g?.[ion] ?? 0;
    const x = ax + 16 + i * colW;
    if (st.V === undefined || Math.abs(E - st.V) < 1.5) return;
    const y0 = y(st.V), y1 = y(E), s = Math.sign(y0 - y1);
    ctx.strokeStyle = color(ion); ctx.fillStyle = color(ion);
    ctx.globalAlpha = g > 0 ? 0.95 : 0.25;
    ctx.lineWidth = 1 + 5 * Math.sqrt(Math.max(0, Math.min(1, g)));
    ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, y1 + s * 7); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, y1); ctx.lineTo(x - 5, y1 + s * 8); ctx.lineTo(x + 5, y1 + s * 8); ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 1;
  });
  // ticks, and every label (Vm's too) nudged apart in one column
  const labels: { ion: Species | "V"; E: number; ly: number }[] = ions.map((ion) => ({ ion, E: st.E[ion]!, ly: y(st.E[ion]!) }));
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
      ctx.fillText(L.ion, x, L.ly + 4); x += ctx.measureText(L.ion).width + 4;
      ctx.font = "12px ui-monospace, Menlo, monospace";
      ctx.fillText(fmtMv(L.E, 0) + off, x, L.ly);
    }
  }
}

// ---------- concentration gauges (log scale, so Ca²⁺ fits beside Na⁺) ----------
export function gauges(canvas: HTMLCanvasElement, { ions, ci, co, height }: { ions: Species[]; ci: Partial<Record<Species, number>>; co: Partial<Record<Species, number>>; height?: number }) {
  const narrow = canvas.clientWidth < 440;
  const rowH = narrow ? 50 : 34;
  const H = height || ions.length * rowH + 30;
  const { ctx, w } = fit(canvas, H);
  const lo = Math.log10(1e-5), hi = Math.log10(500);
  const x0 = 46, x1 = narrow ? w - 8 : w - 96;
  const x = (mM: number) => x0 + ((Math.log10(Math.max(mM, 1e-5)) - lo) / (hi - lo)) * (x1 - x0);
  ctx.font = "10px ui-monospace, Menlo, monospace"; ctx.fillStyle = cssVar("--muted"); ctx.textAlign = "center"; ctx.textBaseline = "top";
  for (const [v, lab] of [[1e-4, "0.1µM"], [1e-2, "10µM"], [1, "1mM"], [100, "100mM"]] as const) {
    ctx.fillText(lab, x(v), H - 14);
    ctx.strokeStyle = cssVar("--line"); ctx.beginPath(); ctx.moveTo(x(v), 4); ctx.lineTo(x(v), H - 16); ctx.stroke();
  }
  ions.forEach((ion, i) => {
    const yy = 6 + i * rowH;
    glyph(ctx, ion, 12, yy + 12, 6);
    ctx.fillStyle = cssVar("--text"); ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.font = "12px system-ui, sans-serif";
    ctx.fillText(LABEL[ion], 22, yy + 12);
    ctx.fillStyle = color(ion);
    const cin = ci[ion], cout = co[ion];
    if (cin !== undefined) ctx.fillRect(x0, yy + 2, x(cin) - x0, 9);
    if (cout !== undefined) { ctx.strokeStyle = color(ion); ctx.lineWidth = 1.5; ctx.strokeRect(x0, yy + 14, x(cout) - x0, 8); }
    ctx.font = "11px ui-monospace, Menlo, monospace";
    const tIn = cin !== undefined ? "in " + fmtConc(cin) : "", tOut = cout !== undefined ? "out " + fmtConc(cout) : "";
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
/** A magnified patch of membrane: the excess charge that sets Vm, and the arithmetic that says how few ions that is. */
export function ledger(canvas: HTMLCanvasElement, { V, radius = 10e-6, kIn = 140, height = 170 }: { V: number; radius?: number; kIn?: number; height?: number }) {
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
    sign(ctx, xx, mid - band / 2 - 9, neg ? "+" : "−");
    sign(ctx, xx, mid + band / 2 + 9, neg ? "−" : "+");
  }
  const L = chargeLedger(radius, V / 1000, kIn);
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
function sign(ctx: CanvasRenderingContext2D, x: number, y: number, s: string) {
  ctx.save();
  ctx.fillStyle = s === "+" ? STAGE.rimPlus : STAGE.rimMinus;
  ctx.font = "700 15px system-ui, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(s, x, y);
  ctx.restore();
}

// ---------- traces ----------
export interface Series { key: string; color: string; label?: string; dash?: number[]; width?: number }
export interface TraceOpts {
  series: Series[]; ymin: number; ymax: number; yLabel?: string; window: number; grow?: boolean; autoY?: boolean;
  log?: boolean; xFmt?: (t: number) => string; yFmt?: (v: number) => string; yTicks?: number[]; height?: number;
}
export class Trace {
  t: number[] = [];
  d: Record<string, (number | undefined)[]> = {};
  constructor(private c: HTMLCanvasElement, public o: TraceOpts) { for (const s of o.series) this.d[s.key] = []; }
  clear() { this.t = []; for (const k in this.d) this.d[k] = []; }
  push(t: number, vals: Record<string, number | undefined>) {
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
      for (const k in this.d) for (const v of this.d[k]) if (v !== undefined && v > m) m = v;
      const nice = (x: number) => { const p = 10 ** Math.floor(Math.log10(x)); for (const f of [1, 2, 5, 10]) if (f * p >= x) return f * p; return 10 * p; };
      o.ymax = nice(m * 1.05);
      o.yTicks = [o.ymin, (o.ymin + o.ymax) / 2, o.ymax];
    }
    const tf = o.log ? (v: number) => Math.log10(Math.max(v, 1e-12)) : (v: number) => v;
    const y0 = tf(o.ymin), y1 = tf(o.ymax);
    const X = (t: number) => l + ((t - t0) / (t1 - t0)) * (w - l - r);
    const Y = (v: number) => tp + (1 - (tf(v) - y0) / (y1 - y0)) * (H - tp - b);
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
      ctx.setLineDash(s.dash || []);
      ctx.beginPath(); let started = false;
      for (let i = 0; i < this.t.length; i++) {
        const v = arr[i];
        if (this.t[i] < t0 || v === undefined) continue;
        const px = X(this.t[i]), py = Y(v);
        if (!started) { ctx.moveTo(px, py); started = true; } else ctx.lineTo(px, py);
      }
      ctx.stroke();
    }
    ctx.restore(); ctx.setLineDash([]);
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

/** Where an ATPase's star-shaped ATP site sits, in the protein's own frame (x along the membrane, y inward): a corner
 *  of its cytoplasmic face, clear of the binding cleft. Its phosphate (P) rides at the mirror corner. */
const SITE_X = 11, SITE_Y = 9;
/** A star with n points, outer radius r, inner radius ri, drawn as the current path (not filled or stroked). */
export function starPath(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, ri: number, n = 5, rot = -Math.PI / 2) {
  ctx.beginPath();
  for (let i = 0; i < 2 * n; i++) {
    const a = rot + (i * Math.PI) / n, rr = i % 2 ? ri : r;
    if (i === 0) ctx.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); else ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
}

// ---------- dials: a value at a glance, for readers who do not read graphs ----------
export interface DialSpec {
  label: string; value: number; min: number; max: number;
  fmt: (v: number) => string; color: string;
  /** ranges that count as losing, drawn red on the arc */
  bad?: [number, number][];
}
/**
 * A row of dials (two rows on a narrow canvas): a 240° arc, its losing ranges in red, a needle, and the
 * value in large type. Drawing only; the caller supplies every number.
 */
export function dials(canvas: HTMLCanvasElement, list: DialSpec[]) {
  const narrow = canvas.clientWidth < 520;
  const perRow = narrow ? Math.min(2, list.length) : list.length, rows = Math.ceil(list.length / perRow);
  const cellH = narrow ? 118 : 132;
  const { ctx, w } = fit(canvas, rows * cellH);
  const cw = w / perRow;
  const A0 = Math.PI * (5 / 6), A1 = Math.PI * (13 / 6); // 240°, open at the bottom
  list.forEach((d, i) => {
    const cx = cw * (i % perRow) + cw / 2, cy = Math.floor(i / perRow) * cellH + cellH * 0.5;
    const r = Math.min(cw * 0.36, cellH * 0.38);
    const a = (v: number) => A0 + (Math.max(0, Math.min(1, (v - d.min) / (d.max - d.min)))) * (A1 - A0);
    ctx.lineCap = "butt";
    ctx.lineWidth = 9; ctx.strokeStyle = cssVar("--line");
    ctx.beginPath(); ctx.arc(cx, cy, r, A0, A1); ctx.stroke();
    for (const [lo, hi] of d.bad ?? []) { ctx.strokeStyle = "rgba(255,90,70,0.75)"; ctx.beginPath(); ctx.arc(cx, cy, r, a(lo), a(hi)); ctx.stroke(); }
    const out = (d.bad ?? []).some(([lo, hi]) => d.value >= lo && d.value <= hi);
    // the needle
    const an = a(d.value);
    ctx.strokeStyle = d.color; ctx.lineWidth = 3; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(an) * (r + 4), cy + Math.sin(an) * (r + 4)); ctx.stroke();
    ctx.fillStyle = d.color; ctx.beginPath(); ctx.arc(cx, cy, 4, 0, 2 * Math.PI); ctx.fill();
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.font = `700 ${narrow ? 15 : 17}px ui-monospace, Menlo, monospace`;
    ctx.fillStyle = out ? "#ff7a64" : cssVar("--text");
    ctx.fillText(d.fmt(d.value), cx, cy + r * 0.62);
    ctx.font = "12px system-ui, sans-serif"; ctx.fillStyle = d.color;
    ctx.fillText(d.label, cx, cy + r * 0.62 + 18);
    ctx.font = "10px ui-monospace, Menlo, monospace"; ctx.fillStyle = cssVar("--muted");
    ctx.textAlign = "right"; ctx.fillText(d.fmt(d.min), cx + Math.cos(A0) * r + 6, cy + Math.sin(A0) * r + 12);
    ctx.textAlign = "left"; ctx.fillText(d.fmt(d.max), cx + Math.cos(A1) * r - 6, cy + Math.sin(A1) * r + 12);
  });
}

// ---------- the balance (a teeter-totter) ----------
export interface Weight { label: string; value: number; color: string }
/**
 * A beam on a pivot. Weights on each side are drawn as blocks sized by value; the beam tilts by
 * `tilt` (−1 … 1, left side down when negative) and is level at 0. The caller decides what the
 * two sides mean; the view only draws them.
 */
export function balance(canvas: HTMLCanvasElement, st: { left: Weight[]; right: Weight[]; leftTitle: string; rightTitle: string; tilt: number; caption: string; height?: number }) {
  const H = st.height || 200;
  const { ctx, w } = fit(canvas, H);
  const cx = w / 2, py = H - 58, half = Math.min(w * 0.42, 220);
  const ang = Math.max(-1, Math.min(1, st.tilt)) * 0.28;
  // pivot
  ctx.fillStyle = cssVar("--muted");
  ctx.beginPath(); ctx.moveTo(cx, py); ctx.lineTo(cx - 16, py + 26); ctx.lineTo(cx + 16, py + 26); ctx.closePath(); ctx.fill();
  ctx.save(); ctx.translate(cx, py); ctx.rotate(ang);
  ctx.fillStyle = Math.abs(st.tilt) < 0.03 ? cssVar("--accent") : "#e6edf3";
  ctx.fillRect(-half, -4, 2 * half, 6);
  const maxV = Math.max(1e-30, ...st.left.map((x) => Math.abs(x.value)), ...st.right.map((x) => Math.abs(x.value)));
  const stack = (ws: Weight[], side: number) => {
    let yy = -4;
    for (const wt of ws) {
      const hgt = 6 + 40 * (Math.abs(wt.value) / maxV), wd = 54;
      const x0 = side * (half - 12) - wd / 2;
      ctx.fillStyle = wt.color; ctx.globalAlpha = 0.9; ctx.fillRect(x0, yy - hgt, wd, hgt); ctx.globalAlpha = 1;
      ctx.fillStyle = "#0d1117"; ctx.font = "600 11px system-ui, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      if (hgt > 14) ctx.fillText(wt.label, side * (half - 12), yy - hgt / 2);
      yy -= hgt + 2;
    }
  };
  stack(st.left, -1); stack(st.right, 1);
  ctx.restore();
  const lines = (t: string) => { const i = t.indexOf(":"); return i < 0 ? [t] : [t.slice(0, i), t.slice(i + 1).trim()]; };
  ctx.fillStyle = cssVar("--text"); ctx.textBaseline = "top";
  lines(st.leftTitle).forEach((t, i) => { ctx.font = i ? "600 12px ui-monospace, Menlo, monospace" : "11px system-ui, sans-serif"; ctx.textAlign = "left"; ctx.fillText(t, 6, 6 + i * 15); });
  lines(st.rightTitle).forEach((t, i) => { ctx.font = i ? "600 12px ui-monospace, Menlo, monospace" : "11px system-ui, sans-serif"; ctx.textAlign = "right"; ctx.fillText(t, w - 6, 6 + i * 15); });
  ctx.textAlign = "center"; ctx.fillStyle = Math.abs(st.tilt) < 0.03 ? cssVar("--accent") : cssVar("--muted"); ctx.font = "600 12px system-ui, sans-serif";
  ctx.fillText(st.caption, cx, H - 22);
}

// ---------- the cell stage ----------
//
// Two scales, each stated on the stage, and they agree (docs/adr/0011):
//  · bulk: every dot stands for `ionsPerDot` ions (~10¹⁰). In "amounts" mode the inside counts come
//    from the cell's real amounts, and only crossings change them: a crossing moves an actual dot
//    through the pathway, at the model's one-way rate × the clock speed. The bath is a reservoir and
//    is kept at its concentration.
//  · membrane charge: a rim of + and − along the membrane, `IONS_PER_SIGN` ions per sign, set by Vm.
//    In the fast chapters, crossings are drawn at this scale and join the rim.
// Motion between crossings is depiction only: a slow, smooth wander, not the model's diffusion.


// ---------- the stage's view: one choice for every stage, kept in this browser (docs/adr/0016) ----------
export type StageView = "cell" | "focus" | "census" | "lens";
export const viewPref: { view: StageView; ion: Species } = { view: "cell", ion: "Ca" };
const VIEW_KEY = "ionhomie.stageView";
try {
  const saved = JSON.parse(localStorage.getItem(VIEW_KEY) || "null");
  if (saved && ["cell", "focus", "census", "lens"].includes(saved.view)) viewPref.view = saved.view;
  if (saved && ["Na", "K", "Cl", "Ca"].includes(saved.ion)) viewPref.ion = saved.ion;
} catch { /* storage blocked: the default view */ }
export function setStageView(view: StageView, ion: Species = viewPref.ion) {
  viewPref.view = view; viewPref.ion = ion;
  try { localStorage.setItem(VIEW_KEY, JSON.stringify(viewPref)); } catch { /* not remembered */ }
}
/** Ions per cubic micrometer at 1 mM: 1e-18 m³ × 6.022e23 /mol × 1 mol/m³. */
export const IONS_PER_UM3_PER_MM = 602214;
interface Dot { where: Where; x: number; y: number; vx: number; vy: number; a: number; dying: boolean; ion: Species }
const seeded = (n: number, seed: number) => { const out: [number, number][] = []; let s0 = seed; const r = () => ((s0 = (s0 * 16807) % 2147483647) / 2147483647); for (let i = 0; i < n; i++) out.push([r(), r()]); return out; };
const SPECKLE = seeded(2600, 11);
const FOCUS_HAZE = 1400; // above this many dots on a side, the focus view draws that side as a haze
const NA = 6.02214076e23;

export interface Pathway {
  kind: "channel" | "pump" | "pmca" | "nkcc1" | "kcc2";
  angle: number; ions?: Species[]; open?: boolean; on?: boolean; label?: string; key?: string;
  phase?: number;
}
type Where = "in" | "out";
interface Particle { ion: Species; where: Where; x: number; y: number; vx: number; vy: number; a: number; dying: boolean; busy: boolean; crossed?: number }
interface Leg { ions: Species[]; from: Where }
interface Bound { q: Particle; slot: number; x0: number; y0: number; walk: number; start: number }
/** A transport protein's alternating-access cycle (docs/adr/0017): bind, close, rock, release. */
interface Protein {
  o: number; // which way the cleft opens: +1 outward, −1 inward, 0 closed (occluded)
  phase: "idle" | "toSide" | "wait" | "bind" | "close" | "rock" | "release";
  t: number; from: number; to: number; // the rock's start and end openness, for the phases that rock
  legs: Leg[]; leg: number; bound: Bound[]; waited: number; clock: number;
  /** the ATPase's nucleotide site: phos while the pump carries its phosphate; adpT, s since ATP split; atpIn, s since a
   *  fresh ATP began to dock (−1: the site is empty) */
  phos: boolean; adpT: number; atpIn: number;
}
interface Crossing { p: number; ion: Species; dir: number; t: number; dur: number; walk?: number; part?: Particle; x0: number; y0: number; da: number; rim: boolean; delay: number }
export interface StageOpts { height: number; ions: Species[]; mode: "fixed" | "amounts"; cellVolume: number; /** wander strength, px/√s (depiction only) */ wander: number }

export class CellStage {
  o: StageOpts;
  parts: Particle[] = [];
  moving: Crossing[] = [];
  pathways: Pathway[] = [];
  inside: Partial<Record<Species, number>> = {};
  outside: Partial<Record<Species, number>> = {};
  amounts: Partial<Record<Species, number>> = {}; // ions, for "amounts" mode
  volumeRel = 1;
  V: number | null = null; // mV, for the rim
  thinning = 1; // crossings shown are 1 in this many (the lab sets it at fast clocks)
  private acc = new Map<string, number>();
  private prot = new Map<number, Protein>();
  private lastKey = "";
  private vdots: Dot[] = []; // the focus, census and lens views' own dots
  private vKey = "";
  private vDens = 0;
  private caVisit = { n: 0, until: 0 };
  private clock = 0;
  constructor(private c: HTMLCanvasElement, opts: Partial<StageOpts> = {}) {
    this.o = { height: 420, ions: ["Na", "K", "Cl", "A"], mode: "fixed", cellVolume: (4 / 3) * Math.PI * 1e-15, wander: 9, ...opts };
  }
  geometry() {
    const w = Math.max(50, this.c.clientWidth), h = this.o.height;
    const lens = viewPref.view === "lens" || viewPref.view === "census";
    // in the magnifier and census views the cell moves left and shrinks; the panel takes the right
    const R0 = lens ? Math.min(w * 0.19, h * 0.32) : Math.min(w, h) * 0.34;
    const R = Math.min(R0 * Math.cbrt(Math.max(0.2, this.volumeRel)), lens ? w * 0.22 : Math.min(w, h) * 0.47);
    return { w, h, cx: lens ? w * 0.24 : w / 2, cy: h / 2, R, R0, k: Math.max(1, Math.min(1.7, R0 / 105)) };
  }
  /** Ions each bulk dot stands for, at this canvas size. */
  ionsPerDot() {
    const g = this.geometry();
    return (this.o.cellVolume * NA * 1000) / (Math.PI * g.R0 * g.R0 * DOT_DENSITY);
  }
  setConcentrations(inside: Partial<Record<Species, number>>, outside: Partial<Record<Species, number>>, volumeRel = 1) {
    this.inside = inside; this.outside = outside; this.volumeRel = volumeRel;
  }
  /** "amounts" mode: the cell's ions of each species (not moles). */
  setAmounts(ions: Partial<Record<Species, number>>) { this.amounts = ions; }
  setPathways(list: Pathway[]) { this.pathways = list; }
  setV(mv: number | null) { this.V = mv; }

  private target(ion: Species, where: Where, g: ReturnType<CellStage["geometry"]>) {
    if (where === "in" && this.o.mode === "amounts") {
      const n = this.amounts[ion];
      return n === undefined ? 0 : Math.round(n / this.ionsPerDot());
    }
    const c = (where === "in" ? this.inside : this.outside)[ion];
    if (c === undefined) return 0;
    const area = where === "in" ? Math.PI * g.R * g.R : g.w * g.h - Math.PI * g.R * g.R;
    return Math.round((c * area * DOT_DENSITY) / 1000);
  }
  private place(where: Where, g: ReturnType<CellStage["geometry"]>, edge = false): [number, number] | null {
    for (let k = 0; k < 60; k++) {
      let x = Math.random() * g.w, y = Math.random() * g.h;
      if (edge) { if (Math.random() < 0.5) x = Math.random() < 0.5 ? 8 + Math.random() * 20 : g.w - 8 - Math.random() * 20; else y = Math.random() < 0.5 ? 8 + Math.random() * 20 : g.h - 8 - Math.random() * 20; }
      const d = Math.hypot(x - g.cx, y - g.cy);
      if (where === "in" ? d < g.R - 10 : d > g.R + 12 && x > 6 && x < g.w - 6 && y > 6 && y < g.h - 6) return [x, y];
    }
    return null;
  }
  private spawn(ion: Species, where: Where, g: ReturnType<CellStage["geometry"]>, edge = false) {
    const at = this.place(where, g, edge);
    if (at) this.parts.push({ ion, where, x: at[0], y: at[1], vx: 0, vy: 0, a: 0, dying: false, busy: false });
  }
  private mouth(p: number, g: ReturnType<CellStage["geometry"]>, r: number, da = 0) {
    const a = this.pathways[p].angle + da;
    return [g.cx + Math.cos(a) * r, g.cy + Math.sin(a) * r];
  }
  /** The source-side dots of this ion close enough to pathway p's mouth to cross (nearest first). */
  private nearby(p: number, ion: Species, dir: number, reachPx?: number) {
    const g = this.geometry(), from: Where = dir > 0 ? "in" : "out";
    const [mx, my] = this.mouth(p, g, dir > 0 ? g.R - 16 * g.k : g.R + 16 * g.k);
    const reach = reachPx ?? 80 * g.k;
    return this.parts
      // a dot that has just crossed rests ~3 s first, so the same dot does not shuttle in and out of a pore
      // (Tony: "chloride ions never leave the chloride leak channel")
      .filter((q) => q.ion === ion && q.where === from && !q.dying && !q.busy && (q.crossed === undefined || this.clock - q.crossed > 3))
      .map((q) => ({ q, d: Math.hypot(q.x - mx, q.y - my) }))
      .filter((c) => c.d < reach)
      .sort((x, y) => x.d - y.d);
  }
  /**
   * Move one real dot through pathway p (dir +1 out, −1 in). Only a dot already near the pore can
   * go: it walks over at a dot's pace, passes through, and is let go just past the pore. Returns
   * false when no dot is close enough; the caller keeps the event and tries again.
   */
  transfer(p: number, ion: Species, dir: number, delay = 0, da = 0) {
    const c = this.nearby(p, ion, dir)[0];
    if (!c) return false;
    c.q.busy = true;
    const walk = Math.max(0.35, c.d / 30); // seconds to reach the pore at ~30 px/s
    this.moving.push({ p, ion, dir, t: 0, dur: walk + 0.9, walk, part: c.q, x0: c.q.x, y0: c.q.y, da, rim: false, delay });
    return true;
  }
  /** A crossing drawn at the membrane-charge scale; it joins the rim. */
  rimCrossing(p: number, ion: Species, dir: number) {
    if (this.moving.length > 160) return false;
    this.moving.push({ p, ion, dir, t: 0, dur: 0.9, x0: 0, y0: 0, da: (Math.random() - 0.5) * 0.1, rim: true, delay: 0 });
    return true;
  }
  /** Accumulate a rate (events per real second) and fire whole events. */
  private every(key: string, rate: number, dt: number, fire: () => boolean, cap = 40) {
    let a = Math.min(3, (this.acc.get(key) ?? 0) + Math.min(rate, cap) * dt); // at most 3 events wait for a dot
    while (a >= 1) { if (!fire()) break; a -= 1; }
    this.acc.set(key, a);
  }
  /** One-way bulk crossings: efflux and influx in dots per real second. */
  flowBulk(p: number, ion: Species, efflux: number, influx: number, dt: number) {
    this.every(`${p}${ion}o`, efflux, dt, () => this.transfer(p, ion, +1, 0, (Math.random() - 0.5) * 0.08));
    this.every(`${p}${ion}i`, influx, dt, () => this.transfer(p, ion, -1, 0, (Math.random() - 0.5) * 0.08));
  }
  /**
   * Cycles of a pump or cotransporter, as alternating access (docs/adr/0017): the ions of one half-cycle
   * bind in the cleft, it closes, rocks to the other face and releases them. The Na⁺/K⁺ pump runs two halves
   * (3 Na⁺ out, then 2 K⁺ in); a cotransporter one half, then rocks back empty. A negative rate runs it in
   * reverse. A cycle starts only when the protein is free and the first half's ions are at hand.
   */
  flowGroup(p: number, members: { ion: Species; dir: number }[], cycles: number, dt: number) {
    const sgn = Math.sign(cycles);
    if (!sgn) return;
    this.every(`${p}g`, Math.abs(cycles), dt, () => {
      const pr = this.protein(p);
      if (pr.phase !== "idle") return false;
      // the halves: ions that cross the same way travel together
      const legs: Leg[] = [];
      for (const m of members) {
        const from: Where = m.dir * sgn > 0 ? "in" : "out";
        let leg = legs.find((l) => l.from === from);
        if (!leg) legs.push((leg = { ions: [], from }));
        leg.ions.push(m.ion);
      }
      pr.legs = legs; pr.leg = 0;
      this.beginLeg(pr);
      return true;
    }, 12);
  }
  private protein(p: number) {
    let pr = this.prot.get(p);
    // the pump rests open to the cytoplasm with ATP bound, waiting for Na⁺ (E1); a cotransporter rests open outward
    const o = this.pathways[p]?.kind === "pump" ? -1 : 1;
    if (!pr) this.prot.set(p, (pr = { o, phase: "idle", t: 0, from: o, to: o, legs: [], leg: 0, bound: [], waited: 0, clock: 0, phos: false, adpT: 99, atpIn: 99 }));
    return pr;
  }
  private beginLeg(pr: Protein) {
    const side = pr.legs[pr.leg].from === "out" ? 1 : -1;
    if (Math.sign(pr.o) !== side) { pr.phase = "toSide"; pr.t = 0; pr.from = pr.o; pr.to = side; } // rock over empty first
    else { pr.phase = "wait"; pr.t = 0; pr.waited = 0; }
  }
  /** World position of a point in a pathway's own frame (x along the membrane, y inward). */
  private local(p: number, g: ReturnType<CellStage["geometry"]>, lx: number, ly: number) {
    const a = this.pathways[p].angle, k = g.k * 1.35, cx = g.cx + Math.cos(a) * g.R, cy = g.cy + Math.sin(a) * g.R;
    return [cx + (-Math.sin(a) * lx - Math.cos(a) * ly) * k, cy + (Math.cos(a) * lx - Math.sin(a) * ly) * k];
  }
  private slotXY(p: number, g: ReturnType<CellStage["geometry"]>, pr: Protein, i: number) {
    const n = pr.legs[pr.leg]?.ions.length ?? 1;
    return this.local(p, g, (i - (n - 1) / 2) * 6.5, 0);
  }
  private stepProteins(dt: number, g: ReturnType<CellStage["geometry"]>) {
    const ease = (u: number) => u * u * (3 - 2 * u);
    for (const [p, pr] of this.prot) {
      const pw = this.pathways[p];
      if (!pw) continue;
      pr.t += dt; pr.clock += dt; pr.adpT += dt; if (pr.atpIn >= 0) pr.atpIn += dt;
      const leg = pr.legs[pr.leg];
      if (pr.phase === "toSide" || pr.phase === "rock") {
        const D = pr.phase === "rock" ? 0.3 : 0.35, u = Math.min(1, pr.t / D);
        pr.o = pr.from + (pr.to - pr.from) * ease(u);
        if (u >= 1) {
          if (pr.phase === "toSide") { pr.phase = "wait"; pr.t = 0; pr.waited = 0; }
          else { pr.phase = "release"; pr.t = 0; }
        }
      } else if (pr.phase === "wait" || pr.phase === "bind") {
        // the cleft is open on the binding side; each ion binds as one comes near (the reach widens slowly
        // while a slot is empty, and the ion walks over at a dot's pace); it closes when every slot is full
        if (pr.phase === "wait") { pr.bound = []; pr.phase = "bind"; pr.waited = 0; }
        pr.waited += dt;
        const dir = leg.from === "in" ? 1 : -1, reach = (80 + 40 * pr.waited) * g.k;
        leg.ions.forEach((ion, i) => {
          if (pr.bound.some((x) => x.slot === i)) return;
          const c = this.nearby(p, ion, dir, reach)[0];
          if (!c) return;
          c.q.busy = true;
          pr.bound.push({ q: c.q, slot: i, x0: c.q.x, y0: c.q.y, walk: Math.max(0.3, Math.min(1.4, c.d / 90)), start: pr.clock });
        });
        const full = pr.bound.length === leg.ions.length && pr.bound.every((x) => pr.clock - x.start >= x.walk);
        if (full) {
          pr.phase = "close"; pr.t = 0;
          // closing on its Na⁺, the pump splits its ATP: the phosphate stays on the pump, ADP leaves
          if (pw.kind === "pump" && pr.leg === 0) { pr.phos = true; pr.adpT = 0; pr.atpIn = -1; }
        }
      } else if (pr.phase === "close") {
        const u = Math.min(1, pr.t / 0.22);
        pr.o = Math.sign(pr.o || 1) * (1 - ease(u)) || 0;
        if (u >= 1) { const side = leg.from === "out" ? 1 : -1; pr.phase = "rock"; pr.t = 0; pr.from = 0; pr.to = -side; }
      } else if (pr.phase === "release") {
        // let them go one by one, into the other side, moving away from the membrane
        const due = Math.min(pr.bound.length, Math.floor(pr.t / 0.09) + 1);
        const dest: Where = leg.from === "in" ? "out" : "in", push = 28 + 2 * this.o.wander, a = pw.angle;
        for (let i = 0; i < due; i++) {
          const b = pr.bound[i];
          if (!b.q.busy) continue;
          const [x, y] = this.local(p, g, (b.slot - (leg.ions.length - 1) / 2) * 6.5, dest === "out" ? -20 : 20);
          b.q.x = x; b.q.y = y; b.q.where = dest; b.q.busy = false; b.q.crossed = this.clock;
          const s = dest === "out" ? 1 : -1;
          b.q.vx = Math.cos(a) * push * s; b.q.vy = Math.sin(a) * push * s;
        }
        if (due >= pr.bound.length && pr.t > 0.09 * pr.bound.length) {
          pr.bound = []; pr.leg++;
          if (pr.leg < pr.legs.length) this.beginLeg(pr);
          else {
            pr.phase = "idle";
            // back on the cytoplasm side with its K⁺ delivered: the phosphate goes, and a fresh ATP docks
            if (pw.kind === "pump") { pr.phos = false; pr.atpIn = 0; }
          }
        }
      }
    }
  }

  /** One-way crossings at the membrane-charge scale, in crossings per real second. */
  flowRim(p: number, ion: Species, efflux: number, influx: number, dt: number) {
    this.every(`${p}${ion}ro`, efflux, dt, () => this.rimCrossing(p, ion, +1), 16);
    this.every(`${p}${ion}ri`, influx, dt, () => this.rimCrossing(p, ion, -1), 16);
  }

  step(dt: number) {
    if (!(dt > 0)) return;
    const g = this.geometry();
    const key = `${Math.round(g.w / 3)}|${viewPref.view === "lens" || viewPref.view === "census"}`;
    if (key !== this.lastKey) { // a resize or a change of view changes the dot scale: start the counts over
      if (this.lastKey) { this.parts = []; this.moving = []; this.prot.clear(); }
      this.lastKey = key;
    }
    this.stepView(dt, g);
    this.stepProteins(dt, g);
    for (const where of ["in", "out"] as const) {
      for (const ion of this.o.ions) {
        const live = this.parts.filter((q) => q.ion === ion && q.where === where && !q.dying && !q.busy);
        const diff = this.target(ion, where, g) - live.length;
        // "amounts" inside: only crossings change counts; correct rounding drift of 2 or more, slowly
        const tol = where === "in" && this.o.mode === "amounts" && live.length > 0 ? 1 : 0;
        if (Math.abs(diff) <= tol) continue;
        const fresh = live.length === 0;
        const n = fresh ? Math.abs(diff) : Math.min(Math.abs(diff) - tol, Math.max(1, Math.round(Math.abs(diff) * 0.08)));
        const bulk = fresh || Math.abs(diff) > 3;
        const leak = this.pathways.findIndex((pw) => pw.kind === "channel" && pw.ions?.length === 1 && pw.ions[0] === ion);
        if (where === "in" && this.o.mode === "amounts" && !fresh && leak >= 0) {
          // a correction is a visible crossing through the ion's own leak, never a dot from nowhere
          for (let i = 0; i < n; i++) this.transfer(leak, ion, diff > 0 ? -1 : +1);
          continue;
        }
        if (diff > 0) for (let i = 0; i < n; i++) this.spawn(ion, where, g, where === "out" && !bulk);
        else for (let i = 0; i < n; i++) {
          // the bath gives up dots far from the cell, where nobody is looking
          let pick = live[(Math.random() * live.length) | 0];
          if (where === "out") pick = live.reduce((a, b) => (Math.hypot(b.x - g.cx, b.y - g.cy) > Math.hypot(a.x - g.cx, a.y - g.cy) ? b : a), pick);
          pick.dying = true; live.splice(live.indexOf(pick), 1);
        }
      }
    }
    // a slow, smooth wander (depiction only)
    const tau = 1.2, sig = this.o.wander;
    for (const q of this.parts) {
      if (q.busy) continue;
      const big = q.ion === "A" ? 0.35 : 1;
      q.vx += (-q.vx / tau) * dt + sig * big * Math.sqrt(dt) * gauss();
      q.vy += (-q.vy / tau) * dt + sig * big * Math.sqrt(dt) * gauss();
      q.x += q.vx * dt; q.y += q.vy * dt;
      const d = Math.hypot(q.x - g.cx, q.y - g.cy) || 1;
      if (q.where === "in" && d > g.R - 10) { const k = (g.R - 10) / d; q.x = g.cx + (q.x - g.cx) * k; q.y = g.cy + (q.y - g.cy) * k; q.vx *= -0.5; q.vy *= -0.5; }
      if (q.where === "out") {
        if (d < g.R + 12) { const k = (g.R + 12) / d; q.x = g.cx + (q.x - g.cx) * k; q.y = g.cy + (q.y - g.cy) * k; q.vx *= -0.5; q.vy *= -0.5; }
        if (q.x < 6 || q.x > g.w - 6) q.vx *= -1;
        if (q.y < 6 || q.y > g.h - 6) q.vy *= -1;
        q.x = Math.max(6, Math.min(g.w - 6, q.x)); q.y = Math.max(6, Math.min(g.h - 6, q.y));
      }
      q.a = q.dying ? q.a - dt * 1.5 : Math.min(1, q.a + dt * 1.5);
    }
    this.parts = this.parts.filter((q) => !(q.dying && q.a <= 0));
    // crossings in flight
    for (const m of this.moving) {
      if (m.delay > 0) { m.delay -= dt; continue; }
      m.t += dt / m.dur;
      if (m.t >= 1 && m.part) {
        const q = m.part, [ex, ey] = this.mouth(m.p, g, m.dir > 0 ? g.R + 22 * g.k : g.R - 22 * g.k, m.da);
        // let it go moving away from the membrane, so crossed dots spread into the compartment instead of
        // piling up at the pore's mouth (Tony: "they're all stuck by the na leak channel")
        const a = this.pathways[m.p].angle + m.da, push = 28 + 2 * this.o.wander;
        q.x = ex; q.y = ey; q.vx = Math.cos(a) * push * m.dir; q.vy = Math.sin(a) * push * m.dir; q.where = m.dir > 0 ? "out" : "in"; q.busy = false; q.crossed = this.clock;
      }
    }
    this.moving = this.moving.filter((m) => m.t < 1);
    for (const f of this.flights) {
      f.t += dt / 0.6;
      if (f.t >= 1) { f.q.x = f.x1; f.q.y = f.y1; f.q.vx = 0; f.q.vy = 0; f.q.where = f.to; f.q.busy = false; }
    }
    this.flights = this.flights.filter((f) => f.t < 1);
  }
  // ---- the homeostat's hand: pick up a dot, carry it, let it go ----
  private held: Particle | null = null;
  private heldFrom: Where = "in";
  /** Pick up the nearest free dot of these species within reach of (x, y), in CSS px. */
  grab(x: number, y: number, ions: Species[], reach = 22) {
    let best: Particle | null = null, bd = reach;
    for (const q of this.parts) {
      if (q.busy || q.dying || !ions.includes(q.ion)) continue;
      const d = Math.hypot(q.x - x, q.y - y);
      if (d < bd) { bd = d; best = q; }
    }
    if (!best) return null;
    best.busy = true; this.held = best; this.heldFrom = best.where; this.heldAt = [best.x, best.y];
    return { ion: best.ion, from: best.where };
  }
  carry(x: number, y: number) { if (this.held) { this.held.x = x; this.held.y = y; } }
  /** Let go. Returns the crossing made, or null if the dot did not cross the membrane. */
  drop(): { ion: Species; dir: number } | null {
    const q = this.held;
    if (!q) return null;
    this.held = null; q.busy = false; q.vx = 0; q.vy = 0;
    const g = this.geometry(), d = Math.hypot(q.x - g.cx, q.y - g.cy);
    const to: Where = d > g.R + 4 ? "out" : d < g.R - 4 ? "in" : this.heldFrom;
    q.where = to;
    return to === this.heldFrom ? null : { ion: q.ion, dir: to === "out" ? 1 : -1 };
  }
  /**
   * A tap instead of a carry: the held dot glides straight across the membrane to the other side,
   * along its own radius. Returns the crossing it makes.
   */
  flick(): { ion: Species; dir: number } | null {
    const q = this.held;
    if (!q) return null;
    this.held = null;
    const g = this.geometry(), from = this.heldFrom, to: Where = from === "in" ? "out" : "in";
    const a = Math.atan2(q.y - g.cy, q.x - g.cx), r = to === "out" ? g.R + 22 * g.k : g.R - 22 * g.k;
    q.x = this.heldAt[0]; q.y = this.heldAt[1];
    this.flights.push({ q, x0: q.x, y0: q.y, x1: g.cx + Math.cos(a) * r, y1: g.cy + Math.sin(a) * r, t: 0, to });
    return { ion: q.ion, dir: to === "out" ? 1 : -1 };
  }
  private flights: { q: Particle; x0: number; y0: number; x1: number; y1: number; t: number; to: Where }[] = [];
  private heldAt: [number, number] = [0, 0];
  private pos(m: Crossing, g: ReturnType<CellStage["geometry"]>) {
    const rIn = g.R - 16 * g.k, rOut = g.R + 16 * g.k;
    const [ax, ay] = this.mouth(m.p, g, m.dir > 0 ? rIn : rOut, m.da);
    const [bx, by] = this.mouth(m.p, g, m.dir > 0 ? rOut : rIn, m.da);
    const ease = (u: number) => u * u * (3 - 2 * u);
    if (m.rim) {
      // from just inside (or outside) the pore to the far membrane face, where the rim is
      const [cx, cy] = this.mouth(m.p, g, m.dir > 0 ? g.R + 8 : g.R - 8, m.da * 3);
      if (m.t < 0.6) { const u = ease(m.t / 0.6); return [ax + (bx - ax) * u, ay + (by - ay) * u]; }
      const u = ease((m.t - 0.6) / 0.4); return [bx + (cx - bx) * u, by + (cy - by) * u];
    }
    const [ex, ey] = this.mouth(m.p, g, m.dir > 0 ? g.R + 22 * g.k : g.R - 22 * g.k, m.da);
    // walk to the pore at a dot's pace, through it in half a second, then a short step clear
    const T = m.t * m.dur, w = m.walk ?? 0.35;
    if (T < w) { const u = ease(T / w); return [m.x0 + (ax - m.x0) * u, m.y0 + (ay - m.y0) * u]; }
    if (T < w + 0.5) { const u = ease((T - w) / 0.5); return [ax + (bx - ax) * u, ay + (by - ay) * u]; }
    const u = ease(Math.min(1, (T - w - 0.5) / 0.4)); return [bx + (ex - bx) * u, by + (ey - by) * u];
  }
  draw() {
    const g = this.geometry();
    const { ctx } = fit(this.c, this.o.height);
    const view = viewPref.view;
    ctx.fillStyle = STAGE.bath; ctx.fillRect(0, 0, g.w, g.h);
    ctx.fillStyle = STAGE.cyto; ctx.beginPath(); ctx.arc(g.cx, g.cy, g.R, 0, 2 * Math.PI); ctx.fill();
    const focus = view === "focus";
    if (focus) this.drawFocusHaze(ctx, g);
    // the membrane, its charge and its proteins first; then every ion on top, so none hides behind a pore
    // (Tony: "the pore is a black rectangle that some ions can hide behind or get cutoff")
    ctx.strokeStyle = cssVar("--membrane"); ctx.lineWidth = STAGE.membraneWidth; ctx.globalAlpha = 0.9;
    ctx.beginPath(); ctx.arc(g.cx, g.cy, g.R, 0, 2 * Math.PI); ctx.stroke(); ctx.globalAlpha = 1;
    this.drawRim(ctx, g);
    this.pathways.forEach((pw) => this.drawPathway(ctx, g, pw));
    for (const q of this.parts) if (!q.busy) glyph(ctx, q.ion, q.x, q.y, q.ion === "A" ? STAGE.aR : STAGE.dotR, Math.max(0, q.a) * (focus ? 0.1 : 0.95));
    if (focus) for (const d of this.vdots) glyph(ctx, d.ion, d.x, d.y, 3.4, Math.max(0, d.a));
    if (!focus) this.drawBound(ctx, g);
    for (const m of this.moving) {
      if (m.delay > 0 || focus) continue; // crossings are at the bulk scale; the focus view has its own
      const [x, y] = this.pos(m, g);
      if (m.rim) {
        ctx.save(); ctx.globalAlpha = m.t > 0.85 ? (1 - m.t) / 0.15 : 1;
        ctx.strokeStyle = color(m.ion); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(x, y, 3.2, 0, 2 * Math.PI); ctx.stroke(); ctx.restore();
      } else glyph(ctx, m.ion, x, y, STAGE.crossR, 1);
    }
    if (this.held) { const q = this.held; glyph(ctx, q.ion, q.x, q.y, 6, 1); } // the homeostat's hand (docs/adr/0014)
    for (const f of this.flights) {
      const u = f.t * f.t * (3 - 2 * f.t);
      glyph(ctx, f.q.ion, f.x0 + (f.x1 - f.x0) * u, f.y0 + (f.y1 - f.y0) * u, 4.5, 1);
    }
    if (focus) this.drawFocusLabels(ctx, g);
    else this.drawScale(ctx, g);
    if (view === "lens") this.drawLens(ctx, g);
    if (view === "census") this.drawCensus(ctx, g);
  }
  // ---------- the three other views (docs/adr/0016) ----------
  private lensLayout(g: ReturnType<CellStage["geometry"]>) {
    const bx = g.w * 0.47, by = 12, bw = g.w - bx - 10, bh = g.h - 24, mid = bx + bw / 2;
    return { bx, by, bw, bh, mid, inR: [bx + 8, by + 34, bw / 2 - 22, bh - 84], outR: [mid + 14, by + 34, bw / 2 - 22, bh - 84] };
  }
  /** Where a view's dot may sit: a rectangle, or inside / outside the cell. */
  private region(where: Where, g: ReturnType<CellStage["geometry"]>): number[] | "in" | "out" {
    const v = viewPref.view;
    if (v === "census") { const L = this.lensLayout(g); return where === "in" ? L.inR : L.outR; }
    if (v === "lens") { const L = this.lensLayout(g); return where === "in" ? L.inR : L.outR; }
    return where;
  }
  private focusCounts(g: ReturnType<CellStage["geometry"]>) {
    const ion = viewPref.ion, ci = this.inside[ion], co = this.outside[ion];
    if (ci === undefined || co === undefined) return null;
    if (!this.vDens) this.vDens = 12 / (Math.PI * g.R0 * g.R0 * Math.max(1e-12, Math.min(ci, co))); // the dilute side gets ~12 dots
    return { ion, ci, co, nIn: ci * Math.PI * g.R * g.R * this.vDens, nOut: co * (g.w * g.h - Math.PI * g.R * g.R) * this.vDens };
  }
  private stepView(dt: number, g: ReturnType<CellStage["geometry"]>) {
    this.clock += dt;
    const view = viewPref.view, HAZE = FOCUS_HAZE;
    const key = `${view}|${viewPref.ion}|${Math.round(g.w / 3)}`;
    if (key !== this.vKey) { this.vKey = key; this.vdots = []; this.vDens = 0; }
    const targets: { ion: Species; where: Where; n: number }[] = [];
    if (view === "focus") {
      const f = this.focusCounts(g);
      if (f) targets.push({ ion: f.ion, where: "in", n: f.nIn > HAZE ? 0 : Math.round(f.nIn) }, { ion: f.ion, where: "out", n: f.nOut > HAZE ? 0 : Math.round(f.nOut) });
    } else if (view === "census") {
      const ca = this.inside.Ca;
      if (ca !== undefined) { const n = Math.round(ca * IONS_PER_UM3_PER_MM); targets.push({ ion: "Ca", where: "in", n: n > 500 ? 0 : n }); }
    } else if (view === "lens") {
      const per = (IONS_PER_UM3_PER_MM * 1e-3) / 500; // dots per mM in a 100 nm cube, at 500 ions a dot
      for (const ion of ["K", "Na", "Cl", "A"] as Species[]) { const c = this.inside[ion]; if (c !== undefined) targets.push({ ion, where: "in", n: Math.round(c * per) }); }
      for (const ion of ["Na", "Cl", "K", "Ca"] as Species[]) { const c = this.outside[ion]; if (c !== undefined) targets.push({ ion, where: "out", n: Math.round(c * per) }); }
      // free Ca²⁺ inside a 100 nm cube: a fraction of one ion on average, so now and then one visits
      const mu = (this.inside.Ca ?? 0) * IONS_PER_UM3_PER_MM * 1e-3;
      if (this.clock > this.caVisit.until) {
        let k = 0, p = Math.exp(-mu), acc = p; const u = Math.random();
        while (u > acc && k < 50) { k++; p *= mu / k; acc += p; }
        this.caVisit = { n: k, until: this.clock + 1.5 };
      }
    }
    for (const t of targets) {
      const live = this.vdots.filter((d) => d.ion === t.ion && d.where === t.where && !d.dying);
      const diff = t.n - live.length;
      const n = live.length === 0 ? Math.abs(diff) : Math.max(1, Math.round(Math.abs(diff) * 0.1));
      const reg = this.region(t.where, g);
      if (diff > 0) for (let i = 0; i < Math.min(n, diff); i++) {
        const at = Array.isArray(reg) ? [reg[0] + Math.random() * reg[2], reg[1] + Math.random() * reg[3]] : this.place(reg, g);
        if (at) this.vdots.push({ ion: t.ion, where: t.where, x: at[0], y: at[1], vx: 0, vy: 0, a: live.length === 0 ? 1 : 0, dying: false });
      } else if (diff < 0) for (let i = 0; i < Math.min(n, -diff); i++) live[(Math.random() * live.length) | 0].dying = true;
    }
    for (const d of this.vdots) {
      d.vx += (-d.vx / 1.2) * dt + 9 * Math.sqrt(dt) * gauss();
      d.vy += (-d.vy / 1.2) * dt + 9 * Math.sqrt(dt) * gauss();
      d.x += d.vx * dt; d.y += d.vy * dt;
      const reg = this.region(d.where, g);
      if (Array.isArray(reg)) {
        if (d.x < reg[0] || d.x > reg[0] + reg[2]) d.vx *= -1;
        if (d.y < reg[1] || d.y > reg[1] + reg[3]) d.vy *= -1;
        d.x = Math.max(reg[0], Math.min(reg[0] + reg[2], d.x)); d.y = Math.max(reg[1], Math.min(reg[1] + reg[3], d.y));
      } else {
        const r = Math.hypot(d.x - g.cx, d.y - g.cy) || 1;
        if (reg === "in" && r > g.R - 10) { const k = (g.R - 10) / r; d.x = g.cx + (d.x - g.cx) * k; d.y = g.cy + (d.y - g.cy) * k; d.vx *= -0.5; d.vy *= -0.5; }
        if (reg === "out") {
          if (r < g.R + 12) { const k = (g.R + 12) / r; d.x = g.cx + (d.x - g.cx) * k; d.y = g.cy + (d.y - g.cy) * k; d.vx *= -0.5; d.vy *= -0.5; }
          d.x = Math.max(6, Math.min(g.w - 6, d.x)); d.y = Math.max(6, Math.min(g.h - 6, d.y));
        }
      }
      d.a = d.dying ? d.a - dt * 1.5 : Math.min(1, d.a + dt * 1.5);
    }
    this.vdots = this.vdots.filter((d) => !(d.dying && d.a <= 0));
  }
  private tag(ctx: CanvasRenderingContext2D, t: string, x: number, y: number, align: CanvasTextAlign, col = cssVar("--muted"), font = "11px system-ui, sans-serif") {
    ctx.font = font; ctx.textAlign = align; ctx.textBaseline = "middle";
    const wd = ctx.measureText(t).width, x0 = align === "right" ? x - wd : align === "center" ? x - wd / 2 : x;
    ctx.fillStyle = "rgba(13,17,23,0.85)"; ctx.fillRect(x0 - 5, y - 9, wd + 10, 18);
    ctx.fillStyle = col; ctx.fillText(t, x, y);
  }
  private haze(ctx: CanvasRenderingContext2D, ion: Species, clip: () => void, box: number[]) {
    ctx.save(); ctx.beginPath(); clip(); ctx.clip("evenodd");
    ctx.fillStyle = color(ion); ctx.globalAlpha = 0.2; ctx.fillRect(box[0], box[1], box[2], box[3]);
    ctx.globalAlpha = 0.55;
    for (const [u, v] of SPECKLE) ctx.fillRect(box[0] + u * box[2], box[1] + v * box[3], 1.4, 1.4);
    ctx.restore();
  }
  private drawFocusHaze(ctx: CanvasRenderingContext2D, g: ReturnType<CellStage["geometry"]>) {
    const f = this.focusCounts(g);
    if (!f) return;
    if (f.nOut > FOCUS_HAZE) this.haze(ctx, f.ion, () => { ctx.rect(0, 0, g.w, g.h); ctx.moveTo(g.cx + g.R, g.cy); ctx.arc(g.cx, g.cy, g.R, 0, 2 * Math.PI, true); }, [0, 0, g.w, g.h]);
    if (f.nIn > FOCUS_HAZE) this.haze(ctx, f.ion, () => { ctx.arc(g.cx, g.cy, g.R, 0, 2 * Math.PI); }, [g.cx - g.R, g.cy - g.R, 2 * g.R, 2 * g.R]);
  }
  private drawFocusLabels(ctx: CanvasRenderingContext2D, g: ReturnType<CellStage["geometry"]>) {
    const f = this.focusCounts(g);
    if (!f) { this.tag(ctx, `${LABEL[viewPref.ion]}: not in this cell's model here`, 10, 14, "left"); return; }
    const ipd = (this.o.cellVolume * NA) / (Math.PI * g.R0 * g.R0 * this.vDens); // ions per mM in the cell ÷ dots per mM
    const ratio = Math.max(f.ci, f.co) / Math.min(f.ci, f.co);
    const r = ratio >= 100 ? Math.round(ratio).toLocaleString("en-US") : ratio.toFixed(1);
    const outer = f.co > f.ci, hazed = outer ? f.nOut > FOCUS_HAZE : f.nIn > FOCUS_HAZE;
    this.tag(ctx, `${LABEL[f.ion]} only (others faded)`, 10, 14, "left", color(f.ion), "600 12px system-ui, sans-serif");
    this.tag(ctx, "inside", g.cx, g.cy - g.R + 22, "center");
    this.tag(ctx, `${outer ? "outside" : "inside"}: ${r}× denser than ${outer ? "inside" : "outside"}${hazed ? ", drawn as a haze" : ""}`, g.w - 10, g.h - 28, "right", color(f.ion), "600 12px system-ui, sans-serif");
    const big = (x: number) => (x >= 1e9 ? (x / 1e9).toFixed(1) + " billion" : x >= 1e6 ? (x / 1e6).toFixed(1) + " million" : Math.round(x).toLocaleString("en-US"));
    this.tag(ctx, `this view: each ${LABEL[f.ion]} dot ≈ ${big(ipd)} ions`, g.w - 10, g.h - 10, "right");
  }
  /**
   * The census, in the magnifier's layout (docs/adr/0016): a marker on the cell, and a panel showing one cubic
   * micrometer on each side of the membrane with real counts. Inside, every free Ca²⁺ is drawn, one ring per ion.
   */
  private drawCensus(ctx: CanvasRenderingContext2D, g: ReturnType<CellStage["geometry"]>) {
    const L = this.lensLayout(g), acc = cssVar("--accent"), narrow = g.w < 640;
    const mx = g.cx + g.R, my = g.cy, ms = 10 * g.k;
    ctx.strokeStyle = acc; ctx.lineWidth = 2; ctx.strokeRect(mx - ms, my - ms, 2 * ms, 2 * ms);
    ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(mx + ms, my - ms); ctx.lineTo(L.bx, L.by); ctx.moveTo(mx + ms, my + ms); ctx.lineTo(L.bx, L.by + L.bh); ctx.stroke();
    ctx.save(); ctx.beginPath(); ctx.roundRect(L.bx, L.by, L.bw, L.bh, 12); ctx.clip();
    ctx.fillStyle = STAGE.cyto; ctx.fillRect(L.bx, L.by, L.bw / 2, L.bh);
    ctx.fillStyle = STAGE.bath; ctx.fillRect(L.mid, L.by, L.bw / 2, L.bh);
    ctx.fillStyle = cssVar("--membrane"); ctx.fillRect(L.mid - 7, L.by, 14, L.bh);
    const coCa = this.outside.Ca, ciCa = this.inside.Ca;
    if (coCa !== undefined) this.haze(ctx, "Ca", () => ctx.rect(L.outR[0], L.outR[1], L.outR[2], L.outR[3]), L.outR);
    // every free Ca²⁺ ion inside, one ring each (a dot elsewhere is billions; here a ring is one ion)
    ctx.strokeStyle = color("Ca"); ctx.lineWidth = 1.6;
    for (const d of this.vdots) { ctx.globalAlpha = Math.max(0, d.a); ctx.beginPath(); ctx.arc(d.x, d.y, 3.2, 0, 2 * Math.PI); ctx.stroke(); }
    ctx.globalAlpha = 1;
    ctx.restore();
    ctx.strokeStyle = acc; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(L.bx, L.by, L.bw, L.bh, 12); ctx.stroke();
    const fmt = (n: number) => (n >= 1e6 ? (n / 1e6).toFixed(1) + " million" : n >= 1e4 ? Math.round(n / 1000) + " thousand" : Math.round(n).toLocaleString("en-US"));
    this.tag(ctx, narrow ? "in, 1 µm³" : "inside: one cubic micrometer", L.bx + L.bw / 4, L.by + 16, "center", cssVar("--text"));
    this.tag(ctx, narrow ? "out, 1 µm³" : "outside: one cubic micrometer", L.mid + L.bw / 4, L.by + 16, "center", cssVar("--text"));
    if (ciCa !== undefined) this.tag(ctx, `${fmt(ciCa * IONS_PER_UM3_PER_MM)} Ca²⁺${narrow ? "" : ", each ring one ion"}`, L.bx + L.bw / 4, L.by + 38, "center", color("Ca"), "700 12px system-ui, sans-serif");
    if (coCa !== undefined) this.tag(ctx, `${fmt(coCa * IONS_PER_UM3_PER_MM)} Ca²⁺`, L.mid + L.bw / 4, L.by + 38, "center", color("Ca"), "700 12px system-ui, sans-serif");
    // the other ions, counted, at the foot of each half
    const rows: Species[] = ["K", "Na", "Cl"];
    rows.forEach((ion, i) => {
      const ci = this.inside[ion], co = this.outside[ion], y = L.by + L.bh - 14 - (rows.length - 1 - i) * 18;
      if (ci !== undefined) this.tag(ctx, `${LABEL[ion]} ${fmt(ci * IONS_PER_UM3_PER_MM)}`, L.bx + L.bw / 4, y, "center", color(ion));
      if (co !== undefined) this.tag(ctx, `${LABEL[ion]} ${fmt(co * IONS_PER_UM3_PER_MM)}`, L.mid + L.bw / 4, y, "center", color(ion));
    });
  }
  private drawLens(ctx: CanvasRenderingContext2D, g: ReturnType<CellStage["geometry"]>) {
    const L = this.lensLayout(g), acc = cssVar("--accent");
    const lx = g.cx + g.R, ly = g.cy, lr = 14 * g.k;
    ctx.strokeStyle = acc; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(lx, ly, lr, 0, 2 * Math.PI); ctx.stroke();
    ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(lx + lr * 0.7, ly - lr * 0.7); ctx.lineTo(L.bx, L.by); ctx.moveTo(lx + lr * 0.7, ly + lr * 0.7); ctx.lineTo(L.bx, L.by + L.bh); ctx.stroke();
    ctx.save(); ctx.beginPath(); ctx.roundRect(L.bx, L.by, L.bw, L.bh, 12); ctx.clip();
    ctx.fillStyle = STAGE.cyto; ctx.fillRect(L.bx, L.by, L.bw / 2, L.bh);
    ctx.fillStyle = STAGE.bath; ctx.fillRect(L.mid, L.by, L.bw / 2, L.bh);
    ctx.fillStyle = cssVar("--membrane"); ctx.fillRect(L.mid - 7, L.by, 14, L.bh);
    for (const d of this.vdots) glyph(ctx, d.ion, d.x, d.y, d.ion === "Ca" ? 3.6 : d.ion === "A" ? 3 : 2.6, Math.max(0, d.a));
    // a visiting free Ca²⁺ is a single ion, not a dot of 500: drawn as a ring
    for (let i = 0; i < this.caVisit.n; i++) {
      const x = L.inR[0] + L.inR[2] * (0.3 + 0.2 * i), y = L.inR[1] + L.inR[3] * 0.4;
      ctx.strokeStyle = color("Ca"); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, 5, 0, 2 * Math.PI); ctx.stroke();
    }
    ctx.restore();
    ctx.strokeStyle = acc; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(L.bx, L.by, L.bw, L.bh, 12); ctx.stroke();
    const narrow = g.w < 640;
    this.tag(ctx, narrow ? "in" : "inside: a 100 nm cube", L.bx + L.bw / 4, L.by + 16, "center", cssVar("--text"));
    this.tag(ctx, narrow ? "out" : "outside: a 100 nm cube", L.mid + L.bw / 4, L.by + 16, "center", cssVar("--text"));
    const mu = (this.inside.Ca ?? 0) * IONS_PER_UM3_PER_MM * 1e-3, out = (this.outside.Ca ?? 0) * IONS_PER_UM3_PER_MM * 1e-3;
    if (this.inside.Ca !== undefined) this.tag(ctx, narrow ? `Ca²⁺ ${mu.toFixed(2)} avg` : mu < 1 ? `free Ca²⁺: ${mu.toFixed(2)} ions on average; usually none${this.caVisit.n ? " (one is visiting)" : ""}` : `free Ca²⁺: ${mu.toFixed(0)} ions`, L.bx + L.bw / 4, L.by + L.bh - 34, "center", color("Ca"));
    if (this.outside.Ca !== undefined) this.tag(ctx, narrow ? `Ca²⁺ ${Math.round(out).toLocaleString("en-US")}` : `Ca²⁺: ${Math.round(out).toLocaleString("en-US")} ions (${Math.round(out / 500)} dots)`, L.mid + L.bw / 4, L.by + L.bh - 34, "center", color("Ca"));
    this.tag(ctx, narrow ? "100 nm cubes · dot ≈ 500 ions" : "lens: each dot ≈ 500 ions; a ring is one Ca²⁺ ion", L.bx + L.bw - 8, L.by + L.bh - 12, "right");
  }
  private drawRim(ctx: CanvasRenderingContext2D, g: ReturnType<CellStage["geometry"]>) {
    if (this.V === null || Math.abs(this.V) < 0.5) return;
    const ions = (0.01 * 4 * Math.PI * 1e-10 * Math.abs(this.V / 1000)) / 1.602176634e-19; // C·V/e for the 10 µm cell
    const n = Math.min(160, Math.round(ions / IONS_PER_SIGN));
    const neg = this.V < 0;
    ctx.save();
    ctx.font = "700 11px system-ui, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    for (let i = 0; i < n; i++) {
      const a = (i / Math.max(n, 1)) * 2 * Math.PI + 0.013;
      for (const [r, s] of [[g.R + STAGE.rimR, neg ? "+" : "−"], [g.R - STAGE.rimR, neg ? "−" : "+"]] as const) {
        ctx.fillStyle = s === "+" ? STAGE.rimPlus : STAGE.rimMinus;
        ctx.fillText(s, g.cx + Math.cos(a) * r, g.cy + Math.sin(a) * r);
      }
    }
    ctx.restore();
  }
  private drawScale(ctx: CanvasRenderingContext2D, g: ReturnType<CellStage["geometry"]>) {
    const ipd = this.ionsPerDot();
    const big = (x: number) => (x >= 1e9 ? (x / 1e9).toFixed(0) + " billion" : (x / 1e6).toFixed(0) + " million");
    const tag = (t: string, x: number, y: number, align: CanvasTextAlign) => {
      ctx.font = "11px system-ui, sans-serif"; ctx.textAlign = align; ctx.textBaseline = "middle";
      const wd = ctx.measureText(t).width, x0 = align === "right" ? x - wd : align === "center" ? x - wd / 2 : x;
      ctx.fillStyle = "rgba(13,17,23,0.82)"; ctx.fillRect(x0 - 5, y - 8, wd + 10, 16);
      ctx.fillStyle = cssVar("--muted"); ctx.fillText(t, x, y);
    };
    tag("outside (bath)", 10, 14, "left");
    tag("inside", g.cx, g.cy - g.R + 22, "center");
    const lens = viewPref.view === "lens" || viewPref.view === "census", sx = lens ? 10 : g.w - 10, al: CanvasTextAlign = lens ? "left" : "right";
    tag(`each dot ≈ ${big(ipd)} ions`, sx, lens ? 34 : g.h - 28, al);
    tag(lens ? `each ± ≈ ${Math.round(IONS_PER_SIGN / 1000)},000 ions` : `each ± on the membrane ≈ ${Math.round(IONS_PER_SIGN / 1000)},000 ions`, sx, lens ? 52 : g.h - 11, al);
    if (this.thinning > 1.5 && !lens) tag(`clock this fast: 1 in ${Math.round(this.thinning)} crossings shown, both ways alike`, sx, g.h - 45, al);
  }
  /** Ions held by a transport protein: walking to its slots, then riding in the cleft until released. */
  private drawBound(ctx: CanvasRenderingContext2D, g: ReturnType<CellStage["geometry"]>) {
    for (const [p, pr] of this.prot) {
      if (!this.pathways[p]) continue;
      const pw = this.pathways[p];
      if (pw.kind === "pump" || pw.kind === "pmca") this.drawNucleotide(ctx, g, p, pw, pr);
      for (const b of pr.bound) {
        if (!b.q.busy) continue;
        const [sx, sy] = this.slotXY(p, g, pr, b.slot);
        const u = pr.phase === "bind" ? Math.min(1, (pr.clock - b.start) / b.walk) : 1, e = u * u * (3 - 2 * u);
        glyph(ctx, b.q.ion, b.x0 + (sx - b.x0) * e, b.y0 + (sy - b.y0) * e, STAGE.crossR, 1);
      }
    }
  }
  /**
   * An ATPase's nucleotide site, on its cytoplasmic domain, always visible: ATP docked; split, with ADP drifting away
   * into the cytoplasm and the phosphate (P) riding on the pump; empty while it carries the phosphate, or when the
   * pump is stopped. Cotransporters have none: that is how the eye tells them apart (docs/adr/0018).
   */
  /** Whether ATP sits in a pump's star-shaped site right now. */
  private atpDocked(pw: Pathway, pr: Protein) {
    if (pw.on === false) return false;
    if (pw.kind === "pmca") return Math.sin(pw.phase || 0) <= 0;
    return pr.atpIn >= 0.6;
  }
  /**
   * An ATPase's nucleotide, around its star-shaped site (docs/adr/0018): an ATP star waits in the cytoplasm and docks;
   * as the pump closes on its Na⁺ the star breaks: one point stays on the pump as its phosphate (P), and the rest, a
   * four-pointed ADP, drifts away; a fresh ATP waits and docks when the pump has come back. Drawn upright.
   */
  private drawNucleotide(ctx: CanvasRenderingContext2D, g: ReturnType<CellStage["geometry"]>, p: number, pw: Pathway, pr: Protein) {
    if (pw.on === false) return; // a stopped pump: no ATP at hand (rundown), or none it can use (ouabain)
    const accent = cssVar("--accent");
    const star = (lx: number, ly: number, n: number, alpha: number, r = 5.2) => {
      const [x, y] = this.local(p, g, lx, ly);
      ctx.save(); ctx.globalAlpha = alpha; starPath(ctx, x, y, r, r * 0.44, n); ctx.fillStyle = accent; ctx.fill(); ctx.restore();
    };
    const pmca = pw.kind === "pmca";
    const phos = pmca ? Math.sin(pw.phase || 0) > 0 : pr.phos;
    const atpIn = pmca ? (phos ? -1 : 99) : pr.atpIn;
    const bob = Math.sin(this.clock * 2.2 + p) * 1.5;
    if (atpIn < 0) star(SITE_X + 4, 32 + bob, 5, 0.95); // ATP in waiting, in the cytoplasm beside the empty site
    else if (atpIn < 0.6) { const u = atpIn / 0.6, e = u * u * (3 - 2 * u); star(SITE_X + 4 * (1 - e), 32 + (SITE_Y - 32) * e, 5, 1); } // docking
    if (!pmca && pr.adpT < 1.4) { const u = pr.adpT / 1.4; star(SITE_X + 8 * u, SITE_Y + 34 * u, 4, 1 - u, 4.4); } // ADP leaving
    if (phos) { // the phosphate, the point that broke off, riding on the pump
      const [x, y] = this.local(p, g, -SITE_X, SITE_Y);
      ctx.save(); ctx.fillStyle = accent; ctx.beginPath(); ctx.arc(x, y, 5, 0, 2 * Math.PI); ctx.fill();
      ctx.fillStyle = "#0d1117"; ctx.font = "800 8px system-ui, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("P", x, y + 0.5);
      ctx.restore();
    }
  }
  /** The ions a protein's binding site holds, shown as hollow rings whether or not they are filled. */
  private siteIons(pw: Pathway, pr: Protein | undefined): Species[] {
    if (pr && pr.phase !== "idle" && pr.legs[pr.leg]) return pr.legs[pr.leg].ions;
    if (pw.kind === "pump") return (pr ? pr.o : -1) < 0 ? ["Na", "Na", "Na"] : ["K", "K"];
    if (pw.kind === "nkcc1") return ["Na", "K", "Cl", "Cl"];
    if (pw.kind === "kcc2") return ["K", "Cl"];
    return ["Ca"];
  }
  private drawPathway(ctx: CanvasRenderingContext2D, g: ReturnType<CellStage["geometry"]>, pw: Pathway) {
    const k = g.k * 1.35;
    const x = g.cx + Math.cos(pw.angle) * g.R, y = g.cy + Math.sin(pw.angle) * g.R;
    ctx.save();
    ctx.translate(x, y); ctx.rotate(pw.angle + Math.PI / 2); ctx.scale(k, k);
    const col = pw.ions && pw.ions.length === 1 ? color(pw.ions[0]) : cssVar("--text");
    if (pw.kind === "channel") {
      ctx.fillStyle = STAGE.bath; ctx.fillRect(-6, -9, 12, 18);
      ctx.fillStyle = col; ctx.globalAlpha = 0.95;
      ctx.beginPath(); ctx.roundRect(-14, -12, 8, 24, 3); ctx.fill();
      ctx.beginPath(); ctx.roundRect(6, -12, 8, 24, 3); ctx.fill();
      ctx.globalAlpha = 1;
      if (!pw.open) { ctx.fillStyle = cssVar("--muted"); ctx.fillRect(-6, -2.5, 12, 5); }
    } else {
      // a transport protein: a body with a binding cleft that opens to one face (docs/adr/0017)
      const p = this.pathways.indexOf(pw), pr = this.protein(p); // PMCA too, so its ATP is drawn
      let o = pr ? pr.o : 1;
      if (pw.kind === "pmca") o = pw.on === false ? 0 : Math.sin(pw.phase || 0); // no Ca²⁺ dots to carry: it rocks at its rate
      const fill = pw.on === false ? STAGE.off : pw.kind === "pump" ? STAGE.pump : pw.kind === "pmca" ? cssVar("--ca") : pw.kind === "nkcc1" ? STAGE.nkcc1 : STAGE.kcc2;
      ctx.rotate(o * 0.16);
      const atpase = pw.kind === "pump" || pw.kind === "pmca";
      ctx.fillStyle = fill;
      ctx.beginPath(); ctx.roundRect(-17, -15, 34, 30, 8); ctx.fill();
      if (atpase) {
        // the ATP site: a star-shaped cutout on the cytoplasmic face (docs/adr/0018); an ATP star fills it when docked
        starPath(ctx, SITE_X, SITE_Y, 5.4, 2.4); ctx.fillStyle = STAGE.bath; ctx.fill();
        if (this.atpDocked(pw, pr)) {
          starPath(ctx, SITE_X, SITE_Y, 4.8, 2.1); ctx.fillStyle = cssVar("--accent"); ctx.fill();
        }
      }
      // the cleft: a dark wedge from the open face to the binding site
      const open = Math.abs(o), face = o >= 0 ? -15 : 15;
      if (open > 0.05) {
        ctx.fillStyle = STAGE.bath;
        ctx.beginPath(); ctx.moveTo(-9 * open - 2, face); ctx.lineTo(9 * open + 2, face); ctx.lineTo(4, 0); ctx.lineTo(-4, 0); ctx.closePath(); ctx.fill();
      }
      // the binding site: a hollow ring per ion it carries, always shown; a bound ion fills its ring
      const ions = this.siteIons(pw, pr);
      ions.forEach((ion, i) => {
        ctx.strokeStyle = color(ion); ctx.lineWidth = 1.4; ctx.globalAlpha = 0.95;
        ctx.beginPath(); ctx.arc((i - (ions.length - 1) / 2) * 6.5, 0, 2.8, 0, 2 * Math.PI); ctx.stroke();
        ctx.globalAlpha = 1;
      });
    }
    ctx.restore();
    if (pw.label) {
      const lx = g.cx + Math.cos(pw.angle) * (g.R + 40 * g.k), ly = g.cy + Math.sin(pw.angle) * (g.R + 40 * g.k);
      ctx.font = "600 12px system-ui, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.lineWidth = 3; ctx.strokeStyle = STAGE.bath; ctx.strokeText(pw.label, lx, ly);
      ctx.fillStyle = cssVar("--text"); ctx.fillText(pw.label, lx, ly);
    }
  }
}
