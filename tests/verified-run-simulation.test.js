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

test("red drift consumes only deterministic enemy behavior randomness and stays integer exact", () => {
  const state = createSimulationState(ticket({ maxTicks: 20 }));
  state.player.fireCooldown = 10_000;
  const values = [1024, 1, 39, 0xffffffff];
  const streams = {
    nextUint32(name) {
      assert.equal(name, "enemy_behavior");
      if (values.length === 0) throw new Error("unexpected random draw");
      return values.shift();
    }
  };
  const enemy = spawnCanonicalEnemy(state, "red", 100_000, -20_000, {
    vy: 1_925,
    motion: "drift"
  }, streams);

  stepSimulation(state, { x: 0, y: 0, buttons: 0 }, streams);
  assert.equal(enemy.x, 100_100);
  assert.equal(enemy.y, -18_075);
  assert.equal(enemy.motionTick, 1);
  assert.equal(values.length, 0);
  assert.doesNotThrow(() => serializeCanonicalState(state));
});

test("orange snap turns consume only enemy behavior randomness and stay integer exact", () => {
  const state = createSimulationState(ticket({ maxTicks: 20 }));
  state.phase = 2;
  state.player.fireCooldown = 10_000;
  const values = [5, 0xffffffff, 1, 3, 50, 25, 0xffffffff];
  const streams = {
    nextUint32(name) {
      assert.equal(name, "enemy_behavior");
      if (values.length === 0) throw new Error("unexpected random draw");
      return values.shift();
    }
  };
  const enemy = spawnCanonicalEnemy(state, "orange", 100_000, -20_000, {
    vx: 3_277,
    vy: 2_600,
    motion: "snap",
    loopAngle: 0,
    turnTimer: 0,
    turnDir: -1,
    snapTimer: 0
  }, streams);

  stepSimulation(state, { x: 0, y: 0, buttons: 0 }, streams);
  assert.deepEqual({
    x: enemy.x,
    y: enemy.y,
    vx: enemy.vx,
    vy: enemy.vy,
    motionTick: enemy.motionTick,
    turnTimer: enemy.turnTimer,
    turnDir: enemy.turnDir,
    snapTimer: enemy.snapTimer
  }, {
    x: 101_880,
    y: -17_041,
    vx: 4_700,
    vy: 2_959,
    motionTick: 1,
    turnTimer: 16,
    turnDir: 1,
    snapTimer: 10
  });
  assert.equal(values.length, 0);
  assert.doesNotThrow(() => serializeCanonicalState(state));
});

test("orange zigzag weave advances from canonical angle state", () => {
  const state = createSimulationState(ticket({ maxTicks: 20 }));
  state.phase = 2;
  state.player.fireCooldown = 10_000;
  const values = [0xffffffff];
  const streams = {
    nextUint32(name) {
      assert.equal(name, "enemy_behavior");
      if (values.length === 0) throw new Error("unexpected random draw");
      return values.shift();
    }
  };
  const enemy = spawnCanonicalEnemy(state, "orange", 100_000, -20_000, {
    vx: 3_000,
    vy: 2_500,
    motion: "zigzag",
    loopAngle: 0,
    turnTimer: 2,
    turnDir: 1,
    snapTimer: 0
  }, streams);

  stepSimulation(state, { x: 0, y: 0, buttons: 0 }, streams);
  assert.deepEqual({
    x: enemy.x,
    y: enemy.y,
    vx: enemy.vx,
    vy: enemy.vy,
    motionTick: enemy.motionTick,
    turnTimer: enemy.turnTimer
  }, {
    x: 101_202,
    y: -17_500,
    vx: 3_004,
    vy: 2_500,
    motionTick: 1,
    turnTimer: 1
  });
  assert.equal(values.length, 0);
});

test("orange zigzag turns choose canonical direction and velocity", () => {
  const state = createSimulationState(ticket({ maxTicks: 20 }));
  state.phase = 2;
  state.player.fireCooldown = 10_000;
  const values = [5, 0, 1, 0, 50, 25, 0xffffffff];
  const streams = {
    nextUint32(name) {
      assert.equal(name, "enemy_behavior");
      if (values.length === 0) throw new Error("unexpected random draw");
      return values.shift();
    }
  };
  const enemy = spawnCanonicalEnemy(state, "orange", 100_000, -20_000, {
    vx: 3_000,
    vy: 2_500,
    motion: "zigzag",
    loopAngle: 0,
    turnTimer: 0,
    turnDir: -1,
    snapTimer: 0
  }, streams);

  stepSimulation(state, { x: 0, y: 0, buttons: 0 }, streams);
  assert.deepEqual({
    x: enemy.x,
    y: enemy.y,
    vx: enemy.vx,
    vy: enemy.vy,
    motionTick: enemy.motionTick,
    turnTimer: enemy.turnTimer,
    turnDir: enemy.turnDir,
    snapTimer: enemy.snapTimer
  }, {
    x: 98_552,
    y: -17_092,
    vx: -3_621,
    vy: 2_908,
    motionTick: 1,
    turnTimer: 16,
    turnDir: 1,
    snapTimer: 0
  });
  assert.equal(values.length, 0);
});

