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

function spawnDescriptor(type, lane, yPixels, delay, motion) {
  return {
    type,
    x: laneX(lane),
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

function openingChevron() {
  return [
    spawnDescriptor("red", 0, -26, 0, "drift"),
    spawnDescriptor("red", 1, -52, 12, "drift"),
    spawnDescriptor("red", 2, -26, 24, "drift")
  ];
}

function queueCanonicalWave(state, streams) {
  const director = state.director;
  const firstWave = director.waveIndex === 0;
  const chooseChevron = !firstWave && (streams.nextUint32("waves") & 1) === 1;
  const template = chooseChevron ? "red_chevron" : "opening_breather";
  const entries = chooseChevron ? openingChevron() : openingBreather();
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
