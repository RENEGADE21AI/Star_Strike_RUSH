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

function loadHydrationContract(overrides = {}) {
  const source = fs.readFileSync(path.join(repoRoot, "src", "20-firebase-online.js"), "utf8");
  const generationStart = source.indexOf("function beginAuthTransitionGeneration");
  const generationEnd = source.indexOf("\nfunction isHydrationCurrent", generationStart);
  const start = source.indexOf("async function hydrateAccount");
  const end = source.indexOf("\nasync function updateCallSign", start);
  assert.ok(generationStart >= 0 && generationEnd > generationStart, "auth generation source boundary is available");
  assert.ok(start >= 0 && end > start, "hydrateAccount source boundary is available");
  const context = {
    Map,
    Promise,
    hydrationPromises: new Map(),
    authGeneration: 1,
    competitiveModeEnabled: false,
    localStorage: {},
    navigator: { onLine: true },
    online: {
      developmentCounters: { hydrationSequences: 0 },
      identityService: "available",
      accountArchive: "not_loaded",
      networkState: "online",
      pendingCallSign: false,
      profileCallSign: ""
    },
    window: {
      readAccountIdentityState: () => ({ pending: false, desiredCallSign: "" })
    },
    isHydrationCurrent: () => true,
    resolveBestProgression: async () => ({ ok: true, selectedSource: "account" }),
    subscribeWorldRecords: () => {},
    loadWeeklyLeague: async () => ({ ok: false, reason: "disabled" }),
    setStatus: () => {},
    setError: () => {},
    ...overrides
  };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(source.slice(generationStart, generationEnd), context);
  vm.runInContext(source.slice(start, end), context);
  return context;
}

