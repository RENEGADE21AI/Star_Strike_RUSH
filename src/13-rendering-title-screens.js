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
  const fit = Math.min(0.55, (W - 170) / Math.max(1, total));
  ctx.scale(fit, fit);
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
    txt = callSignDraft + (Math.floor(callSignCursorBlink / 28) % 2 === 0 ? "|" : " ");
  } else {
    txt = callSign || "ENTER CALL SIGN";
  }
  ctx.fillStyle = callSign ? "#fff" : "rgba(255,255,255,0.30)";
  ctx.fillText(txt, callRect.x + callRect.w / 2, callRect.y + callRect.h / 2 + 1);
  ctx.font = "900 8px 'Arial Narrow', Arial, sans-serif";
  ctx.fillStyle = callSignSaveState === "error" ? "#ff8a8a" : callSignSaveState === "success" ? "#78ffb4" : callSignEditing ? "#78ffb4" : "rgba(255,255,255,0.48)";
  const pilotHint = callSignStatusTimer > 0 || callSignEditing ? (callSignStatus || "ENTER SAVES") : "TAP TO EDIT";
  ctx.fillText(pilotHint.slice(0, 34), callRect.x + callRect.w / 2, callRect.y + callRect.h - 7);
  ctx.restore();

  const iconRects = getTitleIconRects();
  const accountOnline = !!(window.starStrikeOnline && window.starStrikeOnline.getState && window.starStrikeOnline.getState().user);
  drawSimpleButton(iconRects.account, "", accountOnline ? "rgba(120,255,180,0.62)" : "rgba(255,255,255,0.24)");
  drawAccountIcon(iconRects.account, titleSubState === "online" && titlePanelTarget === 1);

  const playRect = getPlayButtonRect();
  drawHoldButton(playRect, "PLAY", playBtnHold, 45, "rgba(0,180,100,0.18)", 0.45, 0.90);

  const dockX = iconRects.achievements.x - 8;
  const dockY = iconRects.achievements.y - 18;
  const dockW = iconRects.codex.x + iconRects.codex.w - iconRects.achievements.x + 16;
  const dockH = 82;
  ctx.save();
  ctx.fillStyle = "rgba(5,8,18,0.44)";
  ctx.strokeStyle = "rgba(255,255,255,0.10)";
  ctx.beginPath();
  ctx.roundRect(dockX, dockY, dockW, dockH, 8);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  drawSimpleButton(iconRects.achievements, "");
  drawSimpleButton(iconRects.progress, "");
  drawSimpleButton(iconRects.records, "");
  drawSimpleButton(iconRects.codex, "");
  drawTrophyIcon(iconRects.achievements, titleSubState === "achievements" && titlePanelTarget === 1);
  drawRoadIcon(iconRects.progress, titleSubState === "progress" && titlePanelTarget === 1);
  drawRecordsIcon(iconRects.records, titleSubState === "records" && titlePanelTarget === 1);
  drawBookIcon(iconRects.codex, titleSubState === "codex" && titlePanelTarget === 1);
  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,0.80)";
  ctx.font = FONT_TINY;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText("BADGES", iconRects.achievements.x + iconRects.achievements.w / 2, iconRects.achievements.y + iconRects.achievements.h + 4);
  ctx.fillText("ROAD", iconRects.progress.x + iconRects.progress.w / 2, iconRects.progress.y + iconRects.progress.h + 4);
  ctx.fillText("RECORDS", iconRects.records.x + iconRects.records.w / 2, iconRects.records.y + iconRects.records.h + 4);
  ctx.fillText("CODEX", iconRects.codex.x + iconRects.codex.w / 2, iconRects.codex.y + iconRects.codex.h + 4);
  ctx.restore();

  ctx.save();
  ctx.fillStyle = accountOnline ? "rgba(120,255,180,0.72)" : "rgba(255,255,255,0.42)";
  ctx.font = "900 8px 'Arial Narrow', Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText("ACCOUNT", iconRects.account.x + iconRects.account.w / 2, iconRects.account.y + iconRects.account.h + 4);
  ctx.restore();

  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,0.82)";
  ctx.font = FONT_SMALL;
  const line3 = "HIGH SCORE: " + highScore;
  const w3 = ctx.measureText(line3).width;
  ctx.fillText(line3, (W - w3) / 2, H * 0.72);
  if (typeof currentMetaSnapshot === "function") {
    const meta = currentMetaSnapshot();
    const rankLine = `${meta.gloryRank.toUpperCase()}  •  SEASON TIER ${meta.seasonTier}`;
    ctx.font = FONT_TINY;
    ctx.fillStyle = "rgba(255,230,128,0.88)";
    ctx.textAlign = "center";
    ctx.fillText(rankLine, W / 2, H * 0.747);
  }
  ctx.restore();
}
function drawStartScreen() {
  drawTitleSun();
  drawMenuFlights();
  // Fade ambient traffic into the same edge fog used by gameplay before the
  // interactive title controls are drawn at full contrast.
  drawPlayfieldFogBlend();
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
  const meta = typeof getLastRunMeta === "function" ? getLastRunMeta() : null;
  if (meta) {
    let y = H * 0.505;
    ctx.font = FONT_SMALL;
    ctx.textAlign = "center";
    ctx.fillStyle = "#ffe680";
    ctx.fillText(`Glory +${Number(meta.gloryGained || 0).toLocaleString()}  Total ${Number(meta.gloryAfter || 0).toLocaleString()}`, W / 2, y);
    y += 22;
    ctx.fillStyle = meta.rankUp ? "#78ffb4" : "rgba(255,255,255,0.84)";
    ctx.fillText(`${meta.rankUp ? "NEW RANK: " : "Rank: "}${meta.rankAfter || "Rookie Pilot"}`, W / 2, y);
    y += 20;
    ctx.font = FONT_TINY;
    ctx.fillStyle = "rgba(255,255,255,0.72)";
    ctx.fillText(`Season XP +${Number(meta.seasonXPGained || 0).toLocaleString()}  |  Credits +${Number(meta.creditsEarned || 0).toLocaleString()}  |  Tier ${meta.seasonTier || 1}`, W / 2, y);
  }
  ctx.restore();
  drawHoldButton(buttons.respawn, "RESPAWN", respawnHold, 30, "rgba(255,255,255,0.08)", 0.28, 0.75);
  drawSimpleButton(buttons.road, "VIEW ROAD", "rgba(120,255,180,0.58)");
  drawSimpleButton(buttons.title, "TITLE SCREEN");
}

