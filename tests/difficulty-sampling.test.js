const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const repoRoot = path.resolve(__dirname, "..");

function loadGameContext() {
  const canvasStub = {
    getContext() {
      return {};
    },
    addEventListener() {},
    setPointerCapture() {},
    getBoundingClientRect() {
      return { left: 0, top: 0 };
    }
  };
  const inputStub = {
    value: "",
    addEventListener() {},
    focus() {},
    blur() {}
  };
  const context = {
    console,
    localStorage: { getItem() { return null; }, setItem() {} },
    document: { getElementById(id) { return id === "game" ? canvasStub : inputStub; } },
    window: { addEventListener() {}, location: { search: "?debug" } },
    Date,
    Math,
    JSON,
    Number,
    String,
    Set
  };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(repoRoot, "src/01-core.js"), "utf8"), context);
  vm.runInContext(fs.readFileSync(path.join(repoRoot, "src/03-pacing.js"), "utf8"), context);
  return context;
}

function runInGame(context, code) {
  return vm.runInContext(code, context);
}

function test(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

test("difficulty samples include pressure, counts, phase, HP, and relief state", () => {
  const context = loadGameContext();
  const result = runInGame(context, `
    state.player = makePlayer();
    state.gameState = "playing";
    state.frame = 360;
    state.phase = 2;
    state.phaseTimer = 120;
    state.pressure = 33.4;
    state.threatScore = 7.25;
    state.difficulty.threat = 0.66;
    state.difficulty.target = 0.72;
    state.difficulty.grace = 44;
    state.difficulty.ghostGrace = 9;
    state.enemies = [{}, {}, {}];
    state.enemyBullets = [{ kind: "purple" }, { kind: "aimed" }];
    state.pendingSpawns = [{}, {}];
    state.debris = [{}];
    state.powerups = [{}];
    JSON.stringify(makeDifficultySample());
  `);
  const sample = JSON.parse(result);

  assert.equal(sample.frame, 360);
  assert.equal(sample.phase, 2);
  assert.equal(sample.hp, 5);
  assert.equal(sample.pressure, 33.4);
  assert.equal(sample.threatScore, 7.25);
  assert.equal(sample.counts.enemies, 3);
  assert.equal(sample.counts.enemyBullets, 2);
  assert.equal(sample.counts.pendingSpawns, 2);
  assert.equal(sample.relief.grace, 44);
  assert.equal(sample.relief.ghostGrace, 9);
});

test("difficulty sampling records at a stable cadence and keeps a bounded history", () => {
  const context = loadGameContext();
  const result = runInGame(context, `
    state.player = makePlayer();
    state.gameState = "playing";
    for (let i = 0; i < 725; i++) {
      state.frame = i * 60;
      state.phase = 1 + Math.floor(i / 120);
      recordDifficultySample(true);
    }
    JSON.stringify({
      length: state.difficultySamples.length,
      firstFrame: state.difficultySamples[0].frame,
      lastFrame: state.difficultySamples[state.difficultySamples.length - 1].frame
    });
  `);
  const data = JSON.parse(result);

  assert.equal(data.length, 720);
  assert.equal(data.firstFrame, 300);
  assert.equal(data.lastFrame, 724 * 60);
});

test("early phase durations keep the first boss out of the first two minutes", () => {
  const context = loadGameContext();
  const result = runInGame(context, `
    JSON.stringify({
      phase1: phaseDuration(1),
      phase2: phaseDuration(2),
      phase3: phaseDuration(3),
      framesBeforeFirstBoss: phaseDuration(1) + phaseDuration(2) + phaseDuration(3)
    });
  `);
  const data = JSON.parse(result);

  assert.equal(data.phase1, 3000);
  assert.equal(data.phase2, 3300);
  assert.equal(data.phase3, 3000);
  assert.ok(data.framesBeforeFirstBoss > 7200);
});

test("long combos do not saturate pressure when the screen itself is calm", () => {
  const context = loadGameContext();
  const result = runInGame(context, `
    state.player = makePlayer();
    state.gameState = "playing";
    state.phase = 2;
    state.frame = 4800;
    state.comboKills = 100;
    state.enemies = [];
    state.enemyBullets = [];
    state.pendingSpawns = [];
    state.pressure = 0;
    for (let i = 0; i < 120; i++) updatePressure();
    JSON.stringify({ pressure: state.pressure });
  `);
  const data = JSON.parse(result);

  assert.ok(data.pressure < 45, `expected calm-screen pressure below 45, got ${data.pressure}`);
});

test("low HP relief trims queued pressure and forces a recovery window", () => {
  const context = loadGameContext();
  const result = runInGame(context, `
    state.player = makePlayer();
    state.player.hp = 1;
    state.waveMood = "spike";
    state.waveMoodTimer = 20;
    state.waveRest = 0;
    state.pendingSpawns = [{}, {}, {}, {}, {}, {}];
    state.enemyBullets = [{}, {}, {}, {}, {}];
    applyLowHpReliefAfterHit();
    JSON.stringify({
      waveMood: state.waveMood,
      waveMoodTimer: state.waveMoodTimer,
      waveRest: state.waveRest,
      pendingSpawns: state.pendingSpawns.length,
      enemyBullets: state.enemyBullets.length
    });
  `);
  const data = JSON.parse(result);

  assert.equal(data.waveMood, "recovery");
  assert.ok(data.waveMoodTimer >= 150);
  assert.ok(data.waveRest >= 70);
  assert.equal(data.pendingSpawns, 0);
  assert.ok(data.enemyBullets <= 2);
});
