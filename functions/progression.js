const GLORY_ROAD_LENGTH = 300000;

const GLORY_RANKS = [
  { threshold: 0, name: "Rookie Pilot" },
  { threshold: 1000, name: "Star Cadet" },
  { threshold: 3000, name: "Strike Pilot" },
  { threshold: 7500, name: "Void Runner" },
  { threshold: 15000, name: "Ace" },
  { threshold: 30000, name: "Elite Ace" },
  { threshold: 60000, name: "Phantom Hunter" },
  { threshold: 100000, name: "Wraithbreaker" },
  { threshold: 175000, name: "Solar Legend" },
  { threshold: 300000, name: "Star Eternal" }
];

const { ACHIEVEMENTS } = require("./achievement-catalog");

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function intValue(value, max = 999999999) {
  const n = Number(value || 0);
  if (!Number.isFinite(n)) return 0;
  return clamp(Math.floor(n), 0, max);
}

function safeText(value, fallback = "", maxLength = 60) {
  return String(value || fallback || "")
    .replace(/[^\w .'-]/g, "")
    .slice(0, maxLength);
}

function safeCallSign(value) {
  return String(value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9_]/g, "")
    .slice(0, 12);
}

function safeDocId(value, fallback = "item") {
  const text = String(value || fallback)
    .replace(/[^A-Za-z0-9_-]/g, "_")
    .slice(0, 80);
  return text || fallback;
}

function romanPrestige(value) {
  const prestige = intValue(value);
  if (prestige === 0) return "0";
  if (prestige > 3999) return prestige.toLocaleString("en-US");
  const numerals = [[1000, "M"], [900, "CM"], [500, "D"], [400, "CD"], [100, "C"], [90, "XC"], [50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]];
  let remaining = prestige;
  let result = "";
  for (const [amount, numeral] of numerals) {
    while (remaining >= amount) {
      result += numeral;
      remaining -= amount;
    }
  }
  return result;
}

function rankForRoadGlory(glory) {
  const total = intValue(glory) % GLORY_ROAD_LENGTH;
  let current = GLORY_RANKS[0];
  let index = 0;
  for (let i = 1; i < GLORY_RANKS.length - 1; i++) {
    if (total < GLORY_RANKS[i].threshold) break;
    current = GLORY_RANKS[i];
    index = i;
  }
  const next = GLORY_RANKS[index + 1];
  return { index, name: current.name, threshold: current.threshold, nextName: next.name, nextThreshold: next.threshold };
}

function gloryRoadStateForTotal(value) {
  const totalGlory = intValue(value);
  const prestige = Math.floor(totalGlory / GLORY_ROAD_LENGTH);
  const roadGlory = totalGlory % GLORY_ROAD_LENGTH;
  const rank = rankForRoadGlory(roadGlory);
  return {
    totalGlory,
    prestige,
    roadGlory,
    rank,
    displayRankName: prestige > 0 ? `${rank.name} ${romanPrestige(prestige + 1)}` : rank.name
  };
}

function gloryMilestoneDefinitions() {
  const definitions = [];
  for (let index = 0; index < GLORY_RANKS.length; index++) {
    const rank = GLORY_RANKS[index];
    if (rank.threshold > 0 && rank.threshold < GLORY_ROAD_LENGTH) {
      definitions.push({ type: "rank", threshold: rank.threshold, rankName: rank.name });
    }
    const next = GLORY_RANKS[index + 1];
    if (next) definitions.push({ type: "checkpoint", threshold: Math.floor(rank.threshold + (next.threshold - rank.threshold) * 0.5), rankName: "" });
  }
  definitions.push({ type: "prestige", threshold: GLORY_ROAD_LENGTH, rankName: "Star Eternal" });
  return definitions.sort((a, b) => a.threshold - b.threshold || (a.type === "prestige" ? 1 : -1));
}

const GLORY_MILESTONES = gloryMilestoneDefinitions();

function gloryMilestonesCrossed(beforeValue, afterValue) {
  const before = intValue(beforeValue);
  const after = Math.max(before, intValue(afterValue));
  if (after <= before) return [];
  const events = [];
  for (let cycle = Math.floor(before / GLORY_ROAD_LENGTH); cycle <= Math.floor(after / GLORY_ROAD_LENGTH); cycle++) {
    for (const milestone of GLORY_MILESTONES) {
      const absoluteThreshold = cycle * GLORY_ROAD_LENGTH + milestone.threshold;
      if (absoluteThreshold <= before || absoluteThreshold > after) continue;
      events.push({
        type: milestone.type,
        threshold: milestone.threshold,
        absoluteThreshold,
        prestigeCycle: cycle,
        prestigeAfter: milestone.type === "prestige" ? cycle + 1 : cycle,
        rankName: milestone.rankName
      });
    }
  }
  return events.sort((a, b) => a.absoluteThreshold - b.absoluteThreshold || (a.type === "prestige" ? 1 : -1));
}

function sanitizeRunReceipt(raw = {}) {
  return {
    clientReceiptId: safeDocId(raw.clientReceiptId || raw.receiptId, `run_${Date.now()}`),
    score: intValue(raw.score),
    phaseReached: Math.max(1, intValue(raw.phaseReached || raw.phase, 9999) || 1),
    runDurationMs: intValue(raw.runDurationMs, 86400000),
    enemiesKilled: intValue(raw.enemiesKilled, 1000000),
    bossesKilled: intValue(raw.bossesKilled, 1000000),
    powerupsCollected: intValue(raw.powerupsCollected, 1000000),
    ghostUses: intValue(raw.ghostUses, 1000000),
    damageTaken: intValue(raw.damageTaken, 1000000),
    highestCombo: intValue(raw.highestCombo, 1000000),
    clientVersion: safeText(raw.clientVersion, "web-v1", 20),
    callSign: safeCallSign(raw.callSign)
  };
}

function validateRunPlausibility(run) {
  const seconds = Math.max(1, run.runDurationMs / 1000);
  if (run.score > 0 && run.runDurationMs < 2500) return { ok: false, reason: "duration_too_short" };
  if (run.runDurationMs > 86400000) return { ok: false, reason: "duration_too_long" };
  if (run.phaseReached > 3 + Math.floor(seconds / 12)) return { ok: false, reason: "phase_too_high" };
  if (run.enemiesKilled > 40 + Math.floor(seconds * 10)) return { ok: false, reason: "kills_too_high" };
  if (run.bossesKilled > 2 + Math.floor(seconds / 20) + Math.ceil(run.phaseReached / 2)) return { ok: false, reason: "bosses_too_high" };
  if (run.powerupsCollected > 30 + Math.floor(seconds * 2) + run.enemiesKilled) return { ok: false, reason: "powerups_too_high" };
  if (run.ghostUses > 20 + Math.floor(seconds * 5)) return { ok: false, reason: "ghost_uses_too_high" };
  if (run.highestCombo > Math.max(run.enemiesKilled, 1)) return { ok: false, reason: "combo_too_high" };
  const scoreCeiling = 25000 + Math.floor(seconds * 2500) + run.enemiesKilled * 900 + run.bossesKilled * 3500 + run.phaseReached * 5000;
  if (run.score > scoreCeiling) return { ok: false, reason: "score_too_high" };
  return { ok: true, reason: "" };
}

function computeRunGrants(run) {
  return {
    gloryGained: Math.floor(run.score / 10)
  };
}

function defaultProfile() {
  return {
    totalGlory: 0,
    lifetimeRuns: 0,
    lifetimeScore: 0,
    lifetimeKills: 0,
    lifetimePowerups: 0,
    lifetimeGhostUses: 0,
    lifetimeBosses: 0,
    lifetimeDamageTaken: 0,
    highestCombo: 0,
    bestScore: 0,
    phase: 1
  };
}

function normalizeProfile(profile = {}) {
  const base = defaultProfile();
  base.totalGlory = intValue(profile.totalGlory ?? profile.glory);
  base.lifetimeRuns = intValue(profile.lifetimeRuns, 1000000);
  base.lifetimeScore = intValue(profile.lifetimeScore);
  base.lifetimeKills = intValue(profile.lifetimeKills, 1000000);
  base.lifetimePowerups = intValue(profile.lifetimePowerups, 1000000);
  base.lifetimeGhostUses = intValue(profile.lifetimeGhostUses, 1000000);
  base.lifetimeBosses = intValue(profile.lifetimeBosses, 1000000);
  base.lifetimeDamageTaken = intValue(profile.lifetimeDamageTaken, 1000000);
  base.highestCombo = intValue(profile.highestCombo, 1000000);
  base.bestScore = intValue(profile.bestScore);
  base.phase = Math.max(1, intValue(profile.phase || profile.bestPhase, 9999) || 1);
  return base;
}

function runMeetsAchievement(run, achievement, profile = {}) {
  if (achievement.minScore && run.score < achievement.minScore) return false;
  if (achievement.minPhase && run.phaseReached < achievement.minPhase) return false;
  if (achievement.minBosses && run.bossesKilled < achievement.minBosses) return false;
  if (achievement.minGhostUses && run.ghostUses < achievement.minGhostUses) return false;
  if (achievement.minPowerups && run.powerupsCollected < achievement.minPowerups) return false;
  if (achievement.minKills && run.enemiesKilled < achievement.minKills) return false;
  if (achievement.minCombo && run.highestCombo < achievement.minCombo) return false;
  if (achievement.minRunDurationMs && run.runDurationMs < achievement.minRunDurationMs) return false;
  if (Number.isFinite(achievement.maxDamageTaken) && run.damageTaken > achievement.maxDamageTaken) return false;
  if (achievement.minLifetimeRuns && profile.lifetimeRuns < achievement.minLifetimeRuns) return false;
  if (achievement.minLifetimeScore && profile.lifetimeScore < achievement.minLifetimeScore) return false;
  if (achievement.minLifetimeKills && profile.lifetimeKills < achievement.minLifetimeKills) return false;
  if (achievement.minLifetimePowerups && profile.lifetimePowerups < achievement.minLifetimePowerups) return false;
  if (achievement.minLifetimeGhostUses && profile.lifetimeGhostUses < achievement.minLifetimeGhostUses) return false;
  if (achievement.minLifetimeBosses && profile.lifetimeBosses < achievement.minLifetimeBosses) return false;
  return true;
}

function earnedAchievementIdsForRun(run, profile = null) {
  const lifetime = profile || {
    lifetimeRuns: 1,
    lifetimeScore: run.score,
    lifetimeKills: run.enemiesKilled,
    lifetimePowerups: run.powerupsCollected,
    lifetimeGhostUses: run.ghostUses,
    lifetimeBosses: run.bossesKilled
  };
  return ACHIEVEMENTS.filter((achievement) => runMeetsAchievement(run, achievement, lifetime)).map((achievement) => achievement.id);
}

function achievementTitle(achievementId) {
  const match = ACHIEVEMENTS.find((achievement) => achievement.id === achievementId);
  return match ? match.name : achievementId;
}

function applyRunToProfile(profile, run) {
  const next = normalizeProfile(profile);
  const grants = computeRunGrants(run);
  const gloryBefore = next.totalGlory;
  next.totalGlory += grants.gloryGained;
  next.lifetimeRuns += 1;
  next.lifetimeScore += run.score;
  next.lifetimeKills += run.enemiesKilled;
  next.lifetimePowerups += run.powerupsCollected;
  next.lifetimeGhostUses += run.ghostUses;
  next.lifetimeBosses += run.bossesKilled;
  next.lifetimeDamageTaken += run.damageTaken;
  next.highestCombo = Math.max(next.highestCombo, run.highestCombo);
  next.bestScore = Math.max(next.bestScore, run.score);
  next.phase = Math.max(next.phase, run.phaseReached);
  next.grants = grants;
  next.milestoneEvents = gloryMilestonesCrossed(gloryBefore, next.totalGlory);
  next.earnedAchievementIds = earnedAchievementIdsForRun(run, next);
  return next;
}

function publicProfileFromPrivate(profile) {
  const normalized = normalizeProfile(profile);
  const road = gloryRoadStateForTotal(normalized.totalGlory);
  return {
    ...normalized,
    prestige: road.prestige,
    roadGlory: road.roadGlory,
    gloryRank: road.rank.name,
    gloryRankDisplay: road.displayRankName,
    gloryRankIndex: road.rank.index
  };
}

module.exports = {
  ACHIEVEMENTS,
  GLORY_MILESTONES,
  GLORY_RANKS,
  GLORY_ROAD_LENGTH,
  applyRunToProfile,
  achievementTitle,
  computeRunGrants,
  earnedAchievementIdsForRun,
  gloryMilestonesCrossed,
  gloryRoadStateForTotal,
  normalizeProfile,
  publicProfileFromPrivate,
  rankForRoadGlory,
  romanPrestige,
  safeCallSign,
  safeDocId,
  safeText,
  sanitizeRunReceipt,
  validateRunPlausibility
};
