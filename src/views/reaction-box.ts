// reaction-box.ts — the step-through's sealed box of solution (docs/adr/0027): CO₂ + H₂O ⇌ H⁺ + HCO₃⁻ with no cell.
// It draws what core/reaction.ts computes. The dynamic equilibrium is shown three ways: conversions both ways at the
// arrows' rates (thinned alike when too fast, and the box says so), a running total for each direction beside the net,
// and one carbon followed.

import * as R from "../core/reaction.ts";
import { cssVar, glyph } from "./draw.ts";

const PER_DOT = 0.25; // mM per ring or triangle, CO₂ and HCO₃⁻ alike: one stated scale
const H = 440;
type Kind = "CO2" | "HCO3" | "A";
interface Dot { k: Kind; x: number; y: number; vx: number; vy: number; busy?: boolean; tag?: boolean }
interface Ev { d: Dot; fwd: boolean; t: number; hx: number; hy: number; swapped?: boolean }

function fmtR(r: number) {
  if (r >= 0.01) return r.toFixed(2);
  const [m, e] = r.toExponential(1).split("e");
  return `${m}×10${e.replace("-", "⁻").replace(/\d/g, (d) => "⁰¹²³⁴⁵⁶⁷⁸⁹"[+d])}`;
}
const logW = (r: number) => 1 + 10 * Math.max(0, (Math.log10(Math.max(r, 1e-7)) + 7) / 9); // 1e-7 … 100 mM/s

export class ReactionBox {
  box: R.Box;
  ca = 1;
  t = 0;
  conv = 0; // net converted forward since the last change, mM
  fwdTot = 0; backTot = 0; // each direction's running total, mM: both climb at equilibrium
  thin = 1;
  private dots: Dot[] = [];
  private events: Ev[] = [];
  private flashes: { x: number; y: number; k: Kind; life: number }[] = [];
  private acc = { f: 0, b: 0 };
  private tagAsHCO3 = 0; private tagTime = 0;
  private ctx: CanvasRenderingContext2D;
  constructor(private canvas: HTMLCanvasElement, buffered: boolean, public showCaNote: boolean) {
    this.ctx = canvas.getContext("2d")!;
    this.box = R.rest(buffered);
  }
  /** Start the counts over (after the learner changes something). */
  tally() { this.conv = 0; this.fwdTot = 0; this.backTot = 0; this.tagAsHCO3 = 0; this.tagTime = 0; }
  reset() { this.box = R.rest(this.box.buffered); this.t = 0; this.dots = []; this.events = []; this.tally(); }
  add(what: "co2" | "acid" | "hco3") {
    if (what === "co2") this.box.co2 += 1; else if (what === "acid") this.box.acid += 1; else this.box.hco3 += 5;
    this.tally();
  }
  setBuffered(on: boolean) {
    // keep the free H⁺ as it is; the buffer takes up its share at once
    const h = R.freeH(this.box);
    this.box.buffered = on;
    this.box.acid = h + (on ? (R.BUFFER.total * h) / (h + R.BUFFER.K) : 0);
    this.dots = this.dots.filter((d) => d.k !== "A");
    this.tally();
  }

  frame(dt: number) {
    const dx = R.relax(this.box, dt, this.ca);
    this.t += dt; this.conv += dx;
    const r = R.rates(this.box, this.ca);
    this.fwdTot += r.f * dt; this.backTot += r.b * dt;
    this.stepEvents(dt, r);
    this.draw(dt, r);
  }

