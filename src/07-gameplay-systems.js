function resolveEnemySpacing() {
  const margin = 20;
  const active = [];
  for (const e of state.enemies) if (!e.escape && e.launchFrames <= 0 && e.spawnMode !== "boss") active.push(e);
  for (let i = 0; i < active.length; i++) {
    const a = active[i];
    for (let j = i + 1; j < active.length; j++) {
      const b = active[j];
      const dx = b.x - a.x, dy = b.y - a.y, dist = Math.hypot(dx, dy), minDist = a.r + b.r + 8;
      if (dist > 0.001 && dist < minDist) {
        const push = (minDist - dist) / dist * 0.28;
        const ax = dx * push * 0.5, ay = dy * push * 0.5;
        a.x -= ax; a.y -= ay; b.x += ax; b.y += ay;
      }
    }
  }
  for (const e of state.enemies) e.x = clamp(e.x, margin, W - margin);
}

function playerVisualTransform(player = state.player, frame = state.frame) {
  const x = Number(player && player.x) || 0;
  const y = Number(player && player.y) || 0;
  return {
    x,
    y: y + Math.sin(frame * 0.18 + x * 0.02) * 0.6,
    rotation: clamp((Number(player && player.vx) || 0) / 80, -0.06, 0.06),
    scale: 1
  };
}

function enemyVisualTransform(enemy) {
  const x = Number(enemy && enemy.x) || 0;
  const y = Number(enemy && enemy.y) || 0;
  const previousX = Number.isFinite(enemy && enemy.prevX) ? enemy.prevX : x;
  const previousY = Number.isFinite(enemy && enemy.prevY) ? enemy.prevY : y;
  const dx = x - previousX;
  const dy = y - previousY;
  const fallbackY = enemy && enemy.escape ? -1 : 1;
  const rotation = Number.isFinite(enemy && enemy.visualHeading)
    ? enemy.visualHeading
    : Math.atan2(Math.hypot(dx, dy) > 0.001 ? dy : fallbackY, Math.hypot(dx, dy) > 0.001 ? dx : 0) - Math.PI / 2;
  const arrivalScale = Number.isFinite(enemy && enemy.tutorialVisualScale) ? enemy.tutorialVisualScale : 1;
  const hitScale = 1 + Math.min(0.12, (Number(enemy && enemy.hitPulse) || 0) * 0.08);
  const typeScale = enemy && enemy.type === "red" ? 1.05 : 1;
  const collisionScale = Number.isFinite(enemy && enemy.collisionScale) ? enemy.collisionScale : 1;
  return { x, y, rotation, scale: hitScale * arrivalScale * typeScale * collisionScale };
}

function bossVisualTransform(boss, frame = state.frame) {
  const x = Number(boss && boss.x) || 0;
  const y = Number(boss && boss.y) || 0;
  if (boss && boss.mode === "wraith") {
    const phase = Number(boss.movePhase) || 0;
    return {
      x,
      y: y + Math.sin(frame * 0.045 + phase) * 2.2,
      rotation: Math.sin(frame * 0.02 + phase) * 0.04,
      scale: 1
    };
  }
  if (!boss || boss.mode === "standard") {
    return {
      x,
      y: y + Math.sin(frame * 0.05 + (Number(boss && boss.step) || 0)) * 1.4,
      rotation: Math.sin(frame * 0.03) * 0.02,
      scale: 1
    };
  }
  const phase = Number(boss.movePhase) || 0;
  return {
    x,
    y: y + Math.sin(frame * 0.04 + phase) * 1.5,
    rotation: Math.sin(frame * 0.022 + phase) * 0.025,
    scale: 1 + Math.min(0.055, (Number(boss.hitPulse) || 0) * 0.045)
  };
}

function playerCollisionBody(player = state.player) {
  return { key: "player", ...playerVisualTransform(player), fallbackRadius: 14 };
}

function enemyCollisionBody(enemy) {
  return { key: enemy.type, ...enemyVisualTransform(enemy), fallbackRadius: enemy.r || 12 };
}

function bossCollisionBody(boss) {
  return { key: bossSpriteKey(boss.mode), ...bossVisualTransform(boss), fallbackRadius: Math.max(18, (boss.w || 80) * 0.32) };
}

