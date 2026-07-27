function drawControls() {
  if (typeof touchControlsVisible === "function" && !touchControlsVisible(state.inputMode, state.gameState)) return;
  const joyCx = 76, joyCy = H - 76, joyR = 56;
  const actCx = W - 76, actCy = H - 76, actR = 42;
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.beginPath(); ctx.arc(joyCx, joyCy, joyR, 0, TAU); ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.25)";
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(joyCx, joyCy, joyR, 0, TAU); ctx.stroke();
  const knobX = state.joystick.active ? joyCx + state.joystick.ax * joyR * 0.62 : joyCx;
  const knobY = state.joystick.active ? joyCy + state.joystick.ay * joyR * 0.62 : joyCy;
  ctx.fillStyle = "rgba(255,255,255,0.22)";
  ctx.beginPath(); ctx.arc(knobX, knobY, 18, 0, TAU); ctx.fill();
  const wraith = isWraithActive();
  const profile = typeof ghostActionProfile === "function" ? ghostActionProfile(state.boss && state.boss.mode) : { label: wraith ? "HOP" : "GHOST", cost: wraith ? 18 : 35 };
  const ready = state.player && state.player.energy >= profile.cost && (wraith ? true : state.player.ghostCooldown <= 0);
  const buttonFill = wraith ? (state.playerRealm === 0 ? "rgba(170,220,255,0.26)" : "rgba(210,170,255,0.26)") : (ready ? "rgba(100,255,180,0.22)" : "rgba(255,255,255,0.10)");
  ctx.fillStyle = buttonFill;
  ctx.beginPath(); ctx.arc(actCx, actCy, actR, 0, TAU); ctx.fill();
  ctx.strokeStyle = wraith ? (state.playerRealm === 0 ? "rgba(170,220,255,0.55)" : "rgba(210,170,255,0.55)") : (ready ? "rgba(100,255,180,0.55)" : "rgba(255,255,255,0.28)");
  ctx.beginPath(); ctx.arc(actCx, actCy, actR, 0, TAU); ctx.stroke();
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = wraith ? FONT_BUTTON : FONT_SMALL;
  const label = profile.label;
  ctx.fillText(label, actCx, actCy + 2);
}
function drawDesktopControlHint() {
  if (state.inputMode === "touch" || state.gameState !== "playing" || state.inputHintTimer <= 0) return;
  const profile = typeof ghostActionProfile === "function" ? ghostActionProfile(state.boss && state.boss.mode) : { label: "GHOST" };
  const text = `MOVE  WASD / ARROWS    ${profile.label}  SPACE / SHIFT`;
  const fade = clamp(state.inputHintTimer / 42, 0, 1);
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
  return {
    pause: { x: 10, y: 10, w: 38, h: 32 },
    energy: { x: 12, y: H - 164, w: 98, h: 7 },
    health: { x: 12, y: H - 145, w: 98, h: 10, orientation: "horizontal" },
    score: { x: W - 10, y: 10 + offset, w: 92, h: 38 }
  };
}
function drawLeftStatusHUD() {
  const p = state.player;
  const layout = getGameplayHudLayout();
  const energy = layout.energy;
  const health = layout.health;
  const actionProfile = typeof ghostActionProfile === "function" ? ghostActionProfile(state.boss && state.boss.mode) : { label: isWraithActive() ? "HOP" : "GHOST", cost: isWraithActive() ? 18 : 35 };
  const enough = p.energy >= actionProfile.cost && p.ghostCooldown <= 0;
  ctx.save();
  ctx.font = "900 7px 'Arial Narrow', Arial, sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "bottom";
  ctx.fillStyle = enough ? "rgba(127,255,199,0.88)" : "rgba(220,238,248,0.60)";
  ctx.fillText(`ENERGY ${Math.round(p.energy)}  ${actionProfile.label}`, energy.x, energy.y - 3);
  ctx.fillStyle = "rgba(255,255,255,0.16)";
  ctx.fillRect(energy.x, energy.y, energy.w, energy.h);
  ctx.fillStyle = enough ? "#ff0" : "#f44";
  ctx.fillRect(energy.x, energy.y, energy.w * clamp(p.energy / Math.max(1, p.maxEnergy), 0, 1), energy.h);
  ctx.strokeStyle = "rgba(255,255,255,0.45)";
  ctx.strokeRect(energy.x, energy.y, energy.w, energy.h);

  const segments = Math.max(1, Math.floor(p.maxHp || 5));
  const gap = 3;
  const segmentW = Math.max(5, (health.w - gap * (segments - 1)) / segments);
  ctx.textBaseline = "top";
  ctx.fillStyle = "rgba(235,245,255,0.60)";
  ctx.fillText("HEALTH", health.x, health.y - 9);
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
  ctx.save();
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
  return {
    resume: { x: W / 2 - 92, y: H / 2 + 18, w: 184, h: 42 },
    restart: { x: W / 2 - 92, y: H / 2 + 70, w: 184, h: 38 },
    title: { x: W / 2 - 92, y: H / 2 + 116, w: 184, h: 38 }
  };
}
function handlePausePointerDown(x, y) {
  const rects = getPauseOverlayRects();
  if (hitRect(rects.resume, x, y)) { resumeGame(); return true; }
  if (hitRect(rects.restart, x, y)) { beginGame(); return true; }
  if (hitRect(rects.title, x, y)) { setupSession("start"); return true; }
  return true;
}
function drawPauseButton() {
  const r = getPauseButtonRect();
  ctx.save();
  ctx.fillStyle = "rgba(5,10,22,0.54)";
  ctx.strokeStyle = "rgba(180,235,255,0.34)";
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(r.x, r.y, r.w, r.h, 10); ctx.fill(); ctx.stroke();
  ctx.fillStyle = "rgba(225,247,255,0.82)";
  ctx.fillRect(r.x + 9, r.y + 8, 3, 12);
  ctx.fillRect(r.x + 17, r.y + 8, 3, 12);
  ctx.font = "900 7px 'Arial Narrow', Arial, sans-serif";
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  ctx.fillStyle = state.player && state.player.hp > 1 ? "rgba(255,126,136,0.88)" : "rgba(190,205,215,0.42)";
  ctx.fillText("-1", r.x + r.w - 5, r.y + r.h / 2);
  ctx.restore();
}
function drawPauseOverlay() {
  const rects = getPauseOverlayRects();
  const resuming = state.gameState === "resuming";
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
  ctx.fillText(resuming ? String(Math.max(1, Math.ceil(state.resumeCountdown / 30))) : "FLIGHT PAUSED", W / 2, H / 2 - 70);
  ctx.font = "600 10px system-ui, sans-serif";
  ctx.fillStyle = "rgba(194,231,244,0.62)";
  ctx.fillText(resuming ? "RE-ENGAGING CONTROLS" : "SIMULATION FROZEN", W / 2, H / 2 - 42);
  ctx.fillStyle = state.pausedReason === "manual" ? "rgba(255,142,150,0.86)" : "rgba(132,238,204,0.78)";
  ctx.fillText(state.pauseNotice || "", W / 2, H / 2 - 24);
  if (!resuming) {
    drawSimpleButton(rects.resume, "RESUME", "rgba(88,229,255,0.62)");
    drawSimpleButton(rects.restart, "RESTART RUN", "rgba(255,255,255,0.28)");
    drawSimpleButton(rects.title, "RETURN TO TITLE", "rgba(255,255,255,0.18)");
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
