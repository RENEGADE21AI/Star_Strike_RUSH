const PUBLIC_HANDLE_MIN_LENGTH = 3;
const PUBLIC_HANDLE_MAX_LENGTH = 16;
// Browser runs are not cheat-proof. Keep public competition scoring disabled until
// server-issued run sessions, App Check, and abuse controls are deployed together.
const COMPETITIVE_MODE_ENABLED = false;
const RESERVED_PUBLIC_HANDLES = new Set([
  "admin", "administrator", "codex", "firebase", "moderator", "official",
  "renegade21ai", "starstrike", "starstrikerush", "support", "system"
]);

function normalizePublicHandle(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/^@+/, "")
    .replace(/[\s-]+/g, "_")
    .replace(/[^a-z0-9_]/g, "")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, PUBLIC_HANDLE_MAX_LENGTH);
}

function validatePublicHandle(value) {
  const handle = normalizePublicHandle(value);
  if (handle.length < PUBLIC_HANDLE_MIN_LENGTH) {
    return { ok: false, handle, message: `USE ${PUBLIC_HANDLE_MIN_LENGTH}-${PUBLIC_HANDLE_MAX_LENGTH} CHARACTERS` };
  }
  if (!/^[a-z][a-z0-9_]*$/.test(handle)) {
    return { ok: false, handle, message: "START WITH A LETTER" };
  }
  if (RESERVED_PUBLIC_HANDLES.has(handle)) {
    return { ok: false, handle, message: "HANDLE IS RESERVED" };
  }
  return { ok: true, handle, message: "HANDLE READY" };
}

function weeklyCompetitionId(timestamp = Date.now()) {
  const date = new Date(Number(timestamp));
  const utcDay = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() - utcDay + 1);
  date.setUTCHours(0, 0, 0, 0);
  return `week_${date.getUTCFullYear()}_${String(date.getUTCMonth() + 1).padStart(2, "0")}_${String(date.getUTCDate()).padStart(2, "0")}`;
}

function leagueBandForPerformance(bestScore = 0) {
  const score = Math.max(0, Number(bestScore) || 0);
  if (score >= 150000) return 4;
  if (score >= 60000) return 3;
  if (score >= 20000) return 2;
  if (score >= 5000) return 1;
  return 0;
}

function leagueDivisionName(band = 0) {
  return ["ROOKIE", "BRONZE", "SILVER", "GOLD", "NOVA"][Math.max(0, Math.min(4, Math.floor(Number(band) || 0)))];
}

globalThis.normalizePublicHandle = normalizePublicHandle;
globalThis.validatePublicHandle = validatePublicHandle;
globalThis.weeklyCompetitionId = weeklyCompetitionId;
globalThis.leagueBandForPerformance = leagueBandForPerformance;
globalThis.leagueDivisionName = leagueDivisionName;
globalThis.COMPETITIVE_MODE_ENABLED = COMPETITIVE_MODE_ENABLED;
