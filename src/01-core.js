const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const callSignInputEl = document.getElementById("callSignInput");
const handleInputEl = document.getElementById("handleInput");

const GAME_W = 375;
const GAME_H = 667;
let scale = 1;
let offsetX = 0;
let offsetY = 0;
let VIEW_W = GAME_W;
let VIEW_H = GAME_H;
let renderDpr = 1;
const MAX_RENDER_DPR = 2;

let W = GAME_W, H = GAME_H;
let devSkipCooldown = 0;
const DEV_SKIP_COOLDOWN_FRAMES = 48;
let MAX_PARTICLES = 900;
let enemyIdCounter = 1;

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const rand = (min, max) => min + Math.random() * (max - min);
const TAU = Math.PI * 2;

const STORAGE_KEY = "star_strike_rush_high_score_v1";
const META_STORAGE_KEY = "star_strike_rush_meta_v1";
const CURRENT_SEASON_ID = "season_01";
const CURRENT_SEASON_NAME = "Launch Flight";
const SEASON_TIER_XP = 1000;
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
let highScore = 0;
let previousHighScore = 0;
let highScoreDirty = false;
let metaProgress = null;
let lastRunMeta = null;

let callSign = "";
let callSignEditing = false;
let callSignDraft = "";
let callSignStatus = "";
let callSignStatusTimer = 0;
let callSignSaveState = "idle";
let callSignCursorBlink = 0;
let handleEditing = false;
let handleDraft = "";
let handleStatus = "";
let handleStatusTimer = 0;
let accountPanelTab = "pilot";
let titleSubState = "main";
let titlePanelAnim = 0.0;
let titlePanelTarget = 0.0;
let titleProgressTab = "glory";
let titleProgressScroll = 0;
let titleProgressDragActive = false;
let titleProgressDragPointerId = null;
let titleProgressDragY = 0;
let titleProgressDragX = 0;
let titleProgressDragStartScroll = 0;
let titleProgressDragMoved = false;
let titleProgressPointerDownNode = null;
let titleProgressSelectedNode = null;
let titleProgressClaimPulse = 0;
let titleMetaScreenTransition = 1;
let titlePanelOrigin = { x: GAME_W / 2, y: GAME_H / 2 };
let playBtnHold = 0;
let playBtnPointerDown = false;
let playBtnPointerInside = false;
let settingMaxParticles = 900;
let settingScreenShake = true;
let settingReducedMotion = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
let settingReducedFlash = false;
let settingHighContrast = false;
let settingSoundEffects = true;
let respawnHold = 0;
let respawnPointerDown = false;
let respawnPointerInside = false;
let codexDiscovered = {};
let codexHasNew = false;
let encounterQueue = [];
let encounterCard = null;
const ENCOUNTER_CARD_DURATION = 132;
let codexDetailType = null;
let codexCategory = "enemies";
let codexScroll = 0;
let resetProgressConfirm = false;

const FONT_TITLE = "900 52px Impact, Haettenschweiler, 'Arial Narrow Bold', sans-serif";
const FONT_HUGE = "900 58px Impact, Haettenschweiler, 'Arial Narrow Bold', sans-serif";
const FONT_SUBTITLE = "700 18px 'Arial Narrow', Arial, sans-serif";
const FONT_HUD = "700 16px 'Arial Narrow', Arial, sans-serif";
const FONT_COMBO = "900 20px Impact, Haettenschweiler, 'Arial Narrow Bold', sans-serif";
const FONT_SMALL = "700 12px 'Arial Narrow', Arial, sans-serif";
const FONT_TINY = "700 10px 'Arial Narrow', Arial, sans-serif";
const FONT_BUTTON = "900 15px 'Arial Narrow', Arial, sans-serif";

const ENEMY_DATA = {
  red:     { threat: 1.05, score: 30, radius: 12, hp: 2 },
  orange:  { threat: 0.80, score: 20, radius: 10, hp: 1 },
  purple:  { threat: 3.55, score: 150, radius: 17, hp: 5 },
  phantom: { threat: 2.35, score: 100, radius: 14, hp: 3 },
  splitter: { threat: 2.20, score: 120, radius: 15, hp: 3 },
  splitter_shard: { threat: 0.45, score: 10, radius: 8, hp: 1 },
  carrier: { threat: 4.30, score: 300, radius: 23, hp: 6 },
  siphon: { threat: 2.70, score: 130, radius: 14, hp: 3 },
  leech: { threat: 3.80, score: 190, radius: 16, hp: 4 },
  minecaster: { threat: 2.65, score: 140, radius: 15, hp: 3 },
  shieldbearer: { threat: 2.45, score: 150, radius: 16, hp: 4 },
  railgunner: { threat: 3.50, score: 220, radius: 15, hp: 3 },
  repair_drone: { threat: 1.45, score: 90, radius: 11, hp: 2 }
};

