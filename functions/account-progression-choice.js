"use strict";

const { normalizeProfile } = require("./progression");

function accountProfileFromClient(raw = {}) {
  const lifetime = raw && raw.lifetime && typeof raw.lifetime === "object" ? raw.lifetime : {};
  return normalizeProfile({
    totalGlory: raw.totalGlory,
    lifetimeRuns: lifetime.runs,
    lifetimeScore: lifetime.score,
    lifetimeKills: lifetime.kills,
    lifetimePowerups: lifetime.powerups,
    lifetimeGhostUses: lifetime.ghostUses,
    lifetimeBosses: lifetime.bosses,
    lifetimeDamageTaken: lifetime.damageTaken,
    highestCombo: lifetime.highestCombo,
    bestScore: lifetime.bestScore,
    phase: lifetime.bestPhase
  });
}

function profileHasProgress(profile) {
  const normalized = normalizeProfile(profile);
  return normalized.totalGlory > 0 || normalized.lifetimeRuns > 0 || normalized.lifetimeScore > 0 ||
    normalized.lifetimeKills > 0 || normalized.lifetimePowerups > 0 || normalized.lifetimeGhostUses > 0 ||
    normalized.lifetimeBosses > 0 || normalized.bestScore > 0 || normalized.phase > 1;
}

function profileFingerprint(profile) {
  const normalized = normalizeProfile(profile);
  return JSON.stringify(normalized);
}

function accountProgressionChoiceState(deviceProfile, accountProfile) {
  const deviceMeaningful = profileHasProgress(deviceProfile);
  const accountMeaningful = profileHasProgress(accountProfile);
  if (!deviceMeaningful && !accountMeaningful) return { kind: "empty", deviceMeaningful, accountMeaningful };
  if (deviceMeaningful && !accountMeaningful) return { kind: "device_only", deviceMeaningful, accountMeaningful };
  if (!deviceMeaningful && accountMeaningful) return { kind: "account_only", deviceMeaningful, accountMeaningful };
  return {
    kind: profileFingerprint(deviceProfile) === profileFingerprint(accountProfile) ? "same" : "conflict",
    deviceMeaningful,
    accountMeaningful
  };
}

function replacementProfileForChoice(choice, deviceProfile, accountProfile) {
  if (choice !== "device" && choice !== "account") throw new TypeError("Progression choice must be device or account.");
  return normalizeProfile(choice === "device" ? deviceProfile : accountProfile);
}

module.exports = {
  accountProfileFromClient,
  accountProgressionChoiceState,
  profileFingerprint,
  profileHasProgress,
  replacementProfileForChoice
};
