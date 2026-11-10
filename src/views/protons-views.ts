// protons-views.ts — the views only the protons page needs (docs/adr/0022): a pH gauge, the buffer ledger, and
// what the stage overlays in its cell view (flux arrows sized by rate, CO₂ crossing, carbonic anhydrase, metabolism).
// They draw what core/protons.ts computes and nothing else.

import { cssVar, color, fit, glyph, type CellStage } from "./draw.ts";
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

export interface Overlay { leak: number; nhe: number; nbc: number; metab: number; ref: number; clock: number; leakAngle: number; nheAngle: number; nbcAngle: number }

/**
 * Drawn on the stage after it draws, in the cell view only: a flux arrow on each pathway, its width set by the rate
 * (relative to the resting load); CO₂ crossing the lipid both ways (equal on both sides, so no net); carbonic
 * anhydrase's reaction; and the acid metabolism makes. Arrows are rates, not particles.
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
  const tag = (t: string, x: number, y: number, col = cssVar("--muted"), font = "11px system-ui, sans-serif") => {
    ctx.font = font; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    const tw = ctx.measureText(t).width;
    x = Math.max(tw / 2 + 6, Math.min(g.w - tw / 2 - 6, x)); // kept on the stage
    ctx.fillStyle = "rgba(13,17,23,0.85)"; ctx.fillRect(x - tw / 2 - 5, y - 9, tw + 10, 18);
    ctx.fillStyle = col; ctx.fillText(t, x, y);
  };
  // CO₂ crosses the lipid, not a protein, both ways alike (equal partial pressure on both sides)
  const ca = Math.PI * 0.72;
  for (let i = 0; i < 4; i++) {
    const u = ((o.clock * 0.25 + i / 4) % 1), dir = i % 2 ? 1 : -1;
    const r = dir > 0 ? g.R - 30 * g.k + u * 60 * g.k : g.R + 30 * g.k - u * 60 * g.k;
    const [x, y] = at(ca + (i - 1.5) * 0.06, r);
    glyph(ctx, "CO2", x, y, 4.5, Math.sin(u * Math.PI));
  }
  const [cx2, cy2] = at(ca, g.R + 52 * g.k);
  tag("CO₂ crosses the lipid freely", cx2, cy2);
  tag("CA: CO₂ + H₂O ⇌ H⁺ + HCO₃⁻", g.cx, g.cy + g.R * 0.32, cssVar("--text"), "12px system-ui, sans-serif");
  // metabolism, making acid inside
  const mx = g.cx - g.R * 0.25, my = g.cy - g.R * 0.25;
  ctx.setLineDash([3, 3]); ctx.strokeStyle = color("H"); ctx.lineWidth = 1.2; ctx.fillStyle = "#2a2236";
  ctx.beginPath(); ctx.ellipse(mx, my, 40 * g.k * 0.8, 17 * g.k * 0.8, 0, 0, 2 * Math.PI); ctx.fill(); ctx.stroke(); ctx.setLineDash([]);
  tag(o.metab > 0 ? "metabolism: acid" : "metabolism off", mx, my, o.metab > 0 ? color("H") : cssVar("--muted"));
  ctx.restore();
  void STAGE;
}
