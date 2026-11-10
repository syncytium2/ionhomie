// protons-views.ts — the views only the protons page needs (docs/adr/0022): a pH gauge, the buffer ledger, and
// what the stage overlays in its cell view (flux arrows sized by rate, CO₂ crossing, carbonic anhydrase).
// They draw what core/protons.ts computes and nothing else.

import { cssVar, color, fit, glyph, type CellStage, type Held, type KeyExtra } from "./draw.ts";
import { STAGE } from "./stage-style.ts";

const mono = "12px ui-monospace, Menlo, monospace";

/** pH, inside against outside, on a linear pH scale, with the passive pHi dashed and Siesjö's measured 7.0 ticked. */
export function phGauge(canvas: HTMLCanvasElement, st: { pHi: number; pHo: number; passive: number; measured: number }) {
  const H = 116, { ctx, w } = fit(canvas, H);
  const lo = 5.8, hi = 7.8, x0 = 66, x1 = w - 14;
  const x = (p: number) => x0 + ((Math.max(lo, Math.min(hi, p)) - lo) / (hi - lo)) * (x1 - x0);
  ctx.font = "10px ui-monospace, Menlo, monospace"; ctx.textAlign = "center"; ctx.textBaseline = "top"; ctx.fillStyle = cssVar("--muted");
  for (let p = 6.0; p <= 7.61; p += 0.4) {
    ctx.strokeStyle = cssVar("--line"); ctx.beginPath(); ctx.moveTo(x(p), 6); ctx.lineTo(x(p), 58); ctx.stroke();
    ctx.fillText(p.toFixed(1), x(p), 62);
  }
  const row = (y: number, label: string, v: number, solid: boolean) => {
    ctx.fillStyle = cssVar("--text"); ctx.font = "12px system-ui, sans-serif"; ctx.textAlign = "left"; ctx.textBaseline = "middle";
    ctx.fillText(label, 6, y + 6);
    ctx.fillStyle = color("H");
    if (solid) ctx.fillRect(x0, y, x(v) - x0, 12);
    else { ctx.strokeStyle = color("H"); ctx.lineWidth = 1.5; ctx.strokeRect(x0, y + 1, x(v) - x0, 10); }
    ctx.font = mono; ctx.fillStyle = cssVar("--text"); ctx.textAlign = "right";
    const t = v.toFixed(2), tw = ctx.measureText(t).width;
    ctx.fillStyle = "rgba(13,17,23,0.85)"; ctx.fillRect(x(v) - tw - 8, y - 1, tw + 6, 14);
    ctx.fillStyle = cssVar("--text"); ctx.fillText(t, x(v) - 4, y + 6);
  };
  row(10, "inside", st.pHi, true);
  row(40, "outside", st.pHo, false);
  // the passive pHi (E_H = Vm) dashed, and the 7.0 Siesjö measured
  ctx.setLineDash([3, 3]); ctx.strokeStyle = cssVar("--text"); ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(x(st.passive), 4); ctx.lineTo(x(st.passive), 28); ctx.stroke(); ctx.setLineDash([]);
  ctx.strokeStyle = cssVar("--muted"); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x(st.measured), 4); ctx.lineTo(x(st.measured), 28); ctx.stroke();
  ctx.font = "11px system-ui, sans-serif"; ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.fillStyle = cssVar("--muted");
  ctx.fillText(`dashed: passive pHi ${st.passive.toFixed(2)}, where E_H = Vm`, 6, 88);
  ctx.fillText(`gray: ${st.measured.toFixed(1)}, as Siesjö's cell holds it`, 6, 104);
}

/**
 * The buffer ledger: since the cell last rested at pH0, how many H⁺ per µm³ stayed free and how many the buffers
 * took up (or gave back), on a log scale of its own (docs/adr/0011). The charge ledger's lesson, for protons.
 */
