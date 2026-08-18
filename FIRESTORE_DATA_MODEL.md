# Star Strike RUSH Firebase Data Model

Firebase project: `star-strike-rush`
Firestore database: `(default)`, Standard edition, `nam5 (United States)`
Firebase Hosting live URL: `https://star-strike-rush.web.app`

The game uses Firebase Auth for Google account identity, Cloud Firestore for
identity plus a preserved legacy account archive, and Cloud Functions for
privileged identity mutations. Gameplay progression remains authoritative on
the device. Browser writes are denied.

Client and server competition writes are enabled only for the explicitly
unverified preseason weekly board. Server progression writes and verified run
sessions remain disabled. Profile identity sync, handle claims, weekly
enrollment, and idempotent weekly best-run receipts may operate when Firebase is
configured. Weekly receipts cannot mutate Glory, Prestige, Credits, lifetime
stats, achievements, public verified fields, or the legacy archive. The former
Season reward callable remains a retired, zero-access compatibility stub.

Firebase web config is loaded at runtime. Real API keys must not be committed to
the repository. Local development can use ignored `src/firebase-config.local.json`
copied from `src/firebase-config.example.json`; deployed Firebase Hosting can use
the reserved `/__/firebase/init.json` endpoint. Rotated browser keys should be
restricted in Google Cloud by HTTP referrer and API.

Current live browser API key posture:

- The key string is not stored in this repository.
- The Firebase Hosting app reads config from `/__/firebase/init.json`.
- The key is API-restricted to Firebase-related services.
- The key is browser-restricted to the Firebase Hosting domains and local
  development origins.

## Collections

### `players_private/{uid}`

Owner-only legacy account archive. It is not queryable and is never merged into
device progression. Historical progression-shaped fields are preserved for
archive display and migration analysis only. Provider email, name, and avatar
fields are deleted by the identity callable.

### `players_public/{uid}`

Authenticated players can read bounded public player profiles. Browser writes
are denied. Public identity is deliberately game-only: provider names, emails,
avatars, authentication fields, and redundant UID fields are removed.

- `publicPilotId`: opaque deterministic public game identifier.
- `callSign`: account call sign confirmed by the server.
- `handle`: normalized unique account-bound public handle.
- `legacyBestScore`, `legacyPhase`: preserved unverified archive values.
- `verifiedBestScore`, `verifiedPhase`: reserved for future verified run
  sessions; never derived from legacy fields.
- `recordTrust`: `legacy_unverified`, `no_record`, or a future
  `verified_run_session`.
- `achievementArchiveCount`: sanitized aggregate archive count.
- `createdAt`
- `updatedAt`

`syncPilotProfile` migrates this document on touch. It first preserves maximum
legacy score/phase values from the old public document and
`leaderboard_scores`, then deletes `uid`, `bestScore`, `phase`, `glory`,
`gloryRank`, `gloryRankIndex`, `seasonTier`, and `achievementsCount`. The Admin
cleanup script is dry-run by default and idempotent.

### `leaderboard_scores/{uid}`

This collection is a **LEGACY/PRESEASON ARCHIVE**, not a live leaderboard or
verified progression source. Authenticated reads are limited to queries with
`limit <= 25`; browser writes and new run writes are disabled. Existing
documents remain in place.

### `run_receipts/{uid}/items/{receiptId}`

Owner-only historical progression receipt archive. Browser writes are denied.
New progression receipts remain paused while server progression writes are
disabled. Dormant
receipt fields include:

- score
- phase reached
- run duration
- enemies killed
- bosses killed
- powerups collected
- ghost uses
- damage taken
- highest combo
- Glory gained
- Credits earned
- cumulative Glory, derived Prestige, and current-road Glory after the run
- client version
- submitted server timestamp

The active `submitRunReceipt()` does not write this collection. It writes only
the separate unverified weekly idempotency record described below.

### `season_reward_claims/{uid}/items/{rewardId}`

Retired owner historical reward-claim archive. Browser writes are denied and no
new claims exist. Historical documents may record:

