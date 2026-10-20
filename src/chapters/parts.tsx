import { useEffect, type ReactNode } from "react";

/**
 * Start a chapter's imperative engine after mount and stop it on unmount. The engine draws into
 * canvases and writes readouts by element id; React only lays the page out. Returns nothing to
 * React: every frame is the engine's.
 */
export function useEngine(start: () => () => void) {
  useEffect(() => start(), []); // eslint-disable-line react-hooks/exhaustive-deps
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
      Everything runs in this page; nothing is sent anywhere.
    </p>
  );
}
