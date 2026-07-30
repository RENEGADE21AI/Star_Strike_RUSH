# Project Status

Last audited: 2026-07-29

This is the release truth table. Disabled, configuration-dependent, previewed,
and production-deployed are distinct states.

## Preseason product authority

| Concept | Current state |
| --- | --- |
| Progression authority | `device_local_preseason` |
| Gameplay profile | **DEVICE PROGRESS**, stored locally and authoritative |
| Firebase identity | Active when configured; separate from gameplay progression |
| Account archive | Legacy data preserved and loaded separately |
| Legacy records | `legacy_unverified`; never used to seed verified/current progress |
| Client competition writes | Disabled |
| Server competition writes | Disabled |
| Server progression writes | Disabled |
| Verified run sessions | Disabled/not implemented |
| App Check enforcement | Prepared but disabled; live configuration not verified |

Account sign-in, refresh, call-sign publication, restored auth, sign-out, and
switching between Accounts A and B must not change high score, Glory, Season XP,
Credits, lifetime statistics, local reward claims, achievements, or Codex
discoveries. Signed-in Season rewards use the same local path as signed-out
rewards.

## Stable and verified locally

| Area | State | Evidence |
| --- | --- | --- |
| Keyboard/touch play | Stable | Real Chromium start, move, ability, pause, resume, pickup, and touch tests |
| Device progression boundary | Stable | Real browser + Auth/Firestore/Functions emulators with conflicting account data |
| Account call sign | Stable | Pending intent wins temporarily; otherwise server confirmation replaces stale UID-scoped cache; failure retry and guest isolation |
| Auth hydration | Stable | `onAuthStateChanged` sole owner; one callable, one aggregate load, one listener per login |
| Mobile Google auth flow | Mock/emulator verified | Popup success, blocked-popup redirect fallback, redirect restoration, sign-out, account switching |
| Season rewards | Stable/local | Signed-in and signed-out local claims are identical and survive reload |
| Server preseason gates | Stable/closed | All three endpoints reject before auth or Firestore access |
| Legacy leaderboard | Quarantined | Separate legacy/verified fields and public-only/leaderboard-only/conflict/no-record tests |
| Achievements | Stable | One generated 79-entry catalog, browser/server parity, semantic and reachability checks |
| Achievement migration | Applied | Production aggregate reconstructed from 15 valid historical unlocks; zero-change follow-up dry run |
| Achievement hydration | Stable | One aggregate returned by the profile owner callable; no 79-document browser listing |
| Vault/Codex scrolling | Stable | Touch drag at 375×667, 390×844, 430×932; wheel, keyboard, and buttons |
| Audio | Stable | Independent Music/Effects, legacy setting migration, lazy load, time-based 30/60/90/120 Hz mix |
| Title/traffic | Stable | Measured title gap/bounds, normalized time paths, depth durations, correctly oriented patrols capped at normal fighter scale, UI-safe lanes, Reduced Motion |
| Debug records/reset | Stable | Debug cannot persist records/progression; reset clears all progression-bearing local state |
| Combat HUD | Stable | Pause top-left; standard manual and all automatic pauses cost one Health; First Flight manual pause is free; Energy above segmented Health bottom-left; compact score block top-right |
| Boss/realm presentation | Focused pass locally verified | Supplied boss sprites are the primary render path; Wraith physical/ghost variants share the canonical 640×282 alpha mask exactly |
| First Flight onboarding | PR #14 merged; focused visual pass locally verified | Deterministic 13-step director, explicit one-time Yes/No route, owner-supplied Colonel Arisaka portrait, fresh-galaxy arrival, arrival/dialogue input locks and shake suppression, free manual training pause, checkpoints, replay, two tutorial bosses, and no-progression assertions |
| Production debug surface | Removed | Build strips QA scenarios/snapshots; player-facing phase skips and hitbox controls removed |
| Firestore authorization | Stable | Emulator tests cover anonymous denial, owner privacy, bounded reads, browser-write denial |
| Build/cache contract | Stable | Commit-versioned runtime/assets plus no-store HTML and `version.json` |
| Visual QA | Stable | Existing release cases plus asserted First Flight desktop/mobile scenes, launch states, realm UI, account offer, and checkpoint resume |

## Firebase identity and archive boundary

The active callables are:

- `syncPilotProfile`: publishes account identity, returns sanitized legacy
  account archive metadata and one achievement aggregate.
- `claimPilotHandle`: transactionally claims one account-bound public handle.

Both enforce payload limits and per-UID Firestore throttles with structured
errors. Provider email, display name, avatar, and redundant public UID fields
are not copied into public game profiles. `publicPilotId` is an opaque,
deterministic game identifier; private ownership still uses the document path
and server-only handle registry.

`syncPilotProfile` also performs migration-on-touch for public identity. It
preserves legacy score/phase under explicit names, never inflates verified
fields, and deletes obsolete `bestScore`, `phase`, Glory/rank/tier,
`achievementsCount`, and duplicated `uid` fields. `leaderboard_scores` remains
untouched as the legacy archive.

The paused callables are:

- `submitRunReceipt`
- `joinWeeklyLeague`
- `claimSeasonReward`