test("queued orange enemies initialize canonical motion from the named behavior stream", () => {
  const state = createSimulationState(ticket({ maxTicks: 20 }));
  state.phase = 2;
  const values = [1_024, 5, 1];
  const streams = {
    nextUint32(name) {
      assert.equal(name, "enemy_behavior");
      if (values.length === 0) throw new Error("unexpected random draw");
      return values.shift();
    }
  };

  const enemy = spawnCanonicalEnemy(state, "orange", 100_000, -20_000, {
    vy: 2_600,
    motion: "zigzag"
  }, streams);
  assert.deepEqual({
    vx: enemy.vx,
    loopAngle: enemy.loopAngle,
    turnTimer: enemy.turnTimer,
    turnDir: enemy.turnDir,
    snapTimer: enemy.snapTimer
  }, {
    vx: 3_379,
    loopAngle: 1_024,
    turnTimer: 19,
    turnDir: 1,
    snapTimer: 0
  });
  assert.equal(values.length, 0);
});

test("purple warning emits an authoritative aimed projectile on its canonical tick", () => {
  const state = createSimulationState(ticket({ maxTicks: 40 }));
  state.phase = 2;
  state.player.fireCooldown = 10_000;
  const values = [5];
  const streams = {
    nextUint32(name) {
      assert.equal(name, "enemy_behavior");
      if (values.length === 0) throw new Error("unexpected random draw");
      return values.shift();
    }
  };
  const enemy = spawnCanonicalEnemy(
    state,
    "purple",
    state.player.x,
    state.player.y - 100 * POSITION_UNITS_PER_PIXEL,
    {
      vx: 0,
      vy: 0,
      driftPower: 0,
      shootTimer: 1,
      warnTimer: 0,
      volleySeed: 0
    }
  );

  stepSimulation(state, { x: 0, y: 0, buttons: 0 }, streams);
  assert.equal(enemy.warnTimer, 16);
  assert.equal(state.enemyProjectiles.length, 0);
  for (let tick = 0; tick < 16; tick++) {
    stepSimulation(state, { x: 0, y: 0, buttons: 0 }, streams);
  }

  assert.deepEqual(state.enemyProjectiles, [{
    id: 2,
    kind: "purple",
    x: state.player.x,
    y: state.player.y - 88 * POSITION_UNITS_PER_PIXEL,
    vx: 0,
    vy: 3_604,
    angle: 0,
    life: 180,
    damage: 1,
    realm: 0
  }]);
  assert.equal(enemy.warnTimer, 0);
  assert.equal(enemy.shootTimer, 103);
  assert.equal(values.length, 0);
  assert.doesNotThrow(() => serializeCanonicalState(state));
});

test("enemy projectiles advance, damage the matching realm, and become terminal authority", () => {
  const state = createSimulationState(ticket({ maxTicks: 20 }));
  state.player.hp = 1;
  state.player.fireCooldown = 10_000;
  state.enemyProjectiles.push({
    id: state.nextEntityId++,
    kind: "purple",
    x: state.player.x,
    y: state.player.y - 12 * POSITION_UNITS_PER_PIXEL,
    vx: 0,
    vy: 3 * POSITION_UNITS_PER_PIXEL,
    angle: 0,
    life: 2,
    damage: 1,
    realm: 0
  });

  stepSimulation(state, { x: 0, y: 0, buttons: 0 });
  assert.equal(state.player.hp, 0);
  assert.equal(state.stats.damageTaken, 1);
  assert.equal(state.terminal, true);
  assert.equal(state.terminalReason, "player_destroyed");
  assert.equal(state.enemyProjectiles.length, 0);
});

