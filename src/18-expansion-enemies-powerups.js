function spawnCarrierLaunchedEnemy(e) {
  if (state.enemies.length > 12 + state.phase) return;
  const earlyPool = ["red", "orange"];
  const latePool = state.phase >= 9 ? ["red", "orange", "splitter", "siphon"] : ["red", "orange", "red"];
  const pool = e.launchCount < 2 ? earlyPool : latePool;
  const type = pool[Math.floor(Math.random() * pool.length)];
  const side = e.launchCount % 2 === 0 ? -1 : 1;
  const targetLane = chooseLane([]);
  spawnEnemy(type, e.x + side * 11, e.y + 16, {
    forceSpawn: true,
    fromCarrier: true,
    spawnMode: "boss",
    spawnPhase: "emerge",
    spawnTimer: 16,
    launchTimer: 13,
    spawnOriginX: e.x + side * 11,
    spawnOriginY: e.y + 16,
    spawnTargetX: laneX(targetLane) + rand(-16, 16),
    spawnTargetY: e.y + 92,
    recover: 24
  });
  e.launchCount++;
  e.bayOpen = 26;
  spawnParticles(e.x + side * 11, e.y + 18, 10, "#ffd47a", 0.7);
}

function updateExpansionEnemy(e, p, threat, moveScale, margin) {
  if (!isExpansionEnemyType(e.type)) return false;
  e.t += 1;
  const hpPct = e.maxHp ? clamp(e.hp / e.maxHp, 0, 1) : 1;
  if (e.type === "splitter") {
    e.x += Math.sin(e.t * 0.035 + e.driftPhase) * 0.45;
    e.y += e.vy * moveScale;
  } else if (e.type === "splitter_shard") {
    e.x += e.vx;
    e.y += e.vy * moveScale;
    e.vx += Math.sin(e.t * 0.08 + e.loopPhase) * 0.015;
  } else if (e.type === "carrier") {
    e.x += Math.sin(e.t * 0.018 + e.loopPhase) * 0.32;
    e.y += e.vy * (0.75 + moveScale * 0.25);
    e.bayOpen = Math.max(0, (e.bayOpen || 0) - 1);
    e.launchTimer--;
    if (e.launchTimer <= 22) e.bayOpen = Math.max(e.bayOpen || 0, e.launchTimer);
    if (e.launchTimer <= 0) {
      spawnCarrierLaunchedEnemy(e);
      const minDelay = hpPct < 0.45 ? 86 : 108;
      e.launchTimer = Math.floor(minDelay + rand(0, 44) - state.phase * 1.2);
    }
  } else if (e.type === "siphon") {
    e.x += Math.sign(p.x - e.x) * 0.22 + Math.sin(e.t * 0.035 + e.loopPhase) * 0.18;
    e.y += e.vy * moveScale;
    e.fireTimer--;
    e.fireWarn = e.fireTimer > 0 && e.fireTimer <= 22 ? e.fireTimer : 0;
    if (e.fireTimer <= 0 && phantomFrontArcOK({ x: e.x, y: e.y, vx: 0, vy: 1 }, p.x, p.y)) {
      const origin = { x: e.x, y: e.y + 11 };
      const shot = createSiphonShot(origin, p, { x: p.vx, y: p.vy }, { speed: 3.05 + state.phase * 0.025, extraRange: H * 0.38 });
      fireEnemyBullet(origin.x, origin.y, shot.vx, shot.vy, "drainShot", {
        r: 5.5,
        damage: 0,
        drain: 22,
        life: shot.life,
        curving: 0,
        targetX: shot.aimX,
        targetY: shot.aimY,
        intendedRange: shot.range,
        maxSpeed: 4.8
      });
      e.fireTimer = Math.floor(112 + rand(-20, 28) - state.phase * 1.5);
      e.fireWarn = 0;
    }
  } else if (e.type === "leech") {
    const targetY = H * 0.30 + Math.sin(e.t * 0.025 + e.loopPhase) * 28;
    e.x += Math.sign(p.x - e.x) * (0.30 + threat * 0.08);
    e.y += (targetY - e.y) * 0.018 + e.vy * 0.18;
    const d = Math.hypot(p.x - e.x, p.y - e.y);
    if (e.tetherActive) {
      if (d > 225 || p.ghostTimer > 0) {
        e.tetherActive = false;
        e.lockTimer = 74;
      } else {
        e.tetherDrainFrame = (e.tetherDrainFrame || 0) + 1;
        if (e.tetherDrainFrame % 8 === 0) drainPlayerEnergy(2.6, "leech");
      }
    } else {
      e.lockTimer--;
      if (e.lockTimer <= 0 && d < 188) {
        e.tetherActive = true;
        e.tetherDrainFrame = 0;
        spawnParticles(e.x, e.y, 12, "#1cff78", 0.6);
      } else if (e.lockTimer <= 0) {
        e.lockTimer = 24;
      }
    }
  } else if (e.type === "minecaster") {
    e.x += Math.sin(e.t * 0.028 + e.loopPhase) * 0.28;
    e.y += e.vy * moveScale;
    if (!state.boss && state.debris.filter((d) => d.kind === "mine").length < 4) {
      e.mineTimer--;
      if (e.mineTimer <= 0 && e.minesDropped < 2) {
        spawnMine(e.x + rand(-10, 10), e.y + 16);
        e.minesDropped++;
        e.mineTimer = Math.floor(rand(86, 128));
      }
    }
  } else if (e.type === "shieldbearer") {
    e.x += Math.sin(e.t * 0.025 + e.loopPhase) * 0.18;
    e.y += e.vy * moveScale;
    e.shieldPulse = (e.shieldPulse || 0) + 0.06;
  } else if (e.type === "railgunner") {
    e.x += Math.sin(e.t * 0.02 + e.loopPhase) * (e.railWarn > 0 ? 0.05 : 0.22);
    e.y += e.vy * (e.railWarn > 0 ? 0.28 : moveScale);
    if (e.railWarn > 0) {
      e.railWarn--;
      if (e.railWarn <= 0) {
        spawnEnemyBeam(e.x, e.y + 13, e.railAngle, {
          active: 14,
          width: 7,
          damage: 1,
          color: "#ff3046",
          source: "railgunner"
        });
        e.railCooldown = Math.floor(132 + rand(-18, 34));
        kickShake(5);
      }
    } else {
      e.railCooldown--;
      if (e.railCooldown <= 0) {
        e.railAngle = Math.atan2(p.y - (e.y + 13), p.x - e.x);
        e.railWarn = Math.floor(38 + rand(0, 8));
      }
    }
  } else if (e.type === "repair_drone") {
    if (e.bossRepair && state.boss && state.boss.mode === "mothership" && state.boss.hp < state.boss.maxHp) {
      const boss = state.boss;
      e.repairTargetId = "boss";
      e.x += Math.sign(boss.x - e.x) * 0.34;
      e.y += Math.sign((boss.y + 18) - e.y) * 0.22 + e.vy * 0.12;
      const d = Math.hypot(boss.x - e.x, boss.y + 18 - e.y);
      e.repairTimer--;
      if (d < 96 && e.repairTimer <= 0) {
        boss.hp = Math.min(boss.maxHp, boss.hp + 1.2);
        spawnParticles(boss.x, boss.y + 18, 8, "#9fffc0", 0.45);
        e.repairTimer = 44;
      }
      e.x = clamp(e.x, margin, W - margin);
      return true;
    }
    const target = findRepairDroneTarget(e);
    if (target) {
      e.repairTargetId = target.id;
      e.x += Math.sign(target.x - e.x) * 0.36;
      e.y += Math.sign(target.y - e.y) * 0.24 + e.vy * 0.24;
      const d = Math.hypot(target.x - e.x, target.y - e.y);
      e.repairTimer--;
      if (d < 88 && e.repairTimer <= 0) {
        target.hp = Math.min(target.maxHp, target.hp + 0.5);
        target.hitPulse = Math.max(target.hitPulse || 0, 0.8);
        spawnParticles(target.x, target.y, 6, "#9fffc0", 0.45);
        e.repairTimer = 42;
      }
    } else {
      e.repairTargetId = null;
      e.x += Math.sin(e.t * 0.05 + e.loopPhase) * 0.24;
      e.y += e.vy * moveScale;
    }
  }
  e.x = clamp(e.x, margin, W - margin);
  return true;
}

