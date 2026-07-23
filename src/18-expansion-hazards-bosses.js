function spawnMine(x, y, extra = {}) {
  if (state.debris.filter((d) => d.kind === "mine").length >= 5) return;
  state.debris.push(Object.assign({
    kind: "mine",
    x,
    y,
    vx: rand(-0.18, 0.18),
    vy: 0.78,
    r: 12,
    hp: 2,
    maxHp: 2,
    armTimer: 54,
    armed: false,
    life: 720,
    damage: 1
  }, extra));
}

function spawnAsteroid(kind, x, y, extra = {}) {
  const data = {
    small_debris: { r: 11, hp: 1, vy: 3.2, vx: rand(-0.35, 0.35), damage: 1, color: "#978a80" },
    rock_asteroid: { r: 18, hp: 3, vy: 2.2, vx: rand(-0.24, 0.24), damage: 1, color: "#8f8170" },
    iron_asteroid: { r: 24, hp: 7, vy: 1.45, vx: rand(-0.12, 0.12), damage: 1, color: "#8b9296" },
    comet_shard: { r: 13, hp: 2, vy: 3.7, vx: rand(-0.55, 0.55), damage: 1, color: "#c4eaff", trail: true }
  }[kind] || { r: 16, hp: 2, vy: 2.1, vx: 0, damage: 1, color: "#8f8170" };
  const asteroid = Object.assign({
    kind,
    x,
    y,
    vx: data.vx,
    vy: data.vy,
    r: data.r,
    hp: data.hp,
    maxHp: data.hp,
    damage: data.damage,
    color: data.color,
    trail: !!data.trail,
    life: 780,
    rot: rand(0, TAU),
    vr: rand(-0.035, 0.035),
    spawnScale: 1,
    collisionScale: 1,
    growAge: 0,
    growFrames: 0
  }, extra);
  if (asteroid.growFromZero) {
    asteroid.spawnScale = 0;
    asteroid.collisionScale = 0;
    asteroid.growAge = 0;
    asteroid.growFrames = Math.max(1, Number(asteroid.growFrames || 30));
  }
  state.debris.push(asteroid);
}

function spawnMeteorWarning(x, delay = 48, kind = "rock_asteroid", extra = {}) {
  state.debris.push({
    kind: "meteor_warning",
    x,
    y: H * 0.22 + rand(-24, 36),
    r: 22,
    warn: delay,
    targetKind: kind,
    life: delay + 4,
    spawnExtra: { ...extra }
  });
}

function spawnDebrisWall(gapSlot = 2, opts = {}) {
  const slots = opts.slots || 6;
  const rowY = opts.y == null ? -36 : opts.y;
  const width = W / slots;
  for (let i = 0; i < slots; i++) {
    if (i === gapSlot) continue;
    spawnAsteroid("iron_asteroid", width * (i + 0.5), rowY + rand(-4, 4), {
      kind: "boss_wall",
      hp: 999,
      maxHp: 999,
      r: opts.r || 24,
      vy: opts.vy || 2.0,
      vx: 0,
      color: "#7d7067",
      noScore: true,
      wall: true,
      growFromZero: opts.growFromZero !== false,
      growFrames: opts.growFrames || 32,
      wardenSpawn: true
    });
  }
}

function spawnDebrisField() {
  const lanes = laneCenters();
  const count = 5 + Math.floor(rand(0, state.phase >= 8 ? 3 : 2));
  for (let i = 0; i < count; i++) {
    const kindRoll = Math.random();
    const kind = state.phase >= 8 && kindRoll > 0.86 ? "comet_shard" : kindRoll > 0.68 ? "small_debris" : kindRoll > 0.14 ? "rock_asteroid" : "iron_asteroid";
    const lane = i % 3;
    const jitter = rand(-34, 34);
    spawnAsteroid(kind, lanes[lane] + jitter, -42 - i * 52, { rareEvent: true });
  }
  state.lastDebrisFrame = state.frame;
}

