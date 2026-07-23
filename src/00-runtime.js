const SIMULATION_HZ = 60;
const SIMULATION_STEP_MS = 1000 / SIMULATION_HZ;

function createFixedStepClock(options = {}) {
  return {
    stepMs: Number(options.stepMs) > 0 ? Number(options.stepMs) : SIMULATION_STEP_MS,
    maxDeltaMs: Number(options.maxDeltaMs) > 0 ? Number(options.maxDeltaMs) : 200,
    maxSteps: Number(options.maxSteps) > 0 ? Math.floor(Number(options.maxSteps)) : 8,
    lastTimestamp: null,
    accumulator: 0
  };
}

function resetFixedStepClock(clock, timestamp = null) {
  clock.lastTimestamp = Number.isFinite(Number(timestamp)) ? Number(timestamp) : null;
  clock.accumulator = 0;
  return clock;
}

function advanceFixedStep(clock, timestamp, simulate) {
  if (!clock || typeof simulate !== "function") throw new TypeError("A fixed-step clock and simulation callback are required");
  const now = Number(timestamp);
  if (!Number.isFinite(now)) throw new TypeError("Animation timestamp must be finite");
  if (clock.lastTimestamp == null) {
    clock.lastTimestamp = now;
    return { steps: 0, alpha: 0, deltaMs: 0, droppedMs: 0 };
  }
  const rawDelta = Math.max(0, now - clock.lastTimestamp);
  const deltaMs = Math.min(rawDelta, clock.maxDeltaMs);
  let droppedMs = Math.max(0, rawDelta - deltaMs);
  clock.lastTimestamp = now;
  clock.accumulator += deltaMs;
  let steps = 0;
  const epsilon = 0.000001;
  while (clock.accumulator + epsilon >= clock.stepMs && steps < clock.maxSteps) {
    simulate(clock.stepMs);
    clock.accumulator -= clock.stepMs;
    steps++;
  }
  if (clock.accumulator + epsilon >= clock.stepMs) {
    const retained = clock.accumulator % clock.stepMs;
    droppedMs += clock.accumulator - retained;
    clock.accumulator = retained;
  }
  if (clock.accumulator < 0 && clock.accumulator > -epsilon) clock.accumulator = 0;
  return {
    steps,
    alpha: Math.max(0, Math.min(0.999999, clock.accumulator / clock.stepMs)),
    deltaMs,
    droppedMs
  };
}

globalThis.SIMULATION_HZ = SIMULATION_HZ;
globalThis.SIMULATION_STEP_MS = SIMULATION_STEP_MS;
globalThis.createFixedStepClock = createFixedStepClock;
globalThis.resetFixedStepClock = resetFixedStepClock;
globalThis.advanceFixedStep = advanceFixedStep;
