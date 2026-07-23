# Build Week 2026

## Comparison baseline

- Preserved commit: `529aca1`.
- Published comparison branch: `pre-competition`.
- Competition branch reconciled into `main` before this recovery pass.
- Final polish branch: `codex/post-recovery-polish`.

The baseline already had a playable shooter, bosses, adaptive pressure,
achievements, Glory/Season progression, a Codex, and Firebase scaffolding. Its
main risks were broad collision approximations, refresh-rate-dependent runtime
behavior, unsafe positional collision calls, input crashes, public identity
overexposure, touch/desktop ambiguity, unreachable Debris Warden patterns, and
visual/UI inconsistency.

## Product transformation

- Split gameplay responsibility across ordered asset, runtime, rules, input,
  entity, boss, rendering, UI, session, and online modules without a risky
  framework rewrite.
- Added a deterministic 60 Hz fixed-step clock, high-DPI canvas backing,
  background-gap clamping, pause/resume countdowns, and focus-loss auto-pause.
- Replaced positional collision calls with an object contract and per-entity
  collision circles that remain separate from decorative artwork.
- Added explicit sprite orientation, weapon origins, exhaust origins, and
  anchors. The player ship now always faces forward/up; hostile ships face into
  the playfield.
- Imported 44 supplied source images through a reproducible transparency,
  trim, padding, and browser-size pipeline. Hosting ships 46 optimized
  derivatives: 26 sprites, 13 powerups, and 7 menu/PWA icons.
- Added the supplied wingman as a compact, independently trimmed sprite with
  its own collision radius. Player and wingmen are rotated into forward/up
  flight; hostile fighters remain oriented into the playfield.
- Added the supplied powerup art at ship-safe scale. Drops rotate as they fall,
  retain compact pickup hitboxes, and no longer render the old dotted orbital
  ring behind them.
- Rebalanced the Debris Warden so single rows dominate, doubles remain rare and
  reachable, every row accelerates as health falls, and rocks grow smoothly
  from zero to their final visual/collision scale.
- Made every boss invulnerable while entering/staging. `STAGING` remains visible
  until the first attack begins, at which point damage is enabled.
- Removed in-run announcement cards and popup banners. Boss state, abilities,
  safe routes, health, and score use compact HUD or in-world communication.
- Rebuilt title-to-game travel as a launch/arrival transition and made panels
  expand from and collapse back into their source controls.
- Replaced wide-screen curtain bars with irregular low-contrast space-fog
  pockets, continuous stars, and a quick shared edge fade that can obscure
  ships and hazards near the playfield boundary.
- Rebuilt Account as a tabbed Pilot Dossier with an editable autosaving call
  sign, small unique account-bound handle, public-visibility warning, restrained
  network state, local settings, and a truthful preseason league state.
- Added reduced-motion, reduced-flash, and high-contrast settings.
- Reworked the Codex into categorized two-column cards with scrolling, discovery
  state, and wrapped tactical detail.
- Kept provider email, name, and avatar out of public game identity payloads.
- Kept authenticated leaderboard reads available while deliberately gating new
  public score and weekly league writes. The callable Functions now enforce the
  fair-play pause before authentication or payload handling, so an old or
  modified client cannot bypass the recovery client's UI.

## Verification evidence

- `npm test`: 45/45 Node and Chromium tests passing on the recovery branch.
- Browser coverage starts a run, moves, pauses/resumes, verifies frozen pause
  time, exercises touch joystick/ability input, edits and autosaves a call sign,
  checks that gameplay announcements remain absent, and verifies persisted
  reduced-motion, reduced-flash, and high-contrast behavior.
- Contract coverage includes collision overlap/misses, collision spawn scale,
  sprite orientation, fixed-step equivalence at 30/60/90/120 Hz, long-gap
  clamping, boss staging invulnerability, 1,500 seeded debris patterns, ability
  accounting, public identity whitelists, and the competition gate.
- Visual QA captures 15 mobile/desktop states, including the title at
  375×667, 390×844, 430×932, and 1440×900; Pilot Dossier; settings;
  achievements; progression; Codex; powerup gallery; wingmen; Siphon; and
  active/incoming Debris Warden. The incoming-boss capture asserts full HP and
  `damageable=false` under automatic fire.
- `npm run build` creates an allowlisted `dist/` payload. Firebase Hosting serves
  that directory without an SPA catch-all and applies CSP, MIME-sniffing,
  referrer, permissions, and cache headers.
- GitHub Actions installs Chromium, syntax-checks browser/Function JavaScript,
  runs all tests, audits dependencies at high severity, builds `dist/`, loads
  the Function module, validates Firebase JSON, and performs a secret scan.

## Codex evidence

OpenAI Codex was used to audit, implement, test, and visually inspect this
recovery. No GPT model is embedded in or called by the shipped game.

Codex task/session ID: `019f8668-58bb-7c72-96f2-e4fe17af834c`

Playable URL: https://star-strike-rush.web.app

## Honest limitations

- Public score/league submission is disabled pending server-issued run sessions,
  App Check, replay or telemetry verification, rate limits, and abuse review.
- Real Google sign-in and cross-device persistence require a human account smoke
  test against the configured Firebase project.
- Audio, haptics, account migration UX, offline sync/outbox behavior, and synced
  accessibility settings are deferred.
- Procedural rendering remains a fallback if an image fails to decode.
- The Function dependency tree currently has no high/critical audit finding;
  moderate transitive findings remain documented in `PROJECT_STATUS.md` rather
  than forcing a breaking dependency downgrade.
