function beginGame() { setupSession("playing"); showMessage("PHASE 1", 90); }
function setupSession(mode = "start") {
  state.player = makePlayer();
  state.bullets = [];
  state.enemyBullets = [];
  state.enemies = [];
  state.debris = [];
  state.enemyBeams = [];
  state.gravityWells = [];
  state.powerups = [];
  state.particles = [];
  state.boss = null;
  state.bossDeath = null;
  state.bossRecovery = 0;
  state.wingmen = [];
  state.pendingSpawns = [];
  state.score = 0;
  state.multiplier = 1;
  state.comboKills = 0;
  state.comboPulse = 0;
  state.phase = 1;
  state.frame = 0;
  state.waveTimer = 0;
  state.phaseTimer = 0;
  state.waveIndex = 0;
  state.waveRest = 0;
  state.pressure = 8;
  state.threatScore = 0;
  state.cachedBulletPressure = 0;
  state.cachedBulletBudget = 0;
  state.frameBulletSpent = 0;
  state.message = "";
  state.messageTimer = 0;
  state.messageMax = 0;
  state.messageQueue = [];
  state.fx.shake = 0;
  state.fx.flash = 0;
  state.gameOverShake = 0;
  state.gameOverShakeTimer = 0;
  state.killsSinceLastDrop = 0;
  state.framesSinceLastDrop = 0;
  state.powerupDropCooldown = 0;
  state.debrisEventTimer = 1200;
  state.debrisWarningTimer = 0;
  state.lastDebrisFrame = -9999;
  state.lastBossMode = null;
  state.intensityPhase = "normal";
  state.intensityTimer = 180;
  state.waveMood = "open";
  state.waveMoodTimer = 120;
  state.lastWaveTemplateName = null;
  state.difficulty.threat = 0.58;
  state.difficulty.target = 0.58;
  state.difficulty.grace = 0;
  state.difficulty.ghostGrace = 0;
  state.difficulty.heatStreak = false;
  state.difficulty.lastHitFrame = -999;
  state.difficulty.killStreak = 0;
  state.difficulty.burst = 0;
  state.difficulty.shotsFired = 0;
  state.difficulty.shotsHit = 0;
  state.difficulty.pacingMemory = 0;
  state.playerRealm = 0;
  state.devStatsVisible = false;
  state.runStats.kills = 0;
  state.runStats.powerups = 0;
  state.runStats.ghostUses = 0;
  state.runStats.bosses = 0;
  state.runStats.damageTaken = 0;
  state.runStats.highestCombo = 0;
  state.runStats.startedAtMs = Date.now();
  state.runStats.metaApplied = false;
  lastRunMeta = null;
  state.gameState = mode;
  state.keyboard.up = false;
  state.keyboard.down = false;
  state.keyboard.left = false;
  state.keyboard.right = false;
  state.joystick.active = false;
  state.joystick.id = null;
  state.joystick.ax = 0;
  state.joystick.ay = 0;
  encounterCard = null;
  encounterQueue = [];
  playBtnHold = 0;
  playBtnPointerDown = false;
  playBtnPointerInside = false;
  respawnHold = 0;
  respawnPointerDown = false;
  respawnPointerInside = false;
  titleSubState = "main";
  titlePanelAnim = 0;
  titlePanelTarget = 0;
  titleProgressTab = "glory";
  titleProgressScroll = 0;
  titleProgressDragActive = false;
  titleProgressDragPointerId = null;
  titleProgressDragY = 0;
  titleProgressDragX = 0;
  titleProgressDragStartScroll = 0;
  titleProgressDragMoved = false;
  titleProgressPointerDownNode = null;
  titleProgressSelectedNode = null;
  codexDetailType = null;
  resetProgressConfirm = false;
  highScoreDirty = false;
  state.stars = [];
  for (let i = 0; i < 110; i++) {
    state.stars.push({ x: Math.random() * W, y: Math.random() * H, s: Math.random() * 2 + 0.5, spd: Math.random() * 0.9 + 0.3 });
  }
  initTitleFormations();
  refreshMultiplier();
}
function enterGameOver() {
  state.gameState = "gameover";
  previousHighScore = highScore;
  if (state.score > highScore) { highScore = state.score; highScoreDirty = true; }
  if (highScoreDirty) saveHighScore();
  applyRunMetaProgress();
  state.message = "";
  state.messageTimer = 0;
  state.messageMax = 0;
  state.messageQueue = [];
  state.fx.shake = 0;
  state.fx.flash = 0;
  state.gameOverShakeTimer = 180;
  state.gameOverShake = 6;
  submitOnlineRun();
}
function resize() {
  const screenW = window.innerWidth;
  const screenH = window.innerHeight;
  canvas.width = screenW;
  canvas.height = screenH;
  scale = Math.min(screenW / GAME_W, screenH / GAME_H);
  offsetX = Math.round((screenW - GAME_W * scale) / 2);
  offsetY = Math.round((screenH - GAME_H * scale) / 2);
  W = GAME_W;
  H = GAME_H;
  if (!state.player) return;
  state.player.x = clamp(state.player.x, 20, W - 20);
  state.player.y = clamp(state.player.y, H * 0.60, H - 28);
  for (const w of state.wingmen) {
    w.x = clamp(w.x, 20, W - 20);
    w.y = clamp(w.y, H * 0.55, H - 20);
  }
  if (state.gameState === "start") initTitleFormations();
}

