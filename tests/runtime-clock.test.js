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
  const clock = context.createFixedStepClock({ maxDeltaMs: 200, maxSteps: 8 });
  let steps = 0;
  context.advanceFixedStep(clock, 0, () => { steps++; });
  const result = context.advanceFixedStep(clock, 30_000, () => { steps++; });
  assert.equal(steps, 8);
  assert.ok(result.droppedMs > 0);
  assert.ok(result.alpha >= 0 && result.alpha < 1);
});
