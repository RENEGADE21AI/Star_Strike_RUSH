"use strict";

let activeRunRandomStreams = null;
let activeVerifiedRunTicket = null;
let activeCanonicalRunRandomStreams = null;
let activeCanonicalRunState = null;
let seededRunStarting = false;
let recordedRunInputs = null;
let pendingRunInputButtons = 0;
let activeCanonicalRunInput = null;

function installRunRandomStreams(streams, ticket = null) {
  if (!streams || typeof streams.nextFloat !== "function" || !Array.isArray(streams.names)) {
    throw new TypeError("Verified run random streams are invalid.");
  }
  activeRunRandomStreams = streams;
  activeVerifiedRunTicket = ticket && typeof ticket === "object" ? Object.freeze({ ...ticket }) : null;
  return currentVerifiedRunContext();
}

function clearRunRandomStreams() {
  activeRunRandomStreams = null;
  activeVerifiedRunTicket = null;
  activeCanonicalRunRandomStreams = null;
  activeCanonicalRunState = null;
  recordedRunInputs = null;
  pendingRunInputButtons = 0;
  activeCanonicalRunInput = null;
}

function currentVerifiedRunContext() {
  return Object.freeze({
    seeded: activeRunRandomStreams !== null,
    ticket: activeVerifiedRunTicket,
    authoritativeState: activeCanonicalRunState !== null,
    canonicalTick: activeCanonicalRunState ? activeCanonicalRunState.tick : 0,
    recording: Array.isArray(recordedRunInputs),
    recordedTicks: Array.isArray(recordedRunInputs) ? recordedRunInputs.length : 0
  });
}

function runRandom(streamName) {
  return activeRunRandomStreams
    ? activeRunRandomStreams.nextFloat(streamName)
    : Math.random();
}

function runRandomRange(streamName, minimum, maximum) {
  const min = Number(minimum);
  const max = Number(maximum);
  if (!Number.isFinite(min) || !Number.isFinite(max) || max < min) {
    throw new TypeError("Run random range requires finite ordered bounds.");
  }
  return min + runRandom(streamName) * (max - min);
}

function beginRunInputRecording() {
  recordedRunInputs = [];
  pendingRunInputButtons = 0;
  activeCanonicalRunInput = null;
  return currentVerifiedRunContext();
}

async function beginSeededStandardRun(ticket) {
  if (seededRunStarting || activeRunRandomStreams || Array.isArray(recordedRunInputs)) {
    throw new Error("A seeded standard run is already active.");
  }
  const runTicket = ticket && typeof ticket === "object" ? ticket : {};
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(String(runTicket.runId || ""))) {
    throw new TypeError("Verified run ticket ID is invalid.");
  }
  seededRunStarting = true;
  try {
    const [streams, canonicalStreams] = await Promise.all([
      createRunRandomStreams(runTicket.rootSeed, runTicket.simRevision),
      createRunRandomStreams(runTicket.rootSeed, runTicket.simRevision)
    ]);
    const canonicalState = createSimulationState(runTicket);
    installRunRandomStreams(streams, runTicket);
    activeCanonicalRunRandomStreams = canonicalStreams;
    activeCanonicalRunState = canonicalState;
    beginRunInputRecording();
    return currentVerifiedRunContext();
  } finally {
    seededRunStarting = false;
  }
}

function currentCanonicalRunState() {
  return activeCanonicalRunState;
}

