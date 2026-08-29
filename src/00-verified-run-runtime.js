"use strict";

let activeRunRandomStreams = null;
let activeVerifiedRunTicket = null;
let activeCanonicalRunRandomStreams = null;
let activeCanonicalRunState = null;
let seededRunStarting = false;
let recordedRunInputs = null;
let pendingRunInputButtons = 0;
let activeCanonicalRunInput = null;
let canonicalPresentationCache = null;
let canonicalPresentationCacheTick = -1;
let canonicalPresentationCacheSource = null;

const CANONICAL_BOSS_PRESENTATION_SIZE = Object.freeze({
  standard: Object.freeze({ w: 130, h: 82 }),
  wraith: Object.freeze({ w: 152, h: 96 }),
  debris_warden: Object.freeze({ w: 148, h: 88 }),
  mothership: Object.freeze({ w: 170, h: 92 }),
  siphon_core: Object.freeze({ w: 142, h: 92 }),
  hive_breaker: Object.freeze({ w: 146, h: 90 }),
  rail_tyrant: Object.freeze({ w: 152, h: 88 }),
  gravity_well: Object.freeze({ w: 150, h: 90 })
});

function installRunRandomStreams(streams, ticket = null) {
  if (!streams || typeof streams.nextFloat !== "function" || !Array.isArray(streams.names)) {
    throw new TypeError("Verified run random streams are invalid.");
  }
  activeRunRandomStreams = streams;
  activeVerifiedRunTicket = ticket && typeof ticket === "object" ? Object.freeze({ ...ticket }) : null;
  return currentVerifiedRunContext();
}

function clearRunRandomStreams() {
  activeRunRandomStreams = null;
  activeVerifiedRunTicket = null;
  activeCanonicalRunRandomStreams = null;
  activeCanonicalRunState = null;
  recordedRunInputs = null;
  pendingRunInputButtons = 0;
  activeCanonicalRunInput = null;
  canonicalPresentationCache = null;
  canonicalPresentationCacheTick = -1;
  canonicalPresentationCacheSource = null;
}

function currentVerifiedRunContext() {
  return Object.freeze({
    seeded: activeRunRandomStreams !== null,
    ticket: activeVerifiedRunTicket,
    authoritativeState: activeCanonicalRunState !== null,
    canonicalTick: activeCanonicalRunState ? activeCanonicalRunState.tick : 0,
    recording: Array.isArray(recordedRunInputs),
    recordedTicks: Array.isArray(recordedRunInputs) ? recordedRunInputs.length : 0
  });
}

function runRandom(streamName) {
  return activeRunRandomStreams
    ? activeRunRandomStreams.nextFloat(streamName)
    : Math.random();
}

function runRandomRange(streamName, minimum, maximum) {
  const min = Number(minimum);
  const max = Number(maximum);
  if (!Number.isFinite(min) || !Number.isFinite(max) || max < min) {
    throw new TypeError("Run random range requires finite ordered bounds.");
  }
  return min + runRandom(streamName) * (max - min);
}

function beginRunInputRecording() {
  recordedRunInputs = [];
  pendingRunInputButtons = 0;
  activeCanonicalRunInput = null;
  return currentVerifiedRunContext();
}

async function beginSeededStandardRun(ticket) {
  if (seededRunStarting || activeRunRandomStreams || Array.isArray(recordedRunInputs)) {
    throw new Error("A seeded standard run is already active.");
  }
  const runTicket = ticket && typeof ticket === "object" ? ticket : {};
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(String(runTicket.runId || ""))) {
    throw new TypeError("Verified run ticket ID is invalid.");
  }
  seededRunStarting = true;
  try {
    const [streams, canonicalStreams] = await Promise.all([
      createRunRandomStreams(runTicket.rootSeed, runTicket.simRevision),
      createRunRandomStreams(runTicket.rootSeed, runTicket.simRevision)
    ]);
    const canonicalState = createSimulationState(runTicket);
    installRunRandomStreams(streams, runTicket);
    activeCanonicalRunRandomStreams = canonicalStreams;
    activeCanonicalRunState = canonicalState;
    beginRunInputRecording();
    return currentVerifiedRunContext();
  } finally {
    seededRunStarting = false;
  }
}

