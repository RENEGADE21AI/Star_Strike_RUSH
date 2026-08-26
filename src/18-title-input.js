function resetProgressData() {
  highScore = 0;
  previousHighScore = 0;
  highScoreDirty = true;
  saveHighScore();
  codexDiscovered = {};
  codexHasNew = false;
  saveCodexDiscovered();
  if (typeof resetLocalAchievements === "function") resetLocalAchievements();
  try { localStorage.removeItem("star_strike_rush_last_run_v1"); } catch {}
  metaProgress = makeDefaultMetaProgress();
  lastRunMeta = null;
  saveMetaProgress();
  encounterQueue = [];
  encounterCard = null;
}

function replaceDeviceProgression(profile, achievementIds = [], codexIds = []) {
  const selected = profile && typeof profile === "object" ? profile : {};
  metaProgress = sanitizeStoredMetaProgress({
    version: META_PROGRESS_SCHEMA_VERSION,
    totalGlory: selected.totalGlory,
    lifetime: selected.lifetime,
    recentReceipts: [],
    lastUpdatedAtMs: Date.now()
  });
  highScore = Math.max(0, Math.floor(Number(metaProgress.lifetime.bestScore) || 0));
  previousHighScore = highScore;
  highScoreDirty = true;
  saveHighScore();
  saveMetaProgress();
  codexDiscovered = Object.fromEntries((Array.isArray(codexIds) ? codexIds : []).map((id) => [String(id), true]));
  codexHasNew = false;
  saveCodexDiscovered();
  if (typeof replaceLocalAchievementArchive === "function") replaceLocalAchievementArchive(achievementIds);
  lastRunMeta = null;
  encounterQueue = [];
  encounterCard = null;
  return currentMetaSnapshot();
}

globalThis.resetProgressData = resetProgressData;
globalThis.replaceDeviceProgression = replaceDeviceProgression;
globalThis.getLocalCodexIds = () => Object.keys(codexDiscovered).filter((id) => codexDiscovered[id]);

function titlePanelHit(x, y) {
  const panel = getTitlePanelRect();
  return titlePanelAnim > 0.02 && x >= panel.x && x <= panel.x + panel.w && y >= panel.y && y <= panel.y + panel.h;
}

function openTitleMetaScreen(screen) {
  if (typeof playGameSound === "function") playGameSound("ui", 0.65);
  if (titleSubState !== screen || titlePanelTarget < 1) titleMetaScreenTransition = 0;
  const icons = getTitleIconRects();
  const source = screen === "online" ? icons.account
    : screen === "records" ? icons.records
      : screen === "achievements" ? icons.achievements
        : screen === "progress" ? icons.progress
          : screen === "codex" ? icons.codex : null;
  if (source) titlePanelOrigin = { x: source.x + source.w / 2, y: source.y + source.h / 2 };
  titleSubState = screen;
  titlePanelTarget = 1;
  if (screen !== "codex") codexDetailType = null;
}

function closeTitleMetaScreen() {
  if (typeof playGameSound === "function") playGameSound("ui", 0.52);
  titlePanelTarget = 0;
  codexDetailType = null;
  resetProgressConfirm = false;
}

function handleResetProgressConfirmDown(x, y) {
  if (!resetProgressConfirm) return false;
  const r = getResetConfirmRects();
  if (hitRect(r.yes, x, y)) {
    resetProgressConfirm = false;
    resetProgressData();
    closeTitleMetaScreen();
    return true;
  }
  if (hitRect(r.no, x, y)) {
    resetProgressConfirm = false;
    return true;
  }
  return true;
}

function beginTitleProgressDrag(pointerId, x, y) {
  titleProgressDragActive = true;
  titleProgressDragPointerId = pointerId;
  titleProgressDragY = y;
  titleProgressDragX = x;
  titleProgressDragStartScroll = titleProgressScroll;
  titleProgressDragMoved = false;
  titleProgressPointerDownNode = typeof getProgressNodeAt === "function" ? getProgressNodeAt(x, y) : null;
  if (pointerId !== null && pointerId !== undefined) {
    try { canvas.setPointerCapture(pointerId); } catch {}
  }
}

function updateTitleProgressDrag(pointerId, x, y) {
  if (!titleProgressDragActive) return false;
  if (titleProgressDragPointerId !== null && titleProgressDragPointerId !== pointerId) return false;
  if (Math.hypot(x - titleProgressDragX, y - titleProgressDragY) > 7) {
    titleProgressDragMoved = true;
    titleProgressSelectedNode = null;
  }
  titleProgressScroll = titleProgressDragStartScroll + (titleProgressDragY - y) * 1.12;
  clampTitleProgressScroll();
  return true;
}

