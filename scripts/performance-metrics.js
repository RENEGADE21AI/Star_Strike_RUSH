"use strict";

function round(value, digits = 2) {
  if (!Number.isFinite(value)) return 0;
  const scale = 10 ** digits;
  return Math.round((value + Number.EPSILON) * scale) / scale;
}

function percentile(values, quantile) {
  if (!values.length) return 0;
  const sorted = values.slice().sort((a, b) => a - b);
  const position = Math.max(0, Math.min(1, quantile)) * (sorted.length - 1);
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  if (lower === upper) return sorted[lower];
  const weight = position - lower;
  return sorted[lower] + (sorted[upper] - sorted[lower]) * weight;
}

function summarizePerformance(samples, options = {}) {
  if (!Array.isArray(samples) || samples.length < 2) {
    throw new TypeError("At least two performance samples are required");
  }
  const expectedFrameMs = Number(options.expectedFrameMs) > 0 ? Number(options.expectedFrameMs) : 1000 / 60;
  const intervals = [];
  for (let index = 1; index < samples.length; index++) {
    const interval = Number(samples[index].timestampMs) - Number(samples[index - 1].timestampMs);
    if (Number.isFinite(interval) && interval >= 0) intervals.push(interval);
  }
  if (!intervals.length) throw new TypeError("Performance samples must contain increasing timestamps");

  const totalFrameMs = intervals.reduce((total, value) => total + value, 0);
  const firstSimulationFrame = Number(samples[0].simulationFrame);
  const lastSimulationFrame = Number(samples[samples.length - 1].simulationFrame);
  const simulationAdvancedFrames = Number.isFinite(firstSimulationFrame) && Number.isFinite(lastSimulationFrame)
    ? Math.max(0, lastSimulationFrame - firstSimulationFrame)
    : 0;
  const simulationDroppedMs = Math.max(0, totalFrameMs - simulationAdvancedFrames * expectedFrameMs);
  const droppedRenderFrames = intervals.reduce(
    (total, value) => total + Math.max(0, Math.round(value / expectedFrameMs) - 1),
    0
  );
  const renderedAndDropped = intervals.length + droppedRenderFrames;
  const backlogValues = samples
    .map((sample) => Number(sample.simulationBacklogMs))
    .filter(Number.isFinite);
  const longTasks = Array.isArray(options.longTasks) ? options.longTasks : [];
  const longTaskDurations = longTasks
    .map((task) => Number(task && task.durationMs))
    .filter((value) => Number.isFinite(value) && value >= 0);

  const countKeys = new Set();
  for (const sample of samples) {
    for (const key of Object.keys(sample.counts || {})) countKeys.add(key);
  }
  const maxCounts = {};
  for (const key of Array.from(countKeys).sort()) {
    maxCounts[key] = Math.max(...samples.map((sample) => Number(sample.counts && sample.counts[key]) || 0));
  }

  const heapValues = samples
    .map((sample) => Number(sample.heapUsedBytes))
    .filter((value) => Number.isFinite(value) && value >= 0);
  const heap = heapValues.length ? {
    supported: true,
    startBytes: heapValues[0],
    endBytes: heapValues[heapValues.length - 1],
    deltaBytes: heapValues[heapValues.length - 1] - heapValues[0],
    trendPercent: heapValues[0] > 0
      ? round(((heapValues[heapValues.length - 1] - heapValues[0]) / heapValues[0]) * 100)
      : 0
  } : { supported: false };

  return {
    sampleCount: samples.length,
    intervalCount: intervals.length,
    durationMs: round(totalFrameMs),
    averageFrameMs: round(totalFrameMs / intervals.length),
    p95FrameMs: round(percentile(intervals, 0.95)),
    p99FrameMs: round(percentile(intervals, 0.99)),
    renderFps: round(intervals.length * 1000 / totalFrameMs),
    simulationAdvancedFrames,
    simulationDroppedMs: round(simulationDroppedMs),
    droppedRenderFrames,
    droppedRenderRatio: round(renderedAndDropped ? droppedRenderFrames / renderedAndDropped : 0, 4),
    longTaskCount: longTaskDurations.length,
    longTaskTotalMs: round(longTaskDurations.reduce((total, value) => total + value, 0)),
    maxLongTaskMs: round(longTaskDurations.length ? Math.max(...longTaskDurations) : 0),
    simulationBacklogMs: {
      max: round(backlogValues.length ? Math.max(...backlogValues) : 0),
      p95: round(percentile(backlogValues, 0.95))
    },
    heap,
    maxCounts
  };
}

function evaluatePerformanceBudget(summary, budget) {
  const failures = [];
  const checks = [
    [Number(summary.sampleCount) < Number(budget.minSamples), `sample count ${summary.sampleCount} is below ${budget.minSamples}`],
    [Number(summary.p95FrameMs) > Number(budget.maxP95FrameMs), `p95 frame time ${summary.p95FrameMs}ms exceeds ${budget.maxP95FrameMs}ms`],
    [Number(summary.p99FrameMs) > Number(budget.maxP99FrameMs), `p99 frame time ${summary.p99FrameMs}ms exceeds ${budget.maxP99FrameMs}ms`],
    [Number(summary.droppedRenderRatio) > Number(budget.maxDroppedRenderRatio), `dropped render ratio ${summary.droppedRenderRatio} exceeds ${budget.maxDroppedRenderRatio}`],
    [Number(summary.maxLongTaskMs) > Number(budget.maxLongTaskMs), `maximum long task ${summary.maxLongTaskMs}ms exceeds ${budget.maxLongTaskMs}ms`],
    [Number(summary.simulationBacklogMs && summary.simulationBacklogMs.max) > Number(budget.maxSimulationBacklogMs), `simulation backlog ${summary.simulationBacklogMs && summary.simulationBacklogMs.max}ms exceeds ${budget.maxSimulationBacklogMs}ms`]
  ];
  for (const [failed, message] of checks) if (failed) failures.push(message);
  return { pass: failures.length === 0, failures };
}

module.exports = {
  evaluatePerformanceBudget,
  percentile,
  summarizePerformance
};
