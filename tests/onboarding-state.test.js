const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const repoRoot = path.resolve(__dirname, "..");

function loadOnboardingModule() {
  const source = fs.readFileSync(path.join(repoRoot, "src", "00-onboarding-state.js"), "utf8");
  const context = { console, globalThis: null };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(source, context);
  return context;
}

test("new-player detection never forces players with meaningful local progress", () => {
  const api = loadOnboardingModule();
  const empty = {
    highScore: 0,
    meta: {
      totalGlory: 0,
      credits: 0,
      currentSeason: { xp: 0, claimedRewardIds: [] },
      lifetime: { runs: 0, score: 0, kills: 0, bosses: 0, powerups: 0, ghostUses: 0 }
    },
    achievementIds: [],
    codex: {}
  };
  assert.equal(api.hasMeaningfulLocalProgress(empty), false);
  assert.equal(api.onboardingRoute({ storedState: null, progress: empty }), "first_flight_offer");

  const variants = [
    { highScore: 1 },
    { meta: { lifetime: { runs: 1 } } },
    { meta: { totalGlory: 1 } },
    { meta: { currentSeason: { xp: 1 } } },
    { meta: { credits: 1 } },
    { meta: { currentSeason: { claimedRewardIds: ["tier_2"] } } },
    { achievementIds: ["first_sortie"] },
    { codex: { red: true } }
  ];
  for (const variant of variants) {
    const progress = {
      ...empty,
      ...variant,
      meta: variant.meta || empty.meta,
      achievementIds: variant.achievementIds || empty.achievementIds,
      codex: variant.codex || empty.codex
    };
    assert.equal(api.hasMeaningfulLocalProgress(progress), true);
    assert.equal(api.onboardingRoute({ storedState: null, progress }), "existing_player_notice");
  }
});

test("versioned onboarding state sanitizes, checkpoints, resumes, skips, completes, and replays", () => {
  const api = loadOnboardingModule();
  const initial = api.makeDefaultOnboardingState(1000);
  assert.deepEqual(
    JSON.parse(JSON.stringify(initial)),
    {
      schemaVersion: 1,
      tutorialVersion: 1,
      status: "unseen",
      checkpoint: "incoming",
      startedAtMs: 0,
      updatedAtMs: 1000,
      completedAtMs: 0,
      existingPlayerOfferDismissed: false,
      accountOfferShown: false,
      codexGraduationApplied: false
    }
  );

  const started = api.transitionOnboardingState(initial, { type: "begin" }, 2000);
  assert.equal(started.status, "in_progress");
  assert.equal(started.startedAtMs, 2000);
  assert.equal(api.onboardingRoute({ storedState: started, progress: {} }), "resume_training");

  const checkpointed = api.transitionOnboardingState(started, { type: "checkpoint", checkpoint: "before_wraith" }, 3000);
  assert.equal(checkpointed.checkpoint, "before_wraith");
  assert.equal(api.tutorialStepForCheckpoint(checkpointed.checkpoint), "wraith_briefing");
  const resumed = api.transitionOnboardingState(checkpointed, { type: "resume" }, 3500);
  assert.equal(resumed.status, "in_progress");
  assert.equal(resumed.checkpoint, "before_wraith");
  assert.equal(resumed.startedAtMs, checkpointed.startedAtMs);

  const skipped = api.transitionOnboardingState(checkpointed, { type: "skip" }, 4000);
  assert.equal(skipped.status, "skipped");
  assert.equal(api.onboardingRoute({ storedState: skipped, progress: {} }), "title");

  const replay = api.transitionOnboardingState(skipped, { type: "replay" }, 5000);
  assert.equal(replay.status, "in_progress");
  assert.equal(replay.checkpoint, "incoming");
  assert.equal(replay.completedAtMs, 0);

  const completed = api.transitionOnboardingState(replay, { type: "complete" }, 6000);
  assert.equal(completed.status, "completed");
  assert.equal(completed.checkpoint, "graduation");
  assert.equal(completed.completedAtMs, 6000);

  const sanitized = api.sanitizeOnboardingState({ status: "broken", checkpoint: "nope", completedAtMs: -4 }, 7000);
  assert.equal(sanitized.status, "unseen");
  assert.equal(sanitized.checkpoint, "incoming");
  assert.equal(sanitized.completedAtMs, 0);
});

