# Build Week 2026

## Baseline

- Preserved pre-change commit: `529aca1`
- Published comparison branch: `pre-competition` at `529aca1`
- Working branch: `codex/build-week-polish`
- Before this pass the prototype was playable and already had bosses, adaptive
  pressure, Glory/Season progression, achievements, a Codex, and Firebase
  scaffolding. It also used broad radius collisions, exposed provider identity
  in public payloads, showed touch controls on desktop, had an unreachable
  double-debris-row risk, and lacked an explicit Account call-sign editor.
- Automated baseline: 3 test files passed.
- Baseline title, panels, roads, gameplay, and boss states were inspected in a
  real browser before editing.

## Transformation

- Added per-entity sprite metadata, tuned single/multi-circle hitboxes,
  projectile origins, preload gating, safe fallbacks, and a debug-only overlay.
- Imported 30 supplied artwork files into a reproducible transparent-sprite
  pipeline. Originals are preserved in the Hosting-ignored `source-art/`
  archive; the player, full enemy roster, bosses, asteroid hazards, menu icons,
  and favicon use optimized derivatives.
- Added validated call-sign edit/save states with signed-out persistence and
  signed-in synchronization.
- Reduced public Firestore and leaderboard records to call sign plus game stats;
  Google name, avatar, and email remain private and legacy fields are removed on
  replacement writes.
- Reworked meaningful-input detection so touch controls follow actual touch/pen
  use rather than viewport width. Keyboard guidance remains visible on desktop.
- Tuned movement acceleration/deceleration and action handling.
- Made every Debris Warden double gate reachability-checked against actual
  player/asteroid collision radii and movement capability; simultaneous threats
  are cleared and safe lanes are telegraphed.
- Rebalanced the Debris Warden so single rows dominate its attack sequence,
  doubles are rare, every row accelerates continuously as health falls, and
  spawned asteroids ease from zero to their final visual and collision scale.
- Replaced Ghost with a boss-specific non-phasing `DASH` profile for Debris
  Warden only.
- Added restrained predictive Siphon aim, full-playfield range, a fire telegraph,
  and a visible trail whose core agrees with its collision circle.
- Rebuilt the playfield and desktop gutter as one deep-space environment with
  low-contrast nebulae, parallax stars, engine light, cinematic projectiles,
  cross-boundary fog, and fast edge dissipation instead of curtain-like bars.
- Removed in-run announcement cards and banner popups. Bosses use a compact
  health bar, powerups communicate through shape/color, and Debris Warden safe
  routes use subtle in-world corridor guides.
- Made every boss invulnerable while entering and staging. The health bar shows
  `STAGING` until the first attack begins, when vulnerability activates.
- Redesigned both progression roads as upward winding paths with solid completed
  and dotted future segments, an upward fighter marker, and restrained space
  landmarks.
- Added a UTF-8 declaration after visual QA exposed corrupted UI symbols.
- Rebuilt Account as a tabbed Pilot Dossier with a restrained animated ship
  hologram, editable call sign, small public `@handle`, visibility warning,
  animated flight-network status, simplified settings, and weekly Flight League
  standings.
- Added server-authoritative atomic handle claims and weekly grouping by prior
  best-score band. Verified Flight Points are credited from accepted run
  receipts, not arbitrary browser writes.

## Verification

- Every browser and Function JavaScript file is syntax-checked with Node.
- Focused tests cover public identity whitelisting, call-sign persistence,
  manifest validity, 1,500 seeded double-gate patterns, DASH semantics, Siphon
  aim/range, meaningful input switching, and upward progression geometry.
- Browser QA uses eight mobile/desktop captures plus hidden debug snapshots for
  title, Pilot Dossier, Progress Road, Siphon, active Debris Warden, and incoming
  boss states. Desktop gameplay verified that touch controls stay hidden;
  staging boss QA verifies full HP and `damageable=false` under automatic fire.
- Final viewport, touch emulation, signed-out persistence, and hosted smoke-test
  evidence is recorded in the final Codex report for this branch.
- GitHub Actions reruns every JavaScript test, syntax-checks browser and Function
  scripts, loads the Function module, and validates Firebase JSON on every push.

## Codex use

OpenAI Codex, powered by GPT-5.6, was the development agent used to audit,
implement, test, and visually inspect this transformation. No GPT model is
embedded in or called by the game at runtime.

Codex task/session ID: `019f8668-58bb-7c72-96f2-e4fe17af834c`

## Limitations

- Google authentication requires a real judge/user account and cannot be fully
  automated in local smoke tests. Signed-out local play remains explicit and
  functional.
- Procedural drawing remains as a deliberate resilience fallback if an artwork
  request fails; the normal judged path uses the supplied optimized artwork.

Playable URL: https://star-strike-rush.web.app

Deployment state: Hosting, server-authoritative Functions, Firestore rules, and
indexes are deployed together from the competition build.

Build Week commit range: `529aca1..codex/build-week-polish`
