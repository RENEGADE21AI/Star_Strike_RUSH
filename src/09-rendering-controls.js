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

function drawEnginePlume(x, y, options = {}) {
  const plumeScale = Math.max(0.2, Number(options.scale || 1));
  const alpha = options.alpha == null ? 1 : clamp(options.alpha, 0, 1);
  const color = options.color || "120,246,255";
  const pulse = 0.82 + Math.sin(state.frame * 0.34 + Number(options.phase || 0)) * 0.18;
  const length = 13 * plumeScale * pulse;
  const width = 4.5 * plumeScale;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Number(options.rotation || 0));
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = alpha;
  ctx.shadowColor = `rgba(${color},0.9)`;
  ctx.shadowBlur = 8 * plumeScale;
  const glow = ctx.createLinearGradient(0, 0, 0, length);
  glow.addColorStop(0, "rgba(255,255,255,0.92)");
  glow.addColorStop(0.32, `rgba(${color},0.78)`);
  glow.addColorStop(1, `rgba(${color},0)`);
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.moveTo(-width, 0);
  ctx.quadraticCurveTo(0, length * 0.82, 0, length);
  ctx.quadraticCurveTo(0, length * 0.82, width, 0);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawLaserBolt(x, y, options = {}) {
  const width = Math.max(2, Number(options.width || 4));
  const length = Math.max(6, Number(options.length || 12));
  const color = options.color || "120,238,255";
  const direction = Number(options.direction || 1) >= 0 ? 1 : -1;
  ctx.save();
  ctx.translate(x, y);
  ctx.globalCompositeOperation = "lighter";
  ctx.shadowColor = `rgba(${color},0.92)`;
  ctx.shadowBlur = Number(options.glow || 8);
  const beam = ctx.createLinearGradient(0, -length / 2 * direction, 0, length / 2 * direction);
  beam.addColorStop(0, `rgba(${color},0)`);
  beam.addColorStop(0.35, `rgba(${color},0.84)`);
  beam.addColorStop(0.68, "rgba(255,255,255,0.98)");
  beam.addColorStop(1, `rgba(${color},0.16)`);
  ctx.fillStyle = beam;
  ctx.beginPath(); ctx.roundRect(-width / 2, -length / 2, width, length, width / 2); ctx.fill();
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = "rgba(255,255,255,0.88)";
  ctx.fillRect(-Math.max(0.7, width * 0.18), -length * 0.26, Math.max(1.4, width * 0.36), length * 0.52);
  ctx.restore();
}