function currentCanonicalRunState() {
  return activeCanonicalRunState;
}

function canonicalPresentationPixel(value) {
  return Number(value) / StarStrikeVerifiedRunConstants.POSITION_UNITS_PER_PIXEL;
}

function canonicalPresentationAngle(value) {
  return Number(value || 0) * Math.PI * 2 / StarStrikeVerifiedRunConstants.ANGLE_UNITS;
}

function canonicalPresentationRadius(key, fallback = 10) {
  const circles = globalThis.AUTHORITATIVE_COLLISION_CIRCLES_PIXELS?.[String(key || "")];
  return Array.isArray(circles) && circles.length > 0 ? Number(circles[0].radius) : fallback;
}

function canonicalEnemyPresentation(enemy, repairTargets) {
  const x = canonicalPresentationPixel(enemy.x);
  const y = canonicalPresentationPixel(enemy.y);
  const vx = canonicalPresentationPixel(enemy.vx);
  const vy = canonicalPresentationPixel(enemy.vy);
  return {
    ...enemy,
    x,
    y,
    vx,
    vy,
    prevX: x - vx,
    prevY: y - vy,
    rotation: canonicalPresentationAngle(enemy.angle),
    loopPhase: canonicalPresentationAngle(enemy.loopAngle),
    railAngle: canonicalPresentationAngle(enemy.railAngle),
    r: Number(globalThis.AUTHORITATIVE_ENEMY_ARCHETYPES?.[enemy.type]?.radiusPixels || 12),
    reward: enemy.score,
    shoot: enemy.shootTimer,
    warn: enemy.warnTimer,
    flickerSeed: enemy.id,
    isRepairTarget: repairTargets.has(enemy.id),
    hitFlash: 0,
    hitPulse: 0
  };
}

function canonicalProjectilePresentation(projectile, fallbackRadius) {
  return {
    ...projectile,
    x: canonicalPresentationPixel(projectile.x),
    y: canonicalPresentationPixel(projectile.y),
    vx: canonicalPresentationPixel(projectile.vx),
    vy: canonicalPresentationPixel(projectile.vy),
    angle: canonicalPresentationAngle(projectile.angle),
    r: Number(projectile.r || fallbackRadius),
    trail: []
  };
}

function canonicalHazardPresentation(hazard) {
  const base = {
    ...hazard,
    x: canonicalPresentationPixel(hazard.x),
    y: canonicalPresentationPixel(hazard.y),
    vx: canonicalPresentationPixel(hazard.vx || 0),
    vy: canonicalPresentationPixel(hazard.vy || 0),
    rot: canonicalPresentationAngle(hazard.angle),
    rotation: canonicalPresentationAngle(hazard.angle),
    r: canonicalPresentationRadius(hazard.kind, hazard.kind === "meteor_warning" ? 18 : 10),
    spawnScale: 1,
    trail: hazard.kind === "comet_shard",
    armed: Number(hazard.armTimer || 0) <= 0,
    hitFlash: 0,
    hitPulse: 0
  };
  if (hazard.kind === "enemy_beam") {
    return {
      ...base,
      angle: canonicalPresentationAngle(hazard.angle),
      length: canonicalPresentationPixel(hazard.length),
      width: canonicalPresentationPixel(hazard.width),
      warnMax: hazard.warn,
      color: hazard.drain > 0 ? "#70ff45" : "#ff3046"
    };
  }
  if (hazard.kind === "gravity_well") {
    return {
      ...base,
      r: canonicalPresentationPixel(hazard.radius),
      pulse: canonicalPresentationAngle(hazard.pulseAngle),
      color: hazard.drain > 0 ? "#70ff45" : "#a45cff"
    };
  }
  return base;
}

