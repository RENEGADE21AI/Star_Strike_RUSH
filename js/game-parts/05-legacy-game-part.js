// Star Strike RUSH legacy game part 6
// Generated from js/legacyGame.js by scripts/split-legacy-game.mjs.
// Do not edit generated part files directly.

function getSettingsRects() {
  const panel = getTitlePanelRect();
  const closeRect = { x: panel.x + panel.w - 34, y: panel.y + 12, w: 22, h: 22 };
  const innerX = panel.x + 20;
  const innerY = panel.y + 56;
  const btnY = innerY + 18;
  const btnW = 64, btnH = 28, gap = 10;
  const low = { x: innerX, y: btnY, w: btnW, h: btnH };
  const med = { x: innerX + (btnW + gap), y: btnY, w: btnW, h: btnH };
  const high = { x: innerX + 2 * (btnW + gap), y: btnY, w: btnW, h: btnH };
  const shake = { x: innerX, y: btnY + 52, w: 130, h: 30 };
  const reset = { x: innerX, y: btnY + 96, w: 160, h: 30 };
  return { panel, closeRect, low, med, high, shake, reset };
}
function getCodexRects() {
  const panel = getTitlePanelRect();
  const closeRect = { x: panel.x + panel.w - 34, y: panel.y + 12, w: 22, h: 22 };
  const rects = codexCardRects(panel);
  return { panel, closeRect, rects };
}
function getResetConfirmRects() {
  const boxW = Math.min(460, W - 28);
  const boxH = 166;
  const boxX = Math.round((W - boxW) / 2);
  const boxY = Math.round((H - boxH) / 2);
  const no = { x: boxX + 28, y: boxY + boxH - 48, w: 116, h: 32 };
  const yes = { x: boxX + boxW - 144, y: boxY + boxH - 48, w: 116, h: 32 };
  return { box: { x: boxX, y: boxY, w: boxW, h: boxH }, yes, no };
}
function drawHoldButton(rect, label, hold, threshold, baseFill, strokeMin, strokeMax) {
  const progress = clamp(hold / threshold, 0, 1);
  ctx.save();
  ctx.fillStyle = baseFill;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  if (hold > 0) {
    ctx.fillStyle = "rgba(120,255,180,0.22)";
    ctx.fillRect(rect.x, rect.y, rect.w * progress, rect.h);
  }
  ctx.strokeStyle = `rgba(120,255,180,${strokeMin + (strokeMax - strokeMin) * progress})`;
  ctx.lineWidth = 2;
  ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
  ctx.fillStyle = "#fff";
  ctx.font = FONT_BUTTON;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, rect.x + rect.w / 2, rect.y + rect.h / 2 + 1);
  ctx.restore();
}
function drawSimpleButton(rect, label, stroke = "rgba(255,255,255,0.28)") {
  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 2;
  ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
  ctx.fillStyle = "#fff";
  ctx.font = FONT_BUTTON;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, rect.x + rect.w / 2, rect.y + rect.h / 2 + 1);
  ctx.restore();
}
function drawGearIcon(rect, active = false) {
  const cx = rect.x + rect.w / 2, cy = rect.y + rect.h / 2;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.strokeStyle = active ? "rgba(120,255,180,0.90)" : "rgba(255,255,255,0.92)";
  ctx.fillStyle = active ? "rgba(120,255,180,0.20)" : "rgba(255,255,255,0.16)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(0, 0, 13.2, 0, TAU);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "rgba(255,255,255,0.92)";
  for (let i = 0; i < 8; i++) {
    const a = i * (TAU / 8);
    ctx.save();
    ctx.rotate(a);
    ctx.fillRect(11.9, -1.8, 4.8, 3.6);
    ctx.restore();
  }

  ctx.fillStyle = active ? "rgba(250,255,255,0.92)" : "rgba(235,240,245,0.88)";
  ctx.beginPath(); ctx.arc(0, 0, 8.4, 0, TAU); ctx.fill();
  ctx.fillStyle = active ? "rgba(255,255,255,0.24)" : "rgba(255,255,255,0.18)";
  ctx.beginPath(); ctx.arc(0, 0, 5.0, 0, TAU); ctx.fill();
  ctx.fillStyle = active ? "rgba(0,20,10,0.85)" : "rgba(0,0,0,0.78)";
  ctx.beginPath(); ctx.arc(0, 0, 4.3, 0, TAU); ctx.fill();
  ctx.restore();
}
function drawBookIcon(rect, active = false) {
  const cx = rect.x + rect.w / 2, cy = rect.y + rect.h / 2;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.strokeStyle = active ? "rgba(120,255,180,0.85)" : "rgba(255,255,255,0.90)";
  ctx.fillStyle = active ? "rgba(120,255,180,0.16)" : "rgba(255,255,255,0.10)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-12, -11); ctx.lineTo(-2, -9); ctx.lineTo(-2, 11); ctx.lineTo(-12, 8); ctx.closePath();
  ctx.fill(); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(2, -9); ctx.lineTo(12, -11); ctx.lineTo(12, 8); ctx.lineTo(2, 11); ctx.closePath();
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = active ? "rgba(120,255,180,0.22)" : "rgba(255,255,255,0.14)";
  ctx.fillRect(-2, -11, 4, 22);
  ctx.strokeStyle = active ? "rgba(120,255,180,0.55)" : "rgba(255,255,255,0.35)";
  ctx.beginPath(); ctx.moveTo(-8, -6); ctx.lineTo(-3, -5); ctx.moveTo(-8, -1); ctx.lineTo(-3, 0); ctx.moveTo(-8, 4); ctx.lineTo(-3, 5); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(3, -5); ctx.lineTo(8, -6); ctx.moveTo(3, 0); ctx.lineTo(8, -1); ctx.moveTo(3, 5); ctx.lineTo(8, 4); ctx.stroke();
  if (codexHasNew) {
    ctx.fillStyle = "#f33";
    ctx.shadowColor = "rgba(255,50,50,0.9)";
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(10, -9, 4.5, 0, TAU);
    ctx.fill();
    ctx.shadowBlur = 0;
  }
  ctx.restore();
}
function drawEnemyFlame(yOffset, width, height, phase, alpha = 0.42) {
  const flicker = 1 + Math.sin(state.frame * 0.35 + phase) * 0.22;
  const reach = height * flicker;
  ctx.save();
  ctx.globalAlpha = alpha * 0.85;
  ctx.fillStyle = "rgba(255,150,50,0.70)";
  ctx.beginPath();
  ctx.moveTo(-width * 0.55, yOffset);
  ctx.lineTo(0, yOffset + reach);
  ctx.lineTo(width * 0.55, yOffset);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = alpha * 0.70;
  ctx.fillStyle = "rgba(255,240,150,0.85)";
  ctx.beginPath();
  ctx.moveTo(-width * 0.22, yOffset);
  ctx.lineTo(0, yOffset + reach * 0.70);
  ctx.lineTo(width * 0.22, yOffset);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = alpha * 0.55;
  ctx.fillStyle = "rgba(255,255,255,0.80)";
  ctx.fillRect(-1.2, yOffset, 2.4, reach * 0.48);
  ctx.restore();
}
function drawFighterCanopy(alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.beginPath(); ctx.ellipse(0, -1, 4.2, 5.8, 0, 0, TAU); ctx.fill();
  ctx.globalAlpha = alpha * 0.4;
  ctx.fillStyle = "rgba(120,200,255,0.9)";
  ctx.beginPath(); ctx.ellipse(-0.7, -2.2, 1.6, 2.1, -0.2, 0, TAU); ctx.fill();
  ctx.restore();
}

