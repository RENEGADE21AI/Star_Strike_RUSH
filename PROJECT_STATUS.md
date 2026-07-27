# Project Status

Last audited: 2026-07-27

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
| Achievement migration | Ready | Admin-only, dry-run default, idempotent/additive aggregate migration |
| Achievement hydration | Stable | One aggregate returned by the profile owner callable; no 79-document browser listing |
| Vault/Codex scrolling | Stable | Touch drag at 375×667, 390×844, 430×932; wheel, keyboard, and buttons |
| Audio | Stable | Independent Music/Effects, legacy setting migration, lazy load, time-based 30/60/90/120 Hz mix |
| Title/traffic | Stable | Measured title bounds, normalized time paths, depth durations, UI-safe lanes, Reduced Motion |
| Debug records/reset | Stable | Debug cannot persist records/progression; reset clears all progression-bearing local state |
| Combat HUD | Stable | Pause top-left with one-Health deliberate cost; Energy above segmented Health bottom-left; compact score block top-right |
| Production debug surface | Removed | Build strips QA scenarios/snapshots; player-facing phase skips and hitbox controls removed |
| Firestore authorization | Stable | Emulator tests cover anonymous denial, owner privacy, bounded reads, browser-write denial |
| Build/cache contract | Stable | Commit-versioned runtime/assets plus no-store HTML and `version.json` |
| Visual QA | Stable | 16 asserted Chromium cases; screenshots/report and failure traces |

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
| Real Google popup/redirect | Requires Firebase authorized domains and a human account smoke test |
| Real account call-sign publication | Requires live Functions/Auth verification |
| Production achievement archive | Admin dry-run has not yet been performed against production data |
| App Check | Console provider registration and direct enforcement tests have not been performed |
| Audio distribution rights | Owner supplied MP3s; public-distribution provenance is not verified in repository evidence |
| Exact-SHA backend staging | Not yet performed for this final gate branch |
| Production deployment | Must not be claimed until Hosting SHA, backend SHA, approval, and live smoke are verified |

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

The final-gate branch adds tests for cross-device server precedence,
public-profile cleanup, stale-backend detection, full release-range planning,
approval validation, and the three-condition future league gate. The full suite,
GitHub checks, exact-SHA staging, Account A/B smoke, production migration
disposition, and music authorization must still be completed on the merge
commit; this document does not imply those results.

## Release policy

1. Merge only with green `verify` and `secret-scan` GitHub checks plus local
   emulator, visual, build, dependency-audit, and secret-scan evidence.
2. Run `scripts/release.ps1 -StageBackendPreview` from clean merged `main`.
3. Calculate the complete production-baseline-to-release range. Deploy exact-SHA
   Functions first, then the exact tested Rules idempotently, then changed
   indexes, then a commit-named preview.
4. Require intended SHA = Hosting SHA = backend SHA and smoke-test headers,
   private 404s, and all three paused callable boundaries.
5. Complete the ignored sanitized approval file with Account A/B, unchanged
   device progress, migration disposition, and explicit owner music rights.
6. Run `-Production -ApprovalFile ...`; deploy Hosting last.
7. Production remains blocked if any required evidence cannot be completed
   truthfully. See `docs/RELEASE_WORKFLOW.md`.