function currentCanonicalRunParity(browserState = {}) {
  const canonical = activeCanonicalRunState;
  if (!canonical) {
    return { active: false, matched: false, canonicalTick: 0, differences: [] };
  }
  const source = browserState && typeof browserState === "object" ? browserState : {};
  const player = source.player && typeof source.player === "object" ? source.player : {};
  const differences = [];
  const arrayLength = (value) => Array.isArray(value) ? value.length : null;
  const compare = (field, browser, authority) => {
    if (browser !== authority) differences.push({ field, browser, canonical: authority });
  };

  compare("activeTicks", Number(source.runStats?.activeFrames), canonical.tick);
  compare("score", Number(source.score), canonical.score);
  compare("phase", Number(source.phase), canonical.phase);
  compare("multiplier", Number(source.multiplier), canonical.multiplier);
  compare("comboKills", Number(source.comboKills), canonical.comboKills);
  compare("playerRealm", Number(source.playerRealm), canonical.playerRealm);
  compare("player.x", Number(player.x), canonical.player.x / StarStrikeVerifiedRunConstants.POSITION_UNITS_PER_PIXEL);
  compare("player.y", Number(player.y), canonical.player.y / StarStrikeVerifiedRunConstants.POSITION_UNITS_PER_PIXEL);
  compare("player.hp", Number(player.hp), canonical.player.hp);
  compare("player.energy", Number(player.energy), canonical.player.energy / StarStrikeVerifiedRunConstants.ENERGY_UNITS_PER_POINT);
  compare("counts.playerProjectiles", arrayLength(source.bullets), canonical.playerProjectiles.length);
  compare("counts.enemyProjectiles", arrayLength(source.enemyBullets), canonical.enemyProjectiles.length);
  compare("counts.enemies", arrayLength(source.enemies), canonical.enemies.length);
  const browserHazards = [source.debris, source.enemyBeams, source.gravityWells]
    .reduce((total, value) => total + (Array.isArray(value) ? value.length : 0), 0);
  compare("counts.hazards", browserHazards, canonical.hazards.length);
  compare("counts.powerups", arrayLength(source.powerups), canonical.powerups.length);
  compare("counts.wingmen", arrayLength(source.wingmen), canonical.wingmen.length);
  compare("counts.pendingSpawns", arrayLength(source.pendingSpawns), canonical.pendingSpawns.length);
  compare("boss.active", Boolean(source.boss), Boolean(canonical.boss));

  return {
    active: true,
    matched: differences.length === 0,
    canonicalTick: canonical.tick,
    differences
  };
}

function captureCanonicalRunInput(inputState = {}, edgeButtons = 0) {
  const keyboard = inputState.keyboard && typeof inputState.keyboard === "object" ? inputState.keyboard : {};
  const joystick = inputState.joystick && typeof inputState.joystick === "object" ? inputState.joystick : {};
  let moveX = (keyboard.right === true ? 1 : 0) - (keyboard.left === true ? 1 : 0);
  let moveY = (keyboard.down === true ? 1 : 0) - (keyboard.up === true ? 1 : 0);
  if (joystick.active === true) {
    moveX += Number.isFinite(Number(joystick.ax)) ? Number(joystick.ax) : 0;
    moveY += Number.isFinite(Number(joystick.ay)) ? Number(joystick.ay) : 0;
  }
  const magnitude = Math.hypot(moveX, moveY);
  if (magnitude > 1) {
    moveX /= magnitude;
    moveY /= magnitude;
  }
  const canonical = canonicalRunInput({
    moveX,
    moveY,
    ghostPressed: (edgeButtons & BUTTON_GHOST_SHIFT) !== 0,
    pausePressed: (edgeButtons & BUTTON_PAUSE) !== 0
  });
  return Object.freeze(canonical);
}

function queueVerifiedRunInputEdge(action) {
  if (!Array.isArray(recordedRunInputs)) return false;
  if (action === "ghost") pendingRunInputButtons |= BUTTON_GHOST_SHIFT;
  else if (action === "pause") pendingRunInputButtons |= BUTTON_PAUSE;
  else throw new RangeError(`Unknown verified run input edge: ${action}`);
  return true;
}

