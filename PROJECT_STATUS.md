# Project Status

Last audited: 2026-08-20

This file distinguishes repository state, staged state, and production state.
The live source of truth is always Hosting `/version.json` plus the matching
backend release marker.

## Release truth

The production baseline at the start of this pass is
`a24de81e9572eb828fb4ad1a37860fb06d994552`. The progression/records/account
work described below is repository work until a protected PR merges and the
guarded production workflow proves matching Hosting and backend SHAs.

Current release configuration:

| Concept | Repository state |
| --- | --- |
| Progression authority | `explicit_account_or_device` |
| Signed-out progression | Device save |
| Signed-in conflict | Player selects account or device; replacement only, never addition |
| World Records | Existing server record archive remains readable; new writes are paused |
| Weekly Leagues | Server-owned implementation remains fail-closed |
| Legacy records | Preserved in `leaderboard_scores`; never treated as verified |
| Glory | Permanent cumulative value; never decreases |
| Prestige | `floor(totalGlory / 300000)`; grants no combat power |
| Credits | Retired from active schema, rewards, receipts, UI, and server profiles |
| Season reward callable | Inert compatibility stub with zero reads/writes |
| App Check enforcement | Prepared, disabled, and not claimed live |

## Validated behavior in this pass

- First Flight pauses, including lifecycle pauses, are free. Every standard-run
  pause costs exactly one Health and duplicate blur/visibility events are
  coalesced.
- Colonel transmissions type to completion before Continue is enabled. Space
  cannot leak into Ghost Shift while it advances tutorial dialogue.
- The purple-enemy lesson requires a sustained, damage-free evasion with
  multiple volleys; it cannot complete from a position check alone.
- Gameplay grid lines were removed. Enemy steering turns the ship before
  applying forward thrust, including tighter Recycle turns without strafing or
  temporary backward motion.
- Splitter and shard art is materially larger. Asteroids have 12 Health,
  per-hit feedback, and a scaled impact breakup effect.
- Wingmen glide in without firing, can ram enemies while arrival-invulnerable,
  become active at formation position, and fly safely offscreen when their
  timer expires.
- The HUD uses `HEALTH` and `GHOST`, a compact square pause control, and an
  inactivity-only control hint. Player weapon origins and player/boss hitboxes
  use sprite metadata rather than full-image rectangles.
- Death and new sessions normalize the physical realm so a Wraith death cannot
  strand the next screen or run in the ghost realm.
- Codex thumbnails are larger and detail entries observe the enemy through a
  moving starfield viewport. The title reports permanent Glory.
- The Glory Road is one continuous absolute route. Rank thresholds repeat every
  300,000 Glory (`Ace`, `Ace II`, `Ace III`, ...), without scrolling the player
  back to a visual beginning. Route generation is bounded around the visible
  absolute range and supports Prestige 50 and beyond.
- Handles remain globally unique but may be changed transactionally.
- Account deletion has a clear 72-hour cancellation window. The scheduled Admin
  purge removes Auth, identity, progression, records, achievement data, run
  receipts, handle registry ownership, league membership, device bindings, and
  related server metadata.
- Account/device progression conflicts require an explicit replacement choice.
  A device-save binding prevents copying the same save into multiple accounts;
  sign-out clears local gameplay progression while retaining global settings,
  onboarding, and the local identity seed.

## Firebase boundary

Active identity/account callables:

- `syncPilotProfile`
- `claimPilotHandle`
- `chooseProgressionSource`
- `requestAccountDeletion`
- `cancelAccountDeletion`

Dormant record/league callables (fail before auth or Firestore work):

- `startVerifiedRun`
- `submitRunReceipt`
- `listWeeklyLeagues`
- `joinWeeklyLeague`

The Codex Security diff scan proved that a modified browser can fabricate a
plausible event ledger even when it cannot submit a numeric score directly.
Therefore all public score, league, and run-progression gates remain closed.
The dormant implementation is retained for future server-authoritative replay
work, but it is not described or deployed as a trusted record pipeline.
The same scan found unbounded abandoned session retention; the dormant path now
reuses one active session per UID and deletes expired sessions on a bounded
schedule. See `docs/SECURITY_REVIEW_2026-08-20.md`.

Public game identity contains only call sign, unique handle, opaque
`publicPilotId`, and sanitized record fields. Provider email, Google display
name, avatar, Firebase UID, cookies, tokens, and private progression are not
public fields.

## Persistent data

Local meta schema version 3 preserves cumulative Glory, high score, lifetime
statistics, achievements, Codex discoveries, settings, identity, and onboarding.
It drops old Credit and Season-shaped active fields without reversing rewards
that had already affected preserved balances. Migration is idempotent and does
not replay historical milestone celebrations.

The production achievement aggregate migration was completed previously: one
aggregate was rebuilt from 15 valid historical unlock documents, zero invalid
IDs were found, and the follow-up dry run reported zero remaining changes. It
must not be reapplied by this release.

The owner confirmed authorization on 2026-07-28 to distribute both repository
MP3 files. No artist, source URL, or formal license name is inferred.

## Compatibility and verification

The protected workflow runs Node 22 syntax/contracts, real Chromium gameplay,
representative WebKit desktop/mobile smoke, Firestore Rules emulation, real
Firebase client emulation, asserted visual QA, dependency audits, production
build, release-marker validation, and tracked-file secret scanning. Final
counts and artifact URLs belong in the PR and release report rather than being
duplicated here before the run completes.

Required local commands:

```powershell
npm ci
npm ci --prefix functions
npm test
npm run test:webkit
npm run test:rules
npm run test:firebase-client
npm run test:visual
npm run build
npm run test:secret
npm audit --omit=dev --audit-level=high
npm audit --prefix functions --omit=dev --audit-level=high
```

## Configuration-dependent limitations

- App Check remains prepared but not enforced. Console provider registration,
  monitoring, enforcement, and live direct tests are still required before that
  status can change.
- Public record and league writes remain paused until the complete run can be
  established by a trusted authoritative verifier.
- Real multi-account Google interaction is distinct from emulator coverage and
  must be reported only when a human actually performs it.
- Production is not updated merely because this file or a PR says so; both live
  release identities and the full smoke suite must pass after deployment.
