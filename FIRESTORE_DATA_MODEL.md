# Star Strike RUSH Firebase Data Model

Firebase project: `star-strike-rush`
Firestore database: `(default)`, Standard edition, `nam5 (United States)`

The game uses Firebase Auth for Google accounts and Cloud Firestore for public
records plus private player data. The current setup is a prototype-safe,
client-side implementation: rules protect ownership, field shape, read scope,
and write monotonicity, but a browser client is still the authority for score
submissions.

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
- `createdAt`
- `updatedAt`

### `leaderboard_scores/{uid}`

One public best-score record per player for the world-record list. Authenticated
reads are limited by rules to queries with `limit <= 25`. Only the owner can
create or update their record, and best score, phase, and achievement count
cannot decrease.

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
4. Firebase updates the player's best leaderboard record if the run beats it.
5. Newly earned achievement documents are created under the player's account.

## Production Note

For a serious competitive leaderboard, move score submission behind a trusted
backend such as Cloud Functions and have the server write `leaderboard_scores`.
Firestore rules cannot independently verify gameplay from a browser client.
