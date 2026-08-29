# Authoritative Random Run Verification Design

## Decision

Star Strike RUSH will verify ordinary random standard runs through server-seeded
deterministic replay. There will be no separate ranked mode, shared daily seed,
or special competitive ruleset. A signed-in player presses the existing Start
button and plays the existing game. When the run could improve an authoritative
record, the service replays the player's controls in the background and derives
the result independently before publishing it.

This is the least expensive design that creates a genuine authority boundary.
Server-side scoring of client-authored kill and boss events is not sufficient,
because the client can fabricate a plausible event ledger. Live server
simulation would add ongoing compute, networking, and latency without providing
enough additional value for this game.

## Goals

- Preserve normal random runs and the existing Start-to-gameplay experience.
- Make client-authored scores, entities, combat outcomes, and progression
  summaries irrelevant to public record acceptance.
- Reproduce an eligible run from a server-issued seed and canonical controls.
- Keep anonymous, offline, and temporarily disconnected play fully functional.
- Keep verification asynchronous, scale-to-zero, bounded, and inexpensive.
- Retain the existing fail-closed competition posture until replay evidence is
  proven in shadow operation.
- Extract only authoritative gameplay boundaries; do not rewrite the Canvas
  renderer, replace the ordered runtime, or migrate frameworks.

## Non-goals and honest limits

- The verifier does not prove that a human supplied the controls. A bot or macro
  can produce physically valid inputs.
- The verifier does not prevent account sharing.
- App Check is abuse friction, not proof that the browser followed game rules.
- A player with a modified client can inspect an issued seed and the public game
  logic. Rate limits constrain bulk seed harvesting, but ordinary restarts and
  strategic seed selection cannot be eliminated without changing the requested
  random-run experience.
- Private device progression remains separate from verified public records.
  Competitive receipts will not become the sole account-progression authority
  in the first release of this system.

## Existing foundation and required replacement

The game already advances gameplay at a fixed 60 Hz and deliberately discards
wall-time backlog after browser stalls. It also already has server-only
Firestore paths for verified sessions, run receipts, world records, weekly
league membership, and weekly receipts. Direct browser writes to those paths
are denied.

The current dormant run flow issues a random challenge and accepts an ordered
client event ledger. The Functions code recalculates score from those events,
checks simple timing and event-rate limits, and then performs authoritative
writes. That ledger remains useful as diagnostics during migration, but it must
not influence an accepted score, phase, kill, boss, damage, Glory, achievement,
or league result.

## System architecture

The verification system has six isolated units:

1. **Deterministic simulation core** — advances authoritative game state by one
   fixed tick from canonical state, canonical input, and versioned random
   streams. It has no Canvas, DOM, audio, Firebase, clock, or network dependency.
2. **Browser adapter and recorder** — translates keyboard, touch, and pointer
   state into canonical tick input, drives the local simulation with that exact
   input, records it, and keeps rendering behavior unchanged.
3. **Run-ticket service** — issues one-use random seeds bound to the user,
   release, simulation revision, rules revision, content revision, and weekly
   window.
4. **Candidate submission service** — rejects irrelevant or malformed claims
   cheaply, authorizes bounded input upload, and queues meaningful candidates.
5. **Replay worker** — loads the immutable simulation revision, validates the
   input container, replays until terminal state, and produces the only
   authoritative run result.
6. **Publication transaction** — idempotently publishes verified records and
   league points from replay output. It cannot accept client result fields.

The replay worker runs as a private, request-based Cloud Run service invoked by
Cloud Tasks with an authenticated service identity. It uses one vCPU, 512 MiB
memory, concurrency one, and scales to zero. Initial limits are three worker
instances, three concurrent tasks, and two task dispatches per second. These
limits bound both contention and spend and can be raised only after measured
replay data justifies it.

## Seed and random-stream contract

Each ticket receives 128 bits from the server's cryptographic random source.
The response exposes the seed because the browser must simulate the run; secrecy
after issuance is not a security property. The security properties are server
issuance, account binding, one-time consumption, revision binding, and
authoritative replay.

