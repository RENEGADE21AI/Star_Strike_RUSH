const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const repoRoot = path.resolve(__dirname, "..");

function loadDirector() {
  const stateSource = fs.readFileSync(path.join(repoRoot, "src", "00-onboarding-state.js"), "utf8");
  const directorSource = fs.readFileSync(path.join(repoRoot, "src", "07-tutorial-director.js"), "utf8");
  const context = { console, globalThis: null };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(`${stateSource}\n${directorSource}`, context);
  return context;
}

test("deterministic tutorial spawn plans contain no random or dynamic-director dependencies", () => {
  const api = loadDirector();
  const first = api.deterministicTutorialPlan();
  const second = api.deterministicTutorialPlan();
  assert.deepEqual(JSON.parse(JSON.stringify(first)), JSON.parse(JSON.stringify(second)));
  const playerStart = { x: 187.5, y: 533.6 };
  const firstBeacon = first.movement[0];
  assert.ok(
    Math.hypot(firstBeacon.x - playerStart.x, firstBeacon.y - playerStart.y) >= 80,
    "the first navigation beacon must require meaningful flight"
  );
  assert.equal(first.auto_weapons.length, 3);
  assert.ok(first.auto_weapons.every((target) => target.hp >= 2), "training targets must survive long enough to teach positioning");
  assert.ok(first.evasionEmitter && first.evasionEmitter.invulnerable, "the evasion lesson needs a durable visible emitter");
  assert.deepEqual(
    JSON.parse(JSON.stringify(first.controlled_wave.map((wave) => wave.map((enemy) => enemy.type)))),
    [["red", "red"], ["orange", "red", "orange"]]
  );
  assert.ok(first.evasion.every((shot) => Number.isFinite(shot.x) && Number.isFinite(shot.vy)));
  assert.ok(
    first.ghost_shift.startX <= first.ghost_shift.laneX - first.ghost_shift.laneWidth,
    "Ghost lesson needs a safe approach before the dangerous lane"
  );
});

test("tutorial staging helpers animate arrivals, dissipations, transit, and forward pickups", () => {
  const api = loadDirector();
  assert.ok(api.TUTORIAL_BREATH_FRAMES >= 30, "objective transitions need a perceptible breathing beat");

  const arrivalStart = api.tutorialArrivalVisual(0, 48);
  const arrivalMiddle = api.tutorialArrivalVisual(24, 48);
  const arrivalEnd = api.tutorialArrivalVisual(48, 48);
  assert.equal(arrivalStart.alpha, 0);
  assert.ok(arrivalStart.scale < arrivalMiddle.scale && arrivalMiddle.scale < arrivalEnd.scale);
  assert.ok(arrivalStart.alpha < arrivalMiddle.alpha && arrivalMiddle.alpha < arrivalEnd.alpha);
  assert.equal(arrivalEnd.alpha, 1);
  assert.equal(arrivalEnd.scale, 1);

  const dissolveStart = api.tutorialDissolveVisual(0, 24);
  const dissolveEnd = api.tutorialDissolveVisual(24, 24);
  assert.equal(dissolveStart.alpha, 1);
  assert.equal(dissolveEnd.alpha, 0);
  assert.ok(dissolveEnd.scale >= 1.6, "completed rings should expand as they dissipate");

  const transitStart = api.tutorialTransitPosition({ x: 40, y: 500 }, { x: 135, y: 480 }, 0, 42);
  const transitMiddle = api.tutorialTransitPosition({ x: 40, y: 500 }, { x: 135, y: 480 }, 21, 42);
  const transitEnd = api.tutorialTransitPosition({ x: 40, y: 500 }, { x: 135, y: 480 }, 42, 42);
  assert.deepEqual(JSON.parse(JSON.stringify(transitStart)), { x: 40, y: 500, progress: 0 });
  assert.ok(transitMiddle.x > 40 && transitMiddle.x < 135);
  assert.deepEqual(JSON.parse(JSON.stringify(transitEnd)), { x: 135, y: 480, progress: 1 });

  const pickup = api.tutorialPickupPosition({ x: 187.5, y: 533.6 }, { offsetX: 42, offsetY: -108 }, 375, 667);
  assert.ok(Math.hypot(pickup.x - 187.5, pickup.y - 533.6) >= 90, "the powerup must be ahead of the player");
  assert.ok(pickup.y < 470, "the powerup must require forward movement");
});

