function simulateReachableDistance(frames, maxSpeed = 5.2, steer = 0.16) {
  let velocity = 0;
  let distance = 0;
  for (let frame = 0; frame < Math.max(0, Math.floor(frames)); frame++) {
    velocity += (maxSpeed - velocity) * steer;
    velocity = Math.min(maxSpeed, velocity);
    distance += velocity;
  }
  return distance;
}

function debrisGapCenter(slot, slots = 6, width = 375) {
  return (width / slots) * (slot + 0.5);
}

function debrisSafeGap(slot, options = {}) {
  const slots = options.slots || 6;
  const width = options.width || 375;
  const asteroidRadius = options.asteroidRadius == null ? 20.5 : options.asteroidRadius;
  const playerRadius = options.playerRadius == null ? 9 : options.playerRadius;
  const margin = options.margin == null ? 8 : options.margin;
  const slotWidth = width / slots;
  const center = debrisGapCenter(slot, slots, width);
  const clearance = asteroidRadius + playerRadius + margin;
  const leftObstacle = slot > 0 ? center - slotWidth : 0;
  const rightObstacle = slot < slots - 1 ? center + slotWidth : width;
  const minX = slot > 0 ? leftObstacle + clearance : playerRadius + margin;
  const maxX = slot < slots - 1 ? rightObstacle - clearance : width - playerRadius - margin;
  return { slot, center: Math.max(minX, Math.min(maxX, center)), minX, maxX, width: Math.max(0, maxX - minX) };
}

function createDoubleDebrisPlan(options = {}) {
  const rng = typeof options.rng === "function" ? options.rng : Math.random;
  const slots = options.slots || 6;
  const width = options.width || 375;
  const rowDistance = options.rowDistance == null ? 92 : options.rowDistance;
  const rowSpeed = options.rowSpeed == null ? 2 : options.rowSpeed;
  const reactionFrames = Math.max(1, Math.floor(rowDistance / rowSpeed));
  const reachable = simulateReachableDistance(reactionFrames, options.playerMaxSpeed || 5.2, options.playerSteer || 0.16);
  const firstSlot = Math.max(0, Math.min(slots - 1, Math.floor(rng() * slots)));
  const firstGap = debrisSafeGap(firstSlot, { ...options, slots, width });
  const candidates = [];
  for (let slot = 0; slot < slots; slot++) {
    const gap = debrisSafeGap(slot, { ...options, slots, width });
    const travel = Math.abs(gap.center - firstGap.center);
    if (gap.width > 0 && travel <= Math.max(0, reachable - (options.routeMargin || 10))) candidates.push({ gap, travel });
  }
  const useful = candidates.filter((candidate) => candidate.gap.slot !== firstSlot);
  const pool = useful.length ? useful : candidates;
  const chosen = pool[Math.max(0, Math.min(pool.length - 1, Math.floor(rng() * pool.length)))] || { gap: firstGap, travel: 0 };
  return {
    slots,
    width,
    reactionFrames,
    reachable,
    first: { slot: firstSlot, y: -36, speed: rowSpeed, safe: firstGap },
    second: { slot: chosen.gap.slot, y: -36 - rowDistance, speed: rowSpeed, safe: chosen.gap },
    travelRequired: chosen.travel
  };
}

function validateDoubleDebrisPlan(plan, options = {}) {
  if (!plan || !plan.first || !plan.second) return { ok: false, reason: "missing_rows" };
  const minimumGapWidth = options.minimumGapWidth == null ? 20 : options.minimumGapWidth;
  if (plan.first.safe.width < minimumGapWidth || plan.second.safe.width < minimumGapWidth) return { ok: false, reason: "narrow_gap" };
  if (plan.travelRequired > plan.reachable - (options.routeMargin || 10)) return { ok: false, reason: "unreachable" };
  return { ok: true, reason: "reachable" };
}

function debrisWardenAttackSequence(hpPct) {
  const ratio = Math.max(0, Math.min(1, Number(hpPct == null ? 1 : hpPct)));
  if (ratio > 0.62) return ["wall", "light", "wall", "meteor", "wall", "double", "rotate"];
  if (ratio > 0.30) return ["wall", "meteor", "wall", "crush", "rotate", "wall", "double", "light"];
  return ["wall", "crush", "meteor", "wall", "rotate", "wall", "double", "meteor"];
}

function debrisWardenRowSpeed(hpPct, attack = "wall") {
  const ratio = Math.max(0, Math.min(1, Number(hpPct == null ? 1 : hpPct)));
  const pressure = 1 - ratio;
  const base = 1.82 + pressure * 1.28;
  const multiplier = attack === "double" ? 0.88 : attack === "crush" ? 0.84 : 1;
  return Math.round(base * multiplier * 100) / 100;
}

function debrisSpawnScale(age, duration = 30) {
  const t = Math.max(0, Math.min(1, Number(age || 0) / Math.max(1, Number(duration || 1))));
  return t * t * (3 - 2 * t);
}

function bossCanTakeDamage(boss) {
  return !!boss && boss.entered === true && boss.combatActive === true;
}

function createSiphonShot(origin, target, targetVelocity = {}, options = {}) {
  const speed = options.speed || 3.15;
  const dx = Number(target.x || 0) - Number(origin.x || 0);
  const dy = Number(target.y || 0) - Number(origin.y || 0);
  const distance = Math.max(1, Math.hypot(dx, dy));
  const leadFrames = Math.min(12, Math.max(0, distance / speed * 0.14));
  const aimX = Number(target.x || 0) + Math.max(-2.5, Math.min(2.5, Number(targetVelocity.x || 0))) * leadFrames;
  const aimY = Number(target.y || 0) + Math.max(-2.5, Math.min(2.5, Number(targetVelocity.y || 0))) * leadFrames;
  const aimDx = aimX - Number(origin.x || 0);
  const aimDy = aimY - Number(origin.y || 0);
  const magnitude = Math.max(1, Math.hypot(aimDx, aimDy));
  const life = Math.max(210, Math.ceil((distance + (options.extraRange || 220)) / speed));
  return {
    vx: aimDx / magnitude * speed,
    vy: aimDy / magnitude * speed,
    speed,
    life,
    range: speed * life,
    aimX,
    aimY,
    leadFrames
  };
}

function ghostActionProfile(bossMode) {
  if (bossMode === "debris_warden") return { label: "DASH", cost: 30, cooldown: 24, burst: 5.8, phaseThroughDebris: false };
  if (bossMode === "wraith") return { label: "HOP", cost: 18, cooldown: 0, burst: 0, phaseThroughDebris: true };
  return { label: "GHOST", cost: 35, cooldown: 20, burst: 4.6, phaseThroughDebris: true };
}

globalThis.simulateReachableDistance = simulateReachableDistance;
globalThis.debrisSafeGap = debrisSafeGap;
globalThis.createDoubleDebrisPlan = createDoubleDebrisPlan;
globalThis.validateDoubleDebrisPlan = validateDoubleDebrisPlan;
globalThis.debrisWardenAttackSequence = debrisWardenAttackSequence;
globalThis.debrisWardenRowSpeed = debrisWardenRowSpeed;
globalThis.debrisSpawnScale = debrisSpawnScale;
globalThis.bossCanTakeDamage = bossCanTakeDamage;
globalThis.createSiphonShot = createSiphonShot;
globalThis.ghostActionProfile = ghostActionProfile;
