// Star Strike RUSH legacy game part 5
// Generated from js/legacyGame.js by scripts/split-legacy-game.mjs.
// Do not edit generated part files directly.

      damagePlayer(1);
    }
  }

  for (let i = state.enemies.length - 1; i >= 0; i--) {
    const e = state.enemies[i];
    const wingmanProtected = p.ghostTimer > 0;
    if (!wingmanProtected) {
      let wingmanHit = false;
      for (let w = state.wingmen.length - 1; w >= 0; w--) {
        const wm = state.wingmen[w];
        if (circleHit(e.x, e.y, e.r, wm.x, wm.y, 12)) {
          state.wingmen.splice(w, 1);
          state.enemies.splice(i, 1);
          spawnParticles(wm.x, wm.y, 12, "#f6f", 0.9);
          spawnDeathBurst(e.x, e.y, 10);
          wingmanHit = true;
          break;
        }
      }
      if (wingmanHit) continue;
    }

    if (e.type === "phantom") {
      if (isWraithActive()) {
        if (e.telegraphTimer > 0) continue;
        const playerIsGhost = state.playerRealm === 1;
        const phantomIsGhost = e.stateMode === "ghost";
        if (playerIsGhost !== phantomIsGhost) continue;
      } else if (p.ghostTimer > 0) {
        continue;
      }
    }

    if (circleHit(e.x, e.y, e.r, p.x, p.y, 14) && p.inv <= 0) {
      state.enemies.splice(i, 1);
      damagePlayer(1);
    }
  }

  for (let i = state.powerups.length - 1; i >= 0; i--) {
    const pu = state.powerups[i];
    if (circleHit(pu.x, pu.y, pu.size, p.x, p.y, 15)) {
      collectPowerup(pu);
      state.powerups.splice(i, 1);
    }
  }
}
function updatePendingSpawns() {
  for (let i = state.pendingSpawns.length - 1; i >= 0; i--) {
    const s = state.pendingSpawns[i];
    s.delay--;
    if (s.delay <= 0) {
      spawnEnemy(s.type, s.x, s.y, s.extra || {});
      state.pendingSpawns.splice(i, 1);
    }
  }
}
function updateWavesAndPhaseAndPressure() {
  if (state.bossRecovery > 0) {
    state.bossRecovery--;
    updatePressure();
    updatePacingMemory();
    updateWaveMood();
    state.threatScore = calculateThreatScore();
    updateDifficulty();
    state.cachedBulletPressure = enemyBulletPressure();
    state.cachedBulletBudget = enemyBulletBudget();
    state.frameBulletSpent = 0;
    updatePendingSpawns();
    return;
  }
  const bossLocked = !!(state.boss || state.bossDeath);
  if (!bossLocked) {
    state.phaseTimer++;
    state.waveTimer++;
    if (state.waveRest > 0) state.waveRest--;
  }
  updateIntensityCycle();
  const sinceHit = state.frame - state.difficulty.lastHitFrame;
  const strongPerformance = sinceHit > 720 && state.difficulty.killStreak >= 5 && !bossLocked;
  const comfort = sinceHit > 840 && state.player.hp === state.player.maxHp && state.pressure < 48 && !bossLocked;
  if (strongPerformance) { state.phaseTimer += 0.25; state.waveTimer += 0.10; }
  if (comfort) { state.phaseTimer += 0.40; state.waveTimer += 0.18; }
  if (state.difficulty.pacingMemory > 0.35) { state.phaseTimer += 0.10; state.waveTimer += 0.05; }
  if (state.intensityPhase === "surge") { state.phaseTimer += 0.10; state.waveTimer += 0.10; }
  updatePressure();
  updatePacingMemory();
  updateWaveMood();
  state.threatScore = calculateThreatScore();
  updateDifficulty();
  state.cachedBulletPressure = enemyBulletPressure();
  state.cachedBulletBudget = enemyBulletBudget();
  state.frameBulletSpent = 0;
  if (bossLocked) { updatePendingSpawns(); return; }
  if (state.phaseTimer >= phaseDuration(state.phase)) {
    state.phase++;
    state.phaseTimer = 0;
    state.waveTimer = 0;
    state.waveRest = 18;
    state.waveMood = "open";
    state.waveMoodTimer = 120;
    state.lastWaveTemplateName = null;
    showMessage("PHASE " + state.phase, 100);
    saveMilestone();
    if (state.phase % 4 === 0) spawnBoss();
  }
  let baseInterval;
  if (state.phase === 1) baseInterval = state.phaseTimer < 500 ? 118 : state.phaseTimer < 900 ? 104 : 92;
  else baseInterval = Math.max(38, 88 - state.phase * 3.5);
  const rhythm = rhythmProfile();
  baseInterval += rhythm.interval;
  if (state.waveMood === "spike") baseInterval *= 0.82;
  else if (state.waveMood === "recovery") baseInterval *= 1.22;
  else if (state.waveMood === "rule") baseInterval *= 0.92;
  if (state.difficulty.pacingMemory > 0.45) baseInterval *= 0.90;
  if (state.difficulty.pacingMemory < -0.35) baseInterval *= 1.08;
  if (state.intensityPhase === "surge") baseInterval *= 0.78;
  if (state.intensityPhase === "cooldown") baseInterval *= 1.18;
  if (state.difficulty.grace > 0) baseInterval += 10;
  if (state.difficulty.ghostGrace > 0) baseInterval += 8;
  if (state.player.hp <= 2) baseInterval += 8;
  if (state.player.hp === 1) baseInterval += 6;
  if (state.boss) baseInterval += 12;
  if (state.waveRest > 0) baseInterval += Math.floor(state.waveRest * 0.5);
  const load = peakLoad();
  baseInterval += Math.round(load * 18);
  baseInterval += Math.round((state.pressure - 50) * 0.08);
  const interval = Math.round(baseInterval / clamp(state.difficulty.threat, 0.75, 1.25));
  let threatBudget = 11.5 + state.phase * 2.8 + (state.intensityPhase === "surge" ? 0.8 : state.intensityPhase === "cooldown" ? -0.8 : 0);
  if (state.waveMood === "spike") threatBudget += 1.2;
  else if (state.waveMood === "recovery") threatBudget -= 1.2;
  else if (state.waveMood === "rule") threatBudget += 0.5;
  if (state.difficulty.pacingMemory > 0.45) threatBudget += 0.75;
  if (state.difficulty.pacingMemory < -0.35) threatBudget -= 0.6;
  if (!state.boss && state.pendingSpawns.length === 0 && state.waveTimer >= interval && state.threatScore < threatBudget) {
    spawnWave();
    state.waveTimer = 0;
  }
  updatePendingSpawns();
}

