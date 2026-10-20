import * as I from "../core/physics.ts";
import { $, color, fit, fmtMv, gauss, glyph, loop, minus, setText, type Species } from "../views/draw.ts";
import { Below, ModelNote, useEngine } from "./parts.tsx";

const L = 2e-6, H = 1.2e-6, PER = 380, BINS = 30, SAMPLE = 1 / 12;
interface Sp { ion: Species; z: number; D: number; on: boolean; name: string; bAvg?: number }

function engine() {
  const SPECIES: Sp[] = [
    { ion: "K", z: 1, D: I.D_FREE.K, on: true, name: "K⁺" },
    { ion: "Cl", z: -1, D: I.D_FREE.Cl, on: true, name: "Cl⁻" },
    { ion: "Ca", z: 2, D: I.D_FREE.Ca, on: false, name: "Ca²⁺" },
    { ion: "X", z: 0, D: 0.67e-9, on: true, name: "neutral (glucose-like)" },
  ];
  let dV = 0.06, focus: Species = "K", simPerReal = 0.0012, sampleAcc = 0, everyFrame = false;
  let parts: { s: Sp; x: number; y: number; px: number; py: number }[] = [];
  const rtf = I.rtf();

  function mix() {
    parts = [];
    for (const s of SPECIES) s.bAvg = undefined;
    for (const s of SPECIES) if (s.on) for (let i = 0; i < PER; i++) { const x = Math.random() * L, y = Math.random() * H; parts.push({ s, x, y, px: x, py: y }); }
  }
  const box = $("species");
  box.replaceChildren();
  for (const s of SPECIES) {
    const lab = document.createElement("label");
    const cb = document.createElement("input"); cb.type = "checkbox"; cb.checked = s.on;
    cb.onchange = () => { s.on = cb.checked; mix(); };
    lab.append(cb, document.createTextNode(" " + s.name));
    if (s.z !== 0) {
      const rb = document.createElement("input"); rb.type = "radio"; rb.name = "focus"; rb.checked = s.ion === focus; rb.title = "show this species' two fluxes";
      rb.onchange = () => { focus = s.ion; setText("focus-name", s.name); };
      lab.append(document.createTextNode("  "), rb, document.createTextNode(" fluxes"));
    }
    box.append(lab);
  }
  $<HTMLInputElement>("dv").oninput = (e) => { const v = +(e.target as HTMLInputElement).value; dV = v / 1000; setText("dv-o", fmtMv(v, 0)); };
  $("reset").onclick = mix;
  $<HTMLSelectElement>("speed").onchange = (e) => { simPerReal = +(e.target as HTMLSelectElement).value; };
  $<HTMLInputElement>("every").onchange = (e) => { everyFrame = (e.target as HTMLInputElement).checked; };

  function physics(dtReal: number) {
    const dt = dtReal * simPerReal;
    for (const s of SPECIES) {
      if (!s.on) continue;
      const v = (s.z * s.D * dV) / (L * rtf); // drift velocity; the field points left to right when dV > 0
      const sub = Math.max(1, Math.ceil(Math.sqrt(2 * s.D * dt) / (0.02 * L)));
      const h = dt / sub, sd = Math.sqrt(2 * s.D * h);
      for (let k = 0; k < sub; k++) {
        for (const p of parts) {
          if (p.s !== s) continue;
          let x = p.x + v * h + gauss() * sd, y = p.y + gauss() * sd;
          if (x < 0) x = -x;
          if (x > L) x = 2 * L - x;
          if (y < 0) y = -y;
          if (y > H) y = 2 * H - y;
          p.x = x; p.y = y;
        }
      }
    }
  }

  type Prof = { s: Sp; norm: number[]; b: number };
  function profiles() {
    const res: Partial<Record<Species, Prof>> = {};
    for (const s of SPECIES) {
      if (!s.on) continue;
      const h = new Array(BINS).fill(0);
      let n = 0;
      for (const p of parts) if (p.s === s) { h[Math.min(BINS - 1, Math.floor((p.x / L) * BINS))]++; n++; }
      const norm = h.map((c) => (c * BINS) / n);
      let sw = 0, sx = 0, sy = 0, sxx = 0, sxy = 0;
      h.forEach((c, i) => { if (c < 1) return; const x = ((i + 0.5) / BINS) * L, y = Math.log(c); sw += c; sx += c * x; sy += c * y; sxx += c * x * x; sxy += c * x * y; });
      const b = (sw * sxy - sx * sy) / (sw * sxx - sx * sx);
      // smooth the fit over time: noise averages out, a real change still shows within a second
      s.bAvg = s.bAvg === undefined || !isFinite(s.bAvg) ? b : s.bAvg + 0.08 * (b - s.bAvg);
      res[s.ion] = { s, norm, b: s.bAvg };
    }
    return res;
  }
  const predicted = (s: Sp, x: number) => {
    const k = (s.z * dV) / rtf; // φ(x) = dV·(1 − x/L)
    if (Math.abs(k) < 1e-9) return 1;
    return Math.exp(-k * (1 - x / L)) / ((1 - Math.exp(-k)) / k);
  };

  function drawStage() {
    const c = $<HTMLCanvasElement>("stage");
    const W = c.clientWidth, Hp = Math.max(220, Math.round(W * 0.5));
    const { ctx } = fit(c, Hp);
    const pad = 26;
    ctx.fillStyle = "#101826"; ctx.fillRect(pad, 0, W - 2 * pad, Hp);
    const plate = (x: number, sign: number) => {
      ctx.fillStyle = sign > 0 ? "#7a3b33" : sign < 0 ? "#2f4f73" : "#333a44";
      ctx.fillRect(x, 0, pad - 4, Hp);
      ctx.fillStyle = "#e6edf3"; ctx.font = "700 16px system-ui, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      for (let y = 22; y < Hp; y += 34) ctx.fillText(sign > 0 ? "+" : sign < 0 ? "−" : "", x + (pad - 4) / 2, y);
    };
    plate(0, Math.sign(dV));
    plate(W - pad + 4, -Math.sign(dV));
    const sx = (W - 2 * pad) / L, sy = Hp / H;
    const f = everyFrame ? 1 : Math.min(1, sampleAcc / SAMPLE);
    for (const p of parts) glyph(ctx, p.s.ion, pad + (p.px + (p.x - p.px) * f) * sx, (p.py + (p.y - p.py) * f) * sy, p.s.ion === "Ca" ? 2.3 : 2.6, 0.95);
  }

  function drawProfile(P: Partial<Record<Species, Prof>>) {
    const { ctx, w, h } = fit($<HTMLCanvasElement>("profile"), 220);
    const l = 40, r = 10, tp = 10, b = 24;
    let ymax = 2;
    for (const k in P) for (const v of P[k as Species]!.norm) ymax = Math.max(ymax, v);
    ymax = Math.min(8, Math.ceil(ymax));
    const X = (f: number) => l + f * (w - l - r), Y = (v: number) => tp + (1 - v / ymax) * (h - tp - b);
    ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue("--line"); ctx.strokeRect(l, tp, w - l - r, h - tp - b);
    ctx.fillStyle = "#9aa5b1"; ctx.font = "10px ui-monospace, Menlo, monospace"; ctx.textAlign = "right"; ctx.textBaseline = "middle";
    for (let v = 0; v <= ymax; v += ymax > 4 ? 2 : 1) ctx.fillText(String(v), l - 4, Y(v));
    ctx.textAlign = "center"; ctx.textBaseline = "top";
    ctx.fillText("left", X(0.03), h - b + 6); ctx.fillText("right", X(0.97), h - b + 6);
    ctx.save(); ctx.translate(10, tp + (h - tp - b) / 2); ctx.rotate(-Math.PI / 2); ctx.fillText("C / mean", 0, -4); ctx.restore();
    for (const k in P) {
      const { s, norm } = P[k as Species]!;
      ctx.strokeStyle = s.ion === "X" ? "#9aa5b1" : color(s.ion); ctx.lineWidth = 2; ctx.setLineDash([]);
      ctx.beginPath();
      norm.forEach((v, i) => {
        const vs = (norm[Math.max(0, i - 1)] + 2 * v + norm[Math.min(BINS - 1, i + 1)]) / 4, x = X((i + 0.5) / BINS);
        if (i === 0) ctx.moveTo(x, Y(vs)); else ctx.lineTo(x, Y(vs));
      });
      ctx.stroke();
      ctx.setLineDash([5, 4]); ctx.lineWidth = 1.5; ctx.beginPath();
      for (let i = 0; i <= 100; i++) { const f = i / 100, v = Math.min(ymax * 1.2, predicted(s, f * L)); if (i === 0) ctx.moveTo(X(f), Y(v)); else ctx.lineTo(X(f), Y(v)); }
      ctx.stroke(); ctx.setLineDash([]);
    }
  }

  function drawReadback(P: Partial<Record<Species, Prof>>) {
    let rows = "<tr><th>ion</th><th>z</th><th>ratio, right ÷ left</th><th>voltage it balances</th></tr>";
    for (const k in P) {
      const { s, b } = P[k as Species]!;
      const ratio = Math.exp(b * L);
      const vBack = s.z ? (rtf / s.z) * Math.log(ratio) * 1000 : NaN;
      rows += `<tr><td class="ion-${s.ion.toLowerCase()}">${s.name.split(" ")[0]}</td><td>${s.z > 0 ? "+" + s.z : minus(String(s.z))}</td>` +
        `<td>${ratio >= 10 || ratio < 0.1 ? ratio.toExponential(1) : ratio.toFixed(2)}</td>` +
        `<td>${s.z ? fmtMv(vBack, 0) : "none: it feels no field"}</td></tr>`;
    }
    rows += `<tr><td colspan="4" class="src">Applied: ${fmtMv(dV * 1000, 0)}. Every charged species should read back the same voltage, within noise.</td></tr>`;
    const t = $("readback");
    if (t.innerHTML !== rows) t.innerHTML = rows;
  }

  function drawFluxes(P: Partial<Record<Species, Prof>>) {
    const { ctx, w } = fit($<HTMLCanvasElement>("fluxes"), 120);
    const f = P[focus];
    if (!f || f.s.z === 0) { ctx.fillStyle = "#9aa5b1"; ctx.font = "12px system-ui, sans-serif"; ctx.fillText("Switch on the species to see its fluxes.", 8, 20); return; }
    const s = f.s;
    const drift = (s.z * s.D * dV) / (L * rtf), diff = -s.D * f.b;
    const scale = (w * 0.38) / Math.max(1e-12, Math.abs((s.z * s.D * 0.12) / (L * rtf)));
    const arrow = (y: number, v: number, label: string, col: string) => {
      const len = Math.max(-w * 0.45, Math.min(w * 0.45, v * scale)), x0 = w / 2;
      ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x0 + len - Math.sign(len) * 8, y); ctx.stroke();
      if (Math.abs(len) > 6) { ctx.beginPath(); ctx.moveTo(x0 + len, y); ctx.lineTo(x0 + len - Math.sign(len) * 11, y - 7); ctx.lineTo(x0 + len - Math.sign(len) * 11, y + 7); ctx.closePath(); ctx.fill(); }
      ctx.font = "12px system-ui, sans-serif"; ctx.textAlign = len >= 0 ? "right" : "left"; ctx.fillStyle = "#e6edf3";
      ctx.fillText(label, len >= 0 ? x0 - 6 : x0 + 6, y + 1);
    };
    ctx.strokeStyle = "#2b3442"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(w / 2, 4); ctx.lineTo(w / 2, 116); ctx.stroke();
    ctx.textBaseline = "middle";
    arrow(26, drift, "drift", color(s.ion));
    arrow(62, diff, "diffusion", "#e6edf3");
    arrow(98, drift + diff, "net", "#f0e442");
  }

  mix();
  let k = 0, P = profiles();
  return loop((dt) => {
    if (everyFrame) { for (const p of parts) { p.px = p.x; p.py = p.y; } physics(dt); }
    else {
      sampleAcc += dt;
      if (sampleAcc >= SAMPLE) { sampleAcc -= SAMPLE; for (const p of parts) { p.px = p.x; p.py = p.y; } physics(SAMPLE); }
    }
    if (++k % 6 === 0) { P = profiles(); drawReadback(P); }
    drawStage(); drawProfile(P); drawFluxes(P);
  });
}

