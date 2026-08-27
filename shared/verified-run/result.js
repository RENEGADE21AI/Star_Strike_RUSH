"use strict";

(function initializeVerifiedRunResult(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  Object.assign(root, api);
})(globalThis, function buildVerifiedRunResult() {

function deriveVerifiedRunResult(state) {
  if (!state || state.schema !== "SSR_SIM_STATE_V1") throw new TypeError("Canonical simulation state is invalid.");
  if (state.terminal !== true) throw new Error("Verified run result requires terminal canonical state.");
  return Object.freeze({
    runId: state.ticket.runId,
    simRevision: state.simRevision,
    tickCount: state.tick,
    score: state.score,
    phase: state.phase,
    kills: state.stats.kills,
    bosses: state.stats.bosses,
    ghostUses: state.stats.ghostUses,
    pauseUses: state.stats.pauseUses,
    terminalReason: state.terminalReason
  });
}

return Object.freeze({ deriveVerifiedRunResult });
});
