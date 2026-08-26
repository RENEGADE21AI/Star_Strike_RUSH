const assert = require("node:assert/strict");
const { execFile, execFileSync, spawnSync } = require("node:child_process");
const fs = require("node:fs");
const http = require("node:http");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { promisify } = require("node:util");

const repoRoot = path.resolve(__dirname, "..");
const releasePlanScript = path.join(repoRoot, "scripts", "release-plan.js");
const approvalValidatorScript = path.join(repoRoot, "scripts", "validate-release-approval.js");
const approvalTemplatePath = path.join(repoRoot, "release-approval.template.json");
const backendGeneratorScript = path.join(repoRoot, "scripts", "generate-backend-release.js");
const backendReleaseModule = path.join(repoRoot, "functions", "release-identity.js");
const smokeScript = path.join(repoRoot, "scripts", "smoke-release.js");
const ciReportScript = path.join(repoRoot, "scripts", "create-ci-release-report.js");
const releaseSha = "a".repeat(40);
const previewUrl = `https://star-strike-rush--release-${releaseSha.slice(0, 12)}-fixture.web.app`;

function git(cwd, ...args) {
  return execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
}

test("release planning compares the complete production range including rules and indexes", () => {
  assert.equal(fs.existsSync(releasePlanScript), true, "release-plan.js must exist");
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), "star-strike-release-plan-"));
  try {
    git(fixture, "init", "--quiet");
    git(fixture, "config", "user.email", "release-test@example.invalid");
    git(fixture, "config", "user.name", "Release Test");
    fs.writeFileSync(path.join(fixture, "README.md"), "baseline\n");
    git(fixture, "add", "README.md");
    git(fixture, "commit", "--quiet", "-m", "baseline");
    const baselineSha = git(fixture, "rev-parse", "HEAD");

    fs.writeFileSync(path.join(fixture, "firestore.rules"), "rules_version = '2';\n");
    fs.writeFileSync(path.join(fixture, "firestore.indexes.json"), "{\"indexes\":[]}\n");
    git(fixture, "add", "firestore.rules", "firestore.indexes.json");
    git(fixture, "commit", "--quiet", "-m", "change backend policy");

    fs.writeFileSync(path.join(fixture, "README.md"), "release docs\n");
    git(fixture, "add", "README.md");
    git(fixture, "commit", "--quiet", "-m", "finish with docs");
    const releaseSha = git(fixture, "rev-parse", "HEAD");

    const result = spawnSync(process.execPath, [
      releasePlanScript,
      baselineSha,
      releaseSha,
      "--repo",
      fixture
    ], { encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
    const plan = JSON.parse(result.stdout);
    assert.equal(plan.baselineSha, baselineSha);
    assert.equal(plan.releaseSha, releaseSha);
    assert.equal(plan.components.rules, true);
    assert.equal(plan.components.indexes, true);
    assert.ok(plan.changedPaths.includes("firestore.rules"));
    assert.ok(plan.changedPaths.includes("firestore.indexes.json"));
  } finally {
    fs.rmSync(fixture, { recursive: true, force: true });
  }
});