- reward id
- reward type
- amount
- tier
- lane
- claimed server timestamp

The active game has no Season Road, Season XP, tier, or reward-claim path.
`claimSeasonReward()` remains temporarily as an inert compatibility endpoint;
it rejects before auth, reads, or writes. Historical documents are preserved
because deleting prior records is unnecessary and could erase audit context.

### `player_achievements/{uid}/items/{achievementId}`

Owner-only achievement records. Browser writes are denied; accepted run receipts
are not currently accepted. Historical documents and timestamps remain for
Admin aggregate migration and audit.

### `player_achievement_state/{uid}`

Server-only achievement aggregate. Ordinary account hydration receives
sanitized valid IDs and count through `syncPilotProfile`; it does not list up to
79 individual documents. The aggregate migration records `schemaVersion`,
`migratedAt`, and `sourceCount` and is additive and idempotent.

### Competition collections

- `handle_registry/{handle}`: server-only unique-handle ownership registry.
- `weekly_leagues/{leagueId}`: server-only open-group allocation for one UTC
  week (maximum 30 pilots).
- `weekly_leagues/{leagueId}/members/{uid}`: server-only standings rows with
  opaque `publicPilotId`, call sign, handle, and unverified Flight Points. The
  sanitized client payload does not include the Firebase UID.
- `weekly_enrollments/{weekId_uid}`: server-only pointer to a pilot's weekly group.
- `weekly_run_receipts/{weekId}/members/{uid}/items/{receiptId}`: server-only,
  idempotent unverified scoring receipt. It contains bounded run facts and
  `recordTrust = preseason_unverified`, never progression rewards.

The client receives a sanitized league payload from `joinWeeklyLeague()`; these
collections have no direct browser reads or writes.

The complete 79-entry achievement catalog is generated from
`shared/achievements.json`; this document does not maintain a duplicate list.

## Active Preseason Weekly Board

This is an online social board, not verified progression:

1. The player opens the Pilot Dossier and signs in with Google.
2. The game calls `syncPilotProfile()` for identity and a sanitized legacy
   archive response. It does not synchronize gameplay progression.
3. A pilot can atomically claim one immutable public handle and enter one open
   weekly group.
4. On standard Game Over, the client builds a bounded run-fact payload.
5. Signed-in clients submit the receipt to `submitRunReceipt()`.
6. The server validates bounds/plausibility and records only the best
   `floor(score / 10)` unverified Flight Points for that weekly group.
7. A repeated receipt ID is idempotent.
8. The callable returns at most 30 sanitized rows with opaque public pilot ID,
   call sign, handle, and Flight Points; Firebase UID is never returned.
9. Glory and every other progression value stay device-local and unchanged.
10. No Season reward system is part of this flow.

Because the browser is not an authoritative run session, this board must never
be described as verified. A future verified system requires a separate design
and cannot be activated by this board's flags.

## Meta Layer Scope

Implemented now:

- Score to cumulative Glory at 10:1.
- One repeating 300,000-Glory Road with derived Prestige and current-loop rank.
- Ordered checkpoint, rank-up, and terminal Prestige events at Game Over.
- End-of-run device-local Glory, Credits, records, achievements, and Codex
  discovery.
- Account identity and handle publication.
- Legacy account/archive display separated from device progress.
- Closed callable source retained for future verified run receipts and weekly
  leagues; the former Season claim name is only an inert compatibility stub.

Explicitly not implemented yet:

- AdMob rewarded ads.
- Missions, practice, run history, and accessibility settings sync.
- Server-issued run sessions, replay/signed telemetry verification, App Check
  enforcement, verified public scoring, active leagues, active server rewards,
  and an idempotent offline submission outbox.

## Production Note

Do not re-enable `COMPETITIVE_MODE_ENABLED` until server-issued sessions and
gameplay attestation are implemented and abuse-tested. Firestore rules and
callable-only writes prevent arbitrary document writes, but they cannot
independently verify gameplay reported by a browser. Never deploy new rules
alone; deploy and validate their matching Functions contract first.
