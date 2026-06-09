// Star Strike RUSH legacy game part 3
// Generated from js/legacyGame.js by scripts/split-legacy-game.mjs.
// Do not edit generated part files directly.

    base.cycleTimer = (extra.cycleTimer != null) ? extra.cycleTimer : rand(0, phantomCycleDuration(base.stateMode));
    base.telegraphTimer = extra.telegraphTimer || 0;
    base.fireTimer = (extra.fireTimer != null) ? extra.fireTimer : rand(24, 72);
    base.phaseOffset = rand(0, TAU);
    base.flickerSeed = rand(0, 9999);
    base.entryFrames = extra.bossSpawn ? 0 : 6;
  }
  state.enemies.push(Object.assign(base, extra));
  discoverCodex(type);
}
function calculateThreatScore() {
  let score = 0;
  for (const e of state.enemies) {
    if (e.type === "red") score += ENEMY_DATA.red.threat;
    else if (e.type === "orange") score += ENEMY_DATA.orange.threat;
    else if (e.type === "purple") score += ENEMY_DATA.purple.threat;
    else if (e.type === "phantom") score += ENEMY_DATA.phantom.threat;
    else score += 1.0;
  }
  for (const b of state.enemyBullets) score += (b.kind === "boss" || b.kind === "wraithPhysical" || b.kind === "wraithGhost") ? 0.22 : 0.18;
  score += state.pendingSpawns.length * 0.22;
  if (state.boss) score += state.boss.mode === "wraith" ? 5.5 : 4.5;
  if (state.bossDeath) score += 1.0;
  return score;
}
function fireAngle(x, y, angle, speed, kind = "purple") { fireEnemyBullet(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, kind); }
function fireAimedBurst(fromX, fromY, targetX, targetY, count, spreadDeg, speed, kind = "boss") {
  const base = Math.atan2(targetY - fromY, targetX - fromX);
  const spread = spreadDeg * Math.PI / 180;
  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0 : (i / (count - 1)) * 2 - 1;
    fireAngle(fromX, fromY, base + t * spread, speed, kind);
  }
}

