# Authoritative Random Run Verification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Verify normal random Star Strike RUSH runs by replaying canonical player controls against a server-issued seed before any public record or league write.

**Architecture:** A repository-owned deterministic simulation contract is shared by the ordered browser runtime and a private Node 22 replay worker. Firebase callables issue version-bound tickets and authorize bounded input uploads; Cloud Tasks invokes a scale-to-zero worker, and a separate idempotent publication transaction consumes only worker-derived results.

**Tech Stack:** JavaScript, ordered Canvas2D runtime, Node.js 22, Firebase Auth, Firestore, Cloud Storage, Firebase Functions v2, Cloud Tasks, Cloud Run, Node test runner, Playwright, Firebase emulators.

**Spec:** `docs/superpowers/specs/2026-08-27-authoritative-random-run-verification-design.md`

## Global Constraints

- Preserve ordinary standard runs; do not introduce a ranked mode or shared daily seed.
- Keep all competition, league, and verified-progression publication gates disabled until their rollout evidence passes.
- Do not replace the ordered browser scripts, Canvas renderer, or framework-free runtime.
- The browser supplies controls and an untrusted claim; only replay output can publish records.
- Use 60 simulation ticks per second, a six-hour/1,296,000-tick ceiling, 250,000 input segments, and a two-MiB tape ceiling.
- Keep offline and anonymous play available; verification failure must not block Start or damage local progression.
- Preserve current Firebase rules boundaries and default-deny behavior.
- Do not describe App Check as proof of honest gameplay.

---

### Task 1: Deterministic primitives and input container

**Files:**
- Create: `shared/verified-run/constants.js`
- Create: `shared/verified-run/random.js`
- Create: `shared/verified-run/input-tape.js`
- Create: `tests/verified-run-primitives.test.js`

**Interfaces:**
- Produces: `createRunRandomStreams(rootSeedHex, simRevision)`, `canonicalRunInput(raw)`, `encodeInputTape(frames, metadata)`, and `decodeInputTape(bytes)`.
- Produces: immutable limits and revision constants consumed by client, Functions, and worker code.

- [x] Write Node tests that assert fixed random vectors, named-stream isolation, input quantization, RLE round trips, malformed/trailing-byte rejection, and all hard limits.
- [x] Run `node --test tests/verified-run-primitives.test.js` and confirm missing-module failure.
- [x] Implement xoshiro128**, SHA-256 stream derivation, canonical input normalization, and the `SSR_INPUT_V1` binary codec with strict bounded parsing.
- [x] Run the targeted test and `npm test`.
- [x] Commit with `git commit -m "feat: add deterministic run verification primitives"`.

### Task 2: Browser random and input boundary

**Files:**
- Create: `src/00-verified-run-runtime.js`
- Modify: `index.html`
- Modify: `scripts/build_static.js`
- Modify: `src/01-core.js`
- Modify: gameplay files containing authoritative `Math.random()` calls.
- Modify: `src/18-session-input-loop.js`
- Test: `tests/runtime-contracts.test.js`
- Test: `tests/browser-gameplay.test.js`

**Interfaces:**
- Consumes: Task 1 random and input contracts.
- Produces: `beginSeededStandardRun(ticket)`, `runRandom(streamName)`, `captureCanonicalRunInput(state)`, and `finalizeRecordedInputTape()` on the ordered runtime boundary.

- [x] Add static and browser tests proving standard runs use ticket seed streams, cosmetic randomness cannot shift authoritative streams, and the exact canonical input drives and records each tick.
- [x] Run the targeted tests and confirm they fail against the legacy runtime.
- [x] Add the ordered runtime adapter and build allowlist entry; route gameplay randomness through named streams while leaving title traffic, stars, and particles cosmetic.
- [x] Record movement, Ghost Shift edge, and pause edge before each simulation update; keep tutorial runs and nonstandard QA runs outside verification.
- [x] Run browser gameplay, runtime contracts, WebKit smoke, and the full Node suite.
- [x] Commit with `git commit -m "feat: make standard runs seed and input deterministic"`.

### Task 3: Canonical gameplay state and headless transition

Progress checkpoint: the shared browser/Node core now owns revision-bound integer
state, canonical player motion, pause and Ghost Shift tick semantics, terminal
enforcement, stable serialization, checkpoint digests, and result derivation.
Enemy, projectile, hazard, boss, collision, pacing, scoring, and browser-state
ownership remain intentionally unchecked below until parity is implemented.

