function startPlayingSession() {
  setupSession("playing");
  state.sceneTransition = { mode: "game_arrival", frame: 0, duration: settingReducedMotion ? 1 : 36 };
  state.player.inv = Math.max(state.player.inv, 45);
  showMessage("PHASE 1", 90);
}
function beginGame() {
  if (state.gameState === "start") {
    if (state.sceneTransition.mode !== "idle") return;
    titlePanelTarget = 0;
    state.sceneTransition = { mode: "title_launch", frame: 0, duration: settingReducedMotion ? 1 : 42 };
    clearGameplayInput();
    return;
  }
  startPlayingSession();
}
function clearGameplayInput() {
  state.keyboard.up = false;
  state.keyboard.down = false;
  state.keyboard.left = false;
  state.keyboard.right = false;
  state.joystick.active = false;
  state.joystick.id = null;
  state.joystick.ax = 0;
  state.joystick.ay = 0;
}
function pauseGame(reason = "manual") {
  if (state.gameState !== "playing" && state.gameState !== "resuming") return false;
  clearGameplayInput();
  state.pausedReason = reason;
  state.resumeCountdown = 0;
  state.gameState = "paused";
  return true;
}
function resumeGame() {
  if (state.gameState !== "paused") return false;
  clearGameplayInput();
  state.pausedReason = "";
  state.resumeCountdown = 90;
  state.gameState = "resuming";
  return true;
}
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
  state.runStartingHighScore = highScore;
  state.newHighScore = false;
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
  state.notices = [];
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
  state.difficultySamples = [];
  state.difficultyDeaths = 0;
  state.runStats.kills = 0;
  state.runStats.powerups = 0;
  state.runStats.abilityUses = 0;
  state.runStats.ghostUses = 0;
  state.runStats.dashUses = 0;
  state.runStats.realmHops = 0;
  state.runStats.bosses = 0;
  state.runStats.damageTaken = 0;
  state.runStats.highestCombo = 0;
  state.runStats.activeFrames = 0;
  state.runStats.startedAtMs = Date.now();
  state.runStats.metaApplied = false;
  lastRunMeta = null;
  state.gameState = mode;
  state.runMode = "standard";
  state.pausedReason = "";
  state.resumeCountdown = 0;
  if (mode === "start") state.sceneTransition = { mode: "idle", frame: 0, duration: 1 };
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
  titleProgressClaimPulse = 0;
  titleMetaScreenTransition = 1;
  codexDetailType = null;
  resetProgressConfirm = false;
  callSignEditing = false;
  callSignDraft = callSign;
  callSignStatusTimer = 0;
  callSignSaveState = "idle";
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
  clearGameplayInput();
  previousHighScore = state.runStartingHighScore;
  state.newHighScore = typeof isNewRunRecord === "function"
    ? isNewRunRecord(state.runStartingHighScore, state.score, state.runMode)
    : state.runMode !== "debug" && state.score > state.runStartingHighScore;
  if (state.runMode !== "debug") {
    const nextHighScore = typeof highScoreAfterRun === "function"
      ? highScoreAfterRun(highScore, state.score, state.runMode)
      : Math.max(highScore, state.score);
    if (nextHighScore > highScore) { highScore = nextHighScore; highScoreDirty = true; }
    if (highScoreDirty) saveHighScore();
    applyRunMetaProgress();
  }
  state.message = "";
  state.messageTimer = 0;
  state.messageMax = 0;
  state.messageQueue = [];
  state.fx.shake = 0;
  state.fx.flash = 0;
  state.gameOverShakeTimer = 180;
  state.gameOverShake = 6;
  state.difficultyDeaths = Math.max(0, Math.floor(state.difficultyDeaths || 0)) + 1;
  if (typeof recordDifficultySample === "function") recordDifficultySample(true);
  if (state.runMode !== "debug") submitOnlineRun();
}
function resize() {
  const screenW = window.innerWidth;
  const screenH = window.innerHeight;
  VIEW_W = screenW;
  VIEW_H = screenH;
  renderDpr = clamp(Number(window.devicePixelRatio || 1), 1, MAX_RENDER_DPR);
  canvas.style.width = `${screenW}px`;
  canvas.style.height = `${screenH}px`;
  canvas.width = Math.max(1, Math.round(screenW * renderDpr));
  canvas.height = Math.max(1, Math.round(screenH * renderDpr));
  ctx.setTransform(renderDpr, 0, 0, renderDpr, 0, 0);
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
  if (state.gameState === "paused" || state.gameState === "resuming") {
    handlePausePointerDown(x, y);
    return;
  }
  if (state.gameState === "playing") {
    if (hitRect(getPauseButtonRect(), x, y)) { pauseGame("manual"); return; }
    const pointerKind = e.pointerType === "touch" || e.pointerType === "pen" ? e.pointerType : "mouse_down";
    const nextMode = nextGameplayInputMode(state.inputMode, pointerKind, Date.now(), state.lastTouchAt, e.buttons || 1);
    state.inputMode = nextMode.mode;
    state.lastTouchAt = nextMode.lastTouchAt;
    state.inputHintTimer = 144;
  }
  if (state.gameState !== "playing") {
    if (handleTitlePointerDown(x, y, e.pointerId)) { e.preventDefault(); return; }
    return;
  }
  try { canvas.setPointerCapture(e.pointerId); } catch {}
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
  if (e.pointerType === "touch" || e.pointerType === "pen" || (e.pointerType === "mouse" && e.buttons)) {
    const pointerKind = e.pointerType === "touch" || e.pointerType === "pen" ? e.pointerType : "mouse_move";
    const nextMode = nextGameplayInputMode(state.inputMode, pointerKind, Date.now(), state.lastTouchAt, e.buttons || 0);
    state.inputMode = nextMode.mode;
    state.lastTouchAt = nextMode.lastTouchAt;
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
  let ax = (dx * s) / r;
  let ay = (dy * s) / r;
  const magnitude = Math.hypot(ax, ay);
  const deadZone = 0.10;
  if (magnitude <= deadZone) {
    ax = 0;
    ay = 0;
  } else {
    const normalized = (magnitude - deadZone) / (1 - deadZone);
    ax = ax / magnitude * normalized;
    ay = ay / magnitude * normalized;
  }
  state.joystick.ax = ax;
  state.joystick.ay = ay;
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
  if (state.gameState === "playing" || titlePanelAnim <= 0.02 || (titleSubState !== "progress" && titleSubState !== "codex")) return;
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left - offsetX) / scale;
  const y = (e.clientY - rect.top - offsetY) / scale;
  const r = titleSubState === "codex" ? getCodexRects() : getProgressRects();
  if (!hitRect(r.panel, x, y)) return;
  e.preventDefault();
  if (titleSubState === "codex") {
    codexScroll += e.deltaY / Math.max(0.5, scale);
    clampCodexScroll();
    return;
  }
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
  if (handleEditing) {
    setHandleFromInputKey(e);
    return;
  }
  if (callSignEditing) {
    setCallSignFromInputKey(e);
    return;
  }
  const k = e.key;
  if ((state.gameState === "paused" || state.gameState === "resuming") && k === "Escape") {
    e.preventDefault();
    if (state.gameState === "paused") resumeGame();
    else pauseGame("manual");
    return;
  }
  if (state.gameState === "start") {
    if (titleSubState === "codex" && titlePanelAnim > 0.02 && (k === "ArrowUp" || k === "ArrowDown" || k === "PageUp" || k === "PageDown")) {
      e.preventDefault();
      codexScroll += (k === "ArrowUp" || k === "PageUp") ? -140 : 140;
      clampCodexScroll();
      return;
    }
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
    const action = typeof gameplayActionForKey === "function" ? gameplayActionForKey(k) : (isMoveKey(k) ? "move" : null);
    if (action === "pause") { e.preventDefault(); pauseGame("manual"); return; }
    if (DEVELOPMENT_BUILD && DEBUG_SNAPSHOT_ENABLED && (k === "h" || k === "H") && !e.repeat) {
      e.preventDefault();
      state.debugHitboxes = !state.debugHitboxes;
      return;
    }
    if (action) {
      const nextMode = nextGameplayInputMode(state.inputMode, "keyboard", Date.now(), state.lastTouchAt, 0);
      state.inputMode = nextMode.mode;
      state.lastTouchAt = nextMode.lastTouchAt;
      state.inputHintTimer = 144;
    }
    if (action && (action.startsWith("move_") || action === "move")) {
      e.preventDefault();
      if (k === "ArrowUp" || k === "w" || k === "W") state.keyboard.up = true;
      if (k === "ArrowDown" || k === "s" || k === "S") state.keyboard.down = true;
      if (k === "ArrowLeft" || k === "a" || k === "A") state.keyboard.left = true;
      if (k === "ArrowRight" || k === "d" || k === "D") state.keyboard.right = true;
      return;
    }
    if (action === "ability" && !e.repeat && !e.ctrlKey && !e.altKey && !e.metaKey) { e.preventDefault(); attemptGhost(); }
  }
});
window.addEventListener("keyup", (e) => {
  const k = e.key;
  if (k === "ArrowUp" || k === "w" || k === "W") state.keyboard.up = false;
  if (k === "ArrowDown" || k === "s" || k === "S") state.keyboard.down = false;
  if (k === "ArrowLeft" || k === "a" || k === "A") state.keyboard.left = false;
  if (k === "ArrowRight" || k === "d" || k === "D") state.keyboard.right = false;
});
window.addEventListener("blur", () => {
  clearGameplayInput();
  if (state.gameState === "playing") pauseGame("focus");
});
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) return;
  clearGameplayInput();
  if (state.gameState === "playing") pauseGame("visibility");
});
window.addEventListener("beforeunload", () => {
  if (highScoreDirty) saveHighScore();
  saveCallSign();
  saveSettings();
  saveCodexDiscovered();
  saveMetaProgress();
});

