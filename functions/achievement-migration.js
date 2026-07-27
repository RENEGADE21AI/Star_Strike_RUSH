const { ACHIEVEMENT_SCHEMA_VERSION, ACHIEVEMENTS } = require("./achievement-catalog");

const KNOWN_ACHIEVEMENT_IDS = new Set(ACHIEVEMENTS.map((achievement) => achievement.id));

function validAchievementId(value) {
  const id = String(value || "").replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 80);
  return KNOWN_ACHIEVEMENT_IDS.has(id) ? id : "";
}

function normalizedIds(values) {
  return Array.from(new Set((Array.isArray(values) ? values : []).map(validAchievementId).filter(Boolean))).sort();
}

function aggregateFromUnlockDocuments(existingAggregate = {}, unlockDocuments = [], migratedAt = null) {
  const existingIds = normalizedIds(existingAggregate.ids);
  const sourceIds = normalizedIds(unlockDocuments.map((document) => (
    document && (document.achievementId || document.id)
  )));
  const ids = Array.from(new Set([...existingIds, ...sourceIds])).sort();
  const existingCount = Math.max(0, Math.floor(Number(existingAggregate.count || 0)));
  const count = Math.max(existingCount, ids.length);
  const sourceCount = sourceIds.length;
  const schemaVersion = ACHIEVEMENT_SCHEMA_VERSION;
  const changed = (
    JSON.stringify(existingIds) !== JSON.stringify(ids) ||
    existingCount !== count ||
    Number(existingAggregate.sourceCount || 0) !== sourceCount ||
    Number(existingAggregate.schemaVersion || 0) !== schemaVersion
  );
  return {
    changed,
    aggregate: {
      ids,
      count,
      schemaVersion,
      sourceCount,
      migratedAt: changed ? migratedAt : (existingAggregate.migratedAt || migratedAt)
    },
    sourceIds,
    ignoredSourceCount: Math.max(0, unlockDocuments.length - sourceIds.length)
  };
}

module.exports = {
  ACHIEVEMENT_SCHEMA_VERSION,
  KNOWN_ACHIEVEMENT_IDS,
  aggregateFromUnlockDocuments,
  normalizedIds,
  validAchievementId
};
