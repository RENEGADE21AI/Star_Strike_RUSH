// Star Strike RUSH legacy game part 2
// Generated from js/legacyGame.js by scripts/split-legacy-game.mjs.
// Do not edit generated part files directly.

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
  if (isWraithActive()) {
    const cost = 18;
    if (p.energy < cost) return;
    p.energy -= cost;
    state.playerRealm = 1 - state.playerRealm;
    state.fx.flash = Math.max(state.fx.flash, 4);
    state.comboPulse = Math.max(state.comboPulse, 6);
    spawnParticles(p.x, p.y, 10, state.playerRealm === 0 ? "#bfe8ff" : "#d9b6ff", 0.9);
    return;
  }
  if (p.energy < 35 || p.ghostCooldown > 0) return;
  const input = currentInputVector();
  let dx = input.x, dy = input.y;
  const vMag = Math.hypot(p.vx, p.vy);
  if (Math.abs(dx) + Math.abs(dy) < 0.1 && vMag > 0.2) { dx = p.vx / vMag; dy = p.vy / vMag; }
  if (Math.abs(dx) + Math.abs(dy) < 0.1) { dx = 0; dy = -1; }
  p.vx += dx * 4.6;
  p.vy += dy * 4.6;
  p.ghostTimer = 18;
  p.inv = 24;
  p.ghostCooldown = 20;
  p.energy -= 35;
  state.difficulty.ghostGrace = 60;
  state.fx.flash = Math.max(state.fx.flash, 6);
  spawnParticles(p.x, p.y, 10, "#fff", 1.05);
}

function updateStars() {
  for (const s of state.stars) {
    s.y += s.spd;
    if (s.y > H + 4) { s.y = -4; s.x = Math.random() * W; }
  }
}

function phaseDuration(phase) {
  if (phase === 1) return 1100;
  if (phase === 2) return 980;
  if (phase === 3) return 880;
  return Math.max(500, 840 - (phase - 4) * 22);
}
function rhythmProfile() {
  if (state.boss || state.bossDeath) return { pressure: 0, interval: 0 };
  const beat = state.waveTimer % 240;
  if (beat < 45) return { pressure: -7, interval: 18 };
  if (beat < 135) return { pressure: 10, interval: -12 };
  if (beat < 170) return { pressure: -4, interval: 10 };
  return { pressure: 12, interval: -16 };
}
function phaseArcBias() {
  const dur = Math.max(1, phaseDuration(state.phase));
  const progress = clamp(state.phaseTimer / dur, 0, 1);
  return Math.sin(progress * TAU - Math.PI / 2);
}
function peakLoad() {
  const enemyLoad = Math.max(0, state.enemies.length - 8) / 14;
  const bulletLoad = Math.max(0, enemyBulletPressure() - enemyBulletBudget()) / 8;
  return clamp(enemyLoad + bulletLoad, 0, 1.2);
}

function triggerPhaseSkip() {
  if (state.gameState !== "playing") return;
  if (devSkipCooldown > 0) return;
  devSkipCooldown = DEV_SKIP_COOLDOWN_FRAMES;
  state.bullets = [];
  state.enemyBullets = [];
  state.enemies = [];
  state.pendingSpawns = [];
  state.powerups = [];
  state.boss = null;
  state.bossDeath = null;
  state.bossRecovery = 0;
  state.waveRest = 24;
  state.playerRealm = 0;
  state.waveMood = "open";
  state.waveMoodTimer = 120;
  state.lastWaveTemplateName = null;
  state.phase++;
  state.phaseTimer = 0;
  state.waveTimer = 0;
  state.pressure = 0;
  state.threatScore = 0;
  state.difficulty.grace = 90;
  state.difficulty.ghostGrace = 0;
  state.difficulty.heatStreak = false;
  state.difficulty.threat = Math.max(0.68, state.difficulty.threat - 0.08);
  state.difficulty.target = state.difficulty.threat;
  state.fx.flash = Math.max(state.fx.flash, 8);
  showMessage("PHASE " + state.phase, 90);
  if (state.phase % 4 === 0) spawnBoss();
}
function inDevSkipZone(x, y) { const zoneW = W * 0.15, zoneH = H * 0.15; return x > W - zoneW && y < zoneH; }
function onDevToggleZone(x, y) { return x >= W / 3 && x <= (2 * W) / 3 && y >= 0 && y <= 60; }

