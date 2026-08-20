const assert = require("node:assert/strict");
const test = require("node:test");

const {
  TRUSTED_RUN_MAX_DURATION_MS,
  reusableVerifiedRunSession,
  scoreTrustedRunEvents,
  validateTrustedRunSubmission
} = require("../functions/trusted-run");

test("verified run starts reuse only one active unexpired session", () => {
  const session = {
    sessionId: "session_1",
    challenge: "a".repeat(32),
    status: "active",
    startedAtMs: 1000,
    expiresAtMs: 5000
  };
  assert.deepEqual(
    reusableVerifiedRunSession({ activeSessionId: "session_1", activeExpiresAtMs: 5000 }, session, 2000),
    { id: "session_1", challenge: "a".repeat(32), startedAtMs: 1000, expiresAtMs: 5000 }
  );
  assert.equal(reusableVerifiedRunSession({ activeSessionId: "session_1", activeExpiresAtMs: 5000 }, session, 5000), null);
  assert.equal(reusableVerifiedRunSession({ activeSessionId: "other", activeExpiresAtMs: 5000 }, session, 2000), null);
});

test("trusted records are calculated from a bounded event ledger rather than a client score", () => {
  const session = {
    status: "active",
    startedAtMs: 1_000_000,
    expiresAtMs: 1_000_000 + TRUSTED_RUN_MAX_DURATION_MS,
    challenge: "0123456789abcdef0123456789abcdef"
  };
  const evidence = {
    sessionId: "session_a",
    challenge: session.challenge,
    completedAtMs: 1_060_000,
    score: 999_999_999,
    events: [
      { seq: 1, tick: 120, type: "kill", kind: "red", entityId: "e1" },
      { seq: 2, tick: 180, type: "kill", kind: "red", entityId: "e2" },
      { seq: 3, tick: 240, type: "damage", amount: 1 },
      { seq: 4, tick: 360, type: "boss", kind: "standard", entityId: "b1" },
      { seq: 5, tick: 480, type: "phase", phase: 2 }
    ]
  };
  const validation = validateTrustedRunSubmission(session, evidence, 1_060_000);
  assert.equal(validation.ok, true);
  assert.equal(validation.run.score, 1060);
  assert.notEqual(validation.run.score, evidence.score);
  assert.equal(scoreTrustedRunEvents(evidence.events).score, 1060);
  assert.equal(validation.run.phaseReached, 2);
});

test("trusted phase records require ordered, time-bounded phase events", () => {
  const session = { status: "active", startedAtMs: 0, expiresAtMs: 120_000, challenge: "c" };
  const evidence = { challenge: "c", events: [
    { seq: 1, tick: 480, type: "phase", phase: 2 },
    { seq: 2, tick: 960, type: "phase", phase: 3 }
  ] };
  assert.equal(validateTrustedRunSubmission(session, evidence, 20_000).run.phaseReached, 3);
  assert.equal(validateTrustedRunSubmission(session, { ...evidence, events: [{ seq: 1, tick: 100, type: "phase", phase: 2 }] }, 20_000).reason, "phase_timing_invalid");
  assert.equal(validateTrustedRunSubmission(session, { ...evidence, events: [{ seq: 1, tick: 480, type: "phase", phase: 3 }] }, 20_000).reason, "phase_sequence_invalid");
});

test("trusted sessions reject replay, stale challenges, duplicate entities, and impossible event cadence", () => {
  const base = {
    status: "active",
    startedAtMs: 10_000,
    expiresAtMs: 100_000,
    challenge: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
  };
  const valid = {
    challenge: base.challenge,
    completedAtMs: 20_000,
    events: [{ seq: 1, tick: 180, type: "kill", kind: "orange", entityId: "enemy_1" }]
  };
  assert.equal(validateTrustedRunSubmission({ ...base, status: "submitted" }, valid, 20_000).reason, "session_not_active");
  assert.equal(validateTrustedRunSubmission(base, { ...valid, challenge: "wrong" }, 20_000).reason, "challenge_mismatch");
  assert.equal(validateTrustedRunSubmission(base, { ...valid, events: [valid.events[0], { ...valid.events[0], seq: 2 }] }, 20_000).reason, "duplicate_entity");
  assert.equal(validateTrustedRunSubmission(base, {
    ...valid,
    events: Array.from({ length: 26 }, (_, index) => ({ seq: index + 1, tick: 60, type: "kill", kind: "red", entityId: `e_${index}` }))
  }, 20_000).reason, "event_rate_too_high");
});
