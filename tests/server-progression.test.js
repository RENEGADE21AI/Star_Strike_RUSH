const assert = require("node:assert/strict");

const {
  applyRunToProfile,
  applySeasonRewardToProfile,
  computeRunGrants,
  earnedAchievementIdsForRun,
  sanitizeRunReceipt,
  validateRunPlausibility
} = require("../functions/progression");

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
    seasonXPGained: 170,
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
    glory: 900,
    currentSeasonXP: 980,
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
    phase: 2,
    seasonClaimedRewardIds: []
  }, run);

  assert.equal(profile.glory, 1900);
  assert.equal(profile.currentSeasonXP, 1486);
  assert.equal(profile.currentSeasonTier, 2);
  assert.equal(profile.credits, 224);
  assert.equal(profile.lifetimeRuns, 3);
  assert.equal(profile.bestScore, 10000);
  assert.equal(profile.phase, 8);
  assert.ok(profile.earnedAchievementIds.includes("mythic_score"));
  assert.ok(profile.earnedAchievementIds.includes("phase_eight"));
  assert.ok(profile.earnedAchievementIds.includes("boss_hunter"));
});

test("server reward claims are idempotent and apply real reward values", () => {
  const first = applySeasonRewardToProfile({
    glory: 0,
    currentSeasonXP: 2000,
    currentSeasonTier: 3,
    credits: 0,
    seasonClaimedRewardIds: []
  }, "s01_supply_01");
  const second = applySeasonRewardToProfile(first.profile, "s01_supply_01");

  assert.equal(first.ok, true);
  assert.equal(first.profile.credits, 100);
  assert.deepEqual(first.profile.seasonClaimedRewardIds, ["s01_supply_01"]);
  assert.equal(second.ok, false);
  assert.equal(second.reason, "already_claimed");
  assert.equal(second.profile.credits, 100);
});

test("locked server reward claims do not mutate profile balances", () => {
  const claim = applySeasonRewardToProfile({
    glory: 0,
    currentSeasonXP: 0,
    currentSeasonTier: 1,
    credits: 0,
    seasonClaimedRewardIds: []
  }, "s01_flight_04");

  assert.equal(claim.ok, false);
  assert.equal(claim.reason, "locked");
  assert.equal(claim.profile.currentSeasonXP, 0);
  assert.equal(claim.profile.credits, 0);
});
