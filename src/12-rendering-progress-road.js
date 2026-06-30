const ROAD_GLORY_START_Y = 44;
const ROAD_GLORY_GAP = 80;
const ROAD_SEASON_START_Y = 62;
const ROAD_SEASON_GAP = 62;
const ROAD_SEASON_TIERS = 50;

const SEASON_REWARDS = [
  { tier: 1, free: { id: "s01_free_01", type: "badge", name: "Launch Wings Badge", detail: "Starter badge for joining Launch Flight." }, cosmetic: { id: "s01_cos_01", type: "trail", name: "Blue Vector Trail", detail: "Cosmetic trail tint for the pilot card." } },
  { tier: 2, free: { id: "s01_free_02", type: "credits", amount: 120, name: "120 Credits", detail: "Credits for future cosmetic unlocks." }, cosmetic: { id: "s01_cos_02", type: "banner", name: "Runway Banner", detail: "Launch-themed player-card banner." } },
  { tier: 3, free: { id: "s01_free_03", type: "title", name: "Launch Pilot", detail: "Profile title for early season progress." }, cosmetic: { id: "s01_cos_03", type: "trim", name: "Cyan Badge Trim", detail: "Badge border treatment." } },
  { tier: 4, free: { id: "s01_free_04", type: "credits", amount: 140, name: "140 Credits", detail: "Credits for future cosmetic unlocks." }, cosmetic: { id: "s01_cos_04", type: "decal", name: "Vector Wing Decal", detail: "Ship decal concept reward." } },
  { tier: 5, free: { id: "s01_free_05", type: "glory_cache", amount: 250, name: "250 Glory Cache", detail: "Lifetime identity boost." }, cosmetic: { id: "s01_cos_05", type: "skin", name: "Runway Hull", detail: "Bronze-green ship skin marker." } },
  { tier: 6, free: { id: "s01_free_06", type: "credits", amount: 160, name: "160 Credits", detail: "Credits for future cosmetic unlocks." }, cosmetic: { id: "s01_cos_06", type: "trail", name: "Green Ion Trail", detail: "Cosmetic trail tint." } },
  { tier: 7, free: { id: "s01_free_07", type: "banner", name: "First Orbit Banner", detail: "Player-card background banner." }, cosmetic: { id: "s01_cos_07", type: "frame", name: "Launch Frame", detail: "Player-card frame treatment." } },
  { tier: 8, free: { id: "s01_free_08", type: "credits", amount: 180, name: "180 Credits", detail: "Credits for future cosmetic unlocks." }, cosmetic: { id: "s01_cos_08", type: "decal", name: "Star Chevron Decal", detail: "Ship decal concept reward." } },
  { tier: 9, free: { id: "s01_free_09", type: "badge", name: "Orbit Badge", detail: "Season badge for early road progress." }, cosmetic: { id: "s01_cos_09", type: "glow", name: "Cyan Core Glow", detail: "Profile glow color." } },
  { tier: 10, free: { id: "s01_free_10", type: "trail", name: "Comet Trail", detail: "Free milestone trail marker." }, cosmetic: { id: "s01_cos_10", type: "skin", name: "Gold Comet Hull", detail: "Milestone ship skin marker." } },
  { tier: 11, free: { id: "s01_free_11", type: "credits", amount: 220, name: "220 Credits", detail: "Credits for future cosmetic unlocks." }, cosmetic: { id: "s01_cos_11", type: "banner", name: "Comet Banner", detail: "Player-card banner." } },
  { tier: 12, free: { id: "s01_free_12", type: "title", name: "Comet Chaser", detail: "Profile title." }, cosmetic: { id: "s01_cos_12", type: "trail", name: "Amber Ion Trail", detail: "Cosmetic trail tint." } },
  { tier: 13, free: { id: "s01_free_13", type: "credits", amount: 240, name: "240 Credits", detail: "Credits for future cosmetic unlocks." }, cosmetic: { id: "s01_cos_13", type: "trim", name: "Amber Badge Trim", detail: "Badge border treatment." } },
  { tier: 14, free: { id: "s01_free_14", type: "player_card", name: "Flight Card Back", detail: "Player-card backing plate." }, cosmetic: { id: "s01_cos_14", type: "frame", name: "Orbit Frame", detail: "Profile frame treatment." } },
  { tier: 15, free: { id: "s01_free_15", type: "skin", name: "Scout Hull", detail: "Free milestone ship skin marker." }, cosmetic: { id: "s01_cos_15", type: "trail", name: "Animated Ion Trail", detail: "Animated trail marker." } },
  { tier: 16, free: { id: "s01_free_16", type: "credits", amount: 260, name: "260 Credits", detail: "Credits for future cosmetic unlocks." }, cosmetic: { id: "s01_cos_16", type: "banner", name: "Scout Banner", detail: "Player-card banner." } },
  { tier: 17, free: { id: "s01_free_17", type: "badge", name: "Pressure Badge", detail: "Season badge for pressure mastery." }, cosmetic: { id: "s01_cos_17", type: "frame", name: "Pressure Frame", detail: "Player-card frame treatment." } },
  { tier: 18, free: { id: "s01_free_18", type: "credits", amount: 280, name: "280 Credits", detail: "Credits for future cosmetic unlocks." }, cosmetic: { id: "s01_cos_18", type: "decal", name: "Split Arrow Decal", detail: "Ship decal concept reward." } },
  { tier: 19, free: { id: "s01_free_19", type: "trail", name: "Green Spark Trail", detail: "Free trail tint." }, cosmetic: { id: "s01_cos_19", type: "glow", name: "Green Core Glow", detail: "Profile glow color." } },
  { tier: 20, free: { id: "s01_free_20", type: "banner", name: "Boss Breaker Banner", detail: "Milestone banner for boss progress." }, cosmetic: { id: "s01_cos_20", type: "skin", name: "Breaker Hull", detail: "Milestone ship skin marker." } },
  { tier: 21, free: { id: "s01_free_21", type: "credits", amount: 320, name: "320 Credits", detail: "Credits for future cosmetic unlocks." }, cosmetic: { id: "s01_cos_21", type: "trim", name: "Breaker Badge Trim", detail: "Badge border treatment." } },
  { tier: 22, free: { id: "s01_free_22", type: "title", name: "Gate Runner", detail: "Profile title." }, cosmetic: { id: "s01_cos_22", type: "banner", name: "Gate Banner", detail: "Player-card banner." } },
  { tier: 23, free: { id: "s01_free_23", type: "credits", amount: 340, name: "340 Credits", detail: "Credits for future cosmetic unlocks." }, cosmetic: { id: "s01_cos_23", type: "trail", name: "Gate Spark Trail", detail: "Cosmetic trail tint." } },
  { tier: 24, free: { id: "s01_free_24", type: "badge", name: "Gate Badge", detail: "Season badge." }, cosmetic: { id: "s01_cos_24", type: "frame", name: "Gate Frame", detail: "Player-card frame treatment." } },
  { tier: 25, free: { id: "s01_free_25", type: "skin", name: "Midseason Hull", detail: "Midseason ship skin marker." }, cosmetic: { id: "s01_cos_25", type: "skin", name: "Animated Midseason Hull", detail: "Animated ship skin marker." } },
  { tier: 26, free: { id: "s01_free_26", type: "credits", amount: 380, name: "380 Credits", detail: "Credits for future cosmetic unlocks." }, cosmetic: { id: "s01_cos_26", type: "decal", name: "Warden Decal", detail: "Ship decal concept reward." } },
  { tier: 27, free: { id: "s01_free_27", type: "title", name: "Warden Dodger", detail: "Profile title." }, cosmetic: { id: "s01_cos_27", type: "banner", name: "Debris Banner", detail: "Player-card banner." } },
  { tier: 28, free: { id: "s01_free_28", type: "credits", amount: 400, name: "400 Credits", detail: "Credits for future cosmetic unlocks." }, cosmetic: { id: "s01_cos_28", type: "trail", name: "Debris Trail", detail: "Cosmetic trail tint." } },
  { tier: 29, free: { id: "s01_free_29", type: "badge", name: "Debris Badge", detail: "Season badge." }, cosmetic: { id: "s01_cos_29", type: "glow", name: "Bronze Core Glow", detail: "Profile glow color." } },
  { tier: 30, free: { id: "s01_free_30", type: "glory_cache", amount: 750, name: "750 Glory Cache", detail: "Lifetime identity boost." }, cosmetic: { id: "s01_cos_30", type: "skin", name: "Bronze Warden Hull", detail: "Milestone ship skin marker." } },
  { tier: 31, free: { id: "s01_free_31", type: "credits", amount: 440, name: "440 Credits", detail: "Credits for future cosmetic unlocks." }, cosmetic: { id: "s01_cos_31", type: "trim", name: "Warden Badge Trim", detail: "Badge border treatment." } },
  { tier: 32, free: { id: "s01_free_32", type: "title", name: "Ion Surfer", detail: "Profile title." }, cosmetic: { id: "s01_cos_32", type: "banner", name: "Ion Banner", detail: "Player-card banner." } },
  { tier: 33, free: { id: "s01_free_33", type: "credits", amount: 460, name: "460 Credits", detail: "Credits for future cosmetic unlocks." }, cosmetic: { id: "s01_cos_33", type: "trail", name: "Ion Ribbon Trail", detail: "Cosmetic trail tint." } },
  { tier: 34, free: { id: "s01_free_34", type: "badge", name: "Ion Badge", detail: "Season badge." }, cosmetic: { id: "s01_cos_34", type: "frame", name: "Ion Frame", detail: "Player-card frame treatment." } },
  { tier: 35, free: { id: "s01_free_35", type: "trail", name: "Rail Spark Trail", detail: "Milestone trail marker." }, cosmetic: { id: "s01_cos_35", type: "skin", name: "Rail Hull", detail: "Milestone ship skin marker." } },
  { tier: 36, free: { id: "s01_free_36", type: "credits", amount: 500, name: "500 Credits", detail: "Credits for future cosmetic unlocks." }, cosmetic: { id: "s01_cos_36", type: "decal", name: "Rail Lance Decal", detail: "Ship decal concept reward." } },
  { tier: 37, free: { id: "s01_free_37", type: "title", name: "Line Breaker", detail: "Profile title." }, cosmetic: { id: "s01_cos_37", type: "banner", name: "Rail Banner", detail: "Player-card banner." } },
  { tier: 38, free: { id: "s01_free_38", type: "credits", amount: 520, name: "520 Credits", detail: "Credits for future cosmetic unlocks." }, cosmetic: { id: "s01_cos_38", type: "trail", name: "Redline Trail", detail: "Cosmetic trail tint." } },
  { tier: 39, free: { id: "s01_free_39", type: "badge", name: "Rail Badge", detail: "Season badge." }, cosmetic: { id: "s01_cos_39", type: "glow", name: "Red Core Glow", detail: "Profile glow color." } },
  { tier: 40, free: { id: "s01_free_40", type: "banner", name: "Tyrant Banner", detail: "Milestone boss banner." }, cosmetic: { id: "s01_cos_40", type: "skin", name: "Rail Tyrant Hull", detail: "Milestone ship skin marker." } },
  { tier: 41, free: { id: "s01_free_41", type: "credits", amount: 560, name: "560 Credits", detail: "Credits for future cosmetic unlocks." }, cosmetic: { id: "s01_cos_41", type: "trim", name: "Tyrant Badge Trim", detail: "Badge border treatment." } },
  { tier: 42, free: { id: "s01_free_42", type: "title", name: "Gravity Rider", detail: "Profile title." }, cosmetic: { id: "s01_cos_42", type: "banner", name: "Gravity Banner", detail: "Player-card banner." } },
  { tier: 43, free: { id: "s01_free_43", type: "credits", amount: 580, name: "580 Credits", detail: "Credits for future cosmetic unlocks." }, cosmetic: { id: "s01_cos_43", type: "trail", name: "Gravity Ribbon Trail", detail: "Cosmetic trail tint." } },
  { tier: 44, free: { id: "s01_free_44", type: "badge", name: "Gravity Badge", detail: "Season badge." }, cosmetic: { id: "s01_cos_44", type: "frame", name: "Gravity Frame", detail: "Player-card frame treatment." } },
  { tier: 45, free: { id: "s01_free_45", type: "glory_cache", amount: 1000, name: "1K Glory Cache", detail: "Lifetime identity boost." }, cosmetic: { id: "s01_cos_45", type: "skin", name: "Gravity Well Hull", detail: "Milestone ship skin marker." } },
  { tier: 46, free: { id: "s01_free_46", type: "credits", amount: 620, name: "620 Credits", detail: "Credits for future cosmetic unlocks." }, cosmetic: { id: "s01_cos_46", type: "decal", name: "Event Horizon Decal", detail: "Ship decal concept reward." } },
  { tier: 47, free: { id: "s01_free_47", type: "title", name: "Starbound Ace", detail: "Profile title." }, cosmetic: { id: "s01_cos_47", type: "banner", name: "Starbound Banner", detail: "Player-card banner." } },
  { tier: 48, free: { id: "s01_free_48", type: "credits", amount: 650, name: "650 Credits", detail: "Credits for future cosmetic unlocks." }, cosmetic: { id: "s01_cos_48", type: "trail", name: "Starflare Trail", detail: "Cosmetic trail tint." } },
  { tier: 49, free: { id: "s01_free_49", type: "badge", name: "Starbound Badge", detail: "Season badge." }, cosmetic: { id: "s01_cos_49", type: "glow", name: "Starflare Core Glow", detail: "Profile glow color." } },
  { tier: 50, free: { id: "s01_free_50", type: "skin", name: "Launch Eternal Hull", detail: "Season capstone skin marker." }, cosmetic: { id: "s01_cos_50", type: "skin", name: "Animated Eternal Hull", detail: "Season capstone animated skin marker." } }
];

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

