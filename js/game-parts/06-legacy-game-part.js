// Star Strike RUSH legacy game part 7
// Generated from js/legacyGame.js by scripts/split-legacy-game.mjs.
// Do not edit generated part files directly.

      );
    }
  }
}

function drawEncounterCard() {
  if (!encounterCard) return;
  const t = encounterCard.timer;
  const dur = encounterCard.maxTimer;
  let slideY;
  if (t < 22) slideY = -100 + easeOutCubic(t / 22) * 124;
  else if (t > dur - 30) slideY = 24 - easeOutCubic((t - (dur - 30)) / 30) * 124;
  else slideY = 24;
  const cardW = 290, cardH = 82;
  const cardX = (W - cardW) / 2, cardY = slideY;
  const typeColors = { red:"#e44", orange:"#f93", purple:"#b4f", phantom:"#0ff", boss_standard:"#6ff", boss_wraith:"#d9b6ff" };
  const borderColor = typeColors[encounterCard.type] || "#fff";
  const names = { red:"RED FIGHTER", orange:"ORANGE RAIDER", purple:"PURPLE GUARD", phantom:"PHANTOM", boss_standard:"COMMAND SHIP", boss_wraith:"WRAITH SOVEREIGN" };
  const traits = { red:"Drifts and swarms", orange:"Fast, erratic movement", purple:"Slow — charged aimed shots", phantom:"Phase-shifts between realms", boss_standard:"Heavy weapons platform", boss_wraith:"Controls reality itself" };
  ctx.save();
  ctx.fillStyle = "rgba(0,0,12,0.88)";
  ctx.beginPath(); ctx.roundRect(cardX, cardY, cardW, cardH, 8); ctx.fill();
  ctx.strokeStyle = borderColor; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(cardX, cardY, cardW, cardH, 8); ctx.stroke();
  ctx.fillStyle = borderColor;
  ctx.font = FONT_TINY;
  ctx.textAlign = "left"; ctx.textBaseline = "top";
  const blink = Math.floor(state.frame / 18) % 2 === 0 ? "●" : "○";
  const cardLabel = encounterCard.type.startsWith("boss") ? "NEW BOSS" : "NEW ENEMY";
  ctx.fillText(blink + " " + cardLabel, cardX + 80, cardY + 8);
  ctx.save();
  ctx.translate(cardX + 40, cardY + cardH / 2 + 2);
  drawEncounterShipGraphic(encounterCard.type, {
    scale: encounterCard.type.startsWith("boss") ? 0.32 : 0.55,
    silhouette: false,
    stateMode: "physical",
    realm: 0
  });
  ctx.restore();
  ctx.fillStyle = "#fff"; ctx.font = FONT_HUD;
  ctx.textAlign = "left"; ctx.textBaseline = "middle";
  ctx.fillText(names[encounterCard.type] || encounterCard.type.toUpperCase(), cardX + 80, cardY + cardH * 0.40);
  ctx.fillStyle = "rgba(255,255,255,0.58)"; ctx.font = FONT_SMALL;
  ctx.fillText(traits[encounterCard.type] || "", cardX + 80, cardY + cardH * 0.65);
  ctx.restore();
}

