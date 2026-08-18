const TITLE_MAX_FORMATIONS = 2;
const TITLE_FORMATION_MIN_GAP = 18;
let titleFormationIdCounter = 0;
const TITLE_DEPTH_PROFILES = Object.freeze({
  distant: Object.freeze({
    duration: [23, 31],
    scale: [0.32, 0.48],
    alpha: [0.28, 0.40],
    blur: 1.0,
    order: 0,
    curve: [10, 24]
  }),
  midground: Object.freeze({
    duration: [17, 23],
    scale: [0.56, 0.78],
    alpha: [0.50, 0.68],
    blur: 0.25,
    order: 1,
    curve: [18, 38]
  }),
  foreground: Object.freeze({
    duration: [13, 17],
    scale: [0.82, 1.00],
    alpha: [0.72, 0.88],
    blur: 0,
    order: 2,
    curve: [22, 46]
  })
});

function pickTitleDepthLayer(forcedLayer = "") {
  if (TITLE_DEPTH_PROFILES[forcedLayer]) return forcedLayer;
  const roll = Math.random();
  if (roll < 0.35) return "distant";
  if (roll < 0.88) return "midground";
  return "foreground";
}

function titleLaneForDepth(depthLayer, lane = 0) {
  const laneSets = {
    distant: [0.76, 0.86],
    midground: [0.84, 0.91],
    foreground: [0.87, 0.92]
  };
  const values = laneSets[depthLayer] || laneSets.midground;
  return H * values[Math.abs(lane) % values.length];
}

function titleFormationPositionAt(formation, normalizedTime) {
  const t = clamp(Number(normalizedTime) || 0, 0, 1);
  const path = formation.path || {};
  const eased = t * t * (3 - 2 * t);
  const x = path.startX + (path.endX - path.startX) * eased;
  const baseY = path.startY + (path.endY - path.startY) * t;
  const curve = Math.sin(Math.PI * t) * Number(path.curveAmplitude || 0) * Number(path.curveSign || 1);
  return { x, y: baseY + curve };
}

function titleFormationTangentAt(formation, normalizedTime) {
  const epsilon = 0.001;
  const before = titleFormationPositionAt(formation, Math.max(0, normalizedTime - epsilon));
  const after = titleFormationPositionAt(formation, Math.min(1, normalizedTime + epsilon));
  return {
    x: after.x - before.x,
    y: after.y - before.y,
    // Title presentation cancels the hostile sprite's combat rotation, leaving
    // its canonical nose-up artwork. Rotate that nose into the path tangent.
    angle: Math.atan2(after.y - before.y, after.x - before.x) + Math.PI / 2
  };
}

function makeTitleFormation(lane = 0, dir = 1, spawnAbove = false, forcedLayer = "") {
  const depthLayer = pickTitleDepthLayer(forcedLayer);
  const profile = TITLE_DEPTH_PROFILES[depthLayer];
  const groupedPatterns = ["vee", "line", "arrow", "diamond", "escort"];
  const pattern = Math.random() < 0.76 ? "solo" : groupedPatterns[Math.floor(Math.random() * groupedPatterns.length)];
  const members = pattern === "solo" ? 1 : (Math.random() < 0.78 ? 2 : 3);
  const margin = depthLayer === "foreground" ? 170 : 110;
  const direction = dir === -1 ? -1 : 1;
  const startX = direction > 0 ? -margin : W + margin;
  const endX = direction > 0 ? W + margin : -margin;
  const laneY = titleLaneForDepth(depthLayer, lane);
  const verticalDrift = rand(-H * 0.04, H * 0.04);
  const path = {
    startX,
    endX,
    startY: laneY + rand(-8, 8),
    endY: laneY + verticalDrift,
    curveAmplitude: rand(profile.curve[0], profile.curve[1]),
    curveSign: Math.random() < 0.5 ? -1 : 1
  };
  const formation = {
    id: `title-formation-${++titleFormationIdCounter}`,
    dir: direction,
    pattern,
    kind: ["red", "orange", "purple"][Math.floor(Math.random() * 3)],
    members,
    depthLayer,
    durationSeconds: rand(profile.duration[0], profile.duration[1]),
    normalizedProgress: spawnAbove ? 0 : rand(0.04, 0.18),
    path,
    drawOrder: profile.order,
    renderBlur: profile.blur,
    renderScale: rand(profile.scale[0], profile.scale[1]),
    renderAlpha: rand(profile.alpha[0], profile.alpha[1]),
    sway: rand(0, TAU),
    leaderHistory: [],
    removed: false,
    ageSeconds: 0,
    traversalStartedAt: 0,
    traversalCompletedAt: null,
    x: startX,
    y: path.startY,
    prevX: startX,
    prevY: path.startY,
    vx_this_frame: 0,
    vy_this_frame: 0,
    angle: direction > 0 ? Math.PI / 2 : -Math.PI / 2
  };
  const position = titleFormationPositionAt(formation, formation.normalizedProgress);
  formation.x = position.x;
  formation.y = position.y;
  return formation;
}

