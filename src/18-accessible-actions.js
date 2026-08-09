let lastGameAccessibilitySyncKey = "";

function accessibleScreenRect(rect, padding = 0) {
  if (!rect) return null;
  const pad = Math.max(0, Number(padding) || 0);
  return {
    x: offsetX + (rect.x - pad) * scale,
    y: offsetY + (rect.y - pad) * scale,
    w: (rect.w + pad * 2) * scale,
    h: (rect.h + pad * 2) * scale
  };
}

function accessibleRectAction(id, label, rect, handler, padding = 0) {
  return { id, label, rect: accessibleScreenRect(rect, padding), handler };
}

function invokeRectHandler(handler, rect) {
  if (!rect || typeof handler !== "function") return;
  handler(rect.x + rect.w / 2, rect.y + rect.h / 2, null);
}

function titleAccessibilityActions() {
  const icons = getTitleIconRects();
  return [
    accessibleRectAction("play", "Play", getPlayButtonRect(), beginGame),
    accessibleRectAction("edit-call-sign", "Edit call sign", getCallSignRect(), beginCallSignEditing),
    accessibleRectAction("pilot-dossier", "Open Pilot Dossier", icons.account, () => {
      accountPanelTab = "pilot";
      openTitleMetaScreen("online");
    }),
    accessibleRectAction("achievement-vault", "Open Achievement Vault", icons.achievements, () => openTitleMetaScreen("achievements")),
    accessibleRectAction("progress-road", "Open Progress Road", icons.progress, () => openTitleProgressRoad()),
    accessibleRectAction("records-network", "Open Records Network", icons.records, () => openTitleMetaScreen("records")),
    accessibleRectAction("codex", "Open Codex", icons.codex, () => openTitleMetaScreen("codex"))
  ];
}

function onlineAccessibilityActions() {
  const rects = getOnlineRects();
  const online = accountIdentitySnapshot();
  const actions = [
    accessibleRectAction("close-panel", "Close Pilot Dossier", rects.closeRect, closeTitleMetaScreen, 4),
    accessibleRectAction("pilot-tab", "Pilot identity tab", rects.pilotTab, () => invokeRectHandler(handleOnlinePanelPointerDown, rects.pilotTab)),
    accessibleRectAction("settings-tab", "Settings tab", rects.settingsTab, () => invokeRectHandler(handleOnlinePanelPointerDown, rects.settingsTab))
  ];
  if (accountPanelTab === "pilot") {
    actions.push(accessibleRectAction("edit-call-sign", "Edit public call sign", rects.editCallSign, () => invokeRectHandler(handleOnlinePanelPointerDown, rects.editCallSign)));
    if (online.user && !online.profileHandle) {
      actions.push(accessibleRectAction("claim-handle", "Claim unique public handle", rects.claimHandle, () => invokeRectHandler(handleOnlinePanelPointerDown, rects.claimHandle)));
    }
    if (online.user) actions.push(accessibleRectAction("sign-out", "Sign out", rects.signOut, () => invokeRectHandler(handleOnlinePanelPointerDown, rects.signOut)));
    else actions.push(accessibleRectAction("connect-account", "Connect Google account", rects.signIn, () => invokeRectHandler(handleOnlinePanelPointerDown, rects.signIn)));
  } else {
    actions.push(
      accessibleRectAction("particles-low", "Low particle density", rects.low, () => invokeRectHandler(handleOnlinePanelPointerDown, rects.low), 3),
      accessibleRectAction("particles-medium", "Medium particle density", rects.med, () => invokeRectHandler(handleOnlinePanelPointerDown, rects.med), 3),
      accessibleRectAction("particles-high", "High particle density", rects.high, () => invokeRectHandler(handleOnlinePanelPointerDown, rects.high), 3),
      accessibleRectAction("screen-shake", `${settingScreenShake ? "Disable" : "Enable"} screen shake`, rects.shake, () => invokeRectHandler(handleOnlinePanelPointerDown, rects.shake), 3),
      accessibleRectAction("reduced-motion", `${settingReducedMotion ? "Disable" : "Enable"} reduced motion`, rects.motion, () => invokeRectHandler(handleOnlinePanelPointerDown, rects.motion), 3),
      accessibleRectAction("reduced-flash", `${settingReducedFlash ? "Disable" : "Enable"} reduced flash`, rects.flash, () => invokeRectHandler(handleOnlinePanelPointerDown, rects.flash), 3),
      accessibleRectAction("high-contrast", `${settingHighContrast ? "Disable" : "Enable"} high contrast`, rects.contrast, () => invokeRectHandler(handleOnlinePanelPointerDown, rects.contrast), 3),
      accessibleRectAction("music", `${settingMusicEnabled ? "Disable" : "Enable"} music`, rects.music, () => invokeRectHandler(handleOnlinePanelPointerDown, rects.music), 3),
      accessibleRectAction("effects", `${settingEffectsEnabled ? "Disable" : "Enable"} effects`, rects.effects, () => invokeRectHandler(handleOnlinePanelPointerDown, rects.effects), 3),
      accessibleRectAction("replay-training", "Replay First Flight training", rects.replayTraining, () => invokeRectHandler(handleOnlinePanelPointerDown, rects.replayTraining), 4),
      accessibleRectAction("reset-local-data", "Reset local gameplay data", rects.reset, () => invokeRectHandler(handleOnlinePanelPointerDown, rects.reset), 4)
    );
  }
  return actions;
}