  private launch(kind: "CO2" | "HCO3") {
    // a dot of this kind, not already converting, at random (the followed one as likely as any other)
    const pool = this.dots.filter((d) => d.k === kind && !d.busy);
    if (!pool.length) return;
    const d = pool[Math.floor(Math.random() * pool.length)], a = Math.random() * 2 * Math.PI;
    d.busy = true;
    this.events.push({ d, fwd: kind === "CO2", t: 0, hx: Math.cos(a) * 26, hy: Math.sin(a) * 26 });
  }
  private stepEvents(dt: number, r: { f: number; b: number }) {
    const fr = r.f / PER_DOT, br = r.b / PER_DOT;
    this.thin = Math.max(1, Math.max(fr, br) / 2.5); // at most a few a second, both ways thinned alike
    this.acc.f += (fr / this.thin) * dt; this.acc.b += (br / this.thin) * dt;
    while (this.acc.f >= 1) { this.acc.f -= 1; this.launch("CO2"); }
    while (this.acc.b >= 1) { this.acc.b -= 1; this.launch("HCO3"); }
    for (const e of this.events) {
      e.t += dt / 0.9;
      if (e.t >= 0.5 && !e.swapped) { e.swapped = true; e.d.k = e.fwd ? "HCO3" : "CO2"; }
      if (e.t >= 1) e.d.busy = false;
    }
    this.events = this.events.filter((e) => e.t < 1);
    const tagged = this.dots.find((d) => d.tag);
    if (tagged) { this.tagTime += dt; if (tagged.k === "HCO3") this.tagAsHCO3 += dt; }
  }
  private syncDots(bx: { x: number; y: number; w: number; h: number }) {
    const want: Record<Kind, number> = { CO2: Math.round(this.box.co2 / PER_DOT), HCO3: Math.round(this.box.hco3 / PER_DOT), A: this.box.buffered ? R.BUFFER.total : 0 };
    for (const k of ["CO2", "HCO3", "A"] as Kind[]) {
      const have = this.dots.filter((d) => d.k === k && !d.busy), n = this.dots.filter((d) => d.k === k).length;
      // conversions swap dots one at a time, so the counts may stray by one or two before the next swap evens them
      let need = want[k] - n;
      if (Math.abs(need) <= (k === "A" ? 0 : 2) && this.dots.length) continue;
      while (need > 0) { this.dots.push({ k, x: bx.x + 10 + Math.random() * (bx.w - 20), y: bx.y + 10 + Math.random() * (bx.h - 20), vx: 0, vy: 0 }); need--; }
      while (need < 0 && have.length) {
        const i = have.findIndex((d) => !d.tag), d = have.splice(i < 0 ? 0 : i, 1)[0];
        this.dots.splice(this.dots.indexOf(d), 1); this.flashes.push({ x: d.x, y: d.y, k, life: 1 }); need++;
      }
    }
    if (!this.dots.some((d) => d.tag)) { const c = this.dots.find((d) => d.k === "CO2"); if (c) c.tag = true; } // one carbon, followed
  }

