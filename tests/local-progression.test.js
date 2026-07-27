const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");

const repoRoot = path.resolve(__dirname, "..");

function load(...files) {
  const context = { globalThis: null, Set, Array, String, Number, Math, JSON };
  context.globalThis = context;
  vm.createContext(context);
  for (const file of files) {
    vm.runInContext(fs.readFileSync(path.join(repoRoot, "src", file), "utf8"), context);
  }
  return context;
}

test("local achievement ids persist, reload, and merge with online unlocks", () => {
  const context = load("00-local-achievements.js");
  const values = new Map();
  const storage = {
    getItem: (key) => values.get(key) || null,
    setItem: (key, value) => values.set(key, value)
  };
  const valid = ["first_sortie", "ghost_runner", "boss_breaker"];

  context.saveLocalAchievementIds(storage, ["ghost_runner", "invalid", "ghost_runner"], valid);
  assert.equal(values.size, 1);
  assert.equal(
    JSON.stringify(context.loadLocalAchievementIds(storage, valid)),
    JSON.stringify(["ghost_runner"])
  );
  assert.equal(
    JSON.stringify(context.mergeAchievementIds(["ghost_runner"], ["boss_breaker"], valid)),
    JSON.stringify(["ghost_runner", "boss_breaker"])
  );
});

test("new-record state is based on the score captured at run start and ignores debug runs", () => {
  const context = load("00-run-records.js");
  assert.equal(context.isNewRunRecord(500, 501, "standard"), true);
  assert.equal(context.isNewRunRecord(500, 500, "standard"), false);
  assert.equal(context.isNewRunRecord(500, 9999, "debug"), false);
  assert.equal(context.highScoreAfterRun(500, 800, "standard"), 800);
  assert.equal(context.highScoreAfterRun(500, 800, "debug"), 500);
});

test("Ghost Runner counts only true Ghost uses, not DASH or Realm Hop", () => {
  const catalog = require("../shared/achievements.json");
  const source = fs.readFileSync(path.join(repoRoot, "src", "19-game-achievements.js"), "utf8");
  const runCheck = source.slice(source.indexOf("function runMeetsAchievement"), source.indexOf("function achievementProgressForMeta"));
  assert.equal(catalog.achievements.find((item) => item.id === "ghost_runner").minGhostUses, 3);
  assert.match(runCheck, /stats\.ghostUses/);
  assert.doesNotMatch(runCheck, /stats\.(dashUses|realmHops)/);
});
