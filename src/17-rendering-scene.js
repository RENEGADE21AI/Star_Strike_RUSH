function drawOuterFog() {
  const screenW = VIEW_W;
  const screenH = VIEW_H;
  const gx = offsetX;
  const gy = offsetY;
  const gw = GAME_W * scale;
  const gh = GAME_H * scale;

  // No letterbox on this device — skip entirely
  if (gx < 1 && gy < 1) {
    ctx.fillStyle = "#01040b";
    ctx.fillRect(0, 0, screenW, screenH);
    return;
  }

  // Sparse extension stars keep tall-phone and desktop gutters feeling like
  // continuous space instead of letterbox bars. The game rectangle overwrites
  // these points before the logical scene is drawn.
  ctx.fillStyle = "#01040b";
  ctx.fillRect(0, 0, screenW, screenH);
  ctx.fillStyle = "rgba(230,240,255,0.34)";
  for (let i = 0; i < 30; i++) {
    const px = ((i * 97 + 41) % 997) / 997 * screenW;
    const py = ((i * 193 + 73) % 991) / 991 * screenH;
    const size = i % 9 === 0 ? 1.3 : 0.8;
    ctx.fillRect(px, py, size, size);
  }

  // Keep the space fog tight to the playfield. Broad colored masses read as an
  // aurora or curtain; this narrow dark seam simply joins two depths.
  const tightSeam = Math.min(58, Math.max(28, gx * 0.24));
  if (gx > 1) {
    const leftSeam = ctx.createLinearGradient(Math.max(0, gx - tightSeam), 0, gx, 0);
    leftSeam.addColorStop(0, "rgba(5,12,22,0)");
    leftSeam.addColorStop(0.72, "rgba(7,18,30,0.12)");
    leftSeam.addColorStop(1, "rgba(2,6,17,0.86)");
    ctx.fillStyle = leftSeam;
    ctx.fillRect(Math.max(0, gx - tightSeam), gy, Math.min(tightSeam, gx), gh);
  }
  if (gx + gw < screenW - 1) {
    const rightSeam = ctx.createLinearGradient(gx + gw, 0, Math.min(screenW, gx + gw + tightSeam), 0);
    rightSeam.addColorStop(0, "rgba(2,6,17,0.86)");
    rightSeam.addColorStop(0.28, "rgba(7,18,30,0.12)");
    rightSeam.addColorStop(1, "rgba(5,12,22,0)");
    ctx.fillStyle = rightSeam;
    ctx.fillRect(gx + gw, gy, Math.min(tightSeam, screenW - gx - gw), gh);
  }

}
function drawPlayfieldFogBlend() {
  const edge = 22;
  ctx.save();
  const left = ctx.createLinearGradient(0, 0, edge, 0);
  left.addColorStop(0, "rgba(1,4,11,0.90)");
  left.addColorStop(0.55, "rgba(3,10,19,0.24)");
  left.addColorStop(1, "rgba(3,10,19,0)");
  ctx.fillStyle = left;
  ctx.fillRect(0, 0, edge, H);
  const right = ctx.createLinearGradient(W - edge, 0, W, 0);
  right.addColorStop(0, "rgba(3,10,19,0)");
  right.addColorStop(0.45, "rgba(3,10,19,0.24)");
  right.addColorStop(1, "rgba(1,4,11,0.90)");
  ctx.fillStyle = right;
  ctx.fillRect(W - edge, 0, edge, H);
  ctx.restore();
}
function drawScreenFogBlend() {
  // The dark outer and in-playfield seams already meet. A second colored
  // overlay made the boundary read like an aurora instead of depth.
}
function sceneTransitionProgress() {
  return clamp(state.sceneTransition.frame / Math.max(1, state.sceneTransition.duration), 0, 1);
}
function drawTitleLaunchEffect() {
  if (state.sceneTransition.mode !== "title_launch" || settingReducedMotion) return;
  const t = sceneTransitionProgress();
  const eased = t * t * (3 - 2 * t);
  const centerX = W / 2;
  const startY = H * 0.465;
  const shipY = startY + (H * 0.15 - startY) * easeOutCubic(t);
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (let index = 0; index < 18; index++) {
    const angle = (index / 18) * TAU + 0.18;
    const inner = 36 + eased * 46 + (index % 3) * 5;
    const length = 18 + eased * 96 + (index % 4) * 8;
    const x1 = centerX + Math.cos(angle) * inner;
    const y1 = startY + Math.sin(angle) * inner * 0.62;
    const x2 = centerX + Math.cos(angle) * (inner + length);
    const y2 = startY + Math.sin(angle) * (inner + length) * 0.62;
    const grad = ctx.createLinearGradient(x1, y1, x2, y2);
    grad.addColorStop(0, "rgba(92,238,255,0)");
    grad.addColorStop(1, `rgba(210,249,255,${0.16 + eased * 0.5})`);
    ctx.strokeStyle = grad;
    ctx.lineWidth = 0.7 + eased * 1.1;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  }
  ctx.restore();
  drawSpriteAsset(ctx, "player", centerX, shipY, { scale: 0.88 + eased * 0.42, alpha: Math.min(1, t * 4) });
  const veil = ctx.createRadialGradient(centerX, startY, 0, centerX, startY, 230);
  veil.addColorStop(0, `rgba(190,247,255,${Math.max(0, (t - 0.55) * 0.72)})`);
  veil.addColorStop(1, "rgba(8,26,48,0)");
  ctx.fillStyle = veil;
  ctx.fillRect(0, 0, W, H);
}
function drawGameArrivalEffect() {
  if (state.sceneTransition.mode !== "game_arrival" || settingReducedMotion) return;
  const t = sceneTransitionProgress();
  const fade = 1 - easeOutCubic(t);
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = fade * 0.55;
  for (let index = 0; index < 22; index++) {
    const x = ((index * 73 + 29) % 367) + 4;
    const y = ((index * 137 + 61) % 620) + 20;
    ctx.strokeStyle = index % 4 === 0 ? "#8ff5ff" : "#d8fbff";
    ctx.lineWidth = index % 5 === 0 ? 1.5 : 0.8;
    ctx.beginPath(); ctx.moveTo(x, y - 28 * fade); ctx.lineTo(x, y + 34 * fade); ctx.stroke();
  }
  ctx.restore();
}
function draw() {
  ctx.setTransform(renderDpr, 0, 0, renderDpr, 0, 0);
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
  ctx.beginPath();
  ctx.rect(0, 0, W, H);
  ctx.clip();
  ctx.translate(sx, sy);

  drawBackground();
  if (state.gameState === "playing" || state.gameState === "paused" || state.gameState === "resuming") {
    if (typeof drawExpansionHazards === "function") drawExpansionHazards();
    drawPowerups();
    drawBullets();
    drawEnemies();
    drawBossDeath();
    drawBoss();
    drawWingmen();
    drawPlayer();
    drawParticles();
    drawPlayfieldFogBlend();
    drawControls();
    drawHUD();
    if (state.gameState === "paused" || state.gameState === "resuming") drawPauseOverlay();
    drawGameArrivalEffect();
  } else if (state.gameState === "start") {
    const launchT = state.sceneTransition.mode === "title_launch" ? sceneTransitionProgress() : 0;
    ctx.save();
    ctx.translate(W / 2, H * 0.46);
    ctx.scale(1 + launchT * 0.09, 1 + launchT * 0.09);
    ctx.translate(-W / 2, -H * 0.46);
    ctx.globalAlpha = 1 - launchT * 0.72;
    drawStartScreen();
    ctx.restore();
    drawTitleLaunchEffect();
  } else if (state.gameState === "gameover") {
    drawGameOverScreen();
  }
  ctx.restore();
  drawScreenFogBlend();

  if (state.gameState === "playing" || state.gameState === "gameover") {
    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);
    ctx.beginPath();
    ctx.rect(0, 0, W, H);
    ctx.clip();
    drawLowHpWarning();
    drawDamageFlash();
    ctx.restore();
  }
}
