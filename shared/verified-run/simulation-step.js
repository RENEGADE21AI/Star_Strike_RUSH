"use strict";

(function initializeVerifiedRunSimulationStep(root, factory) {
  const constants = typeof module === "object" && module.exports
    ? require("./constants")
    : root.StarStrikeVerifiedRunConstants;
  const inputTape = typeof module === "object" && module.exports
    ? require("./input-tape")
    : root;
  const api = factory(constants, inputTape);
  if (typeof module === "object" && module.exports) module.exports = api;
  Object.assign(root, api);
})(globalThis, function buildVerifiedRunSimulationStep(constants, inputTape) {

if (!constants || !inputTape) throw new Error("Verified run primitives must load before simulation step.");

const {
  ENERGY_UNITS_PER_POINT,
  GAME_HEIGHT_UNITS,
  GAME_WIDTH_UNITS,
  POSITION_UNITS_PER_PIXEL
} = constants;
const { BUTTON_GHOST_SHIFT, BUTTON_PAUSE } = inputTape;
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

function stepSimulation(state, rawInput) {
  if (!state || state.schema !== "SSR_SIM_STATE_V1") throw new TypeError("Canonical simulation state is invalid.");
  if (state.terminal) throw new Error("Canonical simulation is already terminal.");
  const input = validateCanonicalInput(rawInput);
  state.tick++;
  applyPauseEdge(state, input);
  if (!state.terminal) {
    applyGhostShift(state, input);
    updateCanonicalPlayer(state, input);
  }
  if (!state.terminal && state.tick >= state.maxTicks) {
    state.terminal = true;
    state.terminalReason = "tick_limit";
  }
  return state;
}

return Object.freeze({
  roundDivide,
  stepSimulation,
  validateCanonicalInput
});
});
