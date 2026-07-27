// Generated from shared/release-integrity.json. Run `npm run generate:shared`.
const RELEASE_INTEGRITY_CONFIG = Object.freeze({
  schemaVersion: 1,
  progressionAuthority: "device_local_preseason",
  clientCompetitionWritesEnabled: false,
  serverCompetitionWritesEnabled: false,
  serverProgressionWritesEnabled: false,
  serverAppCheckEnforced: false
});

const PROGRESSION_AUTHORITY = RELEASE_INTEGRITY_CONFIG.progressionAuthority;
const CLIENT_COMPETITION_WRITES_ENABLED = RELEASE_INTEGRITY_CONFIG.clientCompetitionWritesEnabled;

globalThis.RELEASE_INTEGRITY_CONFIG = RELEASE_INTEGRITY_CONFIG;
globalThis.PROGRESSION_AUTHORITY = PROGRESSION_AUTHORITY;
globalThis.CLIENT_COMPETITION_WRITES_ENABLED = CLIENT_COMPETITION_WRITES_ENABLED;
