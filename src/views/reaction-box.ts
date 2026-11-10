// reaction-box.ts — the step-through's sealed box of solution (docs/adr/0027): CO₂ + H₂O ⇌ H⁺ + HCO₃⁻ with no cell.
// It draws what core/reaction.ts computes. Beside the box, a seesaw shows which way the reaction runs (it tips by
// log₁₀ of forward ÷ backward, which is K·[CO₂]/([H⁺][HCO₃⁻]), level at equilibrium) and two dials show how fast each
// direction runs (high and equal at equilibrium: nothing changes, plenty happens). In the box, conversions both ways at
// those rates (thinned alike when too fast, and the box says so), and one carbon followed. The numbers go in a table
// the page keeps folded (Tony: "better displayed as the teeter totter, or dials. expanding it reveals the table").

import * as R from "../core/reaction.ts";
import { cssVar, glyph } from "./draw.ts";

const PER_DOT = 0.25; // mM per ring or triangle, CO₂ and HCO₃⁻ alike: one stated scale
type Kind = "CO2" | "HCO3" | "A";
interface Dot { k: Kind; x: number; y: number; vx: number; vy: number; busy?: boolean; tag?: boolean }
interface Ev { d: Dot; fwd: boolean; t: number; hx: number; hy: number; swapped?: boolean }

function fmtR(r: number) {
  if (r >= 0.01) return r.toFixed(2);
  const [m, e] = r.toExponential(1).split("e");
  return `${m}×10${e.replace("-", "⁻").replace(/\d/g, (d) => "⁰¹²³⁴⁵⁶⁷⁸⁹"[+d])}`;
}

