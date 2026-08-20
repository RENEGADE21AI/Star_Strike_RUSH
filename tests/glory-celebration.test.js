const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");

const repoRoot = path.resolve(__dirname, "..");

function loadCelebrationContext() {
  const sounds = [];
  const context = {
    console,
    Math,
    Number,
    String,
    Object,
    Array,
    settingReducedMotion: false,
    settingEffectsEnabled: true,
    playGameSound(kind, intensity) { sounds.push({ kind, intensity }); },
    clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
  };
  context.globalThis = context;
  vm.createContext(context);
  for (const file of ["00-glory-progression.js", "12-glory-celebration.js"]) {
    vm.runInContext(fs.readFileSync(path.join(repoRoot, "src", file), "utf8"), context);
  }
  context.__sounds = sounds;
  return context;
}

test("checkpoint, rank, and Prestige celebrations use an ordered blocking lifecycle", () => {
  const context = loadCelebrationContext();
  const result = vm.runInContext(`
    const queue = [
      { type: "checkpoint", threshold: 2000, prestigeCycle: 0, intensity: 0.3 },
      { type: "rank", threshold: 3000, rankName: "Strike Pilot", prestigeCycle: 0, intensity: 0.5 },
      { type: "prestige", rankName: "Star Eternal", prestigeAfter: 1, intensity: 1 }
    ];
    startGloryCelebrations(queue);
    const first = currentGloryCelebration().type;
    advanceGloryCelebration(true);
    const second = currentGloryCelebration().type;
    advanceGloryCelebration(true);
    const third = currentGloryCelebration().type;
    advanceGloryCelebration(true);
    JSON.stringify({ first, second, third, active: gloryCelebrationActive() });
  `, context);
  assert.deepEqual(JSON.parse(result), { first: "checkpoint", second: "rank", third: "prestige", active: false });
  assert.deepEqual(context.__sounds.map((item) => item.kind), ["checkpoint", "rank_up", "prestige"]);
});

test("celebrations auto-complete and Reduced Motion shortens motion exposure", () => {
  const context = loadCelebrationContext();
  const result = vm.runInContext(`
    const event = { type: "rank", threshold: 15000, rankName: "Ace", prestigeCycle: 2, intensity: 0.6 };
    settingReducedMotion = false;
    const standard = gloryCelebrationDurationFrames(event);
    settingReducedMotion = true;
    const reduced = gloryCelebrationDurationFrames(event);
    startGloryCelebrations([event]);
    for (let i = 0; i < reduced; i++) updateGloryCelebration();
    JSON.stringify({ standard, reduced, active: gloryCelebrationActive(), copy: gloryCelebrationCopy(event) });
  `, context);
  const data = JSON.parse(result);
  assert.ok(data.reduced < data.standard);
  assert.equal(data.active, false);
  assert.equal(data.copy.value, "ACE III");
});

test("celebration layout keeps checkpoint copy and the focused Continue target separated", () => {
  const context = loadCelebrationContext();
  const result = vm.runInContext(`
    JSON.stringify(gloryCelebrationLayout(
      { type: "checkpoint", threshold: 2000, prestigeCycle: 0, intensity: 0.3 },
      375,
      667
    ));
  `, context);
  const layout = JSON.parse(result);
  assert.ok(layout.eyebrowY < layout.titleY);
  assert.ok(layout.titleY < layout.valueY);
  assert.ok(layout.valueY < layout.detailY);
  assert.ok(layout.detailY + 9 <= layout.continueRect.y);
  assert.ok(layout.continueRect.x >= layout.panel.x);
  assert.ok(layout.continueRect.y >= layout.panel.y);
  assert.ok(layout.continueRect.x + layout.continueRect.w <= layout.panel.x + layout.panel.w);
  assert.ok(layout.continueRect.y + layout.continueRect.h <= layout.panel.y + layout.panel.h);
});

test("Game Over input checks the celebration before Respawn, View Road, or Title", () => {
  const input = fs.readFileSync(path.join(repoRoot, "src", "18-session-input-loop.js"), "utf8");
  const body = input.slice(input.indexOf("function handleGameOverPointerDown"), input.indexOf("canvas.addEventListener(\"pointerdown\""));
  assert.ok(body.indexOf("gloryCelebrationActive()") < body.indexOf("getGameOverButtons()"));
  assert.match(body, /advanceGloryCelebration\(\)/);
});
