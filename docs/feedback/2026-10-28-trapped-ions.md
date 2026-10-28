# Tony on ions trapped at the channels, v0.1.7, 2026-10-28

> *"the ionhomie home page is nice the ions flow nicely, but the other pages the ions are trapped moving in and out of the
> channel rather than diffusing into the cell / extracellular space"*

Built 2026-10-28, not yet deployed ([ADR-0020](../adr/0020-a-crossed-dot-wanders-off-before-it-crosses-again.md)):

| note | what changed |
|---|---|
| Ions trapped moving in and out of the channel | A crossed dot must wander 50 px from the membrane before it may cross again (it was a 3 s rest); the thinning now also keeps the scarce side (Na⁺ and Cl⁻ inside, K⁺ outside) from being drawn on faster than once per dot per 6 s. |
| Rather than diffusing into the cell / bath | Every stage wanders at the homeostat's 26 px/√s (was 9). |

Measured, not seen in person: the "home page" Tony liked measured the same as the chapter pages before the fix (65% of
crossings by a dot that crossed < 10 s before); only the homeostat was low (21%). If Tony meant the homeostat, this matches.