function updateDebrisEvent() {
  if (state.phase < 3 || state.boss || state.bossDeath || state.bossRecovery > 0) return;
  if (state.player.hp <= 1 || state.pressure > 66 || state.enemies.length > 10) {
    state.debrisEventTimer = Math.max(state.debrisEventTimer, 360);
    return;
  }
  if (state.debrisWarningTimer > 0) {
    state.debrisWarningTimer--;
    if (state.debrisWarningTimer === 0) spawnDebrisField();
    return;
  }
  if (state.debris.some((d) => d.rareEvent || d.wall)) return;
  state.debrisEventTimer--;
  if (state.debrisEventTimer <= 0) {
    showMessage("DEBRIS FIELD", 95);
    state.debrisWarningTimer = 78;
    state.debrisEventTimer = Math.floor(1500 + rand(0, 920) + Math.max(0, 7 - state.phase) * 120);
  }
}

function spawnEnergyMine(x, y, extra = {}) {
  state.debris.push(Object.assign({
    kind: "energy_mine",
    x,
    y,
    vx: rand(-0.16, 0.16),
    vy: 0.72,
    r: 13,
    hp: 2,
    maxHp: 2,
    armTimer: 44,
    armed: false,
    life: 720,
    drain: 24
  }, extra));
}

function spawnEnemyBeam(x, y, angle, opts = {}) {
  state.enemyBeams.push({
    x,
    y,
    angle,
    length: opts.length || H * 1.4,
    width: opts.width || 8,
    warn: opts.warn || 0,
    warnMax: opts.warn || 0,
    active: opts.active || 16,
    damage: opts.damage || 0,
    drain: opts.drain || 0,
    color: opts.color || "#ff3046",
    source: opts.source || "beam",
    sweepVx: opts.sweepVx || 0,
    sweepVy: opts.sweepVy || 0
  });
}

function spawnGravityWell(x, y, opts = {}) {
  state.gravityWells.push({
    x,
    y,
    r: opts.r || 76,
    warn: opts.warn || 46,
    warnMax: opts.warn || 46,
    life: opts.life || 190,
    strength: opts.strength || 0.10,
    color: opts.color || "#a45cff",
    drain: opts.drain || 0,
    pulse: rand(0, TAU),
    expanding: !!opts.expanding,
    shrink: !!opts.shrink
  });
}

function pointToBeamDistance(px, py, beam) {
  const dx = Math.cos(beam.angle), dy = Math.sin(beam.angle);
  const relX = px - beam.x, relY = py - beam.y;
  const along = relX * dx + relY * dy;
  if (along < -8 || along > beam.length) return Infinity;
  return Math.abs(relX * dy - relY * dx);
}

function explodeHazard(d) {
  const radius = d.kind === "mine" ? 42 : 36;
  spawnParticles(d.x, d.y, 24, d.kind === "energy_mine" ? "#70ff45" : "#ff8a32", 0.9);
  kickShake(4);
  if (Math.hypot(state.player.x - d.x, state.player.y - d.y) <= radius && state.player.inv <= 0) {
    if (d.kind === "energy_mine") drainPlayerEnergy(d.drain || 24, "energy_mine");
    else damagePlayer(d.damage || 1);
  }
  for (let i = state.enemies.length - 1; i >= 0; i--) {
    const e = state.enemies[i];
    if (Math.hypot(e.x - d.x, e.y - d.y) <= radius) {
      e.hp -= d.kind === "energy_mine" ? 0.5 : 1.5;
      applyEnemyHitFeedback(e);
      if (e.hp <= 0) finishEnemyDestroyed(e, i, false);
    }
  }
}

