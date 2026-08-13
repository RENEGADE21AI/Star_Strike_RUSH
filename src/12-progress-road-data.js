const ROAD_GLORY_START_Y = 44;
const ROAD_GLORY_GAP = 80;

function formatRoadNumber(value) {
  const n = Math.max(0, Math.floor(Number(value) || 0));
  if (n >= 1000000) return `${(n / 1000000).toFixed(1).replace(".0", "")}M`;
  if (n >= 10000) return `${Math.round(n / 1000)}K`;
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(".0", "")}K`;
  return String(n);
}

function roadPrestigeNumeral(value) {
  const prestige = Math.max(0, Math.floor(Number(value) || 0));
  if (typeof romanPrestige === "function") return romanPrestige(prestige);
  if (prestige === 0) return "0";
  if (prestige > 3999) return prestige.toLocaleString("en-US");
  const numerals = [[1000, "M"], [900, "CM"], [500, "D"], [400, "CD"], [100, "C"], [90, "XC"], [50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]];
  let remaining = prestige;
  let result = "";
  for (const [amount, numeral] of numerals) {
    while (remaining >= amount) {
      result += numeral;
      remaining -= amount;
    }
  }
  return result;
}

function gloryRoadHeaderChips(meta = {}) {
  return [
    { label: "TOTAL", value: formatRoadNumber(meta.totalGlory), tone: "cyan" },
    { label: "RANK", value: String(meta.gloryRankDisplay || meta.gloryRank || "ROOKIE PILOT").toUpperCase(), tone: "gold" },
    { label: "PRESTIGE", value: roadPrestigeNumeral(meta.prestige), tone: "green" }
  ];
}

function roadMarkerPositionForGlory(layout, roadGloryValue) {
  const points = Array.isArray(layout) ? layout.filter((item) => item && item.node && Number.isFinite(Number(item.node.threshold))) : [];
  if (!points.length) return null;
  const roadGlory = Math.max(0, Math.floor(Number(roadGloryValue) || 0));
  if (roadGlory <= points[0].node.threshold) return { x: points[0].dotX, y: points[0].dotY };
  const last = points[points.length - 1];
  if (roadGlory >= last.node.threshold) return { x: last.dotX, y: last.dotY };
  for (let index = 1; index < points.length; index++) {
    const upper = points[index];
    if (roadGlory > upper.node.threshold) continue;
    const lower = points[index - 1];
    const span = Math.max(1, upper.node.threshold - lower.node.threshold);
    const t = Math.max(0, Math.min(1, (roadGlory - lower.node.threshold) / span));
    const oneMinusT = 1 - t;
    const midY = (lower.dotY + upper.dotY) / 2;
    return {
      x: oneMinusT * oneMinusT * oneMinusT * lower.dotX +
        3 * oneMinusT * oneMinusT * t * lower.dotX +
        3 * oneMinusT * t * t * upper.dotX + t * t * t * upper.dotX,
      y: oneMinusT * oneMinusT * oneMinusT * lower.dotY +
        3 * oneMinusT * oneMinusT * t * midY +
        3 * oneMinusT * t * t * midY + t * t * t * upper.dotY
    };
  }
  return { x: last.dotX, y: last.dotY };
}

function makeGloryRoadNodes() {
  const nodes = [];
  for (let index = 0; index < GLORY_RANKS.length; index++) {
    const rank = GLORY_RANKS[index];
    nodes.push({
      id: `glory_rank_${index}`,
      type: rank.threshold === GLORY_ROAD_LENGTH ? "terminal" : "rank",
      label: String(rank.name || "Rank").toUpperCase(),
      sub: rank.threshold === GLORY_ROAD_LENGTH ? "ROAD COMPLETE" : `${formatRoadNumber(rank.threshold)} GLORY`,
      threshold: rank.threshold,
      major: index === 0 || index === GLORY_RANKS.length - 1 || index % 2 === 0,
      detail: rank.threshold === GLORY_ROAD_LENGTH
        ? "Complete this Road as Star Eternal and earn the next Prestige. Total Glory endures."
        : `Current-loop rank at ${Number(rank.threshold).toLocaleString()} Glory.`,
      reward: rank.threshold === GLORY_ROAD_LENGTH ? "Next Prestige Road" : `${rank.name} pilot title`
    });
    const next = GLORY_RANKS[index + 1];
    if (next) {
      const midway = Math.floor(rank.threshold + (next.threshold - rank.threshold) * 0.5);
      nodes.push({
        id: `glory_checkpoint_${index}`,
        type: "checkpoint",
        label: `${formatRoadNumber(midway)} GLORY`,
        sub: "ROUTE CHECKPOINT",
        threshold: midway,
        major: false,
        detail: `Checkpoint between ${rank.name} and ${next.name}.`,
        reward: "Journey milestone"
      });
    }
  }
  return nodes.sort((a, b) => a.threshold - b.threshold || (a.type === "checkpoint" ? -1 : 1));
}

function getProgressRoadContentHeight() {
  const gloryStepCount = Math.max(1, makeGloryRoadNodes().length);
  return 72 + gloryStepCount * ROAD_GLORY_GAP;
}

function currentRoadIndexForThresholds(nodes, roadGloryValue) {
  const roadGlory = Math.max(0, Math.min(GLORY_ROAD_LENGTH - 1, Math.floor(Number(roadGloryValue) || 0)));
  let index = 0;
  for (let i = 0; i < nodes.length; i++) {
    if (roadGlory >= nodes[i].threshold && nodes[i].threshold < GLORY_ROAD_LENGTH) index = i;
  }
  return index;
}

function gloryNodeDetail(node, meta) {
  const roadGlory = Math.max(0, Math.floor(meta.roadGlory || 0));
  const prestige = Math.max(0, Math.floor(meta.prestige || 0));
  const reached = node.threshold < GLORY_ROAD_LENGTH && roadGlory >= node.threshold;
  const absoluteRequirement = prestige * GLORY_ROAD_LENGTH + node.threshold;
  return {
    id: node.id,
    tab: "glory",
    title: node.label,
    subtitle: node.type === "checkpoint" ? "GLORY CHECKPOINT" : node.type === "terminal" ? "GLORY ROAD SUMMIT" : "GLORY RANK",
    status: reached ? "REACHED" : "LOCKED",
    requirement: `${Number(node.threshold).toLocaleString()} / ${Number(GLORY_ROAD_LENGTH).toLocaleString()} current Road`,
    reward: node.reward,
    detail: node.detail,
    progress: `${Number(meta.totalGlory || 0).toLocaleString()} total • ${meta.prestigeLabel || "PRESTIGE 0"}`,
    absoluteRequirement,
    prestige
  };
}

function getProgressDetailById(id) {
  const meta = typeof currentMetaSnapshot === "function" ? currentMetaSnapshot() : null;
  if (!meta) return null;
  const node = makeGloryRoadNodes().find((item) => item.id === id);
  return node ? gloryNodeDetail(node, meta) : null;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { formatRoadNumber, gloryRoadHeaderChips, roadMarkerPositionForGlory };
}