test("tutorial advancement requires the real action for every mechanic lesson", () => {
  const api = loadDirector();
  const director = api.createTutorialDirector("movement", "NOVA_7");

  assert.equal(api.tutorialObjectiveComplete(director, { beaconIndex: 2 }), false);
  assert.equal(api.tutorialObjectiveComplete(director, { beaconIndex: 3 }), true);

  director.stepId = "auto_weapons";
  assert.equal(api.tutorialObjectiveComplete(director, { tutorialKills: 2 }), false);
  assert.equal(api.tutorialObjectiveComplete(director, { tutorialKills: 3 }), true);

  director.stepId = "ghost_shift";
  assert.equal(api.tutorialObjectiveComplete(director, { ghostUses: 1, ghostLanePhased: false }), false);
  assert.equal(api.tutorialObjectiveComplete(director, { ghostUses: 1, ghostLanePhased: true }), true);

  director.stepId = "powerup";
  assert.equal(api.tutorialObjectiveComplete(director, { phaseShield: 0 }), false);
  assert.equal(api.tutorialObjectiveComplete(director, { phaseShield: 1 }), true);

  director.stepId = "realm_practice";
  assert.equal(api.tutorialObjectiveComplete(director, { realmHops: 1, realmThreatAvoided: true, realmsMatched: false }), false);
  assert.equal(api.tutorialObjectiveComplete(director, { realmHops: 1, realmThreatAvoided: true, realmsMatched: true }), true);
});

test("evasion requires sustained, damage-free practice across three live volleys", () => {
  const api = loadDirector();
  const base = {
    damageTakenStart: 2,
    damageTakenCurrent: 2,
    practiceFrames: 300,
    volleysCleared: 3,
    travelDistance: 120,
    emitterAlive: true
  };
  assert.equal(api.tutorialEvasionSucceeded(base), true);
  assert.equal(api.tutorialEvasionSucceeded({ ...base, damageTakenCurrent: 3 }), false);
  assert.equal(api.tutorialEvasionSucceeded({ ...base, practiceFrames: 299 }), false);
  assert.equal(api.tutorialEvasionSucceeded({ ...base, volleysCleared: 2 }), false);
  assert.equal(api.tutorialEvasionSucceeded({ ...base, travelDistance: 119 }), false);
  assert.equal(api.tutorialEvasionSucceeded({ ...base, emitterAlive: false }), false);
});

test("transmissions cannot be skipped or advanced while their text is typing", () => {
  const api = loadDirector();
  assert.equal(api.tutorialTransmissionCanAdvance(0), false);
  assert.equal(api.tutorialTransmissionCanAdvance(0.999), false);
  assert.equal(api.tutorialTransmissionCanAdvance(1), true);
  assert.equal(api.tutorialTransmissionCanAdvance(7), true);
});

test("a held Space transmission key must be released before it can advance", () => {
  const sessionInput = fs.readFileSync(path.join(repoRoot, "src", "18-session-input-loop.js"), "utf8");
  assert.match(sessionInput, /tutorialDialogueHeldKeys\.has\(k\) \|\| e\.repeat/);
  assert.match(sessionInput, /tutorialDialogueHeldKeys\.add\(k\)[\s\S]*advanceTutorialDialogue\(\)/);
  assert.match(sessionInput, /tutorialDialogueHeldKeys\.delete\(k\)/);
});

test("Ghost lesson requires crossing the lane boundary while real Ghost protection is active", () => {
  const api = loadDirector();
  const base = {
    startSide: "left",
    targetSide: "right",
    laneX: 187.5,
    previousX: 170,
    currentX: 205,
    ghostActive: true,
    ghostUses: 1,
    damageTakenStart: 0,
    damageTakenCurrent: 0
  };
  assert.equal(api.tutorialGhostLaneSucceeded(base), true);
  assert.equal(api.tutorialGhostLaneSucceeded({ ...base, ghostActive: false }), false);
  assert.equal(api.tutorialGhostLaneSucceeded({ ...base, previousX: 205, currentX: 235 }), false);
  assert.equal(api.tutorialGhostLaneSucceeded({ ...base, ghostUses: 0 }), false);
  assert.equal(api.tutorialGhostLaneSucceeded({ ...base, damageTakenCurrent: 1 }), false);
});

test("tutorial boss overrides are isolated and preserve normal boss values", () => {
  const api = loadDirector();
  const normalStandard = { mode: "standard", maxHp: 152, hp: 152, attackPattern: "normal" };
  const normalWraith = { mode: "wraith", maxHp: 136, hp: 136, attackPattern: "normal" };
  const trainingStandard = api.applyTutorialBossOverride(normalStandard);
  const trainingWraith = api.applyTutorialBossOverride(normalWraith);

  assert.equal(normalStandard.maxHp, 152);
  assert.equal(normalWraith.maxHp, 136);
  assert.equal(trainingStandard.maxHp, 38);
  assert.equal(trainingWraith.maxHp, 30);
  assert.equal(trainingStandard.tutorialOverride, true);
  assert.equal(trainingWraith.tutorialOverride, true);
  assert.deepEqual(Array.from(trainingWraith.tutorialRealmSequence), [0, 1, 0]);
});

