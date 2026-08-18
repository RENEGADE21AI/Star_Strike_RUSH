const assert = require("node:assert/strict");
const test = require("node:test");

const competition = require("../functions/competition");
const callableFunctions = require("../functions");

test("server competition gate opens only the unverified preseason board", () => {
  assert.equal(typeof competition.requireCompetitionEnabled, "function");
  assert.doesNotThrow(() => competition.requireCompetitionEnabled());
  assert.equal(competition.competitionWritesEnabled(), true);
});

test("active weekly callables require authentication while retired Season claims stay closed", async () => {
  for (const endpoint of [callableFunctions.submitRunReceipt, callableFunctions.joinWeeklyLeague]) {
    await assert.rejects(
      endpoint.run({ auth: null, data: {} }),
      (error) => (
        error &&
        error.code === "unauthenticated" &&
        error.details?.release?.progressionAuthority === "device_local_preseason"
      )
    );
  }
  await assert.rejects(
    callableFunctions.claimSeasonReward.run({ auth: null, data: {} }),
    (error) => error && error.code === "failed-precondition" && /retired/i.test(error.message)
  );
});