function drawRedShip(hitMix = 0, silhouette = false, phase = 0) {
  const body = silhouette ? "rgba(50,50,50,0.95)" : mixHex("#e44", "#ff9c9c", hitMix * 0.25);
  const wing = silhouette ? "rgba(50,50,50,0.95)" : mixHex("#a11", "#f5b0b0", hitMix * 0.2);
  const core = silhouette ? "rgba(50,50,50,0.95)" : mixHex("#fff", "#ffd0d0", hitMix * 0.16);
  if (!silhouette) {
    ctx.shadowColor = `rgba(255,120,120,${0.12 + hitMix * 0.08})`;
    ctx.shadowBlur = 6;
  }
  ctx.fillStyle = body;
  ctx.beginPath(); ctx.moveTo(0, -14); ctx.lineTo(-12, 6); ctx.lineTo(0, 12); ctx.lineTo(12, 6); ctx.closePath(); ctx.fill();
  ctx.fillStyle = wing;
  ctx.beginPath(); ctx.moveTo(-12, 4); ctx.lineTo(-20, 10); ctx.lineTo(-9, 8); ctx.fill();
  ctx.beginPath(); ctx.moveTo(12, 4); ctx.lineTo(20, 10); ctx.lineTo(9, 8); ctx.fill();
  ctx.fillStyle = core; drawFighterCanopy(silhouette ? 0.8 : 0.95);
  if (!silhouette) drawEnemyFlame(10.5, 7, 8, phase, 0.46);
}
function drawOrangeShip(hitMix = 0, silhouette = false, phase = 0) {
  const body = silhouette ? "rgba(50,50,50,0.95)" : mixHex("#f93", "#ffd39b", hitMix * 0.25);
  const canopy = silhouette ? "rgba(50,50,50,0.95)" : mixHex("#fff", "#fff0da", hitMix * 0.18);
  const wing = silhouette ? "rgba(50,50,50,0.95)" : mixHex("#ffb25a", "#ffe1b8", hitMix * 0.18);
  if (!silhouette) {
    ctx.shadowColor = `rgba(255,170,90,${0.12 + hitMix * 0.08})`;
    ctx.shadowBlur = 6;
  }
  ctx.fillStyle = body;
  ctx.beginPath(); ctx.moveTo(0, -13); ctx.lineTo(-11, 5); ctx.lineTo(0, 11); ctx.lineTo(11, 5); ctx.closePath(); ctx.fill();
  ctx.fillStyle = wing;
  ctx.beginPath(); ctx.moveTo(-8, 2); ctx.lineTo(-17, 7); ctx.lineTo(-8, 8); ctx.lineTo(-4, 5); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(8, 2); ctx.lineTo(17, 7); ctx.lineTo(8, 8); ctx.lineTo(4, 5); ctx.closePath(); ctx.fill();
  ctx.fillStyle = silhouette ? "rgba(50,50,50,0.95)" : mixHex("#ffbf6a", "#fff2dd", hitMix * 0.14);
  ctx.beginPath(); ctx.moveTo(0, -13); ctx.lineTo(-6, -4); ctx.lineTo(0, -1); ctx.lineTo(6, -4); ctx.closePath(); ctx.fill();
  ctx.fillStyle = canopy; drawFighterCanopy(silhouette ? 0.8 : 0.95);
  if (!silhouette) drawEnemyFlame(9.5, 7, 7, phase, 0.40);
}
function drawPurpleShip(hitMix = 0, silhouette = false, phase = 0) {
  const body = silhouette ? "rgba(50,50,50,0.95)" : mixHex("#b4f", "#d7c4ff", hitMix * 0.20);
  const side = silhouette ? "rgba(50,50,50,0.95)" : mixHex("#7213b0", "#f0ddff", hitMix * 0.18);
  if (!silhouette) {
    ctx.shadowColor = `rgba(190,120,255,${0.10 + hitMix * 0.08})`;
    ctx.shadowBlur = 7;
  }
  ctx.fillStyle = side;
  ctx.beginPath(); ctx.moveTo(-10, 2); ctx.lineTo(-22, 7); ctx.lineTo(-15, 12); ctx.lineTo(-7, 9); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(10, 2); ctx.lineTo(22, 7); ctx.lineTo(15, 12); ctx.lineTo(7, 9); ctx.closePath(); ctx.fill();
  ctx.fillStyle = body;
  ctx.beginPath(); ctx.moveTo(0, -18); ctx.lineTo(-14, -4); ctx.lineTo(-10, 12); ctx.lineTo(10, 12); ctx.lineTo(14, -4); ctx.closePath(); ctx.fill();
  ctx.fillStyle = silhouette ? "rgba(50,50,50,0.95)" : "rgba(255,255,255,0.90)"; drawFighterCanopy(silhouette ? 0.8 : 0.95);
  if (!silhouette) drawEnemyFlame(13.2, 6, 8, phase, 0.42);
}
function drawPhantomShip(hitMix = 0, silhouette = false, ghostAlpha = 1, telegraph = 0, stateMode = "physical", phase = 0) {
  const alpha = silhouette ? 1 : ghostAlpha;
  if (!silhouette) {
    ctx.globalAlpha = alpha;
    ctx.shadowColor = "rgba(0,255,255,0.45)";
    ctx.shadowBlur = 8;
  }
  const bodyFill = silhouette ? "rgba(50,50,50,0.95)" : (stateMode === "ghost" ? "rgba(120,255,255,0.18)" : "rgba(120,255,255,0.30)");
  ctx.fillStyle = bodyFill;
  ctx.beginPath(); ctx.moveTo(-11, 2); ctx.lineTo(-20, 8); ctx.lineTo(-15, 13); ctx.lineTo(-8, 8); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(11, 2); ctx.lineTo(20, 8); ctx.lineTo(15, 13); ctx.lineTo(8, 8); ctx.closePath(); ctx.fill();
  ctx.fillStyle = silhouette ? "rgba(50,50,50,0.95)" : (stateMode === "ghost" ? "rgba(210,255,255,0.80)" : "rgba(170,255,255,0.92)");
  ctx.beginPath(); ctx.moveTo(0, -16); ctx.lineTo(-8, -9); ctx.lineTo(-11, 4); ctx.lineTo(-7, 15); ctx.lineTo(7, 15); ctx.lineTo(11, 4); ctx.lineTo(8, -9); ctx.closePath(); ctx.fill();
  ctx.fillStyle = silhouette ? "rgba(50,50,50,0.95)" : (stateMode === "ghost" ? "rgba(200,255,255,0.20)" : "rgba(170,255,255,0.28)");
  ctx.beginPath(); ctx.moveTo(-5, 14); ctx.lineTo(-8, 22); ctx.lineTo(0, 18); ctx.lineTo(8, 22); ctx.lineTo(5, 14); ctx.closePath(); ctx.fill();
  ctx.fillStyle = silhouette ? "rgba(50,50,50,0.95)" : (stateMode === "ghost" ? "rgba(255,255,255,0.16)" : "rgba(255,255,255,0.26)");
  ctx.beginPath(); ctx.ellipse(0, -2, 3.7, 5.2, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = silhouette ? "rgba(50,50,50,0.95)" : mixHex("#00d0d0", "#efffff", hitMix * 0.18);
  ctx.fillRect(-9, 7, 18, 3);
  ctx.fillStyle = silhouette ? "rgba(50,50,50,0.95)" : (stateMode === "ghost" ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.30)");
  ctx.fillRect(-2, 10, 4, 3);
  if (!silhouette) drawEnemyFlame(12, 7, 7, phase, stateMode === "ghost" ? 0.34 : 0.42);

  if (!silhouette) {
    if (telegraph > 0) {
      ctx.strokeStyle = "rgba(255,255,255,0.8)";
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 0, 22, 0, TAU); ctx.stroke();
    } else {
      ctx.strokeStyle = stateMode === "ghost" ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.20)";
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 0, 20, 0, TAU); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
}
function drawBossStandardShip(silhouette = false, alpha = 1) {
  if (!silhouette) {
    ctx.globalAlpha = alpha;
    ctx.shadowColor = "rgba(120,255,255,0.25)";
    ctx.shadowBlur = 12;
  }
  ctx.fillStyle = silhouette ? "rgba(50,50,50,0.95)" : "#6ff";
  ctx.beginPath();
  ctx.moveTo(0, -34);
  ctx.lineTo(-58, -20);
  ctx.lineTo(-84, -2);
  ctx.lineTo(-66, 18);
  ctx.lineTo(-24, 30);
  ctx.lineTo(0, 34);
  ctx.lineTo(24, 30);
  ctx.lineTo(66, 18);
  ctx.lineTo(84, -2);
  ctx.lineTo(58, -20);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = silhouette ? "rgba(50,50,50,0.95)" : "rgba(0,0,0,0.18)";
  ctx.beginPath();
  ctx.moveTo(0, -18);
  ctx.lineTo(-40, -10);
  ctx.lineTo(-50, 8);
  ctx.lineTo(0, 22);
  ctx.lineTo(50, 8);
  ctx.lineTo(40, -10);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = silhouette ? "rgba(50,50,50,0.95)" : "rgba(0,0,0,0.22)";
  ctx.beginPath(); ctx.roundRect(-82, -10, 26, 18, 5); ctx.fill();
  ctx.beginPath(); ctx.roundRect(56, -10, 26, 18, 5); ctx.fill();
  ctx.fillStyle = silhouette ? "rgba(50,50,50,0.95)" : "#044";
  ctx.beginPath(); ctx.ellipse(0, -4, 10, 16, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = silhouette ? "rgba(50,50,50,0.95)" : "#033";
  ctx.beginPath(); ctx.roundRect(-22, -6, 12, 12, 3); ctx.fill();
  ctx.beginPath(); ctx.roundRect(10, -6, 12, 12, 3); ctx.fill();
  ctx.fillStyle = silhouette ? "rgba(50,50,50,0.95)" : "#9ff";
  ctx.beginPath(); ctx.arc(0, 4, 14, 0, TAU); ctx.fill();
  ctx.fillStyle = silhouette ? "rgba(50,50,50,0.95)" : "rgba(0,0,0,0.20)";
  ctx.fillRect(-30, 24, 60, 8);
  ctx.fillStyle = silhouette ? "rgba(50,50,50,0.95)" : "rgba(120,255,255,0.34)";
  ctx.beginPath(); ctx.moveTo(-48, 16); ctx.lineTo(-62, 28); ctx.lineTo(-40, 22); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(48, 16); ctx.lineTo(62, 28); ctx.lineTo(40, 22); ctx.closePath(); ctx.fill();
  ctx.globalAlpha = 1;
}
function drawBossWraithShip(silhouette = false, alpha = 1, realm = 0, chargeTelegraph = 0) {
  if (!silhouette) {
    ctx.globalAlpha = alpha;
    ctx.shadowColor = realm === 0 ? "rgba(170,220,255,0.42)" : "rgba(180,120,255,0.48)";
    ctx.shadowBlur = chargeTelegraph > 0 ? 24 : 16;
  }
  const hull = silhouette ? "rgba(50,50,50,0.95)" : (realm === 0 ? "rgba(230,245,255,0.92)" : "rgba(225,200,255,0.88)");
  const inner = silhouette ? "rgba(50,50,50,0.95)" : (realm === 0 ? "rgba(200,225,245,0.85)" : "rgba(210,185,245,0.82)");
  ctx.fillStyle = hull;
  ctx.beginPath();
  ctx.moveTo(0, -40); ctx.lineTo(-62, -22); ctx.lineTo(-74, -4); ctx.lineTo(-62, 18); ctx.lineTo(0, 36); ctx.lineTo(62, 18); ctx.lineTo(74, -4); ctx.lineTo(62, -22); ctx.closePath(); ctx.fill();
  ctx.fillStyle = inner;
  ctx.beginPath();
  ctx.moveTo(0, -22); ctx.lineTo(-42, -12); ctx.lineTo(-48, 6); ctx.lineTo(0, 22); ctx.lineTo(48, 6); ctx.lineTo(42, -12); ctx.closePath(); ctx.fill();
  ctx.fillStyle = silhouette ? "rgba(50,50,50,0.95)" : "rgba(0,0,0,0.20)";
  ctx.beginPath(); ctx.roundRect(-78, -10, 28, 18, 6); ctx.fill();
  ctx.beginPath(); ctx.roundRect(50, -10, 28, 18, 6); ctx.fill();
  ctx.fillStyle = silhouette ? "rgba(50,50,50,0.95)" : (realm === 0 ? "rgba(160,205,255,0.90)" : "rgba(190,150,255,0.88)");
  ctx.beginPath(); ctx.moveTo(-18, -30); ctx.lineTo(-34, -18); ctx.lineTo(-16, -16); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(18, -30); ctx.lineTo(34, -18); ctx.lineTo(16, -16); ctx.closePath(); ctx.fill();
  ctx.fillStyle = silhouette ? "rgba(50,50,50,0.95)" : (realm === 0 ? "rgba(255,255,255,0.24)" : "rgba(255,255,255,0.18)");
  ctx.beginPath(); ctx.ellipse(0, -6, 8, 14, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = silhouette ? "rgba(50,50,50,0.95)" : "rgba(0,0,0,0.22)";
  ctx.fillRect(-22, 18, 44, 8);
  ctx.fillStyle = silhouette ? "rgba(50,50,50,0.95)" : (realm === 0 ? "rgba(120,190,255,0.65)" : "rgba(160,120,240,0.62)");
  ctx.beginPath(); ctx.moveTo(-36, 28); ctx.lineTo(-24, 42); ctx.lineTo(-14, 28); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(36, 28); ctx.lineTo(24, 42); ctx.lineTo(14, 28); ctx.closePath(); ctx.fill();
  ctx.globalAlpha = 1;
}
function drawEnemyGeometry(kind, opts = {}) {
  const hitMix = opts.hitMix || 0;
  const silhouette = !!opts.silhouette;
  const alpha = opts.alpha == null ? 1 : opts.alpha;
  const stateMode = opts.stateMode || "physical";
  const telegraph = opts.telegraph || 0;
  const realm = opts.realm == null ? 0 : opts.realm;
  const phase = opts.phase || 0;
  const chargeTelegraph = opts.chargeTelegraph || 0;
  if (!silhouette) ctx.globalAlpha = alpha;

  if (kind === "red") drawRedShip(hitMix, silhouette, phase);
  else if (kind === "orange") drawOrangeShip(hitMix, silhouette, phase);
  else if (kind === "purple") drawPurpleShip(hitMix, silhouette, phase);
  else if (kind === "phantom") drawPhantomShip(hitMix, silhouette, alpha, telegraph, stateMode, phase);
  else if (kind === "boss_standard") drawBossStandardShip(silhouette, alpha);
  else if (kind === "boss_wraith") drawBossWraithShip(silhouette, alpha, realm, chargeTelegraph);

  ctx.globalAlpha = 1;
}

function drawFormationShip(kind, x, y, shipScale, angle) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.scale(shipScale, shipScale);
  ctx.scale(1, -1);
  drawEnemyGeometry(kind, { hitMix: 0, alpha: 1, silhouette: false, stateMode: "physical", phase: state.frame * 0.04 + x * 0.01 });
  ctx.restore();
}
function drawEncounterShipGraphic(type, opts = {}) {
  const scale = opts.scale == null ? 0.55 : opts.scale;
  const silhouette = !!opts.silhouette;
  const stateMode = opts.stateMode || "physical";
  const realm = opts.realm == null ? 0 : opts.realm;
  ctx.save();
  ctx.translate(0, 0);
  ctx.scale(scale, scale);
  ctx.scale(1, -1);
  drawEnemyGeometry(type, { hitMix: 0, alpha: 1, silhouette, stateMode, telegraph: 0, realm, phase: state.frame * 0.04 });
  ctx.restore();
}
function drawMenuShip(kind, x, y, scale, angle, shipAlpha = 0.95, trailAlpha = 0.55) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.scale(scale, scale);
  ctx.globalAlpha = shipAlpha;
  const coreColor = kind === "red" ? "#e44" : kind === "orange" ? "#f93" : "#b4f";
  const wingColor = kind === "red" ? "#a11" : kind === "orange" ? "#ffb25a" : "#7213b0";
  ctx.shadowColor = kind === "red" ? "rgba(255,120,120,0.18)" : kind === "orange" ? "rgba(255,170,90,0.18)" : "rgba(190,120,255,0.20)";
  ctx.shadowBlur = 5;
  ctx.fillStyle = wingColor;
  if (kind === "purple") {
    ctx.beginPath(); ctx.moveTo(-8, 3); ctx.lineTo(-16, 7); ctx.lineTo(-11, 11); ctx.lineTo(-5, 9); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(8, 3); ctx.lineTo(16, 7); ctx.lineTo(11, 11); ctx.lineTo(5, 9); ctx.closePath(); ctx.fill();
  } else {
    ctx.beginPath(); ctx.moveTo(-8, 4); ctx.lineTo(-16, 9); ctx.lineTo(-8, 10); ctx.lineTo(-4, 6); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(8, 4); ctx.lineTo(16, 9); ctx.lineTo(8, 10); ctx.lineTo(4, 6); ctx.closePath(); ctx.fill();
  }
  ctx.fillStyle = coreColor;
  if (kind === "purple") {
    ctx.beginPath();
    ctx.moveTo(0, -13); ctx.lineTo(-10, -3); ctx.lineTo(-7, 10); ctx.lineTo(7, 10); ctx.lineTo(10, -3); ctx.closePath(); ctx.fill();
  } else {
    ctx.beginPath();
    ctx.moveTo(0, -12); ctx.lineTo(-8, 4); ctx.lineTo(0, 8); ctx.lineTo(8, 4); ctx.closePath(); ctx.fill();
  }
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.beginPath(); ctx.ellipse(0, -1, kind === "purple" ? 2.3 : 2.1, kind === "purple" ? 4.0 : 3.8, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = "rgba(120,200,255,0.9)";
  ctx.beginPath(); ctx.ellipse(0.4, -2.3, 0.8, 1.7, -0.15, 0, TAU); ctx.fill();
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.fillRect(-2.0, 7.4, 4.0, 1.6);
  drawMiniFlame(8.2, kind === "purple" ? 6.0 : 5.8, kind === "purple" ? 6.5 : 6.0, (state.frame + x + y) * 0.02, trailAlpha);
  ctx.restore();
}
function drawMiniFlame(yOffset, width, height, phase, alpha = 0.42) {
  const flicker = 1 + Math.sin(state.frame * 0.35 + phase) * 0.22;
  const reach = height * flicker;
  ctx.save();
  ctx.globalAlpha = alpha * 0.86;
  ctx.fillStyle = "rgba(255,150,50,0.70)";
  ctx.beginPath();
  ctx.moveTo(-width * 0.55, yOffset);
  ctx.lineTo(0, yOffset + reach);
  ctx.lineTo(width * 0.55, yOffset);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = alpha * 0.68;
  ctx.fillStyle = "rgba(255,240,150,0.85)";
  ctx.beginPath();
  ctx.moveTo(-width * 0.22, yOffset);
  ctx.lineTo(0, yOffset + reach * 0.72);
  ctx.lineTo(width * 0.22, yOffset);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = alpha * 0.48;
  ctx.fillStyle = "rgba(255,255,255,0.82)";
  ctx.fillRect(-1.0, yOffset, 2.0, reach * 0.45);
  ctx.restore();
}

function drawTitleSun() {
  const x = W * 0.80, y = H * 0.18;
  ctx.save();
  const g = ctx.createRadialGradient(x, y, 10, x, y, 190);
  g.addColorStop(0, "rgba(255,235,160,0.34)");
  g.addColorStop(0.25, "rgba(255,180,90,0.18)");
  g.addColorStop(1, "rgba(255,110,40,0)");
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, 190, 0, TAU); ctx.fill();
  ctx.globalAlpha = 0.10;
  ctx.fillStyle = "rgba(255,220,140,0.9)";
  ctx.beginPath(); ctx.arc(x, y, 26, 0, TAU); ctx.fill();
  ctx.restore();
}
function drawMenuFlights() {
  for (const f of state.titleFormations) {
    const offsets = TITLE_PATTERNS[f.pattern] || TITLE_PATTERNS.vee;
    const shipAngle = f.angle;
    const shipScale = 0.68;
    for (let i = 0; i < offsets.length; i++) {
      const [ox, oy] = offsets[i];
      const histIndex = Math.max(0, f.leaderHistory.length - 6 - i * 2);
      const histPos = i === 0 ? { x: f.x, y: f.y } : (f.leaderHistory[histIndex] || { x: f.x, y: f.y });
      const wobble = Math.sin(state.frame * 0.055 + i * 2.1 + f.sway) * 2.8;
      drawFormationShip(
        f.kind,
        histPos.x + ox,
        histPos.y + oy + wobble,
        shipScale,
        shipAngle