const TITLE_PATTERNS = {
  vee: [[0,0],[-26,16],[26,16]],
  line: [[-34,0],[0,0],[34,0]],
  arrow: [[0,0],[-24,18],[24,18],[0,34]],
  diamond: [[0,0],[-24,16],[24,16],[0,32]],
  escort: [[0,0],[-18,12],[18,12]]
};

function pickFormationPathType() {
  const r = Math.random();
  if (r < 0.30) return "horizontal";
  if (r < 0.50) return "diagonal";
  if (r < 0.75) return "sweep";
  if (r < 0.90) return "figure_pass";
  return "strafe";
}
function makeTitleFormation(lane = 0, dir = 1, spawnAbove = false) {
  const laneYs = titleLaneYs();
  const patternNames = Object.keys(TITLE_PATTERNS);
  const pattern = patternNames[Math.floor(Math.random() * patternNames.length)];
  const kind = ["red", "orange", "purple"][Math.floor(Math.random() * 3)];
  const pathType = pickFormationPathType();
  const sway = rand(0, TAU);
  const members = 3 + (Math.random() < 0.25 ? 1 : 0);

  let x = 0, y = 0, vx = 0, vy = 0, baseY = laneYs[lane] + rand(-8, 8);
  let pathDuration = 180, speed = rand(0.8, 1.0);
  let startX = 0, startY = 0;

  if (pathType === "horizontal") {
    dir = Math.random() < 0.5 ? 1 : -1;
    startX = dir > 0 ? -rand(180, 320) : W + rand(180, 320);
    x = startX;
    y = baseY;
    vx = dir * rand(0.55, 0.82);
    vy = 0;
    pathDuration = Math.ceil((W + 420) / Math.max(0.55, Math.abs(vx))) + 120;
  } else if (pathType === "diagonal") {
    const corners = [
      [-120, -120, 1, 1],
      [W + 120, -120, -1, 1],
      [-120, H + 120, 1, -1],
      [W + 120, H + 120, -1, -1]
    ];
    const c = corners[Math.floor(Math.random() * corners.length)];
    x = startX = c[0];
    y = startY = c[1];
    vx = c[2] * rand(0.55, 0.78);
    vy = c[3] * rand(0.55, 0.78);
    pathDuration = Math.ceil(Math.max(W, H) / 0.85) + 120;
  } else if (pathType === "sweep") {
    dir = Math.random() < 0.5 ? 1 : -1;
    startX = dir > 0 ? -rand(180, 280) : W + rand(180, 280);
    x = startX;
    baseY = H * rand(0.15, 0.30);
    y = baseY;
    vx = dir * rand(0.50, 0.78);
    vy = 0;
    pathDuration = Math.ceil((W + 420) / Math.max(0.55, Math.abs(vx))) + 140;
  } else if (pathType === "figure_pass") {
    x = startX = W * rand(0.22, 0.78);
    y = startY = -120;
    pathDuration = 240;
    speed = rand(0.55, 0.70);
  } else if (pathType === "strafe") {
    dir = Math.random() < 0.5 ? 1 : -1;
    startX = dir > 0 ? -rand(200, 300) : W + rand(200, 300);
    x = startX;
    y = startY = H * rand(0.40, 0.70);
    vx = dir * rand(0.90, 1.10);
    vy = rand(0.15, 0.25) * (Math.random() < 0.5 ? -1 : 1);
    pathDuration = Math.ceil((W + 420) / Math.max(0.90, Math.abs(vx))) + 120;
  }

  return {
    x, y, vx, vy, baseY,
    dir,
    speed,
    pattern,
    kind,
    pathType,
    pathT: 0,
    pathDuration,
    startX,
    startY,
    enterX: x,
    enterY: y,
    apexY: H * rand(0.35, 0.50),
    sweepAmplitude: rand(60, 120),
    depth: rand(H * 0.35, H * 0.50),
    reversed: false,
    members,
    age: 0,
    sway,
    rot: rand(-0.03, 0.03),
    bank: rand(-0.02, 0.02),
    leaderHistory: [],
    prevX: x,
    prevY: y,
    vx_this_frame: 0,
    vy_this_frame: 0,
    angle: Math.PI / 2,
    removed: false,
    spawnBlockedFrames: 0
  };
}
function initTitleFormations() {
  state.titleFormations = [];
  state.titleLaneCooldowns = [0, 0, 0, 0];
  state.titleLaneCursor = 0;
  state.titleSpawnTimer = 18;
  const startCount = 2;
  for (let i = 0; i < startCount; i++) {
    const lane = i % titleLaneYs().length;
    const dir = lane % 2 === 0 ? 1 : -1;
    const f = makeTitleFormation(lane, dir, true);
    if (f.pathType === "horizontal") {
      f.x = dir > 0 ? -rand(200, 360) : W + rand(200, 360);
    }
    state.titleFormations.push(f);
    state.titleLaneCooldowns[lane] = 90 + lane * 12;
  }
}
function formationSpawnWouldOverlap(newF) {
  for (const other of state.titleFormations) {
    if (!other || other.removed) continue;
    const yOverlap = Math.abs(other.y - newF.baseY) < 80;
    const sameDir = other.dir === newF.dir;
    const closeX = Math.abs(other.x - newF.x) < 200;
    if (yOverlap && sameDir && closeX) return true;
    if (Math.hypot(other.x - newF.x, other.y - newF.baseY) < 140) return true;
  }
  return false;
}
function spawnTitleFormationIfPossible() {
  const lanes = titleLaneYs();
  let lane = -1;
  for (let attempt = 0; attempt < lanes.length; attempt++) {
    const idx = (state.titleLaneCursor + attempt) % lanes.length;
    if (state.titleLaneCooldowns[idx] === 0) {
      lane = idx;
      state.titleLaneCursor = (idx + 1) % lanes.length;
      break;
    }
  }
  if (lane < 0) return false;
  const dir = lane % 2 === 0 ? 1 : -1;
  const f = makeTitleFormation(lane, dir, true);
  if (formationSpawnWouldOverlap(f)) return false;
  state.titleFormations.push(f);
  state.titleLaneCooldowns[lane] = 120;
  return true;
}
function updateTitleFormations() {
  if (!state.titleFormations.length) initTitleFormations();

  for (let i = state.titleLaneCooldowns.length - 1; i >= 0; i--) {
    state.titleLaneCooldowns[i] = Math.max(0, state.titleLaneCooldowns[i] - 1);
  }

  for (let i = state.titleFormations.length - 1; i >= 0; i--) {
    const f = state.titleFormations[i];
    if (!f || f.removed) continue;
    f.age++;
    f.pathT++;
    f.prevX = f.x;
    f.prevY = f.y;

    const t = f.pathT;
    if (f.pathType === "horizontal") {
      f.x += f.dir * f.speed;
      f.y = f.baseY;
    } else if (f.pathType === "diagonal") {
      f.x += f.vx;
      f.y += f.vy;
    } else if (f.pathType === "sweep") {
      f.x += f.dir * f.speed;
      f.y = f.baseY + Math.sin(t * 0.022) * f.sweepAmplitude;
    } else if (f.pathType === "figure_pass") {
      const half = Math.max(1, Math.floor(f.pathDuration / 2));
      const riseTarget = f.apexY;
      const startY = f.startY;
      const fallY = -120;
      if (t <= half) {
        const u = clamp(t / half, 0, 1);
        f.y = startY + easeOutCubic(u) * (riseTarget - startY);
      } else {
        const u = clamp((t - half) / half, 0, 1);
        f.y = riseTarget - easeOutCubic(u) * (riseTarget - fallY);
      }
      f.x = f.enterX + Math.sin(t * 0.03) * 180;
    } else if (f.pathType === "strafe") {
      f.x += f.dir * f.speed;
      f.y += f.vy;
    }

    f.vx_this_frame = f.x - f.prevX;
    f.vy_this_frame = f.y - f.prevY;
    f.angle = Math.atan2(f.vy_this_frame, f.vx_this_frame) - Math.PI / 2;

    f.leaderHistory.push({ x: f.x, y: f.y });
    if (f.leaderHistory.length > 12) f.leaderHistory.shift();

    const offscreenMargin = 260;
    if (
      f.pathT > f.pathDuration + 60 ||
      f.x < -offscreenMargin || f.x > W + offscreenMargin ||
      f.y < -180 || f.y > H + 180
    ) {
      f.removed = true;
      state.titleFormations.splice(i, 1);
    }
  }

  state.titleSpawnTimer--;
  if (state.titleSpawnTimer <= 0 && state.titleFormations.length < 3) {
    if (!spawnTitleFormationIfPossible()) {
      state.titleSpawnTimer = 1;
    } else {
      state.titleSpawnTimer = Math.floor(rand(75, 120));
    }
  }

  if (state.titleFormations.length > 3) state.titleFormations.length = 3;
}
function updateTitleScreen() {
  updateTitleFormations();
  if (titlePanelTarget === 0 && titlePanelAnim < 0.02) {
    titleSubState = "main";
    codexDetailType = null;
  }
  titlePanelAnim += (titlePanelTarget - titlePanelAnim) * 0.22;
  callSignCursorBlink = (callSignCursorBlink + 1) % 56;

  if (playBtnPointerDown && playBtnPointerInside) {
    playBtnHold++;
    if (playBtnHold >= 45) {
      playBtnHold = 0;
      playBtnPointerDown = false;
      playBtnPointerInside = false;
      beginGame();
    }
  } else if (playBtnPointerDown && !playBtnPointerInside) {
    playBtnHold = 0;
  }
}
function updateRespawnHold() {
  if (respawnPointerDown && respawnPointerInside) {
    respawnHold++;
    if (respawnHold >= 30) {
      respawnHold = 0;
      respawnPointerDown = false;
      respawnPointerInside = false;
      beginGame();
    }
  } else if (respawnPointerDown && !respawnPointerInside) {
    respawnHold = 0;
  }
}