const BOSS_SCORE = {
  standard: 1000,
  wraith: 1700,
  debris_warden: 1800,
  mothership: 1900,
  siphon_core: 2000,
  hive_breaker: 2100,
  rail_tyrant: 2200,
  gravity_well: 2300
};

function hexToRgb(hex) {
  const s = hex.replace("#", "").trim();
  const v = s.length === 3 ? s.split("").map(ch => ch + ch).join("") : s;
  const n = parseInt(v, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}
function mixHex(a, b, t) {
  const c1 = hexToRgb(a), c2 = hexToRgb(b), u = clamp(t, 0, 1);
  const r = Math.round(c1.r + (c2.r - c1.r) * u);
  const g = Math.round(c1.g + (c2.g - c1.g) * u);
  const bl = Math.round(c1.b + (c2.b - c1.b) * u);
  return `rgb(${r},${g},${bl})`;
}
function sanitizeCallSign(s) {
  if (typeof normalizeCallSign === "function") return normalizeCallSign(s);
  return String(s || "")
    .toUpperCase()
    .replace(/[^A-Z0-9_]/g, "")
    .slice(0, 12);
}
function loadHighScore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const n = raw ? parseInt(raw, 10) : 0;
    highScore = Number.isFinite(n) ? n : 0;
  } catch { highScore = 0; }
}
function saveHighScore() {
  try { localStorage.setItem(STORAGE_KEY, String(highScore)); highScoreDirty = false; } catch {}
}
function getLocalHighScore() {
  return Math.max(0, Math.floor(highScore || 0));
}
function saveCallSign() {
  try { localStorage.setItem("star_strike_rush_callsign_v1", callSign); } catch {}
}
function getLocalPilotSeed() {
  const key = "star_strike_rush_pilot_seed_v1";
  try {
    let seed = localStorage.getItem(key);
    if (!seed) {
      seed = `${Date.now().toString(36)}_${Math.floor(Math.random() * 0xffffff).toString(36)}`;
      localStorage.setItem(key, seed);
    }
    return seed;
  } catch {
    return "LOCAL_PILOT";
  }
}
function setCallSignStatus(message, stateName = "idle", frames = 150) {
  callSignStatus = String(message || "");
  callSignSaveState = stateName;
  callSignStatusTimer = Math.max(0, Math.floor(frames || 0));
}
function accountIdentitySnapshot() {
  const service = window.starStrikeOnline;
  return service && typeof service.getState === "function" ? service.getState() : {};
}
function editableCallSign() {
  const online = accountIdentitySnapshot();
  return online.user ? sanitizeCallSign(online.profileCallSign || "") : callSign;
}
function beginCallSignEditing() {
  callSignEditing = true;
  callSignDraft = editableCallSign();
  callSignInputEl.value = callSignDraft;
  setCallSignStatus("", "editing", 0);
  callSignInputEl.focus();
}
function cancelCallSignEditing() {
  callSignEditing = false;
  callSignDraft = editableCallSign();
  callSignInputEl.value = callSignDraft;
  setCallSignStatus("", "idle", 0);
  callSignInputEl.blur();
}
function commitCallSignDraft(fromBlur = false) {
  const result = typeof validateCallSign === "function"
    ? validateCallSign(callSignDraft)
    : { ok: !!sanitizeCallSign(callSignDraft), callSign: sanitizeCallSign(callSignDraft), message: "CALL SIGN REQUIRED" };
  if (!result.ok) {
    if (fromBlur) {
      callSignEditing = false;
      callSignDraft = editableCallSign();
      callSignInputEl.value = callSignDraft;
      setCallSignStatus(result.message || "INVALID CALL SIGN", "error", 150);
      return false;
    }
    setCallSignStatus(result.message || "INVALID CALL SIGN", "error", 0);
    callSignEditing = true;
    callSignInputEl.focus();
    return false;
  }
  const onlineBeforeSave = accountIdentitySnapshot();
  const savingAccountIdentity = !!onlineBeforeSave.user;
  callSignDraft = result.callSign;
  callSignInputEl.value = callSignDraft;
  if (!savingAccountIdentity) {
    callSign = result.callSign;
    saveCallSign();
  }
  callSignEditing = false;
  setCallSignStatus(result.message || "PILOT ID SAVED", "success", 150);
  callSignInputEl.blur();
  const onlineService = window.starStrikeOnline;
  if (savingAccountIdentity && onlineService && typeof onlineService.updateCallSign === "function") {
    setCallSignStatus("SAVING PILOT ID...", "saving", 0);
    Promise.resolve(onlineService.updateCallSign(result.callSign)).then((syncResult) => {
      if (syncResult && syncResult.localOnly) {
        setCallSignStatus("ACCOUNT SAVE UNAVAILABLE", "error", 210);
      } else {
        setCallSignStatus("PILOT ID SYNCED", "success", 150);
      }
    }).catch(() => {
      setCallSignStatus("SAVED LOCALLY | ONLINE SYNC FAILED", "error", 210);
    });
  } else if (!savingAccountIdentity) setCallSignStatus("LOCAL CALL SIGN SAVED", "success", 120);
  return true;
}
function setHandleStatus(message, frames = 150) {
  handleStatus = String(message || "");
  handleStatusTimer = Math.max(0, Math.floor(frames || 0));
}
function beginHandleEditing() {
  const onlineService = window.starStrikeOnline;
  const online = onlineService && typeof onlineService.getState === "function" ? onlineService.getState() : {};
  if (!online.user) {
    setHandleStatus("SIGN IN TO CLAIM A HANDLE", 150);
    return false;
  }
  if (online.competitionBackend === "unavailable") {
    setHandleStatus("COMPETITION SERVICES ARE OFFLINE", 180);
    return false;
  }
  if (online.profileHandle) {
    setHandleStatus("HANDLE IS LOCKED TO THIS ACCOUNT", 150);
    return false;
  }
  handleEditing = true;
  handleDraft = "";
  handleInputEl.value = "";
  setHandleStatus("PUBLIC • CLAIM ONCE", 0);
  handleInputEl.focus();
  return true;
}
function cancelHandleEditing() {
  handleEditing = false;
  handleDraft = "";
  handleInputEl.value = "";
  setHandleStatus("HANDLE CLAIM CANCELLED", 70);
  handleInputEl.blur();
}
function commitPublicHandleDraft() {
  const validation = typeof validatePublicHandle === "function"
    ? validatePublicHandle(handleDraft)
    : { ok: false, handle: "", message: "HANDLE VALIDATION UNAVAILABLE" };
  if (!validation.ok) {
    setHandleStatus(validation.message || "INVALID HANDLE", 0);
    handleInputEl.focus();
    return false;
  }
  const onlineService = window.starStrikeOnline;
  if (!onlineService || typeof onlineService.claimHandle !== "function") {
    setHandleStatus("ONLINE HANDLE SERVICE UNAVAILABLE", 180);
    return false;
  }
  handleDraft = validation.handle;
  setHandleStatus("CLAIMING PUBLIC HANDLE...", 0);
  Promise.resolve(onlineService.claimHandle(validation.handle)).then((result) => {
    if (!result || !result.ok) throw new Error((result && result.message) || "Handle claim failed.");
    handleEditing = false;
    handleInputEl.blur();
    setHandleStatus(`@${result.handle} IS YOURS`, 180);
  }).catch((error) => {
    setHandleStatus(String((error && error.message) || "HANDLE CLAIM FAILED").toUpperCase().slice(0, 42), 210);
    handleEditing = true;
    handleInputEl.focus();
  });
  return true;
}
function saveSettings() {
  try {
    localStorage.setItem("star_strike_rush_settings_v1", JSON.stringify({
      settingMaxParticles,
      settingScreenShake,
      settingReducedMotion,
      settingReducedFlash,
      settingHighContrast,
      settingSoundEffects
    }));
  } catch {}
}
function saveCodexDiscovered() {
  try { localStorage.setItem("star_strike_rush_codex_v1", JSON.stringify(codexDiscovered)); } catch {}
}
function loadCallSign() {
  try {
    const raw = localStorage.getItem("star_strike_rush_callsign_v1");
    callSign = sanitizeCallSign(raw || "");
  } catch {
    callSign = "";
  }
  if (!callSign) {
    callSign = typeof neutralPilotCallSign === "function" ? neutralPilotCallSign(getLocalPilotSeed()) : "PILOT_LOCAL";
    saveCallSign();
  }
  callSignDraft = callSign;
}
function loadSettings() {
  try {
    const raw = localStorage.getItem("star_strike_rush_settings_v1");
    if (!raw) return;
    const obj = JSON.parse(raw);
    if (obj && (obj.settingMaxParticles === 300 || obj.settingMaxParticles === 600 || obj.settingMaxParticles === 900)) {
      settingMaxParticles = obj.settingMaxParticles;
    }
    if (obj && typeof obj.settingScreenShake === "boolean") {
      settingScreenShake = obj.settingScreenShake;
    }
    if (obj && typeof obj.settingReducedMotion === "boolean") settingReducedMotion = obj.settingReducedMotion;
    if (obj && typeof obj.settingReducedFlash === "boolean") settingReducedFlash = obj.settingReducedFlash;
    if (obj && typeof obj.settingHighContrast === "boolean") settingHighContrast = obj.settingHighContrast;
    if (obj && typeof obj.settingSoundEffects === "boolean") settingSoundEffects = obj.settingSoundEffects;
  } catch {}
  MAX_PARTICLES = settingMaxParticles;
  applyAccessibilitySettings();
}
function applyAccessibilitySettings() {
  canvas.style.filter = settingHighContrast ? "contrast(1.16) saturate(0.92)" : "none";
}
function loadCodexDiscovered() {
  try {
    const raw = localStorage.getItem("star_strike_rush_codex_v1");
    const obj = raw ? JSON.parse(raw) : {};
    codexDiscovered = obj && typeof obj === "object" ? obj : {};
  } catch {
    codexDiscovered = {};
  }
}
function rankForGlory(glory) {
  const total = Math.max(0, Math.floor(glory || 0));
  let current = GLORY_RANKS[0];
  let index = 0;
  for (let i = 1; i < GLORY_RANKS.length; i++) {
    if (total < GLORY_RANKS[i].threshold) break;
    current = GLORY_RANKS[i];
    index = i;
  }
  const next = GLORY_RANKS[index + 1] || null;
  return {
    index,
    name: current.name,
    threshold: current.threshold,
    nextName: next ? next.name : "",
    nextThreshold: next ? next.threshold : 0,
    progress: next ? clamp((total - current.threshold) / Math.max(1, next.threshold - current.threshold), 0, 1) : 1
  };
}
function currentSeasonTierForXP(xp) {
  return clamp(1 + Math.floor(Math.max(0, Math.floor(xp || 0)) / SEASON_TIER_XP), 1, 50);
}
function gloryForScore(score) {
  return Math.floor(Math.max(0, Math.floor(score || 0)) / 10);
}
function seasonXpForRun(score, phase, stats) {
  const s = Math.max(0, Math.floor(score || 0));
  const p = Math.max(1, Math.floor(phase || 1));
  const bossBonus = Math.max(0, Math.floor((stats && stats.bosses) || 0)) * 60;
  const powerupBonus = Math.max(0, Math.floor((stats && stats.powerups) || 0)) * 5;
  return clamp(Math.floor(s / 45) + p * 8 + bossBonus + powerupBonus, 0, 2500);
}
function creditsForRun(score, phase, stats) {
  const s = Math.max(0, Math.floor(score || 0));
  const p = Math.max(1, Math.floor(phase || 1));
  const bossBonus = Math.max(0, Math.floor((stats && stats.bosses) || 0)) * 25;
  return clamp(Math.floor(s / 120) + p * 2 + bossBonus, 0, 1500);
}
function makeDefaultMetaProgress() {
  return {
    version: 1,
    totalGlory: 0,
    currentSeason: {
      id: CURRENT_SEASON_ID,
      name: CURRENT_SEASON_NAME,
      xp: 0,
      tier: 1,
      claimedRewardIds: []
    },
    credits: 0,
    lifetime: {
      runs: 0,
      score: 0,
      kills: 0,
      powerups: 0,
      ghostUses: 0,
      bosses: 0,
      damageTaken: 0,
      highestCombo: 0,
      bestScore: 0,
      bestPhase: 1
    },
    recentReceipts: [],
    lastUpdatedAtMs: 0
  };
}
function sanitizeStoredMetaProgress(raw) {
  const base = makeDefaultMetaProgress();
  const data = raw && typeof raw === "object" ? raw : {};
  const season = data.currentSeason && typeof data.currentSeason === "object" ? data.currentSeason : {};
  const lifetime = data.lifetime && typeof data.lifetime === "object" ? data.lifetime : {};
  base.totalGlory = Math.max(0, Math.floor(data.totalGlory || 0));
  base.credits = Math.max(0, Math.floor(data.credits || 0));
  base.currentSeason.id = String(season.id || CURRENT_SEASON_ID).slice(0, 40);
  base.currentSeason.name = String(season.name || CURRENT_SEASON_NAME).slice(0, 60);
  base.currentSeason.xp = Math.max(0, Math.floor(season.xp || 0));
  base.currentSeason.tier = currentSeasonTierForXP(base.currentSeason.xp);
  base.currentSeason.claimedRewardIds = Array.isArray(season.claimedRewardIds)
    ? season.claimedRewardIds.map((id) => String(id).slice(0, 80)).slice(0, 200)
    : [];
  if (base.currentSeason.id !== CURRENT_SEASON_ID) {
    base.currentSeason = { id: CURRENT_SEASON_ID, name: CURRENT_SEASON_NAME, xp: 0, tier: 1, claimedRewardIds: [] };
  }
  base.lifetime.runs = Math.max(0, Math.floor(lifetime.runs || 0));
  base.lifetime.score = Math.max(0, Math.floor(lifetime.score || 0));
  base.lifetime.kills = Math.max(0, Math.floor(lifetime.kills || 0));
  base.lifetime.powerups = Math.max(0, Math.floor(lifetime.powerups || 0));
  base.lifetime.ghostUses = Math.max(0, Math.floor(lifetime.ghostUses || 0));
  base.lifetime.bosses = Math.max(0, Math.floor(lifetime.bosses || 0));
  base.lifetime.damageTaken = Math.max(0, Math.floor(lifetime.damageTaken || 0));
  base.lifetime.highestCombo = Math.max(0, Math.floor(lifetime.highestCombo || 0));
  base.lifetime.bestScore = Math.max(0, Math.floor(lifetime.bestScore || 0));
  base.lifetime.bestPhase = Math.max(1, Math.floor(lifetime.bestPhase || 1));
  base.recentReceipts = Array.isArray(data.recentReceipts) ? data.recentReceipts.slice(-20) : [];
  base.lastUpdatedAtMs = Math.max(0, Math.floor(data.lastUpdatedAtMs || 0));
  return base;
}
function loadMetaProgress() {
  try {
    const raw = localStorage.getItem(META_STORAGE_KEY);
    metaProgress = sanitizeStoredMetaProgress(raw ? JSON.parse(raw) : {});
  } catch {
    metaProgress = makeDefaultMetaProgress();
  }
}
function getMetaProgress() {
  if (!metaProgress) loadMetaProgress();
  return metaProgress;
}
function saveMetaProgress() {
  try { localStorage.setItem(META_STORAGE_KEY, JSON.stringify(getMetaProgress())); } catch {}
}
function currentMetaSnapshot() {
  const progress = getMetaProgress();
  const rank = rankForGlory(progress.totalGlory);
  return {
    totalGlory: progress.totalGlory,
    gloryRank: rank.name,
    gloryRankIndex: rank.index,
    nextGloryRank: rank.nextName,
    nextGloryThreshold: rank.nextThreshold,
    rankProgress: rank.progress,
    seasonId: progress.currentSeason.id,
    seasonName: progress.currentSeason.name,
    seasonXP: progress.currentSeason.xp,
    seasonTier: progress.currentSeason.tier,
    seasonClaimedRewardIds: progress.currentSeason.claimedRewardIds.slice(),
    credits: progress.credits,
    lifetime: { ...progress.lifetime }
  };
}
function mergeServerMetaProgress(serverMeta) {
  if (!serverMeta || typeof serverMeta !== "object") return currentMetaSnapshot();
  const progress = getMetaProgress();
  const lifetime = serverMeta.lifetime && typeof serverMeta.lifetime === "object" ? serverMeta.lifetime : {};
  progress.totalGlory = Math.max(0, Math.floor(serverMeta.totalGlory || 0));
  progress.currentSeason.id = String(serverMeta.seasonId || CURRENT_SEASON_ID).slice(0, 40);
  progress.currentSeason.name = String(serverMeta.seasonName || CURRENT_SEASON_NAME).slice(0, 60);
  if (progress.currentSeason.id !== CURRENT_SEASON_ID) {
    progress.currentSeason.id = CURRENT_SEASON_ID;
    progress.currentSeason.name = CURRENT_SEASON_NAME;
    progress.currentSeason.xp = 0;
    progress.currentSeason.tier = 1;
    progress.currentSeason.claimedRewardIds = [];
  } else {
    progress.currentSeason.xp = Math.max(0, Math.floor(serverMeta.seasonXP || 0));
    progress.currentSeason.tier = currentSeasonTierForXP(progress.currentSeason.xp);
    progress.currentSeason.claimedRewardIds = Array.isArray(serverMeta.seasonClaimedRewardIds)
      ? Array.from(new Set(serverMeta.seasonClaimedRewardIds.map((id) => String(id).slice(0, 80)))).slice(0, 220)
      : [];
  }
  progress.credits = Math.max(0, Math.floor(serverMeta.credits || 0));
  progress.lifetime.runs = Math.max(0, Math.floor(lifetime.runs || 0));
  progress.lifetime.score = Math.max(0, Math.floor(lifetime.score || 0));
  progress.lifetime.kills = Math.max(0, Math.floor(lifetime.kills || 0));
  progress.lifetime.powerups = Math.max(0, Math.floor(lifetime.powerups || 0));
  progress.lifetime.ghostUses = Math.max(0, Math.floor(lifetime.ghostUses || 0));
  progress.lifetime.bosses = Math.max(0, Math.floor(lifetime.bosses || 0));
  progress.lifetime.damageTaken = Math.max(0, Math.floor(lifetime.damageTaken || 0));
  progress.lifetime.highestCombo = Math.max(0, Math.floor(lifetime.highestCombo || 0));
  progress.lifetime.bestScore = Math.max(0, Math.floor(lifetime.bestScore || 0));
  progress.lifetime.bestPhase = Math.max(1, Math.floor(lifetime.bestPhase || 1));
  progress.lastUpdatedAtMs = Date.now();
  saveMetaProgress();
  return currentMetaSnapshot();
}
function currentRunReceiptSnapshot() {
  const stats = state.runStats || {};
  const score = Math.max(0, Math.floor(state.score || 0));
  const phase = Math.max(1, Math.floor(state.phase || 1));
  const now = Date.now();
  const runDurationMs = Math.max(0, Math.round(Number(stats.activeFrames || 0) * (typeof SIMULATION_STEP_MS === "number" ? SIMULATION_STEP_MS : (1000 / 60))));
  return {
    receiptId: `local_${now}_${score}_${Math.max(0, Math.floor(stats.kills || 0))}`,
    score,
    phaseReached: phase,
    runDurationMs,
    enemiesKilled: Math.max(0, Math.floor(stats.kills || 0)),
    bossesKilled: Math.max(0, Math.floor(stats.bosses || 0)),
    powerupsCollected: Math.max(0, Math.floor(stats.powerups || 0)),
    ghostUses: Math.max(0, Math.floor(stats.ghostUses || 0)),
    damageTaken: Math.max(0, Math.floor(stats.damageTaken || 0)),
    highestCombo: Math.max(0, Math.floor(stats.highestCombo || 0)),
    clientVersion: "web-v1",
    endedAtMs: now
  };
}
function applyRunMetaProgress() {
  const stats = state.runStats || {};
  if (state.runMode === "debug") return { debug: true, snapshot: currentMetaSnapshot(), receipt: currentRunReceiptSnapshot() };
  if (stats.metaApplied) return lastRunMeta || { snapshot: currentMetaSnapshot(), receipt: currentRunReceiptSnapshot() };
  const progress = getMetaProgress();
  const receipt = currentRunReceiptSnapshot();
  const beforeGlory = progress.totalGlory;
  const beforeRank = rankForGlory(beforeGlory);
  const beforeSeasonXP = progress.currentSeason.xp;
  const beforeSeasonTier = progress.currentSeason.tier;
  const beforeCredits = progress.credits;
  const gloryGained = gloryForScore(receipt.score);
  const seasonXPGained = seasonXpForRun(receipt.score, receipt.phaseReached, {
    bosses: receipt.bossesKilled,
    powerups: receipt.powerupsCollected
  });
  const creditsEarned = creditsForRun(receipt.score, receipt.phaseReached, { bosses: receipt.bossesKilled });

  progress.totalGlory += gloryGained;
  progress.currentSeason.xp += seasonXPGained;
  progress.currentSeason.tier = currentSeasonTierForXP(progress.currentSeason.xp);
  progress.credits += creditsEarned;
  progress.lifetime.runs++;
  progress.lifetime.score += receipt.score;
  progress.lifetime.kills += receipt.enemiesKilled;
  progress.lifetime.powerups += receipt.powerupsCollected;
  progress.lifetime.ghostUses += receipt.ghostUses;
  progress.lifetime.bosses += receipt.bossesKilled;
  progress.lifetime.damageTaken += receipt.damageTaken;
  progress.lifetime.highestCombo = Math.max(progress.lifetime.highestCombo, receipt.highestCombo);
  progress.lifetime.bestScore = Math.max(progress.lifetime.bestScore, receipt.score, highScore);
  progress.lifetime.bestPhase = Math.max(progress.lifetime.bestPhase, receipt.phaseReached);
  progress.lastUpdatedAtMs = receipt.endedAtMs;
  progress.recentReceipts.push({
    receiptId: receipt.receiptId,
    score: receipt.score,
    phaseReached: receipt.phaseReached,
    gloryGained,
    seasonXPGained,
    creditsEarned,
    endedAtMs: receipt.endedAtMs
  });
  if (progress.recentReceipts.length > 20) progress.recentReceipts.splice(0, progress.recentReceipts.length - 20);
  stats.metaApplied = true;
  const afterRank = rankForGlory(progress.totalGlory);
  lastRunMeta = {
    receipt,
    gloryBefore: beforeGlory,
    gloryAfter: progress.totalGlory,
    gloryGained,
    seasonXPBefore: beforeSeasonXP,
    seasonXPAfter: progress.currentSeason.xp,
    seasonXPGained,
    creditsBefore: beforeCredits,
    creditsAfter: progress.credits,
    creditsEarned,
    rankBefore: beforeRank.name,
    rankAfter: afterRank.name,
    rankIndexBefore: beforeRank.index,
    rankIndexAfter: afterRank.index,
    rankUp: afterRank.index > beforeRank.index,
    seasonTierBefore: beforeSeasonTier,
    seasonTier: progress.currentSeason.tier,
    seasonTierUp: progress.currentSeason.tier > beforeSeasonTier,
    snapshot: currentMetaSnapshot()
  };
  saveMetaProgress();
  return lastRunMeta;
}
function getLastRunMeta() {
  return lastRunMeta ? JSON.parse(JSON.stringify(lastRunMeta)) : null;
}
function saveMilestone() { if (highScoreDirty) saveHighScore(); }
function kickShake(amount) {
  if (!settingScreenShake) return;
  state.fx.shake = Math.max(state.fx.shake, amount);
}

