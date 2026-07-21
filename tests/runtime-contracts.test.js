const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const repoRoot = path.resolve(__dirname, "..");

function loadPureScripts(...files) {
  const context = { console, Math, Number, String, Object, Array, Map, Set, Promise };
  context.globalThis = context;
  vm.createContext(context);
  for (const file of files) vm.runInContext(fs.readFileSync(path.join(repoRoot, "src", file), "utf8"), context);
  return context;
}

function seededRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
    return value / 0x100000000;
  };
}

function test(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

const context = loadPureScripts("00-asset-manifest.js", "00-competition.js", "00-identity.js", "00-gameplay-rules.js", "00-input-actions.js");

test("sprite manifest has render and collision metadata for every registered entity", () => {
  const result = context.validateSpriteManifest();
  assert.equal(result.ok, true, result.errors.join("\n"));
  assert.ok(Object.keys(context.SPRITE_MANIFEST).length >= 30);
  assert.ok(context.SPRITE_MANIFEST.player.projectileOrigin);
  assert.ok(context.SPRITE_MANIFEST.boss_debris_warden.collision.length > 1);
  for (const [id, entry] of Object.entries(context.SPRITE_MANIFEST)) {
    if (!entry.source) continue;
    assert.equal(fs.existsSync(path.join(repoRoot, entry.source)), true, `${id} is missing ${entry.source}`);
  }
});

test("1500 seeded Debris Warden double gates remain reachable", () => {
  for (let seed = 1; seed <= 1500; seed++) {
    const plan = context.createDoubleDebrisPlan({
      width: 375,
      asteroidRadius: 20.5,
      playerRadius: 9,
      playerMaxSpeed: 5.5,
      playerSteer: 0.22,
      rowDistance: 96,
      rowSpeed: 2,
      margin: 8,
      routeMargin: 12,
      rng: seededRandom(seed)
    });
    const validation = context.validateDoubleDebrisPlan(plan, { minimumGapWidth: 20, routeMargin: 12 });
    assert.equal(validation.ok, true, `seed ${seed}: ${validation.reason}`);
    assert.ok(plan.travelRequired <= plan.reachable - 12, `seed ${seed} exceeded reach`);
  }
});

test("Debris Warden favors single rows and speeds them up as health falls", () => {
  for (const hpPct of [1, 0.55, 0.15]) {
    const sequence = context.debrisWardenAttackSequence(hpPct);
    assert.ok(sequence.filter((attack) => attack === "wall").length >= 2);
    assert.ok(sequence.filter((attack) => attack === "double").length <= 1);
  }
  assert.ok(context.debrisWardenRowSpeed(0.15, "wall") > context.debrisWardenRowSpeed(0.9, "wall"));
  assert.ok(context.debrisWardenRowSpeed(0.15, "double") < context.debrisWardenRowSpeed(0.15, "wall"));
});

test("Debris Warden rocks grow smoothly from zero to their collision size", () => {
  assert.equal(context.debrisSpawnScale(0, 30), 0);
  assert.ok(context.debrisSpawnScale(15, 30) > 0.45);
  assert.equal(context.debrisSpawnScale(30, 30), 1);
});

test("Siphon shot aims toward predicted player position with bounded range", () => {
  const origin = { x: 188, y: 110 };
  const target = { x: 250, y: 580 };
  const shot = context.createSiphonShot(origin, target, { x: 5.5, y: -1.5 }, { speed: 3.2, extraRange: 220 });
  const dot = shot.vx * (shot.aimX - origin.x) + shot.vy * (shot.aimY - origin.y);
  assert.ok(dot > 0);
  assert.ok(shot.leadFrames <= 12);
  assert.ok(shot.range >= Math.hypot(target.x - origin.x, target.y - origin.y) + 200);
  assert.ok(shot.range < 1400);
});

test("expired Siphon projectiles are removed by the shared bullet cleanup", () => {
  const entitiesSource = fs.readFileSync(path.join(repoRoot, "src", "05-entities.js"), "utf8");
  assert.match(entitiesSource, /b\.life--/);
  assert.match(entitiesSource, /state\.enemyBullets = state\.enemyBullets\.filter\(b => b\.life > 0\)/);
});

test("Debris Warden replaces Ghost with a non-phasing Dash", () => {
  const action = context.ghostActionProfile("debris_warden");
  assert.equal(action.label, "DASH");
  assert.equal(action.phaseThroughDebris, false);
  assert.ok(action.burst > 5);
  assert.equal(context.ghostActionProfile(null).label, "GHOST");
  assert.equal(context.ghostActionProfile(null).phaseThroughDebris, true);
});

test("input mode follows meaningful input and ignores incidental mouse movement", () => {
  assert.equal(context.gameplayActionForKey("x"), null);
  assert.equal(context.gameplayActionForKey(" "), "ability");
  const touched = context.nextGameplayInputMode("keyboard", "touch", 1000, -Infinity, 0);
  assert.equal(touched.mode, "touch");
  assert.equal(context.nextGameplayInputMode("touch", "mouse_move", 1500, touched.lastTouchAt, 0).mode, "touch");
  assert.equal(context.nextGameplayInputMode("touch", "keyboard", 1501, touched.lastTouchAt, 0).mode, "keyboard");
  assert.equal(context.touchControlsVisible("keyboard", "playing"), false);
  assert.equal(context.touchControlsVisible("touch", "playing"), true);
});

test("public pilot records whitelist call sign and game stats only", () => {
  const record = context.publicPilotRecord({
    uid: "abc123",
    callSign: "nova-7",
    handle: "Nova-Pilot",
    displayName: "Private Person",
    photoURL: "https://example.test/private.jpg",
    email: "private@example.test",
    bestScore: 9200,
    phase: 8
  });
  assert.equal(record.callSign, "NOVA_7");
  assert.equal(record.handle, "nova_pilot");
  assert.equal(record.bestScore, 9200);
  assert.equal("displayName" in record, false);
  assert.equal("photoURL" in record, false);
  assert.equal("email" in record, false);
});

test("public handles and weekly performance bands are deterministic", () => {
  const validation = context.validatePublicHandle("@Nova-Pilot");
  assert.equal(validation.ok, true);
  assert.equal(validation.handle, "nova_pilot");
  assert.equal(validation.message, "HANDLE READY");
  assert.equal(context.validatePublicHandle("@admin").ok, false);
  assert.equal(context.weeklyCompetitionId(Date.UTC(2026, 6, 21)), "week_2026_07_20");
  assert.equal(context.leagueDivisionName(context.leagueBandForPerformance(75000)), "GOLD");
});

test("public Firebase writers and rules exclude provider identity fields", () => {
  const functionsSource = fs.readFileSync(path.join(repoRoot, "functions", "index.js"), "utf8");
  const publicBuilder = functionsSource.slice(
    functionsSource.indexOf("function publicPayloadFor"),
    functionsSource.indexOf("function clientProfile")
  );
  assert.doesNotMatch(publicBuilder, /displayName|photoURL|email/);
  assert.match(functionsSource, /tx\.set\(publicRef, publicPayload\);/);
  assert.match(functionsSource, /tx\.set\(leaderboardRef, publicPayload\);/);

  const clientSource = fs.readFileSync(path.join(repoRoot, "src", "20-firebase-online.js"), "utf8");
  assert.doesNotMatch(clientSource, /setDoc\(/);
  assert.match(clientSource, /httpsCallable\(functionsApi, "syncPilotProfile"\)/);
  assert.match(clientSource, /httpsCallable\(functionsApi, "claimPilotHandle"\)/);
  assert.match(clientSource, /competitionBackend:\s*"unknown"/);
  assert.match(clientSource, /Local play remains available/);
  const leaderboardReader = clientSource.slice(
    clientSource.indexOf("function applyLeaderboardSnapshot"),
    clientSource.indexOf("function subscribeLeaderboard")
  );
  assert.doesNotMatch(leaderboardReader, /displayName|photoURL|email/);

  const rules = fs.readFileSync(path.join(repoRoot, "firestore.rules"), "utf8");
  const publicRules = rules.slice(rules.indexOf("function validPublicProfile"), rules.indexOf("function validAchievementId"));
  assert.doesNotMatch(publicRules, /displayName|photoURL|email/);
});
