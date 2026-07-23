function enforceParticleCap() { if (state.particles.length > MAX_PARTICLES) state.particles.splice(0, state.particles.length - MAX_PARTICLES); }
function spawnParticles(x, y, count = 12, color = "#fff", speed = 1) {
  for (let i = 0; i < count; i++) {
    const ang = rand(0, TAU);
    const sp = rand(0.8, 3.5) * speed;
    state.particles.push({
      x, y,
      vx: Math.cos(ang) * sp + rand(-0.4, 0.4),
      vy: Math.sin(ang) * sp + rand(-0.4, 0.4),
      life: rand(16, 32),
      size: rand(1.5, 3.5),
      color
    });
  }
  enforceParticleCap();
}
function spawnDeathBurst(x, y, count = 16) {
  for (let i = 0; i < count; i++) {
    const ang = rand(0, TAU);
    const sp = rand(2.2, 5.0);
    state.particles.push({
      x, y,
      vx: Math.cos(ang) * sp,
      vy: Math.sin(ang) * sp,
      life: rand(14, 26),
      size: rand(1.8, 4.2),
      color: "#fff"
    });
  }
  enforceParticleCap();
}
function spawnRapidFireMuzzleParticles(x, y) {
  const count = 6 + Math.floor(Math.random() * 4);
  for (let i = 0; i < count; i++) {
    const hot = i < 2;
    state.particles.push({
      x: x + rand(-1.6, 1.6),
      y: y + rand(-1.1, 1.1),
      vx: rand(-1.0, 1.0),
      vy: rand(-2.6, -0.5),
      life: rand(8, 16),
      size: rand(1.2, 2.3),
      color: hot ? "rgba(255,240,180,0.95)" : (Math.random() < 0.5 ? "rgba(255,170,70,0.92)" : "rgba(255,255,255,0.88)")
    });
  }
  enforceParticleCap();
}
function spawnPowerupAt(x, y, type) {
  state.powerups.push({
    x, y, type, vy: 1.9, size: 11, life: 900,
    rotation: rand(0, TAU),
    spinSpeed: rand(-0.035, 0.035) || 0.02
  });
}
function countBulletsByKind(kind) { let n = 0; for (const b of state.enemyBullets) if (b.kind === kind) n++; return n; }
function activePurpleCount() { let n = 0; for (const e of state.enemies) if (e.type === "purple") n++; return n; }
function activePhantomCount() { let n = 0; for (const e of state.enemies) if (e.type === "phantom") n++; return n; }
function phantomCapForPhase() { if (state.phase >= 13) return 5; if (state.phase >= 10) return 4; return 3; }
function safePowerupType() {
  const lowHp = state.player.hp <= 2;
  if (typeof pickExpansionPowerupType === "function") {
    const expansionType = pickExpansionPowerupType(lowHp);
    if (expansionType) return expansionType;
  }
  const r = Math.random();
  if (lowHp) {
    if (r < 0.34) return "repair";
    if (r < 0.58) return "wingman";
    if (r < 0.74) return "dual";
    if (r < 0.87) return "spread";
    return "rapid";
  } else {
    if (r < 0.35) return "spread";
    if (r < 0.70) return "rapid";
    if (r < 0.88) return "repair";
    if (r < 0.95) return "wingman";
    return "dual";
  }
}
function registerPowerupDrop(cooldownMin = 240, cooldownMax = 360) {
  state.killsSinceLastDrop = 0;
  state.framesSinceLastDrop = 0;
  state.powerupDropCooldown = cooldownMin + Math.floor(rand(0, Math.max(1, cooldownMax - cooldownMin)));
}
function shouldDropPowerupNow() {
  if (state.powerupDropCooldown > 0) return false;
  if (state.killsSinceLastDrop >= 12) return true;
  if (state.framesSinceLastDrop >= 900) return true;
  const drought = clamp((state.framesSinceLastDrop - 240) / 660, 0, 1);
  const killFactor = clamp((state.killsSinceLastDrop - 1) / 6, 0, 1);
  let chance = 0.022 + drought * 0.16 + killFactor * 0.11;
  if (state.player.hp <= 2) chance += 0.03;
  if (state.phase >= 10) chance += 0.01;
  if (state.intensityPhase === "cooldown") chance += 0.05;
  if (state.intensityPhase === "surge") chance -= 0.02;
  return Math.random() < chance;
}
function dropPowerup(x, y) { spawnPowerupAt(x, y, safePowerupType()); }
function bossRewardDrops(x, y) {
  const primary = Math.random() < 0.5 ? "spread" : "rapid";
  spawnPowerupAt(x - 18, y - 2, primary);
  if (Math.random() < 0.5) {
    const pool = ["spread", "rapid", "repair", "wingman", "dual", "energy_cell", "phase_shield", "overcharge", "piercing"];
    spawnPowerupAt(x + 18, y + 2, pool[Math.floor(Math.random() * pool.length)]);
  }
}
function chooseLane(exclude = []) {
  const counts = [0, 0, 0];
  for (const e of state.enemies) {
    if (e.escape) continue;
    counts[laneIndexFromX(e.x)]++;
  }
  let best = [], min = Infinity;
  for (let i = 0; i < 3; i++) {
    if (exclude.includes(i)) continue;
    if (counts[i] < min) { min = counts[i]; best = [i]; }
    else if (counts[i] === min) best.push(i);
  }
  if (!best.length) return 1;
  return best[Math.floor(Math.random() * best.length)];
}
function laneX(lane) { return laneCenters()[lane]; }
function getWingman(side) { return state.wingmen.find(w => w.side === side) || null; }
function refreshWingmen(timer = 1500) { for (const w of state.wingmen) w.timer = Math.max(w.timer, timer); }
function addWingmanSide(side, timer = 1500) {
  const existing = getWingman(side);
  if (existing) { existing.timer = Math.max(existing.timer, timer); return existing; }
  const p = state.player;
  const w = { x: p.x + side * 30, y: p.y + 4, side, timer, fire: 0 };
  state.wingmen.push(w);
  return w;
}
function spawnWingmen(count) {
  const timer = 1500;
  if (count >= 2) {
    addWingmanSide(-1, timer); addWingmanSide(1, timer);
    if (state.wingmen.length === 2) refreshWingmen(timer);
    return;
  }
  if (!getWingman(-1)) addWingmanSide(-1, timer);
  else if (!getWingman(1)) addWingmanSide(1, timer);
  else refreshWingmen(timer);
}
function fireWingman(w) {
  if (w.fire > 0) return;
  state.bullets.push({ x: w.x, y: w.y - 12, vx: 0, vy: -8.2, life: 80, r: 3, kind: getPlayerShotKind(), realm: state.playerRealm, damage: 0.75 });
  w.fire = 18;
}
function currentInputVector() {
  let x = 0, y = 0;
  if (state.keyboard.left) x -= 1;
  if (state.keyboard.right) x += 1;
  if (state.keyboard.up) y -= 1;
  if (state.keyboard.down) y += 1;
  if (state.joystick.active) { x += state.joystick.ax; y += state.joystick.ay; }
  const mag = Math.hypot(x, y);
  if (mag > 1) { x /= mag; y /= mag; }
  return { x, y };
}

