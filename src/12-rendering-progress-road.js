function buildGloryRoadLayout(rect, meta) {
  const nodes = makeGloryRoadNodes();
  const roadGlory = Math.max(0, Math.floor(meta.roadGlory || 0));
  const activeIndex = currentRoadIndexForThresholds(nodes, roadGlory);
  const roadX = Math.round(rect.x + rect.w / 2);
  return nodes.map((node, index) => {
    const y = rect.y + ROAD_GLORY_START_Y + (nodes.length - 1 - index) * ROAD_GLORY_GAP;
    const dotX = roadX + Math.sin(index * 1.08 + 0.35) * Math.min(38, rect.w * 0.12);
    const side = dotX >= roadX ? -1 : 1;
    const cardW = node.major ? 116 : 96;
    const cardH = node.major ? 52 : 40;
    const cardX = side < 0 ? dotX - 20 - cardW : dotX + 20;
    return {
      node,
      index,
      roadX,
      dotX,
      dotY: y,
      radius: node.major ? 12 : 8,
      side,
      active: index === activeIndex,
      reached: node.threshold < GLORY_ROAD_LENGTH && roadGlory >= node.threshold,
      cardRect: { x: cardX, y: y - cardH / 2, w: cardW, h: cardH },
      detail: gloryNodeDetail(node, meta)
    };
  });
}

function focusTitleProgressOnCurrent() {
  const meta = typeof currentMetaSnapshot === "function" ? currentMetaSnapshot() : null;
  if (!meta) {
    titleProgressScroll = 0;
    return;
  }
  const r = getProgressRects();
  const marker = roadMarkerPositionForGlory(buildGloryRoadLayout(r.contentRect, meta), meta.roadGlory);
  const targetY = marker ? marker.y : r.contentRect.y + r.contentRect.h * 0.64;
  titleProgressScroll = targetY - (r.contentRect.y + r.contentRect.h * 0.64);
  clampTitleProgressScroll();
}

function drawGloryRoadMetaStrip(x, y, w, meta) {
  const tones = {
    cyan: "rgba(92,238,255,0.72)",
    gold: "rgba(255,230,128,0.70)",
    green: "rgba(120,255,180,0.72)"
  };
  const chips = gloryRoadHeaderChips(meta);
  const gap = 6;
  const chipW = Math.max(72, Math.floor((w - gap * (chips.length - 1)) / chips.length));
  ctx.save();
  ctx.font = "900 8px 'Arial Narrow', Arial, sans-serif";
  ctx.textBaseline = "middle";
  for (let index = 0; index < chips.length; index++) {
    const chip = chips[index];
    const rx = x + index * (chipW + gap);
    const color = tones[chip.tone] || tones.cyan;
    ctx.fillStyle = "rgba(5,8,18,0.72)";
    ctx.fillRect(rx, y, chipW, 22);
    ctx.strokeStyle = color;
    ctx.strokeRect(rx, y, chipW, 22);
    ctx.textAlign = "left";
    ctx.fillStyle = color;
    ctx.fillText(chip.label, rx + 7, y + 11);
    ctx.textAlign = "right";
    ctx.fillStyle = "#fff";
    ctx.fillText(chip.value, rx + chipW - 7, y + 11, chipW - 45);
  }
  ctx.restore();
}

function getProgressNodeAt(x, y) {
  const meta = typeof currentMetaSnapshot === "function" ? currentMetaSnapshot() : null;
  if (!meta) return null;
  const r = getProgressRects();
  for (const item of buildGloryRoadLayout(r.contentRect, meta)) {
    const cardRect = { ...item.cardRect, y: item.cardRect.y - titleProgressScroll };
    const dotY = item.dotY - titleProgressScroll;
    if (hitRect(cardRect, x, y) || Math.hypot(x - item.dotX, y - dotY) <= item.radius + 8) return item.detail;
  }
  return null;
}