function endTitleProgressDrag(pointerId, cancelled = false) {
  if (!titleProgressDragActive) return false;
  if (titleProgressDragPointerId !== null && titleProgressDragPointerId !== pointerId) return false;
  if (!cancelled && !titleProgressDragMoved) titleProgressSelectedNode = titleProgressPointerDownNode;
  if (titleProgressDragPointerId !== null && titleProgressDragPointerId !== undefined) {
    try { canvas.releasePointerCapture(titleProgressDragPointerId); } catch {}
  }
  titleProgressDragActive = false;
  titleProgressDragPointerId = null;
  titleProgressPointerDownNode = null;
  titleProgressDragMoved = false;
  return true;
}

function cancelTitlePointerInteractions() {
  codexScrollController.cancel();
  achievementScrollController.cancel();
  titleScrollablePendingAction = null;
  if (titleProgressDragActive) endTitleProgressDrag(titleProgressDragPointerId, true);
}

function openTitleProgressRoad() {
  openTitleMetaScreen("progress");
  titleProgressDragActive = false;
  titleProgressDragPointerId = null;
  titleProgressPointerDownNode = null;
  titleProgressSelectedNode = null;
  if (typeof focusTitleProgressOnCurrent === "function") focusTitleProgressOnCurrent();
  else clampTitleProgressScroll();
}

let titleScrollablePendingAction = null;
const codexScrollController = createCanvasScrollController({
  getValue: () => codexScroll,
  setValue: (value) => { codexScroll = value; },
  getMax: () => codexMaxScroll()
});
const achievementScrollController = createCanvasScrollController({
  getValue: () => achievementScroll,
  setValue: (value) => { achievementScroll = value; },
  getMax: () => getAchievementMaxScroll()
});

function updateTitleScrollableDrag(pointerId, x, y) {
  if (codexScrollController.move(pointerId, x, y)) return true;
  if (achievementScrollController.move(pointerId, x, y)) return true;
  return false;
}

function endTitleScrollableDrag(pointerId, cancelled = false) {
  const codexResult = codexScrollController.end(pointerId, cancelled);
  const achievementResult = achievementScrollController.end(pointerId, cancelled);
  const result = codexResult.handled ? codexResult : achievementResult;
  const pending = titleScrollablePendingAction;
  titleScrollablePendingAction = null;
  if (result.handled && !result.moved && !result.cancelled && typeof pending === "function") pending();
  return result.handled;
}

function handleCodexPanelPointerDown(x, y, pointerId = null) {
  const r = getCodexRects();
  if (hitRect(r.closeRect, x, y)) { closeTitleMetaScreen(); return true; }
  if (codexDetailType) {
    const detailCard = { x: r.panel.x + 18, y: r.panel.y + 78, w: r.panel.w - 36, h: r.panel.h - 94 };
    const backRect = { x: detailCard.x + 10, y: detailCard.y + 10, w: 28, h: 22 };
    if (hitRect(backRect, x, y)) { codexDetailType = null; return true; }
    if (!(x >= detailCard.x && x <= detailCard.x + detailCard.w && y >= detailCard.y && y <= detailCard.y + detailCard.h)) {
      codexDetailType = null;
      return true;
    }
    return true;
  }
  if (hitRect(r.enemies, x, y)) { setCodexCategory("enemies"); return true; }
  if (hitRect(r.bosses, x, y)) { setCodexCategory("bosses"); return true; }
  if (hitRect(r.scrollUp, x, y)) { codexScroll -= 180; clampCodexScroll(); return true; }
  if (hitRect(r.scrollDown, x, y)) { codexScroll += 180; clampCodexScroll(); return true; }
  const types = codexTypesForCategory();
  for (const type of types) {
    const card = r.rects[type];
    if (!hitRect(card, x, y)) continue;
    titleScrollablePendingAction = () => {
      if (codexDiscovered[type]) codexDetailType = type;
    };
    codexScrollController.begin(pointerId, x, y, canvas);
    return true;
  }
  if (hitRect(r.contentRect, x, y)) {
    titleScrollablePendingAction = null;
    codexScrollController.begin(pointerId, x, y, canvas);
  }
  return true;
}

