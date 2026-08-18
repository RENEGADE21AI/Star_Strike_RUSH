const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");

const repoRoot = path.resolve(__dirname, "..");
const competition = require(path.join(repoRoot, "functions", "competition.js"));

test("identity and weekly endpoints preserve device progression and the legacy archive", () => {
  assert.equal(competition.competitionWritesEnabled(), true);

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
  const submit = source.slice(source.indexOf("exports.submitRunReceipt"), source.indexOf("exports.claimSeasonReward"));
  assert.doesNotMatch(submit, /players_private|leaderboard_scores|player_achievement|applyRunToProfile/);
  assert.match(submit, /weekly_run_receipts/);
  const retiredSeason = source.slice(source.indexOf("exports.claimSeasonReward"));
  assert.match(retiredSeason, /Season Road is retired/);
  assert.doesNotMatch(retiredSeason, /authContext\(request\)|db\.|runTransaction/);
});