function titleFormationVisualRadius(formation) {
  const memberSpread = 1 + Math.max(0, Number(formation.members || 1) - 1) * 0.44;
  return 32 * Math.max(0.5, Number(formation.renderScale || 1)) * memberSpread + 12;
}

function titlePathReservationConflict(first, second, futureSeconds = 0) {
  if (first.depthLayer !== second.depthLayer) return false;
  const firstTime = first.normalizedProgress + futureSeconds / first.durationSeconds;
  const secondTime = second.normalizedProgress + futureSeconds / second.durationSeconds;
  const firstPosition = titleFormationPositionAt(first, firstTime);
  const secondPosition = titleFormationPositionAt(second, secondTime);
  const minimum = titleFormationVisualRadius(first) + titleFormationVisualRadius(second) + TITLE_FORMATION_MIN_GAP;
  return Math.hypot(firstPosition.x - secondPosition.x, firstPosition.y - secondPosition.y) < minimum;
}

function formationSpawnWouldOverlap(formation) {
  return state.titleFormations.some((other) => (
    other && !other.removed && [0, 2, 4, 6].some((seconds) => titlePathReservationConflict(formation, other, seconds))
  ));
}

function initTitleFormations() {
  titleFormationIdCounter = 0;
  state.titleFormations = [];
  state.titleLaneCooldowns = [0, 0, 0, 0];
  state.titleLaneCursor = 0;
  state.titleSpawnTimer = 120;
  if (settingReducedMotion) {
    const atmospheric = makeTitleFormation(0, 1, true, "distant");
    atmospheric.normalizedProgress = 0.52;
    const position = titleFormationPositionAt(atmospheric, atmospheric.normalizedProgress);
    atmospheric.x = position.x;
    atmospheric.y = position.y;
    state.titleFormations.push(atmospheric);
    return;
  }
  const midground = makeTitleFormation(0, 1, true, "midground");
  midground.normalizedProgress = 0.22;
  const foreground = makeTitleFormation(1, -1, true, "foreground");
  foreground.normalizedProgress = 0.36;
  for (const formation of [midground, foreground]) {
    const position = titleFormationPositionAt(formation, formation.normalizedProgress);
    formation.x = position.x;
    formation.y = position.y;
    state.titleFormations.push(formation);
  }
}

function spawnTitleFormationIfPossible() {
  const lane = state.titleLaneCursor++ % 2;
  const dir = state.titleLaneCursor % 2 === 0 ? 1 : -1;
  const hasReadableFormation = state.titleFormations.some((active) => (
    active && !active.removed && active.depthLayer !== "distant"
  ));
  const formation = makeTitleFormation(lane, dir, true, hasReadableFormation ? "" : "midground");
  if (formationSpawnWouldOverlap(formation)) return false;
  state.titleFormations.push(formation);
  return true;
}

function separateTitleFormations() {
  return state.titleFormations;
}

function updateTitleFormationPosition(formation) {
  const position = titleFormationPositionAt(formation, formation.normalizedProgress);
  const tangent = titleFormationTangentAt(formation, formation.normalizedProgress);
  formation.prevX = formation.x;
  formation.prevY = formation.y;
  formation.x = position.x;
  formation.y = position.y;
  formation.vx_this_frame = formation.x - formation.prevX;
  formation.vy_this_frame = formation.y - formation.prevY;
  formation.angle = tangent.angle;
  formation.leaderHistory.push({ x: formation.x, y: formation.y });
  if (formation.leaderHistory.length > 12) formation.leaderHistory.shift();
}