test("production approval rejects missing human gates, music authorization, migration, and identity data", () => {
  assert.equal(fs.existsSync(approvalValidatorScript), true, "approval validator must exist");
  assert.equal(fs.existsSync(approvalTemplatePath), true, "approval template must exist");
  const template = JSON.parse(fs.readFileSync(approvalTemplatePath, "utf8"));
  assert.equal(template.schemaVersion, 2);
  assert.deepEqual(template.accountSmokeWaiver, {
    disposition: "not_waived",
    authorizedByProjectOwner: false,
    approvedAtUtc: ""
  });
  assert.equal(template.musicDistributionAuthorization.authorizedByProjectOwner, false);
  assert.deepEqual(template.musicDistributionAuthorization.files, [
    "assets/audio/hangar-bay-seven.mp3",
    "assets/audio/gravitys-edge.mp3"
  ]);

  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), "star-strike-approval-"));
  try {
    const approvalPath = path.join(fixture, "release-approval.local.json");
    const incomplete = {
      ...template,
      releaseSha,
      previewUrl
    };
    fs.writeFileSync(approvalPath, JSON.stringify(incomplete));
    let result = spawnSync(process.execPath, [
      approvalValidatorScript,
      approvalPath,
      releaseSha,
      previewUrl
    ], { encoding: "utf8" });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /music|account|migration/i);

    fs.writeFileSync(approvalPath, JSON.stringify({ ...incomplete, schemaVersion: 1 }));
    result = spawnSync(process.execPath, [
      approvalValidatorScript,
      approvalPath,
      releaseSha,
      previewUrl
    ], { encoding: "utf8" });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /schemaVersion/i);

    const complete = {
      ...incomplete,
      previewHostingShaVerified: true,
      backendShaVerified: true,
      accountASignInPassed: true,
      accountACallSignPublicationPassed: true,
      accountASignOutPassed: true,
      accountBIsolationPassed: true,
      accountAReentryPersistencePassed: true,
      deviceProgressUnchanged: true,
      publicIdentitySanitized: true,
      achievementMigration: {
        disposition: "dry_run_clean",
        accountCount: 2,
        accountsNeedingChange: 0,
        sourceUnlockCount: 4,
        ignoredInvalidIdCount: 0,
        completedAtUtc: "2026-07-27T16:00:00.000Z"
      },
      musicDistributionAuthorization: {
        ...template.musicDistributionAuthorization,
        authorizedByProjectOwner: true,
        approvedAtUtc: "2026-07-27T16:01:00.000Z"
      },
      completedAtUtc: "2026-07-27T16:02:00.000Z"
    };
    fs.writeFileSync(approvalPath, JSON.stringify(complete));
    result = spawnSync(process.execPath, [
      approvalValidatorScript,
      approvalPath,
      releaseSha,
      previewUrl
    ], { encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
    const passedResult = JSON.parse(result.stdout);
    assert.equal(passedResult.accountSmokeDisposition, "passed");
    assert.equal(passedResult.accountSmokeTestsPassed, true);
    assert.equal(passedResult.accountSmokeOwnerWaived, false);

    const ownerWaived = {
      ...complete,
      accountASignInPassed: false,
      accountACallSignPublicationPassed: false,
      accountASignOutPassed: false,
      accountBIsolationPassed: false,
      accountAReentryPersistencePassed: false,
      deviceProgressUnchanged: false,
      publicIdentitySanitized: false,
      accountSmokeWaiver: {
        disposition: "owner_waived",
        authorizedByProjectOwner: true,
        approvedAtUtc: "2026-08-08T20:00:00.000Z"
      }
    };
    fs.writeFileSync(approvalPath, JSON.stringify(ownerWaived));
    result = spawnSync(process.execPath, [
      approvalValidatorScript,
      approvalPath,
      releaseSha,
      previewUrl
    ], { encoding: "utf8" });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /explicit release command switch/i);

    result = spawnSync(process.execPath, [
      approvalValidatorScript,
      approvalPath,
      releaseSha,
      previewUrl,
      "--accept-owner-account-smoke-waiver"
    ], { encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
    const waivedResult = JSON.parse(result.stdout);
    assert.equal(waivedResult.accountSmokeDisposition, "owner_waived");
    assert.equal(waivedResult.accountSmokeTestsPassed, false);
    assert.equal(waivedResult.accountSmokeOwnerWaived, true);

    fs.writeFileSync(approvalPath, JSON.stringify({
      ...ownerWaived,
      backendShaVerified: false
    }));
    result = spawnSync(process.execPath, [
      approvalValidatorScript,
      approvalPath,
      releaseSha,
      previewUrl,
      "--accept-owner-account-smoke-waiver"
    ], { encoding: "utf8" });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /automated release gate.*backendShaVerified/i);

    fs.writeFileSync(approvalPath, JSON.stringify({
      ...ownerWaived,
      accountASignInPassed: true
    }));
    result = spawnSync(process.execPath, [
      approvalValidatorScript,
      approvalPath,
      releaseSha,
      previewUrl,
      "--accept-owner-account-smoke-waiver"
    ], { encoding: "utf8" });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /leave unverified evidence false/i);

    fs.writeFileSync(approvalPath, JSON.stringify({
      ...ownerWaived,
      accountSmokeWaiver: {
        ...ownerWaived.accountSmokeWaiver,
        note: "untested"
      }
    }));
    result = spawnSync(process.execPath, [
      approvalValidatorScript,
      approvalPath,
      releaseSha,
      previewUrl,
      "--accept-owner-account-smoke-waiver"
    ], { encoding: "utf8" });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Unexpected account-smoke waiver field/i);

    result = spawnSync(process.execPath, [
      approvalValidatorScript,
      approvalPath,
      releaseSha,
      previewUrl,
      "--accept-owner-account-smoke-waiver",
      "--unexpected"
    ], { encoding: "utf8" });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Unexpected extra approval arguments/i);

    fs.writeFileSync(approvalPath, JSON.stringify({ ...complete, email: "pilot@example.test" }));
    result = spawnSync(process.execPath, [
      approvalValidatorScript,
      approvalPath,
      releaseSha,
      previewUrl
    ], { encoding: "utf8" });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /identity|sensitive|email/i);
  } finally {
    fs.rmSync(fixture, { recursive: true, force: true });
  }
});

