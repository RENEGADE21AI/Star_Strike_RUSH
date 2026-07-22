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
function drawTopLeftHUD() {
  const p = state.player;
  const offset = bossHudOffset();
  const x = 12, y = 12 + offset;
  const barW = 120, barH = 10, segments = 5, gap = 4, segW = (barW - gap * (segments - 1)) / segments;
  for (let i = 0; i < segments; i++) {
    const sx = x + i * (segW + gap);
    ctx.fillStyle = i < p.hp ? "#d33" : "rgba(110,110,110,0.45)";
    ctx.fillRect(sx, y, segW, barH);
  }
  ctx.strokeStyle = "rgba(255,255,255,0.28)";
  ctx.strokeRect(x - 1, y - 1, barW + 2, barH + 2);
  const energyY = y + 20;
  const actionProfile = typeof ghostActionProfile === "function" ? ghostActionProfile(state.boss && state.boss.mode) : { label: isWraithActive() ? "HOP" : "GHOST", cost: isWraithActive() ? 18 : 35 };
  const actionCost = actionProfile.cost;
  const enough = p.energy >= actionCost;
  ctx.fillStyle = "rgba(255,255,255,0.16)";
  ctx.fillRect(x, energyY, barW, 8);
  ctx.fillStyle = enough ? "#ff0" : "#f44";
  ctx.fillRect(x, energyY, barW * (p.energy / p.maxEnergy), 8);
  ctx.strokeStyle = "rgba(255,255,255,0.45)";
  ctx.strokeRect(x, energyY, barW, 8);
  ctx.font = "900 8px 'Arial Narrow', Arial, sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillStyle = enough && p.ghostCooldown <= 0 ? "rgba(120,255,180,0.82)" : "rgba(255,255,255,0.48)";
  ctx.fillText(`${actionProfile.label} ${enough && p.ghostCooldown <= 0 ? "READY" : "CHARGING"}`, x, energyY + 11);
  if (state.devStatsVisible) {
    const lines = [
      `Phase: ${state.phase}`,
      `Mood: ${state.waveMood}`,
      `Intensity: ${state.intensityPhase}`,
      `Threat: ${state.difficulty.threat.toFixed(2)}`,
      `Target: ${state.difficulty.target.toFixed(2)}`,
      `Pressure: ${Math.round(state.pressure)}`,
      `Pacing: ${state.difficulty.pacingMemory.toFixed(2)}`,
      `Heat: ${state.difficulty.heatStreak ? "ON" : "OFF"}`,
      `Drops: ${state.killsSinceLastDrop}`,
      `Wave: ${state.waveTimer}`,
      `Template: ${state.lastWaveTemplateName || "-"}`,
      `Shots: ${state.difficulty.shotsFired}/${state.difficulty.shotsHit}`,
      `Enemies: ${state.enemies.length}`,
      `Bullets: ${state.enemyBullets.length}`,
      `Boss: ${state.boss ? state.boss.mode : "-"}`,
      `PhaseTimer: ${state.phaseTimer}`
    ];
    ctx.fillStyle = "rgba(255,255,255,0.78)";
    ctx.font = FONT_TINY;
    ctx.textBaseline = "top";
    const startY = energyY + 14;
    for (let i = 0; i < lines.length; i++) ctx.fillText(lines[i], x, startY + i * 13);
  }
}
function drawTopRightHUD() {
  const offset = bossHudOffset();
  const comboGlow = clamp(state.comboPulse / 120, 0, 1);
  ctx.save();
  ctx.textAlign = "right";
  ctx.textBaseline = "top";
  ctx.fillStyle = "#fff";
  ctx.font = FONT_HUD;
  ctx.fillText("Score: " + state.score, W - 12, 12 + offset);
  ctx.fillText("High: " + highScore, W - 12, 30 + offset);
  const comboY = 48 + offset;
  const comboText = "Combo x" + state.multiplier;
  const comboScale = 1 + comboGlow * 0.10 + Math.sin(state.frame * 0.12) * comboGlow * 0.015;
  ctx.save();
  ctx.translate(W - 12, comboY);
  ctx.scale(comboScale, comboScale);
  ctx.font = FONT_COMBO;
  ctx.shadowColor = `rgba(255,160,70,${0.2 + comboGlow * 0.65})`;
  ctx.shadowBlur = 4 + comboGlow * 16;
  ctx.fillStyle = comboGlow > 0 ? (state.frame % 30 < 15 ? `hsl(44, 100%, ${70 + comboGlow * 8}%)` : `hsl(18, 100%, ${62 + comboGlow * 8}%)`) : "#fff";
  ctx.fillText(comboText, 0, 0);
  if (comboGlow > 0) {
    ctx.globalAlpha = 0.20 + comboGlow * 0.30;
    ctx.strokeStyle = "rgba(255,170,70,0.8)";
    ctx.strokeText(comboText, 0, 0);
  }
  ctx.restore();
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
function drawDebugHitboxes() {
  if (!state.debugHitboxes || typeof collisionCirclesFor !== "function") return;
  const drawCircles = (key, entity, fallback, color) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    for (const circle of collisionCirclesFor(key, entity.x, entity.y, 1, fallback)) {
      ctx.beginPath(); ctx.arc(circle.x, circle.y, circle.r, 0, TAU); ctx.stroke();
    }
    const origin = spriteMeta(key) && spriteMeta(key).projectileOrigin;
    if (origin) {
      ctx.fillStyle = "#ffdf6b";
      ctx.fillRect(entity.x + origin.offsetX - 2, entity.y + origin.offsetY - 2, 4, 4);
    }
  };
  ctx.save();
  ctx.globalAlpha = 0.82;
  for (const lane of state.safeLanes || []) {
    ctx.fillStyle = lane.row === 1 ? "rgba(76,255,196,0.07)" : "rgba(115,188,255,0.07)";
    ctx.fillRect(lane.minX, 0, lane.width, H);
    ctx.strokeStyle = lane.row === 1 ? "#4cffc4" : "#73bcff";
    ctx.strokeRect(lane.minX, 0, lane.width, H);
  }
  drawCircles("player", state.player, 14, "#4cffc4");
  for (const enemy of state.enemies) drawCircles(enemy.type, enemy, enemy.r || 12, "#ff6e8b");
  for (const bullet of state.bullets) drawCircles("player_bullet", bullet, bullet.r || 3, "#fff38a");
  for (const bullet of state.enemyBullets) drawCircles(bullet.kind === "drainShot" ? "drainShot" : "enemy_bullet", bullet, bullet.r || 4, "#ff9d48");
  for (const debris of state.debris) if (debris.kind !== "meteor_warning") drawCircles(debris.kind, debris, debris.r || 12, "#b6a18c");
  if (state.boss) drawCircles(`boss_${state.boss.mode}`, state.boss, 28, "#d7a7ff");
  ctx.restore();
}
function drawHUD() { drawTopLeftHUD(); drawTopRightHUD(); drawDesktopControlHint(); drawDebugHitboxes(); }
function drawLowHpWarning() {
  if (!state.player || state.player.hp !== 1) return;
  const pulse = 0.5 + 0.5 * Math.sin(state.frame * 0.08);
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
  if (state.fx.flash <= 0) return;
  const alpha = (state.fx.flash / 8) * 0.18;
  ctx.save();
  ctx.fillStyle = `rgba(255,255,255,${alpha})`;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}
