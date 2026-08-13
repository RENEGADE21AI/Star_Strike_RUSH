const assert = require("node:assert/strict");

const {
  GLORY_ROAD_LENGTH,
  applyRunToProfile,
  computeRunGrants,
  earnedAchievementIdsForRun,
  gloryMilestonesCrossed,
  gloryRoadStateForTotal,
  sanitizeRunReceipt,
  validateRunPlausibility
} = require("../functions/progression");
const browserProgression = require("../src/00-glory-progression.js");

function test(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

test("server computes run grants without trusting browser-reported rewards", () => {
  const run = sanitizeRunReceipt({
    clientReceiptId: "local_123_3000_25",
    score: 3000,
    phaseReached: 3,
    runDurationMs: 120000,
    enemiesKilled: 25,
    bossesKilled: 1,
    powerupsCollected: 4,
    ghostUses: 3,
    damageTaken: 2,
    highestCombo: 12,
    clientVersion: "web-v1"
  });

  assert.deepEqual(computeRunGrants(run), {
    gloryGained: 300,
    creditsEarned: 56
  });
});

test("plausibility validation rejects impossible browser run receipts", () => {
  const run = sanitizeRunReceipt({
    clientReceiptId: "cheat",
    score: 10000000,
    phaseReached: 50,
    runDurationMs: 5000,
    enemiesKilled: 2000,
    bossesKilled: 20,
    powerupsCollected: 400,
    ghostUses: 400,
    damageTaken: 0,
    highestCombo: 2000,
    clientVersion: "web-v1"
  });

  const validation = validateRunPlausibility(run);
  assert.equal(validation.ok, false);
  assert.match(validation.reason, /score|phase|kills|bosses|powerups|ghost/i);
});

test("run application advances server profile and achievements from sanitized stats", () => {
  const run = sanitizeRunReceipt({
    clientReceiptId: "local_456_10000_40",
    score: 10000,
    phaseReached: 8,
    runDurationMs: 240000,
    enemiesKilled: 40,
    bossesKilled: 3,
    powerupsCollected: 8,
    ghostUses: 4,
    damageTaken: 3,
    highestCombo: 18,
    clientVersion: "web-v1"
  });
  const profile = applyRunToProfile({
    totalGlory: 900,
    credits: 50,
    lifetimeRuns: 2,
    lifetimeScore: 1500,
    lifetimeKills: 10,
    lifetimePowerups: 1,
    lifetimeGhostUses: 1,
    lifetimeBosses: 0,
    lifetimeDamageTaken: 1,
    highestCombo: 9,
    bestScore: 1500,
    phase: 2
  }, run);

  assert.equal(profile.totalGlory, 1900);
  assert.equal(profile.credits, 224);
  assert.equal(profile.lifetimeRuns, 3);
  assert.equal(profile.bestScore, 10000);
  assert.equal(profile.phase, 8);
  assert.ok(profile.earnedAchievementIds.includes("mythic_score"));
  assert.ok(profile.earnedAchievementIds.includes("phase_eight"));
  assert.ok(profile.earnedAchievementIds.includes("boss_hunter"));
});

test("server derives repeated Glory Road state from cumulative Glory", () => {
  assert.equal(GLORY_ROAD_LENGTH, 300000);
  assert.deepEqual(
    [0, 299999, 300000, 300001, 600000, 925000].map((value) => {
      const state = gloryRoadStateForTotal(value);
      return [state.totalGlory, state.prestige, state.roadGlory, state.rank.name];
    }),
    [
      [0, 0, 0, "Rookie Pilot"],
      [299999, 0, 299999, "Solar Legend"],
      [300000, 1, 0, "Rookie Pilot"],
      [300001, 1, 1, "Rookie Pilot"],
      [600000, 2, 0, "Rookie Pilot"],
      [925000, 3, 25000, "Ace"]
    ]
  );
});

test("server run grants preserve overflow and emit terminal Prestige semantics", () => {
  const run = sanitizeRunReceipt({
    clientReceiptId: "prestige",
    score: 3000,
    phaseReached: 3,
    runDurationMs: 120000,
    enemiesKilled: 20,
    bossesKilled: 1,
    powerupsCollected: 2,
    ghostUses: 1,
    damageTaken: 0,
    highestCombo: 8
  });
  const profile = applyRunToProfile({ totalGlory: 299900 }, run);
  assert.equal(profile.totalGlory, 300200);
  assert.equal(profile.milestoneEvents.at(-1).type, "prestige");
  assert.equal(profile.milestoneEvents.at(-1).rankName, "Star Eternal");
  assert.equal(gloryRoadStateForTotal(profile.totalGlory).roadGlory, 200);
});

test("server multi-Prestige milestone detection is deterministic", () => {
  const events = gloryMilestonesCrossed(250000, 950000);
  assert.equal(events.filter((event) => event.type === "prestige").length, 3);
  assert.deepEqual(
    events.map((event) => event.absoluteThreshold),
    events.map((event) => event.absoluteThreshold).sort((a, b) => a - b)
  );
});

test("browser and dormant server Glory contracts remain in exact parity", () => {
  assert.equal(GLORY_ROAD_LENGTH, browserProgression.GLORY_ROAD_LENGTH);
  const serverRanks = require("../functions/progression").GLORY_RANKS;
  assert.deepEqual(serverRanks, browserProgression.GLORY_RANKS);
  for (const total of [0, 999, 1000, 299999, 300000, 301000, 600000, 925000, 3000123]) {
    const server = gloryRoadStateForTotal(total);
    const browser = browserProgression.gloryRoadStateForTotal(total);
    assert.deepEqual(
      [server.totalGlory, server.prestige, server.roadGlory, server.rank.name, server.displayRankName],
      [browser.totalGlory, browser.prestige, browser.roadGlory, browser.rank.name, browser.displayRankName]
    );
  }
});