function drawBossAura(x, y, width, color) {
  ctx.save();
  const pulse = 0.5 + 0.5 * Math.sin(state.frame * 0.055);
  const radius = Math.max(52, width * 0.48);
  const aura = ctx.createRadialGradient(x, y, radius * 0.16, x, y, radius);
  aura.addColorStop(0, `${color}2e`);
  aura.addColorStop(0.5, `${color}${Math.round(18 + pulse * 12).toString(16).padStart(2, "0")}`);
  aura.addColorStop(1, `${color}00`);
  ctx.fillStyle = aura;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function drawBossHealthBar(boss, color = "#ff455c") {
  if (!boss) return;
  const hpPct = clamp(Number(boss.hp || 0) / Math.max(1, Number(boss.maxHp || 1)), 0, 1);
  const combatActive = typeof bossCanTakeDamage !== "function" || bossCanTakeDamage(boss);
  const key = boss.mode === "standard" ? "boss_standard" : boss.mode === "wraith" ? "boss_wraith" : `boss_${boss.mode}`;
  const meta = typeof getCodexMeta === "function" ? getCodexMeta(key) : null;
  const label = String((meta && meta.name) || boss.mode || "BOSS").replace(/_/g, " ").toUpperCase();
  const barW = Math.min(320, W - 36);
  const x = (W - barW) / 2;
  const y = 7;
  ctx.save();
  ctx.fillStyle = "rgba(3,6,14,0.88)";
  ctx.beginPath(); ctx.roundRect(x - 5, y, barW + 10, 27, 5); ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.beginPath(); ctx.roundRect(x - 5, y, barW + 10, 27, 5); ctx.stroke();
  ctx.font = "900 8px 'Arial Narrow', Arial, sans-serif";
  ctx.textBaseline = "top";
  ctx.textAlign = "left";
  ctx.fillStyle = "rgba(255,255,255,0.78)";
  ctx.fillText(label.slice(0, 24), x, y + 4);
  ctx.textAlign = "right";
  ctx.fillStyle = hpPct <= 0.25 ? "#ff9b9b" : "rgba(255,255,255,0.55)";
  ctx.fillText(combatActive ? `${Math.ceil(hpPct * 100)}%` : "STAGING", x + barW, y + 4);
  const barY = y + 16;
  ctx.fillStyle = "rgba(255,255,255,0.10)";
  ctx.fillRect(x, barY, barW, 7);
  const fill = ctx.createLinearGradient(x, 0, x + barW, 0);
  fill.addColorStop(0, color);
  fill.addColorStop(1, "#fff3ad");
  ctx.fillStyle = fill;
  ctx.shadowColor = color;
  ctx.shadowBlur = hpPct <= 0.25 ? 10 : 5;
  ctx.globalAlpha = combatActive ? 1 : 0.42;
  ctx.fillRect(x, barY, barW * hpPct, 7);
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;
  ctx.strokeStyle = "rgba(255,255,255,0.45)";
  ctx.strokeRect(x, barY, barW, 7);
  for (let segment = 1; segment < 4; segment++) {
    const sx = x + barW * segment / 4;
    ctx.fillStyle = "rgba(3,6,14,0.72)";
    ctx.fillRect(sx - 1, barY, 2, 7);
  }
  ctx.restore();
}
function drawUiAssetIcon(key, rect, active = false, accent = "120,210,255") {
  if (typeof drawSpriteAsset !== "function") return false;
  const cx = rect.x + rect.w / 2;
  const cy = rect.y + rect.h / 2;
  ctx.save();
  if (active) {
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = `rgba(${accent},0.13)`;
    ctx.shadowColor = `rgba(${accent},0.85)`;
    ctx.shadowBlur = 12;
    ctx.beginPath(); ctx.arc(cx, cy, Math.min(rect.w, rect.h) * 0.52, 0, TAU); ctx.fill();
  }
  ctx.restore();
  return drawSpriteAsset(ctx, key, cx, cy, {
    glow: false,
    alpha: active ? 1 : 0.88,
    filter: active ? `brightness(1.18) drop-shadow(0 0 5px rgba(${accent},0.72))` : "brightness(0.92)"
  });
}
function drawBookIcon(rect, active = false) {
  const cx = rect.x + rect.w / 2, cy = rect.y + rect.h / 2;
  if (drawUiAssetIcon("ui_codex", rect, active, "120,255,180")) {
    if (codexHasNew) {
      ctx.save();
      ctx.fillStyle = "#ff4e5e";
      ctx.shadowColor = "rgba(255,50,70,0.95)";
      ctx.shadowBlur = 7;
      ctx.beginPath(); ctx.arc(rect.x + rect.w - 4, rect.y + 4, 4, 0, TAU); ctx.fill();
      ctx.restore();
    }
    return;
  }
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
function drawAccountIcon(rect, active = false) {
  const cx = rect.x + rect.w / 2, cy = rect.y + rect.h / 2;
  const online = !!(window.starStrikeOnline && window.starStrikeOnline.getState().user);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.strokeStyle = active ? "rgba(120,255,180,0.88)" : "rgba(255,255,255,0.88)";
  ctx.fillStyle = active ? "rgba(120,255,180,0.16)" : "rgba(255,255,255,0.10)";
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(0, -7, 7, 0, TAU); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.roundRect(-13, 5, 26, 15, 8); ctx.fill(); ctx.stroke();
  ctx.fillStyle = online ? "#78ffb4" : "rgba(255,255,255,0.45)";
  ctx.shadowColor = online ? "rgba(120,255,180,0.9)" : "transparent";
  ctx.shadowBlur = online ? 6 : 0;
  ctx.beginPath(); ctx.arc(12, -12, 4, 0, TAU); ctx.fill();
  ctx.restore();
}
function drawTrophyIcon(rect, active = false) {
  if (drawUiAssetIcon("ui_trophy", rect, active, "255,224,118")) return;
  const cx = rect.x + rect.w / 2, cy = rect.y + rect.h / 2;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.strokeStyle = active ? "rgba(255,230,128,0.95)" : "rgba(255,255,255,0.90)";
  ctx.fillStyle = active ? "rgba(255,210,80,0.22)" : "rgba(255,255,255,0.10)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-10, -13); ctx.lineTo(10, -13); ctx.lineTo(7, 4); ctx.quadraticCurveTo(0, 10, -7, 4); ctx.closePath();
  ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.arc(-13, -8, 7, Math.PI / 2, -Math.PI / 2); ctx.stroke();
  ctx.beginPath(); ctx.arc(13, -8, 7, -Math.PI / 2, Math.PI / 2); ctx.stroke();
  ctx.fillStyle = active ? "rgba(255,230,128,0.80)" : "rgba(255,255,255,0.72)";
  ctx.fillRect(-3, 8, 6, 7);
  ctx.beginPath(); ctx.roundRect(-12, 15, 24, 4, 2); ctx.fill();
  ctx.restore();
}
function drawRoadIcon(rect, active = false) {
  if (drawUiAssetIcon("ui_road", rect, active, "120,255,180")) return;
  const cx = rect.x + rect.w / 2, cy = rect.y + rect.h / 2;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.strokeStyle = active ? "rgba(120,255,180,0.92)" : "rgba(255,255,255,0.88)";
  ctx.fillStyle = active ? "rgba(120,255,180,0.16)" : "rgba(255,255,255,0.10)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-14, 16);
  ctx.bezierCurveTo(-8, 6, -10, -4, -2, -10);
  ctx.bezierCurveTo(6, -16, 9, -5, 14, -15);
  ctx.stroke();
  for (let i = 0; i < 4; i++) {
    const x = -13 + i * 9;
    const y = 13 - i * 8;
    ctx.beginPath();
    ctx.arc(x, y, i === 3 ? 4 : 3, 0, TAU);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}
function drawRecordsIcon(rect, active = false) {
  if (drawUiAssetIcon("ui_world", rect, active, "120,210,255")) return;
  const cx = rect.x + rect.w / 2, cy = rect.y + rect.h / 2;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.strokeStyle = active ? "rgba(120,210,255,0.95)" : "rgba(255,255,255,0.88)";
  ctx.fillStyle = active ? "rgba(120,210,255,0.17)" : "rgba(255,255,255,0.10)";
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(0, 0, 16, 0, TAU); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(0, 0, 7, 16, 0, 0, TAU); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-15, 0); ctx.lineTo(15, 0); ctx.moveTo(-11, -9); ctx.lineTo(11, -9); ctx.moveTo(-11, 9); ctx.lineTo(11, 9); ctx.stroke();
  ctx.fillStyle = active ? "#78d2ff" : "rgba(255,255,255,0.78)";
  ctx.beginPath(); ctx.arc(8, -8, 3, 0, TAU); ctx.fill();
  ctx.restore();
}
