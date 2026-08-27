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
    phaseOffset: canonicalEntityInteger(options.phaseOffset ?? 0, "Enemy phase offset")
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

function fireCanonicalEnemyProjectile(state, enemy, kind, speed, originOffsetPixels = 12) {
  const originY = enemy.y + originOffsetPixels * POSITION_UNITS_PER_PIXEL;
  const dx = state.player.x - enemy.x;
  const dy = state.player.y - originY;
  const distance = Math.max(1, Math.trunc(Math.sqrt(dx * dx + dy * dy)));
  state.enemyProjectiles.push({
    id: state.nextEntityId++,
    kind,
    x: enemy.x,
    y: originY,
    vx: roundDivide(dx * speed, distance),
    vy: roundDivide(dy * speed, distance),
    angle: 0,
    life: 180,
    damage: 1,
    realm: enemy.realm
  });
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

function updateCanonicalEntities(state, streams) {
  const existingEnemyProjectileCount = state.enemyProjectiles.length;
  for (const enemy of state.enemies) {
    if (enemy.type === "red" && enemy.driftPower > 0 && streams) {
      if (canonicalRandomUint32(streams, "enemy_behavior") < 51_539_608) enemy.driftDir *= -1;
      enemy.x += roundDivide(sinForAngle(enemy.driftAngle) * enemy.driftPower * enemy.driftDir, TRIG_UNITS);
      enemy.driftAngle = (enemy.driftAngle + 20) % ANGLE_UNITS;
    }
    let verticalMovementHandled = false;
    if (enemy.type === "orange" && streams) {
      updateCanonicalOrange(state, enemy, streams);
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
  for (const projectile of state.playerProjectiles) {
    if (deadProjectiles.has(projectile.id)) continue;
    const projectileBody = collisionBodyFor("player_bullet", projectile.x, projectile.y, projectile.angle);
    for (const enemy of state.enemies) {
      if (deadEnemies.has(enemy.id) || enemy.realm !== projectile.realm) continue;
      if (enemy.type === "phantom" && enemy.telegraphTimer > 0) continue;
      const enemyBody = collisionBodyFor(enemy.type, enemy.x, enemy.y, enemy.angle);
      if (!bodiesOverlap(projectileBody, enemyBody)) continue;
      enemy.hp -= projectile.damage;
      deadProjectiles.add(projectile.id);
      if (enemy.hp <= 0) {
        deadEnemies.add(enemy.id);
        noteCanonicalKill(state, enemy);
      }
      break;
    }
  }
  state.playerProjectiles = state.playerProjectiles.filter((projectile) => !deadProjectiles.has(projectile.id));
  state.enemies = state.enemies.filter((enemy) => !deadEnemies.has(enemy.id));
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
  if (player.invulnerability > 0 || player.ghostTimer > 0) return;
  const playerBody = collisionBodyFor("player", player.x, player.y, player.heading);
  const consumed = new Set();
  for (const projectile of state.enemyProjectiles) {
    if (projectile.realm !== state.playerRealm) continue;
    if (!bodiesOverlap(playerBody, collisionBodyFor("enemy_bullet", projectile.x, projectile.y, projectile.angle))) continue;
    consumed.add(projectile.id);
    player.hp = Math.max(0, player.hp - projectile.damage);
    state.stats.damageTaken += projectile.damage;
    player.invulnerability = 90;
    if (player.hp === 0) {
      state.terminal = true;
      state.terminalReason = "player_destroyed";
    }
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
