# Star Strike RUSH Firebase Data Model

Firebase project: `star-strike-rush`
Firestore database: `(default)`, Standard edition, `nam5 (United States)`
Firebase Hosting live URL: `https://star-strike-rush.web.app`

The game uses Firebase Auth for Google accounts, Cloud Firestore for public
records plus private player data, and Cloud Functions for server-side
progression validation. Firestore rules protect ownership, field shape, read
scope, immutable run receipts, and write monotonicity. The repo includes
callable Functions for authoritative run receipts and Season reward claims, but
they require the Firebase project to be on the Blaze plan before deployment.

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

Owner-only account profile. This is not queryable.

- `uid`: Firebase Auth uid.
- `email`: account email for the signed-in user.
- `displayName`: sanitized Google display name.
- `photoURL`: optional Google avatar URL.
- `glory`: non-decreasing lifetime Glory total.
- `gloryRank`: current rank label.
- `gloryRankIndex`: non-decreasing rank index.
- `currentSeasonId`: season id for the local progression preview.
- `currentSeasonXP`: non-decreasing XP for the current season preview.
- `currentSeasonTier`: non-decreasing tier, 1-50.
- `credits`: non-decreasing earned Credits preview. Spending is not implemented
  yet; future authoritative spending should move to Cloud Functions.
- `seasonClaimedRewardIds`: claimed Season Road reward ids for the active
  season.
- Lifetime counters: runs, score, kills, powerups, ghost uses, bosses, damage
  taken, and highest combo.
- `createdAt`: server timestamp on first create.
- `lastSeenAt`: server timestamp each profile sync.
- `updatedAt`: server timestamp each profile sync.

### `players_public/{uid}`

Authenticated players can read public player profiles. Only the owner can write
their own document. Public identity is deliberately game-only: Google provider
names, email addresses, avatars, and authentication fields are not permitted by
the client serializer, callable writer, or Firestore field whitelist.

- `uid`
- `callSign`
- `bestScore`: non-decreasing integer.
- `phase`: non-decreasing integer.
- `achievementsCount`: non-decreasing integer.
- `glory`: non-decreasing public Glory total.
- `gloryRank`
- `gloryRankIndex`: non-decreasing rank index.
- `seasonTier`: non-decreasing current season tier.
- `createdAt`
- `updatedAt`

### `leaderboard_scores/{uid}`

One public best-score record per player for the world-record list. Authenticated
reads are limited by rules to queries with `limit <= 25`. Only the owner can
create or update their record, and best score, phase, achievement count, Glory,
rank index, and season tier cannot decrease. It uses the same game-only fields
as `players_public`; legacy provider fields are discarded when records are next
written.

### `run_receipts/{uid}/items/{receiptId}`

Owner-only immutable run receipt archive. Clients can create receipts for their
own uid only; updates and deletes are denied. The receipt records:

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
- Season XP gained
- Credits earned
- client version
- submitted server timestamp

`submitRunReceipt()` validates receipt plausibility, grants authoritative
Glory/Credits/Season XP, writes the immutable receipt, updates public records,
and creates earned achievement records from server-side thresholds.

### `season_reward_claims/{uid}/items/{rewardId}`

Owner reward-claim archive written by Cloud Functions. Each document records:

- reward id
- reward type
- amount
- tier
- lane
- claimed server timestamp

The callable `claimSeasonReward()` validates that the user owns the profile,
the reward exists, the tier is unlocked, and the reward has not already been
claimed before applying Credits, Glory cache, or Season XP cache.

### `player_achievements/{uid}/items/{achievementId}`

Owner-only achievement records. Clients can create a known achievement id once;
updates and deletes are denied.

Current achievement ids:

- `first_sortie`
- `rookie_score`
- `ace_score`
- `legend_score`
- `surge_score`
- `mythic_score`
- `phase_two`
- `phase_three`
- `phase_eight`
- `phase_twelve`
- `boss_breaker`
- `boss_hunter`
- `ghost_runner`
- `collector`
- `power_hungry`
- `swarm_clearer`

## Client Flow

1. The player opens the Online panel and signs in with Google.
2. The game syncs private and public profile documents.
3. On game over, `submitOnlineRun()` builds a score and achievement payload.
4. Signed-in clients submit the receipt to `submitRunReceipt()`.
5. The server validates plausibility and computes Glory, Season XP, Credits, and
   achievements.
6. Firebase stores an immutable owner-scoped run receipt.
7. Firebase updates the player's public profile and best leaderboard record.
8. Newly earned achievement documents are created under the player's account.
9. Season reward claims use `claimSeasonReward()` when signed in, or local
   fallback when signed out.

## Meta Layer Scope

Implemented now:

- Score to Glory at 10:1.
- Glory ranks and local player-card summary.
- End-of-run Glory, Season XP, and Credits preview.
- Season Road reward claiming, claimed-state persistence, and reward application.
- Run receipts.
- Public player-card fields on profiles and leaderboard rows.
- Cloud Function source for `submitRunReceipt()` and `claimSeasonReward()`.

Explicitly not implemented yet:

- AdMob rewarded ads.
- Missions, practice, run history, and accessibility settings sync.
- Cloud Functions deployment, because the Firebase project must be upgraded to
  Blaze before required Functions/Artifact Registry APIs can be enabled.

## Production Note

For a serious competitive leaderboard, deploy the included Cloud Functions and
then tighten Firestore rules so browser clients can no longer write progression
or leaderboard documents directly. Firestore rules cannot independently verify
gameplay from a browser client.
