"use strict";

const fs = require("node:fs");
const path = require("node:path");

const REQUIRED_TRUE_FIELDS = Object.freeze([
  "previewHostingShaVerified",
  "backendShaVerified",
  "accountASignInPassed",
  "accountACallSignPublicationPassed",
  "accountASignOutPassed",
  "accountBIsolationPassed",
  "accountAReentryPersistencePassed",
  "deviceProgressUnchanged",
  "publicIdentitySanitized"
]);
const ALLOWED_TOP_LEVEL_FIELDS = new Set([
  "schemaVersion",
  "releaseSha",
  "previewUrl",
  ...REQUIRED_TRUE_FIELDS,
  "achievementMigration",
  "musicDistributionAuthorization",
  "completedAtUtc"
]);
const MUSIC_FILES = Object.freeze([
  "assets/audio/hangar-bay-seven.mp3",
  "assets/audio/gravitys-edge.mp3"
]);
const SENSITIVE_KEY = /(?:^|_)(?:email|uid|oauth|token|cookie|password|avatar|photo|displayname|google_name)(?:$|_)/i;
const EMAIL_VALUE = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;

function validUtc(value) {
  return typeof value === "string" && value.endsWith("Z") && Number.isFinite(Date.parse(value));
}

function findSensitiveData(value, pathParts = []) {
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index++) {
      const finding = findSensitiveData(value[index], [...pathParts, String(index)]);
      if (finding) return finding;
    }
    return "";
  }
  if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      if (SENSITIVE_KEY.test(key)) return [...pathParts, key].join(".");
      const finding = findSensitiveData(child, [...pathParts, key]);
      if (finding) return finding;
    }
    return "";
  }
  if (typeof value === "string" && EMAIL_VALUE.test(value)) return pathParts.join(".");
  return "";
}

function validateReleaseApproval(approval, expectedSha, expectedPreviewUrl) {
  const errors = [];
  if (!approval || typeof approval !== "object" || Array.isArray(approval)) {
    return { ok: false, errors: ["Approval must be a JSON object."] };
  }
  for (const key of Object.keys(approval)) {
    if (!ALLOWED_TOP_LEVEL_FIELDS.has(key)) errors.push(`Unexpected approval field: ${key}`);
  }
  const sensitivePath = findSensitiveData(approval);
  if (sensitivePath) errors.push(`Sensitive identity data is forbidden in release approval: ${sensitivePath}`);
  if (approval.schemaVersion !== 1) errors.push("Unsupported approval schemaVersion.");
  if (approval.releaseSha !== expectedSha || !/^[0-9a-f]{40}$/i.test(String(approval.releaseSha || ""))) {
    errors.push("Approval release SHA does not match the exact release.");
  }
  if (approval.previewUrl !== expectedPreviewUrl || !/^https:\/\/star-strike-rush--release-[a-f0-9]{12}[-a-z0-9]*\.web\.app$/i.test(String(approval.previewUrl || ""))) {
    errors.push("Approval preview URL does not match the exact staged preview.");
  }
  for (const field of REQUIRED_TRUE_FIELDS) {
    if (approval[field] !== true) errors.push(`Required human release gate is incomplete: ${field}`);
  }
  const migration = approval.achievementMigration || {};
  if (!["dry_run_clean", "applied_verified"].includes(migration.disposition)) {
    errors.push("Achievement migration must be dry_run_clean or applied_verified.");
  }
  for (const field of ["accountCount", "accountsNeedingChange", "sourceUnlockCount", "ignoredInvalidIdCount"]) {
    if (!Number.isInteger(migration[field]) || migration[field] < 0) errors.push(`Invalid achievement migration summary: ${field}`);
  }
  if (!validUtc(migration.completedAtUtc)) errors.push("Achievement migration completion time is required.");
  const music = approval.musicDistributionAuthorization || {};
  if (music.authorizedByProjectOwner !== true) errors.push("Music public-distribution authorization is required from the project owner.");
  if (!validUtc(music.approvedAtUtc)) errors.push("Music authorization UTC time is required.");
  if (JSON.stringify(music.files) !== JSON.stringify(MUSIC_FILES)) {
    errors.push("Music authorization must cover both exact repository MP3 paths.");
  }
  if (!validUtc(approval.completedAtUtc)) errors.push("Approval completion UTC time is required.");
  return { ok: errors.length === 0, errors };
}

function main(argv) {
  const [approvalPath, expectedSha, expectedPreviewUrl] = argv;
  if (!approvalPath || !expectedSha || !expectedPreviewUrl) {
    throw new Error("Usage: node scripts/validate-release-approval.js FILE RELEASE_SHA PREVIEW_URL");
  }
  const absolutePath = path.resolve(approvalPath);
  const approval = JSON.parse(fs.readFileSync(absolutePath, "utf8"));
  const result = validateReleaseApproval(approval, expectedSha, expectedPreviewUrl);
  if (!result.ok) throw new Error(result.errors.join("\n"));
  return {
    ok: true,
    releaseSha: expectedSha,
    previewUrl: expectedPreviewUrl,
    migrationDisposition: approval.achievementMigration.disposition,
    musicAuthorizationRecorded: true,
    completedAtUtc: approval.completedAtUtc
  };
}

if (require.main === module) {
  try {
    process.stdout.write(`${JSON.stringify(main(process.argv.slice(2)))}\n`);
  } catch (error) {
    process.stderr.write(`${error && error.message ? error.message : error}\n`);
    process.exitCode = 1;
  }
}

module.exports = {
  MUSIC_FILES,
  REQUIRED_TRUE_FIELDS,
  findSensitiveData,
  main,
  validateReleaseApproval
};
