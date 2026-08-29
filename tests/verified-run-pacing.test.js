"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  ENERGY_UNITS_PER_POINT,
  POSITION_UNITS_PER_PIXEL,
  SIMULATION_REVISION
} = require("../shared/verified-run/constants");
const { createRunRandomStreams } = require("../shared/verified-run/random");
const {
  canonicalAdaptiveWaveInterval,
  tickCanonicalDirector,
  tickCanonicalPacing
} = require("../shared/verified-run/director");
const { createSimulationState, serializeCanonicalState } = require("../shared/verified-run/simulation-state");
const { spawnCanonicalEnemy, stepSimulation } = require("../shared/verified-run/simulation-step");

function ticket(overrides = {}) {
  return {
    runId: "run_pacing_001",
    rootSeed: "102132435465768798a9bacbdcedfe0f",
    simRevision: SIMULATION_REVISION,
    rulesRevision: "rules-v1",
    contentRevision: "content-v1",
    buildSha: "d".repeat(40),
    maxTicks: 20_000,
    ...overrides
  };
}

function trackingStreams(value = 0) {
  const calls = [];
  return {
    calls,
    nextUint32(name) {
      calls.push(name);
      return value;
    }
  };
}

test("canonical state owns integer adaptive pacing and relief authority", () => {
  const state = createSimulationState(ticket());
  assert.deepEqual(
    {
      intensity: state.director.intensity,
      intensityTimer: state.director.intensityTimer,
      pressureHundredths: state.director.pressureHundredths,
      threatThousandths: state.director.threatThousandths,
      threatTargetThousandths: state.director.threatTargetThousandths,
      pacingMemoryThousandths: state.director.pacingMemoryThousandths,
      grace: state.director.grace,
      ghostGrace: state.director.ghostGrace,
      lastHitTick: state.director.lastHitTick,
      killStreak: state.director.killStreak,
      burstHundredths: state.director.burstHundredths,
      shotsFired: state.director.shotsFired,
      shotsHit: state.director.shotsHit
    },
    {
      intensity: "normal",
      intensityTimer: 180,
      pressureHundredths: 800,
      threatThousandths: 580,
      threatTargetThousandths: 580,
      pacingMemoryThousandths: 0,
      grace: 0,
      ghostGrace: 0,
      lastHitTick: -999,
      killStreak: 0,
      burstHundredths: 0,
      shotsFired: 0,
      shotsHit: 0
    }
  );
  assert.doesNotThrow(() => serializeCanonicalState(state));
});

test("opening pacing forces cooldown without consuming random data and changes energy recovery", () => {
  const state = createSimulationState(ticket({ runId: "run_opening_pacing" }));
  const streams = trackingStreams();
  state.player.energy = 0;
  state.player.fireCooldown = 10_000;

  stepSimulation(state, { x: 0, y: 0, buttons: 0 }, streams);
  assert.equal(state.director.intensity, "cooldown");
  assert.equal(state.player.energy, 50);
  assert.deepEqual(streams.calls, []);

  stepSimulation(state, { x: 0, y: 0, buttons: 0 }, streams);
  assert.equal(state.player.energy, 122);
  assert.deepEqual(streams.calls, []);
});

test("strong phase-three play enters a seeded surge using only the pacing stream", () => {
  const state = createSimulationState(ticket({ runId: "run_seeded_surge" }));
  const streams = trackingStreams();
  state.tick = 6_000;
  state.phase = 3;
  state.director.intensity = "normal";
  state.director.intensityTimer = 1;
  state.director.killStreak = 5;
  state.director.lastHitTick = 0;
  state.director.moodTimer = 100;

  tickCanonicalPacing(state, streams);

  assert.equal(state.director.intensity, "surge");
  assert.equal(state.director.intensityTimer, 300);
  assert.deepEqual(streams.calls, ["pacing"]);
});

