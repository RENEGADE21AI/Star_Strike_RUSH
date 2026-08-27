"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  ANGLE_UNITS,
  ENERGY_UNITS_PER_POINT,
  GAME_HEIGHT_UNITS,
  GAME_WIDTH_UNITS,
  POSITION_UNITS_PER_PIXEL,
  SIMULATION_REVISION
} = require("../shared/verified-run/constants");
const {
  createSimulationState,
  digestCanonicalState,
  serializeCanonicalState
} = require("../shared/verified-run/simulation-state");
const {
  spawnCanonicalEnemy,
  stepSimulation
} = require("../shared/verified-run/simulation-step");
const { deriveVerifiedRunResult } = require("../shared/verified-run/result");

function ticket(overrides = {}) {
  return {
    runId: "run_golden_001",
    rootSeed: "00112233445566778899aabbccddeeff",
    simRevision: SIMULATION_REVISION,
    rulesRevision: "rules-v1",
    contentRevision: "content-v1",
    buildSha: "a".repeat(40),
    maxTicks: 1_296_000,
    ...overrides
  };
}

test("canonical simulation state is integer-only, revision-bound, and centered", () => {
  const state = createSimulationState(ticket());
  assert.equal(state.schema, "SSR_SIM_STATE_V1");
  assert.equal(state.simRevision, SIMULATION_REVISION);
  assert.equal(state.player.x, Math.round(GAME_WIDTH_UNITS / 2));
  assert.equal(state.player.y, Math.round(GAME_HEIGHT_UNITS * 0.8));
  assert.equal(state.player.energy, 100 * ENERGY_UNITS_PER_POINT);
  assert.equal(state.player.heading, 0);
  assert.equal(Number.isInteger(state.player.x), true);
  assert.equal(ANGLE_UNITS, 4096);
  assert.equal(POSITION_UNITS_PER_PIXEL, 1024);
  assert.equal(Object.isFrozen(state.ticket), true);
});

test("the exact int8 control sample deterministically drives player motion", () => {
  const first = createSimulationState(ticket());
  const second = createSimulationState(ticket());
  const inputs = [
    { x: 127, y: 0, buttons: 0 },
    { x: 127, y: -64, buttons: 0 },
    { x: 0, y: 0, buttons: 0 },
    { x: -127, y: 127, buttons: 0 }
  ];
  for (const input of inputs) {
    stepSimulation(first, input);
    stepSimulation(second, input);
  }
  assert.deepEqual(first, second);
  assert.equal(first.tick, 4);
  assert.notEqual(first.player.x, Math.round(GAME_WIDTH_UNITS / 2));
  assert.ok(first.player.x >= 20 * POSITION_UNITS_PER_PIXEL);
  assert.ok(first.player.x <= GAME_WIDTH_UNITS - 20 * POSITION_UNITS_PER_PIXEL);
});

test("Ghost Shift and pause edges apply once on their canonical tick", () => {
  const state = createSimulationState(ticket());
  stepSimulation(state, { x: 127, y: 0, buttons: 1 });
  assert.equal(state.player.energy, 65 * ENERGY_UNITS_PER_POINT + 50);
  assert.equal(state.player.ghostTimer, 17);
  assert.equal(state.player.ghostCooldown, 19);
  assert.ok(state.player.vx > 4 * POSITION_UNITS_PER_PIXEL);
  assert.equal(state.stats.ghostUses, 1);

  stepSimulation(state, { x: 0, y: 0, buttons: 1 });
  assert.equal(state.stats.ghostUses, 1, "cooldown must reject a repeated Ghost edge");
  assert.equal(state.player.hp, 5);
  stepSimulation(state, { x: 0, y: 0, buttons: 2 });
  assert.equal(state.player.hp, 4);
  assert.equal(state.stats.pauseUses, 1);
  stepSimulation(state, { x: 0, y: 0, buttons: 0 });
  assert.equal(state.player.hp, 4);
});

test("pause damage can end a run and terminal state cannot advance", () => {
  const state = createSimulationState(ticket());
  state.player.hp = 1;
  stepSimulation(state, { x: 0, y: 0, buttons: 2 });
  assert.equal(state.terminal, true);
  assert.equal(state.terminalReason, "player_destroyed");
  assert.equal(state.tick, 1);
  assert.throws(() => stepSimulation(state, { x: 0, y: 0, buttons: 0 }), /terminal/);
});

