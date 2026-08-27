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
const MAX_RENDER_PIXELS = typeof DEFAULT_MAX_CANVAS_PIXELS === "number" ? DEFAULT_MAX_CANVAS_PIXELS : 8_388_608;

let W = GAME_W, H = GAME_H;
let MAX_PARTICLES = 900;
let enemyIdCounter = 1;

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const rand = (min, max) => min + Math.random() * (max - min);
const TAU = Math.PI * 2;

const STORAGE_KEY = "star_strike_rush_high_score_v1";
const META_STORAGE_KEY = "star_strike_rush_meta_v1";
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
let recordsPanelTab = "global";
let achievementCategory = "all";
let achievementScroll = 0;
let titleSubState = "main";
let titlePanelAnim = 0.0;
let titlePanelTarget = 0.0;
let titleProgressScroll = 0;
let titleProgressDragActive = false;
let titleProgressDragPointerId = null;
let titleProgressDragY = 0;
let titleProgressDragX = 0;
let titleProgressDragStartScroll = 0;
let titleProgressDragMoved = false;
let titleProgressPointerDownNode = null;
let titleProgressSelectedNode = null;
let titleMetaScreenTransition = 1;
let titlePanelOrigin = { x: GAME_W / 2, y: GAME_H / 2 };
let playBtnPointerDown = false;
let playBtnPointerInside = false;
let settingMaxParticles = 900;
let settingScreenShake = true;
let settingReducedMotion = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
let settingReducedFlash = false;
let settingHighContrast = false;
let settingMusicEnabled = true;
let settingEffectsEnabled = true;
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
let deleteAccountConfirm = false;
let pauseConfirmAction = "";
let pauseConfirmPreviousNotice = "";

const FONT_TITLE = "800 52px Impact, Haettenschweiler, 'Arial Narrow Bold', sans-serif";
const FONT_HUGE = "800 58px Impact, Haettenschweiler, 'Arial Narrow Bold', sans-serif";
const FONT_SUBTITLE = "700 18px 'Arial Narrow', Arial, sans-serif";
const FONT_HUD = "700 16px 'Arial Narrow', Arial, sans-serif";
const FONT_COMBO = "800 20px Impact, Haettenschweiler, 'Arial Narrow Bold', sans-serif";
const FONT_SMALL = "700 12px 'Arial Narrow', Arial, sans-serif";
const FONT_TINY = "700 10px 'Arial Narrow', Arial, sans-serif";
const FONT_BUTTON = "900 15px 'Arial Narrow', Arial, sans-serif";

const ENEMY_DATA = Object.freeze(Object.fromEntries(Object.entries(AUTHORITATIVE_ENEMY_ARCHETYPES).map(([type, data]) => [type, Object.freeze({
  threat: data.threatHundredths / 100,
  score: data.score,
  radius: data.radiusPixels,
  hp: data.hp
})])));

