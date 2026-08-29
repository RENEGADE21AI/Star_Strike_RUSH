const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const repoRoot = path.resolve(__dirname, "..");

function makeStorage() {
  const map = new Map();
  return {
    getItem(key) {
      return map.has(key) ? map.get(key) : null;
    },
    setItem(key, value) {
      map.set(key, String(value));
    },
    removeItem(key) {
      map.delete(key);
    },
    dump() {
      return Object.fromEntries(map.entries());
    }
  };
}

function loadGameContext() {
  const storage = makeStorage();
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
    localStorage: storage,
    document: {
      getElementById(id) {
        return id === "game" ? canvasStub : inputStub;
      }
    },
    window: {
      addEventListener() {},
      location: { search: "" }
    },
    Date,
    Math,
    JSON,
    Number,
    String,
    Set
  };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(repoRoot, "shared/verified-run/constants.js"), "utf8"), context);
  vm.runInContext(fs.readFileSync(path.join(repoRoot, "shared/verified-run/content.js"), "utf8"), context);
  vm.runInContext(fs.readFileSync(path.join(repoRoot, "src/00-glory-progression.js"), "utf8"), context);
  vm.runInContext(fs.readFileSync(path.join(repoRoot, "src/01-core.js"), "utf8"), context);
  vm.runInContext(fs.readFileSync(path.join(repoRoot, "src/12-progress-road-data.js"), "utf8"), context);
  vm.runInContext(fs.readFileSync(path.join(repoRoot, "src/12-rendering-progress-road.js"), "utf8"), context);
  context.__storage = storage;
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

test("local meta migration preserves cumulative Glory and lifetime while retiring Credits and Season state", () => {
  const context = loadGameContext();
  const result = runInGame(context, `
    const migrated = sanitizeStoredMetaProgress({
      version: 1,
      totalGlory: 600123,
      credits: 876,
      currentSeason: { id: "season_01", xp: 49000, tier: 50, claimedRewardIds: ["s01_supply_01"] },
      lifetime: { runs: 9, score: 12000, kills: 42, bestScore: 7000, bestPhase: 6 },
      recentReceipts: [{ receiptId: "old", score: 100, phaseReached: 2, gloryGained: 10, seasonXPGained: 99, creditsEarned: 2 }]
    });
    JSON.stringify({ migrated, keys: Object.keys(migrated), receiptKeys: Object.keys(migrated.recentReceipts[0]) });
  `);
  const data = JSON.parse(result);

  assert.equal(data.migrated.version, 3);
  assert.equal(data.migrated.totalGlory, 600123);
  assert.equal("credits" in data.migrated, false);
  assert.equal(data.migrated.lifetime.runs, 9);
  assert.equal(data.migrated.lifetime.bestScore, 7000);
  assert.equal(data.keys.includes("currentSeason"), false);
  assert.equal(data.receiptKeys.includes("seasonXPGained"), false);
});

test("local meta migration is idempotent and derives Prestige without storing a second currency", () => {
  const context = loadGameContext();
  const result = runInGame(context, `
    const first = sanitizeStoredMetaProgress({ totalGlory: 925000, credits: 4, lifetime: { runs: 2 } });
    const second = sanitizeStoredMetaProgress(first);
    metaProgress = second;
    JSON.stringify({ first, second, snapshot: currentMetaSnapshot() });
  `);
  const data = JSON.parse(result);

  assert.deepEqual(data.first, data.second);
  assert.equal(data.snapshot.totalGlory, 925000);
  assert.equal(data.snapshot.prestige, 3);
  assert.equal(data.snapshot.roadGlory, 25000);
  assert.equal(data.snapshot.gloryRank, "Ace");
  assert.equal(data.snapshot.gloryRankDisplay, "Ace IV");
  assert.equal("prestige" in data.second, false);
  assert.equal("roadGlory" in data.second, false);
});

