function resetProgressData() {
  highScore = 0;
  previousHighScore = 0;
  highScoreDirty = true;
  saveHighScore();
  codexDiscovered = {};
  codexHasNew = false;
  saveCodexDiscovered();
  metaProgress = makeDefaultMetaProgress();
  lastRunMeta = null;
  saveMetaProgress();
  encounterQueue = [];
  encounterCard = null;
}

function titlePanelHit(x, y) {
  const panel = getTitlePanelRect();
  return titlePanelAnim > 0.02 && x >= panel.x && x <= panel.x + panel.w && y >= panel.y && y <= panel.y + panel.h;
}

function openTitleMetaScreen(screen) {
  if (titleSubState !== screen || titlePanelTarget < 1) titleMetaScreenTransition = 0;
  titleSubState = screen;
  titlePanelTarget = 1;
  if (screen !== "codex") codexDetailType = null;
}

function closeTitleMetaScreen() {
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

function setTitleProgressTab(tab) {
  if (titleProgressTab !== tab) {
    titleProgressTab = tab;
    titleProgressDragActive = false;
    titleProgressDragPointerId = null;
    titleProgressPointerDownNode = null;
    titleProgressSelectedNode = null;
    if (typeof focusTitleProgressOnCurrent === "function") focusTitleProgressOnCurrent();
  }
  clampTitleProgressScroll();
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

function endTitleProgressDrag(pointerId) {
  if (!titleProgressDragActive) return false;
  if (titleProgressDragPointerId !== null && titleProgressDragPointerId !== pointerId) return false;
  if (!titleProgressDragMoved) titleProgressSelectedNode = titleProgressPointerDownNode;
  titleProgressDragActive = false;
  titleProgressDragPointerId = null;
  titleProgressPointerDownNode = null;
  return true;
}

function openTitleProgressRoad(tab = null) {
  openTitleMetaScreen("progress");
  titleProgressDragActive = false;
  titleProgressDragPointerId = null;
  titleProgressPointerDownNode = null;
  titleProgressSelectedNode = null;
  if (tab) titleProgressTab = tab;
  if (typeof focusTitleProgressOnCurrent === "function") focusTitleProgressOnCurrent();
  else clampTitleProgressScroll();
}

function handleProgressClaim(rewardId) {
  const onlineSvc = window.starStrikeOnline;
  const onlineState = onlineSvc && typeof onlineSvc.getState === "function" ? onlineSvc.getState() : null;
  if (onlineState && onlineState.user && typeof onlineSvc.claimSeasonReward === "function") {
    titleProgressSelectedNode = { ...titleProgressSelectedNode, status: "CLAIMING" };
    titleProgressClaimPulse = 32;
    onlineSvc.claimSeasonReward(rewardId).then((result) => {
      const refreshed = typeof getProgressDetailById === "function" ? getProgressDetailById(rewardId) : null;
      if (refreshed) titleProgressSelectedNode = refreshed;
      titleProgressClaimPulse = result && result.ok ? 32 : 0;
    }).catch(() => {
      const refreshed = typeof getProgressDetailById === "function" ? getProgressDetailById(rewardId) : null;
      if (refreshed) titleProgressSelectedNode = refreshed;
      showMessage("ONLINE CLAIM FAILED", 90);
    });
    return;
  }

  const result = claimSeasonReward(rewardId);
  titleProgressClaimPulse = 32;
  const refreshed = typeof getProgressDetailById === "function" ? getProgressDetailById(rewardId) : null;
  if (refreshed) titleProgressSelectedNode = refreshed;
  if (result.ok) {
    showMessage(`CLAIMED ${String((result.applied && result.applied.name) || "REWARD").toUpperCase()}`, 100);
  } else if (result.reason === "already_claimed") {
    showMessage("ALREADY CLAIMED", 80);
  } else if (result.reason === "locked") {
    showMessage("REWARD LOCKED", 80);
  }
}

function handleCodexPanelPointerDown(x, y) {
  const r = getCodexRects();
  if (hitRect(r.closeRect, x, y)) { closeTitleMetaScreen(); return true; }
  if (codexDetailType) {
    const detailCard = getMetaScreenContentRect(r.panel, 8, 8);
    const backRect = { x: detailCard.x + 10, y: detailCard.y + 10, w: 28, h: 22 };
    if (hitRect(backRect, x, y)) { codexDetailType = null; return true; }
    if (!(x >= detailCard.x && x <= detailCard.x + detailCard.w && y >= detailCard.y && y <= detailCard.y + detailCard.h)) {
      codexDetailType = null;
      return true;
    }
    return true;
  }
  const types = typeof getCodexTypes === "function" ? getCodexTypes() : ["red", "orange", "purple", "phantom", "boss_standard", "boss_wraith"];
  for (const type of types) {
    const card = r.rects[type];
    if (!hitRect(card, x, y)) continue;
    if (codexDiscovered[type]) codexDetailType = type;
    return true;
  }
  return true;
}

function handleOnlinePanelPointerDown(x, y) {
  const r = getOnlineRects();
  if (hitRect(r.closeRect, x, y)) { closeTitleMetaScreen(); return true; }
  if (hitRect(r.signIn, x, y)) { requestOnlineSignIn(); return true; }
  if (hitRect(r.signOut, x, y)) { requestOnlineSignOut(); return true; }
  if (hitRect(r.low, x, y)) { settingMaxParticles = 300; MAX_PARTICLES = settingMaxParticles; saveSettings(); return true; }
  if (hitRect(r.med, x, y)) { settingMaxParticles = 600; MAX_PARTICLES = settingMaxParticles; saveSettings(); return true; }
  if (hitRect(r.high, x, y)) { settingMaxParticles = 900; MAX_PARTICLES = settingMaxParticles; saveSettings(); return true; }
  if (hitRect(r.shake, x, y)) { settingScreenShake = !settingScreenShake; saveSettings(); return true; }
  if (hitRect(r.reset, x, y)) { resetProgressConfirm = true; return true; }
  if (hitRect(r.refresh, x, y)) { requestOnlineRefresh(); return true; }
  return true;
}

function handleRecordsPanelPointerDown(x, y) {
  const r = getRecordsRects();
  if (hitRect(r.closeRect, x, y)) { closeTitleMetaScreen(); return true; }
  if (hitRect(r.refresh, x, y)) { requestOnlineRefresh(); return true; }
  return true;
}

function handleAchievementsPanelPointerDown(x, y) {
  const r = getAchievementsRects();
  if (hitRect(r.closeRect, x, y)) { closeTitleMetaScreen(); return true; }
  return true;
}

function handleProgressPanelPointerDown(x, y, pointerId = null) {
  const r = getProgressRects();
  if (hitRect(r.closeRect, x, y)) { closeTitleMetaScreen(); return true; }
  if (hitRect(r.gloryTab, x, y)) { setTitleProgressTab("glory"); return true; }
  if (hitRect(r.seasonTab, x, y)) { setTitleProgressTab("season"); return true; }
  if (typeof getProgressDetailRect === "function" && titleProgressSelectedNode && hitRect(getProgressDetailRect(), x, y)) {
    if (
      typeof progressDetailCanClaim === "function" &&
      typeof getProgressClaimRect === "function" &&
      progressDetailCanClaim(titleProgressSelectedNode) &&
      hitRect(getProgressClaimRect(), x, y)
    ) {
      handleProgressClaim(titleProgressSelectedNode.id);
    }
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
  if (titleSubState === "codex") return handleCodexPanelPointerDown(x, y);
  if (titleSubState === "online") return handleOnlinePanelPointerDown(x, y);
  if (titleSubState === "records") return handleRecordsPanelPointerDown(x, y);
  if (titleSubState === "achievements") return handleAchievementsPanelPointerDown(x, y);
  if (titleSubState === "progress") return handleProgressPanelPointerDown(x, y, pointerId);
  return true;
}

function handleTitlePointerDown(x, y, pointerId = null) {
  if (resetProgressConfirm) return handleResetProgressConfirmDown(x, y);
  if (titlePanelAnim > 0.02) return handleOpenTitlePanelPointerDown(x, y, pointerId);

  const callRect = getCallSignRect();
  const playRect = getPlayButtonRect();
  const iconRects = getTitleIconRects();

  if (hitRect(callRect, x, y)) {
    callSignEditing = true;
    callSignInputEl.value = callSign;
    callSignInputEl.focus();
    return true;
  }
  if (callSignEditing) {
    callSignEditing = false;
    callSignInputEl.blur();
  }

  if (hitRect(playRect, x, y)) {
    playBtnPointerDown = true;
    playBtnPointerInside = true;
    playBtnHold = 0;
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