test("queued purple enemies initialize drift and fire cadence from the behavior stream", () => {
  const state = createSimulationState(ticket({ maxTicks: 20 }));
  const values = [1_024, 1, 39, 5, 2];
  const streams = {
    nextUint32(name) {
      assert.equal(name, "enemy_behavior");
      if (values.length === 0) throw new Error("unexpected random draw");
      return values.shift();
    }
  };

  const enemy = spawnCanonicalEnemy(state, "purple", 100_000, -20_000, {
    vy: 1_100,
    motion: "drift"
  }, streams);
  assert.deepEqual({
    driftAngle: enemy.driftAngle,
    driftDir: enemy.driftDir,
    driftPower: enemy.driftPower,
    shootTimer: enemy.shootTimer,
    warnTimer: enemy.warnTimer,
    volleySeed: enemy.volleySeed
  }, {
    driftAngle: 1_024,
    driftDir: 1,
    driftPower: 100,
    shootTimer: 67,
    warnTimer: 0,
    volleySeed: 2
  });
  assert.equal(values.length, 0);
});

test("purple drift and player tracking remain deterministic integer motion", () => {
  const state = createSimulationState(ticket({ maxTicks: 20 }));
  state.player.fireCooldown = 10_000;
  const values = [0xffffffff];
  const streams = {
    nextUint32(name) {
      assert.equal(name, "enemy_behavior");
      if (values.length === 0) throw new Error("unexpected random draw");
      return values.shift();
    }
  };
  const enemy = spawnCanonicalEnemy(state, "purple", 100_000, -20_000, {
    vx: 0,
    vy: 1_100,
    driftAngle: 1_024,
    driftDir: 1,
    driftPower: 100,
    shootTimer: 100,
    warnTimer: 0,
    volleySeed: 0
  });

  stepSimulation(state, { x: 0, y: 0, buttons: 0 }, streams);
  assert.deepEqual({
    x: enemy.x,
    y: enemy.y,
    driftAngle: enemy.driftAngle,
    driftDir: enemy.driftDir,
    shootTimer: enemy.shootTimer,
    warnTimer: enemy.warnTimer
  }, {
    x: 100_428,
    y: -18_900,
    driftAngle: 1_047,
    driftDir: 1,
    shootTimer: 99,
    warnTimer: 0
  });
  assert.equal(values.length, 0);
});

test("phantom telegraph deterministically transitions into the ghost realm", () => {
  const state = createSimulationState(ticket({ maxTicks: 40 }));
  state.player.fireCooldown = 10_000;
  const values = [0xffffffff, 0, 0];
  const streams = {
    nextUint32(name) {
      assert.equal(name, "enemy_behavior");
      if (values.length === 0) throw new Error("unexpected random draw");
      return values.shift();
    }
  };
  const enemy = spawnCanonicalEnemy(state, "phantom", 100_000, -20_000, {
    vx: 0,
    vy: 1_600,
    driftPower: 0,
    phaseOffset: 0,
    stateMode: "physical",
    cycleTimer: 1,
    telegraphTimer: 0,
    fireTimer: 100
  });

  stepSimulation(state, { x: 0, y: 0, buttons: 0 }, streams);
  assert.deepEqual({
    stateMode: enemy.stateMode,
    realm: enemy.realm,
    cycleTimer: enemy.cycleTimer,
    telegraphTimer: enemy.telegraphTimer,
    fireTimer: enemy.fireTimer,
    y: enemy.y
  }, {
    stateMode: "physical",
    realm: 0,
    cycleTimer: 0,
    telegraphTimer: 20,
    fireTimer: 99,
    y: -18_400
  });

  for (let tick = 0; tick < 20; tick++) {
    stepSimulation(state, { x: 0, y: 0, buttons: 0 }, streams);
  }
  assert.deepEqual({
    stateMode: enemy.stateMode,
    realm: enemy.realm,
    cycleTimer: enemy.cycleTimer,
    telegraphTimer: enemy.telegraphTimer,
    fireTimer: enemy.fireTimer,
    motionTick: enemy.motionTick,
    y: enemy.y
  }, {
    stateMode: "ghost",
    realm: 1,
    cycleTimer: 66,
    telegraphTimer: 0,
    fireTimer: 67,
    motionTick: 21,
    y: -800
  });
  assert.equal(values.length, 0);
  assert.doesNotThrow(() => serializeCanonicalState(state));
});

