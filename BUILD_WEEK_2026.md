# Build Week 2026

## Comparison baseline

- Preserved commit: `529aca1`.
- Published comparison branch: `pre-competition`.
- Competition branch reconciled into `main` before this recovery pass.
- Stabilization branch: `codex/stabilization-recovery`.

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
- Imported 43 supplied source images through a reproducible transparency,
  trim, padding, and browser-size pipeline. Hosting ships 45 optimized
  derivatives: 25 sprites, 13 powerups, and 7 menu/PWA icons.
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
- Deliberately gated public score and weekly league submission until the server
  can attest gameplay rather than merely validate browser-reported totals.

## Verification evidence

- `npm test`: 29/29 Node and Chromium tests passing on the recovery branch.
- Browser coverage starts a run, moves, pauses/resumes, verifies frozen pause
  time, exercises touch joystick/ability input, edits and autosaves a call sign,
  and checks that gameplay announcements remain absent.
- Contract coverage includes collision overlap/misses, collision spawn scale,
  sprite orientation, fixed-step equivalence at 30/60/90/120 Hz, long-gap
  clamping, boss staging invulnerability, 1,500 seeded debris patterns, ability
  accounting, public identity whitelists, and the competition gate.
- Visual QA captures 11 mobile/desktop states: title, Pilot Dossier, settings,
  progression, Codex, powerup gallery, Siphon, active/incoming Debris Warden,
  and desktop title/gameplay. The incoming-boss capture asserts full HP and
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
