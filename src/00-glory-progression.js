const GLORY_ROAD_LENGTH = 300000;
const META_PROGRESS_SCHEMA_VERSION = 3;

const GLORY_RANKS = Object.freeze([
  Object.freeze({ threshold: 0, name: "Rookie Pilot" }),
  Object.freeze({ threshold: 1000, name: "Star Cadet" }),
  Object.freeze({ threshold: 3000, name: "Strike Pilot" }),
  Object.freeze({ threshold: 7500, name: "Void Runner" }),
  Object.freeze({ threshold: 15000, name: "Ace" }),
  Object.freeze({ threshold: 30000, name: "Elite Ace" }),
  Object.freeze({ threshold: 60000, name: "Phantom Hunter" }),
  Object.freeze({ threshold: 100000, name: "Wraithbreaker" }),
  Object.freeze({ threshold: 175000, name: "Solar Legend" }),
  Object.freeze({ threshold: GLORY_ROAD_LENGTH, name: "Star Eternal" })
]);

function normalizedGloryInteger(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.floor(number));
}

function romanPrestige(value) {
  const prestige = normalizedGloryInteger(value);
  if (prestige === 0) return "0";
  if (prestige > 3999) return prestige.toLocaleString("en-US");
  const numerals = [
    [1000, "M"], [900, "CM"], [500, "D"], [400, "CD"],
    [100, "C"], [90, "XC"], [50, "L"], [40, "XL"],
    [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]
  ];
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

function rankForRoadGlory(value) {
  const roadGlory = normalizedGloryInteger(value) % GLORY_ROAD_LENGTH;
  let index = 0;
  for (let i = 1; i < GLORY_RANKS.length - 1; i++) {
    if (roadGlory < GLORY_RANKS[i].threshold) break;
    index = i;
  }
  const current = GLORY_RANKS[index];
  const next = GLORY_RANKS[index + 1];
  return {
    index,
    name: current.name,
    threshold: current.threshold,
    nextName: next.name,
    nextThreshold: next.threshold,
    progress: Math.max(0, Math.min(1, (roadGlory - current.threshold) / Math.max(1, next.threshold - current.threshold)))
  };
}

function displayGloryRankName(rankName, prestige) {
  const base = String(rankName || "Rookie Pilot");
  const value = normalizedGloryInteger(prestige);
  return value > 0 ? `${base} ${romanPrestige(value + 1)}` : base;
}

function gloryRoadStateForTotal(value) {
  const totalGlory = normalizedGloryInteger(value);
  const prestige = Math.floor(totalGlory / GLORY_ROAD_LENGTH);
  const roadGlory = totalGlory % GLORY_ROAD_LENGTH;
  const rank = rankForRoadGlory(roadGlory);
  return {
    totalGlory,
    prestige,
    prestigeLabel: `PRESTIGE ${romanPrestige(prestige)}`,
    roadGlory,
    roadProgress: roadGlory / GLORY_ROAD_LENGTH,
    rank,
    displayRankName: displayGloryRankName(rank.name, prestige)
  };
}

function gloryMilestoneIntensity(type, threshold) {
  if (type === "prestige") return 1;
  const position = Math.max(0, Math.min(1, normalizedGloryInteger(threshold) / GLORY_ROAD_LENGTH));
  const base = 0.22 + position * 0.58;
  return Math.min(0.96, base + (type === "rank" ? 0.14 : 0));
}

function makeGloryMilestoneDefinitions() {
  const milestones = [];
  for (let index = 0; index < GLORY_RANKS.length; index++) {
    const rank = GLORY_RANKS[index];
    if (rank.threshold > 0 && rank.threshold < GLORY_ROAD_LENGTH) {
      milestones.push(Object.freeze({
        id: `rank_${index}`,
        type: "rank",
        threshold: rank.threshold,
        rankName: rank.name,
        intensity: gloryMilestoneIntensity("rank", rank.threshold)
      }));
    }
    const next = GLORY_RANKS[index + 1];
    if (next) {
      const threshold = Math.floor(rank.threshold + (next.threshold - rank.threshold) * 0.5);
      milestones.push(Object.freeze({
        id: `checkpoint_${index}`,
        type: "checkpoint",
        threshold,
        rankName: "",
        intensity: gloryMilestoneIntensity("checkpoint", threshold)
      }));
    }
  }
  milestones.push(Object.freeze({
    id: "road_complete",
    type: "prestige",
    threshold: GLORY_ROAD_LENGTH,
    rankName: "Star Eternal",
    intensity: 1
  }));
  return Object.freeze(milestones.sort((a, b) => a.threshold - b.threshold || a.type.localeCompare(b.type)));
}

const GLORY_MILESTONES = makeGloryMilestoneDefinitions();

function gloryMilestonesCrossed(gloryBeforeValue, gloryAfterValue) {
  const gloryBefore = normalizedGloryInteger(gloryBeforeValue);
  const gloryAfter = Math.max(gloryBefore, normalizedGloryInteger(gloryAfterValue));
  if (gloryAfter <= gloryBefore) return [];
  const firstCycle = Math.floor(gloryBefore / GLORY_ROAD_LENGTH);
  const lastCycle = Math.floor(gloryAfter / GLORY_ROAD_LENGTH);
  const events = [];
  for (let prestigeCycle = firstCycle; prestigeCycle <= lastCycle; prestigeCycle++) {
    const cycleBase = prestigeCycle * GLORY_ROAD_LENGTH;
    for (const milestone of GLORY_MILESTONES) {
      const absoluteThreshold = cycleBase + milestone.threshold;
      if (absoluteThreshold <= gloryBefore || absoluteThreshold > gloryAfter) continue;
      if (milestone.type === "prestige") {
        const afterState = gloryRoadStateForTotal(absoluteThreshold);
        events.push({
          id: `prestige_${prestigeCycle + 1}`,
          type: "prestige",
          threshold: GLORY_ROAD_LENGTH,
          absoluteThreshold,
          prestigeCycle,
          prestigeBefore: prestigeCycle,
          prestigeAfter: prestigeCycle + 1,
          roadGloryAfter: afterState.roadGlory,
          rankName: "Star Eternal",
          intensity: 1
        });
      } else {
        events.push({
          id: `${milestone.id}_p${prestigeCycle}`,
          type: milestone.type,
          threshold: milestone.threshold,
          absoluteThreshold,
          prestigeCycle,
          prestigeBefore: prestigeCycle,
          prestigeAfter: prestigeCycle,
          rankName: milestone.rankName,
          intensity: milestone.intensity
        });
      }
    }
  }
  return events.sort((a, b) => a.absoluteThreshold - b.absoluteThreshold || (a.type === "prestige" ? 1 : -1));
}

function gloryCelebrationQueue(eventsValue, gloryBeforeValue, gloryAfterValue) {
  const events = Array.isArray(eventsValue) ? eventsValue.map((event) => ({ ...event })) : [];
  if (events.length <= 7) return events;
  const prestigeEvents = events.filter((event) => event.type === "prestige");
  if (prestigeEvents.length <= 1) return events.slice(-7);
  const lastPrestige = prestigeEvents[prestigeEvents.length - 1];
  const finalCycleEvents = events.filter((event) => event.absoluteThreshold > lastPrestige.absoluteThreshold).slice(-5);
  return [{
    id: `prestige_summary_${lastPrestige.prestigeAfter}`,
    type: "prestige_summary",
    threshold: GLORY_ROAD_LENGTH,
    absoluteThreshold: lastPrestige.absoluteThreshold,
    prestigeBefore: gloryRoadStateForTotal(gloryBeforeValue).prestige,
    prestigeAfter: gloryRoadStateForTotal(gloryAfterValue).prestige,
    roadsCompleted: prestigeEvents.length,
    rankName: "Star Eternal",
    intensity: 1
  }, ...finalCycleEvents];
}

const STAR_STRIKE_GLORY_PROGRESSION = Object.freeze({
    GLORY_MILESTONES,
    GLORY_RANKS,
    GLORY_ROAD_LENGTH,
    META_PROGRESS_SCHEMA_VERSION,
    displayGloryRankName,
    gloryCelebrationQueue,
    gloryMilestoneIntensity,
    gloryMilestonesCrossed,
    gloryRoadStateForTotal,
    normalizedGloryInteger,
    rankForRoadGlory,
    romanPrestige
});

if (typeof globalThis !== "undefined") globalThis.StarStrikeGloryProgression = STAR_STRIKE_GLORY_PROGRESSION;
if (typeof module !== "undefined" && module.exports) {
  module.exports = STAR_STRIKE_GLORY_PROGRESSION;
}
