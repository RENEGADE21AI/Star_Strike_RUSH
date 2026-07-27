const crypto = require("node:crypto");
const { normalizeProfile } = require("./progression");

const OBSOLETE_PUBLIC_PROFILE_FIELDS = Object.freeze([
  "uid",
  "bestScore",
  "phase",
  "glory",
  "gloryRank",
  "gloryRankIndex",
  "seasonTier",
  "achievementsCount"
]);

function nonNegativeInteger(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.floor(number)) : fallback;
}

function publicCallSign(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_")
    .replace(/[^A-Z0-9_]/g, "")
    .slice(0, 12);
}

function publicHandle(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/^@+/, "")
    .replace(/[\s-]+/g, "_")
    .replace(/[^a-z0-9_]/g, "")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 16);
}

function publicPilotIdFor(uid) {
  const normalizedUid = String(uid || "").slice(0, 128);
  if (!normalizedUid) return "";
  return `pilot_${crypto.createHash("sha256")
    .update(`star-strike-rush-public-pilot-v1:${normalizedUid}`)
    .digest("hex")
    .slice(0, 20)}`;
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

function buildPublicProfileMigration(publicData = {}, leaderboardData = {}, options = {}) {
  const archive = legacyRecord(publicData, leaderboardData);
  const achievementArchiveCount = Math.min(
    79,
    Math.max(
      nonNegativeInteger(publicData.achievementArchiveCount),
      nonNegativeInteger(publicData.achievementsCount),
      nonNegativeInteger(leaderboardData.achievementArchiveCount),
      nonNegativeInteger(leaderboardData.achievementsCount),
      nonNegativeInteger(options.achievementArchiveCount)
    )
  );
  const canonical = {
    publicPilotId: String(
      options.publicPilotId ||
      publicData.publicPilotId ||
      publicPilotIdFor(options.uid || publicData.uid)
    ).slice(0, 40),
    callSign: publicCallSign(options.requestedCallSign || publicData.callSign),
    handle: publicHandle(publicData.handle),
    legacyBestScore: archive.legacyBestScore,
    legacyPhase: archive.legacyPhase,
    verifiedBestScore: archive.verifiedBestScore,
    verifiedPhase: archive.verifiedPhase,
    recordTrust: archive.recordTrust,
    achievementArchiveCount,
    createdAt: publicData.createdAt || null,
    updatedAt: publicData.updatedAt || null
  };
  const comparableExisting = Object.fromEntries(
    Object.keys(canonical).map((key) => [key, publicData[key] ?? null])
  );
  const changed = (
    OBSOLETE_PUBLIC_PROFILE_FIELDS.some((field) => Object.prototype.hasOwnProperty.call(publicData, field)) ||
    JSON.stringify(comparableExisting) !== JSON.stringify(canonical)
  );
  return {
    changed,
    canonical,
    obsoleteFields: OBSOLETE_PUBLIC_PROFILE_FIELDS.slice()
  };
}

module.exports = {
  OBSOLETE_PUBLIC_PROFILE_FIELDS,
  accountArchiveMeta,
  buildProfileArchive,
  buildPublicProfileMigration,
  legacyRecord,
  nonNegativeInteger,
  publicPilotIdFor
};
