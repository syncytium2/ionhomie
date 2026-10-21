import { useEffect, useState, type ReactNode } from "react";
import { setStageView, viewPref, type Species, type StageView } from "../views/draw.ts";

/**
 * Start a chapter's imperative engine after mount and stop it on unmount. The engine draws into
 * canvases and writes readouts by element id; React only lays the page out. Returns nothing to
 * React: every frame is the engine's.
 */
export function useEngine(start: () => () => void) {
  useEffect(() => start(), []); // eslint-disable-line react-hooks/exhaustive-deps
}

/**
 * How the stage shows the ions (docs/adr/0016): the cell, one ion on its own scale, a census of one cubic
 * micrometer, or a magnifier on the membrane. The learner picks; the choice holds on every stage.
 */
export function ViewPicker() {
  const [view, setView] = useState<StageView>(viewPref.view);
  const [ion, setIon] = useState<Species>(viewPref.ion);
  const pick = (v: StageView, i: Species = ion) => { setStageView(v, i); setView(v); setIon(i); };
  const b = (v: StageView, label: string) => (
    <button className={view === v ? "on" : ""} aria-pressed={view === v} onClick={() => pick(v)}>{label}</button>
  );
  return (
    <div className="controls viewpick">
      <span className="viewlabel">View</span>
      {b("cell", "Cell")}
      {b("focus", "One ion")}
      <select aria-label="ion to focus on" value={ion} onChange={(e) => pick("focus", e.target.value as Species)}>
        <option value="Na">Na⁺</option><option value="K">K⁺</option><option value="Cl">Cl⁻</option><option value="Ca">Ca²⁺</option>
      </select>
      {b("census", "Census, 1 µm³")}
      {b("lens", "Magnifier")}
    </div>
  );
}

/** Everything that is not the action: it sits below it (docs/adr/0008). */
export function Below({ children }: { children: ReactNode }) {
  return <section className="below">{children}</section>;
}

export function Readout({ id, k, cls }: { id: string; k: ReactNode; cls?: string }) {
  return (
    <div className="readout">
      <div className="k">{k}</div>
      <div className={"v " + (cls ?? "")} id={id}>—</div>
    </div>
  );
}

/** What every chapter says about its models, at the foot of the page. */
export function ModelNote() {
  return (
    <p className="banner">
      <b>About these models.</b> The concentrations and the resting permeability ratio (pK : pNa : pCl = 1 : 0.02 : 0.5)
      follow the Physiol 578 lectures. The cell is a generic 10 µm sphere; the absolute permeabilities, pump and
      transporter rates are illustrative, chosen so things happen at a watchable pace, and are not fit to any one cell.
      <b> How to read the cell:</b> each dot stands for billions of ions (the count is printed on the stage). Where the cell runs for minutes,
      a dot crossing a channel, pump or transporter is the model's own flux at the clock's speed, so the dots that cross are the dots that pile
      up. The ± rim on the membrane is the charge that sets Vm, at its own printed scale; Ca²⁺ inside (0.1 µM) is far too dilute to draw.
      Everything runs in this page; nothing is sent anywhere.
    </p>
  );
}