function drawTitlePanelFrame(panel, title) {
  ctx.save();
  ctx.fillStyle = "rgba(10,10,20,0.92)";
  ctx.beginPath();
  ctx.roundRect(panel.x, panel.y, panel.w, panel.h, 10);
  ctx.fill();
  ctx.fillStyle = "rgba(0,0,0,0.12)";
  ctx.fillRect(panel.x, panel.y, 8, panel.h);
  ctx.strokeStyle = "rgba(255,255,255,0.22)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(panel.x, panel.y, panel.w, panel.h, 10);
  ctx.stroke();
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.font = FONT_HUD;
  ctx.fillStyle = "#fff";
  ctx.fillText(title, panel.x + 18, panel.y + 14);
  ctx.restore();
}
function drawSettingsPanel() {
  const r = getSettingsRects();
  drawTitlePanelFrame(r.panel, "PERFORMANCE");
  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,0.10)";
  ctx.fillRect(r.closeRect.x, r.closeRect.y, r.closeRect.w, r.closeRect.h);
  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.strokeRect(r.closeRect.x, r.closeRect.y, r.closeRect.w, r.closeRect.h);
  ctx.fillStyle = "#fff";
  ctx.font = FONT_HUD;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("×", r.closeRect.x + r.closeRect.w / 2, r.closeRect.y + r.closeRect.h / 2);
  ctx.restore();

  const innerX = r.panel.x + 20;
  const innerY = r.panel.y + 56;
  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,0.8)";
  ctx.font = FONT_SMALL;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText("Particle Count", innerX, innerY);

  const btnY = innerY + 18;
  const btnW = 64, btnH = 28, gap = 10;
  const labels = [300, 600, 900];
  for (let i = 0; i < labels.length; i++) {
    const rect = { x: innerX + i * (btnW + gap), y: btnY, w: btnW, h: btnH };
    const active = settingMaxParticles === labels[i];
    ctx.fillStyle = active ? "rgba(120,255,180,0.16)" : "rgba(255,255,255,0.08)";
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.strokeStyle = active ? "rgba(120,255,180,0.7)" : "rgba(255,255,255,0.22)";
    ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
    ctx.fillStyle = "#fff";
    ctx.font = FONT_TINY;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(labels[i] === 300 ? "LOW" : labels[i] === 600 ? "MED" : "HIGH", rect.x + rect.w / 2, rect.y + rect.h / 2 + 1);
  }

  const shakeRect = r.shake;
  ctx.fillStyle = settingScreenShake ? "rgba(120,255,180,0.14)" : "rgba(255,255,255,0.08)";
  ctx.fillRect(shakeRect.x, shakeRect.y, shakeRect.w, shakeRect.h);
  ctx.strokeStyle = settingScreenShake ? "rgba(120,255,180,0.7)" : "rgba(255,255,255,0.22)";
  ctx.strokeRect(shakeRect.x, shakeRect.y, shakeRect.w, shakeRect.h);
  ctx.fillStyle = "#fff";
  ctx.font = FONT_TINY;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(`SHAKE: ${settingScreenShake ? "ON" : "OFF"}`, shakeRect.x + shakeRect.w / 2, shakeRect.y + shakeRect.h / 2 + 1);

  const resetRect = r.reset;
  ctx.fillStyle = "rgba(255,80,80,0.12)";
  ctx.fillRect(resetRect.x, resetRect.y, resetRect.w, resetRect.h);
  ctx.strokeStyle = "rgba(255,120,120,0.6)";
  ctx.strokeRect(resetRect.x, resetRect.y, resetRect.w, resetRect.h);
  ctx.fillStyle = "#fff";
  ctx.font = FONT_TINY;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("RESET PROGRESS", resetRect.x + resetRect.w / 2, resetRect.y + resetRect.h / 2 + 1);
  ctx.restore();
}
function drawCodexSilhouetteLockIcon(x, y) {
  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.55)";
  ctx.fillStyle = "rgba(255,255,255,0.10)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(x - 8, y, 16, 14, 3);
  ctx.fill(); ctx.stroke();
  ctx.beginPath();
  ctx.arc(x, y, 6, Math.PI, 0);
  ctx.stroke();
  ctx.restore();
}
function codexCardRects(panel) {
  const cardW = 80, cardH = 100, gap = 12;
  const totalW = cardW * 3 + gap * 2;
  const totalH = cardH * 2 + gap;
  const startX = panel.x + Math.round((panel.w - totalW) / 2);
  const startY = panel.y + 52;
  const types = ["red", "orange", "purple", "phantom", "boss_standard", "boss_wraith"];
  const rects = {};
  for (let i = 0; i < types.length; i++) {
    const col = i % 3, row = Math.floor(i / 3);
    rects[types[i]] = { x: startX + col * (cardW + gap), y: startY + row * (cardH + gap), w: cardW, h: cardH };
  }
  return rects;
}
function drawCodexGrid(panel) {
  const rects = codexCardRects(panel);
  const types = ["red", "orange", "purple", "phantom", "boss_standard", "boss_wraith"];
  const typeColors = { red:"#e44", orange:"#f93", purple:"#b4f", phantom:"#0ff", boss_standard:"#6ff", boss_wraith:"#d9b6ff" };
  const shortNames = { red:"RED", orange:"ORANGE", purple:"PURPLE", phantom:"PHANTOM", boss_standard:"CMD SHIP", boss_wraith:"WRAITH" };
  for (const type of types) {
    const r = rects[type];
    const discovered = !!codexDiscovered[type];
    ctx.save();
    ctx.fillStyle = discovered ? "rgba(255,255,255,0.06)" : "rgba(30,30,30,0.92)";
    ctx.beginPath(); ctx.roundRect(r.x, r.y, r.w, r.h, 8); ctx.fill();
    ctx.strokeStyle = discovered ? typeColors[type] : "rgba(255,255,255,0.18)";
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(r.x, r.y, r.w, r.h, 8); ctx.stroke();
    ctx.save();
    ctx.translate(r.x + r.w / 2, r.y + 42);
    if (discovered) {
      drawEncounterShipGraphic(type, { scale: type.startsWith("boss") ? 0.35 : 0.45, silhouette: false, stateMode: "physical", realm: 0 });
    } else {
      drawEncounterShipGraphic(type, { scale: type.startsWith("boss") ? 0.35 : 0.45, silhouette: true, stateMode: "physical", realm: 0 });
    }
    ctx.restore();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = FONT_TINY;
    ctx.fillStyle = discovered ? "#fff" : "rgba(255,255,255,0.35)";
    ctx.fillText(discovered ? (shortNames[type] || type.toUpperCase()) : "???", r.x + r.w / 2, r.y + 86);
    if (discovered) {
      ctx.fillStyle = typeColors[type];
      ctx.beginPath(); ctx.arc(r.x + r.w - 10, r.y + 10, 3, 0, TAU); ctx.fill();
    } else {
      drawCodexSilhouetteLockIcon(r.x + r.w - 10, r.y + 6);
    }
    ctx.restore();
  }
}
function codexTypeStats(type) {
  const statMap = {
    red: { speed: 2, aggression: 2, fire: 1, hp: ENEMY_DATA.red.hp, threat: ENEMY_DATA.red.threat, name: "RED FIGHTER" },
    orange: { speed: 4, aggression: 2, fire: 1, hp: ENEMY_DATA.orange.hp, threat: ENEMY_DATA.orange.threat, name: "ORANGE RAIDER" },
    purple: { speed: 1, aggression: 3, fire: 3, hp: ENEMY_DATA.purple.hp, threat: ENEMY_DATA.purple.threat, name: "PURPLE GUARD" },
    phantom: { speed: 2, aggression: 3, fire: 2, hp: ENEMY_DATA.phantom.hp, threat: ENEMY_DATA.phantom.threat, name: "PHANTOM" },
    boss_standard: { speed: 1, aggression: 4, fire: 4, hp: 100, threat: 4.5, name: "COMMAND SHIP" },
    boss_wraith: { speed: 2, aggression: 5, fire: 5, hp: 130, threat: 5.5, name: "WRAITH SOVEREIGN" }
  };
  return statMap[type] || statMap.red;
}
function drawStatBar(x, y, label, value, max = 5) {
  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,0.88)";
  ctx.font = FONT_TINY;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(label, x, y);
  const barX = x + 74, barY = y - 5, barW = 88, barH = 8;
  ctx.fillStyle = "rgba(255,255,255,0.10)";
  ctx.fillRect(barX, barY, barW, barH);
  ctx.fillStyle = "rgba(120,255,180,0.7)";
  ctx.fillRect(barX, barY, barW * (value / max), barH);
  ctx.strokeStyle = "rgba(255,255,255,0.22)";
  ctx.strokeRect(barX, barY, barW, barH);
  ctx.restore();
}
function drawCodexDetail(panel, type) {
  const stats = codexTypeStats(type);
  const typeColors = { red:"#e44", orange:"#f93", purple:"#b4f", phantom:"#0ff", boss_standard:"#6ff", boss_wraith:"#d9b6ff" };
  const card = { x: panel.x + 18, y: panel.y + 46, w: panel.w - 36, h: panel.h - 62 };
  ctx.save();
  ctx.fillStyle = "rgba(0,0,8,0.93)";
  ctx.beginPath(); ctx.roundRect(card.x, card.y, card.w, card.h, 10); ctx.fill();
  ctx.strokeStyle = typeColors[type] || "#fff";
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(card.x, card.y, card.w, card.h, 10); ctx.stroke();

  const backRect = { x: card.x + 10, y: card.y + 10, w: 28, h: 22 };
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.fillRect(backRect.x, backRect.y, backRect.w, backRect.h);
  ctx.strokeStyle = "rgba(255,255,255,0.28)";
  ctx.strokeRect(backRect.x, backRect.y, backRect.w, backRect.h);
  ctx.fillStyle = "#fff";
  ctx.font = FONT_HUD;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("←", backRect.x + backRect.w / 2, backRect.y + backRect.h / 2 + 1);

  ctx.translate(card.x + 44, card.y + 56);
  drawEncounterShipGraphic(type, { scale: type.startsWith("boss") ? 0.85 : 0.85, silhouette: false, stateMode: "physical", realm: 0 });
  ctx.restore();

  ctx.save();
  ctx.fillStyle = "#fff";
  ctx.font = FONT_HUD;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText(stats.name, card.x + 88, card.y + 12);
  ctx.fillStyle = "rgba(255,255,255,0.76)";
  ctx.font = FONT_SMALL;
  ctx.fillText(`Threat: ${stats.threat.toFixed(2)}`, card.x + 88, card.y + 42);
  ctx.fillText(`HP: ${stats.hp}`, card.x + 88, card.y + 60);
  drawStatBar(card.x + 88, card.y + 86, "Speed", stats.speed);
  drawStatBar(card.x + 88, card.y + 108, "Aggression", stats.aggression);
  drawStatBar(card.x + 88, card.y + 130, "Fire Rate", stats.fire);
  ctx.restore();
}
function drawCodexPanel() {
  const panel = getTitlePanelRect();
  drawTitlePanelFrame(panel, "CODEX");
  const closeRect = { x: panel.x + panel.w - 34, y: panel.y + 12, w: 22, h: 22 };
  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,0.10)";
  ctx.fillRect(closeRect.x, closeRect.y, closeRect.w, closeRect.h);
  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.strokeRect(closeRect.x, closeRect.y, closeRect.w, closeRect.h);
  ctx.fillStyle = "#fff";
  ctx.font = FONT_HUD;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("×", closeRect.x + closeRect.w / 2, closeRect.y + closeRect.h / 2);
  ctx.restore();
  if (codexDetailType) drawCodexDetail(panel, codexDetailType);
  else drawCodexGrid(panel);
}

