const DEVICE_PROGRESSION_STORAGE_KEYS = Object.freeze([
  "star_strike_rush_high_score_v1",
  "star_strike_rush_meta_v1",
  "star_strike_rush_achievements_v1",
  "star_strike_rush_codex_v1",
  "star_strike_rush_last_run_v1"
]);

function progressionComparable(raw = {}) {
  const lifetime = raw && raw.lifetime && typeof raw.lifetime === "object" ? raw.lifetime : {};
  const number = (value, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.max(fallback, Math.floor(parsed)) : fallback;
  };
  return {
    totalGlory: number(raw.totalGlory),
    lifetime: {
      runs: number(lifetime.runs),
      score: number(lifetime.score),
      kills: number(lifetime.kills),
      powerups: number(lifetime.powerups),
      ghostUses: number(lifetime.ghostUses),
      bosses: number(lifetime.bosses),
      damageTaken: number(lifetime.damageTaken),
      highestCombo: number(lifetime.highestCombo),
      bestScore: number(lifetime.bestScore),
      bestPhase: number(lifetime.bestPhase, 1)
    }
  };
}

function progressionIsMeaningful(raw) {
  const profile = progressionComparable(raw);
  return profile.totalGlory > 0 || profile.lifetime.runs > 0 || profile.lifetime.score > 0 ||
    profile.lifetime.kills > 0 || profile.lifetime.powerups > 0 || profile.lifetime.ghostUses > 0 ||
    profile.lifetime.bosses > 0 || profile.lifetime.bestScore > 0 || profile.lifetime.bestPhase > 1;
}

function progressionSelectionKind(deviceProgress, accountProgression) {
  const deviceMeaningful = progressionIsMeaningful(deviceProgress);
  const accountMeaningful = progressionIsMeaningful(accountProgression);
  if (!deviceMeaningful && !accountMeaningful) return "empty";
  if (deviceMeaningful && !accountMeaningful) return "device_only";
  if (!deviceMeaningful && accountMeaningful) return "account_only";
  return JSON.stringify(progressionComparable(deviceProgress)) === JSON.stringify(progressionComparable(accountProgression))
    ? "same"
    : "conflict";
}

function clearDeviceProgressionStorage(storage) {
  if (!storage || typeof storage.removeItem !== "function") return false;
  let succeeded = true;
  for (const key of DEVICE_PROGRESSION_STORAGE_KEYS) {
    try { storage.removeItem(key); } catch { succeeded = false; }
  }
  return succeeded;
}

globalThis.DEVICE_PROGRESSION_STORAGE_KEYS = DEVICE_PROGRESSION_STORAGE_KEYS;
globalThis.progressionComparable = progressionComparable;
globalThis.progressionIsMeaningful = progressionIsMeaningful;
globalThis.progressionSelectionKind = progressionSelectionKind;
globalThis.clearDeviceProgressionStorage = clearDeviceProgressionStorage;

