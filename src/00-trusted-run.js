function createTrustedRunLedger() {
  return { events: [], entityIds: new Set(), lastTick: -1 };
}

function appendTrustedRunEvent(ledger, tickValue, type, detail = {}) {
  if (!ledger || !Array.isArray(ledger.events) || ledger.events.length >= 12000) return false;
  if (!["kill", "boss", "bonus", "damage", "powerup", "ghost", "phase"].includes(type)) return false;
  const tick = Math.floor(Number(tickValue));
  if (!Number.isFinite(tick) || tick < 0 || tick < ledger.lastTick) return false;
  const event = { seq: ledger.events.length + 1, tick, type };
  if (type === "kill" || type === "boss") {
    const entityId = String(detail.entityId || "").replace(/[^A-Za-z0-9_-]/g, "").slice(0, 80);
    const kind = String(detail.kind || "").replace(/[^a-z0-9_]/g, "").slice(0, 40);
    if (!entityId || !kind || ledger.entityIds.has(entityId)) return false;
    ledger.entityIds.add(entityId);
    event.kind = kind;
    event.entityId = entityId;
  } else if (type === "bonus") {
    event.kind = String(detail.kind || "").replace(/[^a-z0-9_]/g, "").slice(0, 40);
  } else if (type === "damage") {
    event.amount = Math.max(1, Math.min(4, Math.floor(Number(detail.amount) || 1)));
  } else if (type === "powerup") {
    event.kind = String(detail.kind || "").replace(/[^a-z0-9_]/g, "").slice(0, 40);
  } else if (type === "phase") {
    event.phase = Math.max(2, Math.min(9999, Math.floor(Number(detail.phase) || 2)));
  }
  ledger.lastTick = tick;
  ledger.events.push(event);
  return true;
}

function trustedRunEvidence(ledger, session) {
  return {
    sessionId: String(session && session.id || "").replace(/[^A-Za-z0-9_-]/g, "").slice(0, 80),
    challenge: String(session && session.challenge || "").slice(0, 128),
    events: ledger && Array.isArray(ledger.events) ? ledger.events.map((event) => ({ ...event })) : []
  };
}

globalThis.createTrustedRunLedger = createTrustedRunLedger;
globalThis.appendTrustedRunEvent = appendTrustedRunEvent;
globalThis.trustedRunEvidence = trustedRunEvidence;