function showNextMessage() {
  if (state.messageQueue.length > 0) {
    const m = state.messageQueue.shift();
    state.message = m.text;
    state.messageTimer = m.frames;
    state.messageMax = m.frames;
  } else {
    state.message = "";
    state.messageTimer = 0;
    state.messageMax = 0;
  }
}
function showMessage(text, frames = 90) {
  if (state.gameState === "playing" || state.gameState === "paused" || state.gameState === "resuming") {
    pushGameNotice(text);
    return;
  }
  const item = { text, frames };
  if (state.messageTimer > 0 || state.messageQueue.length > 0) state.messageQueue.push(item);
  else {
    state.message = text;
    state.messageTimer = frames;
    state.messageMax = frames;
  }
}
function pushGameNotice(text, category = "") {
  if (!text || typeof createGameNotice !== "function") return;
  state.notices.push(createGameNotice(text, category));
  state.notices = state.notices.slice(-3);
}
function circleHit(ax, ay, ar, bx, by, br) { return Math.hypot(ax - bx, ay - by) < ar + br; }
function laneCenters() { return [W * 0.22, W * 0.50, W * 0.78]; }
function laneIndexFromX(x) { if (x < W / 3) return 0; if (x < (2 * W) / 3) return 1; return 2; }
function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
function wrapAngle(a) { while (a > Math.PI) a -= TAU; while (a < -Math.PI) a += TAU; return a; }
function waveItem(type, x, y, delay = 0, extra = {}) { return { type, x, y, delay, extra }; }
function isWraithActive() { return !!(state.boss && state.boss.mode === "wraith"); }
function bossHudOffset() { return (state.boss || state.bossDeath) ? 32 : 0; }
function getPlayerShotKind() { return isWraithActive() ? (state.playerRealm === 1 ? "ghost" : "physical") : "physical"; }
function enemyBulletCost(kind) {
  if (kind === "aimed") return 1.25;
  if (kind === "boss") return 1.5;
  if (kind === "phantomShot") return 1.0;
  if (kind === "drainShot") return 1.15;
  if (kind === "purple") return 1.0;
  if (kind === "wraithPhysical" || kind === "wraithGhost") return 1.05;
  return 0.9;
}
function enemyBulletPressure() { let total = 0; for (const b of state.enemyBullets) total += enemyBulletCost(b.kind); return total; }
function enemyBulletBudget() {
  let base = 11 + state.phase * 1.4;
  if (state.phase === 1) base = 5.8 + state.phaseTimer / 520;
  else if (state.phase === 2) base = 8.0 + state.phaseTimer / 640;
  if (state.player.hp <= 2) base -= 2.0;
  if (state.player.hp === 1) base -= 1.0;
  if (state.difficulty.grace > 0) base -= 2.0;
  if (state.difficulty.ghostGrace > 0) base -= 1.2;
  if (state.boss) base -= 1.5;
  base -= state.difficulty.burst * 3.5;
  if (state.intensityPhase === "surge") base += 2.0;
  if (state.intensityPhase === "cooldown") base -= 1.3;
  const minBudget = state.phase === 1 ? 4.8 : state.phase === 2 ? 6.5 : 8;
  return clamp(base * state.difficulty.threat, minBudget, 26);
}
function canSpendBulletBudget(cost) {
  const budget = state.cachedBulletBudget || enemyBulletBudget();
  const load = (state.cachedBulletPressure || enemyBulletPressure()) + (state.frameBulletSpent || 0);
  return load + cost <= budget;
}
function spendBulletBudget(cost) { state.frameBulletSpent = (state.frameBulletSpent || 0) + cost; }
function titleLaneYs() { return [H * 0.14, H * 0.24, H * 0.34, H * 0.44]; }

