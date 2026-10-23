# Handoff 2026-10-23: after the pump and transporter rounds

Written by the ionhomie session that built the repo, the app and every round so far, at the edge of context compaction.
[`MILESTONES.md`](../MILESTONES.md) is the authority for what is open; this file is where things stand and the traps.

Derive rather than trust: `git log --oneline -15` · `cat DEPLOYED.md` · `sed -n '/## Open/,$p' docs/MILESTONES.md` ·
`ls docs/adr` · `npm run check`.

## Where it stands

- **Live: v0.1.6** (release baeb981) at https://ionhomie.tonydefazio.com. It has the homeostat round (100× clock, dials, the
  collapse scene) and the rocking transport proteins ([ADR-0017](../adr/0017-transport-proteins-rock-they-do-not-spin.md)).
- **main is ahead of live and NOT deployed** (head 444ef8b). Everything after v0.1.6:
  - [ADR-0018](../adr/0018-the-pump-carries-its-atp.md) and [ADR-0019](../adr/0019-atp-is-a-star-and-the-census-is-a-panel.md):
    the pump's star-shaped ATP site (an ATP star waits, docks, breaks into P on the pump and a four-pointed ADP that drifts
    off); persistent hollow binding rings; gray cotransporters (#8e9aaf, no ion's color); the census redrawn as a 2D panel
    like the magnifier; NKCC1/KCC2 slider units in fmol/s; a screen-sized homeostat stage.
  - 4a68e7f: a blocked protein halts mid-cycle and returns its ions; fixed binding reach (90 px) with a slow walk (50 px/s)
    and gentle release; the pumps page says "pump: blocked (ouabain)" with ATP waiting, and rundown keeps "pump: no ATP".
  - A crossed dot rests ~3 s before crossing again (Cl⁻ no longer shuttles in its leak); ions are drawn above the proteins.
- **Deploy only on Tony's word "deploy"**, every time; `npm run deploy` bumps the patch, runs the full check, deploys and
  verifies. Commit `DEPLOYED.md` and a MILESTONES row after.
- A dev server may still be running on **port 5190** (`npx vite --port 5190 --strictPort`); port 5173 is colonel_kernel's.

## Waiting on Tony (the open questions as last put to him)

1. **"deploy"** for the round on main.
2. **NCX**: add the Na⁺/Ca²⁺ exchanger (3 Na⁺ : 1 Ca²⁺, electrogenic)? Tony saw PMCA "happily functioning" at 0 mV after
   ouabain. That is correct as modeled (ouabain leaves ATP), but without NCX the Ca²⁺ gradient can never collapse; with it, the
   collapsing Na⁺ gradient reverses NCX and loads Ca²⁺ (digoxin's mechanism). It changes the physics: new rate law (e.g.
   I = g(Vm − E_NCX), E_NCX = 3E_Na − 2E_Ca, in the zero-current solve), `healthyState` re-solved, tests re-pinned, an ADR.
3. **Voltage-gated resting channels** ([ADR-0015](../adr/0015-resting-conductances-from-the-pyramidal-cell.md)): the source
   is decided (gaba_excites's pyramidal cell: Traub Na⁺, Kd, M, vendored); the build is not. Tony expected the Na⁺ leak to be
   voltage gated already. Its solver must keep the homeostat's "Stacked hand carries past ±200 mV" test passing (scan that
   widens; most hyperpolarized zero).
4. Dials in rundown, pumps and chloride (built for the game, reusable: `dials()` in `src/views/draw.ts`).
5. The rest of MILESTONES' open table (ADR-0009 hues, ADR-0004, the arc play-through, reference numbers to verify).

## tonydefazio.com: ON HOLD

Tony, 2026-10-22: *"hold on the tonydefazio.com updates for now."* Send that session nothing until he lifts it.

- Live there: tile 1.11.2, the rocker pump, which matches ionhomie v0.1.6.
- Staged there, held: 1.11.3, the ATP-star tile from ionhomie 7f33fe5. Once ionhomie deploys a release carrying it **and**
  Tony lifts the hold, send the session (named `tonydefazio-com-22`; the socket in older messages was
  `uds:/tmp/cc-socks/89548.sock`) the release and commit.
- Any change to `scripts/tile-svg.ts` or `src/views/stage-style.ts` that alters the tile's look means regenerating
  (`node scripts/tile-svg.ts`) and, once the hold lifts, resending.

## How work is done here

- Decisions go in `docs/adr/` (next free number is **0020**), MILESTONES rows pinned to commits, Tony's words quoted in
  `docs/feedback/`. CLAUDE.md only points.
- **Layout rule** ([ADR-0008](../adr/0008-lead-with-the-action.md), [0012](../adr/0012-a-nav-bar-on-every-page.md)): only the
  nav bar (brand, stamp, every chapter, the "← tonydefazio.com" return link) above the visual; controls under the visual; all
  text below. `scripts/check.mjs` enforces it and fails a stage that draws no ions.
- **Scales** ([ADR-0011](../adr/0011-every-dot-and-crossing-is-on-a-stated-scale.md)): every dot and crossing on a stated scale;
  Tony's standing rule is that students are thrown off by any mismatch on screen. Before shipping motion, capture a frame
  sequence (Playwright clips of the stage) and look, because still screenshots hide motion bugs (they hid the pump that never
  cycled, Cl⁻ shuttling and ions pulled from afar).
- **Darkroom**: `bash scripts/darkroom.sh` (names built by armory's naming tool; a hook rejects hand-named files there).
- Writing: American spelling, "data" plural, no bare enumerated labels, they/them for Tony.

## Traps this session fell into

- A `str.replace` with an anchor that matched an earlier, identically indented method spliced text into the whole of
  `draw.ts`; recovered with `git checkout`. Anchor edits inside the target method and assert counts.
- Node type stripping cannot import `draw.ts` (class parameter properties); shared constants live in
  `src/views/stage-style.ts` for that reason.
- `rm` on a shell variable is blocked by a safety check; overwrite files instead.
- The homeostat, made by a separate "mac ionhomie game" session, is now merged and owned here; that session has ended.