test("queued phantoms initialize cycle and fire state from the behavior stream", () => {
  const state = createSimulationState(ticket({ maxTicks: 20 }));
  const values = [1_024, 1, 39, 5, 7];
  const streams = {
    nextUint32(name) {
      assert.equal(name, "enemy_behavior");
      if (values.length === 0) throw new Error("unexpected random draw");
      return values.shift();
    }
  };

  const enemy = spawnCanonicalEnemy(state, "phantom", 100_000, -20_000, {
    vy: 1_600,
    motion: "phantom"
  }, streams);
  assert.deepEqual({
    stateMode: enemy.stateMode,
    realm: enemy.realm,
    phaseOffset: enemy.phaseOffset,
    driftDir: enemy.driftDir,
    driftPower: enemy.driftPower,
    cycleTimer: enemy.cycleTimer,
    telegraphTimer: enemy.telegraphTimer,
    fireTimer: enemy.fireTimer
  }, {
    stateMode: "physical",
    realm: 0,
    phaseOffset: 1_024,
    driftDir: 1,
    driftPower: 100,
    cycleTimer: 5,
    telegraphTimer: 0,
    fireTimer: 31
  });
  assert.equal(values.length, 0);
});

test("physical phantoms fire realm-bound canonical projectiles", () => {
  const state = createSimulationState(ticket({ maxTicks: 20 }));
  state.phase = 2;
  state.player.fireCooldown = 10_000;
  const values = [0xffffffff, 0];
  const streams = {
    nextUint32(name) {
      assert.equal(name, "enemy_behavior");
      if (values.length === 0) throw new Error("unexpected random draw");
      return values.shift();
    }
  };
  const enemy = spawnCanonicalEnemy(
    state,
    "phantom",
    state.player.x,
    state.player.y - 100 * POSITION_UNITS_PER_PIXEL,
    {
      vx: 0,
      vy: 0,
      driftPower: 0,
      phaseOffset: 0,
      stateMode: "physical",
      cycleTimer: 100,
      telegraphTimer: 0,
      fireTimer: 1
    }
  );

  stepSimulation(state, { x: 0, y: 0, buttons: 0 }, streams);
  assert.deepEqual(state.enemyProjectiles, [{
    id: 2,
    kind: "phantomShot",
    x: state.player.x,
    y: state.player.y - 90 * POSITION_UNITS_PER_PIXEL,
    vx: 0,
    vy: 2_724,
    angle: 0,
    life: 180,
    damage: 1,
    realm: 0
  }]);
  assert.equal(enemy.fireTimer, 100);
  assert.equal(enemy.cycleTimer, 99);
  assert.equal(values.length, 0);
});

test("phantom telegraphs are intangible to player projectiles", () => {
  const state = createSimulationState(ticket({ maxTicks: 20 }));
  state.player.fireCooldown = 10_000;
  const enemy = spawnCanonicalEnemy(state, "phantom", state.player.x, state.player.y - 50 * POSITION_UNITS_PER_PIXEL, {
    vx: 0,
    vy: 0,
    driftPower: 0,
    phaseOffset: 0,
    stateMode: "physical",
    cycleTimer: 0,
    telegraphTimer: 10,
    fireTimer: 100
  });
  state.playerProjectiles.push({
    id: state.nextEntityId++,
    x: enemy.x,
    y: enemy.y,
    vx: 0,
    vy: -9 * POSITION_UNITS_PER_PIXEL,
    angle: 0,
    life: 10,
    damage: 3,
    realm: 0
  });
  const streams = {
    nextUint32() {
      throw new Error("telegraph tick must not draw randomness");
    }
  };

  stepSimulation(state, { x: 0, y: 0, buttons: 0 }, streams);
  assert.equal(enemy.telegraphTimer, 9);
  assert.equal(enemy.hp, 3);
  assert.equal(state.enemies.length, 1);
  assert.equal(state.playerProjectiles.length, 1);
  assert.equal(state.stats.kills, 0);
});

test("phantom telegraphs cannot damage the player by contact", () => {
  const state = createSimulationState(ticket({ maxTicks: 20 }));
  state.player.fireCooldown = 10_000;
  const enemy = spawnCanonicalEnemy(state, "phantom", state.player.x, state.player.y, {
    vx: 0,
    vy: 0,
    driftPower: 0,
    phaseOffset: 0,
    stateMode: "physical",
    cycleTimer: 0,
    telegraphTimer: 10,
    fireTimer: 100
  });
  const streams = {
    nextUint32() {
      throw new Error("telegraph tick must not draw randomness");
    }
  };

  stepSimulation(state, { x: 0, y: 0, buttons: 0 }, streams);
  assert.equal(enemy.telegraphTimer, 9);
  assert.equal(state.player.hp, 5);
  assert.equal(state.stats.damageTaken, 0);
  assert.equal(state.terminal, false);
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
