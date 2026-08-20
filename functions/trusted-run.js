"use strict";

const TRUSTED_RUN_MAX_DURATION_MS = 6 * 60 * 60 * 1000;
const TRUSTED_RUN_MAX_EVENTS = 12000;
const MAX_SCORING_EVENTS_PER_SECOND = 24;

const ENEMY_POINTS = Object.freeze({
  red: 30,
  orange: 20,
  purple: 150,
  phantom: 100,
  splitter: 120,
  splitter_shard: 10,
  carrier: 300,
  siphon: 130,
  leech: 190,
  minecaster: 140,
  shieldbearer: 150,
  railgunner: 220,
  repair_drone: 90,
  enemy_leader: 120,
  asteroid: 25
});

const BOSS_POINTS = Object.freeze({
  standard: 1000,
  wraith: 1700,
  debris_warden: 1800,
  mothership: 1900,
  siphon_core: 2000,
  hive_breaker: 2100,
  rail_tyrant: 2200,
  gravity_well: 2300
});

const BONUS_POINTS = Object.freeze({ carrier_no_launch: 120, boss_bay: 25 });

function reusableVerifiedRunSession(root, session, nowMs = Date.now()) {
  const activeId = safeEntityId(root && root.activeSessionId);
  const currentTime = finiteInteger(nowMs, 0, Number.MAX_SAFE_INTEGER);
  if (!activeId || currentTime == null || Number(root.activeExpiresAtMs || 0) <= currentTime) return null;
  if (!session || session.status !== "active" || String(session.sessionId || "") !== activeId) return null;
  const startedAtMs = finiteInteger(session.startedAtMs, 0, Number.MAX_SAFE_INTEGER);
  const expiresAtMs = finiteInteger(session.expiresAtMs, 0, Number.MAX_SAFE_INTEGER);
  const challenge = String(session.challenge || "");
  if (startedAtMs == null || expiresAtMs == null || expiresAtMs <= currentTime || !/^[a-f0-9]{32}$/.test(challenge)) return null;
  return { id: activeId, challenge, startedAtMs, expiresAtMs };
}

function finiteInteger(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  const integer = Math.floor(number);
  return integer >= min && integer <= max ? integer : null;
}

function safeEntityId(value) {
  const text = String(value || "");
  return /^[A-Za-z0-9_-]{1,80}$/.test(text) ? text : "";
}

function scoreTrustedRunEvents(rawEvents) {
  const events = Array.isArray(rawEvents) ? rawEvents : [];
  let score = 0;
  let comboKills = 0;
  let highestCombo = 0;
  let kills = 0;
  let bosses = 0;
  let powerups = 0;
  let ghostUses = 0;
  let damageTaken = 0;
  let phaseReached = 1;
  let surgeUntilTick = -1;
  for (const event of events) {
    const tick = finiteInteger(event && event.tick, 0, 100_000_000) ?? 0;
    if (event.type === "kill") {
      const base = ENEMY_POINTS[event.kind];
      if (!base) continue;
      comboKills++;
      kills++;
      highestCombo = Math.max(highestCombo, comboKills);
      const multiplier = Math.min(4, 1 + Math.floor(comboKills / 7));
      const surge = tick <= surgeUntilTick ? 1.5 : 1;
      score += Math.round(base * multiplier * surge);
    } else if (event.type === "boss") {
      const points = BOSS_POINTS[event.kind];
      if (!points) continue;
      score += points;
      bosses++;
      comboKills = 0;
    } else if (event.type === "bonus") {
      const points = BONUS_POINTS[event.kind];
      if (points) score += points;
    } else if (event.type === "damage") {
      damageTaken += finiteInteger(event.amount, 1, 4) || 1;
      comboKills = 0;
    } else if (event.type === "powerup") {
      powerups++;
      if (event.kind === "score_surge") surgeUntilTick = Math.max(surgeUntilTick, tick + 900);
    } else if (event.type === "ghost") {
      ghostUses++;
    } else if (event.type === "phase") {
      phaseReached = Math.max(phaseReached, finiteInteger(event.phase, 2, 9999) || 1);
    }
  }
  return { score, kills, bosses, powerups, ghostUses, damageTaken, highestCombo, phaseReached };
}

