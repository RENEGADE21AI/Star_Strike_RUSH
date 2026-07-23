const { HttpsError } = require("firebase-functions/v2/https");

const COMPETITIVE_MODE_ENABLED = false;
const HANDLE_MIN_LENGTH = 3;
const HANDLE_MAX_LENGTH = 16;
const RESERVED_HANDLES = new Set([
  "admin", "administrator", "codex", "firebase", "moderator", "official",
  "renegade21ai", "starstrike", "starstrikerush", "support", "system"
]);

function normalizeHandle(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/^@+/, "")
    .replace(/[\s-]+/g, "_")
    .replace(/[^a-z0-9_]/g, "")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, HANDLE_MAX_LENGTH);
}

function validateHandle(value) {
  const handle = normalizeHandle(value);
  if (handle.length < HANDLE_MIN_LENGTH) return { ok: false, handle, reason: "too_short" };
  if (!/^[a-z][a-z0-9_]*$/.test(handle)) return { ok: false, handle, reason: "invalid_format" };
  if (RESERVED_HANDLES.has(handle)) return { ok: false, handle, reason: "reserved" };
  return { ok: true, handle, reason: "" };
}

function weekWindow(timestamp = Date.now()) {
  const start = new Date(Number(timestamp));
  const utcDay = start.getUTCDay() || 7;
  start.setUTCDate(start.getUTCDate() - utcDay + 1);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
  return {
    id: `week_${start.getUTCFullYear()}_${String(start.getUTCMonth() + 1).padStart(2, "0")}_${String(start.getUTCDate()).padStart(2, "0")}`,
    startMs: start.getTime(),
    endMs: end.getTime()
  };
}

function performanceBand(bestScore = 0) {
  const score = Math.max(0, Number(bestScore) || 0);
  if (score >= 150000) return 4;
  if (score >= 60000) return 3;
  if (score >= 20000) return 2;
  if (score >= 5000) return 1;
  return 0;
}

function divisionName(band = 0) {
  return ["ROOKIE", "BRONZE", "SILVER", "GOLD", "NOVA"][Math.max(0, Math.min(4, Math.floor(Number(band) || 0)))];
}

function publicLeagueMember(raw = {}) {
  return {
    uid: String(raw.uid || "").slice(0, 128),
    callSign: String(raw.callSign || "PILOT").toUpperCase().replace(/[^A-Z0-9_]/g, "").slice(0, 12),
    handle: normalizeHandle(raw.handle),
    weeklyPoints: Math.max(0, Math.min(999999999, Math.floor(Number(raw.weeklyPoints) || 0)))
  };
}

function requireCompetitionEnabled() {
  if (!COMPETITIVE_MODE_ENABLED) {
    throw new HttpsError("failed-precondition", "Public competition is paused during preseason hardening.");
  }
}

function competitionWritesEnabled() {
  return COMPETITIVE_MODE_ENABLED;
}

module.exports = {
  COMPETITIVE_MODE_ENABLED,
  HANDLE_MAX_LENGTH,
  HANDLE_MIN_LENGTH,
  divisionName,
  competitionWritesEnabled,
  normalizeHandle,
  performanceBand,
  publicLeagueMember,
  requireCompetitionEnabled,
  validateHandle,
  weekWindow
};
