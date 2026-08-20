const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const {
  enforceUidThrottle,
  payloadByteLength,
  requirePayloadWithin,
  throttleDocumentId
} = require("../functions/callable-security");
const release = require("../functions/release-config");

test("active identity callables bound payload size and use safe structured errors", () => {
  assert.equal(payloadByteLength({ callSign: "NOVA_7" }), Buffer.byteLength('{"callSign":"NOVA_7"}'));
  assert.equal(requirePayloadWithin({ callSign: "NOVA_7" }, 64) > 0, true);
  assert.throws(
    () => requirePayloadWithin({ callSign: "X".repeat(200) }, 64),
    (error) => error?.code === "invalid-argument" && error?.details.maximumBytes === 64
  );
  assert.equal(throttleDocumentId("sync/Pilot", "uid/with spaces"), "sync_Pilot_uid_with_spaces");

  const source = fs.readFileSync(path.resolve(__dirname, "../functions/index.js"), "utf8");
  for (const [start, end, maximumBytes] of [
    ["exports.syncPilotProfile", "exports.claimPilotHandle", 1024],
    ["exports.claimPilotHandle", "exports.requestAccountDeletion", 512],
    ["exports.requestAccountDeletion", "exports.cancelAccountDeletion", 128],
    ["exports.cancelAccountDeletion", "exports.joinWeeklyLeague", 64],
    ["exports.joinWeeklyLeague", "function clientProfile", 256],
    ["exports.listWeeklyLeagues", "exports.chooseProgressionSource", 64],
    ["exports.chooseProgressionSource", "exports.startVerifiedRun", 8192],
    ["exports.startVerifiedRun", "exports.submitRunReceipt", 256],
    ["exports.submitRunReceipt", "exports.claimSeasonReward", 524288]
  ]) {
    const body = source.slice(source.indexOf(start), source.indexOf(end));
    assert.match(body, new RegExp(`requirePayloadWithin\\(request\\.data, ${maximumBytes}\\)`));
    assert.match(body, /enforceUidThrottle/);
  }
});

test("per-UID throttling allows its bound then rejects without logging payloads", async () => {
  let stored = null;
  const db = {
    doc: (documentPath) => ({ path: documentPath }),
    runTransaction: async (operation) => operation({
      get: async () => ({
        exists: stored !== null,
        data: () => stored || {}
      }),
      set: (_ref, next, options) => {
        stored = options?.merge ? { ...(stored || {}), ...next } : next;
      }
    })
  };
  const options = {
    endpoint: "syncPilotProfile",
    uid: "account-a",
    maximumCalls: 2,
    windowMs: 10000,
    nowMs: 50000
  };
  await enforceUidThrottle(db, options);
  await enforceUidThrottle(db, options);
  assert.equal(stored.count, 2);
  assert.equal(stored.uid, "account-a");
  await assert.rejects(
    enforceUidThrottle(db, options),
    (error) => error?.code === "resource-exhausted" && error?.details.retryAfterMs === 10000
  );
});

test("App Check preparation is explicit but remains disabled until live verification", () => {
  assert.equal(release.SERVER_APP_CHECK_ENFORCED, false);
  const source = fs.readFileSync(path.resolve(__dirname, "../functions/index.js"), "utf8");
  assert.match(source, /enforceAppCheck:\s*SERVER_APP_CHECK_ENFORCED/);
});