function updateExpansionHazards() {
  const p = state.player;
  for (let i = state.debris.length - 1; i >= 0; i--) {
    const d = state.debris[i];
    if (d.kind === "meteor_warning") {
      d.warn--;
      d.life--;
      if (d.warn <= 0) {
        spawnAsteroid(d.targetKind || "rock_asteroid", d.x, -38, Object.assign({
          vx: 0,
          vy: d.targetKind === "comet_shard" ? 3.8 : 2.7
        }, d.spawnExtra || {}));
        state.debris.splice(i, 1);
      }
      continue;
    }
    if (d.growFromZero && d.spawnScale < 1) {
      d.growAge = (d.growAge || 0) + 1;
      d.spawnScale = debrisSpawnScale(d.growAge, d.growFrames || 30);
      d.collisionScale = d.spawnScale;
    }
    d.x += d.vx || 0;
    d.y += d.vy || 0;
    d.rot = (d.rot || 0) + (d.vr || 0);
    d.life = (d.life || 600) - 1;
    if (d.armTimer > 0) {
      d.armTimer--;
      if (d.armTimer <= 0) d.armed = true;
    }
    for (let j = state.bullets.length - 1; j >= 0; j--) {
      const b = state.bullets[j];
      if (manifestCollision(
        { key: "player_bullet", x: b.x, y: b.y, fallbackRadius: b.r || 3 },
        { key: d.kind, x: d.x, y: d.y, fallbackRadius: d.r || 12, scale: d.collisionScale == null ? 1 : d.collisionScale }
      )) {
        d.hp -= b.damage || 1;
        b.life = 0;
        spawnParticles(b.x, b.y, 4, "#fff", 0.45);
        if (d.hp <= 0) {
          if (d.kind === "mine" || d.kind === "energy_mine") explodeHazard(d);
          else spawnParticles(d.x, d.y, 16, d.color || "#999", 0.75);
          d.dead = true;
          break;
        }
      }
    }
    if (d.dead) {
      state.debris.splice(i, 1);
      continue;
    }
    if ((d.kind === "mine" || d.kind === "energy_mine") && d.armed && manifestCollision(
      { key: d.kind, x: d.x, y: d.y, fallbackRadius: d.r || 12, scale: d.collisionScale == null ? 1 : d.collisionScale },
      { key: "player", x: p.x, y: p.y, fallbackRadius: 14 }
    )) {
      explodeHazard(d);
      state.debris.splice(i, 1);
      continue;
    }
    if (d.kind !== "mine" && d.kind !== "energy_mine" && manifestCollision(
      { key: d.kind, x: d.x, y: d.y, fallbackRadius: d.r || 12, scale: d.collisionScale == null ? 1 : d.collisionScale },
      { key: "player", x: p.x, y: p.y, fallbackRadius: 14 }
    ) && p.inv <= 0) {
      damagePlayer(d.damage || 1);
      if (!d.wall) d.hp -= 2;
    }
    if (d.kind !== "mine" && d.kind !== "energy_mine") {
      for (let j = state.enemies.length - 1; j >= 0; j--) {
        const e = state.enemies[j];
        if (manifestCollision(
          { key: d.kind, x: d.x, y: d.y, fallbackRadius: d.r || 12, scale: d.collisionScale == null ? 1 : d.collisionScale },
          { key: e.type, x: e.x, y: e.y, fallbackRadius: e.r || 12, scale: e.collisionScale == null ? 1 : e.collisionScale }
        )) {
          e.hp -= d.wall ? 2 : 1.5;
          if (!d.wall) d.hp -= 1;
          applyEnemyHitFeedback(e);
          spawnParticles(e.x, e.y, 5, d.color || "#999", 0.45);
          if (e.hp <= 0) finishEnemyDestroyed(e, j, false);
          if (d.hp <= 0) break;
        }
      }
    }
    if (d.hp <= 0 || d.life <= 0 || d.y > H + 70 || d.x < -70 || d.x > W + 70) {
      state.debris.splice(i, 1);
    }
  }

  for (let i = state.enemyBeams.length - 1; i >= 0; i--) {
    const beam = state.enemyBeams[i];
    beam.x += beam.sweepVx || 0;
    beam.y += beam.sweepVy || 0;
    if (beam.warn > 0) {
      beam.warn--;
    } else {
      beam.active--;
      const d = pointToBeamDistance(p.x, p.y, beam);
      if (d <= beam.width + 12 && p.inv <= 0) {
        if (beam.drain) drainPlayerEnergy(beam.drain, beam.source || "beam");
        if (beam.damage) damagePlayer(beam.damage);
      }
      if (beam.drain && state.frame % 7 === 0) spawnParticles(p.x, p.y, 2, "#70ff45", 0.35);
    }
    if (beam.active <= 0) state.enemyBeams.splice(i, 1);
  }

  for (let i = state.gravityWells.length - 1; i >= 0; i--) {
    const g = state.gravityWells[i];
    if (g.warn > 0) g.warn--;
    else {
      g.life--;
      g.pulse += 0.08;
      if (g.expanding) g.r = Math.min(150, g.r + 1.35);
      if (g.shrink) g.r = Math.max(28, g.r - 0.55);
      const dx = g.x - p.x, dy = g.y - p.y, d = Math.max(1, Math.hypot(dx, dy));
      if (d < g.r) {
        const scale = (1 - d / g.r) * (p.stabilizer > 0 ? 0.5 : 1);
        p.vx += (dx / d) * g.strength * scale;
        p.vy += (dy / d) * g.strength * scale;
        if (g.drain && state.frame % 10 === 0) drainPlayerEnergy(g.drain, "gravity");
      }
    }
    if (g.life <= 0) state.gravityWells.splice(i, 1);
  }
}