**Files:**
- Create: `shared/verified-run/simulation-state.js`
- Create: `shared/verified-run/simulation-step.js`
- Create: `shared/verified-run/result.js`
- Modify: `src/01-core.js`
- Modify: `src/03-pacing.js`
- Modify: `src/04-waves.js`
- Modify: `src/05-entities.js`
- Modify: `src/06-bosses.js`
- Modify: `src/07-gameplay-systems.js`
- Modify: `src/18-expansion-enemies-powerups.js`
- Modify: `src/18-expansion-hazards-bosses.js`
- Test: `tests/verified-run-simulation.test.js`

**Interfaces:**
- Consumes: `createRunRandomStreams()` and canonical input.
- Produces: `createSimulationState(ticket)`, `stepSimulation(state, input, streams)`, `serializeCanonicalState(state)`, and `deriveVerifiedRunResult(state)`.

- [ ] Add golden tests for player motion, pause damage, Ghost Shift, spawns, drops, collisions, phases, every boss, score, and terminal death.
- [ ] Confirm the golden tests fail before extraction.
- [ ] Extract gameplay-authoritative state and one-tick transitions behind browser adapters; use 1,024 integer position units, 4,096 angle units, integer timers, and deterministic trigonometry tables.
- [ ] Make Canvas, DOM, audio, visual interpolation, and wall time consumers of canonical state rather than inputs to it.
- [ ] Run 500 generated-seed invariants plus Node, Chromium, and WebKit golden replay parity.
- [ ] Commit with `git commit -m "feat: extract authoritative headless simulation"`.

### Task 4: Version-bound ticket lifecycle

**Files:**
- Create: `functions/verified-runs/tickets.js`
- Modify: `functions/index.js`
- Modify: `functions/release-config.js`
- Modify: `src/00-release-config.js`
- Modify: `shared/release-integrity.json`
- Modify: `src/20-firebase-online.js`
- Modify: `src/19-game-achievements.js`
- Test: `tests/verified-run-tickets.test.js`
- Test: `tests/server-competition-gate.test.js`

**Interfaces:**
- Produces callable `startVerifiedRun` returning `{runId, rootSeed, simRevision, rulesRevision, inputRevision, contentRevision, buildSha, weekId, issuedAtMs, submitByMs, maxTicks}`.
- Produces `abandonActiveTicket(tx, uid, reason)` and enforces one active ticket, 12 requests/minute, and 120 new tickets/hour.

- [ ] Add unit and emulator tests for authentication, version binding, one active ticket, abandonment, expiry, week assignment, rate limits, and the 1.2-second client fallback.
- [ ] Confirm tests fail against challenge-only sessions.
- [ ] Replace challenge sessions with cryptographic 128-bit seeded tickets and explicit state transitions while keeping all publication flags off.
- [ ] Start the ticket handshake inside the existing launch transition; on failure use local cryptographic randomness and mark the run nonpublishable.
- [ ] Run callable security, release-integrity, emulator, browser, and full suites.
- [ ] Commit with `git commit -m "feat: issue authoritative seeded run tickets"`.

### Task 5: Candidate upload and asynchronous job state

**Files:**
- Create: `functions/verified-runs/candidates.js`
- Create: `functions/verified-runs/jobs.js`
- Create: `storage.rules`
- Modify: `firebase.json`
- Modify: `functions/index.js`
- Modify: `src/20-firebase-online.js`
- Test: `tests/verified-run-candidates.test.js`
- Test: `tests/storage-rules.emulator.mjs`

**Interfaces:**
- Produces callables `prepareRunCandidate`, `finalizeRunUpload`, and `getRunVerificationStatus`.
- Produces job states `queued`, `verifying`, `verified`, `rejected`, `verification_error`, `published`, and `expired`.

- [ ] Add tests for candidate thresholds, one pending job, eight candidates/hour, signed-policy path binding, size/digest/generation checks, duplicate finalization, and sanitized owner status.
- [ ] Confirm tests fail before endpoints and rules exist.
- [ ] Implement cheap authoritative-threshold filtering, ten-minute bounded upload authorization, private object metadata validation, and idempotent task creation with object references only.
- [ ] Add default-deny Storage Rules and service-only verification-object reads, overwrites, enumeration, and deletion.
- [ ] Run Rules, callable security, emulator integration, and full tests.
- [ ] Commit with `git commit -m "feat: queue bounded run verification candidates"`.

### Task 6: Private replay worker and immutable receipts

**Files:**
- Create: `verifier/package.json`
- Create: `verifier/index.js`
- Create: `verifier/replay.js`
- Create: `verifier/Dockerfile`
- Create: `tests/verified-run-worker.test.js`
- Modify: deployment and release-evidence scripts that enumerate backend artifacts.

