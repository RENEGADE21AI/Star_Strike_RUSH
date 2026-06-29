# Star Strike RUSH Firebase Data Model

Firebase project: `star-strike-rush`
Firestore database: `(default)`, Standard edition, `nam5 (United States)`
Firebase Hosting live URL: `https://star-strike-rush.web.app`

The game uses Firebase Auth for Google accounts and Cloud Firestore for public
records plus private player data. The current setup is a prototype-safe,
client-side implementation: rules protect ownership, field shape, read scope,
immutable run receipts, and write monotonicity, but a browser client is still
the authority for score and progression submissions until Cloud Functions
validation is added.

Firebase web config is loaded at runtime. Real API keys must not be committed to
the repository. Local development can use ignored `src/firebase-config.local.json`
copied from `src/firebase-config.example.json`; deployed Firebase Hosting can use
the reserved `/__/firebase/init.json` endpoint. Rotated browser keys should be
restricted in Google Cloud by HTTP referrer and API.

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
- Lifetime counters: runs, score, kills, powerups, ghost uses, bosses, damage
  taken, and highest combo.
- `createdAt`: server timestamp on first create.
- `lastSeenAt`: server timestamp each profile sync.
- `updatedAt`: server timestamp each profile sync.

### `players_public/{uid}`

Authenticated players can read public player profiles. Only the owner can write
their own document.

- `uid`
- `displayName`
- `callSign`
- `photoURL`
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
rank index, and season tier cannot decrease.

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

This collection is a bridge toward server-authoritative validation. A future
`submitRunReceipt()` Cloud Function should validate receipt plausibility, grant
authoritative Glory/Credits/Season XP, and write competitive leaderboard records.

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
4. Score converts to Glory locally at `floor(score / 10)`.
5. Firebase stores an immutable owner-scoped run receipt.
6. Firebase updates the player's public profile and best leaderboard record.
7. Newly earned achievement documents are created under the player's account.

## Meta Layer Scope

Implemented now:

- Score to Glory at 10:1.
- Glory ranks and local player-card summary.
- End-of-run Glory, Season XP, and Credits preview.
- Run receipts.
- Public player-card fields on profiles and leaderboard rows.

Explicitly not implemented yet:

- Stripe checkout, webhooks, purchases, Gems grants, or Premium Flight Pass.
- AdMob rewarded ads.
- Cosmetic inventory, shop, user-generated cosmetic submissions, voting, and
  moderation flows.
- Server-authoritative Cloud Functions for progression grants.

## Production Note

For a serious competitive leaderboard, move score submission behind a trusted
backend such as Cloud Functions and have the server write `leaderboard_scores`,
authoritative Glory, Credits, Season XP, inventory, and purchase state. Firestore
rules cannot independently verify gameplay from a browser client.