function update() {
  if (state.gameState === "paused") return;
  if (state.gameState === "resuming") {
    state.resumeCountdown = Math.max(0, state.resumeCountdown - 1);
    if (state.resumeCountdown <= 0) state.gameState = "playing";
    return;
  }
  if (devSkipCooldown > 0) devSkipCooldown--;
  if (callSignStatusTimer > 0) {
    callSignStatusTimer--;
    if (callSignStatusTimer <= 0 && !callSignEditing) {
      callSignStatus = "";
      callSignSaveState = "idle";
    }
  }
  if (handleStatusTimer > 0) {
    handleStatusTimer--;
    if (handleStatusTimer <= 0 && !handleEditing) handleStatus = "";
  }
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

  state.runStats.activeFrames = Math.max(0, Math.floor(state.runStats.activeFrames || 0)) + 1;
  if (state.sceneTransition.mode === "game_arrival") {
    state.sceneTransition.frame++;
    if (state.sceneTransition.frame >= state.sceneTransition.duration) state.sceneTransition = { mode: "idle", frame: 0, duration: 1 };
  }
  state.framesSinceLastDrop++;
  state.inputHintTimer = Math.max(0, (state.inputHintTimer || 0) - 1);
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
  state.notices = (state.notices || []).filter((notice) => {
    notice.age++;
    return notice.age < notice.duration;
  });

  state.fx.shake = Math.max(0, state.fx.shake - 0.7);
  state.fx.flash = Math.max(0, state.fx.flash - 0.8);

  if (state.messageTimer > 0) {
    state.messageTimer--;
    if (state.messageTimer <= 0) showNextMessage();
  } else if (state.messageQueue.length > 0 && !state.message) {
    showNextMessage();
  }

}

