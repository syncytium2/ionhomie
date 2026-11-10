// protons-views.ts — the views only the protons page needs (docs/adr/0022): a pH gauge, the buffer ledger, and
// what the stage overlays in its cell view (flux arrows sized by rate, CO₂ crossing, carbonic anhydrase).
// They draw what core/protons.ts computes and nothing else.

import { cssVar, color, fit, glyph, type CellStage } from "./draw.ts";

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

/** Ions per conversion CaView shows: its own stated scale (docs/adr/0011), like the membrane rim's. */
export const CA_IONS_PER_EVENT = 1e9;
interface Conversion { forward: boolean; t: number; dur: number; seed: number }

/**
 * Carbonic anhydrase, CO₂ + H₂O ⇌ H⁺ + HCO₃⁻, in the cytoplasm (CA II). The enzyme turns over about a million times a
 * second each way, so it flickers all the time; nearly all of that cancels. What is drawn is the model's net
 * (physics.ts, acid.ca), at its own stated scale: forward, a CO₂ crosses the lipid, reaches the enzyme, and leaves as an H⁺
 * and an HCO₃⁻; back, an H⁺ and an HCO₃⁻ meet at the enzyme and a CO₂ leaves across the lipid. The net CO₂ crossing is
 * exactly CA's net, since CO₂ inside is held equal to the bath's. A CO₂ step adds its whole hydration at once, as a burst.
 */
