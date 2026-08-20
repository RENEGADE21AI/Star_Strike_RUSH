const assert = require("node:assert/strict");
const test = require("node:test");

const {
  accountProgressionChoiceState,
  replacementProfileForChoice
} = require("../functions/account-progression-choice");

const device = {
  totalGlory: 2500,
  lifetimeRuns: 3,
  lifetimeScore: 9000,
  lifetimeKills: 20,
  bestScore: 5000,
  phase: 4
};
const account = {
  totalGlory: 8000,
  lifetimeRuns: 9,
  lifetimeScore: 30000,
  lifetimeKills: 100,
  bestScore: 12000,
  phase: 7
};

test("progression choice replaces one save with the other and never combines balances", () => {
  assert.deepEqual(replacementProfileForChoice("device", device, account), {
    totalGlory: 2500,
    lifetimeRuns: 3,
    lifetimeScore: 9000,
    lifetimeKills: 20,
    lifetimePowerups: 0,
    lifetimeGhostUses: 0,
    lifetimeBosses: 0,
    lifetimeDamageTaken: 0,
    highestCombo: 0,
    bestScore: 5000,
    phase: 4
  });
  assert.equal(replacementProfileForChoice("account", device, account).totalGlory, 8000);
  assert.notEqual(replacementProfileForChoice("device", device, account).totalGlory, 10500);
});

test("a conflict is required only for two distinct meaningful saves", () => {
  assert.equal(accountProgressionChoiceState({}, {}).kind, "empty");
  assert.equal(accountProgressionChoiceState(device, {}).kind, "device_only");
  assert.equal(accountProgressionChoiceState({}, account).kind, "account_only");
  assert.equal(accountProgressionChoiceState(device, account).kind, "conflict");
  assert.equal(accountProgressionChoiceState(device, { ...device }).kind, "same");
});

