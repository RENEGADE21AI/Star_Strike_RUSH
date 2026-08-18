const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");

const context = { console, Math, Number, Object };
context.globalThis = context;
vm.createContext(context);
const runtimePath = path.resolve(__dirname, "../src/00-runtime.js");
if (fs.existsSync(runtimePath)) vm.runInContext(fs.readFileSync(runtimePath, "utf8"), context);

test("fixed-step runtime is available", () => {
  assert.equal(typeof context.createFixedStepClock, "function");
  assert.equal(typeof context.advanceFixedStep, "function");
});

test("canvas DPR preserves normal displays and caps ultra-wide backing-store memory", () => {
  assert.equal(context.effectiveCanvasDpr(390, 844, 2), 2);
  assert.equal(context.effectiveCanvasDpr(1440, 900, 2), 2);
  const dpr4k = context.effectiveCanvasDpr(3840, 2160, 2);
  assert.ok(dpr4k >= 1 && dpr4k < 1.01, `unexpected 4K DPR ${dpr4k}`);
  assert.ok(3840 * 2160 * dpr4k * dpr4k <= context.DEFAULT_MAX_CANVAS_PIXELS + 1);
  const dpr8k = context.effectiveCanvasDpr(7680, 4320, 2);
  assert.ok(dpr8k >= 0.5 && dpr8k < 0.51, `unexpected 8K DPR ${dpr8k}`);
  assert.ok(7680 * 4320 * dpr8k * dpr8k <= context.DEFAULT_MAX_CANVAS_PIXELS + 1);
  const dprExtreme = context.effectiveCanvasDpr(20_000, 20_000, 2);
  assert.ok(dprExtreme > 0 && dprExtreme < 0.5, `unexpected extreme DPR ${dprExtreme}`);
  assert.ok(20_000 * 20_000 * dprExtreme * dprExtreme <= context.DEFAULT_MAX_CANVAS_PIXELS + 1);
});

function simulateAt(renderFps, durationMs = 10_000) {
  const clock = context.createFixedStepClock();
  let steps = 0;
  context.advanceFixedStep(clock, 0, () => { steps++; });
  const frameMs = 1000 / renderFps;
  for (let timestamp = frameMs; timestamp < durationMs; timestamp += frameMs) {
    context.advanceFixedStep(clock, timestamp, () => { steps++; });
  }
  context.advanceFixedStep(clock, durationMs, () => { steps++; });
  return steps;
}

test("30, 60, 90, and 120 Hz rendering produce equivalent simulation timing", () => {
  const counts = [30, 60, 90, 120].map((fps) => simulateAt(fps));
  for (const count of counts) assert.ok(Math.abs(count - 600) <= 1, `expected about 600 simulation steps, got ${count}`);
  assert.ok(Math.max(...counts) - Math.min(...counts) <= 1, counts.join(", "));
});

test("long background gaps are clamped and cannot spiral into hundreds of updates", () => {
  const clock = context.createFixedStepClock();
  let steps = 0;
  context.advanceFixedStep(clock, 0, () => { steps++; });
  const result = context.advanceFixedStep(clock, 30_000, () => { steps++; });
  assert.ok(steps <= 3, `a stalled render must not replay ${steps} simulation ticks in one visual frame`);
  assert.ok(result.droppedMs > 0);
  assert.ok(result.alpha >= 0 && result.alpha < 1);
});

test("a 200 ms foreground stall resumes near normal speed instead of fast-forwarding", () => {
  const clock = context.createFixedStepClock();
  let steps = 0;
  context.advanceFixedStep(clock, 0, () => { steps++; });
  const stalled = context.advanceFixedStep(clock, 200, () => { steps++; });
  assert.ok(stalled.steps <= 3);
  assert.ok(stalled.droppedMs >= 140, `expected most stalled wall time to be discarded, got ${stalled.droppedMs}`);
  const resumed = context.advanceFixedStep(clock, 200 + 1000 / 60, () => { steps++; });
  assert.equal(resumed.steps, 1);
});