**Interfaces:**
- Consumes: ticket, exact input object generation, immutable simulation revision, and Task 3 headless core.
- Produces: `replayVerifiedRun(ticket, tape)` and immutable worker result containing authoritative result, input digest, final-state digest, and verifier build digest.

- [ ] Add tests for task identity, transactional claiming, strict parsing, terminal-tick requirements, revision mismatch, digest divergence, duplicate delivery, deterministic rejection, and transient retry behavior.
- [ ] Confirm tests fail before the private worker exists.
- [ ] Implement the Node 22 worker with one vCPU/512 MiB/concurrency one assumptions and no public invocation authority.
- [ ] Benchmark 30-minute and six-hour fixtures and emit bounded sanitized metrics.
- [ ] Run worker, golden replay, secret scan, audit, and build tests.
- [ ] Commit with `git commit -m "feat: replay candidate runs in a private worker"`.

### Task 7: Idempotent record publication with independent gates

**Files:**
- Create: `functions/verified-runs/publication.js`
- Modify: `functions/index.js`
- Modify: `functions/competition.js`
- Modify: `functions/release-config.js`
- Modify: `src/00-release-config.js`
- Modify: `shared/release-integrity.json`
- Modify: `firestore.rules`
- Test: `tests/verified-run-publication.test.js`
- Test: `tests/server-competition-mutations.test.js`

**Interfaces:**
- Produces `publishVerifiedResult(tx, workerResult)` which accepts no client event ledger or claimed outcome.
- Produces independent flags for tickets, queue, shadow replay, world records, weekly leagues, verified progression, and App Check.

- [ ] Add tests proving worker-only publication, raise-only records, weekly max behavior, ticket consumption, duplicate task idempotency, and independent fail-closed gates.
- [ ] Confirm current coupled competition activation fails the new tests.
- [ ] Replace client-ledger publication with worker-result publication; retain legacy ledger only as shadow diagnostics until removal.
- [ ] Keep all public write flags false and verify release smoke still observes closed competition callables.
- [ ] Run Firestore Rules, Firebase client integration, release tooling, and full tests.
- [ ] Commit with `git commit -m "feat: publish only authoritative replay results"`.

### Task 8: Invisible status UX, shadow evidence, and cleanup

**Files:**
- Modify: `src/19-game-achievements.js`
- Modify: `src/20-firebase-online.js`
- Modify: relevant results/records rendering files.
- Modify: `functions/index.js`
- Modify: `scripts/create-ci-release-report.js`
- Modify: `scripts/generate-backend-release.js`
- Modify: `scripts/smoke-release.js`
- Test: `tests/ui-truthfulness.test.js`
- Test: `tests/final-production-gate.test.js`
- Test: visual QA scenarios and performance QA fixtures.

**Interfaces:**
- Produces truthful statuses `RECORD CHECK PENDING`, `RECORD VERIFIED`, `RUN SAVED LOCALLY — RECORDS OFFLINE`, and `RUN NOT PUBLISHED`.
- Produces scheduled expiry and object-retention cleanup plus release evidence for active verifier revisions and flags.

- [ ] Add tests for silent noncandidate runs, pending/verified/offline/rejected status, retry after reconnect, no local-progression damage, cleanup retention, and truthful release evidence.
- [ ] Confirm UI and evidence tests fail before integration.
- [ ] Implement compact results/status integration, IndexedDB retry, seven/90-day retention, account-deletion cleanup, and the emergency ticket/queue kill switch.
- [ ] Run visual QA, WebKit, Firebase client, performance soak, release check, build, audit, and secret scan.
- [ ] Commit with `git commit -m "feat: integrate shadow run verification safely"`.

### Task 9: Shadow and canary release evidence

**Files:**
- Modify: `docs/RELEASE_WORKFLOW.md`
- Modify: `PROJECT_STATUS.md`
- Create: sanitized generated replay evidence through existing release tooling.

**Interfaces:**
- Consumes: all prior tasks and the exact green release SHA.
- Produces: evidence for offline parity, production shadow, quarantined record canary, world-record activation, and later weekly-league activation.

- [ ] Run the complete declared CI workflow on the exact branch head and remediate failures without weakening authority or limits.
- [ ] Deploy shadow-only backend and Hosting preview with publication flags false, then verify exact SHA and callable/rules boundaries.
- [ ] Complete 100 browser runs, boss coverage, a 60-minute run, network recovery, and duplicate-task delivery with zero unexplained divergence.
- [ ] Keep production public record and league gates false unless the human production approval and design acceptance criteria are both satisfied.
- [ ] Commit sanitized evidence and documentation with `git commit -m "docs: record verifier shadow evidence"`.
