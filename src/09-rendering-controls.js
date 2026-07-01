function drawHoldButton(rect, label, hold, threshold, baseFill, strokeMin, strokeMax) {
  const progress = clamp(hold / threshold, 0, 1);
  ctx.save();
  const fill = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
  fill.addColorStop(0, "rgba(120,255,180,0.18)");
  fill.addColorStop(0.55, baseFill);
  fill.addColorStop(1, "rgba(0,90,70,0.22)");
  ctx.fillStyle = fill;
  ctx.beginPath(); ctx.roundRect(rect.x, rect.y, rect.w, rect.h, 4); ctx.fill();
  if (hold > 0) {
    ctx.fillStyle = "rgba(120,255,180,0.22)";
    ctx.beginPath(); ctx.roundRect(rect.x, rect.y, rect.w * progress, rect.h, 4); ctx.fill();
  }
  ctx.strokeStyle = `rgba(120,255,180,${strokeMin + (strokeMax - strokeMin) * progress})`;
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(rect.x, rect.y, rect.w, rect.h, 4); ctx.stroke();
  ctx.strokeStyle = "rgba(255,255,255,0.16)";
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(rect.x + 8, rect.y + 6); ctx.lineTo(rect.x + rect.w - 8, rect.y + 6); ctx.stroke();
  ctx.fillStyle = "#fff";
  ctx.font = FONT_BUTTON;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, rect.x + rect.w / 2, rect.y + rect.h / 2 + 1);
  ctx.restore();
}
function drawSimpleButton(rect, label, stroke = "rgba(255,255,255,0.28)") {
  ctx.save();
  const glow = stroke.includes("120,255,180") || stroke.includes("255,230") || stroke.includes("120,210") || stroke.includes("255,255,255");
  if (glow) {
    ctx.shadowColor = stroke;
    ctx.shadowBlur = stroke.includes("255,255,255") ? 0 : 8;
  }
  const fill = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
  fill.addColorStop(0, "rgba(255,255,255,0.13)");
  fill.addColorStop(0.48, "rgba(255,255,255,0.060)");
  fill.addColorStop(1, "rgba(0,0,0,0.18)");
  ctx.fillStyle = fill;
  ctx.beginPath(); ctx.roundRect(rect.x, rect.y, rect.w, rect.h, 5); ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(rect.x, rect.y, rect.w, rect.h, 5); ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = "rgba(255,255,255,0.13)";
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(rect.x + 6, rect.y + 5); ctx.lineTo(rect.x + rect.w - 6, rect.y + 5); ctx.stroke();
  ctx.fillStyle = "#fff";
  ctx.font = FONT_BUTTON;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, rect.x + rect.w / 2, rect.y + rect.h / 2 + 1);
  ctx.restore();
}
function drawBookIcon(rect, active = false) {
  const cx = rect.x + rect.w / 2, cy = rect.y + rect.h / 2;
  ctx.save();
  ctx.translate(cx, cy);
  if (active) {
    ctx.shadowColor = "rgba(120,255,180,0.72)";
    ctx.shadowBlur = 10;
  }
  ctx.strokeStyle = active ? "rgba(120,255,180,0.85)" : "rgba(255,255,255,0.90)";
  ctx.fillStyle = active ? "rgba(120,255,180,0.14)" : "rgba(255,255,255,0.08)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-13, -12); ctx.lineTo(-2, -9); ctx.lineTo(-2, 12); ctx.lineTo(-13, 8); ctx.closePath();
  ctx.fill(); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(2, -9); ctx.lineTo(13, -12); ctx.lineTo(13, 8); ctx.lineTo(2, 12); ctx.closePath();
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = active ? "rgba(120,255,180,0.22)" : "rgba(255,255,255,0.14)";
  ctx.fillRect(-2, -12, 4, 24);
  ctx.shadowBlur = 0;
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
  if (active) {
    ctx.shadowColor = "rgba(120,255,180,0.65)";
    ctx.shadowBlur = 9;
  }
  ctx.strokeStyle = active ? "rgba(120,255,180,0.88)" : "rgba(255,255,255,0.82)";
  ctx.fillStyle = active ? "rgba(120,255,180,0.13)" : "rgba(255,255,255,0.075)";
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(-15, -15, 30, 30, 6); ctx.fill(); ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.beginPath(); ctx.arc(0, -5, 5.2, 0, TAU); ctx.stroke();
  ctx.beginPath(); ctx.arc(0, 12, 10, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke();
  ctx.strokeStyle = active ? "rgba(120,255,180,0.42)" : "rgba(255,255,255,0.28)";
  ctx.beginPath(); ctx.moveTo(-9, -15); ctx.lineTo(-9, 15); ctx.moveTo(9, -15); ctx.lineTo(9, 15); ctx.stroke();
  ctx.fillStyle = online ? "#78ffb4" : "rgba(255,255,255,0.45)";
  ctx.shadowColor = online ? "rgba(120,255,180,0.9)" : "transparent";
  ctx.shadowBlur = online ? 6 : 0;
  ctx.beginPath(); ctx.arc(12, -12, 4, 0, TAU); ctx.fill();
  ctx.restore();
}
function drawTrophyIcon(rect, active = false) {
  const cx = rect.x + rect.w / 2, cy = rect.y + rect.h / 2;
  ctx.save();
  ctx.translate(cx, cy);
  if (active) {
    ctx.shadowColor = "rgba(255,230,128,0.78)";
    ctx.shadowBlur = 10;
  }
  ctx.strokeStyle = active ? "rgba(255,230,128,0.95)" : "rgba(255,255,255,0.90)";
  ctx.fillStyle = active ? "rgba(255,210,80,0.22)" : "rgba(255,255,255,0.10)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-10, -13); ctx.lineTo(10, -13); ctx.lineTo(7, 4); ctx.quadraticCurveTo(0, 10, -7, 4); ctx.closePath();
  ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.arc(-13, -8, 7, Math.PI / 2, -Math.PI / 2); ctx.stroke();
  ctx.beginPath(); ctx.arc(13, -8, 7, -Math.PI / 2, Math.PI / 2); ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = active ? "rgba(255,245,180,0.74)" : "rgba(255,255,255,0.44)";
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(-5, -8); ctx.lineTo(5, -8); ctx.moveTo(-4, -3); ctx.lineTo(4, -3); ctx.stroke();
  ctx.fillStyle = active ? "rgba(255,230,128,0.80)" : "rgba(255,255,255,0.72)";
  ctx.fillRect(-3, 8, 6, 7);
  ctx.beginPath(); ctx.roundRect(-12, 15, 24, 4, 2); ctx.fill();
  ctx.restore();
}
function drawRoadIcon(rect, active = false) {
  const cx = rect.x + rect.w / 2, cy = rect.y + rect.h / 2;
  ctx.save();
  ctx.translate(cx, cy);
  if (active) {
    ctx.shadowColor = "rgba(120,255,180,0.76)";
    ctx.shadowBlur = 10;
  }
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
  ctx.shadowBlur = 0;
  ctx.fillStyle = active ? "#78ffb4" : "rgba(255,255,255,0.78)";
  ctx.beginPath();
  ctx.moveTo(13, -19);
  ctx.lineTo(8, -9);
  ctx.lineTo(13, -11);
  ctx.lineTo(18, -9);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}
function drawRecordsIcon(rect, active = false) {
  const cx = rect.x + rect.w / 2, cy = rect.y + rect.h / 2;
  ctx.save();
  ctx.translate(cx, cy);
  if (active) {
    ctx.shadowColor = "rgba(120,210,255,0.74)";
    ctx.shadowBlur = 10;
  }
  ctx.strokeStyle = active ? "rgba(120,210,255,0.95)" : "rgba(255,255,255,0.88)";
  ctx.fillStyle = active ? "rgba(120,210,255,0.17)" : "rgba(255,255,255,0.10)";
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(0, 0, 16, 0, TAU); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(0, 0, 7, 16, 0, 0, TAU); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-15, 0); ctx.lineTo(15, 0); ctx.moveTo(-11, -9); ctx.lineTo(11, -9); ctx.moveTo(-11, 9); ctx.lineTo(11, 9); ctx.stroke();
  ctx.fillStyle = active ? "#78d2ff" : "rgba(255,255,255,0.78)";
  ctx.shadowBlur = 0;
  ctx.beginPath(); ctx.arc(8, -8, 3, 0, TAU); ctx.fill();
  ctx.fillRect(-11, 14, 5, 4);
  ctx.fillRect(-3, 11, 6, 7);
  ctx.fillRect(7, 13, 5, 5);
  ctx.restore();
}
