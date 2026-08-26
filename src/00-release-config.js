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

const PROGRESSION_AUTHORITY = RELEASE_INTEGRITY_CONFIG.progressionAuthority;
const CLIENT_COMPETITION_WRITES_ENABLED = RELEASE_INTEGRITY_CONFIG.clientCompetitionWritesEnabled;
const VERIFIED_RUN_SESSIONS_ENABLED = RELEASE_INTEGRITY_CONFIG.verifiedRunSessionsEnabled;
const PUBLIC_COMPETITION_MODE = RELEASE_INTEGRITY_CONFIG.competitionMode;

globalThis.RELEASE_INTEGRITY_CONFIG = RELEASE_INTEGRITY_CONFIG;
globalThis.PROGRESSION_AUTHORITY = PROGRESSION_AUTHORITY;
globalThis.CLIENT_COMPETITION_WRITES_ENABLED = CLIENT_COMPETITION_WRITES_ENABLED;
globalThis.VERIFIED_RUN_SESSIONS_ENABLED = VERIFIED_RUN_SESSIONS_ENABLED;
globalThis.PUBLIC_COMPETITION_MODE = PUBLIC_COMPETITION_MODE;
