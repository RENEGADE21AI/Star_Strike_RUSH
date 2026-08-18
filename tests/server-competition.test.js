const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {
  competitionActivationState,
  preseasonCompetitionActivationState,
  divisionName,
  normalizeHandle,
  performanceBand,
  publicLeagueMember,
  validateHandle,
  weekWindow
} = require("../functions/competition");

function test(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

test("server handle claims use the same stable public format", () => {
  assert.equal(normalizeHandle(" @Nova-Pilot "), "nova_pilot");
  assert.equal(validateHandle("@nova_pilot").ok, true);
  assert.equal(validateHandle("@admin").reason, "reserved");
  assert.equal(validateHandle("22pilot").reason, "invalid_format");
});

test("weekly windows begin on Monday UTC", () => {
  const window = weekWindow(Date.UTC(2026, 6, 21, 12));
  assert.equal(window.id, "week_2026_07_20");
  assert.equal(window.endMs - window.startMs, 7 * 24 * 60 * 60 * 1000);
});

test("performance bands create understandable divisions", () => {
  assert.equal(divisionName(performanceBand(0)), "ROOKIE");
  assert.equal(divisionName(performanceBand(75000)), "GOLD");
  assert.equal(divisionName(performanceBand(999999)), "NOVA");
});

test("league member payloads expose only public game identity", () => {
  const member = publicLeagueMember({ uid: "u1", publicPilotId: "pilot_0123456789abcdefabcd", callSign: "Nova 7", handle: "Nova-Pilot", weeklyPoints: 42, email: "private@example.test" });
  assert.deepEqual(member, { publicPilotId: "pilot_0123456789abcdefabcd", callSign: "NOVA7", handle: "nova_pilot", weeklyPoints: 42 });
  assert.equal("email" in member, false);
  assert.equal("uid" in member, false);
});

test("verified leagues remain gated while the unverified preseason board cannot mutate progression", () => {
  for (const progressionWritesEnabled of [false, true]) {
    for (const competitionWritesEnabled of [false, true]) {
      for (const verifiedRunSessionsEnabled of [false, true]) {
        const active = competitionActivationState({
          progressionWritesEnabled,
          competitionWritesEnabled,
          verifiedRunSessionsEnabled
        });
        assert.equal(
          active,
          progressionWritesEnabled && competitionWritesEnabled && verifiedRunSessionsEnabled
        );
      }
    }
  }
  assert.equal(preseasonCompetitionActivationState({
    progressionWritesEnabled: false,
    competitionWritesEnabled: true,
    verifiedRunSessionsEnabled: false
  }), true);
  assert.equal(preseasonCompetitionActivationState({
    progressionWritesEnabled: true,
    competitionWritesEnabled: true,
    verifiedRunSessionsEnabled: false
  }), false);
  const indexSource = fs.readFileSync(path.resolve(__dirname, "../functions/index.js"), "utf8");
  const joinBody = indexSource.slice(indexSource.indexOf("exports.joinWeeklyLeague"), indexSource.indexOf("function clientProfile"));
  assert.doesNotMatch(joinBody, /verifiedBestScore|legacyBestScore/);
  assert.match(joinBody, /recordTrust: "preseason_unverified"/);
  const submitBody = indexSource.slice(indexSource.indexOf("exports.submitRunReceipt"), indexSource.indexOf("exports.claimSeasonReward"));
  assert.doesNotMatch(submitBody, /players_private|player_achievement|leaderboard_scores|applyRunToProfile/);
  assert.match(submitBody, /weekly_run_receipts/);
  assert.match(submitBody, /Math\.max\(/);
});
