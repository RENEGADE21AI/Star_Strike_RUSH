const TITLE_PATTERNS = {
  solo: [[0,0]],
  vee: [[0,0],[-38,30],[38,30]],
  line: [[-48,0],[0,0],[48,0]],
  arrow: [[0,0],[-40,32],[40,32],[0,62]],
  diamond: [[0,0],[-40,30],[40,30],[0,60]],
  escort: [[0,0],[-38,24],[38,24]]
};
function setCallSignFromInputKey(e) {
  if (e.key === "Enter") {
    e.preventDefault();
    commitCallSignDraft();
  } else if (e.key === "Escape") {
    e.preventDefault();
    cancelCallSignEditing();
  }
}
function setHandleFromInputKey(e) {
  if (e.key === "Enter") {
    e.preventDefault();
    commitPublicHandleDraft();
  } else if (e.key === "Escape") {
    e.preventDefault();
    cancelHandleEditing();
  }
}
function getCallSignRect() {
  return { x: W / 2 - 120, y: H * 0.355 - 20, w: 240, h: 40 };
}
function getPlayButtonRect() {
  return { x: W / 2 - 100, y: H * 0.465 - 25, w: 200, h: 50 };
}
function getTitleIconRects() {
  const centerX = W / 2;
  const y = H * 0.58;
  const size = 42;
  const gap = 10;
  const total = size * 4 + gap * 3;
  const startX = centerX - total / 2;
  const callRect = getCallSignRect();
  return {
    achievements: { x: startX, y, w: size, h: size },
    progress: { x: startX + size + gap, y, w: size, h: size },
    records: { x: startX + 2 * (size + gap), y, w: size, h: size },
    codex: { x: startX + 3 * (size + gap), y, w: size, h: size },
    account: { x: callRect.x - 46, y: callRect.y, w: 36, h: 40 }
  };
}
function getTitlePanelRect() {
  const marginX = 10;
  const marginY = 14;
  const panelW = W - marginX * 2;
  const panelH = H - marginY * 2;
  return { x: marginX, y: marginY, w: panelW, h: panelH };
}
function getGameOverButtons() {
  const btnW = 220, btnH = 40, x = Math.round((W - btnW) / 2), y1 = Math.round(H * 0.59), gap = 10;
  return {
    respawn: { x, y: y1, w: btnW, h: btnH },
    road: { x, y: y1 + btnH + gap, w: btnW, h: btnH },
    title: { x, y: y1 + 2 * (btnH + gap), w: btnW, h: btnH }
  };
}
function hitRect(rect, x, y) { return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h; }