function titlePanelAccessibilityActions() {
  if (titleSubState === "online") return onlineAccessibilityActions();
  if (titleSubState === "records") {
    const rects = getRecordsRects();
    return [
      accessibleRectAction("close-panel", "Close Records Network", rects.closeRect, closeTitleMetaScreen, 4),
      accessibleRectAction("legacy-archive", "Legacy preseason archive", rects.globalTab, () => invokeRectHandler(handleRecordsPanelPointerDown, rects.globalTab)),
      accessibleRectAction("weekly-status", "Weekly competition status", rects.weeklyTab, () => invokeRectHandler(handleRecordsPanelPointerDown, rects.weeklyTab))
    ];
  }
  if (titleSubState === "achievements") {
    const rects = getAchievementsRects();
    const actions = [accessibleRectAction("close-panel", "Close Achievement Vault", rects.closeRect, closeTitleMetaScreen, 4)];
    for (const [category, rect] of Object.entries(rects.tabs)) {
      actions.push(accessibleRectAction(`achievement-${category}`, `${category} achievements`, rect, () => setAchievementCategory(category), 3));
    }
    actions.push(
      accessibleRectAction("achievements-up", "Scroll achievements up", rects.scrollUp, () => achievementScrollController.scrollBy(-222), 8),
      accessibleRectAction("achievements-down", "Scroll achievements down", rects.scrollDown, () => achievementScrollController.scrollBy(222), 8)
    );
    return actions;
  }
  if (titleSubState === "progress") {
    const rects = getProgressRects();
    return [
      accessibleRectAction("close-panel", "Close Progress Road", rects.closeRect, closeTitleMetaScreen, 4),
      accessibleRectAction("glory-road", "Glory Road", rects.gloryTab, () => setTitleProgressTab("glory")),
      accessibleRectAction("season-road", "Season Road", rects.seasonTab, () => setTitleProgressTab("season"))
    ];
  }
  if (titleSubState === "codex") {
    const rects = getCodexRects();
    return [
      accessibleRectAction("close-panel", "Close Codex", rects.closeRect, closeTitleMetaScreen, 4),
      accessibleRectAction("codex-enemies", "Enemy Codex", rects.enemies, () => setCodexCategory("enemies"), 3),
      accessibleRectAction("codex-bosses", "Boss Codex", rects.bosses, () => setCodexCategory("bosses"), 3),
      accessibleRectAction("codex-up", "Scroll Codex up", rects.scrollUp, () => codexScrollController.scrollBy(-180), 8),
      accessibleRectAction("codex-down", "Scroll Codex down", rects.scrollDown, () => codexScrollController.scrollBy(180), 8)
    ];
  }
  return [];
}

