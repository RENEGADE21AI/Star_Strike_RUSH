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
const { AUTHORITATIVE_ENEMY_ARCHETYPES } = content;
const { tickCanonicalDirector } = director;
const { sinForAngle } = trig;
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
  player.energy = Math.min(player.maxEnergy, player.energy + 50);
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

function fireCanonicalPlayer(state) {
  const player = state.player;
  if (player.fireCooldown > 0) return;
  state.playerProjectiles.push({
    id: state.nextEntityId++,
    x: player.x,
    y: player.y - 20 * POSITION_UNITS_PER_PIXEL,
    vx: 0,
    vy: -9 * POSITION_UNITS_PER_PIXEL,
    angle: 0,
    life: 90,
    damage: 1,
    realm: state.playerRealm
  });
  player.fireCooldown = 14;
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
          state.player.energy = Math.max(0, state.player.energy - Math.round(2.6 * ENERGY_UNITS_PER_POINT));
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
        state.hazards.push({
          id: state.nextEntityId++,
          kind: "enemy_beam",
          x: enemy.x,
          y: enemy.y + 13 * POSITION_UNITS_PER_PIXEL,
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

function damageCanonicalPlayer(state, amount) {
  if (state.player.invulnerability > 0 || state.player.ghostTimer > 0) return false;
  state.player.hp = Math.max(0, state.player.hp - amount);
  state.stats.damageTaken += amount;
  state.player.invulnerability = 90;
  if (state.player.hp === 0) {
    state.terminal = true;
    state.terminalReason = "player_destroyed";
  }
  return true;
}

function updateCanonicalHazards(state) {
  const playerBody = collisionBodyFor("player", state.player.x, state.player.y, state.player.heading);
  const survivors = [];
  for (const hazard of state.hazards) {
    if (hazard.kind === "mine") {
      hazard.x += hazard.vx;
      hazard.y += hazard.vy;
      hazard.life--;
      if (hazard.armTimer > 0) hazard.armTimer--;
      if (hazard.armTimer <= 0 && hazard.realm === state.playerRealm
        && bodiesOverlap(playerBody, collisionBodyFor("mine", hazard.x, hazard.y, hazard.angle))) {
        damageCanonicalPlayer(state, hazard.damage);
        continue;
      }
      if (hazard.life > 0) survivors.push(hazard);
      continue;
    }
    if (hazard.kind === "enemy_beam") {
      hazard.active--;
      if (hazard.realm === state.playerRealm && hazard.active >= 0) {
        const dx = state.player.x - hazard.x;
        const dy = state.player.y - hazard.y;
        const directionX = canonicalCosForAngle(hazard.angle);
        const directionY = sinForAngle(hazard.angle);
        const projection = roundDivide(dx * directionX + dy * directionY, TRIG_UNITS);
        const perpendicular = Math.abs(roundDivide(dx * directionY - dy * directionX, TRIG_UNITS));
        if (projection >= 0 && projection <= GAME_HEIGHT_UNITS
          && perpendicular <= hazard.width + 7 * POSITION_UNITS_PER_PIXEL) {
          damageCanonicalPlayer(state, hazard.damage);
        }
      }
      if (hazard.active > 0) survivors.push(hazard);
      continue;
    }
    survivors.push(hazard);
  }
  state.hazards = survivors;
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
  updateCanonicalHazards(state);
}

function noteCanonicalKill(state, enemy) {
  state.comboKills++;
  state.multiplier = Math.max(1, Math.min(4, 1 + Math.floor(state.comboKills / 7)));
  state.score += enemy.score * state.multiplier;
  state.stats.kills++;
  state.stats.highestCombo = Math.max(state.stats.highestCombo, state.comboKills);
}

function resolveCanonicalProjectileHits(state) {
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
      deadProjectiles.add(projectile.id);
      if (enemy.shieldedBy && enemy.type !== "shieldbearer" && enemy.shieldCooldown <= 0) {
        enemy.shieldCooldown = 62;
        break;
      }
      enemy.hp -= projectile.damage;
      if (enemy.hp <= 0) {
        deadEnemies.add(enemy.id);
        destroyedEnemies.push(enemy);
        noteCanonicalKill(state, enemy);
      }
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
    player.hp = Math.max(0, player.hp - 1);
    state.stats.damageTaken++;
    player.invulnerability = 90;
    if (player.hp === 0) {
      state.terminal = true;
      state.terminalReason = "player_destroyed";
    }
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
    if (!bodiesOverlap(playerBody, collisionBodyFor(collisionKey, projectile.x, projectile.y, projectile.angle))) continue;
    if (projectile.kind === "drainShot") {
      consumed.add(projectile.id);
      player.energy = Math.max(0, player.energy - projectile.drain);
    } else if (player.invulnerability <= 0 && player.ghostTimer <= 0) {
      consumed.add(projectile.id);
      damageCanonicalPlayer(state, projectile.damage);
    } else continue;
    break;
  }
  state.enemyProjectiles = state.enemyProjectiles.filter((projectile) => !consumed.has(projectile.id));
}

function stepSimulation(state, rawInput, streams) {
  if (!state || state.schema !== "SSR_SIM_STATE_V1") throw new TypeError("Canonical simulation state is invalid.");
  if (state.terminal) throw new Error("Canonical simulation is already terminal.");
  const input = validateCanonicalInput(rawInput);
  state.tick++;
  applyPauseEdge(state, input);
  if (!state.terminal) {
    applyGhostShift(state, input);
    updateCanonicalPlayer(state, input);
    fireCanonicalPlayer(state);
    updateCanonicalEntities(state, streams);
    resolveCanonicalProjectileHits(state);
    resolveCanonicalPlayerContact(state);
    if (!state.terminal) resolveCanonicalEnemyProjectileHits(state);
    if (!state.terminal && streams) materializeCanonicalSpawns(state, tickCanonicalDirector(state, streams), streams);
  }
  if (!state.terminal && state.tick >= state.maxTicks) {
    state.terminal = true;
    state.terminalReason = "tick_limit";
  }
  return state;
}

return Object.freeze({
  roundDivide,
  spawnCanonicalEnemy,
  stepSimulation,
  validateCanonicalInput
});
});
