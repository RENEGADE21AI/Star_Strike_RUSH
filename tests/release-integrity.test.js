const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");

const repoRoot = path.resolve(__dirname, "..");
const catalog = require("../shared/achievements.json");
const { ACHIEVEMENTS } = require("../functions/achievement-catalog");
const { aggregateFromUnlockDocuments } = require("../functions/achievement-migration");
const { buildProfileArchive } = require("../functions/profile-archive");

function source(file) {
  return fs.readFileSync(path.join(repoRoot, file), "utf8");
}

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
    dump: () => Object.fromEntries(values)
  };
}

test("device-local preseason authority is explicit and client/server gates remain closed", () => {
  const release = require("../shared/release-integrity.json");
  assert.equal(release.progressionAuthority, "device_local_preseason");
  assert.equal(release.clientCompetitionWritesEnabled, false);
  assert.equal(release.serverCompetitionWritesEnabled, false);
  assert.equal(release.serverProgressionWritesEnabled, false);
  assert.equal(release.verifiedRunSessionsEnabled, false);

  const functionsSource = source("functions/index.js");
  for (const [start, end] of [
    ["exports.joinWeeklyLeague", "function clientProfile"],
    ["exports.submitRunReceipt", "exports.claimSeasonReward"],
    ["exports.claimSeasonReward", ""]
  ]) {
    const body = functionsSource.slice(functionsSource.indexOf(start), end ? functionsSource.indexOf(end) : undefined);
    assert.ok(body.indexOf("requireServerProgressionWritesEnabled()") >= 0);
    assert.ok(body.indexOf("requireServerProgressionWritesEnabled()") < body.indexOf("authContext(request)"));
    assert.ok(body.indexOf("requireServerProgressionWritesEnabled()") < body.indexOf("db."));
  }
});

test("Firebase identity hydration cannot merge account archive data into device progress", () => {
  const client = source("src/20-firebase-online.js");
  assert.doesNotMatch(client, /mergeServerMetaProgress/);
  assert.match(client, /onlineArchiveMeta/);
  assert.match(client, /progressionMode:\s*PROGRESSION_MODE/);
  assert.match(client, /identityService:/);
  assert.match(client, /accountArchive:/);
  assert.match(client, /competitionMode:/);
  assert.match(client, /networkState:/);

  const signInBody = client.slice(client.indexOf("async function signIn("), client.indexOf("async function signOutOnline("));
  assert.doesNotMatch(signInBody, /syncPilotProfile|loadAchievement|subscribeLegacyArchive|hydrateAccount/);
  assert.match(signInBody, /waitForAuthTransition/);

  const authBody = client.slice(client.indexOf("authModule.onAuthStateChanged"), client.indexOf("const redirectResult"));
  assert.match(authBody, /hydrateAccount/);
  assert.match(client, /const hydrationPromises = new Map/);
  assert.match(client, /authGeneration/);
});

test("Season rewards use the same local path signed in or signed out", () => {
  const titleInput = source("src/18-title-input.js");
  const body = titleInput.slice(titleInput.indexOf("function handleProgressClaim"), titleInput.indexOf("let titleScrollablePendingAction"));
  assert.match(body, /claimSeasonReward\(rewardId\)/);
  assert.doesNotMatch(body, /claimSeasonRewardOnline|starStrikeOnline|online\.user/);
  assert.match(source("src/12-rendering-progress-road.js"), /REWARDS STORED ON THIS DEVICE/);
});