function spawnExpansionBoss(mode) {
  const cfg = {
    debris_warden: { w: 148, h: 88, hp: 112 + state.phase * 15, y: 90 },
    mothership: { w: 170, h: 92, hp: 118 + state.phase * 16, y: 92 },
    siphon_core: { w: 142, h: 92, hp: 120 + state.phase * 16, y: 90 },
    hive_breaker: { w: 146, h: 90, hp: 124 + state.phase * 16, y: 92 },
    rail_tyrant: { w: 152, h: 88, hp: 128 + state.phase * 16, y: 90 },
    gravity_well: { w: 150, h: 90, hp: 132 + state.phase * 16, y: 90 }
  }[mode];
  if (!cfg) return false;
  state.boss = {
    mode,
    x: W / 2,
    y: -112,
    w: cfg.w,
    h: cfg.h,
    hp: cfg.hp,
    maxHp: cfg.hp,
    targetY: cfg.y,
    entered: false,
    combatActive: false,
    attackTimer: 86,
    warn: 0,
    warnMax: 0,
    pending: null,
    step: 0,
    movePhase: rand(0, TAU),
    bayOpen: 0,
    threshold70: false,
    threshold45: false,
    threshold25: false
  };
  state.playerRealm = 0;
  state.waveMood = "boss";
  state.waveMoodTimer = 0;
  state.lastWaveTemplateName = null;
  discoverCodex(bossCodexType(mode));
  return true;
}

function expansionBossCooldown(b, hpPct) {
  const base = b.mode === "debris_warden" ? 92 : b.mode === "mothership" ? 76 : b.mode === "rail_tyrant" ? 80 : 72;
  return clamp(Math.round((base - (1 - hpPct) * 24) / clamp(state.difficulty.threat, 0.82, 1.15)), 38, 104);
}

function chooseExpansionBossAttack(b, hpPct) {
  if (b.mode === "siphon_core" && state.player.energy < 16 && b.step % 2 === 0) return "low_energy_pause";
  const seqs = {
    debris_warden: debrisWardenAttackSequence(hpPct),
    mothership: hpPct > 0.35 ? ["launch", "escort", "heavy", "launch"] : ["final", "repair", "heavy", "escort"],
    siphon_core: hpPct > 0.45 ? ["drain_beam", "energy_mines", "pulse"] : ["tether", "pulse", "overcharge", "energy_mines"],
    hive_breaker: hpPct > 0.45 ? ["shard_burst", "guards", "light"] : ["panic", "shard_burst", "guards"],
    rail_tyrant: hpPct > 0.45 ? ["center", "crosshair", "triple"] : ["triple", "sweep", "crosshair"],
    gravity_well: hpPct > 0.45 ? ["well", "orbit", "compression"] : ["pull_gap", "compression", "asteroid_orbit"]
  };
  const seq = seqs[b.mode] || ["light"];
  return seq[b.step % seq.length];
}

