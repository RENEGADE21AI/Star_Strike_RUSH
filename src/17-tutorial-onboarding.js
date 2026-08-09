let onboardingState = null;
let onboardingUiMode = "none";
let tutorialDirector = null;
let tutorialRuntime = null;
let pendingTutorialStep = "";
let pendingTutorialReplay = false;
let tutorialDom = null;
let tutorialSkipReturnMode = "title";
let tutorialSkipCancelUiMode = "prelaunch_briefing";
let tutorialLiveSignature = "";
let onboardingAccountPulseFrames = 0;
let onboardingPersistenceWarning = false;
let tutorialFocusReturnTarget = null;
let onboardingIntroFlight = {
  active: false,
  elapsedSeconds: 0,
  durationSeconds: 1.25
};

function beginOnboardingIntroFlight() {
  onboardingIntroFlight = {
    active: true,
    elapsedSeconds: 0,
    durationSeconds: settingReducedMotion ? 0.28 : 1.25
  };
}

function onboardingGalaxySceneActive() {
  return state.gameState === "start" && onboardingUiMode !== "none" && state.sceneTransition.mode !== "title_launch";
}

function updateOnboardingIntroFlight(elapsedSeconds = SIMULATION_STEP_MS / 1000) {
  if (!onboardingIntroFlight.active) return false;
  onboardingIntroFlight.elapsedSeconds = Math.min(
    onboardingIntroFlight.durationSeconds,
    onboardingIntroFlight.elapsedSeconds + Math.max(0, Number(elapsedSeconds) || 0)
  );
  if (onboardingIntroFlight.elapsedSeconds < onboardingIntroFlight.durationSeconds) return true;
  onboardingIntroFlight.active = false;
  renderOnboardingAccessibleMode();
  return false;
}

function onboardingIntroShipPosition() {
  const duration = Math.max(0.001, onboardingIntroFlight.durationSeconds);
  const progress = onboardingIntroFlight.active
    ? clamp(onboardingIntroFlight.elapsedSeconds / duration, 0, 1)
    : 1;
  const eased = 1 - Math.pow(1 - progress, 3);
  return {
    x: W / 2 + Math.sin(progress * Math.PI) * W * 0.045,
    y: H + 58 + (H * 0.80 - H - 58) * eased,
    progress
  };
}

function drawOnboardingGalaxyScene() {
  if (!onboardingGalaxySceneActive()) return;
  const ship = onboardingIntroShipPosition();
  if (typeof drawEnginePlume === "function") {
    drawEnginePlume(ship.x, ship.y + 17, {
      scale: 1.15,
      alpha: 0.88,
      color: "92,238,255",
      phase: ship.progress * 9
    });
  }
  drawSpriteAsset(ctx, "player", ship.x, ship.y, {
    alpha: 1,
    glowColor: "#73efff",
    glowBlur: onboardingIntroFlight.active ? 14 : 9
  });
}

function suppressTutorialTransmissionEffects() {
  stabilizeTutorialPlayer();
  if (state.fx) {
    state.fx.shake = 0;
    state.fx.flash = 0;
  }
}

function stabilizeTutorialPlayer(options = {}) {
  if (typeof clearGameplayInput === "function") clearGameplayInput();
  const player = state && state.player;
  if (!player) return false;
  player.vx = 0;
  player.vy = 0;
  player.ghostTimer = 0;
  player.dashTimer = 0;
  if (options.resetCooldown === true) player.ghostCooldown = 0;
  if (options.resetRealm === true) state.playerRealm = 0;
  if (options.resetPosition === true) {
    player.x = W / 2;
    player.y = H - 92;
  }
  return true;
}

function tutorialTransmissionVisible() {
  return (
    state.runMode === "tutorial" &&
    !!tutorialDirector &&
    tutorialDirector.dialogueVisible === true
  ) || onboardingGalaxySceneActive();
}

