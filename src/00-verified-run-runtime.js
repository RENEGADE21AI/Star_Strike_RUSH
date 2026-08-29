"use strict";

let activeRunRandomStreams = null;
let activeVerifiedRunTicket = null;
let activeCanonicalRunRandomStreams = null;
let activeCanonicalRunState = null;
let seededRunStarting = false;
let recordedRunInputRecorder = null;
let recordedRunInputPersistence = null;
let verifiedInputDatabasePromise = null;
let pendingRunInputButtons = 0;
let activeCanonicalRunInput = null;
let canonicalFeedbackDispatching = false;
let canonicalPresentationCache = null;
let canonicalPresentationCacheTick = -1;
let canonicalPresentationCacheSource = null;
const canonicalEnemyFeedbackUntil = new Map();
const canonicalHazardFeedbackUntil = new Map();
const canonicalWingmanFeedbackUntil = new Map();
let canonicalBossFeedbackUntil = 0;

const VERIFIED_INPUT_DATABASE_NAME = "star-strike-rush-verified-input-v1";
const VERIFIED_INPUT_DATABASE_VERSION = 1;
const VERIFIED_INPUT_CHUNK_STORE = "inputChunks";

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
  recordedRunInputRecorder = null;
  recordedRunInputPersistence = null;
  pendingRunInputButtons = 0;
  activeCanonicalRunInput = null;
  canonicalFeedbackDispatching = false;
  canonicalPresentationCache = null;
  canonicalPresentationCacheTick = -1;
  canonicalPresentationCacheSource = null;
  canonicalEnemyFeedbackUntil.clear();
  canonicalHazardFeedbackUntil.clear();
  canonicalWingmanFeedbackUntil.clear();
  canonicalBossFeedbackUntil = 0;
}

