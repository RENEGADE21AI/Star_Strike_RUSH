# Star Strike RUSH Firebase Data Model

Firebase project: `star-strike-rush`

Firestore database: `(default)`, Standard edition, `nam5`

Hosting: `https://star-strike-rush.web.app`

Firebase Auth owns Google sign-in. Firestore stores private account progression,
public game identity, a server record archive, dormant Weekly League data, and
historical archives. Cloud Functions own every mutation. Browser writes are
denied. New public record, league, and run-progression writes are fail-closed.

The active authority is `automatic_best_account_or_device`: trusted server
logic compares complete account and device snapshots and automatically keeps
the stronger eligible save. Replacement is never additive or field-merged;
exact ties retain the account copy. A one-way device binding prevents the same
device save from being assigned to several accounts, and sign-out clears the
device's gameplay progression.

Firebase browser configuration is loaded from Hosting's reserved
`/__/firebase/init.json`; ignored local configuration is supported for
development. Credentials, service-account keys, and tokens must never be
committed.

## Identity and progression

### `players_private/{uid}`

Owner-readable account progression. Server writes include cumulative Glory,
derived Prestige/current Road position, lifetime statistics, best score/phase,
Codex IDs, and timestamps. Credits and Season-shaped active fields are not
written. Provider email, display name, and avatar are deleted on identity
hydration.

### `players_public/{uid}`

Authenticated, bounded public reads; no browser writes.

- `publicPilotId`: opaque public game identifier, not Firebase UID.
- `callSign`: validated server-confirmed public call sign.
- `handle`: unique, normalized, changeable public identifier.
- `legacyBestScore`, `legacyPhase`: explicitly unverified archive values.
- `verifiedBestScore`, `verifiedPhase`: accepted run-session maxima only.
- `recordTrust`: `legacy_unverified`, `no_record`, or
  `verified_run_session`.
- `achievementArchiveCount`, `createdAt`, `updatedAt`.

`syncPilotProfile` migrates old public fields on touch, preserves maximum legacy
values before deleting ambiguous names, and never promotes a legacy score into
a verified field.

### `device_progress_bindings/{bindingHash}`

Server-only ownership binding for a local save identity. Once assigned, the
same binding cannot be assigned to another UID. The raw device seed is not
stored; the document key and stored value use its SHA-256 digest.

### `account_deletion_requests/{uid}`

Server-only 72-hour deletion deadline. `requestAccountDeletion` creates it;
`cancelAccountDeletion` removes it before the deadline; the scheduled Admin
purge deletes account Auth and associated Firestore data after expiry.

## Dormant records and run sessions

### `verified_run_sessions/{uid}/verified_sessions/{sessionId}`

Future one-time server-issued challenge with start/expiry timestamps and
submitted status. It is never browser-readable. The active gate rejects before
auth or Firestore work. If an authoritative verifier is later implemented, a submission must match the challenge,
remain within time and size bounds, use contiguous sequence numbers and
monotonic ticks, contain only allowed event kinds, avoid duplicate entity IDs,
respect event-rate ceilings, and report ordered time-bounded phase events.

The dormant server calculates score and run facts from an event ledger, but a
completed security review proved browser-authored events alone can be forged.
It must not be enabled until trusted server replay establishes the outcomes.

### `run_receipts/{uid}/items/{sessionId}`

Owner-readable accepted receipt history. It stores the server-calculated score,
phase, duration, public pilot ID, trust marker, and timestamp. It contains no
retired Credits field.

### `world_records/{uid}`

Authenticated bounded reads; server-only writes. Existing entries remain an
archive containing public pilot ID, call sign, handle, prior accepted best
score/phase, trust marker, and timestamps. New writes are paused.

### `leaderboard_scores/{uid}`

Read-only **LEGACY ARCHIVE**. Historical data remains in place and is never used
to construct verified score or account progression.

## Weekly Leagues

- `weekly_leagues/{leagueId}`: server-owned weekly division/capacity metadata.
- `weekly_leagues/{leagueId}/members/{uid}`: server-only standings row.
- `weekly_enrollments/{weekId_uid}`: server-only membership pointer.
- `weekly_run_receipts/{weekId}/members/{uid}/items/{sessionId}`: server-only
  idempotency receipt.

The data model and sanitized responses are retained, but both list/join and
scoring are fail-closed while authoritative run verification is unavailable.
Firebase UID is never returned in a public member payload.

## Handles

`handle_registry/{handle}` is server-only. Handle changes run in a transaction:
the requested handle must be free or already owned by the caller, the public
identity/record/league row is updated, and the caller's previous registry entry
is deleted. Two accounts cannot own the same normalized handle.

## Achievements and historical archives

- `player_achievement_state/{uid}`: server-only aggregate returned in sanitized
  form by `syncPilotProfile`.
- `player_achievements/{uid}/items/{achievementId}`: owner-readable history;
  server-only writes preserve original timestamps.
- `season_reward_claims/{uid}/items/{rewardId}`: owner-readable historical
  archive only. The retired `claimSeasonReward` compatibility callable performs
  no auth check, Firestore read, Firestore write, or grant.

The canonical catalog remains `shared/achievements.json` with exactly 79 IDs.
The completed production aggregate migration must not be rerun for this pass.

## Account deletion coverage

After the 72-hour deadline, the scheduled Admin purge removes Auth plus private
and public profiles, handle ownership, records, receipts, achievements, session
challenges, device bindings, league enrollment/member rows, historical account
subcollections, rate-limit documents, and the deletion request. League member
counts are decremented transactionally. Deletion does not expose identity data
to clients.

## Security boundary

Firestore Rules provide owner reads only where required, bounded authenticated
public reads, and a deny-all fallback. Registries, record writes, league
internals, progression resolution, run sessions, and deletion requests are
callable/Admin only.

App Check support remains configured behind
`serverAppCheckEnforced = false`; it is not live enforcement. Browser telemetry
is not equivalent to executing the game simulation on a trusted server, so the
record and league gates remain closed.