const BOSS_SCORE = Object.freeze(Object.fromEntries(Object.entries(AUTHORITATIVE_BOSS_ARCHETYPES).map(([mode, data]) => [mode, data.score])));

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
  try {
    localStorage.setItem("star_strike_rush_callsign_v1", callSign);
    return true;
  } catch {
    return false;
  }
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
function accountIdentityAccessibilityKey() {
  const service = window.starStrikeOnline;
  return service && typeof service.getAccessibilityKey === "function"
    ? service.getAccessibilityKey()
    : "signed-out|";
}
function accountIdentityOverlaySnapshot() {
  const service = window.starStrikeOnline;
  return service && typeof service.getOverlayState === "function"
    ? service.getOverlayState()
    : {};
}
function editableCallSign() {
  const online = accountIdentitySnapshot();
  return online.user ? sanitizeCallSign(online.profileCallSign || "") : callSign;
}
function beginCallSignEditing() {
  callSignEditing = true;
  callSignDraft = editableCallSign();
  callSignInputEl.value = callSignDraft;
  callSignInputEl.tabIndex = 0;
  setCallSignStatus("", "editing", 0);
  callSignInputEl.focus();
}
function cancelCallSignEditing() {
  callSignEditing = false;
  callSignDraft = editableCallSign();
  callSignInputEl.value = callSignDraft;
  setCallSignStatus("", "idle", 0);
  callSignInputEl.tabIndex = -1;
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
      callSignInputEl.tabIndex = -1;
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
    const stored = saveCallSign();
    callSignEditing = false;
    callSignInputEl.tabIndex = -1;
    callSignInputEl.blur();
    setCallSignStatus(stored ? "SAVED ON THIS DEVICE" : "LOCAL SAVE FAILED", stored ? "success" : "error", 180);
    return stored;
  }
  callSignEditing = false;
  callSignInputEl.tabIndex = -1;
  callSignInputEl.blur();
  const onlineService = window.starStrikeOnline;
  if (savingAccountIdentity && onlineService && typeof onlineService.updateCallSign === "function") {
    setCallSignStatus("PUBLISHING TO ACCOUNT", "saving", 0);
    Promise.resolve(onlineService.updateCallSign(result.callSign)).then((syncResult) => {
      if (!syncResult || syncResult.storageSucceeded === false) {
        setCallSignStatus("ACCOUNT UPDATE FAILED", "error", 210);
      } else if (syncResult.published) {
        setCallSignStatus("ACCOUNT UPDATED", "success", 180);
      } else if (syncResult.pending) {
        setCallSignStatus("SAVED LOCALLY — ACCOUNT UPDATE PENDING", "pending", 240);
      } else {
        setCallSignStatus("ACCOUNT UPDATE FAILED", "error", 210);
      }
    }).catch(() => {
      setCallSignStatus("ACCOUNT UPDATE FAILED", "error", 210);
    });
  } else {
    setCallSignStatus("ACCOUNT UPDATE FAILED", "error", 210);
  }
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
  if (online.identityService === "unavailable") {
    setHandleStatus("IDENTITY SERVICE IS OFFLINE", 180);
    return false;
  }
  handleEditing = true;
  handleDraft = String(online.profileHandle || "");
  handleInputEl.value = handleDraft;
  handleInputEl.tabIndex = 0;
  setHandleStatus(online.profileHandle ? "CHOOSE A NEW UNIQUE PUBLIC HANDLE" : "CHOOSE A UNIQUE PUBLIC HANDLE", 0);
  handleInputEl.focus();
  return true;
}
function cancelHandleEditing() {
  handleEditing = false;
  handleDraft = "";
  handleInputEl.value = "";
  setHandleStatus("HANDLE CLAIM CANCELLED", 70);
  handleInputEl.tabIndex = -1;
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
    handleInputEl.tabIndex = -1;
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
      settingMusicEnabled,
      settingEffectsEnabled
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
    const legacyAudioEnabled = obj && typeof obj.settingSoundEffects === "boolean"
      ? obj.settingSoundEffects
      : null;
    settingMusicEnabled = obj && typeof obj.settingMusicEnabled === "boolean"
      ? obj.settingMusicEnabled
      : legacyAudioEnabled !== null ? legacyAudioEnabled : settingMusicEnabled;
    settingEffectsEnabled = obj && typeof obj.settingEffectsEnabled === "boolean"
      ? obj.settingEffectsEnabled
      : legacyAudioEnabled !== null ? legacyAudioEnabled : settingEffectsEnabled;
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
function gloryForScore(score) {
  return Math.floor(Math.max(0, Math.floor(score || 0)) / 10);
}
function makeDefaultMetaProgress() {
  return {
    version: META_PROGRESS_SCHEMA_VERSION,
    totalGlory: 0,
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
  const lifetime = data.lifetime && typeof data.lifetime === "object" ? data.lifetime : {};
  base.totalGlory = normalizedGloryInteger(data.totalGlory ?? data.glory);
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
  base.recentReceipts = Array.isArray(data.recentReceipts)
    ? data.recentReceipts.slice(-20).map((receipt) => ({
      receiptId: String((receipt && receipt.receiptId) || "").slice(0, 100),
      score: Math.max(0, Math.floor((receipt && receipt.score) || 0)),
      phaseReached: Math.max(1, Math.floor((receipt && receipt.phaseReached) || 1)),
      gloryGained: Math.max(0, Math.floor((receipt && receipt.gloryGained) || 0)),
      totalGloryAfter: Math.max(0, Math.floor((receipt && receipt.totalGloryAfter) || 0)),
      prestigeAfter: Math.max(0, Math.floor((receipt && receipt.prestigeAfter) || 0)),
      roadGloryAfter: Math.max(0, Math.floor((receipt && receipt.roadGloryAfter) || 0)),
      endedAtMs: Math.max(0, Math.floor((receipt && receipt.endedAtMs) || 0))
    }))
    : [];
  base.lastUpdatedAtMs = Math.max(0, Math.floor(data.lastUpdatedAtMs || 0));
  return base;
}
function loadMetaProgress() {
  try {
    const raw = localStorage.getItem(META_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    metaProgress = sanitizeStoredMetaProgress(parsed);
    if (!raw || JSON.stringify(parsed) !== JSON.stringify(metaProgress)) {
      try { localStorage.setItem(META_STORAGE_KEY, JSON.stringify(metaProgress)); } catch {}
    }
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
  const road = gloryRoadStateForTotal(progress.totalGlory);
  return {
    totalGlory: progress.totalGlory,
    prestige: road.prestige,
    prestigeLabel: road.prestigeLabel,
    roadGlory: road.roadGlory,
    roadLength: GLORY_ROAD_LENGTH,
    roadProgress: road.roadProgress,
    gloryRank: road.rank.name,
    gloryRankDisplay: road.displayRankName,
    gloryRankIndex: road.rank.index,
    nextGloryRank: road.rank.nextName,
    nextGloryThreshold: road.rank.nextThreshold,
    rankProgress: road.rank.progress,
    lifetime: { ...progress.lifetime }
  };
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
  const progressionAllowed = typeof runModeAllowsProgression === "function"
    ? runModeAllowsProgression(state.runMode)
    : state.runMode === "standard";
  if (!progressionAllowed) {
    return { nonProgressionRun: true, runMode: state.runMode, snapshot: currentMetaSnapshot(), receipt: null };
  }
  if (stats.metaApplied) return lastRunMeta || { snapshot: currentMetaSnapshot(), receipt: currentRunReceiptSnapshot() };
  const progress = getMetaProgress();
  const receipt = currentRunReceiptSnapshot();
  const beforeGlory = progress.totalGlory;
  const beforeRoad = gloryRoadStateForTotal(beforeGlory);
  const gloryGained = gloryForScore(receipt.score);

  progress.totalGlory += gloryGained;
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
  const afterRoad = gloryRoadStateForTotal(progress.totalGlory);
  const milestoneEvents = gloryMilestonesCrossed(beforeGlory, progress.totalGlory);
  progress.recentReceipts.push({
    receiptId: receipt.receiptId,
    score: receipt.score,
    phaseReached: receipt.phaseReached,
    gloryGained,
    totalGloryAfter: progress.totalGlory,
    prestigeAfter: afterRoad.prestige,
    roadGloryAfter: afterRoad.roadGlory,
    endedAtMs: receipt.endedAtMs
  });
  if (progress.recentReceipts.length > 20) progress.recentReceipts.splice(0, progress.recentReceipts.length - 20);
  stats.metaApplied = true;
  const rankEvents = milestoneEvents.filter((event) => event.type === "rank");
  const prestigeEvents = milestoneEvents.filter((event) => event.type === "prestige");
  const presentationEvents = gloryCelebrationQueue(milestoneEvents, beforeGlory, progress.totalGlory);
  lastRunMeta = {
    receipt,
    gloryBefore: beforeGlory,
    gloryAfter: progress.totalGlory,
    gloryGained,
    prestigeBefore: beforeRoad.prestige,
    prestigeAfter: afterRoad.prestige,
    roadGloryBefore: beforeRoad.roadGlory,
    roadGloryAfter: afterRoad.roadGlory,
    rankBefore: beforeRoad.displayRankName,
    rankAfter: afterRoad.displayRankName,
    rankIndexBefore: beforeRoad.rank.index,
    rankIndexAfter: afterRoad.rank.index,
    rankUp: rankEvents.length > 0,
    prestigeEarned: prestigeEvents.length > 0,
    prestigeCrossings: prestigeEvents.length,
    milestoneEvents,
    presentationEvents,
    snapshot: currentMetaSnapshot()
  };
  saveMetaProgress();
  return lastRunMeta;
}
function getLastRunMeta() {
  return lastRunMeta ? JSON.parse(JSON.stringify(lastRunMeta)) : null;
}
function saveMilestone() {
  const allowed = typeof runModeAllowsProgression === "function"
    ? runModeAllowsProgression(state.runMode)
    : state.runMode === "standard";
  if (allowed && highScoreDirty) saveHighScore();
}
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
  inputHintTimer: 0,
  inputHintAcknowledged: false,
  debugErrors: [],
  safeLanes: [],
  playerRealm: 0,
  difficultySamples: [],
  difficultyDeaths: 0,
  verifiedRunLedger: null,
  verifiedRunSession: null,
  verifiedRunPromise: null,
  verifiedInputTape: null,
  runMode: "standard",
  pausedReason: "",
  pauseNotice: "",
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
}
function addFlatScore(points) {
  state.score += points;
}
function recordTrustedRunEvent(type, detail = {}) {
  if (state.runMode !== "standard" || typeof appendTrustedRunEvent !== "function") return false;
  return appendTrustedRunEvent(state.verifiedRunLedger, state.frame, type, detail);
}
function noteKill(basePoints, enemyType = "", enemyId = "") {
  state.comboKills++;
  state.difficulty.killStreak++;
  state.runStats.kills++;
  state.runStats.highestCombo = Math.max(state.runStats.highestCombo || 0, state.comboKills);
  refreshMultiplier();
  addScore(basePoints);
  recordTrustedRunEvent("kill", { kind: enemyType, entityId: `enemy_${enemyId}` });
}
function resetCombo() { state.comboKills = 0; refreshMultiplier(); state.difficulty.killStreak = 0; }
