const CALL_SIGN_MAX_LENGTH = 12;
const CALL_SIGN_MIN_LENGTH = 3;

function normalizeCallSign(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_")
    .replace(/[^A-Z0-9_]/g, "")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, CALL_SIGN_MAX_LENGTH);
}

function validateCallSign(value) {
  const callSign = normalizeCallSign(value);
  if (!callSign) return { ok: false, callSign: "", message: "CALL SIGN REQUIRED" };
  if (callSign.length < CALL_SIGN_MIN_LENGTH) return { ok: false, callSign, message: `USE ${CALL_SIGN_MIN_LENGTH}-${CALL_SIGN_MAX_LENGTH} CHARACTERS` };
  return { ok: true, callSign, message: "PILOT ID SAVED" };
}

function neutralPilotCallSign(seed = "LOCAL") {
  const text = String(seed || "LOCAL");
  let hash = 2166136261;
  for (let index = 0; index < text.length; index++) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `PILOT_${(hash >>> 0).toString(36).toUpperCase().padStart(5, "0").slice(-5)}`;
}

function publicPilotRecord(raw = {}, fallbackSeed = "PUBLIC") {
  const validation = validateCallSign(raw.callSign);
  return {
    uid: String(raw.uid || "").slice(0, 128),
    callSign: validation.ok ? validation.callSign : neutralPilotCallSign(raw.uid || fallbackSeed),
    bestScore: Math.max(0, Math.floor(Number(raw.bestScore) || 0)),
    phase: Math.max(1, Math.floor(Number(raw.phase) || 1)),
    achievementsCount: Math.max(0, Math.floor(Number(raw.achievementsCount) || 0)),
    glory: Math.max(0, Math.floor(Number(raw.glory) || 0)),
    gloryRank: String(raw.gloryRank || "Rookie Pilot").slice(0, 32),
    gloryRankIndex: Math.max(0, Math.min(9, Math.floor(Number(raw.gloryRankIndex) || 0))),
    seasonTier: Math.max(1, Math.min(50, Math.floor(Number(raw.seasonTier) || 1)))
  };
}

globalThis.normalizeCallSign = normalizeCallSign;
globalThis.validateCallSign = validateCallSign;
globalThis.neutralPilotCallSign = neutralPilotCallSign;
globalThis.publicPilotRecord = publicPilotRecord;