test("backend release identity is generated from the exact release SHA and exposes only safe modes", () => {
  assert.equal(fs.existsSync(backendGeneratorScript), true, "backend release generator must exist");
  assert.equal(fs.existsSync(backendReleaseModule), true, "backend release identity module must exist");
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), "star-strike-backend-release-"));
  try {
    const outputPath = path.join(fixture, "release-identity.generated.js");
    const result = spawnSync(process.execPath, [
      backendGeneratorScript,
      "--sha",
      releaseSha,
      "--output",
      outputPath
    ], { cwd: repoRoot, encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
    const generated = require(outputPath);
    assert.deepEqual(generated, {
      commitSha: releaseSha,
      packageVersion: "1.1.0",
      progressionAuthority: "automatic_best_account_or_device",
      competitionMode: "paused_pending_authoritative_verifier",
      competitionWritesEnabled: false,
      serverProgressionWritesEnabled: false,
      appCheckEnforced: false
    });
    const { validateReleaseIdentity } = require(backendReleaseModule);
    assert.deepEqual(validateReleaseIdentity(generated), generated);
    assert.throws(
      () => validateReleaseIdentity({ ...generated, commitSha: "stale" }),
      /commit SHA/i
    );
  } finally {
    fs.rmSync(fixture, { recursive: true, force: true });
  }
});