const DEVELOPMENT_BUILD = window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost" || globalThis.STAR_STRIKE_DEV_BUILD === true;
const DEBUG_SNAPSHOT_ENABLED = DEVELOPMENT_BUILD && new URLSearchParams(window.location.search).has("debug");
let debugSnapshotEl = null;
if (DEBUG_SNAPSHOT_ENABLED) {
  window.addEventListener("error", (event) => {
    state.debugErrors.push(String(event && (event.message || (event.error && event.error.message)) || "Runtime error").slice(0, 180));
    state.debugErrors = state.debugErrors.slice(-12);
  });
  window.addEventListener("unhandledrejection", (event) => {
    state.debugErrors.push(String(event && event.reason && (event.reason.message || event.reason) || "Unhandled rejection").slice(0, 180));
    state.debugErrors = state.debugErrors.slice(-12);
  });
}

function getDebugSnapshot() {
  const actionProfile = typeof ghostActionProfile === "function" ? ghostActionProfile(state.boss && state.boss.mode) : { label: "GHOST" };
  return {
    gameState: state.gameState,
    runMode: state.runMode,
    resumeCountdown: state.resumeCountdown,
    transition: {
      mode: state.sceneTransition.mode,
      duration: state.sceneTransition.duration,
      progress: clamp(state.sceneTransition.frame / Math.max(1, state.sceneTransition.duration), 0, 1)
    },
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
      ghostCooldown: state.player.ghostCooldown,
      dashTimer: state.player.dashTimer
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
      wingmen: state.wingmen.length,
      stars: state.stars.length,
      titleFormations: state.titleFormations.length
    },
    ui: {
      titleSubState,
      titlePanelTarget,
      titlePanelAnim,
      titlePanelOrigin: { x: titlePanelOrigin.x, y: titlePanelOrigin.y },
      callSign,
      callSignEditing,
      handleEditing,
      message: state.message,
      settingMaxParticles,
      settingScreenShake,
      settingReducedMotion,
      settingReducedFlash,
      settingHighContrast,
      codexHasNew,
      codexDetailType,
      codexCategory,
      codexScroll,
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
    },
    input: {
      mode: state.inputMode,
      action: actionProfile.label,
      hintTimer: state.inputHintTimer,
      touchControlsVisible: typeof touchControlsVisible === "function" ? touchControlsVisible(state.inputMode, state.gameState) : null
    },
    encounter: {
      bossMode: state.boss ? state.boss.mode : null,
      boss: state.boss ? {
        hp: state.boss.hp,
        maxHp: state.boss.maxHp,
        entered: state.boss.entered === true,
        combatActive: state.boss.combatActive === true,
        damageable: typeof bossCanTakeDamage === "function" ? bossCanTakeDamage(state.boss) : true
      } : null,
      enemyTypes: Array.from(new Set(state.enemies.map((enemy) => enemy.type))),
      safeLanes: (state.safeLanes || []).map((lane) => ({ row: lane.row, minX: lane.minX, maxX: lane.maxX, width: lane.width })),
      debrisScales: (state.debris || []).slice(0, 16).map((rock) => ({
        spawnScale: Number((rock.spawnScale == null ? 1 : rock.spawnScale).toFixed(3)),
        collisionScale: Number((rock.collisionScale == null ? 1 : rock.collisionScale).toFixed(3)),
        row: rock.row || 0
      })),
      debugHitboxes: state.debugHitboxes
    },
    runtimeErrors: state.debugErrors.slice(),
    difficulty: {
      latestSample: state.difficultySamples && state.difficultySamples.length
        ? state.difficultySamples[state.difficultySamples.length - 1]
        : null,
      samples: state.difficultySamples ? state.difficultySamples.slice(-180) : []
    }
  };
}

