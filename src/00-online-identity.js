const ACCOUNT_IDENTITY_STORAGE_PREFIX = "star_strike_rush_account_identity_v1:";

function accountIdentityStorageKey(uid) {
  const safeUid = String(uid || "").replace(/[^A-Za-z0-9:_-]/g, "").slice(0, 128);
  return safeUid ? `${ACCOUNT_IDENTITY_STORAGE_PREFIX}${safeUid}` : "";
}

function readAccountIdentityState(storage, uid) {
  const key = accountIdentityStorageKey(uid);
  const fallback = {
    uid: String(uid || ""),
    desiredCallSign: "",
    publishedCallSign: "",
    pending: false,
    status: "idle",
    updatedAtMs: 0
  };
  if (!key || !storage) return fallback;
  try {
    const parsed = JSON.parse(storage.getItem(key) || "null");
    if (!parsed || typeof parsed !== "object") return fallback;
    return {
      uid: String(uid || ""),
      desiredCallSign: typeof normalizeCallSign === "function"
        ? normalizeCallSign(parsed.desiredCallSign || "")
        : String(parsed.desiredCallSign || "").slice(0, 12),
      publishedCallSign: typeof normalizeCallSign === "function"
        ? normalizeCallSign(parsed.publishedCallSign || "")
        : String(parsed.publishedCallSign || "").slice(0, 12),
      pending: parsed.pending === true,
      status: ["idle", "pending", "published", "failed"].includes(parsed.status) ? parsed.status : "idle",
      updatedAtMs: Math.max(0, Math.floor(Number(parsed.updatedAtMs) || 0))
    };
  } catch {
    return fallback;
  }
}

function writeAccountIdentityState(storage, uid, nextState) {
  const key = accountIdentityStorageKey(uid);
  if (!key || !storage) return { ok: false, state: readAccountIdentityState(null, uid) };
  const state = {
    uid: String(uid || ""),
    desiredCallSign: String(nextState.desiredCallSign || "").slice(0, 12),
    publishedCallSign: String(nextState.publishedCallSign || "").slice(0, 12),
    pending: nextState.pending === true,
    status: String(nextState.status || "idle"),
    updatedAtMs: Math.max(0, Math.floor(Number(nextState.updatedAtMs) || Date.now()))
  };
  try {
    storage.setItem(key, JSON.stringify(state));
    return { ok: true, state };
  } catch {
    return { ok: false, state };
  }
}

function savePendingAccountCallSign(storage, uid, callSign) {
  const previous = readAccountIdentityState(storage, uid);
  return writeAccountIdentityState(storage, uid, {
    ...previous,
    desiredCallSign: String(callSign || "").slice(0, 12),
    pending: true,
    status: "pending",
    updatedAtMs: Date.now()
  });
}

function markAccountCallSignPublished(storage, uid, callSign) {
  const previous = readAccountIdentityState(storage, uid);
  return writeAccountIdentityState(storage, uid, {
    ...previous,
    desiredCallSign: String(callSign || previous.desiredCallSign || "").slice(0, 12),
    publishedCallSign: String(callSign || previous.desiredCallSign || "").slice(0, 12),
    pending: false,
    status: "published",
    updatedAtMs: Date.now()
  });
}

function markAccountCallSignFailed(storage, uid) {
  const previous = readAccountIdentityState(storage, uid);
  return writeAccountIdentityState(storage, uid, {
    ...previous,
    pending: true,
    status: "failed",
    updatedAtMs: Date.now()
  });
}

function resolvedAccountCallSign(storage, uid, serverCallSign = "") {
  const account = readAccountIdentityState(storage, uid);
  if (account.pending && account.desiredCallSign) return account.desiredCallSign;
  const confirmedServerCallSign = typeof normalizeCallSign === "function"
    ? normalizeCallSign(serverCallSign || "")
    : String(serverCallSign || "").slice(0, 12);
  if (!confirmedServerCallSign) return account.publishedCallSign;
  const published = markAccountCallSignPublished(storage, uid, confirmedServerCallSign);
  return published.ok ? published.state.publishedCallSign : confirmedServerCallSign;
}

