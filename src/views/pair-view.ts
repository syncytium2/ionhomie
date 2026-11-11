// pair-view.ts — the step-through's opening (docs/adr/0031): one H⁺ and one HCO₃⁻, drawn atom by atom. They combine into
// CO₂ and water, and a moment later the pair reverses. With the enzyme the same round trip runs 10,000 times faster, a blur;
// a slow-motion slider slows the clock until it is a pair again. An animation, not a model: the unhurried pace is chosen to be
// watched (a round trip every 4 s), and only the factor of 10,000 between the two steps is the box's (illustrative) number.
// The blur is honest motion blur: each frame layers many moments of the time it covers.

import { cssVar } from "./draw.ts";

const W = 700, H = 320; // the drawing's own units; the canvas scales them to its width
type Pt = { x: number; y: number };
const P = (x: number, y: number): Pt => ({ x, y });
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const ss = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
const seg = (t: number, a: number, b: number) => ss((t - a) / (b - a));
const hex = (s: string) => [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16));
const mixc = (a: string, b: string, t: number) => { const x = hex(a), y = hex(b); return "rgb(" + x.map((v, i) => Math.round(lerp(v, y[i], t))).join(",") + ")"; };

/** One round trip at the unhurried pace, seconds. */
export const ROUND_TRIP = 4;
/** The enzyme's factor, both directions alike: the same illustrative ×10,000 as the box (core/reaction.ts, CA_CELL). */
export const CA_FACTOR = 1e4;

// The atoms: C, O1, O2 and O3 (the one that leaves as water), Ha (on O3 throughout) and Hb (the H⁺).
// Three poses: apart as H⁺ + HCO₃⁻; met (the H⁺ on O3, briefly H₂CO₃); apart as CO₂ + H₂O.
type Pose = Record<"C" | "O1" | "O2" | "O3" | "Ha" | "Hb", Pt>;
const APART: Pose = { C: P(300, 160), O1: P(300, 120), O2: P(265, 180), O3: P(335, 180), Ha: P(345, 208), Hb: P(560, 110) };
const MET: Pose = { ...APART, Hb: P(363, 166) };
const SPLIT: Pose = { C: P(215, 162), O1: P(219, 122), O2: P(211, 202), O3: P(470, 175), Ha: P(480, 203), Hb: P(498, 161) };
const pose = (u: number): Pose => { // u: 0 is H⁺ + HCO₃⁻, 1 is CO₂ + H₂O
  const a = u < 0.5 ? APART : MET, b = u < 0.5 ? MET : SPLIT, t = ss(u < 0.5 ? u * 2 : u * 2 - 1);
  const o = {} as Pose;
  for (const k of Object.keys(APART) as (keyof Pose)[]) o[k] = P(lerp(a[k].x, b[k].x, t), lerp(a[k].y, b[k].y, t));
  return o;
};

/** Where in the round trip, from its phase (0 to 1): holding, combining (backward in the equation) or splitting (forward). */
function stage(p: number) {
  if (p < 0.12) return { u: 0, part: 2 as const, say: "One H⁺ and one HCO₃⁻." };
  if (p < 0.42) return { u: (p - 0.12) / 0.3, part: 1 as const, say: "They combine: the H⁺ joins the HCO₃⁻, which falls apart into CO₂ and water." };
  if (p < 0.58) return { u: 1, part: 0 as const, say: "CO₂ and water." };
  if (p < 0.88) return { u: 1 - (p - 0.58) / 0.3, part: 1 as const, say: "A moment later, the reverse: CO₂ and water make H⁺ and HCO₃⁻ again." };
  return { u: 0, part: 2 as const, say: "One H⁺ and one HCO₃⁻, back where they started." };
}

export type Say = (part: 0 | 1 | 2, text: string) => void;

export class PairView {
  /** Model seconds per real second: 1 is real time; the slider slows it to 1/10,000. */
  timeScale = 1;
  paused = false;
  t = 0;
  private ctx: CanvasRenderingContext2D;
  private C: Record<string, string>;
  constructor(private canvas: HTMLCanvasElement, public ca: boolean, private say: Say) {
    this.ctx = canvas.getContext("2d")!;
    this.C = { co2: cssVar("--co2"), hco3: cssVar("--hco3"), h: cssVar("--h"), w: cssVar("--water"), text: cssVar("--text"), muted: cssVar("--muted"),
      hy: "#e6edf3", cGray: "#7d8590", cB: "#b07400", sol: "#101826", bond: "#c9ced6", prot: "#26303f", protEdge: "#46556b" };
  }
  again() { this.t = 0; this.paused = false; }
  /** Round trips per real second, as now run. */
  rate() { return ((this.ca ? CA_FACTOR : 1) * this.timeScale) / ROUND_TRIP; }

  frame(dt: number) {
    const span = this.paused ? 0 : dt * (this.ca ? CA_FACTOR : 1) * this.timeScale; // model seconds this frame covers
    this.t = (this.t + span) % ROUND_TRIP;
    this.size();
    const c = this.ctx;
    if (this.ca) this.enzyme();
    // motion blur: layer many moments of the frame's span, at random offsets so a fast loop never strobes into a still
    const n = span / ROUND_TRIP < 0.004 ? 1 : Math.min(48, 6 + Math.ceil((span / ROUND_TRIP) * 120));
    const a = n === 1 ? 1 : 1 - Math.pow(0.08, 1 / n), off = Math.random();
    for (let i = 0; i < n; i++) {
      const tt = n === 1 ? this.t : this.t - span * ((i + off) / n);
      c.globalAlpha = a; this.molecules(stage((((tt % ROUND_TRIP) + ROUND_TRIP) % ROUND_TRIP) / ROUND_TRIP).u, n === 1);
    }
    c.globalAlpha = 1;
    const blur = span / ROUND_TRIP > 0.15;
    const s = stage(this.t / ROUND_TRIP);
    if (blur) this.say(1, `Back and forth about ${Math.round(this.rate()).toLocaleString("en-US")} times a second: a blur. Drag Slow motion to watch.`);
    else this.say(s.part, s.say);
    this.tags(blur);
  }

