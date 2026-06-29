function drawTitleAndButtons() {
  ctx.save();
  ctx.translate(W / 2, H * 0.22);
  ctx.transform(1, 0, -0.13, 1, 0, 0);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const prefix = "STAR STRIKE ";
  const suffix = "RUSH";
  ctx.font = FONT_TITLE;
  const pw = ctx.measureText(prefix).width;
  const sw = ctx.measureText(suffix).width;
  const total = pw + sw;
  const startX = -total / 2;
  ctx.shadowColor = "rgba(100,220,255,0.55)";
  ctx.shadowBlur = 14;
  ctx.lineWidth = 5;
  ctx.strokeStyle = "rgba(0,0,0,0.55)";
  ctx.fillStyle = "#fff";
  ctx.strokeText(prefix, startX + pw / 2, 0);
  ctx.fillText(prefix, startX + pw / 2, 0);
  ctx.shadowColor = "rgba(255,150,70,0.65)";
  ctx.fillStyle = "#ffbd5b";
  ctx.strokeStyle = "rgba(0,0,0,0.60)";
  ctx.strokeText(suffix, startX + pw + sw / 2, 0);
  ctx.fillText(suffix, startX + pw + sw / 2, 0);
  ctx.restore();

  const callRect = getCallSignRect();
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.beginPath(); ctx.roundRect(callRect.x, callRect.y, callRect.w, callRect.h, 8); ctx.fill();
  ctx.strokeStyle = callSignEditing ? "rgba(255,255,255,0.75)" : "rgba(255,255,255,0.35)";
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(callRect.x, callRect.y, callRect.w, callRect.h, 8); ctx.stroke();
  ctx.font = FONT_HUD;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  let txt;
  if (callSignEditing) {
    txt = callSign + (Math.floor(callSignCursorBlink / 28) % 2 === 0 ? "|" : " ");
  } else {
    txt = callSign || "ENTER CALL SIGN";
  }
  ctx.fillStyle = callSign ? "#fff" : "rgba(255,255,255,0.30)";
  ctx.fillText(txt, callRect.x + callRect.w / 2, callRect.y + callRect.h / 2 + 1);
  ctx.restore();

  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.font = FONT_TINY;
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  ctx.fillText("CALL SIGN", W / 2, H * 0.355 - 20 - 4);
  ctx.restore();

  const playRect = getPlayButtonRect();
  drawHoldButton(playRect, "PLAY", playBtnHold, 45, "rgba(0,180,100,0.18)", 0.45, 0.90);

  const iconRects = getTitleIconRects();
  drawSimpleButton(iconRects.settings, "");
  drawSimpleButton(iconRects.codex, "");
  drawSimpleButton(iconRects.online, "");
  drawGearIcon(iconRects.settings, titleSubState === "settings" && titlePanelTarget === 1);
  drawBookIcon(iconRects.codex, titleSubState === "codex" && titlePanelTarget === 1);
  drawAccountIcon(iconRects.online, titleSubState === "online" && titlePanelTarget === 1);
  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,0.80)";
  ctx.font = FONT_TINY;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText("SETTINGS", iconRects.settings.x + iconRects.settings.w / 2, iconRects.settings.y + iconRects.settings.h + 4);
  ctx.fillText("CODEX", iconRects.codex.x + iconRects.codex.w / 2, iconRects.codex.y + iconRects.codex.h + 4);
  ctx.fillText("ONLINE", iconRects.online.x + iconRects.online.w / 2, iconRects.online.y + iconRects.online.h + 4);
  ctx.restore();

  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,0.82)";
  ctx.font = FONT_SMALL;
  const line3 = "HIGH SCORE: " + highScore;
  const w3 = ctx.measureText(line3).width;
  ctx.fillText(line3, (W - w3) / 2, H * 0.72);
  ctx.restore();
}
function drawStartScreen() {
  drawTitleSun();
  drawMenuFlights();
  drawTitleAndButtons();
  drawSettingsAndCodexPanels();
  drawResetProgressConfirm();
}
function drawGameOverScreen() {
  const buttons = getGameOverButtons();
  ctx.save();
  ctx.fillStyle = "#fff";
  ctx.font = FONT_HUGE;
  const title = "GAME OVER";
  const tw = ctx.measureText(title).width;
  ctx.fillText(title, (W - tw) / 2, H * 0.26);
  ctx.font = FONT_SUBTITLE;
  const scoreLine = "Score: " + state.score;
  const scoreW = ctx.measureText(scoreLine).width;
  ctx.fillText(scoreLine, (W - scoreW) / 2, H * 0.37);
  const highLine = "High Score: " + highScore;
  const highW = ctx.measureText(highLine).width;
  ctx.fillText(highLine, (W - highW) / 2, H * 0.42);
  if (state.score > previousHighScore && state.score > 0) {
    const record = "New High Score!";
    const rw = ctx.measureText(record).width;
    ctx.fillText(record, (W - rw) / 2, H * 0.47);
  }
  ctx.restore();
  drawHoldButton(buttons.respawn, "RESPAWN", respawnHold, 30, "rgba(255,255,255,0.08)", 0.28, 0.75);
  drawSimpleButton(buttons.title, "TITLE SCREEN");
}

