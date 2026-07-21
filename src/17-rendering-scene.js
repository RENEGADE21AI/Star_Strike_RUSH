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

  // Sparse extension stars keep tall-phone and desktop gutters feeling like
  // continuous space instead of letterbox bars. The game rectangle overwrites
  // these points before the logical scene is drawn.
  ctx.fillStyle = "rgba(230,240,255,0.48)";
  for (let i = 0; i < 34; i++) {
    const px = ((i * 97 + 41) % 997) / 997 * screenW;
    const py = ((i * 193 + 73) % 991) / 991 * screenH;
    const size = i % 7 === 0 ? 1.5 : 1;
    ctx.fillRect(px, py, size, size);
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
  ctx.beginPath();
  ctx.rect(0, 0, W, H);
  ctx.clip();
  ctx.translate(sx, sy);

  drawBackground();
  if (state.gameState === "playing") {
    if (typeof drawExpansionHazards === "function") drawExpansionHazards();
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
    ctx.beginPath();
    ctx.rect(0, 0, W, H);
    ctx.clip();
    drawLowHpWarning();
    drawDamageFlash();
    ctx.restore();
  }
}
