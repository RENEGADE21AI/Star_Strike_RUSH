const { HttpsError } = require("firebase-functions/v2/https");

function payloadByteLength(data) {
  try {
    return Buffer.byteLength(JSON.stringify(data == null ? {} : data), "utf8");
  } catch {
    throw new HttpsError("invalid-argument", "Request payload must be valid structured data.");
  }
}

function requirePayloadWithin(data, maximumBytes = 2048) {
  const bytes = payloadByteLength(data);
  if (bytes > maximumBytes) {
    throw new HttpsError("invalid-argument", "Request payload is too large.", {
      maximumBytes,
      receivedBytes: bytes
    });
  }
  return bytes;
}

function throttleDocumentId(endpoint, uid) {
  const safeEndpoint = String(endpoint || "callable").replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 40);
  const safeUid = String(uid || "").replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 128);
  return `${safeEndpoint}_${safeUid}`;
}

async function enforceUidThrottle(db, options) {
  const {
    endpoint,
    uid,
    maximumCalls = 6,
    windowMs = 10000,
    nowMs = Date.now()
  } = options || {};
  const ref = db.doc(`callable_rate_limits/${throttleDocumentId(endpoint, uid)}`);
  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    const previous = snapshot.exists ? snapshot.data() : {};
    const previousStart = Math.max(0, Number(previous.windowStartedAtMs || 0));
    const sameWindow = nowMs - previousStart < windowMs;
    const count = sameWindow ? Math.max(0, Number(previous.count || 0)) : 0;
    if (count >= maximumCalls) {
      throw new HttpsError("resource-exhausted", "Too many account requests. Please wait and try again.", {
        retryAfterMs: Math.max(250, windowMs - (nowMs - previousStart))
      });
    }
    transaction.set(ref, {
      endpoint: String(endpoint || "callable").slice(0, 40),
      uid: String(uid || "").slice(0, 128),
      windowStartedAtMs: sameWindow ? previousStart : nowMs,
      count: count + 1,
      updatedAtMs: nowMs
    }, { merge: true });
  });
}

module.exports = {
  enforceUidThrottle,
  payloadByteLength,
  requirePayloadWithin,
  throttleDocumentId
};