test("checkpoint recovery clears hazards and restores only the training simulation", () => {
  const api = loadDirector();
  const runtime = {
    player: {
      hp: 0,
      maxHp: 5,
      energy: 3,
      maxEnergy: 100,
      inv: 0,
      vx: 4.5,
      vy: -3.25,
      ghostTimer: 18,
      dashTimer: 9,
      ghostCooldown: 47
    },
    playerRealm: 1,
    bullets: [{ id: 1 }],
    enemyBullets: [{ id: 2 }],
    enemies: [{ id: 3 }],
    pendingSpawns: [{ id: 4 }],
    powerups: [{ id: 4 }],
    debris: [{ id: 5 }],
    enemyBeams: [{ id: 6 }],
    gravityWells: [{ id: 7 }],
    wingmen: [{ id: 8 }],
    boss: { id: 9 },
    bossDeath: { timer: 42 },
    bossRecovery: 31
  };
  const result = api.recoverTutorialRuntime(runtime);
  assert.equal(result.player.hp, 5);
  assert.equal(result.player.energy, 100);
  assert.equal(result.player.inv, 120);
  assert.equal(result.player.vx, 0);
  assert.equal(result.player.vy, 0);
  assert.equal(result.player.ghostTimer, 0);
  assert.equal(result.player.dashTimer, 0);
  assert.equal(result.player.ghostCooldown, 0);
  assert.equal(result.playerRealm, 0);
  for (const key of [
    "bullets",
    "enemyBullets",
    "enemies",
    "pendingSpawns",
    "powerups",
    "debris",
    "enemyBeams",
    "gravityWells",
    "wingmen"
  ]) {
    assert.deepEqual(Array.from(result[key]), []);
  }
  assert.equal(result.boss, null);
  assert.equal(result.bossDeath, null);
  assert.equal(result.bossRecovery, 0);
});

test("graduation Codex reveal is exact and idempotent", () => {
  const api = loadDirector();
  const first = api.applyTutorialGraduationCodex({ red: true }, false);
  assert.deepEqual(JSON.parse(JSON.stringify(first.codex)), {
    red: true,
    orange: true,
    boss_standard: true,
    boss_wraith: true
  });
  assert.equal(first.changed, true);
  const second = api.applyTutorialGraduationCodex(first.codex, true);
  assert.equal(second.changed, false);
  assert.deepEqual(second.codex, first.codex);
});

test("Colonel Arisaka dialogue stays concise and uses the current call sign", () => {
  const api = loadDirector();
  const director = api.createTutorialDirector("incoming", "NOVA_7");
  assert.match(director.dialogue[0].lines.join(" "), /NOVA_7/);
  for (const step of api.TUTORIAL_DEFINITIONS) {
    for (const transmission of step.dialogue) {
      assert.ok(transmission.lines.length <= 2, `${step.id} has too many lines`);
      for (const line of transmission.lines) {
        assert.ok(line.trim().split(/\s+/).length <= 16, `${step.id} dialogue is too long: ${line}`);
      }
    }
  }
});

test("active runtime, tests, and documentation contain no stale instructor identity", () => {
  const staleName = `Colonel ${"Vega"}`;
  const staleUpper = staleName.toUpperCase();
  const roots = ["src", "tests", "scripts", "docs"];
  const files = [
    "README.md",
    "PROJECT_STATUS.md",
    "BUILD_WEEK_2026.md",
    ...roots.flatMap((root) => fs.readdirSync(path.join(repoRoot, root), { recursive: true })
      .filter((entry) => /\.(?:js|md|html)$/.test(entry))
      .map((entry) => path.join(root, entry)))
  ];
  const stale = files.filter((file) => {
    const source = fs.readFileSync(path.join(repoRoot, file), "utf8");
    return source.includes(staleName) || source.includes(staleUpper);
  });
  assert.deepEqual(stale, []);

  const renderer = fs.readFileSync(path.join(repoRoot, "src", "17-tutorial-onboarding.js"), "utf8");
  const manifest = fs.readFileSync(path.join(repoRoot, "src", "00-asset-manifest.js"), "utf8");
  const portraitPath = path.join(repoRoot, "assets", "tutorial", "colonel-arisaka.png");
  assert.match(renderer, /function drawTutorialInstructorPortrait\(/);
  assert.match(renderer, /function drawColonelArisakaPlaceholder\(/);
  assert.match(renderer, /"tutorial_instructor"/);
  assert.match(manifest, /assets\/tutorial\/colonel-arisaka\.png/);
  assert.equal(fs.existsSync(portraitPath), true);
  assert.ok(fs.statSync(portraitPath).size > 1000);
});