function updateDebugSnapshot() {
  if (!DEBUG_SNAPSHOT_ENABLED) return;
  if (typeof recordDifficultySample === "function") recordDifficultySample();
  if (!debugSnapshotEl) {
    debugSnapshotEl = document.createElement("pre");
    debugSnapshotEl.id = "debugSnapshot";
    debugSnapshotEl.hidden = true;
    document.body.appendChild(debugSnapshotEl);
  }
  debugSnapshotEl.textContent = JSON.stringify(getDebugSnapshot());
}

const simulationClock = createFixedStepClock();
function loop(timestamp) {
  advanceFixedStep(simulationClock, timestamp, update);
  draw();
  updateDebugSnapshot();
  requestAnimationFrame(loop);
}

function applyDebugScenario() {
  if (!DEBUG_SNAPSHOT_ENABLED) return;
  const params = new URLSearchParams(window.location.search);
  const scenario = params.get("scenario");
  const requestedInput = params.get("input");
  if (!scenario) {
    if (requestedInput === "touch") state.inputMode = "touch";
    if (params.get("hitboxes") === "1") state.debugHitboxes = true;
    return;
  }
  setupSession("playing");
  state.runMode = "debug";
  state.player.hp = state.player.maxHp;
  state.player.energy = state.player.maxEnergy;
  state.waveRest = 999999;
  state.phaseTimer = -999999;
  if (scenario === "siphon") {
    state.phase = 5;
    spawnEnemy("siphon", W / 2, 128, { forceSpawn: true });
    const siphon = state.enemies.find((enemy) => enemy.type === "siphon");
    if (siphon) { siphon.entryFrames = 0; siphon.fireTimer = 48; siphon.fireWarn = 0; }
    showMessage("DEBUG  SIPHON AIM TEST", 120);
  } else if (scenario === "wingman") {
    spawnWingmen(2);
    state.player.y = H * 0.72;
  } else if (scenario === "powerups") {
    const types = [
      "spread", "rapid", "repair", "wingman", "dual", "energy_cell", "overcharge",
      "phase_shield", "magnet", "piercing", "ion_burst", "stabilizer", "score_surge"
    ];
    state.powerups = types.map((type, index) => ({
      type,
      x: W * (0.2 + (index % 3) * 0.3),
      y: 125 + Math.floor(index / 3) * 82,
      vy: 0,
      size: 11,
      life: 999999,
      static: true
    }));
    state.player.y = H - 42;
  } else if (scenario === "debris" || scenario === "debris-incoming") {
    state.phase = 12;
    spawnExpansionBoss("debris_warden");
    if (scenario === "debris") {
      state.boss.y = state.boss.targetY;
      state.boss.entered = true;
      beginExpansionBossAttack(state.boss, "double");
      showMessage("DEBUG  DOUBLE GATE", 120);
    } else {
      state.boss.y = state.boss.targetY - 20;
      showMessage("DEBUG  BOSS STAGING", 72);
    }
  }
  if (requestedInput === "touch") state.inputMode = "touch";
  if (params.get("hitboxes") === "1") state.debugHitboxes = true;
}

loadHighScore();
loadCallSign();
loadSettings();
loadCodexDiscovered();
loadMetaProgress();
resize();
setupSession("start");
applyDebugScenario();
window.addEventListener("resize", resize);
if (typeof preloadGameAssets === "function") {
  Promise.resolve(preloadGameAssets()).catch((error) => {
    state.debugErrors.push(`Asset preload fallback: ${String(error && error.message || error).slice(0, 120)}`);
  });
}
requestAnimationFrame(loop);