test("tutorial step order and checkpoints are stable and action-oriented", () => {
  const api = loadOnboardingModule();
  assert.deepEqual(Array.from(api.TUTORIAL_STEP_IDS), [
    "incoming",
    "lightspeed",
    "movement",
    "auto_weapons",
    "evasion",
    "ghost_shift",
    "powerup",
    "controlled_wave",
    "command_boss",
    "wraith_briefing",
    "realm_practice",
    "wraith_boss",
    "graduation"
  ]);
  assert.equal(api.tutorialStepForCheckpoint("movement_complete"), "auto_weapons");
  assert.equal(api.tutorialStepForCheckpoint("ghost_complete"), "powerup");
  assert.equal(api.tutorialStepForCheckpoint("before_command"), "command_boss");
  assert.equal(api.tutorialStepForCheckpoint("before_wraith"), "wraith_briefing");
  assert.equal(api.tutorialStepForCheckpoint("before_wraith_boss"), "wraith_boss");
  assert.equal(api.tutorialStepForCheckpoint("graduation"), "graduation");
});

test("input prompts follow meaningful keyboard, touch, and pen input", () => {
  const api = loadOnboardingModule();
  assert.equal(api.tutorialInputPrompt("keyboard", "movement"), "MOVE  WASD / ARROWS");
  assert.equal(api.tutorialInputPrompt("keyboard", "ability"), "GHOST SHIFT  SPACE / SHIFT / E");
  assert.equal(api.tutorialInputPrompt("touch", "movement"), "MOVE  VIRTUAL STICK");
  assert.equal(api.tutorialInputPrompt("touch", "ability"), "GHOST SHIFT  ABILITY CONTROL");
  assert.equal(api.tutorialInputPrompt("pen", "movement"), "MOVE  PEN STICK");
  assert.equal(api.tutorialInputPrompt("pen", "realm"), "REALM HOP  PEN ABILITY");
});

test("lightspeed pacing is elapsed-time based across refresh rates with accessible alternatives", () => {
  const api = loadOnboardingModule();
  assert.equal(api.tutorialLaunchDurationSeconds(false), 1.5);
  assert.equal(api.tutorialLaunchDurationSeconds(true), 0.42);
  for (const hz of [30, 60, 90, 120]) {
    let elapsed = 0;
    while (elapsed < 1.5) elapsed += 1 / hz;
    const snapshot = api.tutorialLaunchSnapshot(elapsed, { reducedMotion: false, reducedFlash: false });
    assert.equal(snapshot.complete, true);
    assert.equal(snapshot.stage, "arrival");
    assert.ok(snapshot.progress >= 1);
    assert.ok(snapshot.bloom <= 0.58);
    assert.equal(snapshot.titleUiAlpha, 0);
    assert.equal(Number(snapshot.shipNormalizedY.toFixed(3)), 0.8);
  }
  const reduced = api.tutorialLaunchSnapshot(0.21, { reducedMotion: true, reducedFlash: true });
  assert.equal(reduced.streaks, 0);
  assert.ok(reduced.bloom <= 0.22);
  assert.ok(reduced.titleUiAlpha < 0.2);
});

test("tutorial and debug runs are excluded from every normal progression commit", () => {
  const api = loadOnboardingModule();
  assert.equal(api.runModeAllowsProgression("standard"), true);
  assert.equal(api.runModeAllowsProgression("tutorial"), false);
  assert.equal(api.runModeAllowsProgression("debug"), false);
  assert.equal(api.runModeAllowsFirebaseProgression("tutorial"), false);
  assert.equal(api.runModeAllowsAchievements("tutorial"), false);
  assert.equal(api.runModeAllowsCodexDiscovery("tutorial"), false);
});
