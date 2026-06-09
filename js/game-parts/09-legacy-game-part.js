// Star Strike RUSH legacy game part 10
// Generated from js/legacyGame.js by scripts/split-legacy-game.mjs.
// Do not edit generated part files directly.

  state.fx.shake = 0;
  state.fx.flash = 0;
  state.gameOverShakeTimer = 180;
  state.gameOverShake = 6;
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
function handleTitlePointerDown(x, y) {
  if (resetProgressConfirm) return handleResetProgressConfirmDown(x, y);

  if (titlePanelAnim > 0.02) {
    if (titlePanelHit(x, y)) {
      if (titleSubState === "settings") {
        const r = getSettingsRects();
        if (hitRect(r.closeRect, x, y)) { titlePanelTarget = 0; codexDetailType = null; return true; }
        if (hitRect(r.low, x, y)) { settingMaxParticles = 300; MAX_PARTICLES = settingMaxParticles; saveSettings(); return true; }
        if (hitRect(r.med, x, y)) { settingMaxParticles = 600; MAX_PARTICLES = settingMaxParticles; saveSettings(); return true; }
        if (hitRect(r.high, x, y)) { settingMaxParticles = 900; MAX_PARTICLES = settingMaxParticles; saveSettings(); return true; }
        if (hitRect(r.shake, x, y)) { settingScreenShake = !settingScreenShake; saveSettings(); return true; }
        if (hitRect(r.reset, x, y)) { resetProgressConfirm = true; return true; }
        return true;
      }
      if (titleSubState === "codex") {
        const r = getCodexRects();
        if (hitRect(r.closeRect, x, y)) { titlePanelTarget = 0; codexDetailType = null; return true; }
        if (codexDetailType) {
          const detailCard = { x: r.panel.x + 18, y: r.panel.y + 46, w: r.panel.w - 36, h: r.panel.h - 62 };
          const backRect = { x: detailCard.x + 10, y: detailCard.y + 10, w: 28, h: 22 };
          if (hitRect(backRect, x, y)) { codexDetailType = null; return true; }
          if (!(x >= detailCard.x && x <= detailCard.x + detailCard.w && y >= detailCard.y && y <= detailCard.y + detailCard.h)) {
            codexDetailType = null;
            return true;
          }
          return true;
        }
        for (const type of ["red", "orange", "purple", "phantom", "boss_standard", "boss_wraith"]) {
          const card = r.rects[type];
          if (!hitRect(card, x, y)) continue;
          if (codexDiscovered[type]) {
            codexDetailType = type;
          }
          return true;
        }
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
  if (hitRect(iconRects.settings, x, y)) {
    if (titleSubState === "settings" && titlePanelTarget === 1) { titlePanelTarget = 0; codexDetailType = null; }
    else { titleSubState = "settings"; titlePanelTarget = 1; codexDetailType = null; }
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
    if (handleTitlePointerDown(x, y)) return;
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

function loop() { update(); draw(); requestAnimationFrame(loop); }

loadHighScore();
loadCallSign();
loadSettings();
loadCodexDiscovered();
resize();
setupSession("start");
window.addEventListener("resize", resize);
loop();