const state = {
  player: null,
  bullets: [],
  enemyBullets: [],
  enemies: [],
  debris: [],
  enemyBeams: [],
  gravityWells: [],
  powerups: [],
  particles: [],
  boss: null,
  bossDeath: null,
  bossRecovery: 0,
  wingmen: [],
  pendingSpawns: [],
  stars: [],
  titleFormations: [],
  titleLaneCooldowns: [0, 0, 0, 0],
  titleLaneCursor: 0,
  titleSpawnTimer: 0,
  score: 0,
  runStartingHighScore: 0,
  newHighScore: false,
  multiplier: 1,
  comboKills: 0,
  comboPulse: 0,
  phase: 1,
  frame: 0,
  waveTimer: 0,
  phaseTimer: 0,
  waveIndex: 0,
  waveRest: 0,
  pressure: 8,
  threatScore: 0,
  cachedBulletPressure: 0,
  cachedBulletBudget: 0,
  frameBulletSpent: 0,
  message: "",
  messageTimer: 0,
  messageMax: 0,
  messageQueue: [],
  notices: [],
  fx: { shake: 0, flash: 0 },
  gameOverShake: 0,
  gameOverShakeTimer: 0,
  difficulty: {
    threat: 0.58,
    target: 0.58,
    grace: 0,
    ghostGrace: 0,
    heatStreak: false,
    lastHitFrame: -999,
    killStreak: 0,
    burst: 0,
    shotsFired: 0,
    shotsHit: 0,
    pacingMemory: 0
  },
  keyboard: { up: false, down: false, left: false, right: false },
  joystick: { active: false, id: null, cx: 0, cy: 0, ax: 0, ay: 0, radius: 56 },
  inputMode: "keyboard",
  lastTouchAt: -Infinity,
  inputHintTimer: 144,
  debugHitboxes: false,
  debugErrors: [],
  safeLanes: [],
  playerRealm: 0,
  devStatsVisible: false,
  difficultySamples: [],
  difficultyDeaths: 0,
  runMode: "standard",
  pausedReason: "",
  resumeCountdown: 0,
  sceneTransition: { mode: "idle", frame: 0, duration: 1 },
  runStats: { kills: 0, powerups: 0, abilityUses: 0, ghostUses: 0, dashUses: 0, realmHops: 0, bosses: 0, damageTaken: 0, highestCombo: 0, activeFrames: 0, startedAtMs: 0, metaApplied: false },
  killsSinceLastDrop: 0,
  framesSinceLastDrop: 0,
  powerupDropCooldown: 0,
  debrisEventTimer: 1200,
  debrisWarningTimer: 0,
  lastDebrisFrame: -9999,
  lastBossMode: null,
  intensityPhase: "normal",
  intensityTimer: 180,
  waveMood: "open",
  waveMoodTimer: 120,
  lastWaveTemplateName: null,
  gameState: "start"
};

