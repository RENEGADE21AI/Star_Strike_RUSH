"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  ENERGY_UNITS_PER_POINT,
  GAME_HEIGHT_UNITS,
  GAME_WIDTH_UNITS,
  POSITION_UNITS_PER_PIXEL,
  SIMULATION_REVISION
} = require("../shared/verified-run/constants");
const { canonicalPhaseDuration } = require("../shared/verified-run/director");
const { createSimulationState, serializeCanonicalState } = require("../shared/verified-run/simulation-state");
const {
  canonicalBossModeForPhase,
  spawnCanonicalBoss,
  spawnCanonicalHazard,
  stepSimulation,
  tickCanonicalHazardEvent,
  updateCanonicalBoss,
  updateCanonicalHazards
} = require("../shared/verified-run/simulation-step");

function ticket(overrides = {}) {
  return {
    runId: "run_encounters_001",
    rootSeed: "00112233445566778899aabbccddeeff",
    simRevision: SIMULATION_REVISION,
    rulesRevision: "rules-v1",
    contentRevision: "content-v1",
    buildSha: "b".repeat(40),
    maxTicks: 1_296_000,
    ...overrides
  };
}

function zeroStreams() {
  return { nextUint32: () => 0 };
}

function highBossStreams() {
  return {
    nextUint32(name) {
      return name === "boss_behavior" ? 0xffffffff : 0;
    }
  };
}

test("canonical state starts with the live debris-event and boss-recovery clocks", () => {
  const state = createSimulationState(ticket());
  assert.equal(state.director.hazardEventTimer, 1_200);
  assert.equal(state.director.hazardWarningTimer, 0);
  assert.equal(state.director.bossRecovery, 0);
});

test("a seeded phase-eight debris warning becomes the exact five-object hazard field", () => {
  const state = createSimulationState(ticket());
  state.phase = 8;
  state.director.hazardEventTimer = 1;

  tickCanonicalHazardEvent(state, zeroStreams());
  assert.equal(state.director.hazardWarningTimer, 78);
  assert.equal(state.director.hazardEventTimer, 1_500);
  for (let tick = 0; tick < 78; tick++) tickCanonicalHazardEvent(state, zeroStreams());

  assert.deepEqual(
    state.hazards.map(({ kind, x, y, rareEvent }) => ({ kind, x, y, rareEvent })),
    [
      { kind: "iron_asteroid", x: 49_664, y: -43_008, rareEvent: true },
      { kind: "iron_asteroid", x: 157_184, y: -96_256, rareEvent: true },
      { kind: "iron_asteroid", x: 264_704, y: -149_504, rareEvent: true },
      { kind: "iron_asteroid", x: 49_664, y: -202_752, rareEvent: true },
      { kind: "iron_asteroid", x: 157_184, y: -256_000, rareEvent: true }
    ]
  );
  assert.doesNotThrow(() => serializeCanonicalState(state));
});

test("asteroids damage on artwork-aligned contact while energy mines drain only energy", () => {
  const asteroidState = createSimulationState(ticket());
  asteroidState.player.fireCooldown = 10_000;
  spawnCanonicalHazard(asteroidState, "rock_asteroid", asteroidState.player.x, asteroidState.player.y, {
    vx: 0,
    vy: 0,
    angle: 0
  }, zeroStreams());
  stepSimulation(asteroidState, { x: 0, y: 0, buttons: 0 });
  assert.equal(asteroidState.player.hp, 4);
  assert.equal(asteroidState.stats.damageTaken, 1);
  assert.equal(asteroidState.hazards[0].hp, 10);

  const mineState = createSimulationState(ticket());
  mineState.player.fireCooldown = 10_000;
  spawnCanonicalHazard(mineState, "energy_mine", mineState.player.x, mineState.player.y, {
    vx: 0,
    vy: 0,
    armTimer: 0,
    drain: 24 * ENERGY_UNITS_PER_POINT
  }, zeroStreams());
  stepSimulation(mineState, { x: 0, y: 0, buttons: 0 });
  assert.equal(mineState.player.hp, 5);
  assert.equal(mineState.player.energy, 76 * ENERGY_UNITS_PER_POINT);
  assert.equal(mineState.hazards.length, 0);
});

test("gravity-well warning expiry applies deterministic integer pull and energy drain", () => {
  const state = createSimulationState(ticket());
  state.player.fireCooldown = 10_000;
  spawnCanonicalHazard(state, "gravity_well", state.player.x + 40 * POSITION_UNITS_PER_PIXEL, state.player.y, {
    radius: 80 * POSITION_UNITS_PER_PIXEL,
    warn: 1,
    life: 20,
    strength: 120,
    drain: 2 * ENERGY_UNITS_PER_POINT
  }, zeroStreams());

  updateCanonicalHazards(state);
  assert.equal(state.player.vx, 0);
  updateCanonicalHazards(state);
  assert.equal(state.player.vx, 60);
  assert.equal(state.player.energy, 98 * ENERGY_UNITS_PER_POINT);
});

test("normal random-run phases select the complete live boss rotation", () => {
  assert.deepEqual(
    [4, 8, 12, 16, 20, 24, 28, 32, 36, 40].map(canonicalBossModeForPhase),
    [
      "standard",
      "wraith",
      "debris_warden",
      "mothership",
      "siphon_core",
      "hive_breaker",
      "rail_tyrant",
      "gravity_well",
      "debris_warden",
      "mothership"
    ]
  );
  assert.equal(canonicalBossModeForPhase(3), null);
});

