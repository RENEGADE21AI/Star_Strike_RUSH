const ROAD_GLORY_START_Y = 44;
const ROAD_GLORY_GAP = 80;
const ROAD_SEASON_START_Y = 62;
const ROAD_SEASON_GAP = 62;
const ROAD_SEASON_TIERS = 50;

const SEASON_REWARDS = buildSeasonRewardTable();

function seasonReward(id, type, amount, name, detail) {
  return { id, type, amount, name, detail };
}

function buildSeasonRewardTable() {
  const rows = [];
  for (let tier = 1; tier <= ROAD_SEASON_TIERS; tier++) {
    const pad = String(tier).padStart(2, "0");
    const milestone = tier % 5 === 0;
    const flightAmount = milestone ? 180 + tier * 18 : 45 + tier * 7;
    const supplyAmount = milestone ? 320 + tier * 22 : 90 + tier * 10;
    const flight = milestone
      ? seasonReward(`s01_flight_${pad}`, "glory_cache", flightAmount, `${flightAmount} Glory Cache`, "Adds lifetime Glory progress for the permanent Glory Road.")
      : seasonReward(`s01_flight_${pad}`, "season_xp_cache", flightAmount, `${flightAmount} Season XP`, "Adds progress toward the next Season Road tier.");
    const supply = seasonReward(`s01_supply_${pad}`, "credits", supplyAmount, `${supplyAmount} Credits`, "Adds Credits to the pilot account balance.");
    rows.push({ tier, flight, supply });
  }
  return rows;
}

