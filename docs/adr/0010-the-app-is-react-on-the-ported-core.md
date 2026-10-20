# ADR-0010: The app is React over the ported core, one route per chapter

## Status

Accepted, 2026-10-20. Tony asked: "build the webapp. check the other repos for the web app info."
The structure is Claude's, following `gaba_excites`; Tony has not ruled on it.

## Context

[ADR-0003](0003-react-like-gaba-excites.md) chose React like `gaba_excites`. The prototype
([ADR-0006](0006-proof-of-principle-pages-are-single-html-files.md)) proved the chapters, the views
and the physics.

## Decision

- **Vite, TypeScript, React**, the `gaba_excites` toolchain and versions. `src/core/physics.ts` is
  the prototype's physics, typed; its tests came across unchanged (`src/core/physics.test.ts`,
  vitest). `src/views/` are the shared canvas views; `src/chapters/` one component per chapter,
  each starting an imperative engine on mount and stopping it on unmount.
- **One hash route per chapter** (`#/diffusion` …), read from `src/chapters/index.ts`, the reading
  order. Hash routes need no server rewrites.
- **The simulation runs on the main thread.** Every model here is cheap per frame; the worker
  ADR-0003 named is deferred until a chapter needs one.
- **The production CSP** forbids every connection (`connect-src 'none'`), injected at build as in
  `gaba_excites`; `public/_headers` stops Cloudflare injecting its beacon.
- **The prototype is kept** in `prototype/`, unchanged and still passing its own checks, as the
  record of the proof of principle. The app does not import from it.

## Consequences

- ADR-0006's pages are superseded as the product; its decision stands for the prototype.
- `npm run check` is the gate: types, tests, a clean build, and every route driven in Chromium.
