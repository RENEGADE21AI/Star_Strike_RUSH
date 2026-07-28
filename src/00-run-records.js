function isNewRunRecord(runStartingHighScore, runScore, runMode = "standard") {
  const allowed = typeof runModeAllowsProgression === "function"
    ? runModeAllowsProgression(runMode)
    : runMode === "standard";
  if (!allowed) return false;
  return Math.max(0, Number(runScore) || 0) > Math.max(0, Number(runStartingHighScore) || 0);
}

function highScoreAfterRun(existingHighScore, runScore, runMode = "standard") {
  const existing = Math.max(0, Math.floor(Number(existingHighScore) || 0));
  const allowed = typeof runModeAllowsProgression === "function"
    ? runModeAllowsProgression(runMode)
    : runMode === "standard";
  if (!allowed) return existing;
  return Math.max(existing, Math.max(0, Math.floor(Number(runScore) || 0)));
}

globalThis.isNewRunRecord = isNewRunRecord;
globalThis.highScoreAfterRun = highScoreAfterRun;
