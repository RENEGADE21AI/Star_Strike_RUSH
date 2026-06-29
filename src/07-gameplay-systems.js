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

function updateEnemies() {
  const margin = 20;
  const p = state.player;
  const threat = state.difficulty.threat;
  const purpleCrowd = activePurpleCount();
  for (const e of state.enemies) {
    e.prevX = e.x; e.prevY = e.y;
    e.hitFlash = Math.max(0, (e.hitFlash || 0) - 1);
    e.hitPulse = Math.max(0, (e.hitPulse || 0) - 0.12);
    if (e.entryFrames > 0 && e.spawnMode !== "boss") {
      e.entryFrames--;
      e.y += 0.62;
      e.x += Math.sin((state.frame + e.id) * 0.06) * (e.type === "orange" ? 0.26 : 0.14);
      if (e.type === "purple") e.x += Math.sign(p.x - e.x) * 0.08;
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
          e.turnTimer = rand(10, 28);
          e.driftPhase = rand(0, TAU);
          e.driftDir = Math.random() < 0.5 ? -1 : 1;
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
        if (Math.random() < 0.012) e.driftDir *= -1;
        e.x += Math.sin(e.t * 0.03 + e.driftPhase) * e.driftPower * e.driftDir;
        e.y += e.vy * moveScale;
      } else if (e.type === "orange") {
        e.t += 1;
        const t = e.t;
        if (e.turnTimer <= 0) {
          e.turnTimer = rand(12, 34);
          const edgeBiasLeft = e.x > W * 0.5;
          const r = Math.random();
          if (e.motion === "snap" || r > 0.83) {
            e.turnDir = Math.random() < 0.5 ? -1 : 1;
            if (e.x < margin + 48) e.turnDir = 1;
            if (e.x > W - margin - 48) e.turnDir = -1;
            e.snapTimer = rand(8, 16);
          } else {
            e.snapTimer = 0;
            if (r < 0.50) e.turnDir = Math.random() < 0.5 ? -1 : 1;
            else if (r < 0.72) e.turnDir = edgeBiasLeft ? -1 : 1;
            else e.turnDir = edgeBiasLeft ? 1 : -1;
          }
          const vyBase = 2.25 + state.phase * 0.12;
          const vxBase = 2.4 + state.phase * 0.22;
          if (e.motion === "zigzag") {
            e.vx = (Math.random() < 0.5 ? -1 : 1) * (vxBase + rand(0.2, 2.0));
            e.vy = vyBase + rand(0.1, 0.8);
          } else if (e.motion === "burst") {
            e.vx = (e.turnDir || 1) * (vxBase + rand(1.2, 2.7));
            e.vy = vyBase + rand(0.2, 0.9);
          } else if (e.motion === "chain") {
            e.vx = (Math.random() < 0.5 ? -1 : 1) * (vxBase + rand(0.4, 1.8));
            e.vy = vyBase + rand(0.15, 0.7);
          } else if (e.motion === "sweep") {
            e.vx = (e.turnDir || 1) * (vxBase + rand(1.0, 2.4));
            e.vy = vyBase + rand(0.25, 0.95);
          } else {
            e.vx = (e.turnDir || 1) * (vxBase + rand(0.8, 2.2));
            e.vy = vyBase + rand(0.15, 0.8);
          }
        }
        e.turnTimer--;
        if (e.snapTimer > 0) { e.snapTimer--; e.vx += (e.turnDir || 1) * 0.45; }
        else e.vx += Math.sin(t * 0.14 + e.loopPhase) * 0.03;
        if (e.motion === "chain") {
          const wave = Math.sin(t * 0.09 + e.loopPhase) * 0.9;
          const weave = Math.sin(t * 0.04 + e.loopPhase * 1.2) * 1.2;
          e.vx += wave + weave * 0.35;
          if (Math.random() < 0.008 + state.phase * 0.0005) e.turnDir *= -1;
        }
        if (e.motion === "sweep") { if (Math.random() < 0.02) e.vx += (Math.random() < 0.5 ? -1 : 1) * rand(0.8, 2.0); }
        if (e.x <= margin) { e.x = margin; e.turnDir = 1; e.turnTimer = Math.min(e.turnTimer, 10); }
        if (e.x >= W - margin) { e.x = W - margin; e.turnDir = -1; e.turnTimer = Math.min(e.turnTimer, 10); }
        e.x += e.vx * 0.40;
        e.y += e.vy * moveScale;
        if (Math.random() < 0.006 + state.phase * 0.0006) e.vx += (Math.random() < 0.5 ? -1 : 1) * rand(1.0, 2.0);
      } else if (e.type === "purple") {
        e.t += 1;
        if (Math.random() < 0.01) e.driftDir *= -1;
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
                e.shoot = Math.max(76, 102 - state.phase * 2 - Math.floor(threat * 7) + extraDelay + Math.floor(rand(0, 10)));
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
            e.cycleTimer = phantomCycleDuration(e.stateMode) + Math.floor(rand(-12, 12));
            e.fireTimer = Math.max(18, e.fireTimer + Math.floor(rand(-12, 18)));
          }
        } else {
          e.cycleTimer--;
          if (e.cycleTimer <= 0) e.telegraphTimer = 20;
          e.y += e.vy * moveScale;
          e.x += Math.sin(e.t * 0.028 + e.phaseOffset) * e.driftPower * 0.75;
          e.x += Math.sign(p.x - e.x) * (e.stateMode === "physical" ? 0.14 : 0.09);
          if (Math.random() < 0.012) e.driftDir *= -1;
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
                e.fireTimer = Math.floor(120 + rand(-20, 20));
              } else e.fireTimer = 20;
            }
          } else if (isWraithActive()) {
            if (e.fireTimer <= 0) {
              const dx = p.x - e.x, dy = p.y - e.y, d = Math.max(1, Math.hypot(dx, dy));
              const speed = 2.4 + state.phase * 0.025;
              if (phantomFrontArcOK(e, p.x, p.y)) {
                fireEnemyBullet(e.x, e.y + 10, (dx / d) * speed, (dy / d) * speed, "wraithGhost", { realm: 1 });
                e.fireTimer = Math.floor(185 + rand(-25, 25));
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
        e.x = rand(margin, W - margin);
        e.recover = 24;
        e.warn = 0;
        if (e.type === "orange") e.turnDir = Math.random() < 0.5 ? -1 : 1;
        if (e.type === "purple") e.shoot = 72 + Math.floor(rand(0, 22));
      }
    }
  }
  resolveEnemySpacing();
  if (typeof updateExpansionSupportEffects === "function") updateExpansionSupportEffects();
  state.enemies = state.enemies.filter(e => e.hp > 0);
}
function updatePowerups() {
  for (const p of state.powerups) {
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
  p.inv = amount >= 2 ? 70 : 60;
  p.energy = clamp(p.energy + 12, 0, p.maxEnergy);
  state.difficulty.grace = 120;
  state.difficulty.ghostGrace = 0;
  kickShake(amount >= 2 ? 12 : 8);
  state.fx.flash = Math.max(state.fx.flash, amount >= 2 ? 10 : 8);
  resetCombo();
  spawnParticles(p.x, p.y, amount >= 2 ? 18 : 12, "#ff8a8a", 1.05);
  if (p.hp <= 0) enterGameOver();
}
function collectPowerup(pu) {
  const p = state.player;
  state.runStats.powerups++;
  if (typeof applyExpansionPowerup === "function" && applyExpansionPowerup(pu)) return;
  if (pu.type === "spread") { p.spread = Math.max(p.spread, 900); showMessage("SPREAD SHOT", 90); }
  else if (pu.type === "rapid") { p.rapid = Math.max(p.rapid, 900); showMessage("RAPID FIRE", 90); }
  else if (pu.type === "repair") { p.hp = Math.min(p.maxHp, p.hp + 1); showMessage("REPAIR +1", 90); }
  else if (pu.type === "wingman") { spawnWingmen(1); showMessage("WINGMAN", 90); }
  else if (pu.type === "dual") { spawnWingmen(2); showMessage("DUAL WING", 90); }
}
function enemyScoreForType(type) { return (ENEMY_DATA[type] && ENEMY_DATA[type].score) ? ENEMY_DATA[type].score : 20; }
function applyEnemyHitFeedback(e) { e.hitFlash = 12; e.hitPulse = 1; }
function bossCollisionHits(bullet, boss) {
  const origin = { x: boss.x, y: boss.y - ((boss.recoil || 0) * 0.35) };
  const circles = boss.mode === "wraith" ? [
    { x: origin.x, y: origin.y, r: 28 },
    { x: origin.x - 36, y: origin.y + 2, r: 18 },
    { x: origin.x + 36, y: origin.y + 2, r: 18 },
    { x: origin.x - 12, y: origin.y - 18, r: 15 },
    { x: origin.x + 12, y: origin.y - 18, r: 15 }
  ] : [
    { x: origin.x, y: origin.y, r: 28 },
    { x: origin.x - 34, y: origin.y, r: 18 },
    { x: origin.x + 34, y: origin.y, r: 18 },
    { x: origin.x, y: origin.y - 14, r: 16 },
    { x: origin.x, y: origin.y + 12, r: 20 }
  ];
  for (const c of circles) if (circleHit(bullet.x, bullet.y, bullet.r, c.x, c.y, c.r)) return true;
  return false;
}
function updateCollisions() {
  const p = state.player;
  for (let i = state.bullets.length - 1; i >= 0; i--) {
    const b = state.bullets[i], dmg = b.damage ?? 1;
    if (b.life <= 0) continue;
    if (state.boss) {
      if (state.boss.mode === "wraith") {
        if ((b.realm == null || b.realm === state.playerRealm) && b.kind === (state.boss.realm === 0 ? "physical" : "ghost") && bossCollisionHits(b, state.boss)) {
          state.boss.hp -= dmg;
          state.difficulty.shotsHit++;
          b.life = 0;
          p.energy = clamp(p.energy + 5, 0, p.maxEnergy);
          state.boss.hitsSinceShift++;
          spawnParticles(b.x, b.y, 8, "#fff", 0.8);
          if (state.boss.hp <= 0) {
            const deadBoss = state.boss;
            spawnBossDeath(deadBoss);
            addFlatScore(BOSS_SCORE.wraith);
            state.runStats.bosses++;
            resetCombo();
            bossRewardDrops(deadBoss.x, deadBoss.y);
            registerPowerupDrop(300, 480);
            state.boss = null;
            state.waveMood = "open";
            state.waveMoodTimer = 120;
            state.lastWaveTemplateName = null;
            state.phase++;
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
          spawnParticles(b.x, b.y, 4, "#fff", 0.8);
          if (state.boss.hp <= 0) {
            const deadBoss = state.boss;
            spawnBossDeath(deadBoss);
            addFlatScore(BOSS_SCORE.standard);
            state.runStats.bosses++;
            resetCombo();
            bossRewardDrops(deadBoss.x, deadBoss.y);
            registerPowerupDrop(300, 480);
            state.boss = null;
            state.waveMood = "open";
            state.waveMoodTimer = 120;
            state.lastWaveTemplateName = null;
            state.phase++;
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
          spawnParticles(b.x, b.y, 5, "#fff", 0.8);
          if (state.boss.hp <= 0) {
            const deadBoss = state.boss;
            spawnBossDeath(deadBoss);
            addFlatScore(BOSS_SCORE[deadBoss.mode] || BOSS_SCORE.standard);
            state.runStats.bosses++;
            resetCombo();
            bossRewardDrops(deadBoss.x, deadBoss.y);
            registerPowerupDrop(300, 480);
            state.boss = null;
            state.waveMood = "open";
            state.waveMoodTimer = 120;
            state.lastWaveTemplateName = null;
            state.phase++;
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
      if (circleHit(b.x, b.y, b.r, e.x, e.y, e.r)) {
        b.hitIds = b.hitIds || [];
        b.hitIds.push(e.id);
        if (b.pierce > 0) b.pierce--;
        else b.life = 0;
        state.difficulty.shotsHit++;
        const actualDamage = typeof applyEnemyDamageModifiers === "function" ? applyEnemyDamageModifiers(e, dmg, b) : dmg;
        if (actualDamage > 0) {
          e.hp -= actualDamage;
          applyEnemyHitFeedback(e);
        }
        spawnParticles(b.x, b.y, 6, "#fff", 0.7);
        if (e.hp <= 0) {
          if (typeof finishEnemyDestroyed === "function") finishEnemyDestroyed(e, j, true);
          else {
            noteKill(e.reward || enemyScoreForType(e.type));
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
    if (!wingmanProtected) {
      let wingmanBlocked = false;
      for (let w = state.wingmen.length - 1; w >= 0; w--) {
        const wm = state.wingmen[w];
        if (circleHit(b.x, b.y, b.r, wm.x, wm.y, 12)) {
          state.enemyBullets.splice(i, 1);
          state.wingmen.splice(w, 1);
          spawnParticles(wm.x, wm.y, 10, "#f6f", 0.8);
          wingmanBlocked = true;
          break;
        }
      }
      if (wingmanBlocked) continue;
    }
    if (b.kind === "drainShot") {
      if (circleHit(b.x, b.y, b.r, p.x, p.y, 14)) {
        state.enemyBullets.splice(i, 1);
        if (typeof drainPlayerEnergy === "function") drainPlayerEnergy(b.drain || 22, "drainShot");
        spawnParticles(p.x, p.y, 10, "#70ff45", 0.65);
      }
      continue;
    }
    if (state.boss && state.boss.mode === "wraith" && (b.kind === "wraithPhysical" || b.kind === "wraithGhost")) {
      if (circleHit(b.x, b.y, b.r, p.x, p.y, 14) && p.inv <= 0) {
        state.enemyBullets.splice(i, 1);
        damagePlayer(b.damage || 1);
      }
      continue;
    }
    if (circleHit(b.x, b.y, b.r, p.x, p.y, 14) && p.inv <= 0) {
      state.enemyBullets.splice(i, 1);
      damagePlayer(1);
    }
  }

  for (let i = state.enemies.length - 1; i >= 0; i--) {
    const e = state.enemies[i];
    const wingmanProtected = p.ghostTimer > 0;
    if (!wingmanProtected) {
      let wingmanHit = false;
      for (let w = state.wingmen.length - 1; w >= 0; w--) {
        const wm = state.wingmen[w];
        if (circleHit(e.x, e.y, e.r, wm.x, wm.y, 12)) {
          state.wingmen.splice(w, 1);
          if (typeof onEnemyDestroyed === "function") onEnemyDestroyed(e);
          state.enemies.splice(i, 1);
          spawnParticles(wm.x, wm.y, 12, "#f6f", 0.9);
          spawnDeathBurst(e.x, e.y, 10);
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

    if (circleHit(e.x, e.y, e.r, p.x, p.y, 14) && p.inv <= 0) {
      state.enemies.splice(i, 1);
      damagePlayer(1);
    }
  }

  for (let i = state.powerups.length - 1; i >= 0; i--) {
    const pu = state.powerups[i];
    if (circleHit(pu.x, pu.y, pu.size, p.x, p.y, 15)) {
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
  if (strongPerformance) { state.phaseTimer += 0.25; state.waveTimer += 0.10; }
  if (comfort) { state.phaseTimer += 0.40; state.waveTimer += 0.18; }
  if (state.difficulty.pacingMemory > 0.35) { state.phaseTimer += 0.10; state.waveTimer += 0.05; }
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
  if (state.phase === 1) baseInterval = state.phaseTimer < 500 ? 118 : state.phaseTimer < 900 ? 104 : 92;
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
  if (state.player.hp <= 2) baseInterval += 8;
  if (state.player.hp === 1) baseInterval += 6;
  if (state.boss) baseInterval += 12;
  if (state.waveRest > 0) baseInterval += Math.floor(state.waveRest * 0.5);
  const load = peakLoad();
  baseInterval += Math.round(load * 18);
  baseInterval += Math.round((state.pressure - 50) * 0.08);
  const interval = Math.round(baseInterval / clamp(state.difficulty.threat, 0.75, 1.25));
  let threatBudget = 11.5 + state.phase * 2.8 + (state.intensityPhase === "surge" ? 0.8 : state.intensityPhase === "cooldown" ? -0.8 : 0);
  if (state.waveMood === "spike") threatBudget += 1.2;
  else if (state.waveMood === "recovery") threatBudget -= 1.2;
  else if (state.waveMood === "rule") threatBudget += 0.5;
  if (state.difficulty.pacingMemory > 0.45) threatBudget += 0.75;
  if (state.difficulty.pacingMemory < -0.35) threatBudget -= 0.6;
  if (!state.boss && state.pendingSpawns.length === 0 && state.waveTimer >= interval && state.threatScore < threatBudget) {
    spawnWave();
    state.waveTimer = 0;
  }
  if (typeof updateDebrisEvent === "function") updateDebrisEvent();
  updatePendingSpawns();
}
