function drawOuterFog() {
  const screenW = canvas.width;
  const screenH = canvas.height;
  const gx = offsetX;
  const gy = offsetY;
  const gw = GAME_W * scale;
  const gh = GAME_H * scale;

  // No letterbox on this device — skip entirely
  if (gx < 1 && gy < 1) {
    ctx.fillStyle = "#020611";
    ctx.fillRect(0, 0, screenW, screenH);
    return;
  }

  const t = state.frame;

  // Deep space base
  ctx.fillStyle = "#020611";
  ctx.fillRect(0, 0, screenW, screenH);

  // 8 large cloud masses anchored to screen edges and corners
  const blobs = [
    { x: -screenW * 0.08, y: 0,              r: screenW * 0.76, a: 0.30, p: 0.0 },
    { x: screenW * 1.08,  y: screenH * 0.08, r: screenW * 0.72, a: 0.27, p: 1.6 },
    { x: -screenW * 0.06, y: screenH,        r: screenW * 0.70, a: 0.26, p: 3.1 },
    { x: screenW * 1.06,  y: screenH,        r: screenW * 0.76, a: 0.28, p: 4.7 },
    { x: 0, y: screenH * 0.42, r: screenH * 0.50, a: 0.24, p: 1.3 },
    { x: screenW, y: screenH * 0.62, r: screenH * 0.52, a: 0.24, p: 3.8 },
  ];

  for (const b of blobs) {
    const dx = Math.sin(t * 0.00042 + b.p) * 22;
    const dy = Math.cos(t * 0.00036 + b.p) * 16;
    const cx = b.x + dx;
    const cy = b.y + dy;
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, b.r);
    grad.addColorStop(0,    `rgba(20,82,112,${b.a})`);
    grad.addColorStop(0.32, `rgba(13,47,74,${b.a * 0.70})`);
    grad.addColorStop(0.68, `rgba(7,21,39,${b.a * 0.34})`);
    grad.addColorStop(1,    "rgba(0,0,0,0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, b.r, 0, TAU);
    ctx.fill();
  }

  // 4 secondary drifting wisps
  const wisps = [
    { x: screenW * 0.12, y: screenH * 0.18, r: screenW * 0.38, a: 0.18, p: 2.2 },
    { x: screenW * 0.88, y: screenH * 0.34, r: screenW * 0.36, a: 0.16, p: 0.5 },
    { x: screenW * 0.16, y: screenH * 0.78, r: screenW * 0.38, a: 0.17, p: 3.4 },
    { x: screenW * 0.86, y: screenH * 0.74, r: screenW * 0.36, a: 0.16, p: 1.8 },
  ];

  for (const w of wisps) {
    const dx = Math.sin(t * 0.00055 + w.p) * 28;
    const dy = Math.cos(t * 0.00048 + w.p) * 20;
    const cx = w.x + dx;
    const cy = w.y + dy;
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, w.r);
    grad.addColorStop(0,    `rgba(34,116,142,${w.a})`);
    grad.addColorStop(0.45, `rgba(15,55,82,${w.a * 0.48})`);
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

  // Darken the outer gas as it approaches the logical playfield. The matching
  // in-playfield blend below finishes the transition and lets ships disappear
  // into fog quickly without revealing a rectangular canvas edge.
  const seam = Math.min(190, Math.max(70, screenW * 0.16));
  if (gx > 1) {
    const leftSeam = ctx.createLinearGradient(Math.max(0, gx - seam), 0, gx, 0);
    leftSeam.addColorStop(0, "rgba(2,6,17,0)");
    leftSeam.addColorStop(0.62, "rgba(2,6,17,0.34)");
    leftSeam.addColorStop(1, "rgba(2,6,17,0.92)");
    ctx.fillStyle = leftSeam;
    ctx.fillRect(Math.max(0, gx - seam), gy, Math.min(seam, gx), gh);
  }
  if (gx + gw < screenW - 1) {
    const rightSeam = ctx.createLinearGradient(gx + gw, 0, Math.min(screenW, gx + gw + seam), 0);
    rightSeam.addColorStop(0, "rgba(2,6,17,0.92)");
    rightSeam.addColorStop(0.38, "rgba(2,6,17,0.34)");
    rightSeam.addColorStop(1, "rgba(2,6,17,0)");
    ctx.fillStyle = rightSeam;
    ctx.fillRect(gx + gw, gy, Math.min(seam, screenW - gx - gw), gh);
  }

}
function drawPlayfieldFogBlend() {
  const edge = 34;
  const pulse = 0.78 + Math.sin(state.frame * 0.008) * 0.08;
  ctx.save();
  const left = ctx.createLinearGradient(0, 0, edge, 0);
  left.addColorStop(0, `rgba(5,28,46,${0.62 * pulse})`);
  left.addColorStop(0.38, `rgba(8,37,55,${0.25 * pulse})`);
  left.addColorStop(1, "rgba(3,12,24,0)");
  ctx.fillStyle = left;
  ctx.fillRect(0, 0, edge, H);
  const right = ctx.createLinearGradient(W - edge, 0, W, 0);
  right.addColorStop(0, "rgba(3,12,24,0)");
  right.addColorStop(0.62, `rgba(8,37,55,${0.25 * pulse})`);
  right.addColorStop(1, `rgba(5,28,46,${0.62 * pulse})`);
  ctx.fillStyle = right;
  ctx.fillRect(W - edge, 0, edge, H);
  ctx.restore();
}
function drawScreenFogBlend() {
  if (offsetX < 2 || state.gameState !== "playing") return;
  const gx = offsetX;
  const gy = offsetY;
  const gw = GAME_W * scale;
  const gh = GAME_H * scale;
  const outer = Math.min(150, Math.max(70, gx * 0.42));
  const inner = 52 * scale;
  const safeTop = gy + 126 * scale;
  ctx.save();
  const left = ctx.createLinearGradient(gx - outer, 0, gx + inner, 0);
  left.addColorStop(0, "rgba(3,12,24,0)");
  left.addColorStop(0.56, "rgba(4,18,31,0.18)");
  left.addColorStop(0.74, "rgba(7,38,55,0.58)");
  left.addColorStop(1, "rgba(4,18,31,0)");
  const right = ctx.createLinearGradient(gx + gw - inner, 0, gx + gw + outer, 0);
  right.addColorStop(0, "rgba(4,18,31,0)");
  right.addColorStop(0.26, "rgba(7,38,55,0.58)");
  right.addColorStop(0.44, "rgba(4,18,31,0.18)");
  right.addColorStop(1, "rgba(3,12,24,0)");
  const drawSeams = (y, height, alpha) => {
    ctx.globalAlpha = alpha;
    ctx.fillStyle = left;
    ctx.fillRect(gx - outer, y, outer + inner, height);
    ctx.fillStyle = right;
    ctx.fillRect(gx + gw - inner, y, outer + inner, height);
  };
  const fadeHeight = Math.min(76 * scale, Math.max(0, gy + gh - safeTop));
  const slices = 8;
  for (let index = 0; index < slices; index++) {
    const y = safeTop + fadeHeight * index / slices;
    const nextY = safeTop + fadeHeight * (index + 1) / slices;
    drawSeams(y, nextY - y + 0.5, easeOutCubic((index + 1) / slices));
  }
  drawSeams(safeTop + fadeHeight, Math.max(0, gy + gh - safeTop - fadeHeight), 1);
  ctx.restore();
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
    drawPlayfieldFogBlend();
    drawControls();
    drawHUD();
  } else if (state.gameState === "start") {
    drawStartScreen();
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
