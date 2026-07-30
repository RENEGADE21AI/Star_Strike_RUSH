# Build Week 2026

## Baseline

- Preserved comparison commit: `529aca1`.
- Release-integrity starting commit:
  `d5a298fd5cb9d653b2013c6a3e5d894342a1e5e0`.
- Release-integrity feature branch: `codex/release-integrity-preseason`.
- Final production-gate starting commit:
  `419395afda3061754d98a74d42fcfd9aed2dc0af`.
- Final production-gate branch: `codex/final-production-gate`.
- First Flight onboarding starting commit:
  `0fdb7beff47325adfc1c2259de0875f9292f45e9`.
- First Flight onboarding branch: `codex/first-flight-onboarding`.

The starting game already had local play, 79 achievements, Glory/Season roads,
music/effects, a Records Network, a Pilot Dossier, Firestore rules, callable
Functions, and closed client/server competition gates. The release-integrity
pass preserved working gameplay while correcting account/progression authority
and release evidence.

## Product and runtime transformation

- Split gameplay responsibility across ordered asset, runtime, rules, input,
  entity, boss, rendering, session, and Firebase modules without a framework
  rewrite.
- Added a deterministic 60 Hz fixed-step clock, high-DPI Canvas backing,
  background-gap clamping, pause/resume countdowns, and focus-loss auto-pause.
- Replaced positional collision calls with an object contract and per-entity
  collision circles separate from decorative artwork.
- Imported owner-supplied source art through a reproducible transparency, trim,
  padding, and browser-size pipeline. Original files remain outside Hosting.
- Rebalanced boss staging and Debris Warden patterns, clarified abilities, and
  kept in-run communication compact.
- Rebuilt title/panel transitions, progression roads, the Pilot Dossier,
  Achievement Vault, Codex, and Records Network around compact Canvas UI.

## Release-integrity work

### Device progression and account identity

- Defined separate configuration for client competition writes, server
  competition writes, server progression writes, and progression authority.
- Device progression remains authoritative. Account hydration stores Firebase
  metadata as `onlineArchiveMeta` and has no API capable of merging it into
  local gameplay progression.
- Signed-in and signed-out Season reward claims use one local path.
- Call-sign publication uses UID-scoped pending state with explicit stored,
  publishing, published, pending, and failed outcomes.
- Pending call-sign intent temporarily wins; without pending intent, the
  server-confirmed value replaces stale cross-device published caches. Sign-out
  clears runtime pending state without deleting a UID-scoped retry.
- `onAuthStateChanged` is the sole hydration owner, with stale-UID cancellation,
  one profile callable, one aggregate load, one archive listener, and listener
  teardown on sign-out.
- Google popup auth falls back to redirect where needed; boot consumes one
  redirect result without duplicating hydration.
- Browser runtime and test tooling use exact Firebase SDK `12.16.0`.

### Server and legacy-data boundary

- `leaderboard_scores` is retained as a **LEGACY/PRESEASON ARCHIVE**.
- Legacy score/phase fields are separated from future verified fields and never
  seed verified/profile progression.
- `submitRunReceipt`, `joinWeeklyLeague`, and `claimSeasonReward` reject before
  auth, reads, or writes while server progression writes are paused.
- Active identity callables have payload-size bounds, per-UID throttles, safe
  errors, and a prepared-but-disabled App Check flag.
- Public profiles migrate on touch to explicit legacy/verified record fields.
  Obsolete score, phase, Glory, rank, tier, achievement-count, and duplicated
  UID fields are deleted only after legacy values are preserved.
- Callable responses and paused-error details include a sanitized backend
  release identity so smoke tests can prove Hosting and Functions run the same
  exact commit.

### Achievement migration

- One canonical JSON schema generates browser and server catalogs.
- Build validation requires exactly 79 unique, categorized, tiered, supported
  definitions with honest combo/boss semantics.
- Deterministic sanity checks cover one-run reachability.
- An Admin-only, dry-run-by-default migration reads historical unlock documents
  once and creates an additive, idempotent aggregate with `schemaVersion`,
  `migratedAt`, and `sourceCount` without changing original timestamps.
- Ordinary hydration returns one sanitized aggregate rather than listing up to
  79 documents.

### Interaction, audio, and title

- A reusable Canvas scroll controller powers Vault and Codex touch drag,
  pointer capture, thresholding, clamping, restrained momentum, wheel,
  keyboard, and visible buttons.
- Achievement descriptions use measured two-line wrapping.
- Music and Effects are independent settings with safe migration from the old
  combined toggle.
- Music loading is gesture-safe and lazy; its mix is based on real elapsed
  seconds and is equivalent at 30, 60, 90, and 120 Hz.
- Title flight uses `durationSeconds`, normalized progress, explicit depth
  profiles, and one `titleFormationPositionAt` function for runtime, tangent,
  reservation, and measurement.
- Foreground/midground ships are readable, remain below primary controls, and
  Reduced Motion freezes a nearly static atmospheric formation.
