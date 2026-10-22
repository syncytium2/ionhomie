# Tony on the homeostat, v0.1.5, 2026-10-22

> *"homeostat is very easy. should be a little more hectic. make the default 100 sec per sec. the main readouts are way
> below the primary display so you can't see the concentration without stopping and scrolling. i think the voltage ruler
> takes up too much space. probably need dials to show concentration in real time. graphs are hard for some to get used
> too"*
>
> *"and they're all stuck by the na leak channel (which i thought we decided would be voltage gated?). stuff is moving too
> slow to be exciting"*
>
> *"when the cell runs down it should be way more dramatic than a short line reporting the fact"*

Built 2026-10-22, deployed in v0.1.6:

| note | what changed |
|---|---|
| More hectic; default 100 s per s | The clock defaults to 100 s of cell time per real second (25, 50 and 200 offered). The hold became an hour of cell time (~36 real seconds at 100×): at the leak rates that is a few taps a second. |
| Readouts below the display; the ruler too big; dials, not graphs | The ruler is gone from the game. A row of dials sits directly under the cell (two rows on a phone): Na⁺ inside and K⁺ inside with their losing ranges in red, Vm, and cell time left. They stay on screen while playing. The graphs moved below; the long text moved to the end. `dials()` in `src/views/draw.ts` is reusable. |
| All stuck by the Na⁺ leak | A real stage bug: a dot that crossed was set down just past the pore with no velocity and wandered slowly (9 px/√s), so entering Na⁺ piled up at the leak's mouth. Crossed dots are now released moving away from the membrane, on every stage. The game's dots wander faster (26 px/√s; a per-stage `wander` option). |
| Too slow to be exciting | The 100× clock and the faster wander. |
| Running down should be dramatic | A loss keeps the clock running at 2,000× for 7 real seconds, so the player watches the cell run down: Na⁺ floods in, K⁺ drains, the ± rim thins as Vm heads to zero, the cell swells. The stage shakes, pulses red and says "The cell ran down" with the final numbers. A win glows green. `scripts/check.mjs` lets the cell run down on purpose and screenshots the scene. |
| The Na⁺ leak "voltage gated" | Not built: [ADR-0015](../adr/0015-resting-conductances-from-the-pyramidal-cell.md) decided the source (the pyramidal cell's channels) and proposed the design; its build was queued after the concentration view, which is now done. Waiting on Tony's go-ahead. |

> *"i thought we had animated the pumps and transporters more realistically"*

It had been advised, not built. Built 2026-10-22 as [ADR-0017](../adr/0017-transport-proteins-rock-they-do-not-spin.md): bind,
close (ATP → ADP on the pump), rock, release; no rotors. Deployed in v0.1.6.

> *"we need to distinguish the transporters from the pump. ATP just flashes for a moment think of how to show it continuously.
> binding sites on all three should persist with hollow rings."* · *"kcc2 is the same color as chloride i think"* ·
> *"chloride ions never leave the chloride leak channel. also noted the pore is a black rectangle that some ions can hide behind
> or get cutoff"*

Built 2026-10-22 as [ADR-0018](../adr/0018-the-pump-carries-its-atp.md). Not deployed.
