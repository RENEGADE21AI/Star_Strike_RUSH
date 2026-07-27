const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");

const repoRoot = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(repoRoot, file), "utf8");

test("title patrols reserve space between formations and their own ships", () => {
  const title = read("src/08-title-traffic.js");
  const render = read("src/11-rendering-title-effects.js");
  assert.match(title, /TITLE_MAX_FORMATIONS\s*=\s*2/);
  assert.match(title, /function separateTitleFormations/);
  assert.match(title, /titleFormationVisualRadius/);
  assert.match(title, /titlePathReservationConflict/);
  assert.match(render, /memberSpacingScale/);
  assert.doesNotMatch(render, /avoidX|avoidY/);
});

test("wingmen keep an edge-safe gap from the player and one another", () => {
  const effects = read("src/02-effects-powerups.js");
  const entities = read("src/05-entities.js");
  assert.match(effects, /WINGMAN_FORMATION_OFFSET_X\s*=\s*42/);
  assert.match(effects, /function wingmanFormationTarget/);
  assert.match(entities, /wingmanFormationTarget/);
  assert.match(entities, /WINGMAN_MIN_PLAYER_DISTANCE/);
});

test("outer space uses a tight dark seam rather than broad aurora curtains", () => {
  const scene = read("src/17-rendering-scene.js");
  const outerFog = scene.slice(scene.indexOf("function drawOuterFog"), scene.indexOf("function drawPlayfieldFogBlend"));
  assert.doesNotMatch(outerFog, /const blobs|const wisps|34,116,142|30,94,114/);
  assert.match(outerFog, /tightSeam/);
  assert.match(scene, /const edge = 22/);
});

test("Pilot Dossier ship art has a centered bracket glow without offset orbit circles", () => {
  const panels = read("src/12-rendering-title-panels.js");
  const dossier = panels.slice(panels.indexOf("function drawDossierCard"), panels.indexOf("function drawPilotHologram"));
  const hologram = panels.slice(panels.indexOf("function drawPilotHologram"), panels.indexOf("function drawFlightNetworkCard"));
  assert.doesNotMatch(dossier, /arc\(rect\.x \+ 48/);
  assert.doesNotMatch(hologram, /setLineDash|ellipse\(/);
  assert.match(hologram, /bracketPulse/);
});

test("hits and powerup pickups share explicit visual and audio feedback", () => {
  const index = read("index.html");
  const audio = read("src/02-audio.js");
  const effects = read("src/02-effects-powerups.js");
  const gameplay = read("src/07-gameplay-systems.js");
  const render = read("src/15-rendering-entities.js");
  assert.match(index, /src\/02-audio\.js/);
  assert.match(audio, /function playGameSound/);
  assert.match(audio, /enemy_hit/);
  assert.match(audio, /powerup/);
  assert.match(effects, /function spawnPowerupCollectBurst/);
  assert.match(gameplay, /spawnPowerupCollectBurst\(pu/);
  assert.match(gameplay, /applyBossHitFeedback/);
  assert.match(render, /globalCompositeOperation = "lighter"/);
  assert.match(render, /kind === "ring"/);
});

test("owner-supplied title and gameplay music use gesture-safe state crossfades", () => {
  const audio = fs.readFileSync(path.join(repoRoot, "src", "02-audio.js"), "utf8");
  const loop = fs.readFileSync(path.join(repoRoot, "src", "18-session-input-loop.js"), "utf8");
  const titleTrack = path.join(repoRoot, "assets", "audio", "hangar-bay-seven.mp3");
  const gameplayTrack = path.join(repoRoot, "assets", "audio", "gravitys-edge.mp3");

  assert.ok(fs.statSync(titleTrack).size > 1000000);
  assert.ok(fs.statSync(gameplayTrack).size > 1000000);
  assert.match(audio, /title:\s*"assets\/audio\/hangar-bay-seven\.mp3"/);
  assert.match(audio, /gameplay:\s*"assets\/audio\/gravitys-edge\.mp3"/);
  assert.match(audio, /window\.addEventListener\("pointerdown", unlockGameMusic/);
  assert.match(audio, /mode === "start"[\s\S]*title:\s*0\.22/);
  assert.match(audio, /mode === "paused"[\s\S]*gameplay:\s*0\.065/);
  assert.match(loop, /updateGameMusic\(frameTiming\.deltaMs \/ 1000\)[\s\S]*draw\(\)/);
});

test("title patrol reservation uses the same normalized path without runtime side-sliding", () => {
  const context = vm.createContext({
    globalThis: null,
    W: 375,
    H: 667,
    TAU: Math.PI * 2,
    Math,
    Number,
    Object,
    state: { titleFormations: [] },
    settingReducedMotion: false,
    SIMULATION_STEP_MS: 1000 / 60,
    clamp: (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value)),
    rand: (minimum, maximum) => (minimum + maximum) / 2
  });
  context.globalThis = context;
  vm.runInContext(read("src/08-title-traffic.js"), context);
  const result = vm.runInContext(`(() => {
    const first = makeTitleFormation(0, 1, true, "midground");
    const second = makeTitleFormation(1, -1, true, "midground");
    return {
      conflict: titlePathReservationConflict(first, second, 4),
      first: titleFormationPositionAt(first, 0.5),
      second: titleFormationPositionAt(second, 0.5)
    };
  })()`, context);
  assert.equal(typeof result.conflict, "boolean");
  assert.notDeepEqual(result.first, result.second);
  assert.doesNotMatch(read("src/08-title-traffic.js"), /avoidX|avoidY/);
});

test("wingman targets preserve player clearance at every screen corner", () => {
  const context = vm.createContext({
    W: 375,
    H: 667,
    clamp: (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value))
  });
  vm.runInContext(read("src/02-effects-powerups.js"), context);
  const distances = vm.runInContext(`[
    { x: 18, y: 28 },
    { x: 18, y: H - 18 },
    { x: W - 18, y: 28 },
    { x: W - 18, y: H - 18 }
  ].flatMap((player) => [-1, 1].map((side) => {
    const target = wingmanFormationTarget(player, side);
    return Math.hypot(target.x - player.x, target.y - player.y);
  }))`, context);
  assert.equal(distances.length, 8);
  for (const distance of distances) assert.ok(distance >= 30.999);
});
