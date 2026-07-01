const CURRENT_SEASON_ID = "season_01";
const CURRENT_SEASON_NAME = "Launch Flight";
const SEASON_TIER_XP = 1000;
const ROAD_SEASON_TIERS = 50;

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

const ACHIEVEMENTS = [
  { id: "first_sortie", name: "First Sortie" },
  { id: "rookie_score", name: "Rookie Ace", minScore: 250 },
  { id: "ace_score", name: "Ace Pilot", minScore: 1000 },
  { id: "legend_score", name: "Legend Run", minScore: 3000 },
  { id: "surge_score", name: "Score Surge", minScore: 6000 },
  { id: "mythic_score", name: "Mythic Rush", minScore: 10000 },
  { id: "phase_two", name: "Phase Runner", minPhase: 2 },
  { id: "phase_three", name: "Deep Strike", minPhase: 3 },
  { id: "phase_eight", name: "Wraith Contact", minPhase: 8 },
  { id: "phase_twelve", name: "Expansion Front", minPhase: 12 },
  { id: "boss_breaker", name: "Boss Breaker", minBosses: 1 },
  { id: "boss_hunter", name: "Boss Hunter", minBosses: 3 },
  { id: "ghost_runner", name: "Ghost Runner", minGhostUses: 3 },
  { id: "collector", name: "Collector", minPowerups: 3 },
  { id: "power_hungry", name: "Power Hungry", minPowerups: 8 },
  { id: "swarm_clearer", name: "Swarm Clearer", minKills: 25 }
];

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

function currentSeasonTierForXP(xp) {
  return clamp(1 + Math.floor(intValue(xp) / SEASON_TIER_XP), 1, ROAD_SEASON_TIERS);
}

function rankForGlory(glory) {
  const total = intValue(glory);
  let current = GLORY_RANKS[0];
  let index = 0;
  for (let i = 1; i < GLORY_RANKS.length; i++) {
    if (total < GLORY_RANKS[i].threshold) break;
    current = GLORY_RANKS[i];
    index = i;
  }
  return { index, name: current.name };
}

function seasonReward(id, type, amount, name) {
  return { id, type, amount, name };
}

function buildSeasonRewardTable() {
  const rows = [];
  for (let tier = 1; tier <= ROAD_SEASON_TIERS; tier++) {
    const pad = String(tier).padStart(2, "0");
    const milestone = tier % 5 === 0;
    const flightAmount = milestone ? 180 + tier * 18 : 45 + tier * 7;
    const supplyAmount = milestone ? 320 + tier * 22 : 90 + tier * 10;
    const flight = milestone
      ? seasonReward(`s01_flight_${pad}`, "glory_cache", flightAmount, `${flightAmount} Glory Cache`)
      : seasonReward(`s01_flight_${pad}`, "season_xp_cache", flightAmount, `${flightAmount} Season XP`);
    const supply = seasonReward(`s01_supply_${pad}`, "credits", supplyAmount, `${supplyAmount} Credits`);
    rows.push({ tier, flight, supply });
  }
  return rows;
}

const SEASON_REWARDS = buildSeasonRewardTable();

function findSeasonReward(rewardId) {
  const id = safeDocId(rewardId, "");
  for (const row of SEASON_REWARDS) {
    if (row.flight.id === id) return { tier: row.tier, lane: "flight", reward: row.flight };
    if (row.supply.id === id) return { tier: row.tier, lane: "supply", reward: row.supply };
  }
  return null;
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
    gloryGained: Math.floor(run.score / 10),
    seasonXPGained: clamp(Math.floor(run.score / 45) + run.phaseReached * 8 + run.bossesKilled * 60 + run.powerupsCollected * 5, 0, 2500),
    creditsEarned: clamp(Math.floor(run.score / 120) + run.phaseReached * 2 + run.bossesKilled * 25, 0, 1500)
  };
}

function defaultProfile() {
  return {
    glory: 0,
    currentSeasonId: CURRENT_SEASON_ID,
    currentSeasonXP: 0,
    currentSeasonTier: 1,
    credits: 0,
    lifetimeRuns: 0,
    lifetimeScore: 0,
    lifetimeKills: 0,
    lifetimePowerups: 0,
    lifetimeGhostUses: 0,
    lifetimeBosses: 0,
    lifetimeDamageTaken: 0,
    highestCombo: 0,
    bestScore: 0,
    phase: 1,
    seasonClaimedRewardIds: []
  };
}