test("every boss spawns with its live phase-scaled health and integer entry procedure", () => {
  const cases = [
    [4, "standard", 152, -100, 92],
    [8, "wraith", 142, -120, 94],
    [12, "debris_warden", 292, -112, 90],
    [16, "mothership", 374, -112, 92],
    [20, "siphon_core", 440, -112, 90],
    [24, "hive_breaker", 508, -112, 92],
    [28, "rail_tyrant", 576, -112, 90],
    [32, "gravity_well", 644, -112, 90]
  ];

  for (const [phase, mode, maxHp, yPixels, targetYPixels] of cases) {
    const state = createSimulationState(ticket());
    state.phase = phase;
    const boss = spawnCanonicalBoss(state, mode, zeroStreams());
    assert.deepEqual(
      { mode: boss.mode, hp: boss.hp, maxHp: boss.maxHp, y: boss.y, targetY: boss.targetY, entered: boss.entered, combatActive: boss.combatActive },
      {
        mode,
        hp: maxHp,
        maxHp,
        y: yPixels * POSITION_UNITS_PER_PIXEL,
        targetY: targetYPixels * POSITION_UNITS_PER_PIXEL,
        entered: false,
        combatActive: false
      }
    );
    assert.doesNotThrow(() => serializeCanonicalState(state));
  }
});

test("all eight bosses resolve their signature attacks as authoritative entities", () => {
  const cases = [
    [4, "standard", "spread", { projectiles: 5 }],
    [8, "wraith", null, { projectiles: 9 }],
    [12, "debris_warden", "wall", { hazards: 5, hazardKind: "boss_wall" }],
    [16, "mothership", "escort", { enemies: 3 }],
    [20, "siphon_core", "energy_mines", { hazards: 2, hazardKind: "energy_mine" }],
    [24, "hive_breaker", "shard_burst", { enemies: 4 }],
    [28, "rail_tyrant", "triple", { hazards: 2, hazardKind: "enemy_beam" }],
    [32, "gravity_well", "well", { hazards: 1, hazardKind: "gravity_well" }]
  ];

  for (const [phase, mode, attack, expected] of cases) {
    const state = createSimulationState(ticket());
    state.phase = phase;
    state.player.fireCooldown = 10_000;
    const boss = spawnCanonicalBoss(state, mode, mode === "wraith" ? highBossStreams() : zeroStreams());
    boss.y = boss.targetY;
    boss.entered = true;
    boss.combatActive = true;
    if (mode === "wraith") boss.attackTimer = 1;
    else {
      boss.pending = attack;
      boss.warn = 1;
      boss.warnMax = 1;
    }

    updateCanonicalBoss(state, mode === "wraith" ? highBossStreams() : zeroStreams());
    if (expected.projectiles != null) assert.equal(state.enemyProjectiles.length, expected.projectiles, mode);
    if (expected.enemies != null) assert.equal(state.enemies.length, expected.enemies, mode);
    if (expected.hazards != null) {
      assert.equal(state.hazards.length, expected.hazards, mode);
      assert.equal(state.hazards.every((hazard) => hazard.kind === expected.hazardKind), true, mode);
    }
    assert.doesNotThrow(() => serializeCanonicalState(state), mode);
  }
});

test("boss projectiles are born after projectile motion and do not advance on their creation tick", () => {
  const state = createSimulationState(ticket({ maxTicks: 20 }));
  state.phase = 8;
  state.player.fireCooldown = 10_000;
  const boss = spawnCanonicalBoss(state, "wraith", highBossStreams());
  boss.y = boss.targetY;
  boss.entered = true;
  boss.combatActive = true;
  boss.attackTimer = 1;

  stepSimulation(state, { x: 0, y: 0, buttons: 0 }, highBossStreams());

  assert.equal(state.enemyProjectiles.length, 9);
  assert.equal(state.enemyProjectiles[0].x, boss.x);
  assert.equal(state.enemyProjectiles[0].y, boss.y + 22 * POSITION_UNITS_PER_PIXEL);
});

test("phase four starts a boss, freezes the wave clock, and boss death grants only server-derived credit", () => {
  const state = createSimulationState(ticket());
  state.phase = 3;
  state.director.phaseTick = canonicalPhaseDuration(3) - 1;
  state.player.fireCooldown = 10_000;
  stepSimulation(state, { x: 0, y: 0, buttons: 0 }, zeroStreams());
  assert.equal(state.phase, 4);
  assert.equal(state.boss.mode, "standard");

  const frozenPhaseTick = state.director.phaseTick;
  state.boss.y = state.boss.targetY;
  state.boss.entered = true;
  state.boss.combatActive = true;
  state.boss.hp = 1;
  state.playerProjectiles.push({
    id: state.nextEntityId++,
    x: state.boss.x,
    y: state.boss.y + 9 * POSITION_UNITS_PER_PIXEL,
    vx: 0,
    vy: -9 * POSITION_UNITS_PER_PIXEL,
    angle: 0,
    life: 10,
    damage: 1,
    realm: 0
  });
  stepSimulation(state, { x: 0, y: 0, buttons: 0 }, zeroStreams());

  assert.equal(state.boss, null);
  assert.equal(state.stats.bosses, 1);
  assert.equal(state.score, 1_000);
  assert.equal(state.director.shotsHit, 1);
  assert.equal(state.director.bossRecovery, 120);
  assert.equal(state.director.phaseTick, frozenPhaseTick);
  assert.equal(state.enemies.length, 0);
  assert.equal(state.enemyProjectiles.length, 0);
});

test("hazard creation rejects client-invented content", () => {
  const state = createSimulationState(ticket());
  assert.throws(
    () => spawnCanonicalHazard(state, "invented_hazard", GAME_WIDTH_UNITS / 2, GAME_HEIGHT_UNITS / 2, {}, zeroStreams()),
    /hazard kind/
  );
});