The simulation derives named gameplay streams from the root seed:

- `waves`
- `pacing`
- `enemy_behavior`
- `boss_behavior`
- `hazards`
- `loot`

The initial generator is a repository-owned, versioned xoshiro128**
implementation using explicit unsigned 32-bit operations and `Math.imul`.
Each stream seed is the first 128 bits of SHA-256 over a canonical byte encoding
of `SSR_STREAM_V1`, the root seed, simulation revision, and stream name. Adding
a cosmetic random call or changing loot logic therefore cannot silently shift
boss or wave randomness.

All gameplay uses these streams. Title traffic, stars, non-authoritative
particles, audio variation, and purely visual animation use a separate local
cosmetic generator and are never replayed.

## Run-ticket lifecycle

Pressing the existing Start button requests a ticket during the existing launch
transition. The authoritative simulation cannot execute tick zero until the
ticket response arrives. A 1.2-second deadline bounds this wait; on timeout or
failure, the browser creates an ordinary local random run and continues the
transition. No seed is prefetched or exposed before Start.

This brief handshake is the only additional start dependency and is hidden
inside the launch presentation rather than shown as a competitive mode. The
absence of record eligibility must never prevent gameplay. A small existing
online-status surface may show `RECORDS ONLINE` or `RECORDS OFFLINE`; there is no
mode selector or confirmation screen.

A ticket record contains:

- schema version and run ID
- authenticated user ID, stored server-side
- 128-bit root seed
- simulation, rules, input-format, and content revisions
- exact client build SHA permitted to use the ticket
- week ID derived from server time
- issue time, 24-hour submission deadline, and six-hour maximum tick count
- status and immutable status-transition timestamps

Only one active ticket may exist for an account. A new Start transaction marks
an unfinished prior ticket abandoned and issues a new seed; it never reuses the
prior seed. Twelve ticket requests per minute remains the short-window ceiling.
An additional ceiling of 120 newly issued tickets per account per hour limits
automated seed harvesting without affecting plausible play. Abandoning or
replacing a ticket is audited and consumes that issuance allowance.

The six-hour run limit is 1,296,000 simulation ticks. The 24-hour submission
deadline permits a player who loses connectivity after receiving a ticket to
upload after reconnecting. A run is assigned to the weekly window in which its
ticket was issued. The previous weekly window remains provisional for 24 hours
so a valid late upload can finish verification before standings become final.

## Canonical simulation contract

Authoritative gameplay remains at exactly 60 ticks per second. Wall-clock time,
animation-frame timestamps, rendering cadence, tab suspension, and upload time
cannot advance the replay. Run duration is derived from verified ticks.

The deterministic core owns every value capable of changing survival or score:

- player health, position, velocity, angle, cooldowns, invulnerability, and
  Ghost Shift state
- enemy, projectile, hazard, powerup, and boss state
- spawns, phases, pacing, caps, respite periods, and drop decisions
- collisions, damage, kills, bonuses, combo state, score, and terminal state

JavaScript basic arithmetic remains shared between the browser and Node worker.
Authoritative position and velocity use signed integers with 1,024 units per
Canvas coordinate. Angles use 4,096 integer units per turn. Cooldowns, durations,
and pacing timers use integer ticks. Versioned sine and cosine tables contain
signed integer values for each authoritative angle. Collision squared-distance
comparisons operate entirely on these canonical integers and remain within the
safe-integer range. Canvas rendering converts canonical values to ordinary
numbers and may interpolate visually without changing state.

The core has a single public transition shaped conceptually as:

```text
stepSimulation(state, canonicalInput, randomStreams) -> state
```

State construction, serialization, result derivation, and state hashing are
separate pure interfaces. The browser and worker import the same implementations
rather than maintaining parallel gameplay formulas.

## Canonical input and recording format

The local game must consume the same canonical input that it records. Recording
raw DOM events after gameplay has already interpreted them would allow drift.

Each tick contains:

- signed 8-bit movement X from -127 to 127
- signed 8-bit movement Y from -127 to 127
- a Ghost Shift pressed-edge bit
- a pause pressed-edge bit

