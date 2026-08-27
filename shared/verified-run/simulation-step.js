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
  const geometry = typeof module === "object" && module.exports ? require("./geometry") : root;
  const api = factory(constants, inputTape, content, director, geometry);
  if (typeof module === "object" && module.exports) module.exports = api;
  Object.assign(root, api);
})(globalThis, function buildVerifiedRunSimulationStep(constants, inputTape, content, director, geometry) {

if (!constants || !inputTape || !content || !director || !geometry) throw new Error("Verified run primitives must load before simulation step.");

const {
  ENERGY_UNITS_PER_POINT,
  GAME_HEIGHT_UNITS,
  GAME_WIDTH_UNITS,
  POSITION_UNITS_PER_PIXEL
} = constants;
const { BUTTON_GHOST_SHIFT, BUTTON_PAUSE } = inputTape;
const { AUTHORITATIVE_ENEMY_ARCHETYPES } = content;
const { tickCanonicalDirector } = director;
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

function spawnCanonicalEnemy(state, type, x, y, options = {}) {
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
    lane: canonicalEntityInteger(options.lane ?? -1, "Enemy lane")
  };
  state.enemies.push(enemy);
  return enemy;
}

function canonicalEntityInteger(value, label) {
  const number = Number(value);
  if (!Number.isSafeInteger(number)) throw new TypeError(`${label} must be a safe integer.`);
  return number;
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

function materializeCanonicalSpawns(state, descriptors) {
  for (const descriptor of descriptors) {
    spawnCanonicalEnemy(state, descriptor.type, descriptor.x, descriptor.y, {
      vy: canonicalEnemyVelocityY(descriptor.type, state.phase),
      motion: descriptor.motion,
      lane: descriptor.lane
    });
  }
}

function updateCanonicalEntities(state) {
  for (const enemy of state.enemies) {
    enemy.x += enemy.vx;
    enemy.y += enemy.vy;
    enemy.motionTick++;
  }
  for (const projectile of state.playerProjectiles) {
    projectile.x += projectile.vx;
    projectile.y += projectile.vy;
    projectile.life--;
  }
  state.playerProjectiles = state.playerProjectiles.filter((projectile) => (
    projectile.life > 0 && projectile.y > -40 * POSITION_UNITS_PER_PIXEL
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
    updateCanonicalEntities(state);
    resolveCanonicalProjectileHits(state);
    resolveCanonicalPlayerContact(state);
    if (!state.terminal && streams) materializeCanonicalSpawns(state, tickCanonicalDirector(state, streams));
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