function rewardLabel(reward) {
  if (!reward) return "Reward";
  if (reward.type === "credits") return `${Number(reward.amount || 0).toLocaleString()} CREDITS`;
  if (reward.type === "glory_cache") return `${formatRoadNumber(reward.amount || 0)} GLORY`;
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
    subtitle: `${lane.toUpperCase()} TRACK - TIER ${tier}`,
    status,
    requirement: `Reach Season Tier ${tier}`,
    reward: rewardTypeLabel(reward),
    detail: reward.detail || "Season reward.",
    progress: `Current Tier ${Math.max(1, Math.floor(meta.seasonTier || 1))}`
  };
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
    reward: `Free: ${rewardLabel(row.free)} | Cosmetic: ${rewardLabel(row.cosmetic)}`,
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
    const y = rect.y + ROAD_SEASON_START_Y + (i - 1) * ROAD_SEASON_GAP;
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
      freeRect: { x: leftX, y: y - 19, w: leftW, h: 38 },
      cosmeticRect: { x: rightX, y: y - 19, w: rightW, h: 38 },
      freeDetail: seasonRewardDetail(i, "free", reward.free, meta),
      cosmeticDetail: seasonRewardDetail(i, "cosmetic", reward.cosmetic, meta),
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
    targetY = r.contentRect.y + ROAD_SEASON_START_Y + (tier - 1) * ROAD_SEASON_GAP;
  } else {
    const nodes = makeGloryRoadNodes();
    const index = currentRoadIndexForThresholds(nodes, Math.max(0, Math.floor(meta.totalGlory || 0)));
    targetY = r.contentRect.y + ROAD_GLORY_START_Y + index * ROAD_GLORY_GAP;
  }
  titleProgressScroll = targetY - (r.contentRect.y + Math.min(118, r.contentRect.h * 0.38));
  clampTitleProgressScroll();
}

