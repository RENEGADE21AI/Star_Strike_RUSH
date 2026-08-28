"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  ENERGY_UNITS_PER_POINT,
  POSITION_UNITS_PER_PIXEL,
  SIMULATION_REVISION
} = require("../shared/verified-run/constants");
const { createSimulationState, serializeCanonicalState } = require("../shared/verified-run/simulation-state");
const {
  collectCanonicalPowerup,
  spawnCanonicalBoss,
  spawnCanonicalEnemy,
  spawnCanonicalPowerup,
  stepSimulation
} = require("../shared/verified-run/simulation-step");

function ticket(overrides = {}) {
  return {
    runId: "run_powerups_001",
    rootSeed: "00112233445566778899aabbccddeeff",
    simRevision: SIMULATION_REVISION,
    rulesRevision: "rules-v1",
    contentRevision: "content-v1",
    buildSha: "c".repeat(40),
    maxTicks: 1_296_000,
    ...overrides
  };
}

function zeroStreams() {
  return { nextUint32: () => 0 };
}

function projectileAt(state, enemy, options = {}) {
  state.playerProjectiles.push({
    id: state.nextEntityId++,
    x: enemy.x,
    y: enemy.y + 9 * POSITION_UNITS_PER_PIXEL,
    vx: 0,
    vy: -9 * POSITION_UNITS_PER_PIXEL,
    angle: 0,
    life: 10,
    damage: options.damage ?? 1,
    pierce: options.pierce ?? 0,
    realm: 0,
    kind: options.kind || "player"
  });
}

test("canonical state owns drop drought, every combat pickup timer, and wingmen", () => {
  const state = createSimulationState(ticket());
  assert.deepEqual(
    {
      killsSinceDrop: state.director.killsSinceDrop,
      ticksSinceDrop: state.director.ticksSinceDrop,
      dropCooldown: state.director.dropCooldown,
      intensity: state.director.intensity,
      spread: state.player.spread,
      rapid: state.player.rapid,
      overcharge: state.player.overcharge,
      phaseShield: state.player.phaseShield,
      magnet: state.player.magnet,
      piercing: state.player.piercing,
      stabilizer: state.player.stabilizer,
      scoreSurge: state.player.scoreSurge,
      wingmen: state.wingmen
    },
    {
      killsSinceDrop: 0,
      ticksSinceDrop: 0,
      dropCooldown: 0,
      intensity: "normal",
      spread: 0,
      rapid: 0,
      overcharge: 0,
      phaseShield: 0,
      magnet: 0,
      piercing: 0,
      stabilizer: 0,
      scoreSurge: 0,
      wingmen: []
    }
  );
});

test("the guaranteed drought drop is created only from the canonical loot stream", () => {
  const state = createSimulationState(ticket({ maxTicks: 20 }));
  state.player.fireCooldown = 10_000;
  state.director.killsSinceDrop = 12;
  const enemy = spawnCanonicalEnemy(state, "orange", 100_000, 100_000, { vx: 0, vy: 0, turnTimer: 100 });
  projectileAt(state, enemy);

  stepSimulation(state, { x: 0, y: 0, buttons: 0 }, zeroStreams());

  assert.equal(state.stats.kills, 1);
  assert.equal(state.powerups.length, 1);
  assert.deepEqual(
    { type: state.powerups[0].type, x: state.powerups[0].x, y: state.powerups[0].y },
    { type: "spread", x: 99_592, y: 100_000 }
  );
  assert.equal(state.director.killsSinceDrop, 0);
  assert.equal(state.director.ticksSinceDrop, 0);
  assert.equal(state.director.dropCooldown, 240);
});

test("every live pickup applies its canonical effect and increments pickup statistics", () => {
  const cases = [
    ["spread", (state) => assert.equal(state.player.spread, 900)],
    ["rapid", (state) => assert.equal(state.player.rapid, 900)],
    ["repair", (state) => assert.equal(state.player.hp, 4)],
    ["wingman", (state) => assert.deepEqual(state.wingmen.map((wingman) => wingman.side), [-1])],
    ["dual", (state) => assert.deepEqual(state.wingmen.map((wingman) => wingman.side), [-1, 1])],
    ["energy_cell", (state) => assert.equal(state.player.energy, 68 * ENERGY_UNITS_PER_POINT)],
    ["overcharge", (state) => assert.equal(state.player.overcharge, 780)],
    ["phase_shield", (state) => assert.equal(state.player.phaseShield, 1)],
    ["magnet", (state) => assert.equal(state.player.magnet, 720)],
    ["piercing", (state) => assert.equal(state.player.piercing, 660)],
    ["ion_burst", (state) => {
      assert.equal(state.enemies.length, 0);
      assert.equal(state.enemyProjectiles.length, 0);
      assert.equal(state.stats.kills, 1);
      assert.equal(state.score, 30);
    }],
    ["stabilizer", (state) => assert.equal(state.player.stabilizer, 660)],
    ["score_surge", (state) => assert.equal(state.player.scoreSurge, 600)]
  ];

  for (const [type, verify] of cases) {
    const state = createSimulationState(ticket({ runId: `run_powerup_${type}` }));
    state.player.hp = 3;
    state.player.energy = 20 * ENERGY_UNITS_PER_POINT;
    if (type === "ion_burst") {
      spawnCanonicalEnemy(state, "red", state.player.x, state.player.y - 40 * POSITION_UNITS_PER_PIXEL, { vx: 0, vy: 0, driftPower: 0 });
      state.enemyProjectiles.push({
        id: state.nextEntityId++, kind: "enemy", x: state.player.x, y: state.player.y - 30 * POSITION_UNITS_PER_PIXEL,
        vx: 0, vy: 0, angle: 0, life: 20, damage: 1, drain: 0, realm: 0
      });
    }
    const powerup = spawnCanonicalPowerup(state, type, state.player.x, state.player.y);
    collectCanonicalPowerup(state, powerup, zeroStreams());
    assert.equal(state.stats.powerups, 1, type);
    verify(state);
    assert.doesNotThrow(() => serializeCanonicalState(state), type);
  }
});