function handleOnlinePanelPointerDown(x, y) {
  const r = getOnlineRects();
  if (callSignEditing && !hitRect(r.editCallSign, x, y)) commitCallSignDraft(true);
  if (handleEditing && !hitRect(r.claimHandle, x, y)) cancelHandleEditing();
  if (hitRect(r.closeRect, x, y)) { closeTitleMetaScreen(); return true; }
  if (hitRect(r.pilotTab, x, y)) { accountPanelTab = "pilot"; return true; }
  if (hitRect(r.settingsTab, x, y)) { accountPanelTab = "settings"; return true; }
  if (accountPanelTab === "pilot" && hitRect(r.claimHandle, x, y)) {
    if (handleEditing) commitPublicHandleDraft();
    else beginHandleEditing();
    return true;
  }
  if (accountPanelTab === "pilot" && hitRect(r.signIn, x, y)) { requestOnlineSignIn(); return true; }
  if (accountPanelTab === "pilot" && hitRect(r.signOut, x, y)) { requestOnlineSignOut(); return true; }
  if (accountPanelTab === "pilot" && hitRect(r.deleteAccount, x, y)) {
    const online = accountIdentitySnapshot();
    if (online.accountDeletion) {
      Promise.resolve(window.starStrikeOnline.cancelAccountDeletion()).catch(() => {});
    } else {
      deleteAccountConfirm = true;
    }
    return true;
  }
  if (accountPanelTab === "settings" && hitRect(r.low, x, y)) { settingMaxParticles = 300; MAX_PARTICLES = settingMaxParticles; saveSettings(); return true; }
  if (accountPanelTab === "settings" && hitRect(r.med, x, y)) { settingMaxParticles = 600; MAX_PARTICLES = settingMaxParticles; saveSettings(); return true; }
  if (accountPanelTab === "settings" && hitRect(r.high, x, y)) { settingMaxParticles = 900; MAX_PARTICLES = settingMaxParticles; saveSettings(); return true; }
  if (accountPanelTab === "settings" && hitRect(r.shake, x, y)) { settingScreenShake = !settingScreenShake; saveSettings(); return true; }
  if (accountPanelTab === "settings" && hitRect(r.reset, x, y)) { resetProgressConfirm = true; return true; }
  if (accountPanelTab === "settings" && hitRect(r.motion, x, y)) { settingReducedMotion = !settingReducedMotion; saveSettings(); return true; }
  if (accountPanelTab === "settings" && hitRect(r.flash, x, y)) { settingReducedFlash = !settingReducedFlash; saveSettings(); return true; }
  if (accountPanelTab === "settings" && hitRect(r.contrast, x, y)) { settingHighContrast = !settingHighContrast; applyAccessibilitySettings(); saveSettings(); return true; }
  if (accountPanelTab === "settings" && hitRect(r.music, x, y)) { setMusicEnabled(!settingMusicEnabled); saveSettings(); return true; }
  if (accountPanelTab === "settings" && hitRect(r.effects, x, y)) { setEffectsEnabled(!settingEffectsEnabled); saveSettings(); return true; }
  if (accountPanelTab === "settings" && hitRect(r.replayTraining, x, y)) { replayFirstFlightTraining(); return true; }
  if (accountPanelTab === "pilot" && hitRect(r.editCallSign, x, y)) {
    if (callSignEditing) commitCallSignDraft();
    else beginCallSignEditing();
    return true;
  }
  return true;
}

function handleRecordsPanelPointerDown(x, y) {
  const r = getRecordsRects();
  if (hitRect(r.closeRect, x, y)) { closeTitleMetaScreen(); return true; }
  if (hitRect(r.globalTab, x, y)) { recordsPanelTab = "global"; return true; }
  if (hitRect(r.weeklyTab, x, y)) { recordsPanelTab = "weekly"; return true; }
  if (recordsPanelTab === "weekly" && (hitRect(r.leaguePrev, x, y) || hitRect(r.leagueNext, x, y))) {
    const online = accountIdentitySnapshot();
    const leagues = Array.isArray(online.weeklyLeagues) ? online.weeklyLeagues : [];
    if (leagues.length && window.starStrikeOnline && typeof window.starStrikeOnline.selectWeeklyLeague === "function") {
      const current = Math.max(0, leagues.findIndex((league) => league.id === online.selectedWeeklyLeagueId));
      const direction = hitRect(r.leaguePrev, x, y) ? -1 : 1;
      const next = (current + direction + leagues.length) % leagues.length;
      window.starStrikeOnline.selectWeeklyLeague(leagues[next].id);
    }
    return true;
  }
  if (recordsPanelTab === "weekly" && hitRect(r.joinLeague, x, y)) { requestWeeklyLeague(); return true; }
  return true;
}

