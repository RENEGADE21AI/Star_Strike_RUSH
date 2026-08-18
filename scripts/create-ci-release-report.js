"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { validateReleaseIdentity } = require("../functions/release-identity");

function createCiReleaseReport(options = {}) {
  const releaseSha = String(options.releaseSha || "").toLowerCase();
  if (!/^[0-9a-f]{40}$/.test(releaseSha)) throw new Error("CI release SHA must be a full Git commit.");
  const version = JSON.parse(fs.readFileSync(path.resolve(options.versionPath), "utf8"));
  const generatedIdentity = require(path.resolve(options.backendIdentityPath));
  const backend = validateReleaseIdentity(generatedIdentity);
  if (version.commitSha !== releaseSha) throw new Error("Built Hosting version SHA differs from CI release SHA.");
  if (backend.commitSha !== releaseSha) throw new Error("Generated backend SHA differs from CI release SHA.");
  return {
    schemaVersion: 1,
    stage: "ci_verified_not_deployed",
    releaseSha,
    hostingBuildShaVerified: true,
    backendMarkerShaVerified: true,
    progressionAuthority: backend.progressionAuthority,
    competitionMode: backend.competitionMode,
    competitionWritesEnabled: backend.competitionWritesEnabled,
    serverProgressionWritesEnabled: backend.serverProgressionWritesEnabled,
    appCheckEnforced: backend.appCheckEnforced,
    firebaseDeploymentPerformed: false,
    humanApprovalRequired: true
  };
}

function main(argv) {
  const [releaseSha, versionPath, backendIdentityPath, outputPath] = argv;
  if (!releaseSha || !versionPath || !backendIdentityPath || !outputPath) {
    throw new Error("Usage: node scripts/create-ci-release-report.js SHA VERSION_JSON BACKEND_MODULE OUTPUT_JSON");
  }
  const report = createCiReleaseReport({ releaseSha, versionPath, backendIdentityPath });
  const resolvedOutput = path.resolve(outputPath);
  fs.mkdirSync(path.dirname(resolvedOutput), { recursive: true });
  fs.writeFileSync(resolvedOutput, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  return report;
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
  createCiReleaseReport,
  main
};
