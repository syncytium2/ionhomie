import * as I from "../core/physics.ts";
import { $, Trace, color, cssVar, fit, fmtTime, gauss, glyph, loop, setText, type Species } from "../views/draw.ts";
import { Below, ModelNote, Readout, useEngine } from "./parts.tsx";

const N = 900, L = 10e-6, H = 5e-6, BINS = 40;
const SPEED_VAR: Record<string, string> = { K: "--k", Na: "--na", Cl: "--cl", Ca: "--ca" };

function engine() {
  let ion: Species = "K", D = I.D_FREE.K, simPerReal = 0.002;
  let parts: { x: number; y: number; u: number }[] = [];
  let lifted = false, t = 0, crossNet = 0, crossLog: [number, number][] = [];
  const msd = new Trace($<HTMLCanvasElement>("msd"), {
    series: [{ key: "m", color: "--k", label: "particles" }, { key: "p", color: "#e6edf3", label: "2Dt", dash: [4, 4], width: 1.5 }],
    ymin: 0, ymax: 20, yLabel: "µm²", window: 0.002, grow: true, autoY: true, xFmt: (s) => (s * 1e3).toFixed(1) + " ms", height: 200,
  });
  const lift = $<HTMLButtonElement>("lift");

  function reset() {
    parts = [];
    for (let i = 0; i < N; i++) parts.push({ x: Math.random() * (L / 2), y: Math.random() * H, u: 0 });
    lifted = false; t = 0; crossNet = 0; crossLog = []; msd.clear();
    lift.disabled = false;
  }
  function setIon(v: Species) {
    ion = v; D = I.D_FREE[v as I.Ion];
    msd.o.series[0].color = SPEED_VAR[v];
    setText("r-d", (D * 1e9).toFixed(2) + " × 10⁻⁹ m²/s");
    reset();
  }
  lift.onclick = () => { lifted = true; lift.disabled = true; for (const p of parts) p.u = 0; };
  $("reset").onclick = reset;
  $<HTMLSelectElement>("ion").onchange = (e) => setIon((e.target as HTMLSelectElement).value as Species);
  $<HTMLSelectElement>("speed").onchange = (e) => { simPerReal = +(e.target as HTMLSelectElement).value; };
  setText("t1", fmtTime(I.diffusionTime1D(10e-9, I.D_FREE.K)));
  setText("t2", fmtTime(I.diffusionTime1D(1e-6, I.D_FREE.K)));
  setText("t3", fmtTime(I.diffusionTime1D(100e-6, I.D_FREE.K)));
  setText("t4", fmtTime(I.diffusionTime1D(1e-2, I.D_FREE.K)));

  function physics(dtReal: number) {
    const dt = dtReal * simPerReal;
    const sub = Math.max(1, Math.ceil(Math.sqrt(2 * D * dt) / (0.02 * L)));
    const h = dt / sub, s = Math.sqrt(2 * D * h);
    for (let k = 0; k < sub; k++) {
      for (const p of parts) {
        const before = p.x, dx = gauss() * s;
        if (lifted) p.u += dx;
        let x = p.x + dx, y = p.y + gauss() * s;
        if (x < 0) x = -x;
        if (x > L) x = 2 * L - x;
        if (y < 0) y = -y;
        if (y > H) y = 2 * H - y;
        if (!lifted) { if (before < L / 2 && x >= L / 2) x = L - x; }
        else {
          if (before < L / 2 && x >= L / 2) crossNet++;
          if (before >= L / 2 && x < L / 2) crossNet--;
        }
        p.x = x; p.y = y;
      }
    }
    if (lifted) {
      t += dt;
      crossLog.push([t, crossNet]);
      while (crossLog.length && crossLog[0][0] < t - 0.0005) crossLog.shift();
    }
  }

  function drawStage() {
    const c = $<HTMLCanvasElement>("stage");
    const W = c.clientWidth, Hp = Math.max(220, Math.round(W * 0.42));
    const { ctx } = fit(c, Hp);
    ctx.fillStyle = "#101826"; ctx.fillRect(0, 0, W, Hp);
    const sx = W / L, sy = Hp / H;
    for (const p of parts) glyph(ctx, ion, p.x * sx, p.y * sy, 3.2, 0.9);
    if (!lifted) { ctx.fillStyle = cssVar("--muted"); ctx.fillRect(W / 2 - 2, 0, 4, Hp); }
    else { ctx.setLineDash([3, 5]); ctx.strokeStyle = cssVar("--line"); ctx.beginPath(); ctx.moveTo(W / 2, 0); ctx.lineTo(W / 2, Hp); ctx.stroke(); ctx.setLineDash([]); }
    if (lifted) {
      const g = (I.boxMidFlux(t, D, L) * L) / D; // dimensionless: −L·dc/dx at the middle
      const len = W * 0.12 * Math.min(g, 2.5);
      if (len > 4) {
        ctx.strokeStyle = "#e6edf3"; ctx.fillStyle = "#e6edf3"; ctx.lineWidth = 3;
        const y = Hp - 18;
        ctx.beginPath(); ctx.moveTo(W / 2 - len / 2, y); ctx.lineTo(W / 2 + len / 2 - 8, y); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(W / 2 + len / 2, y); ctx.lineTo(W / 2 + len / 2 - 10, y - 6); ctx.lineTo(W / 2 + len / 2 - 10, y + 6); ctx.closePath(); ctx.fill();
        ctx.font = "12px system-ui, sans-serif"; ctx.textAlign = "center"; ctx.fillText("J = −D·dC/dx", W / 2, y - 14);
      }
    }
    ctx.fillStyle = cssVar("--muted"); ctx.font = "11px system-ui, sans-serif"; ctx.textAlign = "left"; ctx.textBaseline = "top";
    ctx.fillText(lifted ? `${fmtTime(t)} since the partition lifted` : "10 µm box, partition down", 8, 8);
  }

  function drawProfile() {
    const { ctx, w, h } = fit($<HTMLCanvasElement>("profile"), 200);
    const l = 34, r = 8, tp = 8, b = 22;
    const X = (f: number) => l + f * (w - l - r), Y = (v: number) => tp + (1 - v / 1.2) * (h - tp - b);
    const counts = new Array(BINS).fill(0);
    for (const p of parts) counts[Math.min(BINS - 1, Math.floor((p.x / L) * BINS))]++;
    const per = N / (BINS / 2);
    ctx.fillStyle = color(ion); ctx.globalAlpha = 0.55;
    counts.forEach((n, i) => { const v = n / per; ctx.fillRect(X(i / BINS) + 1, Y(v), (w - l - r) / BINS - 2, Y(0) - Y(v)); });
    ctx.globalAlpha = 1;
    ctx.strokeStyle = "#e6edf3"; ctx.lineWidth = 2; ctx.beginPath();
    for (let i = 0; i <= 200; i++) {
      const f = i / 200, v = lifted ? I.boxStepProfile(f * L, t, D, L) : f < 0.5 ? 1 : 0;
      if (i === 0) ctx.moveTo(X(f), Y(v)); else ctx.lineTo(X(f), Y(v));
    }
    ctx.stroke();
    ctx.strokeStyle = cssVar("--line"); ctx.lineWidth = 1; ctx.strokeRect(l, tp, w - l - r, h - tp - b);
    ctx.fillStyle = cssVar("--muted"); ctx.font = "10px ui-monospace, Menlo, monospace"; ctx.textAlign = "right"; ctx.textBaseline = "middle";
    for (const v of [0, 0.5, 1]) ctx.fillText(v.toFixed(1), l - 4, Y(v));
    ctx.textAlign = "center"; ctx.textBaseline = "top";
    for (const um of [0, 5, 10]) ctx.fillText(um + " µm", X(um / 10), h - b + 5);
    ctx.save(); ctx.translate(9, tp + (h - tp - b) / 2); ctx.rotate(-Math.PI / 2); ctx.fillText("C / C₀", 0, -4); ctx.restore();
  }

  function readouts() {
    setText("r-t", lifted ? fmtTime(t) : "partition down");
    setText("r-right", ((100 * parts.filter((p) => p.x >= L / 2).length) / N).toFixed(0) + " % of the ions");
    if (crossLog.length > 2) {
      const [ta, na] = crossLog[0], [tb, nb] = crossLog[crossLog.length - 1];
      const rate = tb > ta ? (nb - na) / (tb - ta) : 0;
      setText("r-cross", (rate >= 0 ? "→ " : "← ") + Math.abs(rate / 1000).toFixed(1) + " per ms");
    } else setText("r-cross", "—");
  }

  setIon("K");
  let since = 0;
  return loop((dt) => {
    physics(dt);
    since += dt;
    if (lifted && since > 0.05) {
      since = 0;
      let m = 0;
      for (const p of parts) m += p.u * p.u;
      msd.push(t, { m: (m / N) * 1e12, p: 2 * D * t * 1e12 });
    }
    drawStage(); drawProfile(); msd.draw(); readouts();
  });
}