test("pickup geometry collects a falling repair without a trusted client event", () => {
  const state = createSimulationState(ticket({ maxTicks: 20 }));
  state.player.hp = 3;
  state.player.fireCooldown = 10_000;
  spawnCanonicalPowerup(state, "repair", state.player.x, state.player.y, { vy: 0 });

  stepSimulation(state, { x: 0, y: 0, buttons: 0 });

  assert.equal(state.player.hp, 4);
  assert.equal(state.stats.powerups, 1);
  assert.equal(state.powerups.length, 0);
});

test("spread, rapid fire, and piercing alter canonical projectile behavior", () => {
  const state = createSimulationState(ticket({ maxTicks: 30 }));
  collectCanonicalPowerup(state, spawnCanonicalPowerup(state, "spread", 0, 0), zeroStreams());
  collectCanonicalPowerup(state, spawnCanonicalPowerup(state, "rapid", 0, 0), zeroStreams());
  collectCanonicalPowerup(state, spawnCanonicalPowerup(state, "piercing", 0, 0), zeroStreams());

  stepSimulation(state, { x: 0, y: 0, buttons: 0 });
  assert.equal(state.playerProjectiles.length, 3);
  assert.deepEqual(state.playerProjectiles.map((projectile) => projectile.pierce), [0, 1, 0]);
  assert.equal(state.player.fireCooldown, 10);

  const targetState = createSimulationState(ticket({ runId: "run_pierce", maxTicks: 20 }));
  targetState.player.fireCooldown = 10_000;
  const first = spawnCanonicalEnemy(targetState, "orange", 100_000, 100_000, { vx: 0, vy: 0, turnTimer: 100 });
  spawnCanonicalEnemy(targetState, "orange", 100_000, 100_000, { vx: 0, vy: 0, turnTimer: 100 });
  projectileAt(targetState, first, { pierce: 1 });
  stepSimulation(targetState, { x: 0, y: 0, buttons: 0 }, zeroStreams());
  assert.equal(targetState.enemies.length, 0);
  assert.equal(targetState.stats.kills, 2);
  assert.equal(targetState.playerProjectiles.length, 0);
});

test("wingmen cannot fire while arriving and begin on the live combat cadence", () => {
  const state = createSimulationState(ticket({ runId: "run_wingman_arrival", maxTicks: 80 }));
  state.player.fireCooldown = 10_000;
  collectCanonicalPowerup(state, spawnCanonicalPowerup(state, "wingman", 0, 0), zeroStreams());

  for (let tick = 0; tick < 34; tick++) stepSimulation(state, { x: 0, y: 0, buttons: 0 }, zeroStreams());
  assert.equal(state.wingmen[0].phase, "active");
  assert.equal(state.playerProjectiles.length, 0);

  for (let tick = 0; tick < 10; tick++) stepSimulation(state, { x: 0, y: 0, buttons: 0 }, zeroStreams());
  assert.equal(state.playerProjectiles.filter((projectile) => projectile.kind === "wingman").length, 1);
});

