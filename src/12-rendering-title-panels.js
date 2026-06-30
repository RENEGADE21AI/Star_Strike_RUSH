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
  ctx.fillText("X", r.closeRect.x + r.closeRect.w / 2, r.closeRect.y + r.closeRect.h / 2);
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
  const types = typeof getCodexTypes === "function" ? getCodexTypes() : ["red", "orange", "purple", "phantom", "boss_standard", "boss_wraith"];
  const cols = types.length > 8 ? 4 : 3;
  const cardW = types.length > 8 ? 66 : 80;
  const cardH = types.length > 8 ? 76 : 100;
  const gap = types.length > 8 ? 8 : 12;
  const rows = Math.ceil(types.length / cols);
  const totalW = cardW * cols + gap * (cols - 1);
  const totalH = cardH * rows + gap * (rows - 1);
  const startX = panel.x + Math.round((panel.w - totalW) / 2);
  const startY = panel.y + 52;
  const rects = {};
  for (let i = 0; i < types.length; i++) {
    const col = i % cols, row = Math.floor(i / cols);
    rects[types[i]] = { x: startX + col * (cardW + gap), y: startY + row * (cardH + gap), w: cardW, h: cardH };
  }
  return rects;
}
function drawCodexGrid(panel) {
  const rects = codexCardRects(panel);
  const types = typeof getCodexTypes === "function" ? getCodexTypes() : ["red", "orange", "purple", "phantom", "boss_standard", "boss_wraith"];
  for (const type of types) {
    const r = rects[type];
    const meta = typeof getCodexMeta === "function" ? getCodexMeta(type) : { color: "#fff", shortName: type.toUpperCase() };
    const discovered = !!codexDiscovered[type];
    ctx.save();
    ctx.fillStyle = discovered ? "rgba(255,255,255,0.06)" : "rgba(30,30,30,0.92)";
    ctx.beginPath(); ctx.roundRect(r.x, r.y, r.w, r.h, 8); ctx.fill();
    ctx.strokeStyle = discovered ? meta.color : "rgba(255,255,255,0.18)";
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(r.x, r.y, r.w, r.h, 8); ctx.stroke();
    ctx.save();
    ctx.translate(r.x + r.w / 2, r.y + 42);
    if (discovered) {
      drawEncounterShipGraphic(type, { scale: type.startsWith("boss") ? 0.25 : 0.34, silhouette: false, stateMode: "physical", realm: 0 });
    } else {
      drawEncounterShipGraphic(type, { scale: type.startsWith("boss") ? 0.25 : 0.34, silhouette: true, stateMode: "physical", realm: 0 });
    }
    ctx.restore();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = FONT_TINY;
    ctx.fillStyle = discovered ? "#fff" : "rgba(255,255,255,0.35)";
    ctx.fillText(discovered ? (meta.shortName || type.toUpperCase()) : "???", r.x + r.w / 2, r.y + r.h - 13);
    if (discovered) {
      ctx.fillStyle = meta.color;
      ctx.beginPath(); ctx.arc(r.x + r.w - 10, r.y + 10, 3, 0, TAU); ctx.fill();
    } else {
      drawCodexSilhouetteLockIcon(r.x + r.w - 10, r.y + 6);
    }
    ctx.restore();
  }
}
function codexTypeStats(type) {
  if (typeof getCodexMeta === "function") return getCodexMeta(type);
  const data = ENEMY_DATA[type] || ENEMY_DATA.red;
  return { speed: 2, aggression: 2, fire: 1, hp: data.hp, threat: data.threat, name: String(type || "ENEMY").toUpperCase() };
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
  const meta = typeof getCodexMeta === "function" ? getCodexMeta(type) : { color: "#fff" };
  const card = { x: panel.x + 18, y: panel.y + 46, w: panel.w - 36, h: panel.h - 62 };
  ctx.save();
  ctx.fillStyle = "rgba(0,0,8,0.93)";
  ctx.beginPath(); ctx.roundRect(card.x, card.y, card.w, card.h, 10); ctx.fill();
  ctx.strokeStyle = meta.color || "#fff";
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
  ctx.fillText("<", backRect.x + backRect.w / 2, backRect.y + backRect.h / 2 + 1);

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
  ctx.fillText("X", closeRect.x + closeRect.w / 2, closeRect.y + closeRect.h / 2);
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

function onlineState() {
  const svc = window.starStrikeOnline;
  if (!svc || typeof svc.getState !== "function") {
    return {
      ready: false,
      user: null,
      leaderboard: [],
      achievements: [],
      lastStatus: "Firebase is still connecting.",
      lastError: ""
    };
  }
  return svc.getState() || {};
}
function drawOnlineActionButton(rect, label, active = true) {
  ctx.save();
  ctx.fillStyle = active ? "rgba(120,255,180,0.14)" : "rgba(255,255,255,0.06)";
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.strokeStyle = active ? "rgba(120,255,180,0.55)" : "rgba(255,255,255,0.18)";
  ctx.lineWidth = 2;
  ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
  ctx.fillStyle = active ? "#fff" : "rgba(255,255,255,0.45)";
  ctx.font = FONT_BUTTON;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, rect.x + rect.w / 2, rect.y + rect.h / 2 + 1);
  ctx.restore();
}
function drawPanelCloseButton(rect) {
  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,0.10)";
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
  ctx.fillStyle = "#fff";
  ctx.font = FONT_HUD;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("X", rect.x + rect.w / 2, rect.y + rect.h / 2);
  ctx.restore();
}
function drawMetaBar(x, y, w, ratio, color) {
  const fillW = Math.max(0, Math.min(w, w * clamp(ratio, 0, 1)));
  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,0.09)";
  ctx.fillRect(x, y, w, 8);
  ctx.fillStyle = color;
  ctx.fillRect(x, y, fillW, 8);
  ctx.strokeStyle = "rgba(255,255,255,0.22)";
  ctx.strokeRect(x, y, w, 8);
  ctx.restore();
}
function drawOnlinePanel() {
  const r = getOnlineRects();
  const panel = r.panel;
  const online = onlineState();
  const user = online.user || null;
  const name = user ? (online.profileCallSign || user.displayName || callSign || "PILOT") : "SIGNED OUT";
  const status = online.lastError || online.lastStatus || (user ? "Runs sync at game over." : "Sign in to sync records.");
  const meta = typeof currentMetaSnapshot === "function" ? currentMetaSnapshot() : null;
  drawTitlePanelFrame(panel, "ACCOUNT");
  drawPanelCloseButton(r.closeRect);

  ctx.save();
  const innerX = panel.x + 20;
  let y = panel.y + 48;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.font = FONT_SMALL;
  ctx.fillStyle = user ? "#78ffb4" : "rgba(255,255,255,0.70)";
  ctx.fillText(user ? `ACCOUNT: ${String(name).slice(0, 22)}` : "ACCOUNT: SIGNED OUT", innerX, y);
  y += 18;
  ctx.fillStyle = online.lastError ? "#ffb0b0" : "rgba(255,255,255,0.72)";
  ctx.fillText(String(status).slice(0, 42), innerX, y);
  y = panel.y + 188;
  if (meta) {
    ctx.font = FONT_HUD;
    ctx.fillStyle = "rgba(255,230,128,0.88)";
    ctx.fillText(meta.gloryRank.toUpperCase(), innerX, y);
    y += 22;
    ctx.font = FONT_TINY;
    ctx.fillStyle = "rgba(255,255,255,0.66)";
    ctx.fillText(`GLORY ${Number(meta.totalGlory || 0).toLocaleString()}  |  TIER ${meta.seasonTier || 1}`, innerX, y);
    y += 18;
    ctx.fillText(`CREDITS ${Number(meta.credits || 0).toLocaleString()}  |  BEST ${Number((meta.lifetime && meta.lifetime.bestScore) || highScore || 0).toLocaleString()}`, innerX, y);
  }
  ctx.restore();

  drawOnlineActionButton(r.signIn, user ? "SYNC PROFILE" : "SIGN IN WITH GOOGLE", true);
  drawOnlineActionButton(r.signOut, "SIGN OUT", !!user);
  drawOnlineActionButton(r.refresh, "REFRESH ONLINE DATA", true);
}
function drawRecordsPanel() {
  const r = getRecordsRects();
  const panel = r.panel;
  const online = onlineState();
  const user = online.user || null;
  const leaderboard = Array.isArray(online.leaderboard) ? online.leaderboard : [];
  drawTitlePanelFrame(panel, "WORLD RECORDS");
  drawPanelCloseButton(r.closeRect);

  ctx.save();
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  let listY = panel.y + 54;
  ctx.font = FONT_SMALL;
  ctx.fillStyle = "rgba(255,255,255,0.70)";
  ctx.fillText(user ? "GLOBAL BEST-SCORE LADDER" : "SIGN IN TO LOAD GLOBAL SCORES", panel.x + 20, listY);
  listY += 30;
  ctx.font = FONT_TINY;
  if (leaderboard.length) {
    leaderboard.slice(0, 10).forEach((row, index) => {
      const who = String(row.callSign || row.displayName || "PILOT").slice(0, 12);
      const score = Number(row.bestScore || 0).toLocaleString();
      const rank = row.gloryRank ? ` ${String(row.gloryRank).slice(0, 14)}` : "";
      ctx.fillStyle = index === 0 ? "#ffe680" : "rgba(255,255,255,0.82)";
      ctx.fillText(`${index + 1}. ${who}${rank}`, panel.x + 22, listY);
      ctx.textAlign = "right";
      ctx.fillText(score, panel.x + panel.w - 22, listY);
      ctx.textAlign = "left";
      listY += 17;
    });
  } else {
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.fillText(user ? "No synced records yet." : "Use the account chip to sign in.", panel.x + 22, listY);
  }
  ctx.restore();

  drawOnlineActionButton(r.refresh, "REFRESH RECORDS", true);
}
function drawAchievementsPanel() {
  const r = getAchievementsRects();
  const panel = r.panel;
  const online = onlineState();
  const definitions = typeof getAchievementDefinitions === "function" ? getAchievementDefinitions() : [];
  const earned = new Set((Array.isArray(online.achievements) ? online.achievements : []).map((item) => typeof item === "string" ? item : item.achievementId));
  drawTitlePanelFrame(panel, "ACHIEVEMENTS");
  drawPanelCloseButton(r.closeRect);

  ctx.save();
  const total = Math.max(1, definitions.length);
  let y = panel.y + 50;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.font = FONT_SMALL;
  ctx.fillStyle = "#78ffb4";
  ctx.fillText(`${earned.size}/${definitions.length} UNLOCKED`, panel.x + 20, y);
  drawMetaBar(panel.x + 20, y + 20, panel.w - 40, earned.size / total, "rgba(120,255,180,0.68)");
  y += 42;
  ctx.font = FONT_TINY;
  for (const achievement of definitions.slice(0, 12)) {
    const unlocked = earned.has(achievement.id);
    ctx.fillStyle = unlocked ? "rgba(120,255,180,0.13)" : "rgba(255,255,255,0.05)";
    ctx.fillRect(panel.x + 20, y - 3, panel.w - 40, 23);
    ctx.strokeStyle = unlocked ? "rgba(120,255,180,0.36)" : "rgba(255,255,255,0.10)";
    ctx.strokeRect(panel.x + 20, y - 3, panel.w - 40, 23);
    ctx.fillStyle = unlocked ? "#78ffb4" : "rgba(255,255,255,0.34)";
    ctx.fillText(unlocked ? "UNLOCKED" : "LOCKED", panel.x + 28, y + 3);
    ctx.fillStyle = unlocked ? "#fff" : "rgba(255,255,255,0.62)";
    ctx.fillText(String(achievement.name || achievement.id).toUpperCase().slice(0, 22), panel.x + 88, y + 3);
    y += 26;
  }
  if (!online.user) {
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.fillText("SIGN IN FROM ACCOUNT TO SYNC BADGES.", panel.x + 20, panel.y + panel.h - 28);
  }
  ctx.restore();
}
function drawProgressPanel() {
  const r = getProgressRects();
  const panel = r.panel;
  const meta = typeof currentMetaSnapshot === "function" ? currentMetaSnapshot() : null;
  drawTitlePanelFrame(panel, "PROGRESS ROAD");
  drawPanelCloseButton(r.closeRect);
  drawOnlineActionButton(r.gloryTab, "GLORY ROAD", titleProgressTab === "glory");
  drawOnlineActionButton(r.seasonTab, "SEASON ROAD", titleProgressTab === "season");

  ctx.save();
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  let y = panel.y + 102;
  if (!meta) {
    ctx.fillStyle = "rgba(255,255,255,0.62)";
    ctx.font = FONT_SMALL;
    ctx.fillText("Progress is still loading.", panel.x + 20, y);
    ctx.restore();
    return;
  }
  if (titleProgressTab === "glory") {
    ctx.font = FONT_HUD;
    ctx.fillStyle = "#ffe680";
    ctx.fillText(meta.gloryRank.toUpperCase(), panel.x + 20, y);
    y += 24;
    ctx.font = FONT_TINY;
    ctx.fillStyle = "rgba(255,255,255,0.72)";
    const next = meta.nextGloryRank ? `NEXT: ${meta.nextGloryRank.toUpperCase()} AT ${Number(meta.nextGloryThreshold || 0).toLocaleString()}` : "MAX RANK REACHED";
    ctx.fillText(`GLORY ${Number(meta.totalGlory || 0).toLocaleString()}  |  ${next}`, panel.x + 20, y);
    drawMetaBar(panel.x + 20, y + 20, panel.w - 40, meta.rankProgress || 0, "rgba(255,230,128,0.70)");
    y += 48;
    const currentIndex = Math.max(0, Math.floor(meta.gloryRankIndex || 0));
    const start = Math.max(0, currentIndex - 2);
    const ranks = GLORY_RANKS.slice(start, start + 6);
    ranks.forEach((rank, idx) => {
      const actualIndex = start + idx;
      const active = actualIndex === currentIndex;
      const reached = actualIndex <= currentIndex;
      ctx.fillStyle = active ? "rgba(255,230,128,0.16)" : reached ? "rgba(120,255,180,0.09)" : "rgba(255,255,255,0.05)";
      ctx.fillRect(panel.x + 20, y - 3, panel.w - 40, 24);
      ctx.strokeStyle = active ? "rgba(255,230,128,0.52)" : "rgba(255,255,255,0.10)";
      ctx.strokeRect(panel.x + 20, y - 3, panel.w - 40, 24);
      ctx.fillStyle = reached ? "#fff" : "rgba(255,255,255,0.48)";
      ctx.fillText(`${Number(rank.threshold).toLocaleString()}  ${rank.name.toUpperCase()}`, panel.x + 30, y + 4);
      y += 28;
    });
  } else {
    const tierXP = Math.max(0, Math.floor(meta.seasonXP || 0));
    const tierBase = (Math.max(1, meta.seasonTier || 1) - 1) * SEASON_TIER_XP;
    const tierProgress = (tierXP - tierBase) / SEASON_TIER_XP;
    ctx.font = FONT_HUD;
    ctx.fillStyle = "#78ffb4";
    ctx.fillText(`${String(meta.seasonName || CURRENT_SEASON_NAME).toUpperCase()} - TIER ${meta.seasonTier || 1}`, panel.x + 20, y);
    y += 24;
    ctx.font = FONT_TINY;
    ctx.fillStyle = "rgba(255,255,255,0.72)";
    ctx.fillText(`SEASON XP ${Number(tierXP).toLocaleString()}  |  NEXT TIER IN ${Number(Math.max(0, SEASON_TIER_XP - (tierXP - tierBase))).toLocaleString()} XP`, panel.x + 20, y);
    drawMetaBar(panel.x + 20, y + 20, panel.w - 40, tierProgress, "rgba(120,255,180,0.70)");
    y += 48;
    const startTier = clamp((meta.seasonTier || 1) - 2, 1, 44);
    for (let i = 0; i < 7; i++) {
      const tier = startTier + i;
      const reached = tier <= (meta.seasonTier || 1);
      const active = tier === (meta.seasonTier || 1);
      ctx.fillStyle = active ? "rgba(120,255,180,0.16)" : reached ? "rgba(120,210,255,0.08)" : "rgba(255,255,255,0.05)";
      ctx.fillRect(panel.x + 20, y - 3, panel.w - 40, 24);
      ctx.strokeStyle = active ? "rgba(120,255,180,0.52)" : "rgba(255,255,255,0.10)";
      ctx.strokeRect(panel.x + 20, y - 3, panel.w - 40, 24);
      ctx.fillStyle = reached ? "#fff" : "rgba(255,255,255,0.48)";
      ctx.fillText(`TIER ${tier}  ${reached ? "REACHED" : "LOCKED"}  |  REWARDS LATER`, panel.x + 30, y + 4);
      y += 28;
    }
  }
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
  else if (titleSubState === "online") drawOnlinePanel();
  else if (titleSubState === "records") drawRecordsPanel();
  else if (titleSubState === "achievements") drawAchievementsPanel();
  else if (titleSubState === "progress") drawProgressPanel();
  ctx.restore();
}
