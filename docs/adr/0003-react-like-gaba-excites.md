# ADR-0003: React, uPlot and a worker, like gaba_excites

## Status

Accepted, 2026-10-19. Tony chose React, as in `gaba_excites`, over Svelte, as in
`colonel_kernel`. The structure below follows `gaba_excites`; its details are Claude's
proposal and Tony has not ruled on them.

## Context

The tool is a sibling of `gaba_excites` and `colonel_kernel`: a client-side teaching
instrument with a public site at a subdomain of tonydefazio.com. Its last chapter ends at
E_GABA, which `gaba_excites` treats as a fixed parameter; that repo's roadmap lists "chloride
dynamics, so that E_GABA can move with activity". Sharing the stack keeps a chloride model
portable between the two.

## Decision

- **Vite, TypeScript, React, uPlot**, matching `gaba_excites`.
- **The physics is a pure TypeScript core with no DOM** (`src/core/`), with explicit `.ts`
  import extensions so plain `node` can run it from the command line.
- **The simulation runs in a Web Worker**; the UI only draws.
- **Particles are drawn with Canvas2D.** WebGL only if a chapter needs more than about ten
  thousand on screen.
- **No third-party requests**: no CDNs, fonts or analytics, with a CSP injected at build.
- **Deployed to Cloudflare** by one deploy script, as the siblings are.
- **Tests are the contract** (vitest): every number the site quotes is pinned by a test
  against its source.

## Consequences

*Carried out 2026-10-20 ([ADR-0010](0010-the-app-is-react-on-the-ported-core.md)): React, Vite, the CSP and
Cloudflare as above; uPlot and the worker were not needed yet, and the simulation runs on the main
thread. Canvas2D draws the plots as well as the particles.*

- The chloride model built for the last chapter can be lifted into `gaba_excites` without a
  rewrite, if the `Channel`-style seam there is respected.
- `gaba_excites`'s screenshot check (console errors, third-party requests, phone overflow)
  and its tour pattern can be reused.