function syncGameAccessibleSurface(force = false) {
  if (typeof setGameAccessibleSurface !== "function") return;
  const onboardingActive = typeof onboardingUiMode !== "undefined" && onboardingUiMode !== "none";
  const tutorialDialogue = state.runMode === "tutorial" && typeof tutorialSimulationPaused === "function" && tutorialSimulationPaused();
  const layoutKey = `${Math.round(scale * 1000)}:${Math.round(offsetX)}:${Math.round(offsetY)}`;
  const onlineKey = typeof accountIdentityAccessibilityKey === "function"
    ? accountIdentityAccessibilityKey()
    : "signed-out|";
  const stateKey = [
    state.gameState,
    state.sceneTransition && state.sceneTransition.mode,
    state.runMode,
    onboardingActive,
    tutorialDialogue,
    titleSubState,
    Math.round(titlePanelAnim * 20),
    titlePanelTarget,
    resetProgressConfirm,
    pauseConfirmAction,
    accountPanelTab,
    achievementCategory,
    codexCategory,
    titleProgressTab,
    settingScreenShake,
    settingReducedMotion,
    settingReducedFlash,
    settingHighContrast,
    settingMusicEnabled,
    settingEffectsEnabled,
    onlineKey,
    callSignEditing,
    handleEditing,
    layoutKey
  ].join("|");
  if (!force && stateKey === lastGameAccessibilitySyncKey) return;
  lastGameAccessibilitySyncKey = stateKey;

  if (onboardingActive || callSignEditing || handleEditing) {
    clearGameAccessibleSurface();
    return;
  }
  if (state.gameState === "paused" || state.gameState === "resuming") {
    const rects = getPauseOverlayRects();
    const resuming = state.gameState === "resuming";
    if (!resuming && pauseConfirmAction) {
      const confirmRects = getPauseConfirmRects();
      const restart = pauseConfirmAction === "restart";
      setGameAccessibleSurface({
        mode: `pause-confirm-${pauseConfirmAction}`,
        label: restart ? "Restart run confirmation" : "Return to title confirmation",
        message: restart ? "Restart this run? Current run progress will be lost." : "Return to title? Current run progress will be lost.",
        modal: true,
        actions: [
          accessibleRectAction("keep-run", "Keep run", confirmRects.cancel, cancelPauseDestructiveAction),
          accessibleRectAction("confirm", restart ? "Confirm restart" : "Confirm return to title", confirmRects.confirm, confirmPauseDestructiveAction)
        ],
        onEscape: handlePauseEscape
      });
      return;
    }
    const actions = resuming
      ? [accessibleRectAction("stay-paused", "Stay paused", rects.resume, cancelResumeCountdown)]
      : [
          accessibleRectAction("resume", "Resume flight", rects.resume, resumeGame),
          ...(state.runMode === "tutorial" && rects.checkpoint
            ? [accessibleRectAction("restart-checkpoint", "Restart tutorial checkpoint", rects.checkpoint, () => invokeRectHandler(handlePausePointerDown, rects.checkpoint))]
            : []),
          accessibleRectAction("restart", state.runMode === "tutorial" ? "Restart training" : "Restart run", rects.restart, () => invokeRectHandler(handlePausePointerDown, rects.restart)),
          ...(state.runMode === "tutorial" && rects.skip
            ? [accessibleRectAction("skip-training", "Skip training", rects.skip, () => invokeRectHandler(handlePausePointerDown, rects.skip))]
            : []),
          accessibleRectAction("return-title", "Return to title", rects.title, () => invokeRectHandler(handlePausePointerDown, rects.title))
        ];
    setGameAccessibleSurface({
      mode: resuming ? "resume-countdown" : "pause",
      label: resuming
        ? "Resume countdown"
        : state.runMode === "tutorial" ? "First Flight training paused" : "Flight paused",
      message: resuming
        ? "Re-engaging controls. Stay Paused is available."
        : state.runMode === "tutorial" ? "First Flight training paused. Simulation frozen." : "Flight paused. Simulation frozen.",
      modal: true,
      actions,
      onEscape: handlePauseEscape
    });
    return;
  }
  if (tutorialDialogue) {
    clearGameAccessibleSurface();
    return;
  }
  if (state.gameState === "gameover") {
    const rects = getGameOverButtons();
    setGameAccessibleSurface({
      mode: "game-over",
      label: "Run complete",
      message: `Run complete. Score ${Math.floor(state.score || 0)}.`,
      modal: true,
      actions: [
        accessibleRectAction("respawn", "Respawn", rects.respawn, beginGame),
        ...(rects.road ? [accessibleRectAction("progress-road", "Open Progress Road", rects.road, () => invokeRectHandler(handleGameOverPointerDown, rects.road))] : []),
        accessibleRectAction("return-title", "Return to title", rects.title, () => invokeRectHandler(handleGameOverPointerDown, rects.title))
      ]
    });
    return;
  }
  if (state.gameState === "playing") {
    if (state.sceneTransition.mode !== "idle") {
      clearGameAccessibleSurface();
      return;
    }
    const costLabel = state.runMode === "tutorial" ? "Pause training, no health cost" : "Pause flight, costs one health bar";
    setGameAccessibleSurface({
      mode: "playing",
      label: "Flight controls",
      actions: [accessibleRectAction("pause", costLabel, getPauseButtonRect(), () => pauseGame("manual"))]
    });
    return;
  }
  if (state.gameState !== "start" || state.sceneTransition.mode !== "idle") {
    clearGameAccessibleSurface();
    return;
  }
  if (resetProgressConfirm) {
    const rects = getResetConfirmRects();
    setGameAccessibleSurface({
      mode: "reset-confirmation",
      label: "Reset local data confirmation",
      message: "Reset local gameplay data? Settings, call sign, account identity, and First Flight status are preserved.",
      modal: true,
      actions: [
        accessibleRectAction("keep-data", "Keep data", rects.no, () => invokeRectHandler(handleResetProgressConfirmDown, rects.no)),
        accessibleRectAction("erase-data", "Erase local gameplay data", rects.yes, () => invokeRectHandler(handleResetProgressConfirmDown, rects.yes))
      ],
      onEscape: () => { resetProgressConfirm = false; }
    });
    return;
  }
  if (titlePanelTarget > 0 && titlePanelAnim >= 0.9) {
    setGameAccessibleSurface({
      mode: `title-panel-${titleSubState}-${accountPanelTab}`,
      label: `${titleSubState} panel`,
      message: `${titleSubState} panel opened.`,
      actions: titlePanelAccessibilityActions(),
      onEscape: closeTitleMetaScreen
    });
    return;
  }
  if (titlePanelAnim > 0.02) {
    clearGameAccessibleSurface();
    return;
  }
  setGameAccessibleSurface({
    mode: "title",
    label: "Star Strike RUSH title controls",
    message: "Star Strike RUSH title screen.",
    actions: titleAccessibilityActions()
  });
}

globalThis.syncGameAccessibleSurface = syncGameAccessibleSurface;
