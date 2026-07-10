# Star Strike RUSH Meta-Screen Polish

## Purpose

Polish the title and meta experience so it feels like a coherent arcade command
deck: legible at a glance, generous on small screens, and distinct from an
application dashboard. This pass does not alter in-run visual treatment, enemy
art, boss art, or combat HUD behavior.

## Product Direction

The title screen is the launch surface. Play remains the central, largest
action. Pilot identity and currencies explain current state in one quick scan;
the four meta destinations explain where a player can go next.

Meta destinations use a shared screen system, not small floating dialogs. A
screen is allowed to cover the title background and uses a consistent header,
back target, content viewport, and bottom-safe interaction zone. The current
canvas implementation remains the rendering architecture.

## Visual System

- Material: dark space-glass, hard arcade geometry, thin edge light, and
  destination-specific accent colors.
- Hierarchy: one primary title, one short status line, one content region, and
  restrained secondary labels. Do not stack competing framed cards.
- Density: large touch targets, deliberate vertical rhythm, concise labels,
  and empty space around state changes. Information is grouped by purpose,
  rather than packed into equal-weight rows.
- Accessibility: retain existing high-contrast colors and ensure every icon
  has a visible text label or a destination header. Non-essential animation
  follows the existing reduced-motion preference.

## Title Screen

- Keep the title art, pilot call sign, currency strip, central Play action, and
  Achieve/Road/Records/Codex destinations.
- Improve the destination row with stable label baselines, explicit active
  feedback, and a clearer separation from the Play action.
- Account stays to the left of the editable call sign. It owns profile, sync,
  settings, and reset utilities.
- Currencies remain visible in the title header and inside relevant meta
  screens. Glory, Credits, and Season Tier are never presented as paid or
  power-granting resources.

## Screen System

### Shared behavior

- A screen opens and closes with a short directional transition. Opening a
  screen does not leave a miniature panel floating over the title interface.
- Header contains an explicit back control, destination title, and a concise
  context/status line. It remains visually anchored while content scrolls.
- Long content scrolls only in its viewport. Drag, wheel, and tap behavior are
  mutually exclusive and do not accidentally activate a background title
  control.
- Each screen uses its own accent color but retains the same navigation and
  spacing rhythm.

### Achievements

- Present overall progress first, then roomy achievement rows grouped by
  earned and remaining milestones.
- Trophy handles use the corrected upright orientation.
- Unlocked rows gain a subtle glow and completion mark; locked rows are
  readable without looking disabled to the point of being invisible.
- Signed-out copy points to Account without presenting a second login flow.

### Progress Road

- Preserve the existing vertical ascent: early nodes at the base, future nodes
  above, and the current ship marker traveling forward and up.
- Keep the current node in the lower half when opening the Road so the player
  can see the path ahead. Do not auto-position to a blank section.
- Make the central rail the visual focus. Reduce repeated framed-card weight;
  nodes and reward markers carry the hierarchy.
- Current node uses the ship marker, energy trail, and a restrained pulse.
  Selected rewards expose a readable inspection/claim area without hiding the
  next milestones.
- Glory and Season tabs share navigation but retain their different reward
  grammars. Season uses explicit Flight and Supply lanes and real claim state.

### World Records

- Use a rank-first leaderboard: placement, call sign/rank, then score, with
  the player row distinguishable when present.
- Give loading, empty, signed-out, and refresh states dedicated room instead
  of blending them into the list.
- Refresh remains in the bottom-safe action zone and never competes with
  scrolling rows.

### Account

- Start with the pilot card: call sign, rank, online state, and sync summary.
- Place sign-in/sign-out and refresh actions in a dedicated connectivity group.
- Place particle/performance controls and reset in a clearly separated utility
  group. Destructive reset remains visually and spatially distinct.
- Call sign remains editable from the title and account context.

### Codex

- Use an airy discovery grid with a strong discovered/undiscovered state.
- Inspection uses a full content view with silhouette, role, phase, behavior,
  and counterplay, rather than a cramped card.

## Motion

- Screen transitions: 160-220 ms eased slide/fade, with no persistent motion
  once a screen has settled.
- Road: marker trail and current-node pulse only. The track must not scroll by
  itself after initial focus.
- Reward claim: short confirmation flash and count update. No confetti or
  decorative effects that obscure information.
- Reduced motion: suppress screen slides, pulse amplitudes, and trails while
  preserving state changes and contrast.

## Responsive Rules

- Treat 375 x 667 portrait as the baseline.
- On short screens, preserve the header and bottom-safe action zone first;
  content viewport contracts and scrolls rather than shrinking below readable
  type or touch-target size.
- On wider screens, add horizontal breathing room but do not turn the meta
  layer into a dashboard or multi-column application layout.
- Maintain 40 px or larger primary touch targets where layout permits.

## Data And Safety Boundaries

- This pass consumes existing local and Firebase-backed profile/progression
  data. It does not introduce new secrets, client-authoritative rewards, paid
  cosmetics, UGC cosmetics, payments, or gameplay advantages.
- Signed-out fallback remains fully playable and uses existing local metadata.
- Server-authoritative Function pathways remain the source for signed-in
  progression grants when deployed.

## Implementation Boundaries

- Favor additions to the existing title screen, panel renderer, progress-road
  renderer, and title input modules. Extract focused helpers only when a
  renderer becomes materially less readable.
- Do not change in-run rendering modules in this scope.
- Update `gameinfo.txt` and `docs/design-blueprint.html` with the final screen
  behavior and visual rules as implementation changes.

## Verification

- Add test coverage for any new pure layout, screen-state, or focus helper.
- Run the existing progression-road, server-progression, and difficulty
  sampling suites.
- Run syntax checks over browser and Functions source.
- Capture desktop and 375 x 667 screenshots for title, Achievements, Road,
  Records, Account, Codex, and a game-over-to-Road transition.
- Run a repository secret-pattern scan before committing.

## Out Of Scope

- Changes to in-run art, effects, enemy sprites, boss sprites, combat HUD, or
  game balance.
- New progression tracks, missions, currencies, cosmetics, UGC, monetization,
  or payments.
