"use strict";

(function initializeVerifiedRunDirector(root, factory) {
  const constants = typeof module === "object" && module.exports
    ? require("./constants")
    : root.StarStrikeVerifiedRunConstants;
  const api = factory(constants);
  if (typeof module === "object" && module.exports) module.exports = api;
  Object.assign(root, api);
})(globalThis, function buildVerifiedRunDirector(constants) {

if (!constants) throw new Error("Verified run constants must load before the canonical director.");

const {
  GAME_WIDTH_UNITS,
  POSITION_UNITS_PER_PIXEL
} = constants;

function canonicalPhaseDuration(phase) {
  const value = Number(phase);
  if (!Number.isSafeInteger(value) || value < 1) throw new RangeError("Canonical phase must be a positive integer.");
  if (value === 1) return 3000;
  if (value === 2) return 3300;
  if (value === 3) return 3000;
  return Math.max(580, 940 - (value - 4) * 20);
}

function canonicalBaseWaveInterval(phase, phaseTick) {
  if (phase === 1) return phaseTick < 1000 ? 180 : phaseTick < 2100 ? 156 : 136;
  if (phase === 2) return phaseTick < 1300 ? 156 : 132;
  if (phase === 3) return 118;
  return Math.max(38, Math.round(88 - phase * 3.5));
}

function laneX(lane) {
  const numerators = [22, 50, 78];
  return Math.round(GAME_WIDTH_UNITS * numerators[lane] / 100);
}

function spawnDescriptor(type, lane, yPixels, delay, motion, offsetPixels = 0) {
  return {
    type,
    x: laneX(lane) + offsetPixels * POSITION_UNITS_PER_PIXEL,
    y: yPixels * POSITION_UNITS_PER_PIXEL,
    delay,
    motion,
    lane
  };
}

function openingBreather() {
  return [
    spawnDescriptor("red", 0, -28, 0, "drift"),
    spawnDescriptor("red", 1, -38, 12, "drift"),
    spawnDescriptor("red", 2, -28, 24, "drift")
  ];
}

function redV() {
  return [
    spawnDescriptor("red", 0, -26, 0, "drift", -12),
    spawnDescriptor("red", 0, -40, 8, "drift", 52),
    spawnDescriptor("red", 1, -52, 16, "drift"),
    spawnDescriptor("red", 2, -40, 24, "drift", -52),
    spawnDescriptor("red", 2, -26, 32, "drift", 12)
  ];
}

function redWall() {
  return [
    spawnDescriptor("red", 0, -30, 0, "drift", -28),
    spawnDescriptor("red", 0, -30, 8, "drift", 22),
    spawnDescriptor("red", 1, -42, 16, "drift"),
    spawnDescriptor("red", 1, -30, 24, "drift", 44),
    spawnDescriptor("red", 2, -30, 32, "drift", -22),
    spawnDescriptor("red", 2, -30, 40, "drift", 28)
  ];
}

function orangePair() {
  return [
    spawnDescriptor("orange", 0, -32, 0, "zigzag", -14),
    spawnDescriptor("red", 1, -44, 10, "drift"),
    spawnDescriptor("red", 1, -28, 20, "drift", -52),
    spawnDescriptor("orange", 2, -32, 30, "snap", 14)
  ];
}

function mixedChevron() {
  return [
    spawnDescriptor("red", 0, -30, 0, "drift"),
    spawnDescriptor("orange", 0, -44, 8, "zigzag", 58),
    spawnDescriptor("red", 1, -54, 16, "drift"),
    spawnDescriptor("orange", 2, -44, 24, "burst", -58),
    spawnDescriptor("red", 2, -30, 32, "drift")
  ];
}

const CANONICAL_WAVE_TEMPLATES = Object.freeze({
  breather: openingBreather,
  mixedChevron,
  orangePair,
  redV,
  redWall
});

function canonicalWavePool(state) {
  if (state.phase === 1) {
    return state.director.phaseTick > canonicalPhaseDuration(1) * 55 / 100
      ? [["breather", 7], ["redV", 4], ["redWall", 1]]
      : [["breather", 8], ["redV", 2]];
  }
  return [["breather", 5], ["redV", 4], ["orangePair", 4], ["mixedChevron", 2]];
}

function selectWeightedTemplate(pool, avoidName, streams) {
  const filtered = avoidName ? pool.filter(([name]) => name !== avoidName) : pool.slice();
  const choices = filtered.length > 0 ? filtered : pool.slice();
  const total = choices.reduce((sum, entry) => sum + entry[1], 0);
  let roll = streams.nextUint32("waves") / 0x100000000 * total;
  for (const [name, weight] of choices) {
    roll -= weight;
    if (roll <= 0) return name;
  }
  return choices[choices.length - 1][0];
}

function queueCanonicalWave(state, streams) {
  const director = state.director;
  const template = selectWeightedTemplate(canonicalWavePool(state), director.lastTemplate, streams);
  const entries = CANONICAL_WAVE_TEMPLATES[template]();
  state.pendingSpawns.push(...entries);
  director.waveIndex++;
  director.lastTemplate = template;
}

function validateDirectorState(state) {
  if (!state || state.schema !== "SSR_SIM_STATE_V1" || !state.director || !Array.isArray(state.pendingSpawns)) {
    throw new TypeError("Canonical director requires simulation state.");
  }
}

function validateStreams(streams) {
  if (!streams || typeof streams.nextUint32 !== "function") {
    throw new TypeError("Canonical director requires named random streams.");
  }
}

function tickCanonicalDirector(state, streams) {
  validateDirectorState(state);
  validateStreams(streams);
  const director = state.director;
  const due = [];
  const waiting = [];
  for (const spawn of state.pendingSpawns) {
    const nextDelay = spawn.delay - 1;
    if (nextDelay <= 0) due.push({ ...spawn, delay: 0 });
    else waiting.push({ ...spawn, delay: nextDelay });
  }
  state.pendingSpawns = waiting;

  director.phaseTick++;
  director.waveTick++;
  if (director.waveRest > 0) director.waveRest--;

  if (director.phaseTick >= canonicalPhaseDuration(state.phase)) {
    state.phase++;
    director.phaseTick = 0;
    director.waveTick = 0;
    director.waveRest = 18;
    director.lastTemplate = "";
  }

  const interval = canonicalBaseWaveInterval(state.phase, director.phaseTick);
  if (state.pendingSpawns.length === 0 && director.waveTick >= interval) {
    queueCanonicalWave(state, streams);
    director.waveTick = 0;
    const queued = [];
    for (const spawn of state.pendingSpawns) {
      if (spawn.delay === 0) due.push({ ...spawn });
      else queued.push(spawn);
    }
    state.pendingSpawns = queued;
  }
  return due;
}

return Object.freeze({
  canonicalBaseWaveInterval,
  canonicalPhaseDuration,
  tickCanonicalDirector
});
});
