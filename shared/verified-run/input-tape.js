"use strict";

(function initializeVerifiedRunInputTape(root, factory) {
  const constants = typeof module === "object" && module.exports
    ? require("./constants")
    : root.StarStrikeVerifiedRunConstants;
  const api = factory(constants);
  if (typeof module === "object" && module.exports) module.exports = api;
  Object.assign(root, api);
})(globalThis, function buildVerifiedRunInputTape(constants) {

if (!constants) throw new Error("Verified run constants must load before the input tape codec.");

const {
  CHECKPOINT_INTERVAL_TICKS,
  INPUT_CHECKPOINT_BYTES,
  INPUT_HEADER_BYTES,
  INPUT_MAGIC,
  INPUT_REVISION,
  INPUT_SCHEMA_VERSION,
  INPUT_SEGMENT_BYTES,
  MAX_CHECKPOINTS,
  MAX_INPUT_BYTES,
  MAX_INPUT_SEGMENTS,
  MAX_RUN_TICKS
} = constants;

const BUTTON_GHOST_SHIFT = 1;
const BUTTON_PAUSE = 2;
const ALLOWED_BUTTONS = BUTTON_GHOST_SHIFT | BUTTON_PAUSE;

function quantizeAxis(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number === 0) return 0;
  const clamped = Math.max(-1, Math.min(1, number));
  return Math.sign(clamped) * Math.round(Math.abs(clamped) * 127);
}

function canonicalRunInput(raw = {}) {
  return {
    x: quantizeAxis(raw.moveX),
    y: quantizeAxis(raw.moveY),
    buttons: (raw.ghostPressed === true ? BUTTON_GHOST_SHIFT : 0) |
      (raw.pausePressed === true ? BUTTON_PAUSE : 0)
  };
}

function bytesFromHex(value, expectedBytes, label) {
  const text = String(value || "").toLowerCase();
  if (!new RegExp(`^[a-f0-9]{${expectedBytes * 2}}$`).test(text)) {
    throw new TypeError(`${label} must be ${expectedBytes * 8}-bit hexadecimal.`);
  }
  const bytes = new Uint8Array(expectedBytes);
  for (let index = 0; index < expectedBytes; index++) {
    bytes[index] = Number.parseInt(text.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes;
}

function hexFromBytes(bytes) {
  return Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
}

function normalizeCheckpoint(raw, previousTick, tickCount) {
  const tick = Number(raw && raw.tick);
  if (!Number.isInteger(tick) || tick <= previousTick || tick < 1 || tick > tickCount) {
    throw new RangeError("Input checkpoint tick is invalid or unordered.");
  }
  return { tick, digestBytes: bytesFromHex(raw.digest, 16, "Input checkpoint digest") };
}

function normalizedCheckpoints(metadata, tickCount) {
  const checkpoints = [];
  let previousTick = 0;
  for (const raw of Array.isArray(metadata && metadata.checkpoints) ? metadata.checkpoints : []) {
    if (checkpoints.length >= MAX_CHECKPOINTS) throw new RangeError("Input checkpoint count exceeds the ceiling.");
    const checkpoint = normalizeCheckpoint(raw, previousTick, tickCount);
    checkpoints.push(checkpoint);
    previousTick = checkpoint.tick;
  }
  return checkpoints;
}

function writeInputTapeHeader(bytes, tickCount, segmentCount, checkpoints) {
  const segmentsByteLength = segmentCount * INPUT_SEGMENT_BYTES;
  const checkpointsByteLength = checkpoints.length * INPUT_CHECKPOINT_BYTES;
  for (let index = 0; index < INPUT_MAGIC.length; index++) bytes[index] = INPUT_MAGIC.charCodeAt(index);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  view.setUint8(4, INPUT_SCHEMA_VERSION);
  view.setUint8(5, 0);
  view.setUint16(6, INPUT_HEADER_BYTES, true);
  view.setUint32(8, tickCount, true);
  view.setUint32(12, segmentCount, true);
  view.setUint32(16, CHECKPOINT_INTERVAL_TICKS, true);
  view.setUint32(20, checkpoints.length, true);
  view.setUint32(24, segmentsByteLength, true);
  view.setUint32(28, checkpointsByteLength, true);
  return view;
}

function createInputTapeRecorder(options = {}) {
  const capacity = Number(options.segmentChunkCapacity ?? 512);
  if (!Number.isInteger(capacity) || capacity < 1 || capacity > 4096) {
    throw new RangeError("Input recorder segment chunk capacity is invalid.");
  }
  const onChunk = typeof options.onChunk === "function" ? options.onChunk : null;
  const retainedChunks = [];
  let chunk = new Uint8Array(capacity * INPUT_SEGMENT_BYTES);
  let chunkSegments = 0;
  let flushedSegmentCount = 0;
  let flushedTickCount = 0;
  let currentSegment = null;
  let tickCount = 0;
  let finalized = false;

  function segmentCount() {
    return flushedSegmentCount + chunkSegments + (currentSegment ? 1 : 0);
  }

  function flushChunk() {
    if (chunkSegments === 0) return;
    const exact = chunk.slice(0, chunkSegments * INPUT_SEGMENT_BYTES);
    const summary = Object.freeze({
      chunkIndex: retainedChunks.length,
      firstSegmentIndex: flushedSegmentCount,
      segmentCount: chunkSegments,
      tickCount: flushedTickCount
    });
    retainedChunks.push(exact);
    flushedSegmentCount += chunkSegments;
    chunk = new Uint8Array(capacity * INPUT_SEGMENT_BYTES);
    chunkSegments = 0;
    if (onChunk) onChunk(exact.slice(), summary);
  }

  function writeSegment(segment) {
    const offset = chunkSegments * INPUT_SEGMENT_BYTES;
    const view = new DataView(chunk.buffer, chunk.byteOffset, chunk.byteLength);
    view.setUint32(offset, segment.duration, true);
    view.setInt8(offset + 4, segment.x);
    view.setInt8(offset + 5, segment.y);
    view.setUint8(offset + 6, segment.buttons);
    view.setUint8(offset + 7, 0);
    chunkSegments++;
    flushedTickCount += segment.duration;
    if (chunkSegments === capacity) flushChunk();
  }

  function append(rawInput = {}) {
    if (finalized) throw new Error("Input recorder is finalized.");
    if (tickCount >= MAX_RUN_TICKS) throw new RangeError("Run input recording exceeds the tick ceiling.");
    const input = canonicalRunInput(rawInput);
    if (
      currentSegment &&
      currentSegment.x === input.x &&
      currentSegment.y === input.y &&
      currentSegment.buttons === input.buttons
    ) {
      tickCount++;
      currentSegment.duration++;
      return input;
    }
    if (currentSegment && segmentCount() >= MAX_INPUT_SEGMENTS) {
      throw new RangeError("Input tape segment count exceeds the ceiling.");
    }
    tickCount++;
    if (currentSegment) writeSegment(currentSegment);
    currentSegment = { duration: 1, ...input };
    return input;
  }

  function status() {
    const count = segmentCount();
    return Object.freeze({
      tickCount,
      segmentCount: count,
      flushedSegmentCount,
      bufferedSegmentCount: chunkSegments + (currentSegment ? 1 : 0),
      compactByteLength: count * INPUT_SEGMENT_BYTES,
      finalized
    });
  }

  function finalize(metadata = {}) {
    if (finalized) throw new Error("Input recorder is finalized.");
    if (tickCount < 1 || !currentSegment) throw new Error("Run input recording has no ticks.");
    const checkpoints = normalizedCheckpoints(metadata, tickCount);
    writeSegment(currentSegment);
    currentSegment = null;
    flushChunk();
    const segmentsByteLength = flushedSegmentCount * INPUT_SEGMENT_BYTES;
    const checkpointsByteLength = checkpoints.length * INPUT_CHECKPOINT_BYTES;
    const byteLength = INPUT_HEADER_BYTES + segmentsByteLength + checkpointsByteLength;
    if (byteLength > MAX_INPUT_BYTES) throw new RangeError("Input tape exceeds the byte ceiling.");

    const bytes = new Uint8Array(byteLength);
    const view = writeInputTapeHeader(bytes, tickCount, flushedSegmentCount, checkpoints);
    let offset = INPUT_HEADER_BYTES;
    for (const retained of retainedChunks) {
      bytes.set(retained, offset);
      offset += retained.byteLength;
    }
    for (const checkpoint of checkpoints) {
      view.setUint32(offset, checkpoint.tick, true);
      bytes.set(checkpoint.digestBytes, offset + 4);
      offset += INPUT_CHECKPOINT_BYTES;
    }
    finalized = true;
    return bytes;
  }

  return Object.freeze({ append, finalize, status });
}

function encodeInputTape(frames, metadata = {}) {
  if (!Array.isArray(frames) || frames.length < 1 || frames.length > MAX_RUN_TICKS) {
    throw new RangeError("Input tape tick count is outside the allowed range.");
  }
  const recorder = createInputTapeRecorder();
  for (const frame of frames) recorder.append(frame);
  return recorder.finalize(metadata);
}

function asUint8Array(value) {
  if (value instanceof Uint8Array) return value;
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  throw new TypeError("Input tape must be an ArrayBuffer or Uint8Array.");
}

function inputTapeCrypto() {
  if (globalThis.crypto && globalThis.crypto.subtle) return globalThis.crypto;
  if (typeof require === "function") return require("node:crypto").webcrypto;
  throw new Error("Web Crypto is required for input tape hashing.");
}

async function digestInputTape(value) {
  const bytes = asUint8Array(value);
  if (bytes.byteLength > MAX_INPUT_BYTES) throw new RangeError("Input tape exceeds the byte ceiling.");
  const digest = new Uint8Array(await inputTapeCrypto().subtle.digest("SHA-256", bytes));
  return hexFromBytes(digest);
}

function decodeInputTape(value) {
  const bytes = asUint8Array(value);
  if (bytes.byteLength > MAX_INPUT_BYTES) throw new RangeError("Input tape exceeds the byte ceiling.");
  if (bytes.byteLength < INPUT_HEADER_BYTES) throw new RangeError("Input tape is shorter than its header.");
  for (let index = 0; index < INPUT_MAGIC.length; index++) {
    if (bytes[index] !== INPUT_MAGIC.charCodeAt(index)) throw new TypeError("Input tape magic is invalid.");
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (view.getUint8(4) !== INPUT_SCHEMA_VERSION) throw new TypeError("Input tape version is unsupported.");
  if (view.getUint8(5) !== 0 || view.getUint16(6, true) !== INPUT_HEADER_BYTES) {
    throw new TypeError("Input tape header is invalid.");
  }
  const tickCount = view.getUint32(8, true);
  const segmentCount = view.getUint32(12, true);
  const checkpointIntervalTicks = view.getUint32(16, true);
  const checkpointCount = view.getUint32(20, true);
  const segmentsByteLength = view.getUint32(24, true);
  const checkpointsByteLength = view.getUint32(28, true);
  if (tickCount < 1 || tickCount > MAX_RUN_TICKS) throw new RangeError("Input tape tick count is outside the allowed range.");
  if (segmentCount < 1 || segmentCount > MAX_INPUT_SEGMENTS) throw new RangeError("Input tape segment count is outside the allowed range.");
  if (checkpointIntervalTicks !== CHECKPOINT_INTERVAL_TICKS) throw new TypeError("Input checkpoint interval is unsupported.");
  if (checkpointCount > MAX_CHECKPOINTS) throw new RangeError("Input checkpoint count exceeds the ceiling.");
  if (segmentsByteLength !== segmentCount * INPUT_SEGMENT_BYTES ||
      checkpointsByteLength !== checkpointCount * INPUT_CHECKPOINT_BYTES) {
    throw new RangeError("Input tape section lengths are invalid.");
  }
  const expectedLength = INPUT_HEADER_BYTES + segmentsByteLength + checkpointsByteLength;
  if (bytes.byteLength !== expectedLength) throw new RangeError("Input tape total length is invalid.");

  const segments = [];
  let durationTotal = 0;
  let offset = INPUT_HEADER_BYTES;
  for (let index = 0; index < segmentCount; index++) {
    const duration = view.getUint32(offset, true);
    const buttons = view.getUint8(offset + 6);
    if (duration < 1) throw new RangeError("Input segment duration must be positive.");
    if ((buttons & ~ALLOWED_BUTTONS) !== 0 || view.getUint8(offset + 7) !== 0) {
      throw new TypeError("Input segment flags are invalid.");
    }
    durationTotal += duration;
    if (durationTotal > tickCount) throw new RangeError("Input segment durations exceed the tick count.");
    segments.push({
      duration,
      x: view.getInt8(offset + 4),
      y: view.getInt8(offset + 5),
      buttons
    });
    offset += INPUT_SEGMENT_BYTES;
  }
  if (durationTotal !== tickCount) throw new RangeError("Input segment durations do not equal the tick count.");

  const checkpoints = [];
  let previousTick = 0;
  for (let index = 0; index < checkpointCount; index++) {
    const tick = view.getUint32(offset, true);
    if (tick <= previousTick || tick > tickCount) throw new RangeError("Input checkpoint tick is invalid or unordered.");
    checkpoints.push({ tick, digest: hexFromBytes(bytes.subarray(offset + 4, offset + INPUT_CHECKPOINT_BYTES)) });
    previousTick = tick;
    offset += INPUT_CHECKPOINT_BYTES;
  }

  return Object.freeze({
    revision: INPUT_REVISION,
    tickCount,
    checkpointIntervalTicks,
    segments,
    checkpoints
  });
}

return Object.freeze({
  BUTTON_GHOST_SHIFT,
  BUTTON_PAUSE,
  canonicalRunInput,
  createInputTapeRecorder,
  decodeInputTape,
  digestInputTape,
  encodeInputTape
});
});
