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

function roadRankDisplayName(rankName, prestigeCycle) {
  const base = String(rankName || "Rank");
  const cycle = Math.max(0, Math.floor(Number(prestigeCycle) || 0));
  return cycle > 0 ? `${base} ${roadPrestigeNumeral(cycle + 1)}` : base;
}

function makeContinuousGloryRoadNodes(ranksValue, roadLengthValue, maxPrestigeCycleValue = 0) {
  const ranks = Array.isArray(ranksValue) ? ranksValue : [];
  const roadLength = Math.max(1, Math.floor(Number(roadLengthValue) || 1));
  const maxPrestigeCycle = Math.max(0, Math.floor(Number(maxPrestigeCycleValue) || 0));
  const nodes = [];
  for (let prestigeCycle = 0; prestigeCycle <= maxPrestigeCycle; prestigeCycle++) {
    const cycleBase = prestigeCycle * roadLength;
    for (let index = 0; index < ranks.length; index++) {
      const rank = ranks[index];
      const relativeThreshold = Math.max(0, Math.floor(Number(rank.threshold) || 0));
      if (prestigeCycle > 0 && relativeThreshold === 0) continue;
      const terminal = relativeThreshold === roadLength;
      const threshold = cycleBase + relativeThreshold;
      const rankDisplay = roadRankDisplayName(rank.name, prestigeCycle);
      nodes.push({
        id: `glory_rank_p${prestigeCycle}_${index}`,
        type: terminal ? "terminal" : "rank",
        label: rankDisplay.toUpperCase(),
        sub: terminal ? `PRESTIGE ${roadPrestigeNumeral(prestigeCycle + 1)} EARNED` : `${formatRoadNumber(threshold)} TOTAL GLORY`,
        threshold,
        roadThreshold: relativeThreshold,
        prestigeCycle,
        major: index === 0 || terminal || index % 2 === 0,
        detail: terminal
          ? "Complete this Road as Star Eternal. Total Glory endures and the flightpath continues."
          : `${rankDisplay} at ${Number(threshold).toLocaleString()} permanent total Glory.`,
        reward: terminal ? `Prestige ${roadPrestigeNumeral(prestigeCycle + 1)}` : `${rankDisplay} pilot title`
      });
      const next = ranks[index + 1];
      if (next) {
        const midway = Math.floor(relativeThreshold + (Number(next.threshold) - relativeThreshold) * 0.5);
        const absoluteMidway = cycleBase + midway;
        nodes.push({
          id: `glory_checkpoint_p${prestigeCycle}_${index}`,
          type: "checkpoint",
          label: `${formatRoadNumber(absoluteMidway)} GLORY`,
          sub: "ROUTE CHECKPOINT",
          threshold: absoluteMidway,
          roadThreshold: midway,
          prestigeCycle,
          major: false,
          detail: `Checkpoint between ${roadRankDisplayName(rank.name, prestigeCycle)} and ${roadRankDisplayName(next.name, prestigeCycle)}.`,
          reward: "Journey milestone"
        });
      }
    }
  }
  return nodes.sort((a, b) => a.threshold - b.threshold || (a.type === "checkpoint" ? -1 : 1));
}

function makeGloryRoadNodes(maxPrestigeCycle = 0) {
  return makeContinuousGloryRoadNodes(GLORY_RANKS, GLORY_ROAD_LENGTH, maxPrestigeCycle);
}

function getProgressRoadContentHeight(metaValue) {
  const meta = metaValue || (typeof currentMetaSnapshot === "function" ? currentMetaSnapshot() : {});
  const gloryStepCount = Math.max(1, makeGloryRoadNodes(Math.max(1, Number(meta.prestige || 0) + 1)).length);
  return 72 + gloryStepCount * ROAD_GLORY_GAP;
}

function currentRoadIndexForThresholds(nodes, totalGloryValue) {
  const totalGlory = Math.max(0, Math.floor(Number(totalGloryValue) || 0));
  let index = 0;
  for (let i = 0; i < nodes.length; i++) {
    if (totalGlory >= nodes[i].threshold) index = i;
  }
  return index;
}

function gloryNodeDetail(node, meta) {
  const totalGlory = Math.max(0, Math.floor(meta.totalGlory || 0));
  const prestige = Math.max(0, Math.floor(node.prestigeCycle || 0));
  const reached = totalGlory >= node.threshold;
  return {
    id: node.id,
    tab: "glory",
    title: node.label,
    subtitle: node.type === "checkpoint" ? "GLORY CHECKPOINT" : node.type === "terminal" ? "GLORY ROAD SUMMIT" : "GLORY RANK",
    status: reached ? "REACHED" : "LOCKED",
    requirement: `${Number(node.threshold).toLocaleString()} TOTAL GLORY`,
    reward: node.reward,
    detail: node.detail,
    progress: `${Number(meta.totalGlory || 0).toLocaleString()} total • ${meta.prestigeLabel || "PRESTIGE 0"}`,
    absoluteRequirement: node.threshold,
    prestige
  };
}

function getProgressDetailById(id) {
  const meta = typeof currentMetaSnapshot === "function" ? currentMetaSnapshot() : null;
  if (!meta) return null;
  const node = makeGloryRoadNodes(Math.max(1, Number(meta.prestige || 0) + 1)).find((item) => item.id === id);
  return node ? gloryNodeDetail(node, meta) : null;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { formatRoadNumber, gloryRoadHeaderChips, makeContinuousGloryRoadNodes, roadMarkerPositionForGlory };
}