Keyboard directions map to the axis endpoints. Touch and pointer movement is
normalized and quantized before simulation. Auto-fire is a simulation rule and
requires no input bit. UI pause state lives outside the deterministic core. A
pause edge applies the existing health cost on its tick; the browser then stops
requesting gameplay ticks until resume. Replay continues with the next recorded
tick immediately, so wall-clock pause duration and the resume UI event are
irrelevant.

The binary `SSR_INPUT_V1` container stores a fixed header followed by
run-length encoded segments containing duration, X, Y, and button bits. It also
stores tick count, segment count, and SHA-256 digests, truncated to 128 bits, of
canonical serialized state every 600 ticks. Digests are diagnostic and help
locate deterministic drift; they are not trusted evidence and do not affect
gameplay.

Limits are enforced before queueing and again inside the worker:

- at most 1,296,000 ticks
- at most 250,000 input segments
- at most 2 MiB uploaded bytes
- exact header, length, integer, ordering, and checksum validation
- no trailing bytes or unsupported revision values

Input recordings remain in IndexedDB until the server accepts or permanently
rejects them. An interrupted upload can resume during the 24-hour ticket window.

## Candidate filtering and upload

Replay is required only when a client claim could improve an authoritative
value. At game over the client sends a small, explicitly untrusted claim with
the run ID, claimed score, claimed phase, tick count, input size, and SHA-256
digest. The service reads the authoritative personal record and weekly entry.

A candidate qualifies when at least one condition is true:

- claimed score exceeds the player's verified personal best
- claimed phase exceeds the player's verified phase
- derived claimed weekly points exceed the player's current weekly points
- the account has no verified run receipt yet

A false high claim only causes the attacker's bounded submission to be replayed
and rejected. A false low claim can only forfeit the player's own publication.
No client claim is written to a leaderboard or progression document.

At most one job per account may be queued or verifying, and at most eight
candidate submissions per account may enter replay in one hour. A qualifying
candidate receives a ten-minute signed upload policy restricted to its exact
private object path, content type, and two-MiB size ceiling. After upload, a
finalization callable confirms generation, size, digest, ticket status, and
ownership before creating an idempotent Cloud Task whose payload contains only
the run ID and object reference.

The private object path is:

```text
verified-run-inputs/{uid}/{runId}/SSR_INPUT_V1.bin
```

Browsers receive no list, read, overwrite, or delete authority for verification
objects. The worker and lifecycle service use dedicated service identities.

## Replay and authoritative result

The worker claims a queued job transactionally and verifies that the task,
ticket, object generation, object digest, account, build, and revisions remain
bound. It parses the input with all resource limits applied before allocating
state proportional to attacker-controlled counts.

The worker then creates the initial state from the ticket and advances exactly
the submitted input ticks. A valid run must reach the game's terminal death
state on the final recorded tick. A tape that ends while the player remains
alive, continues after death, requests impossible inputs, or diverges from a
required state digest is rejected.

Replay derives score, phase, duration, kills, bosses, powerups, Ghost Shift
uses, damage taken, highest combo, Glory-relevant values, and achievement facts
from simulation state. Claimed result fields must match the replay result
exactly; a mismatch is rejected rather than silently publishing a different
score, because it indicates tampering, corruption, or a deterministic defect.

The immutable receipt records the authoritative result, ticket and simulation
revisions, week ID, input digest, final state digest, verification timestamps,
and verifier build digest. It stores no root seed in public documents.

## Idempotent publication and progression separation

The publication transaction accepts only a completed worker result referenced
by run ID. It verifies that no receipt already consumed the ticket, writes the
owner receipt, raises but never lowers the player's verified bests, raises the
weekly maximum when applicable, marks the ticket consumed, and marks the job
published. Duplicate tasks or retries return the existing result.

Competition activation is split into independent release gates:

- authoritative ticket issuance
- verification upload and queueing
- shadow replay
- world-record publication
- weekly-league publication
- verified progression publication
- App Check enforcement

