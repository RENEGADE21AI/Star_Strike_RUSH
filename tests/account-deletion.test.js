const assert = require("node:assert/strict");
const test = require("node:test");

const {
  ACCOUNT_DELETION_GRACE_MS,
  accountDeletionDeadline,
  accountDeletionIsDue
} = require("../functions/account-deletion");

test("account deletion has an exact 72-hour cancellable grace period", () => {
  const requestedAtMs = Date.UTC(2026, 7, 20, 12);
  assert.equal(ACCOUNT_DELETION_GRACE_MS, 72 * 60 * 60 * 1000);
  assert.equal(accountDeletionDeadline(requestedAtMs), requestedAtMs + ACCOUNT_DELETION_GRACE_MS);
  assert.equal(accountDeletionIsDue(accountDeletionDeadline(requestedAtMs) - 1, requestedAtMs), false);
  assert.equal(accountDeletionIsDue(accountDeletionDeadline(requestedAtMs), requestedAtMs), true);
});

