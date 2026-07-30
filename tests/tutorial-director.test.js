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
  assert.deepEqual(
    JSON.parse(JSON.stringify(first.movement.map((item) => [item.x, item.y]))),
    [[187.5, 520], [92, 455], [283, 410]]
  );
  assert.equal(first.auto_weapons.length, 3);
  assert.deepEqual(
    JSON.parse(JSON.stringify(first.controlled_wave.map((wave) => wave.map((enemy) => enemy.type)))),
    [["red", "red"], ["orange", "red", "orange"]]
  );
  assert.ok(first.evasion.every((shot) => Number.isFinite(shot.x) && Number.isFinite(shot.vy)));
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

test("evasion requires an active damage-free volley crossing to the intended side", () => {
  const api = loadDirector();
  const base = {
    startSide: "left",
    targetSide: "right",
    laneX: 187.5,
    startX: 145,
    volleyActive: true,
    damageTakenStart: 2,
    damageTakenCurrent: 2
  };
  assert.equal(api.tutorialEvasionSucceeded({ ...base, playerX: 250 }), true);
  assert.equal(api.tutorialEvasionSucceeded({ ...base, startX: 220, playerX: 250 }), false);
  assert.equal(api.tutorialEvasionSucceeded({ ...base, playerX: 150 }), false);
  assert.equal(api.tutorialEvasionSucceeded({ ...base, playerX: 250, volleyActive: false }), false);
  assert.equal(api.tutorialEvasionSucceeded({ ...base, playerX: 250, damageTakenCurrent: 3 }), false);
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
    player: { hp: 0, maxHp: 5, energy: 3, maxEnergy: 100, inv: 0 },
    bullets: [{ id: 1 }],
    enemyBullets: [{ id: 2 }],
    enemies: [{ id: 3 }],
    powerups: [{ id: 4 }],
    debris: [{ id: 5 }],
    enemyBeams: [{ id: 6 }],
    gravityWells: [{ id: 7 }],
    boss: { id: 8 }
  };
  const result = api.recoverTutorialRuntime(runtime);
  assert.equal(result.player.hp, 5);
  assert.equal(result.player.energy, 100);
  assert.equal(result.player.inv, 120);
  for (const key of ["bullets", "enemyBullets", "enemies", "powerups", "debris", "enemyBeams", "gravityWells"]) {
    assert.deepEqual(Array.from(result[key]), []);
  }
  assert.equal(result.boss, null);
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
