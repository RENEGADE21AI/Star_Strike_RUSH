const LOCAL_ACHIEVEMENTS_STORAGE_ID = "star_strike_rush_achievements_v1";

function normalizedAchievementIds(ids, validIds) {
  const valid = new Set(Array.isArray(validIds) ? validIds : []);
  const seen = new Set();
  return (Array.isArray(ids) ? ids : []).map((id) => String(id || "")).filter((id) => {
    if (!valid.has(id) || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

function loadLocalAchievementIds(storage, validIds) {
  try {
    return normalizedAchievementIds(
      JSON.parse(storage.getItem(LOCAL_ACHIEVEMENTS_STORAGE_ID) || "[]"),
      validIds
    );
  } catch {
    return [];
  }
}

function saveLocalAchievementIds(storage, ids, validIds) {
  const normalized = normalizedAchievementIds(ids, validIds);
  try { storage.setItem(LOCAL_ACHIEVEMENTS_STORAGE_ID, JSON.stringify(normalized)); } catch {}
  return normalized;
}

function mergeAchievementIds(localIds, onlineIds, validIds) {
  return normalizedAchievementIds(
    [...(Array.isArray(localIds) ? localIds : []), ...(Array.isArray(onlineIds) ? onlineIds : [])],
    validIds
  );
}

globalThis.loadLocalAchievementIds = loadLocalAchievementIds;
globalThis.saveLocalAchievementIds = saveLocalAchievementIds;
globalThis.mergeAchievementIds = mergeAchievementIds;
