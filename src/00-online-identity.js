function clearAccountIdentity(onlineState, options = {}) {
  if (!onlineState || typeof onlineState !== "object") return onlineState;
  onlineState.user = null;
  onlineState.profileCallSign = "";
  onlineState.profileHandle = "";
  onlineState.profileMeta = null;
  onlineState.weeklyLeague = null;
  onlineState.achievements = [];
  onlineState.leaderboard = [];
  onlineState.competitionBackend = options.competitiveModeEnabled ? "unknown" : "disabled";
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

globalThis.clearAccountIdentity = clearAccountIdentity;
globalThis.accountSyncCallSign = accountSyncCallSign;
globalThis.identityErrorKind = identityErrorKind;
