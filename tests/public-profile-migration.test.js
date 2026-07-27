const assert = require("node:assert/strict");
const test = require("node:test");

const profileArchive = require("../functions/profile-archive");

const obsoleteFields = [
  "uid",
  "bestScore",
  "phase",
  "glory",
  "gloryRank",
  "gloryRankIndex",
  "seasonTier",
  "achievementsCount"
];

function migrate(publicData, leaderboardData = {}) {
  return profileArchive.buildPublicProfileMigration(publicData, leaderboardData, {
    uid: "account-a",
    requestedCallSign: "",
    publicPilotId: "pilot_public_a"
  });
}

test("public profile migration preserves legacy meaning before deleting every ambiguous field", () => {
  assert.equal(typeof profileArchive.buildPublicProfileMigration, "function");

  const oldOnly = migrate({
    uid: "account-a",
    callSign: "NOVA_7",
    handle: "nova_7",
    bestScore: 700,
    phase: 4,
    glory: 99,
    gloryRank: "Ace",
    gloryRankIndex: 4,
    seasonTier: 9,
    achievementsCount: 7
  });
  assert.equal(oldOnly.changed, true);
  assert.equal(oldOnly.canonical.legacyBestScore, 700);
  assert.equal(oldOnly.canonical.legacyPhase, 4);
  assert.equal(oldOnly.canonical.verifiedBestScore, 0);
  assert.equal(oldOnly.canonical.verifiedPhase, 1);
  assert.equal(oldOnly.canonical.achievementArchiveCount, 7);
  assert.deepEqual(oldOnly.obsoleteFields, obsoleteFields);

  const mixed = migrate({
    uid: "account-a",
    callSign: "NOVA_7",
    handle: "nova_7",
    bestScore: 900,
    phase: 5,
    legacyBestScore: 800,
    legacyPhase: 3,
    verifiedBestScore: 100,
    verifiedPhase: 2,
    recordTrust: "verified_run_session",
    achievementArchiveCount: 8,
    achievementsCount: 11
  }, {
    bestScore: 1200,
    phase: 8,
    achievementsCount: 12
  });
  assert.equal(mixed.canonical.legacyBestScore, 1200);
  assert.equal(mixed.canonical.legacyPhase, 8);
  assert.equal(mixed.canonical.verifiedBestScore, 100);
  assert.equal(mixed.canonical.verifiedPhase, 2);
  assert.equal(mixed.canonical.recordTrust, "legacy_unverified");
  assert.equal(mixed.canonical.achievementArchiveCount, 12);

  const repeated = migrate(mixed.canonical, {
    bestScore: 1200,
    phase: 8,
    achievementsCount: 12
  });
  assert.equal(repeated.changed, false);
  assert.deepEqual(repeated.canonical, mixed.canonical);
  for (const field of obsoleteFields) assert.equal(field in repeated.canonical, false, field);
});