function setCallSignFromInputKey(e) {
  if (e.key === "Enter" || e.key === "Escape") {
    callSignEditing = false;
    callSignInputEl.blur();
  } else if (e.key === "Backspace") {
    callSign = callSign.slice(0, -1);
    callSignInputEl.value = callSign;
    saveCallSign();
  } else if (e.key.length === 1 && callSign.length < 12) {
    const ch = e.key.toUpperCase();
    if (/^[A-Z0-9_]$/.test(ch)) { callSign += ch; callSignInputEl.value = callSign; saveCallSign(); }
  }
  e.preventDefault();
}
function getCallSignRect() {
  return { x: W / 2 - 120, y: H * 0.355 - 20, w: 240, h: 40 };
}
function getPlayButtonRect() {
  return { x: W / 2 - 100, y: H * 0.465 - 25, w: 200, h: 50 };
}
function getTitleIconRects() {
  const centerX = W / 2;
  const y = H * 0.58;
  const size = 46;
  const gap = 20;
  const total = size * 2 + gap;
  const startX = centerX - total / 2;
  return {
    settings: { x: startX, y, w: size, h: size },
    codex: { x: startX + size + gap, y, w: size, h: size }
  };
}
function getTitlePanelRect() {
  const panelW = Math.min(W * 0.84, W - 24);
  const panelH = Math.min(H * 0.72, H - 32);
  const openX = (W - panelW) / 2;
  const closedX = W + 24;
  const anim = clamp(titlePanelAnim, 0, 1);
  const x = openX + (closedX - openX) * (1 - anim);
  const y = (H - panelH) / 2;
  return { x, y, w: panelW, h: panelH };
}
function getGameOverButtons() {
  const btnW = 220, btnH = 42, x = Math.round((W - btnW) / 2), y1 = Math.round(H * 0.60), gap = 12;
  return { respawn: { x, y: y1, w: btnW, h: btnH }, title: { x, y: y1 + btnH + gap, w: btnW, h: btnH } };
}
function hitRect(rect, x, y) { return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h; }
