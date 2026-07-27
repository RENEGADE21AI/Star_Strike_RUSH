"use strict";

const {
  PROGRESSION_AUTHORITY,
  SERVER_APP_CHECK_ENFORCED,
  SERVER_COMPETITION_WRITES_ENABLED,
  SERVER_PROGRESSION_WRITES_ENABLED
} = require("./release-config");

function validateReleaseIdentity(identity) {
  if (!identity || typeof identity !== "object") throw new Error("Backend release identity is missing.");
  if (!/^[0-9a-f]{40}$/i.test(String(identity.commitSha || ""))) {
    throw new Error("Backend release identity commit SHA is invalid.");
  }
  if (!/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(String(identity.packageVersion || ""))) {
    throw new Error("Backend release identity package version is invalid.");
  }
  if (identity.progressionAuthority !== PROGRESSION_AUTHORITY) {
    throw new Error("Backend release identity progression authority differs from server configuration.");
  }
  if (identity.competitionWritesEnabled !== SERVER_COMPETITION_WRITES_ENABLED) {
    throw new Error("Backend release identity competition mode differs from server configuration.");
  }
  if (identity.serverProgressionWritesEnabled !== SERVER_PROGRESSION_WRITES_ENABLED) {
    throw new Error("Backend release identity progression-write mode differs from server configuration.");
  }
  if (identity.appCheckEnforced !== SERVER_APP_CHECK_ENFORCED) {
    throw new Error("Backend release identity App Check mode differs from server configuration.");
  }
  return Object.freeze({
    commitSha: String(identity.commitSha).toLowerCase(),
    packageVersion: String(identity.packageVersion),
    progressionAuthority: identity.progressionAuthority,
    competitionWritesEnabled: identity.competitionWritesEnabled,
    serverProgressionWritesEnabled: identity.serverProgressionWritesEnabled,
    appCheckEnforced: identity.appCheckEnforced
  });
}

function developmentReleaseIdentity() {
  return Object.freeze({
    commitSha: "development",
    packageVersion: "development",
    progressionAuthority: PROGRESSION_AUTHORITY,
    competitionWritesEnabled: SERVER_COMPETITION_WRITES_ENABLED,
    serverProgressionWritesEnabled: SERVER_PROGRESSION_WRITES_ENABLED,
    appCheckEnforced: SERVER_APP_CHECK_ENFORCED
  });
}

function loadBackendReleaseIdentity() {
  try {
    return validateReleaseIdentity(require("./release-identity.generated"));
  } catch (error) {
    if (error && error.code !== "MODULE_NOT_FOUND") throw error;
    return developmentReleaseIdentity();
  }
}

const BACKEND_RELEASE_IDENTITY = loadBackendReleaseIdentity();

module.exports = {
  BACKEND_RELEASE_IDENTITY,
  developmentReleaseIdentity,
  loadBackendReleaseIdentity,
  validateReleaseIdentity
};