function findRepairDroneTarget(drone) {
  let best = null, bestD = Infinity;
  for (const e of state.enemies) {
    if (e === drone || e.type === "repair_drone" || e.type === "splitter_shard") continue;
    if (e.hp >= e.maxHp || e.maxHp <= 1) continue;
    const d = Math.hypot(e.x - drone.x, e.y - drone.y);
    if (d < bestD) { best = e; bestD = d; }
  }
  return best;
}

function updateExpansionSupportEffects() {
  for (const e of state.enemies) {
    e.shieldedBy = null;
    e.isRepairTarget = false;
    e.shieldCooldown = Math.max(0, (e.shieldCooldown || 0) - 1);
  }
  for (const s of state.enemies) {
    if (s.type !== "shieldbearer" || s.hp <= 0) continue;
    for (const e of state.enemies) {
      if (e === s || e.hp <= 0 || e.shieldedBy) continue;
      if (e.type === "phantom" && e.stateMode === "ghost") continue;
      if (Math.hypot(e.x - s.x, e.y - s.y) <= 94) e.shieldedBy = s.id;
    }
  }
  for (const d of state.enemies) {
    if (d.type !== "repair_drone" || !d.repairTargetId) continue;
    const target = state.enemies.find((e) => e.id === d.repairTargetId);
    if (target) target.isRepairTarget = true;
  }
}

