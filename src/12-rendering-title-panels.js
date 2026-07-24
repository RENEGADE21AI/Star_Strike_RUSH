function drawTitleMetaStrip(x, y, w) {
  const meta = typeof currentMetaSnapshot === "function" ? currentMetaSnapshot() : null;
  if (!meta) return;
  const chips = [
    { label: "BEST", value: Number((meta.lifetime && meta.lifetime.bestScore) || highScore || 0).toLocaleString(), color: "rgba(92,238,255,0.72)" },
    { label: "RANK", value: String(meta.gloryRank || "ROOKIE").toUpperCase(), color: "rgba(255,230,128,0.70)" },
    { label: "SEASON", value: `T${String(meta.seasonTier || 1)}`, color: "rgba(120,255,180,0.72)" }
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
    ctx.fillText(String(chip.value).slice(0, 11), rx + chipW - 7, y + 11);
  }
  ctx.restore();
}
function drawTitlePanelFrame(panel, title, showMetaStrip = true) {
  ctx.save();
  ctx.fillStyle = "#080a14";
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
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.font = FONT_HUD;
  ctx.fillStyle = "#fff";
  ctx.fillText(title, panel.x + panel.w / 2, panel.y + 14);
  ctx.restore();
  if (showMetaStrip) drawTitleMetaStrip(panel.x + 18, panel.y + 42, panel.w - 36);
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
  const types = codexTypesForCategory(codexCategory);
  const cols = 2;
  const cardW = Math.floor((panel.w - 54) / cols);
  const cardH = 104;
  const gap = 10;
  const rows = Math.ceil(types.length / cols);
  const totalW = cardW * cols + gap * (cols - 1);
  const startX = panel.x + Math.round((panel.w - totalW) / 2);
  const startY = panel.y + 130 - codexScroll;
  const rects = {};
  for (let i = 0; i < types.length; i++) {
    const col = i % cols, row = Math.floor(i / cols);
    rects[types[i]] = { x: startX + col * (cardW + gap), y: startY + row * (cardH + gap), w: cardW, h: cardH };
  }
  return rects;
}
function codexTypesForCategory(category = codexCategory) {
  const all = typeof getCodexTypes === "function" ? getCodexTypes() : ["red", "orange", "purple", "phantom", "boss_standard", "boss_wraith"];
  return all.filter((type) => category === "bosses" ? type.startsWith("boss_") : !type.startsWith("boss_"));
}
function codexMaxScroll(panel = getTitlePanelRect()) {
  const rows = Math.ceil(codexTypesForCategory().length / 2);
  const contentHeight = rows * 104 + Math.max(0, rows - 1) * 10;
  return Math.max(0, contentHeight - (panel.h - 168));
}
function clampCodexScroll() {
  codexScroll = clamp(codexScroll, 0, codexMaxScroll());
}
function setCodexCategory(category) {
  codexCategory = category === "bosses" ? "bosses" : "enemies";
  codexScroll = 0;
  codexDetailType = null;
}
function codexTabRects(panel) {
  const tabW = Math.floor((panel.w - 48) / 2);
  return {
    enemies: { x: panel.x + 20, y: panel.y + 76, w: tabW, h: 32 },
    bosses: { x: panel.x + 28 + tabW, y: panel.y + 76, w: tabW, h: 32 },
    scrollUp: { x: panel.x + panel.w - 48, y: panel.y + panel.h - 68, w: 28, h: 24 },
    scrollDown: { x: panel.x + panel.w - 48, y: panel.y + panel.h - 38, w: 28, h: 24 }
  };
}
function drawCodexGrid(panel) {
  const rects = codexCardRects(panel);
  const types = codexTypesForCategory();
  const tabs = codexTabRects(panel);
  const all = typeof getCodexTypes === "function" ? getCodexTypes() : types;
  const discoveredCount = all.filter((type) => codexDiscovered[type]).length;
  ctx.save();
  ctx.font = FONT_TINY;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (const [category, rect] of [["enemies", tabs.enemies], ["bosses", tabs.bosses]]) {
    const active = codexCategory === category;
    ctx.fillStyle = active ? "rgba(92,238,255,0.15)" : "rgba(255,255,255,0.05)";
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.strokeStyle = active ? "rgba(92,238,255,0.72)" : "rgba(255,255,255,0.16)";
    ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
    ctx.fillStyle = active ? "#d8fbff" : "rgba(255,255,255,0.58)";
    ctx.fillText(category.toUpperCase(), rect.x + rect.w / 2, rect.y + rect.h / 2 + 1);
  }
  ctx.textAlign = "left";
  ctx.fillStyle = "rgba(255,255,255,0.48)";
  ctx.fillText(`${discoveredCount}/${all.length} DISCOVERED`, panel.x + 22, panel.y + 116);
  ctx.restore();
  ctx.save();
  ctx.beginPath();
  ctx.rect(panel.x + 14, panel.y + 128, panel.w - 28, panel.h - 142);
  ctx.clip();
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
    ctx.translate(r.x + r.w / 2, r.y + 46);
    if (discovered) {
      drawEncounterShipGraphic(type, { scale: type.startsWith("boss") ? 0.34 : 0.42, silhouette: false, stateMode: "physical", realm: 0 });
    } else {
      drawEncounterShipGraphic(type, { scale: type.startsWith("boss") ? 0.34 : 0.42, silhouette: true, stateMode: "physical", realm: 0 });
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
  ctx.restore();
  if (codexMaxScroll(panel) > 0) {
    ctx.save();
    ctx.font = FONT_SMALL;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (const [rect, label, enabled] of [[tabs.scrollUp, "▲", codexScroll > 0], [tabs.scrollDown, "▼", codexScroll < codexMaxScroll(panel)]]) {
      ctx.fillStyle = enabled ? "rgba(92,238,255,0.16)" : "rgba(255,255,255,0.04)";
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
      ctx.fillStyle = enabled ? "#d8fbff" : "rgba(255,255,255,0.24)";
      ctx.fillText(label, rect.x + rect.w / 2, rect.y + rect.h / 2);
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
function drawWrappedPanelText(text, x, y, maxWidth, lineHeight, maxLines = 3) {
  const words = String(text || "").split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth || !line) line = candidate;
    else {
      lines.push(line);
      line = word;
      if (lines.length >= maxLines) break;
    }
  }
  if (line && lines.length < maxLines) lines.push(line);
  lines.forEach((value, index) => ctx.fillText(value, x, y + index * lineHeight));
  return lines.length;
}
function codexTacticalLines(type, meta) {
  const notes = {
    red: ["Break the formation before it crowds the lower lanes.", "Low durability; movement pressure is the real threat."],
    orange: ["Watch the first lateral snap, then cross behind it.", "Erratic movement, but no armored core."],
    purple: ["The warning ring marks a charged aimed shot.", "Change lanes after the aim locks."],
    phantom: ["Only matching-realm fire can damage it.", "Read the flicker before committing to a lane."],
    siphon: ["Warning line shows restrained lead aim.", "Dodge green core; trail is harmless."],
    boss_debris_warden: ["Track the marked opening through both rows.", "DASH boosts movement but cannot phase rock."],
    boss_wraith: ["Realm Hop changes which threats can touch you.", "Match the boss realm before firing."],
    boss_standard: ["Clear lanes during the warning cycle.", "Concentrate fire between heavy volleys."]
  };
  return notes[type] || [String(meta.trait || "Study its movement and warning state."), "Keep the lower screen clear before it attacks."];
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
  const tactics = codexTacticalLines(type, meta);
  const briefY = card.y + 184;
  ctx.fillStyle = "rgba(255,255,255,0.045)";
  ctx.fillRect(card.x + 14, briefY, card.w - 28, 142);
  ctx.strokeStyle = "rgba(255,255,255,0.14)";
  ctx.strokeRect(card.x + 14, briefY, card.w - 28, 142);
  ctx.fillStyle = meta.color || "#fff";
  ctx.font = FONT_TINY;
  ctx.fillText(type.startsWith("boss") ? "BOSS TACTICAL BRIEF" : "TACTICAL BRIEF", card.x + 26, briefY + 14);
  ctx.fillStyle = "rgba(255,255,255,0.88)";
  ctx.font = FONT_SMALL;
  drawWrappedPanelText(meta.trait || "Unknown combat pattern", card.x + 26, briefY + 36, card.w - 52, 14, 2);
  ctx.fillStyle = "rgba(255,255,255,0.62)";
  ctx.font = FONT_TINY;
  drawWrappedPanelText(`1  ${tactics[0]}`, card.x + 26, briefY + 70, card.w - 52, 12, 2);
  drawWrappedPanelText(`2  ${tactics[1]}`, card.x + 26, briefY + 108, card.w - 52, 12, 2);
  ctx.restore();
}
function drawCodexPanel() {
  const r = getCodexRects();
  const panel = r.panel;
  drawTitlePanelFrame(panel, "CODEX");
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
  ctx.fillStyle = "rgba(255,255,255,0.10)";
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
  ctx.fillStyle = "#fff";
  ctx.font = "900 10px 'Arial Narrow', Arial, sans-serif";
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
function drawAccountTab(rect, label, active) {
  ctx.save();
  ctx.fillStyle = active ? "rgba(92,238,255,0.16)" : "rgba(255,255,255,0.045)";
  ctx.beginPath(); ctx.roundRect(rect.x, rect.y, rect.w, rect.h, 7); ctx.fill();
  ctx.strokeStyle = active ? "rgba(92,238,255,0.72)" : "rgba(255,255,255,0.14)";
  ctx.stroke();
  ctx.fillStyle = active ? "#d9fbff" : "rgba(255,255,255,0.58)";
  ctx.font = FONT_TINY;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, rect.x + rect.w / 2, rect.y + rect.h / 2 + 1);
  ctx.restore();
}
function drawDossierCard(rect, accent = "#5ceeff") {
  ctx.save();
  const gradient = ctx.createLinearGradient(rect.x, rect.y, rect.x + rect.w, rect.y + rect.h);
  gradient.addColorStop(0, "rgba(35,48,70,0.78)");
  gradient.addColorStop(0.52, "rgba(10,14,25,0.92)");
  gradient.addColorStop(1, "rgba(18,20,38,0.84)");
  ctx.fillStyle = gradient;
  ctx.beginPath(); ctx.roundRect(rect.x, rect.y, rect.w, rect.h, 12); ctx.fill();
  ctx.strokeStyle = accent;
  ctx.globalAlpha = 0.42;
  ctx.stroke();
  ctx.restore();
}
function drawPilotHologram(x, y) {
  ctx.save();
  ctx.translate(x, y);
  const bracketPulse = 0.46 + Math.sin(state.frame * 0.045) * 0.10;
  const glow = ctx.createRadialGradient(0, 0, 2, 0, 0, 38);
  glow.addColorStop(0, `rgba(92,238,255,${bracketPulse * 0.24})`);
  glow.addColorStop(0.46, `rgba(35,110,145,${bracketPulse * 0.10})`);
  glow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(-42, -48, 84, 96);
  ctx.strokeStyle = `rgba(92,238,255,${bracketPulse})`;
  ctx.lineWidth = 1.2;
  const bracketX = 31;
  const bracketY = 39;
  const bracketLength = 9;
  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(sx * (bracketX - bracketLength), sy * bracketY);
      ctx.lineTo(sx * bracketX, sy * bracketY);
      ctx.lineTo(sx * bracketX, sy * (bracketY - bracketLength));
      ctx.stroke();
    }
  }
  if (!(typeof drawSpriteAsset === "function" && drawSpriteAsset(ctx, "player", 0, 0, { scale: 1.32, orientationContext: "title" }))) {
    ctx.fillStyle = "#d8fbff";
    ctx.beginPath(); ctx.moveTo(0, -28); ctx.lineTo(-22, 22); ctx.lineTo(0, 12); ctx.lineTo(22, 22); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}
function drawFlightNetworkCard(rect, online, user) {
  const connected = !!(online && online.ready && user);
  ctx.save();
  ctx.beginPath(); ctx.roundRect(rect.x, rect.y, rect.w, rect.h, 10); ctx.clip();
  const background = ctx.createLinearGradient(rect.x, rect.y, rect.x + rect.w, rect.y + rect.h);
  background.addColorStop(0, "rgba(8,22,34,0.94)");
  background.addColorStop(1, "rgba(8,10,22,0.96)");
  ctx.fillStyle = background; ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.strokeStyle = "rgba(92,238,255,0.07)";
  ctx.lineWidth = 1;
  for (let x = rect.x; x < rect.x + rect.w; x += 22) { ctx.beginPath(); ctx.moveTo(x, rect.y); ctx.lineTo(x, rect.y + rect.h); ctx.stroke(); }
  for (let y = rect.y; y < rect.y + rect.h; y += 18) { ctx.beginPath(); ctx.moveTo(rect.x, y); ctx.lineTo(rect.x + rect.w, y); ctx.stroke(); }
  const radarX = rect.x + 58, radarY = rect.y + rect.h / 2;
  ctx.strokeStyle = connected ? "rgba(120,255,180,0.34)" : "rgba(92,238,255,0.25)";
  for (const radius of [14, 28, 42]) { ctx.beginPath(); ctx.arc(radarX, radarY, radius, 0, TAU); ctx.stroke(); }
  const sweep = state.frame * 0.025;
  ctx.strokeStyle = connected ? "rgba(120,255,180,0.82)" : "rgba(92,238,255,0.65)";
  ctx.shadowColor = connected ? "#78ffb4" : "#5ceeff";
  ctx.shadowBlur = 8;
  ctx.beginPath(); ctx.moveTo(radarX, radarY); ctx.lineTo(radarX + Math.cos(sweep) * 42, radarY + Math.sin(sweep) * 42); ctx.stroke();
  ctx.shadowBlur = 0;
  for (let index = 0; index < 4; index++) {
    const angle = index * 1.61 + 0.4;
    const distance = 12 + index * 8;
    ctx.fillStyle = index === 0 && connected ? "#78ffb4" : "rgba(92,238,255,0.70)";
    ctx.beginPath(); ctx.arc(radarX + Math.cos(angle) * distance, radarY + Math.sin(angle) * distance, index === 0 ? 2.5 : 1.5, 0, TAU); ctx.fill();
  }
  ctx.restore();
  ctx.save();
  ctx.strokeStyle = connected ? "rgba(120,255,180,0.38)" : "rgba(92,238,255,0.26)";
  ctx.beginPath(); ctx.roundRect(rect.x, rect.y, rect.w, rect.h, 10); ctx.stroke();
  ctx.textAlign = "left"; ctx.textBaseline = "top";
  ctx.font = FONT_TINY; ctx.fillStyle = "rgba(255,255,255,0.46)";
  ctx.fillText("FLIGHT NETWORK", rect.x + 116, rect.y + 22);
  ctx.font = "900 18px 'Arial Narrow', Arial, sans-serif";
  ctx.fillStyle = connected ? "#78ffb4" : "#d8fbff";
  ctx.fillText(connected ? "CONNECTED" : "LOCAL MODE", rect.x + 116, rect.y + 40);
  ctx.font = FONT_TINY; ctx.fillStyle = "rgba(255,255,255,0.52)";
  ctx.fillText(connected ? "PROFILE + LEAGUE SYNC ACTIVE" : "PLAY READY  /  SIGN IN TO SYNC", rect.x + 116, rect.y + 69);
  ctx.restore();
}
function drawOnlinePanel() {
  const r = getOnlineRects();
  const panel = r.panel;
  const online = onlineState();
  const user = online.user || null;
  const name = callSignEditing ? callSignDraft : (user ? (online.profileCallSign || "PILOT") : callSign);
  const handle = handleEditing ? handleDraft : String(online.profileHandle || "");
  const meta = typeof currentMetaSnapshot === "function" ? currentMetaSnapshot() : null;
  drawTitlePanelFrame(panel, "PILOT DOSSIER", false);
  drawPanelCloseButton(r.closeRect);
  drawAccountTab(r.pilotTab, "PILOT", accountPanelTab === "pilot");
  drawAccountTab(r.settingsTab, "SETTINGS", accountPanelTab === "settings");

  if (accountPanelTab === "pilot") {
    const card = { x: panel.x + 20, y: panel.y + 90, w: panel.w - 40, h: 172 };
    drawDossierCard(card, user ? "#5ceeff" : "#8e9aac");
    drawPilotHologram(card.x + 72, card.y + 84);
    ctx.save();
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillStyle = "rgba(255,255,255,0.48)";
    ctx.font = FONT_TINY;
    ctx.fillText(user ? "VERIFIED PILOT" : "LOCAL PILOT", card.x + 132, card.y + 22);
    ctx.fillStyle = "#fff";
    ctx.font = "900 22px 'Arial Narrow', Arial, sans-serif";
    ctx.fillText(String(name || "PILOT").slice(0, 14), card.x + 132, card.y + 40);
    ctx.strokeStyle = callSignEditing ? "rgba(120,255,180,0.86)" : "rgba(255,255,255,0.20)";
    ctx.lineWidth = callSignEditing ? 2 : 1;
    ctx.beginPath(); ctx.moveTo(card.x + 130, card.y + 66); ctx.lineTo(card.x + card.w - 18, card.y + 66); ctx.stroke();
    ctx.fillStyle = callSignEditing ? "#78ffb4" : "rgba(255,255,255,0.46)";
    ctx.font = "900 9px Arial, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(callSignEditing ? "AUTOSAVES" : "EDIT", card.x + card.w - 18, card.y + 24);
    ctx.textAlign = "left";
    ctx.fillStyle = handle ? "#73efff" : "rgba(255,255,255,0.38)";
    ctx.font = FONT_SMALL;
    ctx.fillText(handle ? `@${handle}${handleEditing ? "_" : ""}` : "@handle unclaimed", card.x + 132, card.y + 70);
    ctx.fillStyle = "rgba(255,224,115,0.88)";
    ctx.font = FONT_TINY;
    ctx.fillText(String((meta && meta.gloryRank) || "Rookie Pilot").toUpperCase(), card.x + 132, card.y + 100);
    ctx.fillStyle = "rgba(255,255,255,0.62)";
    ctx.fillText(`GLORY ${Number((meta && meta.totalGlory) || 0).toLocaleString()}  •  BEST ${Number((meta && meta.lifetime && meta.lifetime.bestScore) || highScore || 0).toLocaleString()}`, card.x + 132, card.y + 121);
    ctx.fillStyle = "rgba(255,184,108,0.86)";
    ctx.fillText("PUBLIC: CALL SIGN + @HANDLE APPEAR TO OTHER PLAYERS", card.x + 14, card.y + 151);
    ctx.restore();
    const handleLabel = online.profileHandle ? `@${online.profileHandle}  •  ACCOUNT-BOUND` : (handleEditing ? `CLAIM @${handleDraft || "handle"}` : "CLAIM UNIQUE @HANDLE");
    const identityAvailable = online.competitionBackend !== "unavailable";
    drawOnlineActionButton(r.claimHandle, identityAvailable ? handleLabel : "IDENTITY SERVICE OFFLINE", !!user && !online.profileHandle && identityAvailable);
    if (!user) drawOnlineActionButton(r.signIn, "CONNECT GOOGLE ACCOUNT", true);
    if (user) drawOnlineActionButton(r.signOut, "SIGN OUT", true);
    ctx.save();
    ctx.font = FONT_TINY;
    ctx.textAlign = "center";
    ctx.fillStyle = handleStatus ? "#ffd27a" : (online.lastError ? "#ff9f9f" : "rgba(255,255,255,0.48)");
    const quietStatus = handleStatus || online.lastError || (!user ? "LOCAL PLAY IS READY" : "ACCOUNT CONNECTED");
    ctx.fillText(String(quietStatus).slice(0, 48), panel.x + panel.w / 2, panel.y + (user ? 426 : 386));
    ctx.restore();
    drawFlightNetworkCard({ x: panel.x + 20, y: panel.y + (user ? 452 : 412), w: panel.w - 40, h: 112 }, online, user);
  } else {
    ctx.save();
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.font = FONT_SMALL;
    ctx.fillStyle = "rgba(255,255,255,0.84)";
    ctx.fillText("VISUAL DENSITY", panel.x + 20, panel.y + 112);
    ctx.font = FONT_TINY;
    ctx.fillStyle = "rgba(255,255,255,0.52)";
    ctx.fillText("PARTICLE LIMIT", panel.x + 20, r.low.y - 17);
    const labels = [{ rect: r.low, value: 300, label: "LOW" }, { rect: r.med, value: 600, label: "MED" }, { rect: r.high, value: 900, label: "HIGH" }];
    for (const item of labels) {
      const active = settingMaxParticles === item.value;
      ctx.fillStyle = active ? "rgba(92,238,255,0.16)" : "rgba(255,255,255,0.06)";
      ctx.fillRect(item.rect.x, item.rect.y, item.rect.w, item.rect.h);
      ctx.strokeStyle = active ? "rgba(92,238,255,0.72)" : "rgba(255,255,255,0.18)";
      ctx.strokeRect(item.rect.x, item.rect.y, item.rect.w, item.rect.h);
      ctx.fillStyle = "#fff";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(item.label, item.rect.x + item.rect.w / 2, item.rect.y + item.rect.h / 2 + 1);
    }
    ctx.restore();
    drawOnlineActionButton(r.shake, `SHAKE: ${settingScreenShake ? "ON" : "OFF"}`, true);
    drawOnlineActionButton(r.reset, "RESET LOCAL DATA", true);
    drawOnlineActionButton(r.motion, `REDUCED MOTION: ${settingReducedMotion ? "ON" : "OFF"}`, true);
    drawOnlineActionButton(r.flash, `REDUCED FLASH: ${settingReducedFlash ? "ON" : "OFF"}`, true);
    drawOnlineActionButton(r.contrast, `HIGH CONTRAST: ${settingHighContrast ? "ON" : "OFF"}`, true);
    drawOnlineActionButton(r.sound, `MUSIC + EFFECTS: ${settingSoundEffects ? "ON" : "OFF"}`, true);
  }
}
function drawRecordsPanel() {
  const r = getRecordsRects();
  const panel = r.panel;
  const online = onlineState();
  const user = online.user || null;
  drawTitlePanelFrame(panel, "RECORDS NETWORK");
  drawPanelCloseButton(r.closeRect);
  ctx.save();
  ctx.fillStyle = "#04070f";
  ctx.fillRect(panel.x + 16, panel.y + 42, panel.w - 32, 43);
  ctx.strokeStyle = "rgba(92,238,255,0.12)";
  ctx.beginPath(); ctx.moveTo(panel.x + 20, panel.y + 84); ctx.lineTo(panel.x + panel.w - 20, panel.y + 84); ctx.stroke();
  ctx.restore();
  drawAccountTab(r.globalTab, "GLOBAL", recordsPanelTab === "global");
  drawAccountTab(r.weeklyTab, "WEEKLY", recordsPanelTab === "weekly");

  if (recordsPanelTab === "weekly") {
    const competitionEnabled = globalThis.COMPETITIVE_MODE_ENABLED === true;
    const league = competitionEnabled ? (online.weeklyLeague || null) : null;
    const card = { x: panel.x + 20, y: panel.y + 92, w: panel.w - 40, h: 116 };
    drawDossierCard(card, "#ffd65c");
    ctx.save();
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.font = FONT_TINY;
    ctx.fillStyle = "rgba(255,255,255,0.52)";
    ctx.fillText("SEVEN-DAY FLIGHT LEAGUE", card.x + 16, card.y + 16);
    ctx.font = "900 23px 'Arial Narrow', Arial, sans-serif";
    ctx.fillStyle = "#ffe67a";
    ctx.shadowColor = "rgba(255,214,92,0.45)";
    ctx.shadowBlur = 10;
    ctx.fillText(league ? `${String(league.division || "ROOKIE")} LEAGUE` : (competitionEnabled ? "WEEKLY LEAGUES" : "PRESEASON"), card.x + 16, card.y + 37);
    ctx.shadowBlur = 0;
    ctx.font = FONT_TINY;
    ctx.fillStyle = "rgba(255,255,255,0.64)";
    ctx.fillText(
      league
        ? `${league.memberCount || 0}/${league.capacity || 30} PILOTS  •  PERFORMANCE MATCHED`
        : (competitionEnabled ? "UP TO 30 PILOTS • MATCHED BY PRIOR BEST" : "VERIFIED WEEKLY SCORING IS CURRENTLY PAUSED"),
      card.x + 16,
      card.y + 75
    );
    ctx.fillText(
      league
        ? String(league.weekLabel || "CURRENT WEEK")
        : (competitionEnabled ? "CLAIM A HANDLE, THEN ENTER THIS WEEK'S GROUP" : "GLOBAL RECORDS AND LOCAL PROGRESSION REMAIN ACTIVE"),
      card.x + 16,
      card.y + 94
    );
    let listY = panel.y + 226;
    const members = league && Array.isArray(league.members) ? league.members.slice(0, 10) : [];
    if (members.length) {
      members.forEach((member, index) => {
        const mine = user && member.uid === user.uid;
        ctx.fillStyle = mine ? "rgba(92,238,255,0.14)" : (index % 2 ? "rgba(255,255,255,0.025)" : "rgba(255,255,255,0.055)");
        ctx.fillRect(panel.x + 20, listY - 5, panel.w - 40, 29);
        ctx.strokeStyle = mine ? "rgba(92,238,255,0.38)" : "rgba(255,255,255,0.07)";
        ctx.strokeRect(panel.x + 20, listY - 5, panel.w - 40, 29);
        ctx.fillStyle = index < 3 ? "#ffe67a" : "rgba(255,255,255,0.78)";
        ctx.fillText(`${index + 1}. ${String(member.callSign || "PILOT").slice(0, 12)}`, panel.x + 30, listY);
        ctx.fillStyle = "rgba(92,238,255,0.68)";
        ctx.fillText(member.handle ? `@${String(member.handle).slice(0, 13)}` : "", panel.x + 143, listY);
        ctx.textAlign = "right";
        ctx.fillStyle = "#fff";
        ctx.fillText(`${Number(member.weeklyPoints || 0).toLocaleString()} FP`, panel.x + panel.w - 30, listY);
        ctx.textAlign = "left";
        listY += 32;
      });
    } else {
      ctx.fillStyle = "rgba(255,255,255,0.48)";
      const empty = !competitionEnabled
        ? "LEAGUE MATCHMAKING RETURNS WITH VERIFIED RUN SESSIONS."
        : (!user ? "SIGN IN FROM YOUR PILOT DOSSIER TO ENTER." : (!online.profileHandle ? "CLAIM YOUR @HANDLE IN THE PILOT DOSSIER FIRST." : "ENTER TO FIND YOUR WEEKLY GROUP."));
      ctx.fillText(empty, panel.x + 24, listY);
      const formatCard = { x: panel.x + 20, y: listY + 33, w: panel.w - 40, h: 188 };
      drawDossierCard(formatCard, "#ffd65c");
      ctx.fillStyle = "rgba(255,255,255,0.48)";
      ctx.fillText("FLIGHT LEAGUE FORMAT", formatCard.x + 16, formatCard.y + 15);
      const divisions = ["ROOKIE", "CADET", "ACE", "ELITE"];
      divisions.forEach((division, index) => {
        const badgeW = 70;
        const badgeX = formatCard.x + 14 + index * 76;
        ctx.fillStyle = index === 0 ? "rgba(255,214,92,0.14)" : "rgba(255,255,255,0.035)";
        ctx.strokeStyle = index === 0 ? "rgba(255,214,92,0.48)" : "rgba(255,255,255,0.12)";
        ctx.fillRect(badgeX, formatCard.y + 36, badgeW, 25);
        ctx.strokeRect(badgeX, formatCard.y + 36, badgeW, 25);
        ctx.fillStyle = index === 0 ? "#ffe67a" : "rgba(255,255,255,0.52)";
        ctx.textAlign = "center";
        ctx.fillText(division, badgeX + badgeW / 2, formatCard.y + 44);
      });
      ctx.textAlign = "left";
      const rules = [
        ["01", "PERFORMANCE MATCHING", "PRIOR BEST SCORE SETS YOUR DIVISION"],
        ["02", "SEVEN-DAY RESET", "A FRESH GROUP AND CLIMB EVERY MONDAY"],
        ["03", "VERIFIED FLIGHT POINTS", "ACCEPTED RUN RECEIPTS POWER THE LADDER"]
      ];
      rules.forEach((rule, index) => {
        const ruleY = formatCard.y + 78 + index * 34;
        ctx.fillStyle = "rgba(92,238,255,0.16)";
        ctx.fillRect(formatCard.x + 15, ruleY, 25, 22);
        ctx.fillStyle = "#5ceeff";
        ctx.fillText(rule[0], formatCard.x + 21, ruleY + 7);
        ctx.fillStyle = "rgba(255,255,255,0.78)";
        ctx.fillText(rule[1], formatCard.x + 50, ruleY + 1);
        ctx.fillStyle = "rgba(255,255,255,0.36)";
        ctx.fillText(rule[2], formatCard.x + 50, ruleY + 12);
      });
    }
    ctx.restore();
    const competitionAvailable = online.competitionBackend !== "unavailable";
    const actionLabel = !competitionEnabled
      ? "WEEKLY LEAGUES • PRESEASON"
      : (competitionAvailable ? (league ? "LEAGUE ACTIVE • AUTO UPDATES" : "ENTER THIS WEEK'S LEAGUE") : "COMPETITION SERVICES OFFLINE");
    drawOnlineActionButton(r.joinLeague, actionLabel, competitionEnabled && !!user && !!online.profileHandle && competitionAvailable && !league);
    return;
  }

  const leaderboard = Array.isArray(online.leaderboard) ? online.leaderboard : [];
  const meta = typeof currentMetaSnapshot === "function" ? currentMetaSnapshot() : null;
  const summary = { x: panel.x + 20, y: panel.y + 92, w: panel.w - 40, h: 84 };
  drawDossierCard(summary, "#5ceeff");
  ctx.save();
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.font = FONT_TINY;
  ctx.fillStyle = "rgba(255,255,255,0.48)";
  ctx.fillText("WORLD BEST-SCORE LADDER", summary.x + 16, summary.y + 15);
  ctx.font = "900 24px 'Arial Narrow', Arial, sans-serif";
  ctx.fillStyle = "#dffcff";
  ctx.fillText(user ? "LIVE FLIGHT RECORDS" : "LOCAL RECORD", summary.x + 16, summary.y + 33);
  ctx.textAlign = "right";
  ctx.fillStyle = "#5ceeff";
  ctx.fillText(Number(highScore || 0).toLocaleString(), summary.x + summary.w - 16, summary.y + 33);
  ctx.font = FONT_TINY;
  ctx.fillStyle = "rgba(255,255,255,0.48)";
  ctx.fillText(user ? "SYNCED ACCOUNT" : "SIGN IN FROM PILOT DOSSIER TO SYNC", summary.x + summary.w - 16, summary.y + 66);
  ctx.textAlign = "left";
  let listY = panel.y + 198;
  ctx.font = FONT_TINY;
  if (leaderboard.length) {
    leaderboard.slice(0, 10).forEach((row, index) => {
      const who = String(row.callSign || "PILOT").slice(0, 12);
      const handle = row.handle ? ` @${String(row.handle).slice(0, 16)}` : "";
      const score = Number(row.bestScore || 0).toLocaleString();
      ctx.fillStyle = index === 0 ? "rgba(255,224,118,0.12)" : (index % 2 ? "rgba(255,255,255,0.025)" : "rgba(255,255,255,0.05)");
      ctx.fillRect(panel.x + 20, listY - 6, panel.w - 40, 31);
      ctx.strokeStyle = index === 0 ? "rgba(255,224,118,0.34)" : "rgba(255,255,255,0.07)";
      ctx.strokeRect(panel.x + 20, listY - 6, panel.w - 40, 31);
      ctx.fillStyle = index < 3 ? "#ffe680" : "rgba(255,255,255,0.82)";
      ctx.fillText(`${index + 1}. ${who}${handle}`, panel.x + 29, listY);
      ctx.textAlign = "right";
      ctx.fillText(score, panel.x + panel.w - 22, listY);
      ctx.textAlign = "left";
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.fillText(String(row.gloryRank || "ROOKIE PILOT").toUpperCase().slice(0, 16), panel.x + 29, listY + 12);
      listY += 34;
    });
  } else {
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.fillText(user ? "NO SYNCED RECORDS YET." : "YOUR RUNS STILL COUNT TOWARD LOCAL ACHIEVEMENTS.", panel.x + 22, listY);
    const archive = { x: panel.x + 20, y: listY + 34, w: panel.w - 40, h: 222 };
    drawDossierCard(archive, "#5ceeff");
    const radarX = archive.x + 78;
    const radarY = archive.y + 107;
    ctx.strokeStyle = "rgba(92,238,255,0.20)";
    for (const radius of [20, 38, 56]) {
      ctx.beginPath(); ctx.arc(radarX, radarY, radius, 0, TAU); ctx.stroke();
    }
    ctx.beginPath(); ctx.moveTo(radarX - 58, radarY); ctx.lineTo(radarX + 58, radarY); ctx.moveTo(radarX, radarY - 58); ctx.lineTo(radarX, radarY + 58); ctx.stroke();
    const sweep = state.frame * 0.02;
    ctx.strokeStyle = "rgba(92,238,255,0.72)";
    ctx.shadowColor = "#5ceeff";
    ctx.shadowBlur = 7;
    ctx.beginPath(); ctx.moveTo(radarX, radarY); ctx.lineTo(radarX + Math.cos(sweep) * 55, radarY + Math.sin(sweep) * 55); ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#5ceeff";
    ctx.beginPath(); ctx.arc(radarX + 25, radarY - 16, 2.5, 0, TAU); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.48)";
    ctx.fillText("LOCAL FLIGHT ARCHIVE", archive.x + 16, archive.y + 15);
    const lifetime = (meta && meta.lifetime) || {};
    const stats = [
      ["BEST PHASE", lifetime.bestPhase || 1],
      ["TOTAL RUNS", lifetime.runs || 0],
      ["HOSTILES", lifetime.kills || 0],
      ["BOSSES", lifetime.bosses || 0],
      ["POWERUPS", lifetime.powerups || 0],
      ["GLORY", (meta && meta.totalGlory) || 0]
    ];
    stats.forEach((stat, index) => {
      const x = archive.x + 156 + (index % 2) * 82;
      const y = archive.y + 42 + Math.floor(index / 2) * 53;
      ctx.fillStyle = "rgba(255,255,255,0.34)";
      ctx.fillText(stat[0], x, y);
      ctx.font = "900 18px 'Arial Narrow', Arial, sans-serif";
      ctx.fillStyle = index === 5 ? "#ffe67a" : "#dffcff";
      ctx.fillText(Number(stat[1]).toLocaleString(), x, y + 15);
      ctx.font = FONT_TINY;
    });
    ctx.fillStyle = "rgba(120,255,180,0.54)";
    ctx.fillText("LOCAL PROGRESS IS ACTIVE • CONNECT TO PUBLISH RECORDS", archive.x + 16, archive.y + archive.h - 22);
  }
  ctx.restore();
}
function achievementTierColor(tier) {
  return ["#8ea4b8", "#5ceeff", "#78ffb4", "#ffe070", "#ff69ec"][clamp(Math.floor(tier || 1) - 1, 0, 4)];
}