function updateEnemies() {
  const margin = 20;
  const p = state.player;
  const threat = state.difficulty.threat;
  const purpleCrowd = activePurpleCount();
  for (const e of state.enemies) {
    e.prevX = e.x; e.prevY = e.y;
    e.hitFlash = Math.max(0, (e.hitFlash || 0) - 1);
    e.hitPulse = Math.max(0, (e.hitPulse || 0) - 0.12);
    if (e.tutorialArrival && !e.tutorialArrivalComplete) {
      const arrival = e.tutorialArrival;
      arrival.elapsed++;
      if (arrival.elapsed < 0) {
        e.tutorialVisualAlpha = 0;
        e.tutorialVisualScale = 0.56;
        continue;
      }
      const visual = tutorialArrivalVisual(arrival.elapsed, arrival.duration);
      const position = tutorialTransitPosition(arrival.from, arrival.to, arrival.elapsed, arrival.duration);
      e.x = position.x;
      e.y = position.y;
      e.tutorialVisualAlpha = visual.alpha;
      e.tutorialVisualScale = visual.scale;
      e.vx = 0;
      e.vy = 0;
      e.fireTimer = 99999;
      e.shoot = 99999;
      if (visual.progress >= 1) {
        e.tutorialArrivalComplete = true;
        e.tutorialVisualAlpha = 1;
        e.tutorialVisualScale = 1;
      }
      continue;
    }
    if (e.entryFrames > 0 && e.spawnMode !== "boss") {
      e.entryFrames--;
      e.y += 0.62;
      e.x += Math.sin((state.frame + e.id) * 0.06) * (e.type === "orange" ? 0.26 : 0.14);
      if (e.type === "purple") e.x += Math.sign(p.x - e.x) * 0.08;
      continue;
    }
    if (e.tutorialTarget) {
      const holdX = Number.isFinite(e.tutorialHoldX) ? e.tutorialHoldX : e.x;
      const holdY = Number.isFinite(e.tutorialHoldY) ? e.tutorialHoldY : 210;
      const sweep = e.tutorialPath === "slow_sweep"
        ? Math.sin((state.frame + e.id * 17) * 0.015) * (e.type === "orange" ? 34 : 20)
        : 0;
      e.x += (holdX + sweep - e.x) * 0.08;
      e.y += (holdY - e.y) * 0.08;
      e.vx = 0;
      e.vy = 0;
      e.fireTimer = 99999;
      e.shoot = 99999;
      e.warn = 0;
      continue;
    }
    if (e.spawnMode === "boss") {
      if (e.spawnPhase === "emerge") {
        const t = 1 - (e.spawnTimer / 18);
        const eased = easeOutCubic(clamp(t, 0, 1));
        e.x = e.spawnOriginX + Math.sin(state.frame * 0.08 + e.loopPhase) * 2.5;
        e.y = e.spawnOriginY + eased * 20;
        e.spawnTimer--;
        if (e.spawnTimer <= 0) {
          e.spawnPhase = "launch";
          e.spawnTimer = e.launchTimer;
          e.launchFromX = e.x;
          e.launchFromY = e.y;
        }
        continue;
      }
      if (e.spawnPhase === "launch") {
        const t = 1 - (e.spawnTimer / e.launchTimer);
        const eased = easeOutCubic(clamp(t, 0, 1));
        e.x = e.launchFromX + (e.spawnTargetX - e.launchFromX) * eased;
        e.y = e.launchFromY + (e.spawnTargetY - e.launchFromY) * eased;
        e.spawnTimer--;
        if (e.spawnTimer <= 0) {
          e.spawnMode = null; e.spawnPhase = null;
          e.x = e.spawnTargetX; e.y = e.spawnTargetY;
          e.recover = 18;
          e.vx = 0;
          e.vy = (e.type === "orange" ? 2.9 : (e.type === "purple" ? 1.2 : 2.0)) + state.phase * 0.04;
          e.turnTimer = enemyMotionRand(10, 28);
          e.driftPhase = enemyMotionRand(0, TAU);
          e.driftDir = enemyMotionRandom() < 0.5 ? -1 : 1;
        }
        continue;
      }
    }
    if (e.launchFrames > 0) {
      e.x += e.launchVX; e.y += e.launchVY; e.launchFrames--;
      e.x = clamp(e.x, margin, W - margin);
      continue;
    }
    if (!e.escape) {
      const moveScale = 0.92 + threat * 0.08;
      if (e.recover > 0) e.recover--;
      if (typeof updateExpansionEnemy === "function" && updateExpansionEnemy(e, p, threat, moveScale, margin)) {
        // Expansion enemies handle their own readable movement and attack timers.
      } else if (e.type === "red") {
        e.t += 1;
        if (enemyMotionRandom() < 0.012) e.driftDir *= -1;
        e.x += Math.sin(e.t * 0.03 + e.driftPhase) * e.driftPower * e.driftDir;
        e.y += e.vy * moveScale;
      } else if (e.type === "orange") {
        e.t += 1;
        const t = e.t;
        if (e.turnTimer <= 0) {
          e.turnTimer = enemyMotionRand(12, 34);
          const edgeBiasLeft = e.x > W * 0.5;
          const r = enemyMotionRandom();
          if (e.motion === "snap" || r > 0.83) {
            e.turnDir = enemyMotionRandom() < 0.5 ? -1 : 1;
            if (e.x < margin + 48) e.turnDir = 1;
            if (e.x > W - margin - 48) e.turnDir = -1;
            e.snapTimer = enemyMotionRand(8, 16);
          } else {
            e.snapTimer = 0;
            if (r < 0.50) e.turnDir = enemyMotionRandom() < 0.5 ? -1 : 1;
            else if (r < 0.72) e.turnDir = edgeBiasLeft ? -1 : 1;
            else e.turnDir = edgeBiasLeft ? 1 : -1;
          }
          const vyBase = 2.25 + state.phase * 0.12;
          const vxBase = 2.4 + state.phase * 0.22;
          if (e.motion === "zigzag") {
            e.vx = (enemyMotionRandom() < 0.5 ? -1 : 1) * (vxBase + enemyMotionRand(0.2, 2.0));
            e.vy = vyBase + enemyMotionRand(0.1, 0.8);
          } else if (e.motion === "burst") {
            e.vx = (e.turnDir || 1) * (vxBase + enemyMotionRand(1.2, 2.7));
            e.vy = vyBase + enemyMotionRand(0.2, 0.9);
          } else if (e.motion === "chain") {
            e.vx = (enemyMotionRandom() < 0.5 ? -1 : 1) * (vxBase + enemyMotionRand(0.4, 1.8));
            e.vy = vyBase + enemyMotionRand(0.15, 0.7);
          } else if (e.motion === "sweep") {
            e.vx = (e.turnDir || 1) * (vxBase + enemyMotionRand(1.0, 2.4));
            e.vy = vyBase + enemyMotionRand(0.25, 0.95);
          } else {
            e.vx = (e.turnDir || 1) * (vxBase + enemyMotionRand(0.8, 2.2));
            e.vy = vyBase + enemyMotionRand(0.15, 0.8);
          }
        }
        e.turnTimer--;
        if (e.snapTimer > 0) { e.snapTimer--; e.vx += (e.turnDir || 1) * 0.45; }
        else e.vx += Math.sin(t * 0.14 + e.loopPhase) * 0.03;
        if (e.motion === "chain") {
          const wave = Math.sin(t * 0.09 + e.loopPhase) * 0.9;
          const weave = Math.sin(t * 0.04 + e.loopPhase * 1.2) * 1.2;
          e.vx += wave + weave * 0.35;
          if (enemyMotionRandom() < 0.008 + state.phase * 0.0005) e.turnDir *= -1;
        }
        if (e.motion === "sweep") { if (enemyMotionRandom() < 0.02) e.vx += (enemyMotionRandom() < 0.5 ? -1 : 1) * enemyMotionRand(0.8, 2.0); }
        if (e.x <= margin) { e.x = margin; e.turnDir = 1; e.turnTimer = Math.min(e.turnTimer, 10); }
        if (e.x >= W - margin) { e.x = W - margin; e.turnDir = -1; e.turnTimer = Math.min(e.turnTimer, 10); }
        e.x += e.vx * 0.40;
        e.y += e.vy * moveScale;
        if (enemyMotionRandom() < 0.006 + state.phase * 0.0006) e.vx += (enemyMotionRandom() < 0.5 ? -1 : 1) * enemyMotionRand(1.0, 2.0);
      } else if (e.type === "purple") {
        e.t += 1;
        if (enemyMotionRandom() < 0.01) e.driftDir *= -1;
        e.x += Math.sin(e.t * 0.035 + e.driftPhase) * e.driftPower * 0.8 * e.driftDir;
        e.x += Math.sign(p.x - e.x) * 0.34;
        e.y += e.vy * moveScale;
        const purpleCap = state.phase >= 10 ? 4 : 6;
        if (e.recover <= 0) {
          if (e.warn > 0) {
            e.warn--;
            if (e.warn === 0) {
              const dx = p.x - e.x, dy = p.y - e.y;
              const aimAngle = Math.atan2(dy, dx);
              const forwardAngle = Math.atan2(Math.max(0.001, e.vy), e.vx || 0.001);
              const arcOK = Math.abs(wrapAngle(aimAngle - forwardAngle)) <= Math.PI / 2;
              if (countBulletsByKind("purple") >= purpleCap) e.warn = 12;
              else if (arcOK) {
                const d = Math.max(1, Math.hypot(dx, dy));
                const speed = 3.4 + state.phase * 0.06;
                const extraDelay = Math.floor((purpleCrowd - 1) * 10) + (e.volleySeed || 0) * 6;
                e.shoot = Math.max(76, 102 - state.phase * 2 - Math.floor(threat * 7) + extraDelay + Math.floor(enemyMotionRand(0, 10)));
                fireEnemyBullet(e.x, e.y + 12, (dx / d) * speed, (dy / d) * speed, "purple");
              } else {
                e.warn = 20;
              }
            }
          } else {
            e.shoot--;
            if (e.shoot <= 18) e.warn = 16;
          }
        }
      } else if (e.type === "phantom") {
        e.t += 1;
        if (e.telegraphTimer > 0) {
          e.telegraphTimer--;
          e.y += e.vy * 0.55;
          e.x += Math.sin(e.t * 0.03 + e.phaseOffset) * 0.08;
          if (e.telegraphTimer === 0) {
            e.stateMode = (e.stateMode === "physical") ? "ghost" : "physical";
            e.cycleTimer = phantomCycleDuration(e.stateMode) + Math.floor(enemyMotionRand(-12, 12));
            e.fireTimer = Math.max(18, e.fireTimer + Math.floor(enemyMotionRand(-12, 18)));
          }
        } else {
          e.cycleTimer--;
          if (e.cycleTimer <= 0) e.telegraphTimer = 20;
          e.y += e.vy * moveScale;
          e.x += Math.sin(e.t * 0.028 + e.phaseOffset) * e.driftPower * 0.75;
          e.x += Math.sign(p.x - e.x) * (e.stateMode === "physical" ? 0.14 : 0.09);
          if (enemyMotionRandom() < 0.012) e.driftDir *= -1;
        }
        e.x = clamp(e.x, margin, W - margin);
        e.fireTimer--;
        if (e.telegraphTimer <= 0) {
          if (e.stateMode === "physical") {
            if (e.fireTimer <= 0) {
              const dx = p.x - e.x, dy = p.y - e.y, d = Math.max(1, Math.hypot(dx, dy));
              const speed = 2.6 + state.phase * 0.03;
              if (phantomFrontArcOK(e, p.x, p.y)) {
                fireEnemyBullet(e.x, e.y + 10, (dx / d) * speed, (dy / d) * speed, "phantomShot", {});
                e.fireTimer = Math.floor(120 + enemyMotionRand(-20, 20));
              } else e.fireTimer = 20;
            }
          } else if (isWraithActive()) {
            if (e.fireTimer <= 0) {
              const dx = p.x - e.x, dy = p.y - e.y, d = Math.max(1, Math.hypot(dx, dy));
              const speed = 2.4 + state.phase * 0.025;
              if (phantomFrontArcOK(e, p.x, p.y)) {
                fireEnemyBullet(e.x, e.y + 10, (dx / d) * speed, (dy / d) * speed, "wraithGhost", { realm: 1 });
                e.fireTimer = Math.floor(185 + enemyMotionRand(-25, 25));
              } else e.fireTimer = 20;
            }
          }
        }
      }
      e.x = clamp(e.x, margin, W - margin);
      if (e.y > H + 18) {
        e.escape = true;
        e.escapeEdge = e.x < W / 2 ? "left" : "right";
        e.x = e.escapeEdge === "left" ? margin : W - margin;
        e.y = H + 10;
      }
    } else {
      e.y -= 11.5;
      e.x = e.escapeEdge === "left" ? margin : W - margin;
      if (e.y < -34) {
        e.escape = false;
        e.y = -28;
        e.x = enemyMotionRand(margin, W - margin);
        e.recover = 24;
        e.warn = 0;
        if (e.type === "orange") e.turnDir = enemyMotionRandom() < 0.5 ? -1 : 1;
        if (e.type === "purple") e.shoot = 72 + Math.floor(enemyMotionRand(0, 22));
      }
    }
  }
  resolveEnemySpacing();
  for (const e of state.enemies) {
    const previousX = Number.isFinite(e.prevX) ? e.prevX : e.x;
    const previousY = Number.isFinite(e.prevY) ? e.prevY : e.y;
    const desiredX = e.x;
    const desiredY = e.y;
    const distance = Math.hypot(desiredX - previousX, desiredY - previousY);
    const scripted = (e.tutorialArrival && !e.tutorialArrivalComplete) || e.tutorialTarget || e.spawnMode === "boss" || e.launchFrames > 0;
    if (scripted || distance <= 0.001 || typeof spacecraftMotionStep !== "function") {
      e.visualHeading = smoothEnemyVisualHeading(
        e.visualHeading,
        desiredX - previousX,
        desiredY - previousY,
        e.escape ? -1 : 1,
        scripted ? 0.18 : 0.09
      );
      e.flightHeading = e.visualHeading;
      continue;
    }
    const turnRate = e.escape ? 0.24 : e.type === "orange" || e.type === "splitter_shard" ? 0.14 : 0.09;
    const motion = spacecraftMotionStep(
      { x: previousX, y: previousY, heading: e.flightHeading },
      { x: desiredX, y: desiredY },
      distance,
      turnRate
    );
    e.x = previousX + motion.dx;
    e.y = previousY + motion.dy;
    e.flightHeading = motion.heading;
    e.visualHeading = motion.heading;
  }
  if (typeof updateExpansionSupportEffects === "function") updateExpansionSupportEffects();
  state.enemies = state.enemies.filter(e => e.hp > 0);
}
function updatePowerups() {
  for (const p of state.powerups) {
    if (p.tutorialSpawnFrame != null) {
      const elapsed = Math.max(0, state.frame - p.tutorialSpawnFrame);
      const visual = tutorialArrivalVisual(elapsed, p.tutorialArrivalDuration || 30);
      p.tutorialVisualAlpha = visual.alpha;
      p.tutorialVisualScale = visual.scale;
    }
    if (p.static) continue;
    p.rotation = Number(p.rotation || 0) + Number(p.spinSpeed == null ? 0.024 : p.spinSpeed);
    const nearPlayer = Math.hypot(p.x - state.player.x, p.y - state.player.y) < 140;
    if (state.player.magnet > 0) {
      const dx = state.player.x - p.x, dy = state.player.y - p.y, d = Math.max(1, Math.hypot(dx, dy));
      if (d < 185) {
        p.x += (dx / d) * 3.4;
        p.y += (dy / d) * 3.4;
      }
    }
    p.y += p.vy * (nearPlayer ? 0.88 : 1);
    p.x += Math.sin((state.frame + p.y) / 18) * 1.0;
    p.x = clamp(p.x, 16, W - 16);
    p.life--;
    if (p.y > H - 90) p.life = Math.max(p.life, 90);
    if (p.y > H + 30) p.dead = true;
    if (p.life <= 0) p.dead = true;
  }
  state.powerups = state.powerups.filter(p => !p.dead);
}
function updateParticles() {
  for (const p of state.particles) {
    p.x += p.vx; p.y += p.vy; p.vx *= 0.98; p.vy *= 0.98; p.life--;
  }
  state.particles = state.particles.filter(p => p.life > 0);
  enforceParticleCap();
}
function damagePlayer(amount = 1) {
  const p = state.player;
  if (p.inv > 0) return;
  if (typeof consumePhaseShieldOnDamage === "function" && consumePhaseShieldOnDamage(amount)) return;
  const d = state.difficulty;
  if (state.frame - d.lastHitFrame <= 180) d.heatStreak = true;
  d.lastHitFrame = state.frame;
  p.hp -= amount;
  state.runStats.damageTaken += Math.max(1, Math.floor(amount || 1));
  recordTrustedRunEvent("damage", { amount });
  p.inv = amount >= 2 ? 70 : 60;
  p.energy = clamp(p.energy + 12, 0, p.maxEnergy);
  state.difficulty.grace = 120;
  state.difficulty.ghostGrace = 0;
  if (typeof applyLowHpReliefAfterHit === "function") applyLowHpReliefAfterHit();
  kickShake(amount >= 2 ? 12 : 8);
  state.fx.flash = Math.max(state.fx.flash, amount >= 2 ? 10 : 8);
  resetCombo();
  spawnParticles(p.x, p.y, amount >= 2 ? 18 : 12, "#ff8a8a", 1.05);
  if (typeof playGameSound === "function") playGameSound("player_hit", amount >= 2 ? 1.15 : 0.9);
  if (p.hp <= 0) {
    if (state.runMode === "tutorial" && typeof recoverTutorialCheckpoint === "function") recoverTutorialCheckpoint();
    else enterGameOver();
  }
}
function collectPowerup(pu) {
  const p = state.player;
  state.runStats.powerups++;
  recordTrustedRunEvent("powerup", { kind: pu.type });
  const particlesBefore = state.particles.length;
  spawnPowerupCollectBurst(pu);
  const pickupParticles = state.particles.slice(particlesBefore);
  state.lastPickupFeedback = {
    type: pu.type,
    frame: state.frame,
    rings: pickupParticles.filter((particle) => particle.kind === "ring").length,
    particles: pickupParticles.length
  };
  if (typeof applyExpansionPowerup === "function" && applyExpansionPowerup(pu)) return;
  if (pu.type === "spread") { p.spread = Math.max(p.spread, 900); showMessage("SPREAD SHOT", 90); }
  else if (pu.type === "rapid") { p.rapid = Math.max(p.rapid, 900); showMessage("RAPID FIRE", 90); }
  else if (pu.type === "repair") { p.hp = Math.min(p.maxHp, p.hp + 1); showMessage("REPAIR +1", 90); }
  else if (pu.type === "wingman") { spawnWingmen(1); showMessage("WINGMAN", 90); }
  else if (pu.type === "dual") { spawnWingmen(2); showMessage("DUAL WING", 90); }
}
function enemyScoreForType(type) { return (ENEMY_DATA[type] && ENEMY_DATA[type].score) ? ENEMY_DATA[type].score : 20; }
function applyEnemyHitFeedback(e) {
  e.hitFlash = 12;
  e.hitPulse = 1;
  if (typeof playGameSound === "function") playGameSound("enemy_hit", 0.62);
}
function applyBossHitFeedback(boss, x, y) {
  if (!boss) return;
  boss.hitFlash = 10;
  boss.hitPulse = 1;
  spawnParticles(x, y, 7, "#fff", 0.82);
  if (typeof playGameSound === "function") playGameSound("boss_hit", 0.78);
}
function applyBossStagingPingFeedback(boss, x, y) {
  if (!boss) return;
  boss.hitFlash = Math.max(boss.hitFlash || 0, 5);
  boss.hitPulse = Math.max(boss.hitPulse || 0, 0.45);
  spawnParticles(x, y, 4, "#bff6ff", 0.48);
  if (typeof playGameSound === "function") playGameSound("enemy_hit", 0.32);
}
function bossSpriteKey(mode) { return `boss_${mode || "standard"}`; }
function playerBulletSpriteKey() { return "player_bullet"; }
function enemyBulletSpriteKey(kind) { return kind === "drainShot" ? "drainShot" : "enemy_bullet"; }
function bossCollisionHits(bullet, boss) {
  return manifestCollision(
    { key: playerBulletSpriteKey(), x: bullet.x, y: bullet.y, fallbackRadius: bullet.r || 3 },
    bossCollisionBody(boss)
  );
}
function updateCollisions() {
  const p = state.player;
  for (let i = state.bullets.length - 1; i >= 0; i--) {
    const b = state.bullets[i], dmg = b.damage ?? 1;
    if (b.life <= 0) continue;
    if (state.boss && !bossCanTakeDamage(state.boss) && bossCollisionHits(b, state.boss)) {
      b.life = 0;
      applyBossStagingPingFeedback(state.boss, b.x, b.y);
      continue;
    }
    if (state.boss && bossCanTakeDamage(state.boss)) {
      if (state.boss.mode === "wraith") {
        if ((b.realm == null || b.realm === state.playerRealm) && b.kind === (state.boss.realm === 0 ? "physical" : "ghost") && bossCollisionHits(b, state.boss)) {
          state.boss.hp -= dmg;
          state.difficulty.shotsHit++;
          b.life = 0;
          p.energy = clamp(p.energy + 5, 0, p.maxEnergy);
          state.boss.hitsSinceShift++;
          applyBossHitFeedback(state.boss, b.x, b.y);
          if (state.boss.hp <= 0) {
            const deadBoss = state.boss;
            spawnBossDeath(deadBoss);
            addFlatScore(BOSS_SCORE.wraith);
            recordTrustedRunEvent("boss", { kind: "wraith", entityId: `boss_wraith_${state.phase}_${state.frame}` });
            state.runStats.bosses++;
            resetCombo();
            bossRewardDrops(deadBoss.x, deadBoss.y);
            registerPowerupDrop(300, 480);
            state.boss = null;
            state.waveMood = "open";
            state.waveMoodTimer = 120;
            state.lastWaveTemplateName = null;
            state.phase++;
            recordTrustedRunEvent("phase", { phase: state.phase });
            state.phaseTimer = 0;
            state.waveTimer = 0;
            state.waveRest = 18;
            state.playerRealm = 0;
            saveMilestone();
            showMessage("BOSS DOWN", 90);
            showMessage("PHASE CLEAR", 75);
            showMessage("PHASE " + state.phase, 90);
          } else if (!state.boss.shiftTelegraph && !state.boss.chargeTelegraph && state.boss.hitsSinceShift >= state.boss.nextShiftHits) {
            startWraithShift(state.boss, "damage");
          }
          continue;
        }
      } else if (state.boss.mode === "standard") {
        if (bossCollisionHits(b, state.boss)) {
          state.boss.hp -= dmg;
          state.difficulty.shotsHit++;
          b.life = 0;
          applyBossHitFeedback(state.boss, b.x, b.y);
          if (state.boss.hp <= 0) {
            const deadBoss = state.boss;
            spawnBossDeath(deadBoss);
            addFlatScore(BOSS_SCORE.standard);
            recordTrustedRunEvent("boss", { kind: "standard", entityId: `boss_standard_${state.phase}_${state.frame}` });
            state.runStats.bosses++;
            resetCombo();
            bossRewardDrops(deadBoss.x, deadBoss.y);
            registerPowerupDrop(300, 480);
            state.boss = null;
            state.waveMood = "open";
            state.waveMoodTimer = 120;
            state.lastWaveTemplateName = null;
            state.phase++;
            recordTrustedRunEvent("phase", { phase: state.phase });
            state.phaseTimer = 0;
            state.waveTimer = 0;
            state.waveRest = 18;
            state.playerRealm = 0;
            saveMilestone();
            showMessage("BOSS DOWN", 90);
            showMessage("PHASE CLEAR", 75);
            showMessage("PHASE " + state.phase, 90);
          }
          continue;
        }
      } else if (typeof isExpansionBossMode === "function" && isExpansionBossMode(state.boss.mode)) {
        if (typeof handleExpansionBossSpecialHit === "function" && handleExpansionBossSpecialHit(b, state.boss)) {
          state.difficulty.shotsHit++;
          continue;
        }
        if (bossCollisionHits(b, state.boss)) {
          state.boss.hp -= dmg;
          state.difficulty.shotsHit++;
          b.life = 0;
          applyBossHitFeedback(state.boss, b.x, b.y);
          if (state.boss.hp <= 0) {
            const deadBoss = state.boss;
            spawnBossDeath(deadBoss);
            addFlatScore(BOSS_SCORE[deadBoss.mode] || BOSS_SCORE.standard);
            recordTrustedRunEvent("boss", { kind: deadBoss.mode, entityId: `boss_${deadBoss.mode}_${state.phase}_${state.frame}` });
            state.runStats.bosses++;
            resetCombo();
            bossRewardDrops(deadBoss.x, deadBoss.y);
            registerPowerupDrop(300, 480);
            state.boss = null;
            state.waveMood = "open";
            state.waveMoodTimer = 120;
            state.lastWaveTemplateName = null;
            state.phase++;
            recordTrustedRunEvent("phase", { phase: state.phase });
            state.phaseTimer = 0;
            state.waveTimer = 0;
            state.waveRest = 18;
            state.playerRealm = 0;
            saveMilestone();
            showMessage("BOSS DOWN", 90);
            showMessage("PHASE CLEAR", 75);
            showMessage("PHASE " + state.phase, 90);
          }
          continue;
        }
      }
    }
    for (let j = state.enemies.length - 1; j >= 0; j--) {
      const e = state.enemies[j];
      if (b.hitIds && b.hitIds.includes(e.id)) continue;
      if (e.type === "phantom") {
        if (e.telegraphTimer > 0) continue;
        const bulletIsGhost = b.kind === "ghost";
        const phantomIsGhost = e.stateMode === "ghost";
        if (bulletIsGhost !== phantomIsGhost) continue;
      }
      if (manifestCollision(
        { key: playerBulletSpriteKey(), x: b.x, y: b.y, fallbackRadius: b.r || 3 },
        enemyCollisionBody(e)
      )) {
        b.hitIds = b.hitIds || [];
        b.hitIds.push(e.id);
        if (b.pierce > 0) b.pierce--;
        else b.life = 0;
        state.difficulty.shotsHit++;
        const actualDamage = e.tutorialInvulnerable
          ? 0
          : (typeof applyEnemyDamageModifiers === "function" ? applyEnemyDamageModifiers(e, dmg, b) : dmg);
        if (actualDamage > 0) {
          e.hp -= actualDamage;
          applyEnemyHitFeedback(e);
        }
        spawnParticles(b.x, b.y, 6, "#fff", 0.7);
        if (e.hp <= 0) {
          if (typeof finishEnemyDestroyed === "function") finishEnemyDestroyed(e, j, true);
          else {
            noteKill(e.reward || enemyScoreForType(e.type), e.type, e.id);
            spawnDeathBurst(e.x, e.y, e.type === "purple" ? 22 : e.type === "phantom" ? 18 : 14);
            if (shouldDropPowerupNow()) { dropPowerup(e.x, e.y); registerPowerupDrop(240, 360); }
            else state.killsSinceLastDrop++;
            state.enemies.splice(j, 1);
          }
        }
        break;
      }
    }
  }

  for (let i = state.enemyBullets.length - 1; i >= 0; i--) {
    const b = state.enemyBullets[i];
    if (b.realm != null && b.realm !== state.playerRealm) continue;
    const wingmanProtected = p.ghostTimer > 0;
    {
      let wingmanBlocked = false;
      for (let w = state.wingmen.length - 1; w >= 0; w--) {
        const wm = state.wingmen[w];
        if (manifestCollision(
          { key: enemyBulletSpriteKey(b.kind), x: b.x, y: b.y, fallbackRadius: b.r || 4 },
          { key: "wingman", x: wm.x, y: wm.y, fallbackRadius: 12 }
        )) {
          state.enemyBullets.splice(i, 1);
          const immune = wingmanProtected || wm.phase === "arriving" || wm.phase === "departing";
          wm.hitFlash = 8;
          spawnParticles(wm.x, wm.y, immune ? 5 : 10, immune ? "#bff6ff" : "#f6f", immune ? 0.42 : 0.8);
          if (!immune) state.wingmen.splice(w, 1);
          if (typeof playGameSound === "function") playGameSound("wingman_hit", immune ? 0.34 : 0.85);
          wingmanBlocked = true;
          break;
        }
      }
      if (wingmanBlocked) continue;
    }
    if (b.kind === "drainShot") {
      if (manifestCollision(
        { key: "drainShot", x: b.x, y: b.y, fallbackRadius: b.r || 5 },
        playerCollisionBody(p)
      )) {
        state.enemyBullets.splice(i, 1);
        if (typeof drainPlayerEnergy === "function") drainPlayerEnergy(b.drain || 22, "drainShot");
        spawnParticles(p.x, p.y, 10, "#70ff45", 0.65);
      }
      continue;
    }
    if (state.boss && state.boss.mode === "wraith" && (b.kind === "wraithPhysical" || b.kind === "wraithGhost")) {
      if (manifestCollision(
        { key: enemyBulletSpriteKey(b.kind), x: b.x, y: b.y, fallbackRadius: b.r || 4 },
        playerCollisionBody(p)
      ) && p.inv <= 0) {
        state.enemyBullets.splice(i, 1);
        damagePlayer(b.damage || 1);
      }
      continue;
    }
    if (manifestCollision(
      { key: enemyBulletSpriteKey(b.kind), x: b.x, y: b.y, fallbackRadius: b.r || 4 },
      playerCollisionBody(p)
    ) && p.inv <= 0) {
      state.enemyBullets.splice(i, 1);
      damagePlayer(1);
    }
  }

  for (let i = state.enemies.length - 1; i >= 0; i--) {
    const e = state.enemies[i];
    const wingmanProtected = p.ghostTimer > 0;
    {
      let wingmanHit = false;
      for (let w = state.wingmen.length - 1; w >= 0; w--) {
        const wm = state.wingmen[w];
        if (manifestCollision(
          enemyCollisionBody(e),
          { key: "wingman", x: wm.x, y: wm.y, fallbackRadius: 12 }
        )) {
          if (wm.phase === "departing") continue;
          const immune = wingmanProtected || wm.phase === "arriving";
          if (!immune) state.wingmen.splice(w, 1);
          if (typeof onEnemyDestroyed === "function") onEnemyDestroyed(e);
          state.enemies.splice(i, 1);
          wm.hitFlash = 8;
          spawnParticles(wm.x, wm.y, immune ? 7 : 12, immune ? "#bff6ff" : "#f6f", immune ? 0.55 : 0.9);
          spawnDeathBurst(e.x, e.y, 10);
          if (typeof playGameSound === "function") playGameSound("wingman_hit", immune ? 0.42 : 0.92);
          wingmanHit = true;
          break;
        }
      }
      if (wingmanHit) continue;
    }

    if (e.type === "phantom") {
      if (isWraithActive()) {
        if (e.telegraphTimer > 0) continue;
        const playerIsGhost = state.playerRealm === 1;
        const phantomIsGhost = e.stateMode === "ghost";
        if (playerIsGhost !== phantomIsGhost) continue;
      } else if (p.ghostTimer > 0) {
        continue;
      }
    }
    if (e.type === "leech") continue;

    if (manifestCollision(
      enemyCollisionBody(e),
      playerCollisionBody(p)
    ) && p.inv <= 0) {
      state.enemies.splice(i, 1);
      damagePlayer(1);
    }
  }

  for (let i = state.powerups.length - 1; i >= 0; i--) {
    const pu = state.powerups[i];
    if (pu.tutorialCollectibleFrame != null && state.frame < pu.tutorialCollectibleFrame) continue;
    if (manifestCollision(
      { key: `powerup_${pu.type}`, x: pu.x, y: pu.y, fallbackRadius: pu.size || 16 },
      playerCollisionBody(p)
    )) {
      collectPowerup(pu);
      state.powerups.splice(i, 1);
    }
  }
}
function updatePendingSpawns() {
  for (let i = state.pendingSpawns.length - 1; i >= 0; i--) {
    const s = state.pendingSpawns[i];
    s.delay--;
    if (s.delay <= 0) {
      spawnEnemy(s.type, s.x, s.y, s.extra || {});
      state.pendingSpawns.splice(i, 1);
    }
  }
}
function updateWavesAndPhaseAndPressure() {
  if (state.bossRecovery > 0) {
    state.bossRecovery--;
    updatePressure();
    updatePacingMemory();
    updateWaveMood();
    state.threatScore = calculateThreatScore();
    updateDifficulty();
    state.cachedBulletPressure = enemyBulletPressure();
    state.cachedBulletBudget = enemyBulletBudget();
    state.frameBulletSpent = 0;
    updatePendingSpawns();
    return;
  }
  const bossLocked = !!(state.boss || state.bossDeath);
  if (!bossLocked) {
    state.phaseTimer++;
    state.waveTimer++;
    if (state.waveRest > 0) state.waveRest--;
  }
  updateIntensityCycle();
  const sinceHit = state.frame - state.difficulty.lastHitFrame;
  const strongPerformance = sinceHit > 720 && state.difficulty.killStreak >= 5 && !bossLocked;
  const comfort = sinceHit > 840 && state.player.hp === state.player.maxHp && state.pressure < 48 && !bossLocked;
  const ramp = openingRamp();
  if (strongPerformance && ramp > 0.72) { state.phaseTimer += 0.12; state.waveTimer += 0.05; }
  if (comfort && ramp > 0.70) { state.phaseTimer += 0.16; state.waveTimer += 0.06; }
  if (state.difficulty.pacingMemory > 0.35 && ramp > 0.76) { state.phaseTimer += 0.04; state.waveTimer += 0.02; }
  if (state.intensityPhase === "surge") { state.phaseTimer += 0.10; state.waveTimer += 0.10; }
  updatePressure();
  updatePacingMemory();
  updateWaveMood();
  state.threatScore = calculateThreatScore();
  updateDifficulty();
  state.cachedBulletPressure = enemyBulletPressure();
  state.cachedBulletBudget = enemyBulletBudget();
  state.frameBulletSpent = 0;
  if (bossLocked) { updatePendingSpawns(); return; }
  if (state.phaseTimer >= phaseDuration(state.phase)) {
    state.phase++;
    recordTrustedRunEvent("phase", { phase: state.phase });
    state.phaseTimer = 0;
    state.waveTimer = 0;
    state.waveRest = 18;
    state.waveMood = "open";
    state.waveMoodTimer = 120;
    state.lastWaveTemplateName = null;
    showMessage("PHASE " + state.phase, 100);
    saveMilestone();
    if (state.phase % 4 === 0) spawnBoss();
  }
  let baseInterval;
  if (state.phase === 1) baseInterval = state.phaseTimer < 1000 ? 180 : state.phaseTimer < 2100 ? 156 : 136;
  else if (state.phase === 2) baseInterval = state.phaseTimer < 1300 ? 156 : 132;
  else if (state.phase === 3) baseInterval = 118;
  else baseInterval = Math.max(38, 88 - state.phase * 3.5);
  const rhythm = rhythmProfile();
  baseInterval += rhythm.interval;
  if (state.waveMood === "spike") baseInterval *= 0.82;
  else if (state.waveMood === "recovery") baseInterval *= 1.22;
  else if (state.waveMood === "rule") baseInterval *= 0.92;
  if (state.difficulty.pacingMemory > 0.45) baseInterval *= 0.90;
  if (state.difficulty.pacingMemory < -0.35) baseInterval *= 1.08;
  if (state.intensityPhase === "surge") baseInterval *= 0.78;
  if (state.intensityPhase === "cooldown") baseInterval *= 1.18;
  if (state.difficulty.grace > 0) baseInterval += 10;
  if (state.difficulty.ghostGrace > 0) baseInterval += 8;
  if (state.player.hp <= 2) baseInterval += 16;
  if (state.player.hp === 1) baseInterval += 18;
  if (state.boss) baseInterval += 12;
  if (state.waveRest > 0) baseInterval += Math.floor(state.waveRest * 0.5);
  const load = peakLoad();
  baseInterval += Math.round(load * 18);
  baseInterval += Math.round((state.pressure - 50) * 0.08);
  const interval = Math.round(baseInterval / clamp(state.difficulty.threat, 0.55, 1.25));
  let threatBudget = 11.5 + state.phase * 2.8 + (state.intensityPhase === "surge" ? 0.8 : state.intensityPhase === "cooldown" ? -0.8 : 0);
  if (state.phase === 1) threatBudget = 6.8 + openingRamp() * 2.8;
  else if (state.phase === 2) threatBudget = 8.4 + openingRamp() * 1.4;
  else if (state.phase === 3) threatBudget = 10.8 + openingRamp() * 1.8;
  if (state.waveMood === "spike") threatBudget += 1.2;
  else if (state.waveMood === "recovery") threatBudget -= 1.2;
  else if (state.waveMood === "rule") threatBudget += 0.5;
  if (state.difficulty.pacingMemory > 0.45) threatBudget += 0.75;
  if (state.difficulty.pacingMemory < -0.35) threatBudget -= 0.6;
  if (state.player.hp <= 2) threatBudget -= 1.8;
  if (state.player.hp === 1) threatBudget -= 1.4;
  if (!state.boss && state.pendingSpawns.length === 0 && state.waveTimer >= interval && state.threatScore < threatBudget) {
    spawnWave();
    state.waveTimer = 0;
  }
  if (typeof updateDebrisEvent === "function") updateDebrisEvent();
  updatePendingSpawns();
}
const enemyMotionRandom = () => runRandom("enemy_behavior");
const enemyMotionRand = (minimum, maximum) => runRandomRange("enemy_behavior", minimum, maximum);
