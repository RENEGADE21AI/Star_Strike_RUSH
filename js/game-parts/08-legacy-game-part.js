// Star Strike RUSH legacy game part 9
// Generated from js/legacyGame.js by scripts/split-legacy-game.mjs.
// Do not edit generated part files directly.

    ctx.globalAlpha = 0.35;
    ctx.fillStyle = "#9ff";
    ctx.fillRect(-d.w / 2 * 1.18, -d.h / 2 * 1.18, d.w * 1.18, d.h * 1.18);
  }
  const bodyAlpha = clamp(1 - t / 120, 0, 1);
  ctx.globalAlpha = bodyAlpha;
  for (const p of d.pieces) {
    ctx.save();
    ctx.translate(p.x - d.x, p.y - d.y);
    ctx.rotate(p.rot);
    ctx.fillStyle = `rgba(255,255,255,${p.alpha})`;
    ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
    ctx.restore();
  }
  ctx.restore();
  if (t < 70 && t % 6 === 0) spawnParticles(d.x + rand(-26, 26), d.y + rand(-16, 16), 10, "#fff", 0.9);
  if (flash > 0) {
    ctx.save();
    ctx.globalAlpha = flash * 0.2;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
}
function drawPowerups() {
  for (const p of state.powerups) {
    const bob = Math.sin(state.frame * 0.12 + p.x * 0.03) * 1.4;
    const spin = state.frame * 0.04;
    ctx.save();
    ctx.translate(p.x, p.y + bob);
    ctx.rotate(spin);
    if (p.type === "spread") ctx.fillStyle = "#4f4";
    else if (p.type === "rapid") ctx.fillStyle = "#ff4";
    else if (p.type === "repair") ctx.fillStyle = "#4af";
    else if (p.type === "wingman") ctx.fillStyle = "#f6f";
    else ctx.fillStyle = "#f6f";
    ctx.beginPath();
    ctx.moveTo(0, -p.size); ctx.lineTo(p.size, 0); ctx.lineTo(0, p.size); ctx.lineTo(-p.size, 0); ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#000";
    ctx.font = FONT_TINY;
    ctx.textAlign = "left";
    ctx.fillText(p.type === "spread" ? "S" : p.type === "rapid" ? "R" : p.type === "repair" ? "+" : p.type === "wingman" ? "W" : "2", -3, 4);
    ctx.restore();
  }
}
function drawParticles() {
  for (const p of state.particles) {
    ctx.fillStyle = p.color || "#fff";
    ctx.globalAlpha = Math.max(0, p.life / 32);
    ctx.fillRect(p.x, p.y, p.size, p.size);
  }
  ctx.globalAlpha = 1;
}
function drawControls() {
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
  const ready = state.player && state.player.energy >= (wraith ? 18 : 35) && (wraith ? true : state.player.ghostCooldown <= 0);
  const buttonFill = wraith ? (state.playerRealm === 0 ? "rgba(170,220,255,0.26)" : "rgba(210,170,255,0.26)") : (ready ? "rgba(100,255,180,0.22)" : "rgba(255,255,255,0.10)");
  ctx.fillStyle = buttonFill;
  ctx.beginPath(); ctx.arc(actCx, actCy, actR, 0, TAU); ctx.fill();
  ctx.strokeStyle = wraith ? (state.playerRealm === 0 ? "rgba(170,220,255,0.55)" : "rgba(210,170,255,0.55)") : (ready ? "rgba(100,255,180,0.55)" : "rgba(255,255,255,0.28)");
  ctx.beginPath(); ctx.arc(actCx, actCy, actR, 0, TAU); ctx.stroke();
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = wraith ? FONT_BUTTON : FONT_SMALL;
  const label = wraith ? "HOP" : "GHOST";
  ctx.fillText(label, actCx, actCy + 2);
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
  const actionCost = isWraithActive() ? 18 : 35;
  const enough = p.energy >= actionCost;
  ctx.fillStyle = "rgba(255,255,255,0.16)";
  ctx.fillRect(x, energyY, barW, 8);
  ctx.fillStyle = enough ? "#ff0" : "#f44";
  ctx.fillRect(x, energyY, barW * (p.energy / p.maxEnergy), 8);
  ctx.strokeStyle = "rgba(255,255,255,0.45)";
  ctx.strokeRect(x, energyY, barW, 8);
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
function drawHUD() { drawTopLeftHUD(); drawTopRightHUD(); drawAnnouncements(); }
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
function drawOuterFog() {
  const screenW = canvas.width;
  const screenH = canvas.height;
  const gx = offsetX;
  const gy = offsetY;
  const gw = GAME_W * scale;
  const gh = GAME_H * scale;

  // No letterbox on this device — skip entirely
  if (gx < 1 && gy < 1) {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, screenW, screenH);
    return;
  }

  const t = state.frame;

  // Deep space base
  ctx.fillStyle = "#030209";
  ctx.fillRect(0, 0, screenW, screenH);

  // 8 large cloud masses anchored to screen edges and corners
  const blobs = [
    { x: 0,        y: 0,        r: screenW * 0.60, a: 0.78, p: 0.0 },
    { x: screenW,  y: 0,        r: screenW * 0.58, a: 0.72, p: 1.6 },
    { x: 0,        y: screenH,  r: screenW * 0.58, a: 0.74, p: 3.1 },
    { x: screenW,  y: screenH,  r: screenW * 0.60, a: 0.76, p: 4.7 },
    { x: screenW * 0.5, y: 0,        r: screenW * 0.48, a: 0.62, p: 0.9 },
    { x: screenW * 0.5, y: screenH,  r: screenW * 0.48, a: 0.62, p: 2.4 },
    { x: 0,        y: screenH * 0.5, r: screenH * 0.42, a: 0.66, p: 1.3 },
    { x: screenW,  y: screenH * 0.5, r: screenH * 0.42, a: 0.66, p: 3.8 },
  ];

  for (const b of blobs) {
    const dx = Math.sin(t * 0.00042 + b.p) * 22;
    const dy = Math.cos(t * 0.00036 + b.p) * 16;
    const cx = b.x + dx;
    const cy = b.y + dy;
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, b.r);
    grad.addColorStop(0,    `rgba(30,20,54,${b.a})`);
    grad.addColorStop(0.28, `rgba(22,14,40,${b.a * 0.72})`);
    grad.addColorStop(0.58, `rgba(14,9,26,${b.a * 0.38})`);
    grad.addColorStop(1,    "rgba(0,0,0,0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, b.r, 0, TAU);
    ctx.fill();
  }

  // 4 secondary drifting wisps
  const wisps = [
    { x: screenW * 0.25, y: screenH * 0.18, r: screenW * 0.30, a: 0.42, p: 2.2 },
    { x: screenW * 0.75, y: screenH * 0.28, r: screenW * 0.28, a: 0.38, p: 0.5 },
    { x: screenW * 0.20, y: screenH * 0.75, r: screenW * 0.30, a: 0.40, p: 3.4 },
    { x: screenW * 0.78, y: screenH * 0.72, r: screenW * 0.28, a: 0.38, p: 1.8 },
  ];

  for (const w of wisps) {
    const dx = Math.sin(t * 0.00055 + w.p) * 28;
    const dy = Math.cos(t * 0.00048 + w.p) * 20;
    const cx = w.x + dx;
    const cy = w.y + dy;
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, w.r);
    grad.addColorStop(0,    `rgba(38,24,62,${w.a})`);
    grad.addColorStop(0.45, `rgba(24,15,42,${w.a * 0.50})`);
    grad.addColorStop(1,    "rgba(0,0,0,0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, w.r, 0, TAU);
    ctx.fill();
  }

  // Black out the game area
  ctx.fillStyle = "#000";
  ctx.fillRect(gx, gy, gw, gh);

  // Feather game edges back into fog (only where there's actual letterbox gap)
  const fade = 40;
  if (gy > 0) {
    const g = ctx.createLinearGradient(0, gy, 0, gy + fade);
    g.addColorStop(0, "rgba(0,0,0,1)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(gx, gy, gw, Math.min(fade, gh));
  }
  if (gy + gh < screenH) {
    const g = ctx.createLinearGradient(0, gy + gh - fade, 0, gy + gh);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, "rgba(0,0,0,1)");
    ctx.fillStyle = g;
    ctx.fillRect(gx, Math.max(gy, gy + gh - fade), gw, Math.min(fade, gh));
  }
  if (gx > 0) {
    const g = ctx.createLinearGradient(gx, 0, gx + fade, 0);
    g.addColorStop(0, "rgba(0,0,0,1)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(gx, gy, Math.min(fade, gw), gh);
  }
  if (gx + gw < screenW) {
    const g = ctx.createLinearGradient(gx + gw - fade, 0, gx + gw, 0);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, "rgba(0,0,0,1)");
    ctx.fillStyle = g;
    ctx.fillRect(Math.max(gx, gx + gw - fade), gy, Math.min(fade, gw), gh);
  }
}
function draw() {
  drawOuterFog();

  const shakeOn = settingScreenShake ? 1 : 0;
  const baseShake = (state.fx.shake + (state.gameState === "gameover" ? state.gameOverShake : 0)) * shakeOn;
  const gameOverT = state.gameState === "gameover" ? clamp(state.gameOverShakeTimer / 180, 0, 1) : 0;
  const freqScale = state.gameState === "gameover" ? (0.55 + 0.45 * gameOverT) : 1;
  const sx = baseShake ? Math.sin(state.frame * 17.13 * freqScale) * baseShake * 0.6 : 0;
  const sy = baseShake ? Math.cos(state.frame * 11.7 * freqScale) * baseShake * 0.6 : 0;

  ctx.save();
  ctx.translate(offsetX, offsetY);
  ctx.scale(scale, scale);
  ctx.translate(sx, sy);

  drawBackground();
  if (state.gameState === "playing") {
    drawPowerups();
    drawBullets();
    drawEnemies();
    drawBossDeath();
    drawBoss();
    drawWingmen();
    drawPlayer();
    drawParticles();
    drawControls();
    drawEncounterCard();
    drawHUD();
  } else if (state.gameState === "start") {
    drawStartScreen();
  } else if (state.gameState === "gameover") {
    drawGameOverScreen();
  }
  ctx.restore();

  if (state.gameState === "playing" || state.gameState === "gameover") {
    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);
    drawLowHpWarning();
    drawDamageFlash();
    ctx.restore();
  }
}
function beginGame() { setupSession("playing"); showMessage("PHASE 1", 90); }
function setupSession(mode = "start") {
  state.player = makePlayer();
  state.bullets = [];
  state.enemyBullets = [];
  state.enemies = [];
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
  state.pressure = 20;
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
  state.lastBossMode = null;
  state.intensityPhase = "normal";
  state.intensityTimer = 180;
  state.waveMood = "open";
  state.waveMoodTimer = 120;
  state.lastWaveTemplateName = null;
  state.difficulty.threat = 0.75;
  state.difficulty.target = 0.75;
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
  state.message = "";
  state.messageTimer = 0;
  state.messageMax = 0;
  state.messageQueue = [];
