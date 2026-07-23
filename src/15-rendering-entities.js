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
      if (typeof drawLaserBolt === "function") drawLaserBolt(b.x, b.y + 4, { width: 4, length: 14, color: "112,238,255", direction: -1, glow: 7 });
      else { ctx.fillStyle = "#fff"; ctx.fillRect(b.x - 2, b.y, 4, 10); }
    }
  }
  for (const b of state.enemyBullets) {
    if (b.kind === "boss") {
      if (typeof drawLaserBolt === "function") drawLaserBolt(b.x, b.y + 4, { width: 6, length: 15, color: "255,220,76", glow: 9 });
    } else if (b.kind === "aimed") {
      if (typeof drawLaserBolt === "function") drawLaserBolt(b.x, b.y + 4, { width: 6, length: 15, color: "255,104,222", glow: 9 });
    } else if (b.kind === "phantomShot") {
      if (typeof drawLaserBolt === "function") drawLaserBolt(b.x, b.y + 4, { width: 6, length: 15, color: "72,238,255", glow: 10 });
    } else if (b.kind === "drainShot") {
      ctx.save();
      if (b.trail && b.trail.length > 1) {
        ctx.strokeStyle = "rgba(112,255,69,0.28)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(b.trail[0].x, b.trail[0].y);
        for (let trailIndex = 1; trailIndex < b.trail.length; trailIndex++) ctx.lineTo(b.trail[trailIndex].x, b.trail[trailIndex].y);
        ctx.stroke();
      }
      ctx.shadowColor = "rgba(112,255,69,0.9)";
      ctx.shadowBlur = 10;
      ctx.fillStyle = "rgba(112,255,69,0.92)";
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r || 5, 0, TAU); ctx.fill();
      ctx.fillStyle = "rgba(220,255,200,0.7)";
      ctx.beginPath(); ctx.arc(b.x - 1.5, b.y - 1.5, 2, 0, TAU); ctx.fill();
      ctx.restore();
    } else if (b.kind === "purple") {
      if (typeof drawLaserBolt === "function") drawLaserBolt(b.x, b.y + 4, { width: 6, length: 15, color: "194,118,255", glow: 9 });
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
      if (typeof drawLaserBolt === "function") drawLaserBolt(b.x, b.y + 4, { width: 6, length: 15, color: "255,186,78", glow: 8 });
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
    if (typeof drawExpansionEnemyOverlay === "function") drawExpansionEnemyOverlay(e);
  }
}
function drawBoss() {
  const b = state.boss;
  if (!b) return;
  if (typeof drawExpansionBoss === "function" && drawExpansionBoss(b)) return;
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
    if (typeof drawBossHealthBar === "function") drawBossHealthBar(b, "#d9b6ff");
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
  if (typeof drawBossHealthBar === "function") drawBossHealthBar(b, "#63efff");
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
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = "#9ff";
    ctx.fillRect(-d.w / 2 * 1.18, -d.h / 2 * 1.18, d.w * 1.18, d.h * 1.18);
  }
  const bodyAlpha = clamp(1 - t / 120, 0, 1);
  ctx.globalAlpha = bodyAlpha;
  for (const p of d.pieces) {
    ctx.save();
    ctx.translate(p.x - d.x, p.y - d.y);
    ctx.rotate(p.rot);
    ctx.fillStyle = `rgba(255,255,255,${p.alpha})`;
    ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
    ctx.restore();
  }
  ctx.restore();
  if (t < 70 && t % 6 === 0) spawnParticles(d.x + rand(-26, 26), d.y + rand(-16, 16), 10, "#fff", 0.9);
  if (flash > 0) {
    ctx.save();
    ctx.globalAlpha = flash * 0.2;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
}
function drawPowerups() {
  for (const p of state.powerups) {
    const bob = Math.sin(state.frame * 0.12 + p.x * 0.03) * 1.4;
    const spin = Number.isFinite(p.rotation) ? p.rotation : state.frame * 0.024;
    const visual = typeof expansionPowerupVisual === "function" ? expansionPowerupVisual(p.type) : null;
    const color = p.type === "spread" ? "#55ff72" : p.type === "rapid" ? "#ffe65c" : p.type === "repair" ? "#58adff" : p.type === "wingman" || p.type === "dual" ? "#ff72ee" : visual ? visual.color : "#ff72ee";
    const label = p.type === "spread" ? "S" : p.type === "rapid" ? "R" : p.type === "repair" ? "+" : p.type === "wingman" ? "W" : p.type === "dual" ? "2" : visual ? visual.label : "?";
    ctx.save();
    ctx.translate(p.x, p.y + bob);
    const spriteKey = typeof powerupSpriteKey === "function" ? powerupSpriteKey(p.type) : "powerup";
    const pulse = 0.96 + Math.sin(state.frame * 0.09 + p.x * 0.02) * 0.025;
    const rendered = spriteKey !== "powerup" && drawSpriteAsset(ctx, spriteKey, 0, 0, { scale: pulse, rotation: spin });
    if (!rendered) {
      ctx.save();
      ctx.shadowColor = color;
      ctx.shadowBlur = 10;
      ctx.fillStyle = color;
      ctx.rotate(spin);
      ctx.beginPath();
      ctx.moveTo(0, -p.size); ctx.lineTo(p.size, 0); ctx.lineTo(0, p.size); ctx.lineTo(-p.size, 0); ctx.closePath();
      ctx.fill();
      ctx.restore();
      ctx.shadowBlur = 0;
      ctx.fillStyle = "rgba(3,6,14,0.92)";
      ctx.font = FONT_TINY;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(label, 0, 1);
    }
    ctx.restore();
  }
}
function drawParticles() {
  for (const p of state.particles) {
    ctx.fillStyle = p.color || "#fff";
    ctx.globalAlpha = Math.max(0, p.life / 32);
    ctx.fillRect(p.x, p.y, p.size, p.size);
  }
  ctx.globalAlpha = 1;
}
