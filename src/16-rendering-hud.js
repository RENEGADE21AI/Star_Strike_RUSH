function drawControls() {
  if (typeof touchControlsVisible === "function" && !touchControlsVisible(state.inputMode, state.gameState)) return;
  const joyCx = 76, joyCy = H - 76, joyR = 56;
  const actCx = W - 76, actCy = H - 76, actR = 42;
  ctx.save();
  const controlEnabled = typeof currentGameplayControlEnabled === "function"
    ? currentGameplayControlEnabled()
    : state.gameState === "playing";
  const controlAlpha = controlEnabled ? 1 : 0.22;
  ctx.globalAlpha = controlAlpha;
  const joystickFill = ctx.createRadialGradient(joyCx, joyCy, 4, joyCx, joyCy, joyR);
  joystickFill.addColorStop(0, "rgba(120,220,255,0.08)");
  joystickFill.addColorStop(0.72, "rgba(8,18,34,0.18)");
  joystickFill.addColorStop(1, "rgba(3,8,18,0.46)");
  ctx.fillStyle = joystickFill;
  ctx.beginPath(); ctx.arc(joyCx, joyCy, joyR, 0, TAU); ctx.fill();
  ctx.strokeStyle = "rgba(190,231,244,0.30)";
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(joyCx, joyCy, joyR, 0, TAU); ctx.stroke();
  ctx.strokeStyle = "rgba(105,222,255,0.15)";
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(joyCx, joyCy, joyR * 0.60, 0, TAU); ctx.stroke();
  for (let spoke = 0; spoke < 4; spoke++) {
    const angle = spoke * Math.PI / 2;
    ctx.beginPath();
    ctx.moveTo(joyCx + Math.cos(angle) * joyR * 0.72, joyCy + Math.sin(angle) * joyR * 0.72);
    ctx.lineTo(joyCx + Math.cos(angle) * joyR * 0.88, joyCy + Math.sin(angle) * joyR * 0.88);
    ctx.stroke();
  }
  const knobX = state.joystick.active ? joyCx + state.joystick.ax * joyR * 0.62 : joyCx;
  const knobY = state.joystick.active ? joyCy + state.joystick.ay * joyR * 0.62 : joyCy;
  ctx.fillStyle = state.joystick.active ? "rgba(135,238,255,0.34)" : "rgba(226,245,252,0.18)";
  ctx.shadowColor = state.joystick.active ? "rgba(96,228,255,0.70)" : "transparent";
  ctx.shadowBlur = state.joystick.active ? 10 : 0;
  ctx.beginPath(); ctx.arc(knobX, knobY, 18, 0, TAU); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = "rgba(225,248,255,0.32)";
  ctx.beginPath(); ctx.arc(knobX, knobY, 18, 0, TAU); ctx.stroke();
  const wraith = isWraithActive();
  const profile = typeof ghostActionProfile === "function" ? ghostActionProfile(state.boss && state.boss.mode) : { label: wraith ? "HOP" : "GHOST", cost: wraith ? 18 : 35 };
  const ready = controlEnabled && state.player && state.player.energy >= profile.cost && (wraith ? true : state.player.ghostCooldown <= 0);
  const visuallyReady = controlEnabled && (ready || wraith);
  const buttonFill = !controlEnabled
    ? "rgba(255,255,255,0.08)"
    : wraith
      ? (state.playerRealm === 0 ? "rgba(170,220,255,0.26)" : "rgba(210,170,255,0.26)")
      : (ready ? "rgba(100,255,180,0.22)" : "rgba(255,255,255,0.10)");
  const abilityGlow = wraith ? (state.playerRealm === 0 ? "#aee8ff" : "#d2aaff") : "#78ffb4";
  ctx.shadowColor = visuallyReady ? abilityGlow : "transparent";
  ctx.shadowBlur = visuallyReady ? 10 : 0;
  ctx.fillStyle = buttonFill;
  ctx.beginPath(); ctx.arc(actCx, actCy, actR, 0, TAU); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = !controlEnabled
    ? "rgba(255,255,255,0.20)"
    : wraith
      ? (state.playerRealm === 0 ? "rgba(170,220,255,0.55)" : "rgba(210,170,255,0.55)")
      : (ready ? "rgba(100,255,180,0.55)" : "rgba(255,255,255,0.28)");
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(actCx, actCy, actR, 0, TAU); ctx.stroke();
  ctx.strokeStyle = visuallyReady ? "rgba(255,255,255,0.20)" : "rgba(255,255,255,0.08)";
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(actCx, actCy, actR - 6, 0, TAU); ctx.stroke();
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = wraith ? FONT_BUTTON : FONT_SMALL;
  const label = profile.label;
  ctx.fillText(label, actCx, actCy - 1);
  ctx.font = "800 7px Arial, sans-serif";
  ctx.fillStyle = visuallyReady ? "rgba(220,255,241,0.72)" : "rgba(225,238,245,0.42)";
  ctx.fillText(controlEnabled ? (ready || wraith ? "READY" : `${Math.ceil(profile.cost)} CHARGE`) : "LOCKED", actCx, actCy + 13);
  ctx.restore();
}
function drawDesktopControlHint() {
  if (
    state.inputMode === "touch" ||
    state.inputMode === "pen" ||
    state.gameState !== "playing" ||
    state.inputHintAcknowledged === true ||
    state.inputHintTimer < 180 ||
    (typeof currentGameplayControlEnabled === "function" && !currentGameplayControlEnabled())
  ) return;
  const profile = typeof ghostActionProfile === "function" ? ghostActionProfile(state.boss && state.boss.mode) : { label: "GHOST" };
  const text = `MOVE  WASD / ARROWS    ${profile.label}  SPACE / SHIFT`;
  const fade = clamp((state.inputHintTimer - 180) / 42, 0, 1);
  ctx.save();
  ctx.globalAlpha = fade;
  ctx.font = "900 9px 'Arial Narrow', Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const width = Math.min(W - 32, ctx.measureText(text).width + 22);
  ctx.fillStyle = "rgba(4,8,18,0.72)";
  ctx.fillRect(W / 2 - width / 2, H - 30, width, 20);
  ctx.strokeStyle = "rgba(120,210,255,0.24)";
  ctx.strokeRect(W / 2 - width / 2, H - 30, width, 20);
  ctx.fillStyle = "rgba(220,240,255,0.78)";
  ctx.fillText(text, W / 2, H - 20);
  ctx.restore();
}
function getGameplayHudLayout() {
  const offset = bossHudOffset();
  const touchLike = state.inputMode === "touch" || state.inputMode === "pen";
  const energyY = touchLike ? H - 214 : H - 78;
  return {
    pause: { x: 10, y: 10, w: 34, h: 34 },
    status: { x: 8, y: energyY - 17, w: 112, h: 56 },
    energy: { x: 18, y: energyY + 3, w: 92, h: 6 },
    health: { x: 18, y: energyY + 25, w: 92, h: 8, orientation: "horizontal" },
    score: { x: W - 86, y: 8 + offset, w: 78, h: 40 }
  };
}
function gameplayHudOpacity(player, layout) {
  if (!player || !layout) return 0.9;
  const centerX = layout.health.x + layout.health.w / 2;
  const centerY = (layout.energy.y + layout.health.y + layout.health.h) / 2;
  const distance = Math.hypot(player.x - centerX, player.y - centerY);
  return distance < 96 ? 0.38 : distance < 142 ? 0.62 : 0.9;
}
function drawLeftStatusHUD() {
  const p = state.player;
  const layout = getGameplayHudLayout();
  const energy = layout.energy;
  const health = layout.health;
  const actionProfile = typeof ghostActionProfile === "function" ? ghostActionProfile(state.boss && state.boss.mode) : { label: isWraithActive() ? "HOP" : "GHOST", cost: isWraithActive() ? 18 : 35 };
  const enough = p.energy >= actionProfile.cost && p.ghostCooldown <= 0;
  ctx.save();
  ctx.globalAlpha = gameplayHudOpacity(p, layout);
  const panel = layout.status;
  const panelFill = ctx.createLinearGradient(panel.x, panel.y, panel.x + panel.w, panel.y + panel.h);
  panelFill.addColorStop(0, "rgba(2,9,20,0.82)");
  panelFill.addColorStop(1, "rgba(2,9,20,0.30)");
  ctx.fillStyle = panelFill;
  ctx.beginPath();
  ctx.roundRect(panel.x, panel.y, panel.w, panel.h, 7);
  ctx.fill();
  ctx.strokeStyle = "rgba(142,213,235,0.18)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(panel.x, panel.y, panel.w, panel.h, 7);
  ctx.stroke();
  ctx.font = "900 7px 'Arial Narrow', Arial, sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "bottom";
  ctx.fillStyle = "rgba(203,231,242,0.62)";
  ctx.fillText(actionProfile.label, energy.x, energy.y - 3);
  ctx.textAlign = "right";
  ctx.fillStyle = enough ? "rgba(127,255,199,0.92)" : "rgba(255,183,120,0.86)";
  ctx.fillText(`${Math.round(p.energy)}${enough ? "  READY" : ""}`, energy.x + energy.w, energy.y - 3);
  ctx.fillStyle = "rgba(255,255,255,0.16)";
  ctx.fillRect(energy.x, energy.y, energy.w, energy.h);
  const energyFill = ctx.createLinearGradient(energy.x, 0, energy.x + energy.w, 0);
  energyFill.addColorStop(0, "#4bd8ff");
  energyFill.addColorStop(0.72, enough ? "#92ffc3" : "#ffd05e");
  energyFill.addColorStop(1, enough ? "#eaff8a" : "#ff8e5e");
  ctx.fillStyle = energyFill;
  ctx.fillRect(energy.x, energy.y, energy.w * clamp(p.energy / Math.max(1, p.maxEnergy), 0, 1), energy.h);
  ctx.strokeStyle = "rgba(221,247,255,0.36)";
  ctx.strokeRect(energy.x, energy.y, energy.w, energy.h);

  const segments = Math.max(1, Math.floor(p.maxHp || 5));
  const gap = 2;
  const segmentW = Math.max(5, (health.w - gap * (segments - 1)) / segments);
  ctx.textBaseline = "top";
  ctx.textAlign = "left";
  ctx.fillStyle = "rgba(235,245,255,0.60)";
  ctx.fillText("HEALTH", health.x, health.y - 9);
  ctx.textAlign = "right";
  ctx.fillStyle = p.hp <= 1 ? "#ff8a92" : "rgba(235,245,255,0.54)";
  ctx.fillText(`${p.hp} / ${segments}`, health.x + health.w, health.y - 9);
  for (let i = 0; i < segments; i++) {
    const sx = health.x + i * (segmentW + gap);
    ctx.fillStyle = i < p.hp ? (p.hp <= 1 ? "#ff6464" : "#e34955") : "rgba(100,116,126,0.26)";
    ctx.fillRect(sx, health.y, segmentW, health.h);
    ctx.strokeStyle = i < p.hp ? "rgba(255,215,220,0.52)" : "rgba(210,228,238,0.16)";
    ctx.strokeRect(sx + 0.5, health.y + 0.5, Math.max(0, segmentW - 1), health.h - 1);
  }
  ctx.restore();
}
function drawTopRightHUD() {
  const offset = bossHudOffset();
  const comboGlow = clamp(state.comboPulse / 120, 0, 1);
  const layout = getGameplayHudLayout();
  const panel = {
    x: layout.score.x,
    y: layout.score.y,
    w: layout.score.w,
    h: layout.score.h
  };
  ctx.save();
  const backing = ctx.createLinearGradient(panel.x, panel.y, panel.x + panel.w, panel.y);
  backing.addColorStop(0, "rgba(2,8,18,0)");
  backing.addColorStop(1, "rgba(2,8,18,0.72)");
  ctx.fillStyle = backing;
  ctx.beginPath();
  ctx.roundRect(panel.x, panel.y, panel.w, panel.h, 6);
  ctx.fill();
  ctx.strokeStyle = "rgba(158,220,238,0.10)";
  ctx.beginPath();
  ctx.roundRect(panel.x, panel.y, panel.w, panel.h, 6);
  ctx.stroke();
  ctx.textAlign = "right";
  ctx.textBaseline = "top";
  ctx.font = "800 9px 'Arial Narrow', Arial, sans-serif";
  ctx.fillStyle = "rgba(239,249,255,0.84)";
  ctx.fillText("SCORE  " + state.score, W - 10, 10 + offset);
  ctx.fillStyle = "rgba(193,218,232,0.64)";
  ctx.fillText("HI-SCORE  " + highScore, W - 10, 22 + offset);
  ctx.shadowColor = `rgba(255,160,70,${comboGlow * 0.58})`;
  ctx.shadowBlur = comboGlow * 8;
  ctx.fillStyle = comboGlow > 0 ? "#ffd36a" : "rgba(239,249,255,0.72)";
  ctx.fillText("COMBO  x" + state.multiplier, W - 10, 34 + offset);
  ctx.restore();
}
function drawAnnouncements() {
  if (!state.message || state.messageTimer <= 0) return;
  const max = state.messageMax || 1;
  const t = clamp(state.messageTimer / max, 0, 1);
  const alpha = clamp(t < 0.18 ? t / 0.18 : 1, 0, 1);
  const baseY = (state.boss || state.bossDeath) ? 54 : 46;
  const slide = (1 - t) * 10;
  const pad = 14;
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = FONT_SUBTITLE;
  const textWidth = ctx.measureText(state.message).width;
  const boxW = textWidth + pad * 2;
  const boxH = 28;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = "rgba(0,0,0,0.34)";
  ctx.fillRect(W / 2 - boxW / 2, baseY - boxH / 2 + slide, boxW, boxH);
  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.strokeRect(W / 2 - boxW / 2, baseY - boxH / 2 + slide, boxW, boxH);
  ctx.fillStyle = "#fff";
  ctx.fillText(state.message, W / 2, baseY + slide + 1);
  ctx.restore();
}
function drawGameNotices() {
  const notices = Array.isArray(state.notices) ? state.notices : [];
  if (!notices.length || state.gameState !== "playing") return;
  const colors = {
    discovery: "#86f7ff",
    phase: "#ffe889",
    powerup: "#9dffb0",
    boss: "#ff9ed8",
    warning: "#ffad78",
    system: "#c7d9ef"
  };
  ctx.save();
  ctx.font = "900 9px 'Arial Narrow', Arial, sans-serif";
  ctx.textBaseline = "middle";
  for (let index = 0; index < notices.length; index++) {
    const notice = notices[index];
    const progress = clamp(notice.age / Math.max(1, notice.duration), 0, 1);
    const edgeFade = Math.min(1, notice.age / 10, (notice.duration - notice.age) / 18);
    ctx.globalAlpha = clamp(edgeFade, 0, 1) * 0.82;
    ctx.fillStyle = colors[notice.category] || colors.system;
    ctx.shadowColor = ctx.fillStyle;
    ctx.shadowBlur = settingReducedFlash ? 0 : 7;
    if (notice.rail === "traverse") {
      const x = settingReducedMotion ? 12 : 10 + (W - 20) * progress;
      ctx.textAlign = settingReducedMotion ? "left" : (progress > 0.72 ? "right" : "left");
      ctx.fillText(notice.text, x, H * 0.52 + index * 14);
    } else {
      ctx.textAlign = "right";
      ctx.fillText(notice.text, W - 10, H * 0.37 + index * 15);
    }
  }
  ctx.restore();
}
function getPauseButtonRect() { return getGameplayHudLayout().pause; }
function getPauseOverlayRects() {
  if (state.runMode === "tutorial") {
    return {
      resume: { x: W / 2 - 100, y: H / 2 - 4, w: 200, h: 38 },
      checkpoint: { x: W / 2 - 100, y: H / 2 + 40, w: 200, h: 34 },
      restart: { x: W / 2 - 100, y: H / 2 + 80, w: 200, h: 34 },
      skip: { x: W / 2 - 100, y: H / 2 + 120, w: 200, h: 34 },
      title: { x: W / 2 - 100, y: H / 2 + 160, w: 200, h: 34 }
    };
  }
  return {
    resume: { x: W / 2 - 92, y: H / 2 + 18, w: 184, h: 42 },
    restart: { x: W / 2 - 92, y: H / 2 + 70, w: 184, h: 38 },
    title: { x: W / 2 - 92, y: H / 2 + 116, w: 184, h: 38 }
  };
}
function getPauseConfirmRects() {
  return {
    cancel: { x: W / 2 - 100, y: H / 2 + 30, w: 200, h: 40 },
    confirm: { x: W / 2 - 100, y: H / 2 + 80, w: 200, h: 40 }
  };
}
function requestPauseDestructiveAction(action) {
  if (state.runMode === "tutorial" || !["restart", "title"].includes(action)) return false;
  pauseConfirmPreviousNotice = state.pauseNotice;
  pauseConfirmAction = action;
  state.pauseNotice = action === "restart" ? "CURRENT RUN WILL RESTART" : "CURRENT RUN WILL END";
  clearGameplayInput();
  return true;
}
function cancelPauseDestructiveAction() {
  if (!pauseConfirmAction) return false;
  pauseConfirmAction = "";
  state.pauseNotice = pauseConfirmPreviousNotice;
  pauseConfirmPreviousNotice = "";
  clearGameplayInput();
  return true;
}
function confirmPauseDestructiveAction() {
  const action = pauseConfirmAction;
  pauseConfirmAction = "";
  pauseConfirmPreviousNotice = "";
  if (action === "restart") beginGame();
  else if (action === "title") setupSession("start");
  return action === "restart" || action === "title";
}
function handlePausePointerDown(x, y) {
  const rects = getPauseOverlayRects();
  if (state.gameState === "resuming") {
    if (hitRect(rects.resume, x, y)) cancelResumeCountdown();
    return true;
  }
  if (state.gameState !== "paused") return true;
  if (pauseConfirmAction) {
    const confirmRects = getPauseConfirmRects();
    if (hitRect(confirmRects.cancel, x, y)) cancelPauseDestructiveAction();
    else if (hitRect(confirmRects.confirm, x, y)) confirmPauseDestructiveAction();
    return true;
  }
  if (hitRect(rects.resume, x, y)) { resumeGame(); return true; }
  if (state.runMode === "tutorial" && rects.checkpoint && hitRect(rects.checkpoint, x, y)) {
    if (typeof clearGameAccessibleSurface === "function") clearGameAccessibleSurface("Restarting tutorial checkpoint.");
    recoverTutorialCheckpoint();
    state.gameState = "playing";
    return true;
  }
  if (state.runMode === "tutorial" && hitRect(rects.restart, x, y)) {
    if (typeof clearGameAccessibleSurface === "function") clearGameAccessibleSurface("Restarting First Flight training.");
    setupSession("start");
    beginTutorialTraining({ replay: true });
    return true;
  }
  if (state.runMode === "tutorial" && rects.skip && hitRect(rects.skip, x, y)) {
    requestSkipTutorialTraining("pause");
    return true;
  }
  if (hitRect(rects.restart, x, y)) { requestPauseDestructiveAction("restart"); return true; }
  if (hitRect(rects.title, x, y)) {
    const wasTutorial = state.runMode === "tutorial";
    if (!wasTutorial) {
      requestPauseDestructiveAction("title");
      return true;
    }
    if (typeof clearGameAccessibleSurface === "function") clearGameAccessibleSurface("Returning to the First Flight checkpoint offer.");
    setupSession("start");
    if (wasTutorial && typeof onboardingState !== "undefined" && onboardingState && onboardingState.status === "in_progress") {
      onboardingUiMode = "resume_training";
      renderOnboardingAccessibleMode();
    }
    return true;
  }
  return true;
}
function drawPauseButton() {
  const r = getPauseButtonRect();
  ctx.save();
  const fill = ctx.createLinearGradient(r.x, r.y, r.x, r.y + r.h);
  fill.addColorStop(0, "rgba(16,32,48,0.78)");
  fill.addColorStop(1, "rgba(3,9,20,0.64)");
  ctx.fillStyle = fill;
  const trainingFree = state.runMode === "tutorial";
  ctx.strokeStyle = trainingFree ? "rgba(126,240,210,0.54)" : "rgba(255,86,102,0.82)";
  ctx.lineWidth = trainingFree ? 1 : 1.5;
  ctx.beginPath(); ctx.roundRect(r.x, r.y, r.w, r.h, 9); ctx.fill(); ctx.stroke();
  ctx.fillStyle = "rgba(225,247,255,0.82)";
  ctx.fillRect(r.x + 12, r.y + 10, 3, 14);
  ctx.fillRect(r.x + 19, r.y + 10, 3, 14);
  ctx.font = "800 7px 'Arial Narrow', Arial, sans-serif";
  ctx.textAlign = "right";
  ctx.textBaseline = "top";
  ctx.fillStyle = trainingFree
    ? "rgba(126,240,210,0.78)"
    : state.player && state.player.hp > 1 ? "rgba(255,126,136,0.88)" : "rgba(190,205,215,0.42)";
  ctx.fillText(trainingFree ? "0" : "-1", r.x + r.w - 3, r.y + 2);
  ctx.restore();
}
function drawPauseOverlay() {
  const rects = getPauseOverlayRects();
  const resuming = state.gameState === "resuming";
  const confirming = state.gameState === "paused" && !!pauseConfirmAction;
  ctx.save();
  ctx.fillStyle = "rgba(1,4,13,0.78)";
  ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(W / 2, H / 2 - 48, 0, W / 2, H / 2 - 48, 150);
  glow.addColorStop(0, "rgba(68,202,255,0.16)");
  glow.addColorStop(1, "rgba(68,202,255,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, H / 2 - 210, W, 330);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#eafaff";
  ctx.font = "700 24px system-ui, sans-serif";
  const heading = resuming
    ? String(Math.max(1, Math.ceil(state.resumeCountdown / 30)))
    : confirming
      ? pauseConfirmAction === "restart" ? "RESTART RUN?" : "RETURN TO TITLE?"
      : "FLIGHT PAUSED";
  ctx.fillText(heading, W / 2, H / 2 - 70);
  ctx.font = "600 10px system-ui, sans-serif";
  ctx.fillStyle = "rgba(194,231,244,0.62)";
  ctx.fillText(resuming ? "RE-ENGAGING CONTROLS" : confirming ? "THIS RUN'S PROGRESS WILL BE LOST" : "SIMULATION FROZEN", W / 2, H / 2 - 42);
  ctx.fillStyle = state.pausedReason === "manual" ? "rgba(255,142,150,0.86)" : "rgba(132,238,204,0.78)";
  ctx.fillText(state.pauseNotice || "", W / 2, H / 2 - 24);
  if (resuming) {
    drawSimpleButton(rects.resume, "STAY PAUSED", "rgba(88,229,255,0.44)");
  } else if (confirming) {
    const confirmRects = getPauseConfirmRects();
    drawSimpleButton(confirmRects.cancel, "KEEP RUN", "rgba(88,229,255,0.52)");
    drawSimpleButton(
      confirmRects.confirm,
      pauseConfirmAction === "restart" ? "CONFIRM RESTART" : "CONFIRM EXIT",
      "rgba(255,126,136,0.48)"
    );
  } else {
    drawSimpleButton(rects.resume, "RESUME", "rgba(88,229,255,0.62)");
    if (state.runMode === "tutorial") {
      drawSimpleButton(rects.checkpoint, "RESTART CHECKPOINT", "rgba(255,255,255,0.30)");
      drawSimpleButton(rects.restart, "RESTART TRAINING", "rgba(255,255,255,0.26)");
      drawSimpleButton(rects.skip, "SKIP TRAINING", "rgba(255,190,116,0.28)");
      drawSimpleButton(rects.title, "RETURN TO TITLE", "rgba(255,255,255,0.18)");
    } else {
      drawSimpleButton(rects.restart, "RESTART RUN", "rgba(255,255,255,0.28)");
      drawSimpleButton(rects.title, "RETURN TO TITLE", "rgba(255,255,255,0.18)");
    }
  }
  ctx.restore();
}
function drawHUD() { drawLeftStatusHUD(); drawTopRightHUD(); drawGameNotices(); drawPauseButton(); drawDesktopControlHint(); }
function drawLowHpWarning() {
  if (!state.player || state.player.hp !== 1) return;
  const pulse = settingReducedFlash ? 0.35 : 0.5 + 0.5 * Math.sin(state.frame * 0.08);
  const alpha = 0.04 + pulse * 0.08;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = "rgba(255,70,70,1)";
  ctx.lineWidth = 6;
  ctx.shadowColor = "rgba(255,0,0,0.8)";
  ctx.shadowBlur = 18;
  ctx.strokeRect(4, 4, W - 8, H - 8);
  ctx.restore();
}
function drawDamageFlash() {
  if (state.fx.flash <= 0 || settingReducedFlash) return;
  const alpha = (state.fx.flash / 8) * 0.18;
  ctx.save();
  ctx.fillStyle = `rgba(255,255,255,${alpha})`;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}
globalThis.gameplayHudOpacity = gameplayHudOpacity;