export function bufferLedger(canvas: HTMLCanvasElement, st: { pH0: number; pHi: number; freePerUm3: number; boundPerUm3: number; boundMm: number }) {
  const narrow = canvas.clientWidth < 440;
  const H = narrow ? 190 : 160, { ctx, w } = fit(canvas, H);
  ctx.textBaseline = "middle"; ctx.textAlign = "left";
  const d = st.pHi - st.pH0;
  if (Math.abs(d) < 0.005) {
    ctx.font = "13px system-ui, sans-serif"; ctx.fillStyle = cssVar("--muted");
    ctx.fillText(`pHi is at ${st.pH0.toFixed(2)}, where it started: nothing bound or freed yet.`, 8, 24);
    ctx.fillText("Stop the transporters and watch this fill.", 8, 46);
    return;
  }
  const fell = d < 0, x0 = 8, x1 = w - 8;
  const lx = (n: number) => x0 + (Math.log10(Math.max(1, n)) / 8) * (x1 - x0);
  const bar = (y: number, n: number, col: string, label: string) => {
    ctx.font = "12px system-ui, sans-serif"; ctx.fillStyle = cssVar("--text"); ctx.fillText(label, x0, y - 9);
    ctx.fillStyle = "#0d1117"; ctx.fillRect(x0, y, x1 - x0, 14);
    ctx.fillStyle = col; ctx.fillRect(x0, y, lx(n) - x0, 14);
  };
  const big = (n: number) => (n >= 1e6 ? (n / 1e6).toFixed(1) + " million" : Math.round(n).toLocaleString("en-US"));
  bar(24, Math.abs(st.freePerUm3), color("H"), `free H⁺ ${fell ? "added" : "removed"}: ${big(Math.abs(st.freePerUm3))} per µm³`);
  bar(64, Math.abs(st.boundPerUm3), cssVar("--a"), `H⁺ ${fell ? "taken up by" : "given back by"} buffers: ${big(Math.abs(st.boundPerUm3))} per µm³ (${Math.abs(st.boundMm).toFixed(1)} mM)`);
  ctx.font = "10px ui-monospace, Menlo, monospace"; ctx.fillStyle = cssVar("--muted"); ctx.textAlign = "center";
  for (let k = 0; k <= 8; k += 2) ctx.fillText(`10${["⁰", "", "²", "", "⁴", "", "⁶", "", "⁸"][k]}`, lx(10 ** k), 90);
  ctx.textAlign = "left"; ctx.font = "700 13px system-ui, sans-serif"; ctx.fillStyle = color("H");
  const ratio = Math.abs(st.boundPerUm3 / st.freePerUm3);
  const r = ratio >= 1000 ? (Math.round(ratio / 100) * 100).toLocaleString("en-US") : Math.round(ratio).toLocaleString("en-US");
  const say = `For every H⁺ that stayed free, ${r} were bound.`;
  if (narrow) { ctx.fillText("For every H⁺ that stayed free,", x0, 116); ctx.fillText(`${r} were bound.`, x0, 136); }
  else ctx.fillText(say, x0, 116);
  ctx.font = "11px system-ui, sans-serif"; ctx.fillStyle = cssVar("--muted");
  ctx.fillText(`since pHi ${st.pH0.toFixed(2)}; log scale`, x0, narrow ? 160 : 138);
}

export interface Overlay { leak: number; nhe: number; nbc: number; ref: number; leakAngle: number; nheAngle: number; nbcAngle: number }

/**
 * Drawn on the stage after it draws, in the cell view only: a flux arrow on each pathway, its width set by the rate
 * (relative to the resting load). Arrows are rates, not particles. Carbonic anhydrase and CO₂ are CaView's.
 */
export function overlay(stage: CellStage, canvas: HTMLCanvasElement, o: Overlay) {
  const g = stage.geometry(), ctx = canvas.getContext("2d")!;
  ctx.save();
  const at = (a: number, r: number): [number, number] => [g.cx + Math.cos(a) * r, g.cy + Math.sin(a) * r];
  const arrow = (a: number, rate: number, inward: boolean, col: string) => {
    if (rate <= o.ref * 0.02) return;
    const wdt = 1.5 + 6 * Math.sqrt(Math.min(2, rate / o.ref) / 2);
    const [xa, ya] = at(a, inward ? g.R + 30 * g.k : g.R - 32 * g.k), [xb, yb] = at(a, inward ? g.R - 32 * g.k : g.R + 30 * g.k);
    const ang = Math.atan2(yb - ya, xb - xa), hl = 7 + wdt;
    ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = wdt; ctx.lineCap = "round"; ctx.globalAlpha = 0.9;
    ctx.beginPath(); ctx.moveTo(xa, ya); ctx.lineTo(xb - Math.cos(ang) * hl * 0.8, yb - Math.sin(ang) * hl * 0.8); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(xb, yb);
    ctx.lineTo(xb - Math.cos(ang - 0.45) * hl, yb - Math.sin(ang - 0.45) * hl); ctx.lineTo(xb - Math.cos(ang + 0.45) * hl, yb - Math.sin(ang + 0.45) * hl);
    ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
  };
  const off = 0.26; // beside the pathway, clear of its label
  arrow(o.leakAngle + off, Math.max(0, o.leak), true, color("H"));
  arrow(o.leakAngle + off, Math.max(0, -o.leak), false, color("H"));
  arrow(o.nheAngle + off, o.nhe, false, color("H"));
  arrow(o.nbcAngle + off, o.nbc, true, color("HCO3"));
  ctx.restore();
}

