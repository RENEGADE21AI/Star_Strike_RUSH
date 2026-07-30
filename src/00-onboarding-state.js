const ONBOARDING_STORAGE_KEY = "star_strike_rush_onboarding_v1";
const ONBOARDING_SCHEMA_VERSION = 1;
const ONBOARDING_TUTORIAL_VERSION = 1;
const ONBOARDING_STATUSES = Object.freeze(["unseen", "in_progress", "completed", "skipped"]);
const TUTORIAL_INSTRUCTOR = Object.freeze({
  name: "COLONEL ARISAKA",
  title: "SENIOR FLIGHT INSTRUCTOR",
  firstQuestion: "Is this your first time here, pilot?"
});
const TUTORIAL_STEP_IDS = Object.freeze([
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
const TUTORIAL_CHECKPOINT_STEPS = Object.freeze({
  incoming: "incoming",
  movement_complete: "auto_weapons",
  ghost_complete: "powerup",
  before_command: "command_boss",
  before_wraith: "wraith_briefing",
  before_wraith_boss: "wraith_boss",
  graduation: "graduation"
});

function onboardingTimestamp(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.floor(number) : Math.max(0, Math.floor(Number(fallback) || 0));
}

function makeDefaultOnboardingState(nowMs = Date.now()) {
  return {
    schemaVersion: ONBOARDING_SCHEMA_VERSION,
    tutorialVersion: ONBOARDING_TUTORIAL_VERSION,
    status: "unseen",
    checkpoint: "incoming",
    startedAtMs: 0,
    updatedAtMs: onboardingTimestamp(nowMs),
    completedAtMs: 0,
    accountOfferShown: false,
    codexGraduationApplied: false
  };
}

function sanitizeOnboardingState(raw, nowMs = Date.now()) {
  const source = raw && typeof raw === "object" ? raw : {};
  const state = makeDefaultOnboardingState(nowMs);
  if (ONBOARDING_STATUSES.includes(source.status)) state.status = source.status;
  if (Object.prototype.hasOwnProperty.call(TUTORIAL_CHECKPOINT_STEPS, source.checkpoint)) {
    state.checkpoint = source.checkpoint;
  }
  state.startedAtMs = onboardingTimestamp(source.startedAtMs);
  state.updatedAtMs = onboardingTimestamp(source.updatedAtMs, nowMs);
  state.completedAtMs = onboardingTimestamp(source.completedAtMs);
  state.accountOfferShown = source.accountOfferShown === true;
  state.codexGraduationApplied = source.codexGraduationApplied === true;
  if (state.status !== "completed") state.completedAtMs = 0;
  return state;
}

function onboardingRoute(options = {}) {
  if (!options.storedState) return "first_time_question";
  const state = sanitizeOnboardingState(options.storedState);
  if (state.status === "in_progress") return "resume_training";
  return "title";
}

function postTutorialIdentityRoute(options = {}) {
  if (options.replay === true) return "title";
  if (options.signedIn !== true) return "post_callsign";
  if (options.pendingCallSign === true || options.failedCallSign === true) return "post_callsign";
  return String(options.handle || "").trim() ? "identity_confirmed" : "post_handle";
}

function transitionOnboardingState(current, event = {}, nowMs = Date.now()) {
  const state = sanitizeOnboardingState(current, nowMs);
  const next = { ...state, updatedAtMs: onboardingTimestamp(nowMs) };
  if (event.type === "begin" || event.type === "replay" || event.type === "restart") {
    next.status = "in_progress";
    next.checkpoint = "incoming";
    next.startedAtMs = onboardingTimestamp(nowMs);
    next.completedAtMs = 0;
    next.accountOfferShown = false;
  } else if (event.type === "resume") {
    next.status = "in_progress";
  } else if (event.type === "checkpoint" && Object.prototype.hasOwnProperty.call(TUTORIAL_CHECKPOINT_STEPS, event.checkpoint)) {
    next.status = "in_progress";
    next.checkpoint = event.checkpoint;
  } else if (event.type === "skip") {
    next.status = "skipped";
    next.completedAtMs = 0;
  } else if (event.type === "complete") {
    next.status = "completed";
    next.checkpoint = "graduation";
    next.completedAtMs = onboardingTimestamp(nowMs);
  } else if (event.type === "account_offer_shown") {
    next.accountOfferShown = true;
  } else if (event.type === "codex_graduation_applied") {
    next.codexGraduationApplied = true;
  }
  return next;
}

function tutorialStepForCheckpoint(checkpoint) {
  return TUTORIAL_CHECKPOINT_STEPS[checkpoint] || "incoming";
}

function tutorialInputPrompt(inputMode, objectiveKind) {
  const mode = inputMode === "pen" ? "pen" : inputMode === "touch" ? "touch" : "keyboard";
  const kind = String(objectiveKind || "movement");
  if (mode === "pen") {
    if (kind === "realm") return "REALM HOP  PEN ABILITY";
    if (kind === "ability") return "GHOST SHIFT  PEN ABILITY";
    return "MOVE  PEN STICK";
  }
  if (mode === "touch") {
    if (kind === "realm") return "REALM HOP  ABILITY CONTROL";
    if (kind === "ability") return "GHOST SHIFT  ABILITY CONTROL";
    return "MOVE  VIRTUAL STICK";
  }
  if (kind === "realm") return "REALM HOP  SPACE / SHIFT / E";
  if (kind === "ability") return "GHOST SHIFT  SPACE / SHIFT / E";
  return "MOVE  WASD / ARROWS";
}

function tutorialLaunchDurationSeconds(reducedMotion = false) {
  return reducedMotion ? 0.42 : 1.5;
}

function tutorialLaunchSnapshot(elapsedSeconds, options = {}) {
  const reducedMotion = options.reducedMotion === true;
  const reducedFlash = options.reducedFlash === true;
  const durationSeconds = tutorialLaunchDurationSeconds(reducedMotion);
  const progress = Math.max(0, Number(elapsedSeconds) || 0) / durationSeconds;
  const clamped = Math.min(1, progress);
  let stage = "lock_in";
  if (clamped >= 0.84) stage = "arrival";
  else if (clamped >= 0.62) stage = "lightspeed";
  else if (clamped >= 0.20) stage = "acceleration";
  return {
    durationSeconds,
    progress,
    clampedProgress: clamped,
    stage,
    complete: progress >= 1,
    streaks: reducedMotion ? 0 : Math.round(12 + clamped * 28),
    bloom: Math.min(reducedFlash ? 0.22 : 0.58, clamped * (reducedFlash ? 0.24 : 0.62)),
    titleUiAlpha: Math.max(0, 1 - clamped * 1.8),
    shipNormalizedY: 0.465 + (0.8 - 0.465) * (1 - Math.pow(1 - clamped, 3))
  };
}

function runModeAllowsProgression(runMode) {
  return runMode === "standard";
}

function runModeAllowsFirebaseProgression(runMode) {
  return runModeAllowsProgression(runMode);
}

function runModeAllowsAchievements(runMode) {
  return runModeAllowsProgression(runMode);
}

function runModeAllowsCodexDiscovery(runMode) {
  return runModeAllowsProgression(runMode);
}

Object.assign(globalThis, {
  ONBOARDING_STORAGE_KEY,
  ONBOARDING_SCHEMA_VERSION,
  ONBOARDING_TUTORIAL_VERSION,
  TUTORIAL_INSTRUCTOR,
  TUTORIAL_STEP_IDS,
  makeDefaultOnboardingState,
  sanitizeOnboardingState,
  onboardingRoute,
  postTutorialIdentityRoute,
  transitionOnboardingState,
  tutorialStepForCheckpoint,
  tutorialInputPrompt,
  tutorialLaunchDurationSeconds,
  tutorialLaunchSnapshot,
  runModeAllowsProgression,
  runModeAllowsFirebaseProgression,
  runModeAllowsAchievements,
  runModeAllowsCodexDiscovery
});