function updatePlayer() {
  const p = state.player;
  const input = currentInputVector();
  const desiredVX = input.x * p.maxSpeed;
  const desiredVY = input.y * p.maxSpeed;
  const steer = p.ghostTimer > 0 ? 0.11 : 0.16;
  p.vx += (desiredVX - p.vx) * steer;
  p.vy += (desiredVY - p.vy) * steer;
  const speedCap = p.ghostTimer > 0 ? p.maxSpeed * 1.5 : p.maxSpeed;
  const v = Math.hypot(p.vx, p.vy);
  if (v > speedCap) { p.vx = (p.vx / v) * speedCap; p.vy = (p.vy / v) * speedCap; }
  p.x += p.vx; p.y += p.vy;
  const minY = H * 0.60, maxY = H - 28;
  if (p.x < 20) { p.x = 20; p.vx = 0; }
  if (p.x > W - 20) { p.x = W - 20; p.vx = 0; }
  if (p.y < minY) { p.y = minY; p.vy = 0; }
  if (p.y > maxY) { p.y = maxY; p.vy = 0; }
  if (p.inv > 0) p.inv--;
  if (p.fire > 0) p.fire--;
  if (p.spread > 0) p.spread--;
  if (p.rapid > 0) p.rapid--;
  if (p.ghostTimer > 0) p.ghostTimer--;
  if (p.ghostCooldown > 0) p.ghostCooldown--;
  const regen = state.intensityPhase === "cooldown" ? 7.2 / 60 : state.intensityPhase === "surge" ? 4.2 / 60 : 5 / 60;
  p.energy = clamp(p.energy + regen, 0, p.maxEnergy);
  firePlayer();
}
function firePlayer() {
  const p = state.player;
  const cooldown = p.rapid > 0 ? 10 : 14;
  if (p.fire > 0) return;
  const kind = getPlayerShotKind();
  const tipX = p.x, tipY = p.y - 16;
  if (p.spread > 0) {
    const spreadY = p.y - 15.7;
    state.bullets.push({ x: p.x - 11, y: spreadY, vx: -2.3, vy: -8.6, life: 90, r: 3, kind, realm: state.playerRealm, damage: 0.75 });
    state.bullets.push({ x: p.x, y: spreadY, vx: 0, vy: -9.0, life: 90, r: 3, kind, realm: state.playerRealm, damage: 1 });
    state.bullets.push({ x: p.x + 11, y: spreadY, vx: 2.3, vy: -8.6, life: 90, r: 3, kind, realm: state.playerRealm, damage: 0.75 });
    state.difficulty.shotsFired += 3;
  } else {
    state.bullets.push({ x: p.x, y: p.y - 16, vx: 0, vy: -9.0, life: 90, r: 3, kind, realm: state.playerRealm, damage: 1 });
    state.difficulty.shotsFired += 1;
  }
  if (p.rapid > 0) spawnRapidFireMuzzleParticles(tipX, tipY);
  p.fire = cooldown;
}
function updateWingmen() {
  if (!state.wingmen.length) return;
  const p = state.player;
  for (let i = state.wingmen.length - 1; i >= 0; i--) {
    const w = state.wingmen[i];
    w.timer--; w.fire--;
    w.x += (p.x + w.side * 30 - w.x) * 0.22;
    w.y += (p.y + 2 - w.y) * 0.22;
    if (w.timer <= 0) { state.wingmen.splice(i, 1); continue; }
    fireWingman(w);
  }
}
function updateBullets() {
  const p = state.player;
  for (const b of state.bullets) { b.x += b.vx; b.y += b.vy; b.life--; if (b.x < -20 || b.x > W + 20) b.life = 0; }
  for (const b of state.enemyBullets) {
    if (b.kind === "wraithPhysical" || b.kind === "wraithGhost") {
      b.age = (b.age || 0) + 1;
      b.trail = b.trail || [];
      b.trail.push({ x: b.x, y: b.y });
      if (b.trail.length > 8) b.trail.shift();
      if (b.seed != null) {
        b.vx += Math.sin((state.frame + b.seed) * 0.045) * 0.015;
        b.vy += Math.cos((state.frame + b.seed) * 0.035) * 0.006;
        const sp = Math.hypot(b.vx, b.vy);
        if (sp > b.maxSpeed) { b.vx = (b.vx / sp) * b.maxSpeed; b.vy = (b.vy / sp) * b.maxSpeed; }
      }
    }
    b.x += b.vx || 0; b.y += b.vy || 0; b.life--;
    const canInteract = b.realm == null || b.realm === state.playerRealm;
    if (canInteract && !b.nearMissed && state.gameState === "playing") {
      const d = Math.hypot(b.x - p.x, b.y - p.y);
      if (d > 14 && d < 22) {
        b.nearMissed = true;
        p.energy = clamp(p.energy + 0.8, 0, p.maxEnergy);
        spawnParticles(b.x, b.y, 4, "#aaf", 0.6);
      }
    }
    if (b.x < -40 || b.x > W + 40 || b.y > H + 40) b.life = 0;
  }
  state.bullets = state.bullets.filter(b => b.life > 0 && b.y > -40);
  state.enemyBullets = state.enemyBullets.filter(b => b.life > 0);
}
function spawnBossAdds() {
  const b = state.boss; if (!b) return;
  if (state.enemies.length > 12 + state.phase) return;
  const mouthX = b.x, mouthY = b.y + b.h / 2 + 6;
  const lane = laneIndexFromX(b.x);
  const patterns = state.phase < 3 ? ["red"] : state.phase < 5 ? ["red", "orange"] : ["red", "orange", "purple"];
  const type1 = patterns[Math.floor(Math.random() * patterns.length)];
  const lane1 = chooseLane([lane]);
  spawnEnemy(type1, mouthX, mouthY, {
    bossSpawn: true, spawnMode: "boss", spawnPhase: "emerge", spawnTimer: 18, launchTimer: 12,
    spawnOriginX: mouthX, spawnOriginY: mouthY, spawnTargetX: laneX(lane1), spawnTargetY: mouthY + 72, recover: 28
  });
  if (state.phase >= 4 && Math.random() < 0.55) {
    const lane2 = chooseLane([lane, lane1]);
    const type2 = patterns[Math.floor(Math.random() * patterns.length)];
    spawnEnemy(type2, mouthX, mouthY, {
      bossSpawn: true, spawnMode: "boss", spawnPhase: "emerge", spawnTimer: 18, launchTimer: 12,
      spawnOriginX: mouthX, spawnOriginY: mouthY, spawnTargetX: laneX(lane2), spawnTargetY: mouthY + 82, recover: 28
    });
  }
  spawnParticles(b.x, b.y + b.h / 2 + 10, 14, "#fff", 0.7);
}
function phantomCycleDuration(mode) { return mode === "physical" ? 132 : 78; }
function fireWraithBullet(fromX, fromY, angle, speed, realm, driftSeed = 0) {
  const kind = realm === 0 ? "wraithPhysical" : "wraithGhost";
  const cost = enemyBulletCost(kind);
  if (state.enemyBullets.length >= 54) return;
  if (!canSpendBulletBudget(cost)) return;
  spendBulletBudget(cost);
  state.enemyBullets.push({
    x: fromX, y: fromY,
    vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
    kind, realm,
    life: realm === 0 ? 220 : 200,
    r: realm === 0 ? 4 : 5, damage: 1, age: 0,
    seed: driftSeed || Math.random() * 9999, trail: [],
    maxSpeed: realm === 0 ? 6.0 : 5.4
  });
}
function fireWraithVolley(boss) {
  const p = state.player;
  const from = { x: boss.x, y: boss.y + 10 };
  const mainRealm = state.playerRealm, offRealm = 1 - mainRealm;
  const hpPct = boss.hp / boss.maxHp;
  const total = hpPct > 0.68 ? 9 : hpPct > 0.38 ? 12 : 15;
  const mainCount = Math.max(2, Math.round(total * 0.75));
  const offCount = Math.max(1, total - mainCount);
  const base = Math.atan2(p.y - from.y, p.x - from.x);
  if (boss.realm === 0) {
    const spread = 24 * Math.PI / 180;
    for (let i = 0; i < mainCount; i++) {
      const t = mainCount === 1 ? 0 : (i / (mainCount - 1)) * 2 - 1;
      fireWraithBullet(from.x, from.y, base + t * spread, 4.1, mainRealm, state.frame + i);
    }
    for (let i = 0; i < offCount; i++) {
      const t = offCount === 1 ? 0 : (i / (offCount - 1)) * 2 - 1;
      fireWraithBullet(from.x, from.y, base + t * (14 * Math.PI / 180) + 0.06, 3.0, offRealm, state.frame + 100 + i);
    }
  } else {
    const spread = 18 * Math.PI / 180;
    for (let i = 0; i < mainCount; i++) {
      const t = mainCount === 1 ? 0 : (i / (mainCount - 1)) * 2 - 1;
      fireWraithBullet(from.x, from.y, base + t * spread, 3.7, mainRealm, state.frame + i);
    }
    for (let i = 0; i < offCount; i++) {
      const t = offCount === 1 ? 0 : (i / (offCount - 1)) * 2 - 1;
      fireWraithBullet(from.x, from.y, base + t * (12 * Math.PI / 180) - 0.05, 3.0, offRealm, state.frame + 100 + i);
    }
  }
  boss.corePulse = (boss.corePulse || 0) + 0.22;
  kickShake(3);
}
function fireWraithCharge(boss) {
  const p = state.player;
  const from = { x: boss.x, y: boss.y + 10 };
  const currentRealm = state.playerRealm, offRealm = 1 - currentRealm;
  const hpPct = boss.hp / boss.maxHp;
  const total = hpPct > 0.38 ? 12 : 14;
  const mainCount = total - 3;
  const base = Math.atan2(p.y - from.y, p.x - from.x);
  const mainSpread = 16 * Math.PI / 180;
  const offSpread = 8 * Math.PI / 180;
  for (let i = 0; i < mainCount; i++) {
    const t = mainCount === 1 ? 0 : (i / (mainCount - 1)) * 2 - 1;
    fireWraithBullet(from.x, from.y, base + t * mainSpread, currentRealm === 0 ? 4.7 : 4.0, currentRealm, state.frame + 200 + i);
  }
  for (let i = 0; i < 3; i++) {
    const t = 3 === 1 ? 0 : (i / 2) * 2 - 1;
    fireWraithBullet(from.x, from.y, base + t * offSpread + 0.08, currentRealm === 0 ? 3.2 : 2.8, offRealm, state.frame + 400 + i);
  }
  boss.chargeResolutionBonus = state.playerRealm !== boss.chargeStartRealm ? 1 : 0;
  boss.corePulse = (boss.corePulse || 0) + 0.42;
  kickShake(5);
}
function spawnWraithPhantomBurst(boss) {
  const count = 3 + Math.floor(rand(0, 3));
  const base = rand(0, TAU);
  const spread = 0.95;
  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0 : (i / (count - 1)) * 2 - 1;
    const ang = base + t * spread;
    const sp = 1.4 + rand(0.2, 0.8);
    spawnEnemy("phantom", boss.x + Math.cos(ang) * 8, boss.y + 10 + Math.sin(ang) * 6, {
      launchFrames: 14,
      launchVX: Math.cos(ang) * sp,
      launchVY: Math.sin(ang) * sp + 0.4,
      cycleTimer: rand(0, phantomCycleDuration("physical")),
      fireTimer: rand(24, 72),
      stateMode: Math.random() < 0.5 ? "physical" : "ghost",
      bossSpawn: true
    });
  }
}
function startWraithShift(boss, reason = "damage") {
  if (boss.shiftTelegraph > 0 || boss.chargeTelegraph > 0) return;
  boss.shiftTelegraph = 30;
  boss.shiftReason = reason;
  boss.nextRealm = 1 - boss.realm;
  kickShake(4);
  state.fx.flash = Math.max(state.fx.flash, 4);
}
function finishWraithShift(boss) {
  boss.realm = boss.nextRealm;
  boss.shiftTelegraph = 0;
  boss.shiftReason = "";
  boss.nextRealm = null;
  boss.hitsSinceShift = 0;
  boss.nextShiftHits = 6 + Math.floor(rand(0, 3));
  boss.passiveTimer = 0;
  boss.attackTimer = Math.min(boss.attackTimer, 38);
  boss.realmPulse = 16;
}
function wraithAttackCooldown(boss) {
  const hpPct = boss.hp / boss.maxHp;
  const base = hpPct > 0.7 ? 54 : hpPct > 0.4 ? 42 : hpPct > 0.2 ? 30 : 24;
  return clamp(Math.round(base / clamp(state.difficulty.threat, 0.8, 1.15)), 22, 68);
}
function spawnWraithBoss() {
  const hp = Math.floor((88 + state.phase * 6) * 1.05);
  state.boss = {
    mode: "wraith",
    x: W / 2, y: -120, w: 152, h: 96,
    hp, maxHp: hp, entered: false, realm: 0, nextRealm: 1,
    shiftTelegraph: 0, shiftReason: "", hitsSinceShift: 0, nextShiftHits: 6 + Math.floor(rand(0, 3)),
    passiveTimer: 0, shift60Triggered: false, shift30Triggered: false,
    attackTimer: 54, chargeTelegraph: 0, chargeStartRealm: 0, chargeDodged: false,
    chargeRecovery: 0, movePhase: rand(0, TAU), flicker: 0, corePulse: 0, realmPulse: 0,
    phantomSpewTimer: state.phase >= 4 ? 300 + Math.floor(rand(0, 120)) : 9999
  };
  state.playerRealm = 0;
  state.player.ghostTimer = 0;
  state.player.ghostCooldown = 0;
  state.waveMood = "boss";
  state.waveMoodTimer = 0;
  state.lastWaveTemplateName = null;
  showMessage("WRAITH BOSS INCOMING... REALM HOP ACTIVATED", 150);
  discoverCodex("boss_wraith");
}
function chooseBossAttackType(b, hpPct) {
  const seq = hpPct > 0.70 ? ["spread", "aimed", "spawn", "spread"] : hpPct > 0.40 ? ["aimed", "fan", "spawn", "aimed"] : ["fan", "spawn", "aimed", "fan"];
  return seq[b.step % seq.length];
}
function bossCooldown(hpPct, threat) {
  let cd = 72;
  if (hpPct > 0.7) cd = 60;
  else if (hpPct > 0.4) cd = 48;
  else if (hpPct > 0.15) cd = 38;
  else cd = 32;
  cd -= Math.round((1 - hpPct) * 4);
  return clamp(Math.round(cd / clamp(threat, 0.8, 1.15)), 30, 80);
}
function pickBossMode() {
  if (state.phase < 8) return "standard";
  if (state.lastBossMode === "standard") return "wraith";
  if (state.lastBossMode === "wraith") return "standard";
  return "standard";
}
function spawnBoss() {
  if (state.gameState !== "playing" || state.boss || state.bossDeath) return;
  const mode = pickBossMode();
  state.lastBossMode = mode;
  if (mode === "wraith") { spawnWraithBoss(); return; }
  const maxHp = Math.floor(80 + state.phase * 18);
  state.boss = {
    mode: "standard",
    x: W / 2, y: -100, w: 130, h: 82,
    hp: maxHp, maxHp, entered: false, cooldown: 72, warn: 0, warnMax: 0,
    pending: null, step: 0, bay: 0, mouthOpen: 0
  };
  state.playerRealm = 0;
  state.waveMood = "boss";
  state.waveMoodTimer = 0;
  state.lastWaveTemplateName = null;
  showMessage("BOSS INCOMING", 120);
  discoverCodex("boss_standard");
}
function spawnBossDeath(boss) {
  state.bossDeath = { x: boss.x, y: boss.y, w: boss.w, h: boss.h, timer: 0, life: 150, pieces: [] };
  const cols = 5, rows = 3, pw = boss.w / cols, ph = boss.h / rows;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const px = boss.x - boss.w / 2 + c * pw + pw / 2;
    const py = boss.y - boss.h / 2 + r * ph + ph / 2;
    state.bossDeath.pieces.push({
      x: px, y: py, w: pw - 2, h: ph - 2,
      vx: rand(-2.5, 2.5) + (c - 2) * 0.15,
      vy: rand(-2.8, 1.2) + (r - 1) * 0.2,
      rot: rand(-0.1, 0.1), vr: rand(-0.03, 0.03), alpha: 1
    });
  }
  state.bossRecovery = 120;
  state.enemies = [];
  state.enemyBullets = [];
  state.pendingSpawns = [];
  state.waveMood = "open";
  state.waveMoodTimer = 120;
  state.lastWaveTemplateName = null;
  spawnParticles(boss.x, boss.y, 50, "#fff", 1.1);
  spawnParticles(boss.x, boss.y, 24, "#9ff", 1.0);
  kickShake(14);
  state.fx.flash = 14;
}
function updateBossStandard() {
  const b = state.boss; if (!b) return;
  const threat = state.difficulty.threat;
  if (!b.entered) {
    b.y += 0.7;
    if (b.y >= 92) { b.y = 92; b.entered = true; b.cooldown = 72; }
    b.x = clamp(b.x, b.w / 2 + 18, W - b.w / 2 - 18);
    return;
  }
  const hpPct = b.hp / b.maxHp;
  const aggro = 1 + (1 - hpPct) * 0.9;
  const panic = hpPct < 0.15 ? 1.18 : 1;
  b.x += Math.sin(state.frame / (36 - (1 - hpPct) * 10)) * 1.4 * aggro * panic;
  b.x = clamp(b.x, b.w / 2 + 18, W - b.w / 2 - 18);
  if (b.warn > 0) {
    const progress = 1 - (b.warn / Math.max(1, b.warnMax));
    b.mouthOpen = easeOutCubic(progress);
    b.bay = b.warn;
    b.warn--;
    if (b.warn === 0) {
      const attack = b.pending;
      if (attack === "spread") {
        const count = hpPct > 0.7 ? 5 : hpPct > 0.4 ? 7 : 9;
        fireAimedBurst(b.x, b.y + 24, state.player.x, state.player.y, count, hpPct > 0.4 ? 26 : 30, 3.3 + (1 - hpPct) * 0.5, "boss");
      } else if (attack === "aimed") {
        const count = hpPct > 0.7 ? 3 : hpPct > 0.4 ? 4 : 5;
        fireAimedBurst(b.x, b.y + 24, state.player.x, state.player.y, count, hpPct > 0.4 ? 14 : 18, 3.8 + (1 - hpPct) * 0.45, "boss");
      } else if (attack === "fan") {
        const base = Math.atan2(state.player.y - b.y, state.player.x - b.x);
        const spread = hpPct > 0.7 ? 3 : hpPct > 0.4 ? 4 : 5;
        const speedBase = 3.5 + (1 - hpPct) * 0.6;
        for (let i = -spread; i <= spread; i++) fireAngle(b.x, b.y + 24, base + i * (7 * Math.PI / 180), speedBase + Math.abs(i) * 0.1, "boss");
      } else if (attack === "spawn") {
        spawnBossAdds();
        if (hpPct < 0.35 && Math.random() < 0.65) spawnBossAdds();
      }
      b.step = (b.step + 1) % 4;
      b.pending = null;
      b.bay = 0;
      b.mouthOpen = 0;
      b.cooldown = bossCooldown(hpPct, threat);
    }
    return;
  }
  b.mouthOpen = Math.max(0, b.mouthOpen - 0.04);
  b.cooldown--;
  if (b.cooldown <= 0) {
    b.pending = chooseBossAttackType(b, hpPct);
    b.warn = b.pending === "spawn" ? (hpPct < 0.35 ? 24 : 28) : (hpPct < 0.35 ? 14 : 18);
    b.warnMax = b.warn;
    b.bay = b.warn;
  }
}
function updateBossWraith() {
  const b = state.boss; if (!b) return;
  const p = state.player;
  const hpPct = b.hp / b.maxHp;
  if (!b.entered) {
    b.y += 0.48;
    if (b.y >= 94) { b.y = 94; b.entered = true; b.attackTimer = 50; }
    b.x = clamp(b.x, b.w / 2 + 18, W - b.w / 2 - 18);
    return;
  }
  if (b.shiftTelegraph > 0) {
    b.shiftTelegraph--;
    b.flicker = b.shiftTelegraph;
    b.corePulse += 0.02;
    if (b.shiftTelegraph === 0) finishWraithShift(b);
    return;
  }
  if (b.chargeTelegraph > 0) {
    b.chargeTelegraph--;
    b.flicker = 20;
    if (state.playerRealm !== b.chargeStartRealm) b.chargeDodged = true;
    if (b.chargeTelegraph === 0) {
      fireWraithCharge(b);
      if (b.chargeDodged) {
        p.energy = clamp(p.energy + 9, 0, p.maxEnergy);
        spawnParticles(p.x, p.y, 12, "#d9b6ff", 0.8);
      }
      b.chargeRecovery = 20;
      b.attackTimer = wraithAttackCooldown(b);
    }
    return;
  }
  if (b.chargeRecovery > 0) b.chargeRecovery--;
  if (state.phase >= 4) {
    b.phantomSpewTimer--;
    if (b.phantomSpewTimer <= 0) {
      spawnWraithPhantomBurst(b);
      b.phantomSpewTimer = 300 + Math.floor(rand(0, 180));
    }
  }
  const moveAmp = 0.9 + (1 - hpPct) * 3.0;
  const moveSpeed = (b.realm === 0 ? 0.45 : 0.72) + (1 - hpPct) * (b.realm === 0 ? 0.7 : 1.1);
  const lateral = Math.sin(state.frame / (b.realm === 0 ? 56 : 38) + b.movePhase) * moveSpeed * moveAmp;
  const verticalWobble = Math.sin(state.frame * 0.03 + b.movePhase) * (b.realm === 0 ? 0.45 : 0.75);
  if (b.realm === 0) b.x += lateral * 0.9;
  else b.x += lateral * 1.15 + Math.sin(state.frame * 0.14 + b.movePhase) * 0.18;
  b.y = 94 + verticalWobble;
  b.x = clamp(b.x, b.w / 2 + 18, W - b.w / 2 - 18);
  if (state.playerRealm === b.realm) b.passiveTimer = 0;
  else b.passiveTimer++;
  if (!b.shift60Triggered && b.hp <= b.maxHp * 0.6) { b.shift60Triggered = true; startWraithShift(b, "threshold"); }
  if (!b.shift30Triggered && b.hp <= b.maxHp * 0.3) { b.shift30Triggered = true; startWraithShift(b, "threshold"); }