function getCodexRects() {
  const panel = getTitlePanelRect();
  const closeRect = { x: panel.x + 14, y: panel.y + 12, w: 54, h: 22 };
  const rects = codexCardRects(panel);
  const tabs = codexTabRects(panel);
  const contentRect = { x: panel.x + 14, y: panel.y + 128, w: panel.w - 28, h: panel.h - 142 };
  return { panel, closeRect, contentRect, rects, ...tabs };
}
function getOnlineRects() {
  const panel = getTitlePanelRect();
  const closeRect = { x: panel.x + 14, y: panel.y + 12, w: 54, h: 22 };
  const innerX = panel.x + 20;
  const tabY = panel.y + 50;
  const tabGap = 6;
  const tabW = Math.floor((panel.w - 40 - tabGap) / 2);
  const pilotTab = { x: innerX, y: tabY, w: tabW, h: 28 };
  const settingsTab = { x: pilotTab.x + tabW + tabGap, y: tabY, w: tabW, h: 28 };
  const editCallSign = { x: innerX + 124, y: panel.y + 126, w: panel.w - 184, h: 42 };
  const claimHandle = { x: innerX, y: panel.y + 278, w: panel.w - 40, h: 32 };
  const signIn = { x: innerX, y: panel.y + 326, w: panel.w - 40, h: 34 };
  const signOut = { x: innerX, y: panel.y + 372, w: panel.w - 40, h: 30 };
  const btnW = 64, btnH = 28, gap = 10, btnY = panel.y + 150;
  const low = { x: innerX, y: btnY, w: btnW, h: btnH };
  const med = { x: innerX + (btnW + gap), y: btnY, w: btnW, h: btnH };
  const high = { x: innerX + 2 * (btnW + gap), y: btnY, w: btnW, h: btnH };
  const shake = { x: innerX, y: btnY + 50, w: 134, h: 30 };
  const reset = { x: panel.x + panel.w - 180, y: btnY + 50, w: 160, h: 30 };
  const motion = { x: innerX, y: btnY + 96, w: panel.w - 40, h: 30 };
  const flash = { x: innerX, y: btnY + 134, w: panel.w - 40, h: 30 };
  const contrast = { x: innerX, y: btnY + 172, w: panel.w - 40, h: 30 };
  const audioGap = 8;
  const audioW = Math.floor((panel.w - 40 - audioGap) / 2);
  const music = { x: innerX, y: btnY + 210, w: audioW, h: 30 };
  const effects = { x: innerX + audioW + audioGap, y: btnY + 210, w: audioW, h: 30 };
  return { panel, closeRect, pilotTab, settingsTab, editCallSign, claimHandle, signIn, signOut, low, med, high, shake, reset, motion, flash, contrast, music, effects };
}
function getRecordsRects() {
  const panel = getTitlePanelRect();
  const closeRect = { x: panel.x + 14, y: panel.y + 12, w: 54, h: 22 };
  const tabGap = 6;
  const tabW = Math.floor((panel.w - 40 - tabGap) / 2);
  const globalTab = { x: panel.x + 20, y: panel.y + 50, w: tabW, h: 28 };
  const weeklyTab = { x: globalTab.x + tabW + tabGap, y: globalTab.y, w: tabW, h: 28 };
  const joinLeague = { x: panel.x + 20, y: panel.y + panel.h - 58, w: panel.w - 40, h: 34 };
  return { panel, closeRect, globalTab, weeklyTab, joinLeague };
}
function getAchievementsRects() {
  const panel = getTitlePanelRect();
  const closeRect = { x: panel.x + 14, y: panel.y + 12, w: 54, h: 22 };
  const categories = ["all", "strike", "combat", "systems", "career"];
  const gap = 4;
  const tabW = Math.floor((panel.w - 40 - gap * (categories.length - 1)) / categories.length);
  const tabs = {};
  categories.forEach((category, index) => {
    tabs[category] = { x: panel.x + 20 + index * (tabW + gap), y: panel.y + 52, w: tabW, h: 25 };
  });
  const contentRect = { x: panel.x + 16, y: panel.y + 176, w: panel.w - 32, h: panel.h - 230 };
  const scrollUp = { x: panel.x + panel.w - 60, y: panel.y + panel.h - 43, w: 20, h: 20 };
  const scrollDown = { x: panel.x + panel.w - 34, y: panel.y + panel.h - 43, w: 20, h: 20 };
  return { panel, closeRect, tabs, contentRect, scrollUp, scrollDown };
}
function achievementsForCurrentCategory() {
  const definitions = typeof getAchievementDefinitions === "function" ? getAchievementDefinitions() : [];
  return achievementCategory === "all"
    ? definitions
    : definitions.filter((achievement) => achievement.category === achievementCategory);
}
function getAchievementContentHeight() {
  return Math.ceil(achievementsForCurrentCategory().length / 2) * 74;
}
function getAchievementMaxScroll() {
  return Math.max(0, getAchievementContentHeight() - getAchievementsRects().contentRect.h);
}
function clampAchievementScroll() {
  achievementScroll = clamp(achievementScroll, 0, getAchievementMaxScroll());
}
function setAchievementCategory(category) {
  if (!["all", "strike", "combat", "systems", "career"].includes(category)) return;
  achievementCategory = category;
  achievementScroll = 0;
  if (typeof achievementScrollController !== "undefined") achievementScrollController.cancel();
}
function getProgressRects() {
  const panel = getTitlePanelRect();
  const closeRect = { x: panel.x + 14, y: panel.y + 12, w: 54, h: 22 };
  const tabW = Math.floor((panel.w - 48) / 2);
  const gloryTab = { x: panel.x + 20, y: panel.y + 72, w: tabW, h: 30 };
  const seasonTab = { x: gloryTab.x + tabW + 8, y: gloryTab.y, w: tabW, h: 30 };
  const contentRect = { x: panel.x + 18, y: panel.y + 162, w: panel.w - 36, h: panel.h - 198 };
  return { panel, closeRect, gloryTab, seasonTab, contentRect };
}
function getProgressContentHeight() {
  if (typeof getProgressRoadContentHeight === "function") return getProgressRoadContentHeight();
  if (titleProgressTab === "season") return 86 + 50 * 62;
  const gloryStepCount = Math.max(1, GLORY_RANKS.length * 2 - 1);
  return 72 + gloryStepCount * 80;
}
function getProgressMaxScroll() {
  const r = getProgressRects();
  return Math.max(0, getProgressContentHeight() - r.contentRect.h);
}
function clampTitleProgressScroll() {
  titleProgressScroll = clamp(titleProgressScroll, 0, getProgressMaxScroll());
}
function getProgressDetailRect() {
  const r = getProgressRects();
  const w = r.contentRect.w - 24;
  const h = 112;
  return { x: r.contentRect.x + 12, y: r.contentRect.y + r.contentRect.h - h - 10, w, h };
}
function getResetConfirmRects() {
  const boxW = Math.min(460, W - 28);
  const boxH = 218;
  const boxX = Math.round((W - boxW) / 2);
  const boxY = Math.round((H - boxH) / 2);
  const no = { x: boxX + 28, y: boxY + boxH - 48, w: 116, h: 32 };
  const yes = { x: boxX + boxW - 144, y: boxY + boxH - 48, w: 116, h: 32 };
  return { box: { x: boxX, y: boxY, w: boxW, h: boxH }, yes, no };
}
