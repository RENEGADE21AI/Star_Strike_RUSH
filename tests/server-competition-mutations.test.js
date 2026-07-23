const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");

const repoRoot = path.resolve(__dirname, "..");
const competition = require(path.join(repoRoot, "functions", "competition.js"));

test("competition-disabled identity and progression calls cannot write leaderboard state", () => {
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
  const claimReward = source.slice(source.indexOf("exports.claimSeasonReward"));
  assert.match(syncProfile, /if \(competitionWritesEnabled\(\)\) tx\.set\(leaderboardRef/);
  assert.match(claimHandle, /if \(competitionWritesEnabled\(\) && leaderboardSnap\.exists\) tx\.update\(leaderboardRef/);
  assert.match(claimReward, /if \(competitionWritesEnabled\(\)\) tx\.set\(leaderboardRef/);
});