function getProgressNodeAt(x, y) {
  const meta = typeof currentMetaSnapshot === "function" ? currentMetaSnapshot() : null;
  if (!meta) return null;
  const r = getProgressRects();
  if (titleProgressTab === "season") {
    for (const item of buildSeasonRoadLayout(r.contentRect, meta)) {
      const freeRect = { ...item.freeRect, y: item.freeRect.y - titleProgressScroll };
      const cosmeticRect = { ...item.cosmeticRect, y: item.cosmeticRect.y - titleProgressScroll };
      const dotY = item.dotY - titleProgressScroll;
      if (hitRect(freeRect, x, y)) return item.freeDetail;
      if (hitRect(cosmeticRect, x, y)) return item.cosmeticDetail;
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
  const y = panel.y + 92;
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
  const activeFill = lane === "cosmetic" ? "rgba(255,230,128,0.14)" : "rgba(120,255,180,0.15)";
  const reachedFill = lane === "cosmetic" ? "rgba(255,230,128,0.07)" : "rgba(120,210,255,0.08)";
  ctx.save();
  ctx.fillStyle = active ? activeFill : reached ? reachedFill : "rgba(255,255,255,0.045)";
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = active ? (lane === "cosmetic" ? "rgba(255,230,128,0.56)" : "rgba(120,255,180,0.60)") : claimed ? "rgba(120,255,180,0.32)" : "rgba(255,255,255,0.12)";
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
  const startY = rect.y + ROAD_SEASON_START_Y;
  const endY = layout.length ? layout[layout.length - 1].dotY : startY;
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
  ctx.fillText("FREE", leftX + leftW / 2, rect.y + 12);
  ctx.fillText("COSMETIC", rightX + rightW / 2, rect.y + 12);
  ctx.fillStyle = "rgba(120,255,180,0.58)";
  ctx.fillText("TIER", roadX, rect.y + 12);
  ctx.strokeStyle = "rgba(255,255,255,0.10)";
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(roadX, startY - 34);
  ctx.lineTo(roadX, endY + 34);
  ctx.stroke();
  const active = layout.find((item) => item.active) || layout[0];
  ctx.strokeStyle = "rgba(120,255,180,0.24)";
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 9]);
  ctx.beginPath();
  ctx.moveTo(roadX, startY - 34);
  ctx.lineTo(roadX, active ? active.dotY : startY);
  ctx.stroke();
  ctx.setLineDash([]);
  for (const item of layout) {
    ctx.strokeStyle = item.active ? "rgba(120,255,180,0.48)" : item.reached ? "rgba(120,210,255,0.22)" : "rgba(255,255,255,0.10)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(item.freeRect.x + item.freeRect.w, item.dotY);
    ctx.lineTo(item.cosmeticRect.x, item.dotY);
    ctx.stroke();
    drawProgressRailDot(item.dotX, item.dotY, item.radius, item.reached, item.active, color);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = item.milestone ? FONT_SMALL : FONT_TINY;
    ctx.fillStyle = item.active ? "#102018" : item.reached ? "#051116" : "rgba(255,255,255,0.42)";
    ctx.fillText(String(item.tier), item.dotX, item.dotY + 1);
    drawSeasonRewardCard(item.freeRect.x, item.freeRect.y, item.freeRect.w, item.freeRect.h, item.freeDetail, item.active, "free");
    drawSeasonRewardCard(item.cosmeticRect.x, item.cosmeticRect.y, item.cosmeticRect.w, item.cosmeticRect.h, item.cosmeticDetail, item.active && item.milestone, "cosmetic");
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
  ctx.textAlign = "right";
  ctx.fillStyle = "rgba(255,255,255,0.44)";
  ctx.fillText("TAP EMPTY TO CLOSE", rect.x + rect.w - 10, rect.y + rect.h - 14);
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
