function spawnEnemy(type, x, y, extra = {}) {
  if (type === "orange" && state.phase === 1) type = "red";
  if (type === "red") {
    const nearbyReds = state.enemies.filter(e => e.type === "red" && Math.abs(e.x - x) < 90 && Math.abs(e.y - y) < 110).length;
    if (nearbyReds >= 2 && Math.random() < 0.55) return;
    if (Math.random() < 0.05) return;
  }
  if (type === "purple" && activePurpleCount() >= (state.phase >= 8 ? 2 : 3)) return;
  if (type === "phantom" && activePhantomCount() >= phantomCapForPhase()) return;
  if (typeof canSpawnExpansionEnemy === "function" && !canSpawnExpansionEnemy(type, extra)) return;
  const phaseBoost = Math.min(state.phase * 0.08, 1.35);
  const data = ENEMY_DATA[type] || ENEMY_DATA.red;
  const base = {
    id: enemyIdCounter++,
    x, y, type,
    hp: data.hp, maxHp: data.hp, r: data.radius, reward: data.score,
    vx: 0, vy: 2, dir: Math.random() < 0.5 ? -1 : 1,
    shoot: 0, warn: 0, recover: 0, escape: false, escapeEdge: "left",
    launchFrames: 0, launchVX: 0, launchVY: 0, loopPhase: rand(0, TAU),
    motion: "zigzag", t: rand(0, 60), prevX: x, prevY: y, turnTimer: 0,
    turnDir: Math.random() < 0.5 ? -1 : 1, snapTimer: 0, driftPhase: rand(0, TAU),
    driftDir: Math.random() < 0.5 ? -1 : 1, driftPower: rand(0.06, 0.22),
    hitFlash: 0, hitPulse: 0, entryFrames: 0
  };
  if (type === "red") {
    base.vy = 1.8 + phaseBoost;
    base.hp = 2; base.maxHp = 2; base.r = 12; base.motion = "drift"; base.entryFrames = extra.bossSpawn ? 0 : 4;
  } else if (type === "orange") {
    base.vy = 2.55 + phaseBoost * 0.22;
    base.vx = 3.2 + state.phase * 0.05;
    base.hp = 1; base.maxHp = 1; base.r = 10;
    base.motion = ["zigzag", "burst", "snap", "chain", "sweep"][Math.floor(Math.random() * 5)];
    base.turnTimer = rand(14, 38);
    base.turnDir = Math.random() < 0.5 ? -1 : 1;
    base.entryFrames = extra.bossSpawn ? 0 : 8;
  } else if (type === "purple") {
    base.vy = 1.05 + phaseBoost * 0.18;
    base.hp = 5; base.maxHp = 5; base.r = 17;
    base.shoot = 62 + Math.floor(rand(0, 22));
    base.volleySeed = Math.floor(rand(0, 4));
    base.motion = "drift"; base.entryFrames = extra.bossSpawn ? 0 : 6;
  } else if (type === "phantom") {
    base.x = clamp(W / 2 + (x - W / 2) * 0.75 + rand(-10, 10), 20, W - 20);
    base.y = y; base.vy = 1.55 + phaseBoost * 0.14;
    base.hp = 3; base.maxHp = 3; base.r = 14; base.reward = 100;
    base.motion = "phantom";
    base.stateMode = extra.stateMode || "physical";
    base.cycleTimer = (extra.cycleTimer != null) ? extra.cycleTimer : rand(0, phantomCycleDuration(base.stateMode));
    base.telegraphTimer = extra.telegraphTimer || 0;
    base.fireTimer = (extra.fireTimer != null) ? extra.fireTimer : rand(24, 72);
    base.phaseOffset = rand(0, TAU);
    base.flickerSeed = rand(0, 9999);
    base.entryFrames = extra.bossSpawn ? 0 : 6;
  }
  const enemy = Object.assign(base, extra);
  if (typeof configureExpansionEnemy === "function") configureExpansionEnemy(enemy, type, extra, phaseBoost);
  state.enemies.push(enemy);
  if (!enemy.noCodex) discoverCodex(type);
}
function calculateThreatScore() {
  let score = 0;
  for (const e of state.enemies) {
    const data = ENEMY_DATA[e.type];
    score += data && data.threat ? data.threat : 1.0;
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
  const moving = Math.abs(input.x) + Math.abs(input.y) > 0.02;
  const steer = p.ghostTimer > 0 || p.dashTimer > 0 ? 0.16 : moving ? 0.22 : 0.20;
  p.vx += (desiredVX - p.vx) * steer;
  p.vy += (desiredVY - p.vy) * steer;
  const speedCap = p.ghostTimer > 0 || p.dashTimer > 0 ? p.maxSpeed * 1.55 : p.maxSpeed;
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
  if (p.dashTimer > 0) p.dashTimer--;
  if (p.ghostCooldown > 0) p.ghostCooldown--;
  if (typeof tickExpansionPlayerTimers === "function") tickExpansionPlayerTimers();
  const regen = state.intensityPhase === "cooldown" ? 7.2 / 60 : state.intensityPhase === "surge" ? 4.2 / 60 : 5 / 60;
  const overchargeRegen = p.overcharge > 0 ? 7.0 / 60 : 0;
  p.energy = clamp(p.energy + regen + overchargeRegen, 0, p.maxEnergy);
  firePlayer();
}
function firePlayer() {
  const p = state.player;
  const cooldown = p.rapid > 0 ? 10 : 14;
  if (p.fire > 0) return;
  const kind = getPlayerShotKind();
  const tipX = p.x, tipY = p.y - 16;
  const pierce = p.piercing > 0 ? 1 : 0;
  if (p.spread > 0) {
    const spreadY = p.y - 15.7;
    state.bullets.push({ x: p.x - 11, y: spreadY, vx: -2.3, vy: -8.6, life: 90, r: 3, kind, realm: state.playerRealm, damage: 0.75 });
    state.bullets.push({ x: p.x, y: spreadY, vx: 0, vy: -9.0, life: 90, r: 3, kind, realm: state.playerRealm, damage: 1, pierce });
    state.bullets.push({ x: p.x + 11, y: spreadY, vx: 2.3, vy: -8.6, life: 90, r: 3, kind, realm: state.playerRealm, damage: 0.75 });
    state.difficulty.shotsFired += 3;
  } else {
    state.bullets.push({ x: p.x, y: p.y - 16, vx: 0, vy: -9.0, life: 90, r: 3, kind, realm: state.playerRealm, damage: 1, pierce });
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
    } else if (b.kind === "drainShot") {
      b.age = (b.age || 0) + 1;
      b.trail = b.trail || [];
      b.trail.push({ x: b.x, y: b.y });
      if (b.trail.length > 10) b.trail.shift();
      if (b.curving) {
        const sp = Math.hypot(b.vx || 0, b.vy || 0);
        const ang = Math.atan2(b.vy || 0, b.vx || 0) + b.curving;
        b.vx = Math.cos(ang) * sp;
        b.vy = Math.sin(ang) * sp;
        if (b.maxSpeed) {
          const nextSp = Math.hypot(b.vx, b.vy);
          if (nextSp > b.maxSpeed) { b.vx = (b.vx / nextSp) * b.maxSpeed; b.vy = (b.vy / nextSp) * b.maxSpeed; }
        }
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