function drawProgressSummary(panel, meta) {
  const x = panel.x + 20;
  const y = panel.y + 74;
  const w = panel.w - 40;
  const progress = clamp(Number(meta.roadGlory || 0) / GLORY_ROAD_LENGTH, 0, 1);
  ctx.save();
  ctx.fillStyle = "rgba(8,10,22,0.94)";
  ctx.fillRect(x, y, w, 42);
  ctx.fillStyle = `rgba(255,230,128,${0.07 + Math.min(0.08, Number(meta.prestige || 0) * 0.008)})`;
  ctx.fillRect(x, y, w, 42);
  ctx.strokeStyle = "rgba(255,230,128,0.34)";
  ctx.strokeRect(x, y, w, 42);
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.font = FONT_SMALL;
  ctx.fillStyle = "#ffe680";
  ctx.fillText(String(meta.gloryRankDisplay || meta.gloryRank || "Rookie Pilot").toUpperCase().slice(0, 24), x + 9, y + 6);
  ctx.font = FONT_TINY;
  ctx.fillStyle = "rgba(255,255,255,0.70)";
  ctx.fillText(`${Number(meta.roadGlory || 0).toLocaleString()} / ${Number(GLORY_ROAD_LENGTH).toLocaleString()} ROAD`, x + 9, y + 24);
  ctx.textAlign = "right";
  ctx.fillStyle = "rgba(255,230,128,0.90)";
  ctx.fillText(`${meta.prestigeLabel || "PRESTIGE 0"} • ${formatRoadNumber(meta.totalGlory)} TOTAL`, x + w - 9, y + 7);
  drawMetaBar(x + w - 106, y + 25, 96, progress, "rgba(255,230,128,0.78)");
  ctx.restore();
}

function drawRoadNodeCard(x, y, w, h, node, reached, active, color) {
  ctx.save();
  ctx.fillStyle = active ? color.fillActive : reached ? color.fillReached : "rgba(255,255,255,0.055)";
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = active ? color.strokeActive : reached ? color.strokeReached : "rgba(255,255,255,0.12)";
  ctx.lineWidth = active ? 2 : 1;
  ctx.strokeRect(x, y, w, h);
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.font = node.major ? FONT_SMALL : FONT_TINY;
  ctx.fillStyle = reached || active ? "#fff" : "rgba(255,255,255,0.48)";
  ctx.fillText(String(node.label).slice(0, node.major ? 17 : 15), x + 8, y + 7);
  ctx.font = FONT_TINY;
  ctx.fillStyle = active ? color.textActive : reached ? "rgba(255,255,255,0.72)" : "rgba(255,255,255,0.34)";
  ctx.fillText(String(node.sub).slice(0, 18), x + 8, y + h - 16);
  ctx.restore();
}

function drawProgressRailDot(x, y, radius, reached, active, color) {
  const motion = settingReducedMotion ? 0.5 : 0.5 + Math.sin(state.frame * 0.13) * 0.5;
  const pulse = active ? motion : 0;
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, radius + 3 + pulse * 6, 0, TAU);
  ctx.fillStyle = active ? color.glow : reached ? color.glowSoft : "rgba(255,255,255,0.05)";
  ctx.fill();
  if (active) {
    ctx.strokeStyle = color.strokeActive;
    ctx.globalAlpha = 0.35 + pulse * 0.45;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, radius + 9 + pulse * 4, 0, TAU);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, TAU);
  ctx.fillStyle = active ? color.dotActive : reached ? color.dotReached : "rgba(30,36,54,0.96)";
  ctx.fill();
  ctx.strokeStyle = active ? color.strokeActive : reached ? color.strokeReached : "rgba(255,255,255,0.18)";
  ctx.lineWidth = active ? 2 : 1;
  ctx.stroke();
  ctx.restore();
}