function updateIntensityCycle() {
  if (state.boss || state.bossDeath) {
    state.intensityPhase = "normal";
    state.intensityTimer = Math.max(state.intensityTimer, 120);
    return;
  }
  const d = state.difficulty;
  const p = state.player;
  const sinceHit = state.frame - d.lastHitFrame;
  const strong = sinceHit > 720 && d.killStreak >= 5 && state.phase >= 3;
  const fragile = p.hp <= 2 || state.pressure > 74;
  state.intensityTimer--;
  if (state.intensityTimer <= 0) {
    if (state.intensityPhase === "normal") {
      state.intensityPhase = strong ? "surge" : (fragile ? "cooldown" : (Math.random() < 0.6 ? "surge" : "cooldown"));
      state.intensityTimer = state.intensityPhase === "surge" ? 300 + Math.floor(rand(0, 120)) : 170 + Math.floor(rand(0, 90));
    } else if (state.intensityPhase === "surge") {
      state.intensityPhase = "cooldown";
      state.intensityTimer = 180 + Math.floor(rand(0, 100));
    } else {
      state.intensityPhase = "normal";
      state.intensityTimer = 170 + Math.floor(rand(0, 120));
    }
  }
  if (state.intensityPhase === "normal") {
    if (strong && Math.random() < 0.01) {
      state.intensityPhase = "surge";
      state.intensityTimer = 260 + Math.floor(rand(0, 100));
    } else if (fragile && Math.random() < 0.008) {
      state.intensityPhase = "cooldown";
      state.intensityTimer = 180 + Math.floor(rand(0, 80));
    }
  }
}
function updatePressure() {
  const p = state.player;
  const enemyLoad = state.enemies.length * 3.5;
  const bulletLoad = state.enemyBullets.length * 2.1;
  const queueLoad = state.pendingSpawns.length * 1.2;
  const comboLoad = Math.max(0, state.comboKills - 3) * 0.8;
  const bossLoad = state.boss ? 12 : 0;
  const relief = (5 - p.hp) * 8 + (state.difficulty.grace > 0 ? 10 : 0) + (state.difficulty.ghostGrace > 0 ? 4 : 0);
  const rhythm = rhythmProfile();
  const intensityBias = state.intensityPhase === "surge" ? 9 : state.intensityPhase === "cooldown" ? -8 : 0;
  const target = clamp(18 + state.phase * 4 + enemyLoad + bulletLoad + queueLoad + comboLoad + bossLoad - relief + rhythm.pressure + intensityBias, 0, 100);
  state.pressure += (target - state.pressure) * 0.04;
}
function updatePacingMemory() {
  const d = state.difficulty;
  const p = state.player;
  const sinceHit = state.frame - d.lastHitFrame;
  if (state.boss || state.bossDeath) d.pacingMemory *= 0.994;
  else {
    const comfortable = sinceHit > 840 && p.hp === p.maxHp && state.pressure < 48;
    const stressed = p.hp <= 2 || state.pressure > 72 || d.grace > 0 || d.ghostGrace > 0;
    if (comfortable) d.pacingMemory = clamp(d.pacingMemory + 0.006, -1, 1);
    else if (stressed) d.pacingMemory = clamp(d.pacingMemory - 0.008, -1, 1);
    else d.pacingMemory *= 0.996;
  }
  if (state.frame > 0 && state.frame % 240 === 0) {
    d.shotsFired = Math.floor(d.shotsFired * 0.72);
    d.shotsHit = Math.floor(d.shotsHit * 0.72);
  }
}
function updateWaveMood() {
  if (state.boss || state.bossDeath) { state.waveMood = "boss"; state.waveMoodTimer = 0; return; }
  if (state.waveMoodTimer > 0) { state.waveMoodTimer--; if (state.waveMoodTimer > 24) return; }
  const d = state.difficulty, p = state.player, sinceHit = state.frame - d.lastHitFrame, arc = phaseArcBias(), early = state.phase <= 2;
  const recoveryNeed = p.hp <= 2 || state.pressure > 72 || d.grace > 0 || d.ghostGrace > 0 || d.pacingMemory < -0.35;
  let next;
  if (state.phase === 1) {
    if (recoveryNeed || arc < -0.15) next = "open";
    else next = Math.random() < 0.55 ? "open" : "recovery";
  } else if (early) {
    if (recoveryNeed || arc < -0.20) next = "open";
    else if (arc > 0.42 && state.phaseTimer > 160) next = Math.random() < 0.55 ? "spike" : "open";
    else next = Math.random() < 0.70 ? "open" : "recovery";
  } else {
    if (recoveryNeed) next = Math.random() < 0.72 ? "recovery" : "open";
    else if (arc > 0.48 || state.intensityPhase === "surge") next = Math.random() < 0.66 ? "spike" : (state.phase >= 5 && Math.random() < 0.4 ? "rule" : "open");
    else if (arc < -0.38) next = Math.random() < 0.66 ? "open" : "recovery";
    else if (sinceHit > 840 && p.hp === p.maxHp && state.pressure < 48) next = Math.random() < 0.55 ? "spike" : "rule";
    else if (d.pacingMemory > 0.35) next = Math.random() < 0.60 ? "spike" : "rule";
    else if (d.pacingMemory < -0.25) next = Math.random() < 0.58 ? "recovery" : "open";
    else {
      const roll = Math.random();
      next = roll < 0.40 ? "open" : roll < 0.68 ? "spike" : roll < 0.86 ? "recovery" : "rule";
    }
  }
  state.waveMood = next;
  state.waveMoodTimer = next === "spike" ? 84 + Math.floor(rand(0, 42)) : next === "recovery" ? 116 + Math.floor(rand(0, 60)) : next === "rule" ? 92 + Math.floor(rand(0, 54)) : 100 + Math.floor(rand(0, 50));
}
function updateDifficulty() {
  const d = state.difficulty, p = state.player, sinceHit = state.frame - d.lastHitFrame;
  if (sinceHit > 600) d.heatStreak = false;
  if (state.boss && !state.bossDeath) {
    const bossLerp = p.hp === 1 ? 0.06 : (p.hp === p.maxHp && d.killStreak > 0 ? 0.03 : 0.025);
    d.threat += (d.target - d.threat) * bossLerp;
    d.grace = Math.max(0, d.grace - 1);
    d.ghostGrace = Math.max(0, d.ghostGrace - 1);
    d.burst = Math.max(0, d.burst - 0.03);
    return;
  }
  let target = 0.78 + (state.phase - 1) * 0.075;
  if (state.phase === 1) target += clamp(state.phaseTimer / 1800, 0, 0.20);
  else target += clamp((state.phaseTimer - 180) / 2200, 0, 0.14);
  target -= (p.maxHp - p.hp) * 0.05;
  if (p.hp === 1) target -= 0.04;
  if (d.grace > 0) target -= 0.10;
  if (d.ghostGrace > 0) target -= 0.07;
  if (d.heatStreak) target -= 0.12;
  const accuracy = d.shotsFired > 0 ? d.shotsHit / d.shotsFired : 0.5;
  const accuracyBoost = clamp((accuracy - 0.38) * 0.16, 0, 0.10);
  target += accuracyBoost;
  const killBonus = sinceHit > 900 ? 0.10 : clamp(d.killStreak * 0.0025, 0, 0.08);
  target += killBonus;
  if (d.pacingMemory > 0.45) target += 0.08;
  else if (d.pacingMemory < -0.45) target -= 0.06;
  target += phaseArcBias() * 0.05;
  target -= clamp(d.burst, 0, 3) * 0.03;
  target += (state.pressure - 50) / 200;
  if (activePhantomCount() > 0) target -= 0.06;
  if (state.waveMood === "open") target -= 0.02;
  else if (state.waveMood === "recovery") target -= 0.08;
  else if (state.waveMood === "spike") target += 0.03;
  else if (state.waveMood === "rule") target += 0.01;
  if (state.intensityPhase === "surge") target += 0.06;
  if (state.intensityPhase === "cooldown") target -= 0.05;
  d.target = clamp(target, 0.70, 1.45);
  let lerp = 0.025;
  if (p.hp === 1) lerp = 0.06;
  else if (p.hp === p.maxHp && (d.killStreak > 0 || d.pacingMemory > 0.25 || accuracy > 0.6)) lerp = 0.03;
  else if (state.pressure > 70 || d.pacingMemory < -0.35) lerp = 0.04;
  d.threat += (d.target - d.threat) * lerp;
  d.threat = clamp(d.threat, 0.70, 1.45);
  if (d.grace > 0) d.grace--;
  if (d.ghostGrace > 0) d.ghostGrace--;
  d.burst = Math.max(0, d.burst - 0.03);
  if (state.frame % 180 === 0) d.killStreak = Math.max(0, d.killStreak - 1);
}