test("account-scoped pending call signs survive failure and remain isolated by UID", () => {
  const context = { globalThis: null, Date, JSON, String };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(source("src/00-online-identity.js"), context);
  const storage = memoryStorage();

  context.markAccountCallSignPublished(storage, "account-a", "STALE_A");
  assert.equal(context.resolvedAccountCallSign(storage, "account-a", "SERVER_A"), "SERVER_A");
  assert.equal(context.readAccountIdentityState(storage, "account-a").publishedCallSign, "SERVER_A");

  assert.equal(context.savePendingAccountCallSign(storage, "account-a", "NOVA_7").ok, true);
  assert.equal(context.savePendingAccountCallSign(storage, "account-b", "EMBER_2").ok, true);
  context.markAccountCallSignFailed(storage, "account-a");
  assert.equal(context.resolvedAccountCallSign(storage, "account-a", "SERVER_A"), "NOVA_7");
  assert.equal(context.resolvedAccountCallSign(storage, "account-b", "SERVER_B"), "EMBER_2");
  assert.equal(context.readAccountIdentityState(storage, "account-a").publishedCallSign, "SERVER_A");
  context.markAccountCallSignPublished(storage, "account-a", "NOVA_7");
  assert.equal(context.readAccountIdentityState(storage, "account-a").pending, false);
  assert.equal(context.readAccountIdentityState(storage, "account-a").desiredCallSign, "NOVA_7");
  assert.equal(context.readAccountIdentityState(storage, "account-a").publishedCallSign, "NOVA_7");
  assert.equal(context.readAccountIdentityState(storage, "account-b").pending, true);
  assert.notEqual(context.accountIdentityStorageKey("account-a"), context.accountIdentityStorageKey("account-b"));
});

test("legacy leaderboard values stay quarantined from account archive progression", () => {
  const cases = [
    {
      name: "public only",
      privateData: {},
      publicData: { bestScore: 700, phase: 4 },
      leaderboardData: {},
      legacyBestScore: 700,
      legacyPhase: 4
    },
    {
      name: "leaderboard only",
      privateData: {},
      publicData: {},
      leaderboardData: { bestScore: 900, phase: 6 },
      legacyBestScore: 900,
      legacyPhase: 6
    },
    {
      name: "conflicting values",
      privateData: { glory: 42, bestScore: 111, phase: 2 },
      publicData: { bestScore: 800, phase: 3, verifiedBestScore: 25, verifiedPhase: 1 },
      leaderboardData: { bestScore: 1200, phase: 8 },
      legacyBestScore: 1200,
      legacyPhase: 8
    },
    {
      name: "no records",
      privateData: {},
      publicData: {},
      leaderboardData: {},
      legacyBestScore: 0,
      legacyPhase: 1
    }
  ];

  for (const item of cases) {
    const result = buildProfileArchive(item.privateData, item.publicData, item.leaderboardData);
    assert.equal(result.legacyRecord.legacyBestScore, item.legacyBestScore, item.name);
    assert.equal(result.legacyRecord.legacyPhase, item.legacyPhase, item.name);
    assert.equal(result.accountArchiveMeta.bestScore, Number(item.privateData.bestScore || 0), item.name);
    assert.equal(result.accountArchiveMeta.phase, Math.max(1, Number(item.privateData.phase || 1)), item.name);
    assert.notEqual(result.accountArchiveMeta.bestScore, item.legacyBestScore || -1, `${item.name} must not seed private progression`);
  }
});

test("achievement aggregate migration is idempotent, additive, and ignores unknown IDs", () => {
  const timestamp = { server: "timestamp" };
  const first = aggregateFromUnlockDocuments(
    { ids: ["first_sortie"], count: 5, schemaVersion: 1 },
    [
      { id: "first_sortie", unlockedAt: 1 },
      { achievementId: "boss_breaker", unlockedAt: 2 },
      { achievementId: "unknown_future_id", unlockedAt: 3 }
    ],
    timestamp
  );
  assert.equal(first.changed, true);
  assert.deepEqual(first.aggregate.ids, ["boss_breaker", "first_sortie"]);
  assert.equal(first.aggregate.count, 5);
  assert.equal(first.aggregate.schemaVersion, 2);
  assert.equal(first.aggregate.sourceCount, 2);
  assert.equal(first.ignoredSourceCount, 1);

  const rerun = aggregateFromUnlockDocuments(first.aggregate, [
    { id: "first_sortie", unlockedAt: 1 },
    { achievementId: "boss_breaker", unlockedAt: 2 }
  ], { later: "timestamp" });
  assert.equal(rerun.changed, false);
  assert.deepEqual(rerun.aggregate.ids, first.aggregate.ids);
  assert.equal(rerun.aggregate.migratedAt, timestamp);
  const adminScript = source("functions/scripts/migrate-achievement-aggregates.js");
  assert.match(adminScript, /collection\("player_achievements"\)\.listDocuments\(\)/);
  assert.match(adminScript, /unlockQuery\.get\(\)/);
  assert.doesNotMatch(adminScript, /unlockQuery\.(set|update|delete)/);
});

