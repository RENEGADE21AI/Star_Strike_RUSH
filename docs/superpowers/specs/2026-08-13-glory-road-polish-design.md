# Glory Road General Polish Design

## Scope

This pass refines the rendered Glory/Prestige experience already implemented on
`codex/glory-road-prestige`. It does not change progression math, combat,
rewards, balance, Firebase authority, achievements, or onboarding.

## Validated problems

1. The focused semantic Continue action covers most of a celebration, producing
   an oversized second frame instead of a clear button-sized focus target.
2. Ordinary checkpoint copy places its detail and Continue prompt in the same
   vertical region.
3. The Road ship snaps to the last reached node rather than occupying the exact
   interpolated position represented by `roadGlory`.
4. The Road reuses the generic BEST/RANK/PRESTIGE strip even though total Glory
   is the primary permanent Road value.

## Design

- One pure celebration-layout helper owns panel dimensions, copy baselines, and
  the visible Continue target. Canvas rendering and semantic focus geometry use
  the same result, preventing drift.
- The Continue affordance becomes a restrained pill inside the celebration
  panel. Keyboard focus traces that pill rather than the whole modal.
- Checkpoint and rank panels share enough height for title, value, context, and
  Continue copy to remain separated at 375x667 and larger portrait viewports.
- The ship marker follows the existing cubic Road curve between surrounding
  milestones. Reached/future node styling remains discrete; only the player's
  position becomes continuous.
- The Road's top strip becomes TOTAL / RANK / PRESTIGE. The compact Road summary
  continues to show exact current-loop progress.

## Accessibility and performance

- Existing modal semantics, live-region copy, Enter/Space handling, Reduced
  Motion, Reduced Flash, Effects, and screen-shake behavior remain unchanged.
- Layout helpers allocate only when a panel is rendered; the Road marker uses a
  bounded scan across the existing small node array.
- No new media or network dependency is introduced.

## Verification

- Unit tests cover layout ordering, in-panel Continue geometry, continuous Road
  interpolation, exact-node behavior, and Road header values.
- Targeted visual QA covers checkpoint, rank, terminal, early Road, and Prestige
  Road states at mobile sizes, followed by the relevant regression suite and
  production build.