  private left = 0; // the drawing's left edge in view: on a phone the empty margins are cropped so the pair is bigger
  private size() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2), w = Math.max(50, this.canvas.clientWidth), narrow = w < 560;
    const x0 = narrow ? 80 : 0, vw = narrow ? 530 : W, vh = narrow ? 290 : H, h = Math.max(200, Math.min(vh, (w * vh) / vw));
    if (this.canvas.width !== Math.round(w * dpr) || this.canvas.height !== Math.round(h * dpr)) {
      this.canvas.width = Math.round(w * dpr); this.canvas.height = Math.round(h * dpr); this.canvas.style.height = h + "px";
    }
    const k = Math.min(w / vw, h / vh);
    this.left = x0;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.ctx.fillStyle = this.C.sol; this.ctx.fillRect(0, 0, w, h);
    this.ctx.setTransform(dpr * k, 0, 0, dpr * k, dpr * ((w - vw * k) / 2 - x0 * k), dpr * ((h - vh * k) / 2 - (narrow ? 15 : 0) * k));
  }
  private atom(p: Pt, r: number, fill: string) { const c = this.ctx; c.beginPath(); c.arc(p.x, p.y, r, 0, 2 * Math.PI); c.fillStyle = fill; c.fill(); }
  private bond(a: Pt, b: Pt, color: string, w: number, al: number) {
    if (al <= 0.01) return;
    const c = this.ctx, g = c.globalAlpha; c.globalAlpha = g * al; c.strokeStyle = color; c.lineWidth = w; c.lineCap = "round";
    c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke(); c.globalAlpha = g;
  }
  private text(s: string, p: Pt, color: string, size: number, al = 1, weight = "") {
    if (al <= 0.01) return;
    const c = this.ctx, g = c.globalAlpha; c.globalAlpha = g * al; c.fillStyle = color; c.font = `${weight} ${size}px system-ui, -apple-system, sans-serif`;
    c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(s, p.x, p.y); c.globalAlpha = g;
  }

  /** The pair at u (0: H⁺ + HCO₃⁻; 1: CO₂ + H₂O). Bonds form and break across the middle; colors follow which molecule each atom is in. */
  private molecules(u: number, labels: boolean) {
    const q = pose(u), C = this.C;
    const hb = seg(u, 0.38, 0.5); // the H⁺ bonded to O3
    const co = seg(u, 0.55, 0.68); // the C–O3 bond broken: CO₂ and water
    const oCol = mixc(C.hco3, C.co2, co), o3Col = mixc(C.hco3, C.w, co), cCol = mixc(C.cB, C.cGray, co), hCol = mixc(C.h, C.hy, hb);
    this.bond(q.C, q.O1, oCol, 6, 1); this.bond(q.C, q.O2, oCol, 6, 1);
    this.bond(q.C, q.O3, o3Col, 6, 1 - co);
    this.bond(q.O3, q.Ha, C.bond, 4, 1); this.bond(q.O3, q.Hb, C.bond, 4, hb);
    this.atom(q.O1, 15, oCol); this.atom(q.O2, 15, oCol); this.atom(q.O3, 15, o3Col);
    this.atom(q.C, 11, cCol); this.atom(q.Ha, 8, C.hy); this.atom(q.Hb, 8, hCol);
    if (!labels) return;
    const before = 1 - seg(u, 0.2, 0.4), after = seg(u, 0.75, 0.95);
    this.text("HCO₃⁻", P(300, 248), C.hco3, 22, before, "600"); this.text("H⁺", P(q.Hb.x, q.Hb.y - 30), C.h, 22, before, "600");
    this.text("CO₂", P(215, 248), C.co2, 22, after, "600"); this.text("H₂O", P(480, 248), C.w, 22, after, "600");
  }
  /** The enzyme, as a plain shape behind the pair: its detail (the zinc) comes two steps on. */
  private enzyme() {
    const c = this.ctx; c.fillStyle = this.C.prot; c.strokeStyle = this.C.protEdge; c.lineWidth = 2;
    c.beginPath(); c.ellipse(340, 180, 250, 112, 0, 0, 2 * Math.PI); c.fill(); c.stroke();
    this.text("carbonic anhydrase", P(340, 284), this.C.muted, 17);
  }
  private tags(blur: boolean) {
    const c = this.ctx, lines: [string, string][] = [];
    if (this.timeScale < 0.999) lines.push([`slow motion: time runs at 1/${Math.round(1 / this.timeScale).toLocaleString("en-US")} of real time`, this.C.text]);
    if (this.ca) lines.push([blur ? `${Math.round(this.rate()).toLocaleString("en-US")} round trips a second` : `one round trip every ${(1 / this.rate()).toFixed(1)} s`, this.C.muted]);
    const fs = this.left ? 21 : 17;
    lines.forEach(([s, col], i) => { c.font = `600 ${fs}px system-ui, sans-serif`; c.textAlign = "left"; c.textBaseline = "middle"; c.fillStyle = col; c.fillText(s, this.left + 12, (this.left ? 32 : 22) + i * (fs + 7)); });
  }
}
