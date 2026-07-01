function phaseDuration(phase) {
  if (phase === 1) return 3000;
  if (phase === 2) return 3300;
  if (phase === 3) return 3000;
  return Math.max(580, 940 - (phase - 4) * 20);
}
function openingRamp() {
  return clamp(state.frame / 7200, 0, 1);
}
function openingCalm() {
  return 1 - openingRamp();
}
function rhythmProfile() {
  if (state.boss || state.bossDeath) return { pressure: 0, interval: 0 };
  const beat = state.waveTimer % 240;
  const calm = openingCalm();
  if (beat < 45) return { pressure: -7, interval: 18 };
  if (beat < 135) return { pressure: 10 - calm * 8, interval: -12 + calm * 20 };
  if (beat < 170) return { pressure: -4, interval: 10 };
  return { pressure: 12 - calm * 9, interval: -16 + calm * 22 };
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

const DIFFICULTY_SAMPLE_INTERVAL = 60;
const MAX_DIFFICULTY_SAMPLES = 720;

function roundSample(value, digits = 2) {
  const m = Math.pow(10, digits);
  return Math.round((Number(value) || 0) * m) / m;
}

function makeDifficultySample() {
  const p = state.player || {};
  return {
    frame: Math.max(0, Math.floor(state.frame || 0)),
    seconds: roundSample((state.frame || 0) / 60, 2),
    gameState: state.gameState,
    phase: Math.max(1, Math.floor(state.phase || 1)),
    phaseTimer: roundSample(state.phaseTimer || 0, 2),
    waveTimer: roundSample(state.waveTimer || 0, 2),
    hp: Math.max(0, Math.floor(p.hp || 0)),
    maxHp: Math.max(0, Math.floor(p.maxHp || 0)),
    energy: roundSample(p.energy || 0, 1),
    pressure: roundSample(state.pressure || 0, 1),
    threat: roundSample(state.difficulty.threat || 0, 3),
    target: roundSample(state.difficulty.target || 0, 3),
    threatScore: roundSample(state.threatScore || 0, 2),
    bulletPressure: roundSample(typeof enemyBulletPressure === "function" ? enemyBulletPressure() : 0, 2),
    bulletBudget: roundSample(typeof enemyBulletBudget === "function" ? enemyBulletBudget() : 0, 2),
    waveMood: state.waveMood,
    intensityPhase: state.intensityPhase,
    lastWaveTemplateName: state.lastWaveTemplateName || "",
    counts: {
      enemies: state.enemies.length,
      enemyBullets: state.enemyBullets.length,
      pendingSpawns: state.pendingSpawns.length,
      debris: state.debris.length,
      powerups: state.powerups.length
    },
    relief: {
      grace: Math.max(0, Math.floor(state.difficulty.grace || 0)),
      ghostGrace: Math.max(0, Math.floor(state.difficulty.ghostGrace || 0)),
      pacingMemory: roundSample(state.difficulty.pacingMemory || 0, 3)
    },
    run: {
      kills: Math.max(0, Math.floor((state.runStats && state.runStats.kills) || 0)),
      damageTaken: Math.max(0, Math.floor((state.runStats && state.runStats.damageTaken) || 0)),
      deaths: Math.max(0, Math.floor(state.difficultyDeaths || 0))
    }
  };
}

function recordDifficultySample(force = false) {
  if (!state.difficultySamples) state.difficultySamples = [];
  if (!force) {
    if (typeof DEBUG_SNAPSHOT_ENABLED !== "undefined" && !DEBUG_SNAPSHOT_ENABLED) return;
    if ((state.frame || 0) % DIFFICULTY_SAMPLE_INTERVAL !== 0) return;
  }
  state.difficultySamples.push(makeDifficultySample());
  if (state.difficultySamples.length > MAX_DIFFICULTY_SAMPLES) {
    state.difficultySamples.splice(0, state.difficultySamples.length - MAX_DIFFICULTY_SAMPLES);
  }
}

function applyLowHpReliefAfterHit() {
  const p = state.player;
  if (!p || p.hp > 2) return;
  state.waveMood = "recovery";
  state.waveMoodTimer = Math.max(state.waveMoodTimer || 0, p.hp <= 1 ? 170 : 140);
  state.waveRest = Math.max(state.waveRest || 0, p.hp <= 1 ? 72 : 48);
  if (!state.boss && !state.bossDeath) {
    if (p.hp <= 1) state.pendingSpawns.length = 0;
    else if (state.pendingSpawns.length > 2) state.pendingSpawns.splice(0, Math.floor(state.pendingSpawns.length / 2));
    const keepBullets = p.hp <= 1 ? 2 : 4;
    if (state.enemyBullets.length > keepBullets) {
      state.enemyBullets.splice(0, state.enemyBullets.length - keepBullets);
    }
  }
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
  if (state.frame < 5400 || state.phase <= 2) {
    state.intensityPhase = "cooldown";
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
  const comboLoad = clamp(Math.max(0, state.comboKills - 5) * 0.16, 0, 8);
  const bossLoad = state.boss ? 12 : 0;
  const relief = (5 - p.hp) * 8 + (state.difficulty.grace > 0 ? 10 : 0) + (state.difficulty.ghostGrace > 0 ? 4 : 0);
  const rhythm = rhythmProfile();
  const intensityBias = state.intensityPhase === "surge" ? 9 : state.intensityPhase === "cooldown" ? -8 : 0;
  const basePressure = 10 + openingRamp() * 8 + state.phase * 3.4;
  const target = clamp(basePressure + enemyLoad + bulletLoad + queueLoad + comboLoad + bossLoad - relief + rhythm.pressure + intensityBias, 0, 100);
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
    else if (state.phase >= 2 && state.phaseTimer > 900 && arc > 0.52 && openingRamp() > 0.35) next = Math.random() < 0.40 ? "spike" : "open";
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
  let target;
  if (state.phase <= 3) {
    target = 0.52 + openingRamp() * 0.17 + (state.phase - 1) * 0.045;
    target += clamp(state.phaseTimer / phaseDuration(state.phase), 0, 1) * 0.05;
  } else {
    target = 0.78 + (state.phase - 4) * 0.075;
    target += clamp((state.phaseTimer - 180) / 2400, 0, 0.14);
  }
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
  d.target = clamp(target, 0.50, 1.45);
  let lerp = 0.025;
  if (p.hp === 1) lerp = 0.06;
  else if (p.hp === p.maxHp && (d.killStreak > 0 || d.pacingMemory > 0.25 || accuracy > 0.6)) lerp = 0.03;
  else if (state.pressure > 70 || d.pacingMemory < -0.35) lerp = 0.04;
  d.threat += (d.target - d.threat) * lerp;
  d.threat = clamp(d.threat, 0.50, 1.45);
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
    life: extra.life ?? 240,
    r: extra.r ?? 4,
    nearMissed: false,
    damage: extra.damage ?? 1,
    drain: extra.drain ?? 0,
    curving: extra.curving ?? 0,
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