export default function Drift() {
  useEngine(engine);
  return (
    <main>
      <div className="grid hero">
        <div className="panel">
          <canvas id="stage" />
          <div className="controls">
            <label>Left side relative to right <input type="range" id="dv" min="-120" max="120" step="5" defaultValue="60" /><output id="dv-o">60 mV</output></label>
            <button id="reset">Mix again</button>
            <label>Speed <select id="speed" defaultValue="0.0012"><option value="0.0003">slowed 3,000×</option><option value="0.0012">slowed 800×</option><option value="0.005">slowed 200×</option></select></label>
            <label><input type="checkbox" id="every" /> show every frame</label>
          </div>
          <div className="controls" id="species" />
        </div>
        <div className="stack">
          <div className="panel">
            <h3>Two fluxes, for <span id="focus-name">K⁺</span></h3>
            <canvas id="fluxes" />
          </div>
          <div className="panel">
            <h3>Read the voltage back from the ions</h3>
            <table id="readback" />
          </div>
        </div>
      </div>
      <div className="panel">
        <h3>Concentration across the box</h3>
        <canvas id="profile" />
        <p className="src">Lines: the particles, counted in slices and smoothed. Dashed: the Boltzmann prediction, C(x) ∝ exp(−zFφ(x)/RT),
          each scaled to its own mean. The box is 2 µm across. Dots are shown 12 times a second, gliding between true samples of the walk.</p>
      </div>

      <Below>
        <p className="lede">Now put a voltage across the box. Water still jostles every ion at random, but a charged ion also feels a
          steady push from the field: cations toward the negative side, anions toward the positive. A neutral molecule feels nothing.</p>
        <div className="predict"><b>Predict.</b> With the left side positive, where do K⁺ and Cl⁻ pile up? What does the neutral molecule
          do? And Ca²⁺, with twice the charge: the same pile-up as K⁺, a steeper one, or a shallower one?</div>
        <ul className="notice">
          <li><b>Drift builds a gradient, and the gradient pushes back.</b> Through the middle of the box, drift (pushed by the field)
            and diffusion (pushed down the gradient drift builds) grow toward equal and opposite. The pile-up stops when they cancel.</li>
          <li><b>Zero net flux is the whole of the Nernst equation.</b> Fit each species' pile-up and ask what voltage would hold exactly
            that gradient: the table reads back the applied voltage, for every charged species, whatever its charge.</li>
        </ul>
        <details>
          <summary>The math: from drift and diffusion to Nernst</summary>
          <p>The Nernst–Planck equation adds drift in the field to Fick's diffusion:</p>
          <div className="eq">{"J = −D ( dC/dx + (zF/RT) · C · dφ/dx )"}</div>
          <p>Set J = 0 and integrate across the box, and read it as a membrane:</p>
          <div className="eq">{"E_rev = (RT/zF) ln( [S]out / [S]in )\n      = (26.7 mV / z) ln( [S]out / [S]in )     at 37 °C"}</div>
          <p>A tenfold gradient of a monovalent ion balances 26.7 × ln 10 ≈ 61.5 mV; for Ca²⁺, with z = 2, half that.</p>
          <p className="src">One simplification: in a real solution, piling up charge like this would build its own field at once, which
            would stop the pile-up almost before it began. These ions are dilute test charges in a field set from outside. The
            compartment chapters put that self-field back, as the charge on the membrane.</p>
        </details>
        <ModelNote />
      </Below>
    </main>
  );
}
