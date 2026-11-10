// enzyme-view.ts — the step-through's opening (docs/adr/0028): one carbonic anhydrase as a glob, after Domsic et al.
// 2008 (J Biol Chem 283:30766, doi:10.1074/jbc.M805353200): the protein and its cleft (their Fig. 1a), CO₂ on the
// oily green surface and HCO₃⁻ on the watery side (Fig. 4a), a chain of waters on that side (Fig. 1). CO₂ and a water
// bind, the enzyme turns over, H⁺ and HCO₃⁻ leave; or all of it backward. An animation, not a model: no rates.
// Simplified on purpose: in the real enzyme the water is on the zinc first and gives up its H⁺ in a separate half-cycle.

import { cssVar } from "./draw.ts";

const W = 800, H = 520; // the drawing's own units; the canvas scales them to its width
type Pt = { x: number; y: number };
const P = (x: number, y: number): Pt => ({ x, y });
const add = (p: Pt, dx: number, dy: number) => P(p.x + dx, p.y + dy);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lp = (a: Pt, b: Pt, t: number) => P(lerp(a.x, b.x, t), lerp(a.y, b.y, t));
const ss = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
const seg = (t: number, a: number, b: number) => ss((t - a) / (b - a));
const along = (pts: Pt[], t: number) => {
  if (t <= 0) return pts[0];
  if (t >= 1) return pts[pts.length - 1];
  const f = t * (pts.length - 1), i = Math.floor(f);
  return lp(pts[i], pts[i + 1], f - i);
};
const hex = (s: string) => [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16));
const mixc = (a: string, b: string, t: number) => { const x = hex(a), y = hex(b); return "rgb(" + x.map((v, i) => Math.round(lerp(v, y[i], t))).join(",") + ")"; };

// the turn's timeline, in seconds; a backward run plays it from the end
const T = { arrive: 2.6, hold: 3.4, turn: 4.6, leave: 6.8, rest: 8.6, end: 9.4 };
// where things go (drawing units)
const CEN = P(400, 330), ZN = P(400, 322);
const CO2_IN = [P(640, 40), P(530, 110), P(450, 240)], W_IN = [P(170, 50), P(300, 100), P(368, 170), P(402, 288)];
const CB = P(450, 240), OW = P(402, 288); // bound: CO₂'s carbon against the oily wall; the water on the zinc
const BOUND = { c: P(430, 264), o1: P(440, 236), o2: P(456, 280) }; // the HCO₃⁻ they make (the water's oxygen is the third)
const HCO3_OUT = [P(0, 0), P(-30, -110), P(-90, -190)]; // HCO₃⁻ leaves by the mouth, on the watery side
const WIRE = [P(350, 236), P(334, 182)]; // the chain of waters on the watery wall
const H_OUT = (h0: Pt) => [h0, add(WIRE[0], 0, -18), add(WIRE[1], 0, -18), P(296, 112), P(200, 56)];

/** What the caption says, and which part of the equation is lit: 0 CO₂ + H₂O, 1 the arrows, 2 H⁺ + HCO₃⁻. */
export type Say = (part: 0 | 1 | 2, text: string) => void;

export class EnzymeView {
  t = 0;
  dir: 1 | -1 = 1;
  paused = false;
  private ctx: CanvasRenderingContext2D;
  private C: Record<string, string>;
  constructor(private canvas: HTMLCanvasElement, private say: Say) {
    this.ctx = canvas.getContext("2d")!;
    this.C = {
      co2: cssVar("--co2"), hco3: cssVar("--hco3"), h: cssVar("--h"), w: cssVar("--water"), text: cssVar("--text"), muted: cssVar("--muted"),
      hy: "#e6edf3", oil: "#7fb069", oilText: "#a9c98f", prot: "#26303f", protEdge: "#46556b", sol: "#101826", bond: "#c9ced6", his: "#5f6b7d",
    };
  }
  run(d: 1 | -1) { this.dir = d; this.t = d > 0 ? 0 : T.end; this.paused = false; }

  frame(dt: number) {
    if (!this.paused) { this.t += this.dir * dt; if (this.t > T.end) this.t = 0; if (this.t < 0) this.t = T.end; }
    this.draw();
  }

