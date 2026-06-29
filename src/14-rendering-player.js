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
}
function drawPlayer() {
  const p = state.player;
  if (state.gameState !== "playing" && state.gameState !== "gameover") return;
  const tilt = clamp(p.vx / 80, -0.06, 0.06);
  const bob = Math.sin(state.frame * 0.18 + p.x * 0.02) * 0.6;

  function drawCockpit(styleMode, sx = 1, sy = 1) {
    const c1 = styleMode === "normal" ? "rgba(255,255,255,0.95)" : styleMode === "ghost" ? "rgba(235,215,255,0.95)" : "rgba(235,250,255,0.95)";
    const c3 = styleMode === "normal" ? "rgba(255,255,255,0.36)" : "rgba(255,255,255,0.26)";
    ctx.fillStyle = c1;
    ctx.beginPath();
    ctx.ellipse(0, -3 * sy, 4.0 * sx, 7.0 * sy, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = c3;
    ctx.beginPath();
    ctx.ellipse(0.9 * sx, -5.7 * sy, 0.75 * sx, 1.8 * sy, -0.18, 0, TAU);
    ctx.fill();
  }
  function drawPlayerHull(coreColor, wingColor, finGlow = 0.18) {
    ctx.shadowColor = `rgba(140,220,255,${finGlow})`;
    ctx.shadowBlur = 7;
    ctx.fillStyle = wingColor;
    ctx.beginPath();
    ctx.moveTo(-5, 6);
    ctx.lineTo(-18, 8);
    ctx.lineTo(-13, 12);
    ctx.lineTo(-6, 10);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(5, 6);
    ctx.lineTo(18, 8);
    ctx.lineTo(13, 12);
    ctx.lineTo(6, 10);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-4, 8);
    ctx.lineTo(-10, 12);
    ctx.lineTo(-4, 11);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(4, 8);
    ctx.lineTo(10, 12);
    ctx.lineTo(4, 11);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = coreColor;
    ctx.beginPath();
    ctx.moveTo(0, -18);
    ctx.lineTo(-12, 14);
    ctx.lineTo(0, 9);
    ctx.lineTo(12, 14);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "rgba(0,0,0,0.26)";
    ctx.beginPath();
    ctx.roundRect(-2.5, 8.8, 5.0, 1.8, 0.8);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.beginPath();
    ctx.roundRect(-1.1, 9.2, 2.2, 0.9, 0.5);
    ctx.fill();
  }
  function drawExhaust(alpha = 1, core = "rgba(120,255,200,0.9)", inner = "rgba(235,255,245,0.65)") {
    const flame = 10.8 + Math.sin(state.frame * 0.35) * 1.7;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.moveTo(-4.5, 8.4);
    ctx.lineTo(0, 8.4 + flame);
    ctx.lineTo(4.5, 8.4);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = alpha * 0.56;
    ctx.fillStyle = inner;
    ctx.beginPath();
    ctx.moveTo(-2.0, 8.1);
    ctx.lineTo(0, 8.1 + flame * 0.74);
    ctx.lineTo(2.0, 8.1);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = alpha * 0.32;
    ctx.fillStyle = "rgba(255,255,255,0.20)";
    ctx.fillRect(-1.0, 8.1, 2.0, flame * 0.55);
    ctx.globalAlpha = alpha * 0.12;
    ctx.fillStyle = "rgba(255,255,255,0.16)";
    ctx.fillRect(-1.8, 7.9, 3.6, 1.2);
    ctx.restore();
  }

  if (isWraithActive()) {
    const normal = state.playerRealm === 0;
    ctx.save();
    ctx.translate(p.x, p.y + bob);
    ctx.rotate(tilt);

    const bodyAlpha = normal ? 0.72 : 0.42;
    const outlineAlpha = normal ? 0.11 : 0.09;
    ctx.globalAlpha = bodyAlpha;
    ctx.shadowColor = normal ? "rgba(190,230,255,0.32)" : "rgba(210,170,255,0.28)";
    ctx.shadowBlur = 8;

    ctx.save();
    ctx.globalAlpha = bodyAlpha * 0.42;
    ctx.translate(-2, 2);
    drawExhaust(
      normal ? 0.40 : 0.30,
      normal ? "rgba(120,255,200,0.52)" : "rgba(225,205,255,0.34)",
      normal ? "rgba(255,255,255,0.28)" : "rgba(255,255,255,0.18)"
    );
    drawPlayerHull(
      normal ? "rgba(235,246,250,0.78)" : "rgba(218,200,240,0.68)",
      normal ? "rgba(68,104,114,0.62)" : "rgba(122,118,146,0.58)",
      outlineAlpha
    );
    drawCockpit(normal ? "normal" : "ghost", 0.77, 0.75);
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = bodyAlpha;
    drawExhaust(
      normal ? 0.54 : 0.40,
      normal ? "rgba(120,255,200,0.60)" : "rgba(225,205,255,0.42)",
      normal ? "rgba(255,255,255,0.34)" : "rgba(255,255,255,0.22)"
    );
    drawPlayerHull(
      normal ? "rgba(238,248,252,0.82)" : "rgba(220,204,242,0.72)",
      normal ? "rgba(74,112,122,0.72)" : "rgba(128,124,152,0.64)",
      outlineAlpha + 0.03
    );
    drawCockpit(normal ? "normal" : "ghost", 0.79, 0.77);
    ctx.restore();

    ctx.globalAlpha = bodyAlpha * 0.88;
    ctx.fillStyle = normal ? "rgba(120,220,255,0.36)" : "rgba(220,190,255,0.28)";
    ctx.beginPath(); ctx.moveTo(-9, 10); ctx.lineTo(-17, 16); ctx.lineTo(-7, 12); ctx.fill();
    ctx.beginPath(); ctx.moveTo(9, 10); ctx.lineTo(17, 16); ctx.lineTo(7, 12); ctx.fill();

    ctx.restore();
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
    return;
  }

  if (p.ghostTimer > 0) {
    ctx.save();
    ctx.translate(p.x, p.y + bob);
    ctx.rotate(tilt);
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = 0.20;
    ctx.shadowColor = "rgba(80,255,255,0.9)";
    ctx.shadowBlur = 32;
    ctx.fillStyle = "rgba(100,240,255,0.35)";
    ctx.beginPath();
    ctx.ellipse(0, -2, 17, 20, 0, 0, TAU);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(p.x, p.y + bob);
    ctx.rotate(tilt);
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 0.46;
    ctx.shadowColor = "rgba(80,255,255,0.75)";
    ctx.shadowBlur = 14;
    drawExhaust(0.72, "rgba(120,255,255,0.85)", "rgba(200,255,255,0.50)");
    drawPlayerHull("rgba(180,255,255,0.90)", "rgba(80,180,200,0.62)", 0.22);
    drawCockpit("ghost", 0.80, 0.78);
    ctx.restore();

    ctx.save();
    ctx.translate(p.x, p.y + bob);
    ctx.rotate(tilt);
    ctx.globalCompositeOperation = "source-over";
    ctx.strokeStyle = "rgba(120,255,255,0.12)";
    ctx.lineWidth = 1;
    for (let scanY = -22; scanY <= 22; scanY += 3) {
      ctx.beginPath(); ctx.moveTo(-22, scanY); ctx.lineTo(22, scanY); ctx.stroke();
    }
    ctx.restore();

    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.shadowColor = "rgba(80,255,255,1.0)";
    ctx.shadowBlur = 8;
    for (let i = 0; i < 6; i++) {
      const ang = state.frame * 0.09 + i * (TAU / 6);
      const r = 13 + Math.sin(state.frame * 0.13 + i * 1.7) * 4;
      const mx = p.x + Math.cos(ang) * r;
      const my = p.y + bob + Math.sin(ang) * r * 0.45;
      ctx.globalAlpha = clamp(0.35 + Math.sin(state.frame * 0.18 + i * 2.1) * 0.25, 0.1, 0.65);
      ctx.fillStyle = "rgba(160,255,255,1.0)";
      ctx.beginPath();
      ctx.arc(mx, my, 1.6, 0, TAU);
      ctx.fill();
    }
    ctx.restore();

    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    ctx.shadowBlur = 0;
    return;
  }

  const blink = p.inv > 0 && Math.floor(state.frame / 5) % 2 === 0;
  if (blink) return;

  ctx.save();
  ctx.translate(p.x, p.y + bob);
  ctx.rotate(tilt);
  drawExhaust(1, "rgba(120,255,200,0.96)", "rgba(235,255,245,0.68)");
  drawPlayerHull("#2ef", "#1b6670", 0.20);
  ctx.fillStyle = "#9ff";
  drawCockpit("normal", 0.80, 0.78);
  ctx.restore();
}