test("legacy saves below, at, and above the Road boundary preserve total Glory exactly and retire Credits", () => {
  const context = loadGameContext();
  const result = runInGame(context, `
    JSON.stringify([299999, 300000, 600123].map((totalGlory) => {
      const migrated = sanitizeStoredMetaProgress({
        version: 1,
        totalGlory,
        credits: 77,
        lifetime: { runs: 4, score: 9000, kills: 12 }
      });
      metaProgress = migrated;
      return { migrated, snapshot: currentMetaSnapshot() };
    }));
  `);
  const data = JSON.parse(result);

  assert.deepEqual(data.map((entry) => entry.migrated.totalGlory), [299999, 300000, 600123]);
  assert.deepEqual(data.map((entry) => entry.snapshot.prestige), [0, 1, 2]);
  assert.deepEqual(data.map((entry) => entry.snapshot.roadGlory), [299999, 0, 123]);
  for (const entry of data) {
    assert.equal("credits" in entry.migrated, false);
    assert.equal(entry.migrated.lifetime.runs, 4);
    assert.equal("prestige" in entry.migrated, false);
    assert.equal("roadGlory" in entry.migrated, false);
  }
});

test("run application adds cumulative Glory once and records explicit milestone events", () => {
  const context = loadGameContext();
  const result = runInGame(context, `
    metaProgress = makeDefaultMetaProgress();
    metaProgress.totalGlory = 299900;
    state.runMode = "standard";
    state.score = 3000;
    state.phase = 3;
    state.runStats = { activeFrames: 7200, kills: 20, bosses: 1, powerups: 2, ghostUses: 1, damageTaken: 1, highestCombo: 8, metaApplied: false };
    highScore = 3000;
    const first = applyRunMetaProgress();
    const second = applyRunMetaProgress();
    JSON.stringify({ first, second, stored: metaProgress, receipt: metaProgress.recentReceipts[0] });
  `);
  const data = JSON.parse(result);

  assert.equal(data.first.gloryAfter, 300200);
  assert.equal(data.first.prestigeAfter, 1);
  assert.equal(data.first.roadGloryAfter, 200);
  assert.equal(data.first.prestigeCrossings, 1);
  assert.equal(data.first.milestoneEvents.at(-1).type, "prestige");
  assert.equal(data.first.milestoneEvents.at(-1).rankName, "Star Eternal");
  assert.equal(data.second.gloryAfter, 300200);
  assert.equal(data.stored.totalGlory, 300200);
  assert.equal(data.stored.recentReceipts.length, 1);
  assert.equal(data.receipt.totalGloryAfter, 300200);
  assert.equal("seasonXPGained" in data.receipt, false);
});

test("tutorial and debug runs cannot emit Glory or Prestige milestones", () => {
  const context = loadGameContext();
  const result = runInGame(context, `
    metaProgress = makeDefaultMetaProgress();
    metaProgress.totalGlory = 299999;
    state.score = 1000000;
    state.runStats = { metaApplied: false };
    state.runMode = "tutorial";
    const tutorial = applyRunMetaProgress();
    state.runMode = "debug";
    const debug = applyRunMetaProgress();
    JSON.stringify({ tutorial, debug, snapshot: currentMetaSnapshot() });
  `);
  const data = JSON.parse(result);

  assert.equal(data.tutorial.nonProgressionRun, true);
  assert.equal(data.debug.nonProgressionRun, true);
  assert.equal(data.snapshot.totalGlory, 299999);
  assert.equal(data.tutorial.receipt, null);
  assert.equal(data.debug.receipt, null);
});

test("Glory Road ascends on a winding route toward future ranks", () => {
  const context = loadGameContext();
  const result = runInGame(context, `
    metaProgress = makeDefaultMetaProgress();
    metaProgress.totalGlory = GLORY_ROAD_LENGTH + GLORY_RANKS[2].threshold;
    const layout = buildGloryRoadLayout({ x: 18, y: 162, w: 339, h: 455 }, currentMetaSnapshot());
    JSON.stringify({
      firstY: layout[0].dotY,
      lastY: layout[layout.length - 1].dotY,
      uniqueX: new Set(layout.map((item) => Math.round(item.dotX))).size,
      activeIndex: layout.find((item) => item.active).index
    });
  `);
  const data = JSON.parse(result);

  assert.ok(data.lastY < data.firstY, "later Glory nodes should rise toward the top");
  assert.ok(data.uniqueX >= 5, "route should visibly wind instead of using a straight rail");
  assert.ok(data.activeIndex > 0);
});

test("Firebase account code keeps archive data separate from device progression", () => {
  const client = fs.readFileSync(path.join(repoRoot, "src", "20-firebase-online.js"), "utf8");
  assert.match(client, /onlineArchiveMeta/);
  assert.doesNotMatch(client, /mergeServerMetaProgress/);
  assert.match(client, /progressionMode:\s*PROGRESSION_MODE/);
});