function normalizeProfile(profile = {}) {
  const base = defaultProfile();
  base.glory = intValue(profile.glory);
  base.currentSeasonId = safeDocId(profile.currentSeasonId || CURRENT_SEASON_ID, CURRENT_SEASON_ID).slice(0, 40);
  base.currentSeasonXP = intValue(profile.currentSeasonXP);
  base.currentSeasonTier = currentSeasonTierForXP(base.currentSeasonXP);
  base.credits = intValue(profile.credits);
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
  base.seasonClaimedRewardIds = Array.isArray(profile.seasonClaimedRewardIds)
    ? Array.from(new Set(profile.seasonClaimedRewardIds.map((id) => safeDocId(id, "")).filter(Boolean))).slice(0, 220)
    : [];
  if (base.currentSeasonId !== CURRENT_SEASON_ID) {
    base.currentSeasonId = CURRENT_SEASON_ID;
    base.currentSeasonXP = 0;
    base.currentSeasonTier = 1;
    base.seasonClaimedRewardIds = [];
  }
  return base;
}

function runMeetsAchievement(run, achievement) {
  if (achievement.minScore && run.score < achievement.minScore) return false;
  if (achievement.minPhase && run.phaseReached < achievement.minPhase) return false;
  if (achievement.minBosses && run.bossesKilled < achievement.minBosses) return false;
  if (achievement.minGhostUses && run.ghostUses < achievement.minGhostUses) return false;
  if (achievement.minPowerups && run.powerupsCollected < achievement.minPowerups) return false;
  if (achievement.minKills && run.enemiesKilled < achievement.minKills) return false;
  return true;
}

function earnedAchievementIdsForRun(run) {
  return ACHIEVEMENTS.filter((achievement) => runMeetsAchievement(run, achievement)).map((achievement) => achievement.id);
}

function achievementTitle(achievementId) {
  const match = ACHIEVEMENTS.find((achievement) => achievement.id === achievementId);
  return match ? match.name : achievementId;
}

function applyRunToProfile(profile, run) {
  const next = normalizeProfile(profile);
  const grants = computeRunGrants(run);
  next.glory += grants.gloryGained;
  next.currentSeasonXP += grants.seasonXPGained;
  next.currentSeasonTier = currentSeasonTierForXP(next.currentSeasonXP);
  next.credits += grants.creditsEarned;
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
  next.earnedAchievementIds = earnedAchievementIdsForRun(run);
  return next;
}

function applySeasonRewardToProfile(profile, rewardId) {
  const next = normalizeProfile(profile);
  const found = findSeasonReward(rewardId);
  if (!found) return { ok: false, reason: "unknown_reward", profile: next };
  if (next.seasonClaimedRewardIds.includes(found.reward.id)) {
    return { ok: false, reason: "already_claimed", reward: found.reward, profile: next };
  }
  if (found.tier > next.currentSeasonTier) {
    return { ok: false, reason: "locked", reward: found.reward, profile: next };
  }
  if (found.reward.type === "credits") next.credits += found.reward.amount;
  else if (found.reward.type === "glory_cache") next.glory += found.reward.amount;
  else if (found.reward.type === "season_xp_cache") {
    next.currentSeasonXP += found.reward.amount;
    next.currentSeasonTier = currentSeasonTierForXP(next.currentSeasonXP);
  }
  next.seasonClaimedRewardIds = Array.from(new Set([...next.seasonClaimedRewardIds, found.reward.id])).slice(0, 220);
  return { ok: true, reason: "claimed", reward: found.reward, tier: found.tier, lane: found.lane, profile: next };
}

function publicProfileFromPrivate(profile) {
  const normalized = normalizeProfile(profile);
  const rank = rankForGlory(normalized.glory);
  return {
    ...normalized,
    currentSeasonName: CURRENT_SEASON_NAME,
    gloryRank: rank.name,
    gloryRankIndex: rank.index,
    seasonXP: normalized.currentSeasonXP,
    seasonTier: normalized.currentSeasonTier,
    totalGlory: normalized.glory
  };
}

module.exports = {
  ACHIEVEMENTS,
  CURRENT_SEASON_ID,
  CURRENT_SEASON_NAME,
  SEASON_TIER_XP,
  applyRunToProfile,
  applySeasonRewardToProfile,
  achievementTitle,
  computeRunGrants,
  currentSeasonTierForXP,
  earnedAchievementIdsForRun,
  findSeasonReward,
  normalizeProfile,
  publicProfileFromPrivate,
  rankForGlory,
  safeCallSign,
  safeDocId,
  safeText,
  sanitizeRunReceipt,
  validateRunPlausibility
};