function beginExpansionBossAttack(b, attack) {
  b.combatActive = true;
  b.pending = attack;
  b.warn = attack === "light" ? 18 : attack === "launch" || attack === "escort" ? 32 : 44;
  if (b.mode === "rail_tyrant") b.warn = attack === "sweep" ? 50 : 44;
  if (b.mode === "debris_warden" && (attack === "wall" || attack === "double" || attack === "crush")) b.warn = 54;
  if (b.mode === "debris_warden" && attack === "double") {
    const rowSpeed = debrisWardenRowSpeed(b.hp / b.maxHp, "double");
    b.safePlan = createDoubleDebrisPlan({
      width: W,
      asteroidRadius: collisionCircleFor({ key: "boss_wall", x: 0, y: 0, fallbackRadius: 24 }).r,
      playerRadius: collisionCircleFor({ key: "player", x: 0, y: 0, fallbackRadius: 14 }).r,
      playerMaxSpeed: state.player.maxSpeed,
      playerSteer: 0.22,
      rowDistance: 96,
      rowSpeed,
      margin: 8,
      routeMargin: 12
    });
    state.enemyBullets = [];
    state.enemies = [];
    state.debris = state.debris.filter((item) => item.wall);
    state.safeLanes = [
      { ...b.safePlan.first.safe, row: 1, expiresAt: state.frame + 430 },
      { ...b.safePlan.second.safe, row: 2, expiresAt: state.frame + 480 }
    ];
  } else if (b.mode === "debris_warden") {
    b.safePlan = null;
    if (!state.debris.some((item) => item.wall)) state.safeLanes = [];
  }
  b.warnMax = b.warn;
  b.bayOpen = b.warn;
}

