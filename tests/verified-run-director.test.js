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

test("simulation stepping materializes queued enemies with exact formation timing and motion", async () => {
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
      { x: 84_480, y: -28 * POSITION_UNITS_PER_PIXEL + 24 * redVelocity, motionTick: 24 },
      { x: 192_000, y: -38 * POSITION_UNITS_PER_PIXEL + 12 * redVelocity, motionTick: 12 },
      { x: 299_520, y: -28 * POSITION_UNITS_PER_PIXEL, motionTick: 0 }
    ]
  );
});
