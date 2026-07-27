const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");

const repoRoot = path.resolve(__dirname, "..");
const competition = require(path.join(repoRoot, "functions", "competition.js"));

test("identity endpoints preserve the legacy archive while progression endpoints are gated first", () => {
  assert.equal(competition.competitionWritesEnabled(), false);

  const source = fs.readFileSync(path.join(repoRoot, "functions", "index.js"), "utf8");
  const syncProfile = source.slice(
    source.indexOf("exports.syncPilotProfile"),
    source.indexOf("exports.claimPilotHandle")
  );
  const claimHandle = source.slice(
    source.indexOf("exports.claimPilotHandle"),
    source.indexOf("exports.joinWeeklyLeague")
  );
  assert.doesNotMatch(syncProfile, /tx\.(set|update|create|delete)\(leaderboardRef/);
  assert.doesNotMatch(claimHandle, /leaderboardRef|leaderboard_scores/);
  for (const [start, end] of [
    ["exports.joinWeeklyLeague", "function clientProfile"],
    ["exports.submitRunReceipt", "exports.claimSeasonReward"],
    ["exports.claimSeasonReward", ""]
  ]) {
    const body = source.slice(source.indexOf(start), end ? source.indexOf(end) : undefined);
    assert.ok(body.indexOf("requireServerProgressionWritesEnabled()") < body.indexOf("authContext(request)"));
  }
});
