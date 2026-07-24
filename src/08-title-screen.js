const TITLE_PATTERNS = {
  solo: [[0,0]],
  vee: [[0,0],[-38,30],[38,30]],
  line: [[-48,0],[0,0],[48,0]],
  arrow: [[0,0],[-40,32],[40,32],[0,62]],
  diamond: [[0,0],[-40,30],[40,30],[0,60]],
  escort: [[0,0],[-38,24],[38,24]]
};
const TITLE_MAX_FORMATIONS = 2;
const TITLE_FORMATION_MIN_GAP = 18;

function pickFormationPathType() {
  const r = Math.random();
  if (r < 0.30) return "horizontal";
  if (r < 0.50) return "diagonal";
  if (r < 0.75) return "sweep";
  if (r < 0.90) return "figure_pass";
  return "strafe";
}
function makeTitleFormation(lane = 0, dir = 1, spawnAbove = false) {
  const laneYs = titleLaneYs();
  const groupedPatterns = ["vee", "line", "arrow", "diamond", "escort"];
  const pattern = Math.random() < 0.72 ? "solo" : groupedPatterns[Math.floor(Math.random() * groupedPatterns.length)];
  const kind = ["red", "orange", "purple"][Math.floor(Math.random() * 3)];
  const pathType = pickFormationPathType();
  const sway = rand(0, TAU);
  const members = pattern === "solo" ? 1 : (Math.random() < 0.74 ? 2 : 3);
  const layerRoll = Math.random();
  const depthLayer = layerRoll < 0.38 ? "distant" : layerRoll < 0.82 ? "midground" : "foreground";
  const layerProfile = depthLayer === "distant"
    ? { scale: rand(0.50, 0.66), alpha: rand(0.24, 0.38), speed: 0.78, blur: 1.4, order: 0 }
    : depthLayer === "foreground"
      ? { scale: rand(1.12, 1.42), alpha: rand(0.72, 0.90), speed: 1.12, blur: 0, order: 2 }
      : { scale: rand(0.76, 0.98), alpha: rand(0.46, 0.66), speed: 0.94, blur: 0.35, order: 1 };

  let x = 0, y = 0, vx = 0, vy = 0, baseY = laneYs[lane] + rand(-8, 8);
  const traversalFrames = Math.round(rand(270, 510) / layerProfile.speed);
  let pathDuration = traversalFrames, speed = (W + 160) / traversalFrames;
  let startX = 0, startY = 0;

  if (pathType === "horizontal") {
    dir = Math.random() < 0.5 ? 1 : -1;
    startX = dir > 0 ? -80 : W + 80;
    x = startX;
    y = baseY;
    vx = dir * speed;
    vy = 0;
    pathDuration = traversalFrames;
  } else if (pathType === "diagonal") {
    const corners = [
      [-70, -70, 1, 1],
      [W + 70, -70, -1, 1],
      [-70, H + 70, 1, -1],
      [W + 70, H + 70, -1, -1]
    ];
    const c = corners[Math.floor(Math.random() * corners.length)];
    x = startX = c[0];
    y = startY = c[1];
    vx = c[2] * Math.max(0.75, (W + 140) / traversalFrames);
    vy = c[3] * Math.max(0.75, (H + 140) / traversalFrames);
    pathDuration = traversalFrames;
  } else if (pathType === "sweep") {
    dir = Math.random() < 0.5 ? 1 : -1;
    startX = dir > 0 ? -80 : W + 80;
    x = startX;
    baseY = H * rand(0.15, 0.30);
    y = baseY;
    vx = dir * speed;
    vy = 0;
    pathDuration = traversalFrames;
  } else if (pathType === "figure_pass") {
    x = startX = W * rand(0.22, 0.78);
    y = startY = -120;
    pathDuration = traversalFrames;
  } else if (pathType === "strafe") {
    dir = Math.random() < 0.5 ? 1 : -1;
    startX = dir > 0 ? -90 : W + 90;
    x = startX;
    y = startY = H * rand(0.40, 0.70);
    vx = dir * speed * 1.15;
    vy = rand(0.15, 0.25) * (Math.random() < 0.5 ? -1 : 1);
    pathDuration = traversalFrames;
  }
  speed *= layerProfile.speed;
  vx *= layerProfile.speed;
  vy *= layerProfile.speed;

  return {
    x, y, vx, vy, baseY,
    dir,
    speed,
    pattern,
    kind,
    pathType,
    pathT: 0,
    pathDuration,
    traversalFrames,
    startX,
    startY,
    enterX: x,
    enterY: y,
    apexY: H * rand(0.35, 0.50),
    sweepAmplitude: rand(60, 120),
    depth: rand(H * 0.35, H * 0.50),
    depthLayer,
    drawOrder: layerProfile.order,
    renderBlur: layerProfile.blur,
    reversed: false,
    members,
    renderScale: layerProfile.scale,
    renderAlpha: layerProfile.alpha,
    speedScale: layerProfile.speed,
    age: 0,
    sway,
    rot: rand(-0.03, 0.03),
    bank: rand(-0.02, 0.02),
    leaderHistory: [],
    prevX: x,
    prevY: y,
    vx_this_frame: 0,
    vy_this_frame: 0,
    angle: Math.PI / 2,
    removed: false,
    spawnBlockedFrames: 0,
    avoidX: 0,
    avoidY: 0
  };
}
function initTitleFormations() {
  state.titleFormations = [];
  state.titleLaneCooldowns = [0, 0, 0, 0];
  state.titleLaneCursor = 0;
  state.titleSpawnTimer = 18;
  const startCount = 2;
  for (let i = 0; i < startCount; i++) {
    const lane = i % titleLaneYs().length;
    const dir = lane % 2 === 0 ? 1 : -1;
    const f = makeTitleFormation(lane, dir, true);
    f.pathType = "horizontal";
    f.dir = dir;
    f.speed = (W + 160) / f.traversalFrames;
    f.vx = dir * f.speed;
    f.vy = 0;
    f.x = i === 0 ? W * 0.18 : W * 0.82;
    f.y = f.baseY = i === 0 ? H * 0.82 : H * 0.28;
    f.renderScale = i === 0 ? 1.35 : 0.92;
    f.renderAlpha = i === 0 ? 0.86 : 0.62;
    f.renderBlur = 0;
    f.drawOrder = i === 0 ? 2 : 1;
    f.pathT = Math.round(f.traversalFrames * (i === 0 ? 0.28 : 0.58));
    state.titleFormations.push(f);
    state.titleLaneCooldowns[lane] = 90 + lane * 12;
  }
}
function titlePathReservationConflict(newF, other, futureFrames) {
  const newX = newF.x + (newF.vx || newF.dir * newF.speed || 0) * futureFrames;
  const newY = newF.y + (newF.vy || 0) * futureFrames;
  const otherX = other.x + (other.vx || other.dir * other.speed || 0) * futureFrames;
  const otherY = other.y + (other.vy || 0) * futureFrames;
  const reservedDistance = titleFormationVisualRadius(newF) + titleFormationVisualRadius(other) + TITLE_FORMATION_MIN_GAP;
  return Math.hypot(otherX - newX, otherY - newY) < reservedDistance;
}
function titleFormationVisualRadius(formation) {
  const memberSpread = 1 + Math.max(0, Number(formation.members || 1) - 1) * 0.44;
  return (32 * Math.max(0.5, Number(formation.renderScale || 1))) * memberSpread + 12;
}
function separateTitleFormations() {
  const formations = state.titleFormations.filter((formation) => formation && !formation.removed);
  for (const formation of formations) {
    formation.avoidX = (formation.avoidX || 0) * 0.90;
    formation.avoidY = (formation.avoidY || 0) * 0.90;
  }
  for (let firstIndex = 0; firstIndex < formations.length; firstIndex++) {
    for (let secondIndex = firstIndex + 1; secondIndex < formations.length; secondIndex++) {
      const first = formations[firstIndex];
      const second = formations[secondIndex];
      const firstX = first.x + first.avoidX;
      const firstY = first.y + first.avoidY;
      const secondX = second.x + second.avoidX;
      const secondY = second.y + second.avoidY;
      let dx = secondX - firstX;
      let dy = secondY - firstY;
      let distance = Math.hypot(dx, dy);
      const minimumDistance = titleFormationVisualRadius(first) + titleFormationVisualRadius(second) + TITLE_FORMATION_MIN_GAP;
      if (distance >= minimumDistance) continue;
      const overlapDistance = distance;
      if (distance < 0.001) {
        dx = firstIndex % 2 === 0 ? 1 : -1;
        dy = 0.35;
        distance = Math.hypot(dx, dy);
      }
      const push = (minimumDistance - overlapDistance) * 0.5;
      const nx = dx / distance;
      const ny = dy / distance;
      first.avoidX -= nx * push;
      first.avoidY -= ny * push;
      second.avoidX += nx * push;
      second.avoidY += ny * push;
    }
  }
}
function formationSpawnWouldOverlap(newF) {
  for (const other of state.titleFormations) {
    if (!other || other.removed) continue;
    const yOverlap = Math.abs(other.y - newF.baseY) < 80;
    const sameDir = other.dir === newF.dir;
    const closeX = Math.abs(other.x - newF.x) < 200;
    if (yOverlap && sameDir && closeX) return true;
    const minimumDistance = titleFormationVisualRadius(newF) + titleFormationVisualRadius(other) + TITLE_FORMATION_MIN_GAP;
    if (Math.hypot(other.x - newF.x, other.y - newF.baseY) < minimumDistance) return true;
    if ([45, 90, 135].some((frames) => titlePathReservationConflict(newF, other, frames))) return true;
  }
  return false;
}
function spawnTitleFormationIfPossible() {
  const lanes = titleLaneYs();
  let lane = -1;
  for (let attempt = 0; attempt < lanes.length; attempt++) {
    const idx = (state.titleLaneCursor + attempt) % lanes.length;
    if (state.titleLaneCooldowns[idx] === 0) {
      lane = idx;
      state.titleLaneCursor = (idx + 1) % lanes.length;
      break;
    }
  }
  if (lane < 0) return false;
  const dir = lane % 2 === 0 ? 1 : -1;
  const f = makeTitleFormation(lane, dir, true);
  if (formationSpawnWouldOverlap(f)) return false;
  state.titleFormations.push(f);
  state.titleLaneCooldowns[lane] = 120;
  return true;
}
function updateTitleFormations() {
  if (!state.titleFormations.length) initTitleFormations();

  for (let i = state.titleLaneCooldowns.length - 1; i >= 0; i--) {
    state.titleLaneCooldowns[i] = Math.max(0, state.titleLaneCooldowns[i] - 1);
  }

  for (let i = state.titleFormations.length - 1; i >= 0; i--) {
    const f = state.titleFormations[i];
    if (!f || f.removed) continue;
    f.age++;
    f.pathT++;
    f.prevX = f.x;
    f.prevY = f.y;

    const t = f.pathT;
    if (f.pathType === "horizontal") {
      f.x += f.dir * f.speed;
      f.y = f.baseY;
    } else if (f.pathType === "diagonal") {
      f.x += f.vx;
      f.y += f.vy;
    } else if (f.pathType === "sweep") {
      f.x += f.dir * f.speed;
      f.y = f.baseY + Math.sin(t * 0.022) * f.sweepAmplitude;
    } else if (f.pathType === "figure_pass") {
      const half = Math.max(1, Math.floor(f.pathDuration / 2));
      const riseTarget = f.apexY;
      const startY = f.startY;
      const fallY = -120;
      if (t <= half) {
        const u = clamp(t / half, 0, 1);
        f.y = startY + easeOutCubic(u) * (riseTarget - startY);
      } else {
        const u = clamp((t - half) / half, 0, 1);
        f.y = riseTarget - easeOutCubic(u) * (riseTarget - fallY);
      }
      f.x = f.enterX + Math.sin(t * 0.03) * 180;
    } else if (f.pathType === "strafe") {
      f.x += f.dir * f.speed;
      f.y += f.vy;
    }

    f.vx_this_frame = f.x - f.prevX;
    f.vy_this_frame = f.y - f.prevY;
    f.angle = Math.atan2(f.vy_this_frame, f.vx_this_frame) - Math.PI / 2;

    f.leaderHistory.push({ x: f.x, y: f.y });
    if (f.leaderHistory.length > 12) f.leaderHistory.shift();

    const offscreenMargin = 260;
    if (
      f.pathT > f.pathDuration + 60 ||
      f.x < -offscreenMargin || f.x > W + offscreenMargin ||
      f.y < -180 || f.y > H + 180
    ) {
      f.removed = true;
      state.titleFormations.splice(i, 1);
    }
  }

  separateTitleFormations();
  state.titleSpawnTimer--;
  if (state.titleSpawnTimer <= 0 && state.titleFormations.length < TITLE_MAX_FORMATIONS) {
    if (!spawnTitleFormationIfPossible()) {
      state.titleSpawnTimer = 1;
    } else {
      state.titleSpawnTimer = Math.floor(rand(75, 120));
    }
  }

  if (state.titleFormations.length > TITLE_MAX_FORMATIONS) state.titleFormations.length = TITLE_MAX_FORMATIONS;
}
function updateTitleScreen() {
  if (state.sceneTransition.mode === "title_launch") {
    state.sceneTransition.frame++;
    updateTitleFormations();
    if (state.sceneTransition.frame >= state.sceneTransition.duration) startPlayingSession();
    return;
  }
  updateTitleFormations();
  if (titlePanelTarget === 0 && titlePanelAnim < 0.02) {
    titleSubState = "main";
    codexDetailType = null;
  }
  titlePanelAnim = settingReducedMotion ? titlePanelTarget : titlePanelAnim + (titlePanelTarget - titlePanelAnim) * 0.22;
  titleMetaScreenTransition = settingReducedMotion ? 1 : titleMetaScreenTransition + (1 - titleMetaScreenTransition) * 0.24;
  if (titleMetaScreenTransition > 0.995) titleMetaScreenTransition = 1;
  titleProgressClaimPulse = Math.max(0, titleProgressClaimPulse - 1);
  callSignCursorBlink = (callSignCursorBlink + 1) % 56;
  if (titleSubState === "progress") clampTitleProgressScroll();

  if (playBtnPointerDown && playBtnPointerInside) {
    playBtnHold++;
    if (playBtnHold >= 45) {
      playBtnHold = 0;
      playBtnPointerDown = false;
      playBtnPointerInside = false;
      beginGame();
    }
  } else if (playBtnPointerDown && !playBtnPointerInside) {
    playBtnHold = 0;
  }
}
function updateRespawnHold() {
  if (respawnPointerDown && respawnPointerInside) {
    respawnHold++;
    if (respawnHold >= 30) {
      respawnHold = 0;
      respawnPointerDown = false;
      respawnPointerInside = false;
      beginGame();
    }
  } else if (respawnPointerDown && !respawnPointerInside) {
    respawnHold = 0;
  }
}

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
  return { panel, closeRect, rects, ...tabs };
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
  const sound = { x: innerX, y: btnY + 210, w: panel.w - 40, h: 30 };
  return { panel, closeRect, pilotTab, settingsTab, editCallSign, claimHandle, signIn, signOut, low, med, high, shake, reset, motion, flash, contrast, sound };
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
  const boxH = 166;
  const boxX = Math.round((W - boxW) / 2);
  const boxY = Math.round((H - boxH) / 2);
  const no = { x: boxX + 28, y: boxY + boxH - 48, w: 116, h: 32 };
  const yes = { x: boxX + boxW - 144, y: boxY + boxH - 48, w: 116, h: 32 };
  return { box: { x: boxX, y: boxY, w: boxW, h: boxH }, yes, no };
}
