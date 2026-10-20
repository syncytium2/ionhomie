# Naming: candidates and collision checks

**Open; Tony chooses.** Researched 2026-10-19 by a Claude subagent. "Unregistered" or "no
results" means only that the searches listed found nothing. No trademark search (USPTO) was
run for any name, and the syncytium2 organization was not searched separately.

Subdomains cannot carry underscores, so `salt_and_battery` would be served at
`salt-and-battery.tonydefazio.com`.

## Candidates

| name | rationale | pitfalls |
|---|---|---|
| **salt_and_battery** | "Assault and battery": salt is the ions, the battery is the membrane capacitor and its EMF. Covers every chapter | long; the pun is common on fish-and-chip shops (not checked by search) |
| **nernst_case** | "Worst case": without a pump everything runs down. Short, nerdy, like `colonel_kernel` | names one chapter; "case" can read as Case Western |
| **homeostat** | names the subject; nods to Ashby's 1948 homeostat | descriptive, not playful; npm name taken; Ashby simulators already use it |
| **pump_and_dump** | the pump–leak model is a pump plus a leak | securities-fraud term; names only the pump |
| **goldman_sacs** | Goldman (GHK) plus cells as sacs | a near-miss of a defended trademark; reads as a typo |
| **fickle** | Fick plus the fickle random walk | names one chapter; common word; npm taken |
| **leaky_bucket** | the classic pump–leak metaphor | owned by the networking rate-limiter algorithm |
| **bilge** | a leaky hull kept afloat by pumping; also "nonsense" | unsearchable; names only the pump |
| **uphill** | pumps push ions uphill; pairs with `downLow` | vague; names only the pump |
| **skou** | Jens Skou, discoverer of the Na⁺/K⁺-ATPase (1957; Nobel 1997) | obscure; names only the pump; pronunciation unclear |
| **donnybrook** | Donnan plus a brawl over the membrane | a stretch |

## Checks run

- **npm**: unregistered: `nernst`, `nernst-case`, `salt-and-battery` (all spellings),
  `pump-and-dump`, `pump-leak`, `goldman-sacs`, `bilge`, `uphill`, `skou`, `donnybrook`,
  `saltwork`, `donnan`, `iongrad`. Taken: `fickle`, `leaky-bucket`, `homeostat`, `goldman`,
  `ghk`.
- **GitHub repository names**: `nernst_case` 0; `salt_and_battery` 4, unrelated class
  assignments; `goldman_sacs` 1, unrelated; `donnybrook` 15; `homeostat` 158, including an Ashby
  simulator; `uphill` 213; `leaky_bucket` 234; `fickle` 245; `skou` 577, mostly substrings;
  `pump_and_dump` 92; `bilge` 1,641.
- **The field**: several Nernst/Goldman simulators already exist (University of Arizona's
  Nernst/Goldman Equation Simulator, Neurosim's Goldman module, PhET *Membrane Channels*,
  Barry's MemPot/ArtMem, an itch.io membrane-potential simulator with particles), which argues
  against a plain "nernst" or "goldman" name. No interactive pump–leak or Donnan simulator was
  found: the rundown and pump chapters look like the gap this tool fills.

## The researcher's top three

1. **salt_and_battery**: the only pun spanning the whole curriculum; no collision in the field.
2. **nernst_case**: short and funny, no collision found; risks reading as one chapter.
3. **homeostat**: the safe, descriptive option, but less distinctive.