/** The enzyme's shape, shared by the stage and the legend: a gray body with its zinc at the active site. */
export function drawEnzyme(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, wobble = 0) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(wobble * 0.12);
  ctx.fillStyle = "#8e9aaf"; ctx.beginPath(); ctx.ellipse(0, 0, r, r * 0.82, 0, 0, 2 * Math.PI); ctx.fill();
  ctx.fillStyle = "#cfd8e6"; ctx.beginPath(); ctx.arc(0, 0, Math.max(1.6, r * 0.24), 0, 2 * Math.PI); ctx.fill(); // Zn²⁺
  ctx.restore();
}
/** Carbonic anhydrase in the legend, with its equation (Tony: "add CA to the legend and put the equation there"). */
export const CA_KEY: KeyExtra = {
  draw: (ctx, x, y) => drawEnzyme(ctx, x, y, 7),
  text: "carbonic anhydrase (CA II): CO₂ + H₂O ⇌ H⁺ + HCO₃⁻",
  note: "about a million turnovers a second each way; the cell shows only the net, on the dots' scale",
};

interface Conversion { forward: boolean; t: number; dot: Held | null; x0: number; y0: number; h: number }

/**
 * Carbonic anhydrase, CO₂ + H₂O ⇌ H⁺ + HCO₃⁻, in the cytoplasm (CA II). It flickers all the time for its turnover each way,
 * nearly all of which cancels; what moves is the model's net (physics.ts, acid.ca), on the stage's own scale and thinned
 * like every crossing, so the HCO₃⁻ it uses or makes are the cell's own dots. Back (as at rest): an HCO₃⁻ dot walks to the
 * enzyme, meets an H⁺ from the buffers, and leaves as CO₂ across the lipid. Forward: a CO₂ crosses in, and leaves the enzyme
 * as an HCO₃⁻ dot and an H⁺ that the buffers take at once. A CO₂ step's hydration plays as one burst.
 */
