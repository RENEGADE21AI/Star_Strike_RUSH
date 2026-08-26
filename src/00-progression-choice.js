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
    achievementCount: number(raw.achievementCount != null ? raw.achievementCount : Array.isArray(raw.achievementIds) ? raw.achievementIds.length : 0),
    codexCount: number(raw.codexCount != null ? raw.codexCount : Array.isArray(raw.codexDiscoveries) ? raw.codexDiscoveries.length : 0),
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

function progressionPriority(raw = {}) {
  const profile = progressionComparable(raw);
  return [
    profile.totalGlory,
    profile.lifetime.bestScore,
    profile.achievementCount,
    profile.lifetime.bestPhase,
    profile.lifetime.score,
    profile.lifetime.bosses,
    profile.lifetime.kills,
    profile.lifetime.runs,
    profile.codexCount
  ];
}

function bestProgressionSource(deviceProgress, accountProgression) {
  const devicePriority = progressionPriority(deviceProgress);
  const accountPriority = progressionPriority(accountProgression);
  for (let index = 0; index < devicePriority.length; index++) {
    if (devicePriority[index] > accountPriority[index]) return "device";
    if (accountPriority[index] > devicePriority[index]) return "account";
  }
  return "account";
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
globalThis.progressionPriority = progressionPriority;
globalThis.bestProgressionSource = bestProgressionSource;
globalThis.clearDeviceProgressionStorage = clearDeviceProgressionStorage;