function clearAccountIdentity(onlineState, options = {}) {
  if (!onlineState || typeof onlineState !== "object") return onlineState;
  onlineState.user = null;
  onlineState.publicPilotId = "";
  onlineState.profileCallSign = "";
  onlineState.profileHandle = "";
  onlineState.profileMeta = null;
  onlineState.onlineArchiveMeta = null;
  onlineState.legacyRecord = null;
  onlineState.weeklyLeague = null;
  onlineState.achievements = [];
  onlineState.leaderboard = [];
  onlineState.pendingCallSign = false;
  onlineState.identityService = "signed_out";
  onlineState.accountArchive = "not_loaded";
  onlineState.progressionMode = options.progressionMode || "device_local_preseason";
  onlineState.competitionMode = options.competitiveModeEnabled ? "unknown" : "paused";
  onlineState.networkState = onlineState.ready ? "online" : "offline";
  return onlineState;
}

function accountSyncCallSign(options = {}) {
  return String(options.explicitCallSign || "").trim();
}

function identityErrorKind(error) {
  const code = String(error && error.code || "").toLowerCase().replace(/^firebase:/, "");
  if (code.endsWith("already-exists")) return "handle_taken";
  if (code.endsWith("invalid-argument")) return "invalid_handle";
  if (code.endsWith("failed-precondition")) return "account_conflict";
  if (code.endsWith("unauthenticated")) return "signed_out";
  if (
    code.endsWith("unavailable") ||
    code.endsWith("deadline-exceeded") ||
    code.endsWith("internal") ||
    code.endsWith("resource-exhausted")
  ) return "backend_unavailable";
  return "unknown";
}

function applyIdentityFailure(onlineState, error, fallback, status) {
  if (!onlineState || typeof onlineState !== "object") return onlineState;
  const message = error && error.message ? error.message : fallback;
  onlineState.lastStatus = String(status || "ACCOUNT UPDATE FAILED");
  onlineState.lastError = String(message || "Firebase account service failed.")
    .replace(/^Firebase:\s*/i, "")
    .slice(0, 140);
  return onlineState;
}

function googleAuthShouldRedirect(error) {
  const code = String(error && error.code || "").toLowerCase();
  return [
    "auth/popup-blocked",
    "auth/cancelled-popup-request",
    "auth/operation-not-supported-in-this-environment",
    "auth/web-storage-unsupported"
  ].includes(code);
}

async function initiateGoogleAuthFlow(options = {}) {
  try {
    await options.popup();
    const user = await options.waitForAuthTransition();
    if (user && options.waitForHydration) await options.waitForHydration(user.uid);
    return { ok: true, user };
  } catch (error) {
    if (!googleAuthShouldRedirect(error)) throw error;
    await options.redirect();
    return { ok: true, redirecting: true, user: null };
  }
}

async function restoreGoogleRedirect(getRedirectResult) {
  const result = await getRedirectResult();
  return result && result.user ? { user: result.user } : { user: null };
}

globalThis.clearAccountIdentity = clearAccountIdentity;
globalThis.accountSyncCallSign = accountSyncCallSign;
globalThis.identityErrorKind = identityErrorKind;
globalThis.applyIdentityFailure = applyIdentityFailure;
globalThis.accountIdentityStorageKey = accountIdentityStorageKey;
globalThis.readAccountIdentityState = readAccountIdentityState;
globalThis.savePendingAccountCallSign = savePendingAccountCallSign;
globalThis.markAccountCallSignPublished = markAccountCallSignPublished;
globalThis.markAccountCallSignFailed = markAccountCallSignFailed;
globalThis.resolvedAccountCallSign = resolvedAccountCallSign;
globalThis.googleAuthShouldRedirect = googleAuthShouldRedirect;
globalThis.initiateGoogleAuthFlow = initiateGoogleAuthFlow;
globalThis.restoreGoogleRedirect = restoreGoogleRedirect;