function resetProgressData() {
  highScore = 0;
  previousHighScore = 0;
  highScoreDirty = true;
  saveHighScore();
  codexDiscovered = {};
  codexHasNew = false;
  saveCodexDiscovered();
  metaProgress = makeDefaultMetaProgress();
  lastRunMeta = null;
  saveMetaProgress();
  encounterQueue = [];
  encounterCard = null;
}
function titlePanelHit(x, y) {
  const panel = getTitlePanelRect();
  return titlePanelAnim > 0.02 && x >= panel.x && x <= panel.x + panel.w && y >= panel.y && y <= panel.y + panel.h;
}
function handleResetProgressConfirmDown(x, y) {
  if (!resetProgressConfirm) return false;
  const r = getResetConfirmRects();
  if (hitRect(r.yes, x, y)) {
    resetProgressConfirm = false;
    resetProgressData();
    titleSubState = "main";
    titlePanelTarget = 0;
    codexDetailType = null;
    return true;
  }
  if (hitRect(r.no, x, y)) {
    resetProgressConfirm = false;
    return true;
  }
  return true;
}
function setTitleProgressTab(tab) {
  if (titleProgressTab !== tab) {
    titleProgressTab = tab;
    titleProgressDragActive = false;
    titleProgressDragPointerId = null;
    titleProgressPointerDownNode = null;
    titleProgressSelectedNode = null;
    if (typeof focusTitleProgressOnCurrent === "function") focusTitleProgressOnCurrent();
  }
  clampTitleProgressScroll();
}
function beginTitleProgressDrag(pointerId, x, y) {
  titleProgressDragActive = true;
  titleProgressDragPointerId = pointerId;
  titleProgressDragY = y;
  titleProgressDragX = x;
  titleProgressDragStartScroll = titleProgressScroll;
  titleProgressDragMoved = false;
  titleProgressPointerDownNode = typeof getProgressNodeAt === "function" ? getProgressNodeAt(x, y) : null;
  if (pointerId !== null && pointerId !== undefined) {
    try { canvas.setPointerCapture(pointerId); } catch {}
  }
}
function updateTitleProgressDrag(pointerId, x, y) {
  if (!titleProgressDragActive) return false;
  if (titleProgressDragPointerId !== null && titleProgressDragPointerId !== pointerId) return false;
  if (Math.hypot(x - titleProgressDragX, y - titleProgressDragY) > 7) {
    titleProgressDragMoved = true;
    titleProgressSelectedNode = null;
  }
  titleProgressScroll = titleProgressDragStartScroll + (titleProgressDragY - y) * 1.12;
  clampTitleProgressScroll();
  return true;
}
function endTitleProgressDrag(pointerId) {
  if (!titleProgressDragActive) return false;
  if (titleProgressDragPointerId !== null && titleProgressDragPointerId !== pointerId) return false;
  if (!titleProgressDragMoved) titleProgressSelectedNode = titleProgressPointerDownNode;
  titleProgressDragActive = false;
  titleProgressDragPointerId = null;
  titleProgressPointerDownNode = null;
  return true;
}
function openTitleProgressRoad(tab = null) {
  titleSubState = "progress";
  titlePanelTarget = 1;
  codexDetailType = null;
  titleProgressDragActive = false;
  titleProgressDragPointerId = null;
  titleProgressPointerDownNode = null;
  titleProgressSelectedNode = null;
  if (tab) titleProgressTab = tab;
  if (typeof focusTitleProgressOnCurrent === "function") focusTitleProgressOnCurrent();
  else clampTitleProgressScroll();
}
function handleTitlePointerDown(x, y, pointerId = null) {
  if (resetProgressConfirm) return handleResetProgressConfirmDown(x, y);

  if (titlePanelAnim > 0.02) {
    if (titlePanelHit(x, y)) {
      if (titleSubState === "codex") {
        const r = getCodexRects();
        if (hitRect(r.closeRect, x, y)) { titlePanelTarget = 0; codexDetailType = null; return true; }
        if (codexDetailType) {
          const detailCard = { x: r.panel.x + 18, y: r.panel.y + 78, w: r.panel.w - 36, h: r.panel.h - 94 };
          const backRect = { x: detailCard.x + 10, y: detailCard.y + 10, w: 28, h: 22 };
          if (hitRect(backRect, x, y)) { codexDetailType = null; return true; }
          if (!(x >= detailCard.x && x <= detailCard.x + detailCard.w && y >= detailCard.y && y <= detailCard.y + detailCard.h)) {
            codexDetailType = null;
            return true;
          }
          return true;
        }
        const types = typeof getCodexTypes === "function" ? getCodexTypes() : ["red", "orange", "purple", "phantom", "boss_standard", "boss_wraith"];
        for (const type of types) {
          const card = r.rects[type];
          if (!hitRect(card, x, y)) continue;
          if (codexDiscovered[type]) {
            codexDetailType = type;
          }
          return true;
        }
        return true;
      }
      if (titleSubState === "online") {
        const r = getOnlineRects();
        if (hitRect(r.closeRect, x, y)) { titlePanelTarget = 0; codexDetailType = null; return true; }
        if (hitRect(r.signIn, x, y)) { requestOnlineSignIn(); return true; }
        if (hitRect(r.signOut, x, y)) { requestOnlineSignOut(); return true; }
        if (hitRect(r.low, x, y)) { settingMaxParticles = 300; MAX_PARTICLES = settingMaxParticles; saveSettings(); return true; }
        if (hitRect(r.med, x, y)) { settingMaxParticles = 600; MAX_PARTICLES = settingMaxParticles; saveSettings(); return true; }
        if (hitRect(r.high, x, y)) { settingMaxParticles = 900; MAX_PARTICLES = settingMaxParticles; saveSettings(); return true; }
        if (hitRect(r.shake, x, y)) { settingScreenShake = !settingScreenShake; saveSettings(); return true; }
        if (hitRect(r.reset, x, y)) { resetProgressConfirm = true; return true; }
        if (hitRect(r.refresh, x, y)) { requestOnlineRefresh(); return true; }
        return true;
      }
      if (titleSubState === "records") {
        const r = getRecordsRects();
        if (hitRect(r.closeRect, x, y)) { titlePanelTarget = 0; codexDetailType = null; return true; }
        if (hitRect(r.refresh, x, y)) { requestOnlineRefresh(); return true; }
        return true;
      }
      if (titleSubState === "achievements") {
        const r = getAchievementsRects();
        if (hitRect(r.closeRect, x, y)) { titlePanelTarget = 0; codexDetailType = null; return true; }
        return true;
      }
      if (titleSubState === "progress") {
        const r = getProgressRects();
        if (hitRect(r.closeRect, x, y)) { titlePanelTarget = 0; codexDetailType = null; return true; }
        if (hitRect(r.gloryTab, x, y)) { setTitleProgressTab("glory"); return true; }
        if (hitRect(r.seasonTab, x, y)) { setTitleProgressTab("season"); return true; }
        if (typeof getProgressDetailRect === "function" && titleProgressSelectedNode && hitRect(getProgressDetailRect(), x, y)) return true;
        if (hitRect(r.contentRect, x, y)) { beginTitleProgressDrag(pointerId, x, y); return true; }
        return true;
      }
    }
    return true;
  }

  const callRect = getCallSignRect();
  const playRect = getPlayButtonRect();
  const iconRects = getTitleIconRects();

  if (hitRect(callRect, x, y)) {
    callSignEditing = true;
    callSignInputEl.value = callSign;
    callSignInputEl.focus();
    return true;
  }
  if (callSignEditing) {
    callSignEditing = false;
    callSignInputEl.blur();
  }

  if (hitRect(playRect, x, y)) {
    playBtnPointerDown = true;
    playBtnPointerInside = true;
    playBtnHold = 0;
    return true;
  }
  if (hitRect(iconRects.account, x, y)) {
    if (titleSubState === "online" && titlePanelTarget === 1) { titlePanelTarget = 0; codexDetailType = null; }
    else { titleSubState = "online"; titlePanelTarget = 1; codexDetailType = null; }
    return true;
  }
  if (hitRect(iconRects.achievements, x, y)) {
    if (titleSubState === "achievements" && titlePanelTarget === 1) { titlePanelTarget = 0; codexDetailType = null; }
    else { titleSubState = "achievements"; titlePanelTarget = 1; codexDetailType = null; }
    return true;
  }
  if (hitRect(iconRects.progress, x, y)) {
    if (titleSubState === "progress" && titlePanelTarget === 1) { titlePanelTarget = 0; codexDetailType = null; }
    else openTitleProgressRoad();
    return true;
  }
  if (hitRect(iconRects.records, x, y)) {
    if (titleSubState === "records" && titlePanelTarget === 1) { titlePanelTarget = 0; codexDetailType = null; }
    else { titleSubState = "records"; titlePanelTarget = 1; codexDetailType = null; }
    return true;
  }
  if (hitRect(iconRects.codex, x, y)) {
    codexHasNew = false;
    if (titleSubState === "codex" && titlePanelTarget === 1) { titlePanelTarget = 0; codexDetailType = null; }
    else { titleSubState = "codex"; titlePanelTarget = 1; }
    return true;
  }

  return false;
}
function handleGameOverPointerDown(x, y) {
  const buttons = getGameOverButtons();
  if (hitRect(buttons.respawn, x, y)) {
    respawnPointerDown = true;
    respawnPointerInside = true;
    respawnHold = 0;
    return true;
  }
  if (hitRect(buttons.title, x, y)) {
    setupSession("start");
    return true;
  }
  if (buttons.road && hitRect(buttons.road, x, y)) {
    state.gameState = "start";
    titlePanelAnim = 1;
    const meta = typeof getLastRunMeta === "function" ? getLastRunMeta() : null;
    openTitleProgressRoad(meta && meta.rankUp ? "glory" : "season");
    return true;
  }
  return false;
}
canvas.addEventListener("pointerdown", (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left - offsetX) / scale;
  const y = (e.clientY - rect.top - offsetY) / scale;
  if (state.gameState === "gameover") {
    if (handleGameOverPointerDown(x, y)) return;
    return;
  }
  if (state.gameState === "playing") {
    if (inDevSkipZone(x, y)) { triggerPhaseSkip(); return; }
    if (onDevToggleZone(x, y)) { state.devStatsVisible = !state.devStatsVisible; return; }
  }
  if (state.gameState !== "playing") {
    if (handleTitlePointerDown(x, y, e.pointerId)) return;
    return;
  }
  canvas.setPointerCapture(e.pointerId);
  if (onActionZone(x, y)) { attemptGhost(); return; }
  if (onJoystickZone(x, y)) {
    state.joystick.active = true;
    state.joystick.id = e.pointerId;
    state.joystick.cx = 76;
    state.joystick.cy = H - 76;
    updateJoystickFromPointer(e);
  }
});
canvas.addEventListener("pointermove", (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left - offsetX) / scale;
  const y = (e.clientY - rect.top - offsetY) / scale;
  if (state.gameState !== "playing") {
    if (updateTitleProgressDrag(e.pointerId, x, y)) {
      e.preventDefault();
      return;
    }
    if (playBtnPointerDown) {
      const playRect = getPlayButtonRect();
      playBtnPointerInside = hitRect(playRect, x, y);
    }
    if (respawnPointerDown) {
      const respawnRect = getGameOverButtons().respawn;
      respawnPointerInside = hitRect(respawnRect, x, y);
    }
    return;
  }
  if (state.joystick.active && state.joystick.id === e.pointerId) {
    updateJoystickFromPointer(e);
    const mag = Math.hypot(state.joystick.ax, state.joystick.ay);
    if (mag > 1) { state.joystick.ax /= mag; state.joystick.ay /= mag; }
  }
  if (playBtnPointerDown) {
    const playRect = getPlayButtonRect();
    playBtnPointerInside = hitRect(playRect, x, y);
  }
});
function updateJoystickFromPointer(e) {
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left - offsetX) / scale;
  const y = (e.clientY - rect.top - offsetY) / scale;
  const dx = x - state.joystick.cx, dy = y - state.joystick.cy;
  const d = Math.hypot(dx, dy);
  const r = state.joystick.radius;
  const s = d > r ? r / d : 1;
  state.joystick.ax = (dx * s) / r;
  state.joystick.ay = (dy * s) / r;
}
function endPointer(e) {
  endTitleProgressDrag(e.pointerId);
  if (state.joystick.active && state.joystick.id === e.pointerId) {
    state.joystick.active = false;
    state.joystick.id = null;
    state.joystick.ax = 0;
    state.joystick.ay = 0;
  }
  if (state.gameState === "gameover" && respawnPointerDown && respawnPointerInside) {
    respawnPointerDown = false;
    respawnPointerInside = false;
    respawnHold = 0;
    beginGame();
    return;
  }
  if (state.gameState === "start" && playBtnPointerDown && playBtnPointerInside) {
    playBtnPointerDown = false;
    playBtnPointerInside = false;
    playBtnHold = 0;
    beginGame();
    return;
  }
  if (state.gameState === "gameover") {
    respawnPointerDown = false;
    respawnPointerInside = false;
    respawnHold = 0;
    return;
  }
  if (state.gameState !== "playing") {
    playBtnPointerDown = false;
    playBtnPointerInside = false;
    playBtnHold = 0;
    return;
  }
}
canvas.addEventListener("pointerup", endPointer);
canvas.addEventListener("pointercancel", endPointer);
canvas.addEventListener("wheel", (e) => {
  if (state.gameState === "playing" || titleSubState !== "progress" || titlePanelAnim <= 0.02) return;
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left - offsetX) / scale;
  const y = (e.clientY - rect.top - offsetY) / scale;
  const r = getProgressRects();
  if (!hitRect(r.panel, x, y)) return;
  e.preventDefault();
  titleProgressSelectedNode = null;
  titleProgressScroll += e.deltaY / Math.max(0.5, scale);
  clampTitleProgressScroll();
}, { passive: false });
function onActionZone(x, y) { const cx = W - 76, cy = H - 76; return Math.hypot(x - cx, y - cy) <= 42; }
function onJoystickZone(x, y) { const cx = 76, cy = H - 76; return Math.hypot(x - cx, y - cy) <= 62; }
function isMoveKey(key) {
  return key === "ArrowUp" || key === "ArrowDown" || key === "ArrowLeft" || key === "ArrowRight" ||
         key === "w" || key === "a" || key === "s" || key === "d" ||
         key === "W" || key === "A" || key === "S" || key === "D";
}
window.addEventListener("keydown", (e) => {
  if (callSignEditing) {
    setCallSignFromInputKey(e);
    return;
  }
  const k = e.key;
  if (state.gameState === "start") {
    if (k === "Enter" || k === " ") {
      e.preventDefault();
      beginGame();
    }
    return;
  }
  if (state.gameState === "gameover") {
    if (k === "Enter" || k === " ") {
      e.preventDefault();
      beginGame();
    }
    return;
  }
  if (state.gameState === "playing") {
    if (isMoveKey(k)) {
      e.preventDefault();
      if (k === "ArrowUp" || k === "w" || k === "W") state.keyboard.up = true;
      if (k === "ArrowDown" || k === "s" || k === "S") state.keyboard.down = true;
      if (k === "ArrowLeft" || k === "a" || k === "A") state.keyboard.left = true;
      if (k === "ArrowRight" || k === "d" || k === "D") state.keyboard.right = true;
      return;
    }
    if (!e.repeat && !e.ctrlKey && !e.altKey && !e.metaKey) { e.preventDefault(); attemptGhost(); }
  }
});
window.addEventListener("keyup", (e) => {
  const k = e.key;
  if (k === "ArrowUp" || k === "w" || k === "W") state.keyboard.up = false;
  if (k === "ArrowDown" || k === "s" || k === "S") state.keyboard.down = false;
  if (k === "ArrowLeft" || k === "a" || k === "A") state.keyboard.left = false;
  if (k === "ArrowRight" || k === "d" || k === "D") state.keyboard.right = false;
});
window.addEventListener("beforeunload", () => {
  if (highScoreDirty) saveHighScore();
  saveCallSign();
  saveSettings();
  saveCodexDiscovered();
  saveMetaProgress();
});