- Play and Respawn use immediate activation with a short press response; the
  misleading hold meter is gone.
- The combat HUD now keeps the top-left pause control separate from compact
  top-right Score/Hi-Score/Combo text. Energy sits above segmented Health in a
  classic bottom-left stack above touch controls.
- A deliberate standard-run pause costs one Health bar and reports the cost;
  manual First Flight pause is free. Focus and visibility auto-pauses cost one
  Health in either run mode. A manual standard pause is refused when no spare
  Health remains.
- Player-facing phase skips, developer stats, and hitbox toggles are removed.
  Production builds also strip automated QA scenarios and debug snapshots.

### Build and release safety

- The build applies one commit-derived version to HTML runtime references and
  changed assets.
- `dist/version.json` records commit SHA, timestamp, package version,
  progression mode, and competition mode.
- HTML and `version.json` are no-store so new HTML cannot silently pair with an
  incompatible old runtime.
- The real browser Firebase client test runs against Auth, Firestore, and
  Functions emulators.
- Visual QA starts its own server, clicks computed debug rectangles, asserts
  state, measures title traffic, tests touch scrolling/Reduced Motion, and
  writes screenshots, JSON, and failure traces.
- `scripts/release.ps1` has explicit check-only, backend/Rules/preview staging,
  and approval-file production stages. It compares the complete last-production
  range, includes Rules and indexes, verifies backend/Hosting SHA equality, and
  verifies the exact Hosting origin can initiate Google Identity, and stops
  before production Hosting for human evidence.

## Current branch evidence

- `npm test`: 123/123 passing, including full real-action desktop and touch
  First Flight completions.
- Firebase client emulator scenario: passed Accounts A/B, one-owner hydration,
  pending call-sign retry, auth restoration, progression non-overwrite,
  aggregate retrieval, sign-out cleanup, and all three paused callables.
- Firestore Rules emulator: 4/4 passed.
- Visual QA: 40/40 asserted cases passed across 375×667, 390×844, 430×932,
  768×1024, and 1440×900.
- Production build and commit-version contract: passed with 101 public files.
- Root production audit: 0 vulnerabilities. Functions production audit:
  0 high-severity findings and 9 moderate transitive findings.
- Tracked-file secret scan: 231 files passed.

GitHub checks, exact-SHA preview smoke, and live Account A/B evidence must still
be obtained on the merge commit. This document does not claim those pending
steps or a production Hosting deployment.

## Honest limitations

- Public score/league submission stays disabled pending server-issued run
  sessions, replay or telemetry verification, live App Check, and abuse review.
- Real Google sign-in and cross-account behavior require a human smoke test
  against the configured live project and its authorized domains.
- The owner explicitly confirmed on 2026-07-28 that both supplied MP3 files may
  be publicly distributed as part of Star Strike RUSH. No artist, source URL,
  or formal license name was provided or inferred.
- On 2026-07-28, the production achievement migration reconstructed the one
  approved aggregate from 15 valid unlocks and 0 invalid IDs. The immediate
  follow-up dry run found zero remaining changes.
- Production is not considered deployed until live `version.json`, headers,
  private-path 404s, identity actions, device progression, and paused callables
  are verified against the merge commit.

Codex task/session ID: `019f8668-58bb-7c72-96f2-e4fe17af834c`

Playable URL: https://star-strike-rush.web.app

## First Flight onboarding

- Added a versioned first-launch router with a one-time explicit Yes/No choice;
  it never guesses from high score, Glory, achievements, or Codex data.
- Added an isolated 13-step tutorial director covering lightspeed launch,
  movement beacons, autofire positioning, evasion, real Ghost Shift, a Phase
  Shield pickup, controlled waves, a staged Command Ship, the two Wraith
  realms, real Realm Hop, the Wraith Sovereign, and graduation.
- Added centralized Colonel Arisaka identity and a replaceable owner-supplied
  portrait asset with a geometric load-failure fallback, concise transmissions,
  semantic live-region mirroring, compact action objectives, input-adaptive
  prompts, and reduced-motion/flash behavior.
- Added checkpoint recovery, confirmed skip, reload resume, replay from
  Settings, and optional Google identity only after first-time graduation.
- Tutorial score and kills remain internal objective counters. Persistent
  high score, device progression, achievements, receipts, public competition,
  and Firebase progression remain untouched.
- The gameplay visual pass uses supplied boss artwork, enforces movement-vector
  fighter headings, caps title patrols at normal fighter scale, separates the
  measured title lines, compacts the bottom-left status HUD, and renders Ghost
  Shift as one translucent glow without afterimages.
- Physical and ghost Wraith art is generated from the same canonical sprite
  with identical 640×282 dimensions and byte-identical alpha. Only the RGB
  palette changes, preserving silhouette and weapon geometry across realms.
- First load now begins over the ordinary galaxy with the player aircraft
  flying into position before Arisaka's transmission. Instructor dialogue
  clears and suppresses shake. The shared Play/First Flight launch is a
  two-second top-down galaxy transit that reaches the exact gameplay position.