function drawRoadShipMarker(x, y, color) {
  const bob = settingReducedMotion ? 0 : Math.sin(state.frame * 0.16) * 1.8;
  ctx.save();
  ctx.translate(x, y - 29 + bob);
  ctx.shadowColor = color.shadow;
  ctx.shadowBlur = 12;
  ctx.fillStyle = color.ship;
  ctx.beginPath();
  ctx.moveTo(0, -10);
  ctx.lineTo(-8, 10);
  ctx.lineTo(0, 6);
  ctx.lineTo(8, 10);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.90)";
  ctx.beginPath();
  ctx.ellipse(0, -2, 2.4, 4.3, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = color.flame;
  ctx.beginPath();
  ctx.moveTo(-3, 8);
  ctx.lineTo(0, 16);
  ctx.lineTo(3, 8);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawGloryRoadContent(rect, meta) {
  const layout = buildGloryRoadLayout(rect, meta);
  const roadX = Math.round(rect.x + rect.w / 2);
  const prestige = Math.max(0, Math.floor(meta.prestige || 0));
  const color = {
    fillActive: "rgba(255,230,128,0.18)", fillReached: "rgba(120,255,180,0.09)",
    strokeActive: "rgba(255,230,128,0.70)", strokeReached: "rgba(120,255,180,0.32)",
    textActive: "#ffe680", dotActive: "#ffe680", dotReached: "#78ffb4",
    glow: "rgba(255,230,128,0.22)", glowSoft: "rgba(120,255,180,0.11)",
    ship: "#ffe680", shadow: "rgba(255,230,128,0.85)", flame: "rgba(120,255,180,0.78)"
  };
  ctx.save();
  const marker = roadMarkerPositionForGlory(layout, meta.roadGlory);
  for (let i = 1; i < layout.length; i++) {
    const previous = layout[i - 1];
    const item = layout[i];
    ctx.strokeStyle = item.reached ? "rgba(120,255,180,0.34)" : "rgba(255,255,255,0.12)";
    ctx.lineWidth = item.reached ? 4 : 3;
    ctx.setLineDash(item.reached ? [] : [8, 9]);
    ctx.beginPath();
    ctx.moveTo(previous.dotX, previous.dotY);
    const midY = (previous.dotY + item.dotY) / 2;
    ctx.bezierCurveTo(previous.dotX, midY, item.dotX, midY, item.dotX, item.dotY);
    ctx.stroke();
  }
  ctx.setLineDash([]);
  const ornamentCount = Math.min(10, 5 + Math.floor(Math.log2(prestige + 1)));
  for (let i = 0; i < ornamentCount; i++) {
    const planetY = rect.y + 130 + i * 235;
    const planetX = i % 2 ? rect.x + rect.w - 22 : rect.x + 20;
    const gradient = ctx.createRadialGradient(planetX - 3, planetY - 4, 1, planetX, planetY, 18 + i % 3 * 4);
    gradient.addColorStop(0, i % 2 ? "rgba(255,225,145,0.24)" : "rgba(115,180,255,0.22)");
    gradient.addColorStop(1, "rgba(40,45,90,0)");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(planetX, planetY, 22 + i % 3 * 4, 0, TAU);
    ctx.fill();
  }
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.font = FONT_TINY;
  ctx.fillStyle = "rgba(255,255,255,0.48)";
  ctx.fillText(`${meta.prestigeLabel || "PRESTIGE 0"} • GLORY ROAD`, roadX, rect.y + 8);
  for (const item of layout) {
    const card = item.cardRect;
    ctx.strokeStyle = item.active ? "rgba(255,230,128,0.48)" : item.reached ? "rgba(120,255,180,0.24)" : "rgba(255,255,255,0.10)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(item.dotX, item.dotY);
    ctx.lineTo(item.side < 0 ? card.x + card.w : card.x, item.dotY);
    ctx.stroke();
    drawProgressRailDot(item.dotX, item.dotY, item.radius, item.reached, item.active, color);
    drawRoadNodeCard(card.x, card.y, card.w, card.h, item.node, item.reached, item.active, color);
  }
  if (marker) drawRoadShipMarker(marker.x, marker.y, color);
  ctx.restore();
}

function drawProgressScrollBar(rect, contentHeight) {
  const maxScroll = Math.max(0, contentHeight - rect.h);
  if (maxScroll <= 0) return;
  const trackX = rect.x + rect.w - 5;
  const thumbH = clamp((rect.h * rect.h) / contentHeight, 26, rect.h);
  const thumbY = rect.y + (rect.h - thumbH) * (titleProgressScroll / maxScroll);
  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.fillRect(trackX, rect.y, 3, rect.h);
  ctx.fillStyle = "rgba(255,230,128,0.62)";
  ctx.fillRect(trackX - 1, thumbY, 5, thumbH);
  ctx.restore();
}

function drawProgressViewportFade(rect) {
  ctx.save();
  let fade = ctx.createLinearGradient(0, rect.y, 0, rect.y + 22);
  fade.addColorStop(0, "rgba(10,10,20,0.92)");
  fade.addColorStop(1, "rgba(10,10,20,0)");
  ctx.fillStyle = fade;
  ctx.fillRect(rect.x, rect.y, rect.w, 22);
  fade = ctx.createLinearGradient(0, rect.y + rect.h - 22, 0, rect.y + rect.h);
  fade.addColorStop(0, "rgba(10,10,20,0)");
  fade.addColorStop(1, "rgba(10,10,20,0.92)");
  ctx.fillStyle = fade;
  ctx.fillRect(rect.x, rect.y + rect.h - 22, rect.w, 22);
  ctx.restore();
}

function drawProgressDetailPanel() {
  const detail = titleProgressSelectedNode;
  if (!detail) return;
  const rect = getProgressDetailRect();
  ctx.save();
  ctx.fillStyle = "rgba(6,8,18,0.97)";
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.strokeStyle = "rgba(255,230,128,0.55)";
  ctx.lineWidth = 2;
  ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.font = FONT_TINY;
  ctx.fillStyle = "#ffe680";
  ctx.fillText(detail.subtitle.slice(0, 30), rect.x + 10, rect.y + 8);
  ctx.textAlign = "right";
  ctx.fillText(detail.status, rect.x + rect.w - 10, rect.y + 8);
  ctx.textAlign = "left";
  ctx.font = FONT_SMALL;
  ctx.fillStyle = "#fff";
  ctx.fillText(detail.title.slice(0, 28), rect.x + 10, rect.y + 25);
  ctx.font = FONT_TINY;
  ctx.fillStyle = "rgba(255,255,255,0.72)";
  ctx.fillText(detail.requirement.slice(0, 42), rect.x + 10, rect.y + 45);
  ctx.fillText(detail.reward.slice(0, 44), rect.x + 10, rect.y + 59);
  ctx.fillStyle = "rgba(255,255,255,0.50)";
  ctx.fillText(detail.progress.slice(0, 44), rect.x + 10, rect.y + 73);
  ctx.fillStyle = "rgba(255,255,255,0.40)";
  ctx.fillText(String(detail.detail || "").slice(0, 42), rect.x + 10, rect.y + 88);
  ctx.restore();
}

function drawProgressPanel() {
  const r = getProgressRects();
  const panel = r.panel;
  const meta = typeof currentMetaSnapshot === "function" ? currentMetaSnapshot() : null;
  drawTitlePanelFrame(panel, "GLORY ROAD", false);
  drawGloryRoadMetaStrip(panel.x + 18, panel.y + 42, panel.w - 36, meta || {});
  drawPanelCloseButton(r.closeRect);
  if (!meta) return;
  clampTitleProgressScroll();
  drawProgressSummary(panel, meta);
  ctx.save();
  ctx.fillStyle = "rgba(7,9,20,0.90)";
  ctx.fillRect(r.contentRect.x, r.contentRect.y, r.contentRect.w, r.contentRect.h);
  ctx.strokeStyle = "rgba(255,255,255,0.14)";
  ctx.strokeRect(r.contentRect.x, r.contentRect.y, r.contentRect.w, r.contentRect.h);
  ctx.save();
  ctx.beginPath();
  ctx.rect(r.contentRect.x, r.contentRect.y, r.contentRect.w, r.contentRect.h);
  ctx.clip();
  ctx.translate(0, -titleProgressScroll);
  drawGloryRoadContent(r.contentRect, meta);
  ctx.restore();
  drawProgressViewportFade(r.contentRect);
  drawProgressScrollBar(r.contentRect, getProgressContentHeight());
  drawProgressDetailPanel();
  const maxScroll = getProgressMaxScroll();
  const atEnd = maxScroll > 0 && titleProgressScroll >= maxScroll - 2;
  ctx.font = FONT_TINY;
  ctx.fillStyle = "rgba(255,255,255,0.50)";
  ctx.textAlign = "center";
  const interactionLabel = atEnd ? "ROAD START" : titleProgressDragActive ? "DRAGGING ROAD" : titleProgressSelectedNode ? "NODE SELECTED" : "DRAG, WHEEL, OR TAP NODES";
  ctx.fillText(interactionLabel, panel.x + panel.w / 2, panel.y + panel.h - 26);
  ctx.restore();
  drawPanelCloseButton(r.closeRect);
}
