"use strict";

(function initializeVerifiedRunSimulationStep(root, factory) {
  const constants = typeof module === "object" && module.exports
    ? require("./constants")
    : root.StarStrikeVerifiedRunConstants;
  const inputTape = typeof module === "object" && module.exports
    ? require("./input-tape")
    : root;
  const content = typeof module === "object" && module.exports ? require("./content") : root;
  const director = typeof module === "object" && module.exports ? require("./director") : root;
  const trig = typeof module === "object" && module.exports ? require("./trig-table") : root;
  const geometry = typeof module === "object" && module.exports ? require("./geometry") : root;
  const api = factory(constants, inputTape, content, director, trig, geometry);
  if (typeof module === "object" && module.exports) module.exports = api;
  Object.assign(root, api);
})(globalThis, function buildVerifiedRunSimulationStep(constants, inputTape, content, director, trig, geometry) {

if (!constants || !inputTape || !content || !director || !trig || !geometry) throw new Error("Verified run primitives must load before simulation step.");

const {
  ANGLE_UNITS,
  ENERGY_UNITS_PER_POINT,
  GAME_HEIGHT_UNITS,
  GAME_WIDTH_UNITS,
  POSITION_UNITS_PER_PIXEL,
  TRIG_UNITS
} = constants;
const { BUTTON_GHOST_SHIFT, BUTTON_PAUSE } = inputTape;
const { AUTHORITATIVE_BOSS_ARCHETYPES, AUTHORITATIVE_ENEMY_ARCHETYPES } = content;
const { tickCanonicalDirector } = director;
const { cosForAngle, sinForAngle } = trig;
const { bodiesOverlap, collisionBodyFor } = geometry;
const ALLOWED_BUTTONS = BUTTON_GHOST_SHIFT | BUTTON_PAUSE;
const GHOST_BURST = Math.round(4.6 * POSITION_UNITS_PER_PIXEL);
const GHOST_COST = 35 * ENERGY_UNITS_PER_POINT;

function roundDivide(numerator, denominator) {
  if (!Number.isSafeInteger(numerator) || !Number.isSafeInteger(denominator) || denominator <= 0) {
    throw new TypeError("Canonical division requires safe integers and a positive denominator.");
  }
  return numerator < 0
    ? -Math.floor((-numerator + Math.floor(denominator / 2)) / denominator)
    : Math.floor((numerator + Math.floor(denominator / 2)) / denominator);
}

function clampInteger(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

function validateCanonicalInput(input) {
  const x = Number(input && input.x);
  const y = Number(input && input.y);
  const buttons = Number(input && input.buttons);
  if (!Number.isSafeInteger(x) || x < -127 || x > 127 || !Number.isSafeInteger(y) || y < -127 || y > 127) {
    throw new RangeError("Canonical simulation input axes are invalid.");
  }
  if (!Number.isSafeInteger(buttons) || buttons < 0 || (buttons & ~ALLOWED_BUTTONS) !== 0) {
    throw new RangeError("Canonical simulation input buttons are invalid.");
  }
  return { x, y, buttons };
}

function ghostDirection(player, input) {
  if (input.x !== 0 || input.y !== 0) return { x: input.x, y: input.y, denominator: 127 };
  const speed = Math.trunc(Math.sqrt(player.vx * player.vx + player.vy * player.vy));
  if (speed > 0) return { x: player.vx, y: player.vy, denominator: speed };
  return { x: 0, y: -1, denominator: 1 };
}

function applyGhostShift(state, input) {
  const player = state.player;
  if ((input.buttons & BUTTON_GHOST_SHIFT) === 0) return;
  if (player.energy < GHOST_COST || player.ghostCooldown > 0) return;
  const direction = ghostDirection(player, input);
  player.vx += roundDivide(direction.x * GHOST_BURST, direction.denominator);
  player.vy += roundDivide(direction.y * GHOST_BURST, direction.denominator);
  player.ghostTimer = 18;
  player.invulnerability = Math.max(player.invulnerability, 24);
  player.ghostCooldown = 20;
  player.energy -= GHOST_COST;
  state.stats.ghostUses++;
}

function applyPauseEdge(state, input) {
  if ((input.buttons & BUTTON_PAUSE) === 0) return;
  state.player.hp = Math.max(0, state.player.hp - 1);
  state.stats.pauseUses++;
  if (state.player.hp === 0) {
    state.terminal = true;
    state.terminalReason = "player_destroyed";
  }
}

function updateCanonicalPlayer(state, input) {
  const player = state.player;
  const desiredVX = roundDivide(input.x * player.maxSpeed, 127);
  const desiredVY = roundDivide(input.y * player.maxSpeed, 127);
  const moving = input.x !== 0 || input.y !== 0;
  const steer = player.ghostTimer > 0 || player.dashTimer > 0 ? 16 : moving ? 22 : 20;
  player.vx += roundDivide((desiredVX - player.vx) * steer, 100);
  player.vy += roundDivide((desiredVY - player.vy) * steer, 100);
  const speedCap = player.ghostTimer > 0 || player.dashTimer > 0
    ? roundDivide(player.maxSpeed * 155, 100)
    : player.maxSpeed;
  const speedSquared = player.vx * player.vx + player.vy * player.vy;
  if (speedSquared > speedCap * speedCap) {
    const speed = Math.max(1, Math.trunc(Math.sqrt(speedSquared)));
    player.vx = roundDivide(player.vx * speedCap, speed);
    player.vy = roundDivide(player.vy * speedCap, speed);
  }
  player.x = clampInteger(player.x + player.vx, 20 * POSITION_UNITS_PER_PIXEL, GAME_WIDTH_UNITS - 20 * POSITION_UNITS_PER_PIXEL);
  player.y = clampInteger(player.y + player.vy, Math.round(GAME_HEIGHT_UNITS * 60 / 100), GAME_HEIGHT_UNITS - 28 * POSITION_UNITS_PER_PIXEL);
  if (player.invulnerability > 0) player.invulnerability--;
  if (player.fireCooldown > 0) player.fireCooldown--;
  if (player.ghostTimer > 0) player.ghostTimer--;
  if (player.dashTimer > 0) player.dashTimer--;
  if (player.ghostCooldown > 0) player.ghostCooldown--;
  if (player.spread > 0) player.spread--;
  if (player.rapid > 0) player.rapid--;
  if (player.overcharge > 0) player.overcharge--;
  if (player.magnet > 0) player.magnet--;
  if (player.piercing > 0) player.piercing--;
  if (player.stabilizer > 0) player.stabilizer--;
  if (player.scoreSurge > 0) player.scoreSurge--;
  player.energy = Math.min(player.maxEnergy, player.energy + (player.overcharge > 0 ? 120 : 50));
}

function canonicalRandomUint32(streams, name) {
  if (!streams || typeof streams.nextUint32 !== "function") throw new TypeError("Canonical enemy behavior requires named random streams.");
  const value = Number(streams.nextUint32(name));
  if (!Number.isSafeInteger(value) || value < 0 || value > 0xffffffff) throw new TypeError("Canonical random streams must return unsigned 32-bit integers.");
  return value;
}

function spawnCanonicalEnemy(state, type, x, y, options = {}, streams) {
  if (!state || state.schema !== "SSR_SIM_STATE_V1" || state.terminal) {
    throw new TypeError("Canonical enemy creation requires an active simulation state.");
  }
  const archetype = AUTHORITATIVE_ENEMY_ARCHETYPES[String(type || "")];
  if (!archetype) throw new RangeError(`Unknown authoritative enemy type: ${type}`);
  const enemy = {
    id: state.nextEntityId++,
    type: String(type),
    x: canonicalEntityInteger(x, "Enemy X"),
    y: canonicalEntityInteger(y, "Enemy Y"),
    vx: canonicalEntityInteger(options.vx ?? 0, "Enemy velocity X"),
    vy: canonicalEntityInteger(options.vy ?? 0, "Enemy velocity Y"),
    angle: canonicalEntityInteger(options.angle ?? 0, "Enemy angle"),
    hp: archetype.hp,
    maxHp: archetype.hp,
    score: archetype.score,
    realm: canonicalEntityInteger(options.realm ?? 0, "Enemy realm"),
    motion: String(options.motion || "linear"),
    motionTick: canonicalEntityInteger(options.motionTick ?? 0, "Enemy motion tick"),
    lane: canonicalEntityInteger(options.lane ?? -1, "Enemy lane"),
    driftAngle: canonicalEntityInteger(options.driftAngle ?? 0, "Enemy drift angle"),
    driftDir: canonicalEntityInteger(options.driftDir ?? 1, "Enemy drift direction"),
    driftPower: canonicalEntityInteger(options.driftPower ?? 0, "Enemy drift power"),
    loopAngle: canonicalEntityInteger(options.loopAngle ?? 0, "Enemy loop angle"),
    turnTimer: canonicalEntityInteger(options.turnTimer ?? 0, "Enemy turn timer"),
    turnDir: canonicalEntityInteger(options.turnDir ?? 1, "Enemy turn direction"),
    snapTimer: canonicalEntityInteger(options.snapTimer ?? 0, "Enemy snap timer"),
    shootTimer: canonicalEntityInteger(options.shootTimer ?? 0, "Enemy shoot timer"),
    warnTimer: canonicalEntityInteger(options.warnTimer ?? 0, "Enemy warning timer"),
    volleySeed: canonicalEntityInteger(options.volleySeed ?? 0, "Enemy volley seed"),
    stateMode: String(options.stateMode || "physical"),
    cycleTimer: canonicalEntityInteger(options.cycleTimer ?? 0, "Enemy cycle timer"),
    telegraphTimer: canonicalEntityInteger(options.telegraphTimer ?? 0, "Enemy telegraph timer"),
    fireTimer: canonicalEntityInteger(options.fireTimer ?? 0, "Enemy fire timer"),
    phaseOffset: canonicalEntityInteger(options.phaseOffset ?? 0, "Enemy phase offset"),
    launchTimer: canonicalEntityInteger(options.launchTimer ?? 0, "Enemy launch timer"),
    launchCount: canonicalEntityInteger(options.launchCount ?? 0, "Enemy launch count"),
    bayOpen: canonicalEntityInteger(options.bayOpen ?? 0, "Enemy bay timer"),
    fireWarn: canonicalEntityInteger(options.fireWarn ?? 0, "Enemy fire warning"),
    lockTimer: canonicalEntityInteger(options.lockTimer ?? 0, "Enemy lock timer"),
    tetherActive: Boolean(options.tetherActive),
    tetherDrainTick: canonicalEntityInteger(options.tetherDrainTick ?? 0, "Enemy tether drain tick"),
    mineTimer: canonicalEntityInteger(options.mineTimer ?? 0, "Enemy mine timer"),
    minesDropped: canonicalEntityInteger(options.minesDropped ?? 0, "Enemy mines dropped"),
    shieldPulse: canonicalEntityInteger(options.shieldPulse ?? 0, "Enemy shield pulse"),
    shieldedBy: canonicalEntityInteger(options.shieldedBy ?? 0, "Enemy shield source"),
    shieldCooldown: canonicalEntityInteger(options.shieldCooldown ?? 0, "Enemy shield cooldown"),
    railCooldown: canonicalEntityInteger(options.railCooldown ?? 0, "Enemy rail cooldown"),
    railWarn: canonicalEntityInteger(options.railWarn ?? 0, "Enemy rail warning"),
    railAngle: canonicalEntityInteger(options.railAngle ?? 1_024, "Enemy rail angle"),
    repairTimer: canonicalEntityInteger(options.repairTimer ?? 0, "Enemy repair timer"),
    repairTargetId: canonicalEntityInteger(options.repairTargetId ?? 0, "Enemy repair target"),
    noPowerup: Boolean(options.noPowerup)
  };
  if (enemy.type === "red" && streams) {
    enemy.driftAngle = canonicalRandomUint32(streams, "enemy_behavior") % ANGLE_UNITS;
    enemy.driftDir = (canonicalRandomUint32(streams, "enemy_behavior") & 1) === 1 ? 1 : -1;
    enemy.driftPower = 61 + canonicalRandomUint32(streams, "enemy_behavior") % 165;
  }
  if (enemy.type === "orange" && streams) {
    if (options.vx == null) {
      enemy.vx = roundDivide((320 + state.phase * 5) * POSITION_UNITS_PER_PIXEL, 100);
    }
    if (options.loopAngle == null) enemy.loopAngle = canonicalRandomUint32(streams, "enemy_behavior") % ANGLE_UNITS;
    if (options.turnTimer == null) enemy.turnTimer = canonicalRandomRange(streams, 14, 37);
    if (options.turnDir == null) {
      enemy.turnDir = (canonicalRandomUint32(streams, "enemy_behavior") & 1) === 1 ? 1 : -1;
    }
  }
  if (enemy.type === "purple" && streams) {
    if (options.driftAngle == null) enemy.driftAngle = canonicalRandomUint32(streams, "enemy_behavior") % ANGLE_UNITS;
    if (options.driftDir == null) {
      enemy.driftDir = (canonicalRandomUint32(streams, "enemy_behavior") & 1) === 1 ? 1 : -1;
    }
    if (options.driftPower == null) enemy.driftPower = 61 + canonicalRandomUint32(streams, "enemy_behavior") % 165;
    if (options.shootTimer == null) enemy.shootTimer = canonicalRandomRange(streams, 62, 83);
    if (options.volleySeed == null) enemy.volleySeed = canonicalRandomRange(streams, 0, 3);
  }
  if (enemy.type === "phantom") {
    if (enemy.stateMode !== "physical" && enemy.stateMode !== "ghost") {
      throw new RangeError("Unknown authoritative phantom realm.");
    }
    enemy.realm = enemy.stateMode === "ghost" ? 1 : 0;
    if (streams) {
      if (options.phaseOffset == null) enemy.phaseOffset = canonicalRandomUint32(streams, "enemy_behavior") % ANGLE_UNITS;
      if (options.driftDir == null) {
        enemy.driftDir = (canonicalRandomUint32(streams, "enemy_behavior") & 1) === 1 ? 1 : -1;
      }
      if (options.driftPower == null) enemy.driftPower = 61 + canonicalRandomUint32(streams, "enemy_behavior") % 165;
      if (options.cycleTimer == null) {
        enemy.cycleTimer = canonicalRandomRange(streams, 0, phantomCycleDuration(enemy.stateMode));
      }
      if (options.fireTimer == null) enemy.fireTimer = canonicalRandomRange(streams, 24, 71);
    }
  }
  if (streams && ["splitter", "splitter_shard", "carrier", "siphon", "leech", "minecaster", "shieldbearer", "railgunner", "repair_drone"].includes(enemy.type)) {
    if (options.loopAngle == null) enemy.loopAngle = canonicalRandomUint32(streams, "enemy_behavior") % ANGLE_UNITS;
    if (enemy.type === "carrier" && options.launchTimer == null) enemy.launchTimer = canonicalRandomRange(streams, 86, 123);
    if (enemy.type === "siphon" && options.fireTimer == null) enemy.fireTimer = canonicalRandomRange(streams, 58, 97);
    if (enemy.type === "leech" && options.lockTimer == null) enemy.lockTimer = 78;
    if (enemy.type === "minecaster" && options.mineTimer == null) enemy.mineTimer = canonicalRandomRange(streams, 70, 109);
    if (enemy.type === "shieldbearer" && options.shieldPulse == null) {
      enemy.shieldPulse = canonicalRandomUint32(streams, "enemy_behavior") % ANGLE_UNITS;
    }
    if (enemy.type === "railgunner" && options.railCooldown == null) enemy.railCooldown = canonicalRandomRange(streams, 85, 129);
    if (enemy.type === "repair_drone" && options.repairTimer == null) enemy.repairTimer = 38;
  }
  state.enemies.push(enemy);
  return enemy;
}

function canonicalEntityInteger(value, label) {
  const number = Number(value);
  if (!Number.isSafeInteger(number)) throw new TypeError(`${label} must be a safe integer.`);
  return number;
}

function canonicalRandomRange(streams, minimum, maximum) {
  if (!Number.isSafeInteger(minimum) || !Number.isSafeInteger(maximum) || maximum < minimum) {
    throw new TypeError("Canonical random range requires ordered safe integers.");
  }
  return minimum + canonicalRandomUint32(streams, "enemy_behavior") % (maximum - minimum + 1);
}

function canonicalStreamRange(streams, streamName, minimum, maximum) {
  if (!Number.isSafeInteger(minimum) || !Number.isSafeInteger(maximum) || maximum < minimum) {
    throw new TypeError("Canonical random range requires ordered safe integers.");
  }
  return minimum + canonicalRandomUint32(streams, streamName) % (maximum - minimum + 1);
}

const CANONICAL_ASTEROIDS = Object.freeze({
  small_debris: Object.freeze({ hp: 12, vy: 3_277, vxMin: -358, vxMax: 358, damage: 1 }),
  rock_asteroid: Object.freeze({ hp: 12, vy: 2_253, vxMin: -246, vxMax: 246, damage: 1 }),
  iron_asteroid: Object.freeze({ hp: 12, vy: 1_485, vxMin: -123, vxMax: 123, damage: 1 }),
  comet_shard: Object.freeze({ hp: 12, vy: 3_789, vxMin: -563, vxMax: 563, damage: 1 }),
  boss_wall: Object.freeze({ hp: 999, vy: 2_048, vxMin: 0, vxMax: 0, damage: 1 })
});
const CANONICAL_HAZARD_KINDS = new Set([
  ...Object.keys(CANONICAL_ASTEROIDS),
  "mine",
  "energy_mine",
  "meteor_warning",
  "enemy_beam",
  "gravity_well"
]);

function spawnCanonicalHazard(state, kind, x, y, options = {}, streams) {
  if (!state || state.schema !== "SSR_SIM_STATE_V1" || state.terminal) {
    throw new TypeError("Canonical hazard creation requires an active simulation state.");
  }
  const canonicalKind = String(kind || "");
  if (!CANONICAL_HAZARD_KINDS.has(canonicalKind)) {
    throw new RangeError(`Unknown authoritative hazard kind: ${kind}`);
  }
  const hazardX = canonicalEntityInteger(x, "Hazard X");
  const hazardY = canonicalEntityInteger(y, "Hazard Y");
  let hazard;
  const asteroid = CANONICAL_ASTEROIDS[canonicalKind];
  if (asteroid) {
    const defaultVX = streams
      ? canonicalStreamRange(streams, "hazards", asteroid.vxMin, asteroid.vxMax)
      : 0;
    hazard = {
      id: state.nextEntityId++,
      kind: canonicalKind,
      x: hazardX,
      y: hazardY,
      vx: canonicalEntityInteger(options.vx ?? defaultVX, "Hazard velocity X"),
      vy: canonicalEntityInteger(options.vy ?? asteroid.vy, "Hazard velocity Y"),
      angle: canonicalEntityInteger(options.angle ?? (streams ? canonicalStreamRange(streams, "hazards", 0, ANGLE_UNITS - 1) : 0), "Hazard angle"),
      angularVelocity: canonicalEntityInteger(options.angularVelocity ?? (streams ? canonicalStreamRange(streams, "hazards", -36, 36) : 0), "Hazard angular velocity"),
      hp: canonicalEntityInteger(options.hp ?? asteroid.hp, "Hazard health"),
      maxHp: canonicalEntityInteger(options.maxHp ?? options.hp ?? asteroid.hp, "Hazard maximum health"),
      life: canonicalEntityInteger(options.life ?? 780, "Hazard life"),
      damage: canonicalEntityInteger(options.damage ?? asteroid.damage, "Hazard damage"),
      realm: canonicalEntityInteger(options.realm ?? 0, "Hazard realm"),
      rareEvent: Boolean(options.rareEvent),
      wall: canonicalKind === "boss_wall" || Boolean(options.wall),
      noScore: canonicalKind === "boss_wall" || Boolean(options.noScore)
    };
  } else if (canonicalKind === "mine" || canonicalKind === "energy_mine") {
    hazard = {
      id: state.nextEntityId++,
      kind: canonicalKind,
      x: hazardX,
      y: hazardY,
      vx: canonicalEntityInteger(options.vx ?? (streams ? canonicalStreamRange(streams, "hazards", -184, 184) : 0), "Hazard velocity X"),
      vy: canonicalEntityInteger(options.vy ?? (canonicalKind === "mine" ? 799 : 737), "Hazard velocity Y"),
      angle: canonicalEntityInteger(options.angle ?? 0, "Hazard angle"),
      hp: canonicalEntityInteger(options.hp ?? 2, "Hazard health"),
      maxHp: canonicalEntityInteger(options.maxHp ?? options.hp ?? 2, "Hazard maximum health"),
      life: canonicalEntityInteger(options.life ?? 720, "Hazard life"),
      armTimer: canonicalEntityInteger(options.armTimer ?? (canonicalKind === "mine" ? 54 : 44), "Hazard arm timer"),
      damage: canonicalEntityInteger(options.damage ?? 1, "Hazard damage"),
      drain: canonicalEntityInteger(options.drain ?? (canonicalKind === "energy_mine" ? 24 * ENERGY_UNITS_PER_POINT : 0), "Hazard drain"),
      realm: canonicalEntityInteger(options.realm ?? 0, "Hazard realm")
    };
  } else if (canonicalKind === "meteor_warning") {
    const targetKind = String(options.targetKind || "rock_asteroid");
    if (!CANONICAL_ASTEROIDS[targetKind] || targetKind === "boss_wall") {
      throw new RangeError(`Unknown meteor target kind: ${targetKind}`);
    }
    hazard = {
      id: state.nextEntityId++,
      kind: canonicalKind,
      x: hazardX,
      y: hazardY,
      vx: 0,
      vy: 0,
      angle: 0,
      warn: canonicalEntityInteger(options.warn ?? 48, "Meteor warning timer"),
      life: canonicalEntityInteger(options.life ?? (options.warn ?? 48) + 4, "Meteor warning life"),
      targetKind,
      spawnVX: canonicalEntityInteger(options.spawnVX ?? 0, "Meteor spawn velocity X"),
      spawnVY: canonicalEntityInteger(options.spawnVY ?? (targetKind === "comet_shard" ? 3_891 : 2_765), "Meteor spawn velocity Y"),
      rareEvent: Boolean(options.rareEvent)
    };
  } else if (canonicalKind === "enemy_beam") {
    hazard = {
      id: state.nextEntityId++,
      kind: canonicalKind,
      x: hazardX,
      y: hazardY,
      angle: canonicalEntityInteger(options.angle ?? 1_024, "Beam angle"),
      length: canonicalEntityInteger(options.length ?? Math.round(GAME_HEIGHT_UNITS * 14 / 10), "Beam length"),
      width: canonicalEntityInteger(options.width ?? 8 * POSITION_UNITS_PER_PIXEL, "Beam width"),
      warn: canonicalEntityInteger(options.warn ?? 0, "Beam warning"),
      active: canonicalEntityInteger(options.active ?? 16, "Beam active timer"),
      damage: canonicalEntityInteger(options.damage ?? 0, "Beam damage"),
      drain: canonicalEntityInteger(options.drain ?? 0, "Beam drain"),
      sweepVx: canonicalEntityInteger(options.sweepVx ?? 0, "Beam sweep velocity X"),
      sweepVy: canonicalEntityInteger(options.sweepVy ?? 0, "Beam sweep velocity Y"),
      realm: canonicalEntityInteger(options.realm ?? 0, "Beam realm")
    };
  } else {
    hazard = {
      id: state.nextEntityId++,
      kind: canonicalKind,
      x: hazardX,
      y: hazardY,
      radius: canonicalEntityInteger(options.radius ?? 76 * POSITION_UNITS_PER_PIXEL, "Gravity-well radius"),
      warn: canonicalEntityInteger(options.warn ?? 46, "Gravity-well warning"),
      life: canonicalEntityInteger(options.life ?? 190, "Gravity-well life"),
      strength: canonicalEntityInteger(options.strength ?? 102, "Gravity-well strength"),
      drain: canonicalEntityInteger(options.drain ?? 0, "Gravity-well drain"),
      pulseAngle: canonicalEntityInteger(options.pulseAngle ?? (streams ? canonicalStreamRange(streams, "hazards", 0, ANGLE_UNITS - 1) : 0), "Gravity-well pulse"),
      expanding: Boolean(options.expanding),
      shrink: Boolean(options.shrink),
      realm: canonicalEntityInteger(options.realm ?? 0, "Gravity-well realm")
    };
  }
  state.hazards.push(hazard);
  return hazard;
}

function laneXForHazard(lane) {
  return Math.round(GAME_WIDTH_UNITS * [22, 50, 78][lane] / 100);
}

function spawnCanonicalDebrisField(state, streams) {
  const count = 5 + canonicalStreamRange(streams, "hazards", 0, state.phase >= 8 ? 2 : 1);
  for (let index = 0; index < count; index++) {
    const roll = canonicalRandomUint32(streams, "hazards");
    const kind = state.phase >= 8 && roll > Math.floor(0xffffffff * 0.86)
      ? "comet_shard"
      : roll > Math.floor(0xffffffff * 0.68)
        ? "small_debris"
        : roll > Math.floor(0xffffffff * 0.14)
          ? "rock_asteroid"
          : "iron_asteroid";
    const jitter = canonicalStreamRange(streams, "hazards", -34, 34) * POSITION_UNITS_PER_PIXEL;
    spawnCanonicalHazard(
      state,
      kind,
      laneXForHazard(index % 3) + jitter,
      (-42 - index * 52) * POSITION_UNITS_PER_PIXEL,
      { rareEvent: true },
      streams
    );
  }
}

function tickCanonicalHazardEvent(state, streams) {
  if (!state || state.schema !== "SSR_SIM_STATE_V1") throw new TypeError("Canonical hazard director requires simulation state.");
  if (!streams || typeof streams.nextUint32 !== "function") throw new TypeError("Canonical hazard director requires named random streams.");
  const directorState = state.director;
  if (state.phase < 3 || state.boss || directorState.bossRecovery > 0) return;
  if (state.player.hp <= 1 || state.enemies.length > 10) {
    directorState.hazardEventTimer = Math.max(directorState.hazardEventTimer, 360);
    return;
  }
  if (directorState.hazardWarningTimer > 0) {
    directorState.hazardWarningTimer--;
    if (directorState.hazardWarningTimer === 0) spawnCanonicalDebrisField(state, streams);
    return;
  }
  if (state.hazards.some((hazard) => hazard.rareEvent || hazard.wall)) return;
  directorState.hazardEventTimer--;
  if (directorState.hazardEventTimer <= 0) {
    directorState.hazardWarningTimer = 78;
    directorState.hazardEventTimer = 1_500
      + canonicalStreamRange(streams, "hazards", 0, 919)
      + Math.max(0, 7 - state.phase) * 120;
  }
}

const CANONICAL_POWERUP_TYPES = Object.freeze([
  "spread",
  "rapid",
  "repair",
  "wingman",
  "dual",
  "energy_cell",
  "overcharge",
  "phase_shield",
  "magnet",
  "piercing",
  "ion_burst",
  "stabilizer",
  "score_surge"
]);
const CANONICAL_POWERUP_TYPE_SET = new Set(CANONICAL_POWERUP_TYPES);

function spawnCanonicalPowerup(state, type, x, y, options = {}) {
  if (!state || state.schema !== "SSR_SIM_STATE_V1" || state.terminal) {
    throw new TypeError("Canonical powerup creation requires an active simulation state.");
  }
  const canonicalType = String(type || "");
  if (!CANONICAL_POWERUP_TYPE_SET.has(canonicalType)) {
    throw new RangeError(`Unknown authoritative powerup type: ${type}`);
  }
  const powerup = {
    id: state.nextEntityId++,
    type: canonicalType,
    x: canonicalEntityInteger(x, "Powerup X"),
    y: canonicalEntityInteger(y, "Powerup Y"),
    vx: canonicalEntityInteger(options.vx ?? 0, "Powerup velocity X"),
    vy: canonicalEntityInteger(options.vy ?? 1_946, "Powerup velocity Y"),
    wobbleAngle: canonicalEntityInteger(options.wobbleAngle ?? 0, "Powerup wobble angle"),
    life: canonicalEntityInteger(options.life ?? 900, "Powerup life")
  };
  state.powerups.push(powerup);
  return powerup;
}

function selectCanonicalExpansionPowerup(state, streams, lowHp) {
  if (state.phase < 3 && state.player.energy > 70 * ENERGY_UNITS_PER_POINT) return "";
  let chance = state.phase >= 5 ? 30 : 18;
  if (state.enemies.some((enemy) => enemy.type === "siphon" || enemy.type === "leech")) chance += 18;
  if (state.player.energy < 45 * ENERGY_UNITS_PER_POINT) chance += 12;
  if (lowHp) chance -= 6;
  chance = clampInteger(chance, 8, 52);
  if (canonicalStreamRange(streams, "loot", 0, 99) >= chance) return "";
  const pool = [];
  const add = (type, weight) => { for (let index = 0; index < weight; index++) pool.push(type); };
  if (state.player.energy < 85 * ENERGY_UNITS_PER_POINT || state.phase >= 5) add("energy_cell", 5);
  if (state.phase >= 4) add("magnet", lowHp ? 4 : 3);
  if (state.phase >= 4 && !lowHp) add("piercing", 3);
  if (state.phase >= 5) add("overcharge", 2);
  if (state.phase >= 5) add("phase_shield", lowHp ? 4 : 2);
  if (state.phase >= 5 && !lowHp) add("ion_burst", 1);
  if (state.phase >= 6) add("stabilizer", 3);
  if (state.phase >= 6 && !lowHp && !state.boss) add("score_surge", 2);
  if (pool.length === 0) return "";
  return pool[canonicalStreamRange(streams, "loot", 0, pool.length - 1)];
}

function selectCanonicalPowerupType(state, streams) {
  const lowHp = state.player.hp <= 2;
  const expansion = selectCanonicalExpansionPowerup(state, streams, lowHp);
  if (expansion) return expansion;
  const roll = canonicalStreamRange(streams, "loot", 0, 99);
  if (lowHp) {
    if (roll < 34) return "repair";
    if (roll < 58) return "wingman";
    if (roll < 74) return "dual";
    if (roll < 87) return "spread";
    return "rapid";
  }
  if (roll < 35) return "spread";
  if (roll < 70) return "rapid";
  if (roll < 88) return "repair";
  if (roll < 95) return "wingman";
  return "dual";
}

function shouldDropCanonicalPowerup(state, streams) {
  const directorState = state.director;
  if (directorState.dropCooldown > 0) return false;
  if (directorState.killsSinceDrop >= 12 || directorState.ticksSinceDrop >= 900) return true;
  const drought = clampInteger(Math.floor((directorState.ticksSinceDrop - 240) * 1000 / 660), 0, 1000);
  const killFactor = clampInteger(Math.floor((directorState.killsSinceDrop - 1) * 1000 / 6), 0, 1000);
  let chanceMillionths = 22_000 + drought * 160 + killFactor * 110;
  if (state.player.hp <= 2) chanceMillionths += 30_000;
  if (state.phase >= 10) chanceMillionths += 10_000;
  if (state.director.intensity === "cooldown") chanceMillionths += 50_000;
  if (state.director.intensity === "surge") chanceMillionths -= 20_000;
  const roll = canonicalRandomUint32(streams, "loot");
  const boundedChance = Math.max(0, Math.min(1_000_000, chanceMillionths));
  const threshold = Math.floor(boundedChance * 0x100000000 / 1_000_000);
  return roll < threshold;
}

function registerCanonicalPowerupDrop(state, streams, minimum = 240, maximum = 360) {
  state.director.killsSinceDrop = 0;
  state.director.ticksSinceDrop = 0;
  state.director.dropCooldown = canonicalStreamRange(streams, "loot", minimum, maximum - 1);
}

function addCanonicalWingman(state, side) {
  const existing = state.wingmen.find((wingman) => wingman.side === side);
  if (existing) {
    existing.timer = Math.max(existing.timer, 1500);
    if (existing.phase === "departing") {
      existing.phase = "arriving";
      existing.arrivalElapsed = 0;
      existing.arrivalFromX = existing.x;
      existing.arrivalFromY = existing.y;
      existing.departureAngle = 0;
    }
    return existing;
  }
  const targetX = clampInteger(state.player.x + side * 42 * POSITION_UNITS_PER_PIXEL, 18 * POSITION_UNITS_PER_PIXEL, GAME_WIDTH_UNITS - 18 * POSITION_UNITS_PER_PIXEL);
  const startX = clampInteger(targetX + side * 28 * POSITION_UNITS_PER_PIXEL, 18 * POSITION_UNITS_PER_PIXEL, GAME_WIDTH_UNITS - 18 * POSITION_UNITS_PER_PIXEL);
  const startY = GAME_HEIGHT_UNITS + 34 * POSITION_UNITS_PER_PIXEL;
  const wingman = {
    id: state.nextEntityId++,
    side,
    x: startX,
    y: startY,
    timer: 1500,
    fireCooldown: 10,
    phase: "arriving",
    arrivalElapsed: 0,
    arrivalDuration: 34,
    arrivalFromX: startX,
    arrivalFromY: startY,
    departureAngle: 0
  };
  state.wingmen.push(wingman);
  return wingman;
}

function applyCanonicalIonBurst(state, streams) {
  const radius = 132 * POSITION_UNITS_PER_PIXEL;
  const radiusSquared = radius * radius;
  state.enemyProjectiles = state.enemyProjectiles.filter((projectile) => {
    const dx = projectile.x - state.player.x;
    const dy = projectile.y - state.player.y;
    return dx * dx + dy * dy > radiusSquared;
  });
  const survivors = [];
  for (const enemy of state.enemies) {
    const dx = enemy.x - state.player.x;
    const dy = enemy.y - state.player.y;
    if (dx * dx + dy * dy <= radiusSquared) {
      enemy.hp -= enemy.type === "purple" || enemy.type === "carrier" ? 1 : 2;
    }
    if (enemy.hp <= 0) noteCanonicalKill(state, enemy, streams, false);
    else survivors.push(enemy);
  }
  state.enemies = survivors;
}

function collectCanonicalPowerup(state, powerup, streams) {
  if (!state || state.schema !== "SSR_SIM_STATE_V1" || !powerup || !CANONICAL_POWERUP_TYPE_SET.has(powerup.type)) {
    throw new TypeError("Canonical powerup collection requires known replay state.");
  }
  const player = state.player;
  state.stats.powerups++;
  if (powerup.type === "spread") player.spread = Math.max(player.spread, 900);
  else if (powerup.type === "rapid") player.rapid = Math.max(player.rapid, 900);
  else if (powerup.type === "repair") player.hp = Math.min(player.maxHp, player.hp + 1);
  else if (powerup.type === "wingman") {
    if (!state.wingmen.some((wingman) => wingman.side === -1)) addCanonicalWingman(state, -1);
    else if (!state.wingmen.some((wingman) => wingman.side === 1)) addCanonicalWingman(state, 1);
    else for (const wingman of state.wingmen) wingman.timer = Math.max(wingman.timer, 1500);
  } else if (powerup.type === "dual") {
    addCanonicalWingman(state, -1);
    addCanonicalWingman(state, 1);
  } else if (powerup.type === "energy_cell") player.energy = Math.min(player.maxEnergy, player.energy + 48 * ENERGY_UNITS_PER_POINT);
  else if (powerup.type === "overcharge") player.overcharge = Math.max(player.overcharge, 780);
  else if (powerup.type === "phase_shield") player.phaseShield = 1;
  else if (powerup.type === "magnet") player.magnet = Math.max(player.magnet, 720);
  else if (powerup.type === "piercing") player.piercing = Math.max(player.piercing, 660);
  else if (powerup.type === "ion_burst") applyCanonicalIonBurst(state, streams);
  else if (powerup.type === "stabilizer") player.stabilizer = Math.max(player.stabilizer, 660);
  else if (powerup.type === "score_surge") player.scoreSurge = Math.max(player.scoreSurge, 600);
  return true;
}

function updateCanonicalPowerups(state, streams) {
  const playerBody = collisionBodyFor("player", state.player.x, state.player.y, state.player.heading);
  const survivors = [];
  for (const powerup of state.powerups) {
    powerup.wobbleAngle = (powerup.wobbleAngle + 36) % ANGLE_UNITS;
    powerup.x += powerup.vx + roundDivide(sinForAngle(powerup.wobbleAngle) * POSITION_UNITS_PER_PIXEL, TRIG_UNITS);
    if (state.player.magnet > 0) {
      const dx = state.player.x - powerup.x;
      const dy = state.player.y - powerup.y;
      const distance = Math.max(1, Math.trunc(Math.sqrt(dx * dx + dy * dy)));
      if (distance < 185 * POSITION_UNITS_PER_PIXEL) {
        powerup.x += roundDivide(dx * 3_482, distance);
        powerup.y += roundDivide(dy * 3_482, distance);
      }
    }
    const dxBeforeMove = powerup.x - state.player.x;
    const dyBeforeMove = powerup.y - state.player.y;
    const nearPlayer = dxBeforeMove * dxBeforeMove + dyBeforeMove * dyBeforeMove < (140 * POSITION_UNITS_PER_PIXEL) ** 2;
    powerup.y += nearPlayer ? roundDivide(powerup.vy * 88, 100) : powerup.vy;
    powerup.x = clampInteger(powerup.x, 16 * POSITION_UNITS_PER_PIXEL, GAME_WIDTH_UNITS - 16 * POSITION_UNITS_PER_PIXEL);
    powerup.life--;
    if (powerup.y > GAME_HEIGHT_UNITS - 90 * POSITION_UNITS_PER_PIXEL) powerup.life = Math.max(powerup.life, 90);
    if (bodiesOverlap(playerBody, collisionBodyFor("powerup", powerup.x, powerup.y, 0))) {
      collectCanonicalPowerup(state, powerup, streams);
      continue;
    }
    if (powerup.life > 0 && powerup.y <= GAME_HEIGHT_UNITS + 30 * POSITION_UNITS_PER_PIXEL) survivors.push(powerup);
  }
  state.powerups = survivors;
}

function updateCanonicalWingmen(state) {
  for (const wingman of state.wingmen) {
    const targetX = clampInteger(state.player.x + wingman.side * 42 * POSITION_UNITS_PER_PIXEL, 18 * POSITION_UNITS_PER_PIXEL, GAME_WIDTH_UNITS - 18 * POSITION_UNITS_PER_PIXEL);
    const targetY = state.player.y + 6 * POSITION_UNITS_PER_PIXEL;
    if (wingman.phase === "arriving") {
      wingman.arrivalElapsed = Math.min(wingman.arrivalDuration, wingman.arrivalElapsed + 1);
      const durationCubed = wingman.arrivalDuration ** 3;
      const remaining = wingman.arrivalDuration - wingman.arrivalElapsed;
      const easedNumerator = durationCubed - remaining ** 3;
      wingman.x = wingman.arrivalFromX + roundDivide((targetX - wingman.arrivalFromX) * easedNumerator, durationCubed);
      wingman.y = wingman.arrivalFromY + roundDivide((targetY - wingman.arrivalFromY) * easedNumerator, durationCubed);
      if (wingman.arrivalElapsed >= wingman.arrivalDuration) {
        wingman.phase = "active";
        wingman.x = targetX;
        wingman.y = targetY;
        wingman.fireCooldown = 10;
      }
      continue;
    }
    if (wingman.phase === "departing") {
      const turn = 117 * wingman.side;
      const targetAngle = 2048 * wingman.side;
      wingman.departureAngle = wingman.side < 0
        ? Math.max(targetAngle, wingman.departureAngle + turn)
        : Math.min(targetAngle, wingman.departureAngle + turn);
      wingman.x += roundDivide(sinForAngle(wingman.departureAngle) * 8_602, TRIG_UNITS);
      wingman.y -= roundDivide(cosForAngle(wingman.departureAngle) * 8_602, TRIG_UNITS);
      continue;
    }
    wingman.timer--;
    wingman.x += roundDivide((targetX - wingman.x) * 22, 100);
    wingman.y += roundDivide((targetY - wingman.y) * 22, 100);
    if (wingman.fireCooldown > 0) wingman.fireCooldown--;
    if (wingman.timer <= 0) {
      wingman.phase = "departing";
      wingman.departureAngle = 0;
      wingman.fireCooldown = 99_999;
      continue;
    }
    if (wingman.fireCooldown <= 0) {
      state.playerProjectiles.push({
        id: state.nextEntityId++, kind: "wingman", x: wingman.x, y: wingman.y - 12 * POSITION_UNITS_PER_PIXEL,
        vx: 0, vy: -8_397, angle: 0, life: 80, damage: 1, pierce: 0, realm: state.playerRealm
      });
      wingman.fireCooldown = 18;
    }
  }
  state.wingmen = state.wingmen.filter((wingman) => (
    wingman.y <= GAME_HEIGHT_UNITS + 54 * POSITION_UNITS_PER_PIXEL
    && wingman.x >= -54 * POSITION_UNITS_PER_PIXEL
    && wingman.x <= GAME_WIDTH_UNITS + 54 * POSITION_UNITS_PER_PIXEL
  ));
}

function fireCanonicalPlayer(state) {
  const player = state.player;
  if (player.fireCooldown > 0) return;
  if (player.spread > 0) {
    const entries = [
      { x: -10, y: -13, vx: -2_355, vy: -8_806, pierce: 0 },
      { x: 0, y: -20, vx: 0, vy: -9 * POSITION_UNITS_PER_PIXEL, pierce: player.piercing > 0 ? 1 : 0 },
      { x: 10, y: -13, vx: 2_355, vy: -8_806, pierce: 0 }
    ];
    for (const entry of entries) {
      state.playerProjectiles.push({
        id: state.nextEntityId++, kind: "player", x: player.x + entry.x * POSITION_UNITS_PER_PIXEL,
        y: player.y + entry.y * POSITION_UNITS_PER_PIXEL, vx: entry.vx, vy: entry.vy,
        angle: 0, life: 90, damage: 1, pierce: entry.pierce, realm: state.playerRealm
      });
    }
  } else {
    state.playerProjectiles.push({
      id: state.nextEntityId++,
      kind: "player",
      x: player.x,
      y: player.y - 20 * POSITION_UNITS_PER_PIXEL,
      vx: 0,
      vy: -9 * POSITION_UNITS_PER_PIXEL,
      angle: 0,
      life: 90,
      damage: 1,
      pierce: player.piercing > 0 ? 1 : 0,
      realm: state.playerRealm
    });
  }
  player.fireCooldown = player.rapid > 0 ? 10 : 14;
}

function canonicalEnemyVelocityY(type, phase) {
  const phaseBoostHundredths = Math.min(phase * 8, 135);
  if (type === "red") return roundDivide((180 + phaseBoostHundredths) * POSITION_UNITS_PER_PIXEL, 100);
  if (type === "orange") return roundDivide((25500 + phaseBoostHundredths * 22) * POSITION_UNITS_PER_PIXEL, 10000);
  if (type === "purple") return roundDivide((10500 + phaseBoostHundredths * 18) * POSITION_UNITS_PER_PIXEL, 10000);
  if (type === "phantom") return roundDivide((15500 + phaseBoostHundredths * 14) * POSITION_UNITS_PER_PIXEL, 10000);
  if (type === "splitter") return roundDivide((11500 + phaseBoostHundredths * 16) * POSITION_UNITS_PER_PIXEL, 10000);
  if (type === "splitter_shard") return roundDivide((27500 + phase * 350) * POSITION_UNITS_PER_PIXEL, 10000);
  if (type === "carrier") return roundDivide((5500 + phaseBoostHundredths * 5) * POSITION_UNITS_PER_PIXEL, 10000);
  if (type === "siphon") return roundDivide((10500 + phaseBoostHundredths * 12) * POSITION_UNITS_PER_PIXEL, 10000);
  if (type === "leech") return roundDivide((7000 + phaseBoostHundredths * 5) * POSITION_UNITS_PER_PIXEL, 10000);
  if (type === "minecaster") return roundDivide((8200 + phaseBoostHundredths * 5) * POSITION_UNITS_PER_PIXEL, 10000);
  if (type === "shieldbearer") return roundDivide((7500 + phaseBoostHundredths * 4) * POSITION_UNITS_PER_PIXEL, 10000);
  if (type === "railgunner") return roundDivide((7200 + phaseBoostHundredths * 4) * POSITION_UNITS_PER_PIXEL, 10000);
  if (type === "repair_drone") return roundDivide((10500 + phaseBoostHundredths * 6) * POSITION_UNITS_PER_PIXEL, 10000);
  return 2 * POSITION_UNITS_PER_PIXEL;
}

function materializeCanonicalSpawns(state, descriptors, streams) {
  for (const descriptor of descriptors) {
    spawnCanonicalEnemy(state, descriptor.type, descriptor.x, descriptor.y, {
      vy: canonicalEnemyVelocityY(descriptor.type, state.phase),
      motion: descriptor.motion,
      lane: descriptor.lane
    }, streams);
  }
}

function updateCanonicalOrange(state, enemy, streams) {
  if (enemy.turnTimer <= 0) {
    enemy.turnTimer = canonicalRandomRange(streams, 12, 34);
    const turnRoll = canonicalRandomUint32(streams, "enemy_behavior");
    const edgeBiasLeft = enemy.x > GAME_WIDTH_UNITS / 2;
    if (enemy.motion === "snap" || turnRoll > 3_564_822_855) {
      enemy.turnDir = (canonicalRandomUint32(streams, "enemy_behavior") & 1) === 1 ? 1 : -1;
      enemy.snapTimer = canonicalRandomRange(streams, 8, 15);
    } else {
      enemy.snapTimer = 0;
      if (turnRoll < 2_147_483_648) {
        enemy.turnDir = (canonicalRandomUint32(streams, "enemy_behavior") & 1) === 1 ? 1 : -1;
      } else if (turnRoll < 3_092_376_453) {
        enemy.turnDir = edgeBiasLeft ? -1 : 1;
      } else {
        enemy.turnDir = edgeBiasLeft ? 1 : -1;
      }
    }
    const margin = 20 * POSITION_UNITS_PER_PIXEL;
    if (enemy.x < margin + 48 * POSITION_UNITS_PER_PIXEL) enemy.turnDir = 1;
    if (enemy.x > GAME_WIDTH_UNITS - margin - 48 * POSITION_UNITS_PER_PIXEL) enemy.turnDir = -1;
    const zigzag = enemy.motion === "zigzag";
    const vxDirection = zigzag
      ? ((canonicalRandomUint32(streams, "enemy_behavior") & 1) === 1 ? 1 : -1)
      : enemy.turnDir;
    const vxMinimum = zigzag ? 20 : 80;
    const vxMaximum = zigzag ? 200 : 220;
    const vyMinimum = zigzag ? 10 : 15;
    const vxHundredths = 240 + state.phase * 22 + canonicalRandomRange(streams, vxMinimum, vxMaximum);
    const vyHundredths = 225 + state.phase * 12 + canonicalRandomRange(streams, vyMinimum, 80);
    enemy.vx = vxDirection * roundDivide(vxHundredths * POSITION_UNITS_PER_PIXEL, 100);
    enemy.vy = roundDivide(vyHundredths * POSITION_UNITS_PER_PIXEL, 100);
  }
  enemy.turnTimer--;
  if (enemy.snapTimer > 0) {
    enemy.snapTimer--;
    enemy.vx += enemy.turnDir * Math.round(0.45 * POSITION_UNITS_PER_PIXEL);
  } else {
    const weaveAngle = (enemy.loopAngle + (enemy.motionTick + 1) * 91) % ANGLE_UNITS;
    enemy.vx += roundDivide(sinForAngle(weaveAngle) * 31, TRIG_UNITS);
  }
  const nudgeThreshold = Math.floor((60 + state.phase * 6) * 0x100000000 / 10000);
  if (canonicalRandomUint32(streams, "enemy_behavior") < nudgeThreshold) {
    enemy.vx += ((canonicalRandomUint32(streams, "enemy_behavior") & 1) === 1 ? 1 : -1)
      * canonicalRandomRange(streams, 100, 200) * POSITION_UNITS_PER_PIXEL / 100;
    enemy.vx = Math.round(enemy.vx);
  }
  enemy.x += roundDivide(enemy.vx * 40, 100);
}

function fireCanonicalEnemyProjectile(state, enemy, kind, speed, originOffsetPixels = 12, extra = {}) {
  const originY = enemy.y + originOffsetPixels * POSITION_UNITS_PER_PIXEL;
  const dx = state.player.x - enemy.x;
  const dy = state.player.y - originY;
  const distance = Math.max(1, Math.trunc(Math.sqrt(dx * dx + dy * dy)));
  const projectile = {
    id: state.nextEntityId++,
    kind,
    x: enemy.x,
    y: originY,
    vx: roundDivide(dx * speed, distance),
    vy: roundDivide(dy * speed, distance),
    angle: 0,
    life: canonicalEntityInteger(extra.life ?? 180, "Enemy projectile life"),
    damage: canonicalEntityInteger(extra.damage ?? 1, "Enemy projectile damage"),
    realm: enemy.realm
  };
  if (extra.drain != null) projectile.drain = canonicalEntityInteger(extra.drain, "Enemy projectile drain");
  state.enemyProjectiles.push(projectile);
}

function updateCanonicalPurple(state, enemy, streams) {
  if (enemy.driftPower > 0) {
    if (canonicalRandomUint32(streams, "enemy_behavior") < 42_949_672) enemy.driftDir *= -1;
    enemy.driftAngle = (enemy.driftAngle + 23) % ANGLE_UNITS;
    enemy.x += roundDivide(sinForAngle(enemy.driftAngle) * enemy.driftPower * 80, TRIG_UNITS * 100);
  }
  const trackingDirection = Math.sign(state.player.x - enemy.x);
  enemy.x += trackingDirection * Math.round(0.34 * POSITION_UNITS_PER_PIXEL);
  if (enemy.warnTimer > 0) {
    enemy.warnTimer--;
    if (enemy.warnTimer === 0) {
      const shotSpeed = roundDivide((340 + state.phase * 6) * POSITION_UNITS_PER_PIXEL, 100);
      fireCanonicalEnemyProjectile(state, enemy, "purple", shotSpeed);
      enemy.shootTimer = Math.max(
        76,
        102 - state.phase * 2 + enemy.volleySeed * 6 + canonicalRandomRange(streams, 0, 9)
      );
    }
  } else {
    enemy.shootTimer--;
    if (enemy.shootTimer <= 18) enemy.warnTimer = 16;
  }
}

function phantomCycleDuration(mode) {
  return mode === "physical" ? 132 : 78;
}

function updateCanonicalPhantom(state, enemy, streams) {
  if (enemy.telegraphTimer > 0) {
    enemy.telegraphTimer--;
    enemy.y += roundDivide(enemy.vy * 55, 100);
    const weaveAngle = (enemy.phaseOffset + (enemy.motionTick + 1) * 20) % ANGLE_UNITS;
    enemy.x += roundDivide(sinForAngle(weaveAngle) * 82, TRIG_UNITS);
    if (enemy.telegraphTimer === 0) {
      enemy.stateMode = enemy.stateMode === "physical" ? "ghost" : "physical";
      enemy.realm = enemy.stateMode === "ghost" ? 1 : 0;
      enemy.cycleTimer = phantomCycleDuration(enemy.stateMode) + canonicalRandomRange(streams, -12, 11);
      enemy.fireTimer = Math.max(18, enemy.fireTimer + canonicalRandomRange(streams, -12, 17));
    }
  } else {
    enemy.cycleTimer--;
    if (enemy.cycleTimer <= 0) enemy.telegraphTimer = 20;
    enemy.y += enemy.vy;
    if (enemy.driftPower > 0) {
      const driftAngle = (enemy.phaseOffset + (enemy.motionTick + 1) * 18) % ANGLE_UNITS;
      enemy.x += roundDivide(sinForAngle(driftAngle) * enemy.driftPower * 75, TRIG_UNITS * 100);
    }
    const tracking = enemy.stateMode === "physical" ? 143 : 92;
    enemy.x += Math.sign(state.player.x - enemy.x) * tracking;
    if (canonicalRandomUint32(streams, "enemy_behavior") < 51_539_608) enemy.driftDir *= -1;
  }
  enemy.fireTimer--;
  if (enemy.telegraphTimer <= 0 && enemy.stateMode === "physical" && enemy.fireTimer <= 0) {
    const shotSpeed = roundDivide((260 + state.phase * 3) * POSITION_UNITS_PER_PIXEL, 100);
    fireCanonicalEnemyProjectile(state, enemy, "phantomShot", shotSpeed, 10);
    enemy.fireTimer = 120 + canonicalRandomRange(streams, -20, 19);
  }
}

function canonicalDistance(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.trunc(Math.sqrt(dx * dx + dy * dy));
}

function canonicalCosForAngle(angle) {
  return sinForAngle(angle + ANGLE_UNITS / 4);
}

function spawnCanonicalMine(state, enemy, streams) {
  const offset = canonicalRandomRange(streams, -10, 10) * POSITION_UNITS_PER_PIXEL;
  state.hazards.push({
    id: state.nextEntityId++,
    kind: "mine",
    x: enemy.x + offset,
    y: enemy.y + 16 * POSITION_UNITS_PER_PIXEL,
    vx: 0,
    vy: 0,
    angle: 0,
    life: 600,
    armTimer: 48,
    damage: 1,
    realm: 0
  });
}

function launchCanonicalCarrierEnemy(state, enemy, streams) {
  const earlyPool = ["red", "orange"];
  const latePool = state.phase >= 9 ? ["red", "orange", "splitter", "siphon"] : ["red", "orange", "red"];
  const pool = enemy.launchCount < 2 ? earlyPool : latePool;
  const type = pool[canonicalRandomUint32(streams, "enemy_behavior") % pool.length];
  const lane = canonicalRandomUint32(streams, "enemy_behavior") % 3;
  const side = enemy.launchCount % 2 === 0 ? -1 : 1;
  spawnCanonicalEnemy(state, type, enemy.x + side * 11 * POSITION_UNITS_PER_PIXEL, enemy.y + 16 * POSITION_UNITS_PER_PIXEL, {
    vy: canonicalEnemyVelocityY(type, state.phase),
    motion: type === "phantom" ? "phantom" : type === "orange" ? "zigzag" : "drift",
    lane
  }, streams);
  enemy.launchCount++;
  enemy.bayOpen = 26;
  enemy.launchTimer = Math.max(
    60,
    108 - roundDivide(state.phase * 12, 10) + canonicalRandomRange(streams, 0, 44)
  );
}

function findCanonicalRepairTarget(state, drone) {
  let best = null;
  let bestDistance = Number.MAX_SAFE_INTEGER;
  for (const enemy of state.enemies) {
    if (enemy === drone || enemy.type === "repair_drone" || enemy.type === "splitter_shard") continue;
    if (enemy.hp >= enemy.maxHp || enemy.maxHp <= 1) continue;
    const distance = canonicalDistance(drone.x, drone.y, enemy.x, enemy.y);
    if (distance < bestDistance) {
      best = enemy;
      bestDistance = distance;
    }
  }
  return best;
}

function updateCanonicalExpansionEnemy(state, enemy, streams) {
  if (!["splitter", "splitter_shard", "carrier", "siphon", "leech", "minecaster", "shieldbearer", "railgunner", "repair_drone"].includes(enemy.type)) {
    return false;
  }
  if (enemy.type === "splitter") {
    enemy.loopAngle = (enemy.loopAngle + 23) % ANGLE_UNITS;
    enemy.x += roundDivide(sinForAngle(enemy.loopAngle) * 461, TRIG_UNITS);
    enemy.y += enemy.vy;
  } else if (enemy.type === "splitter_shard") {
    enemy.x += enemy.vx;
    enemy.y += enemy.vy;
    enemy.loopAngle = (enemy.loopAngle + 52) % ANGLE_UNITS;
    enemy.vx += roundDivide(sinForAngle(enemy.loopAngle) * 15, TRIG_UNITS);
  } else if (enemy.type === "carrier") {
    enemy.loopAngle = (enemy.loopAngle + 12) % ANGLE_UNITS;
    enemy.x += roundDivide(sinForAngle(enemy.loopAngle) * 328, TRIG_UNITS);
    enemy.y += enemy.vy;
    enemy.bayOpen = Math.max(0, enemy.bayOpen - 1);
    enemy.launchTimer--;
    if (enemy.launchTimer <= 22) enemy.bayOpen = Math.max(enemy.bayOpen, enemy.launchTimer);
    if (enemy.launchTimer <= 0 && streams) launchCanonicalCarrierEnemy(state, enemy, streams);
  } else if (enemy.type === "siphon") {
    enemy.loopAngle = (enemy.loopAngle + 23) % ANGLE_UNITS;
    enemy.x += Math.sign(state.player.x - enemy.x) * 225;
    enemy.x += roundDivide(sinForAngle(enemy.loopAngle) * 184, TRIG_UNITS);
    enemy.y += enemy.vy;
    enemy.fireTimer--;
    enemy.fireWarn = enemy.fireTimer > 0 && enemy.fireTimer <= 22 ? enemy.fireTimer : 0;
    if (enemy.fireTimer <= 0 && streams) {
      const speed = roundDivide((305 + state.phase * 3) * POSITION_UNITS_PER_PIXEL, 100);
      fireCanonicalEnemyProjectile(state, enemy, "drainShot", speed, 11, {
        damage: 0,
        drain: 22 * ENERGY_UNITS_PER_POINT,
        life: 240
      });
      enemy.fireTimer = Math.max(54, 112 - roundDivide(state.phase * 15, 10) + canonicalRandomRange(streams, -20, 27));
      enemy.fireWarn = 0;
    }
  } else if (enemy.type === "leech") {
    enemy.loopAngle = (enemy.loopAngle + 16) % ANGLE_UNITS;
    const targetY = Math.round(GAME_HEIGHT_UNITS * 30 / 100)
      + roundDivide(sinForAngle(enemy.loopAngle) * 28 * POSITION_UNITS_PER_PIXEL, TRIG_UNITS);
    enemy.x += Math.sign(state.player.x - enemy.x) * (307 + state.phase * 8);
    enemy.y += roundDivide((targetY - enemy.y) * 18, 1000) + roundDivide(enemy.vy * 18, 100);
    const distance = canonicalDistance(enemy.x, enemy.y, state.player.x, state.player.y);
    if (enemy.tetherActive) {
      if (distance > 225 * POSITION_UNITS_PER_PIXEL || state.player.ghostTimer > 0) {
        enemy.tetherActive = false;
        enemy.lockTimer = 74;
      } else {
        enemy.tetherDrainTick++;
        if (enemy.tetherDrainTick % 8 === 0) {
          drainCanonicalPlayerEnergy(state, Math.round(2.6 * ENERGY_UNITS_PER_POINT));
        }
      }
    } else {
      enemy.lockTimer--;
      if (enemy.lockTimer <= 0 && distance < 188 * POSITION_UNITS_PER_PIXEL) {
        enemy.tetherActive = true;
        enemy.tetherDrainTick = 0;
      } else if (enemy.lockTimer <= 0) {
        enemy.lockTimer = 24;
      }
    }
  } else if (enemy.type === "minecaster") {
    enemy.loopAngle = (enemy.loopAngle + 18) % ANGLE_UNITS;
    enemy.x += roundDivide(sinForAngle(enemy.loopAngle) * 287, TRIG_UNITS);
    enemy.y += enemy.vy;
    if (state.hazards.filter((hazard) => hazard.kind === "mine").length < 4) {
      enemy.mineTimer--;
      if (enemy.mineTimer <= 0 && enemy.minesDropped < 2 && streams) {
        spawnCanonicalMine(state, enemy, streams);
        enemy.minesDropped++;
        enemy.mineTimer = canonicalRandomRange(streams, 86, 128);
      }
    }
  } else if (enemy.type === "shieldbearer") {
    enemy.loopAngle = (enemy.loopAngle + 16) % ANGLE_UNITS;
    enemy.x += roundDivide(sinForAngle(enemy.loopAngle) * 184, TRIG_UNITS);
    enemy.y += enemy.vy;
    enemy.shieldPulse = (enemy.shieldPulse + 39) % ANGLE_UNITS;
  } else if (enemy.type === "railgunner") {
    enemy.loopAngle = (enemy.loopAngle + 13) % ANGLE_UNITS;
    enemy.x += roundDivide(sinForAngle(enemy.loopAngle) * (enemy.railWarn > 0 ? 51 : 225), TRIG_UNITS);
    enemy.y += enemy.railWarn > 0 ? roundDivide(enemy.vy * 28, 100) : enemy.vy;
    if (enemy.railWarn > 0) {
      enemy.railWarn--;
      if (enemy.railWarn <= 0 && streams) {
        spawnCanonicalHazard(state, "enemy_beam", enemy.x, enemy.y + 13 * POSITION_UNITS_PER_PIXEL, {
          angle: enemy.railAngle,
          active: 14,
          width: 7 * POSITION_UNITS_PER_PIXEL,
          damage: 1,
          realm: 0
        });
        enemy.railCooldown = 132 + canonicalRandomRange(streams, -18, 34);
      }
    } else {
      enemy.railCooldown--;
      if (enemy.railCooldown <= 0) {
        const dx = state.player.x - enemy.x;
        const dy = state.player.y - (enemy.y + 13 * POSITION_UNITS_PER_PIXEL);
        const angle = Math.atan2(dy, dx);
        enemy.railAngle = ((Math.round(angle * ANGLE_UNITS / (Math.PI * 2)) % ANGLE_UNITS) + ANGLE_UNITS) % ANGLE_UNITS;
        enemy.railWarn = streams ? canonicalRandomRange(streams, 38, 45) : 38;
      }
    }
  } else if (enemy.type === "repair_drone") {
    const target = findCanonicalRepairTarget(state, enemy);
    if (target) {
      enemy.repairTargetId = target.id;
      enemy.x += Math.sign(target.x - enemy.x) * 369;
      enemy.y += Math.sign(target.y - enemy.y) * 246 + roundDivide(enemy.vy * 24, 100);
      enemy.repairTimer--;
      if (canonicalDistance(enemy.x, enemy.y, target.x, target.y) < 88 * POSITION_UNITS_PER_PIXEL && enemy.repairTimer <= 0) {
        target.hp = Math.min(target.maxHp, target.hp + 1);
        enemy.repairTimer = 42;
      }
    } else {
      enemy.repairTargetId = 0;
      enemy.loopAngle = (enemy.loopAngle + 33) % ANGLE_UNITS;
      enemy.x += roundDivide(sinForAngle(enemy.loopAngle) * 246, TRIG_UNITS);
      enemy.y += enemy.vy;
    }
  }
  enemy.x = clampInteger(enemy.x, 20 * POSITION_UNITS_PER_PIXEL, GAME_WIDTH_UNITS - 20 * POSITION_UNITS_PER_PIXEL);
  return true;
}

function refreshCanonicalSupportEffects(state) {
  for (const enemy of state.enemies) {
    enemy.shieldedBy = 0;
    enemy.shieldCooldown = Math.max(0, enemy.shieldCooldown - 1);
  }
  for (const shield of state.enemies) {
    if (shield.type !== "shieldbearer" || shield.hp <= 0) continue;
    for (const enemy of state.enemies) {
      if (enemy === shield || enemy.hp <= 0 || enemy.shieldedBy) continue;
      if (enemy.type === "phantom" && enemy.stateMode === "ghost") continue;
      if (canonicalDistance(shield.x, shield.y, enemy.x, enemy.y) <= 94 * POSITION_UNITS_PER_PIXEL) {
        enemy.shieldedBy = shield.id;
      }
    }
  }
}

function drainCanonicalPlayerEnergy(state, amount) {
  const drain = state.player.stabilizer > 0 ? roundDivide(amount, 2) : amount;
  const before = state.player.energy;
  state.player.energy = Math.max(0, state.player.energy - drain);
  return before - state.player.energy;
}

function damageCanonicalPlayer(state, amount) {
  if (state.player.invulnerability > 0 || state.player.ghostTimer > 0) return false;
  if (state.player.phaseShield > 0) {
    state.player.phaseShield = 0;
    state.player.invulnerability = 42;
    return false;
  }
  state.player.hp = Math.max(0, state.player.hp - amount);
  state.stats.damageTaken += amount;
  state.player.invulnerability = 90;
  if (state.player.hp === 0) {
    state.terminal = true;
    state.terminalReason = "player_destroyed";
  }
  return true;
}

function beamHitsCanonicalPlayer(state, hazard) {
  if (hazard.realm !== state.playerRealm) return false;
  const dx = state.player.x - hazard.x;
  const dy = state.player.y - hazard.y;
  const directionX = canonicalCosForAngle(hazard.angle);
  const directionY = sinForAngle(hazard.angle);
  const projection = roundDivide(dx * directionX + dy * directionY, TRIG_UNITS);
  const perpendicular = Math.abs(roundDivide(dx * directionY - dy * directionX, TRIG_UNITS));
  return projection >= -8 * POSITION_UNITS_PER_PIXEL
    && projection <= hazard.length
    && perpendicular <= hazard.width + 7 * POSITION_UNITS_PER_PIXEL;
}

function updateCanonicalHazards(state, streams) {
  const playerBody = collisionBodyFor("player", state.player.x, state.player.y, state.player.heading);
  const survivors = [];
  for (const hazard of state.hazards) {
    if (CANONICAL_ASTEROIDS[hazard.kind]) {
      hazard.x += hazard.vx;
      hazard.y += hazard.vy;
      hazard.angle = (hazard.angle + hazard.angularVelocity + ANGLE_UNITS) % ANGLE_UNITS;
      hazard.life--;
      if (hazard.realm === state.playerRealm
        && bodiesOverlap(playerBody, collisionBodyFor(hazard.kind, hazard.x, hazard.y, hazard.angle))) {
        if (damageCanonicalPlayer(state, hazard.damage) && !hazard.wall) hazard.hp -= 2;
      }
      if (hazard.hp > 0 && hazard.life > 0
        && hazard.y < GAME_HEIGHT_UNITS + 70 * POSITION_UNITS_PER_PIXEL
        && hazard.x > -70 * POSITION_UNITS_PER_PIXEL
        && hazard.x < GAME_WIDTH_UNITS + 70 * POSITION_UNITS_PER_PIXEL) {
        survivors.push(hazard);
      }
      continue;
    }
    if (hazard.kind === "mine" || hazard.kind === "energy_mine") {
      hazard.x += hazard.vx;
      hazard.y += hazard.vy;
      hazard.life--;
      if (hazard.armTimer > 0) hazard.armTimer--;
      if (hazard.armTimer <= 0 && hazard.realm === state.playerRealm
        && bodiesOverlap(playerBody, collisionBodyFor(hazard.kind, hazard.x, hazard.y, hazard.angle))) {
        if (hazard.kind === "energy_mine") {
          drainCanonicalPlayerEnergy(state, hazard.drain);
        } else {
          damageCanonicalPlayer(state, hazard.damage);
        }
        continue;
      }
      if (hazard.life > 0) survivors.push(hazard);
      continue;
    }
    if (hazard.kind === "meteor_warning") {
      hazard.warn--;
      hazard.life--;
      if (hazard.warn <= 0) {
        spawnCanonicalHazard(state, hazard.targetKind, hazard.x, -38 * POSITION_UNITS_PER_PIXEL, {
          vx: hazard.spawnVX,
          vy: hazard.spawnVY,
          rareEvent: hazard.rareEvent
        }, streams);
      } else if (hazard.life > 0) survivors.push(hazard);
      continue;
    }
    if (hazard.kind === "enemy_beam") {
      hazard.x += hazard.sweepVx;
      hazard.y += hazard.sweepVy;
      if (hazard.warn > 0) {
        hazard.warn--;
      } else {
        hazard.active--;
        if (hazard.active >= 0 && beamHitsCanonicalPlayer(state, hazard)) {
          if (hazard.drain > 0) drainCanonicalPlayerEnergy(state, hazard.drain);
          if (hazard.damage > 0) damageCanonicalPlayer(state, hazard.damage);
        }
      }
      if (hazard.active > 0) survivors.push(hazard);
      continue;
    }
    if (hazard.kind === "gravity_well") {
      if (hazard.warn > 0) {
        hazard.warn--;
      } else {
        hazard.life--;
        hazard.pulseAngle = (hazard.pulseAngle + 52) % ANGLE_UNITS;
        if (hazard.expanding) hazard.radius = Math.min(150 * POSITION_UNITS_PER_PIXEL, hazard.radius + 1_382);
        if (hazard.shrink) hazard.radius = Math.max(28 * POSITION_UNITS_PER_PIXEL, hazard.radius - 563);
        if (hazard.realm === state.playerRealm) {
          const dx = hazard.x - state.player.x;
          const dy = hazard.y - state.player.y;
          const distance = Math.max(1, Math.trunc(Math.sqrt(dx * dx + dy * dy)));
          if (distance < hazard.radius) {
            const pull = roundDivide(hazard.strength * (hazard.radius - distance), hazard.radius);
            state.player.vx += roundDivide(dx * pull, distance);
            state.player.vy += roundDivide(dy * pull, distance);
            if (hazard.drain > 0 && state.tick % 10 === 0) {
              drainCanonicalPlayerEnergy(state, hazard.drain);
            }
          }
        }
      }
      if (hazard.life > 0) survivors.push(hazard);
      continue;
    }
    survivors.push(hazard);
  }
  state.hazards = survivors;
}

function canonicalAngleToTarget(fromX, fromY, targetX, targetY) {
  const radians = Math.atan2(targetY - fromY, targetX - fromX);
  return ((Math.round(radians * ANGLE_UNITS / (Math.PI * 2)) % ANGLE_UNITS) + ANGLE_UNITS) % ANGLE_UNITS;
}

function fireCanonicalBossProjectile(state, boss, angle, speed, realm = 0, kind = "boss") {
  const canonicalAngle = ((angle % ANGLE_UNITS) + ANGLE_UNITS) % ANGLE_UNITS;
  state.enemyProjectiles.push({
    id: state.nextEntityId++,
    kind,
    x: boss.x,
    y: boss.y + 22 * POSITION_UNITS_PER_PIXEL,
    vx: roundDivide(canonicalCosForAngle(canonicalAngle) * speed, TRIG_UNITS),
    vy: roundDivide(sinForAngle(canonicalAngle) * speed, TRIG_UNITS),
    angle: canonicalAngle,
    life: kind === "wraithGhost" ? 200 : 220,
    damage: 1,
    drain: 0,
    realm
  });
}

function fireCanonicalBossSpread(state, boss, count, spreadAngle, speed, realm = 0, kind = "boss") {
  const base = canonicalAngleToTarget(boss.x, boss.y + 22 * POSITION_UNITS_PER_PIXEL, state.player.x, state.player.y);
  const denominator = Math.max(1, count - 1);
  for (let index = 0; index < count; index++) {
    const offset = count === 1 ? 0 : roundDivide((index * 2 - (count - 1)) * spreadAngle, denominator);
    fireCanonicalBossProjectile(state, boss, base + offset, speed, realm, kind);
  }
}

function canonicalBossModeForPhase(phase) {
  const value = Number(phase);
  if (!Number.isSafeInteger(value) || value < 4 || value % 4 !== 0) return null;
  if (value < 8) return "standard";
  if (value < 12) return "wraith";
  const modes = ["debris_warden", "mothership", "siphon_core", "hive_breaker", "rail_tyrant", "gravity_well"];
  return modes[Math.floor((value - 12) / 4) % modes.length];
}

function canonicalBossConfig(mode, phase) {
  if (mode === "standard") {
    return { hp: 80 + phase * 18, y: -100, targetY: 92, entrySpeed: 717, attackTimer: 72 };
  }
  if (mode === "wraith") {
    return { hp: Math.floor((88 + phase * 6) * 105 / 100), y: -120, targetY: 94, entrySpeed: 492, attackTimer: 54 };
  }
  const expansion = {
    debris_warden: { baseHp: 112, hpPerPhase: 15, targetY: 90 },
    mothership: { baseHp: 118, hpPerPhase: 16, targetY: 92 },
    siphon_core: { baseHp: 120, hpPerPhase: 16, targetY: 90 },
    hive_breaker: { baseHp: 124, hpPerPhase: 16, targetY: 92 },
    rail_tyrant: { baseHp: 128, hpPerPhase: 16, targetY: 90 },
    gravity_well: { baseHp: 132, hpPerPhase: 16, targetY: 90 }
  }[mode];
  if (!expansion) throw new RangeError(`Unknown authoritative boss mode: ${mode}`);
  return {
    hp: expansion.baseHp + phase * expansion.hpPerPhase,
    y: -112,
    targetY: expansion.targetY,
    entrySpeed: 594,
    attackTimer: 86
  };
}

function spawnCanonicalBoss(state, requestedMode, streams) {
  if (!state || state.schema !== "SSR_SIM_STATE_V1" || state.terminal || state.boss) {
    throw new TypeError("Canonical boss creation requires an active boss-free simulation state.");
  }
  const mode = String(requestedMode || canonicalBossModeForPhase(state.phase) || "");
  if (!AUTHORITATIVE_BOSS_ARCHETYPES[mode]) throw new RangeError(`Unknown authoritative boss mode: ${mode}`);
  if (!streams || typeof streams.nextUint32 !== "function") throw new TypeError("Canonical boss creation requires named random streams.");
  const config = canonicalBossConfig(mode, state.phase);
  const boss = {
    id: state.nextEntityId++,
    mode,
    x: Math.round(GAME_WIDTH_UNITS / 2),
    y: config.y * POSITION_UNITS_PER_PIXEL,
    targetY: config.targetY * POSITION_UNITS_PER_PIXEL,
    entrySpeed: config.entrySpeed,
    angle: 0,
    hp: config.hp,
    maxHp: config.hp,
    score: AUTHORITATIVE_BOSS_ARCHETYPES[mode].score,
    entered: false,
    combatActive: false,
    attackTimer: config.attackTimer,
    cooldown: config.attackTimer,
    warn: 0,
    warnMax: 0,
    pending: "",
    step: 0,
    moveAngle: canonicalStreamRange(streams, "boss_behavior", 0, ANGLE_UNITS - 1),
    realm: 0,
    nextRealm: 1,
    shiftTelegraph: 0,
    hitsSinceShift: 0,
    nextShiftHits: mode === "wraith" ? 6 + canonicalStreamRange(streams, "boss_behavior", 0, 2) : 0,
    passiveTimer: 0,
    shift60Triggered: false,
    shift30Triggered: false,
    chargeTelegraph: 0,
    chargeStartRealm: 0,
    chargeDodged: false,
    chargeRecovery: 0,
    phantomSpewTimer: mode === "wraith" ? 300 + canonicalStreamRange(streams, "boss_behavior", 0, 119) : 0,
    bayOpen: 0,
    threshold70: false,
    threshold45: false,
    threshold25: false
  };
  state.boss = boss;
  state.playerRealm = 0;
  state.director.mood = "boss";
  state.director.moodTimer = 0;
  state.director.lastTemplate = "";
  return boss;
}

function bossHealthPercentHundredths(boss) {
  return Math.max(0, Math.min(100, Math.floor(boss.hp * 100 / Math.max(1, boss.maxHp))));
}

function standardBossAttack(boss) {
  const hp = bossHealthPercentHundredths(boss);
  const sequence = hp > 70
    ? ["spread", "aimed", "spawn", "spread"]
    : hp > 40
      ? ["aimed", "fan", "spawn", "aimed"]
      : ["fan", "spawn", "aimed", "fan"];
  return sequence[boss.step % sequence.length];
}

function expansionBossAttack(state, boss) {
  const hp = bossHealthPercentHundredths(boss);
  if (boss.mode === "siphon_core" && state.player.energy < 16 * ENERGY_UNITS_PER_POINT && boss.step % 2 === 0) {
    return "low_energy_pause";
  }
  const sequences = {
    debris_warden: hp > 62
      ? ["wall", "light", "wall", "meteor", "wall", "double", "rotate"]
      : hp > 30
        ? ["wall", "meteor", "wall", "crush", "rotate", "wall", "double", "light"]
        : ["wall", "crush", "meteor", "wall", "rotate", "wall", "double", "meteor"],
    mothership: hp > 35 ? ["launch", "escort", "heavy", "launch"] : ["final", "repair", "heavy", "escort"],
    siphon_core: hp > 45 ? ["drain_beam", "energy_mines", "pulse"] : ["tether", "pulse", "overcharge", "energy_mines"],
    hive_breaker: hp > 45 ? ["shard_burst", "guards", "light"] : ["panic", "shard_burst", "guards"],
    rail_tyrant: hp > 45 ? ["center", "crosshair", "triple"] : ["triple", "sweep", "crosshair"],
    gravity_well: hp > 45 ? ["well", "orbit", "compression"] : ["pull_gap", "compression", "asteroid_orbit"]
  };
  const sequence = sequences[boss.mode];
  return sequence[boss.step % sequence.length];
}

function canonicalBossCooldown(boss) {
  const hp = bossHealthPercentHundredths(boss);
  if (boss.mode === "standard") {
    const base = hp > 70 ? 60 : hp > 40 ? 48 : hp > 15 ? 38 : 32;
    return Math.max(30, Math.min(80, base - Math.round((100 - hp) * 4 / 100)));
  }
  if (boss.mode === "wraith") return hp > 70 ? 54 : hp > 40 ? 42 : hp > 20 ? 30 : 24;
  const base = boss.mode === "debris_warden" ? 92 : boss.mode === "mothership" ? 76 : boss.mode === "rail_tyrant" ? 80 : 72;
  return Math.max(38, Math.min(104, base - Math.round((100 - hp) * 24 / 100)));
}

function spawnCanonicalBossWall(state, gapSlot, options, streams) {
  const slots = options.slots || 6;
  const slotWidth = Math.floor(GAME_WIDTH_UNITS / slots);
  for (let slot = 0; slot < slots; slot++) {
    if (slot === gapSlot) continue;
    spawnCanonicalHazard(state, "boss_wall", slotWidth * slot + Math.floor(slotWidth / 2), options.y ?? -36 * POSITION_UNITS_PER_PIXEL, {
      vx: 0,
      vy: options.vy ?? 2_048,
      angle: 0,
      angularVelocity: 0,
      wall: true,
      noScore: true
    }, streams);
  }
}

function spawnCanonicalBossEnemy(state, boss, type, offsetPixels, streams, options = {}) {
  return spawnCanonicalEnemy(state, type, boss.x + offsetPixels * POSITION_UNITS_PER_PIXEL, boss.y + 26 * POSITION_UNITS_PER_PIXEL, {
    vx: options.vx ?? 0,
    vy: options.vy ?? canonicalEnemyVelocityY(type, state.phase),
    motion: options.motion || (type === "orange" ? "zigzag" : type === "phantom" ? "phantom" : "drift"),
    stateMode: options.stateMode || "physical",
    noPowerup: Boolean(options.noPowerup)
  }, streams);
}

function resolveCanonicalBossAttack(state, boss, attack, streams) {
  const hp = bossHealthPercentHundredths(boss);
  if (boss.mode === "standard") {
    if (attack === "spread") fireCanonicalBossSpread(state, boss, hp > 70 ? 5 : hp > 40 ? 7 : 9, hp > 40 ? 148 : 171, 3_379 + Math.round((100 - hp) * 5));
    else if (attack === "aimed") fireCanonicalBossSpread(state, boss, hp > 70 ? 3 : hp > 40 ? 4 : 5, hp > 40 ? 80 : 102, 3_891 + Math.round((100 - hp) * 5));
    else if (attack === "fan") fireCanonicalBossSpread(state, boss, hp > 70 ? 7 : hp > 40 ? 9 : 11, hp > 70 ? 149 : hp > 40 ? 199 : 249, 3_584 + Math.round((100 - hp) * 6));
    else if (attack === "spawn") {
      const types = state.phase < 3 ? ["red"] : state.phase < 5 ? ["red", "orange"] : ["red", "orange", "purple"];
      const type = types[canonicalStreamRange(streams, "boss_behavior", 0, types.length - 1)];
      spawnCanonicalBossEnemy(state, boss, type, 0, streams);
      if (state.phase >= 4 && canonicalRandomUint32(streams, "boss_behavior") < 2_362_232_012) {
        const second = types[canonicalStreamRange(streams, "boss_behavior", 0, types.length - 1)];
        spawnCanonicalBossEnemy(state, boss, second, 24, streams);
      }
    }
  } else if (boss.mode === "debris_warden") {
    const speed = hp > 62 ? 1_864 : hp > 30 ? 2_253 : 2_642;
    if (attack === "wall") {
      spawnCanonicalBossWall(state, canonicalStreamRange(streams, "boss_behavior", 0, 5), { vy: speed }, streams);
    } else if (attack === "double") {
      const first = canonicalStreamRange(streams, "boss_behavior", 0, 5);
      const second = canonicalStreamRange(streams, "boss_behavior", 0, 5);
      spawnCanonicalBossWall(state, first, { vy: Math.round(speed * 88 / 100) }, streams);
      spawnCanonicalBossWall(state, second, { y: -132 * POSITION_UNITS_PER_PIXEL, vy: Math.round(speed * 88 / 100) }, streams);
    } else if (attack === "crush") {
      spawnCanonicalBossWall(state, canonicalStreamRange(streams, "boss_behavior", 0, 4), { slots: 5, y: -44 * POSITION_UNITS_PER_PIXEL, vy: Math.round(speed * 84 / 100) }, streams);
    } else if (attack === "meteor") {
      for (let index = 0; index < 4; index++) {
        spawnCanonicalHazard(state, "meteor_warning", laneXForHazard(index % 3), Math.round(GAME_HEIGHT_UNITS * 22 / 100), {
          warn: 44 + index * 8,
          targetKind: index === 3 && state.phase >= 9 ? "comet_shard" : "rock_asteroid",
          spawnVY: Math.round(speed * (index === 3 && state.phase >= 9 ? 128 : 112) / 100)
        }, streams);
      }
    } else if (attack === "rotate") {
      for (let index = 0; index < 5; index++) {
        spawnCanonicalHazard(state, "rock_asteroid", (44 + index * 72) * POSITION_UNITS_PER_PIXEL, (-38 - index * 30) * POSITION_UNITS_PER_PIXEL, {
          vx: index % 2 === 0 ? -563 : 563,
          vy: speed
        }, streams);
      }
    } else {
      fireCanonicalBossSpread(state, boss, 3, 102, 3_277);
    }
  } else if (boss.mode === "mothership") {
    if (attack === "launch") {
      spawnCanonicalBossEnemy(state, boss, canonicalRandomUint32(streams, "boss_behavior") < 0x80000000 ? "red" : "orange", -24, streams);
      spawnCanonicalBossEnemy(state, boss, canonicalRandomUint32(streams, "boss_behavior") < 0x80000000 ? "red" : "orange", 24, streams);
    } else if (attack === "heavy") {
      spawnCanonicalBossEnemy(state, boss, state.phase >= 9 && canonicalRandomUint32(streams, "boss_behavior") < 0x80000000 ? "siphon" : "splitter", 0, streams);
    } else if (attack === "escort") {
      spawnCanonicalBossEnemy(state, boss, "red", -34, streams);
      spawnCanonicalBossEnemy(state, boss, "orange", 0, streams);
      spawnCanonicalBossEnemy(state, boss, "red", 34, streams);
    } else if (attack === "repair") {
      spawnCanonicalBossEnemy(state, boss, "repair_drone", canonicalRandomUint32(streams, "boss_behavior") < 0x80000000 ? -26 : 26, streams);
    } else if (attack === "final") {
      spawnCanonicalBossEnemy(state, boss, "orange", -36, streams);
      spawnCanonicalBossEnemy(state, boss, state.phase >= 10 ? "siphon" : "red", 0, streams);
      spawnCanonicalBossEnemy(state, boss, "orange", 36, streams);
    }
    boss.bayOpen = 32;
  } else if (boss.mode === "siphon_core") {
    if (attack === "drain_beam" || attack === "tether") {
      spawnCanonicalHazard(state, "enemy_beam", boss.x, boss.y + 22 * POSITION_UNITS_PER_PIXEL, {
        angle: canonicalAngleToTarget(boss.x, boss.y + 22 * POSITION_UNITS_PER_PIXEL, state.player.x, state.player.y),
        warn: 34,
        active: 34,
        width: (attack === "tether" ? 12 : 9) * POSITION_UNITS_PER_PIXEL,
        drain: Math.round((attack === "tether" ? 2.4 : 3.2) * ENERGY_UNITS_PER_POINT)
      }, streams);
    } else if (attack === "energy_mines") {
      spawnCanonicalHazard(state, "energy_mine", boss.x - 44 * POSITION_UNITS_PER_PIXEL, boss.y + 28 * POSITION_UNITS_PER_PIXEL, {}, streams);
      spawnCanonicalHazard(state, "energy_mine", boss.x + 44 * POSITION_UNITS_PER_PIXEL, boss.y + 28 * POSITION_UNITS_PER_PIXEL, {}, streams);
    } else if (attack === "pulse") {
      spawnCanonicalHazard(state, "gravity_well", boss.x, boss.y + 34 * POSITION_UNITS_PER_PIXEL, {
        radius: 38 * POSITION_UNITS_PER_PIXEL, warn: 34, life: 92, strength: 20, drain: Math.round(2.2 * ENERGY_UNITS_PER_POINT), expanding: true
      }, streams);
    } else if (attack === "overcharge") {
      if (state.player.energy > 65 * ENERGY_UNITS_PER_POINT) {
        spawnCanonicalHazard(state, "enemy_beam", boss.x, boss.y + 22 * POSITION_UNITS_PER_PIXEL, {
          angle: canonicalAngleToTarget(boss.x, boss.y + 22 * POSITION_UNITS_PER_PIXEL, state.player.x, state.player.y),
          warn: 36, active: 28, width: 13 * POSITION_UNITS_PER_PIXEL, drain: 4 * ENERGY_UNITS_PER_POINT
        }, streams);
      } else spawnCanonicalHazard(state, "energy_mine", boss.x, boss.y + 28 * POSITION_UNITS_PER_PIXEL, {}, streams);
    }
  } else if (boss.mode === "hive_breaker") {
    if (attack === "shard_burst" || attack === "panic") {
      const count = attack === "panic" ? 6 : 4;
      for (let index = 0; index < count; index++) {
        const numerator = index * 2 - (count - 1);
        const offset = roundDivide(numerator * 28 * POSITION_UNITS_PER_PIXEL, Math.max(1, count - 1));
        const vx = roundDivide(numerator * 2_150, Math.max(1, count - 1));
        spawnCanonicalBossEnemy(state, boss, "splitter_shard", 0, streams, { vx, vy: 2_765 + Math.round(Math.abs(vx) / 6), noPowerup: true });
        state.enemies[state.enemies.length - 1].x += offset;
      }
    } else if (attack === "guards") {
      spawnCanonicalBossEnemy(state, boss, "splitter", -44, streams);
      spawnCanonicalBossEnemy(state, boss, "splitter", 44, streams);
    } else fireCanonicalBossSpread(state, boss, 4, 114, 3_072);
  } else if (boss.mode === "rail_tyrant") {
    if (attack === "center") {
      spawnCanonicalHazard(state, "enemy_beam", Math.floor(GAME_WIDTH_UNITS / 2), -10 * POSITION_UNITS_PER_PIXEL, { angle: 1_024, warn: 42, active: 18, width: 9 * POSITION_UNITS_PER_PIXEL, damage: 1 }, streams);
    } else if (attack === "crosshair") {
      spawnCanonicalHazard(state, "enemy_beam", state.player.x, -10 * POSITION_UNITS_PER_PIXEL, { angle: 1_024, warn: 44, active: 16, width: 8 * POSITION_UNITS_PER_PIXEL, damage: 1 }, streams);
    } else if (attack === "triple") {
      const safe = canonicalStreamRange(streams, "boss_behavior", 0, 2);
      for (let lane = 0; lane < 3; lane++) if (lane !== safe) {
        spawnCanonicalHazard(state, "enemy_beam", laneXForHazard(lane), -10 * POSITION_UNITS_PER_PIXEL, { angle: 1_024, warn: 44, active: 18, width: 13 * POSITION_UNITS_PER_PIXEL, damage: 1 }, streams);
      }
    } else if (attack === "sweep") {
      const left = canonicalRandomUint32(streams, "boss_behavior") < 0x80000000;
      spawnCanonicalHazard(state, "enemy_beam", (left ? 36 : 339) * POSITION_UNITS_PER_PIXEL, -10 * POSITION_UNITS_PER_PIXEL, {
        angle: 1_024, warn: 44, active: 72, width: 8 * POSITION_UNITS_PER_PIXEL, damage: 1, sweepVx: left ? 1_178 : -1_178
      }, streams);
    }
  } else if (boss.mode === "gravity_well") {
    if (attack === "well") {
      const x = clampInteger(state.player.x + canonicalStreamRange(streams, "boss_behavior", -40, 40) * POSITION_UNITS_PER_PIXEL, 52 * POSITION_UNITS_PER_PIXEL, GAME_WIDTH_UNITS - 52 * POSITION_UNITS_PER_PIXEL);
      const y = clampInteger(state.player.y - 70 * POSITION_UNITS_PER_PIXEL, 130 * POSITION_UNITS_PER_PIXEL, GAME_HEIGHT_UNITS - 160 * POSITION_UNITS_PER_PIXEL);
      spawnCanonicalHazard(state, "gravity_well", x, y, { radius: 78 * POSITION_UNITS_PER_PIXEL, warn: 46, life: 160, strength: 123 }, streams);
    } else if (attack === "compression") {
      spawnCanonicalHazard(state, "gravity_well", Math.floor(GAME_WIDTH_UNITS / 2), Math.round(GAME_HEIGHT_UNITS * 55 / 100), { radius: 130 * POSITION_UNITS_PER_PIXEL, warn: 42, life: 150, strength: 46, shrink: true }, streams);
    } else if (attack === "orbit") {
      fireCanonicalBossSpread(state, boss, 5, 369, 2_714);
    } else if (attack === "asteroid_orbit") {
      for (let index = 0; index < 3; index++) spawnCanonicalHazard(state, "small_debris", boss.x + (index - 1) * 36 * POSITION_UNITS_PER_PIXEL, boss.y + 30 * POSITION_UNITS_PER_PIXEL, { vx: (index - 1) * 358, vy: 2_406 }, streams);
    } else if (attack === "pull_gap") {
      spawnCanonicalHazard(state, "gravity_well", Math.floor(GAME_WIDTH_UNITS / 2), Math.round(GAME_HEIGHT_UNITS * 48 / 100), { radius: 102 * POSITION_UNITS_PER_PIXEL, warn: 40, life: 120, strength: 77 }, streams);
      const safe = canonicalStreamRange(streams, "boss_behavior", 0, 2);
      for (let lane = 0; lane < 3; lane++) if (lane !== safe) spawnCanonicalHazard(state, "enemy_beam", laneXForHazard(lane), -10 * POSITION_UNITS_PER_PIXEL, { angle: 1_024, warn: 46, active: 14, width: 10 * POSITION_UNITS_PER_PIXEL, damage: 1 }, streams);
    }
  }
  boss.step++;
}

function updateCanonicalWraith(state, boss, streams) {
  if (boss.shiftTelegraph > 0) {
    boss.shiftTelegraph--;
    if (boss.shiftTelegraph === 0) {
      boss.realm = boss.nextRealm;
      boss.nextRealm = 1 - boss.realm;
      boss.hitsSinceShift = 0;
      boss.nextShiftHits = 6 + canonicalStreamRange(streams, "boss_behavior", 0, 2);
      boss.passiveTimer = 0;
      boss.attackTimer = Math.min(boss.attackTimer, 38);
    }
    return;
  }
  if (boss.chargeTelegraph > 0) {
    boss.chargeTelegraph--;
    if (state.playerRealm !== boss.chargeStartRealm) boss.chargeDodged = true;
    if (boss.chargeTelegraph === 0) {
      const hp = bossHealthPercentHundredths(boss);
      const total = hp > 38 ? 12 : 14;
      fireCanonicalBossSpread(state, boss, total - 3, 91, state.playerRealm === 0 ? 4_813 : 4_096, state.playerRealm, state.playerRealm === 0 ? "wraithPhysical" : "wraithGhost");
      fireCanonicalBossSpread(state, boss, 3, 46, state.playerRealm === 0 ? 3_277 : 2_867, 1 - state.playerRealm, state.playerRealm === 0 ? "wraithGhost" : "wraithPhysical");
      if (boss.chargeDodged) state.player.energy = Math.min(state.player.maxEnergy, state.player.energy + 9 * ENERGY_UNITS_PER_POINT);
      boss.chargeRecovery = 20;
      boss.attackTimer = canonicalBossCooldown(boss);
    }
    return;
  }
  if (boss.chargeRecovery > 0) boss.chargeRecovery--;
  boss.moveAngle = (boss.moveAngle + (boss.realm === 0 ? 13 : 19)) % ANGLE_UNITS;
  boss.x += roundDivide(sinForAngle(boss.moveAngle) * (boss.realm === 0 ? 922 : 1_331), TRIG_UNITS);
  boss.x = clampInteger(boss.x, 78 * POSITION_UNITS_PER_PIXEL, GAME_WIDTH_UNITS - 78 * POSITION_UNITS_PER_PIXEL);
  if (state.playerRealm === boss.realm) boss.passiveTimer = 0;
  else boss.passiveTimer++;
  if (!boss.shift60Triggered && boss.hp * 10 <= boss.maxHp * 6) {
    boss.shift60Triggered = true;
    boss.shiftTelegraph = 30;
    boss.nextRealm = 1 - boss.realm;
    return;
  }
  if (!boss.shift30Triggered && boss.hp * 10 <= boss.maxHp * 3) {
    boss.shift30Triggered = true;
    boss.shiftTelegraph = 30;
    boss.nextRealm = 1 - boss.realm;
    return;
  }
  if (boss.passiveTimer >= 540) {
    boss.shiftTelegraph = 30;
    boss.nextRealm = 1 - boss.realm;
    return;
  }
  boss.attackTimer--;
  if (boss.attackTimer <= 0) {
    boss.combatActive = true;
    const hp = bossHealthPercentHundredths(boss);
    const chance = hp < 20 ? 60 : hp < 40 ? 45 : hp < 70 ? 28 : 18;
    if (canonicalStreamRange(streams, "boss_behavior", 0, 99) < chance && boss.chargeRecovery <= 0) {
      boss.chargeTelegraph = hp < 40 ? 48 : 42;
      boss.chargeStartRealm = state.playerRealm;
      boss.chargeDodged = false;
      boss.attackTimer = canonicalBossCooldown(boss) + 10;
    } else {
      const total = hp > 68 ? 9 : hp > 38 ? 12 : 15;
      const main = Math.max(2, Math.round(total * 75 / 100));
      fireCanonicalBossSpread(state, boss, main, boss.realm === 0 ? 137 : 102, boss.realm === 0 ? 4_198 : 3_789, state.playerRealm, state.playerRealm === 0 ? "wraithPhysical" : "wraithGhost");
      fireCanonicalBossSpread(state, boss, total - main, boss.realm === 0 ? 80 : 68, 3_072, 1 - state.playerRealm, state.playerRealm === 0 ? "wraithGhost" : "wraithPhysical");
      boss.attackTimer = canonicalBossCooldown(boss);
    }
  }
}

function updateCanonicalBoss(state, streams) {
  const boss = state.boss;
  if (!boss) return false;
  if (!streams || typeof streams.nextUint32 !== "function") throw new TypeError("Canonical boss updates require named random streams.");
  if (!boss.entered) {
    boss.y = Math.min(boss.targetY, boss.y + boss.entrySpeed);
    if (boss.y >= boss.targetY) {
      boss.y = boss.targetY;
      boss.entered = true;
      boss.attackTimer = boss.mode === "wraith" ? 50 : 72;
      boss.cooldown = boss.attackTimer;
    }
    return true;
  }
  if (boss.mode === "wraith") {
    updateCanonicalWraith(state, boss, streams);
    return true;
  }
  boss.moveAngle = (boss.moveAngle + (boss.mode === "rail_tyrant" ? 12 : 16)) % ANGLE_UNITS;
  boss.x += roundDivide(sinForAngle(boss.moveAngle) * (boss.mode === "mothership" ? 563 : boss.mode === "standard" ? 1_434 : 799), TRIG_UNITS);
  const edge = boss.mode === "mothership" ? 88 : 78;
  boss.x = clampInteger(boss.x, edge * POSITION_UNITS_PER_PIXEL, GAME_WIDTH_UNITS - edge * POSITION_UNITS_PER_PIXEL);
  boss.bayOpen = Math.max(0, boss.bayOpen - 1);
  const hp = bossHealthPercentHundredths(boss);
  if (boss.mode === "hive_breaker") {
    if (!boss.threshold70 && hp < 70) { boss.threshold70 = true; resolveCanonicalBossAttack(state, boss, "guards", streams); }
    if (!boss.threshold45 && hp < 45) { boss.threshold45 = true; resolveCanonicalBossAttack(state, boss, "shard_burst", streams); }
    if (!boss.threshold25 && hp < 25) { boss.threshold25 = true; resolveCanonicalBossAttack(state, boss, "panic", streams); }
  }
  if (boss.warn > 0) {
    boss.warn--;
    if (boss.warn === 0) {
      resolveCanonicalBossAttack(state, boss, boss.pending, streams);
      boss.pending = "";
      boss.attackTimer = canonicalBossCooldown(boss);
      boss.cooldown = boss.attackTimer;
    }
    return true;
  }
  boss.attackTimer--;
  boss.cooldown = boss.attackTimer;
  if (boss.attackTimer <= 0) {
    boss.combatActive = true;
    boss.pending = boss.mode === "standard" ? standardBossAttack(boss) : expansionBossAttack(state, boss);
    boss.warn = boss.mode === "standard"
      ? (boss.pending === "spawn" ? (hp < 35 ? 24 : 28) : hp < 35 ? 14 : 18)
      : boss.pending === "light" ? 18 : boss.pending === "launch" || boss.pending === "escort" ? 32 : boss.mode === "rail_tyrant" && boss.pending === "sweep" ? 50 : boss.mode === "debris_warden" && ["wall", "double", "crush"].includes(boss.pending) ? 54 : 44;
    boss.warnMax = boss.warn;
    boss.bayOpen = boss.warn;
  }
  return true;
}

function updateCanonicalEntities(state, streams) {
  const existingEnemyCount = state.enemies.length;
  const existingEnemyProjectileCount = state.enemyProjectiles.length;
  for (let enemyIndex = 0; enemyIndex < existingEnemyCount; enemyIndex++) {
    const enemy = state.enemies[enemyIndex];
    if (enemy.type === "red" && enemy.driftPower > 0 && streams) {
      if (canonicalRandomUint32(streams, "enemy_behavior") < 51_539_608) enemy.driftDir *= -1;
      enemy.x += roundDivide(sinForAngle(enemy.driftAngle) * enemy.driftPower * enemy.driftDir, TRIG_UNITS);
      enemy.driftAngle = (enemy.driftAngle + 20) % ANGLE_UNITS;
    }
    let verticalMovementHandled = false;
    if (enemy.type === "orange" && streams) {
      updateCanonicalOrange(state, enemy, streams);
    } else if (updateCanonicalExpansionEnemy(state, enemy, streams)) {
      verticalMovementHandled = true;
    } else {
      enemy.x += enemy.vx;
    }
    if (enemy.type === "purple" && streams) updateCanonicalPurple(state, enemy, streams);
    if (enemy.type === "phantom" && streams) {
      updateCanonicalPhantom(state, enemy, streams);
      verticalMovementHandled = true;
    }
    if (!verticalMovementHandled) enemy.y += enemy.vy;
    enemy.motionTick++;
  }
  refreshCanonicalSupportEffects(state);
  for (const projectile of state.playerProjectiles) {
    projectile.x += projectile.vx;
    projectile.y += projectile.vy;
    projectile.life--;
  }
  for (let index = 0; index < existingEnemyProjectileCount; index++) {
    const projectile = state.enemyProjectiles[index];
    projectile.x += projectile.vx;
    projectile.y += projectile.vy;
    projectile.life--;
  }
  state.playerProjectiles = state.playerProjectiles.filter((projectile) => (
    projectile.life > 0 && projectile.y > -40 * POSITION_UNITS_PER_PIXEL
  ));
  state.enemyProjectiles = state.enemyProjectiles.filter((projectile) => (
    projectile.life > 0
      && projectile.x > -40 * POSITION_UNITS_PER_PIXEL
      && projectile.x < GAME_WIDTH_UNITS + 40 * POSITION_UNITS_PER_PIXEL
      && projectile.y < GAME_HEIGHT_UNITS + 40 * POSITION_UNITS_PER_PIXEL
  ));
}

function noteCanonicalKill(state, enemy, streams, allowDrop = true) {
  state.comboKills++;
  state.multiplier = Math.max(1, Math.min(4, 1 + Math.floor(state.comboKills / 7)));
  const score = enemy.score * state.multiplier;
  state.score += state.player.scoreSurge > 0 ? Math.round(score * 3 / 2) : score;
  state.stats.kills++;
  state.stats.highestCombo = Math.max(state.stats.highestCombo, state.comboKills);
  if (!allowDrop || enemy.noPowerup || enemy.type === "splitter_shard") return;
  if (streams && shouldDropCanonicalPowerup(state, streams)) {
    spawnCanonicalPowerup(state, selectCanonicalPowerupType(state, streams), enemy.x, enemy.y);
    registerCanonicalPowerupDrop(state, streams);
  } else {
    state.director.killsSinceDrop++;
  }
}

function resolveCanonicalProjectileHits(state, streams) {
  const deadProjectiles = new Set();
  const deadEnemies = new Set();
  const destroyedEnemies = [];
  for (const projectile of state.playerProjectiles) {
    if (deadProjectiles.has(projectile.id)) continue;
    const projectileBody = collisionBodyFor("player_bullet", projectile.x, projectile.y, projectile.angle);
    for (const enemy of state.enemies) {
      if (deadEnemies.has(enemy.id) || enemy.realm !== projectile.realm) continue;
      if (enemy.type === "phantom" && enemy.telegraphTimer > 0) continue;
      const enemyBody = collisionBodyFor(enemy.type, enemy.x, enemy.y, enemy.angle);
      if (!bodiesOverlap(projectileBody, enemyBody)) continue;
      if (enemy.shieldedBy && enemy.type !== "shieldbearer" && enemy.shieldCooldown <= 0) {
        enemy.shieldCooldown = 62;
        deadProjectiles.add(projectile.id);
        break;
      }
      enemy.hp -= projectile.damage;
      if (enemy.hp <= 0) {
        deadEnemies.add(enemy.id);
        destroyedEnemies.push(enemy);
        noteCanonicalKill(state, enemy, streams);
      }
      if ((projectile.pierce || 0) > 0) {
        projectile.pierce--;
        continue;
      }
      deadProjectiles.add(projectile.id);
      break;
    }
  }
  state.playerProjectiles = state.playerProjectiles.filter((projectile) => !deadProjectiles.has(projectile.id));
  state.enemies = state.enemies.filter((enemy) => !deadEnemies.has(enemy.id));
  for (const enemy of destroyedEnemies) {
    if (enemy.type !== "splitter") continue;
    const shardCount = state.enemies.filter((candidate) => candidate.type === "splitter_shard").length;
    if (shardCount >= 8) continue;
    spawnCanonicalEnemy(state, "splitter_shard", enemy.x - 4 * POSITION_UNITS_PER_PIXEL, enemy.y + 3 * POSITION_UNITS_PER_PIXEL, {
      vx: -Math.round(1.85 * POSITION_UNITS_PER_PIXEL),
      vy: Math.round(2.9 * POSITION_UNITS_PER_PIXEL),
      motion: "splitter_shard",
      noPowerup: true
    });
    spawnCanonicalEnemy(state, "splitter_shard", enemy.x + 4 * POSITION_UNITS_PER_PIXEL, enemy.y + 3 * POSITION_UNITS_PER_PIXEL, {
      vx: Math.round(1.85 * POSITION_UNITS_PER_PIXEL),
      vy: Math.round(2.9 * POSITION_UNITS_PER_PIXEL),
      motion: "splitter_shard",
      noPowerup: true
    });
  }
}

function resolveCanonicalPlayerContact(state) {
  const player = state.player;
  if (player.invulnerability > 0 || player.ghostTimer > 0) return;
  const playerBody = collisionBodyFor("player", player.x, player.y, player.heading);
  for (const enemy of state.enemies) {
    if (enemy.realm !== state.playerRealm) continue;
    if (enemy.type === "phantom" && enemy.telegraphTimer > 0) continue;
    if (!bodiesOverlap(playerBody, collisionBodyFor(enemy.type, enemy.x, enemy.y, enemy.angle))) continue;
    damageCanonicalPlayer(state, 1);
    break;
  }
}

function resolveCanonicalEnemyProjectileHits(state) {
  const player = state.player;
  const playerBody = collisionBodyFor("player", player.x, player.y, player.heading);
  const consumed = new Set();
  for (const projectile of state.enemyProjectiles) {
    if (projectile.realm !== state.playerRealm) continue;
    const collisionKey = projectile.kind === "drainShot" ? "drainShot" : "enemy_bullet";
    let intercepted = false;
    for (let index = state.wingmen.length - 1; index >= 0; index--) {
      const wingman = state.wingmen[index];
      if (!bodiesOverlap(collisionBodyFor(collisionKey, projectile.x, projectile.y, projectile.angle), collisionBodyFor("wingman", wingman.x, wingman.y, 0))) continue;
      consumed.add(projectile.id);
      if (wingman.phase === "active") state.wingmen.splice(index, 1);
      intercepted = true;
      break;
    }
    if (intercepted) continue;
    if (!bodiesOverlap(playerBody, collisionBodyFor(collisionKey, projectile.x, projectile.y, projectile.angle))) continue;
    if (projectile.kind === "drainShot") {
      consumed.add(projectile.id);
      drainCanonicalPlayerEnergy(state, projectile.drain);
    } else if (player.invulnerability <= 0 && player.ghostTimer <= 0) {
      consumed.add(projectile.id);
      damageCanonicalPlayer(state, projectile.damage);
    } else continue;
    break;
  }
  state.enemyProjectiles = state.enemyProjectiles.filter((projectile) => !consumed.has(projectile.id));
}

function resolveCanonicalWingmanContact(state) {
  for (let enemyIndex = state.enemies.length - 1; enemyIndex >= 0; enemyIndex--) {
    const enemy = state.enemies[enemyIndex];
    for (let wingmanIndex = state.wingmen.length - 1; wingmanIndex >= 0; wingmanIndex--) {
      const wingman = state.wingmen[wingmanIndex];
      if (wingman.phase === "departing") continue;
      if (!bodiesOverlap(collisionBodyFor(enemy.type, enemy.x, enemy.y, enemy.angle), collisionBodyFor("wingman", wingman.x, wingman.y, 0))) continue;
      if (wingman.phase === "active" && state.player.ghostTimer <= 0) state.wingmen.splice(wingmanIndex, 1);
      state.enemies.splice(enemyIndex, 1);
      break;
    }
  }
}

function spawnCanonicalBossRewards(state, boss, streams) {
  if (!streams) return;
  const primary = canonicalRandomUint32(streams, "loot") < 0x80000000 ? "spread" : "rapid";
  spawnCanonicalPowerup(state, primary, boss.x - 18 * POSITION_UNITS_PER_PIXEL, boss.y - 2 * POSITION_UNITS_PER_PIXEL);
  if (canonicalRandomUint32(streams, "loot") < 0x80000000) {
    const pool = ["spread", "rapid", "repair", "wingman", "dual", "energy_cell", "phase_shield", "overcharge", "piercing"];
    const type = pool[canonicalStreamRange(streams, "loot", 0, pool.length - 1)];
    spawnCanonicalPowerup(state, type, boss.x + 18 * POSITION_UNITS_PER_PIXEL, boss.y + 2 * POSITION_UNITS_PER_PIXEL);
  }
}

function finishCanonicalBoss(state, boss, streams) {
  state.score += boss.score;
  state.stats.bosses++;
  spawnCanonicalBossRewards(state, boss, streams);
  if (streams) registerCanonicalPowerupDrop(state, streams, 300, 480);
  state.boss = null;
  state.enemies = [];
  state.enemyProjectiles = [];
  state.pendingSpawns = [];
  state.director.bossRecovery = 120;
  state.director.mood = "open";
  state.director.moodTimer = 120;
  state.director.lastTemplate = "";
}

function resolveCanonicalBossProjectileHits(state, streams) {
  const boss = state.boss;
  if (!boss || !boss.entered || !boss.combatActive) return false;
  const consumed = new Set();
  let defeated = false;
  for (const projectile of state.playerProjectiles) {
    if (projectile.realm !== boss.realm) continue;
    const projectileBody = collisionBodyFor("player_bullet", projectile.x, projectile.y, projectile.angle);
    const bossKey = boss.mode === "standard" ? "boss_standard" : `boss_${boss.mode}`;
    if (!bodiesOverlap(projectileBody, collisionBodyFor(bossKey, boss.x, boss.y, boss.angle))) continue;
    consumed.add(projectile.id);
    boss.hp -= projectile.damage;
    if (boss.mode === "wraith") {
      boss.hitsSinceShift++;
      if (boss.hp > 0 && boss.hitsSinceShift >= boss.nextShiftHits && boss.shiftTelegraph === 0 && boss.chargeTelegraph === 0) {
        boss.shiftTelegraph = 30;
        boss.nextRealm = 1 - boss.realm;
      }
    }
    if (boss.hp <= 0) {
      finishCanonicalBoss(state, boss, streams);
      defeated = true;
    }
    break;
  }
  state.playerProjectiles = state.playerProjectiles.filter((projectile) => !consumed.has(projectile.id));
  return defeated;
}

function explodeCanonicalMine(state, hazard) {
  const radius = (hazard.kind === "mine" ? 42 : 36) * POSITION_UNITS_PER_PIXEL;
  const dx = state.player.x - hazard.x;
  const dy = state.player.y - hazard.y;
  if (dx * dx + dy * dy > radius * radius || hazard.realm !== state.playerRealm) return;
  if (hazard.kind === "energy_mine") drainCanonicalPlayerEnergy(state, hazard.drain);
  else damageCanonicalPlayer(state, hazard.damage);
}

function resolveCanonicalHazardProjectileHits(state) {
  const consumedProjectiles = new Set();
  const destroyedHazards = new Set();
  for (const projectile of state.playerProjectiles) {
    if (consumedProjectiles.has(projectile.id)) continue;
    const projectileBody = collisionBodyFor("player_bullet", projectile.x, projectile.y, projectile.angle);
    for (const hazard of state.hazards) {
      if (destroyedHazards.has(hazard.id) || hazard.realm !== projectile.realm) continue;
      if (!CANONICAL_ASTEROIDS[hazard.kind] && hazard.kind !== "mine" && hazard.kind !== "energy_mine") continue;
      if (!bodiesOverlap(projectileBody, collisionBodyFor(hazard.kind, hazard.x, hazard.y, hazard.angle))) continue;
      consumedProjectiles.add(projectile.id);
      hazard.hp -= projectile.damage;
      if (hazard.hp <= 0) {
        destroyedHazards.add(hazard.id);
        if (hazard.kind === "mine" || hazard.kind === "energy_mine") explodeCanonicalMine(state, hazard);
      }
      break;
    }
  }
  state.playerProjectiles = state.playerProjectiles.filter((projectile) => !consumedProjectiles.has(projectile.id));
  state.hazards = state.hazards.filter((hazard) => !destroyedHazards.has(hazard.id));
}

function stepSimulation(state, rawInput, streams) {
  if (!state || state.schema !== "SSR_SIM_STATE_V1") throw new TypeError("Canonical simulation state is invalid.");
  if (state.terminal) throw new Error("Canonical simulation is already terminal.");
  const input = validateCanonicalInput(rawInput);
  state.tick++;
  state.director.ticksSinceDrop++;
  if (state.director.dropCooldown > 0) state.director.dropCooldown--;
  applyPauseEdge(state, input);
  if (!state.terminal) {
    applyGhostShift(state, input);
    updateCanonicalPlayer(state, input);
    fireCanonicalPlayer(state);
    updateCanonicalWingmen(state);
    updateCanonicalEntities(state, streams);
    if (state.boss) updateCanonicalBoss(state, streams);
    updateCanonicalHazards(state, streams);
    updateCanonicalPowerups(state, streams);
    resolveCanonicalProjectileHits(state, streams);
    const bossDefeated = resolveCanonicalBossProjectileHits(state, streams);
    resolveCanonicalHazardProjectileHits(state);
    if (!state.terminal) resolveCanonicalEnemyProjectileHits(state);
    if (!state.terminal) resolveCanonicalWingmanContact(state);
    resolveCanonicalPlayerContact(state);
    if (!state.terminal && streams && !state.boss && !bossDefeated) {
      if (state.director.bossRecovery > 0) {
        state.director.bossRecovery--;
      } else {
        tickCanonicalHazardEvent(state, streams);
        const previousPhase = state.phase;
        const due = tickCanonicalDirector(state, streams);
        materializeCanonicalSpawns(state, due, streams);
        if (state.phase !== previousPhase && state.phase % 4 === 0) {
          spawnCanonicalBoss(state, canonicalBossModeForPhase(state.phase), streams);
        }
      }
    }
  }
  if (!state.terminal && state.tick >= state.maxTicks) {
    state.terminal = true;
    state.terminalReason = "tick_limit";
  }
  return state;
}

return Object.freeze({
  canonicalBossModeForPhase,
  collectCanonicalPowerup,
  roundDivide,
  spawnCanonicalBoss,
  spawnCanonicalEnemy,
  spawnCanonicalHazard,
  spawnCanonicalPowerup,
  stepSimulation,
  tickCanonicalHazardEvent,
  updateCanonicalBoss,
  updateCanonicalHazards,
  updateCanonicalPowerups,
  validateCanonicalInput
});
});
