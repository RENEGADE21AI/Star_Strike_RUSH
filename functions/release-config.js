"use strict";

// Generated from shared/release-integrity.json. Run `npm run generate:shared`.
const RELEASE_INTEGRITY_CONFIG = Object.freeze({
  schemaVersion: 1,
  progressionAuthority: "automatic_best_account_or_device",
  competitionMode: "paused_pending_authoritative_verifier",
  clientCompetitionWritesEnabled: false,
  serverCompetitionWritesEnabled: false,
  serverProgressionWritesEnabled: false,
  verifiedRunSessionsEnabled: false,
  serverAppCheckEnforced: false
});

module.exports = {
  RELEASE_INTEGRITY_CONFIG,
  PROGRESSION_AUTHORITY: RELEASE_INTEGRITY_CONFIG.progressionAuthority,
  PUBLIC_COMPETITION_MODE: RELEASE_INTEGRITY_CONFIG.competitionMode,
  SERVER_APP_CHECK_ENFORCED: RELEASE_INTEGRITY_CONFIG.serverAppCheckEnforced,
  SERVER_COMPETITION_WRITES_ENABLED: RELEASE_INTEGRITY_CONFIG.serverCompetitionWritesEnabled,
  SERVER_PROGRESSION_WRITES_ENABLED: RELEASE_INTEGRITY_CONFIG.serverProgressionWritesEnabled,
  VERIFIED_RUN_SESSIONS_ENABLED: RELEASE_INTEGRITY_CONFIG.verifiedRunSessionsEnabled
};
