const assert = require("node:assert/strict");
const test = require("node:test");

const {
  bestProgressionSource,
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

test("server automatically chooses one complete save using stable priority fields", () => {
  assert.equal(bestProgressionSource(device, account), "account");
  assert.equal(bestProgressionSource(account, device), "device");
  assert.equal(bestProgressionSource(account, { ...account }), "account", "account wins exact ties");

  const sameCoreAccount = { ...device };
  assert.equal(
    bestProgressionSource(device, sameCoreAccount, { deviceAchievementCount: 12, accountAchievementCount: 4 }),
    "device"
  );
  assert.equal(
    bestProgressionSource(device, sameCoreAccount, { deviceAchievementCount: 4, accountAchievementCount: 4, deviceCodexCount: 2, accountCodexCount: 8 }),
    "account"
  );
});

test("automatic replacement returns the selected save unchanged rather than combining fields", () => {
  const selected = replacementProfileForChoice(bestProgressionSource(device, account), device, account);
  assert.equal(selected.totalGlory, account.totalGlory);
  assert.equal(selected.bestScore, account.bestScore);
  assert.notEqual(selected.totalGlory, device.totalGlory + account.totalGlory);
});

