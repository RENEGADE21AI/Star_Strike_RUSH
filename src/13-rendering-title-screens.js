function drawTitleAndButtons() {
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const titleCenterY = H * 0.105;
  ctx.translate(W / 2, titleCenterY);
  ctx.transform(1, 0, -0.09, 1, 0, 0);
  ctx.shadowColor = "rgba(100,220,255,0.55)";
  ctx.shadowBlur = 16;
  ctx.lineWidth = 4;
  ctx.strokeStyle = "rgba(0,0,0,0.72)";
  ctx.font = "900 68px Impact, Haettenschweiler, 'Arial Narrow Bold', sans-serif";
  const name = "STAR STRIKE";
  const nameMeasure = ctx.measureText(name);
  const nameTargetWidth = Math.min(W - 20, Math.max(W * 0.88, nameMeasure.width));
  const nameFit = nameTargetWidth / Math.max(1, nameMeasure.width);
  ctx.save();
  ctx.scale(nameFit, nameFit);
  ctx.fillStyle = "#fff";
  ctx.strokeText(name, 0, 0);
  ctx.fillText(name, 0, 0);
  ctx.restore();
  ctx.font = "900 88px Impact, Haettenschweiler, 'Arial Narrow Bold', sans-serif";
  const rush = "RUSH";
  const rushMeasure = ctx.measureText(rush);
  const rushTargetWidth = Math.min(W - 34, Math.max(W * 0.66, rushMeasure.width));
  const rushFit = rushTargetWidth / Math.max(1, rushMeasure.width);
  const rushOffsetY = 96;
  ctx.save();
  ctx.translate(0, rushOffsetY);
  ctx.scale(rushFit, rushFit);
  ctx.shadowColor = "rgba(255,150,70,0.65)";
  ctx.fillStyle = "#ffbd5b";
  ctx.strokeText(rush, 0, 0);
  ctx.fillText(rush, 0, 0);
  ctx.restore();
  ctx.restore();
  const nameAscent = Number(nameMeasure.actualBoundingBoxAscent || 48) * nameFit;
  const nameDescent = Number(nameMeasure.actualBoundingBoxDescent || 12) * nameFit;
  const rushAscent = Number(rushMeasure.actualBoundingBoxAscent || 62) * rushFit;
  const rushDescent = Number(rushMeasure.actualBoundingBoxDescent || 16) * rushFit;
  const nameBounds = {
    x: (W - nameTargetWidth) / 2,
    y: titleCenterY - nameAscent,
    w: nameTargetWidth,
    h: nameAscent + nameDescent
  };
  const rushBounds = {
    x: (W - rushTargetWidth) / 2,
    y: titleCenterY + rushOffsetY - rushAscent,
    w: rushTargetWidth,
    h: rushAscent + rushDescent
  };
  const titleLogicalBounds = {
    x: (W - nameTargetWidth) / 2,
    y: Math.min(nameBounds.y, rushBounds.y),
    w: nameTargetWidth,
    h: Math.max(nameBounds.y + nameBounds.h, rushBounds.y + rushBounds.h) - Math.min(nameBounds.y, rushBounds.y)
  };
  state.titleMetrics = {
    logicalBounds: titleLogicalBounds,
    screenBounds: {
      x: offsetX + titleLogicalBounds.x * scale,
      y: offsetY + titleLogicalBounds.y * scale,
      w: titleLogicalBounds.w * scale,
      h: titleLogicalBounds.h * scale
    },
    nameWidth: nameTargetWidth,
    rushWidth: rushTargetWidth,
    nameBounds,
    rushBounds,
    lineGap: rushBounds.y - (nameBounds.y + nameBounds.h),
    playableScreenWidth: W * scale
  };

  const callRect = getCallSignRect();
  const titleOnline = window.starStrikeOnline && window.starStrikeOnline.getState
    ? window.starStrikeOnline.getState()
    : {};
  const visibleCallSign = titleOnline.user ? (titleOnline.profileCallSign || "PILOT") : callSign;
  ctx.save();
  const callFill = ctx.createLinearGradient(callRect.x, callRect.y, callRect.x + callRect.w, callRect.y + callRect.h);
  callFill.addColorStop(0, "rgba(4,15,29,0.84)");
  callFill.addColorStop(0.62, "rgba(5,8,18,0.72)");
  callFill.addColorStop(1, "rgba(30,15,19,0.64)");
  ctx.fillStyle = callFill;
  ctx.beginPath(); ctx.roundRect(callRect.x, callRect.y, callRect.w, callRect.h, 8); ctx.fill();
  ctx.strokeStyle = callSignEditing ? "rgba(255,255,255,0.75)" : "rgba(255,255,255,0.35)";
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(callRect.x, callRect.y, callRect.w, callRect.h, 8); ctx.stroke();
  ctx.fillStyle = titleOnline.user ? "#78ffb4" : "#69dcff";
  ctx.shadowColor = titleOnline.user ? "rgba(120,255,180,0.80)" : "rgba(105,220,255,0.75)";
  ctx.shadowBlur = 7;
  ctx.beginPath();
  ctx.arc(callRect.x + 12, callRect.y + callRect.h / 2, 3, 0, TAU);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.font = FONT_HUD;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  let txt;
  if (callSignEditing) {
    txt = callSignDraft + (Math.floor(callSignCursorBlink / 28) % 2 === 0 ? "|" : " ");
  } else {
    txt = visibleCallSign || "ENTER CALL SIGN";
  }
  ctx.fillStyle = visibleCallSign ? "#fff" : "rgba(255,255,255,0.30)";
  ctx.fillText(txt, callRect.x + callRect.w / 2 + 5, callRect.y + callRect.h / 2 - (titleOnline.profileHandle ? 4 : 0));
  ctx.font = "900 8px 'Arial Narrow', Arial, sans-serif";
  ctx.fillStyle = callSignSaveState === "error" ? "#ff8a8a" : callSignSaveState === "success" ? "#78ffb4" : callSignEditing ? "#78ffb4" : "rgba(255,255,255,0.48)";
  const pilotHint = callSignStatusTimer > 0 || callSignEditing ? callSignStatus : (titleOnline.profileHandle ? `@${titleOnline.profileHandle}` : "");
  if (pilotHint) ctx.fillText(pilotHint.slice(0, 34), callRect.x + callRect.w / 2, callRect.y + callRect.h - 7);
  ctx.restore();

  const iconRects = getTitleIconRects();
  const accountOnline = !!titleOnline.user;
  drawSimpleButton(iconRects.account, "", accountOnline ? "rgba(120,255,180,0.62)" : "rgba(255,255,255,0.24)");
  drawAccountIcon(iconRects.account, titleSubState === "online" && titlePanelTarget === 1);
  if (typeof onboardingAccountPulseFrames === "number" && onboardingAccountPulseFrames > 0) {
    const pulse = settingReducedMotion ? 0.55 : 0.42 + Math.sin(state.frame * 0.12) * 0.18;
    ctx.save();
    ctx.strokeStyle = `rgba(112,244,255,${pulse})`;
    ctx.lineWidth = 2;
    ctx.strokeRect(iconRects.account.x - 4, iconRects.account.y - 4, iconRects.account.w + 8, iconRects.account.h + 8);
    ctx.restore();
  }

  const playRect = getPlayButtonRect();
  drawPressButton(playRect, "PLAY", playBtnPointerDown && playBtnPointerInside, "rgba(0,180,100,0.18)");

  const dockX = iconRects.achievements.x - 8;
  const dockY = iconRects.achievements.y - 18;
  const dockW = iconRects.codex.x + iconRects.codex.w - iconRects.achievements.x + 16;
  const dockH = 82;
  ctx.save();
  const dockFill = ctx.createLinearGradient(dockX, dockY, dockX, dockY + dockH);
  dockFill.addColorStop(0, "rgba(9,16,29,0.70)");
  dockFill.addColorStop(1, "rgba(3,7,16,0.45)");
  ctx.fillStyle = dockFill;
  ctx.strokeStyle = "rgba(143,209,230,0.14)";
  ctx.beginPath();
  ctx.roundRect(dockX, dockY, dockW, dockH, 8);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = "rgba(94,224,255,0.14)";
  ctx.beginPath();
  ctx.moveTo(dockX + 12, dockY + 1);
  ctx.lineTo(dockX + dockW - 12, dockY + 1);
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
  const statusW = 218;
  const statusX = (W - statusW) / 2;
  const statusY = H * 0.705;
  const statusFill = ctx.createLinearGradient(statusX, statusY, statusX + statusW, statusY);
  statusFill.addColorStop(0, "rgba(2,8,18,0)");
  statusFill.addColorStop(0.5, "rgba(8,15,28,0.68)");
  statusFill.addColorStop(1, "rgba(2,8,18,0)");
  ctx.fillStyle = statusFill;
  ctx.fillRect(statusX, statusY, statusW, 36);
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillStyle = "rgba(225,242,250,0.82)";
  ctx.font = FONT_SMALL;
  ctx.fillText(`DEVICE BEST  ${Number(highScore || 0).toLocaleString()}`, W / 2, statusY + 4);
  if (typeof currentMetaSnapshot === "function") {
    const meta = currentMetaSnapshot();
    const rankLine = `${meta.gloryRank.toUpperCase()}  •  SEASON TIER ${meta.seasonTier}`;
    ctx.font = FONT_TINY;
    ctx.fillStyle = "rgba(255,230,128,0.88)";
    ctx.textAlign = "center";
    ctx.fillText(rankLine, W / 2, statusY + 21);
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
  const panel = { x: 24, y: 110, w: W - 48, h: 264 };
  const meta = typeof getLastRunMeta === "function" ? getLastRunMeta() : null;
  ctx.save();
  const panelFill = ctx.createLinearGradient(panel.x, panel.y, panel.x, panel.y + panel.h);
  panelFill.addColorStop(0, "rgba(16,25,42,0.90)");
  panelFill.addColorStop(0.48, "rgba(5,10,22,0.94)");
  panelFill.addColorStop(1, "rgba(4,7,16,0.88)");
  ctx.fillStyle = panelFill;
  ctx.beginPath();
  ctx.roundRect(panel.x, panel.y, panel.w, panel.h, 12);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,116,126,0.40)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(panel.x, panel.y, panel.w, panel.h, 12);
  ctx.stroke();
  ctx.strokeStyle = "rgba(110,222,255,0.16)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(panel.x + 28, panel.y + 1);
  ctx.lineTo(panel.x + panel.w - 28, panel.y + 1);
  ctx.stroke();
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillStyle = "rgba(255,132,140,0.76)";
  ctx.font = "900 9px 'Arial Narrow', Arial, sans-serif";
  ctx.fillText("FLIGHT RECORD CLOSED", W / 2, panel.y + 18);
  ctx.fillStyle = "#fff";
  ctx.shadowColor = "rgba(255,92,104,0.36)";
  ctx.shadowBlur = 12;
  ctx.font = "900 42px Impact, Haettenschweiler, 'Arial Narrow Bold', sans-serif";
  ctx.fillText("GAME OVER", W / 2, panel.y + 34);
  ctx.shadowBlur = 0;
  ctx.fillStyle = "rgba(207,231,242,0.52)";
  ctx.font = "800 9px Arial, sans-serif";
  ctx.fillText("FINAL SCORE", W / 2, panel.y + 91);
  ctx.fillStyle = "#f3fbff";
  ctx.font = "900 34px 'Arial Narrow', Arial, sans-serif";
  ctx.fillText(Number(state.score || 0).toLocaleString(), W / 2, panel.y + 103);
  ctx.fillStyle = "rgba(203,226,238,0.68)";
  ctx.font = FONT_SMALL;
  ctx.fillText(`DEVICE BEST  ${Number(highScore || 0).toLocaleString()}`, W / 2, panel.y + 143);
  if (state.newHighScore) {
    ctx.fillStyle = "#ffe77a";
    ctx.shadowColor = "rgba(255,221,80,0.52)";
    ctx.shadowBlur = 9;
    ctx.font = "900 11px Arial, sans-serif";
    ctx.fillText("NEW DEVICE RECORD", W / 2, panel.y + 163);
    ctx.shadowBlur = 0;
  }
  if (meta) {
    const summaryY = panel.y + 194;
    const summary = [
      { label: "GLORY", value: `+${Number(meta.gloryGained || 0).toLocaleString()}`, color: "#ffe680" },
      { label: "SEASON XP", value: `+${Number(meta.seasonXPGained || 0).toLocaleString()}`, color: "#78ffb4" },
      { label: "CREDITS", value: `+${Number(meta.creditsEarned || 0).toLocaleString()}`, color: "#79efff" }
    ];
    const chipW = 86;
    const chipGap = 8;
    const startX = W / 2 - (summary.length * chipW + (summary.length - 1) * chipGap) / 2;
    summary.forEach((item, index) => {
      const x = startX + index * (chipW + chipGap);
      ctx.fillStyle = "rgba(255,255,255,0.045)";
      ctx.beginPath();
      ctx.roundRect(x, summaryY, chipW, 46, 6);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.10)";
      ctx.stroke();
      ctx.font = "800 7px Arial, sans-serif";
      ctx.fillStyle = "rgba(216,237,245,0.52)";
      ctx.fillText(item.label, x + chipW / 2, summaryY + 8);
      ctx.font = "900 13px 'Arial Narrow', Arial, sans-serif";
      ctx.fillStyle = item.color;
      ctx.fillText(item.value, x + chipW / 2, summaryY + 23);
    });
    ctx.font = "900 8px Arial, sans-serif";
    ctx.fillStyle = meta.rankUp ? "#78ffb4" : "rgba(255,255,255,0.76)";
    ctx.fillText(
      `${meta.rankUp ? "NEW RANK  " : ""}${String(meta.rankAfter || "ROOKIE PILOT").toUpperCase()}  •  SEASON TIER ${meta.seasonTier || 1}`,
      W / 2,
      panel.y + panel.h - 12
    );
  }
  ctx.restore();
  drawPressButton(buttons.respawn, "RESPAWN", respawnPointerDown && respawnPointerInside, "rgba(255,255,255,0.08)", "rgba(255,255,255,0.58)");
  drawSimpleButton(buttons.road, "VIEW ROAD", "rgba(120,255,180,0.58)");
  drawSimpleButton(buttons.title, "TITLE SCREEN");
}