function applyEnemyDamageModifiers(e, damage, bullet) {
  if (!e || damage <= 0) return 0;
  if (e.shieldedBy && e.type !== "shieldbearer" && (e.shieldCooldown || 0) <= 0) {
    e.shieldCooldown = 62;
    spawnParticles(e.x, e.y, 10, "#ffe45c", 0.55);
    if (bullet) bullet.life = 0;
    return 0;
  }
  return damage;
}

function enemyDropsBlocked(e) {
  return !!(e && (e.noPowerup || e.type === "splitter_shard"));
}

function onEnemyDestroyed(e) {
  if (!e) return;
  if (e.type === "splitter") {
    const cap = activeEnemyTypeCount("splitter_shard");
    if (cap < 8) {
      spawnEnemy("splitter_shard", e.x - 4, e.y + 3, { forceSpawn: true, vx: -1.85, vy: 2.9, noPowerup: true });
      spawnEnemy("splitter_shard", e.x + 4, e.y + 3, { forceSpawn: true, vx: 1.85, vy: 2.9, noPowerup: true });
    }
  } else if (e.type === "carrier" && (e.launchCount || 0) === 0) {
    addFlatScore(120);
    showMessage("CARRIER BONUS", 55);
  }
}

function finishEnemyDestroyed(e, index, allowDrop = true) {
  if (!e || index < 0) return;
  noteKill(e.reward || enemyScoreForType(e.type));
  spawnDeathBurst(e.x, e.y, e.type === "purple" ? 22 : e.type === "phantom" ? 18 : e.type === "carrier" ? 24 : 14);
  onEnemyDestroyed(e);
  if (allowDrop && !enemyDropsBlocked(e)) {
    if (shouldDropPowerupNow()) { dropPowerup(e.x, e.y); registerPowerupDrop(240, 360); }
    else state.killsSinceLastDrop++;
  }
  state.enemies.splice(index, 1);
}

function drainPlayerEnergy(amount, source = "drain") {
  const p = state.player;
  if (!p || amount <= 0) return 0;
  const mitigated = p.stabilizer > 0 ? amount * 0.5 : amount;
  const before = p.energy;
  p.energy = clamp(p.energy - mitigated, 0, p.maxEnergy);
  if (before > p.energy) {
    state.difficulty.ghostGrace = Math.max(state.difficulty.ghostGrace, 18);
    if (source !== "passive" && state.frame % 6 === 0) spawnParticles(p.x, p.y, 3, "#70ff45", 0.45);
  }
  return before - p.energy;
}

function consumePhaseShieldOnDamage(amount = 1) {
  const p = state.player;
  if (!p || p.phaseShield <= 0) return false;
  p.phaseShield = 0;
  p.inv = Math.max(p.inv, 42);
  state.fx.flash = Math.max(state.fx.flash, 8);
  kickShake(amount >= 2 ? 8 : 5);
  spawnParticles(p.x, p.y, 18, "#d8f7ff", 0.9);
  showMessage("PHASE SHIELD BROKEN", 55);
  return true;
}

function tickExpansionPlayerTimers() {
  const p = state.player;
  if (!p) return;
  p.overcharge = Math.max(0, (p.overcharge || 0) - 1);
  p.magnet = Math.max(0, (p.magnet || 0) - 1);
  p.piercing = Math.max(0, (p.piercing || 0) - 1);
  p.stabilizer = Math.max(0, (p.stabilizer || 0) - 1);
  p.scoreSurge = Math.max(0, (p.scoreSurge || 0) - 1);
}

