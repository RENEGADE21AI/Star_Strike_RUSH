let gloryCelebrationState = {
  active: false,
  queue: [],
  index: 0,
  frame: 0
};

function gloryCelebrationActive() {
  return gloryCelebrationState.active && gloryCelebrationState.index < gloryCelebrationState.queue.length;
}

function currentGloryCelebration() {
  return gloryCelebrationActive() ? gloryCelebrationState.queue[gloryCelebrationState.index] : null;
}

function gloryCelebrationDurationFrames(event) {
  if (!event) return 0;
  const base = event.type === "prestige" || event.type === "prestige_summary" ? 210 : event.type === "rank" ? 138 : 102;
  return settingReducedMotion ? Math.max(72, Math.round(base * 0.68)) : base;
}

function playGloryCelebrationAccent(event) {
  if (!event || typeof playGameSound !== "function") return;
  if (event.type === "prestige" || event.type === "prestige_summary") playGameSound("prestige", 1);
  else if (event.type === "rank") playGameSound("rank_up", 0.85 + event.intensity * 0.25);
  else playGameSound("checkpoint", 0.65 + event.intensity * 0.22);
}

function resetGloryCelebrations() {
  gloryCelebrationState = { active: false, queue: [], index: 0, frame: 0 };
}

function startGloryCelebrations(events) {
  const queue = Array.isArray(events) ? events.filter(Boolean).map((event) => ({ ...event })) : [];
  gloryCelebrationState = { active: queue.length > 0, queue, index: 0, frame: 0 };
  if (queue.length > 0) playGloryCelebrationAccent(queue[0]);
}

function advanceGloryCelebration(force = false) {
  if (!gloryCelebrationActive()) return false;
  if (!force && gloryCelebrationState.frame < 12) return true;
  gloryCelebrationState.index++;
  gloryCelebrationState.frame = 0;
  if (gloryCelebrationState.index >= gloryCelebrationState.queue.length) {
    gloryCelebrationState.active = false;
    return true;
  }
  playGloryCelebrationAccent(gloryCelebrationState.queue[gloryCelebrationState.index]);
  return true;
}

function updateGloryCelebration() {
  const event = currentGloryCelebration();
  if (!event) return;
  if (event.qaHold === true) {
    gloryCelebrationState.frame = Math.min(48, gloryCelebrationState.frame + 1);
    return;
  }
  gloryCelebrationState.frame++;
  if (gloryCelebrationState.frame >= gloryCelebrationDurationFrames(event)) advanceGloryCelebration(true);
}

function gloryCelebrationCopy(event) {
  if (event.type === "prestige" || event.type === "prestige_summary") {
    return {
      eyebrow: "STAR ETERNAL",
      title: "GLORY ROAD COMPLETE",
      value: event.type === "prestige_summary" && event.roadsCompleted > 1
        ? `${event.roadsCompleted} ROADS CROSSED • PRESTIGE ${romanPrestige(event.prestigeAfter)}`
        : `PRESTIGE ${romanPrestige(event.prestigeAfter)} EARNED`,
      detail: "YOUR GLORY ENDURES • THE ROAD BEGINS AGAIN"
    };
  }
  if (event.type === "rank") {
    return {
      eyebrow: "GLORY ASCENDANT",
      title: "RANK UP",
      value: displayGloryRankName(event.rankName, event.prestigeCycle).toUpperCase(),
      detail: `${Number(event.threshold || 0).toLocaleString()} GLORY • PRESTIGE ${romanPrestige(event.prestigeCycle)}`
    };
  }
  return {
    eyebrow: "ROUTE MILESTONE",
    title: "GLORY CHECKPOINT",
    value: `${Number(event.threshold || 0).toLocaleString()} GLORY`,
    detail: `PRESTIGE ${romanPrestige(event.prestigeCycle)} ROAD`
  };
}

function gloryCelebrationLayout(event, width, height) {
  const terminal = event && (event.type === "prestige" || event.type === "prestige_summary");
  const rank = event && event.type === "rank";
  const panelW = terminal ? Math.min(width - 34, 336) : Math.min(width - 54, 310);
  const panelH = terminal ? 246 : 202;
  const panelX = (width - panelW) / 2;
  const panelY = (height - panelH) / 2 - 12;
  return {
    terminal,
    rank,
    panel: { x: panelX, y: panelY, w: panelW, h: panelH },
    eyebrowY: panelY + 14,
    ringY: panelY + (terminal ? 76 : 64),
    ringRadius: terminal ? 42 : rank ? 34 : 28,
    titleY: panelY + (terminal ? 124 : 108),
    valueY: panelY + (terminal ? 164 : 140),
    detailY: panelY + (terminal ? 193 : 161),
    continueRect: {
      x: panelX + 16,
      y: panelY + panelH - 31,
      w: panelW - 32,
      h: 22
    }
  };
}

