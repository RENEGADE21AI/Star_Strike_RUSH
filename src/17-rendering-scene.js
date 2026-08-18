function getLandscapeOrientationHintLayout(
  screenW = VIEW_W,
  screenH = VIEW_H,
  gameX = offsetX,
  gameW = GAME_W * scale
) {
  const rightEdge = gameX + gameW;
  const leftGutter = Math.max(0, gameX);
  const rightGutter = Math.max(0, screenW - rightEdge);
  const landscape = screenW / Math.max(1, screenH) >= 1.55;
  if (!landscape || screenH > 500 || Math.min(leftGutter, rightGutter) < 140) return null;
  const centerY = screenH / 2;
  return {
    gameRect: { x: gameX, y: 0, w: gameW, h: screenH },
    icon: {
      x: leftGutter / 2 - 24,
      y: centerY - 38,
      w: 48,
      h: 76
    },
    copy: {
      x: rightEdge + 22,
      y: centerY - 34,
      w: Math.max(1, rightGutter - 44),
      h: 68
    }
  };
}

function drawLandscapeOrientationHint(layout) {
  if (!layout) return;
  const icon = layout.icon;
  const copy = layout.copy;
  ctx.save();
  ctx.globalAlpha = 0.72;
  ctx.strokeStyle = "rgba(116,225,255,0.56)";
  ctx.fillStyle = "rgba(8,22,36,0.34)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(icon.x + 9, icon.y + 2, icon.w - 18, icon.h - 4, 7);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = "rgba(205,245,255,0.42)";
  ctx.beginPath();
  ctx.moveTo(icon.x + 18, icon.y + 11);
  ctx.lineTo(icon.x + icon.w - 18, icon.y + 11);
  ctx.moveTo(icon.x + 19, icon.y + icon.h - 11);
  ctx.lineTo(icon.x + icon.w - 19, icon.y + icon.h - 11);
  ctx.stroke();
  ctx.fillStyle = "rgba(122,239,255,0.72)";
  ctx.beginPath();
  ctx.arc(icon.x + icon.w / 2, icon.y + icon.h - 7, 1.8, 0, Math.PI * 2);
  ctx.fill();

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "rgba(124,231,255,0.72)";
  ctx.font = "900 10px 'Arial Narrow', Arial, sans-serif";
  ctx.fillText("PORTRAIT FLIGHT MODE", copy.x + copy.w / 2, copy.y + 15);
  ctx.fillStyle = "rgba(232,249,255,0.90)";
  ctx.font = "900 15px 'Arial Narrow', Arial, sans-serif";
  ctx.fillText("ROTATE FOR FULL VIEW", copy.x + copy.w / 2, copy.y + 38);
  ctx.strokeStyle = "rgba(116,225,255,0.28)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(copy.x + copy.w * 0.28, copy.y + 57);
  ctx.lineTo(copy.x + copy.w * 0.72, copy.y + 57);
  ctx.stroke();
  ctx.restore();
}

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
  if (gx > 1) {
    const leftDust = ctx.createRadialGradient(gx * 0.58, screenH * 0.34, 0, gx * 0.58, screenH * 0.34, Math.max(230, gx * 0.82));
    leftDust.addColorStop(0, "rgba(28,108,142,0.065)");
    leftDust.addColorStop(1, "rgba(2,7,16,0)");
    ctx.fillStyle = leftDust;
    ctx.fillRect(0, 0, gx, screenH);
    const rightDust = ctx.createRadialGradient(screenW - gx * 0.46, screenH * 0.67, 0, screenW - gx * 0.46, screenH * 0.67, Math.max(250, gx * 0.88));
    rightDust.addColorStop(0, "rgba(126,50,72,0.045)");
    rightDust.addColorStop(1, "rgba(2,7,16,0)");
    ctx.fillStyle = rightDust;
    ctx.fillRect(gx + gw, 0, Math.max(0, screenW - gx - gw), screenH);
  }
  ctx.fillStyle = "rgba(230,240,255,0.34)";
  for (let i = 0; i < 54; i++) {
    const px = ((i * 97 + 41) % 997) / 997 * screenW;
    const py = ((i * 193 + 73) % 991) / 991 * screenH;
    const size = i % 11 === 0 ? 1.3 : i % 5 === 0 ? 1 : 0.7;
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

  drawLandscapeOrientationHint(getLandscapeOrientationHintLayout(screenW, screenH, gx, gw));

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
  if (state.sceneTransition.durationSeconds) {
    return clamp(Number(state.sceneTransition.elapsedSeconds || 0) / state.sceneTransition.durationSeconds, 0, 1);
  }
  return clamp(state.sceneTransition.frame / Math.max(1, state.sceneTransition.duration), 0, 1);
}
function galaxyTransitShipAt(normalizedTime) {
  const t = clamp(Number(normalizedTime) || 0, 0, 1);
  const approach = clamp((t - 0.48) / 0.52, 0, 1);
  const eased = approach * approach * (3 - 2 * approach);
  return {
    x: W * (0.57 - eased * 0.07),
    y: H * (0.54 + eased * 0.26),
    scale: 0.28 + eased * 0.72,
    alpha: clamp(approach * 3, 0, 1)
  };
}
function drawTitleLaunchEffect() {
  if (state.sceneTransition.mode !== "title_launch") return;
  const t = sceneTransitionProgress();
  const eased = t * t * (3 - 2 * t);
  const velocity = Math.sin(Math.PI * t);
  if (!settingReducedMotion) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (let index = 0; index < 30; index++) {
      const depth = 0.34 + (index % 7) / 9;
      const x = ((index * 89 + 31) % 389) / 389 * W;
      const travel = (state.sceneTransition.elapsedSeconds * (92 + depth * 210) + index * 47) % (H + 120);
      const y = travel - 60;
      const length = 8 + velocity * (22 + depth * 54);
      ctx.globalAlpha = (settingReducedFlash ? 0.18 : 0.20 + velocity * 0.30) * depth;
      ctx.strokeStyle = index % 5 === 0 ? "#b58cff" : index % 3 === 0 ? "#63e9ff" : "#eefaff";
      ctx.lineWidth = 0.55 + depth * 0.75;
      ctx.beginPath();
      ctx.moveTo(x, y - length);
      ctx.lineTo(x, y + length * 0.28);
      ctx.stroke();
    }
    ctx.restore();
  }
  const ship = galaxyTransitShipAt(t);
  if (ship.alpha > 0) {
    if (typeof drawEnginePlume === "function") {
      drawEnginePlume(ship.x, ship.y + 17 * ship.scale, {
        scale: ship.scale * (1.1 + velocity * 0.5),
        alpha: ship.alpha,
        color: "92,238,255",
        phase: t * 12
      });
    }
    drawSpriteAsset(ctx, "player", ship.x, ship.y, {
      scale: ship.scale,
      alpha: ship.alpha,
      glowColor: "#73efff",
      glowBlur: 10 + velocity * 10
    });
  }
  const veil = ctx.createRadialGradient(ship.x, ship.y, 0, ship.x, ship.y, 170);
  veil.addColorStop(0, `rgba(104,224,255,${Math.min(settingReducedFlash ? 0.10 : 0.20, velocity * 0.18)})`);
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
function drawTutorialDepartureEffect() {
  if (state.sceneTransition.mode !== "tutorial_departure") return;
  const t = sceneTransitionProgress();
  const eased = easeOutCubic(t);
  ctx.save();
  ctx.fillStyle = `rgba(1,5,16,${Math.min(0.78, eased * 0.72)})`;
  ctx.fillRect(0, 0, W, H);
  if (!settingReducedMotion) {
    ctx.globalCompositeOperation = "lighter";
    for (let index = 0; index < 26; index++) {
      const x = ((index * 83 + 19) % 373) + 1;
      const y = ((index * 149 + state.sceneTransition.frame * (4 + index % 4)) % 760) - 48;
      ctx.globalAlpha = (settingReducedFlash ? 0.18 : 0.34) * eased;
      ctx.strokeStyle = index % 4 === 0 ? "#b98cff" : "#8ff5ff";
      ctx.lineWidth = 0.7 + (index % 3) * 0.25;
      ctx.beginPath();
      ctx.moveTo(x, y + 30 + eased * 34);
      ctx.lineTo(x, y - eased * 46);
      ctx.stroke();
    }
  }
  const shipY = state.player.y - eased * (state.player.y + 70);
  if (typeof drawEnginePlume === "function") {
    drawEnginePlume(state.player.x, shipY + 18, {
      scale: 1 + eased * 0.7,
      alpha: 1 - Math.max(0, (t - 0.78) / 0.22),
      color: "92,238,255",
      phase: t * 14
    });
  }
  drawSpriteAsset(ctx, "player", state.player.x, shipY, {
    scale: 1 - eased * 0.35,
    alpha: 1 - Math.max(0, (t - 0.78) / 0.22),
    glowColor: "#73efff",
    glowBlur: 9 + eased * 15
  });
  ctx.restore();
}
function drawTutorialReturnEffect() {
  if (state.sceneTransition.mode !== "tutorial_return") return;
  const t = sceneTransitionProgress();
  ctx.save();
  ctx.fillStyle = `rgba(1,5,16,${Math.max(0, 0.88 - t * 0.88)})`;
  ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = (1 - t) * (settingReducedFlash ? 0.10 : 0.22);
  const bloom = ctx.createRadialGradient(W / 2, H * 0.35, 0, W / 2, H * 0.35, 180);
  bloom.addColorStop(0, "rgba(116,236,255,0.8)");
  bloom.addColorStop(1, "rgba(16,48,92,0)");
  ctx.fillStyle = bloom;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}
