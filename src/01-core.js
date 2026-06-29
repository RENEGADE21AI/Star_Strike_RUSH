const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const callSignInputEl = document.getElementById("callSignInput");

const GAME_W = 375;
const GAME_H = 667;
let scale = 1;
let offsetX = 0;
let offsetY = 0;

let W = GAME_W, H = GAME_H;
let devSkipCooldown = 0;
const DEV_SKIP_COOLDOWN_FRAMES = 48;
let MAX_PARTICLES = 900;
let enemyIdCounter = 1;

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const rand = (min, max) => min + Math.random() * (max - min);
const TAU = Math.PI * 2;

const STORAGE_KEY = "star_strike_rush_high_score_v1";
let highScore = 0;
let previousHighScore = 0;
let highScoreDirty = false;

let callSign = "";
let callSignEditing = false;
let callSignCursorBlink = 0;
let titleSubState = "main";
let titlePanelAnim = 0.0;
let titlePanelTarget = 0.0;
let playBtnHold = 0;
let playBtnPointerDown = false;
let playBtnPointerInside = false;
let settingMaxParticles = 900;
let settingScreenShake = true;
let respawnHold = 0;
let respawnPointerDown = false;
let respawnPointerInside = false;
let codexDiscovered = {};
let codexHasNew = false;
let encounterQueue = [];
let encounterCard = null;
const ENCOUNTER_CARD_DURATION = 210;
let codexDetailType = null;
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
function saveCallSign() {
  try { localStorage.setItem("star_strike_rush_callsign_v1", callSign); } catch {}
}
function saveSettings() {
  try {
    localStorage.setItem("star_strike_rush_settings_v1", JSON.stringify({
      settingMaxParticles,
      settingScreenShake
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
  } catch {}
  MAX_PARTICLES = settingMaxParticles;
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
  const item = { text, frames };
  if (state.messageTimer > 0 || state.messageQueue.length > 0) state.messageQueue.push(item);
  else {
    state.message = text;
    state.messageTimer = frames;
    state.messageMax = frames;
  }
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
  if (state.phase === 1) base = 8.5 + state.phaseTimer / 240;
  if (state.player.hp <= 2) base -= 2.0;
  if (state.player.hp === 1) base -= 1.0;
  if (state.difficulty.grace > 0) base -= 2.0;
  if (state.difficulty.ghostGrace > 0) base -= 1.2;
  if (state.boss) base -= 1.5;
  base -= state.difficulty.burst * 3.5;
  if (state.intensityPhase === "surge") base += 2.0;
  if (state.intensityPhase === "cooldown") base -= 1.3;
  return clamp(base * state.difficulty.threat, 8, 26);
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
  multiplier: 1,
  comboKills: 0,
  comboPulse: 0,
  phase: 1,
  frame: 0,
  waveTimer: 0,
  phaseTimer: 0,
  waveIndex: 0,
  waveRest: 0,
  pressure: 20,
  threatScore: 0,
  cachedBulletPressure: 0,
  cachedBulletBudget: 0,
  frameBulletSpent: 0,
  message: "",
  messageTimer: 0,
  messageMax: 0,
  messageQueue: [],
  fx: { shake: 0, flash: 0 },
  gameOverShake: 0,
  gameOverShakeTimer: 0,
  difficulty: {
    threat: 0.75,
    target: 0.75,
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
  playerRealm: 0,
  devStatsVisible: false,
  runStats: { kills: 0, powerups: 0, ghostUses: 0, bosses: 0 },
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
  callSign = sanitizeCallSign(callSignInputEl.value);
  callSignInputEl.value = callSign;
  saveCallSign();
});
callSignInputEl.addEventListener("blur", () => {
  callSignEditing = false;
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
    ghostCooldown: 0,
    overcharge: 0,
    phaseShield: 0,
    magnet: 0,
    piercing: 0,
    stabilizer: 0,
    scoreSurge: 0,
    maxSpeed: 5.2
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
function noteKill(basePoints) { state.comboKills++; state.difficulty.killStreak++; state.runStats.kills++; refreshMultiplier(); addScore(basePoints); }
function resetCombo() { state.comboKills = 0; refreshMultiplier(); state.difficulty.killStreak = 0; }
