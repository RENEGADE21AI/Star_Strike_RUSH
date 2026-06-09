// Star Strike RUSH legacy game part 8
// Generated from js/legacyGame.js by scripts/split-legacy-game.mjs.

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
function drawWingmen() {
  const alpha = state.player && state.player.ghostTimer > 0 ? 0.42 : 1;
  for (const w of state.wingmen) {
    ctx.save();
    ctx.translate(w.x, w.y);
    ctx.globalAlpha = alpha;
    if (state.player && state.player.ghostTimer > 0) { ctx.shadowColor = "rgba(100,255,255,0.8)"; ctx.shadowBlur = 10; }
    ctx.save();
    ctx.globalAlpha = alpha * 0.85;
    ctx.fillStyle = "rgba(0,0,0,0.22)";
    ctx.beginPath();
    ctx.roundRect(-2.6, 6.7, 5.2, 2.8, 1.0);
    ctx.fill();
    ctx.fillStyle = "rgba(120,255,200,0.48)";
    ctx.beginPath();
    ctx.moveTo(-2.3, 6.8); ctx.lineTo(0, 13.2); ctx.lineTo(2.3, 6.8); ctx.closePath(); ctx.fill();
    ctx.globalAlpha = alpha * 0.58;
    ctx.fillStyle = "rgba(235,255,245,0.32)";
    ctx.beginPath();
    ctx.moveTo(-1.1, 6.9); ctx.lineTo(0, 11.9); ctx.lineTo(1.1, 6.9); ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.fillStyle = "#f6f";
    ctx.beginPath();
    ctx.moveTo(0, -14);
    ctx.lineTo(-8, 8);
    ctx.lineTo(0, 5);
    ctx.lineTo(8, 8);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.ellipse(0, -2, 2.8, 5.2, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "rgba(120,200,255,0.9)";
    ctx.beginPath();
    ctx.ellipse(0.4, -3.2, 1.0, 2.0, -0.15, 0, TAU);
    ctx.fill();
    ctx.restore();
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  }
}
function drawBullets() {
  for (const b of state.bullets) {
    if (b.kind === "ghost") {
      ctx.save();
      ctx.shadowColor = "rgba(220,190,255,0.9)";
      ctx.shadowBlur = 10;
      ctx.fillStyle = "rgba(225,205,255,0.95)";
      ctx.beginPath();
      ctx.arc(b.x, b.y + 4, 3.4, 0, TAU);
      ctx.fill();
      ctx.restore();
    } else {
      ctx.fillStyle = "#fff";
      ctx.fillRect(b.x - 2, b.y, 4, 10);
      ctx.fillRect(b.x - 1, b.y - 2, 2, 2);
    }
  }
  for (const b of state.enemyBullets) {
    if (b.kind === "boss") {
      ctx.fillStyle = "#ff5"; ctx.fillRect(b.x - 3, b.y, 6, 10);
    } else if (b.kind === "aimed") {
      ctx.fillStyle = "#f9f"; ctx.fillRect(b.x - 3, b.y, 6, 10);
    } else if (b.kind === "phantomShot") {
      ctx.fillStyle = "#0ff"; ctx.fillRect(b.x - 3, b.y, 6, 10);
    } else if (b.kind === "purple") {
      ctx.fillStyle = "#fc5"; ctx.fillRect(b.x - 3, b.y, 6, 10);
    } else if (b.kind === "wraithPhysical" || b.kind === "wraithGhost") {
      ctx.save();
      if (b.trail && b.trail.length > 1) {
        for (let i = 1; i < b.trail.length; i++) {
          const a = b.trail[i - 1], c = b.trail[i], alpha = (i / b.trail.length) * 0.35;
          ctx.strokeStyle = b.kind === "wraithPhysical" ? `rgba(255,255,255,${alpha})` : `rgba(220,180,255,${alpha})`;
          ctx.lineWidth = i < b.trail.length - 2 ? 2 : 3;
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(c.x, c.y); ctx.stroke();
        }
      }
      if (b.kind === "wraithPhysical") {
        const wrongRealm = state.boss && state.boss.mode === "wraith" && b.realm !== state.playerRealm;
        ctx.globalAlpha = wrongRealm ? 0.35 : 0.98;
        ctx.fillStyle = wrongRealm ? "rgba(220,230,255,0.70)" : "rgba(255,255,255,0.98)";
        ctx.fillRect(b.x - 4, b.y - 2, 8, 10);
        ctx.fillRect(b.x - 2, b.y - 4, 4, 14);
        if (wrongRealm) { ctx.strokeStyle = "rgba(255,255,255,0.22)"; ctx.strokeRect(b.x - 5, b.y - 3, 10, 16); }
      } else {
        ctx.shadowColor = "rgba(220,170,255,0.9)";
        ctx.shadowBlur = 12;
        ctx.fillStyle = "rgba(220,180,255,0.88)";
        ctx.beginPath(); ctx.arc(b.x, b.y, 4.5, 0, TAU); ctx.fill();
      }
      ctx.restore();
      if (state.boss && state.boss.mode === "wraith" && b.kind === "wraithGhost" && state.boss.hp / state.boss.maxHp <= 0.4 && b.realm !== state.playerRealm) {
        ctx.save();
        ctx.globalAlpha = 0.18;
        ctx.strokeStyle = "rgba(255,255,255,0.9)";
        ctx.beginPath(); ctx.arc(b.x, b.y, 6.8, 0, TAU); ctx.stroke();
        ctx.restore();
      }
    } else {
      ctx.fillStyle = "#fc5";
      ctx.fillRect(b.x - 3, b.y, 6, 10);
    }
  }
}
function drawEnemies() {
  for (const e of state.enemies) {
    const scale = 1 + Math.min(0.12, (e.hitPulse || 0) * 0.08);
    const hitMix = clamp((e.hitFlash || 0) / 12, 0, 1);
    const typeScale = e.type === "red" ? 1.05 : 1;
    let entityAlpha = 1;
    if (e.type === "phantom") {
      entityAlpha = e.telegraphTimer > 0
        ? clamp(0.42 + Math.sin((state.frame + (e.flickerSeed || 0)) * 0.8) * 0.22, 0.2, 0.64)
        : (e.stateMode === "ghost" ? 0.42 : 1);
    }
    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.scale(scale * typeScale, scale * typeScale);
    const dx = e.x - (e.prevX || e.x);
    const dy = e.y - (e.prevY || e.y);
    const bank = clamp(dx * 0.06, -0.28, 0.28);
    const sway = Math.sin(state.frame * 0.10 + e.loopPhase) * 0.05;
    ctx.rotate((e.escape ? bank : -bank) + sway);
    if (!e.escape) ctx.scale(1, -1);
    drawEnemyGeometry(e.type, {
      hitMix,
      alpha: entityAlpha,
      silhouette: false,
      stateMode: e.stateMode || "physical",
      telegraph: e.telegraphTimer || 0,
      realm: e.realm || 0,
      phase: e.loopPhase,
      chargeTelegraph: e.chargeTelegraph || 0
    });
    if (e.type === "purple" && e.warn > 0) {
      ctx.save();
      ctx.strokeStyle = "rgba(255,255,255,0.8)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, (e.r || 17) + 4, 0, TAU);
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }
}
function drawBoss() {
  const b = state.boss;
  if (!b) return;
  if (b.mode === "wraith") {
    const hpPct = b.hp / b.maxHp;
    const alphaBase = 0.50 + (1 - hpPct) * 0.18;
    const flicker = b.shiftTelegraph > 0 ? (0.35 + Math.sin(state.frame * 0.8) * 0.25) : 1;
    const visibleAlpha = alphaBase * flicker;
    const wobble = Math.sin(state.frame * 0.045 + b.movePhase) * 2.2;
    const tilt = Math.sin(state.frame * 0.02 + b.movePhase) * 0.04;
    ctx.save();
    ctx.translate(b.x, b.y + wobble);
    ctx.rotate(tilt);
    drawBossWraithShip(false, visibleAlpha, b.realm, b.chargeTelegraph);
    ctx.restore();
    for (let i = 0; i < 4; i++) {
      const ang = state.frame * 0.05 + i * 1.5;
      const r = 62 + Math.sin(state.frame * 0.04 + i) * 4;
      const px = b.x + Math.cos(ang) * r;
      const py = b.y + Math.sin(ang) * 8 + wobble;
      ctx.save();
      ctx.globalAlpha = 0.22;
      ctx.strokeStyle = i === 0 ? "rgba(200,235,255,0.8)" : i === 1 ? "rgba(200,170,255,0.8)" : "rgba(255,255,255,0.6)";
      ctx.beginPath(); ctx.arc(px, py, 5 + (i % 2) * 2, 0, TAU); ctx.stroke();
      ctx.restore();
    }
    const barW = Math.min(320, W - 40), barX = (W - barW) / 2, barY = 16;
    ctx.fillStyle = "rgba(255,255,255,0.16)";
    ctx.fillRect(barX, barY, barW, 10);
    ctx.fillStyle = "#f44";
    ctx.fillRect(barX, barY, barW * hpPct, 10);
    ctx.strokeStyle = "#fff";
    ctx.strokeRect(barX, barY, barW, 10);
    if (b.shiftTelegraph > 0) {
      ctx.save();
      ctx.globalAlpha = 0.9;
      ctx.font = FONT_SUBTITLE;
      const t = "REALM SHIFT";
      const tw = ctx.measureText(t).width;
      ctx.fillStyle = "#fff";
      ctx.fillText(t, (W - tw) / 2, 46);
      ctx.restore();
    }
    return;
  }
  const hpPct = b.hp / b.maxHp;
  const bob = Math.sin(state.frame * 0.05 + b.step) * 1.4;
  const tilt = Math.sin(state.frame * 0.03) * 0.02;
  ctx.save();
  ctx.translate(b.x, b.y + bob);
  ctx.rotate(tilt);
  drawBossStandardShip(false, 1);
  ctx.restore();
  for (let i = 0; i < 4; i++) {
    const ang = state.frame * 0.05 + i * 1.5;
    const r = 62 + Math.sin(state.frame * 0.04 + i) * 4;
    const px = b.x + Math.cos(ang) * r;
    const py = b.y + Math.sin(ang) * 8 + bob;
    ctx.save();
    ctx.globalAlpha = 0.22;
    ctx.strokeStyle = i === 0 ? "rgba(200,235,255,0.8)" : i === 1 ? "rgba(200,170,255,0.8)" : "rgba(255,255,255,0.6)";
    ctx.beginPath(); ctx.arc(px, py, 5 + (i % 2) * 2, 0, TAU); ctx.stroke();
    ctx.restore();
  }
  const barW = Math.min(320, W - 40), barX = (W - barW) / 2, barY = 16;
  ctx.fillStyle = "rgba(255,255,255,0.16)";
  ctx.fillRect(barX, barY, barW, 10);
  ctx.fillStyle = "#f44";
  ctx.fillRect(barX, barY, barW * hpPct, 10);
  ctx.strokeStyle = "#fff";
  ctx.strokeRect(barX, barY, barW, 10);
}
function drawBossDeath() {
  const d = state.bossDeath; if (!d) return;
  const t = d.timer;
  const flash = t < 30 ? 1 - t / 30 : 0;
  ctx.save();
  ctx.translate(d.x, d.y);
  if (t < 24) {
    const s = 1.0 + t * 0.04;
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = "#fff";
    ctx.fillRect(-d.w / 2 * s, -d.h / 2 * s, d.w * s, d.h * s);