function openVerifiedInputDatabase() {
  if (!globalThis.indexedDB || typeof globalThis.indexedDB.open !== "function") return Promise.resolve(null);
  if (verifiedInputDatabasePromise) return verifiedInputDatabasePromise;
  verifiedInputDatabasePromise = new Promise((resolve, reject) => {
    const request = globalThis.indexedDB.open(VERIFIED_INPUT_DATABASE_NAME, VERIFIED_INPUT_DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(VERIFIED_INPUT_CHUNK_STORE)) {
        database.createObjectStore(VERIFIED_INPUT_CHUNK_STORE, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Verified input database could not be opened."));
    request.onblocked = () => reject(new Error("Verified input database upgrade was blocked."));
  });
  return verifiedInputDatabasePromise;
}

async function persistVerifiedInputChunk(runId, bytes, summary) {
  const database = await openVerifiedInputDatabase();
  if (!database) return false;
  await new Promise((resolve, reject) => {
    const transaction = database.transaction(VERIFIED_INPUT_CHUNK_STORE, "readwrite");
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error || new Error("Verified input chunk write failed."));
    transaction.onabort = () => reject(transaction.error || new Error("Verified input chunk write was aborted."));
    transaction.objectStore(VERIFIED_INPUT_CHUNK_STORE).put({
      id: `${runId}:${String(summary.chunkIndex).padStart(8, "0")}`,
      runId,
      chunkIndex: summary.chunkIndex,
      firstSegmentIndex: summary.firstSegmentIndex,
      segmentCount: summary.segmentCount,
      tickCount: summary.tickCount,
      bytes: bytes.slice(),
      savedAtMs: Date.now()
    });
  });
  return true;
}

function createRecordedRunInputPersistence(runId) {
  if (!globalThis.indexedDB || !/^[A-Za-z0-9_-]{1,128}$/.test(String(runId || ""))) return null;
  const pending = new Set();
  let failed = false;
  let persistedChunks = 0;
  return Object.freeze({
    enqueue(bytes, summary) {
      let operation;
      operation = persistVerifiedInputChunk(runId, bytes, summary)
        .then((stored) => {
          if (stored) persistedChunks++;
        })
        .catch(() => {
          failed = true;
        })
        .finally(() => pending.delete(operation));
      pending.add(operation);
    },
    async wait() {
      while (pending.size > 0) await Promise.all(Array.from(pending));
      return Object.freeze({ ok: !failed, persistedChunks });
    }
  });
}

async function waitForRecordedRunInputPersistence() {
  if (!recordedRunInputPersistence) return Object.freeze({ ok: true, persistedChunks: 0 });
  return recordedRunInputPersistence.wait();
}

function currentVerifiedRunContext() {
  const recordingStatus = recordedRunInputRecorder ? recordedRunInputRecorder.status() : null;
  return Object.freeze({
    seeded: activeRunRandomStreams !== null,
    ticket: activeVerifiedRunTicket,
    authoritativeState: activeCanonicalRunState !== null,
    canonicalTick: activeCanonicalRunState ? activeCanonicalRunState.tick : 0,
    recording: recordingStatus !== null,
    recordedTicks: recordingStatus ? recordingStatus.tickCount : 0,
    recordedSegments: recordingStatus ? recordingStatus.segmentCount : 0,
    recordedBytes: recordingStatus ? recordingStatus.compactByteLength : 0
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

function beginRunInputRecording(options = {}) {
  recordedRunInputPersistence = activeVerifiedRunTicket
    ? createRecordedRunInputPersistence(activeVerifiedRunTicket.runId)
    : null;
  const recorderOptions = { ...options };
  if (recordedRunInputPersistence && typeof recorderOptions.onChunk !== "function") {
    recorderOptions.onChunk = (bytes, summary) => recordedRunInputPersistence.enqueue(bytes, summary);
  }
  recordedRunInputRecorder = createInputTapeRecorder(recorderOptions);
  pendingRunInputButtons = 0;
  activeCanonicalRunInput = null;
  return currentVerifiedRunContext();
}

async function beginSeededStandardRun(ticket) {
  if (seededRunStarting || activeRunRandomStreams || recordedRunInputRecorder) {
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
  const feedbackActive = Number(canonicalEnemyFeedbackUntil.get(enemy.id) || 0) >= Number(activeCanonicalRunState?.tick || 0);
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
    hitFlash: feedbackActive ? 12 : 0,
    hitPulse: feedbackActive ? 1 : 0
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
  const feedbackActive = Number(canonicalHazardFeedbackUntil.get(hazard.id) || 0) >= Number(activeCanonicalRunState?.tick || 0);
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
    hitFlash: feedbackActive ? 8 : 0,
    hitPulse: feedbackActive ? 1 : 0
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
    hitFlash: canonicalBossFeedbackUntil >= Number(activeCanonicalRunState?.tick || 0) ? 10 : 0,
    hitPulse: canonicalBossFeedbackUntil >= Number(activeCanonicalRunState?.tick || 0) ? 1 : 0
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
    hitFlash: Number(canonicalWingmanFeedbackUntil.get(wingman.id) || 0) >= canonical.tick ? 8 : 0
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

function canonicalRunSuppressesLegacyFeedback() {
  return activeCanonicalRunState !== null && !canonicalFeedbackDispatching;
}

function legacyGameplayFeedbackAllowed() {
  return !canonicalRunSuppressesLegacyFeedback();
}

function canonicalFeedbackPixel(value) {
  return Number(value) / StarStrikeVerifiedRunConstants.POSITION_UNITS_PER_PIXEL;
}

function dispatchCanonicalRunFeedback(browserState) {
  const canonical = activeCanonicalRunState;
  if (!canonical || !browserState || typeof browserState !== "object") return false;
  const events = Array.isArray(canonical.feedbackEvents) ? canonical.feedbackEvents : [];
  for (const feedbackMap of [canonicalEnemyFeedbackUntil, canonicalHazardFeedbackUntil, canonicalWingmanFeedbackUntil]) {
    for (const [entityId, expiresAt] of feedbackMap) {
      if (expiresAt < canonical.tick) feedbackMap.delete(entityId);
    }
  }
  browserState.lastCanonicalFeedback = { tick: canonical.tick, events };
  const play = (name, volume) => {
    if (typeof globalThis.playGameSound === "function") globalThis.playGameSound(name, volume);
  };
  const particles = (x, y, count, color, speed) => {
    if (typeof globalThis.spawnParticles === "function") globalThis.spawnParticles(x, y, count, color, speed);
  };
  const burst = (x, y, count) => {
    if (typeof globalThis.spawnDeathBurst === "function") globalThis.spawnDeathBurst(x, y, count);
  };

  canonicalFeedbackDispatching = true;
  try {
    for (const event of events) {
      const x = canonicalFeedbackPixel(event.x);
      const y = canonicalFeedbackPixel(event.y);
      if (event.type === "player_fire") {
        play("player_fire", event.sourceKind === "wingman" ? 0.18 : canonical.player.rapid > 0 ? 0.20 : 0.27);
        if (event.sourceKind === "player" && canonical.player.rapid > 0 && typeof globalThis.spawnRapidFireMuzzleParticles === "function") {
          globalThis.spawnRapidFireMuzzleParticles(x, y);
        }
      } else if (event.type === "ability") {
        if (event.abilityKind === "realm_hop") {
          particles(x, y, 10, event.realm === 0 ? "#bfe8ff" : "#d9b6ff", 0.9);
          play("ability", 0.86);
          if (browserState.fx) browserState.fx.flash = Math.max(Number(browserState.fx.flash || 0), 4);
          browserState.comboPulse = Math.max(Number(browserState.comboPulse || 0), 6);
        } else if (event.abilityKind === "dash") {
          particles(x, y, 16, "#ffcc78", 1.35);
          play("ability", 1.0);
          if (browserState.fx) browserState.fx.flash = Math.max(Number(browserState.fx.flash || 0), 6);
        } else {
          particles(x, y, 10, "#fff", 1.05);
          play("ability", 0.84);
          if (browserState.fx) browserState.fx.flash = Math.max(Number(browserState.fx.flash || 0), 6);
        }
      } else if (event.type === "enemy_hit") {
        canonicalEnemyFeedbackUntil.set(event.entityId, canonical.tick + 11);
        particles(x, y, 6, "#fff", 0.7);
        play("enemy_hit", 0.62);
      } else if (event.type === "enemy_shield_hit") {
        canonicalEnemyFeedbackUntil.set(event.entityId, canonical.tick + 7);
        particles(x, y, 5, "#bff6ff", 0.52);
        play("enemy_hit", 0.32);
      } else if (event.type === "enemy_destroyed") {
        const count = event.entityKind === "purple" ? 22 : event.entityKind === "phantom" ? 18 : event.entityKind === "carrier" ? 24 : 14;
        burst(x, y, count);
        play("destroy", event.entityKind === "carrier" ? 1.1 : 0.72);
      } else if (event.type === "boss_hit") {
        canonicalBossFeedbackUntil = canonical.tick + 9;
        particles(x, y, 7, "#fff", 0.82);
        play("boss_hit", 0.78);
      } else if (event.type === "boss_destroyed") {
        particles(x, y, 50, "#fff", 1.1);
        particles(x, y, 24, "#9ff", 1.0);
        play("boss_destroy", 1.2);
        if (typeof globalThis.kickShake === "function") globalThis.kickShake(14);
        if (browserState.fx) browserState.fx.flash = Math.max(Number(browserState.fx.flash || 0), 14);
      } else if (event.type === "hazard_hit") {
        canonicalHazardFeedbackUntil.set(event.entityId, canonical.tick + 7);
        particles(x, y, 6, "#fff", 0.52);
        play("enemy_hit", 0.38);
      } else if (event.type === "hazard_destroyed") {
        particles(x, y, 24, event.entityKind === "energy_mine" ? "#70ff45" : "#cbd3d8", 0.9);
        play("enemy_destroy", 0.62);
      } else if (event.type === "wingman_hit") {
        canonicalWingmanFeedbackUntil.set(event.entityId, canonical.tick + 7);
        particles(x, y, event.destroyed ? 10 : 5, event.destroyed ? "#f6f" : "#bff6ff", event.destroyed ? 0.8 : 0.42);
        play("wingman_hit", event.destroyed ? 0.85 : 0.34);
      } else if (event.type === "wingman_collision") {
        canonicalWingmanFeedbackUntil.set(event.entityId, canonical.tick + 7);
        particles(x, y, 12, "#f6f", 0.9);
        burst(canonicalFeedbackPixel(event.enemyX), canonicalFeedbackPixel(event.enemyY), 10);
        play("wingman_hit", 0.92);
      } else if (event.type === "player_hit") {
        particles(x, y, event.amount >= 2 ? 18 : 12, "#ff8a8a", 1.05);
        play("player_hit", event.amount >= 2 ? 1.15 : 0.9);
        if (typeof globalThis.kickShake === "function") globalThis.kickShake(event.amount >= 2 ? 12 : 8);
        if (browserState.fx) browserState.fx.flash = Math.max(Number(browserState.fx.flash || 0), event.amount >= 2 ? 10 : 8);
      } else if (event.type === "shield_absorbed") {
        particles(x, y, 12, "#8ff5ff", 0.8);
        play("enemy_hit", 0.32);
      } else if (event.type === "energy_drained") {
        particles(x, y, 3, "#70ff45", 0.45);
      } else if (event.type === "powerup_collected") {
        if (typeof globalThis.spawnPowerupCollectBurst === "function") {
          globalThis.spawnPowerupCollectBurst({ x, y, type: event.entityKind });
        } else {
          particles(x, y, 22, "#8ff5ff", 1.05);
          play("powerup", 0.9);
        }
      }
    }
  } finally {
    canonicalFeedbackDispatching = false;
  }
  return true;
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
  if (!recordedRunInputRecorder) return false;
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
  if (recordedRunInputRecorder) {
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
    if (browserState) {
      applyCanonicalRunAuthority(browserState);
      dispatchCanonicalRunFeedback(browserState);
    }
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
  if (!recordedRunInputRecorder) throw new Error("Run input recording is not active.");
  return recordedRunInputRecorder.append(rawInput);
}

function finalizeRunInputRecording(metadata = {}) {
  if (!recordedRunInputRecorder || recordedRunInputRecorder.status().tickCount === 0) {
    throw new Error("Run input recording has no ticks.");
  }
  const recorder = recordedRunInputRecorder;
  recordedRunInputRecorder = null;
  pendingRunInputButtons = 0;
  activeCanonicalRunInput = null;
  return recorder.finalize(metadata);
}

function finalizeRecordedInputTape(metadata = {}) {
  return finalizeRunInputRecording(metadata);
}

function cancelRunInputRecording() {
  recordedRunInputRecorder = null;
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
globalThis.canonicalRunSuppressesLegacyFeedback = canonicalRunSuppressesLegacyFeedback;
globalThis.legacyGameplayFeedbackAllowed = legacyGameplayFeedbackAllowed;
globalThis.dispatchCanonicalRunFeedback = dispatchCanonicalRunFeedback;
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
globalThis.waitForRecordedRunInputPersistence = waitForRecordedRunInputPersistence;
