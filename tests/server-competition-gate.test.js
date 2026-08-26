const assert = require("node:assert/strict");
const test = require("node:test");

const competition = require("../functions/competition");
const callableFunctions = require("../functions");

test("server competition gate remains closed pending an authoritative verifier", () => {
  assert.equal(typeof competition.requireCompetitionEnabled, "function");
  assert.throws(() => competition.requireCompetitionEnabled(), /authoritative run verifier/i);
  assert.equal(competition.competitionWritesEnabled(), false);
});

test("competition callables reject before authentication while the retired reward endpoint stays inert", async () => {
  for (const endpoint of [callableFunctions.startVerifiedRun, callableFunctions.submitRunReceipt, callableFunctions.listWeeklyLeagues, callableFunctions.joinWeeklyLeague]) {
    await assert.rejects(
      endpoint.run({ auth: null, data: {} }),
      (error) => (
        error &&
        error.code === "failed-precondition" &&
        /authoritative run verifier/i.test(error.message) &&
        error.details?.release?.progressionAuthority === "automatic_best_account_or_device"
      )
    );
  }
  await assert.rejects(
    callableFunctions.claimSeasonReward.run({ auth: null, data: {} }),
    (error) => error && error.code === "failed-precondition" && /retired/i.test(error.message)
  );
});
