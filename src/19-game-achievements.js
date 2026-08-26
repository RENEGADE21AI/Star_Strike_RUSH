const ACHIEVEMENT_DEFINITIONS = Array.isArray(globalThis.STAR_STRIKE_ACHIEVEMENTS)
  ? globalThis.STAR_STRIKE_ACHIEVEMENTS
  : [];
const LOCAL_ACHIEVEMENT_IDS = ACHIEVEMENT_DEFINITIONS.map((achievement) => achievement.id);
let localAchievementIds = typeof loadLocalAchievementIds === "function"
  ? loadLocalAchievementIds(localStorage, LOCAL_ACHIEVEMENT_IDS)
  : [];

function getAchievementDefinitions() {
  return ACHIEVEMENT_DEFINITIONS.map((item) => ({ ...item }));
}

function runMeetsAchievement(run, achievement) {
  const stats = run.stats || {};
  const lifetime = (run.meta && run.meta.lifetime) || {};
  if (achievement.minScore && run.score < achievement.minScore) return false;
  if (achievement.minPhase && run.phase < achievement.minPhase) return false;
  if (achievement.minBosses && stats.bosses < achievement.minBosses) return false;
  if (achievement.minGhostUses && stats.ghostUses < achievement.minGhostUses) return false;
  if (achievement.minPowerups && stats.powerups < achievement.minPowerups) return false;
  if (achievement.minKills && stats.kills < achievement.minKills) return false;
  if (achievement.minCombo && stats.highestCombo < achievement.minCombo) return false;
  if (achievement.minRunDurationMs && stats.runDurationMs < achievement.minRunDurationMs) return false;
  if (Number.isFinite(achievement.maxDamageTaken) && stats.damageTaken > achievement.maxDamageTaken) return false;
  if (achievement.minLifetimeRuns && lifetime.runs < achievement.minLifetimeRuns) return false;
  if (achievement.minLifetimeScore && lifetime.score < achievement.minLifetimeScore) return false;
  if (achievement.minLifetimeKills && lifetime.kills < achievement.minLifetimeKills) return false;
  if (achievement.minLifetimePowerups && lifetime.powerups < achievement.minLifetimePowerups) return false;
  if (achievement.minLifetimeGhostUses && lifetime.ghostUses < achievement.minLifetimeGhostUses) return false;
  if (achievement.minLifetimeBosses && lifetime.bosses < achievement.minLifetimeBosses) return false;
  return true;
}

function achievementProgressForMeta(achievement, snapshot = null) {
  const meta = snapshot || (typeof currentMetaSnapshot === "function" ? currentMetaSnapshot() : null) || {};
  const lifetime = meta.lifetime || {};
  const last = typeof getLastRunMeta === "function" ? getLastRunMeta() : null;
  const receipt = (last && last.receipt) || {};
  if (Number.isFinite(achievement.maxDamageTaken) && achievement.minPhase) {
    const clean = Number(receipt.damageTaken || 0) <= achievement.maxDamageTaken;
    const currentPhase = clean ? Number(receipt.phaseReached || 0) : 0;
    return {
      current: currentPhase,
      target: achievement.minPhase,
      ratio: clamp(currentPhase / achievement.minPhase, 0, 1),
      label: clean ? `${currentPhase} / ${achievement.minPhase}` : "HULL HIT"
    };
  }
  const candidates = [
    ["minLifetimeRuns", lifetime.runs],
    ["minLifetimeScore", lifetime.score],
    ["minLifetimeKills", lifetime.kills],
    ["minLifetimePowerups", lifetime.powerups],
    ["minLifetimeGhostUses", lifetime.ghostUses],
    ["minLifetimeBosses", lifetime.bosses],
    ["minScore", lifetime.bestScore],
    ["minPhase", lifetime.bestPhase],
    ["minKills", receipt.enemiesKilled],
    ["minBosses", receipt.bossesKilled],
    ["minPowerups", receipt.powerupsCollected],
    ["minGhostUses", receipt.ghostUses],
    ["minCombo", Math.max(lifetime.highestCombo || 0, receipt.highestCombo || 0)],
    ["minRunDurationMs", receipt.runDurationMs]
  ];
  const metric = candidates.find(([key]) => Number.isFinite(Number(achievement[key])) && Number(achievement[key]) > 0);
  if (!metric) return { current: 0, target: 1, ratio: 0, label: "SPECIAL CONDITION" };
  const [key, rawCurrent] = metric;
  const current = Math.max(0, Number(rawCurrent || 0));
  const target = Number(achievement[key]);
  const duration = key === "minRunDurationMs";
  const format = (value) => {
    if (duration) return `${Math.floor(value / 60000)}M`;
    if (value >= 1000000) return `${Number((value / 1000000).toFixed(value >= 10000000 ? 0 : 1))}M`;
    if (value >= 1000) return `${Number((value / 1000).toFixed(value >= 10000 ? 0 : 1))}K`;
    return Number(value).toLocaleString();
  };
  return { current, target, ratio: clamp(current / target, 0, 1), label: `${format(Math.min(current, target))} / ${format(target)}` };
}