function formatRoadNumber(value) {
  const n = Math.max(0, Math.floor(Number(value) || 0));
  if (n >= 1000000) return `${(n / 1000000).toFixed(1).replace(".0", "")}M`;
  if (n >= 10000) return `${Math.round(n / 1000)}K`;
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(".0", "")}K`;
  return String(n);
}

function makeGloryRoadNodes() {
  const nodes = [];
  for (let i = 0; i < GLORY_RANKS.length; i++) {
    const rank = GLORY_RANKS[i];
    nodes.push({
      id: `glory_rank_${i}`,
      type: "rank",
      tab: "glory",
      label: String(rank.name || "Rank").toUpperCase(),
      sub: `${formatRoadNumber(rank.threshold)} GLORY`,
      threshold: rank.threshold,
      major: i === 0 || i === GLORY_RANKS.length - 1 || i % 2 === 0,
      detail: `Lifetime identity rank at ${Number(rank.threshold).toLocaleString()} Glory.`,
      reward: i === 0 ? "Starter pilot identity" : `${rank.name} profile rank`
    });
    const next = GLORY_RANKS[i + 1];
    if (next) {
      const midway = Math.floor(rank.threshold + (next.threshold - rank.threshold) * 0.5);
      nodes.push({
        id: `glory_checkpoint_${i}`,
        type: "checkpoint",
        tab: "glory",
        label: `${formatRoadNumber(midway)} GLORY`,
        sub: "ROUTE CHECKPOINT",
        threshold: midway,
        major: false,
        detail: `Checkpoint between ${rank.name} and ${next.name}.`,
        reward: "Progress marker"
      });
    }
  }
  return nodes;
}

function getProgressRoadContentHeight() {
  if (titleProgressTab === "season") return 86 + ROAD_SEASON_TIERS * ROAD_SEASON_GAP;
  const gloryStepCount = Math.max(1, GLORY_RANKS.length * 2 - 1);
  return 72 + gloryStepCount * ROAD_GLORY_GAP;
}

function currentRoadIndexForThresholds(nodes, total) {
  let index = 0;
  for (let i = 0; i < nodes.length; i++) {
    if (total >= nodes[i].threshold) index = i;
  }
  return index;
}

function getSeasonRewardForTier(tier) {
  return SEASON_REWARDS[Math.max(1, Math.min(ROAD_SEASON_TIERS, tier)) - 1];
}

function findSeasonRewardById(rewardId) {
  const id = String(rewardId || "");
  for (const row of SEASON_REWARDS) {
    if (row.flight && row.flight.id === id) return { tier: row.tier, lane: "flight", reward: row.flight };
    if (row.supply && row.supply.id === id) return { tier: row.tier, lane: "supply", reward: row.supply };
  }
  return null;
}

function rewardLabel(reward) {
  if (!reward) return "Reward";
  if (reward.type === "credits") return `${Number(reward.amount || 0).toLocaleString()} CREDITS`;
  if (reward.type === "glory_cache") return `${formatRoadNumber(reward.amount || 0)} GLORY`;
  if (reward.type === "season_xp_cache") return `${formatRoadNumber(reward.amount || 0)} SEASON XP`;
  return reward.name || "Reward";
}

function rewardTypeLabel(reward) {
  if (!reward) return "REWARD";
  return String(reward.type || "reward").replace(/_/g, " ").toUpperCase();
}

function seasonRewardStatus(reward, tier, meta) {
  const claimed = new Set(Array.isArray(meta.seasonClaimedRewardIds) ? meta.seasonClaimedRewardIds : []);
  if (reward && claimed.has(reward.id)) return "CLAIMED";
  return tier <= Math.max(1, Math.floor(meta.seasonTier || 1)) ? "UNCLAIMED" : "LOCKED";
}

function applySeasonReward(progress, reward) {
  const amount = Math.max(0, Math.floor((reward && reward.amount) || 0));
  const type = reward ? reward.type : "";
  if (type === "credits") {
    progress.credits += amount;
  } else if (type === "glory_cache") {
    progress.totalGlory += amount;
  } else if (type === "season_xp_cache") {
    progress.currentSeason.xp += amount;
    progress.currentSeason.tier = currentSeasonTierForXP(progress.currentSeason.xp);
  }
  return { type, amount, name: reward ? reward.name : "Reward" };
}

function claimSeasonReward(rewardId) {
  const found = findSeasonRewardById(rewardId);
  if (!found) {
    return { ok: false, reason: "unknown_reward", status: "UNKNOWN", rewardId: String(rewardId || "") };
  }
  const progress = getMetaProgress();
  const claimed = Array.isArray(progress.currentSeason.claimedRewardIds)
    ? progress.currentSeason.claimedRewardIds
    : [];
  if (claimed.includes(found.reward.id)) {
    return { ok: false, reason: "already_claimed", status: "CLAIMED", rewardId: found.reward.id, tier: found.tier, lane: found.lane };
  }
  progress.currentSeason.tier = currentSeasonTierForXP(progress.currentSeason.xp);
  if (found.tier > progress.currentSeason.tier) {
    return { ok: false, reason: "locked", status: "LOCKED", rewardId: found.reward.id, tier: found.tier, lane: found.lane };
  }
  const before = currentMetaSnapshot();
  const applied = applySeasonReward(progress, found.reward);
  progress.currentSeason.claimedRewardIds = Array.from(new Set([...claimed, found.reward.id])).slice(-220);
  progress.currentSeason.tier = currentSeasonTierForXP(progress.currentSeason.xp);
  progress.lastUpdatedAtMs = Date.now();
  saveMetaProgress();
  return {
    ok: true,
    reason: "claimed",
    status: "CLAIMED",
    rewardId: found.reward.id,
    tier: found.tier,
    lane: found.lane,
    applied,
    before,
    snapshot: currentMetaSnapshot()
  };
}

function gloryNodeDetail(node, meta) {
  const total = Math.max(0, Math.floor(meta.totalGlory || 0));
  const reached = total >= node.threshold;
  return {
    id: node.id,
    tab: "glory",
    title: node.label,
    subtitle: node.type === "rank" ? "GLORY RANK" : "GLORY CHECKPOINT",
    status: reached ? "REACHED" : "LOCKED",
    requirement: `${Number(node.threshold).toLocaleString()} lifetime Glory`,
    reward: node.reward,
    detail: node.detail,
    progress: `${Number(total).toLocaleString()} / ${Number(node.threshold).toLocaleString()} Glory`
  };
}

function seasonRewardDetail(tier, lane, reward, meta) {
  const status = seasonRewardStatus(reward, tier, meta);
  return {
    id: reward.id,
    tab: "season",
    tier,
    lane,
    title: rewardLabel(reward),
    subtitle: `${lane.toUpperCase()} LANE - TIER ${tier}`,
    status,
    requirement: `Reach Season Tier ${tier}`,
    reward: rewardTypeLabel(reward),
    detail: reward.detail || "Season reward.",
    progress: `Current Tier ${Math.max(1, Math.floor(meta.seasonTier || 1))}`
  };
}

function getProgressDetailById(id) {
  const meta = typeof currentMetaSnapshot === "function" ? currentMetaSnapshot() : null;
  if (!meta) return null;
  const foundReward = findSeasonRewardById(id);
  if (foundReward) return seasonRewardDetail(foundReward.tier, foundReward.lane, foundReward.reward, meta);
  const tierMatch = /^season_tier_(\d+)$/.exec(String(id || ""));
  if (tierMatch) return seasonTierDetail(Number(tierMatch[1]), meta);
  const glory = makeGloryRoadNodes().find((node) => node.id === id);
  return glory ? gloryNodeDetail(glory, meta) : null;
}

function seasonTierDetail(tier, meta) {
  const row = getSeasonRewardForTier(tier);
  return {
    id: `season_tier_${tier}`,
    tab: "season",
    tier,
    lane: "tier",
    title: `TIER ${tier}`,
    subtitle: tier % 5 === 0 ? "SEASON MILESTONE" : "SEASON STEP",
    status: tier <= Math.max(1, Math.floor(meta.seasonTier || 1)) ? "REACHED" : "LOCKED",
    requirement: `${Number((tier - 1) * SEASON_TIER_XP).toLocaleString()} Season XP`,
    reward: `Flight: ${rewardLabel(row.flight)} | Supply: ${rewardLabel(row.supply)}`,
    detail: "Tap either side reward to inspect exact claim state.",
    progress: `${Number(meta.seasonXP || 0).toLocaleString()} Season XP`
  };
}

function buildGloryRoadLayout(rect, meta) {
  const nodes = makeGloryRoadNodes();
  const total = Math.max(0, Math.floor(meta.totalGlory || 0));
  const activeIndex = currentRoadIndexForThresholds(nodes, total);
  const roadX = Math.round(rect.x + rect.w / 2);
  return nodes.map((node, index) => {
    const y = rect.y + ROAD_GLORY_START_Y + index * ROAD_GLORY_GAP;
    const side = index % 2 === 0 ? -1 : 1;
    const cardW = node.major ? 116 : 96;
    const cardH = node.major ? 52 : 40;
    const cardX = side < 0 ? roadX - 24 - cardW : roadX + 24;
    const cardY = y - cardH / 2;
    return {
      node,
      index,
      roadX,
      dotX: roadX,
      dotY: y,
      radius: node.major ? 12 : 8,
      side,
      active: index === activeIndex,
      reached: total >= node.threshold,
      cardRect: { x: cardX, y: cardY, w: cardW, h: cardH },
      detail: gloryNodeDetail(node, meta)
    };
  });
}

function buildSeasonRoadLayout(rect, meta) {
  const tier = Math.max(1, Math.floor(meta.seasonTier || 1));
  const roadX = Math.round(rect.x + rect.w / 2);
  const leftW = Math.min(106, Math.floor((rect.w - 64) / 2));
  const rightW = leftW;
  const leftX = rect.x + 8;
  const rightX = rect.x + rect.w - rightW - 8;
  const rows = [];
  for (let i = 1; i <= ROAD_SEASON_TIERS; i++) {
    const reward = getSeasonRewardForTier(i);
    const y = rect.y + ROAD_SEASON_START_Y + (ROAD_SEASON_TIERS - i) * ROAD_SEASON_GAP;
    rows.push({
      tier: i,
      reward,
      roadX,
      dotX: roadX,
      dotY: y,
      radius: i % 5 === 0 ? 11 : 8,
      reached: i <= tier,
      active: i === tier,
      milestone: i % 5 === 0,
      flightRect: { x: leftX, y: y - 19, w: leftW, h: 38 },
      supplyRect: { x: rightX, y: y - 19, w: rightW, h: 38 },
      flightDetail: seasonRewardDetail(i, "flight", reward.flight, meta),
      supplyDetail: seasonRewardDetail(i, "supply", reward.supply, meta),
      tierDetail: seasonTierDetail(i, meta)
    });
  }
  return rows;
}

function focusTitleProgressOnCurrent() {
  const meta = typeof currentMetaSnapshot === "function" ? currentMetaSnapshot() : null;
  if (!meta) {
    titleProgressScroll = 0;
    return;
  }
  const r = getProgressRects();
  let targetY;
  if (titleProgressTab === "season") {
    const tier = clamp(Math.max(1, Math.floor(meta.seasonTier || 1)), 1, ROAD_SEASON_TIERS);
    targetY = r.contentRect.y + ROAD_SEASON_START_Y + (ROAD_SEASON_TIERS - tier) * ROAD_SEASON_GAP;
  } else {
    const nodes = makeGloryRoadNodes();
    const index = currentRoadIndexForThresholds(nodes, Math.max(0, Math.floor(meta.totalGlory || 0)));
    targetY = r.contentRect.y + ROAD_GLORY_START_Y + index * ROAD_GLORY_GAP;
  }
  const focusAnchor = titleProgressTab === "season"
    ? r.contentRect.y + r.contentRect.h * 0.64
    : r.contentRect.y + Math.min(118, r.contentRect.h * 0.38);
  titleProgressScroll = targetY - focusAnchor;
  clampTitleProgressScroll();
}

function getProgressNodeAt(x, y) {
  const meta = typeof currentMetaSnapshot === "function" ? currentMetaSnapshot() : null;
  if (!meta) return null;
  const r = getProgressRects();
  if (titleProgressTab === "season") {
    for (const item of buildSeasonRoadLayout(r.contentRect, meta)) {
      const flightRect = { ...item.flightRect, y: item.flightRect.y - titleProgressScroll };
      const supplyRect = { ...item.supplyRect, y: item.supplyRect.y - titleProgressScroll };
      const dotY = item.dotY - titleProgressScroll;
      if (hitRect(flightRect, x, y)) return item.flightDetail;
      if (hitRect(supplyRect, x, y)) return item.supplyDetail;
      if (Math.hypot(x - item.dotX, y - dotY) <= item.radius + 8) return item.tierDetail;
    }
    return null;
  }
  for (const item of buildGloryRoadLayout(r.contentRect, meta)) {
    const cardRect = { ...item.cardRect, y: item.cardRect.y - titleProgressScroll };
    const dotY = item.dotY - titleProgressScroll;
    if (hitRect(cardRect, x, y)) return item.detail;
    if (Math.hypot(x - item.dotX, y - dotY) <= item.radius + 8) return item.detail;
  }
  return null;
}

function drawProgressSummary(panel, meta) {
  const x = panel.x + 20;
  const y = panel.y + 112;
  const w = panel.w - 40;
  const isSeason = titleProgressTab === "season";
  ctx.save();
  ctx.fillStyle = "rgba(8,10,22,0.92)";
  ctx.fillRect(x, y, w, 38);
  ctx.fillStyle = isSeason ? "rgba(35,255,170,0.09)" : "rgba(255,230,128,0.10)";
  ctx.fillRect(x, y, w, 38);
  ctx.strokeStyle = isSeason ? "rgba(120,255,180,0.28)" : "rgba(255,230,128,0.30)";
  ctx.strokeRect(x, y, w, 38);
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  if (isSeason) {
    const tierXP = Math.max(0, Math.floor(meta.seasonXP || 0));
    const tier = Math.max(1, Math.floor(meta.seasonTier || 1));
    const tierBase = (tier - 1) * SEASON_TIER_XP;
    const inTier = clamp(tierXP - tierBase, 0, SEASON_TIER_XP);
    ctx.font = FONT_SMALL;
    ctx.fillStyle = "#78ffb4";
    ctx.fillText(`${String(meta.seasonName || CURRENT_SEASON_NAME).toUpperCase()}  TIER ${tier}`, x + 9, y + 6);
    ctx.font = FONT_TINY;
    ctx.fillStyle = "rgba(255,255,255,0.68)";
    ctx.fillText(`${Number(tierXP).toLocaleString()} XP  |  ${Number(SEASON_TIER_XP - inTier).toLocaleString()} TO NEXT`, x + 9, y + 22);
    drawMetaBar(x + w - 96, y + 15, 82, inTier / SEASON_TIER_XP, "rgba(120,255,180,0.72)");
  } else {
    const next = meta.nextGloryRank ? `NEXT ${formatRoadNumber(meta.nextGloryThreshold)} ${String(meta.nextGloryRank).toUpperCase()}` : "MAX RANK";
    ctx.font = FONT_SMALL;
    ctx.fillStyle = "#ffe680";
    ctx.fillText(String(meta.gloryRank || "Rookie Pilot").toUpperCase(), x + 9, y + 6);
    ctx.font = FONT_TINY;
    ctx.fillStyle = "rgba(255,255,255,0.68)";
    ctx.fillText(`${Number(meta.totalGlory || 0).toLocaleString()} GLORY  |  ${next}`.slice(0, 42), x + 9, y + 22);
    drawMetaBar(x + w - 96, y + 15, 82, meta.rankProgress || 0, "rgba(255,230,128,0.72)");
  }
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
  ctx.fillStyle = reached ? "#fff" : "rgba(255,255,255,0.48)";
  ctx.fillText(String(node.label).slice(0, node.major ? 17 : 15), x + 8, y + 7);
  ctx.font = FONT_TINY;
  ctx.fillStyle = active ? color.textActive : reached ? "rgba(255,255,255,0.72)" : "rgba(255,255,255,0.34)";
  ctx.fillText(String(node.sub).slice(0, 18), x + 8, y + h - 16);
  ctx.restore();
}

function drawProgressRailDot(x, y, radius, reached, active, color) {
  const pulse = active ? 0.5 + Math.sin(state.frame * 0.13) * 0.5 : 0;
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
  const bob = Math.sin(state.frame * 0.16) * 1.8;
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
  const startY = rect.y + ROAD_GLORY_START_Y;
  const endY = layout.length ? layout[layout.length - 1].dotY : startY;
  const color = {
    fillActive: "rgba(255,230,128,0.18)",
    fillReached: "rgba(120,255,180,0.09)",
    strokeActive: "rgba(255,230,128,0.70)",
    strokeReached: "rgba(120,255,180,0.32)",
    textActive: "#ffe680",
    dotActive: "#ffe680",
    dotReached: "#78ffb4",
    glow: "rgba(255,230,128,0.22)",
    glowSoft: "rgba(120,255,180,0.11)",
    ship: "#ffe680",
    shadow: "rgba(255,230,128,0.85)",
    flame: "rgba(120,255,180,0.78)"
  };
  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.10)";
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(roadX, startY - 34);
  ctx.lineTo(roadX, endY + 34);
  ctx.stroke();
  const active = layout.find((item) => item.active) || layout[0];
  ctx.strokeStyle = "rgba(255,230,128,0.24)";
  ctx.lineWidth = 2;
  ctx.setLineDash([10, 8]);
  ctx.beginPath();
  ctx.moveTo(roadX, startY - 34);
  ctx.lineTo(roadX, active ? active.dotY : startY);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.font = FONT_TINY;
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.fillText("GLORY ROAD", roadX, rect.y + 8);
  for (const item of layout) {
    const node = item.node;
    const card = item.cardRect;
    ctx.strokeStyle = item.active ? "rgba(255,230,128,0.48)" : item.reached ? "rgba(120,255,180,0.24)" : "rgba(255,255,255,0.10)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(item.roadX, item.dotY);
    ctx.lineTo(item.side < 0 ? card.x + card.w : card.x, item.dotY);
    ctx.stroke();
    drawProgressRailDot(item.dotX, item.dotY, item.radius, item.reached, item.active, color);
    drawRoadNodeCard(card.x, card.y, card.w, card.h, node, item.reached, item.active, color);
  }
  if (active) drawRoadShipMarker(active.dotX, active.dotY, color);
  ctx.restore();
}

function drawSeasonRewardCard(x, y, w, h, detail, active, lane) {
  const status = detail.status;
  const reached = status !== "LOCKED";
  const claimed = status === "CLAIMED";
  const isSupply = lane === "supply";
  const activeFill = isSupply ? "rgba(255,230,128,0.14)" : "rgba(120,255,180,0.15)";
  const reachedFill = isSupply ? "rgba(255,230,128,0.07)" : "rgba(120,210,255,0.08)";
  ctx.save();
  ctx.fillStyle = active ? activeFill : reached ? reachedFill : "rgba(255,255,255,0.045)";
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = active ? (isSupply ? "rgba(255,230,128,0.56)" : "rgba(120,255,180,0.60)") : claimed ? "rgba(120,255,180,0.32)" : "rgba(255,255,255,0.12)";
  ctx.strokeRect(x, y, w, h);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = FONT_TINY;
  ctx.fillStyle = active ? "#fff" : reached ? "rgba(255,255,255,0.72)" : "rgba(255,255,255,0.38)";
  ctx.fillText(String(detail.title).slice(0, 14), x + w / 2, y + h / 2 - 3);
  ctx.font = "700 8px 'Arial Narrow', Arial, sans-serif";
  ctx.fillStyle = claimed ? "#78ffb4" : status === "UNCLAIMED" ? "#ffe680" : "rgba(255,255,255,0.28)";
  ctx.fillText(status, x + w / 2, y + h / 2 + 10);
  ctx.restore();
}

function drawSeasonRoadContent(rect, meta) {
  const layout = buildSeasonRoadLayout(rect, meta);
  const roadX = Math.round(rect.x + rect.w / 2);
  const topY = layout.length ? Math.min(...layout.map((item) => item.dotY)) : rect.y + ROAD_SEASON_START_Y;
  const bottomY = layout.length ? Math.max(...layout.map((item) => item.dotY)) : topY;
  const leftX = rect.x + 8;
  const leftW = Math.min(106, Math.floor((rect.w - 64) / 2));
  const rightW = leftW;
  const rightX = rect.x + rect.w - rightW - 8;
  const color = {
    dotActive: "#78ffb4",
    dotReached: "#78d2ff",
    strokeActive: "rgba(120,255,180,0.70)",
    strokeReached: "rgba(120,210,255,0.35)",
    glow: "rgba(120,255,180,0.22)",
    glowSoft: "rgba(120,210,255,0.11)",
    ship: "#78ffb4",
    shadow: "rgba(120,255,180,0.85)",
    flame: "rgba(255,230,128,0.76)"
  };
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.font = FONT_TINY;
  ctx.fillStyle = "rgba(255,255,255,0.48)";
  ctx.fillText("FLIGHT", leftX + leftW / 2, rect.y + 12);
  ctx.fillText("SUPPLY", rightX + rightW / 2, rect.y + 12);
  ctx.fillStyle = "rgba(120,255,180,0.58)";
  ctx.fillText("TIER", roadX, rect.y + 12);
  ctx.strokeStyle = "rgba(255,255,255,0.10)";
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(roadX, topY - 34);
  ctx.lineTo(roadX, bottomY + 34);
  ctx.stroke();
  const active = layout.find((item) => item.active) || layout[0];
  ctx.strokeStyle = "rgba(120,255,180,0.24)";
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 9]);
  ctx.beginPath();
  ctx.moveTo(roadX, bottomY + 34);
  ctx.lineTo(roadX, active ? active.dotY : bottomY);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = "rgba(120,255,180,0.55)";
  ctx.beginPath();
  ctx.moveTo(roadX, topY - 46);
  ctx.lineTo(roadX - 6, topY - 32);
  ctx.lineTo(roadX + 6, topY - 32);
  ctx.closePath();
  ctx.fill();
  for (const item of layout) {
    ctx.strokeStyle = item.active ? "rgba(120,255,180,0.48)" : item.reached ? "rgba(120,210,255,0.22)" : "rgba(255,255,255,0.10)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(item.flightRect.x + item.flightRect.w, item.dotY);
    ctx.lineTo(item.supplyRect.x, item.dotY);
    ctx.stroke();
    drawProgressRailDot(item.dotX, item.dotY, item.radius, item.reached, item.active, color);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = item.milestone ? FONT_SMALL : FONT_TINY;
    ctx.fillStyle = item.active ? "#102018" : item.reached ? "#051116" : "rgba(255,255,255,0.42)";
    ctx.fillText(String(item.tier), item.dotX, item.dotY + 1);
    drawSeasonRewardCard(item.flightRect.x, item.flightRect.y, item.flightRect.w, item.flightRect.h, item.flightDetail, item.active, "flight");
    drawSeasonRewardCard(item.supplyRect.x, item.supplyRect.y, item.supplyRect.w, item.supplyRect.h, item.supplyDetail, item.active && item.milestone, "supply");
  }
  if (active) drawRoadShipMarker(active.dotX, active.dotY, color);
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
  ctx.fillStyle = titleProgressTab === "season" ? "rgba(120,255,180,0.62)" : "rgba(255,230,128,0.62)";
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

function progressDetailCanClaim(detail) {
  return !!(detail && detail.tab === "season" && detail.status === "UNCLAIMED" && findSeasonRewardById(detail.id));
}

function getProgressClaimRect() {
  const rect = getProgressDetailRect();
  return { x: rect.x + rect.w - 100, y: rect.y + rect.h - 34, w: 88, h: 24 };
}

function drawProgressClaimButton(detail) {
  if (!detail || detail.tab !== "season" || !findSeasonRewardById(detail.id)) return;
  const claimable = progressDetailCanClaim(detail);
  const rect = getProgressClaimRect();
  const pulse = claimable ? 0.5 + Math.sin(state.frame * 0.16) * 0.5 : 0;
  ctx.save();
  if (titleProgressClaimPulse > 0 && detail.status === "CLAIMED") {
    ctx.shadowColor = "rgba(120,255,180,0.85)";
    ctx.shadowBlur = 8 + titleProgressClaimPulse * 0.35;
  }
  ctx.fillStyle = claimable
    ? `rgba(120,255,180,${0.18 + pulse * 0.08})`
    : detail.status === "CLAIMED"
      ? "rgba(120,255,180,0.10)"
      : "rgba(255,255,255,0.06)";
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.strokeStyle = claimable
    ? "rgba(120,255,180,0.72)"
    : detail.status === "CLAIMED"
      ? "rgba(120,255,180,0.38)"
      : "rgba(255,255,255,0.18)";
  ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
  ctx.fillStyle = claimable ? "#fff" : detail.status === "CLAIMED" ? "#78ffb4" : "rgba(255,255,255,0.42)";
  ctx.font = FONT_TINY;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(claimable ? "CLAIM" : detail.status, rect.x + rect.w / 2, rect.y + rect.h / 2 + 1);
  ctx.restore();
}

function drawProgressDetailPanel() {
  const detail = titleProgressSelectedNode;
  if (!detail || detail.tab !== titleProgressTab) return;
  const rect = getProgressDetailRect();
  const season = detail.tab === "season";
  ctx.save();
  ctx.fillStyle = "rgba(6,8,18,0.96)";
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.strokeStyle = season ? "rgba(120,255,180,0.55)" : "rgba(255,230,128,0.55)";
  ctx.lineWidth = 2;
  ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.font = FONT_TINY;
  ctx.fillStyle = season ? "#78ffb4" : "#ffe680";
  ctx.fillText(detail.subtitle.slice(0, 30), rect.x + 10, rect.y + 8);
  ctx.textAlign = "right";
  ctx.fillText(detail.status, rect.x + rect.w - 10, rect.y + 8);
  ctx.textAlign = "left";
  ctx.font = FONT_SMALL;
  ctx.fillStyle = "#fff";
  ctx.fillText(detail.title.slice(0, 28), rect.x + 10, rect.y + 25);
  ctx.font = FONT_TINY;
  ctx.fillStyle = "rgba(255,255,255,0.72)";
  ctx.fillText(detail.requirement.slice(0, 38), rect.x + 10, rect.y + 45);
  ctx.fillText(detail.reward.slice(0, 44), rect.x + 10, rect.y + 59);
  ctx.fillStyle = "rgba(255,255,255,0.50)";
  ctx.fillText(detail.progress.slice(0, 38), rect.x + 10, rect.y + 73);
  ctx.fillStyle = "rgba(255,255,255,0.40)";
  ctx.fillText(String(detail.detail || "").slice(0, 34), rect.x + 10, rect.y + 88);
  drawProgressClaimButton(detail);
  ctx.restore();
}

function drawProgressPanel() {
  const r = getProgressRects();
  const panel = r.panel;
  const meta = typeof currentMetaSnapshot === "function" ? currentMetaSnapshot() : null;
  drawTitlePanelFrame(panel, "PROGRESS ROAD");
  drawPanelCloseButton(r.closeRect);
  drawOnlineActionButton(r.gloryTab, "GLORY ROAD", titleProgressTab === "glory");
  drawOnlineActionButton(r.seasonTab, "SEASON ROAD", titleProgressTab === "season");

  ctx.save();
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  if (!meta) {
    ctx.fillStyle = "rgba(255,255,255,0.62)";
    ctx.font = FONT_SMALL;
    ctx.fillText("Progress is still loading.", panel.x + 20, panel.y + 102);
    ctx.restore();
    return;
  }

  clampTitleProgressScroll();
  drawProgressSummary(panel, meta);
  ctx.fillStyle = "rgba(7,9,20,0.90)";
  ctx.fillRect(r.contentRect.x, r.contentRect.y, r.contentRect.w, r.contentRect.h);
  ctx.strokeStyle = "rgba(255,255,255,0.14)";
  ctx.strokeRect(r.contentRect.x, r.contentRect.y, r.contentRect.w, r.contentRect.h);

  ctx.save();
  ctx.beginPath();
  ctx.rect(r.contentRect.x, r.contentRect.y, r.contentRect.w, r.contentRect.h);
  ctx.clip();
  ctx.translate(0, -titleProgressScroll);
  if (titleProgressTab === "season") drawSeasonRoadContent(r.contentRect, meta);
  else drawGloryRoadContent(r.contentRect, meta);
  ctx.restore();

  drawProgressViewportFade(r.contentRect);
  drawProgressScrollBar(r.contentRect, getProgressContentHeight());
  drawProgressDetailPanel();
  const maxScroll = getProgressMaxScroll();
  const atEnd = maxScroll > 0 && titleProgressScroll >= maxScroll - 2;
  ctx.font = FONT_TINY;
  ctx.fillStyle = "rgba(255,255,255,0.50)";
  ctx.textAlign = "center";
  ctx.fillText(atEnd ? "END OF ROAD" : titleProgressDragActive ? "DRAGGING ROAD" : titleProgressSelectedNode ? "NODE SELECTED" : "DRAG, WHEEL, OR TAP NODES", panel.x + panel.w / 2, panel.y + panel.h - 26);
  ctx.restore();
}
