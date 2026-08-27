"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const { POSITION_UNITS_PER_PIXEL, SIMULATION_REVISION } = require("../shared/verified-run/constants");
const { createRunRandomStreams } = require("../shared/verified-run/random");
const { createSimulationState } = require("../shared/verified-run/simulation-state");
const { tickCanonicalDirector } = require("../shared/verified-run/director");
const { stepSimulation } = require("../shared/verified-run/simulation-step");

function ticket(overrides = {}) {
  return {
    runId: "run_director_golden",
    rootSeed: "00112233445566778899aabbccddeeff",
    simRevision: SIMULATION_REVISION,
    rulesRevision: "rules-v1",
    contentRevision: "content-v1",
    buildSha: "b".repeat(40),
    maxTicks: 1_296_000,
    ...overrides
  };
}

async function directorFixture(overrides = {}) {
  const runTicket = ticket(overrides);
  return {
    state: createSimulationState(runTicket),
    streams: await createRunRandomStreams(runTicket.rootSeed, runTicket.simRevision)
  };
}

test("opening pacing schedules a red-only first wave at tick 180", async () => {
  const { state, streams } = await directorFixture();
  const due = [];
  for (let tick = 1; tick <= 179; tick++) due.push(...tickCanonicalDirector(state, streams));
  assert.deepEqual(due, []);
  assert.equal(state.phase, 1);
  assert.equal(state.director.phaseTick, 179);

  due.push(...tickCanonicalDirector(state, streams));
  assert.deepEqual(due, [{
    type: "red",
    x: 84_480,
    y: -28 * 1024,
    delay: 0,
    motion: "drift",
    lane: 0
  }]);
  assert.equal(state.director.waveTick, 0);
  assert.equal(state.pendingSpawns.length, 2);
  assert.equal(state.pendingSpawns.every((spawn) => spawn.type === "red"), true);
});

test("the server seed can select the live five-ship red V as the first formation", async () => {
  const { state, streams } = await directorFixture({ rootSeed: "00000000000000000000000000000002" });
  let due = [];
  for (let tick = 1; tick <= 180; tick++) due = due.concat(tickCanonicalDirector(state, streams));

  assert.equal(state.director.lastTemplate, "redV");
  assert.deepEqual(
    due.concat(state.pendingSpawns).map(({ type, x, y, delay, motion }) => ({ type, x, y, delay, motion })),
    [
      { type: "red", x: 72_192, y: -26_624, delay: 0, motion: "drift" },
      { type: "red", x: 137_728, y: -40_960, delay: 8, motion: "drift" },
      { type: "red", x: 192_000, y: -53_248, delay: 16, motion: "drift" },
      { type: "red", x: 246_272, y: -40_960, delay: 24, motion: "drift" },
      { type: "red", x: 311_808, y: -26_624, delay: 32, motion: "drift" }
    ]
  );
});

test("late phase one unlocks the live red wall and avoids repeating the prior template", async () => {
  const { state, streams } = await directorFixture({ rootSeed: "00000000000000000000000000000002" });
  state.director.phaseTick = 1700;
  state.director.waveTick = 155;
  state.director.waveIndex = 3;
  state.director.lastTemplate = "breather";

  const due = tickCanonicalDirector(state, streams);
  assert.equal(state.director.lastTemplate, "redWall");
  assert.deepEqual(
    due.concat(state.pendingSpawns).map(({ type, x, y, delay }) => ({ type, x, y, delay })),
    [
      { type: "red", x: 55_808, y: -30_720, delay: 0 },
      { type: "red", x: 107_008, y: -30_720, delay: 8 },
      { type: "red", x: 192_000, y: -43_008, delay: 16 },
      { type: "red", x: 237_056, y: -30_720, delay: 24 },
      { type: "red", x: 276_992, y: -30_720, delay: 32 },
      { type: "red", x: 328_192, y: -30_720, delay: 40 }
    ]
  );
});

test("phase two can seed the live orange pair with its exact motion contract", async () => {
  const { state, streams } = await directorFixture({ rootSeed: "00000000000000000000000000000002" });
  state.phase = 2;
  state.director.waveTick = 155;

  const due = tickCanonicalDirector(state, streams);
  assert.equal(state.director.lastTemplate, "orangePair");
  assert.deepEqual(
    due.concat(state.pendingSpawns).map(({ type, x, y, delay, motion }) => ({ type, x, y, delay, motion })),
    [
      { type: "orange", x: 70_144, y: -32_768, delay: 0, motion: "zigzag" },
      { type: "red", x: 192_000, y: -45_056, delay: 10, motion: "drift" },
      { type: "red", x: 138_752, y: -28_672, delay: 20, motion: "drift" },
      { type: "orange", x: 313_856, y: -32_768, delay: 30, motion: "snap" }
    ]
  );
});

test("phase one advances only after its complete 3000-tick contract", async () => {
  const { state, streams } = await directorFixture();
  for (let tick = 1; tick < 3000; tick++) tickCanonicalDirector(state, streams);
  assert.equal(state.phase, 1);
  assert.equal(state.director.phaseTick, 2999);

  tickCanonicalDirector(state, streams);
  assert.equal(state.phase, 2);
  assert.equal(state.director.phaseTick, 0);
  assert.equal(state.director.waveTick, 0);
  assert.equal(state.director.waveRest, 18);
});

test("seeded waves reproduce and loot consumption cannot shift their geometry", async () => {
  const first = await directorFixture();
  const second = await directorFixture();
  for (let index = 0; index < 64; index++) second.streams.nextUint32("loot");

  const firstDue = [];
  const secondDue = [];
  for (let tick = 1; tick <= 420; tick++) {
    firstDue.push(...tickCanonicalDirector(first.state, first.streams));
    secondDue.push(...tickCanonicalDirector(second.state, second.streams));
  }
  assert.deepEqual(firstDue, secondDue);
  assert.deepEqual(first.state.director, second.state.director);
  assert.deepEqual(first.state.pendingSpawns, second.state.pendingSpawns);
  assert.ok(firstDue.length >= 6, "two opening formations should have entered by tick 420");
});

test("simulation stepping materializes queued enemies with exact formation timing and seeded drift", async () => {
  const { state, streams } = await directorFixture({ maxTicks: 500 });
  state.player.fireCooldown = 10_000;
  const idle = { x: 0, y: 0, buttons: 0 };

  for (let tick = 1; tick <= 180; tick++) stepSimulation(state, idle, streams);
  assert.equal(state.enemies.length, 1);
  assert.equal(state.pendingSpawns.length, 2);
  assert.deepEqual(
    state.enemies.map(({ type, x, y, motion, motionTick }) => ({ type, x, y, motion, motionTick })),
    [{ type: "red", x: 84_480, y: -28 * POSITION_UNITS_PER_PIXEL, motion: "drift", motionTick: 0 }]
  );

  for (let tick = 181; tick <= 204; tick++) stepSimulation(state, idle, streams);
  const redVelocity = 1925;
  assert.deepEqual(
    state.enemies.map(({ x, y, motionTick }) => ({ x, y, motionTick })),
    [
      { x: 86_094, y: -28 * POSITION_UNITS_PER_PIXEL + 24 * redVelocity, motionTick: 24 },
      { x: 192_908, y: -38 * POSITION_UNITS_PER_PIXEL + 12 * redVelocity, motionTick: 12 },
      { x: 299_520, y: -28 * POSITION_UNITS_PER_PIXEL, motionTick: 0 }
    ]
  );
});
