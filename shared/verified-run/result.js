"use strict";

(function initializeVerifiedRunResult(root, factory) {
  const constants = typeof module === "object" && module.exports
    ? require("./constants")
    : root.StarStrikeVerifiedRunConstants;
  const api = factory(constants);
  if (typeof module === "object" && module.exports) module.exports = api;
  Object.assign(root, api);
})(globalThis, function buildVerifiedRunResult(constants) {

if (!constants) throw new Error("Verified run constants must load before result derivation.");

const VERIFIED_RESULT_SCHEMA = "SSR_VERIFIED_RESULT_V1";
const VERIFIED_WORKER_RESULT_SCHEMA = "SSR_VERIFIED_WORKER_RESULT_V1";

function digestValue(value, bytes, label) {
  const text = String(value || "").toLowerCase();
  if (!new RegExp(`^[a-f0-9]{${bytes * 2}}$`).test(text)) {
    throw new TypeError(`${label} must be ${bytes * 8}-bit hexadecimal.`);
  }
  return text;
}

function deriveVerifiedRunResult(state) {
  if (!state || state.schema !== "SSR_SIM_STATE_V1") throw new TypeError("Canonical simulation state is invalid.");
  if (state.terminal !== true) throw new Error("Verified run result requires terminal canonical state.");
  const achievementFacts = Object.freeze({
    score: state.score,
    phase: state.phase,
    kills: state.stats.kills,
    bosses: state.stats.bosses,
    powerups: state.stats.powerups,
    ghostUses: state.stats.ghostUses,
    dashUses: state.stats.dashUses,
    realmHops: state.stats.realmHops,
    pauseUses: state.stats.pauseUses,
    damageTaken: state.stats.damageTaken,
    highestCombo: state.stats.highestCombo,
    durationTicks: state.tick
  });
  return Object.freeze({
    schema: VERIFIED_RESULT_SCHEMA,
    runId: state.ticket.runId,
    simRevision: state.simRevision,
    rulesRevision: state.ticket.rulesRevision,
    contentRevision: state.ticket.contentRevision,
    inputRevision: state.ticket.inputRevision || constants.INPUT_REVISION,
    buildSha: state.ticket.buildSha,
    weekId: state.ticket.weekId || null,
    tickCount: state.tick,
    durationTicks: state.tick,
    score: state.score,
    phase: state.phase,
    kills: state.stats.kills,
    bosses: state.stats.bosses,
    powerups: state.stats.powerups,
    ghostUses: state.stats.ghostUses,
    dashUses: state.stats.dashUses,
    realmHops: state.stats.realmHops,
    pauseUses: state.stats.pauseUses,
    damageTaken: state.stats.damageTaken,
    highestCombo: state.stats.highestCombo,
    gloryAmount: Math.floor(state.score / 10),
    achievementFacts,
    terminalReason: state.terminalReason
  });
}

function deriveVerifiedRunWorkerResult(state, evidence = {}) {
  const result = deriveVerifiedRunResult(state);
  return Object.freeze({
    ...result,
    schema: VERIFIED_WORKER_RESULT_SCHEMA,
    inputDigest: digestValue(evidence.inputDigest, 32, "Worker input digest"),
    finalStateDigest: digestValue(evidence.finalStateDigest, 16, "Worker final state digest"),
    verifierBuildDigest: digestValue(evidence.verifierBuildDigest, 32, "Worker verifier build digest")
  });
}

return Object.freeze({
  VERIFIED_RESULT_SCHEMA,
  VERIFIED_WORKER_RESULT_SCHEMA,
  deriveVerifiedRunResult,
  deriveVerifiedRunWorkerResult
});
});
