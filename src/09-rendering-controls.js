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
