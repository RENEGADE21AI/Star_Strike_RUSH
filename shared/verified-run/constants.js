"use strict";

(function initializeVerifiedRunConstants(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.StarStrikeVerifiedRunConstants = api;
})(globalThis, function buildVerifiedRunConstants() {

const SIMULATION_HZ = 60;
const MAX_RUN_DURATION_SECONDS = 6 * 60 * 60;
const MAX_RUN_TICKS = SIMULATION_HZ * MAX_RUN_DURATION_SECONDS;
const MAX_INPUT_SEGMENTS = 250000;
const MAX_INPUT_BYTES = 2 * 1024 * 1024;
const CHECKPOINT_INTERVAL_TICKS = 600;
const MAX_CHECKPOINTS = Math.ceil(MAX_RUN_TICKS / CHECKPOINT_INTERVAL_TICKS);
const INPUT_MAGIC = "SSR1";
const INPUT_SCHEMA_VERSION = 1;
const INPUT_REVISION = "SSR_INPUT_V1";
const INPUT_HEADER_BYTES = 32;
const INPUT_SEGMENT_BYTES = 8;
const INPUT_CHECKPOINT_BYTES = 20;

return Object.freeze({
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
  MAX_RUN_DURATION_SECONDS,
  MAX_RUN_TICKS,
  SIMULATION_HZ
});
});
