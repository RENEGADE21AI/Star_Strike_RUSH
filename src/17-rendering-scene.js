function drawOuterFog() {
  const screenW = VIEW_W;
  const screenH = VIEW_H;
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

  // Layered edge clouds leave pockets of true black between them. Keeping the
  // masses smaller than the viewport prevents the letterbox from reading like
  // a pair of flat blue curtains.
  const blobs = [
    { x: -screenW * 0.04, y: screenH * 0.10, r: screenW * 0.44, a: 0.22, p: 0.0, c: "20,82,112" },
    { x: screenW * 1.04, y: screenH * 0.16, r: screenW * 0.40, a: 0.19, p: 1.6, c: "27,69,108" },
    { x: -screenW * 0.08, y: screenH * 0.88, r: screenW * 0.39, a: 0.17, p: 3.1, c: "22,72,103" },
    { x: screenW * 1.08, y: screenH * 0.84, r: screenW * 0.45, a: 0.20, p: 4.7, c: "15,78,105" },
    { x: screenW * 0.03, y: screenH * 0.48, r: screenH * 0.34, a: 0.16, p: 1.3, c: "30,94,114" },
    { x: screenW * 0.97, y: screenH * 0.58, r: screenH * 0.36, a: 0.16, p: 3.8, c: "27,72,118" },
  ];

  for (const b of blobs) {
    const dx = Math.sin(t * 0.00042 + b.p) * 22;
    const dy = Math.cos(t * 0.00036 + b.p) * 16;
    const cx = b.x + dx;
    const cy = b.y + dy;
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, b.r);
    grad.addColorStop(0,    `rgba(${b.c},${b.a})`);
    grad.addColorStop(0.32, `rgba(${b.c},${b.a * 0.62})`);
    grad.addColorStop(0.68, `rgba(7,21,39,${b.a * 0.34})`);
    grad.addColorStop(1,    "rgba(0,0,0,0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, b.r, 0, TAU);
    ctx.fill();
  }

  // Secondary wisps create irregular depth without adding a hard border.
  const wisps = [
    { x: screenW * 0.08, y: screenH * 0.23, r: screenW * 0.24, a: 0.14, p: 2.2 },
    { x: screenW * 0.92, y: screenH * 0.37, r: screenW * 0.22, a: 0.12, p: 0.5 },
    { x: screenW * 0.12, y: screenH * 0.76, r: screenW * 0.23, a: 0.13, p: 3.4 },
    { x: screenW * 0.90, y: screenH * 0.75, r: screenW * 0.24, a: 0.12, p: 1.8 },
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
    leftSeam.addColorStop(1, "rgba(2,6,17,0.98)");
    ctx.fillStyle = leftSeam;
    ctx.fillRect(Math.max(0, gx - seam), gy, Math.min(seam, gx), gh);
  }
  if (gx + gw < screenW - 1) {
    const rightSeam = ctx.createLinearGradient(gx + gw, 0, Math.min(screenW, gx + gw + seam), 0);
    rightSeam.addColorStop(0, "rgba(2,6,17,0.98)");
    rightSeam.addColorStop(0.38, "rgba(2,6,17,0.34)");
    rightSeam.addColorStop(1, "rgba(2,6,17,0)");
    ctx.fillStyle = rightSeam;
    ctx.fillRect(gx + gw, gy, Math.min(seam, screenW - gx - gw), gh);
  }

}
function drawPlayfieldFogBlend() {
  const edge = 48;
  const pulse = 0.78 + Math.sin(state.frame * 0.008) * 0.08;
  ctx.save();
  const left = ctx.createLinearGradient(0, 0, edge, 0);
  left.addColorStop(0, `rgba(2,6,17,${0.94 * pulse})`);
  left.addColorStop(0.28, `rgba(6,28,43,${0.48 * pulse})`);
  left.addColorStop(0.65, `rgba(8,37,55,${0.18 * pulse})`);
  left.addColorStop(1, "rgba(3,12,24,0)");
  ctx.fillStyle = left;
  ctx.fillRect(0, 0, edge, H);
  const right = ctx.createLinearGradient(W - edge, 0, W, 0);
  right.addColorStop(0, "rgba(3,12,24,0)");
  right.addColorStop(0.35, `rgba(8,37,55,${0.18 * pulse})`);
  right.addColorStop(0.72, `rgba(6,28,43,${0.48 * pulse})`);
  right.addColorStop(1, `rgba(2,6,17,${0.94 * pulse})`);
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