function drawGloryCelebration() {
  const event = currentGloryCelebration();
  if (!event) return;
  const duration = gloryCelebrationDurationFrames(event);
  const t = clamp(gloryCelebrationState.frame / Math.max(1, duration), 0, 1);
  const enter = settingReducedMotion ? 1 : clamp(t / 0.16, 0, 1);
  const exit = clamp((1 - t) / 0.14, 0, 1);
  const alpha = Math.min(enter, exit);
  const layout = gloryCelebrationLayout(event, W, H);
  const terminal = layout.terminal;
  const rank = layout.rank;
  const intensity = clamp(Number(event.intensity || 0.3), 0.2, 1);
  const copy = gloryCelebrationCopy(event);
  const { x: panelX, y: panelY, w: panelW, h: panelH } = layout.panel;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = terminal ? "rgba(3,7,18,0.94)" : "rgba(3,7,18,0.88)";
  ctx.fillRect(0, 0, W, H);

  const rayCount = settingReducedMotion ? 8 : Math.round(8 + intensity * 12);
  ctx.translate(W / 2, panelY + panelH * 0.48);
  for (let i = 0; i < rayCount; i++) {
    const angle = (i / rayCount) * TAU + (settingReducedMotion ? 0 : t * 0.32);
    const inner = terminal ? 80 : 62;
    const outer = inner + 55 + intensity * 52;
    ctx.strokeStyle = i % 3 === 0 ? "rgba(255,238,160,0.22)" : "rgba(100,226,255,0.15)";
    ctx.lineWidth = i % 3 === 0 ? 2 : 1;
    ctx.beginPath();
    ctx.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner);
    ctx.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer);
    ctx.stroke();
  }
  ctx.translate(-W / 2, -(panelY + panelH * 0.48));

  const scaleIn = settingReducedMotion ? 1 : 0.94 + 0.06 * enter;
  ctx.translate(W / 2, panelY + panelH / 2);
  ctx.scale(scaleIn, scaleIn);
  ctx.translate(-W / 2, -(panelY + panelH / 2));
  const fill = ctx.createLinearGradient(panelX, panelY, panelX + panelW, panelY + panelH);
  fill.addColorStop(0, terminal ? "rgba(42,32,8,0.96)" : "rgba(10,20,38,0.96)");
  fill.addColorStop(0.48, "rgba(5,9,20,0.98)");
  fill.addColorStop(1, terminal ? "rgba(8,34,39,0.96)" : "rgba(20,10,28,0.96)");
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.roundRect(panelX, panelY, panelW, panelH, terminal ? 18 : 13);
  ctx.fill();
  ctx.strokeStyle = terminal ? "rgba(255,232,132,0.82)" : rank ? "rgba(255,220,112,0.68)" : "rgba(102,225,255,0.55)";
  ctx.lineWidth = terminal ? 3 : 2;
  ctx.stroke();

  const ringY = layout.ringY;
  const ringRadius = layout.ringRadius;
  ctx.shadowColor = terminal ? "rgba(255,226,110,0.72)" : "rgba(90,225,255,0.55)";
  ctx.shadowBlur = settingReducedFlash ? 8 : 16;
  ctx.strokeStyle = terminal ? "rgba(255,239,170,0.82)" : "rgba(100,228,255,0.76)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(W / 2, ringY, ringRadius, 0, TAU);
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.fillStyle = terminal ? "rgba(255,231,130,0.13)" : "rgba(90,225,255,0.10)";
  ctx.beginPath();
  ctx.arc(W / 2, ringY, ringRadius - 6, 0, TAU);
  ctx.fill();
  ctx.fillStyle = terminal ? "#ffe680" : "#78e8ff";
  ctx.beginPath();
  ctx.moveTo(W / 2, ringY - ringRadius * 0.52);
  ctx.lineTo(W / 2 - ringRadius * 0.42, ringY + ringRadius * 0.42);
  ctx.lineTo(W / 2, ringY + ringRadius * 0.18);
  ctx.lineTo(W / 2 + ringRadius * 0.42, ringY + ringRadius * 0.42);
  ctx.closePath();
  ctx.fill();

  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.font = "900 9px 'Arial Narrow', Arial, sans-serif";
  ctx.fillStyle = terminal ? "#ffe680" : "#79eaff";
  ctx.fillText(copy.eyebrow, W / 2, layout.eyebrowY);
  ctx.font = terminal ? "800 28px Impact, Haettenschweiler, sans-serif" : "800 24px Impact, Haettenschweiler, sans-serif";
  ctx.fillStyle = "#fff";
  ctx.fillText(copy.title, W / 2, layout.titleY);
  ctx.font = terminal ? "900 15px 'Arial Narrow', Arial, sans-serif" : "900 14px 'Arial Narrow', Arial, sans-serif";
  ctx.fillStyle = terminal ? "#ffe680" : rank ? "#ffe680" : "#78e8ff";
  ctx.fillText(copy.value.slice(0, 38), W / 2, layout.valueY);
  ctx.font = FONT_TINY;
  ctx.fillStyle = "rgba(235,247,252,0.68)";
  ctx.fillText(copy.detail.slice(0, 48), W / 2, layout.detailY);
  const continueRect = layout.continueRect;
  ctx.fillStyle = "rgba(100,226,255,0.055)";
  ctx.strokeStyle = terminal ? "rgba(255,232,132,0.32)" : "rgba(100,226,255,0.28)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(continueRect.x, continueRect.y, continueRect.w, continueRect.h, 7);
  ctx.fill();
  ctx.stroke();
  ctx.textBaseline = "middle";
  ctx.fillStyle = "rgba(235,247,252,0.58)";
  ctx.fillText("TAP OR PRESS ENTER TO CONTINUE", W / 2, continueRect.y + continueRect.h / 2);
  ctx.restore();
}
