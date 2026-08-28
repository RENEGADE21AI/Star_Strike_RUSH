"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  CHECKPOINT_INTERVAL_TICKS,
  ENERGY_UNITS_PER_POINT,
  INPUT_HEADER_BYTES,
  MAX_INPUT_BYTES,
  MAX_INPUT_SEGMENTS,
  MAX_RUN_TICKS,
  POSITION_UNITS_PER_PIXEL,
  SIMULATION_REVISION
} = require("../shared/verified-run/constants");
const {
  createRunRandomStreams,
  createXoshiro128StarStar
} = require("../shared/verified-run/random");
const {
  BUTTON_GHOST_SHIFT,
  BUTTON_PAUSE,
  canonicalRunInput,
  decodeInputTape,
  encodeInputTape
} = require("../shared/verified-run/input-tape");
const { serializeCanonicalState } = require("../shared/verified-run/simulation-state");
require("../shared/verified-run/simulation-step");
require("../src/00-verified-run-runtime.js");

function seededTicket(overrides = {}) {
  return {
    runId: "run_001",
    rootSeed: "00112233445566778899aabbccddeeff",
    simRevision: SIMULATION_REVISION,
    rulesRevision: "rules-v1",
    contentRevision: "content-v1",
    buildSha: "a".repeat(40),
    maxTicks: 20_000,
    ...overrides
  };
}

test("xoshiro128** matches the repository fixed vector", () => {
  const random = createXoshiro128StarStar([1, 2, 3, 4]);
  assert.deepEqual(
    Array.from({ length: 6 }, () => random.nextUint32()),
    [11520, 0, 5927040, 70819200, 2031721883, 1637235492]
  );
});

test("named streams reproduce and remain isolated", async () => {
  const seed = "00112233445566778899aabbccddeeff";
  const first = await createRunRandomStreams(seed, "sim-v1");
  const second = await createRunRandomStreams(seed, "sim-v1");

  const expectedWaves = [
    second.nextUint32("waves"),
    second.nextUint32("waves"),
    second.nextUint32("waves")
  ];
  assert.equal(first.nextUint32("waves"), expectedWaves[0]);
  for (let index = 0; index < 100; index++) first.nextUint32("loot");
  assert.equal(first.nextUint32("waves"), expectedWaves[1]);
  assert.equal(first.nextUint32("waves"), expectedWaves[2]);
});

test("stream derivation rejects malformed roots and unknown names", async () => {
  await assert.rejects(() => createRunRandomStreams("abcd", "sim-v1"), /128-bit hexadecimal/);
  const streams = await createRunRandomStreams("00112233445566778899aabbccddeeff", "sim-v1");
  assert.throws(() => streams.nextUint32("cosmetic"), /Unknown run random stream/);
});

test("a seeded standard run binds random streams and canonical input to one ticket", async () => {
  clearRunRandomStreams();
  await beginSeededStandardRun(seededTicket());
  assert.equal(currentVerifiedRunContext().seeded, true);
  assert.equal(currentVerifiedRunContext().recording, true);
  assert.equal(currentVerifiedRunContext().ticket.runId, "run_001");

  queueVerifiedRunInputEdge("ghost");
  const first = beginCanonicalRunTick({
    keyboard: { right: true },
    joystick: { active: false }
  });
  assert.deepEqual(first, { x: 1, y: 0, ghostPressed: true, pausePressed: false });
  assert.deepEqual(currentCanonicalRunVector(), { x: 1, y: 0 });
  endCanonicalRunTick();

  const tape = finalizeRecordedInputTape();
  assert.deepEqual(decodeInputTape(tape).segments, [
    { duration: 1, x: 127, y: 0, buttons: BUTTON_GHOST_SHIFT }
  ]);
  clearRunRandomStreams();
});

test("the browser canonical shadow advances independently of legacy random draws", async () => {
  async function replay({ consumeLegacyRandomness }) {
    clearRunRandomStreams();
    await beginSeededStandardRun(seededTicket({ runId: "run_shadow" }));
    if (consumeLegacyRandomness) {
      for (let index = 0; index < 80; index++) {
        runRandom("waves");
        runRandom("enemy_behavior");
      }
    }
    for (let tick = 0; tick < 220; tick++) {
      beginCanonicalRunTick({ keyboard: { right: tick < 40 }, joystick: { active: false } });
      endCanonicalRunTick();
    }
    assert.equal(currentVerifiedRunContext().canonicalTick, 220);
    const serialized = serializeCanonicalState(currentCanonicalRunState());
    clearRunRandomStreams();
    return serialized;
  }

  const burned = await replay({ consumeLegacyRandomness: true });
  const clean = await replay({ consumeLegacyRandomness: false });
  assert.deepEqual(burned, clean);
});

test("concurrent seeded run starts cannot replace the active authoritative state", async () => {
  clearRunRandomStreams();
  const first = beginSeededStandardRun(seededTicket({ runId: "run_first" }));
  const second = beginSeededStandardRun(seededTicket({ runId: "run_second" }));

  await assert.rejects(second, /already active/);
  await first;
  assert.equal(currentVerifiedRunContext().ticket.runId, "run_first");
  assert.equal(currentCanonicalRunState().ticket.runId, "run_first");
  clearRunRandomStreams();
});