function update() {
  if (devSkipCooldown > 0) devSkipCooldown--;
  state.frame++;

  if (state.gameState === "start") {
    updateTitleScreen();
    updateStars();
    updateParticles();
    return;
  }

  if (state.gameState === "gameover") {
    updateStars();
    updateParticles();
    const GAME_OVER_SHAKE_FRAMES = 180;
    if (state.gameOverShakeTimer > 0) {
      const t = 1 - state.gameOverShakeTimer / GAME_OVER_SHAKE_FRAMES;
      state.gameOverShake = 6 * Math.exp(-4.8 * t);
      state.gameOverShakeTimer--;
    } else {
      state.gameOverShake = 0;
    }
    updateRespawnHold();
    return;
  }

  state.framesSinceLastDrop++;
  if (state.powerupDropCooldown > 0) state.powerupDropCooldown--;
  state.comboPulse = Math.max(0, state.comboPulse - 1);

  updateStars();
  updateWavesAndPhaseAndPressure();
  updatePlayer();
  updateWingmen();
  updateBullets();
  updateEnemies();
  updateBoss();
  updateBossDeathIfNeeded();
  updatePowerups();
  if (typeof updateExpansionHazards === "function") updateExpansionHazards();
  updateCollisions();
  updateParticles();

  state.fx.shake = Math.max(0, state.fx.shake - 0.7);
  state.fx.flash = Math.max(0, state.fx.flash - 0.8);

  if (state.messageTimer > 0) {
    state.messageTimer--;
    if (state.messageTimer <= 0) showNextMessage();
  } else if (state.messageQueue.length > 0 && !state.message) {
    showNextMessage();
  }

  if (encounterCard) {
    encounterCard.timer++;
    if (encounterCard.timer >= ENCOUNTER_CARD_DURATION) encounterCard = null;
  } else if (encounterQueue.length > 0) {
    encounterCard = { type: encounterQueue.shift(), timer: 0, maxTimer: ENCOUNTER_CARD_DURATION };
  }
}