function canonicalBossPresentation(boss) {
  if (!boss) return null;
  const size = CANONICAL_BOSS_PRESENTATION_SIZE[boss.mode] || CANONICAL_BOSS_PRESENTATION_SIZE.standard;
  return {
    ...boss,
    x: canonicalPresentationPixel(boss.x),
    y: canonicalPresentationPixel(boss.y),
    targetY: canonicalPresentationPixel(boss.targetY),
    angle: canonicalPresentationAngle(boss.angle),
    movePhase: canonicalPresentationAngle(boss.moveAngle),
    w: size.w,
    h: size.h,
    hitFlash: 0,
    hitPulse: 0
  };
}

function canonicalPresentationSafeGap(slot, options) {
  if (typeof globalThis.debrisSafeGap === "function") return globalThis.debrisSafeGap(slot, options);
  const slotWidth = options.width / options.slots;
  const center = slotWidth * (slot + 0.5);
  const clearance = options.asteroidRadius + options.playerRadius + options.margin;
  const minX = slot > 0 ? center - slotWidth + clearance : options.playerRadius + options.margin;
  const maxX = slot < options.slots - 1 ? center + slotWidth - clearance : options.width - options.playerRadius - options.margin;
  return { slot, center: Math.max(minX, Math.min(maxX, center)), minX, maxX, width: Math.max(0, maxX - minX) };
}

function canonicalPresentationSafeLanes(hazards) {
  const rows = new Map();
  for (const hazard of hazards) {
    if (hazard.kind !== "boss_wall" || !(hazard.safeLaneRow > 0)) continue;
    const key = `${hazard.safeLaneRow}:${hazard.safeGapSlot}:${hazard.safeSlots}`;
    if (!rows.has(key)) rows.set(key, hazard);
  }
  const width = StarStrikeVerifiedRunConstants.GAME_WIDTH_PIXELS;
  const asteroidRadius = canonicalPresentationRadius("boss_wall", 20.5);
  const playerRadius = canonicalPresentationRadius("player", 5);
  return Array.from(rows.values())
    .sort((left, right) => left.safeLaneRow - right.safeLaneRow)
    .map((hazard) => ({
      ...canonicalPresentationSafeGap(hazard.safeGapSlot, {
        slots: hazard.safeSlots,
        width,
        asteroidRadius,
        playerRadius,
        margin: 8
      }),
      row: hazard.safeLaneRow
    }));
}

function currentRunPresentationState(browserState) {
  const canonical = activeCanonicalRunState;
  if (!canonical || !browserState || typeof browserState !== "object") return browserState;
  if (
    canonicalPresentationCache &&
    canonicalPresentationCacheTick === canonical.tick &&
    canonicalPresentationCacheSource === browserState
  ) {
    return canonicalPresentationCache;
  }

  const repairTargets = new Set(canonical.enemies.map((enemy) => enemy.repairTargetId).filter((id) => id > 0));
  const hazards = canonical.hazards.map(canonicalHazardPresentation);
  const presentation = Object.create(browserState);
  presentation.enemies = canonical.enemies.map((enemy) => canonicalEnemyPresentation(enemy, repairTargets));
  presentation.bullets = canonical.playerProjectiles.map((projectile) => canonicalProjectilePresentation(projectile, 2.4));
  presentation.enemyBullets = canonical.enemyProjectiles.map((projectile) => canonicalProjectilePresentation(projectile, 3.4));
  presentation.debris = hazards.filter((hazard) => hazard.kind !== "enemy_beam" && hazard.kind !== "gravity_well");
  presentation.enemyBeams = hazards.filter((hazard) => hazard.kind === "enemy_beam");
  presentation.gravityWells = hazards.filter((hazard) => hazard.kind === "gravity_well");
  presentation.powerups = canonical.powerups.map((powerup) => ({
    ...powerup,
    x: canonicalPresentationPixel(powerup.x),
    y: canonicalPresentationPixel(powerup.y),
    vx: canonicalPresentationPixel(powerup.vx),
    vy: canonicalPresentationPixel(powerup.vy),
    rotation: canonicalPresentationAngle(powerup.wobbleAngle),
    spinSpeed: 0.024,
    size: 11
  }));
  presentation.wingmen = canonical.wingmen.map((wingman) => ({
    ...wingman,
    x: canonicalPresentationPixel(wingman.x),
    y: canonicalPresentationPixel(wingman.y),
    rotation: canonicalPresentationAngle(wingman.departureAngle),
    hitFlash: 0
  }));
  presentation.boss = canonicalBossPresentation(canonical.boss);
  presentation.safeLanes = canonicalPresentationSafeLanes(canonical.hazards);

  canonicalPresentationCache = presentation;
  canonicalPresentationCacheTick = canonical.tick;
  canonicalPresentationCacheSource = browserState;
  return presentation;
}

