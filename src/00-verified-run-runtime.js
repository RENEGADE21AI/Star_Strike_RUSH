"use strict";

let activeRunRandomStreams = null;
let activeVerifiedRunTicket = null;
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
  recordedRunInputs = null;
  pendingRunInputButtons = 0;
  activeCanonicalRunInput = null;
}

function currentVerifiedRunContext() {
  return Object.freeze({
    seeded: activeRunRandomStreams !== null,
    ticket: activeVerifiedRunTicket,
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
  if (activeRunRandomStreams || Array.isArray(recordedRunInputs)) {
    throw new Error("A seeded standard run is already active.");
  }
  const runTicket = ticket && typeof ticket === "object" ? ticket : {};
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(String(runTicket.runId || ""))) {
    throw new TypeError("Verified run ticket ID is invalid.");
  }
  const streams = await createRunRandomStreams(runTicket.rootSeed, runTicket.simRevision);
  installRunRandomStreams(streams, runTicket);
  beginRunInputRecording();
  return currentVerifiedRunContext();
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
  activeCanonicalRunInput = null;
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
globalThis.captureCanonicalRunInput = captureCanonicalRunInput;
globalThis.queueVerifiedRunInputEdge = queueVerifiedRunInputEdge;
globalThis.beginCanonicalRunTick = beginCanonicalRunTick;
globalThis.currentCanonicalRunVector = currentCanonicalRunVector;
globalThis.endCanonicalRunTick = endCanonicalRunTick;
globalThis.recordCanonicalRunInput = recordCanonicalRunInput;
globalThis.finalizeRunInputRecording = finalizeRunInputRecording;
globalThis.finalizeRecordedInputTape = finalizeRecordedInputTape;
globalThis.cancelRunInputRecording = cancelRunInputRecording;