function beginCanonicalRunTick(inputState = {}) {
  if (activeCanonicalRunInput) throw new Error("The prior canonical run tick is still active.");
  const canonical = captureCanonicalRunInput(inputState, pendingRunInputButtons);
  pendingRunInputButtons = 0;
  activeCanonicalRunInput = canonical;
  if (Array.isArray(recordedRunInputs)) {
    recordCanonicalRunInput({
      moveX: canonical.x / 127,
      moveY: canonical.y / 127,
      ghostPressed: (canonical.buttons & BUTTON_GHOST_SHIFT) !== 0,
      pausePressed: (canonical.buttons & BUTTON_PAUSE) !== 0
    });
  }
  return Object.freeze({
    x: canonical.x / 127,
    y: canonical.y / 127,
    ghostPressed: (canonical.buttons & BUTTON_GHOST_SHIFT) !== 0,
    pausePressed: (canonical.buttons & BUTTON_PAUSE) !== 0
  });
}

function currentCanonicalRunVector(inputState = {}) {
  const canonical = activeCanonicalRunInput || captureCanonicalRunInput(inputState);
  return Object.freeze({ x: canonical.x / 127, y: canonical.y / 127 });
}

function endCanonicalRunTick() {
  const canonical = activeCanonicalRunInput;
  activeCanonicalRunInput = null;
  if (activeCanonicalRunState && canonical) {
    stepSimulation(activeCanonicalRunState, canonical, activeCanonicalRunRandomStreams);
  }
}

function recordCanonicalRunInput(rawInput = {}) {
  if (!Array.isArray(recordedRunInputs)) throw new Error("Run input recording is not active.");
  if (recordedRunInputs.length >= StarStrikeVerifiedRunConstants.MAX_RUN_TICKS) {
    throw new RangeError("Run input recording exceeds the tick ceiling.");
  }
  const input = canonicalRunInput(rawInput);
  recordedRunInputs.push({
    moveX: input.x / 127,
    moveY: input.y / 127,
    ghostPressed: (input.buttons & BUTTON_GHOST_SHIFT) !== 0,
    pausePressed: (input.buttons & BUTTON_PAUSE) !== 0
  });
  return input;
}

function finalizeRunInputRecording(metadata = {}) {
  if (!Array.isArray(recordedRunInputs) || recordedRunInputs.length === 0) {
    throw new Error("Run input recording has no ticks.");
  }
  const frames = recordedRunInputs;
  recordedRunInputs = null;
  pendingRunInputButtons = 0;
  activeCanonicalRunInput = null;
  return encodeInputTape(frames, metadata);
}

function finalizeRecordedInputTape(metadata = {}) {
  return finalizeRunInputRecording(metadata);
}

function cancelRunInputRecording() {
  recordedRunInputs = null;
  pendingRunInputButtons = 0;
  activeCanonicalRunInput = null;
}

globalThis.installRunRandomStreams = installRunRandomStreams;
globalThis.clearRunRandomStreams = clearRunRandomStreams;
globalThis.currentVerifiedRunContext = currentVerifiedRunContext;
globalThis.runRandom = runRandom;
globalThis.runRandomRange = runRandomRange;
globalThis.beginRunInputRecording = beginRunInputRecording;
globalThis.beginSeededStandardRun = beginSeededStandardRun;
globalThis.currentCanonicalRunState = currentCanonicalRunState;
globalThis.currentCanonicalRunParity = currentCanonicalRunParity;
globalThis.captureCanonicalRunInput = captureCanonicalRunInput;
globalThis.queueVerifiedRunInputEdge = queueVerifiedRunInputEdge;
globalThis.beginCanonicalRunTick = beginCanonicalRunTick;
globalThis.currentCanonicalRunVector = currentCanonicalRunVector;
globalThis.endCanonicalRunTick = endCanonicalRunTick;
globalThis.recordCanonicalRunInput = recordCanonicalRunInput;
globalThis.finalizeRunInputRecording = finalizeRunInputRecording;
globalThis.finalizeRecordedInputTape = finalizeRecordedInputTape;
globalThis.cancelRunInputRecording = cancelRunInputRecording;