They fail with `failed-precondition` before authentication, reads, or writes
while `SERVER_PROGRESSION_WRITES_ENABLED` is false. Existing server data is
preserved; it is not described as current, live, verified, or a world record.

## Configuration-dependent and not yet proven live

| Area | Boundary |
| --- | --- |
| Real Google popup/redirect | Staging proves Identity Toolkit accepts the exact preview origin; actual Account A/B interaction remains a human gate |
| Real account call-sign publication | Requires live Functions/Auth verification |
| Production achievement archive | Applied 2026-07-28: 1 aggregate reconstructed from 15 valid unlocks, 0 invalid IDs; follow-up dry run found 0 remaining changes |
| App Check | Console provider registration and direct enforcement tests have not been performed |
| Audio distribution rights | Owner authorization to publicly distribute both MP3s recorded on 2026-07-28; no artist/source/license name inferred |
| Exact-SHA backend staging | PR #14 merge `0b1ef8f8eff38962580b9b8e0c0d5884d948c1f8` staged with matching Hosting/backend SHA at its preview |
| Production deployment | Production Hosting remains unchanged; Account A/B approval is incomplete |

## Verification commands

```powershell
npm ci
npm ci --prefix functions
npm test
npm run test:rules
npm run test:firebase-client
npm run test:visual
npm run build
npm audit --omit=dev --audit-level=high
npm audit --prefix functions --omit=dev --audit-level=high
```

Evidence inherited from the preceding release candidate:

- `npm test`: 85/85 passed.
- Firebase client integration: one complete real-emulator browser scenario
  passed, including Accounts A/B, pending retry, aggregate loading, cleanup, and
  all three direct gate rejections.
- Visual QA: 16/16 asserted cases passed.

Current onboarding-entry refinement evidence on Node 22:

- `npm test`: 123/123 passed, including complete real-action desktop and touch
  tutorial journeys.
- Firestore Rules emulator: 4/4 passed.
- Firebase client integration: one complete real-emulator browser scenario
  passed.
- Visual QA: 40/40 asserted cases passed; the Arisaka question and prelaunch
  portrait scenes were manually inspected at mobile size.
- Production build: 101 public files generated.
- Root production audit: 0 vulnerabilities. Functions audit: 0 high-severity
  findings and 9 known moderate transitive findings.
- Tracked-file secret scan: 231 files passed.

PR #14 merged with green `verify` and `secret-scan`; its exact-SHA preview was
staged and smoke-tested. Account A/B smoke remains incomplete, and this
document does not imply a production Hosting deployment.

The focused onboarding-entry refinement replaces local-progress guessing with a
one-time explicit Yes/No decision whenever `star_strike_rush_onboarding_v1` is
absent. High score, Glory, achievements, and Codex data do not answer that
question. Yes opens a separate call-sign prelaunch briefing; No stores
`skipped` and opens the normal title. Checkpoints survive reload; death restores
the current training checkpoint rather than entering Game Over; skipping is
available in flight; replay is available in Settings. First completion reveals only the
training entities in the local Codex and never adds a standard achievement.
The canonical achievement catalog remains exactly 79 entries.

The refinement also keeps normal manual pause at its deliberate one-Health
cost, makes tutorial manual pause free, and charges one Health for automatic
focus/visibility pause in either run mode. It freezes control and ordinary
simulation through warp arrival and paused instructor dialogue, requires a
damage-free evasion crossing, requires the Ghost lane boundary to be crossed
while real Ghost protection is active, and skips redundant post-graduation
account steps according to current sign-in and handle state. This section is
local evidence only until the focused PR is merged and a new exact-SHA preview
is staged.

The current gameplay-visual pass uses the supplied Command Ship and Wraith art
as the normal boss-rendering path, fixes combat/title fighter headings, caps
title patrol scale at 1.0, separates the two title lines by measured bounds,
reduces the bottom-left HUD footprint, replaces Ghost Shift afterimages with a
single translucent glow, suppresses shake during instructor transmissions, and
uses a two-second top-down galaxy transit into the exact gameplay position. The
Wraith realm sprites are deterministic RGB recolors of one canonical source;
their dimensions and every alpha byte match, so realm changes cannot alter the
silhouette or weapon geometry. These changes remain local evidence until their
focused PR and exact-SHA preview are complete.

## Release policy

1. Merge only with green `verify` and `secret-scan` GitHub checks plus local
   emulator, visual, build, dependency-audit, and secret-scan evidence.
2. Run `scripts/release.ps1 -StageBackendPreview` from clean merged `main`.
3. Calculate the complete production-baseline-to-release range. Deploy exact-SHA
   Functions first, then the exact tested Rules idempotently, then changed
   indexes, then a commit-named preview.
4. Require intended SHA = Hosting SHA = backend SHA and smoke-test headers,
   private 404s, Google Identity origin acceptance, and all three paused
   callable boundaries.
5. Complete the ignored sanitized approval file with Account A/B, unchanged
   device progress, migration disposition, and explicit owner music rights.
6. Run `-Production -ApprovalFile ...`; deploy Hosting last.
7. Production remains blocked if any required evidence cannot be completed
   truthfully. See `docs/RELEASE_WORKFLOW.md`.