function loadOnboardingStateFromDevice() {
  try {
    const raw = localStorage.getItem(ONBOARDING_STORAGE_KEY);
    return raw ? sanitizeOnboardingState(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

function saveOnboardingStateToDevice(nextState) {
  onboardingState = sanitizeOnboardingState(nextState);
  try {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(onboardingState));
    onboardingPersistenceWarning = false;
    return true;
  } catch {
    onboardingPersistenceWarning = true;
    return false;
  }
}

function createTutorialDom() {
  if (tutorialDom) return tutorialDom;
  const root = document.createElement("section");
  root.id = "tutorialAccessibility";
  root.setAttribute("aria-label", "First Flight training");
  root.style.cssText = [
    "position:fixed",
    "inset:0",
    "z-index:5",
    "pointer-events:none",
    "display:block",
    "font-family:Arial,sans-serif"
  ].join(";");

  const live = document.createElement("div");
  live.id = "tutorialLiveRegion";
  live.setAttribute("role", "status");
  live.setAttribute("aria-live", "polite");
  live.setAttribute("aria-atomic", "true");
  live.style.cssText = "position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap";

  const actions = document.createElement("div");
  actions.id = "tutorialAccessibleActions";
  actions.style.cssText = [
    "position:absolute",
    "left:50%",
    "bottom:max(24px,env(safe-area-inset-bottom))",
    "transform:translateX(-50%)",
    "display:none",
    "gap:10px",
    "flex-wrap:wrap",
    "justify-content:center",
    "width:min(92vw,520px)",
    "pointer-events:auto"
  ].join(";");

  root.addEventListener("keydown", (event) => {
    if (event.key !== "Tab" || root.getAttribute("aria-modal") !== "true") return;
    const buttons = Array.from(actions.querySelectorAll("button:not([disabled])"));
    if (!buttons.length) {
      event.preventDefault();
      return;
    }
    const first = buttons[0];
    const last = buttons[buttons.length - 1];
    const active = document.activeElement;
    if (event.shiftKey && (active === first || !actions.contains(active))) {
      event.preventDefault();
      last.focus({ preventScroll: true });
    } else if (!event.shiftKey && (active === last || !actions.contains(active))) {
      event.preventDefault();
      first.focus({ preventScroll: true });
    }
  });

  root.append(live, actions);
  document.body.appendChild(root);
  tutorialDom = { root, live, actions };
  return tutorialDom;
}

function restoreTutorialFocus(dom) {
  const target = tutorialFocusReturnTarget;
  tutorialFocusReturnTarget = null;
  if (!target || !target.isConnected || typeof target.focus !== "function") return;
  requestAnimationFrame(() => {
    if (dom.root.getAttribute("aria-modal") === "true") return;
    try { target.focus({ preventScroll: true }); } catch {}
  });
}

function tutorialAccessibleButton(label, action, primary = false) {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = label;
  button.dataset.onboardingAction = action;
  button.style.cssText = [
    "min-height:44px",
    "padding:10px 16px",
    "border-radius:8px",
    `border:1px solid ${primary ? "rgba(111,255,205,.9)" : "rgba(174,232,255,.46)"}`,
    `background:${primary ? "rgba(5,58,55,.94)" : "rgba(3,10,24,.9)"}`,
    "color:#effcff",
    "font:800 12px Arial,sans-serif",
    "letter-spacing:.04em",
    "text-transform:uppercase",
    "cursor:pointer"
  ].join(";");
  return button;
}

function setTutorialAccessibleSurface(message, actions = []) {
  const dom = createTutorialDom();
  const wasModal = dom.root.getAttribute("aria-modal") === "true";
  const hasActions = actions.length > 0;
  if (hasActions && !wasModal) {
    const active = document.activeElement;
    tutorialFocusReturnTarget = active && !dom.root.contains(active) ? active : null;
  }
  dom.live.textContent = message;
  dom.actions.replaceChildren();
  for (const item of actions) {
    const button = tutorialAccessibleButton(item.label, item.action, item.primary);
    button.addEventListener("click", item.handler);
    dom.actions.appendChild(button);
  }
  dom.actions.style.display = hasActions ? "flex" : "none";
  if (hasActions) {
    dom.root.setAttribute("role", "dialog");
    dom.root.setAttribute("aria-modal", "true");
    dom.root.setAttribute("aria-describedby", dom.live.id);
  } else {
    dom.root.removeAttribute("role");
    dom.root.removeAttribute("aria-modal");
    dom.root.removeAttribute("aria-describedby");
    if (wasModal) restoreTutorialFocus(dom);
  }
  const focusTarget = dom.actions.querySelector("[data-onboarding-action]");
  if (focusTarget) {
    requestAnimationFrame(() => {
      if (focusTarget.isConnected && dom.actions.contains(focusTarget)) {
        focusTarget.focus({ preventScroll: true });
      }
    });
  }
}

function hideTutorialAccessibleSurface(message = "") {
  const dom = createTutorialDom();
  const wasModal = dom.root.getAttribute("aria-modal") === "true";
  dom.live.textContent = message;
  dom.actions.replaceChildren();
  dom.actions.style.display = "none";
  dom.root.removeAttribute("role");
  dom.root.removeAttribute("aria-modal");
  dom.root.removeAttribute("aria-describedby");
  if (wasModal) restoreTutorialFocus(dom);
  tutorialLiveSignature = "";
}

function beginTutorialTraining(options = {}) {
  const replay = options.replay === true;
  const resume = options.resume === true;
  pendingTutorialReplay = replay;
  onboardingState = transitionOnboardingState(
    onboardingState || makeDefaultOnboardingState(),
    { type: replay ? "replay" : resume ? "resume" : "begin" }
  );
  saveOnboardingStateToDevice(onboardingState);
  onboardingUiMode = "none";
  const requestedStep = options.stepId || tutorialStepForCheckpoint(onboardingState.checkpoint);
  pendingTutorialStep = requestedStep === "incoming" || requestedStep === "lightspeed" ? "movement" : requestedStep;
  onboardingIntroFlight.active = false;
  hideTutorialAccessibleSurface(`${TUTORIAL_INSTRUCTOR.name}: Training launch initiated.`);
  if (typeof prepareGameplayMusic === "function") prepareGameplayMusic();
  if (typeof playGameSound === "function") playGameSound("launch", 0.9);
  titlePanelTarget = 0;
  state.sceneTransition = {
    mode: "title_launch",
    frame: 0,
    duration: Math.max(1, Math.round(tutorialLaunchDurationSeconds(settingReducedMotion) * SIMULATION_HZ)),
    elapsedSeconds: 0,
    durationSeconds: tutorialLaunchDurationSeconds(settingReducedMotion)
  };
  state.lastTitleLaunchDurationSeconds = state.sceneTransition.durationSeconds;
  state.lastTitleLaunchReducedMotion = settingReducedMotion === true;
  clearGameplayInput();
}

function chooseFirstFlightRoute(startTraining) {
  onboardingState = transitionOnboardingState(
    onboardingState || makeDefaultOnboardingState(),
    { type: startTraining ? "begin" : "skip" }
  );
  const stored = saveOnboardingStateToDevice(onboardingState);
  if (startTraining) {
    onboardingIntroFlight.active = false;
    onboardingUiMode = "prelaunch_briefing";
    renderOnboardingAccessibleMode();
    return;
  }
  onboardingUiMode = "none";
  onboardingIntroFlight.active = false;
  hideTutorialAccessibleSurface(
    stored ? "First Flight choice saved." : "Continuing to title. Onboarding choice could not be stored."
  );
  setupSession("start");
}

function skipTutorialTraining() {
  onboardingState = transitionOnboardingState(onboardingState || makeDefaultOnboardingState(), { type: "skip" });
  saveOnboardingStateToDevice(onboardingState);
  onboardingUiMode = "none";
  hideTutorialAccessibleSurface("First Flight training skipped. It remains available in Settings.");
}

function requestSkipTutorialTraining(returnMode = "title") {
  tutorialSkipReturnMode = returnMode;
  tutorialSkipCancelUiMode = onboardingUiMode === "resume_training" ? "resume_training" : "prelaunch_briefing";
  onboardingUiMode = "skip_confirm";
  if (typeof clearGameAccessibleSurface === "function") {
    clearGameAccessibleSurface("Skip training confirmation opened.");
  }
  setTutorialAccessibleSurface(
    "Skip First Flight training? You can replay it from Settings at any time.",
    [
      {
        label: "Keep Training",
        action: "cancel-skip",
        primary: true,
        handler: cancelSkipTutorialTraining
      },
      {
        label: "Confirm Skip",
        action: "confirm-skip",
        handler: () => {
          skipTutorialTraining();
          setupSession("start");
        }
      }
    ]
  );
}

function cancelSkipTutorialTraining() {
  if (onboardingUiMode !== "skip_confirm") return false;
  if (tutorialSkipReturnMode === "pause") {
    onboardingUiMode = "none";
    showTutorialPauseAccessibility();
  } else {
    onboardingUiMode = tutorialSkipCancelUiMode;
    renderOnboardingAccessibleMode();
  }
  if (typeof syncGameAccessibleSurface === "function") syncGameAccessibleSurface(true);
  return true;
}

function renderOnboardingAccessibleMode() {
  const callSignText = String(callSign || "CADET");
  if (onboardingUiMode === "first_time_question") {
    if (onboardingIntroFlight.active) {
      hideTutorialAccessibleSurface(`${TUTORIAL_INSTRUCTOR.name}: incoming transmission.`);
      return;
    }
    setTutorialAccessibleSurface(
      `${TUTORIAL_INSTRUCTOR.name}: ${TUTORIAL_INSTRUCTOR.firstQuestion}`,
      [
        {
          label: "YES — START FIRST FLIGHT",
          action: "first-flight-yes",
          primary: true,
          handler: () => chooseFirstFlightRoute(true)
        },
        {
          label: "NO — GO TO TITLE",
          action: "first-flight-no",
          handler: () => chooseFirstFlightRoute(false)
        }
      ]
    );
  } else if (onboardingUiMode === "prelaunch_briefing") {
    const persistenceNotice = onboardingPersistenceWarning
      ? " Device storage is unavailable; this session will continue."
      : "";
    setTutorialAccessibleSurface(
      `Incoming transmission. ${TUTORIAL_INSTRUCTOR.name}: Command has you listed as ${callSignText}.${persistenceNotice}`,
      [
        { label: "Begin Flight Training", action: "begin", primary: true, handler: () => beginTutorialTraining() },
        { label: "Edit Call Sign", action: "edit-call-sign", handler: beginCallSignEditing }
      ]
    );
  } else if (onboardingUiMode === "resume_training") {
    setTutorialAccessibleSurface(
      `${TUTORIAL_INSTRUCTOR.name}: Training checkpoint ${onboardingState.checkpoint} is ready.`,
      [
        {
          label: "Resume Training",
          action: "resume",
          primary: true,
          handler: () => beginTutorialTraining({ resume: true, stepId: tutorialStepForCheckpoint(onboardingState.checkpoint) })
        },
        { label: "Restart Training", action: "restart", handler: () => beginTutorialTraining({ replay: true }) },
        { label: "Skip For Now", action: "skip", handler: () => requestSkipTutorialTraining("title") }
      ]
    );
  } else if (onboardingUiMode === "post_callsign") {
    setTutorialAccessibleSurface(
      `${TUTORIAL_INSTRUCTOR.name}: Confirm call sign ${callSign}. It becomes public only when an account is connected.`,
      [
        { label: "Confirm Call Sign", action: "confirm-call-sign", primary: true, handler: showPostTutorialIdentityChoice },
        { label: "Edit Call Sign", action: "edit-call-sign", handler: beginCallSignEditing }
      ]
    );
  } else if (onboardingUiMode === "post_identity") {
    setTutorialAccessibleSurface(
      "Google secures public pilot identity and the legacy account archive. Device gameplay progress remains on this device.",
      [
        { label: "Connect Google Account", action: "connect-google", primary: true, handler: connectPostTutorialIdentity },
        { label: "Continue With Device Pilot", action: "device-pilot", handler: enterPostTutorialHangar }
      ]
    );
  } else if (onboardingUiMode === "post_handle") {
    setTutorialAccessibleSurface(
      "Pilot identity active. A unique public handle is account-bound and can currently be claimed only once.",
      [
        { label: "Claim Unique Handle", action: "claim-handle", primary: true, handler: beginHandleEditing },
        { label: "Claim Later", action: "handle-later", handler: enterPostTutorialHangar }
      ]
    );
  } else if (onboardingUiMode === "identity_confirmed") {
    setTutorialAccessibleSurface(
      "PILOT IDENTITY CONFIRMED",
      [{ label: "Enter Hangar", action: "enter-hangar", primary: true, handler: () => enterPostTutorialHangar(false) }]
    );
  } else if (onboardingUiMode === "skip_confirm") {
    // requestSkipTutorialTraining owns the confirmation controls so it can
    // return to either the first-launch offer or the in-flight pause surface.
  } else {
    hideTutorialAccessibleSurface();
  }
}

function initializeOnboardingExperience(options = {}) {
  const stored = loadOnboardingStateFromDevice();
  onboardingState = stored || makeDefaultOnboardingState();
  const debugBypass = options.debugBypass === true;
  const route = debugBypass ? "title" : onboardingRoute({ storedState: stored });
  // `title` is a router destination, not an onboarding overlay. Keeping it as
  // an active UI mode blocks the normal title pointer and keyboard handlers.
  onboardingUiMode = route === "title" ? "none" : route;
  if (onboardingUiMode === "first_time_question") beginOnboardingIntroFlight();
  renderOnboardingAccessibleMode();
  return route;
}

function startTutorialSession(stepId = "incoming") {
  const transitionStars = state.stars;
  setupSession("playing", { preserveStars: true });
  state.lastArrivalContinuity = {
    starsPreserved: state.stars === transitionStars,
    playerX: state.player.x,
    playerY: state.player.y
  };
  state.runMode = "tutorial";
  document.body.dataset.gameRunMode = "tutorial";
  tutorialDirector = createTutorialDirector(stepId, callSign);
  tutorialRuntime = {
    plan: deterministicTutorialPlan(),
    beaconIndex: 0,
    ghostUsesStart: state.runStats.ghostUses,
    realmHopsStart: state.runStats.realmHops,
    tutorialKillsStart: state.runStats.kills,
    stepActivated: false,
    controlledWaveIndex: 0,
    realmThreatAvoided: false,
    realmsMatched: false,
    matchingRealmDamage: false,
    replay: pendingTutorialReplay,
    entryProgressSnapshot: JSON.stringify({
      highScore,
      meta: currentMetaSnapshot(),
      achievements: typeof getLocalAchievementIds === "function" ? getLocalAchievementIds() : []
    })
  };
  state.sceneTransition = {
    mode: "game_arrival",
    frame: 0,
    duration: Math.max(1, Math.round((settingReducedMotion ? 0.18 : 0.28) * SIMULATION_HZ)),
    elapsedSeconds: 0,
    durationSeconds: settingReducedMotion ? 0.18 : 0.28
  };
  state.player.inv = Math.max(state.player.inv, 60);
  enterTutorialStep(stepId);
  pendingTutorialStep = "";
  pendingTutorialReplay = false;
}

function tutorialSnapshot() {
  return {
    onboarding: onboardingState ? { ...onboardingState } : null,
    uiMode: onboardingUiMode,
    accountPulseFrames: onboardingAccountPulseFrames,
    introFlight: {
      active: onboardingIntroFlight.active,
      elapsedSeconds: Number(onboardingIntroFlight.elapsedSeconds.toFixed(3)),
      durationSeconds: onboardingIntroFlight.durationSeconds,
      progress: Number(onboardingIntroShipPosition().progress.toFixed(3))
    },
    director: tutorialDirector ? {
      stepId: tutorialDirector.stepId,
      stepIndex: tutorialDirector.stepIndex,
      checkpoint: tutorialDirector.checkpoint,
      objective: tutorialDirector.objective,
      objectiveKind: tutorialDirector.objectiveKind,
      objectiveProgress: tutorialDirector.objectiveProgress,
      objectiveTarget: tutorialDirector.objectiveTarget,
      dialogueVisible: tutorialDirector.dialogueVisible,
      dialogueReveal: tutorialDirector.dialogueReveal,
      inputMode: tutorialDirector.inputMode,
      tutorialBossOverride: tutorialDirector.tutorialBossOverride,
      recoveryCount: tutorialDirector.recoveryCount
    } : null,
    runtime: tutorialRuntime ? {
      beaconIndex: tutorialRuntime.beaconIndex,
      controlledWaveIndex: tutorialRuntime.controlledWaveIndex,
      evasionCrossed: tutorialRuntime.evasionCrossed === true,
      evasionVolleyId: tutorialRuntime.evasionVolleyId || "",
      ghostLanePhased: tutorialRuntime.ghostLanePhased === true,
      realmThreatAvoided: tutorialRuntime.realmThreatAvoided,
      realmsMatched: tutorialRuntime.realmsMatched,
      matchingRealmDamage: tutorialRuntime.matchingRealmDamage,
      noProgressionSnapshot: tutorialRuntime.entryProgressSnapshot,
      noProgressionInvariantPassed: tutorialRuntime.noProgressionInvariantPassed !== false
    } : null
  };
}

function enterTutorialStep(stepId) {
  if (!tutorialDirector) return;
  const next = createTutorialDirector(stepId, callSign);
  next.recoveryCount = tutorialDirector.recoveryCount || 0;
  next.inputMode = state.inputMode;
  tutorialDirector = next;
  tutorialRuntime.stepActivated = false;
  tutorialRuntime.stepStartFrame = state.frame;
  tutorialRuntime.tutorialKillsStart = state.runStats.kills;
  tutorialRuntime.ghostUsesStart = state.runStats.ghostUses;
  tutorialRuntime.realmHopsStart = state.runStats.realmHops;
  tutorialDirector.dialogueReveal = settingReducedMotion ? 1 : 0.14;
  suppressTutorialTransmissionEffects();
  if (tutorialDirector.dialogueVisible && typeof playGameSound === "function") playGameSound("ui", 0.42);
  updateTutorialLiveRegion();
}

function updateTutorialLiveRegion() {
  if (!tutorialDirector) return;
  const definition = tutorialDefinition(tutorialDirector.stepId);
  const lines = tutorialDirector.dialogue[0] ? tutorialDirector.dialogue[0].lines.join(" ") : "";
  const prompt = typeof tutorialInputPrompt === "function"
    ? tutorialInputPrompt(state.inputMode, definition.objectiveKind)
    : "";
  const message = tutorialDirector.dialogueVisible
    ? `${TUTORIAL_INSTRUCTOR.name}. ${lines}`
    : `${definition.objective}. ${prompt}`;
  const signature = `${tutorialDirector.stepId}|${tutorialDirector.dialogueVisible}|${state.inputMode}|${message}`;
  if (signature === tutorialLiveSignature) return;
  tutorialLiveSignature = signature;
  if (tutorialDirector.dialogueVisible) {
    setTutorialAccessibleSurface(message, [
      { label: "Continue", action: "continue", primary: true, handler: advanceTutorialDialogue }
    ]);
  } else {
    setTutorialAccessibleSurface(message);
  }
}

function advanceTutorialDialogue() {
  if (!tutorialDirector || !tutorialDirector.dialogueVisible) return false;
  if (tutorialDirector.dialogueReveal < 1 && !settingReducedMotion) {
    tutorialDirector.dialogueReveal = 1;
    return true;
  }
  if (tutorialDirector.stepId === "graduation") {
    if (typeof clearGameplayInput === "function") clearGameplayInput();
    if (!tutorialDirector.completed) completeTutorialGraduation({ presentDialogue: false });
    tutorialDirector.dialogueVisible = false;
    beginPostTutorialIdentityFlow();
    return true;
  }
  if (typeof clearGameplayInput === "function") clearGameplayInput();
  tutorialDirector.dialogueReveal = 1;
  tutorialDirector.dialogueVisible = false;
  activateTutorialStep();
  if (typeof clearGameplayInput === "function") clearGameplayInput();
  updateTutorialLiveRegion();
  return true;
}

function beginPostTutorialIdentityFlow() {
  setupSession("start");
  const account = accountIdentitySnapshot();
  onboardingUiMode = postTutorialIdentityRoute({
    replay: tutorialRuntime && tutorialRuntime.replay,
    signedIn: !!account.user,
    handle: account.profileHandle,
    pendingCallSign: account.pendingCallSign === true,
    failedCallSign: callSignSaveState === "error"
  });
  if (onboardingUiMode === "title") {
    enterPostTutorialHangar(false);
    return;
  }
  onboardingState = transitionOnboardingState(onboardingState, { type: "account_offer_shown" });
  saveOnboardingStateToDevice(onboardingState);
  renderOnboardingAccessibleMode();
}

function showPostTutorialIdentityChoice() {
  if (callSignEditing) commitCallSignDraft(true);
  const account = accountIdentitySnapshot();
  onboardingUiMode = account.user
    ? postTutorialIdentityRoute({
      replay: false,
      signedIn: true,
      handle: account.profileHandle,
      pendingCallSign: false,
      failedCallSign: false
    })
    : "post_identity";
  renderOnboardingAccessibleMode();
}

function connectPostTutorialIdentity() {
  const online = window.starStrikeOnline;
  if (!online || typeof online.signIn !== "function") {
    const dom = createTutorialDom();
    dom.live.textContent = "Identity service is unavailable. Device play remains ready.";
    return;
  }
  const dom = createTutorialDom();
  dom.live.textContent = "Publishing pilot identity. Device progress remains unchanged.";
  Promise.resolve(online.signIn()).then(() => {
    const snapshot = typeof online.getState === "function" ? online.getState() : {};
    if (snapshot.user) {
      onboardingUiMode = postTutorialIdentityRoute({
        replay: false,
        signedIn: true,
        handle: snapshot.profileHandle,
        pendingCallSign: snapshot.pendingCallSign === true
      });
      renderOnboardingAccessibleMode();
    } else {
      dom.live.textContent = "Identity connection was not completed. Device play remains ready.";
    }
  }).catch(() => {
    dom.live.textContent = "Identity service is unavailable. Continue with the device pilot.";
  });
}

function enterPostTutorialHangar(pulseAccount = true) {
  const account = accountIdentitySnapshot();
  if (pulseAccount && !account.user) onboardingAccountPulseFrames = 180;
  setupSession("start");
  onboardingUiMode = "none";
  hideTutorialAccessibleSurface("Entering Hangar. Device progress remains authoritative.");
}

function activateTutorialStep() {
  if (!tutorialDirector || !tutorialRuntime || tutorialRuntime.stepActivated) return;
  tutorialRuntime.stepActivated = true;
  const step = tutorialDirector.stepId;
  if (step === "movement") {
    tutorialDirector.objectiveTarget = tutorialRuntime.plan.movement.length;
  } else if (step === "auto_weapons") {
    for (const target of tutorialRuntime.plan.auto_weapons) {
      spawnEnemy(target.type, target.x, target.y, { forceSpawn: true });
      const enemy = state.enemies[state.enemies.length - 1];
      if (enemy) {
        enemy.hp = target.hp;
        enemy.maxHp = target.hp;
        enemy.vy = 0.08;
        enemy.fireTimer = 99999;
        enemy.tutorialTarget = true;
        enemy.tutorialPath = target.path;
        enemy.tutorialHoldX = target.x;
        enemy.tutorialHoldY = target.y;
      }
    }
    tutorialDirector.objectiveTarget = 3;
  } else if (step === "evasion") {
    state.player.x = 145;
    tutorialRuntime.evasionStartX = state.player.x;
    tutorialRuntime.evasionStartSide = "left";
    tutorialRuntime.evasionTargetSide = "right";
    tutorialRuntime.evasionLaneX = 220;
    tutorialRuntime.evasionDamageTakenStart = state.runStats.damageTaken;
    tutorialRuntime.evasionVolleyId = `evasion-${state.frame}`;
    tutorialRuntime.evasionVolleyActive = true;
    for (const shot of tutorialRuntime.plan.evasion) {
      state.enemyBullets.push({
        ...shot,
        life: 420,
        age: 0,
        tutorialShot: true,
        tutorialVolleyId: tutorialRuntime.evasionVolleyId
      });
    }
  } else if (step === "ghost_shift") {
    const lane = tutorialRuntime.plan.ghost_shift;
    state.player.x = lane.startX;
    state.player.energy = state.player.maxEnergy;
    state.player.ghostCooldown = 0;
    tutorialRuntime.ghostStartSide = lane.startSide;
    tutorialRuntime.ghostTargetSide = lane.targetSide;
    tutorialRuntime.ghostPreviousX = state.player.x;
    tutorialRuntime.ghostDamageTakenStart = state.runStats.damageTaken;
    tutorialRuntime.ghostLanePhased = false;
    for (let index = 0; index < 7; index++) {
      state.enemyBullets.push({
        x: lane.laneX,
        y: H * 0.61 + index * 22,
        vx: 0,
        vy: 0,
        life: 1200,
        r: 6,
        kind: "aimed",
        tutorialGhostWall: true
      });
    }
  } else if (step === "powerup") {
    state.powerups.push({ ...tutorialRuntime.plan.powerup });
  } else if (step === "controlled_wave") {
    spawnTutorialControlledWave(0);
  } else if (step === "command_boss") {
    state.phase = 4;
    spawnBoss();
    state.boss = applyTutorialBossOverride(state.boss);
    tutorialDirector.tutorialBossOverride = state.boss ? { mode: state.boss.mode, maxHp: state.boss.maxHp } : null;
    tutorialRuntime.bossesStart = state.runStats.bosses;
  } else if (step === "wraith_briefing") {
    tutorialRuntime.briefingAcknowledged = true;
    advanceTutorialStep();
  } else if (step === "realm_practice") {
    spawnTutorialWraith(true);
  } else if (step === "wraith_boss") {
    spawnTutorialWraith(false);
    tutorialRuntime.bossesStart = state.runStats.bosses;
    tutorialRuntime.wraithHpStart = state.boss ? state.boss.hp : 0;
  }
}

function spawnTutorialControlledWave(index) {
  const wave = tutorialRuntime.plan.controlled_wave[index] || [];
  tutorialRuntime.controlledWaveIndex = index;
  tutorialRuntime.tutorialKillsStart = state.runStats.kills;
  for (let itemIndex = 0; itemIndex < wave.length; itemIndex++) {
    const item = wave[itemIndex];
    const holdY = 188 + itemIndex * 34;
    spawnEnemy(item.type, item.x, holdY, { forceSpawn: true });
    const enemy = state.enemies[state.enemies.length - 1];
    if (!enemy) continue;
    enemy.hp = 1;
    enemy.maxHp = 1;
    enemy.entryFrames = 0;
    enemy.tutorialTarget = true;
    enemy.tutorialHoldX = item.x;
    enemy.tutorialHoldY = holdY;
    enemy.fireTimer = 99999;
  }
  tutorialDirector.objectiveTarget = wave.length;
}

function spawnTutorialWraith(practice) {
  spawnWraithBoss();
  state.boss = applyTutorialBossOverride(state.boss);
  if (!state.boss) return;
  state.boss.y = 94;
  state.boss.entered = true;
  state.boss.combatActive = true;
  state.boss.realm = 1;
  state.boss.attackTimer = practice ? 999999 : 96;
  state.boss.phantomSpewTimer = 999999;
  state.boss.tutorialPractice = practice;
  state.playerRealm = 0;
  state.player.energy = state.player.maxEnergy;
  tutorialDirector.tutorialBossOverride = { mode: "wraith", maxHp: state.boss.maxHp, practice };
  if (practice) {
    const threat = tutorialRuntime.plan.realm_practice.threat;
    state.enemyBullets.push({ ...threat, life: 520, age: 0, tutorialRealmThreat: true });
  }
}

function advanceTutorialStep() {
  if (!tutorialDirector) return;
  const index = TUTORIAL_STEP_IDS.indexOf(tutorialDirector.stepId);
  const nextStep = TUTORIAL_STEP_IDS[Math.min(TUTORIAL_STEP_IDS.length - 1, index + 1)];
  const checkpoints = {
    movement: "movement_complete",
    ghost_shift: "ghost_complete",
    controlled_wave: "before_command",
    command_boss: "before_wraith",
    realm_practice: "before_wraith_boss",
    wraith_boss: "graduation"
  };
  const checkpoint = checkpoints[tutorialDirector.stepId];
  if (checkpoint) {
    onboardingState = transitionOnboardingState(onboardingState, { type: "checkpoint", checkpoint });
    saveOnboardingStateToDevice(onboardingState);
  }
  clearTutorialThreats();
  enterTutorialStep(nextStep);
}

function clearTutorialThreats() {
  state.bullets = [];
  state.enemyBullets = [];
  state.enemies = [];
  state.pendingSpawns = [];
  state.powerups = [];
  state.debris = [];
  state.enemyBeams = [];
  state.gravityWells = [];
  state.wingmen = [];
  state.boss = null;
  state.bossDeath = null;
  state.bossRecovery = 0;
}

function updateTutorialDirectorRuntime() {
  if (state.runMode !== "tutorial" || !tutorialDirector || !tutorialRuntime) return;
  tutorialDirector.elapsedFrames++;
  tutorialDirector.inputMode = state.inputMode;
  if (tutorialDirector.dialogueVisible) {
    if (!settingReducedMotion) tutorialDirector.dialogueReveal = Math.min(1, tutorialDirector.dialogueReveal + 0.025);
    return;
  }
  if (!tutorialRuntime.stepActivated) activateTutorialStep();
  const step = tutorialDirector.stepId;
  if (step === "movement") {
    const beacon = tutorialRuntime.plan.movement[tutorialRuntime.beaconIndex];
    if (beacon && Math.hypot(state.player.x - beacon.x, state.player.y - beacon.y) <= beacon.radius + 14) {
      tutorialRuntime.beaconIndex++;
      tutorialDirector.objectiveProgress = tutorialRuntime.beaconIndex;
      if (tutorialObjectiveComplete(tutorialDirector, tutorialRuntime)) advanceTutorialStep();
    }
  } else if (step === "auto_weapons") {
    tutorialRuntime.tutorialKills = state.runStats.kills - tutorialRuntime.tutorialKillsStart;
    tutorialDirector.objectiveProgress = tutorialRuntime.tutorialKills;
    if (tutorialObjectiveComplete(tutorialDirector, tutorialRuntime)) advanceTutorialStep();
  } else if (step === "evasion") {
    const tookDamage = state.runStats.damageTaken > tutorialRuntime.evasionDamageTakenStart;
    if (tookDamage) {
      resetTutorialLesson("evasion", ["That lane was live.", "Cross after the volley opens."]);
      return;
    }
    tutorialRuntime.evasionCrossed = tutorialEvasionSucceeded({
      startSide: tutorialRuntime.evasionStartSide,
      targetSide: tutorialRuntime.evasionTargetSide,
      laneX: tutorialRuntime.evasionLaneX,
      startX: tutorialRuntime.evasionStartX,
      volleyActive: tutorialRuntime.evasionVolleyActive,
      damageTakenStart: tutorialRuntime.evasionDamageTakenStart,
      damageTakenCurrent: state.runStats.damageTaken,
      playerX: state.player.x
    });
    if (tutorialObjectiveComplete(tutorialDirector, tutorialRuntime)) advanceTutorialStep();
  } else if (step === "ghost_shift") {
    tutorialRuntime.ghostUses = state.runStats.ghostUses - tutorialRuntime.ghostUsesStart;
    const lane = tutorialRuntime.plan.ghost_shift;
    const crossedNow = tutorialGhostLaneSucceeded({
      startSide: tutorialRuntime.ghostStartSide,
      targetSide: tutorialRuntime.ghostTargetSide,
      laneX: lane.laneX,
      previousX: tutorialRuntime.ghostPreviousX,
      currentX: state.player.x,
      ghostActive: state.player.ghostTimer > 0,
      ghostUses: tutorialRuntime.ghostUses,
      damageTakenStart: tutorialRuntime.ghostDamageTakenStart,
      damageTakenCurrent: state.runStats.damageTaken
    });
    if (crossedNow) tutorialRuntime.ghostLanePhased = true;
    const crossedWithoutGhost = tutorialRuntime.ghostPreviousX < lane.laneX &&
      state.player.x > lane.laneX &&
      !tutorialRuntime.ghostLanePhased;
    const tookDamage = state.runStats.damageTaken > tutorialRuntime.ghostDamageTakenStart;
    tutorialRuntime.ghostPreviousX = state.player.x;
    if (crossedWithoutGhost || tookDamage) {
      resetTutorialLesson("ghost_shift", ["Ghost must cover the crossing.", "Shift first, then pierce the lane."]);
      return;
    }
    if (tutorialObjectiveComplete(tutorialDirector, tutorialRuntime)) advanceTutorialStep();
  } else if (step === "powerup") {
    tutorialRuntime.phaseShield = state.player.phaseShield || 0;
    if (tutorialObjectiveComplete(tutorialDirector, tutorialRuntime)) advanceTutorialStep();
  } else if (step === "controlled_wave") {
    const wave = tutorialRuntime.plan.controlled_wave[tutorialRuntime.controlledWaveIndex] || [];
    const kills = state.runStats.kills - tutorialRuntime.tutorialKillsStart;
    tutorialDirector.objectiveProgress = Math.min(wave.length, kills);
    if (!state.enemies.length && !state.pendingSpawns.length && kills >= wave.length) {
      if (tutorialRuntime.controlledWaveIndex + 1 < tutorialRuntime.plan.controlled_wave.length) {
        spawnTutorialControlledWave(tutorialRuntime.controlledWaveIndex + 1);
      } else {
        tutorialRuntime.controlledWavesCleared = true;
        advanceTutorialStep();
      }
    }
  } else if (step === "command_boss") {
    tutorialRuntime.commandBossDefeated = !state.boss && state.runStats.bosses > tutorialRuntime.bossesStart;
    if (tutorialObjectiveComplete(tutorialDirector, tutorialRuntime)) advanceTutorialStep();
  } else if (step === "realm_practice") {
    tutorialRuntime.realmHops = state.runStats.realmHops - tutorialRuntime.realmHopsStart;
    tutorialRuntime.realmsMatched = !!state.boss && state.playerRealm === state.boss.realm;
    const threat = state.enemyBullets.find((bullet) => bullet.tutorialRealmThreat);
    if (!threat || (threat.y > state.player.y + 40 && state.playerRealm !== 0)) tutorialRuntime.realmThreatAvoided = true;
    if (tutorialObjectiveComplete(tutorialDirector, tutorialRuntime)) advanceTutorialStep();
  } else if (step === "wraith_boss") {
    tutorialRuntime.realmHops = state.runStats.realmHops - tutorialRuntime.realmHopsStart;
    if (state.boss && state.boss.hp < tutorialRuntime.wraithHpStart && state.playerRealm === state.boss.realm) {
      tutorialRuntime.matchingRealmDamage = true;
    }
    tutorialRuntime.wraithBossDefeated = !state.boss && state.runStats.bosses > tutorialRuntime.bossesStart;
    if (tutorialObjectiveComplete(tutorialDirector, tutorialRuntime)) advanceTutorialStep();
  }
  if (tutorialDirector && tutorialDirector.elapsedFrames > 540) tutorialDirector.hintLevel = 1;
  updateTutorialLiveRegion();
}

function resetTutorialLesson(stepId, correctionLines) {
  clearTutorialThreats();
  state.player.hp = state.player.maxHp;
  state.player.energy = state.player.maxEnergy;
  state.player.inv = 60;
  stabilizeTutorialPlayer({ resetCooldown: true, resetRealm: true, resetPosition: true });
  enterTutorialStep(stepId);
  tutorialDirector.dialogue[0] = { lines: correctionLines.slice(0, 2) };
  tutorialDirector.dialogueVisible = true;
  tutorialDirector.dialogueReveal = settingReducedMotion ? 1 : 0.14;
  suppressTutorialTransmissionEffects();
  updateTutorialLiveRegion();
}

function recoverTutorialCheckpoint() {
  if (state.runMode !== "tutorial" || !tutorialDirector) return false;
  recoverTutorialRuntime(state);
  clearTutorialThreats();
  tutorialDirector.recoveryCount++;
  state.player.hp = state.player.maxHp;
  state.player.energy = state.player.maxEnergy;
  state.player.inv = 120;
  stabilizeTutorialPlayer({ resetCooldown: true, resetRealm: true, resetPosition: true });
  const step = tutorialStepForCheckpoint(onboardingState && onboardingState.checkpoint);
  enterTutorialStep(step);
  tutorialDirector.dialogue[0] = {
    lines: ["Training craft restored.", "Restarting from your checkpoint."]
  };
  tutorialDirector.dialogueVisible = true;
  tutorialDirector.dialogueReveal = settingReducedMotion ? 1 : 0.14;
  suppressTutorialTransmissionEffects();
  updateTutorialLiveRegion();
  if (typeof playGameSound === "function") playGameSound("ui", 0.7);
  return true;
}

function completeTutorialGraduation(options = {}) {
  clearTutorialThreats();
  const result = applyTutorialGraduationCodex(codexDiscovered, onboardingState.codexGraduationApplied);
  if (result.changed) {
    codexDiscovered = result.codex;
    saveCodexDiscovered();
    onboardingState = transitionOnboardingState(onboardingState, { type: "codex_graduation_applied" });
  }
  onboardingState = transitionOnboardingState(onboardingState, { type: "complete" });
  saveOnboardingStateToDevice(onboardingState);
  const currentProgressSnapshot = JSON.stringify({
    highScore,
    meta: currentMetaSnapshot(),
    achievements: typeof getLocalAchievementIds === "function" ? getLocalAchievementIds() : []
  });
  tutorialRuntime.noProgressionInvariantPassed = currentProgressSnapshot === tutorialRuntime.entryProgressSnapshot;
  if (!tutorialRuntime.noProgressionInvariantPassed) {
    state.debugErrors.push("Tutorial changed progression-bearing local state");
  }
  tutorialDirector.completed = true;
  if (options.presentDialogue === false) return;
  tutorialDirector.dialogueVisible = true;
  tutorialDirector.dialogueReveal = settingReducedMotion ? 1 : 0.14;
  suppressTutorialTransmissionEffects();
  updateTutorialLiveRegion();
}

function tutorialSimulationPaused() {
  return state.runMode === "tutorial" && tutorialDirector && tutorialDirector.dialogueVisible;
}

function replayFirstFlightTraining() {
  closeTitleMetaScreen();
  beginTutorialTraining({ replay: true });
}

function showTutorialPauseAccessibility() {
  if (state.runMode !== "tutorial") return;
  hideTutorialAccessibleSurface("First Flight training paused.");
  if (typeof syncGameAccessibleSurface === "function") syncGameAccessibleSurface(true);
}

function hideTutorialPauseAccessibility() {
  if (state.runMode !== "tutorial") return;
  hideTutorialAccessibleSurface("First Flight training resuming.");
  if (typeof syncGameAccessibleSurface === "function") syncGameAccessibleSurface(true);
}

function drawColonelArisakaPlaceholder(x, y, size = 82, alpha = 1) {
  const scanOffset = settingReducedMotion ? 0 : (state.frame % 18);
  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = "rgba(92,238,255,0.82)";
  ctx.fillStyle = "rgba(20,82,112,0.24)";
  ctx.lineWidth = 1.4;
  ctx.shadowColor = "rgba(92,238,255,0.72)";
  ctx.shadowBlur = settingReducedFlash ? 3 : 8;
  ctx.beginPath();
  ctx.moveTo(-size * 0.32, size * 0.42);
  ctx.lineTo(-size * 0.25, size * 0.06);
  ctx.quadraticCurveTo(-size * 0.28, -size * 0.30, 0, -size * 0.43);
  ctx.quadraticCurveTo(size * 0.28, -size * 0.30, size * 0.25, size * 0.06);
  ctx.lineTo(size * 0.32, size * 0.42);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.strokeRect(-size * 0.14, -size * 0.24, size * 0.28, size * 0.25);
  ctx.beginPath();
  ctx.moveTo(-size * 0.24, size * 0.08);
  ctx.lineTo(-size * 0.10, size * 0.20);
  ctx.lineTo(size * 0.10, size * 0.20);
  ctx.lineTo(size * 0.24, size * 0.08);
  ctx.stroke();
  ctx.fillStyle = "rgba(255,184,92,0.82)";
  ctx.fillRect(-size * 0.25, size * 0.29, size * 0.18, 3);
  ctx.shadowBlur = 0;
  ctx.strokeStyle = "rgba(182,247,255,0.14)";
  for (let sy = -size * 0.42 + scanOffset; sy < size * 0.44; sy += 9) {
    ctx.beginPath();
    ctx.moveTo(-size * 0.34, sy);
    ctx.lineTo(size * 0.34, sy);
    ctx.stroke();
  }
  ctx.restore();
}

function drawTutorialInstructorPortrait(x, y, size = 82, alpha = 1) {
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x - size * 0.48, y - size * 0.48, size * 0.96, size * 0.96, size * 0.12);
  ctx.clip();
  const drewPortrait = typeof drawSpriteAsset === "function" && drawSpriteAsset(
    ctx,
    "tutorial_instructor",
    x,
    y + size * 0.18,
    {
      // Crop toward helmet and upper torso so the owner-supplied portrait
      // remains readable in the compact mobile transmission window.
      scale: size / 130,
      alpha,
      glow: false,
      filter: "saturate(0.88) contrast(1.10) brightness(1.12)"
    }
  );
  ctx.restore();
  if (!drewPortrait) {
    drawColonelArisakaPlaceholder(x, y, size, alpha);
    return;
  }
  const scanOffset = settingReducedMotion ? 0 : (state.frame % 12);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = "rgba(98,235,255,0.58)";
  ctx.lineWidth = 1;
  ctx.shadowColor = "rgba(82,225,255,0.55)";
  ctx.shadowBlur = settingReducedFlash ? 2 : 6;
  ctx.strokeRect(x - size * 0.48, y - size * 0.48, size * 0.96, size * 0.96);
  ctx.shadowBlur = 0;
  ctx.strokeStyle = "rgba(156,244,255,0.11)";
  for (let sy = y - size * 0.46 + scanOffset; sy < y + size * 0.46; sy += 8) {
    ctx.beginPath();
    ctx.moveTo(x - size * 0.46, sy);
    ctx.lineTo(x + size * 0.46, sy);
    ctx.stroke();
  }
  ctx.restore();
}

function tutorialHeaderFont(text, maxWidth, preferredSize, minimumSize, weight = 900, family = "'Arial Narrow', Arial, sans-serif") {
  let fontSize = preferredSize;
  do {
    ctx.font = `${weight} ${fontSize}px ${family}`;
    if (ctx.measureText(String(text || "")).width <= maxWidth) break;
    fontSize -= 1;
  } while (fontSize > minimumSize);
  return ctx.font;
}

function drawOnboardingTitleOverlay() {
  if (state.gameState !== "start" || onboardingUiMode === "none") return;
  if (onboardingIntroFlight.active) return;
  const panel = getOnboardingPanelRect();
  ctx.save();
  ctx.fillStyle = "rgba(1,5,16,0.82)";
  ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(panel.x + 72, panel.y + 80, 0, panel.x + 72, panel.y + 80, 140);
  glow.addColorStop(0, "rgba(33,177,220,0.18)");
  glow.addColorStop(1, "rgba(33,177,220,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, panel.y - 30, W, panel.h + 60);
  const panelFill = ctx.createLinearGradient(panel.x, panel.y, panel.x + panel.w, panel.y + panel.h);
  panelFill.addColorStop(0, "rgba(7,25,46,0.96)");
  panelFill.addColorStop(0.54, "rgba(4,14,31,0.96)");
  panelFill.addColorStop(1, "rgba(14,8,25,0.94)");
  ctx.fillStyle = panelFill;
  ctx.strokeStyle = "rgba(113,226,255,0.50)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(panel.x, panel.y, panel.w, panel.h, 10);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = "rgba(126,235,255,0.20)";
  ctx.beginPath();
  ctx.moveTo(panel.x + 112, panel.y + 15);
  ctx.lineTo(panel.x + panel.w - 16, panel.y + 15);
  ctx.stroke();
  drawTutorialInstructorPortrait(panel.x + 70, panel.y + 80, 96);
  const headerX = panel.x + 128;
  const headerWidth = panel.x + panel.w - 18 - headerX;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  tutorialHeaderFont("INCOMING TRANSMISSION", headerWidth, 9, 7, 900);
  ctx.fillStyle = "#79efff";
  ctx.fillText("INCOMING TRANSMISSION", headerX, panel.y + 28);
  tutorialHeaderFont(TUTORIAL_INSTRUCTOR.name, headerWidth, 16, 12, 900);
  ctx.fillStyle = "#effcff";
  ctx.fillText(TUTORIAL_INSTRUCTOR.name, headerX, panel.y + 48);
  tutorialHeaderFont(TUTORIAL_INSTRUCTOR.title, headerWidth, 8, 6, 800, "Arial, sans-serif");
  ctx.fillStyle = "rgba(211,240,250,0.58)";
  ctx.fillText(TUTORIAL_INSTRUCTOR.title, headerX, panel.y + 71);
  const body = { x: panel.x + 16, y: panel.y + 132, w: panel.w - 32, h: onboardingUiMode === "first_time_question" ? 58 : 104 };
  ctx.fillStyle = "rgba(1,7,18,0.46)";
  ctx.beginPath();
  ctx.roundRect(body.x, body.y, body.w, body.h, 7);
  ctx.fill();
  ctx.strokeStyle = "rgba(150,224,245,0.10)";
  ctx.stroke();
  ctx.font = "800 12px Arial, sans-serif";
  ctx.fillStyle = "#ffffff";
  const displayedCallSign = String(callSignEditing ? callSignDraft : (callSign || "CADET"));
  if (onboardingUiMode === "first_time_question") {
    ctx.font = "900 15px Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(TUTORIAL_INSTRUCTOR.firstQuestion, W / 2, body.y + body.h / 2 + 1);
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
  } else if (onboardingUiMode === "post_callsign") {
    ctx.fillText(`Flight identity: ${displayedCallSign}${callSignEditing ? "|" : "."}`, panel.x + 24, panel.y + 142);
    ctx.fillText(callSignEditing ? "Type, then press Enter to save." : "Confirm it, or make one final edit.", panel.x + 24, panel.y + 163);
  } else if (onboardingUiMode === "post_identity") {
    ctx.fillText("Connect an optional public pilot identity.", panel.x + 24, panel.y + 142);
    ctx.fillText("Device gameplay progress stays on this device.", panel.x + 24, panel.y + 163);
  } else if (onboardingUiMode === "post_handle") {
    ctx.fillText("Claim one optional public @handle.", panel.x + 24, panel.y + 142);
    ctx.fillText("It is account-bound and can be claimed later.", panel.x + 24, panel.y + 163);
  } else if (onboardingUiMode === "resume_training") {
    ctx.fillText("Your training checkpoint is secure.", panel.x + 24, panel.y + 142);
    ctx.fillText("Resume when ready.", panel.x + 24, panel.y + 163);
  } else if (onboardingUiMode === "identity_confirmed") {
    ctx.fillText("PILOT IDENTITY CONFIRMED", panel.x + 24, panel.y + 151);
  } else {
    ctx.fillText(`Command has you listed as ${displayedCallSign}${callSignEditing ? "|" : "."}`, panel.x + 24, panel.y + 142);
    ctx.fillText(callSignEditing ? "Type, then press Enter to save." : "Change it now, or after your flight.", panel.x + 24, panel.y + 163);
  }
  if (onboardingUiMode !== "first_time_question") {
    ctx.font = "900 9px Arial, sans-serif";
    ctx.fillStyle = "rgba(120,255,202,0.84)";
    ctx.fillText("CONTROLLED RANGE  •  NO PROGRESSION AWARDED", panel.x + 24, panel.y + 203);
    ctx.fillStyle = "rgba(210,237,247,0.50)";
    ctx.fillText("SKIPPABLE  •  REPLAYABLE IN SETTINGS", panel.x + 24, panel.y + 222);
  }
  ctx.restore();
}

function tutorialObjectiveText() {
  if (!tutorialDirector) return "";
  const progress = tutorialDirector.objectiveTarget > 1
    ? `  ${Math.min(tutorialDirector.objectiveTarget, tutorialDirector.objectiveProgress)} / ${tutorialDirector.objectiveTarget}`
    : "";
  const hint = tutorialDirector.hintLevel > 0 && tutorialDirector.stepId === "movement"
    ? "  FOLLOW THE PULSING BEACON"
    : "";
  return `${tutorialDirector.objective}${progress}${hint}`;
}

function getOnboardingPanelRect() {
  const compact = H < 700;
  return { x: 24, y: compact ? 170 : 220, w: W - 48, h: compact ? 260 : 280 };
}

function getOnboardingInstructorPortraitRect() {
  const panel = getOnboardingPanelRect();
  return { x: panel.x + 25, y: panel.y + 32, w: 90, h: 96 };
}

function getOnboardingQuestionRect() {
  const panel = getOnboardingPanelRect();
  return { x: panel.x + 20, y: panel.y + 132, w: panel.w - 40, h: 48 };
}

function getTutorialDialogueRect() {
  return { x: 16, y: H * 0.13, w: W - 32, h: 124 };
}

function getTutorialObjectiveRect() {
  if (!tutorialDirector || tutorialDirector.dialogueVisible) return null;
  ctx.save();
  ctx.font = "900 9px Arial, sans-serif";
  const text = tutorialObjectiveText();
  const hint = tutorialInputPrompt(state.inputMode, tutorialDirector.objectiveKind);
  const width = Math.min(W - 64, Math.max(ctx.measureText(text).width, ctx.measureText(hint).width) + 26);
  ctx.restore();
  return { x: W / 2 - width / 2, y: 112, w: width, h: 38 };
}

function getTutorialControlRects() {
  return {
    joystick: { x: 20, y: H - 132, w: 112, h: 112 },
    ability: { x: W - 118, y: H - 118, w: 84, h: 84 }
  };
}

function drawTutorialTrainingEnvironment() {
  if (state.runMode !== "tutorial" || !tutorialDirector) return;
  ctx.save();
  ctx.fillStyle = "rgba(8,54,73,0.055)";
  ctx.fillRect(0, 82, W, H - 82);
  ctx.strokeStyle = "rgba(66,196,228,0.09)";
  ctx.lineWidth = 1;
  for (let y = 118; y < H; y += 62) {
    ctx.beginPath();
    ctx.moveTo(16, y);
    ctx.lineTo(W - 16, y);
    ctx.stroke();
  }
  for (let x = 38; x < W; x += 58) {
    ctx.beginPath();
    ctx.moveTo(x, 100);
    ctx.lineTo(W / 2 + (x - W / 2) * 1.8, H);
    ctx.stroke();
  }
  ctx.strokeStyle = "rgba(112,231,255,0.13)";
  for (let ring = 0; ring < 4; ring++) {
    ctx.beginPath();
    ctx.ellipse(W / 2, H * 0.82, 70 + ring * 64, 18 + ring * 22, 0, Math.PI, TAU);
    ctx.stroke();
  }
  ctx.font = "900 8px Arial, sans-serif";
  ctx.fillStyle = "rgba(120,232,255,0.44)";
  ctx.textAlign = "left";
  ctx.fillText("ARISAKA RANGE  //  SECTOR 07", 12, 58);

  if (tutorialDirector.stepId === "movement" && tutorialRuntime) {
    const beacons = tutorialRuntime.plan.movement;
    for (let index = tutorialRuntime.beaconIndex; index < beacons.length; index++) {
      const beacon = beacons[index];
      const active = index === tutorialRuntime.beaconIndex;
      const pulse = settingReducedMotion || tutorialDirector.hintLevel < 1
        ? 1
        : 0.88 + Math.sin(state.frame * 0.08) * 0.12;
      ctx.globalAlpha = active ? 0.92 : 0.24;
      ctx.strokeStyle = active ? "#69f5ff" : "rgba(120,220,255,0.55)";
      ctx.lineWidth = active ? 2 : 1;
      ctx.beginPath();
      ctx.arc(beacon.x, beacon.y, beacon.radius * pulse, 0, TAU);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(beacon.x - 8, beacon.y);
      ctx.lineTo(beacon.x + 8, beacon.y);
      ctx.moveTo(beacon.x, beacon.y - 8);
      ctx.lineTo(beacon.x, beacon.y + 8);
      ctx.stroke();
    }
  }
  if (tutorialDirector.stepId === "ghost_shift" && tutorialRuntime) {
    const lane = tutorialRuntime.plan.ghost_shift;
    ctx.globalAlpha = 0.45;
    ctx.fillStyle = "rgba(255,92,92,0.20)";
    ctx.fillRect(lane.laneX - lane.laneWidth / 2, H * 0.58, lane.laneWidth, H * 0.36);
    ctx.strokeStyle = "rgba(255,170,90,0.82)";
    ctx.setLineDash([7, 5]);
    ctx.strokeRect(lane.laneX - lane.laneWidth / 2, H * 0.58, lane.laneWidth, H * 0.36);
    ctx.setLineDash([]);
  }
  ctx.restore();
}

function drawTutorialRealmIndicator() {
  if (!tutorialDirector || !["wraith_briefing", "realm_practice", "wraith_boss"].includes(tutorialDirector.stepId)) return;
  const bossRealm = state.boss ? state.boss.realm : 1;
  const indicatorY = tutorialDirector.dialogueVisible ? 220 : 72;
  const labels = [
    { title: "YOU", realm: state.playerRealm, x: 64 },
    { title: "WRAITH", realm: bossRealm, x: W - 64 }
  ];
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (const item of labels) {
    const ghost = item.realm === 1;
    ctx.fillStyle = ghost ? "rgba(117,48,175,0.82)" : "rgba(228,237,242,0.88)";
    ctx.strokeStyle = ghost ? "#f0b8ff" : "#ffffff";
    ctx.beginPath();
    if (ghost) {
      ctx.moveTo(item.x, indicatorY - 8);
      ctx.lineTo(item.x + 8, indicatorY);
      ctx.lineTo(item.x, indicatorY + 8);
      ctx.lineTo(item.x - 8, indicatorY);
      ctx.closePath();
    } else {
      ctx.arc(item.x, indicatorY, 9, 0, TAU);
    }
    ctx.fill();
    ctx.stroke();
    ctx.font = "900 7px Arial, sans-serif";
    ctx.fillStyle = "#eafaff";
    ctx.fillText(`${item.title}  ${ghost ? "GHOST" : "PHYSICAL"}`, item.x, indicatorY + 22);
  }
  ctx.restore();
}

function drawTutorialTransmission() {
  if (!tutorialDirector || !tutorialDirector.dialogueVisible) return;
  const lines = tutorialDirector.dialogue[0] ? tutorialDirector.dialogue[0].lines : [];
  const panel = getTutorialDialogueRect();
  ctx.save();
  const fill = ctx.createLinearGradient(panel.x, panel.y, panel.x + panel.w, panel.y + panel.h);
  fill.addColorStop(0, "rgba(6,31,51,0.95)");
  fill.addColorStop(0.44, "rgba(2,14,31,0.96)");
  fill.addColorStop(1, "rgba(13,7,26,0.94)");
  ctx.fillStyle = fill;
  ctx.strokeStyle = "rgba(97,225,255,0.58)";
  ctx.beginPath();
  ctx.roundRect(panel.x, panel.y, panel.w, panel.h, 8);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = "rgba(130,240,255,0.20)";
  ctx.beginPath();
  ctx.moveTo(panel.x + 92, panel.y + 1);
  ctx.lineTo(panel.x + panel.w - 14, panel.y + 1);
  ctx.stroke();
  drawTutorialInstructorPortrait(panel.x + 52, panel.y + 58, 74);
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillStyle = "#70eeff";
  tutorialHeaderFont(TUTORIAL_INSTRUCTOR.name, panel.w - 116, 9, 8, 900, "Arial, sans-serif");
  ctx.fillText(TUTORIAL_INSTRUCTOR.name, panel.x + 98, panel.y + 15);
  tutorialHeaderFont(TUTORIAL_INSTRUCTOR.title, panel.w - 116, 7, 6, 800, "Arial, sans-serif");
  ctx.fillStyle = "rgba(181,226,240,0.54)";
  ctx.fillText(TUTORIAL_INSTRUCTOR.title, panel.x + 98, panel.y + 27);
  ctx.fillStyle = "#ffffff";
  ctx.font = "800 11px Arial, sans-serif";
  const joined = lines.join(" ");
  const visibleLength = Math.floor(joined.length * tutorialDirector.dialogueReveal);
  const visible = joined.slice(0, visibleLength);
  const words = visible.split(/\s+/);
  let current = "";
  let row = 0;
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (ctx.measureText(next).width > panel.w - 122 && current) {
      ctx.fillText(current, panel.x + 98, panel.y + 48 + row * 19);
      current = word;
      row++;
    } else current = next;
  }
  if (current && row < 3) ctx.fillText(current, panel.x + 98, panel.y + 48 + row * 19);
  ctx.font = "900 7px Arial, sans-serif";
  ctx.fillStyle = "rgba(180,237,250,0.52)";
  ctx.fillText(tutorialDirector.dialogueReveal < 1 ? "TAP TO REVEAL" : "TAP OR PRESS ENTER TO CONTINUE", panel.x + 98, panel.y + 100);
  ctx.restore();
}

function drawTutorialPresentation() {
  if (state.runMode !== "tutorial" || !tutorialDirector) return;
  drawTutorialRealmIndicator();
  if (!tutorialDirector.dialogueVisible) {
    const text = tutorialObjectiveText();
    const hint = tutorialInputPrompt(state.inputMode, tutorialDirector.objectiveKind);
    ctx.save();
    ctx.font = "900 9px Arial, sans-serif";
    const objectiveRect = getTutorialObjectiveRect();
    const width = objectiveRect.w;
    const x = objectiveRect.x;
    const y = objectiveRect.y;
    ctx.fillStyle = "rgba(2,10,24,0.82)";
    ctx.strokeStyle = "rgba(92,238,255,0.42)";
    ctx.beginPath();
    ctx.roundRect(x, y, width, 38, 8);
    ctx.fill();
    ctx.stroke();
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillStyle = "#ecfbff";
    ctx.fillText(text, W / 2, y + 7);
    ctx.font = "800 7px Arial, sans-serif";
    ctx.fillStyle = "rgba(144,239,255,0.68)";
    ctx.fillText(hint, W / 2, y + 23);
    ctx.restore();
  }
  drawTutorialTransmission();
}

Object.assign(globalThis, {
  initializeOnboardingExperience,
  chooseFirstFlightRoute,
  beginTutorialTraining,
  skipTutorialTraining,
  startTutorialSession,
  updateTutorialDirectorRuntime,
  recoverTutorialCheckpoint,
  tutorialSimulationPaused,
  advanceTutorialDialogue,
  replayFirstFlightTraining,
  tutorialSnapshot,
  showTutorialPauseAccessibility,
  hideTutorialPauseAccessibility,
  onboardingGalaxySceneActive,
  updateOnboardingIntroFlight,
  drawOnboardingGalaxyScene,
  tutorialTransmissionVisible,
  drawTutorialInstructorPortrait,
  drawColonelArisakaPlaceholder,
  drawOnboardingTitleOverlay,
  drawTutorialTrainingEnvironment,
  drawTutorialPresentation,
  getOnboardingPanelRect,
  getOnboardingInstructorPortraitRect,
  getOnboardingQuestionRect,
  getTutorialDialogueRect,
  getTutorialObjectiveRect,
  getTutorialControlRects
});
