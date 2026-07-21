# Build Week 2026

## Baseline

- Preserved pre-change commit: `529aca1`
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
- Replaced Ghost with a boss-specific non-phasing `DASH` profile for Debris
  Warden only.
- Added restrained predictive Siphon aim, full-playfield range, a fire telegraph,
  and a visible trail whose core agrees with its collision circle.
- Clipped the logical playfield so title fighters and effects cannot escape into
  desktop fog, added formation depth variation, and made discovery alerts
  smaller, translucent, and side-entering.
- Redesigned both progression roads as upward winding paths with solid completed
  and dotted future segments, an upward fighter marker, and restrained space
  landmarks.
- Added a UTF-8 declaration after visual QA exposed corrupted UI symbols.

## Verification

- Every browser and Function JavaScript file is syntax-checked with Node.
- Focused tests cover public identity whitelisting, call-sign persistence,
  manifest validity, 1,500 seeded double-gate patterns, DASH semantics, Siphon
  aim/range, meaningful input switching, and upward progression geometry.
- Browser QA uses the hidden debug snapshot plus deterministic Siphon and Debris
  Warden scenarios. Desktop gameplay verified that touch controls stay hidden;
  Debris Warden verified `DASH`, `ghostTimer=0`, and `inv=0` after activation.
- Final viewport, touch emulation, signed-out persistence, and hosted smoke-test
  evidence is recorded in the final Codex report for this branch.

## Codex use

OpenAI Codex, powered by GPT-5.6, was the development agent used to audit,
implement, test, and visually inspect this transformation. No GPT model is
embedded in or called by the game at runtime.

## Limitations

- No image assets exist in the checkout or reachable history, so the new asset
  registry truthfully uses procedural Canvas fallbacks. No art provenance is
  invented.
- Google authentication cannot be exercised locally without a Firebase web
  config and test account.
- Cloud Functions still require the Firebase project prerequisites described in
  `FIRESTORE_DATA_MODEL.md` before authoritative progression can be deployed.

Playable URL: https://star-strike-rush.web.app

Build Week commit range: `529aca1..codex/build-week-polish`