test("wingmen authoritatively intercept hostile projectiles and enemies", () => {
  const projectileState = createSimulationState(ticket({ runId: "run_wingman_projectile", maxTicks: 20 }));
  projectileState.player.fireCooldown = 10_000;
  collectCanonicalPowerup(projectileState, spawnCanonicalPowerup(projectileState, "wingman", 0, 0), zeroStreams());
  const projectileWingman = projectileState.wingmen[0];
  projectileWingman.phase = "active";
  projectileWingman.arrivalElapsed = projectileWingman.arrivalDuration;
  projectileWingman.x = projectileState.player.x - 42 * POSITION_UNITS_PER_PIXEL;
  projectileWingman.y = projectileState.player.y + 6 * POSITION_UNITS_PER_PIXEL;
  projectileState.enemyProjectiles.push({
    id: projectileState.nextEntityId++, kind: "enemy", x: projectileWingman.x, y: projectileWingman.y,
    vx: 0, vy: 0, angle: 0, life: 20, damage: 1, drain: 0, realm: 0
  });
  stepSimulation(projectileState, { x: 0, y: 0, buttons: 0 }, zeroStreams());
  assert.equal(projectileState.enemyProjectiles.length, 0);
  assert.equal(projectileState.wingmen.length, 0);
  assert.equal(projectileState.player.hp, 5);

  const enemyState = createSimulationState(ticket({ runId: "run_wingman_enemy", maxTicks: 20 }));
  enemyState.player.fireCooldown = 10_000;
  collectCanonicalPowerup(enemyState, spawnCanonicalPowerup(enemyState, "wingman", 0, 0), zeroStreams());
  const enemyWingman = enemyState.wingmen[0];
  enemyWingman.phase = "active";
  enemyWingman.arrivalElapsed = enemyWingman.arrivalDuration;
  enemyWingman.x = enemyState.player.x - 42 * POSITION_UNITS_PER_PIXEL;
  enemyWingman.y = enemyState.player.y + 6 * POSITION_UNITS_PER_PIXEL;
  spawnCanonicalEnemy(enemyState, "orange", enemyWingman.x, enemyWingman.y, { vx: 0, vy: 0, turnTimer: 100 });
  stepSimulation(enemyState, { x: 0, y: 0, buttons: 0 }, zeroStreams());
  assert.equal(enemyState.enemies.length, 0);
  assert.equal(enemyState.wingmen.length, 0);
  assert.equal(enemyState.stats.kills, 0);
  assert.equal(enemyState.score, 0);
});

test("phase shield blocks one hit and stabilizer halves all canonical energy drain", () => {
  const shieldState = createSimulationState(ticket({ maxTicks: 20 }));
  shieldState.player.fireCooldown = 10_000;
  collectCanonicalPowerup(shieldState, spawnCanonicalPowerup(shieldState, "phase_shield", 0, 0), zeroStreams());
  spawnCanonicalEnemy(shieldState, "red", shieldState.player.x, shieldState.player.y, { vx: 0, vy: 0, driftPower: 0 });
  stepSimulation(shieldState, { x: 0, y: 0, buttons: 0 });
  assert.equal(shieldState.player.hp, 5);
  assert.equal(shieldState.player.phaseShield, 0);
  assert.equal(shieldState.player.invulnerability, 42);

  const drainState = createSimulationState(ticket({ runId: "run_stabilizer", maxTicks: 20 }));
  drainState.player.fireCooldown = 10_000;
  collectCanonicalPowerup(drainState, spawnCanonicalPowerup(drainState, "stabilizer", 0, 0), zeroStreams());
  drainState.enemyProjectiles.push({
    id: drainState.nextEntityId++, kind: "drainShot", x: drainState.player.x, y: drainState.player.y,
    vx: 0, vy: 0, angle: 0, life: 20, damage: 0, drain: 22 * ENERGY_UNITS_PER_POINT, realm: 0
  });
  stepSimulation(drainState, { x: 0, y: 0, buttons: 0 });
  assert.equal(drainState.player.energy, 89 * ENERGY_UNITS_PER_POINT);
});

test("score surge multiplies kill score but never boss flat score", () => {
  const state = createSimulationState(ticket({ maxTicks: 20 }));
  state.player.fireCooldown = 10_000;
  collectCanonicalPowerup(state, spawnCanonicalPowerup(state, "score_surge", 0, 0), zeroStreams());
  const enemy = spawnCanonicalEnemy(state, "orange", 100_000, 100_000, { vx: 0, vy: 0, turnTimer: 100 });
  projectileAt(state, enemy);
  stepSimulation(state, { x: 0, y: 0, buttons: 0 }, zeroStreams());
  assert.equal(state.score, 30);
});

test("boss defeat creates deterministic canonical reward drops", () => {
  const state = createSimulationState(ticket({ maxTicks: 20 }));
  state.phase = 4;
  state.player.fireCooldown = 10_000;
  const boss = spawnCanonicalBoss(state, "standard", zeroStreams());
  boss.y = boss.targetY;
  boss.entered = true;
  boss.combatActive = true;
  boss.hp = 1;
  projectileAt(state, boss);

  stepSimulation(state, { x: 0, y: 0, buttons: 0 }, zeroStreams());

  assert.equal(state.stats.bosses, 1);
  assert.deepEqual(state.powerups.map(({ type }) => type), ["spread", "spread"]);
  assert.equal(state.director.killsSinceDrop, 0);
  assert.equal(state.director.ticksSinceDrop, 0);
  assert.equal(state.director.dropCooldown, 300);
});

test("powerup creation rejects client-invented pickup types", () => {
  const state = createSimulationState(ticket());
  assert.throws(() => spawnCanonicalPowerup(state, "god_mode", 0, 0), /powerup type/);
});