test("CI release report proves build/marker parity without claiming deployment", () => {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), "star-strike-ci-report-"));
  try {
    const versionPath = path.join(fixture, "version.json");
    const backendPath = path.join(fixture, "release-identity.generated.js");
    const outputPath = path.join(fixture, "staged-release-report.json");
    fs.writeFileSync(versionPath, JSON.stringify({
      commitSha: releaseSha,
      progressionMode: "automatic_best_account_or_device",
      competitionMode: "paused_pending_authoritative_verifier"
    }));
    let result = spawnSync(process.execPath, [
      backendGeneratorScript,
      "--sha",
      releaseSha,
      "--output",
      backendPath
    ], { cwd: repoRoot, encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
    result = spawnSync(process.execPath, [
      ciReportScript,
      releaseSha,
      versionPath,
      backendPath,
      outputPath
    ], { cwd: repoRoot, encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
    const report = JSON.parse(fs.readFileSync(outputPath, "utf8"));
    assert.equal(report.releaseSha, releaseSha);
    assert.equal(report.hostingBuildShaVerified, true);
    assert.equal(report.backendMarkerShaVerified, true);
    assert.equal(report.competitionMode, "paused_pending_authoritative_verifier");
    assert.equal(report.firebaseDeploymentPerformed, false);
    assert.equal(report.humanApprovalRequired, true);
    assert.equal("email" in report, false);
    assert.equal("uid" in report, false);
  } finally {
    fs.rmSync(fixture, { recursive: true, force: true });
  }
});

test("release smoke fails a stale backend SHA even when paused callables return the right status", async () => {
  let backendSha = "b".repeat(40);
  const securityHeaders = {
    "cache-control": "no-store",
    "content-security-policy": "default-src 'self'; frame-ancestors 'none'",
    "cross-origin-opener-policy": "same-origin-allow-popups",
    "cross-origin-resource-policy": "same-site",
    "permissions-policy": "camera=()",
    "referrer-policy": "strict-origin-when-cross-origin",
    "x-content-type-options": "nosniff"
  };
  const server = http.createServer((request, response) => {
    if (request.url.startsWith("/version.json")) {
      response.writeHead(200, { ...securityHeaders, "content-type": "application/json" });
      response.end(JSON.stringify({
        commitSha: releaseSha,
        progressionMode: "automatic_best_account_or_device",
        competitionMode: "paused_pending_authoritative_verifier"
      }));
      return;
    }
    if (request.url === "/__/firebase/init.json") {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({
        apiKey: "fixture-browser-key",
        projectId: "star-strike-rush"
      }));
      return;
    }
    if (request.url.startsWith("/v1/accounts:createAuthUri")) {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({ authUri: "https://accounts.google.com/o/oauth2/auth" }));
      return;
    }
    if ([
      "/syncPilotProfile", "/claimPilotHandle", "/listWeeklyLeagues", "/joinWeeklyLeague",
      "/startVerifiedRun", "/submitRunReceipt", "/chooseProgressionSource",
      "/requestAccountDeletion", "/cancelAccountDeletion", "/claimSeasonReward"
    ].some((prefix) => request.url.startsWith(prefix))) {
      const retired = request.url.startsWith("/claimSeasonReward");
      const competitionPaused = ["/listWeeklyLeagues", "/joinWeeklyLeague", "/startVerifiedRun", "/submitRunReceipt"]
        .some((prefix) => request.url.startsWith(prefix));
      response.writeHead(400, { "content-type": "application/json" });
      response.end(JSON.stringify({
        error: {
          status: retired || competitionPaused ? "FAILED_PRECONDITION" : "UNAUTHENTICATED",
          message: retired
            ? "Season Road is retired."
            : (competitionPaused ? "Public record writes are paused pending an authoritative run verifier." : "Sign in is required."),
          details: {
            release: {
              commitSha: backendSha,
              packageVersion: "1.1.0",
              progressionAuthority: "automatic_best_account_or_device",
              competitionMode: "paused_pending_authoritative_verifier",
              competitionWritesEnabled: false,
              serverProgressionWritesEnabled: false,
              appCheckEnforced: false
            }
          }
        }
      }));
      return;
    }
    if (request.url === "/" || request.url.startsWith("/?")) {
      response.writeHead(200, { ...securityHeaders, "content-type": "text/html" });
      response.end("<!doctype html><title>Star Strike RUSH</title>");
      return;
    }
    response.writeHead(404);
    response.end("Not found");
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;
  const run = () => promisify(execFile)(process.execPath, [
    smokeScript,
    baseUrl,
    releaseSha,
    "--verify-callables"
  ], {
    cwd: repoRoot,
    env: {
      ...process.env,
      FUNCTIONS_BASE_URL: baseUrl,
      IDENTITY_TOOLKIT_BASE_URL: baseUrl,
      ALLOW_HTTP_SMOKE: "1"
    }
  });
  try {
    await assert.rejects(run(), /backend|commit|SHA/i);
    backendSha = releaseSha;
    const success = await run();
    assert.equal(JSON.parse(success.stdout).backendCommitSha, releaseSha);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("release smoke waits for a newly deployed preview to become ready", async () => {
  let rootRequests = 0;
  let baseUrl = "";
  const securityHeaders = {
    "cache-control": "no-store",
    "content-security-policy": "default-src 'self'; frame-ancestors 'none'",
    "cross-origin-opener-policy": "same-origin-allow-popups",
    "cross-origin-resource-policy": "same-site",
    "permissions-policy": "camera=()",
    "referrer-policy": "strict-origin-when-cross-origin",
    "x-content-type-options": "nosniff"
  };
  const server = http.createServer((request, response) => {
    if (request.url.startsWith("/version.json")) {
      response.writeHead(200, { ...securityHeaders, "content-type": "application/json" });
      response.end(JSON.stringify({
        commitSha: releaseSha,
        progressionMode: "automatic_best_account_or_device",
        competitionMode: "paused_pending_authoritative_verifier"
      }));
      return;
    }
    if (request.url === "/__/firebase/init.json") {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({
        apiKey: "fixture-browser-key",
        projectId: "star-strike-rush"
      }));
      return;
    }
    if (request.url.startsWith("/v1/accounts:createAuthUri")) {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({ authUri: "https://accounts.google.com/o/oauth2/auth" }));
      return;
    }
    if (request.url === "/" || request.url.startsWith("/?")) {
      rootRequests++;
      if (rootRequests === 1) {
        response.writeHead(404);
        response.end("Preview channel is propagating");
        return;
      }
      response.writeHead(200, { ...securityHeaders, "content-type": "text/html" });
      response.end("<!doctype html><title>Star Strike RUSH</title>");
      return;
    }
    response.writeHead(404);
    response.end("Not found");
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  baseUrl = `http://127.0.0.1:${address.port}`;
  try {
    const result = await promisify(execFile)(process.execPath, [
      smokeScript,
      baseUrl,
      releaseSha
    ], {
      cwd: repoRoot,
      env: {
        ...process.env,
        IDENTITY_TOOLKIT_BASE_URL: baseUrl,
        ALLOW_HTTP_SMOKE: "1",
        SMOKE_READINESS_ATTEMPTS: "3",
        SMOKE_READINESS_DELAY_MS: "10"
      }
    });
    const report = JSON.parse(result.stdout);
    assert.equal(report.commitSha, releaseSha);
    assert.equal(rootRequests, 2);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("release smoke waits for the staged origin to become authorized for Google authentication", async () => {
  let authRequests = 0;
  let baseUrl = "";
  const securityHeaders = {
    "cache-control": "no-store",
    "content-security-policy": "default-src 'self'; frame-ancestors 'none'",
    "cross-origin-opener-policy": "same-origin-allow-popups",
    "cross-origin-resource-policy": "same-site",
    "permissions-policy": "camera=()",
    "referrer-policy": "strict-origin-when-cross-origin",
    "x-content-type-options": "nosniff"
  };
  const server = http.createServer((request, response) => {
    if (request.url.startsWith("/version.json")) {
      response.writeHead(200, { ...securityHeaders, "content-type": "application/json" });
      response.end(JSON.stringify({
        commitSha: releaseSha,
        progressionMode: "automatic_best_account_or_device",
        competitionMode: "paused_pending_authoritative_verifier"
      }));
      return;
    }
    if (request.url === "/__/firebase/init.json") {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({
        apiKey: "fixture-browser-key",
        projectId: "star-strike-rush"
      }));
      return;
    }
    if (request.url.startsWith("/v1/accounts:createAuthUri")) {
      authRequests++;
      assert.equal(request.headers.referer, `${baseUrl}/`);
      let body = "";
      request.setEncoding("utf8");
      request.on("data", (chunk) => { body += chunk; });
      request.on("end", () => {
        const payload = JSON.parse(body);
        assert.equal(payload.continueUri, `${baseUrl}/`);
        assert.equal(payload.providerId, "google.com");
        if (authRequests === 1) {
          response.writeHead(403, { "content-type": "application/json" });
          response.end(JSON.stringify({ error: { message: "Preview origin is still propagating" } }));
          return;
        }
        response.writeHead(200, { "content-type": "application/json" });
        response.end(JSON.stringify({ authUri: "https://accounts.google.com/o/oauth2/auth" }));
      });
      return;
    }
    if (request.url === "/" || request.url.startsWith("/?")) {
      response.writeHead(200, { ...securityHeaders, "content-type": "text/html" });
      response.end("<!doctype html><title>Star Strike RUSH</title>");
      return;
    }
    response.writeHead(404);
    response.end("Not found");
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  baseUrl = `http://127.0.0.1:${address.port}`;
  try {
    const result = await promisify(execFile)(process.execPath, [
      smokeScript,
      baseUrl,
      releaseSha
    ], {
      cwd: repoRoot,
      env: {
        ...process.env,
        IDENTITY_TOOLKIT_BASE_URL: baseUrl,
        ALLOW_HTTP_SMOKE: "1",
        SMOKE_READINESS_ATTEMPTS: "3",
        SMOKE_READINESS_DELAY_MS: "10"
      }
    });
    const report = JSON.parse(result.stdout);
    assert.equal(report.googleAuthOriginVerified, true);
    assert.equal(authRequests, 2);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
