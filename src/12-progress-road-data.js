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