function canonicalRunOwnsGameplayOutcome() {
  return activeCanonicalRunState !== null;
}

function applyCanonicalRunAuthority(browserState) {
  const canonical = activeCanonicalRunState;
  if (!canonical || !browserState || typeof browserState !== "object") return false;
  const player = browserState.player;
  const stats = browserState.runStats;
  if (!player || typeof player !== "object" || !stats || typeof stats !== "object") {
    throw new TypeError("Ticketed browser state requires player and run statistics objects.");
  }
  const positionUnits = StarStrikeVerifiedRunConstants.POSITION_UNITS_PER_PIXEL;
  const energyUnits = StarStrikeVerifiedRunConstants.ENERGY_UNITS_PER_POINT;

  browserState.score = canonical.score;
  browserState.phase = canonical.phase;
  browserState.multiplier = canonical.multiplier;
  browserState.comboKills = canonical.comboKills;
  browserState.playerRealm = canonical.playerRealm;

  player.x = canonical.player.x / positionUnits;
  player.y = canonical.player.y / positionUnits;
  player.vx = canonical.player.vx / positionUnits;
  player.vy = canonical.player.vy / positionUnits;
  player.hp = canonical.player.hp;
  player.maxHp = canonical.player.maxHp;
  player.energy = canonical.player.energy / energyUnits;
  player.maxEnergy = canonical.player.maxEnergy / energyUnits;
  player.inv = canonical.player.invulnerability;
  player.fire = canonical.player.fireCooldown;
  player.spread = canonical.player.spread;
  player.rapid = canonical.player.rapid;
  player.ghostTimer = canonical.player.ghostTimer;
  player.dashTimer = canonical.player.dashTimer;
  player.ghostCooldown = canonical.player.ghostCooldown;
  player.overcharge = canonical.player.overcharge;
  player.phaseShield = canonical.player.phaseShield;
  player.magnet = canonical.player.magnet;
  player.piercing = canonical.player.piercing;
  player.stabilizer = canonical.player.stabilizer;
  player.scoreSurge = canonical.player.scoreSurge;
  player.maxSpeed = canonical.player.maxSpeed / positionUnits;

  stats.activeFrames = canonical.tick;
  stats.kills = canonical.stats.kills;
  stats.bosses = canonical.stats.bosses;
  stats.powerups = canonical.stats.powerups;
  stats.ghostUses = canonical.stats.ghostUses;
  stats.dashUses = canonical.stats.dashUses;
  stats.realmHops = canonical.stats.realmHops;
  stats.pauseUses = canonical.stats.pauseUses;
  stats.abilityUses = canonical.stats.ghostUses + canonical.stats.dashUses + canonical.stats.realmHops;
  stats.damageTaken = canonical.stats.damageTaken;
  stats.highestCombo = canonical.stats.highestCombo;
  return true;
}