  private draw(dt: number, r: { f: number; b: number }) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2), w = Math.max(50, this.canvas.clientWidth);
    if (this.canvas.width !== Math.round(w * dpr) || this.canvas.height !== Math.round(H * dpr)) { this.canvas.width = Math.round(w * dpr); this.canvas.height = Math.round(H * dpr); this.canvas.style.height = H + "px"; }
    const c = this.ctx; c.setTransform(dpr, 0, 0, dpr, 0, 0);
    const narrow = w < 640, muted = cssVar("--muted"), text = cssVar("--text"), acc = cssVar("--accent"), line = cssVar("--line");
    c.fillStyle = "#101826"; c.fillRect(0, 0, w, H);
    // the box of solution, on the left (on top on a phone)
    const bx = narrow ? { x: 10, y: 10, w: w - 20, h: 170 } : { x: 14, y: 14, w: w * 0.42, h: 412 };
    c.fillStyle = "#14202f"; c.strokeStyle = line; c.lineWidth = 2; c.beginPath(); c.roundRect(bx.x, bx.y, bx.w, bx.h, 10); c.fill(); c.stroke();
    this.syncDots(bx);
    for (const d of this.dots) {
      if (!d.busy) { // converting: it holds still
        d.vx += -d.vx * dt + 42 * Math.sqrt(dt) * (Math.random() - 0.5); d.vy += -d.vy * dt + 42 * Math.sqrt(dt) * (Math.random() - 0.5);
        d.x = Math.min(bx.x + bx.w - 8, Math.max(bx.x + 8, d.x + d.vx * dt)); d.y = Math.min(bx.y + bx.h - 8, Math.max(bx.y + 8, d.y + d.vy * dt));
      }
      glyph(c, d.k, d.x, d.y, d.k === "A" ? 3 : 4);
    }
    // buffer molecules carrying an H⁺: the bound fraction, drawn as an H⁺ on that many of them
    if (this.box.buffered) {
      const bufs = this.dots.filter((d) => d.k === "A"), nb = Math.round((R.boundH(this.box) / R.BUFFER.total) * bufs.length);
      bufs.slice(0, nb).forEach((d) => glyph(c, "H", d.x + 5, d.y - 3, 3.2));
    }
    for (const e of this.events) {
      // the dot converting glows; an H⁺ leaves it (forward) or arrives at it (backward)
      c.strokeStyle = acc; c.globalAlpha = Math.sin(e.t * Math.PI) * 0.8; c.lineWidth = 1.4; c.beginPath(); c.arc(e.d.x, e.d.y, 9, 0, 2 * Math.PI); c.stroke(); c.globalAlpha = 1;
      const u = e.fwd ? Math.max(0, (e.t - 0.5) * 2) : Math.min(1, e.t * 2), k = e.fwd ? u : 1 - u;
      glyph(c, "H", e.d.x + e.hx * k, e.d.y + e.hy * k, 4, e.fwd ? 1 - u : u);
    }
    const tg = this.dots.find((d) => d.tag);
    if (tg) {
      c.strokeStyle = "#ffffff"; c.lineWidth = 1.2; c.setLineDash([2, 2]); c.beginPath(); c.arc(tg.x, tg.y, 11, 0, 2 * Math.PI); c.stroke(); c.setLineDash([]);
      c.font = "11px system-ui, sans-serif"; c.fillStyle = "#ffffff"; c.textAlign = "left"; c.textBaseline = "alphabetic"; c.fillText("one carbon, followed", Math.min(tg.x + 14, bx.x + bx.w - 120), tg.y - 12);
    }
    for (const f of this.flashes) { f.life -= dt * 1.2; glyph(c, f.k, f.x, f.y, 6, Math.max(0, f.life)); }
    this.flashes = this.flashes.filter((f) => f.life > 0);
    const tag = (txt: string, x: number, y: number, col = muted, font = "12px system-ui, sans-serif", boxed = false) => {
      c.font = font; c.textAlign = "left"; c.textBaseline = "middle";
      if (boxed) { const tw = c.measureText(txt).width; c.fillStyle = "rgba(13,17,23,0.85)"; c.fillRect(x - 4, y - 9, tw + 8, 18); }
      c.fillStyle = col; c.fillText(txt, x, y);
    };
    const freeNm = R.freeH(this.box) * 1e6;
    tag(narrow ? `free H⁺ ${freeNm.toFixed(0)} nM: too few to draw` : `free H⁺: ${freeNm.toFixed(0)} nM, far too few to draw at this scale`, bx.x + 8, bx.y + 14, cssVar("--h"), undefined, true);
    tag(this.thin > 1.5 ? `conversions shown: 1 in ${Math.round(this.thin).toLocaleString("en-US")}, both ways alike` : "every conversion shown", bx.x + 8, bx.y + 34, acc, undefined, true);
    tag(`each ring or triangle ≈ ${PER_DOT} mM${this.box.buffered ? (narrow ? "; blob ≈ 1 mM buffer" : "; each blob ≈ 1 mM of buffer, with an H⁺ when it holds one") : ""}`, bx.x + 8, bx.y + bx.h - 12, muted, undefined, true);

    // the equation term by term, each term's glyph beneath it (water: the solvent, never drawn as dots)
    const ex = narrow ? 14 : w * 0.47, ey = narrow ? 222 : 56, ew = narrow ? w - 28 : w * 0.5;
    const fs = narrow ? 19 : 26, terms = ["CO₂", " + ", "H₂O", "  ⇌  ", "H⁺", " + ", "HCO₃⁻"], sym = ["CO2", null, "water", null, "H", null, "HCO3"] as const;
    c.font = `600 ${fs}px system-ui, sans-serif`; c.textBaseline = "middle";
    const widths = terms.map((s) => c.measureText(s).width), total = widths.reduce((a, b) => a + b, 0);
    let tx = ex + ew / 2 - total / 2;
    terms.forEach((s, i) => {
      c.font = `600 ${fs}px system-ui, sans-serif`; c.fillStyle = text; c.textAlign = "left"; c.fillText(s, tx, ey);
      const cx = tx + widths[i] / 2, gy = ey + fs * 0.95, sy = sym[i];
      if (sy === "water") {
        c.strokeStyle = cssVar("--water"); c.lineWidth = 1.6; c.beginPath();
        c.moveTo(cx, gy - 7); c.quadraticCurveTo(cx + 7, gy + 2, cx, gy + 6); c.quadraticCurveTo(cx - 7, gy + 2, cx, gy - 7); c.stroke();
        c.font = "11px system-ui, sans-serif"; c.fillStyle = muted; c.textAlign = "center"; c.fillText("the solvent", cx, gy + 17);
      } else if (sy) glyph(c, sy, cx, gy, 6);
      tx += widths[i];
    });
    // both directions as arrows, widths by rate, and the net beneath
    const arrow = (x0: number, x1: number, y: number, lw: number, col: string, dir: 1 | -1) => {
      c.strokeStyle = col; c.fillStyle = col; c.lineWidth = lw; c.lineCap = "round";
      const tip = dir > 0 ? x1 : x0, tail = dir > 0 ? x0 : x1, hl = 8 + lw;
      c.beginPath(); c.moveTo(tail, y); c.lineTo(tip - dir * hl * 0.7, y); c.stroke();
      c.beginPath(); c.moveTo(tip, y); c.lineTo(tip - dir * hl, y - hl * 0.6); c.lineTo(tip - dir * hl, y + hl * 0.6); c.fill();
    };
    const a0 = narrow ? ex + 4 : ex + ew * 0.32, a1 = narrow ? ex + ew - 4 : ex + ew * 0.92;
    const fy = narrow ? ey + 74 : ey + 70, by = narrow ? ey + 112 : ey + 94;
    arrow(a0, a1, fy, logW(r.f), cssVar("--co2"), 1); tag(`forward ${fmtR(r.f)} mM/s`, narrow ? ex + 4 : ex, narrow ? fy - 16 : fy);
    arrow(a0, a1, by, logW(r.b), cssVar("--hco3"), -1); tag(`back ${fmtR(r.b)} mM/s`, narrow ? ex + 4 : ex, narrow ? by - 16 : by);
    const net = r.f - r.b, eq = Math.abs(net) < 1e-3 * Math.max(r.f, 1e-9), ny = narrow ? ey + 136 : ey + 120;
    tag(eq ? (narrow ? "net: none (equilibrium)" : "net: none. Both directions run all the time, equally: equilibrium") : `net: ${net > 0 ? "forward" : "back"}, ${fmtR(Math.abs(net))} mM/s`,
      narrow ? ex + 4 : ex + ew * 0.32, ny, eq ? muted : acc, "600 13px system-ui, sans-serif");
    if (!narrow) tag(this.showCaNote ? "arrow widths: rates, log scale; carbonic anhydrase multiplies both alike" : "arrow widths: rates, log scale", ex + ew * 0.32, ey + 140);
    // the readouts
    const pH = R.pH(this.box), ry = narrow ? ey + 162 : 262, conv = this.conv;
    const netTxt = (conv >= 0 ? "+" : "") + (Math.abs(conv) < 0.001 ? (conv * 1e6).toFixed(0) + " nM" : conv.toFixed(3) + " mM");
    if (!narrow) {
      const rows: [string, string, string][] = [
        ["CO₂", this.box.co2.toFixed(2) + " mM", cssVar("--co2")], ["HCO₃⁻", this.box.hco3.toFixed(2) + " mM", cssVar("--hco3")], ["pH", pH.toFixed(2), cssVar("--h")],
        ["CO₂ → HCO₃⁻, so far", this.fwdTot.toFixed(1) + " mM", cssVar("--co2")], ["HCO₃⁻ → CO₂, so far", this.backTot.toFixed(1) + " mM", cssVar("--hco3")],
        ["net, so far", netTxt, acc], ["the followed carbon, time as HCO₃⁻", this.tagTime > 1 ? Math.round((100 * this.tagAsHCO3) / this.tagTime) + "%" : "—", "#ffffff"],
        ["time", this.t.toFixed(1) + " s", muted],
      ];
      rows.forEach(([k, v, col], i) => { tag(k, ex + ew * 0.32, ry + i * 22, muted, "13px system-ui, sans-serif"); tag(v, ex + ew * 0.32 + 230, ry + i * 22, col, "600 14px ui-monospace, Menlo, monospace"); });
    } else {
      tag(`CO₂ ${this.box.co2.toFixed(2)} · HCO₃⁻ ${this.box.hco3.toFixed(1)} mM · pH ${pH.toFixed(2)} · ${this.t.toFixed(1)} s`, 14, ry, text, "13px system-ui, sans-serif");
      tag(`so far → ${this.fwdTot.toFixed(1)} mM, ← ${this.backTot.toFixed(1)} mM, net ${netTxt}`, 14, ry + 20, acc, "13px system-ui, sans-serif");
    }
  }
}