function drawAchievementGlyph(x, y, tier, unlocked) {
  const color = achievementTierColor(tier);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.PI / 4);
  ctx.fillStyle = unlocked ? color : "rgba(255,255,255,0.08)";
  ctx.strokeStyle = unlocked ? color : "rgba(255,255,255,0.24)";
  ctx.shadowColor = unlocked ? color : "transparent";
  ctx.shadowBlur = unlocked ? 9 : 0;
  ctx.fillRect(-7, -7, 14, 14);
  ctx.strokeRect(-7, -7, 14, 14);
  ctx.fillStyle = "rgba(4,9,17,0.78)";
  ctx.fillRect(-3, -3, 6, 6);
  ctx.restore();
}

function drawAchievementScrollButton(rect, label, enabled) {
  ctx.save();
  ctx.globalAlpha = enabled ? 1 : 0.28;
  ctx.fillStyle = "rgba(92,238,255,0.09)";
  ctx.strokeStyle = "rgba(92,238,255,0.42)";
  ctx.beginPath(); ctx.roundRect(rect.x, rect.y, rect.w, rect.h, 4); ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#dffcff";
  ctx.font = "900 10px Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, rect.x + rect.w / 2, rect.y + rect.h / 2 + 1);
  ctx.restore();
}

function drawAchievementsPanel() {
  const r = getAchievementsRects();
  const panel = r.panel;
  const online = onlineState();
  const definitions = typeof getAchievementDefinitions === "function" ? getAchievementDefinitions() : [];
  const visibleDefinitions = achievementsForCurrentCategory();
  const onlineEarned = (Array.isArray(online.achievements) ? online.achievements : [])
    .map((item) => typeof item === "string" ? item : item.achievementId);
  const earnedIds = typeof mergedAchievementIds === "function"
    ? mergedAchievementIds(onlineEarned)
    : onlineEarned;
  const earned = new Set(earnedIds);
  const meta = typeof currentMetaSnapshot === "function" ? currentMetaSnapshot() : null;
  drawTitlePanelFrame(panel, "ACHIEVEMENT VAULT");
  drawPanelCloseButton(r.closeRect);
  ctx.save();
  ctx.fillStyle = "#04070f";
  ctx.fillRect(panel.x + 16, panel.y + 43, panel.w - 32, 41);
  ctx.strokeStyle = "rgba(92,238,255,0.12)";
  ctx.beginPath(); ctx.moveTo(panel.x + 20, panel.y + 83); ctx.lineTo(panel.x + panel.w - 20, panel.y + 83); ctx.stroke();
  ctx.restore();
  for (const [category, rect] of Object.entries(r.tabs)) {
    drawAccountTab(rect, category === "all" ? "ALL" : category.toUpperCase(), achievementCategory === category);
  }

  ctx.save();
  const total = Math.max(1, definitions.length);
  const summary = { x: panel.x + 20, y: panel.y + 88, w: panel.w - 40, h: 74 };
  const ratio = earned.size / total;
  drawDossierCard(summary, "#78ffb4");
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.font = FONT_TINY;
  ctx.fillStyle = "rgba(255,255,255,0.48)";
  ctx.fillText("PILOT COMPLETION", summary.x + 16, summary.y + 13);
  ctx.font = "900 24px 'Arial Narrow', Arial, sans-serif";
  ctx.fillStyle = "#78ffb4";
  ctx.shadowColor = "rgba(120,255,180,0.55)";
  ctx.shadowBlur = 8;
  ctx.fillText(`${earned.size} / ${definitions.length}`, summary.x + 16, summary.y + 31);
  ctx.shadowBlur = 0;
  ctx.font = FONT_TINY;
  ctx.fillStyle = "rgba(255,255,255,0.52)";
  ctx.fillText(`${Math.floor(ratio * 100)}% COMPLETE`, summary.x + 16, summary.y + 57);
  drawMetaBar(summary.x + 112, summary.y + 35, summary.w - 130, ratio, "rgba(120,255,180,0.72)");
  ctx.textAlign = "right";
  ctx.fillStyle = "rgba(255,224,112,0.76)";
  ctx.fillText("5 TIERS • CAREER MILESTONES", summary.x + summary.w - 16, summary.y + 57);

  clampAchievementScroll();
  ctx.save();
  ctx.beginPath();
  ctx.rect(r.contentRect.x, r.contentRect.y, r.contentRect.w, r.contentRect.h);
  ctx.clip();
  const gap = 7;
  const cardW = Math.floor((r.contentRect.w - gap) / 2);
  const cardH = 67;
  visibleDefinitions.forEach((achievement, index) => {
    const unlocked = earned.has(achievement.id);
    const column = index % 2;
    const row = Math.floor(index / 2);
    const x = r.contentRect.x + column * (cardW + gap);
    const y = r.contentRect.y + row * 74 - achievementScroll;
    if (y + cardH < r.contentRect.y || y > r.contentRect.y + r.contentRect.h) return;
    const color = achievementTierColor(achievement.tier);
    const pulse = unlocked ? 0.04 + Math.sin((state.frame + index * 13) * 0.035) * 0.018 : 0;
    ctx.fillStyle = unlocked ? `rgba(120,255,180,${0.07 + pulse})` : "rgba(255,255,255,0.035)";
    ctx.beginPath(); ctx.roundRect(x, y, cardW, cardH, 7); ctx.fill();
    ctx.strokeStyle = unlocked ? color : "rgba(255,255,255,0.11)";
    ctx.globalAlpha = unlocked ? 0.58 : 1;
    ctx.stroke();
    ctx.globalAlpha = 1;
    drawAchievementGlyph(x + 18, y + 19, achievement.tier, unlocked);
    ctx.textAlign = "left";
    ctx.font = "900 9px 'Arial Narrow', Arial, sans-serif";
    ctx.fillStyle = unlocked ? "#fff" : "rgba(255,255,255,0.68)";
    ctx.fillText(String(achievement.name || achievement.id).toUpperCase().slice(0, 22), x + 34, y + 10);
    ctx.font = "700 7px Arial, sans-serif";
    ctx.fillStyle = unlocked ? color : "rgba(255,255,255,0.38)";
    ctx.fillText(unlocked ? `TIER ${achievement.tier} • UNLOCKED` : `TIER ${achievement.tier} • IN PROGRESS`, x + 34, y + 24);
    ctx.fillStyle = "rgba(255,255,255,0.44)";
    ctx.fillText(String(achievement.description || "").toUpperCase().slice(0, 34), x + 9, y + 39);
    const progress = typeof achievementProgressForMeta === "function"
      ? achievementProgressForMeta(achievement, meta)
      : { ratio: 0, label: "LOCKED" };
    drawMetaBar(x + 9, y + 54, cardW - 58, unlocked ? 1 : progress.ratio, unlocked ? color : "rgba(92,238,255,0.50)");
    ctx.textAlign = "right";
    ctx.fillStyle = unlocked ? color : "rgba(255,255,255,0.46)";
    ctx.fillText(unlocked ? "DONE" : progress.label, x + cardW - 8, y + 53);
  });
  ctx.restore();

  const maxScroll = getAchievementMaxScroll();
  if (maxScroll > 0) {
    const track = { x: r.contentRect.x + r.contentRect.w - 3, y: r.contentRect.y + 4, w: 2, h: r.contentRect.h - 8 };
    const thumbH = Math.max(24, track.h * (r.contentRect.h / getAchievementContentHeight()));
    const thumbY = track.y + (track.h - thumbH) * (achievementScroll / maxScroll);
    ctx.fillStyle = "rgba(255,255,255,0.10)";
    ctx.fillRect(track.x, track.y, track.w, track.h);
    ctx.fillStyle = "rgba(92,238,255,0.70)";
    ctx.fillRect(track.x, thumbY, track.w, thumbH);
  }
  drawAchievementScrollButton(r.scrollUp, "▲", achievementScroll > 0);
  drawAchievementScrollButton(r.scrollDown, "▼", achievementScroll < maxScroll);
  ctx.textAlign = "left";
  ctx.font = FONT_TINY;
  ctx.fillStyle = "rgba(255,255,255,0.48)";
  ctx.fillText(
    online.user ? "SERVER-SYNCED UNLOCKS" : "SAVED LOCALLY • SIGN IN TO SYNC",
    panel.x + 20,
    panel.y + panel.h - 35
  );
  ctx.textAlign = "right";
  ctx.fillStyle = "rgba(92,238,255,0.56)";
  ctx.fillText(`${visibleDefinitions.length} OBJECTIVES`, r.scrollUp.x - 8, panel.y + panel.h - 35);
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
  const spatialEase = panelAlpha * panelAlpha * (3 - 2 * panelAlpha);
  const panelScale = 0.16 + spatialEase * 0.84;
  ctx.translate(titlePanelOrigin.x, titlePanelOrigin.y);
  ctx.scale(panelScale, panelScale);
  ctx.translate(-titlePanelOrigin.x, -titlePanelOrigin.y);
  ctx.globalAlpha = panelAlpha * screenEase;
  const screenScale = 0.94 + screenEase * 0.06;
  ctx.translate(W / 2, H / 2);
  ctx.scale(screenScale, screenScale);
  ctx.translate(-W / 2, -H / 2);
  if (titleSubState === "codex") drawCodexPanel();
  else if (titleSubState === "online") drawOnlinePanel();
  else if (titleSubState === "records") drawRecordsPanel();
  else if (titleSubState === "achievements") drawAchievementsPanel();
  else if (titleSubState === "progress") drawProgressPanel();
  ctx.restore();
}