function earnedAchievementsForRun(run) {
  return ACHIEVEMENT_DEFINITIONS.filter((achievement) => runMeetsAchievement(run, achievement));
}

function getLocalAchievementIds() {
  return localAchievementIds.slice();
}

function resetLocalAchievements() {
  localAchievementIds = typeof clearLocalAchievementIds === "function"
    ? clearLocalAchievementIds(localStorage)
    : [];
  return localAchievementIds.slice();
}

function replaceLocalAchievementArchive(ids) {
  localAchievementIds = typeof saveLocalAchievementIds === "function"
    ? saveLocalAchievementIds(localStorage, Array.isArray(ids) ? ids : [], LOCAL_ACHIEVEMENT_IDS)
    : [];
  return localAchievementIds.slice();
}

globalThis.replaceLocalAchievementArchive = replaceLocalAchievementArchive;

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
      result.catch(() => showMessage("ACCOUNT SERVICE FAILED", 90));
    }
  } catch {
    showMessage("ACCOUNT SERVICE FAILED", 90);
  }
}

function finalizeLocalRunAchievements() {
  const run = buildOnlineRunPayload();
  unlockLocalAchievementsForRun(run);
}

function beginOnlineVerifiedRun() {
  const service = window.starStrikeOnline;
  if (!service || typeof service.getState !== "function" || typeof service.startVerifiedRun !== "function") return false;
  const status = service.getState();
  if (!status.user || status.competitionMode !== "verified_world_records" || status.progressionResolution) return false;
  state.verifiedRunPromise = Promise.resolve(service.startVerifiedRun()).then((result) => {
    if (result && result.ok && result.session) state.verifiedRunSession = result.session;
    return result;
  }).catch(() => ({ ok: false }));
  return true;
}

function publishVerifiedRunIfEligible() {
  if (state.runMode !== "standard" || !state.verifiedRunLedger || !state.verifiedRunPromise) return false;
  const service = window.starStrikeOnline;
  if (!service || typeof service.submitRun !== "function") return false;
  const ledger = state.verifiedRunLedger;
  Promise.resolve(state.verifiedRunPromise).then((started) => {
    const session = started && started.ok ? started.session : state.verifiedRunSession;
    if (!session || typeof trustedRunEvidence !== "function") return null;
    return service.submitRun({ evidence: trustedRunEvidence(ledger, session) });
  }).catch(() => {});
  return true;
}

globalThis.beginOnlineVerifiedRun = beginOnlineVerifiedRun;
globalThis.publishVerifiedRunIfEligible = publishVerifiedRunIfEligible;

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
  callOnlineService("joinWeeklyLeague", "WEEKLY LEAGUE SERVICE OFFLINE");
}