export default function Diffusion() {
  useEngine(engine);
  return (
    <main>
      <div className="panel">
        <canvas id="stage" />
        <div className="controls">
          <button id="lift">Lift the partition</button>
          <button id="reset">Reset</button>
          <label>Ion <select id="ion"><option value="K">K⁺</option><option value="Na">Na⁺</option><option value="Cl">Cl⁻</option><option value="Ca">Ca²⁺</option></select></label>
          <label>Speed <select id="speed" defaultValue="0.002"><option value="0.0005">slowed 2,000×</option><option value="0.002">slowed 500×</option><option value="0.01">slowed 100×</option></select></label>
        </div>
      </div>
      <div className="grid">
        <div className="panel">
          <h3>The concentration profile</h3>
          <canvas id="profile" />
          <p className="src">Bars: the particles above, counted in 40 slices. Line: the exact solution of the diffusion equation
            for this box, with reflecting walls. Here the particles are the model, and the line is the check.</p>
        </div>
        <div className="panel">
          <h3>Mean squared distance</h3>
          <canvas id="msd" />
          <p className="src">⟨Δx²⟩ along x, counting every step each ion takes (the walls' folds undone). It grows as 2Dt:
            twice the time, twice the squared distance.</p>
        </div>
      </div>
      <div className="grid">
        <div className="panel">
          <div className="readouts">
            <Readout id="r-t" k="time since the partition lifted" />
            <Readout id="r-d" k="D, free solution, 25 °C" />
            <Readout id="r-right" k="in the right half" />
            <Readout id="r-cross" k="crossing the middle, net" />
          </div>
        </div>
        <div className="panel">
          <h3>How long diffusion takes</h3>
          <table>
            <tbody>
              <tr><th>distance</th><th>K⁺, t = x²/2D</th></tr>
              <tr><td>10 nm, a membrane</td><td id="t1">—</td></tr>
              <tr><td>1 µm</td><td id="t2">—</td></tr>
              <tr><td>100 µm, a big cell</td><td id="t3">—</td></tr>
              <tr><td>1 cm</td><td id="t4">—</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <Below>
        <p className="lede">No forces, no membrane, no charge yet: just ions jostled by water. Each one takes a random step, with no
          idea where the others are. Yet the crowd as a whole flows from where it is dense to where it is sparse. That flow is
          Fick's law.</p>
        <div className="predict"><b>Predict.</b> A K⁺ ion takes about a quarter of a millisecond to wander 1 µm. How long will the
          crowd take to spread across this 10 µm box: about 10 times longer, or about 100 times? Reset, lift the partition and
          watch the clock.</div>
        <p className="notice">Ten times the distance takes a hundred times as long. Diffusion is fast across a membrane and hopeless
          across a body; that is why bodies have circulations.</p>

        <h2>A bare bilayer barely leaks ions</h2>
        <p className="notice">Diffusion through water is fast. Diffusion through lipid is another matter: a charged ion must leave its
          water behind to enter the bilayer. Permeabilities of a pure lipid bilayer, and how long a gradient across it would take
          to dissipate, from the 578 diffusion lecture:</p>
        <table>
          <tbody>
            <tr><th>solute</th><th>P (cm/s)</th><th>gradient lasts about</th></tr>
            <tr><td>water</td><td>10⁻⁴ to 10⁻³</td><td>0.5 to 5 s</td></tr>
            <tr><td>urea</td><td>10⁻⁶</td><td>8 min</td></tr>
            <tr><td>glucose, amino acids</td><td>10⁻⁷</td><td>14 h</td></tr>
            <tr><td className="ion-cl">Cl⁻</td><td>10⁻¹¹</td><td>1.6 years</td></tr>
            <tr><td><span className="ion-k">K⁺</span>, <span className="ion-na">Na⁺</span></td><td>10⁻¹³</td><td>160 years</td></tr>
          </tbody>
        </table>
        <p className="notice">So a membrane is a near-perfect wall for ions, and everything that follows in these chapters happens through
          proteins in it: channels, pumps and transporters.</p>

        <details>
          <summary>The math</summary>
          <p>Fick's first law: the flux J (amount per area per time) runs down the concentration gradient. Across a membrane of
            thickness Δx, with partition coefficient β, it becomes a permeability:</p>
          <div className="eq">{"J = −D · dC/dx\nJ = −D (C_in − C_out) / Δx\nJ = −(Dβ/Δx)(C_in − C_out) = −P (C_in − C_out),   P = Dβ/Δx"}</div>
          <p>Conservation turns the first law into the diffusion equation. Its solution for this box, with reflecting walls,
            starting from a step, is a cosine series:</p>
          <div className="eq">{"∂C/∂t = D · ∂²C/∂x²\nC(x,t) = ½ + Σₙ (2/nπ) sin(nπ/2) cos(nπx/L) exp(−(nπ/L)² D t)"}</div>
          <p>Each particle's random walk has a mean squared displacement along x of 2Dt, so the time to wander a distance x is
            about x²/2D.</p>
          <p className="src">Free-solution diffusion coefficients are recalled table values (K⁺ 1.96, Na⁺ 1.33, Cl⁻ 2.03, Ca²⁺ 0.79 ×
            10⁻⁹ m²/s at 25 °C), still to be checked against a cited source.</p>
        </details>
        <ModelNote />
      </Below>
    </main>
  );
}
