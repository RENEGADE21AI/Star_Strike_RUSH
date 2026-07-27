const { normalizeProfile } = require("./progression");

function nonNegativeInteger(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.floor(number)) : fallback;
}

function accountArchiveMeta(privateData = {}) {
  return normalizeProfile(privateData && typeof privateData === "object" ? privateData : {});
}

function legacyRecord(publicData = {}, leaderboardData = {}) {
  const legacyBestScore = Math.max(
    nonNegativeInteger(publicData.legacyBestScore),
    nonNegativeInteger(publicData.bestScore),
    nonNegativeInteger(leaderboardData.legacyBestScore),
    nonNegativeInteger(leaderboardData.bestScore)
  );
  const legacyPhase = Math.max(
    1,
    nonNegativeInteger(publicData.legacyPhase, 1),
    nonNegativeInteger(publicData.phase, 1),
    nonNegativeInteger(leaderboardData.legacyPhase, 1),
    nonNegativeInteger(leaderboardData.phase, 1)
  );
  const verifiedBestScore = nonNegativeInteger(publicData.verifiedBestScore);
  const verifiedPhase = Math.max(1, nonNegativeInteger(publicData.verifiedPhase, 1));
  return {
    legacyBestScore,
    verifiedBestScore,
    legacyPhase,
    verifiedPhase,
    recordTrust: legacyBestScore > 0 || legacyPhase > 1 ? "legacy_unverified" : "no_record"
  };
}

function buildProfileArchive(privateData = {}, publicData = {}, leaderboardData = {}) {
  return {
    accountArchiveMeta: accountArchiveMeta(privateData),
    legacyRecord: legacyRecord(publicData, leaderboardData)
  };
}

module.exports = {
  accountArchiveMeta,
  buildProfileArchive,
  legacyRecord,
  nonNegativeInteger
};
