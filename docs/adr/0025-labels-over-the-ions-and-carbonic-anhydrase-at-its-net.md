# ADR-0025: Labels over the ions; carbonic anhydrase shown at its net

## Status

Accepted, 2026-11-10; the scale of CA's conversions superseded by [ADR-0026](0026-carbonic-anhydrase-on-the-dots-scale-its-equation-in-the-legend.md). Tony: *"ions occlude the text. advise. also advise on animating carbonic anhdrase activity"*. Given
both pieces of advice, he answered *"both"*. The forms are Claude's.

## Decision

- **Every pathway's label is drawn last**, over the ions, on a dark box (`drawLabel` in `src/views/draw.ts`). The protein
  bodies stay under the ions, so no ion hides behind a pore
  ([ADR-0018](0018-the-pump-carries-its-atp.md)), but no ion hides a label either. This applies on every stage and in
  every view.
- **Carbonic anhydrase has a net rate in the model** (`acid.ca` in `physics.ts`), CO₂ + H₂O → H⁺ + HCO₃⁻, negative when it
  runs back. CA is instant, so the rate is whatever keeps HCO₃⁻ on pHi as the volume changes: the HCO₃⁻ inside changes
  by NBC's import plus CA's net. CO₂ crosses the lipid at the same net rate.
  - At rest it runs **backward at exactly NBC's rate** (0.072 mM/min): the HCO₃⁻ NBC brings in leaves as CO₂.
  - A CO₂ step hydrates about **2.3 mM at once** (`co2Step` returns it).
  - It then runs back again: more weakly with pHo held, while the stock of HCO₃⁻ inside rises; more than twice as hard with
    CO₂ alone.
- **The protons page draws it** (`CaView` in `src/views/protons-views.ts`):
  - CA II in the cytoplasm, a gray enzyme with its zinc, flickering all the time for its turnover of about a million a
    second each way, nearly all of which cancels.
  - The reaction label, lit in the net direction.
  - Conversions at the net rate, on a stated scale of their own (one shown per billion, like the membrane rim's). Forward,
    a CO₂ crosses the lipid to the enzyme and leaves as an H⁺ and an HCO₃⁻; back, the reverse.
  - A CO₂ step's whole hydration plays as one burst, captioned while it plays, because the net after it may already run
    the other way.
  - The CO₂ rings that drifted across the lipid as decoration are gone: CO₂'s crossing is now the model's net.

## Consequences

- The advice given beforehand, that CA would run forward during recovery with pHo held, was wrong. The model shows
  that NBC's import outpaces the rise in HCO₃⁻, so CA keeps running back, only more weakly. The page states what the
  model shows.
- `src/core/protons.test.ts` pins CA's rest rate (= −NBC), the burst, and its net against a finite difference of the HCO₃⁻
  amount.