The current coupling that requires progression, competition, and sessions to be
enabled together is removed. World records can become authoritative before
verified receipts are allowed to mutate private account progression. The first
public release enables record writes only after shadow gates pass; weekly league
writes follow after a full weekly-window rehearsal. Verified progression writes
remain off until provenance rules receive their own approval.

## User experience

Verification introduces no run-mode choice and no gameplay interruption.

- Eligible run with no record improvement: no verification message is needed.
- Candidate accepted: `RECORD CHECK PENDING` appears after the normal results.
- Verified improvement: `RECORD VERIFIED` appears when refreshed or received.
- Offline or unavailable ticket: `RUN SAVED LOCALLY — RECORDS OFFLINE` appears
  once on the results screen.
- Rejected or expired submission: `RUN NOT PUBLISHED` appears without accusing
  the player of cheating; deterministic defects and corrupted uploads can also
  cause rejection.
- Service failure never removes local progression or lowers an existing record.

The client exposes a compact owner-only receipt history with `pending`,
`verified`, `not_needed`, `rejected`, or `expired` status through sanitized
callables. Verification sessions and worker diagnostics remain non-enumerable
and server-only.

## Failure handling

- Ticket failure falls back to a local run without delaying Start.
- Upload and finalization are idempotent by run ID and object generation.
- Transient worker failures return an error so Cloud Tasks retries with bounded
  exponential backoff.
- Deterministic validation failures persist a safe reason code and return
  success to the queue so they are not retried.
- A job exceeding worker CPU or memory limits becomes `verification_error`, not
  verified or rejected-as-cheating, and can be replayed by an operator build.
- A release never deletes a verifier revision until its final ticket deadline,
  task retry window, and seven-day operational buffer have elapsed.
- The scheduled cleanup process expires abandoned sessions, deletes transient
  jobs, and removes input objects according to retention policy.

Input objects for rejected and ordinary verified runs are retained seven days.
Objects supporting an active personal best or world record are retained 90 days
for dispute analysis. Receipts and cryptographic digests remain until account
deletion. Account deletion removes tickets, jobs, objects, receipts, league
membership, and public records through the existing privileged deletion flow.

## Security and abuse controls

The design protects the leaderboard from fabricated outcomes, altered combat
rules, speed hacks, skipped ticks, duplicate submissions, stale builds, and
direct database writes. It does so by ensuring the untrusted browser supplies
only controls and an untrusted candidate claim while the server supplies the
seed and computes every accepted result.

All client-controlled containers are size-bounded and strictly parsed. Run IDs,
object generations, digests, users, weeks, and revisions stay bound across every
callable, object, task, job, and receipt. Worker identities can read only the
verification bucket and verification collections required for replay;
publication authority belongs to a separate service path.

Rate limits, one outstanding job per account, App Check, upload restrictions,
Cloud Run maximum instances, queue dispatch limits, logging quotas, and billing
alerts constrain denial-of-wallet attacks. App Check is enabled only after
production-token and test-bypass validation and is never described as anti-cheat
proof.

## Cost model

Ticket creation and candidate checks are small Firestore operations. Most runs
end below an existing authoritative best and require no upload, task, storage,
or replay. Candidate input is compact, stored in the same region as the worker,
and deleted on a short lifecycle. Cloud Tasks carries only a small object
reference. The replay service scales to zero and bills only while processing.

Before public activation, CI and staging record replay CPU seconds, peak memory,
input bytes, parse time, tick throughput, and Firestore and Storage operations.
The initial production budget gate requires:

- a 30-minute worst-case replay at or below five CPU seconds at p95
- a six-hour synthetic replay at or below 60 CPU seconds
- a valid six-hour input tape at or below two MiB
- no unbounded retry, log-volume, or storage-retention path
- billing alerts at $5, $20, and $50 monthly verification spend
- a documented kill switch that stops ticket issuance and queue dispatch while
  preserving already verified records

Failure to meet these limits keeps publication gates closed and triggers
profiling or format optimization rather than weakening verification.

## Testing and evidence

### Deterministic core