function currentCanonicalRunParity(browserState = {}) {
  const canonical = activeCanonicalRunState;
  if (!canonical) {
    return { active: false, matched: false, canonicalTick: 0, differences: [] };
  }
  const source = browserState && typeof browserState === "object" ? browserState : {};
  const player = source.player && typeof source.player === "object" ? source.player : {};
  const differences = [];
  const arrayLength = (value) => Array.isArray(value) ? value.length : null;
  const compare = (field, browser, authority) => {
    if (browser !== authority) differences.push({ field, browser, canonical: authority });
  };

  compare("activeTicks", Number(source.runStats?.activeFrames), canonical.tick);
  compare("score", Number(source.score), canonical.score);
  compare("phase", Number(source.phase), canonical.phase);
  compare("multiplier", Number(source.multiplier), canonical.multiplier);
  compare("comboKills", Number(source.comboKills), canonical.comboKills);
  compare("playerRealm", Number(source.playerRealm), canonical.playerRealm);
  compare("player.x", Number(player.x), canonical.player.x / StarStrikeVerifiedRunConstants.POSITION_UNITS_PER_PIXEL);
  compare("player.y", Number(player.y), canonical.player.y / StarStrikeVerifiedRunConstants.POSITION_UNITS_PER_PIXEL);
  compare("player.hp", Number(player.hp), canonical.player.hp);
  compare("player.energy", Number(player.energy), canonical.player.energy / StarStrikeVerifiedRunConstants.ENERGY_UNITS_PER_POINT);
  compare("counts.playerProjectiles", arrayLength(source.bullets), canonical.playerProjectiles.length);
  compare("counts.enemyProjectiles", arrayLength(source.enemyBullets), canonical.enemyProjectiles.length);
  compare("counts.enemies", arrayLength(source.enemies), canonical.enemies.length);
  const browserHazards = [source.debris, source.enemyBeams, source.gravityWells]
    .reduce((total, value) => total + (Array.isArray(value) ? value.length : 0), 0);
  compare("counts.hazards", browserHazards, canonical.hazards.length);
  compare("counts.powerups", arrayLength(source.powerups), canonical.powerups.length);
  compare("counts.wingmen", arrayLength(source.wingmen), canonical.wingmen.length);
  compare("counts.pendingSpawns", arrayLength(source.pendingSpawns), canonical.pendingSpawns.length);
  compare("boss.active", Boolean(source.boss), Boolean(canonical.boss));

  return {
    active: true,
    matched: differences.length === 0,
    canonicalTick: canonical.tick,
    differences
  };
}

function captureCanonicalRunInput(inputState = {}, edgeButtons = 0) {
  const keyboard = inputState.keyboard && typeof inputState.keyboard === "object" ? inputState.keyboard : {};
  const joystick = inputState.joystick && typeof inputState.joystick === "object" ? inputState.joystick : {};
  let moveX = (keyboard.right === true ? 1 : 0) - (keyboard.left === true ? 1 : 0);
  let moveY = (keyboard.down === true ? 1 : 0) - (keyboard.up === true ? 1 : 0);
  if (joystick.active === true) {
    moveX += Number.isFinite(Number(joystick.ax)) ? Number(joystick.ax) : 0;
    moveY += Number.isFinite(Number(joystick.ay)) ? Number(joystick.ay) : 0;
  }
  const magnitude = Math.hypot(moveX, moveY);
  if (magnitude > 1) {
    moveX /= magnitude;
    moveY /= magnitude;
  }
  const canonical = canonicalRunInput({
    moveX,
    moveY,
    ghostPressed: (edgeButtons & BUTTON_GHOST_SHIFT) !== 0,
    pausePressed: (edgeButtons & BUTTON_PAUSE) !== 0
  });
  return Object.freeze(canonical);
}

function queueVerifiedRunInputEdge(action) {
  if (!Array.isArray(recordedRunInputs)) return false;
  if (action === "ghost") pendingRunInputButtons |= BUTTON_GHOST_SHIFT;
  else if (action === "pause") pendingRunInputButtons |= BUTTON_PAUSE;
  else throw new RangeError(`Unknown verified run input edge: ${action}`);
  return true;
}

function beginCanonicalRunTick(inputState = {}) {
  if (activeCanonicalRunInput) throw new Error("The prior canonical run tick is still active.");
  const canonical = captureCanonicalRunInput(inputState, pendingRunInputButtons);
  pendingRunInputButtons = 0;
  activeCanonicalRunInput = canonical;
  if (Array.isArray(recordedRunInputs)) {
    recordCanonicalRunInput({
      moveX: canonical.x / 127,
      moveY: canonical.y / 127,
      ghostPressed: (canonical.buttons & BUTTON_GHOST_SHIFT) !== 0,
      pausePressed: (canonical.buttons & BUTTON_PAUSE) !== 0
    });
  }
  return Object.freeze({
    x: canonical.x / 127,
    y: canonical.y / 127,
    ghostPressed: (canonical.buttons & BUTTON_GHOST_SHIFT) !== 0,
    pausePressed: (canonical.buttons & BUTTON_PAUSE) !== 0
  });
}

