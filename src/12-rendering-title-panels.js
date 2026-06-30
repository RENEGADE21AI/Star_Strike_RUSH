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
function formatRoadNumber(value) {
  const n = Math.max(0, Math.floor(Number(value) || 0));
  if (n >= 1000000) return `${(n / 1000000).toFixed(1).replace(".0", "")}M`;
  if (n >= 10000) return `${Math.round(n / 1000)}K`;
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(".0", "")}K`;
  return String(n);
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
function makeGloryRoadNodes() {
  const nodes = [];
  for (let i = 0; i < GLORY_RANKS.length; i++) {
    const rank = GLORY_RANKS[i];
    nodes.push({
      type: "rank",
      label: String(rank.name || "Rank").toUpperCase(),
      sub: `${formatRoadNumber(rank.threshold)} GLORY`,
      threshold: rank.threshold,
      major: i === 0 || i === GLORY_RANKS.length - 1 || i % 2 === 0
    });
    const next = GLORY_RANKS[i + 1];
    if (next) {
      const midway = Math.floor(rank.threshold + (next.threshold - rank.threshold) * 0.5);
      nodes.push({
        type: "checkpoint",
        label: `${formatRoadNumber(midway)} GLORY`,
        sub: "ROUTE CHECKPOINT",
        threshold: midway,
        major: false
      });
    }
  }
  return nodes;
}
function drawProgressSummary(panel, meta) {
  const x = panel.x + 20;
  const y = panel.y + 92;
  const w = panel.w - 40;
  const isSeason = titleProgressTab === "season";
  ctx.save();
  ctx.fillStyle = "rgba(8,10,22,0.92)";
  ctx.fillRect(x, y, w, 38);
  ctx.fillStyle = isSeason ? "rgba(35,255,170,0.09)" : "rgba(255,230,128,0.10)";
  ctx.fillRect(x, y, w, 38);
  ctx.strokeStyle = isSeason ? "rgba(120,255,180,0.28)" : "rgba(255,230,128,0.30)";
  ctx.strokeRect(x, y, w, 38);
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  if (isSeason) {
    const tierXP = Math.max(0, Math.floor(meta.seasonXP || 0));
    const tier = Math.max(1, Math.floor(meta.seasonTier || 1));
    const tierBase = (tier - 1) * SEASON_TIER_XP;
    const inTier = clamp(tierXP - tierBase, 0, SEASON_TIER_XP);
    ctx.font = FONT_SMALL;
    ctx.fillStyle = "#78ffb4";
    ctx.fillText(`${String(meta.seasonName || CURRENT_SEASON_NAME).toUpperCase()}  TIER ${tier}`, x + 9, y + 6);
    ctx.font = FONT_TINY;
    ctx.fillStyle = "rgba(255,255,255,0.68)";
    ctx.fillText(`${Number(tierXP).toLocaleString()} XP  |  ${Number(SEASON_TIER_XP - inTier).toLocaleString()} TO NEXT`, x + 9, y + 22);
    drawMetaBar(x + w - 96, y + 15, 82, inTier / SEASON_TIER_XP, "rgba(120,255,180,0.72)");
  } else {
    const next = meta.nextGloryRank ? `NEXT ${formatRoadNumber(meta.nextGloryThreshold)} ${String(meta.nextGloryRank).toUpperCase()}` : "MAX RANK";
    ctx.font = FONT_SMALL;
    ctx.fillStyle = "#ffe680";
    ctx.fillText(String(meta.gloryRank || "Rookie Pilot").toUpperCase(), x + 9, y + 6);
    ctx.font = FONT_TINY;
    ctx.fillStyle = "rgba(255,255,255,0.68)";
    ctx.fillText(`${Number(meta.totalGlory || 0).toLocaleString()} GLORY  |  ${next}`.slice(0, 42), x + 9, y + 22);
    drawMetaBar(x + w - 96, y + 15, 82, meta.rankProgress || 0, "rgba(255,230,128,0.72)");
  }
  ctx.restore();
}
function drawRoadNodeCard(x, y, w, h, node, reached, active, color) {
  ctx.save();
  ctx.fillStyle = active ? color.fillActive : reached ? color.fillReached : "rgba(255,255,255,0.055)";
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = active ? color.strokeActive : reached ? color.strokeReached : "rgba(255,255,255,0.12)";
  ctx.lineWidth = active ? 2 : 1;
  ctx.strokeRect(x, y, w, h);
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.font = node.major ? FONT_SMALL : FONT_TINY;
  ctx.fillStyle = reached ? "#fff" : "rgba(255,255,255,0.48)";
  ctx.fillText(String(node.label).slice(0, node.major ? 17 : 15), x + 8, y + 7);
  ctx.font = FONT_TINY;
  ctx.fillStyle = active ? color.textActive : reached ? "rgba(255,255,255,0.72)" : "rgba(255,255,255,0.34)";
  ctx.fillText(String(node.sub).slice(0, 18), x + 8, y + h - 16);
  ctx.restore();
}
function drawProgressRailDot(x, y, radius, reached, active, color) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, radius + (active ? 6 : 3), 0, TAU);
  ctx.fillStyle = active ? color.glow : reached ? color.glowSoft : "rgba(255,255,255,0.05)";
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, TAU);
  ctx.fillStyle = active ? color.dotActive : reached ? color.dotReached : "rgba(30,36,54,0.96)";
  ctx.fill();
  ctx.strokeStyle = active ? color.strokeActive : reached ? color.strokeReached : "rgba(255,255,255,0.18)";
  ctx.lineWidth = active ? 2 : 1;
  ctx.stroke();
  ctx.restore();
}
function currentRoadIndexForThresholds(nodes, total) {
  let index = 0;
  for (let i = 0; i < nodes.length; i++) {
    if (total >= nodes[i].threshold) index = i;
  }
  return index;
}
function drawGloryRoadContent(rect, meta) {
  const nodes = makeGloryRoadNodes();
  const total = Math.max(0, Math.floor(meta.totalGlory || 0));
  const activeIndex = currentRoadIndexForThresholds(nodes, total);
  const roadX = Math.round(rect.x + rect.w / 2);
  const startY = rect.y + 44;
  const gap = 80;
  const endY = startY + (nodes.length - 1) * gap;
  const color = {
    fillActive: "rgba(255,230,128,0.18)",
    fillReached: "rgba(120,255,180,0.09)",
    strokeActive: "rgba(255,230,128,0.70)",
    strokeReached: "rgba(120,255,180,0.32)",
    textActive: "#ffe680",
    dotActive: "#ffe680",
    dotReached: "#78ffb4",
    glow: "rgba(255,230,128,0.22)",
    glowSoft: "rgba(120,255,180,0.11)"
  };
  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.10)";
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(roadX, startY - 34);
  ctx.lineTo(roadX, endY + 34);
  ctx.stroke();
  ctx.strokeStyle = "rgba(255,230,128,0.24)";
  ctx.lineWidth = 2;
  ctx.setLineDash([10, 8]);
  ctx.beginPath();
  ctx.moveTo(roadX, startY - 34);
  ctx.lineTo(roadX, startY + activeIndex * gap);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.font = FONT_TINY;
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.fillText("GLORY ROAD", roadX, rect.y + 8);
  nodes.forEach((node, index) => {
    const y = startY + index * gap;
    const reached = total >= node.threshold;
    const active = index === activeIndex;
    const side = index % 2 === 0 ? -1 : 1;
    const cardW = node.major ? 116 : 96;
    const cardH = node.major ? 52 : 40;
    const cardX = side < 0 ? roadX - 24 - cardW : roadX + 24;
    const cardY = y - cardH / 2;
    ctx.strokeStyle = active ? "rgba(255,230,128,0.48)" : reached ? "rgba(120,255,180,0.24)" : "rgba(255,255,255,0.10)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(roadX, y);
    ctx.lineTo(side < 0 ? cardX + cardW : cardX, y);
    ctx.stroke();
    drawProgressRailDot(roadX, y, node.major ? 12 : 8, reached, active, color);
    drawRoadNodeCard(cardX, cardY, cardW, cardH, node, reached, active, color);
  });
  ctx.restore();
}
function seasonRoadReward(tier, premium) {
  if (tier % 10 === 0) return premium ? "COSMETIC SLOT" : "MILESTONE BADGE";
  if (tier % 5 === 0) return premium ? "SHIP TRAIL" : "CREDIT CACHE";
  if (tier % 3 === 0) return premium ? "COLOR CORE" : "GLORY MARKER";
  return premium ? "BONUS SLOT" : "XP STEP";
}
function drawSeasonRewardCard(x, y, w, h, label, reached, active, premium) {
  ctx.save();
  const activeFill = premium ? "rgba(255,230,128,0.14)" : "rgba(120,255,180,0.15)";
  const reachedFill = premium ? "rgba(255,230,128,0.07)" : "rgba(120,210,255,0.08)";
  ctx.fillStyle = active ? activeFill : reached ? reachedFill : "rgba(255,255,255,0.045)";
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = active ? (premium ? "rgba(255,230,128,0.56)" : "rgba(120,255,180,0.60)") : "rgba(255,255,255,0.12)";
  ctx.strokeRect(x, y, w, h);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = FONT_TINY;
  ctx.fillStyle = active ? "#fff" : reached ? "rgba(255,255,255,0.72)" : "rgba(255,255,255,0.38)";
  ctx.fillText(String(label).slice(0, 14), x + w / 2, y + h / 2 + 1);
  ctx.restore();
}
function drawSeasonRoadContent(rect, meta) {
  const tier = Math.max(1, Math.floor(meta.seasonTier || 1));
  const roadX = Math.round(rect.x + rect.w / 2);
  const startY = rect.y + 62;
  const gap = 62;
  const tiers = 50;
  const endY = startY + (tiers - 1) * gap;
  const leftW = Math.min(106, Math.floor((rect.w - 64) / 2));
  const rightW = leftW;
  const leftX = rect.x + 8;
  const rightX = rect.x + rect.w - rightW - 8;
  const color = {
    dotActive: "#78ffb4",
    dotReached: "#78d2ff",
    strokeActive: "rgba(120,255,180,0.70)",
    strokeReached: "rgba(120,210,255,0.35)",
    glow: "rgba(120,255,180,0.22)",
    glowSoft: "rgba(120,210,255,0.11)"
  };
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.font = FONT_TINY;
  ctx.fillStyle = "rgba(255,255,255,0.48)";
  ctx.fillText("FREE", leftX + leftW / 2, rect.y + 12);
  ctx.fillText("COSMETIC", rightX + rightW / 2, rect.y + 12);
  ctx.fillStyle = "rgba(120,255,180,0.58)";
  ctx.fillText("TIER", roadX, rect.y + 12);
  ctx.strokeStyle = "rgba(255,255,255,0.10)";
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(roadX, startY - 34);
  ctx.lineTo(roadX, endY + 34);
  ctx.stroke();
  ctx.strokeStyle = "rgba(120,255,180,0.24)";
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 9]);
  ctx.beginPath();
  ctx.moveTo(roadX, startY - 34);
  ctx.lineTo(roadX, startY + (tier - 1) * gap);
  ctx.stroke();
  ctx.setLineDash([]);
  for (let i = 1; i <= tiers; i++) {
    const y = startY + (i - 1) * gap;
    const reached = i <= tier;
    const active = i === tier;
    const milestone = i % 5 === 0;
    ctx.strokeStyle = active ? "rgba(120,255,180,0.48)" : reached ? "rgba(120,210,255,0.22)" : "rgba(255,255,255,0.10)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(leftX + leftW, y);
    ctx.lineTo(rightX, y);
    ctx.stroke();
    drawProgressRailDot(roadX, y, milestone ? 11 : 8, reached, active, color);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = milestone ? FONT_SMALL : FONT_TINY;
    ctx.fillStyle = active ? "#102018" : reached ? "#051116" : "rgba(255,255,255,0.42)";
    ctx.fillText(String(i), roadX, y + 1);
    drawSeasonRewardCard(leftX, y - 19, leftW, 38, seasonRoadReward(i, false), reached, active, false);
    drawSeasonRewardCard(rightX, y - 19, rightW, 38, seasonRoadReward(i, true), reached && milestone, active && milestone, true);
  }
  ctx.restore();
}
function drawProgressScrollBar(rect, contentHeight) {
  const maxScroll = Math.max(0, contentHeight - rect.h);
  if (maxScroll <= 0) return;
  const trackX = rect.x + rect.w - 5;
  const thumbH = clamp((rect.h * rect.h) / contentHeight, 26, rect.h);
  const thumbY = rect.y + (rect.h - thumbH) * (titleProgressScroll / maxScroll);
  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.fillRect(trackX, rect.y, 3, rect.h);
  ctx.fillStyle = titleProgressTab === "season" ? "rgba(120,255,180,0.62)" : "rgba(255,230,128,0.62)";
  ctx.fillRect(trackX - 1, thumbY, 5, thumbH);
  ctx.restore();
}
function drawProgressViewportFade(rect) {
  ctx.save();
  let fade = ctx.createLinearGradient(0, rect.y, 0, rect.y + 22);
  fade.addColorStop(0, "rgba(10,10,20,0.92)");
  fade.addColorStop(1, "rgba(10,10,20,0)");
  ctx.fillStyle = fade;
  ctx.fillRect(rect.x, rect.y, rect.w, 22);
  fade = ctx.createLinearGradient(0, rect.y + rect.h - 22, 0, rect.y + rect.h);
  fade.addColorStop(0, "rgba(10,10,20,0)");
  fade.addColorStop(1, "rgba(10,10,20,0.92)");
  ctx.fillStyle = fade;
  ctx.fillRect(rect.x, rect.y + rect.h - 22, rect.w, 22);
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
  if (!meta) {
    ctx.fillStyle = "rgba(255,255,255,0.62)";
    ctx.font = FONT_SMALL;
    ctx.fillText("Progress is still loading.", panel.x + 20, panel.y + 102);
    ctx.restore();
    return;
  }

  clampTitleProgressScroll();
  drawProgressSummary(panel, meta);
  ctx.fillStyle = "rgba(7,9,20,0.90)";
  ctx.fillRect(r.contentRect.x, r.contentRect.y, r.contentRect.w, r.contentRect.h);
  ctx.strokeStyle = "rgba(255,255,255,0.14)";
  ctx.strokeRect(r.contentRect.x, r.contentRect.y, r.contentRect.w, r.contentRect.h);

  ctx.save();
  ctx.beginPath();
  ctx.rect(r.contentRect.x, r.contentRect.y, r.contentRect.w, r.contentRect.h);
  ctx.clip();
  ctx.translate(0, -titleProgressScroll);
  if (titleProgressTab === "season") drawSeasonRoadContent(r.contentRect, meta);
  else drawGloryRoadContent(r.contentRect, meta);
  ctx.restore();

  drawProgressViewportFade(r.contentRect);
  drawProgressScrollBar(r.contentRect, getProgressContentHeight());
  const maxScroll = getProgressMaxScroll();
  const atEnd = maxScroll > 0 && titleProgressScroll >= maxScroll - 2;
  ctx.font = FONT_TINY;
  ctx.fillStyle = "rgba(255,255,255,0.50)";
  ctx.textAlign = "center";
  ctx.fillText(atEnd ? "END OF ROAD" : titleProgressDragActive ? "DRAGGING ROAD" : "DRAG OR WHEEL TO SCROLL", panel.x + panel.w / 2, panel.y + panel.h - 26);
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