  private size() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2), w = Math.max(50, this.canvas.clientWidth), h = Math.min(520, (w * H) / W);
    if (this.canvas.width !== Math.round(w * dpr) || this.canvas.height !== Math.round(h * dpr)) {
      this.canvas.width = Math.round(w * dpr); this.canvas.height = Math.round(h * dpr); this.canvas.style.height = h + "px";
    }
    // fit the drawing's 800 × 520 into the canvas, centered
    const k = Math.min(w / W, h / H);
    // the solution fills the whole canvas, whatever its width
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.ctx.fillStyle = this.C.sol; this.ctx.fillRect(0, 0, w, h);
    this.ctx.setTransform(dpr * k, 0, 0, dpr * k, (dpr * (w - W * k)) / 2, 0);
  }
  private atom(p: Pt, r: number, fill: string, a = 1) { const c = this.ctx; c.globalAlpha = a; c.beginPath(); c.arc(p.x, p.y, r, 0, 2 * Math.PI); c.fillStyle = fill; c.fill(); c.globalAlpha = 1; }
  private bond(a: Pt, b: Pt, color: string, w = 4, al = 1) { const c = this.ctx; c.globalAlpha = al; c.strokeStyle = color; c.lineWidth = w; c.lineCap = "round"; c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke(); c.globalAlpha = 1; }
  private label(s: string, p: Pt, color: string, size: number, align: CanvasTextAlign = "center", a = 1) {
    const c = this.ctx; c.globalAlpha = a; c.fillStyle = color; c.font = `${size}px system-ui, -apple-system, sans-serif`; c.textAlign = align; c.textBaseline = "middle"; c.fillText(s, p.x, p.y); c.globalAlpha = 1;
  }
  private water(o: Pt, a = 1) { for (const d of [P(-8, -16), P(-17, 6)]) { const h = add(o, d.x, d.y); this.bond(o, h, this.C.bond, 3, a); this.atom(h, 6, this.C.hy, a); } this.atom(o, 11, this.C.w, a); }
  private co2(c: Pt, a = 1) { const o1 = add(c, 4, -24), o2 = add(c, -4, 24); this.bond(o1, o2, this.C.co2, 6, a); this.atom(o1, 11, this.C.co2, a); this.atom(o2, 11, this.C.co2, a); this.atom(c, 8, "#7d8590", a); }

  private glob(squeeze: number) {
    const c = this.ctx, g = new Path2D(), cl = new Path2D();
    for (let k = 0; k <= 120; k++) {
      const th = (k / 120) * 2 * Math.PI, r = 1 + 0.04 * Math.sin(3 * th + 0.4) + 0.025 * Math.sin(5 * th + 1.3);
      const x = CEN.x + 255 * r * Math.cos(th) * (1 - squeeze), y = CEN.y + 175 * r * Math.sin(th) * (1 + squeeze);
      if (k) g.lineTo(x, y); else g.moveTo(x, y);
    }
    g.closePath();
    cl.moveTo(290, 60); cl.lineTo(510, 60); cl.lineTo(452, 300); cl.quadraticCurveTo(400, 352, 348, 300); cl.closePath();
    c.fillStyle = this.C.prot; c.fill(g); c.strokeStyle = this.C.protEdge; c.lineWidth = 3; c.stroke(g);
    c.fillStyle = this.C.sol; c.fill(cl); // the cleft opens the glob at the top
    c.save(); c.clip(g); c.strokeStyle = this.C.protEdge; c.lineWidth = 3; c.stroke(cl); // its walls, inside the protein only
    // the oily (hydrophobic) wall: the right side of the cleft, the green surface of Domsic's Figs. 1a and 4a
    c.strokeStyle = this.C.oil; c.globalAlpha = 0.55; c.lineWidth = 22; c.lineCap = "round"; c.beginPath(); c.moveTo(494, 150); c.lineTo(462, 292); c.stroke();
    c.restore();
  }
  private zinc(glow: number) {
    const c = this.ctx;
    for (const [dx, dy] of [[-26, 30], [0, 38], [26, 30]]) this.bond(ZN, add(ZN, dx, dy), this.C.his, 6); // three histidines, as stubs
    if (glow > 0) { c.globalAlpha = glow * 0.5; c.beginPath(); c.arc(ZN.x, ZN.y, 18 + 26 * glow, 0, 2 * Math.PI); c.strokeStyle = this.C.hco3; c.lineWidth = 4; c.stroke(); c.globalAlpha = 1; }
    const g = c.createRadialGradient(ZN.x - 6, ZN.y - 6, 3, ZN.x, ZN.y, 20); g.addColorStop(0, "#f4f6f8"); g.addColorStop(1, "#7d8590");
    c.beginPath(); c.arc(ZN.x, ZN.y, 18, 0, 2 * Math.PI); c.fillStyle = g; c.fill();
  }

  private draw() {
    this.size();
    const C = this.C, t = this.t, fwd = this.dir > 0;
    this.label("the solution", P(30, 128), C.muted, 16, "left");
    const turn = seg(t, T.hold, T.turn), pulse = Math.sin(Math.PI * turn);
    this.glob(0.015 * pulse);
    WIRE.forEach((p) => this.water(p, 0.55));
    this.zinc(pulse);
    this.label("carbonic anhydrase", P(400, 470), C.text, 22);
    this.label("oily pocket", P(560, 250), C.oilText, 18, "left");
    this.label("zinc", P(440, 336), C.muted, 16, "left");

    const enter = seg(t, 0, 0.25), arrive = seg(t, 0.2, T.arrive), leave = seg(t, T.turn + 0.2, T.leave), fade = 1 - seg(t, T.rest, T.end);
    if (t < T.hold) {
      // CO₂ and water come in and settle in their places
      this.co2(along(CO2_IN, arrive), enter); this.water(along(W_IN, arrive), enter);
      if (fwd) this.say(0, t < T.arrive ? "CO₂ and a water drift into the cleft." : "CO₂ settles on the oily pocket; the water sits on the zinc.");
      else this.say(0, "CO₂ and water leave, and the enzyme is ready for the next pair.");
      return;
    }
    // the turnover: CO₂'s oxygens open out, the water's oxygen bonds the carbon, one hydrogen leaves as H⁺
    const k = turn, dx = along(HCO3_OUT, leave), shift = (p: Pt) => add(p, dx.x, dx.y);
    const c = lp(CB, BOUND.c, k), o1 = lp(add(CB, 4, -24), BOUND.o1, k), o2 = lp(add(CB, -4, 24), BOUND.o2, k);
    const col = mixc(C.co2, C.hco3, k), al = fade, ow = shift(OW), ha = shift(add(OW, -8, -16));
    this.bond(ow, shift(c), C.hco3, 5, k * al); this.bond(shift(o1), shift(c), col, 5, al); this.bond(shift(o2), shift(c), col, 5, al); this.bond(ow, ha, C.bond, 3, al);
    this.atom(ha, 6, C.hy, al); this.atom(ow, 11, mixc(C.w, C.hco3, k), al); this.atom(shift(o1), 11, col, al); this.atom(shift(o2), 11, col, al);
    this.atom(shift(c), 8, mixc("#7d8590", "#b07400", k), al);
    // the H⁺: off the water, out along the chain of waters
    const hp = along(H_OUT(add(OW, -17, 6)), leave);
    if (k < 0.5) this.bond(OW, hp, C.bond, 3, 1 - k * 2);
    this.atom(hp, 7.5, mixc(C.hy, C.h, k), al);
    if (k > 0.95) { this.label("HCO₃⁻", add(shift(c), 38, -6), C.hco3, 20, "left", al); this.label("H⁺", add(hp, -16, -16), C.h, 20, "right", al); }
    if (fwd) this.say(t < T.turn ? 1 : 2, t < T.turn ? "The enzyme turns over: CO₂ and water become HCO₃⁻ and H⁺." : "HCO₃⁻ and H⁺ leave, and the enzyme is ready for the next pair: up to a million times a second.");
    else this.say(t < T.turn ? 1 : 2, t < T.turn ? "The enzyme turns over backward: HCO₃⁻ and H⁺ become CO₂ and water." : "HCO₃⁻ comes into the cleft, and H⁺ comes in along the chain of waters.");
  }
}
