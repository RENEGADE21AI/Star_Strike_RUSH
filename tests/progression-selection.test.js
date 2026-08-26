const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const test = require("node:test");

function load() {
  const context = vm.createContext({ globalThis: {} });
  vm.runInContext(fs.readFileSync(path.resolve(__dirname, "../src/00-progression-choice.js"), "utf8"), context);
  return context.globalThis;
}

test("browser progression comparison automatically selects the strongest whole save", () => {
  const api = load();
  const device = { totalGlory: 500, lifetime: { runs: 1, bestScore: 1000, bestPhase: 2 } };
  const account = { totalGlory: 900, lifetime: { runs: 2, bestScore: 2000, bestPhase: 3 } };
  assert.equal(api.bestProgressionSource(device, account), "account");
  assert.equal(api.bestProgressionSource(account, device), "device");
  assert.equal(api.bestProgressionSource(device, device), "account", "exact ties retain the established account save");
});

test("automatic comparison is deterministic and never adds progression together", () => {
  const api = load();
  const account = { totalGlory: 2000, achievementCount: 5, lifetime: { bestScore: 10000, bestPhase: 4, score: 30000 } };
  const device = { totalGlory: 2000, achievementCount: 7, lifetime: { bestScore: 10000, bestPhase: 4, score: 25000 } };
  assert.equal(api.bestProgressionSource(device, account), "device", "achievement count breaks an otherwise exact tie");
  assert.deepEqual(JSON.parse(JSON.stringify(api.progressionComparable(device))), {
    totalGlory: 2000,
    achievementCount: 7,
    codexCount: 0,
    lifetime: {
      runs: 0, score: 25000, kills: 0, powerups: 0, ghostUses: 0,
      bosses: 0, damageTaken: 0, highestCombo: 0, bestScore: 10000, bestPhase: 4
    }
  });
  assert.notEqual(api.progressionComparable(device).totalGlory, 4000);
});

test("sign-out clearing removes progression keys and preserves settings, call sign, onboarding, and device binding", () => {
  const api = load();
  const values = new Map([
    ["star_strike_rush_high_score_v1", "99"],
    ["star_strike_rush_meta_v1", "{}"],
    ["star_strike_rush_achievements_v1", "[]"],
    ["star_strike_rush_codex_v1", "{}"],
    ["star_strike_rush_settings_v1", "settings"],
    ["star_strike_rush_callsign_v1", "PILOT"],
    ["star_strike_rush_onboarding_v1", "completed"],
    ["star_strike_rush_pilot_seed_v1", "binding"]
  ]);
  const storage = { removeItem: (key) => values.delete(key) };
  api.clearDeviceProgressionStorage(storage);
  assert.equal(values.has("star_strike_rush_high_score_v1"), false);
  assert.equal(values.has("star_strike_rush_meta_v1"), false);
  assert.equal(values.has("star_strike_rush_achievements_v1"), false);
  assert.equal(values.has("star_strike_rush_codex_v1"), false);
  assert.equal(values.get("star_strike_rush_settings_v1"), "settings");
  assert.equal(values.get("star_strike_rush_callsign_v1"), "PILOT");
  assert.equal(values.get("star_strike_rush_onboarding_v1"), "completed");
  assert.equal(values.get("star_strike_rush_pilot_seed_v1"), "binding");
});

