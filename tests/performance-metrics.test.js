"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const {
  evaluatePerformanceBudget,
  summarizePerformance
} = require("../scripts/performance-metrics.js");

test("performance summary reports frame, simulation, heap, and entity pressure", () => {
  const samples = [
    { timestampMs: 0, simulationFrame: 100, simulationBacklogMs: 0, heapUsedBytes: 1000, counts: { enemies: 10, particles: 400 } },
    { timestampMs: 16, simulationFrame: 101, simulationBacklogMs: 2, heapUsedBytes: 1050, counts: { enemies: 12, particles: 500 } },
    { timestampMs: 33, simulationFrame: 102, simulationBacklogMs: 4, heapUsedBytes: 1100, counts: { enemies: 14, particles: 600 } },
    { timestampMs: 83, simulationFrame: 105, simulationBacklogMs: 8, heapUsedBytes: 1200, counts: { enemies: 16, particles: 700 } },
    { timestampMs: 100, simulationFrame: 106, simulationBacklogMs: 3, heapUsedBytes: 1250, counts: { enemies: 15, particles: 650 } }
  ];

  const summary = summarizePerformance(samples, {
    expectedFrameMs: 1000 / 60,
    longTasks: [{ durationMs: 70 }]
  });

  assert.equal(summary.sampleCount, 5);
  assert.equal(summary.intervalCount, 4);
  assert.equal(summary.averageFrameMs, 25);
  assert.equal(summary.p95FrameMs, 45.05);
  assert.equal(summary.p99FrameMs, 49.01);
  assert.equal(summary.renderFps, 40);
  assert.equal(summary.droppedRenderFrames, 2);
  assert.equal(summary.longTaskCount, 1);
  assert.equal(summary.longTaskTotalMs, 70);
  assert.equal(summary.maxLongTaskMs, 70);
  assert.equal(summary.simulationBacklogMs.max, 8);
  assert.deepEqual(summary.heap, {
    supported: true,
    startBytes: 1000,
    endBytes: 1250,
    deltaBytes: 250,
    trendPercent: 25
  });
  assert.deepEqual(summary.maxCounts, { enemies: 16, particles: 700 });
});

test("performance budget returns concrete failures without discarding the summary", () => {
  const summary = {
    sampleCount: 300,
    p95FrameMs: 34,
    p99FrameMs: 72,
    droppedRenderRatio: 0.12,
    maxLongTaskMs: 88,
    simulationBacklogMs: { max: 14 }
  };

  assert.deepEqual(evaluatePerformanceBudget(summary, {
    minSamples: 200,
    maxP95FrameMs: 40,
    maxP99FrameMs: 90,
    maxDroppedRenderRatio: 0.2,
    maxLongTaskMs: 120,
    maxSimulationBacklogMs: 20
  }), { pass: true, failures: [] });

  const result = evaluatePerformanceBudget(summary, {
    minSamples: 400,
    maxP95FrameMs: 30,
    maxP99FrameMs: 60,
    maxDroppedRenderRatio: 0.1,
    maxLongTaskMs: 80,
    maxSimulationBacklogMs: 10
  });

  assert.equal(result.pass, false);
  assert.deepEqual(result.failures, [
    "sample count 300 is below 400",
    "p95 frame time 34ms exceeds 30ms",
    "p99 frame time 72ms exceeds 60ms",
    "dropped render ratio 0.12 exceeds 0.1",
    "maximum long task 88ms exceeds 80ms",
    "simulation backlog 14ms exceeds 10ms"
  ]);
});

test("performance summary reports wall time intentionally discarded by the fixed-step simulation", () => {
  const summary = summarizePerformance([
    { timestampMs: 0, simulationFrame: 40, simulationBacklogMs: 0, counts: {} },
    { timestampMs: 100, simulationFrame: 43, simulationBacklogMs: 0, counts: {} }
  ], { expectedFrameMs: 1000 / 60 });

  assert.equal(summary.simulationDroppedMs, 50);
});