test("canonical serialization is stable and rejects non-integer authoritative state", () => {
  const state = createSimulationState(ticket());
  stepSimulation(state, { x: 127, y: -127, buttons: 0 });
  const first = serializeCanonicalState(state);
  const second = serializeCanonicalState(structuredClone(state));
  assert.deepEqual(first, second);
  assert.match(new TextDecoder().decode(first), /^\{"schema":"SSR_SIM_STATE_V1"/);
  state.player.x += 0.5;
  assert.throws(() => serializeCanonicalState(state), /integer/);
});

test("canonical state digests are stable and change with authoritative state", async () => {
  const first = createSimulationState(ticket());
  const second = createSimulationState(ticket());
  assert.equal(await digestCanonicalState(first), await digestCanonicalState(second));
  stepSimulation(second, { x: 127, y: 0, buttons: 0 });
  assert.notEqual(await digestCanonicalState(first), await digestCanonicalState(second));
  assert.match(await digestCanonicalState(first), /^[a-f0-9]{32}$/);
});

test("verified result is derived only from terminal canonical state", () => {
  const state = createSimulationState(ticket());
  state.score = 12_345;
  state.phase = 8;
  state.stats.kills = 77;
  state.stats.bosses = 2;
  state.player.hp = 1;
  stepSimulation(state, { x: 0, y: 0, buttons: 2 });
  assert.deepEqual(deriveVerifiedRunResult(state), {
    runId: "run_golden_001",
    simRevision: SIMULATION_REVISION,
    tickCount: 1,
    score: 12_345,
    phase: 8,
    kills: 77,
    bosses: 2,
    ghostUses: 0,
    pauseUses: 1,
    terminalReason: "player_destroyed"
  });
  const active = createSimulationState(ticket({ runId: "run_active" }));
  assert.throws(() => deriveVerifiedRunResult(active), /terminal/);
});

test("500 generated control sequences preserve deterministic integer invariants", () => {
  for (let seed = 1; seed <= 500; seed++) {
    let randomState = seed >>> 0;
    const next = () => {
      randomState = (Math.imul(randomState, 1664525) + 1013904223) >>> 0;
      return randomState;
    };
    const runTicket = ticket({ runId: `run_invariant_${seed}`, maxTicks: 90 });
    const first = createSimulationState(runTicket);
    const second = createSimulationState(runTicket);
    while (!first.terminal) {
      const input = {
        x: (next() % 255) - 127,
        y: (next() % 255) - 127,
        buttons: next() % 29 === 0 ? 1 : 0
      };
      stepSimulation(first, input);
      stepSimulation(second, input);
      assert.deepEqual(first, second, `seed ${seed} diverged at tick ${first.tick}`);
    }
    assert.equal(first.terminalReason, "tick_limit");
    assert.doesNotThrow(() => serializeCanonicalState(first));
  }
});

test("canonical stepping rejects malformed input before mutating state", () => {
  for (const input of [
    { x: 128, y: 0, buttons: 0 },
    { x: 0.5, y: 0, buttons: 0 },
    { x: 0, y: 0, buttons: 4 }
  ]) {
    const state = createSimulationState(ticket());
    assert.throws(() => stepSimulation(state, input), /input/);
    assert.equal(state.tick, 0);
  }
});

test("auto-fire, projectile motion, collision, kills, and score are authoritative", () => {
  const state = createSimulationState(ticket({ maxTicks: 120 }));
  spawnCanonicalEnemy(state, "orange", state.player.x, state.player.y - 45 * POSITION_UNITS_PER_PIXEL, {
    vx: 0,
    vy: 0
  });
  for (let tick = 0; tick < 8 && state.stats.kills === 0; tick++) {
    stepSimulation(state, { x: 0, y: 0, buttons: 0 });
  }
  assert.equal(state.stats.kills, 1);
  assert.equal(state.score, 20);
  assert.equal(state.comboKills, 1);
  assert.equal(state.multiplier, 1);
  assert.equal(state.enemies.length, 0);
  assert.equal(state.playerProjectiles.length, 0, "the hitting projectile must be consumed");
});

test("enemy contact uses artwork-aligned bodies and terminal health authority", () => {
  const state = createSimulationState(ticket());
  state.player.hp = 1;
  spawnCanonicalEnemy(state, "carrier", state.player.x, state.player.y, { vx: 0, vy: 0 });
  stepSimulation(state, { x: 0, y: 0, buttons: 0 });
  assert.equal(state.player.hp, 0);
  assert.equal(state.terminal, true);
  assert.equal(state.terminalReason, "player_destroyed");
  assert.equal(state.stats.damageTaken, 1);
});

test("entity creation rejects unknown content and all combat state stays integer-only", () => {
  const state = createSimulationState(ticket({ maxTicks: 30 }));
  assert.throws(() => spawnCanonicalEnemy(state, "invented", 0, 0), /enemy type/);
  for (const type of ["red", "purple", "phantom", "splitter", "siphon", "railgunner"]) {
    spawnCanonicalEnemy(state, type, 30 * POSITION_UNITS_PER_PIXEL + state.enemies.length * 40 * POSITION_UNITS_PER_PIXEL, 80 * POSITION_UNITS_PER_PIXEL, {
      vx: 0,
      vy: POSITION_UNITS_PER_PIXEL
    });
  }
  while (!state.terminal) stepSimulation(state, { x: 0, y: 0, buttons: 0 });
  assert.doesNotThrow(() => serializeCanonicalState(state));
});