function attemptGhost() {
  if (state.gameState !== "playing") return;
  const p = state.player;
  const profile = typeof ghostActionProfile === "function" ? ghostActionProfile(state.boss && state.boss.mode) : { label: "GHOST", cost: 35, cooldown: 20, burst: 4.6, phaseThroughDebris: true };
  if (isWraithActive()) {
    const cost = profile.cost;
    if (p.energy < cost) return;
    p.energy -= cost;
    state.playerRealm = 1 - state.playerRealm;
    state.runStats.abilityUses++;
    state.runStats.realmHops++;
    state.fx.flash = Math.max(state.fx.flash, 4);
    state.comboPulse = Math.max(state.comboPulse, 6);
    spawnParticles(p.x, p.y, 10, state.playerRealm === 0 ? "#bfe8ff" : "#d9b6ff", 0.9);
    return;
  }
  if (p.energy < profile.cost || p.ghostCooldown > 0) return;
  const input = currentInputVector();
  let dx = input.x, dy = input.y;
  const vMag = Math.hypot(p.vx, p.vy);
  if (Math.abs(dx) + Math.abs(dy) < 0.1 && vMag > 0.2) { dx = p.vx / vMag; dy = p.vy / vMag; }
  if (Math.abs(dx) + Math.abs(dy) < 0.1) { dx = 0; dy = -1; }
  p.vx += dx * profile.burst;
  p.vy += dy * profile.burst;
  if (profile.phaseThroughDebris) {
    p.ghostTimer = 18;
    p.inv = 24;
  } else {
    p.dashTimer = 12;
    p.ghostTimer = 0;
  }
  p.ghostCooldown = profile.cooldown;
  p.energy -= profile.cost;
  state.runStats.abilityUses++;
  if (profile.phaseThroughDebris) state.runStats.ghostUses++;
  else state.runStats.dashUses++;
  state.difficulty.ghostGrace = profile.phaseThroughDebris ? 60 : 24;
  state.fx.flash = Math.max(state.fx.flash, 6);
  spawnParticles(p.x, p.y, profile.label === "DASH" ? 16 : 10, profile.label === "DASH" ? "#ffcc78" : "#fff", profile.label === "DASH" ? 1.35 : 1.05);
}

function updateStars() {
  for (const s of state.stars) {
    s.y += s.spd;
    if (s.y > H + 4) { s.y = -4; s.x = Math.random() * W; }
  }
}