test("one canonical achievement catalog contains exactly 79 honest supported definitions", () => {
  assert.equal(catalog.schemaVersion, 2);
  assert.equal(catalog.achievements.length, 79);
  assert.equal(new Set(catalog.achievements.map((achievement) => achievement.id)).size, 79);
  assert.deepEqual(ACHIEVEMENTS, catalog.achievements);
  for (const achievement of catalog.achievements) {
    assert.ok(["strike", "combat", "systems", "career"].includes(achievement.category));
    assert.ok(achievement.tier >= 1 && achievement.tier <= 5);
    if (achievement.minCombo) assert.match(achievement.description, /kill chain/i);
    if (achievement.minBosses) assert.doesNotMatch(achievement.name, /warden/i);
  }
  assert.doesNotMatch(JSON.stringify(catalog), /No Misses|Warden's Bane/);
});

test("all one-run achievement thresholds fit deterministic theoretical constraints", () => {
  const maxRunSeconds = 30 * 60;
  const phaseDurationFrames = (phase) => {
    if (phase === 1) return 3000;
    if (phase === 2) return 3300;
    if (phase === 3) return 3000;
    return Math.max(580, 940 - (phase - 4) * 20);
  };
  const phaseSecondsThrough80 = Array.from({ length: 79 }, (_, index) => phaseDurationFrames(index + 1))
    .reduce((sum, frames) => sum + frames / 60, 0);
  const plausible = {
    minScore: 320000,
    minPhase: 80,
    minBosses: 20,
    minGhostUses: Math.floor((100 + maxRunSeconds * 5) / 35),
    minPowerups: Math.floor(maxRunSeconds / 15),
    minKills: maxRunSeconds,
    minCombo: maxRunSeconds,
    minRunDurationMs: maxRunSeconds * 1000
  };
  assert.ok(phaseSecondsThrough80 + 20 * 30 < maxRunSeconds, "phase schedule plus conservative boss fights must fit 30 minutes");
  for (const achievement of catalog.achievements) {
    for (const [criterion, maximum] of Object.entries(plausible)) {
      if (achievement[criterion]) {
        assert.ok(achievement[criterion] <= maximum, `${achievement.id} exceeds plausible ${criterion}`);
      }
    }
  }
});

function createAudioContext() {
  const events = [];
  class FakeAudio {
    constructor(src) {
      this.src = src;
      this.loop = false;
      this.preload = "";
      this.volume = 0;
      this.paused = true;
      events.push(["construct", src]);
    }
    setAttribute() {}
    play() {
      this.paused = false;
      events.push(["play", this.src]);
      return Promise.resolve();
    }
    pause() {
      this.paused = true;
      events.push(["pause", this.src]);
    }
  }
  class FakeAudioContext {
    constructor() {
      this.currentTime = 0;
      this.state = "running";
      this.destination = {};
      events.push(["audio-context"]);
    }
    createGain() {
      return {
        gain: {
          value: 0,
          setValueAtTime() {},
          exponentialRampToValueAtTime() {}
        },
        connect() {}
      };
    }
    createOscillator() {
      return {
        frequency: { setValueAtTime() {}, exponentialRampToValueAtTime() {} },
        connect() {},
        start() { events.push(["oscillator-start"]); },
        stop() {}
      };
    }
    resume() {
      this.state = "running";
      return Promise.resolve();
    }
  }
  const listeners = {};
  const context = {
    globalThis: null,
    window: null,
    document: {
      hidden: false,
      addEventListener(type, fn) { listeners[type] = fn; }
    },
    state: {
      gameState: "start",
      sceneTransition: {
        mode: "idle",
        elapsedSeconds: 0,
        durationSeconds: 1
      }
    },
    settingMusicEnabled: true,
    settingEffectsEnabled: true,
    clamp: (value, min, max) => Math.max(min, Math.min(max, value)),
    performance: { now: () => 1000 },
    Audio: FakeAudio,
    AudioContext: FakeAudioContext,
    Map,
    Object,
    Promise,
    Math,
    Number
  };
  context.window = context;
  context.globalThis = context;
  context.addEventListener = (type, fn) => { listeners[type] = fn; };
  vm.createContext(context);
  vm.runInContext(source("src/02-audio.js"), context);
  vm.runInContext("unlockGameMusic()", context);
  return { context, events, listeners };
}

function updateMusicFor(run, seconds, frameRate, onFrame = null) {
  const frameCount = Math.round(frameRate * seconds);
  for (let index = 0; index < frameCount; index++) {
    if (onFrame) onFrame((index + 1) / frameRate, index);
    vm.runInContext(`updateGameMusic(${1 / frameRate})`, run.context);
  }
}

function loadAudioContext(frameRate = 60) {
  const run = createAudioContext();
  const { context } = run;
  vm.runInContext("state.gameState = 'playing'; prepareGameplayMusic()", context);
  updateMusicFor(run, 2, frameRate);
  return { ...run, snapshot: vm.runInContext("gameMusicStateSnapshot()", context) };
}

test("music loading and crossfades are deterministic while effects remain independent", () => {
  const volumes = [];
  for (const frameRate of [30, 60, 90, 120]) {
    const run = loadAudioContext(frameRate);
    assert.deepEqual(run.snapshot.loaded.sort(), ["gameplay", "title"]);
    assert.ok(run.events.some((event) => event[0] === "play"));
    volumes.push(run.snapshot.tracks.gameplay.volume);
  }
  assert.ok(Math.max(...volumes) - Math.min(...volumes) < 0.000001, `crossfade volumes diverged: ${volumes}`);

  const run = loadAudioContext();
  vm.runInContext("setEffectsEnabled(false)", run.context);
  assert.equal(vm.runInContext("playGameSound('ui')", run.context), false);
  assert.equal(vm.runInContext("settingMusicEnabled", run.context), true);
  vm.runInContext("setEffectsEnabled(true); playGameSound('ui')", run.context);
  assert.ok(run.events.some((event) => event[0] === "oscillator-start"));
  run.context.document.hidden = true;
  run.listeners.visibilitychange();
  assert.equal(vm.runInContext("gameMusicStateSnapshot().tracks.gameplay.paused", run.context), true);
});

test("title launch and game arrival music remain refresh-rate independent", () => {
  const results = [];
  for (const frameRate of [30, 60, 90, 120]) {
    const run = createAudioContext();
    updateMusicFor(run, 2, frameRate);
    const titleReady = vm.runInContext("gameMusicStateSnapshot()", run.context);
    assert.ok(titleReady.tracks.title.volume > 0.2 && titleReady.tracks.title.volume <= 0.22);

    run.context.state.sceneTransition = {
      mode: "title_launch",
      elapsedSeconds: 0,
      durationSeconds: 2
    };
    let midpoint = null;
    updateMusicFor(run, 2, frameRate, (elapsedSeconds) => {
      run.context.state.sceneTransition.elapsedSeconds = Math.min(2, elapsedSeconds);
      if (!midpoint && elapsedSeconds >= 1) {
        midpoint = vm.runInContext("gameMusicStateSnapshot()", run.context);
      }
    });
    const launchComplete = vm.runInContext("gameMusicStateSnapshot()", run.context);
    assert.ok(midpoint.tracks.title.volume < titleReady.tracks.title.volume * 0.95, `title did not begin fading at ${frameRate} Hz`);
    assert.ok(launchComplete.tracks.title.volume < titleReady.tracks.title.volume * 0.4, `title remained dominant at launch completion at ${frameRate} Hz`);
    assert.equal(launchComplete.tracks.gameplay.paused, false, `gameplay track did not start during launch at ${frameRate} Hz`);
    assert.ok(launchComplete.tracks.gameplay.volume > 0.035, `gameplay mix did not enter during launch at ${frameRate} Hz: ${launchComplete.tracks.gameplay.volume}`);

    run.context.state.gameState = "playing";
    run.context.state.sceneTransition = {
      mode: "game_arrival",
      elapsedSeconds: 0,
      durationSeconds: 0.6
    };
    const beforeArrival = launchComplete.tracks.gameplay.volume;
    updateMusicFor(run, 0.6, frameRate, (elapsedSeconds) => {
      run.context.state.sceneTransition.elapsedSeconds = Math.min(0.6, elapsedSeconds);
    });
    const arrivalComplete = vm.runInContext("gameMusicStateSnapshot()", run.context);
    assert.ok(arrivalComplete.tracks.gameplay.volume > beforeArrival, `arrival mix did not rise at ${frameRate} Hz`);
    assert.ok(arrivalComplete.tracks.gameplay.volume < 0.17, `arrival mix jumped to full volume at ${frameRate} Hz`);
    assert.ok(arrivalComplete.tracks.title.volume < launchComplete.tracks.title.volume, `title mix did not keep fading through arrival at ${frameRate} Hz`);
    results.push({
      launchTitle: launchComplete.tracks.title.volume,
      launchGameplay: launchComplete.tracks.gameplay.volume,
      arrivalGameplay: arrivalComplete.tracks.gameplay.volume
    });
  }

  for (const key of ["launchTitle", "launchGameplay", "arrivalGameplay"]) {
    const values = results.map((result) => result[key]);
    assert.ok(Math.max(...values) - Math.min(...values) < 0.002, `${key} diverged by refresh rate: ${values}`);
  }
});

test("pausing during game arrival immediately uses the paused music mix", () => {
  const run = createAudioContext();
  run.context.state.gameState = "playing";
  run.context.state.sceneTransition = {
    mode: "game_arrival",
    elapsedSeconds: 0.45,
    durationSeconds: 0.6
  };
  const arrival = vm.runInContext("gameMusicMix()", run.context);
  assert.ok(arrival.gameplay > 0.11 && arrival.gameplay < 0.17);

  run.context.state.gameState = "paused";
  assert.deepEqual(
    JSON.parse(vm.runInContext("JSON.stringify(gameMusicMix())", run.context)),
    { title: 0, gameplay: 0.065 }
  );
  run.context.state.gameState = "resuming";
  assert.deepEqual(
    JSON.parse(vm.runInContext("JSON.stringify(gameMusicMix())", run.context)),
    { title: 0, gameplay: 0.065 }
  );
});

test("hidden-tab music restore starts silent and fades only the active mix", () => {
  const run = loadAudioContext(60);
  const beforeHide = vm.runInContext("gameMusicStateSnapshot()", run.context);
  assert.ok(beforeHide.tracks.gameplay.volume > 0.15 && beforeHide.tracks.gameplay.volume <= 0.17);
  assert.equal(beforeHide.tracks.gameplay.paused, false);

  run.context.document.hidden = true;
  run.listeners.visibilitychange();
  const hidden = vm.runInContext("gameMusicStateSnapshot()", run.context);
  assert.equal(hidden.hidden, true);
  assert.equal(hidden.tracks.title.paused, true);
  assert.equal(hidden.tracks.gameplay.paused, true);

  run.context.state.gameState = "paused";
  run.context.document.hidden = false;
  run.listeners.visibilitychange();
  const restored = vm.runInContext("gameMusicStateSnapshot()", run.context);
  assert.equal(restored.hidden, false);
  assert.equal(restored.tracks.title.paused, true);
  assert.equal(restored.tracks.title.volume, 0);
  assert.equal(restored.tracks.gameplay.paused, false);
  assert.ok(restored.tracks.gameplay.volume > 0 && restored.tracks.gameplay.volume < 0.01, `restore volume jumped to ${restored.tracks.gameplay.volume}`);

  updateMusicFor(run, 1, 60);
  const faded = vm.runInContext("gameMusicStateSnapshot()", run.context);
  assert.equal(faded.tracks.title.paused, true);
  assert.equal(faded.tracks.title.volume, 0);
  assert.ok(faded.tracks.gameplay.volume > restored.tracks.gameplay.volume);
  assert.ok(faded.tracks.gameplay.volume > 0.04 && faded.tracks.gameplay.volume < 0.06, `paused mix did not fade smoothly toward target: ${faded.tracks.gameplay.volume}`);
});

test("reusable Canvas scroll controller supports threshold, clamp, momentum, wheel, and buttons", () => {
  const context = { globalThis: null, Math, Number };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(source("src/00-canvas-scroll.js"), context);
  let value = 0;
  const controller = context.createCanvasScrollController({
    getValue: () => value,
    setValue: (next) => { value = next; },
    getMax: () => 500,
    momentum: 0.8
  });
  controller.begin(7, 20, 300);
  controller.move(7, 20, 296);
  assert.equal(value, 0, "movement below threshold must not scroll");
  controller.move(7, 20, 240);
  assert.ok(value > 0, "drag must scroll");
  const end = controller.end(7);
  assert.equal(end.moved, true);
  const beforeMomentum = value;
  controller.tick();
  assert.ok(value > beforeMomentum, "restrained momentum must continue after release");
  controller.scrollBy(1000);
  assert.equal(value, 500, "wheel/button scrolling must clamp");
  controller.scrollBy(-1000);
  assert.equal(value, 0);
});

test("title formations use one normalized path model with slower depth and static reduced motion", () => {
  const context = {
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
    clamp: (value, min, max) => Math.max(min, Math.min(max, value)),
    rand: (min, max) => (min + max) / 2
  };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(source("src/08-title-traffic.js"), context);
  const durations = vm.runInContext(`({
    distant: makeTitleFormation(0, 1, true, "distant").durationSeconds,
    midground: makeTitleFormation(0, 1, true, "midground").durationSeconds,
    foreground: makeTitleFormation(0, 1, true, "foreground").durationSeconds
  })`, context);
  assert.ok(durations.distant > durations.midground);
  assert.ok(durations.midground > durations.foreground);
  const endpoints = vm.runInContext(`(() => {
    const formation = makeTitleFormation(0, 1, true, "midground");
    return { start: titleFormationPositionAt(formation, 0), end: titleFormationPositionAt(formation, 1) };
  })()`, context);
  assert.ok(endpoints.start.x < 0);
  assert.ok(endpoints.end.x > context.W);
  context.settingReducedMotion = true;
  vm.runInContext("initTitleFormations(); updateTitleFormations(1);", context);
  const reduced = vm.runInContext("({count: state.titleFormations.length, progress: state.titleFormations[0].normalizedProgress})", context);
  assert.equal(reduced.count, 1);
  assert.equal(reduced.progress, 0.52);
  assert.doesNotMatch(source("src/08-title-traffic.js"), /avoidX|speedScale|speed \*=/);
  assert.doesNotMatch(source("src/11-rendering-title-effects.js"), /avoidX|avoidY/);
});
