# Glory Road + Prestige Implementation Plan

## Product contract

- `totalGlory` is the only mutable Glory balance and never decreases.
- `prestige = floor(totalGlory / 300000)` and `roadGlory = totalGlory % 300000` are derived.
- The current rank, ship marker, reached nodes, and Road scroll focus use `roadGlory`.
- Milestones repeat per Prestige cycle and are emitted by progression application, never inferred by rendering.
- Star Eternal and the corresponding Prestige rollover are one terminal event.
- Prestige is status only and never affects gameplay.
- The contemporary authority is explicit account-or-device replacement; this
  historical plan must not be used to reintroduce additive merging.

## Implementation slices

1. Add pure browser Glory math for Road state, display ranks, repeated absolute milestone detection, escalation intensity, and a bounded presentation queue. Lock it with deterministic boundary and multi-Prestige tests.
2. Migrate local meta data without changing cumulative Glory, lifetime stats, achievements, Codex, settings, identity, or onboarding. Retire obsolete secondary-currency and Season fields without replaying historical milestones.
3. Apply standard-run progress exactly once, attach structured milestone data, and initialize a post-run celebration queue only after combat ends. Tutorial/debug runs remain non-progressing.
4. Replace the two-tab progression panel with one Glory Road using current-loop values, permanent Prestige/total context, concise node details, and rollover-correct scroll focus.
5. Replace title and Game Over Season presentation with Prestige/Glory data. Make View Road always open the one Road.
6. Add one accessible celebration state machine for checkpoints, ranks, and terminal Prestige events. Scale intensity by Road position, respect Reduced Motion/Flash/Shake/Effects, intercept input, and merge multiple terminal crossings into a concise summary.
7. Remove Season rewards and grants from dormant server progression and private/archive serialization. Keep `claimSeasonReward` as an inert compatibility callable that rejects before auth or Firestore access with retired wording and release metadata.
8. Update emulator/browser/release tests, visual QA scenarios, and design/data-model/status documentation. Run the complete required verification suite and inspect the rendered artifacts.

## Display convention

Base rank names remain the rank ladder contract. At Prestige 0 the UI shows the unsuffixed rank (`ACE`). At Prestige 1 and later it appends the completed-Road numeral (`ACE I`, `ACE II`, and so on). Exact Road boundaries therefore show the next loop's current rank, such as `ROOKIE PILOT I`, while the crossing celebration preserves `STAR ETERNAL / PRESTIGE I`.
