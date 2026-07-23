const assert = require("node:assert/strict");
const test = require("node:test");

const competition = require("../functions/competition");
const callableFunctions = require("../functions");

test("server competition gate defaults closed with a controlled error", () => {
  assert.equal(typeof competition.requireCompetitionEnabled, "function");
  assert.throws(
    () => competition.requireCompetitionEnabled(),
    (error) => error && error.code === "failed-precondition" && /preseason|paused/i.test(error.message)
  );
});

test("deployed competition callables reject before authentication or Firestore", async () => {
  for (const endpoint of [callableFunctions.submitRunReceipt, callableFunctions.joinWeeklyLeague]) {
    await assert.rejects(
      endpoint.run({ auth: null, data: {} }),
      (error) => error && error.code === "failed-precondition" && /preseason|paused/i.test(error.message)
    );
  }
});
