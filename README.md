# ionhomie

**Ion homeostasis, built one mechanism at a time, in the browser.** Diffusion and Fick's law;
drift in a field and the Nernst equation; a membrane as a capacitor; one selective channel; the
GHK equation; a cell running down with no pump; the Na⁺/K⁺-ATPase and PMCA; and the NKCC1 and
KCC2 cotransporters that set E_Cl, and with it E_GABA. Heavily visual: colored ions in a 2D cell,
a voltage ruler, a charge ledger. For graduate and medical students, beside the Physiol 578
lectures, whose concentrations, permeabilities and colors it uses.

Everything runs in the browser; the page's security policy forbids it any network connection.

```
npm install
npm run dev      # http://localhost:5173
npm test         # the physics, every quoted number pinned
npm run check    # types, tests, build, every route driven in Chromium (screenshots/)
```

The plan and every decision are in [`docs/`](docs/FOUNDATIONS.md). The physics is
`src/core/physics.ts`; the shared views are `src/views/`; one file per chapter in
`src/chapters/`. `prototype/` keeps the single-file proof-of-principle pages that came first.

MIT license. A sibling of [gaba_excites](https://github.com/syncytium2/gaba_excites) and
[colonel_kernel](https://github.com/syncytium2/colonel_kernel).