function currentCanonicalRunVector(inputState = {}) {
  const canonical = activeCanonicalRunInput || captureCanonicalRunInput(inputState);
  return Object.freeze({ x: canonical.x / 127, y: canonical.y / 127 });
}

function endCanonicalRunTick(browserState = null) {
  const canonical = activeCanonicalRunInput;
  activeCanonicalRunInput = null;
  if (activeCanonicalRunState && canonical) {
    stepSimulation(activeCanonicalRunState, canonical, activeCanonicalRunRandomStreams);
    canonicalPresentationCache = null;
    canonicalPresentationCacheTick = -1;
    canonicalPresentationCacheSource = null;
    if (browserState) applyCanonicalRunAuthority(browserState);
    return Object.freeze({
      advanced: true,
      terminal: activeCanonicalRunState.terminal === true,
      canonicalTick: activeCanonicalRunState.tick
    });
  }
  return Object.freeze({
    advanced: false,
    terminal: activeCanonicalRunState?.terminal === true,
    canonicalTick: activeCanonicalRunState ? activeCanonicalRunState.tick : 0
  });
}

function recordCanonicalRunInput(rawInput = {}) {
  if (!Array.isArray(recordedRunInputs)) throw new Error("Run input recording is not active.");
  if (recordedRunInputs.length >= StarStrikeVerifiedRunConstants.MAX_RUN_TICKS) {
    throw new RangeError("Run input recording exceeds the tick ceiling.");
  }
  const input = canonicalRunInput(rawInput);
  recordedRunInputs.push({
    moveX: input.x / 127,
    moveY: input.y / 127,
    ghostPressed: (input.buttons & BUTTON_GHOST_SHIFT) !== 0,
    pausePressed: (input.buttons & BUTTON_PAUSE) !== 0
  });
  return input;
}

function finalizeRunInputRecording(metadata = {}) {
  if (!Array.isArray(recordedRunInputs) || recordedRunInputs.length === 0) {
    throw new Error("Run input recording has no ticks.");
  }
  const frames = recordedRunInputs;
  recordedRunInputs = null;
  pendingRunInputButtons = 0;
  activeCanonicalRunInput = null;
  return encodeInputTape(frames, metadata);
}

function finalizeRecordedInputTape(metadata = {}) {
  return finalizeRunInputRecording(metadata);
}

function cancelRunInputRecording() {
  recordedRunInputs = null;
  pendingRunInputButtons = 0;
  activeCanonicalRunInput = null;
}

globalThis.installRunRandomStreams = installRunRandomStreams;
globalThis.clearRunRandomStreams = clearRunRandomStreams;
globalThis.currentVerifiedRunContext = currentVerifiedRunContext;
globalThis.runRandom = runRandom;
globalThis.runRandomRange = runRandomRange;
globalThis.beginRunInputRecording = beginRunInputRecording;
globalThis.beginSeededStandardRun = beginSeededStandardRun;
globalThis.currentCanonicalRunState = currentCanonicalRunState;
globalThis.currentRunPresentationState = currentRunPresentationState;
globalThis.canonicalRunOwnsGameplayOutcome = canonicalRunOwnsGameplayOutcome;
globalThis.applyCanonicalRunAuthority = applyCanonicalRunAuthority;
globalThis.currentCanonicalRunParity = currentCanonicalRunParity;
globalThis.captureCanonicalRunInput = captureCanonicalRunInput;
globalThis.queueVerifiedRunInputEdge = queueVerifiedRunInputEdge;
globalThis.beginCanonicalRunTick = beginCanonicalRunTick;
globalThis.currentCanonicalRunVector = currentCanonicalRunVector;
globalThis.endCanonicalRunTick = endCanonicalRunTick;
globalThis.recordCanonicalRunInput = recordCanonicalRunInput;
globalThis.finalizeRunInputRecording = finalizeRunInputRecording;
globalThis.finalizeRecordedInputTape = finalizeRecordedInputTape;
globalThis.cancelRunInputRecording = cancelRunInputRecording;