function resolveExpansionBossAttack(b, attack) {
  const p = state.player;
  const hpPct = b.hp / b.maxHp;
  if (b.mode === "debris_warden") {
    const rowSpeed = debrisWardenRowSpeed(hpPct, attack);
    if (attack === "wall") {
      spawnDebrisWall(Math.floor(rand(0, 6)), { vy: rowSpeed });
    } else if (attack === "double") {
      const plan = b.safePlan || createDoubleDebrisPlan({ width: W });
      spawnDebrisWall(plan.first.slot, { slots: plan.slots, y: plan.first.y, vy: plan.first.speed });
      spawnDebrisWall(plan.second.slot, { slots: plan.slots, y: plan.second.y, vy: plan.second.speed });
    } else if (attack === "crush") {
      spawnDebrisWall(Math.floor(rand(0, 6)), { slots: 5, y: -44, r: 28, vy: rowSpeed });
    } else if (attack === "meteor") {
      for (let i = 0; i < 4; i++) spawnMeteorWarning(laneX(i % 3) + rand(-26, 26), 44 + i * 8, i === 3 && state.phase >= 9 ? "comet_shard" : "rock_asteroid", {
        growFromZero: true,
        growFrames: 32,
        wardenSpawn: true,
        vy: rowSpeed * (i === 3 && state.phase >= 9 ? 1.28 : 1.12)
      });
    } else if (attack === "rotate") {
      for (let i = 0; i < 5; i++) spawnAsteroid("rock_asteroid", 44 + i * 72, -38 - i * 30, {
        vx: i % 2 === 0 ? -0.55 : 0.55,
        vy: rowSpeed,
        growFromZero: true,
        growFrames: 32,
        wardenSpawn: true
      });
    } else {
      fireAimedBurst(b.x, b.y + 24, p.x, p.y, 3, 18, 3.2, "boss");
    }
  } else if (b.mode === "mothership") {
    const spawnAtBay = (type, offset, extra = {}) => spawnEnemy(type, b.x + offset, b.y + 26, Object.assign({
      forceSpawn: true,
      fromBoss: true,
      bossSpawn: true,
      spawnMode: "boss",
      spawnPhase: "emerge",
      spawnTimer: 18,
      launchTimer: 14,
      spawnOriginX: b.x + offset,
      spawnOriginY: b.y + 26,
      spawnTargetX: clamp(b.x + offset * 2 + rand(-28, 28), 28, W - 28),
      spawnTargetY: b.y + 116,
      recover: 28
    }, extra));
    if (attack === "launch") {
      spawnAtBay(Math.random() < 0.5 ? "red" : "orange", -24);
      if (state.enemies.length < 10) spawnAtBay(Math.random() < 0.5 ? "red" : "orange", 24);
    } else if (attack === "heavy") {
      spawnAtBay(state.phase >= 9 && Math.random() < 0.5 ? "siphon" : "splitter", 0);
    } else if (attack === "escort") {
      spawnAtBay("red", -34);
      spawnAtBay("orange", 0);
      spawnAtBay("red", 34);
    } else if (attack === "repair") {
      spawnAtBay("repair_drone", Math.random() < 0.5 ? -26 : 26, { bossRepair: true });
    } else if (attack === "final") {
      spawnAtBay("orange", -36);
      spawnAtBay(state.phase >= 10 ? "siphon" : "red", 0);
      spawnAtBay("orange", 36);
    }
    b.bayOpen = 32;
  } else if (b.mode === "siphon_core") {
    if (attack === "drain_beam" || attack === "tether") {
      const angle = Math.atan2(p.y - (b.y + 22), p.x - b.x);
      spawnEnemyBeam(b.x, b.y + 22, angle, { warn: 34, active: 34, width: attack === "tether" ? 12 : 9, drain: attack === "tether" ? 2.4 : 3.2, color: "#70ff45", source: "siphon_core" });
    } else if (attack === "energy_mines") {
      spawnEnergyMine(b.x - 44, b.y + 28);
      spawnEnergyMine(b.x + 44, b.y + 28);
    } else if (attack === "pulse") {
      spawnGravityWell(b.x, b.y + 34, { r: 38, warn: 34, life: 92, strength: 0.02, drain: 2.2, color: "#70ff45", expanding: true });
    } else if (attack === "overcharge") {
      if (p.energy > 65) {
        spawnEnemyBeam(b.x, b.y + 22, Math.atan2(p.y - b.y, p.x - b.x), { warn: 36, active: 28, width: 13, drain: 4.0, color: "#70ff45", source: "overcharge" });
      } else {
        spawnEnergyMine(b.x, b.y + 28);
      }
    }
  } else if (b.mode === "hive_breaker") {
    if (attack === "shard_burst" || attack === "panic") {
      const count = attack === "panic" ? 6 : 4;
      for (let i = 0; i < count; i++) {
        const t = count === 1 ? 0 : (i / (count - 1)) * 2 - 1;
        spawnEnemy("splitter_shard", b.x + t * 28, b.y + 26, { forceSpawn: true, vx: t * 2.1, vy: 2.7 + Math.abs(t) * 0.35, fromBoss: true });
      }
    } else if (attack === "guards") {
      spawnEnemy("splitter", b.x - 44, b.y + 22, { forceSpawn: true, fromBoss: true });
      if (state.enemies.length < 10) spawnEnemy("splitter", b.x + 44, b.y + 22, { forceSpawn: true, fromBoss: true });
    } else {
      fireAimedBurst(b.x, b.y + 22, p.x, p.y, 4, 20, 3.0, "boss");
    }
  } else if (b.mode === "rail_tyrant") {
    if (attack === "center") {
      spawnEnemyBeam(W / 2, -10, Math.PI / 2, { warn: 42, active: 18, width: 9, damage: 1, color: "#ff3046", source: "center_lance" });
    } else if (attack === "crosshair") {
      spawnEnemyBeam(p.x, -10, Math.PI / 2, { warn: 44, active: 16, width: 8, damage: 1, color: "#ff3046", source: "crosshair" });
    } else if (attack === "triple") {
      const safe = Math.floor(rand(0, 3));
      for (let lane = 0; lane < 3; lane++) {
        if (lane !== safe) spawnEnemyBeam(laneX(lane), -10, Math.PI / 2, { warn: 44, active: 18, width: 13, damage: 1, color: "#ff3046", source: "triple_lane" });
      }
    } else if (attack === "sweep") {
      const fromLeft = Math.random() < 0.5;
      spawnEnemyBeam(fromLeft ? 36 : W - 36, -10, Math.PI / 2, { warn: 44, active: 72, width: 8, damage: 1, color: "#ff3046", source: "side_sweep", sweepVx: fromLeft ? 1.15 : -1.15 });
    }
  } else if (b.mode === "gravity_well") {
    if (attack === "well") {
      spawnGravityWell(clamp(p.x + rand(-40, 40), 52, W - 52), clamp(p.y - 70, 130, H - 160), { r: 78, warn: 46, life: 160, strength: 0.12 });
    } else if (attack === "compression") {
      spawnGravityWell(W / 2, H * 0.55, { r: 130, warn: 42, life: 150, strength: 0.045, shrink: true, color: "#b86cff" });
    } else if (attack === "orbit") {
      const base = Math.atan2(p.y - b.y, p.x - b.x);
      for (let i = -2; i <= 2; i++) fireAngle(b.x, b.y + 20, base + i * 0.18, 2.65 + Math.abs(i) * 0.1, "boss");
    } else if (attack === "asteroid_orbit") {
      for (let i = 0; i < 3; i++) spawnAsteroid("small_debris", b.x + (i - 1) * 36, b.y + 30, { vx: (i - 1) * 0.35, vy: 2.35 });
    } else if (attack === "pull_gap") {
      spawnGravityWell(W / 2, H * 0.48, { r: 102, warn: 40, life: 120, strength: 0.075 });
      const safe = Math.floor(rand(0, 3));
      for (let lane = 0; lane < 3; lane++) if (lane !== safe) spawnEnemyBeam(laneX(lane), -10, Math.PI / 2, { warn: 46, active: 14, width: 10, damage: 1, color: "#b86cff", source: "pull_gap" });
    }
  }
  b.step++;
}