const DEBUG_SNAPSHOT_ENABLED = new URLSearchParams(window.location.search).has("debug");
let debugSnapshotEl = null;

function getDebugSnapshot() {
  return {
    gameState: state.gameState,
    frame: state.frame,
    score: state.score,
    highScore,
    phase: state.phase,
    player: state.player ? {
      x: state.player.x,
      y: state.player.y,
      hp: state.player.hp,
      energy: state.player.energy,
      inv: state.player.inv,
      ghostTimer: state.player.ghostTimer,
      ghostCooldown: state.player.ghostCooldown
    } : null,
    counts: {
      bullets: state.bullets.length,
      enemyBullets: state.enemyBullets.length,
      enemies: state.enemies.length,
      debris: state.debris.length,
      beams: state.enemyBeams.length,
      gravityWells: state.gravityWells.length,
      powerups: state.powerups.length,
      particles: state.particles.length,
      stars: state.stars.length,
      titleFormations: state.titleFormations.length
    },
    ui: {
      titleSubState,
      titlePanelTarget,
      titlePanelAnim,
      callSign,
      settingMaxParticles,
      settingScreenShake,
      codexHasNew,
      codexDetailType,
      titleProgressTab,
      titleProgressScroll,
      titleProgressMaxScroll: typeof getProgressMaxScroll === "function" ? getProgressMaxScroll() : 0,
      titleProgressDragActive,
      titleProgressSelectedNode: titleProgressSelectedNode ? {
        id: titleProgressSelectedNode.id,
        tab: titleProgressSelectedNode.tab,
        title: titleProgressSelectedNode.title,
        status: titleProgressSelectedNode.status
      } : null,
      resetProgressConfirm
    }
  };
}

function updateDebugSnapshot() {
  if (!DEBUG_SNAPSHOT_ENABLED) return;
  if (!debugSnapshotEl) {
    debugSnapshotEl = document.createElement("pre");
    debugSnapshotEl.id = "debugSnapshot";
    debugSnapshotEl.hidden = true;
    document.body.appendChild(debugSnapshotEl);
  }
  debugSnapshotEl.textContent = JSON.stringify(getDebugSnapshot());
}

function loop() { update(); draw(); updateDebugSnapshot(); requestAnimationFrame(loop); }

loadHighScore();
loadCallSign();
loadSettings();
loadCodexDiscovered();
loadMetaProgress();
resize();
setupSession("start");
window.addEventListener("resize", resize);
loop();