test("unrelated named streams cannot shift adaptive pacing transitions", async () => {
  const first = createSimulationState(ticket({ runId: "run_pacing_isolation_a" }));
  const second = createSimulationState(ticket({ runId: "run_pacing_isolation_b" }));
  const firstStreams = await createRunRandomStreams(ticket().rootSeed, SIMULATION_REVISION);
  const secondStreams = await createRunRandomStreams(ticket().rootSeed, SIMULATION_REVISION);
  for (let index = 0; index < 80; index++) {
    secondStreams.nextUint32("waves");
    secondStreams.nextUint32("loot");
  }
  for (const state of [first, second]) {
    state.tick = 6_000;
    state.phase = 3;
    state.director.intensityTimer = 1;
    state.director.moodTimer = 1;
  }

  for (let index = 0; index < 120; index++) {
    first.tick++;
    second.tick++;
    tickCanonicalPacing(first, firstStreams);
    tickCanonicalPacing(second, secondStreams);
  }

  assert.deepEqual(first.director, second.director);
});

test("a real low-health hit trims queued pressure and forces recovery", () => {
  const state = createSimulationState(ticket({ runId: "run_low_hp_relief", maxTicks: 100 }));
  const streams = trackingStreams();
  state.player.hp = 3;
  state.player.fireCooldown = 10_000;
  state.pendingSpawns = Array.from({ length: 6 }, (_, index) => ({
    type: "red", x: 80_000 + index, y: -20_000, delay: 100 + index, motion: "drift", lane: index % 3
  }));
  state.enemyProjectiles = Array.from({ length: 8 }, (_, index) => ({
    id: state.nextEntityId++, kind: "enemy", x: 10_000 + index, y: 10_000,
    vx: 0, vy: 0, angle: 0, life: 100, damage: 1, drain: 0, realm: 0
  }));
  spawnCanonicalEnemy(state, "red", state.player.x, state.player.y, { vx: 0, vy: 0, driftPower: 0 });

  stepSimulation(state, { x: 0, y: 0, buttons: 0 }, streams);

  assert.equal(state.player.hp, 2);
  assert.equal(state.director.mood, "recovery");
  assert.ok(state.director.moodTimer >= 138);
  assert.ok(state.director.waveRest >= 47);
  assert.equal(state.pendingSpawns.length, 3);
  assert.equal(state.enemyProjectiles.length, 4);
  assert.equal(state.director.grace, 119);
  assert.equal(state.comboKills, 0);
  assert.equal(state.multiplier, 1);
});

test("adaptive wave intervals ease fragile runs and accelerate seeded surges", () => {
  const normal = createSimulationState(ticket({ runId: "run_interval_normal" }));
  normal.phase = 3;
  normal.tick = 7_200;
  normal.director.phaseTick = 1_200;
  normal.director.waveTick = 100;
  normal.director.intensity = "normal";
  normal.director.mood = "open";
  normal.director.threatThousandths = 1_000;
  normal.director.pressureHundredths = 5_000;

  const surge = structuredClone(normal);
  surge.director.intensity = "surge";
  surge.director.mood = "spike";

  const fragile = structuredClone(normal);
  fragile.player.hp = 1;
  fragile.director.intensity = "cooldown";
  fragile.director.mood = "recovery";
  fragile.director.grace = 60;

  assert.equal(canonicalAdaptiveWaveInterval(normal), 106);
  assert.equal(canonicalAdaptiveWaveInterval(surge), 68);
  assert.equal(canonicalAdaptiveWaveInterval(fragile), 197);
});

test("the canonical director schedules later waves from the adaptive interval", () => {
  const state = createSimulationState(ticket({ runId: "run_adaptive_director" }));
  const streams = trackingStreams();
  state.phase = 3;
  state.tick = 7_200;
  state.director.phaseTick = 1_200;
  state.director.intensity = "surge";
  state.director.mood = "spike";
  state.director.threatThousandths = 1_000;
  state.director.pressureHundredths = 5_000;
  state.director.waveTick = 67;

  const due = tickCanonicalDirector(state, streams);

  assert.ok(due.length + state.pendingSpawns.length > 0);
  assert.equal(state.director.waveTick, 0);
  assert.ok(streams.calls.includes("waves"));
});

test("boss pacing normalizes intensity without consuming the pacing stream", () => {
  const state = createSimulationState(ticket({ runId: "run_boss_pacing" }));
  const streams = trackingStreams();
  state.tick = 8_000;
  state.phase = 4;
  state.director.intensity = "surge";
  state.director.intensityTimer = 20;
  state.boss = { mode: "standard" };

  tickCanonicalPacing(state, streams);

  assert.equal(state.director.intensity, "normal");
  assert.equal(state.director.intensityTimer, 120);
  assert.deepEqual(streams.calls, []);
});