test("browser parity reports concrete live-state differences from canonical authority", async () => {
  clearRunRandomStreams();
  await beginSeededStandardRun(seededTicket({ runId: "run_parity" }));
  beginCanonicalRunTick({ keyboard: {}, joystick: { active: false } });
  endCanonicalRunTick();
  const canonical = currentCanonicalRunState();
  const browserState = {
    runStats: { activeFrames: canonical.tick },
    score: canonical.score,
    phase: canonical.phase,
    multiplier: canonical.multiplier,
    comboKills: canonical.comboKills,
    playerRealm: canonical.playerRealm,
    player: {
      x: canonical.player.x / POSITION_UNITS_PER_PIXEL,
      y: canonical.player.y / POSITION_UNITS_PER_PIXEL,
      hp: canonical.player.hp,
      energy: canonical.player.energy / ENERGY_UNITS_PER_POINT
    },
    bullets: new Array(canonical.playerProjectiles.length),
    enemyBullets: new Array(canonical.enemyProjectiles.length),
    enemies: new Array(canonical.enemies.length),
    debris: new Array(canonical.hazards.length),
    enemyBeams: [],
    gravityWells: [],
    powerups: new Array(canonical.powerups.length),
    wingmen: new Array(canonical.wingmen.length),
    pendingSpawns: new Array(canonical.pendingSpawns.length),
    boss: canonical.boss
  };

  assert.deepEqual(globalThis.currentCanonicalRunParity?.(browserState), {
    active: true,
    matched: true,
    canonicalTick: 1,
    differences: []
  });
  browserState.score++;
  assert.deepEqual(globalThis.currentCanonicalRunParity?.(browserState).differences, [
    { field: "score", browser: 1, canonical: 0 }
  ]);
  clearRunRandomStreams();
});

test("canonical input clamps axes and records pressed edges", () => {
  assert.deepEqual(
    canonicalRunInput({ moveX: 2, moveY: -0.5, ghostPressed: true, pausePressed: true }),
    { x: 127, y: -64, buttons: BUTTON_GHOST_SHIFT | BUTTON_PAUSE }
  );
  assert.deepEqual(canonicalRunInput({ moveX: Number.NaN, moveY: -2 }), { x: 0, y: -127, buttons: 0 });
});

test("input tape round trips run-length segments and checkpoints", () => {
  const still = { moveX: 0, moveY: 0 };
  const right = { moveX: 1, moveY: 0, ghostPressed: true };
  const digest = "00112233445566778899aabbccddeeff";
  const bytes = encodeInputTape(
    [still, still, right, right, { moveX: 1, moveY: 0 }],
    { checkpoints: [{ tick: 5, digest }] }
  );
  const decoded = decodeInputTape(bytes);

  assert.equal(decoded.tickCount, 5);
  assert.deepEqual(decoded.segments, [
    { duration: 2, x: 0, y: 0, buttons: 0 },
    { duration: 2, x: 127, y: 0, buttons: BUTTON_GHOST_SHIFT },
    { duration: 1, x: 127, y: 0, buttons: 0 }
  ]);
  assert.deepEqual(decoded.checkpoints, [{ tick: 5, digest }]);
  assert.equal(decoded.checkpointIntervalTicks, CHECKPOINT_INTERVAL_TICKS);
  assert.ok(bytes.byteLength <= MAX_INPUT_BYTES);
});

test("input tape rejects corrupt structure, trailing data, and invalid checkpoints", () => {
  const valid = encodeInputTape([{ moveX: 0, moveY: 0 }]);

  const badMagic = valid.slice();
  badMagic[0] = 0;
  assert.throws(() => decodeInputTape(badMagic), /magic/);

  const trailing = new Uint8Array(valid.byteLength + 1);
  trailing.set(valid);
  assert.throws(() => decodeInputTape(trailing), /length/);

  const zeroDuration = valid.slice();
  new DataView(zeroDuration.buffer, zeroDuration.byteOffset).setUint32(INPUT_HEADER_BYTES, 0, true);
  assert.throws(() => decodeInputTape(zeroDuration), /duration/);

  assert.throws(
    () => encodeInputTape([{ moveX: 0, moveY: 0 }], { checkpoints: [{ tick: 2, digest: "00".repeat(16) }] }),
    /checkpoint tick/
  );
});

test("input tape enforces tick, segment, and byte ceilings before allocation", () => {
  const valid = encodeInputTape([{ moveX: 0, moveY: 0 }]);
  const impossibleTicks = valid.slice();
  new DataView(impossibleTicks.buffer, impossibleTicks.byteOffset).setUint32(8, MAX_RUN_TICKS + 1, true);
  assert.throws(() => decodeInputTape(impossibleTicks), /tick count/);

  const impossibleSegments = valid.slice();
  new DataView(impossibleSegments.buffer, impossibleSegments.byteOffset).setUint32(12, MAX_INPUT_SEGMENTS + 1, true);
  assert.throws(() => decodeInputTape(impossibleSegments), /segment count/);

  assert.throws(() => decodeInputTape(new Uint8Array(MAX_INPUT_BYTES + 1)), /byte ceiling/);
});
