const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");

const repoRoot = path.resolve(__dirname, "..");

function loadIdentityContracts() {
  const context = { globalThis: null, String };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(
    fs.readFileSync(path.join(repoRoot, "src", "00-online-identity.js"), "utf8"),
    context
  );
  return context;
}

test("sign-out clears every account-scoped identity field without touching guest identity", () => {
  const context = loadIdentityContracts();
  const online = {
    user: { uid: "account-a" },
    profileCallSign: "ACCOUNT_A",
    profileHandle: "account_a",
    profileMeta: { glory: 900 },
    weeklyLeague: { id: "week-a" },
    achievements: ["ace"],
    leaderboard: [{ uid: "account-a" }],
    competitionBackend: "ready"
  };
  const guestIdentity = { callSign: "GUEST_7" };

  context.clearAccountIdentity(online, { competitiveModeEnabled: false });

  assert.equal(online.user, null);
  assert.equal(online.profileCallSign, "");
  assert.equal(online.profileHandle, "");
  assert.equal(online.profileMeta, null);
  assert.equal(online.weeklyLeague, null);
  assert.equal(online.achievements.length, 0);
  assert.equal(online.leaderboard.length, 0);
  assert.equal(online.competitionBackend, "disabled");
  assert.equal(guestIdentity.callSign, "GUEST_7");
});

test("initial account sync never uploads a guest or previous-account call sign", () => {
  const context = loadIdentityContracts();
  assert.equal(context.accountSyncCallSign({ explicitCallSign: "", accountCallSign: "" }), "");
  assert.equal(context.accountSyncCallSign({ explicitCallSign: "", accountCallSign: "SERVER_9" }), "");
  assert.equal(context.accountSyncCallSign({ explicitCallSign: "NEW_NAME", accountCallSign: "SERVER_9" }), "NEW_NAME");
});

test("handle claim errors distinguish validation and ownership from outages", () => {
  const context = loadIdentityContracts();
  assert.equal(context.identityErrorKind({ code: "functions/already-exists" }), "handle_taken");
  assert.equal(context.identityErrorKind({ code: "functions/invalid-argument" }), "invalid_handle");
  assert.equal(context.identityErrorKind({ code: "functions/failed-precondition" }), "account_conflict");
  assert.equal(context.identityErrorKind({ code: "functions/unauthenticated" }), "signed_out");
  assert.equal(context.identityErrorKind({ code: "functions/unavailable" }), "backend_unavailable");
  assert.equal(context.identityErrorKind({ code: "functions/deadline-exceeded" }), "backend_unavailable");
});
