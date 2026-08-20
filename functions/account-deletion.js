"use strict";

const ACCOUNT_DELETION_GRACE_MS = 72 * 60 * 60 * 1000;

function accountDeletionDeadline(requestedAtMs) {
  const value = Number(requestedAtMs);
  if (!Number.isFinite(value) || value < 0) throw new TypeError("Deletion request time must be valid.");
  return Math.floor(value) + ACCOUNT_DELETION_GRACE_MS;
}

function accountDeletionIsDue(nowMs, requestedAtMs) {
  return Number(nowMs) >= accountDeletionDeadline(requestedAtMs);
}

module.exports = { ACCOUNT_DELETION_GRACE_MS, accountDeletionDeadline, accountDeletionIsDue };