test("sign-out clears every account-scoped identity field without touching guest identity", () => {
  const context = loadIdentityContracts();
  const online = {
    user: { uid: "account-a" },
    publicPilotId: "pilot_public_a",
    profileCallSign: "ACCOUNT_A",
    profileHandle: "account_a",
    profileMeta: { glory: 900 },
    weeklyLeague: { id: "week-a" },
    achievements: ["ace"],
    leaderboard: [{ uid: "account-a" }],
    identityService: "available",
    accountArchive: "loaded",
    progressionMode: "account",
    competitionMode: "ready",
    networkState: "online",
    pendingCallSign: true,
    ready: true
  };
  const guestIdentity = { callSign: "GUEST_7" };

  context.clearAccountIdentity(online, { competitiveModeEnabled: false });

  assert.equal(online.user, null);
  assert.equal(online.publicPilotId, "");
  assert.equal(online.profileCallSign, "");
  assert.equal(online.profileHandle, "");
  assert.equal(online.profileMeta, null);
  assert.equal(online.weeklyLeague, null);
  assert.equal(online.achievements.length, 0);
  assert.equal(online.leaderboard.length, 0);
  assert.equal(online.identityService, "signed_out");
  assert.equal(online.accountArchive, "not_loaded");
  assert.equal(online.progressionMode, "automatic_best_account_or_device");
  assert.equal(online.competitionMode, "paused");
  assert.equal(online.networkState, "online");
  assert.equal(online.pendingCallSign, false);
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

test("sign-in failure keeps a sanitized account error beside its status", () => {
  const context = loadIdentityContracts();
  const online = {
    lastStatus: "OPENING GOOGLE SIGN-IN",
    lastError: ""
  };

  context.applyIdentityFailure(
    online,
    { message: "Firebase: Error (auth/unauthorized-domain)." },
    "Google sign-in failed.",
    "SIGN IN FAILED"
  );

  assert.equal(online.lastStatus, "SIGN IN FAILED");
  assert.equal(online.lastError, "Error (auth/unauthorized-domain).");
});

test("popup success waits for the auth-owned hydration exactly once", async () => {
  const context = loadIdentityContracts();
  const calls = { popup: 0, redirect: 0, transition: 0, hydration: 0 };
  const result = await context.initiateGoogleAuthFlow({
    popup: async () => { calls.popup++; },
    redirect: async () => { calls.redirect++; },
    waitForAuthTransition: async () => {
      calls.transition++;
      return { uid: "account-a" };
    },
    waitForHydration: async (uid) => {
      assert.equal(uid, "account-a");
      calls.hydration++;
    }
  });
  assert.equal(result.user.uid, "account-a");
  assert.deepEqual(calls, { popup: 1, redirect: 0, transition: 1, hydration: 1 });
});

test("blocked popup falls back to redirect without starting hydration", async () => {
  const context = loadIdentityContracts();
  const calls = { popup: 0, redirect: 0, transition: 0, hydration: 0 };
  const result = await context.initiateGoogleAuthFlow({
    popup: async () => {
      calls.popup++;
      throw { code: "auth/popup-blocked" };
    },
    redirect: async () => { calls.redirect++; },
    waitForAuthTransition: async () => {
      calls.transition++;
      return { uid: "unexpected" };
    },
    waitForHydration: async () => { calls.hydration++; }
  });
  assert.equal(result.redirecting, true);
  assert.deepEqual(calls, { popup: 1, redirect: 1, transition: 0, hydration: 0 });
});

test("redirect restoration consumes one result and leaves hydration to auth state", async () => {
  const context = loadIdentityContracts();
  let resultCalls = 0;
  const restored = await context.restoreGoogleRedirect(async () => {
    resultCalls++;
    return { user: { uid: "account-r" } };
  });
  assert.equal(restored.user.uid, "account-r");
  assert.equal(resultCalls, 1);
});

test("forced refreshes coalesce with an in-flight UID hydration and refresh again once idle", async () => {
  const pendingResolvers = [];
  let syncCalls = 0;
  let listenerCalls = 0;
  const context = loadHydrationContract({
    syncProfile: () => {
      syncCalls++;
      return new Promise((resolve) => pendingResolvers.push(resolve));
    },
    subscribeWorldRecords: () => { listenerCalls++; }
  });
  const user = { uid: "account-a" };

  const initial = context.hydrateAccount(user);
  const reconnect = context.hydrateAccount(user, { force: true });
  const manualRefresh = context.hydrateAccount(user, { force: true });
  assert.equal(syncCalls, 1, "concurrent force requests must reuse the active callable sequence");
  assert.equal(context.online.developmentCounters.hydrationSequences, 1);

  pendingResolvers.shift()({ ok: true });
  await Promise.all([initial, reconnect, manualRefresh]);
  assert.equal(listenerCalls, 1);
  assert.equal(context.hydrationPromises.size, 0, "the settled UID must leave the in-flight registry");

  const laterRefresh = context.hydrateAccount(user, { force: true });
  assert.equal(syncCalls, 2, "force must still start a new hydration after the active one settles");
  pendingResolvers.shift()({ ok: true });
  await laterRefresh;
  assert.equal(listenerCalls, 2);
  assert.equal(context.hydrationPromises.size, 0);
});

test("an auth generation change releases a stale UID promise without letting it delete the returning UID hydration", async () => {
  const source = fs.readFileSync(path.join(repoRoot, "src", "20-firebase-online.js"), "utf8");
  assert.match(source, /onAuthStateChanged\(auth, \(user\) => \{\s*beginAuthTransitionGeneration\(\);/);

  const pendingResolvers = [];
  let syncCalls = 0;
  let listenerCalls = 0;
  let context;
  context = loadHydrationContract({
    syncProfile: (_callSign, generation) => {
      syncCalls++;
      return new Promise((resolve) => pendingResolvers.push({ generation, resolve }));
    },
    isHydrationCurrent: (_uid, generation) => generation === context.authGeneration,
    subscribeWorldRecords: () => { listenerCalls++; }
  });
  const accountA = { uid: "account-a" };

  const staleHydration = context.hydrateAccount(accountA);
  assert.equal(syncCalls, 1);
  assert.equal(context.hydrationPromises.size, 1);
  context.beginAuthTransitionGeneration();
  assert.equal(context.authGeneration, 2);
  assert.equal(context.hydrationPromises.size, 0, "auth transition must release stale registry entries");

  const currentHydration = context.hydrateAccount(accountA);
  assert.equal(syncCalls, 2, "returning Account A must start a current-generation hydration");
  assert.equal(context.hydrationPromises.size, 1);

  const stale = pendingResolvers.shift();
  assert.equal(stale.generation, 1);
  stale.resolve({ ok: true });
  assert.equal((await staleHydration).stale, true);
  assert.equal(context.hydrationPromises.size, 1, "stale finally must preserve the newer Account A promise");
  assert.equal(listenerCalls, 0);

  const current = pendingResolvers.shift();
  assert.equal(current.generation, 2);
  current.resolve({ ok: true });
  assert.equal((await currentHydration).ok, true);
  assert.equal(listenerCalls, 1);
  assert.equal(context.hydrationPromises.size, 0);
});
