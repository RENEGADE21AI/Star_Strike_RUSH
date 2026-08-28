"use strict";

(function initializeVerifiedRunSimulationState(root, factory) {
  const constants = typeof module === "object" && module.exports
    ? require("./constants")
    : root.StarStrikeVerifiedRunConstants;
  const api = factory(constants);
  if (typeof module === "object" && module.exports) module.exports = api;
  Object.assign(root, api);
})(globalThis, function buildVerifiedRunSimulationState(constants) {

if (!constants) throw new Error("Verified run constants must load before simulation state.");

const {
  ENERGY_UNITS_PER_POINT,
  GAME_HEIGHT_UNITS,
  GAME_WIDTH_UNITS,
  MAX_RUN_TICKS,
  POSITION_UNITS_PER_PIXEL,
  SIMULATION_REVISION
} = constants;

const SIMULATION_STATE_SCHEMA = "SSR_SIM_STATE_V1";

function boundedIdentifier(value, label, maximum = 128) {
  const text = String(value || "");
  if (!/^[A-Za-z0-9._-]+$/.test(text) || text.length > maximum) {
    throw new TypeError(`${label} is invalid.`);
  }
  return text;
}

function createSimulationState(ticket) {
  const source = ticket && typeof ticket === "object" ? ticket : {};
  const simRevision = boundedIdentifier(source.simRevision, "Simulation revision", 64);
  if (simRevision !== SIMULATION_REVISION) throw new RangeError("Simulation revision is unsupported.");
  const maxTicks = Number(source.maxTicks);
  if (!Number.isSafeInteger(maxTicks) || maxTicks < 1 || maxTicks > MAX_RUN_TICKS) {
    throw new RangeError("Simulation ticket tick ceiling is invalid.");
  }
  if (!/^[a-f0-9]{32}$/.test(String(source.rootSeed || "").toLowerCase())) {
    throw new TypeError("Simulation ticket root seed is invalid.");
  }
  if (!/^[a-f0-9]{40}$/.test(String(source.buildSha || "").toLowerCase())) {
    throw new TypeError("Simulation ticket build SHA is invalid.");
  }

  const immutableTicket = Object.freeze({
    runId: boundedIdentifier(source.runId, "Run ID"),
    rootSeed: String(source.rootSeed).toLowerCase(),
    simRevision,
    rulesRevision: boundedIdentifier(source.rulesRevision, "Rules revision", 64),
    contentRevision: boundedIdentifier(source.contentRevision, "Content revision", 64),
    buildSha: String(source.buildSha).toLowerCase(),
    maxTicks
  });

  return {
    schema: SIMULATION_STATE_SCHEMA,
    ticket: immutableTicket,
    simRevision,
    tick: 0,
    maxTicks,
    terminal: false,
    terminalReason: "",
    score: 0,
    phase: 1,
    multiplier: 1,
    comboKills: 0,
    playerRealm: 0,
    nextEntityId: 1,
    director: {
      phaseTick: 0,
      waveTick: 0,
      waveIndex: 0,
      waveRest: 0,
      mood: "open",
      moodTimer: 120,
      lastTemplate: "",
      hazardEventTimer: 1200,
      hazardWarningTimer: 0,
      bossRecovery: 0,
      killsSinceDrop: 0,
      ticksSinceDrop: 0,
      dropCooldown: 0,
      intensity: "normal"
    },
    player: {
      x: Math.round(GAME_WIDTH_UNITS / 2),
      y: Math.round(GAME_HEIGHT_UNITS * 8 / 10),
      vx: 0,
      vy: 0,
      heading: 0,
      hp: 5,
      maxHp: 5,
      energy: 100 * ENERGY_UNITS_PER_POINT,
      maxEnergy: 100 * ENERGY_UNITS_PER_POINT,
      invulnerability: 0,
      fireCooldown: 0,
      ghostTimer: 0,
      dashTimer: 0,
      ghostCooldown: 0,
      spread: 0,
      rapid: 0,
      overcharge: 0,
      phaseShield: 0,
      magnet: 0,
      piercing: 0,
      stabilizer: 0,
      scoreSurge: 0,
      maxSpeed: Math.round(5.5 * POSITION_UNITS_PER_PIXEL)
    },
    stats: {
      kills: 0,
      bosses: 0,
      powerups: 0,
      ghostUses: 0,
      dashUses: 0,
      realmHops: 0,
      pauseUses: 0,
      damageTaken: 0,
      highestCombo: 0
    },
    pendingSpawns: [],
    enemies: [],
    playerProjectiles: [],
    enemyProjectiles: [],
    hazards: [],
    powerups: [],
    wingmen: [],
    boss: null
  };
}

function assertCanonicalIntegers(value, path = "state") {
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value)) throw new TypeError(`${path} must be a safe integer.`);
    return;
  }
  if (value === null || typeof value === "string" || typeof value === "boolean") return;
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertCanonicalIntegers(entry, `${path}[${index}]`));
    return;
  }
  if (!value || typeof value !== "object") throw new TypeError(`${path} is not canonical state data.`);
  for (const key of Object.keys(value)) assertCanonicalIntegers(value[key], `${path}.${key}`);
}

function canonicalStateView(state) {
  return {
    schema: state.schema,
    simRevision: state.simRevision,
    ticket: state.ticket,
    tick: state.tick,
    maxTicks: state.maxTicks,
    terminal: state.terminal,
    terminalReason: state.terminalReason,
    score: state.score,
    phase: state.phase,
    multiplier: state.multiplier,
    comboKills: state.comboKills,
    playerRealm: state.playerRealm,
    nextEntityId: state.nextEntityId,
    director: state.director,
    player: state.player,
    stats: state.stats,
    pendingSpawns: state.pendingSpawns,
    enemies: state.enemies,
    playerProjectiles: state.playerProjectiles,
    enemyProjectiles: state.enemyProjectiles,
    hazards: state.hazards,
    powerups: state.powerups,
    wingmen: state.wingmen,
    boss: state.boss
  };
}

function serializeCanonicalState(state) {
  if (!state || state.schema !== SIMULATION_STATE_SCHEMA) throw new TypeError("Simulation state schema is invalid.");
  const view = canonicalStateView(state);
  assertCanonicalIntegers(view);
  return new TextEncoder().encode(JSON.stringify(view));
}

function webCrypto() {
  if (globalThis.crypto && globalThis.crypto.subtle) return globalThis.crypto;
  if (typeof require === "function") return require("node:crypto").webcrypto;
  throw new Error("Web Crypto is required for canonical state hashing.");
}

async function digestCanonicalState(state) {
  const digest = new Uint8Array(await webCrypto().subtle.digest("SHA-256", serializeCanonicalState(state)));
  return Array.from(digest.slice(0, 16), (value) => value.toString(16).padStart(2, "0")).join("");
}

return Object.freeze({
  SIMULATION_STATE_SCHEMA,
  assertCanonicalIntegers,
  createSimulationState,
  digestCanonicalState,
  serializeCanonicalState
});
});
