const assert = require("node:assert/strict");
const { test } = require("node:test");

const {
  GLORY_ROAD_LENGTH,
  GLORY_RANKS,
  gloryRoadStateForTotal,
  gloryMilestonesCrossed,
  gloryCelebrationQueue,
  rankForRoadGlory,
  romanPrestige
} = require("../src/00-glory-progression.js");

test("Glory Road derives Prestige and within-road Glory without consuming cumulative Glory", () => {
  const cases = [
    [0, 0, 0],
    [299999, 0, 299999],
    [300000, 1, 0],
    [300001, 1, 1],
    [600000, 2, 0],
    [925000, 3, 25000]
  ];
  assert.equal(GLORY_ROAD_LENGTH, 300000);
  for (const [totalGlory, prestige, roadGlory] of cases) {
    const state = gloryRoadStateForTotal(totalGlory);
    assert.equal(state.totalGlory, totalGlory);
    assert.equal(state.prestige, prestige);
    assert.equal(state.roadGlory, roadGlory);
  }
});

test("rank derives from current Road position and display titles accumulate Prestige", () => {
  assert.equal(rankForRoadGlory(15000).name, "Ace");
  assert.equal(gloryRoadStateForTotal(15000).displayRankName, "Ace");
  assert.equal(gloryRoadStateForTotal(315000).displayRankName, "Ace II");
  assert.equal(gloryRoadStateForTotal(615000).displayRankName, "Ace III");
  assert.equal(gloryRoadStateForTotal(301000).rank.name, "Star Cadet");
  assert.equal(gloryRoadStateForTotal(600000).rank.name, "Rookie Pilot");
  assert.equal(romanPrestige(3), "III");
  assert.equal(romanPrestige(5000), "5,000");
});

test("milestones emit only when an absolute repeated-Road threshold is crossed", () => {
  assert.deepEqual(gloryMilestonesCrossed(1200, 1999), []);
  const checkpoint = gloryMilestonesCrossed(1999, 2000);
  assert.equal(checkpoint.length, 1);
  assert.equal(checkpoint[0].type, "checkpoint");
  assert.equal(checkpoint[0].threshold, 2000);
  assert.equal(checkpoint[0].absoluteThreshold, 2000);

  const repeatedRank = gloryMilestonesCrossed(300999, 301000);
  assert.equal(repeatedRank.length, 1);
  assert.equal(repeatedRank[0].type, "rank");
  assert.equal(repeatedRank[0].rankName, "Star Cadet");
  assert.equal(repeatedRank[0].prestigeCycle, 1);
  assert.equal(repeatedRank[0].absoluteThreshold, 301000);
});

test("Prestige boundary preserves total Glory and combines Star Eternal with Road completion", () => {
  assert.equal(gloryMilestonesCrossed(299900, 299999).some((event) => event.type === "prestige"), false);
  const exact = gloryMilestonesCrossed(299900, 300000);
  const terminal = exact.at(-1);
  assert.equal(terminal.type, "prestige");
  assert.equal(terminal.rankName, "Star Eternal");
  assert.equal(terminal.prestigeAfter, 1);
  assert.equal(terminal.roadGloryAfter, 0);
  assert.equal(exact.some((event) => event.type === "rank" && event.rankName === "Star Eternal"), false);

  const overflow = gloryRoadStateForTotal(299900 + 300);
  assert.equal(overflow.totalGlory, 300200);
  assert.equal(overflow.prestige, 1);
  assert.equal(overflow.roadGlory, 200);
  assert.equal(overflow.rank.name, "Rookie Pilot");
});

test("multiple Prestige crossings remain ordered and presentation is summarized without losing result", () => {
  const before = 250000;
  const after = before + 700000;
  const state = gloryRoadStateForTotal(after);
  const events = gloryMilestonesCrossed(before, after);
  assert.equal(state.totalGlory, 950000);
  assert.equal(state.prestige, 3);
  assert.equal(state.roadGlory, 50000);
  assert.equal(events.filter((event) => event.type === "prestige").length, 3);
  assert.deepEqual(
    events.map((event) => event.absoluteThreshold),
    events.map((event) => event.absoluteThreshold).sort((a, b) => a - b)
  );
  const queue = gloryCelebrationQueue(events, before, after);
  assert.ok(queue.length <= 7, "synthetic grants should not create an obnoxious ceremony queue");
  assert.equal(queue.some((event) => event.type === "prestige_summary"), true);
  assert.equal(queue.find((event) => event.type === "prestige_summary").prestigeAfter, 3);
});

test("celebration intensity escalates and rank events outrank nearby checkpoints", () => {
  const early = gloryMilestonesCrossed(1999, 2000)[0];
  const midRank = gloryMilestonesCrossed(99999, 100000)[0];
  const late = gloryMilestonesCrossed(237499, 237500)[0];
  const terminal = gloryMilestonesCrossed(299999, 300000)[0];
  assert.ok(early.intensity < late.intensity);
  assert.ok(midRank.intensity > gloryMilestonesCrossed(79999, 80000)[0].intensity);
  assert.equal(terminal.intensity, 1);
});

test("rank ladder retains the canonical ten named ranks", () => {
  assert.deepEqual(
    GLORY_RANKS.map((rank) => [rank.threshold, rank.name]),
    [
      [0, "Rookie Pilot"],
      [1000, "Star Cadet"],
      [3000, "Strike Pilot"],
      [7500, "Void Runner"],
      [15000, "Ace"],
      [30000, "Elite Ace"],
      [60000, "Phantom Hunter"],
      [100000, "Wraithbreaker"],
      [175000, "Solar Legend"],
      [300000, "Star Eternal"]
    ]
  );
});