function updateTitleFormations(elapsedSeconds = 1 / 60) {
  if (!state.titleFormations.length) initTitleFormations();
  if (settingReducedMotion) {
    if (state.titleFormations.length !== 1 || state.titleFormations[0].depthLayer !== "distant") initTitleFormations();
    updateTitleFormationPosition(state.titleFormations[0]);
    return;
  }
  const seconds = clamp(Number(elapsedSeconds) || 1 / 60, 0, 0.1);
  for (let index = state.titleFormations.length - 1; index >= 0; index--) {
    const formation = state.titleFormations[index];
    formation.ageSeconds += seconds;
    formation.normalizedProgress += seconds / formation.durationSeconds;
    updateTitleFormationPosition(formation);
    if (formation.normalizedProgress >= 1) {
      formation.traversalCompletedAt = formation.ageSeconds;
      formation.removed = true;
      state.titleFormations.splice(index, 1);
    }
  }
  state.titleSpawnTimer -= seconds * 60;
  if (state.titleSpawnTimer <= 0 && state.titleFormations.length < TITLE_MAX_FORMATIONS) {
    state.titleSpawnTimer = spawnTitleFormationIfPossible() ? rand(150, 260) : 45;
  }
  if (state.titleFormations.length > TITLE_MAX_FORMATIONS) state.titleFormations.length = TITLE_MAX_FORMATIONS;
}

function updateTitleScreen() {
  if (state.sceneTransition.mode === "tutorial_return") {
    state.sceneTransition.frame++;
    state.sceneTransition.elapsedSeconds = Number(state.sceneTransition.elapsedSeconds || 0) + SIMULATION_STEP_MS / 1000;
    updateTitleFormations(SIMULATION_STEP_MS / 1000);
    if (state.sceneTransition.elapsedSeconds >= state.sceneTransition.durationSeconds) {
      state.sceneTransition = { mode: "idle", frame: 0, duration: 1, elapsedSeconds: 0, durationSeconds: 0 };
      if (onboardingUiMode !== "none") renderOnboardingAccessibleMode();
      else hideTutorialAccessibleSurface("Hangar ready.");
    }
    return;
  }
  if (state.sceneTransition.mode === "title_launch") {
    state.sceneTransition.frame++;
    state.sceneTransition.elapsedSeconds = Number(state.sceneTransition.elapsedSeconds || 0) + SIMULATION_STEP_MS / 1000;
    updateTitleFormations(SIMULATION_STEP_MS / 1000);
    if (
      state.sceneTransition.durationSeconds
        ? state.sceneTransition.elapsedSeconds >= state.sceneTransition.durationSeconds
        : state.sceneTransition.frame >= state.sceneTransition.duration
    ) startPlayingSession();
    return;
  }
  if (typeof onboardingGalaxySceneActive === "function" && onboardingGalaxySceneActive()) {
    if (typeof updateOnboardingIntroFlight === "function") updateOnboardingIntroFlight(SIMULATION_STEP_MS / 1000);
    callSignCursorBlink = (callSignCursorBlink + 1) % 56;
    return;
  }
  updateTitleFormations(SIMULATION_STEP_MS / 1000);
  if (titlePanelTarget === 0 && titlePanelAnim < 0.02) {
    titleSubState = "main";
    codexDetailType = null;
  }
  titlePanelAnim = settingReducedMotion ? titlePanelTarget : titlePanelAnim + (titlePanelTarget - titlePanelAnim) * 0.22;
  titleMetaScreenTransition = settingReducedMotion ? 1 : titleMetaScreenTransition + (1 - titleMetaScreenTransition) * 0.24;
  if (titleMetaScreenTransition > 0.995) titleMetaScreenTransition = 1;
  if (typeof onboardingAccountPulseFrames === "number" && onboardingAccountPulseFrames > 0) onboardingAccountPulseFrames--;
  callSignCursorBlink = (callSignCursorBlink + 1) % 56;
  if (titleSubState === "progress") clampTitleProgressScroll();
}

globalThis.titleFormationPositionAt = titleFormationPositionAt;
globalThis.titleFormationTangentAt = titleFormationTangentAt;
globalThis.TITLE_DEPTH_PROFILES = TITLE_DEPTH_PROFILES;
