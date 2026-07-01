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

test("unlocked Season rewards can be claimed once and applied to local meta progress", () => {
  const context = loadGameContext();
  const result = runInGame(context, `
    metaProgress = makeDefaultMetaProgress();
    metaProgress.currentSeason.xp = SEASON_TIER_XP * 2;
    metaProgress.currentSeason.tier = currentSeasonTierForXP(metaProgress.currentSeason.xp);
    const reward = getSeasonRewardForTier(1).supply;
    const first = claimSeasonReward(reward.id);
    const afterFirst = currentMetaSnapshot();
    const second = claimSeasonReward(reward.id);
    JSON.stringify({ first, second, afterFirst });
  `);
  const data = JSON.parse(result);

  assert.equal(data.first.ok, true);
  assert.equal(data.first.status, "CLAIMED");
  assert.equal(data.first.rewardId, "s01_supply_01");
  assert.equal(data.afterFirst.credits, 100);
  assert.deepEqual(data.afterFirst.seasonClaimedRewardIds, ["s01_supply_01"]);
  assert.equal(data.second.ok, false);
  assert.equal(data.second.reason, "already_claimed");
  assert.equal(data.second.status, "CLAIMED");
});

test("locked Season rewards cannot be claimed or mutate balances", () => {
  const context = loadGameContext();
  const result = runInGame(context, `
    metaProgress = makeDefaultMetaProgress();
    const reward = getSeasonRewardForTier(4).flight;
    const claim = claimSeasonReward(reward.id);
    const snapshot = currentMetaSnapshot();
    JSON.stringify({ claim, snapshot });
  `);
  const data = JSON.parse(result);

  assert.equal(data.claim.ok, false);
  assert.equal(data.claim.reason, "locked");
  assert.equal(data.snapshot.totalGlory, 0);
  assert.equal(data.snapshot.seasonXP, 0);
  assert.equal(data.snapshot.credits, 0);
  assert.deepEqual(data.snapshot.seasonClaimedRewardIds, []);
});

test("Season XP cache claims can advance the current tier", () => {
  const context = loadGameContext();
  const result = runInGame(context, `
    metaProgress = makeDefaultMetaProgress();
    metaProgress.currentSeason.xp = 955;
    metaProgress.currentSeason.tier = currentSeasonTierForXP(metaProgress.currentSeason.xp);
    const reward = getSeasonRewardForTier(1).flight;
    const claim = claimSeasonReward(reward.id);
    const snapshot = currentMetaSnapshot();
    JSON.stringify({ claim, snapshot });
  `);
  const data = JSON.parse(result);

  assert.equal(data.claim.ok, true);
  assert.equal(data.claim.applied.type, "season_xp_cache");
  assert.equal(data.snapshot.seasonXP, 1007);
  assert.equal(data.snapshot.seasonTier, 2);
});

test("Season Road layout ascends: later tiers sit higher than earlier tiers", () => {
  const context = loadGameContext();
  const result = runInGame(context, `
    metaProgress = makeDefaultMetaProgress();
    metaProgress.currentSeason.xp = SEASON_TIER_XP * 17;
    metaProgress.currentSeason.tier = currentSeasonTierForXP(metaProgress.currentSeason.xp);
    const layout = buildSeasonRoadLayout({ x: 18, y: 162, w: 339, h: 455 }, currentMetaSnapshot());
    JSON.stringify({
      tier1: layout.find((item) => item.tier === 1).dotY,
      tier18: layout.find((item) => item.tier === 18).dotY,
      tier50: layout.find((item) => item.tier === 50).dotY,
      activeTier: layout.find((item) => item.active).tier
    });
  `);
  const data = JSON.parse(result);

  assert.equal(data.activeTier, 18);
  assert.ok(data.tier50 < data.tier18, "tier 50 should be above the current tier");
  assert.ok(data.tier18 < data.tier1, "current progress should climb upward from tier 1");
});

test("server meta snapshots replace local signed-in progression state", () => {
  const context = loadGameContext();
  const result = runInGame(context, `
    metaProgress = makeDefaultMetaProgress();
    metaProgress.totalGlory = 99999;
    metaProgress.currentSeason.xp = 99999;
    metaProgress.currentSeason.tier = currentSeasonTierForXP(metaProgress.currentSeason.xp);
    metaProgress.credits = 99999;
    mergeServerMetaProgress({
      totalGlory: 1200,
      seasonId: CURRENT_SEASON_ID,
      seasonName: CURRENT_SEASON_NAME,
      seasonXP: 2052,
      seasonTier: 3,
      credits: 140,
      seasonClaimedRewardIds: ["s01_supply_01"],
      lifetime: {
        runs: 4,
        score: 5000,
        kills: 30,
        powerups: 6,
        ghostUses: 8,
        bosses: 1,
        damageTaken: 3,
        highestCombo: 14,
        bestScore: 3000,
        bestPhase: 3
      }
    });
    JSON.stringify(currentMetaSnapshot());
  `);
  const snapshot = JSON.parse(result);

  assert.equal(snapshot.totalGlory, 1200);
  assert.equal(snapshot.seasonXP, 2052);
  assert.equal(snapshot.seasonTier, 3);
  assert.equal(snapshot.credits, 140);
  assert.deepEqual(snapshot.seasonClaimedRewardIds, ["s01_supply_01"]);
  assert.equal(snapshot.lifetime.runs, 4);
});