export class CaView {
  private events: Conversion[] = [];
  private acc = 0;
  private clock = 0;
  private burstUntil = -1; private burstText = "";
  /** Advance by dt real seconds: net rate (mol/s), clock speed (0 when paused), ions per dot and the stage's thinning. */
  step(stage: CellStage, dt: number, caNet: number, speed: number, co2Angle: number) {
    this.clock += dt;
    const g = stage.geometry(), ex = g.cx - g.R * 0.05, ey = g.cy + g.R * 0.3;
    this.acc += (Math.abs(caNet) * NA * speed * dt) / stage.ionsPerDot() / Math.max(1, stage.thinning);
    while (this.acc >= 1 && this.events.length < 12) { this.acc -= 1; this.start(stage, caNet > 0, ex, ey); }
    if (this.acc > 2) this.acc = 2;
    for (const e of this.events) this.advance(stage, e, dt, ex, ey, co2Angle);
    this.events = this.events.filter((e) => e.t < 1);
  }
  /** Let go of any dots held mid-conversion (the stage is showing another view). */
  release(stage: CellStage) {
    for (const e of this.events) if (e.dot) { stage.letGo(e.dot, false); e.dot = null; }
    this.events = [];
  }
  /** What a CO₂ step hydrates at once (mol; negative runs it back): its dots, unthinned, as a burst. */
  burst(stage: CellStage, mol: number) {
    const g = stage.geometry(), ex = g.cx - g.R * 0.05, ey = g.cy + g.R * 0.3;
    const dots = (Math.abs(mol) * NA) / stage.ionsPerDot(), n = Math.min(12, Math.round(dots));
    for (let i = 0; i < n; i++) { this.start(stage, mol > 0, ex, ey); this.events[this.events.length - 1].t = -i * 0.25; }
    this.burstUntil = this.clock + 4;
    const b = (Math.abs(mol) * NA) / 1e9;
    this.burstText = `${mol > 0 ? "CO₂ step" : "CO₂ returned"}: ${b.toFixed(1)} billion HCO₃⁻ ${mol > 0 ? "made" : "used"} at once (${dots < 1.5 ? "about one dot" : `${Math.round(dots)} dots`})`;
  }
  private start(stage: CellStage, forward: boolean, ex: number, ey: number) {
    // back: it needs an HCO₃⁻ dot to use; if none is free, the event waits for one
    const dot = forward ? null : stage.takeDot("HCO3", "in", ex, ey);
    if (!forward && !dot) return;
    this.events.push({ forward, t: 0, dot, x0: dot ? dot.x : 0, y0: dot ? dot.y : 0, h: 0 });
  }
  private advance(stage: CellStage, e: Conversion, dt: number, ex: number, ey: number, co2Angle: number) {
    e.t += dt / 2.6;
    if (e.t < 0) return;
    if (!e.forward && e.dot) {
      if (e.t < 0.35) { const u = ease(e.t / 0.35); e.dot.x = e.x0 + (ex - e.x0) * u; e.dot.y = e.y0 + (ey - e.y0) * u; }
      else if (e.h === 0) { e.h = 1; stage.letGo(e.dot, true); e.dot = null; } // used: it becomes CO₂ (and water)
    }
    if (e.forward && e.t >= 0.6 && e.h === 0) {
      e.h = 1; // made: a new HCO₃⁻ dot leaves the enzyme
      const a = Math.random() * 2 * Math.PI;
      stage.addDot("HCO3", "in", ex + Math.cos(a) * 8, ey + Math.sin(a) * 8, Math.cos(a) * 30, Math.sin(a) * 30);
    }
    void co2Angle;
  }
  draw(stage: CellStage, canvas: HTMLCanvasElement, co2Angle: number) {
    const g = stage.geometry(), ctx = canvas.getContext("2d")!;
    ctx.save();
    const ex = g.cx - g.R * 0.05, ey = g.cy + g.R * 0.3, r = 11 * g.k;
    const out: [number, number] = [g.cx + Math.cos(co2Angle) * (g.R + 34 * g.k), g.cy + Math.sin(co2Angle) * (g.R + 34 * g.k)];
    const mem: [number, number] = [g.cx + Math.cos(co2Angle) * (g.R - 18 * g.k), g.cy + Math.sin(co2Angle) * (g.R - 18 * g.k)];
    const lerp = (a: [number, number], b: [number, number], u: number): [number, number] => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u];
    const co2At = (u: number) => (u < 0.5 ? lerp(out, mem, ease(u / 0.5)) : lerp(mem, [ex, ey], ease((u - 0.5) / 0.5)));
    for (const e of this.events) {
      if (e.t < 0) continue;
      if (e.dot) glyph(ctx, "HCO3", e.dot.x, e.dot.y, STAGE.crossR + 0.6, 1); // the HCO₃⁻ on its way to be used
      if (!e.forward) {
        // an H⁺ from the buffers meets it at the enzyme, then a CO₂ leaves across the lipid
        if (e.t > 0.2 && e.t < 0.42) glyph(ctx, "H", ex - 10, ey - 6, 3.6, Math.sin(((e.t - 0.2) / 0.22) * Math.PI));
        if (e.t >= 0.4) { const [x, y] = co2At(1 - (e.t - 0.4) / 0.6); glyph(ctx, "CO2", x, y, 4.5, Math.min(1, (1 - e.t) * 6)); }
      } else {
        // a CO₂ crosses in to the enzyme; it leaves as HCO₃⁻ (a dot of the cell's) and an H⁺ the buffers take at once
        if (e.t < 0.6) { const [x, y] = co2At(e.t / 0.6); glyph(ctx, "CO2", x, y, 4.5, Math.min(1, e.t * 8)); }
        else if (e.t < 0.85) glyph(ctx, "H", ex - 12, ey + 4, 3.6, Math.sin(((e.t - 0.6) / 0.25) * Math.PI));
      }
    }
    // the enzyme, flickering with its turnover both ways
    const f = Math.sin(this.clock * 31) * 0.5 + Math.sin(this.clock * 47) * 0.5;
    ctx.fillStyle = "rgba(142,154,175,0.18)"; ctx.beginPath(); ctx.arc(ex, ey, r * (1.45 + 0.12 * f), 0, 2 * Math.PI); ctx.fill();
    drawEnzyme(ctx, ex, ey, r, f);
    const tag = (t: string, x: number, y: number, col: string, font = "11px system-ui, sans-serif") => {
      ctx.font = font; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      const tw = ctx.measureText(t).width; x = Math.max(tw / 2 + 6, Math.min(g.w - tw / 2 - 6, x)); y = Math.max(12, Math.min(g.h - 12, y));
      ctx.fillStyle = "rgba(13,17,23,0.82)"; ctx.fillRect(x - tw / 2 - 5, y - 9, tw + 10, 18);
      ctx.fillStyle = col; ctx.fillText(t, x, y);
    };
    tag("CA", ex, ey + r + 13, cssVar("--text"), "600 12px system-ui, sans-serif");
    if (this.clock < this.burstUntil) tag(this.burstText, ex, ey - r - 16, color("CO2"), "600 12px system-ui, sans-serif");
    const [tx, ty] = [g.cx + Math.cos(co2Angle) * (g.R + 56 * g.k), g.cy + Math.sin(co2Angle) * (g.R + 56 * g.k)];
    tag("CO₂: net shown", tx, ty, cssVar("--muted"));
    ctx.restore();
  }
}
const NA = 6.02214076e23;
const ease = (u: number) => u * u * (3 - 2 * u);