function handleAchievementsPanelPointerDown(x, y, pointerId = null) {
  const r = getAchievementsRects();
  if (hitRect(r.closeRect, x, y)) { closeTitleMetaScreen(); return true; }
  for (const [category, rect] of Object.entries(r.tabs)) {
    if (hitRect(rect, x, y)) { setAchievementCategory(category); return true; }
  }
  if (hitRect(r.scrollUp, x, y)) { achievementScroll -= 222; clampAchievementScroll(); return true; }
  if (hitRect(r.scrollDown, x, y)) { achievementScroll += 222; clampAchievementScroll(); return true; }
  if (hitRect(r.contentRect, x, y)) {
    titleScrollablePendingAction = null;
    achievementScrollController.begin(pointerId, x, y, canvas);
  }
  return true;
}

function handleProgressPanelPointerDown(x, y, pointerId = null) {
  const r = getProgressRects();
  if (hitRect(r.closeRect, x, y)) { closeTitleMetaScreen(); return true; }
  if (typeof getProgressDetailRect === "function" && titleProgressSelectedNode && hitRect(getProgressDetailRect(), x, y)) {
    return true;
  }
  if (hitRect(r.contentRect, x, y)) {
    beginTitleProgressDrag(pointerId, x, y);
    return true;
  }
  return true;
}

function handleOpenTitlePanelPointerDown(x, y, pointerId = null) {
  if (!titlePanelHit(x, y)) return true;
  if (titleSubState === "codex") return handleCodexPanelPointerDown(x, y, pointerId);
  if (titleSubState === "online") return handleOnlinePanelPointerDown(x, y);
  if (titleSubState === "records") return handleRecordsPanelPointerDown(x, y);
  if (titleSubState === "achievements") return handleAchievementsPanelPointerDown(x, y, pointerId);
  if (titleSubState === "progress") return handleProgressPanelPointerDown(x, y, pointerId);
  return true;
}

function handleTitlePointerDown(x, y, pointerId = null) {
  if (state.sceneTransition.mode !== "idle") return true;
  if (deleteAccountConfirm) {
    const r = getAccountDeletionConfirmRects();
    if (hitRect(r.cancel, x, y)) { deleteAccountConfirm = false; return true; }
    if (hitRect(r.confirm, x, y)) {
      deleteAccountConfirm = false;
      Promise.resolve(window.starStrikeOnline.requestAccountDeletion()).catch(() => {});
      return true;
    }
    return true;
  }
  if (resetProgressConfirm) return handleResetProgressConfirmDown(x, y);
  if (titlePanelAnim > 0.02) return handleOpenTitlePanelPointerDown(x, y, pointerId);

  const callRect = getCallSignRect();
  const playRect = getPlayButtonRect();
  const iconRects = getTitleIconRects();

  if (hitRect(callRect, x, y)) {
    beginCallSignEditing();
    return true;
  }
  if (callSignEditing) {
    commitCallSignDraft(true);
  }

  if (hitRect(playRect, x, y)) {
    playBtnPointerDown = true;
    playBtnPointerInside = true;
    return true;
  }
  if (hitRect(iconRects.account, x, y)) {
    if (titleSubState === "online" && titlePanelTarget === 1) closeTitleMetaScreen();
    else openTitleMetaScreen("online");
    return true;
  }
  if (hitRect(iconRects.achievements, x, y)) {
    if (titleSubState === "achievements" && titlePanelTarget === 1) closeTitleMetaScreen();
    else openTitleMetaScreen("achievements");
    return true;
  }
  if (hitRect(iconRects.progress, x, y)) {
    if (titleSubState === "progress" && titlePanelTarget === 1) closeTitleMetaScreen();
    else openTitleProgressRoad();
    return true;
  }
  if (hitRect(iconRects.records, x, y)) {
    if (titleSubState === "records" && titlePanelTarget === 1) closeTitleMetaScreen();
    else openTitleMetaScreen("records");
    return true;
  }
  if (hitRect(iconRects.codex, x, y)) {
    codexHasNew = false;
    if (titleSubState === "codex" && titlePanelTarget === 1) closeTitleMetaScreen();
    else openTitleMetaScreen("codex");
    return true;
  }

  return false;
}
