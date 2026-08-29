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

function clampInteger(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

function roundIntegerRatio(numerator, denominator) {
  if (!Number.isSafeInteger(numerator) || !Number.isSafeInteger(denominator) || denominator <= 0) {
    throw new TypeError("Canonical pacing division requires safe integers.");
  }
  return numerator < 0
    ? -Math.floor((-numerator + Math.floor(denominator / 2)) / denominator)
    : Math.floor((numerator + Math.floor(denominator / 2)) / denominator);
}

function canonicalPacingUint32(streams) {
  if (!streams || typeof streams.nextUint32 !== "function") {
    throw new TypeError("Canonical adaptive pacing requires named random streams.");
  }
  const value = Number(streams.nextUint32("pacing"));
  if (!Number.isSafeInteger(value) || value < 0 || value > 0xffffffff) {
    throw new TypeError("Canonical pacing randomness must be unsigned 32-bit data.");
  }
  return value;
}

function canonicalPacingRange(streams, minimum, maximumExclusive) {
  const width = maximumExclusive - minimum;
  if (!Number.isSafeInteger(minimum) || !Number.isSafeInteger(maximumExclusive) || width <= 0) {
    throw new TypeError("Canonical pacing range is invalid.");
  }
  return minimum + Math.floor(canonicalPacingUint32(streams) * width / 0x100000000);
}

function canonicalPacingChance(streams, chanceMillionths) {
  const chance = clampInteger(chanceMillionths, 0, 1_000_000);
  const threshold = Math.floor(chance * 0x100000000 / 1_000_000);
  return canonicalPacingUint32(streams) < threshold;
}

function canonicalOpeningRampThousandths(state) {
  return clampInteger(Math.floor(state.tick * 1000 / 7200), 0, 1000);
}

function canonicalPhaseArcThousandths(state) {
  const duration = canonicalPhaseDuration(state.phase);
  const position = clampInteger(Math.floor(state.director.phaseTick * 4000 / duration), 0, 4000);
  if (position < 1000) return -1000 + position;
  if (position < 2000) return position - 1000;
  if (position < 3000) return 3000 - position;
  return -(position - 3000);
}

function canonicalRhythmProfile(state) {
  const beat = state.director.waveTick % 240;
  const calm = 1000 - canonicalOpeningRampThousandths(state);
  if (beat < 45) return { pressureHundredths: -700, interval: 18 };
  if (beat < 135) return {
    pressureHundredths: 1000 - roundIntegerRatio(calm * 800, 1000),
    interval: -12 + roundIntegerRatio(calm * 20, 1000)
  };
  if (beat < 170) return { pressureHundredths: -400, interval: 10 };
  return {
    pressureHundredths: 1200 - roundIntegerRatio(calm * 900, 1000),
    interval: -16 + roundIntegerRatio(calm * 22, 1000)
  };
}

function updateCanonicalIntensity(state, streams) {
  const pacing = state.director;
  if (state.boss) {
    pacing.intensity = "normal";
    pacing.intensityTimer = Math.max(pacing.intensityTimer, 120);
    return;
  }
  if (state.tick < 5400 || state.phase <= 2) {
    pacing.intensity = "cooldown";
    pacing.intensityTimer = Math.max(pacing.intensityTimer, 120);
    return;
  }
  const sinceHit = state.tick - pacing.lastHitTick;
  const strong = sinceHit > 720 && pacing.killStreak >= 5 && state.phase >= 3;
  const fragile = state.player.hp <= 2 || pacing.pressureHundredths > 7400;
  pacing.intensityTimer--;
  if (pacing.intensityTimer <= 0) {
    if (pacing.intensity === "normal") {
      pacing.intensity = strong
        ? "surge"
        : fragile
          ? "cooldown"
          : canonicalPacingChance(streams, 600_000) ? "surge" : "cooldown";
      pacing.intensityTimer = pacing.intensity === "surge"
        ? canonicalPacingRange(streams, 300, 420)
        : canonicalPacingRange(streams, 170, 260);
    } else if (pacing.intensity === "surge") {
      pacing.intensity = "cooldown";
      pacing.intensityTimer = canonicalPacingRange(streams, 180, 280);
    } else {
      pacing.intensity = "normal";
      pacing.intensityTimer = canonicalPacingRange(streams, 170, 290);
    }
  }
  if (pacing.intensity === "normal") {
    if (strong && canonicalPacingChance(streams, 10_000)) {
      pacing.intensity = "surge";
      pacing.intensityTimer = canonicalPacingRange(streams, 260, 360);
    } else if (fragile && canonicalPacingChance(streams, 8_000)) {
      pacing.intensity = "cooldown";
      pacing.intensityTimer = canonicalPacingRange(streams, 180, 260);
    }
  }
}

function updateCanonicalPressure(state) {
  const pacing = state.director;
  const rhythm = canonicalRhythmProfile(state);
  const enemyLoad = state.enemies.length * 350;
  const bulletLoad = state.enemyProjectiles.length * 210;
  const queueLoad = state.pendingSpawns.length * 120;
  const comboLoad = clampInteger(Math.max(0, state.comboKills - 5) * 16, 0, 800);
  const bossLoad = state.boss ? 1200 : 0;
  const relief = (5 - state.player.hp) * 800 + (pacing.grace > 0 ? 1000 : 0) + (pacing.ghostGrace > 0 ? 400 : 0);
  const intensityBias = pacing.intensity === "surge" ? 900 : pacing.intensity === "cooldown" ? -800 : 0;
  const base = 1000 + roundIntegerRatio(canonicalOpeningRampThousandths(state) * 800, 1000) + state.phase * 340;
  const target = clampInteger(base + enemyLoad + bulletLoad + queueLoad + comboLoad + bossLoad - relief + rhythm.pressureHundredths + intensityBias, 0, 10_000);
  pacing.pressureHundredths += roundIntegerRatio((target - pacing.pressureHundredths) * 4, 100);
}

function updateCanonicalPacingMemory(state) {
  const pacing = state.director;
  const sinceHit = state.tick - pacing.lastHitTick;
  if (state.boss) {
    pacing.pacingMemoryThousandths = roundIntegerRatio(pacing.pacingMemoryThousandths * 994, 1000);
  } else {
    const comfortable = sinceHit > 840 && state.player.hp === state.player.maxHp && pacing.pressureHundredths < 4800;
    const stressed = state.player.hp <= 2 || pacing.pressureHundredths > 7200 || pacing.grace > 0 || pacing.ghostGrace > 0;
    if (comfortable) pacing.pacingMemoryThousandths = clampInteger(pacing.pacingMemoryThousandths + 6, -1000, 1000);
    else if (stressed) pacing.pacingMemoryThousandths = clampInteger(pacing.pacingMemoryThousandths - 8, -1000, 1000);
    else pacing.pacingMemoryThousandths = roundIntegerRatio(pacing.pacingMemoryThousandths * 996, 1000);
  }
  if (state.tick > 0 && state.tick % 240 === 0) {
    pacing.shotsFired = Math.floor(pacing.shotsFired * 72 / 100);
    pacing.shotsHit = Math.floor(pacing.shotsHit * 72 / 100);
  }
}

function updateCanonicalMood(state, streams) {
  const pacing = state.director;
  if (state.boss) {
    pacing.mood = "boss";
    pacing.moodTimer = 0;
    return;
  }
  if (pacing.moodTimer > 0) {
    pacing.moodTimer--;
    if (pacing.moodTimer > 24) return;
  }
  const sinceHit = state.tick - pacing.lastHitTick;
  const arc = canonicalPhaseArcThousandths(state);
  const early = state.phase <= 2;
  const recoveryNeed = state.player.hp <= 2 || pacing.pressureHundredths > 7200
    || pacing.grace > 0 || pacing.ghostGrace > 0 || pacing.pacingMemoryThousandths < -350;
  let next;
  if (state.phase === 1) {
    next = recoveryNeed || arc < -150 || canonicalPacingChance(streams, 550_000) ? "open" : "recovery";
  } else if (early) {
    if (recoveryNeed || arc < -200) next = "open";
    else if (state.director.phaseTick > 900 && arc > 520 && canonicalOpeningRampThousandths(state) > 350) {
      next = canonicalPacingChance(streams, 400_000) ? "spike" : "open";
    } else next = canonicalPacingChance(streams, 700_000) ? "open" : "recovery";
  } else if (recoveryNeed) {
    next = canonicalPacingChance(streams, 720_000) ? "recovery" : "open";
  } else if (arc > 480 || pacing.intensity === "surge") {
    if (canonicalPacingChance(streams, 660_000)) next = "spike";
    else next = state.phase >= 5 && canonicalPacingChance(streams, 400_000) ? "rule" : "open";
  } else if (arc < -380) {
    next = canonicalPacingChance(streams, 660_000) ? "open" : "recovery";
  } else if (sinceHit > 840 && state.player.hp === state.player.maxHp && pacing.pressureHundredths < 4800) {
    next = canonicalPacingChance(streams, 550_000) ? "spike" : "rule";
  } else if (pacing.pacingMemoryThousandths > 350) {
    next = canonicalPacingChance(streams, 600_000) ? "spike" : "rule";
  } else if (pacing.pacingMemoryThousandths < -250) {
    next = canonicalPacingChance(streams, 580_000) ? "recovery" : "open";
  } else {
    const roll = canonicalPacingRange(streams, 0, 100);
    next = roll < 40 ? "open" : roll < 68 ? "spike" : roll < 86 ? "recovery" : "rule";
  }
  pacing.mood = next;
  pacing.moodTimer = next === "spike"
    ? canonicalPacingRange(streams, 84, 126)
    : next === "recovery"
      ? canonicalPacingRange(streams, 116, 176)
      : next === "rule"
        ? canonicalPacingRange(streams, 92, 146)
        : canonicalPacingRange(streams, 100, 150);
}

function updateCanonicalThreat(state) {
  const pacing = state.director;
  const sinceHit = state.tick - pacing.lastHitTick;
  if (sinceHit > 600) pacing.heatStreak = false;
  if (state.boss) {
    const lerp = state.player.hp === 1 ? 60 : state.player.hp === state.player.maxHp && pacing.killStreak > 0 ? 30 : 25;
    pacing.threatThousandths += roundIntegerRatio((pacing.threatTargetThousandths - pacing.threatThousandths) * lerp, 1000);
  } else {
    let target;
    if (state.phase <= 3) {
      target = 520 + roundIntegerRatio(canonicalOpeningRampThousandths(state) * 170, 1000) + (state.phase - 1) * 45;
      const phaseProgress = clampInteger(Math.floor(state.director.phaseTick * 1000 / canonicalPhaseDuration(state.phase)), 0, 1000);
      target += roundIntegerRatio(phaseProgress * 50, 1000);
    } else {
      target = 780 + (state.phase - 4) * 75;
      target += clampInteger(roundIntegerRatio((state.director.phaseTick - 180) * 1000, 2400), 0, 140);
    }
    target -= (state.player.maxHp - state.player.hp) * 50;
    if (state.player.hp === 1) target -= 40;
    if (pacing.grace > 0) target -= 100;
    if (pacing.ghostGrace > 0) target -= 70;
    if (pacing.heatStreak) target -= 120;
    const accuracy = pacing.shotsFired > 0 ? Math.floor(pacing.shotsHit * 1000 / pacing.shotsFired) : 500;
    target += clampInteger(roundIntegerRatio((accuracy - 380) * 160, 1000), 0, 100);
    target += sinceHit > 900 ? 100 : clampInteger(roundIntegerRatio(pacing.killStreak * 5, 2), 0, 80);
    if (pacing.pacingMemoryThousandths > 450) target += 80;
    else if (pacing.pacingMemoryThousandths < -450) target -= 60;
    target += roundIntegerRatio(canonicalPhaseArcThousandths(state) * 50, 1000);
    target -= roundIntegerRatio(clampInteger(pacing.burstHundredths, 0, 300) * 3, 10);
    target += roundIntegerRatio(pacing.pressureHundredths - 5000, 20);
    if (state.enemies.some((enemy) => enemy.type === "phantom")) target -= 60;
    if (pacing.mood === "open") target -= 20;
    else if (pacing.mood === "recovery") target -= 80;
    else if (pacing.mood === "spike") target += 30;
    else if (pacing.mood === "rule") target += 10;
    if (pacing.intensity === "surge") target += 60;
    else if (pacing.intensity === "cooldown") target -= 50;
    pacing.threatTargetThousandths = clampInteger(target, 500, 1450);
    let lerp = 25;
    if (state.player.hp === 1) lerp = 60;
    else if (state.player.hp === state.player.maxHp && (pacing.killStreak > 0 || pacing.pacingMemoryThousandths > 250 || accuracy > 600)) lerp = 30;
    else if (pacing.pressureHundredths > 7000 || pacing.pacingMemoryThousandths < -350) lerp = 40;
    pacing.threatThousandths += roundIntegerRatio((pacing.threatTargetThousandths - pacing.threatThousandths) * lerp, 1000);
    pacing.threatThousandths = clampInteger(pacing.threatThousandths, 500, 1450);
  }
  if (pacing.grace > 0) pacing.grace--;
  if (pacing.ghostGrace > 0) pacing.ghostGrace--;
  pacing.burstHundredths = Math.max(0, pacing.burstHundredths - 3);
  if (state.tick % 180 === 0) pacing.killStreak = Math.max(0, pacing.killStreak - 1);
}

function tickCanonicalPacing(state, streams) {
  validateDirectorState(state);
  updateCanonicalIntensity(state, streams);
  updateCanonicalPressure(state);
  updateCanonicalPacingMemory(state);
  updateCanonicalMood(state, streams);
  updateCanonicalThreat(state);
  return state.director;
}

function canonicalAdaptiveWaveInterval(state) {
  validateDirectorState(state);
  const pacing = state.director;
  const base = canonicalBaseWaveInterval(state.phase, pacing.phaseTick);
  if (state.phase <= 2) return base;
  let factorMillionths = 1_000_000;
  if (pacing.mood === "spike") factorMillionths = Math.floor(factorMillionths * 82 / 100);
  else if (pacing.mood === "recovery") factorMillionths = Math.floor(factorMillionths * 122 / 100);
  else if (pacing.mood === "rule") factorMillionths = Math.floor(factorMillionths * 92 / 100);
  if (pacing.pacingMemoryThousandths > 450) factorMillionths = Math.floor(factorMillionths * 90 / 100);
  else if (pacing.pacingMemoryThousandths < -350) factorMillionths = Math.floor(factorMillionths * 108 / 100);
  if (pacing.intensity === "surge") factorMillionths = Math.floor(factorMillionths * 78 / 100);
  else if (pacing.intensity === "cooldown") factorMillionths = Math.floor(factorMillionths * 118 / 100);
  let interval = roundIntegerRatio((base + canonicalRhythmProfile(state).interval) * factorMillionths, 1_000_000);
  if (pacing.grace > 0) interval += 10;
  if (pacing.ghostGrace > 0) interval += 8;
  if (state.player.hp <= 2) interval += 16;
  if (state.player.hp === 1) interval += 18;
  if (pacing.waveRest > 0) interval += Math.floor(pacing.waveRest / 2);
  interval += roundIntegerRatio((pacing.pressureHundredths - 5000) * 8, 10_000);
  interval = roundIntegerRatio(interval * 1000, clampInteger(pacing.threatThousandths, 550, 1250));
  return Math.max(24, interval);
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

  const interval = canonicalAdaptiveWaveInterval(state);
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
  canonicalAdaptiveWaveInterval,
  canonicalBaseWaveInterval,
  canonicalPhaseDuration,
  canonicalWavePool,
  canonicalWaveTemplate,
  tickCanonicalDirector,
  tickCanonicalPacing
});
});
