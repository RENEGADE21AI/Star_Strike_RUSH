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

function profilePriority(profile, achievementCount = 0, codexCount = 0) {
  const normalized = normalizeProfile(profile);
  return [
    normalized.totalGlory,
    normalized.bestScore,
    Math.max(0, Math.floor(Number(achievementCount) || 0)),
    normalized.phase,
    normalized.lifetimeScore,
    normalized.lifetimeBosses,
    normalized.lifetimeKills,
    normalized.lifetimeRuns,
    Math.max(0, Math.floor(Number(codexCount) || 0))
  ];
}

function bestProgressionSource(deviceProfile, accountProfile, details = {}) {
  const devicePriority = profilePriority(deviceProfile, details.deviceAchievementCount, details.deviceCodexCount);
  const accountPriority = profilePriority(accountProfile, details.accountAchievementCount, details.accountCodexCount);
  for (let index = 0; index < devicePriority.length; index++) {
    if (devicePriority[index] > accountPriority[index]) return "device";
    if (accountPriority[index] > devicePriority[index]) return "account";
  }
  return "account";
}

function replacementProfileForChoice(choice, deviceProfile, accountProfile) {
  if (choice !== "device" && choice !== "account") throw new TypeError("Progression choice must be device or account.");
  return normalizeProfile(choice === "device" ? deviceProfile : accountProfile);
}

module.exports = {
  accountProfileFromClient,
  bestProgressionSource,
  profilePriority,
  replacementProfileForChoice
};