function draw() {
  state.renderFrameFlags = { titleUi: false, onboardingGalaxy: false, galaxyTransit: false };
  ctx.setTransform(renderDpr, 0, 0, renderDpr, 0, 0);
  drawOuterFog();

  const transmissionStill = typeof tutorialTransmissionVisible === "function" && tutorialTransmissionVisible();
  const shakeOn = settingScreenShake && !transmissionStill ? 1 : 0;
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
    if (typeof drawTutorialTrainingEnvironment === "function") drawTutorialTrainingEnvironment();
    if (typeof drawExpansionHazards === "function") drawExpansionHazards();
    drawPowerups();
    drawBullets();
    drawEnemies();
    drawBossDeath();
    drawBoss();
    drawWingmen();
    if (state.sceneTransition.mode !== "tutorial_departure") drawPlayer();
    drawParticles();
    drawPlayfieldFogBlend();
    drawControls();
    drawHUD();
    if (typeof drawTutorialPresentation === "function") drawTutorialPresentation();
    if (state.gameState === "paused" || state.gameState === "resuming") drawPauseOverlay();
    drawGameArrivalEffect();
    drawTutorialDepartureEffect();
  } else if (state.gameState === "start") {
    const launchT = state.sceneTransition.mode === "title_launch" ? sceneTransitionProgress() : 0;
    const onboardingGalaxy = typeof onboardingGalaxySceneActive === "function" && onboardingGalaxySceneActive();
    ctx.save();
    // The title retracts quickly, revealing a continuous top-down galaxy
    // flyover. No perspective flip or radial wipe interrupts spatial context.
    if (state.sceneTransition.mode === "tutorial_return") {
      drawTutorialReturnEffect();
      const reveal = clamp((sceneTransitionProgress() - 0.64) / 0.36, 0, 1);
      if (reveal > 0) {
        ctx.save();
        ctx.globalAlpha = reveal;
        if (onboardingUiMode === "none") drawStartScreen();
        else if (typeof drawOnboardingTitleOverlay === "function") drawOnboardingTitleOverlay();
        ctx.restore();
      }
    } else if (onboardingGalaxy) {
      state.renderFrameFlags.onboardingGalaxy = true;
      if (typeof drawOnboardingGalaxyScene === "function") drawOnboardingGalaxyScene();
      if (typeof drawOnboardingTitleOverlay === "function") drawOnboardingTitleOverlay();
    } else if (launchT < 0.16) {
      state.renderFrameFlags.titleUi = true;
      ctx.globalAlpha = Math.max(0, 1 - launchT / 0.16);
      drawStartScreen();
      if (typeof drawOnboardingTitleOverlay === "function") drawOnboardingTitleOverlay();
    }
    ctx.restore();
    if (!onboardingGalaxy) {
      state.renderFrameFlags.galaxyTransit = state.sceneTransition.mode === "title_launch";
      drawTitleLaunchEffect();
    }
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
globalThis.galaxyTransitShipAt = galaxyTransitShipAt;
