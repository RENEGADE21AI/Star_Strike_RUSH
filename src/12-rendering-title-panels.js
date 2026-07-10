function drawTitleMetaStrip(x, y, w) {
  const meta = typeof currentMetaSnapshot === "function" ? currentMetaSnapshot() : null;
  if (!meta) return;
  const chips = [
    { label: "GLORY", value: Number(meta.totalGlory || 0).toLocaleString(), color: "rgba(255,230,128,0.70)" },
    { label: "CREDITS", value: Number(meta.credits || 0).toLocaleString(), color: "rgba(120,210,255,0.70)" },
    { label: "TIER", value: String(meta.seasonTier || 1), color: "rgba(120,255,180,0.72)" }
  ];
  const gap = 6;
  const chipW = Math.max(72, Math.floor((w - gap * (chips.length - 1)) / chips.length));
  ctx.save();
  ctx.font = "900 8px 'Arial Narrow', Arial, sans-serif";
  ctx.textBaseline = "middle";
  for (let i = 0; i < chips.length; i++) {
    const chip = chips[i];
    const rx = x + i * (chipW + gap);
    ctx.fillStyle = "rgba(5,8,18,0.72)";
    ctx.fillRect(rx, y, chipW, 22);
    ctx.strokeStyle = chip.color;
    ctx.strokeRect(rx, y, chipW, 22);
    ctx.textAlign = "left";
    ctx.fillStyle = chip.color;
    ctx.fillText(chip.label, rx + 7, y + 11);
    ctx.textAlign = "right";
    ctx.fillStyle = "#fff";
    ctx.fillText(String(chip.value).slice(0, 8), rx + chipW - 7, y + 11);
  }
  ctx.restore();
}
function drawTitlePanelFrame(panel, title, accent = "rgba(120,210,255,0.58)", subtitle = "PILOT COMMAND") {
  const header = getMetaScreenHeaderRects(panel).header;
  ctx.save();
  const body = ctx.createLinearGradient(panel.x, panel.y, panel.x, panel.y + panel.h);
  body.addColorStop(0, "#11172a");
  body.addColorStop(0.18, "#080b17");
  body.addColorStop(1, "#04050d");
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.roundRect(panel.x, panel.y, panel.w, panel.h, 10);
  ctx.fill();
  const headerFill = ctx.createLinearGradient(header.x, header.y, header.x + header.w, header.y);
  headerFill.addColorStop(0, "rgba(255,255,255,0.06)");
  headerFill.addColorStop(0.42, "rgba(255,255,255,0.025)");
  headerFill.addColorStop(1, "rgba(0,0,0,0.16)");
  ctx.fillStyle = headerFill;
  ctx.beginPath();
  ctx.roundRect(header.x, header.y, header.w, header.h, 10);
  ctx.fill();
  ctx.fillStyle = accent;
  ctx.fillRect(panel.x, panel.y + 10, 4, header.h - 20);
  ctx.strokeStyle = "rgba(255,255,255,0.24)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(panel.x, panel.y, panel.w, panel.h, 10);
  ctx.stroke();
  ctx.strokeStyle = accent;
  ctx.globalAlpha = 0.72;
  ctx.beginPath();
  ctx.moveTo(panel.x + 12, header.y + header.h - 1);
  ctx.lineTo(panel.x + panel.w - 12, header.y + header.h - 1);
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.font = FONT_SMALL;
  ctx.fillStyle = "#fff";
  ctx.fillText(title, panel.x + 88, panel.y + 13);
  ctx.font = "900 8px 'Arial Narrow', Arial, sans-serif";
  ctx.fillStyle = accent;
  ctx.fillText(subtitle, panel.x + 88, panel.y + 29);
  ctx.restore();
  drawTitleMetaStrip(panel.x + 18, panel.y + 42, panel.w - 36);
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

function codexColorAlpha(color, alpha) {
  const raw = String(color || "#ffffff").trim();
  const short = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(raw);
  const full = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(raw);
  const parts = short
    ? [short[1] + short[1], short[2] + short[2], short[3] + short[3]]
    : full
      ? [full[1], full[2], full[3]]
      : null;
  if (!parts) return `rgba(255,255,255,${alpha})`;
  const [r, g, b] = parts.map((part) => parseInt(part, 16));
  return `rgba(${r},${g},${b},${alpha})`;
}

function codexGridTypes() {
  return typeof getCodexTypes === "function" ? getCodexTypes() : ["red", "orange", "purple", "phantom", "boss_standard", "boss_wraith"];
}

function codexShipScale(type, detail = false) {
  const boss = String(type || "").startsWith("boss");
  if (detail) return boss ? 0.72 : type === "carrier" ? 1.22 : (type === "repair_drone" || type === "splitter_shard") ? 1.80 : 1.62;
  if (boss) return 0.23;
  if (type === "carrier") return 0.50;
  if (type === "repair_drone" || type === "splitter_shard") return 0.70;
  return 0.60;
}

function drawCodexShipDisplay(type, x, y, scale, silhouette, meta) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.scale(1, -1);
  drawEnemyGeometry(type, { hitMix: 0, alpha: 1, silhouette, stateMode: "physical", realm: 0, phase: state.frame * 0.04 });
  ctx.restore();
  if (!silhouette && meta && meta.color) {
    ctx.save();
    ctx.strokeStyle = meta.color;
    ctx.globalAlpha = 0.18;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(x, y + 2, 28 * scale, 13 * scale, 0, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }
}

function codexCardRects(panel) {
  const types = codexGridTypes();
  const cols = types.length > 8 ? 3 : 3;
  const gap = types.length > 8 ? 6 : 12;
  const sidePad = types.length > 8 ? 16 : 36;
  const cardW = Math.floor((panel.w - sidePad * 2 - gap * (cols - 1)) / cols);
  const cardH = types.length > 8 ? 72 : 100;
  const rows = Math.ceil(types.length / cols);
  const totalW = cardW * cols + gap * (cols - 1);
  const totalH = cardH * rows + gap * (rows - 1);
  const startX = panel.x + Math.round((panel.w - totalW) / 2);
  const startY = panel.y + (types.length > 8 ? 76 : 82);
  const rects = {};
  for (let i = 0; i < types.length; i++) {
    const col = i % cols, row = Math.floor(i / cols);
    rects[types[i]] = { x: startX + col * (cardW + gap), y: startY + row * (cardH + gap), w: cardW, h: cardH };
  }
  return rects;
}
function drawCodexGrid(panel) {
  const rects = codexCardRects(panel);
  const types = codexGridTypes();
  const compact = types.length > 8;
  for (const type of types) {
    const r = rects[type];
    const meta = typeof getCodexMeta === "function" ? getCodexMeta(type) : { color: "#fff", shortName: type.toUpperCase() };
    const discovered = !!codexDiscovered[type];
    ctx.save();
    ctx.fillStyle = discovered ? "rgba(255,255,255,0.055)" : "rgba(22,24,32,0.94)";
    ctx.beginPath(); ctx.roundRect(r.x, r.y, r.w, r.h, 8); ctx.fill();
    ctx.fillStyle = discovered ? "rgba(0,0,0,0.25)" : "rgba(0,0,0,0.42)";
    ctx.beginPath(); ctx.roundRect(r.x + 6, r.y + 7, r.w - 12, compact ? 42 : 57, 6); ctx.fill();
    if (discovered) {
      const glow = ctx.createLinearGradient(r.x, r.y, r.x + r.w, r.y);
      glow.addColorStop(0, "rgba(255,255,255,0.00)");
      glow.addColorStop(0.5, codexColorAlpha(meta.color, 0.20));
      glow.addColorStop(1, "rgba(255,255,255,0.00)");
      ctx.fillStyle = glow;
      ctx.fillRect(r.x + 6, r.y + 7, r.w - 12, compact ? 42 : 57);
    }
    ctx.strokeStyle = discovered ? meta.color : "rgba(255,255,255,0.18)";
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(r.x, r.y, r.w, r.h, 8); ctx.stroke();
    drawCodexShipDisplay(type, r.x + r.w / 2, r.y + (compact ? 29 : 42), codexShipScale(type), !discovered, meta);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = FONT_TINY;
    ctx.fillStyle = discovered ? "#fff" : "rgba(255,255,255,0.35)";
    ctx.fillText(discovered ? (meta.shortName || type.toUpperCase()).slice(0, compact ? 8 : 12) : "???", r.x + r.w / 2, r.y + r.h - 16);
    ctx.font = "700 7px 'Arial Narrow', Arial, sans-serif";
    ctx.fillStyle = discovered ? "rgba(255,255,255,0.42)" : "rgba(255,255,255,0.22)";
    ctx.fillText(discovered ? String(meta.trait || "UNKNOWN THREAT").toUpperCase().slice(0, compact ? 14 : 18) : "UNDISCOVERED", r.x + r.w / 2, r.y + r.h - 6);
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
  const card = { x: panel.x + 18, y: panel.y + 78, w: panel.w - 36, h: panel.h - 94 };
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

  const artRect = { x: card.x + 12, y: card.y + 42, w: card.w - 24, h: 145 };
  ctx.fillStyle = "rgba(255,255,255,0.045)";
  ctx.beginPath(); ctx.roundRect(artRect.x, artRect.y, artRect.w, artRect.h, 10); ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.10)";
  ctx.strokeRect(artRect.x, artRect.y, artRect.w, artRect.h);
  if (meta.color) {
    ctx.strokeStyle = meta.color;
    ctx.globalAlpha = 0.22;
    ctx.beginPath(); ctx.moveTo(artRect.x + 12, artRect.y + artRect.h - 26); ctx.lineTo(artRect.x + artRect.w - 12, artRect.y + artRect.h - 26); ctx.stroke();
    ctx.globalAlpha = 1;
  }
  drawCodexShipDisplay(type, artRect.x + artRect.w / 2, artRect.y + artRect.h / 2 + 8, codexShipScale(type, true), false, meta);
  ctx.restore();

  ctx.save();
  ctx.fillStyle = "#fff";
  ctx.font = FONT_HUD;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText(String(stats.name || type).slice(0, 26), card.x + 50, card.y + 12);
  ctx.fillStyle = "rgba(255,255,255,0.76)";
  ctx.font = FONT_SMALL;
  ctx.fillStyle = meta.color || "rgba(255,255,255,0.78)";
  ctx.fillText(String(meta.trait || "Unknown threat.").slice(0, 40), card.x + 16, card.y + 206);
  ctx.fillStyle = "rgba(255,255,255,0.76)";
  ctx.fillText(`Threat: ${stats.threat.toFixed(2)}    HP: ${stats.hp}`, card.x + 16, card.y + 228);
  drawStatBar(card.x + 16, card.y + 258, "Speed", stats.speed);
  drawStatBar(card.x + 16, card.y + 280, "Aggression", stats.aggression);
  drawStatBar(card.x + 16, card.y + 302, "Fire Rate", stats.fire);
  ctx.restore();
}
function drawCodexPanel() {
  const r = getCodexRects();
  const panel = r.panel;
  drawTitlePanelFrame(panel, "CODEX", "rgba(120,255,180,0.66)", "THREAT ARCHIVE");
  drawPanelCloseButton(r.closeRect);
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
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.beginPath();
  ctx.roundRect(rect.x, rect.y, rect.w, rect.h, 7);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.34)";
  ctx.beginPath();
  ctx.roundRect(rect.x, rect.y, rect.w, rect.h, 7);
  ctx.stroke();
  ctx.fillStyle = "#fff";
  ctx.font = "900 9px 'Arial Narrow', Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("< BACK", rect.x + rect.w / 2, rect.y + rect.h / 2 + 1);
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
  drawTitlePanelFrame(panel, "ACCOUNT", "rgba(120,210,255,0.66)", "SYNC AND SETTINGS");
  drawPanelCloseButton(r.closeRect);

  ctx.save();
  const innerX = panel.x + 20;
  let y = panel.y + 76;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.font = FONT_SMALL;
  ctx.fillStyle = user ? "#78ffb4" : "rgba(255,255,255,0.70)";
  ctx.fillText(user ? `ACCOUNT: ${String(name).slice(0, 22)}` : "ACCOUNT: SIGNED OUT", innerX, y);
  y += 18;
  ctx.fillStyle = online.lastError ? "#ffb0b0" : "rgba(255,255,255,0.72)";
  ctx.fillText(String(status).slice(0, 42), innerX, y);
  y = panel.y + 198;
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

  ctx.save();
  const labels = [
    { rect: r.low, value: 300, label: "LOW" },
    { rect: r.med, value: 600, label: "MED" },
    { rect: r.high, value: 900, label: "HIGH" }
  ];
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.font = FONT_SMALL;
  ctx.fillStyle = "rgba(255,255,255,0.84)";
  ctx.fillText("SETTINGS", panel.x + 20, r.low.y - 28);
  ctx.font = FONT_TINY;
  ctx.fillStyle = "rgba(255,255,255,0.58)";
  ctx.fillText("PARTICLES", panel.x + 20, r.low.y - 13);
  for (const item of labels) {
    const active = settingMaxParticles === item.value;
    ctx.fillStyle = active ? "rgba(120,255,180,0.16)" : "rgba(255,255,255,0.07)";
    ctx.fillRect(item.rect.x, item.rect.y, item.rect.w, item.rect.h);
    ctx.strokeStyle = active ? "rgba(120,255,180,0.70)" : "rgba(255,255,255,0.20)";
    ctx.strokeRect(item.rect.x, item.rect.y, item.rect.w, item.rect.h);
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(item.label, item.rect.x + item.rect.w / 2, item.rect.y + item.rect.h / 2 + 1);
  }
  ctx.fillStyle = settingScreenShake ? "rgba(120,255,180,0.14)" : "rgba(255,255,255,0.07)";
  ctx.fillRect(r.shake.x, r.shake.y, r.shake.w, r.shake.h);
  ctx.strokeStyle = settingScreenShake ? "rgba(120,255,180,0.68)" : "rgba(255,255,255,0.20)";
  ctx.strokeRect(r.shake.x, r.shake.y, r.shake.w, r.shake.h);
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.fillText(`SHAKE: ${settingScreenShake ? "ON" : "OFF"}`, r.shake.x + r.shake.w / 2, r.shake.y + r.shake.h / 2 + 1);
  ctx.fillStyle = "rgba(255,80,80,0.12)";
  ctx.fillRect(r.reset.x, r.reset.y, r.reset.w, r.reset.h);
  ctx.strokeStyle = "rgba(255,120,120,0.58)";
  ctx.strokeRect(r.reset.x, r.reset.y, r.reset.w, r.reset.h);
  ctx.fillStyle = "#fff";
  ctx.fillText("RESET PROGRESS", r.reset.x + r.reset.w / 2, r.reset.y + r.reset.h / 2 + 1);
  ctx.restore();

  drawOnlineActionButton(r.refresh, "REFRESH ONLINE DATA", true);
}
function drawRecordsPanel() {
  const r = getRecordsRects();
  const panel = r.panel;
  const online = onlineState();
  const user = online.user || null;
  const leaderboard = Array.isArray(online.leaderboard) ? online.leaderboard : [];
  drawTitlePanelFrame(panel, "WORLD RECORDS", "rgba(120,210,255,0.66)", "GLOBAL FLIGHT LADDER");
  drawPanelCloseButton(r.closeRect);

  ctx.save();
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  let listY = panel.y + 82;
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
function drawAchievementBadgeIcon(x, y, unlocked) {
  ctx.save();
  ctx.translate(x, y);
  ctx.lineWidth = 1.5;
  if (unlocked) {
    ctx.strokeStyle = "rgba(255,230,128,0.92)";
    ctx.fillStyle = "rgba(255,210,80,0.20)";
    ctx.beginPath();
    ctx.moveTo(-6, -8); ctx.lineTo(6, -8); ctx.lineTo(4, 2); ctx.quadraticCurveTo(0, 6, -4, 2); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(-8, -5, 4, Math.PI / 2, -Math.PI / 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(8, -5, 4, -Math.PI / 2, Math.PI / 2); ctx.stroke();
    ctx.fillStyle = "rgba(255,230,128,0.85)";
    ctx.fillRect(-1.5, 5, 3, 5);
    ctx.fillRect(-7, 10, 14, 3);
  } else {
    ctx.strokeStyle = "rgba(255,255,255,0.34)";
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    ctx.beginPath(); ctx.roundRect(-7, -1, 14, 11, 3); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, -1, 5, Math.PI, 0); ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.28)";
    ctx.fillRect(-1, 3, 2, 3);
  }
  ctx.restore();
}
function drawAchievementsPanel() {
  const r = getAchievementsRects();
  const panel = r.panel;
  const online = onlineState();
  const definitions = typeof getAchievementDefinitions === "function" ? getAchievementDefinitions() : [];
  const earned = new Set((Array.isArray(online.achievements) ? online.achievements : []).map((item) => typeof item === "string" ? item : item.achievementId));
  drawTitlePanelFrame(panel, "ACHIEVEMENTS", "rgba(255,230,128,0.72)", "MILESTONE ARCHIVE");
  drawPanelCloseButton(r.closeRect);

  ctx.save();
  const total = Math.max(1, definitions.length);
  let y = panel.y + 82;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.font = FONT_SMALL;
  ctx.fillStyle = "#78ffb4";
  ctx.fillText(`${earned.size}/${definitions.length} UNLOCKED`, panel.x + 54, y + 3);
  ctx.save();
  ctx.translate(panel.x + 35, y + 10);
  drawAchievementBadgeIcon(0, 0, earned.size > 0);
  ctx.restore();
  drawMetaBar(panel.x + 20, y + 24, panel.w - 40, earned.size / total, "rgba(255,230,128,0.72)");
  y += 46;
  ctx.font = FONT_TINY;
  for (const achievement of definitions.slice(0, 16)) {
    const unlocked = earned.has(achievement.id);
    const rowX = panel.x + 20;
    const rowW = panel.w - 40;
    const rowH = 22;
    const fill = ctx.createLinearGradient(rowX, y - 2, rowX + rowW, y - 2);
    fill.addColorStop(0, unlocked ? "rgba(255,230,128,0.14)" : "rgba(255,255,255,0.045)");
    fill.addColorStop(1, unlocked ? "rgba(120,255,180,0.07)" : "rgba(255,255,255,0.025)");
    ctx.fillStyle = fill;
    ctx.fillRect(rowX, y - 2, rowW, rowH);
    ctx.strokeStyle = unlocked ? "rgba(120,255,180,0.36)" : "rgba(255,255,255,0.10)";
    ctx.strokeRect(rowX, y - 2, rowW, rowH);
    ctx.fillStyle = unlocked ? "rgba(255,230,128,0.72)" : "rgba(255,255,255,0.18)";
    ctx.fillRect(rowX, y - 2, 3, rowH);
    drawAchievementBadgeIcon(rowX + 17, y + 8, unlocked);
    ctx.fillStyle = unlocked ? "#78ffb4" : "rgba(255,255,255,0.34)";
    ctx.fillText(unlocked ? "DONE" : "LOCK", rowX + 36, y + 4);
    ctx.fillStyle = unlocked ? "#fff" : "rgba(255,255,255,0.62)";
    ctx.fillText(String(achievement.name || achievement.id).toUpperCase().slice(0, 23), rowX + 78, y + 4);
    y += 24;
  }
  if (!online.user) {
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.fillText("SIGN IN FROM ACCOUNT TO SYNC ACHIEVEMENTS.", panel.x + 20, panel.y + panel.h - 28);
  }
  ctx.restore();
}
function drawSettingsAndCodexPanels() {
  if (titlePanelAnim <= 0.02 && titlePanelTarget <= 0) return;
  ctx.save();
  const panelAlpha = clamp(titlePanelAnim, 0, 1);
  const screenEase = easeOutCubic(clamp(titleMetaScreenTransition, 0, 1));
  ctx.globalAlpha = panelAlpha;
  ctx.fillStyle = "rgba(0,0,0,0.56)";
  ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = panelAlpha * screenEase;
  ctx.translate((1 - screenEase) * 18, 0);
  if (titleSubState === "codex") drawCodexPanel();
  else if (titleSubState === "online") drawOnlinePanel();
  else if (titleSubState === "records") drawRecordsPanel();
  else if (titleSubState === "achievements") drawAchievementsPanel();
  else if (titleSubState === "progress") drawProgressPanel();
  ctx.restore();
}