callSignInputEl.addEventListener("input", () => {
  if (!callSignEditing) return;
  callSignDraft = sanitizeCallSign(callSignInputEl.value);
  callSignInputEl.value = callSignDraft;
  if (callSignSaveState === "error") setCallSignStatus("ENTER SAVES  •  ESC CANCELS", "editing", 0);
});
callSignInputEl.addEventListener("blur", () => {
  if (callSignEditing) commitCallSignDraft(true);
});
handleInputEl.addEventListener("input", () => {
  if (!handleEditing) return;
  handleDraft = typeof normalizePublicHandle === "function" ? normalizePublicHandle(handleInputEl.value) : "";
  handleInputEl.value = handleDraft;
});
handleInputEl.addEventListener("blur", () => {
  if (!handleEditing) return;
  cancelHandleEditing();
});

function makePlayer() {
  return {
    x: W / 2,
    y: H * 0.80,
    vx: 0,
    vy: 0,
    hp: 5,
    maxHp: 5,
    energy: 100,
    maxEnergy: 100,
    inv: 0,
    fire: 0,
    spread: 0,
    rapid: 0,
    ghostTimer: 0,
    dashTimer: 0,
    ghostCooldown: 0,
    overcharge: 0,
    phaseShield: 0,
    magnet: 0,
    piercing: 0,
    stabilizer: 0,
    scoreSurge: 0,
    maxSpeed: 5.5
  };
}
function refreshMultiplier() {
  const prev = state.multiplier || 1;
  const next = clamp(1 + Math.floor(state.comboKills / 7), 1, 4);
  state.multiplier = next;
  if (next > prev) state.comboPulse = 120;
}
function addScore(basePoints) {
  const surge = state.player && state.player.scoreSurge > 0 ? 1.5 : 1;
  const pts = Math.round(basePoints * state.multiplier * surge);
  state.score += pts;
  if (state.score > highScore) { highScore = state.score; highScoreDirty = true; }
}
function addFlatScore(points) {
  state.score += points;
  if (state.score > highScore) { highScore = state.score; highScoreDirty = true; }
}
function noteKill(basePoints) {
  state.comboKills++;
  state.difficulty.killStreak++;
  state.runStats.kills++;
  state.runStats.highestCombo = Math.max(state.runStats.highestCombo || 0, state.comboKills);
  refreshMultiplier();
  addScore(basePoints);
}
function resetCombo() { state.comboKills = 0; refreshMultiplier(); state.difficulty.killStreak = 0; }