export class CaView {
  private events: Conversion[] = [];
  private acc = 0;
  private clock = 0;
  private net = 0; // mol/s
  private burstUntil = -1; private burstForward = true;
  /** Advance by dt real seconds, at the model's net rate (mol/s) and the clock's speed (0 when paused). */
  step(dt: number, caNet: number, speed: number) {
    this.clock += dt; this.net = caNet;
    this.acc += (Math.abs(caNet) * 6.02214076e23 * speed * dt) / CA_IONS_PER_EVENT;
    while (this.acc >= 1 && this.events.length < 24) { this.acc -= 1; this.events.push({ forward: caNet > 0, t: 0, dur: 2.2, seed: Math.random() }); }
    if (this.acc > 3) this.acc = 3;
    for (const e of this.events) e.t += dt / e.dur;
    this.events = this.events.filter((e) => e.t < 1);
  }
  /** What a CO₂ step hydrates at once (mol; negative runs it back), shown as a burst at this view's scale. */
  burst(mol: number) {
    const n = Math.min(24, Math.round((Math.abs(mol) * 6.02214076e23) / CA_IONS_PER_EVENT));
    for (let i = 0; i < n; i++) this.events.push({ forward: mol > 0, t: -i * 0.12, dur: 2.2, seed: Math.random() });
    this.burstUntil = this.clock + 3.5; this.burstForward = mol > 0;
  }
  draw(stage: CellStage, canvas: HTMLCanvasElement, co2Angle: number, ref: number) {
    const g = stage.geometry(), ctx = canvas.getContext("2d")!, narrow = g.w < 560;
    ctx.save();
    const ex = g.cx - g.R * 0.05, ey = g.cy + g.R * 0.3, r = 11 * g.k;
    const out: [number, number] = [g.cx + Math.cos(co2Angle) * (g.R + 34 * g.k), g.cy + Math.sin(co2Angle) * (g.R + 34 * g.k)];
    const mem: [number, number] = [g.cx + Math.cos(co2Angle) * (g.R - 18 * g.k), g.cy + Math.sin(co2Angle) * (g.R - 18 * g.k)];
    const ease = (u: number) => u * u * (3 - 2 * u);
    const lerp = (a: [number, number], b: [number, number], u: number): [number, number] => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u];
    // the conversions: CO₂ along out → membrane → enzyme, H⁺ and HCO₃⁻ on either side of the enzyme
    for (const e of this.events) {
      if (e.t < 0) continue;
      const u = e.forward ? e.t : 1 - e.t; // forward runs the path one way, back the other
      const spread = 26 * g.k, side = (e.seed - 0.5) * 0.8;
      const hAt: [number, number] = [ex - spread, ey + spread * (0.6 + side)], bAt: [number, number] = [ex + spread, ey + spread * (0.6 - side)];
      if (u < 0.55) { // the CO₂ leg
        const v = u / 0.55, [x, y] = v < 0.5 ? lerp(out, mem, ease(v / 0.5)) : lerp(mem, [ex, ey], ease((v - 0.5) / 0.5));
        glyph(ctx, "CO2", x, y, 4.5, Math.min(1, e.forward ? e.t * 6 : (1 - e.t) * 6));
      } else { // the H⁺ and HCO₃⁻ leg
        const v = ease((u - 0.55) / 0.45), a = e.forward ? Math.min(1, (1 - e.t) * 5) : Math.min(1, e.t * 5);
        const [hx, hy] = lerp([ex, ey], hAt, v), [bx, by] = lerp([ex, ey], bAt, v);
        glyph(ctx, "H", hx, hy, 4.2, a); glyph(ctx, "HCO3", bx, by, 4.2, a);
      }
    }
    // the enzyme: a gray body with its zinc at the active site, flickering with its turnover both ways
    const f = Math.sin(this.clock * 31) * 0.5 + Math.sin(this.clock * 47) * 0.5;
    ctx.save(); ctx.translate(ex, ey); ctx.rotate(f * 0.12);
    ctx.fillStyle = "rgba(142,154,175,0.18)"; ctx.beginPath(); ctx.arc(0, 0, r * (1.45 + 0.12 * f), 0, 2 * Math.PI); ctx.fill();
    ctx.fillStyle = "#8e9aaf"; ctx.beginPath(); ctx.ellipse(0, 0, r, r * 0.82, 0, 0, 2 * Math.PI); ctx.fill();
    ctx.fillStyle = "#cfd8e6"; ctx.beginPath(); ctx.arc(0, 0, 2.6, 0, 2 * Math.PI); ctx.fill(); // Zn²⁺
    ctx.restore();
    // its label, the reaction with the net way lit, and this view's scale
    const tag = (t: string, x: number, y: number, col: string, font = "11px system-ui, sans-serif") => {
      ctx.font = font; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      const tw = ctx.measureText(t).width; x = Math.max(tw / 2 + 6, Math.min(g.w - tw / 2 - 6, x)); y = Math.max(12, Math.min(g.h - 12, y));
      ctx.fillStyle = "rgba(13,17,23,0.82)"; ctx.fillRect(x - tw / 2 - 5, y - 9, tw + 10, 18);
      ctx.fillStyle = col; ctx.fillText(t, x, y);
    };
    const fwd = this.net > 0, strong = Math.abs(this.net) > ref * 0.02;
    tag(!strong ? "CA: CO₂ + H₂O ⇌ H⁺ + HCO₃⁻" : fwd ? "CA: CO₂ + H₂O → H⁺ + HCO₃⁻ (net)" : "CA: CO₂ + H₂O ← H⁺ + HCO₃⁻ (net)", ex, ey + r + 16, cssVar("--text"), "12px system-ui, sans-serif");
    // a CO₂ step's burst runs one way while the net, after it, may already run the other: say so while it plays
    if (this.clock < this.burstUntil) tag(this.burstForward ? "CO₂ step: a burst of hydration at once" : "CO₂ returned: a burst back to CO₂ at once", ex, ey - r - 16, color("CO2"), "600 12px system-ui, sans-serif");
    if (!narrow) tag(`~10⁶ turnovers/s each way per enzyme; each conversion shown ≈ ${CA_IONS_PER_EVENT / 1e9} billion, net`, ex, ey + r + 34, cssVar("--muted"));
    const [tx, ty] = [g.cx + Math.cos(co2Angle) * (g.R + 56 * g.k), g.cy + Math.sin(co2Angle) * (g.R + 56 * g.k)];
    tag(narrow ? "CO₂: net shown" : "CO₂ crosses the lipid; its net is shown", tx, ty, cssVar("--muted"));
    ctx.restore();
  }
}