function validateTrustedRunSubmission(session, evidence, nowMs = Date.now()) {
  if (!session || session.status !== "active") return { ok: false, reason: "session_not_active" };
  const now = finiteInteger(nowMs, 0, Number.MAX_SAFE_INTEGER);
  const startedAtMs = finiteInteger(session.startedAtMs, 0, Number.MAX_SAFE_INTEGER);
  const expiresAtMs = finiteInteger(session.expiresAtMs, 0, Number.MAX_SAFE_INTEGER);
  if (now == null || startedAtMs == null || expiresAtMs == null || now < startedAtMs || now > expiresAtMs) {
    return { ok: false, reason: "session_expired" };
  }
  if (!evidence || String(evidence.challenge || "") !== String(session.challenge || "")) {
    return { ok: false, reason: "challenge_mismatch" };
  }
  const events = Array.isArray(evidence.events) ? evidence.events : null;
  if (!events || events.length > TRUSTED_RUN_MAX_EVENTS) return { ok: false, reason: "event_count_invalid" };
  const durationMs = Math.min(TRUSTED_RUN_MAX_DURATION_MS, Math.max(0, now - startedAtMs));
  const maxTick = Math.ceil(durationMs * 60 / 1000) + 180;
  const entityIds = new Set();
  const secondBuckets = new Map();
  let previousSeq = 0;
  let previousTick = -1;
  let previousPhase = 1;
  for (const event of events) {
    if (!event || !["kill", "boss", "bonus", "damage", "powerup", "ghost", "phase"].includes(event.type)) {
      return { ok: false, reason: "event_type_invalid" };
    }
    const seq = finiteInteger(event.seq, 1, TRUSTED_RUN_MAX_EVENTS);
    const tick = finiteInteger(event.tick, 0, maxTick);
    if (seq == null || seq !== previousSeq + 1) return { ok: false, reason: "event_sequence_invalid" };
    if (tick == null || tick < previousTick) return { ok: false, reason: "event_tick_invalid" };
    previousSeq = seq;
    previousTick = tick;
    if (event.type === "kill" || event.type === "boss") {
      const points = event.type === "kill" ? ENEMY_POINTS[event.kind] : BOSS_POINTS[event.kind];
      if (!points) return { ok: false, reason: "event_kind_invalid" };
      const entityId = safeEntityId(event.entityId);
      if (!entityId) return { ok: false, reason: "entity_id_invalid" };
      if (entityIds.has(entityId)) return { ok: false, reason: "duplicate_entity" };
      entityIds.add(entityId);
      const second = Math.floor(tick / 60);
      const count = (secondBuckets.get(second) || 0) + 1;
      secondBuckets.set(second, count);
      if (count > MAX_SCORING_EVENTS_PER_SECOND) return { ok: false, reason: "event_rate_too_high" };
    } else if (event.type === "bonus" && !BONUS_POINTS[event.kind]) {
      return { ok: false, reason: "event_kind_invalid" };
    } else if (event.type === "phase") {
      const phase = finiteInteger(event.phase, 2, 9999);
      if (phase == null || phase !== previousPhase + 1) return { ok: false, reason: "phase_sequence_invalid" };
      // Even the fastest late-game phase requires hundreds of fixed simulation ticks.
      if (tick < (phase - 1) * 480) return { ok: false, reason: "phase_timing_invalid" };
      previousPhase = phase;
    }
  }
  const calculated = scoreTrustedRunEvents(events);
  return {
    ok: true,
    reason: "",
    run: {
      score: calculated.score,
      phaseReached: calculated.phaseReached,
      runDurationMs: durationMs,
      enemiesKilled: calculated.kills,
      bossesKilled: calculated.bosses,
      powerupsCollected: calculated.powerups,
      ghostUses: calculated.ghostUses,
      damageTaken: calculated.damageTaken,
      highestCombo: calculated.highestCombo
    }
  };
}

module.exports = {
  BOSS_POINTS,
  BONUS_POINTS,
  ENEMY_POINTS,
  TRUSTED_RUN_MAX_DURATION_MS,
  TRUSTED_RUN_MAX_EVENTS,
  reusableVerifiedRunSession,
  scoreTrustedRunEvents,
  validateTrustedRunSubmission
};
