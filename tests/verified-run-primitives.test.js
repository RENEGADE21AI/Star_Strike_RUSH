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
  createInputTapeRecorder,
  decodeInputTape,
  digestInputTape,
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

test("the ordered runtime retains compact segments rather than per-tick input objects", () => {
  clearRunRandomStreams();
  beginRunInputRecording();
  for (let tick = 0; tick < 10_000; tick++) {
    recordCanonicalRunInput({ moveX: 1, moveY: 0 });
  }
  assert.deepEqual(currentVerifiedRunContext(), {
    seeded: false,
    ticket: null,
    authoritativeState: false,
    canonicalTick: 0,
    recording: true,
    recordedTicks: 10_000,
    recordedSegments: 1,
    recordedBytes: 8
  });
  const tape = finalizeRecordedInputTape();
  assert.equal(decodeInputTape(tape).segments.length, 1);
  clearRunRandomStreams();
});

test("ticketed runtime persists compact recorder chunks to a private IndexedDB store", async () => {
  const writes = [];
  let storeCreated = false;
  const database = {
    objectStoreNames: { contains: () => storeCreated },
    createObjectStore(name, options) {
      assert.equal(name, "inputChunks");
      assert.deepEqual(options, { keyPath: "id" });
      storeCreated = true;
    },
    transaction(name, mode) {
      assert.equal(name, "inputChunks");
      assert.equal(mode, "readwrite");
      const transaction = {
        objectStore() {
          return {
            put(record) {
              writes.push({
                ...record,
                bytes: Array.from(record.bytes)
              });
            }
          };
        }
      };
      queueMicrotask(() => transaction.oncomplete?.());
      return transaction;
    }
  };
  const indexedDB = {
    open(name, version) {
      assert.equal(name, "star-strike-rush-verified-input-v1");
      assert.equal(version, 1);
      const request = {};
      queueMicrotask(() => {
        request.result = database;
        request.onupgradeneeded?.();
        request.onsuccess?.();
      });
      return request;
    }
  };
  const priorIndexedDb = globalThis.indexedDB;
  globalThis.indexedDB = indexedDB;

  try {
    clearRunRandomStreams();
    await beginSeededStandardRun(seededTicket({ runId: "run_persisted" }));
    recordCanonicalRunInput({ moveX: 1 });
    recordCanonicalRunInput({ moveX: -1 });
    finalizeRecordedInputTape();
    assert.equal(typeof waitForRecordedRunInputPersistence, "function");
    await waitForRecordedRunInputPersistence();
    assert.equal(writes.length, 1);
    assert.equal(writes[0].id, "run_persisted:00000000");
    assert.equal(writes[0].runId, "run_persisted");
    assert.equal(writes[0].chunkIndex, 0);
    assert.equal(writes[0].firstSegmentIndex, 0);
    assert.equal(writes[0].segmentCount, 2);
    assert.equal(writes[0].tickCount, 2);
    assert.equal(writes[0].bytes.length, 16);
  } finally {
    clearRunRandomStreams();
    if (priorIndexedDb === undefined) delete globalThis.indexedDB;
    else globalThis.indexedDB = priorIndexedDb;
  }
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

test("a canonical tick projects authoritative outcomes into the ticketed browser state", async () => {
  clearRunRandomStreams();
  await beginSeededStandardRun(seededTicket({ runId: "run_authority_projection" }));
  const browserState = {
    runStats: {
      activeFrames: 99,
      kills: 99,
      bosses: 99,
      powerups: 99,
      abilityUses: 99,
      ghostUses: 99,
      dashUses: 99,
      realmHops: 99,
      damageTaken: 99,
      highestCombo: 99
    },
    score: 99,
    phase: 9,
    multiplier: 4,
    comboKills: 99,
    playerRealm: 1,
    player: {
      x: -1,
      y: -1,
      vx: -1,
      vy: -1,
      hp: 1,
      maxHp: 1,
      energy: 1,
      maxEnergy: 1,
      inv: 1,
      fire: 1,
      spread: 1,
      rapid: 1,
      ghostTimer: 1,
      dashTimer: 1,
      ghostCooldown: 1,
      overcharge: 1,
      phaseShield: 1,
      magnet: 1,
      piercing: 1,
      stabilizer: 1,
      scoreSurge: 1,
      maxSpeed: 1
    },
    particles: [{ cosmetic: true }]
  };

  beginCanonicalRunTick({ keyboard: { right: true }, joystick: { active: false } });
  const outcome = globalThis.endCanonicalRunTick?.(browserState);
  const canonical = currentCanonicalRunState();

  assert.deepEqual(outcome, { advanced: true, terminal: false, canonicalTick: 1 });
  assert.equal(browserState.runStats.activeFrames, canonical.tick);
  assert.equal(browserState.score, canonical.score);
  assert.equal(browserState.phase, canonical.phase);
  assert.equal(browserState.multiplier, canonical.multiplier);
  assert.equal(browserState.comboKills, canonical.comboKills);
  assert.equal(browserState.playerRealm, canonical.playerRealm);
  assert.equal(browserState.player.x, canonical.player.x / POSITION_UNITS_PER_PIXEL);
  assert.equal(browserState.player.y, canonical.player.y / POSITION_UNITS_PER_PIXEL);
  assert.equal(browserState.player.vx, canonical.player.vx / POSITION_UNITS_PER_PIXEL);
  assert.equal(browserState.player.vy, canonical.player.vy / POSITION_UNITS_PER_PIXEL);
  assert.equal(browserState.player.hp, canonical.player.hp);
  assert.equal(browserState.player.energy, canonical.player.energy / ENERGY_UNITS_PER_POINT);
  assert.equal(browserState.runStats.kills, canonical.stats.kills);
  assert.equal(browserState.runStats.bosses, canonical.stats.bosses);
  assert.equal(browserState.runStats.powerups, canonical.stats.powerups);
  assert.deepEqual(browserState.particles, [{ cosmetic: true }], "presentation-only state stays browser-owned");
  clearRunRandomStreams();
});

test("canonical pause damage returns the terminal outcome that must end a ticketed run", async () => {
  clearRunRandomStreams();
  await beginSeededStandardRun(seededTicket({ runId: "run_authority_terminal" }));
  const canonical = currentCanonicalRunState();
  canonical.player.hp = 1;
  const browserState = { runStats: {}, player: {} };

  queueVerifiedRunInputEdge("pause");
  beginCanonicalRunTick({ keyboard: {}, joystick: { active: false } });
  const outcome = globalThis.endCanonicalRunTick?.(browserState);

  assert.deepEqual(outcome, { advanced: true, terminal: true, canonicalTick: 1 });
  assert.equal(browserState.player.hp, 0);
  assert.equal(browserState.runStats.activeFrames, 1);
  assert.equal(canonical.stats.pauseUses, 1);
  clearRunRandomStreams();
});

test("ticketed browser feedback is dispatched once from canonical collision outcomes", async () => {
  clearRunRandomStreams();
  await beginSeededStandardRun(seededTicket({ runId: "run_feedback_dispatch" }));
  const canonical = currentCanonicalRunState();
  const units = POSITION_UNITS_PER_PIXEL;
  canonical.player.fireCooldown = 10_000;
  const enemy = spawnCanonicalEnemy(canonical, "orange", 120 * units, 180 * units, { vx: 0, vy: 0 });
  enemy.hp = 1;
  canonical.playerProjectiles.push({
    id: canonical.nextEntityId++,
    kind: "player",
    x: enemy.x,
    y: enemy.y,
    vx: 0,
    vy: 0,
    angle: 0,
    life: 20,
    damage: 1,
    pierce: 0,
    realm: 0
  });
  const sounds = [];
  const bursts = [];
  const particles = [];
  globalThis.playGameSound = (name, volume) => sounds.push({ name, volume });
  globalThis.spawnDeathBurst = (x, y, count) => bursts.push({ x, y, count });
  globalThis.spawnParticles = (x, y, count, color, speed) => particles.push({ x, y, count, color, speed });
  const browserState = {
    player: {},
    runStats: {},
    fx: { flash: 0, shake: 0 },
    particles: []
  };

  beginCanonicalRunTick({ keyboard: {}, joystick: { active: false } });
  assert.equal(canonicalRunSuppressesLegacyFeedback(), true);
  const outcome = endCanonicalRunTick(browserState);

  assert.equal(
    canonicalRunSuppressesLegacyFeedback(),
    true,
    "legacy feedback stays suppressed between ticks while the authoritative run remains active"
  );
  assert.deepEqual(outcome, { advanced: true, terminal: false, canonicalTick: 1 });
  assert.deepEqual(sounds, [
    { name: "enemy_hit", volume: 0.62 },
    { name: "destroy", volume: 0.72 }
  ]);
  const hitEvent = canonical.feedbackEvents.find((event) => event.type === "enemy_hit");
  assert.deepEqual(particles, [
    {
      x: hitEvent.x / units,
      y: hitEvent.y / units,
      count: 6,
      color: "#fff",
      speed: 0.7
    }
  ]);
  assert.deepEqual(bursts, [{ x: hitEvent.x / units, y: hitEvent.y / units, count: 14 }]);
  assert.deepEqual(browserState.lastCanonicalFeedback, {
    tick: 1,
    events: canonical.feedbackEvents
  });

  delete globalThis.playGameSound;
  delete globalThis.spawnDeathBurst;
  delete globalThis.spawnParticles;
  clearRunRandomStreams();
  assert.equal(canonicalRunSuppressesLegacyFeedback(), false);
});

test("ticketed boss abilities preserve their distinct canonical presentation feedback", async () => {
  async function useBossAbility(mode, runId) {
    clearRunRandomStreams();
    const runTicket = seededTicket({ runId });
    await beginSeededStandardRun(runTicket);
    const canonical = currentCanonicalRunState();
    const streams = await createRunRandomStreams(runTicket.rootSeed, runTicket.simRevision);
    canonical.player.fireCooldown = 10_000;
    spawnCanonicalBoss(canonical, mode, streams);
    const origin = {
      x: canonical.player.x / POSITION_UNITS_PER_PIXEL,
      y: canonical.player.y / POSITION_UNITS_PER_PIXEL
    };
    const sounds = [];
    const particles = [];
    globalThis.playGameSound = (name, volume) => sounds.push({ name, volume });
    globalThis.spawnParticles = (x, y, count, color, speed) => particles.push({ x, y, count, color, speed });
    const browserState = {
      player: {},
      runStats: {},
      fx: { flash: 0, shake: 0 },
      comboPulse: 0,
      particles: []
    };

    queueVerifiedRunInputEdge("ghost");
    beginCanonicalRunTick({ keyboard: {}, joystick: { active: false } });
    endCanonicalRunTick(browserState);

    delete globalThis.playGameSound;
    delete globalThis.spawnParticles;
    clearRunRandomStreams();
    return { origin, sounds, particles, flash: browserState.fx.flash, comboPulse: browserState.comboPulse };
  }

  const realmHop = await useBossAbility("wraith", "run_feedback_realm_hop");
  assert.deepEqual(realmHop, {
    origin: { x: 187.5, y: 533.599609375 },
    sounds: [{ name: "ability", volume: 0.86 }],
    particles: [{ x: 187.5, y: 533.599609375, count: 10, color: "#d9b6ff", speed: 0.9 }],
    flash: 4,
    comboPulse: 6
  });

  const dash = await useBossAbility("debris_warden", "run_feedback_dash");
  assert.deepEqual(dash, {
    origin: { x: 187.5, y: 533.599609375 },
    sounds: [{ name: "ability", volume: 1 }],
    particles: [{ x: 187.5, y: 533.599609375, count: 16, color: "#ffcc78", speed: 1.35 }],
    flash: 6,
    comboPulse: 0
  });
});

test("ticketed presentation converts canonical entities without mutating legacy arrays", async () => {
  clearRunRandomStreams();
  const ticket = seededTicket({ runId: "run_entity_presentation" });
  await beginSeededStandardRun(ticket);
  const canonical = currentCanonicalRunState();
  const streams = await createRunRandomStreams(ticket.rootSeed, ticket.simRevision);
  const units = POSITION_UNITS_PER_PIXEL;

  const enemy = spawnCanonicalEnemy(canonical, "red", 100 * units, 200 * units, {
    vx: units,
    vy: 2 * units,
    angle: 1024,
    warnTimer: 7
  });
  canonical.playerProjectiles.push({
    id: canonical.nextEntityId++, kind: "player", x: 110 * units, y: 210 * units,
    vx: 0, vy: -9 * units, angle: 0, life: 90, damage: 1, pierce: 0, realm: 0
  });
  canonical.enemyProjectiles.push({
    id: canonical.nextEntityId++, kind: "aimed", x: 120 * units, y: 220 * units,
    vx: units, vy: 2 * units, angle: 1024, life: 180, damage: 1, drain: 0, realm: 0
  });
  spawnCanonicalHazard(canonical, "rock_asteroid", 130 * units, 230 * units, { angle: 1024 });
  spawnCanonicalHazard(canonical, "enemy_beam", 140 * units, 240 * units, {
    angle: 1024,
    length: 400 * units,
    width: 8 * units,
    warn: 12,
    active: 16
  });
  spawnCanonicalHazard(canonical, "gravity_well", 150 * units, 250 * units, {
    radius: 76 * units,
    pulseAngle: 2048
  });
  spawnCanonicalPowerup(canonical, "repair", 160 * units, 260 * units, { wobbleAngle: 1024 });
  canonical.wingmen.push({
    id: canonical.nextEntityId++, side: -1, x: 170 * units, y: 270 * units,
    timer: 100, fireCooldown: 10, phase: "active", arrivalElapsed: 34,
    arrivalDuration: 34, arrivalFromX: 170 * units, arrivalFromY: 270 * units,
    departureAngle: 1024
  });
  spawnCanonicalBoss(canonical, "wraith", streams);

  const legacyEnemy = { id: "legacy_enemy" };
  const browserState = {
    enemies: [legacyEnemy], bullets: [{ id: "legacy_bullet" }], enemyBullets: [],
    debris: [], enemyBeams: [], gravityWells: [], powerups: [], wingmen: [],
    boss: { id: "legacy_boss" }
  };
  const view = globalThis.currentRunPresentationState?.(browserState);

  assert.notEqual(view, browserState);
  assert.deepEqual(browserState.enemies, [legacyEnemy], "presentation cannot replace legacy simulation arrays");
  assert.equal(view.enemies[0].id, enemy.id);
  assert.equal(view.enemies[0].x, 100);
  assert.equal(view.enemies[0].y, 200);
  assert.equal(view.enemies[0].prevX, 99);
  assert.equal(view.enemies[0].prevY, 198);
  assert.equal(view.enemies[0].rotation, Math.PI / 2);
  assert.equal(view.enemies[0].r, 12);
  assert.equal(view.enemies[0].warn, 7);
  assert.equal(view.bullets[0].x, 110);
  assert.equal(view.enemyBullets[0].angle, Math.PI / 2);
  assert.equal(view.debris[0].r, 15.5);
  assert.equal(view.debris[0].rot, Math.PI / 2);
  assert.equal(view.enemyBeams[0].length, 400);
  assert.equal(view.enemyBeams[0].width, 8);
  assert.equal(view.gravityWells[0].r, 76);
  assert.equal(view.gravityWells[0].pulse, Math.PI);
  assert.equal(view.powerups[0].size, 11);
  assert.equal(view.powerups[0].rotation, Math.PI / 2);
  assert.equal(view.wingmen[0].x, 170);
  assert.equal(view.boss.mode, "wraith");
  assert.equal(view.boss.w, 152);
  assert.equal(view.boss.h, 96);
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

test("input tape SHA-256 uses the exact finalized transport bytes", async () => {
  assert.equal(typeof digestInputTape, "function");
  const bytes = encodeInputTape([
    { moveX: 0 },
    { moveX: 0 },
    { moveX: 1, ghostPressed: true }
  ]);
  assert.equal(
    await digestInputTape(bytes),
    "db0c445b634f73719d9911f1eed5bd81398988584449f81ecc3f7cb7d9e6177b"
  );
});

test("incremental input recording flushes compact RLE chunks instead of retaining one object per tick", () => {
  assert.equal(typeof createInputTapeRecorder, "function");
  const flushed = [];
  const recorder = createInputTapeRecorder({
    segmentChunkCapacity: 2,
    onChunk(bytes, summary) {
      flushed.push({ bytes, summary });
    }
  });

  for (let tick = 0; tick < 10_000; tick++) {
    recorder.append({ moveX: 1, moveY: 0 });
  }
  recorder.append({ moveX: 0, moveY: -1, ghostPressed: true });
  recorder.append({ moveX: 0, moveY: -1 });

  assert.deepEqual(recorder.status(), {
    tickCount: 10_002,
    segmentCount: 3,
    flushedSegmentCount: 2,
    bufferedSegmentCount: 1,
    compactByteLength: 24,
    finalized: false
  });
  assert.equal(flushed.length, 1);
  assert.equal(flushed[0].bytes.byteLength, 16);
  assert.deepEqual(flushed[0].summary, {
    chunkIndex: 0,
    firstSegmentIndex: 0,
    segmentCount: 2,
    tickCount: 10_001
  });

  const decoded = decodeInputTape(recorder.finalize());
  assert.equal(decoded.tickCount, 10_002);
  assert.deepEqual(decoded.segments, [
    { duration: 10_000, x: 127, y: 0, buttons: 0 },
    { duration: 1, x: 0, y: -127, buttons: BUTTON_GHOST_SHIFT },
    { duration: 1, x: 0, y: -127, buttons: 0 }
  ]);
  assert.equal(flushed.length, 2, "finalization must flush the last partial compact chunk");
  assert.equal(flushed[1].bytes.byteLength, 8);
});

test("incremental recorder accepts the exact segment ceiling and rejects overflow without mutation", () => {
  const recorder = createInputTapeRecorder({ segmentChunkCapacity: 4096 });
  for (let index = 0; index < MAX_INPUT_SEGMENTS; index++) {
    recorder.append({ moveX: index % 2 === 0 ? 1 : -1 });
  }
  const atCeiling = recorder.status();
  assert.equal(atCeiling.tickCount, MAX_INPUT_SEGMENTS);
  assert.equal(atCeiling.segmentCount, MAX_INPUT_SEGMENTS);
  assert.throws(() => recorder.append({ moveX: 1 }), /segment count/);
  assert.deepEqual(recorder.status(), atCeiling, "rejected overflow must not consume a tick or alter compact state");

  recorder.append({ moveX: -1 });
  assert.equal(recorder.status().tickCount, MAX_INPUT_SEGMENTS + 1, "the current segment may still extend");
  assert.equal(recorder.status().segmentCount, MAX_INPUT_SEGMENTS);
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
