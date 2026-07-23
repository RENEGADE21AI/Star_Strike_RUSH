const ACHIEVEMENT_DEFINITIONS = [
  { id: "first_sortie", name: "First Sortie", description: "Finish one run." },
  { id: "rookie_score", name: "Rookie Ace", description: "Score 250 points.", minScore: 250 },
  { id: "ace_score", name: "Ace Pilot", description: "Score 1,000 points.", minScore: 1000 },
  { id: "legend_score", name: "Legend Run", description: "Score 3,000 points.", minScore: 3000 },
  { id: "surge_score", name: "Score Surge", description: "Score 6,000 points.", minScore: 6000 },
  { id: "mythic_score", name: "Mythic Rush", description: "Score 10,000 points.", minScore: 10000 },
  { id: "phase_two", name: "Phase Runner", description: "Reach phase 2.", minPhase: 2 },
  { id: "phase_three", name: "Deep Strike", description: "Reach phase 3.", minPhase: 3 },
  { id: "phase_eight", name: "Wraith Contact", description: "Reach phase 8.", minPhase: 8 },
  { id: "phase_twelve", name: "Expansion Front", description: "Reach phase 12.", minPhase: 12 },
  { id: "boss_breaker", name: "Boss Breaker", description: "Destroy a boss.", minBosses: 1 },
  { id: "boss_hunter", name: "Boss Hunter", description: "Destroy 3 bosses in one run.", minBosses: 3 },
  { id: "ghost_runner", name: "Ghost Runner", description: "Use ghost shift 3 times.", minGhostUses: 3 },
  { id: "collector", name: "Collector", description: "Collect 3 powerups.", minPowerups: 3 },
  { id: "power_hungry", name: "Power Hungry", description: "Collect 8 powerups.", minPowerups: 8 },
  { id: "swarm_clearer", name: "Swarm Clearer", description: "Destroy 25 enemies.", minKills: 25 }
];
const LOCAL_ACHIEVEMENT_IDS = ACHIEVEMENT_DEFINITIONS.map((achievement) => achievement.id);
let localAchievementIds = typeof loadLocalAchievementIds === "function"
  ? loadLocalAchievementIds(localStorage, LOCAL_ACHIEVEMENT_IDS)
  : [];

function getAchievementDefinitions() {
  return ACHIEVEMENT_DEFINITIONS.map((item) => ({ ...item }));
}

function runMeetsAchievement(run, achievement) {
  if (achievement.minScore && run.score < achievement.minScore) return false;
  if (achievement.minPhase && run.phase < achievement.minPhase) return false;
  if (achievement.minBosses && run.stats.bosses < achievement.minBosses) return false;
  if (achievement.minGhostUses && run.stats.ghostUses < achievement.minGhostUses) return false;
  if (achievement.minPowerups && run.stats.powerups < achievement.minPowerups) return false;
  if (achievement.minKills && run.stats.kills < achievement.minKills) return false;
  return true;
}

function earnedAchievementsForRun(run) {
  return ACHIEVEMENT_DEFINITIONS.filter((achievement) => runMeetsAchievement(run, achievement));
}

function getLocalAchievementIds() {
  return localAchievementIds.slice();
}

function mergedAchievementIds(onlineIds = []) {
  return typeof mergeAchievementIds === "function"
    ? mergeAchievementIds(localAchievementIds, onlineIds, LOCAL_ACHIEVEMENT_IDS)
    : Array.from(new Set([...localAchievementIds, ...onlineIds]));
}

function unlockLocalAchievementsForRun(run) {
  const before = new Set(localAchievementIds);
  const earned = earnedAchievementsForRun(run).map((achievement) => achievement.id);
  localAchievementIds = mergedAchievementIds(earned);
  if (typeof saveLocalAchievementIds === "function") {
    localAchievementIds = saveLocalAchievementIds(localStorage, localAchievementIds, LOCAL_ACHIEVEMENT_IDS);
  }
  return localAchievementIds.filter((id) => !before.has(id));
}

function currentRunStatsSnapshot() {
  const stats = state.runStats || {};
  return {
    kills: Math.max(0, Math.floor(stats.kills || 0)),
    powerups: Math.max(0, Math.floor(stats.powerups || 0)),
    abilityUses: Math.max(0, Math.floor(stats.abilityUses || 0)),
    ghostUses: Math.max(0, Math.floor(stats.ghostUses || 0)),
    dashUses: Math.max(0, Math.floor(stats.dashUses || 0)),
    realmHops: Math.max(0, Math.floor(stats.realmHops || 0)),
    bosses: Math.max(0, Math.floor(stats.bosses || 0)),
    damageTaken: Math.max(0, Math.floor(stats.damageTaken || 0)),
    highestCombo: Math.max(0, Math.floor(stats.highestCombo || 0)),
    runDurationMs: Math.max(0, Math.round(Number(stats.activeFrames || 0) * (typeof SIMULATION_STEP_MS === "number" ? SIMULATION_STEP_MS : (1000 / 60))))
  };
}

function buildOnlineRunPayload() {
  const score = Math.max(0, Math.floor(state.score || 0));
  const metaRun = typeof getLastRunMeta === "function" ? getLastRunMeta() : null;
  const metaSnapshot = typeof currentMetaSnapshot === "function" ? currentMetaSnapshot() : null;
  const receipt = metaRun && metaRun.receipt
    ? metaRun.receipt
    : (typeof currentRunReceiptSnapshot === "function" ? currentRunReceiptSnapshot() : null);
  const run = {
    score,
    highScore: Math.max(score, Math.max(0, Math.floor(highScore || 0))),
    phase: Math.max(1, Math.floor(state.phase || 1)),
    phaseReached: Math.max(1, Math.floor(state.phase || 1)),
    callSign: sanitizeCallSign(callSign || ""),
    stats: currentRunStatsSnapshot(),
    meta: metaSnapshot,
    runMeta: metaRun,
    receipt,
    completedAtMs: Date.now(),
    clientVersion: "web-v1"
  };
  run.achievements = earnedAchievementsForRun(run).map((achievement) => achievement.id);
  return run;
}

function callOnlineService(method, fallbackMessage, ...args) {
  const svc = window.starStrikeOnline;
  if (!svc || typeof svc[method] !== "function") {
    showMessage(fallbackMessage, 90);
    return;
  }
  try {
    const result = svc[method](...args);
    if (result && typeof result.catch === "function") {
      result.catch(() => showMessage("ONLINE SYNC FAILED", 90));
    }
  } catch {
    showMessage("ONLINE SYNC FAILED", 90);
  }
}

function submitOnlineRun() {
  const run = buildOnlineRunPayload();
  unlockLocalAchievementsForRun(run);
  callOnlineService("submitRun", "SIGN IN TO SYNC", run);
}

function requestOnlineSignIn() {
  callOnlineService("signIn", "ONLINE NOT READY");
}

function requestOnlineSignOut() {
  callOnlineService("signOut", "ONLINE NOT READY");
}

function requestOnlineRefresh() {
  callOnlineService("refresh", "ONLINE NOT READY");
}

function requestWeeklyLeague() {
  callOnlineService("joinWeeklyLeague", "WEEKLY LEAGUES NOT READY");
}
