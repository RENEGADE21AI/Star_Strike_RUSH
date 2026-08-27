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

function spawnDescriptor(type, lane, yPixels, delay, motion = "drift", offsetPixels = 0) {
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

function staggerMix() {
  return [
    spawnDescriptor("red", 0, -28, 0),
    spawnDescriptor("orange", 1, -40, 8, "zigzag", -34),
    spawnDescriptor("red", 1, -52, 16),
    spawnDescriptor("orange", 2, -40, 24, "burst", 34),
    spawnDescriptor("red", 2, -28, 32)
  ];
}

function orangeRibbon(state) {
  const flip = state.director.waveIndex % 2 === 0 ? 1 : -1;
  return [
    spawnDescriptor("orange", 1, -28, 0, "zigzag", -110 * flip),
    spawnDescriptor("orange", 0, -44, 8, "snap", 20 * flip),
    spawnDescriptor("orange", 1, -58, 16, "burst"),
    spawnDescriptor("orange", 2, -44, 24, "zigzag", -18 * flip),
    spawnDescriptor("orange", 1, -30, 32, "snap", 120 * flip)
  ];
}

function purpleGuard() {
  return [
    spawnDescriptor("purple", 0, -30, 0, "drift", -66),
    spawnDescriptor("red", 0, -48, 8, "drift", 4),
    spawnDescriptor("orange", 1, -58, 16, "burst", -22),
    spawnDescriptor("red", 2, -48, 24, "drift", -4),
    spawnDescriptor("purple", 2, -30, 32, "drift", 66),
    spawnDescriptor("red", 1, -72, 40)
  ];
}

function splitAmbush() {
  return [
    spawnDescriptor("orange", 0, -30, 0, "snap", -100),
    spawnDescriptor("red", 1, -44, 8),
    spawnDescriptor("purple", 1, -66, 16),
    spawnDescriptor("red", 1, -44, 24, "drift", 56),
    spawnDescriptor("orange", 2, -30, 32, "burst", 100)
  ];
}

function orangeChain() {
  return [
    spawnDescriptor("orange", 0, -32, 0, "chain", -110),
    spawnDescriptor("orange", 0, -42, 8, "chain", -56),
    spawnDescriptor("orange", 1, -52, 16, "chain"),
    spawnDescriptor("orange", 2, -42, 24, "chain", 56),
    spawnDescriptor("orange", 2, -32, 32, "chain", 110)
  ];
}

function orangeSlash() {
  return [
    spawnDescriptor("orange", 0, -28, 0, "sweep", -40),
    spawnDescriptor("orange", 1, -44, 10, "sweep", 16),
    spawnDescriptor("orange", 2, -58, 20, "sweep", -20),
    spawnDescriptor("orange", 2, -36, 30, "sweep", 76)
  ];
}

function canonicalWaveRandomPixels(streams, minimum, maximum) {
  validateStreams(streams);
  const value = Number(streams.nextUint32("waves"));
  if (!Number.isSafeInteger(value) || value < 0 || value > 0xffffffff) {
    throw new TypeError("Canonical wave randomness must be unsigned 32-bit data.");
  }
  return minimum + Math.floor(value * (maximum - minimum + 1) / 0x100000000);
}

function phantomProbe(state, streams) {
  return [
    spawnDescriptor("phantom", 1, -46, 0, "phantom", canonicalWaveRandomPixels(streams, -16, 16)),
    spawnDescriptor("phantom", 0, -62, 12, "phantom", canonicalWaveRandomPixels(streams, -12, 12)),
    spawnDescriptor("phantom", 2, -62, 24, "phantom", canonicalWaveRandomPixels(streams, -12, 12))
  ];
}

function phantomPair(state, streams) {
  return [
    spawnDescriptor("phantom", 0, -48, 0, "phantom", canonicalWaveRandomPixels(streams, -8, 8)),
    spawnDescriptor("phantom", 2, -48, 18, "phantom", canonicalWaveRandomPixels(streams, -8, 8)),
    spawnDescriptor("phantom", 1, -70, 30, "phantom", canonicalWaveRandomPixels(streams, -8, 8))
  ];
}

function phantomFan() {
  return [
    spawnDescriptor("phantom", 1, -54, 0, "phantom"),
    spawnDescriptor("phantom", 0, -58, 12, "phantom", -24),
    spawnDescriptor("phantom", 2, -58, 24, "phantom", 24)
  ];
}

function splitterPair() {
  return [spawnDescriptor("red", 0, -28, 0), spawnDescriptor("splitter", 1, -52, 16), spawnDescriptor("red", 2, -28, 32)];
}

function mineLane() {
  return [spawnDescriptor("minecaster", 0, -40, 0), spawnDescriptor("orange", 1, -54, 18, "sweep"), spawnDescriptor("red", 2, -30, 34)];
}

function siphonEscort() {
  return [spawnDescriptor("red", 0, -28, 0), spawnDescriptor("siphon", 1, -54, 14), spawnDescriptor("orange", 2, -34, 30, "burst")];
}

function supportCell() {
  return [spawnDescriptor("shieldbearer", 1, -58, 0), spawnDescriptor("red", 0, -34, 12), spawnDescriptor("purple", 2, -38, 24)];
}

function carrierPriority() {
  return [spawnDescriptor("carrier", 1, -62, 0), spawnDescriptor("orange", 0, -28, 22, "snap"), spawnDescriptor("red", 2, -26, 34)];
}

function leechPressure(state, streams) {
  return [
    spawnDescriptor("leech", 1, -58, 0, "drift", canonicalWaveRandomPixels(streams, -22, 22)),
    spawnDescriptor("red", 0, -32, 20),
    spawnDescriptor("orange", 2, -38, 34, "zigzag")
  ];
}

function railWarning() {
  return [spawnDescriptor("railgunner", 1, -58, 0), spawnDescriptor("red", 0, -30, 18), spawnDescriptor("red", 2, -30, 30)];
}

function repairGuard() {
  return [spawnDescriptor("purple", 1, -52, 0), spawnDescriptor("repair_drone", 0, -36, 16), spawnDescriptor("red", 2, -28, 30)];
}

const CANONICAL_WAVE_TEMPLATES = Object.freeze({
  breather: openingBreather,
  carrierPriority,
  leechPressure,
  mineLane,
  mixedChevron,
  orangeChain,
  orangePair,
  orangeRibbon,
  orangeSlash,
  phantomFan,
  phantomPair,
  phantomProbe,
  purpleGuard,
  railWarning,
  redV,
  redWall,
  repairGuard,
  siphonEscort,
  splitAmbush,
  splitterPair,
  staggerMix,
  supportCell
});

function canonicalWavePool(state) {
  if (state.phase === 1) {
    return state.director.phaseTick > canonicalPhaseDuration(1) * 55 / 100
      ? [["breather", 7], ["redV", 4], ["redWall", 1]]
      : [["breather", 8], ["redV", 2]];
  }
  const mood = state.director.mood || "open";
  const phaseTier = state.phase < 4 ? "early" : state.phase < 9 ? "mid" : "late";
  let pool;
  if (mood === "recovery") {
    pool = phaseTier === "early"
      ? [["breather", 6], ["redV", 3], ["orangePair", 4], ["staggerMix", 2]]
      : phaseTier === "mid"
        ? [["breather", 4], ["redV", 3], ["orangePair", 4], ["staggerMix", 3], ["mixedChevron", 2]]
        : [["breather", 3], ["redV", 2], ["orangePair", 3], ["staggerMix", 2], ["mixedChevron", 2], ["orangeSlash", 1]];
  } else if (mood === "spike") {
    pool = phaseTier === "early"
      ? [["redWall", 4], ["staggerMix", 3], ["mixedChevron", 3], ["orangeChain", 2]]
      : phaseTier === "mid"
        ? [["redWall", 4], ["mixedChevron", 3], ["orangeRibbon", 2], ["purpleGuard", 3], ["splitAmbush", 3], ["orangeSlash", 2]]
        : [["redWall", 3], ["orangeRibbon", 3], ["purpleGuard", 4], ["splitAmbush", 4], ["orangeChain", 2], ["orangeSlash", 3]];
  } else if (mood === "rule") {
    if (state.phase >= 5) {
      pool = phaseTier === "early"
        ? [["phantomProbe", 5], ["phantomPair", 4], ["breather", 2], ["mixedChevron", 2]]
        : phaseTier === "mid"
          ? [["phantomProbe", 4], ["phantomPair", 4], ["phantomFan", 3], ["mixedChevron", 2], ["purpleGuard", 2]]
          : [["phantomProbe", 3], ["phantomPair", 4], ["phantomFan", 4], ["purpleGuard", 2], ["splitAmbush", 2]];
    } else {
      pool = phaseTier === "early"
        ? [["mixedChevron", 4], ["orangePair", 4], ["staggerMix", 3], ["redV", 2]]
        : phaseTier === "mid"
          ? [["purpleGuard", 4], ["splitAmbush", 3], ["orangeChain", 3], ["mixedChevron", 2]]
          : [["purpleGuard", 4], ["splitAmbush", 4], ["orangeRibbon", 3], ["orangeSlash", 2]];
    }
  } else {
    pool = phaseTier === "early"
      ? [["breather", 5], ["redV", 4], ["orangePair", 4], ["mixedChevron", 2]]
      : phaseTier === "mid"
        ? [["staggerMix", 4], ["orangePair", 4], ["mixedChevron", 4], ["orangeChain", 2], ["purpleGuard", 1]]
        : [["orangeRibbon", 3], ["purpleGuard", 3], ["splitAmbush", 3], ["orangeChain", 3], ["orangeSlash", 2], ["mixedChevron", 2]];
    if (state.phase >= 5) pool.push(["phantomProbe", 1], ["phantomPair", 1], ["phantomFan", 1]);
  }
  if (state.phase >= 3) pool.push(["splitterPair", mood === "spike" ? 3 : 1]);
  if (state.phase >= 4 && mood !== "recovery") pool.push(["mineLane", mood === "rule" ? 2 : 1]);
  if (state.phase >= 5) pool.push(["siphonEscort", mood === "rule" ? 3 : 1]);
  if (state.phase >= 5 && mood !== "recovery") pool.push(["supportCell", 1]);
  if (state.phase >= 6 && mood === "spike") pool.push(["carrierPriority", 2]);
  if (state.phase >= 6 && mood === "rule") pool.push(["leechPressure", 2]);
  if (state.phase >= 7 && mood !== "recovery") pool.push(["railWarning", 1]);
  if (state.phase >= 6 && mood !== "open") pool.push(["repairGuard", 1]);
  return pool;
}

function canonicalWaveTemplate(name, state, streams) {
  if (!state || state.schema !== "SSR_SIM_STATE_V1") throw new TypeError("Canonical wave template requires simulation state.");
  const template = CANONICAL_WAVE_TEMPLATES[String(name || "")];
  if (!template) throw new RangeError(`Unknown canonical wave template: ${name}`);
  return template(state, streams);
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
  const entries = canonicalWaveTemplate(template, state, streams);
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
  canonicalWavePool,
  canonicalWaveTemplate,
  tickCanonicalDirector
});
});
