const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");

const root = path.resolve(__dirname, "..");
const source = (file) => fs.readFileSync(path.join(root, file), "utf8");

function loadRoadData() {
  delete require.cache[require.resolve("../src/12-progress-road-data.js")];
  return require("../src/12-progress-road-data.js");
}

test("title, Road, and Game Over expose Prestige without an active Season surface", () => {
  const titlePanels = source("src/12-rendering-title-panels.js");
  const titleScreens = source("src/13-rendering-title-screens.js");
  const road = source("src/12-rendering-progress-road.js");
  const roadData = source("src/12-progress-road-data.js");
  const input = source("src/18-title-input.js");
  assert.match(titlePanels, /label:\s*"PRESTIGE"/);
  assert.doesNotMatch(titlePanels, /label:\s*"SEASON"/);
  assert.doesNotMatch(titleScreens, /SEASON XP|SEASON TIER/);
  assert.match(titleScreens, /GLORY ROAD COMPLETE/);
  assert.match(road, /drawTitlePanelFrame\(panel, "GLORY ROAD", false\)/);
  assert.doesNotMatch(road, /seasonTab|drawSeasonRoad|drawSeasonReward|CLAIM/);
  assert.doesNotMatch(roadData, /SEASON_REWARDS|seasonReward|Season XP/);
  assert.doesNotMatch(input, /setTitleProgressTab|handleProgressClaim/);
});

test("View Road always opens the single Glory Road", () => {
  const session = source("src/18-session-input-loop.js");
  const handler = session.slice(session.indexOf("function handleGameOverPointerDown"), session.indexOf("canvas.addEventListener(\"pointerdown\""));
  assert.match(handler, /openTitleProgressRoad\(\)/);
  assert.doesNotMatch(handler, /season|rankUp\s*\?/i);
});

test("celebration rendering honors accessibility controls and intercepts Game Over input", () => {
  const celebration = source("src/12-glory-celebration.js");
  assert.match(celebration, /settingReducedMotion/);
  assert.match(celebration, /settingReducedFlash/);
  assert.match(celebration, /settingEffectsEnabled|playGameSound/);
  const session = source("src/18-session-input-loop.js");
  const handler = session.slice(session.indexOf("function handleGameOverPointerDown"), session.indexOf("canvas.addEventListener(\"pointerdown\""));
  assert.ok(handler.indexOf("gloryCelebrationActive()") < handler.indexOf("getGameOverButtons()"));
});

test("Road ship follows the curve between milestones instead of snapping to a reached node", () => {
  const { roadMarkerPositionForGlory } = loadRoadData();
  const layout = [
    { node: { threshold: 0 }, dotX: 0, dotY: 100 },
    { node: { threshold: 1000 }, dotX: 100, dotY: 0 }
  ];
  assert.deepEqual(roadMarkerPositionForGlory(layout, 0), { x: 0, y: 100 });
  assert.deepEqual(roadMarkerPositionForGlory(layout, 500), { x: 50, y: 50 });
  assert.deepEqual(roadMarkerPositionForGlory(layout, 1000), { x: 100, y: 0 });
  const quarter = roadMarkerPositionForGlory(layout, 250);
  assert.equal(quarter.x, 15.625);
  assert.equal(quarter.y, 70.3125);
  const offsetLayout = [
    { node: { threshold: 0 }, dotX: 10, dotY: 100 },
    { node: { threshold: 1000 }, dotX: 110, dotY: 0 }
  ];
  assert.deepEqual(roadMarkerPositionForGlory(offsetLayout, 500), { x: 60, y: 50 });
});

test("Glory Road header prioritizes permanent total Glory over unrelated score", () => {
  const { gloryRoadHeaderChips } = loadRoadData();
  assert.deepEqual(
    gloryRoadHeaderChips({ totalGlory: 925000, gloryRankDisplay: "Ace IV", prestige: 3 }),
    [
      { label: "TOTAL", value: "925K", tone: "cyan" },
      { label: "RANK", value: "ACE IV", tone: "gold" },
      { label: "PRESTIGE", value: "III", tone: "green" }
    ]
  );
});

test("Glory Road generates one continuous absolute route through extreme Prestige", () => {
  const { GLORY_RANKS, GLORY_ROAD_LENGTH } = require("../src/00-glory-progression.js");
  const { makeContinuousGloryRoadNodes } = loadRoadData();
  const nodes = makeContinuousGloryRoadNodes(GLORY_RANKS, GLORY_ROAD_LENGTH, 50);
  assert.ok(nodes.length > 850, "Prestige 50 should be generated, not hard-coded or truncated");
  assert.deepEqual(nodes.map((node) => node.threshold), nodes.map((node) => node.threshold).sort((a, b) => a - b));
  assert.equal(nodes.find((node) => node.threshold === 315000).label, "ACE II");
  assert.equal(nodes.find((node) => node.threshold === 615000).label, "ACE III");
  assert.equal(nodes.some((node) => node.threshold === 15015000 && node.label === "ACE LI"), true);
  assert.equal(new Set(nodes.map((node) => node.id)).size, nodes.length);
});