function drawResetProgressConfirm() {
  if (!resetProgressConfirm) return;
  const r = getResetConfirmRects();
  const labelName = callSign || "User";
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.58)";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "rgba(10,10,18,0.96)";
  ctx.beginPath(); ctx.roundRect(r.box.x, r.box.y, r.box.w, r.box.h, 12); ctx.fill();
  ctx.strokeStyle = "rgba(255,100,100,0.7)";
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(r.box.x, r.box.y, r.box.w, r.box.h, 12); ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.82)";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = FONT_SMALL;
  ctx.fillText("Are you sure you want to reset your progress?", r.box.x + r.box.w / 2, r.box.y + 44);
  ctx.fillStyle = "#fff";
  ctx.font = FONT_HUD;
  ctx.fillText(labelName || "PILOT", r.box.x + r.box.w / 2, r.box.y + 72);
  ctx.font = FONT_BUTTON;
  ctx.fillStyle = "rgba(255,255,255,0.88)";
  ctx.fillRect(r.no.x, r.no.y, r.no.w, r.no.h);
  ctx.strokeStyle = "rgba(255,255,255,0.28)";
  ctx.strokeRect(r.no.x, r.no.y, r.no.w, r.no.h);
  ctx.fillStyle = "#000";
  ctx.fillText("NO", r.no.x + r.no.w / 2, r.no.y + r.no.h / 2 + 1);
  ctx.fillStyle = "rgba(255,90,90,0.94)";
  ctx.fillRect(r.yes.x, r.yes.y, r.yes.w, r.yes.h);
  ctx.strokeStyle = "rgba(255,160,160,0.55)";
  ctx.strokeRect(r.yes.x, r.yes.y, r.yes.w, r.yes.h);
  ctx.fillStyle = "#fff";
  ctx.fillText("YES", r.yes.x + r.yes.w / 2, r.yes.y + r.yes.h / 2 + 1);
  ctx.restore();
}
function drawSettingsAndCodexPanels() {
  if (titlePanelAnim <= 0.02 && titlePanelTarget <= 0) return;
  ctx.save();
  ctx.globalAlpha = clamp(titlePanelAnim, 0, 1);
  ctx.fillStyle = "rgba(0,0,0,0.30)";
  ctx.fillRect(0, 0, W, H);
  if (titleSubState === "settings") drawSettingsPanel();
  else if (titleSubState === "codex") drawCodexPanel();
  ctx.restore();
}
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
  drawGearIcon(iconRects.settings, titleSubState === "settings" && titlePanelTarget === 1);
  drawBookIcon(iconRects.codex, titleSubState === "codex" && titlePanelTarget === 1);
  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,0.80)";
  ctx.font = FONT_TINY;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText("SETTINGS", iconRects.settings.x + iconRects.settings.w / 2, iconRects.settings.y + iconRects.settings.h + 4);
  ctx.fillText("CODEX", iconRects.codex.x + iconRects.codex.w / 2, iconRects.codex.y + iconRects.codex.h + 4);
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

function drawBackground() {
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  for (const s of state.stars) ctx.fillRect(s.x, s.y, s.s, s.s);
  ctx.fillStyle = "rgba(255,255,255,0.04)";
  for (let y = 0; y < H; y += 36) ctx.fillRect(0, y, W, 1);
  if (isWraithActive()) {
    const tint = state.playerRealm === 0 ? "rgba(170,210,255,0.10)" : "rgba(125,70,200,0.16)";
    ctx.fillStyle = tint;
    ctx.fillRect(0, 0, W, H);
  }