function pickExpansionPowerupType(lowHp = false) {
  if (state.phase < 3 && state.player.energy > 70) return null;
  let chance = state.phase >= 5 ? 0.30 : 0.18;
  if (state.enemies.some((e) => e.type === "siphon" || e.type === "leech")) chance += 0.18;
  if (state.player.energy < 45) chance += 0.12;
  if (lowHp) chance -= 0.06;
  if (Math.random() > clamp(chance, 0.08, 0.52)) return null;
  const pool = [];
  const add = (type, weight) => { for (let i = 0; i < weight; i++) pool.push(type); };
  if (state.player.energy < 85 || state.phase >= 5) add("energy_cell", 5);
  if (state.phase >= 4) add("magnet", lowHp ? 4 : 3);
  if (state.phase >= 4 && !lowHp) add("piercing", 3);
  if (state.phase >= 5) add("overcharge", 2);
  if (state.phase >= 5) add("phase_shield", lowHp ? 4 : 2);
  if (state.phase >= 5 && !lowHp) add("ion_burst", 1);
  if (state.phase >= 6) add("stabilizer", 3);
  if (state.phase >= 6 && !lowHp && !state.boss) add("score_surge", 2);
  if (!pool.length) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

function expansionPowerupVisual(type) {
  const map = {
    energy_cell: { color: "#58d8ff", label: "E" },
    overcharge: { color: "#7cff66", label: "O" },
    phase_shield: { color: "#d8f7ff", label: "P" },
    magnet: { color: "#ff82f2", label: "M" },
    piercing: { color: "#ffffff", label: "I" },
    ion_burst: { color: "#8fe8ff", label: "B" },
    stabilizer: { color: "#baff7d", label: "Z" },
    score_surge: { color: "#ffd84d", label: "$" }
  };
  return map[type] || null;
}

function applyExpansionPowerup(pu) {
  const p = state.player;
  if (!pu || !p) return false;
  if (pu.type === "energy_cell") {
    p.energy = clamp(p.energy + 48, 0, p.maxEnergy);
    showMessage("ENERGY CELL", 90);
  } else if (pu.type === "overcharge") {
    p.overcharge = Math.max(p.overcharge || 0, 780);
    showMessage("OVERCHARGE", 90);
  } else if (pu.type === "phase_shield") {
    p.phaseShield = 1;
    showMessage("PHASE SHIELD", 90);
  } else if (pu.type === "magnet") {
    p.magnet = Math.max(p.magnet || 0, 720);
    showMessage("MAGNET FIELD", 90);
  } else if (pu.type === "piercing") {
    p.piercing = Math.max(p.piercing || 0, 660);
    showMessage("PIERCING SHOT", 90);
  } else if (pu.type === "ion_burst") {
    activateIonBurst();
    showMessage("ION BURST", 90);
  } else if (pu.type === "stabilizer") {
    p.stabilizer = Math.max(p.stabilizer || 0, 660);
    showMessage("STABILIZER", 90);
  } else if (pu.type === "score_surge") {
    p.scoreSurge = Math.max(p.scoreSurge || 0, 600);
    showMessage("SCORE SURGE", 90);
  } else {
    return false;
  }
  spawnParticles(pu.x, pu.y, 16, expansionPowerupVisual(pu.type).color, 0.8);
  return true;
}

function activateIonBurst() {
  const p = state.player;
  const radius = 132;
  state.enemyBullets = state.enemyBullets.filter((b) => {
    if (Math.hypot(b.x - p.x, b.y - p.y) <= radius) {
      spawnParticles(b.x, b.y, 3, "#8fe8ff", 0.5);
      return false;
    }
    return true;
  });
  for (let i = state.enemies.length - 1; i >= 0; i--) {
    const e = state.enemies[i];
    if (Math.hypot(e.x - p.x, e.y - p.y) <= radius) {
      e.hp -= e.type === "purple" || e.type === "carrier" ? 1.3 : 2;
      applyEnemyHitFeedback(e);
      if (e.hp <= 0) finishEnemyDestroyed(e, i, false);
    }
  }
  spawnParticles(p.x, p.y, 46, "#8fe8ff", 1.15);
  state.fx.flash = Math.max(state.fx.flash, 9);
  kickShake(7);
}
