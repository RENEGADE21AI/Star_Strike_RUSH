function isNewRunRecord(runStartingHighScore, runScore, runMode = "standard") {
  if (runMode === "debug") return false;
  return Math.max(0, Number(runScore) || 0) > Math.max(0, Number(runStartingHighScore) || 0);
}

function highScoreAfterRun(existingHighScore, runScore, runMode = "standard") {
  const existing = Math.max(0, Math.floor(Number(existingHighScore) || 0));
  if (runMode === "debug") return existing;
  return Math.max(existing, Math.max(0, Math.floor(Number(runScore) || 0)));
}

globalThis.isNewRunRecord = isNewRunRecord;
globalThis.highScoreAfterRun = highScoreAfterRun;
