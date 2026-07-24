const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");

const repoRoot = path.resolve(__dirname, "..");
const { ACHIEVEMENTS, applyRunToProfile, earnedAchievementIdsForRun, sanitizeRunReceipt } = require("../functions/progression");

function clientAchievementDefinitions() {
  const source = fs.readFileSync(path.join(repoRoot, "src", "19-game-achievements.js"), "utf8");
  const context = {
    globalThis: null,
    localStorage: {},
    Set,
    Array,
    String,
    Number,
    Math,
    JSON
  };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(`${source}\nglobalThis.__achievementDefinitions = getAchievementDefinitions();`, context);
  return Array.from(context.__achievementDefinitions);
}

test("achievement vault has a large categorized grind ladder with server parity", () => {
  const client = clientAchievementDefinitions();
  const criteria = [
    "minScore", "minPhase", "minBosses", "minGhostUses", "minPowerups", "minKills",
    "minCombo", "minRunDurationMs", "maxDamageTaken", "minLifetimeRuns", "minLifetimeScore",
    "minLifetimeKills", "minLifetimePowerups", "minLifetimeGhostUses", "minLifetimeBosses"
  ];
  const compact = (item) => Object.fromEntries(
    ["id", "name", ...criteria]
      .filter((key) => Object.prototype.hasOwnProperty.call(item, key))
      .map((key) => [key, item[key]])
  );

  assert.ok(client.length >= 70, `expected at least 70 achievements, found ${client.length}`);
  assert.deepEqual(client.map(compact), ACHIEVEMENTS.map(compact));
  assert.deepEqual(new Set(client.map((item) => item.category)), new Set(["strike", "combat", "systems", "career"]));
  assert.ok(client.some((item) => item.minLifetimeRuns >= 1000));
  assert.ok(client.some((item) => item.minLifetimeKills >= 250000));
  assert.ok(client.some((item) => item.minLifetimeScore >= 25000000));
});

test("server-authoritative lifetime milestones unlock from the accumulated profile", () => {
  const run = sanitizeRunReceipt({
    clientReceiptId: "career_threshold",
    score: 5000,
    phaseReached: 4,
    runDurationMs: 300000,
    enemiesKilled: 10,
    bossesKilled: 1,
    powerupsCollected: 3,
    ghostUses: 2,
    damageTaken: 1,
    highestCombo: 8,
    clientVersion: "web-v1"
  });
  const profile = applyRunToProfile({
    lifetimeRuns: 999,
    lifetimeScore: 24999995,
    lifetimeKills: 249990,
    lifetimePowerups: 9997,
    lifetimeGhostUses: 4998,
    lifetimeBosses: 2499
  }, run);

  for (const id of ["career_runs_1000", "career_score_25m", "career_kills_250k", "career_powerups_10k", "career_ghost_5k", "career_bosses_2500"]) {
    assert.ok(profile.earnedAchievementIds.includes(id), `${id} should unlock`);
  }
  assert.ok(earnedAchievementIdsForRun(run).includes("first_sortie"));
});

test("weekly leagues live in Records and Pilot Dossier is identity plus settings", () => {
  const panel = fs.readFileSync(path.join(repoRoot, "src", "12-rendering-title-panels.js"), "utf8");
  const onlinePanel = panel.slice(panel.indexOf("function drawOnlinePanel"), panel.indexOf("function drawRecordsPanel"));
  const recordsPanel = panel.slice(panel.indexOf("function drawRecordsPanel"), panel.indexOf("function achievementTierColor"));
  assert.doesNotMatch(onlinePanel, /WEEKLY|leagueTab|joinLeague/);
  assert.match(recordsPanel, /r\.weeklyTab/);
  assert.match(recordsPanel, /SEVEN-DAY FLIGHT LEAGUE/);
  assert.match(recordsPanel, /requestWeeklyLeague|joinLeague/);
});

test("run submission reads one aggregate achievement state instead of every unlock document", () => {
  const source = fs.readFileSync(path.join(repoRoot, "functions", "index.js"), "utf8");
  const submit = source.slice(source.indexOf("exports.submitRunReceipt"), source.indexOf("exports.claimSeasonReward"));
  assert.match(submit, /player_achievement_state/);
  assert.match(submit, /tx\.get\(achievementStateRef\)/);
  assert.doesNotMatch(submit, /achievementRefs\.map\(\(item\) => tx\.get/);
});

test("supplied account art is optimized, registered, and rendered with a fallback", () => {
  const optimized = path.join(repoRoot, "assets", "ui", "menu-account.png");
  const manifest = fs.readFileSync(path.join(repoRoot, "src", "00-asset-manifest.js"), "utf8");
  const controls = fs.readFileSync(path.join(repoRoot, "src", "09-rendering-controls.js"), "utf8");
  assert.ok(fs.existsSync(optimized));
  assert.match(manifest, /ui_account:\s*\{\s*source:\s*"assets\/ui\/menu-account\.png"/);
  assert.match(controls, /drawUiAssetIcon\("ui_account"/);
  assert.match(controls, /function drawAccountIcon[\s\S]*ctx\.arc/);
});