- Golden run fixtures cover each enemy, hazard, powerup, boss, phase transition,
  collision silhouette, pause penalty, Ghost Shift, death path, and scoring rule.
- Seed reproducibility tests prove the same seed and input produce the same
  state digests and result.
- Random-stream isolation tests prove cosmetic and unrelated subsystem calls do
  not shift authoritative streams.
- Property tests exercise input, entity, collision, and score invariants across
  at least 500 generated seeds.

### Cross-runtime replay

- Chromium, WebKit, and pinned Node worker runs consume identical fixtures.
- Every checkpoint digest and final result must match exactly; tolerance-based
  score or collision acceptance is forbidden.
- CI verifies that the client simulation revision resolves to an immutable
  worker artifact before a release can issue tickets.

### Protocol and security

- Emulator tests cover ownership, one-use tickets, expiry, account binding,
  build and revision mismatch, duplicate task delivery, stale object generation,
  oversized and malformed input, trailing data, digest mismatch, and status
  transition races.
- Firestore and Storage rules deny direct authoritative writes, object reads,
  overwrites, enumeration, and cross-account access.
- Load tests prove per-account, queue, worker, payload, log, and spending limits.
- App Check enforcement is tested separately and never substitutes for replay.

### Gameplay and release regression

- Existing gameplay, WebKit, emulator, visual, secret-scan, audit, build, and
  exact-release-marker gates remain required.
- Browser playtests compare seeded and legacy builds for movement, collision,
  pacing, bosses, drops, pause, tutorial isolation, and late-game performance.
- A developer-only overlay exposes seed, tick, random-stream counters, canonical
  input, collision geometry, checkpoint digest, and verification status.

## Rollout gates

1. **Deterministic foundation:** shared seeded simulation and recording ship with
   all competition, queue, and publication gates off.
2. **Offline replay:** CI and emulator replay fixtures reach zero divergence and
   meet performance and payload limits.
3. **Production shadow:** eligible signed-in runs receive tickets and candidates
   replay, but no world record, league, achievement, Glory, or progression write
   occurs. Existing local gameplay remains authoritative only for the device.
4. **Record canary:** internal production accounts publish to a quarantined
   record collection. At least 100 complete browser runs, every boss class, a
   60-minute run, interrupted-network recovery, and duplicate-task delivery pass
   with zero unexplained divergence.
5. **World records:** enable public personal-best and phase publication while
   weekly leagues and verified progression remain off.
6. **Weekly rehearsal:** execute one full Monday-to-Monday window including the
   24-hour late-submission period in staging and verify assignment, ordering,
   finalization, privacy, and idempotency.
7. **Weekly leagues:** enable league writes only after the rehearsal and live
   world-record operation remain healthy.
8. **Progression review:** decide separately which verified receipt fields, if
   any, may become authoritative account progression. No competition milestone
   can silently promote client-controlled legacy progression.

At every stage the release report states which gates are active, whether replay
is shadow-only, which simulation revisions are accepted, whether App Check is
enforced, and whether Firebase deployment actually occurred. Any integrity,
cost, or deterministic regression closes ticket and publication gates without
removing local play.

## Acceptance criteria

The system is ready to publish world records only when all of the following are
true:

- An accepted result can be derived from ticket, seed, revisions, and input tape
  without reading any client-authored outcome event.
- Chromium, WebKit, and worker replay agree exactly across the required fixture
  and generated-seed corpus.
- Modified score, health, damage, cooldown, phase, event-ledger, and time values
  cannot change a published result.
- Sessions, objects, tasks, jobs, receipts, and publications are account-bound,
  size-bounded, idempotent, non-enumerable, and covered by emulator tests.
- Verification failure never blocks gameplay, damages local progression, lowers
  an existing public record, or exposes another player's input.
- Shadow and canary gates meet the replay, cost, retention, and divergence limits
  above with release evidence tied to the exact deployed revisions.
- Competition remains fail-closed until the specific world-record gate is
  deliberately enabled; leagues and verified progression remain independently
  disabled until their later gates pass.