export class ReactionBox {
  box: R.Box;
  ca = 1;
  t = 0;
  conv = 0; // net converted forward since the last change, mM
  fwdTot = 0; backTot = 0; // each direction's running total, mM: both climb at equilibrium
  thin = 1;
  private tilt = 0; // the seesaw's shown tilt, in decades of forward ÷ backward, eased so a blip is visible
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
  /** The followed carbon's share of time as HCO₃⁻ so far, or null before a second has passed. */
  followed() { return this.tagTime > 1 ? this.tagAsHCO3 / this.tagTime : null; }
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
    const dpr = Math.min(window.devicePixelRatio || 1, 2), w = Math.max(50, this.canvas.clientWidth), H = w < 640 ? 540 : 440;
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
    // the seesaw: which way it runs. The side converting faster is the heavier side, and tips down.
    const ratio = r.b > 0 ? r.f / r.b : 1, target = Math.max(-2, Math.min(2, Math.log10(ratio)));
    this.tilt += (target - this.tilt) * (1 - Math.exp(-dt / 0.12));
    const sx = ex + ew / 2, sy = narrow ? 318 : 168, L = narrow ? ew * 0.3 : Math.min(ew * 0.38, 190), sw = narrow ? 92 : 104, ang = -0.13 * this.tilt;
    c.fillStyle = "#3a4558"; c.beginPath(); c.moveTo(sx, sy); c.lineTo(sx - 16, sy + 28); c.lineTo(sx + 16, sy + 28); c.closePath(); c.fill(); // the fulcrum
    const end = (k: number) => ({ x: sx + k * L * Math.cos(ang), y: sy + k * L * Math.sin(ang) });
    c.strokeStyle = "#c9ced6"; c.lineWidth = 5; c.lineCap = "round"; c.beginPath(); const e0 = end(-1), e1 = end(1); c.moveTo(e0.x, e0.y); c.lineTo(e1.x, e1.y); c.stroke();
    const seat = (p: { x: number; y: number }, txt: string, ions: ("CO2" | "H" | "HCO3")[]) => {
      c.fillStyle = "#26303f"; c.strokeStyle = line; c.lineWidth = 1.5; c.beginPath(); c.roundRect(p.x - sw / 2, p.y - 40, sw, 34, 8); c.fill(); c.stroke();
      c.font = `600 ${narrow ? 13 : 15}px system-ui, sans-serif`; c.fillStyle = text; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(txt, p.x, p.y - 23 - 9);
      ions.forEach((ion, k) => glyph(c, ion, p.x - (ions.length - 1) * 9 + k * 18, p.y - 14, 4.5));
    };
    seat(e0, "CO₂ + H₂O", ["CO2"]); seat(e1, "H⁺ + HCO₃⁻", ["H", "HCO3"]);
    const level = Math.abs(target) < 0.01;
    const center = (txt: string, x: number, y: number, col: string, font: string) => { c.font = font; c.textAlign = "center"; c.textBaseline = "middle"; c.fillStyle = col; c.fillText(txt, x, y); };
    center(level ? "level: equilibrium" : target > 0 ? "tipped: CO₂ converts faster, net forward" : "tipped: HCO₃⁻ converts faster, net backward",
      sx, sy + 44, level ? muted : acc, "600 13px system-ui, sans-serif");
    // the dials: how fast each direction runs, log scale from 10⁻⁶ to 10⁴ mM/s
    const dr = narrow ? 46 : Math.min(62, ew * 0.16), dy = narrow ? 452 : 352;
    const dial = (x: number, title: string, rate: number, col: string) => {
      const frac = (v: number) => Math.max(0, Math.min(1, (Math.log10(Math.max(v, 1e-9)) + 6) / 10));
      c.strokeStyle = line; c.lineWidth = 8; c.lineCap = "butt"; c.beginPath(); c.arc(x, dy, dr, Math.PI, 2 * Math.PI); c.stroke();
      c.strokeStyle = col; c.globalAlpha = 0.45; c.beginPath(); c.arc(x, dy, dr, Math.PI, Math.PI + Math.PI * frac(rate)); c.stroke(); c.globalAlpha = 1;
      c.font = "10px system-ui, sans-serif"; c.fillStyle = muted; c.textAlign = "center"; c.textBaseline = "middle";
      for (const [v, lab] of [[1e-6, "10⁻⁶"], [1e-2, "0.01"], [1e2, "100"], [1e4, "10⁴"]] as [number, string][]) {
        const a = Math.PI + Math.PI * frac(v); c.fillText(lab, x + (dr + 14) * Math.cos(a), dy + (dr + 14) * Math.sin(a));
      }
      const a = Math.PI + Math.PI * frac(rate);
      c.strokeStyle = col; c.lineWidth = 3; c.lineCap = "round"; c.beginPath(); c.moveTo(x, dy); c.lineTo(x + (dr - 6) * Math.cos(a), dy + (dr - 6) * Math.sin(a)); c.stroke();
      c.fillStyle = col; c.beginPath(); c.arc(x, dy, 4, 0, 2 * Math.PI); c.fill();
      c.font = `600 ${narrow ? 13 : 14}px system-ui, sans-serif`; c.fillStyle = text; c.fillText(title, x, dy - dr - 24);
      c.font = "600 13px ui-monospace, Menlo, monospace"; c.fillStyle = col; c.fillText(`${fmtR(rate)} mM/s`, x, dy + 18);
    };
    dial(ex + ew * 0.27, "CO₂ → HCO₃⁻", r.f, cssVar("--co2"));
    dial(ex + ew * 0.73, "HCO₃⁻ → CO₂", r.b, cssVar("--hco3"));
    center(level ? (narrow ? "equally fast: nothing changes, plenty happens" : "both directions running, equally fast: nothing changes, plenty happens") : "the gap between the dials is the net",
      sx, dy + 42, muted, `${narrow ? 12 : 13}px system-ui, sans-serif`);
    if (!narrow) tag(this.showCaNote ? "seesaw: forward ÷ backward; dials: each direction's rate (log scales). The enzyme turns both dials up alike." : "seesaw: forward ÷ backward; dials: each direction's rate (log scales)",
      ex + ew * 0.06, H - 12, muted, "12px system-ui, sans-serif");
  }
}
