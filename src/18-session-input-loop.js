function startPlayingSession() {
  if (typeof pendingTutorialStep !== "undefined" && pendingTutorialStep) {
    startTutorialSession(pendingTutorialStep);
    return;
  }
  const transitionStars = state.stars;
  setupSession("playing", { preserveStars: true });
  state.lastArrivalContinuity = {
    starsPreserved: state.stars === transitionStars,
    playerX: state.player.x,
    playerY: state.player.y
  };
  state.sceneTransition = {
    mode: "game_arrival",
    frame: 0,
    duration: Math.max(1, Math.round((settingReducedMotion ? 0.18 : 0.28) * SIMULATION_HZ)),
    elapsedSeconds: 0,
    durationSeconds: settingReducedMotion ? 0.18 : 0.28
  };
  state.player.inv = Math.max(state.player.inv, 45);
  showMessage("PHASE 1", 90);
}
function beginGame() {
  if (state.gameState === "start" && state.sceneTransition.mode !== "idle") return false;
  if (typeof prepareGameplayMusic === "function") prepareGameplayMusic();
  if (typeof playGameSound === "function") playGameSound("launch", 0.9);
  if (state.gameState === "start") {
    titlePanelTarget = 0;
    state.sceneTransition = {
      mode: "title_launch",
      frame: 0,
      duration: Math.max(1, Math.round(tutorialLaunchDurationSeconds(settingReducedMotion) * SIMULATION_HZ)),
      elapsedSeconds: 0,
      durationSeconds: tutorialLaunchDurationSeconds(settingReducedMotion)
    };
    state.lastTitleLaunchDurationSeconds = state.sceneTransition.durationSeconds;
    state.lastTitleLaunchReducedMotion = settingReducedMotion === true;
    clearGameplayInput();
    return true;
  }
  startPlayingSession();
  return true;
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
function clearTransientPointerInput() {
  clearGameplayInput();
  playBtnPointerDown = false;
  playBtnPointerInside = false;
  respawnPointerDown = false;
  respawnPointerInside = false;
  if (typeof cancelTitlePointerInteractions === "function") cancelTitlePointerInteractions();
}
function currentGameplayPolicyContext() {
  return {
    gameState: state.gameState,
    transitionMode: state.sceneTransition && state.sceneTransition.mode,
    tutorialDialogueVisible: state.runMode === "tutorial" && !!(tutorialDirector && tutorialDirector.dialogueVisible)
  };
}
function currentGameplayControlEnabled() {
  return typeof gameplayControlEnabled === "function"
    ? gameplayControlEnabled(currentGameplayPolicyContext())
    : state.gameState === "playing";
}
function pauseGame(reason = "manual") {
  if (state.gameState !== "playing" && state.gameState !== "resuming") return false;
  const decision = typeof pauseHealthDecision === "function"
    ? pauseHealthDecision(state.player, reason, state.runMode)
    : { allowed: true, cost: 0, remainingHp: state.player.hp, message: "" };
  if (!decision.allowed) {
    state.pauseNotice = decision.message;
    showMessage(decision.message, 100);
    return false;
  }
  state.player.hp = decision.remainingHp;
  pauseConfirmAction = "";
  pauseConfirmPreviousNotice = "";
  clearGameplayInput();
  state.pausedReason = reason;
  state.pauseNotice = decision.message;
  if (decision.cost > 0 && state.player.hp <= 0) {
    if (state.runMode === "tutorial" && typeof recoverTutorialCheckpoint === "function") {
      recoverTutorialCheckpoint();
      state.pausedReason = reason;
      state.pauseNotice = decision.message;
      state.resumeCountdown = 0;
      state.gameState = "paused";
      if (typeof showTutorialPauseAccessibility === "function") showTutorialPauseAccessibility();
    } else {
      enterGameOver();
      state.pauseNotice = decision.message;
    }
    return true;
  }
  state.resumeCountdown = 0;
  state.gameState = "paused";
  if (state.runMode === "tutorial" && typeof showTutorialPauseAccessibility === "function") showTutorialPauseAccessibility();
  return true;
}
function resumeGame() {
  if (state.gameState !== "paused") return false;
  clearGameplayInput();
  pauseConfirmAction = "";
  pauseConfirmPreviousNotice = "";
  state.pausedReason = "";
  state.resumeCountdown = 90;
  state.gameState = "resuming";
  if (state.runMode === "tutorial" && typeof hideTutorialPauseAccessibility === "function") hideTutorialPauseAccessibility();
  return true;
}
function cancelResumeCountdown() {
  if (state.gameState !== "resuming") return false;
  clearGameplayInput();
  pauseConfirmAction = "";
  pauseConfirmPreviousNotice = "";
  state.resumeCountdown = 0;
  state.pausedReason = "resume_cancelled";
  state.pauseNotice = "RESUME CANCELLED — NO ADDITIONAL HEALTH COST";
  state.gameState = "paused";
  if (state.runMode === "tutorial" && typeof showTutorialPauseAccessibility === "function") showTutorialPauseAccessibility();
  return true;
}
function handlePauseEscape() {
  if (state.gameState === "paused" && pauseConfirmAction) return cancelPauseDestructiveAction();
  if (state.gameState === "paused") return resumeGame();
  if (state.gameState === "resuming") return cancelResumeCountdown();
  return false;
}
function setupSession(mode = "start", options = {}) {
  const preserveStars = options.preserveStars === true && Array.isArray(state.stars) && state.stars.length > 0;
  if (typeof resetGloryCelebrations === "function") resetGloryCelebrations();
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
  state.lastPickupFeedback = null;
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
  document.body.dataset.gameRunMode = state.runMode;
  state.pausedReason = "";
  state.pauseNotice = "";
  state.resumeCountdown = 0;
  pauseConfirmAction = "";
  pauseConfirmPreviousNotice = "";
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
  playBtnPointerDown = false;
  playBtnPointerInside = false;
  respawnPointerDown = false;
  respawnPointerInside = false;
  titleSubState = "main";
  titlePanelAnim = 0;
  titlePanelTarget = 0;
  titleProgressScroll = 0;
  titleProgressDragActive = false;
  titleProgressDragPointerId = null;
  titleProgressDragY = 0;
  titleProgressDragX = 0;
  titleProgressDragStartScroll = 0;
  titleProgressDragMoved = false;
  titleProgressPointerDownNode = null;
  titleProgressSelectedNode = null;
  recordsPanelTab = "global";
  achievementCategory = "all";
  achievementScroll = 0;
  titleMetaScreenTransition = 1;
  codexDetailType = null;
  resetProgressConfirm = false;
  callSignEditing = false;
  callSignDraft = callSign;
  callSignStatusTimer = 0;
  callSignSaveState = "idle";
  highScoreDirty = false;
  if (!preserveStars) {
    state.stars = [];
    for (let i = 0; i < 110; i++) {
      state.stars.push({ x: Math.random() * W, y: Math.random() * H, s: Math.random() * 2 + 0.5, spd: Math.random() * 0.9 + 0.3 });
    }
  }
  initTitleFormations();
  refreshMultiplier();
}
function enterGameOver() {
  if (state.runMode === "tutorial" && typeof recoverTutorialCheckpoint === "function") {
    recoverTutorialCheckpoint();
    return;
  }
  state.gameState = "gameover";
  clearGameplayInput();
  previousHighScore = state.runStartingHighScore;
  state.newHighScore = typeof isNewRunRecord === "function"
    ? isNewRunRecord(state.runStartingHighScore, state.score, state.runMode)
    : state.runMode === "standard" && state.score > state.runStartingHighScore;
  const progressionAllowed = typeof runModeAllowsProgression === "function"
    ? runModeAllowsProgression(state.runMode)
    : state.runMode === "standard";
  let progressionResult = null;
  if (progressionAllowed) {
    const nextHighScore = typeof highScoreAfterRun === "function"
      ? highScoreAfterRun(highScore, state.score, state.runMode)
      : Math.max(highScore, state.score);
    if (nextHighScore > highScore) { highScore = nextHighScore; highScoreDirty = true; }
    if (highScoreDirty) saveHighScore();
    progressionResult = applyRunMetaProgress();
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
  if (progressionAllowed) finalizeLocalRunAchievements();
  if (typeof startGloryCelebrations === "function") {
    startGloryCelebrations(progressionResult && progressionResult.presentationEvents);
  }
}
function resize() {
  clearTransientPointerInput();
  if (state.player) {
    state.player.vx = 0;
    state.player.vy = 0;
  }
  const screenW = window.innerWidth;
  const screenH = window.innerHeight;
  VIEW_W = screenW;
  VIEW_H = screenH;
  renderDpr = typeof effectiveCanvasDpr === "function"
    ? effectiveCanvasDpr(screenW, screenH, window.devicePixelRatio || 1, MAX_RENDER_DPR, MAX_RENDER_PIXELS)
    : clamp(Number(window.devicePixelRatio || 1), 1, MAX_RENDER_DPR);
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
  if (typeof gloryCelebrationActive === "function" && gloryCelebrationActive()) {
    advanceGloryCelebration();
    return true;
  }
  const buttons = getGameOverButtons();
  if (hitRect(buttons.respawn, x, y)) {
    respawnPointerDown = true;
    respawnPointerInside = true;
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
    openTitleProgressRoad();
    return true;
  }
  return false;
}
canvas.addEventListener("pointerdown", (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left - offsetX) / scale;
  const y = (e.clientY - rect.top - offsetY) / scale;
  if (typeof onboardingUiMode !== "undefined" && onboardingUiMode !== "none") return;
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
    if (!currentGameplayControlEnabled()) {
      clearGameplayInput();
      return;
    }
    const pointerKind = e.pointerType === "touch" || e.pointerType === "pen" ? e.pointerType : "mouse_down";
    const nextMode = nextGameplayInputMode(state.inputMode, pointerKind, Date.now(), state.lastTouchAt, e.buttons || 1);
    state.inputMode = nextMode.mode;
    state.lastTouchAt = nextMode.lastTouchAt;
    state.inputHintTimer = 144;
  }
  if (state.gameState !== "playing") {
    if (state.gameState === "start" && typeof onboardingUiMode !== "undefined" && onboardingUiMode !== "none") return;
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
    if (updateTitleScrollableDrag(e.pointerId, x, y)) {
      e.preventDefault();
      return;
    }
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
  if (!currentGameplayControlEnabled()) {
    clearGameplayInput();
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
  endTitleScrollableDrag(e.pointerId, e.type === "pointercancel");
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
    beginGame();
    return;
  }
  if (state.gameState === "start" && playBtnPointerDown && playBtnPointerInside) {
    playBtnPointerDown = false;
    playBtnPointerInside = false;
    beginGame();
    return;
  }
  if (state.gameState === "gameover") {
    respawnPointerDown = false;
    respawnPointerInside = false;
    return;
  }
  if (state.gameState !== "playing") {
    playBtnPointerDown = false;
    playBtnPointerInside = false;
    return;
  }
}
canvas.addEventListener("pointerup", endPointer);
canvas.addEventListener("pointercancel", endPointer);
canvas.addEventListener("wheel", (e) => {
  if (state.gameState === "playing" || titlePanelAnim <= 0.02 || !["progress", "codex", "achievements"].includes(titleSubState)) return;
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left - offsetX) / scale;
  const y = (e.clientY - rect.top - offsetY) / scale;
  const r = titleSubState === "codex"
    ? getCodexRects()
    : (titleSubState === "achievements" ? getAchievementsRects() : getProgressRects());
  if (!hitRect(r.panel, x, y)) return;
  e.preventDefault();
  if (titleSubState === "codex") {
    codexScrollController.scrollBy(e.deltaY / Math.max(0.5, scale));
    return;
  }
  if (titleSubState === "achievements") {
    achievementScrollController.scrollBy(e.deltaY / Math.max(0.5, scale));
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
  if (e.defaultPrevented) return;
  if (handleEditing) {
    setHandleFromInputKey(e);
    return;
  }
  if (callSignEditing) {
    setCallSignFromInputKey(e);
    return;
  }
  const k = e.key;
  const focusedGameAction = document.activeElement && document.activeElement.dataset
    ? document.activeElement.dataset.gameAction
    : "";
  if (focusedGameAction && (k === "Enter" || k === " ")) return;
  if (typeof onboardingUiMode !== "undefined" && onboardingUiMode !== "none") {
    const focusedAction = document.activeElement && document.activeElement.dataset
      ? document.activeElement.dataset.onboardingAction
      : "";
    if ((k === "Enter" || k === " ") && focusedAction) return;
    if (k === "Escape") {
      e.preventDefault();
      if (onboardingUiMode === "skip_confirm" && typeof cancelSkipTutorialTraining === "function") {
        cancelSkipTutorialTraining();
      }
      return;
    }
    return;
  }
  if ((state.gameState === "paused" || state.gameState === "resuming") && k === "Escape") {
    e.preventDefault();
    handlePauseEscape();
    return;
  }
  if (state.gameState === "start") {
    if (["codex", "achievements", "progress"].includes(titleSubState) && titlePanelAnim > 0.02 && (k === "ArrowUp" || k === "ArrowDown" || k === "PageUp" || k === "PageDown")) {
      e.preventDefault();
      const delta = (k === "ArrowUp" || k === "PageUp") ? -148 : 148;
      if (titleSubState === "codex") {
        codexScrollController.scrollBy(delta);
      } else if (titleSubState === "achievements") {
        achievementScrollController.scrollBy(delta);
      } else {
        titleProgressScroll += delta;
        clampTitleProgressScroll();
      }
      return;
    }
    if (resetProgressConfirm) {
      if (k === "Escape") {
        e.preventDefault();
        resetProgressConfirm = false;
      } else if (k === "Enter" || k === " ") {
        e.preventDefault();
      }
      return;
    }
    if (titlePanelAnim > 0.02 || titlePanelTarget > 0) {
      if (k === "Escape") {
        e.preventDefault();
        closeTitleMetaScreen();
      } else if (k === "Enter" || k === " ") {
        e.preventDefault();
      }
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
      if (typeof gloryCelebrationActive === "function" && gloryCelebrationActive()) {
        advanceGloryCelebration();
        return;
      }
      beginGame();
    }
    return;
  }
  if (state.gameState === "playing") {
    if (
      state.runMode === "tutorial" &&
      typeof tutorialSimulationPaused === "function" &&
      tutorialSimulationPaused() &&
      (k === "Enter" || k === " ")
    ) {
      e.preventDefault();
      advanceTutorialDialogue();
      return;
    }
    const action = typeof gameplayActionForKey === "function" ? gameplayActionForKey(k) : (isMoveKey(k) ? "move" : null);
    if (action === "pause") { e.preventDefault(); pauseGame("manual"); return; }
    if (!currentGameplayControlEnabled()) {
      if (action) e.preventDefault();
      clearGameplayInput();
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
  clearTransientPointerInput();
  if (state.gameState === "playing") pauseGame("focus");
  else if (state.gameState === "resuming") cancelResumeCountdown();
});
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) return;
  clearTransientPointerInput();
  if (state.gameState === "playing") pauseGame("visibility");
  else if (state.gameState === "resuming") cancelResumeCountdown();
});
window.addEventListener("beforeunload", () => {
  if ((typeof runModeAllowsProgression !== "function" ? state.runMode === "standard" : runModeAllowsProgression(state.runMode)) && highScoreDirty) saveHighScore();
  saveCallSign();
  saveSettings();
  saveCodexDiscovered();
  saveMetaProgress();
});

function update() {
  codexScrollController.tick();
  achievementScrollController.tick();
  if (state.gameState === "paused") return;
  if (state.gameState === "resuming") {
    state.resumeCountdown = Math.max(0, state.resumeCountdown - 1);
    if (state.resumeCountdown <= 0) {
      state.gameState = "playing";
      if (state.pauseNotice) showMessage(state.pauseNotice, 100);
      state.pauseNotice = "";
      if (state.runMode === "tutorial" && typeof updateTutorialLiveRegion === "function") {
        tutorialLiveSignature = "";
        updateTutorialLiveRegion();
      }
    }
    return;
  }
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
    if (typeof updateGloryCelebration === "function") updateGloryCelebration();
    const GAME_OVER_SHAKE_FRAMES = 180;
    if (state.gameOverShakeTimer > 0) {
      const t = 1 - state.gameOverShakeTimer / GAME_OVER_SHAKE_FRAMES;
      state.gameOverShake = 6 * Math.exp(-4.8 * t);
      state.gameOverShakeTimer--;
    } else {
      state.gameOverShake = 0;
    }
    return;
  }

  if (state.sceneTransition.mode === "game_arrival") {
    state.sceneTransition.frame++;
    state.sceneTransition.elapsedSeconds = Number(state.sceneTransition.elapsedSeconds || 0) + SIMULATION_STEP_MS / 1000;
    updateStars();
    updateParticles();
    if (state.sceneTransition.elapsedSeconds >= state.sceneTransition.durationSeconds) {
      clearGameplayInput();
      state.sceneTransition = { mode: "idle", frame: 0, duration: 1, elapsedSeconds: 0, durationSeconds: 0 };
      if (state.runMode === "tutorial" && tutorialRuntime) tutorialRuntime.stepStartFrame = state.frame;
    }
    return;
  }

  if (
    state.runMode === "tutorial" &&
    typeof tutorialSimulationPaused === "function" &&
    tutorialSimulationPaused()
  ) {
    updateStars();
    updateTutorialDirectorRuntime();
    return;
  }

  state.runStats.activeFrames = Math.max(0, Math.floor(state.runStats.activeFrames || 0)) + 1;
  state.framesSinceLastDrop++;
  state.inputHintTimer = Math.max(0, (state.inputHintTimer || 0) - 1);
  if (state.powerupDropCooldown > 0) state.powerupDropCooldown--;
  state.comboPulse = Math.max(0, state.comboPulse - 1);

  updateStars();
  if (state.runMode !== "tutorial") updateWavesAndPhaseAndPressure();
  updatePlayer();
  updateWingmen();
  updateBullets();
  updateEnemies();
  updateBoss();
  updateBossDeathIfNeeded();
  updatePowerups();
  if (typeof updateExpansionHazards === "function") updateExpansionHazards();
  updateCollisions();
  if (state.runMode === "tutorial" && typeof updateTutorialDirectorRuntime === "function") updateTutorialDirectorRuntime();
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

/* DEVELOPMENT_QA_START */
const DEVELOPMENT_BUILD = window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost";
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

function debugScreenRect(rect) {
  if (!rect) return null;
  return {
    x: Number((offsetX + rect.x * scale).toFixed(2)),
    y: Number((offsetY + rect.y * scale).toFixed(2)),
    w: Number((rect.w * scale).toFixed(2)),
    h: Number((rect.h * scale).toFixed(2))
  };
}

function getDebugSnapshot() {
  const actionProfile = typeof ghostActionProfile === "function" ? ghostActionProfile(state.boss && state.boss.mode) : { label: "GHOST" };
  const titleIcons = typeof getTitleIconRects === "function" ? getTitleIconRects() : {};
  const achievementRects = typeof getAchievementsRects === "function" ? getAchievementsRects() : {};
  const codexRects = typeof getCodexRects === "function" ? getCodexRects() : {};
  const onlineRects = typeof getOnlineRects === "function" ? getOnlineRects() : {};
  const onlineState = typeof accountIdentitySnapshot === "function" ? accountIdentitySnapshot() : {};
  return {
    timestampMs: Number(performance.now().toFixed(2)),
    gameState: state.gameState,
    runMode: state.runMode,
    resumeCountdown: state.resumeCountdown,
    transition: {
      mode: state.sceneTransition.mode,
      duration: state.sceneTransition.duration,
      lastLaunchDurationSeconds: Number(state.lastTitleLaunchDurationSeconds || 0),
      lastLaunchReducedMotion: state.lastTitleLaunchReducedMotion === true,
      titleUiAlpha: state.sceneTransition.mode === "title_launch"
        ? Math.max(0, 1 - clamp(
          state.sceneTransition.durationSeconds
            ? Number(state.sceneTransition.elapsedSeconds || 0) / state.sceneTransition.durationSeconds
            : state.sceneTransition.frame / Math.max(1, state.sceneTransition.duration),
          0,
          1
        ) / 0.16)
        : 0,
      progress: clamp(
        state.sceneTransition.durationSeconds
          ? Number(state.sceneTransition.elapsedSeconds || 0) / state.sceneTransition.durationSeconds
          : state.sceneTransition.frame / Math.max(1, state.sceneTransition.duration),
        0,
        1
      ),
      continuity: state.lastArrivalContinuity || null
    },
    renderFrame: state.renderFrameFlags || null,
    tutorial: typeof tutorialSnapshot === "function" ? tutorialSnapshot() : null,
    frame: state.frame,
    score: state.score,
    highScore,
    phase: state.phase,
    deviceProgress: typeof currentMetaSnapshot === "function" ? currentMetaSnapshot() : null,
    gloryCelebration: typeof gloryCelebrationActive === "function" && gloryCelebrationActive() ? {
      active: true,
      index: gloryCelebrationState.index,
      count: gloryCelebrationState.queue.length,
      frame: gloryCelebrationState.frame,
      event: currentGloryCelebration()
    } : { active: false, index: 0, count: 0, frame: 0, event: null },
    localAchievements: typeof localAchievementIds !== "undefined" ? localAchievementIds.slice() : [],
    player: state.player ? {
      x: state.player.x,
      y: state.player.y,
      vx: state.player.vx,
      vy: state.player.vy,
      hp: state.player.hp,
      energy: state.player.energy,
      inv: state.player.inv,
      ghostTimer: state.player.ghostTimer,
      ghostCooldown: state.player.ghostCooldown,
      dashTimer: state.player.dashTimer,
      realm: state.playerRealm
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
      pauseNotice: state.pauseNotice,
      pauseConfirmAction,
      settingMaxParticles,
      settingScreenShake,
      settingReducedMotion,
      settingReducedFlash,
      settingHighContrast,
      settingMusicEnabled,
      settingEffectsEnabled,
      music: typeof gameMusicStateSnapshot === "function" ? gameMusicStateSnapshot() : null,
      account: {
        user: onlineState.user || null,
        callSign: onlineState.profileCallSign || "",
        handle: onlineState.profileHandle || "",
        identityService: onlineState.identityService || "",
        accountArchive: onlineState.accountArchive || "",
        progressionMode: onlineState.progressionMode || "",
        competitionMode: onlineState.competitionMode || "",
        pendingCallSign: onlineState.pendingCallSign === true,
        counters: onlineState.developmentCounters || {}
      },
      codexHasNew,
      codexDetailType,
      codexCategory,
      codexScroll,
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
    layout: {
      scale,
      offsetX,
      offsetY,
      title: state.titleMetrics || null,
      play: debugScreenRect(typeof getPlayButtonRect === "function" ? getPlayButtonRect() : null),
      account: debugScreenRect(titleIcons.account),
      accountPilotTab: debugScreenRect(onlineRects.pilotTab),
      accountSettingsTab: debugScreenRect(onlineRects.settingsTab),
      screenShake: debugScreenRect(onlineRects.shake),
      reducedMotion: debugScreenRect(onlineRects.motion),
      music: debugScreenRect(onlineRects.music),
      effects: debugScreenRect(onlineRects.effects),
      replayTraining: debugScreenRect(onlineRects.replayTraining),
      resetData: debugScreenRect(onlineRects.reset),
      achievements: debugScreenRect(titleIcons.achievements),
      progress: debugScreenRect(titleIcons.progress),
      records: debugScreenRect(titleIcons.records),
      codex: debugScreenRect(titleIcons.codex),
      achievementContent: debugScreenRect(achievementRects.contentRect),
      achievementScrollUp: debugScreenRect(achievementRects.scrollUp),
      achievementScrollDown: debugScreenRect(achievementRects.scrollDown),
      codexContent: debugScreenRect(codexRects.contentRect),
      codexScrollUp: debugScreenRect(codexRects.scrollUp),
      codexScrollDown: debugScreenRect(codexRects.scrollDown)
      ,
      pause: debugScreenRect(typeof getPauseButtonRect === "function" ? getPauseButtonRect() : null),
      hud: typeof getGameplayHudLayout === "function" ? getGameplayHudLayout() : null,
      onboardingPanel: debugScreenRect(typeof getOnboardingPanelRect === "function" ? getOnboardingPanelRect() : null),
      onboardingPortrait: debugScreenRect(typeof getOnboardingInstructorPortraitRect === "function" ? getOnboardingInstructorPortraitRect() : null),
      onboardingQuestion: debugScreenRect(typeof getOnboardingQuestionRect === "function" ? getOnboardingQuestionRect() : null),
      tutorialDialogue: debugScreenRect(
        typeof getTutorialDialogueRect === "function" && state.runMode === "tutorial" && tutorialDirector?.dialogueVisible
          ? getTutorialDialogueRect()
          : null
      ),
      tutorialObjective: debugScreenRect(typeof getTutorialObjectiveRect === "function" ? getTutorialObjectiveRect() : null),
      tutorialControls: typeof getTutorialControlRects === "function"
        ? Object.fromEntries(Object.entries(getTutorialControlRects()).map(([key, rect]) => [key, debugScreenRect(rect)]))
        : null
    },
    titleTraffic: state.titleFormations.map((formation) => ({
      id: formation.id,
      depth: formation.depthLayer,
      durationSeconds: Number(formation.durationSeconds.toFixed(3)),
      ageSeconds: Number(formation.ageSeconds.toFixed(4)),
      normalizedProgress: Number(formation.normalizedProgress.toFixed(4)),
      x: Number(formation.x.toFixed(2)),
      y: Number(formation.y.toFixed(2)),
      scale: Number(formation.renderScale.toFixed(3)),
      alpha: Number(formation.renderAlpha.toFixed(3)),
      radius: typeof titleFormationVisualRadius === "function"
        ? Number(titleFormationVisualRadius(formation).toFixed(2))
        : 0
    })),
    scrolling: {
      achievements: typeof achievementScrollController !== "undefined" ? achievementScrollController.snapshot() : null,
      codex: typeof codexScrollController !== "undefined" ? codexScrollController.snapshot() : null
    },
    input: {
      mode: state.inputMode,
      action: actionProfile.label,
      hintTimer: state.inputHintTimer,
      joystick: {
        active: state.joystick.active === true,
        ax: Number((state.joystick.ax || 0).toFixed(4)),
        ay: Number((state.joystick.ay || 0).toFixed(4))
      },
      touchControlsVisible: typeof touchControlsVisible === "function" ? touchControlsVisible(state.inputMode, state.gameState) : null,
      gameplayControlEnabled: currentGameplayControlEnabled(),
      gameplaySimulationEnabled: typeof gameplaySimulationEnabled === "function"
        ? gameplaySimulationEnabled(currentGameplayPolicyContext())
        : state.gameState === "playing"
    },
    encounter: {
      bossMode: state.boss ? state.boss.mode : null,
      boss: state.boss ? {
        x: Number(state.boss.x.toFixed(2)),
        y: Number(state.boss.y.toFixed(2)),
        hp: state.boss.hp,
        maxHp: state.boss.maxHp,
        entered: state.boss.entered === true,
        combatActive: state.boss.combatActive === true,
        damageable: typeof bossCanTakeDamage === "function" ? bossCanTakeDamage(state.boss) : true,
        realm: state.boss.realm == null ? null : state.boss.realm,
        tutorialOverride: state.boss.tutorialOverride === true
      } : null,
      enemyTypes: Array.from(new Set(state.enemies.map((enemy) => enemy.type))),
      enemies: state.enemies.slice(0, 16).map((enemy) => ({
        type: enemy.type,
        x: Number(enemy.x.toFixed(2)),
        y: Number(enemy.y.toFixed(2)),
        hp: Number(enemy.hp || 0),
        tutorialTarget: enemy.tutorialTarget === true
      })),
      powerups: state.powerups.slice(0, 8).map((powerup) => ({
        type: powerup.type,
        x: Number(powerup.x.toFixed(2)),
        y: Number(powerup.y.toFixed(2))
      })),
      safeLanes: (state.safeLanes || []).map((lane) => ({ row: lane.row, minX: lane.minX, maxX: lane.maxX, width: lane.width })),
      debrisScales: (state.debris || []).slice(0, 16).map((rock) => ({
        spawnScale: Number((rock.spawnScale == null ? 1 : rock.spawnScale).toFixed(3)),
        collisionScale: Number((rock.collisionScale == null ? 1 : rock.collisionScale).toFixed(3)),
        row: rock.row || 0
      }))
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

/* DEVELOPMENT_QA_END */

const simulationClock = createFixedStepClock();
function loop(timestamp) {
  const frameTiming = advanceFixedStep(simulationClock, timestamp, update);
  if (typeof updateGameMusic === "function") updateGameMusic(frameTiming.deltaMs / 1000);
  draw();
  if (typeof syncGameAccessibleSurface === "function") syncGameAccessibleSurface();
  /* DEVELOPMENT_QA_CALL */ if (typeof updateDebugSnapshot === "function") updateDebugSnapshot();
  requestAnimationFrame(loop);
}

/* DEVELOPMENT_QA_START */
function applyDevelopmentQaScenario() {
  if (!DEBUG_SNAPSHOT_ENABLED) return;
  const params = new URLSearchParams(window.location.search);
  const scenario = params.get("scenario");
  const requestedInput = params.get("input");
  if (!scenario) {
    if (requestedInput === "touch") state.inputMode = "touch";
    return;
  }
  if (
    scenario === "tutorial" ||
    scenario === "tutorial-resume" ||
    scenario === "tutorial-post" ||
    scenario === "tutorial-post-callsign" ||
    scenario === "tutorial-identity-confirmed"
  ) {
    if (scenario === "tutorial-resume") {
      localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(transitionOnboardingState(
        makeDefaultOnboardingState(),
        { type: "checkpoint", checkpoint: "before_wraith" }
      )));
    } else if (scenario === "tutorial-post" || scenario === "tutorial-post-callsign" || scenario === "tutorial-identity-confirmed") {
      localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(transitionOnboardingState(
        makeDefaultOnboardingState(),
        { type: "complete" }
      )));
    }
    else try { localStorage.removeItem(ONBOARDING_STORAGE_KEY); } catch {}
    setupSession("start");
    if (requestedInput === "touch") state.inputMode = "touch";
    const tutorialStep = scenario === "tutorial" ? params.get("step") : "";
    if (tutorialStep) {
      const tutorialStepMap = {
        ghost: "ghost_shift",
        "command-boss": "command_boss",
        wraith: "wraith_briefing",
        graduation: "graduation"
      };
      window.addEventListener("DOMContentLoaded", () => {
        beginTutorialTraining({ stepId: tutorialStepMap[tutorialStep] || tutorialStep });
      }, { once: true });
    } else if (scenario === "tutorial-post" || scenario === "tutorial-post-callsign" || scenario === "tutorial-identity-confirmed") {
      window.addEventListener("DOMContentLoaded", () => {
        onboardingUiMode = scenario === "tutorial-post-callsign"
          ? "post_callsign"
          : scenario === "tutorial-identity-confirmed"
            ? "identity_confirmed"
            : "post_identity";
        renderOnboardingAccessibleMode();
      }, { once: true });
    }
    return;
  }
  if (scenario.startsWith("glory-road-")) {
    const totals = {
      "glory-road-early": 2500,
      "glory-road-high": 250000,
      "glory-road-prestige-1": 300200,
      "glory-road-prestige-3": 925000
    };
    setupSession("start");
    metaProgress = makeDefaultMetaProgress();
    metaProgress.totalGlory = totals[scenario] ?? 2500;
    titleSubState = "progress";
    titlePanelAnim = 1;
    titlePanelTarget = 1;
    focusTitleProgressOnCurrent();
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
      state.boss.y = state.boss.targetY - 60;
      state.boss.qaHoldStaging = true;
      showMessage("DEBUG  BOSS STAGING", 72);
    }
  } else if (scenario === "gameover" || scenario === "gameover-rank" || scenario === "gameover-prestige" || scenario.startsWith("glory-celebration-")) {
    const progressionCase = scenario === "gameover-prestige" || scenario === "glory-celebration-prestige" || scenario === "glory-celebration-prestige-reduced"
      ? { before: 299900, after: 300200 }
      : scenario === "gameover-rank" || scenario === "glory-celebration-rank"
        ? { before: 14999, after: 15000 }
        : scenario === "glory-celebration-late"
          ? { before: 174999, after: 175000 }
          : scenario === "glory-celebration-checkpoint"
            ? { before: 1999, after: 2000 }
            : { before: 2430, after: 2850 };
    const events = gloryMilestonesCrossed(progressionCase.before, progressionCase.after);
    const afterRoad = gloryRoadStateForTotal(progressionCase.after);
    metaProgress = makeDefaultMetaProgress();
    metaProgress.totalGlory = progressionCase.after;
    state.gameState = "gameover";
    state.score = 48250;
    state.newHighScore = true;
    highScore = 48250;
    lastRunMeta = {
      gloryGained: 420,
      gloryAfter: progressionCase.after,
      creditsEarned: 168,
      prestigeAfter: afterRoad.prestige,
      roadGloryAfter: afterRoad.roadGlory,
      rankAfter: afterRoad.displayRankName,
      rankUp: events.some((event) => event.type === "rank"),
      prestigeEarned: events.some((event) => event.type === "prestige"),
      milestoneEvents: events,
      presentationEvents: gloryCelebrationQueue(events, progressionCase.before, progressionCase.after),
      snapshot: currentMetaSnapshot()
    };
    if (scenario === "glory-celebration-prestige-reduced") settingReducedMotion = true;
    if (scenario.startsWith("glory-celebration-")) {
      startGloryCelebrations(lastRunMeta.presentationEvents.map((event) => ({ ...event, qaHold: true })));
    }
    state.gameOverShake = 0;
    state.gameOverShakeTimer = 0;
  }
  if (requestedInput === "touch") state.inputMode = "touch";
}
/* DEVELOPMENT_QA_END */

loadHighScore();
loadCallSign();
loadSettings();
loadCodexDiscovered();
loadMetaProgress();
resize();
setupSession("start");
window.addEventListener("DOMContentLoaded", () => {
  let debugBypass = false;
  /* DEVELOPMENT_QA_START */
  const params = new URLSearchParams(window.location.search);
  debugBypass = DEBUG_SNAPSHOT_ENABLED && !String(params.get("scenario") || "").startsWith("tutorial");
  /* DEVELOPMENT_QA_END */
  if (typeof initializeOnboardingExperience === "function") initializeOnboardingExperience({ debugBypass });
}, { once: true });
/* DEVELOPMENT_QA_CALL */ if (typeof applyDevelopmentQaScenario === "function") applyDevelopmentQaScenario();
window.addEventListener("resize", resize);
let assetReconnectRetryPromise = null;
let startupAssetPreloadPromise = null;
function retryFailedGameAssetsAfterReconnect() {
  if (typeof getAssetLoadState !== "function" || typeof retryFailedAssets !== "function") return Promise.resolve(null);
  if (assetReconnectRetryPromise) return assetReconnectRetryPromise;
  const snapshot = getAssetLoadState();
  if (snapshot.status !== "loading" && (!snapshot.failed || snapshot.failed.length === 0)) return Promise.resolve(snapshot);
  const initialLoad = snapshot.status === "loading" && startupAssetPreloadPromise
    ? startupAssetPreloadPromise.catch(() => null)
    : Promise.resolve(null);
  assetReconnectRetryPromise = initialLoad
    .then(() => {
      const settled = getAssetLoadState();
      if (!settled.failed || settled.failed.length === 0) return settled;
      return retryFailedAssets({ timeoutMs: 5000, retries: 1 });
    })
    .catch((error) => {
      state.debugErrors.push(`Asset reconnect retry fallback: ${String(error && error.message || error).slice(0, 120)}`);
      return getAssetLoadState();
    })
    .finally(() => { assetReconnectRetryPromise = null; });
  return assetReconnectRetryPromise;
}
window.addEventListener("online", () => { retryFailedGameAssetsAfterReconnect(); });
if (typeof preloadGameAssets === "function") {
  startupAssetPreloadPromise = Promise.resolve(preloadGameAssets())
    .catch((error) => {
      state.debugErrors.push(`Asset preload fallback: ${String(error && error.message || error).slice(0, 120)}`);
      return typeof getAssetLoadState === "function" ? getAssetLoadState() : null;
    })
    .finally(() => { startupAssetPreloadPromise = null; });
}
requestAnimationFrame(loop);