function fireEnemyBullet(x, y, vx, vy, kind = "purple", extra = {}) {
  const cost = enemyBulletCost(kind);
  if (state.enemyBullets.length >= 36) return;
  if (!canSpendBulletBudget(cost)) return;
  spendBulletBudget(cost);
  state.enemyBullets.push({
    x, y, vx, vy, kind,
    realm: extra.realm ?? null,
    life: 240,
    r: 4,
    nearMissed: false,
    damage: 1,
    seed: extra.seed ?? null,
    maxSpeed: extra.maxSpeed ?? null
  });
  state.difficulty.burst = clamp(state.difficulty.burst + 0.12, 0, 3);
}
function phantomFrontArcOK(e, tx, ty) {
  const aim = Math.atan2(ty - e.y, tx - e.x);
  const forward = Math.atan2(e.vy || 0.001, e.vx || 0.001);
  return Math.abs(wrapAngle(aim - forward)) <= Math.PI / 2;
}

function waveTemplateBreather() { const [a, b, c] = laneCenters(); return [waveItem("red", a, -28, 0), waveItem("red", b, -38, 12), waveItem("red", c, -28, 24)]; }
function waveTemplateRedV() { const [a, b, c] = laneCenters(); return [waveItem("red", a - 12, -26, 0), waveItem("red", a + 52, -40, 8), waveItem("red", b, -52, 16), waveItem("red", c - 52, -40, 24), waveItem("red", c + 12, -26, 32)]; }
function waveTemplateRedWall() { const xs = laneCenters(); return [waveItem("red", xs[0] - 28, -30, 0), waveItem("red", xs[0] + 22, -30, 8), waveItem("red", xs[1], -42, 16), waveItem("red", xs[1] + 44, -30, 24), waveItem("red", xs[2] - 22, -30, 32), waveItem("red", xs[2] + 28, -30, 40)]; }
function waveTemplateStaggerMix() { const [a, b, c] = laneCenters(); return [waveItem("red", a, -28, 0), waveItem("orange", b - 34, -40, 8, { motion: "zigzag" }), waveItem("red", b, -52, 16), waveItem("orange", c + 34, -40, 24, { motion: "burst" }), waveItem("red", c, -28, 32)]; }
function waveTemplateOrangePair() { const [a, b, c] = laneCenters(); return [waveItem("orange", a - 14, -32, 0, { motion: "zigzag" }), waveItem("red", b, -44, 10), waveItem("red", b - 52, -28, 20), waveItem("orange", c + 14, -32, 30, { motion: "snap" })]; }
function waveTemplateMixedChevron() { const [a, b, c] = laneCenters(); return [waveItem("red", a, -30, 0), waveItem("orange", a + 58, -44, 8, { motion: "zigzag" }), waveItem("red", b, -54, 16), waveItem("orange", c - 58, -44, 24, { motion: "burst" }), waveItem("red", c, -30, 32)]; }
function waveTemplateOrangeRibbon() { const [a, b, c] = laneCenters(); const flip = state.waveIndex % 2 === 0 ? 1 : -1; return [waveItem("orange", b - 110 * flip, -28, 0, { motion: "zigzag" }), waveItem("orange", a + 20 * flip, -44, 8, { motion: "snap" }), waveItem("orange", b, -58, 16, { motion: "burst" }), waveItem("orange", c - 18 * flip, -44, 24, { motion: "zigzag" }), waveItem("orange", b + 120 * flip, -30, 32, { motion: "snap" })]; }
function waveTemplatePurpleGuard() { const [a, b, c] = laneCenters(); return [waveItem("purple", a - 66, -30, 0), waveItem("red", a + 4, -48, 8), waveItem("orange", b - 22, -58, 16, { motion: "burst" }), waveItem("red", c - 4, -48, 24), waveItem("purple", c + 66, -30, 32), waveItem("red", b, -72, 40)]; }
function waveTemplateSplitAmbush() { const [a, b, c] = laneCenters(); return [waveItem("orange", a - 100, -30, 0, { motion: "snap" }), waveItem("red", b, -44, 8), waveItem("purple", b, -66, 16), waveItem("red", b + 56, -44, 24), waveItem("orange", c + 100, -30, 32, { motion: "burst" })]; }
function waveTemplateOrangeChain() { const [a, b, c] = laneCenters(); return [waveItem("orange", a - 110, -32, 0, { motion: "chain" }), waveItem("orange", a - 56, -42, 8, { motion: "chain" }), waveItem("orange", b, -52, 16, { motion: "chain" }), waveItem("orange", c + 56, -42, 24, { motion: "chain" }), waveItem("orange", c + 110, -32, 32, { motion: "chain" })]; }
function waveTemplateOrangeSlash() { const [a, b, c] = laneCenters(); return [waveItem("orange", a - 40, -28, 0, { motion: "sweep" }), waveItem("orange", b + 16, -44, 10, { motion: "sweep" }), waveItem("orange", c - 20, -58, 20, { motion: "sweep" }), waveItem("orange", c + 76, -36, 30, { motion: "sweep" })]; }
function waveTemplatePhantomProbe() { const [a, b, c] = laneCenters(); return [waveItem("phantom", b + rand(-16, 16), -46, 0), waveItem("phantom", a + rand(-12, 12), -62, 12), waveItem("phantom", c + rand(-12, 12), -62, 24)]; }
function waveTemplatePhantomPair() { const [a, b, c] = laneCenters(); return [waveItem("phantom", a + rand(-8, 8), -48, 0), waveItem("phantom", c + rand(-8, 8), -48, 18), waveItem("phantom", b + rand(-8, 8), -70, 30)]; }
function waveTemplatePhantomFan() { const [a, b, c] = laneCenters(); return [waveItem("phantom", b, -54, 0), waveItem("phantom", a - 24, -58, 12), waveItem("phantom", c + 24, -58, 24)]; }
const waveTemplates = { breather: waveTemplateBreather, redV: waveTemplateRedV, redWall: waveTemplateRedWall, staggerMix: waveTemplateStaggerMix, orangePair: waveTemplateOrangePair, mixedChevron: waveTemplateMixedChevron, orangeRibbon: waveTemplateOrangeRibbon, purpleGuard: waveTemplatePurpleGuard, splitAmbush: waveTemplateSplitAmbush, orangeChain: waveTemplateOrangeChain, orangeSlash: waveTemplateOrangeSlash, phantomProbe: waveTemplatePhantomProbe, phantomPair: waveTemplatePhantomPair, phantomFan: waveTemplatePhantomFan };
function pickWeightedTemplate(pool, avoidName = null) {
  const filtered = avoidName ? pool.filter(([name]) => name !== avoidName) : pool.slice();
  const list = filtered.length > 0 ? filtered : pool.slice();
  const total = list.reduce((sum, item) => sum + item[1], 0);
  let roll = Math.random() * total;
  for (const [name, weight] of list) {
    roll -= weight;
    if (roll <= 0) return name;
  }
  return list[list.length - 1][0];
}
function selectWaveTemplate() {
  const mood = state.waveMood || "open";
  const phaseTier = state.phase < 4 ? "early" : state.phase < 9 ? "mid" : "late";
  let pool;
  if (state.phase === 1) {
    if (mood === "recovery") pool = [["breather", 8], ["redV", 4], ["redWall", 3]];
    else if (mood === "spike") pool = [["redWall", 5], ["redV", 4], ["breather", 2]];
    else if (mood === "rule") pool = [["redV", 5], ["redWall", 4], ["breather", 2]];
    else pool = [["breather", 5], ["redV", 4], ["redWall", 4]];
  } else if (mood === "recovery") {
    pool = phaseTier === "early"
      ? [["breather", 6], ["redV", 3], ["orangePair", 4], ["staggerMix", 2]]
      : phaseTier === "mid"
      ? [["breather", 4], ["redV", 3], ["orangePair", 4], ["staggerMix", 3], ["mixedChevron", 2]]
      : [["breather", 3], ["redV", 2], ["orangePair", 3], ["staggerMix", 2], ["mixedChevron", 2], ["orangeSlash", 1]];
  } else if (mood === "spike") {
    pool = phaseTier === "early"
      ? [["redWall", 4], ["staggerMix", 3], ["mixedChevron", 3], ["orangeChain", 2]]
      : phaseTier === "mid"
      ? [["redWall", 4], ["mixedChevron", 3], ["orangeRibbon", 2], ["purpleGuard", 3], ["splitAmbush", 3], ["orangeSlash", 2]]
      : [["redWall", 3], ["orangeRibbon", 3], ["purpleGuard", 4], ["splitAmbush", 4], ["orangeChain", 2], ["orangeSlash", 3]];
  } else if (mood === "rule") {
    if (state.phase >= 5) {
      pool = phaseTier === "early"
        ? [["phantomProbe", 5], ["phantomPair", 4], ["breather", 2], ["mixedChevron", 2]]
        : phaseTier === "mid"
        ? [["phantomProbe", 4], ["phantomPair", 4], ["phantomFan", 3], ["mixedChevron", 2], ["purpleGuard", 2]]
        : [["phantomProbe", 3], ["phantomPair", 4], ["phantomFan", 4], ["purpleGuard", 2], ["splitAmbush", 2]];
    } else {
      pool = phaseTier === "early"
        ? [["mixedChevron", 4], ["orangePair", 4], ["staggerMix", 3], ["redV", 2]]
        : phaseTier === "mid"
        ? [["purpleGuard", 4], ["splitAmbush", 3], ["orangeChain", 3], ["mixedChevron", 2]]
        : [["purpleGuard", 4], ["splitAmbush", 4], ["orangeRibbon", 3], ["orangeSlash", 2]];
    }
  } else {
    pool = phaseTier === "early"
      ? [["breather", 5], ["redV", 4], ["orangePair", 4], ["mixedChevron", 2]]
      : phaseTier === "mid"
      ? [["staggerMix", 4], ["orangePair", 4], ["mixedChevron", 4], ["orangeChain", 2], ["purpleGuard", 1]]
      : [["orangeRibbon", 3], ["purpleGuard", 3], ["splitAmbush", 3], ["orangeChain", 3], ["orangeSlash", 2], ["mixedChevron", 2]];
    if (state.phase >= 5) pool.push(["phantomProbe", 1], ["phantomPair", 1], ["phantomFan", 1]);
  }
  const name = pickWeightedTemplate(pool, state.lastWaveTemplateName);
  return { name, fn: waveTemplates[name] };
}
function templateDensity(events) {
  let d = 0;
  for (const ev of events) {
    if (ev.type === "red") d += 1.0;
    else if (ev.type === "orange") d += 1.15;
    else if (ev.type === "purple") d += 2.8;
    else if (ev.type === "phantom") d += 2.1;
    else d += 1.0;
  }
  return d;
}
function discoverCodex(type) {
  if (!codexDiscovered[type]) {
    codexDiscovered[type] = true;
    saveCodexDiscovered();
    encounterQueue.push(type);
    codexHasNew = true;
  }
}
function spawnWave() {
  const sel = selectWaveTemplate();
  const events = sel.fn ? sel.fn() : [];
  state.lastWaveTemplateName = sel.name;
  state.pendingSpawns.push(...events);
  const density = templateDensity(events);
  if (state.waveMood === "spike" && density < 4.8) {
    const followName = Math.random() < 0.6 ? "mixedChevron" : "redWall";
    const follow = waveTemplates[followName] ? waveTemplates[followName]() : [];
    for (const ev of follow) ev.delay += 28 + Math.floor(rand(0, 18));
    state.pendingSpawns.push(...follow);
  }
  if (state.waveMood === "rule" && state.phase >= 5 && density < 4.8) {
    const followName = Math.random() < 0.5 ? "phantomPair" : "phantomFan";
    const follow = waveTemplates[followName] ? waveTemplates[followName]() : [];
    for (const ev of follow) ev.delay += 36 + Math.floor(rand(0, 20));
    state.pendingSpawns.push(...follow);
  }
  if (density >= 5.5) {
    const followName = Math.random() < 0.5 ? "breather" : "orangePair";
    const follow = waveTemplates[followName] ? waveTemplates[followName]() : [];
    for (const ev of follow) ev.delay += 34 + Math.floor(rand(0, 20));
    state.pendingSpawns.push(...follow);
    state.waveRest = Math.max(state.waveRest, 18 + Math.floor(rand(0, 12)));
  } else if (density >= 4.0) {
    state.waveRest = Math.max(state.waveRest, 12 + Math.floor(rand(0, 8)));
  }
  if (state.waveMood === "recovery") state.waveRest = Math.max(state.waveRest, 18 + Math.floor(rand(0, 12)));
  else if (state.waveMood === "spike") state.waveRest = Math.max(state.waveRest, 8 + Math.floor(rand(0, 8)));
  else if (state.waveMood === "rule") state.waveRest = Math.max(state.waveRest, 12 + Math.floor(rand(0, 8)));
  state.waveIndex++;
}

function spawnEnemy(type, x, y, extra = {}) {
  if (type === "orange" && state.phase === 1) type = "red";
  if (type === "red") {
    const nearbyReds = state.enemies.filter(e => e.type === "red" && Math.abs(e.x - x) < 90 && Math.abs(e.y - y) < 110).length;
    if (nearbyReds >= 2 && Math.random() < 0.55) return;
    if (Math.random() < 0.05) return;
  }
  if (type === "purple" && activePurpleCount() >= (state.phase >= 8 ? 2 : 3)) return;
  if (type === "phantom" && activePhantomCount() >= phantomCapForPhase()) return;
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