function updateExpansionBoss() {
  const b = state.boss;
  if (!b || !isExpansionBossMode(b.mode)) return false;
  if (!b.entered) {
    b.y += 0.58;
    if (b.y >= b.targetY) { b.y = b.targetY; b.entered = true; b.attackTimer = 72; }
    return true;
  }
  const hpPct = b.hp / b.maxHp;
  if (state.safeLanes.length) state.safeLanes = state.safeLanes.filter((lane) => lane.expiresAt > state.frame);
  b.x += Math.sin(state.frame * (b.mode === "rail_tyrant" ? 0.018 : 0.024) + b.movePhase) * (b.mode === "mothership" ? 0.55 : 0.78);
  b.x = clamp(b.x, b.w / 2 + 18, W - b.w / 2 - 18);
  b.bayOpen = Math.max(0, (b.bayOpen || 0) - 1);
  if (b.mode === "hive_breaker") {
    if (!b.threshold70 && hpPct < 0.70) { b.threshold70 = true; resolveExpansionBossAttack(b, "guards"); }
    if (!b.threshold45 && hpPct < 0.45) { b.threshold45 = true; resolveExpansionBossAttack(b, "shard_burst"); }
    if (!b.threshold25 && hpPct < 0.25) { b.threshold25 = true; resolveExpansionBossAttack(b, "panic"); }
  }
  if (b.warn > 0) {
    b.warn--;
    if (b.warn <= 0) {
      resolveExpansionBossAttack(b, b.pending);
      b.pending = null;
      b.attackTimer = expansionBossCooldown(b, hpPct);
    }
    return true;
  }
  if (b.combatActive && b.mode === "debris_warden" && state.frame % 140 === 0 && state.debris.filter((d) => d.wall).length === 0) {
    fireAimedBurst(b.x, b.y + 24, state.player.x, state.player.y, 2, 16, 3.0, "boss");
  }
  b.attackTimer--;
  if (b.attackTimer <= 0) {
    b.combatActive = true;
    beginExpansionBossAttack(b, chooseExpansionBossAttack(b, hpPct));
  }
  return true;
}

function handleExpansionBossSpecialHit(bullet, boss) {
  if (!bullet || !boss) return false;
  if (boss.mode === "mothership" && (boss.bayOpen || 0) > 0) {
    const bayY = boss.y + 26;
    const offsets = [-48, 0, 48];
    for (const off of offsets) {
      if (!hitCirclesOverlap(
        { x: bullet.x, y: bullet.y, r: bullet.r || 3 },
        { x: boss.x + off, y: bayY, r: 16 }
      )) continue;
      bullet.life = 0;
      boss.warn = 0;
      boss.warnMax = 0;
      boss.pending = null;
      boss.bayOpen = 0;
      boss.attackTimer = Math.max(boss.attackTimer || 0, 72);
      addFlatScore(25);
      spawnParticles(boss.x + off, bayY, 18, "#ffd47a", 0.75);
      applyBossHitFeedback(boss, boss.x + off, bayY);
      showMessage("BAY DISABLED", 50);
      return true;
    }
  }
  return false;
}
