"use strict";

const assert = require("node:assert/strict");

const baseUrl = String(process.argv[2] || "").replace(/\/$/, "");
const expectedCommit = String(process.argv[3] || "");
const verifyCallables = process.argv.includes("--verify-callables");
const projectId = "star-strike-rush";
const allowHttpSmoke = process.env.ALLOW_HTTP_SMOKE === "1";
const functionsBaseUrl = String(
  process.env.FUNCTIONS_BASE_URL ||
  `https://us-central1-${projectId}.cloudfunctions.net`
).replace(/\/$/, "");
const identityToolkitBaseUrl = String(
  process.env.IDENTITY_TOOLKIT_BASE_URL ||
  "https://identitytoolkit.googleapis.com"
).replace(/\/$/, "");
const readinessAttempts = allowHttpSmoke
  ? Math.max(1, Math.min(10, Number.parseInt(process.env.SMOKE_READINESS_ATTEMPTS || "7", 10) || 7))
  : 7;
const readinessDelayMs = allowHttpSmoke
  ? Math.max(0, Math.min(10000, Number.parseInt(process.env.SMOKE_READINESS_DELAY_MS || "5000", 10) || 0))
  : 5000;

if (!/^https:\/\//.test(baseUrl) && !(
  allowHttpSmoke &&
  /^http:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?$/i.test(baseUrl)
)) {
  throw new Error("Usage: node scripts/smoke-release.js https://host SHA [--verify-callables]");
}
if (!/^https:\/\//.test(functionsBaseUrl) && !(
  allowHttpSmoke &&
  /^http:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?$/i.test(functionsBaseUrl)
)) {
  throw new Error("Functions smoke base URL must use HTTPS or an explicitly allowed local test origin.");
}
if (!/^https:\/\//.test(identityToolkitBaseUrl) && !(
  allowHttpSmoke &&
  /^http:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?$/i.test(identityToolkitBaseUrl)
)) {
  throw new Error("Identity Toolkit smoke base URL must use HTTPS or an explicitly allowed local test origin.");
}
if (!/^[0-9a-f]{40}$/i.test(expectedCommit)) throw new Error("Expected commit must be a full 40-character SHA.");

async function request(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    redirect: "follow",
    signal: AbortSignal.timeout(30000)
  });
  return response;
}

async function waitForHostingRelease() {
  let responses = null;
  for (let attempt = 1; attempt <= readinessAttempts; attempt++) {
    const cacheBuster = `smoke=${Date.now()}-${attempt}`;
    responses = await Promise.all([
      request(`${baseUrl}/?${cacheBuster}`, { cache: "no-store" }),
      request(`${baseUrl}/version.json?${cacheBuster}`, { cache: "no-store" })
    ]);
    if (responses.every((response) => response.status === 200)) return responses;
    if (attempt < readinessAttempts) {
      await Promise.all(responses.map((response) => response.arrayBuffer().catch(() => {})));
      console.error(`Hosting release not ready (attempt ${attempt}/${readinessAttempts}); retrying.`);
      await new Promise((resolve) => setTimeout(resolve, readinessDelayMs));
    }
  }
  return responses;
}

async function requirePrivate404(pathname) {
  const response = await request(`${baseUrl}${pathname}?smoke=${Date.now()}`);
  assert.equal(response.status, 404, `${pathname} must return 404`);
}

async function requireCallableError(name, expectedStatus, data = {}) {
  const response = await request(`${functionsBaseUrl}/${name}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ data })
  });
  const body = await response.json();
  assert.equal(body?.error?.status, expectedStatus, `${name} must reject with ${expectedStatus}`);
  assert.match(body.error.message, expectedStatus === "UNAUTHENTICATED" ? /sign in/i : /(retired|paused|authoritative)/i, `${name} must use accurate wording`);
  const release = body?.error?.details?.release;
  assert.ok(release && typeof release === "object", `${name} must return backend release metadata`);
  assert.equal(release.commitSha, expectedCommit, `${name} backend commit SHA differs`);
  assert.equal(release.progressionAuthority, "explicit_account_or_device", `${name} progression authority differs`);
  assert.equal(release.competitionMode, "paused_pending_authoritative_verifier", `${name} competition label differs`);
  assert.equal(release.competitionWritesEnabled, false, `${name} public competition writes must remain fail-closed`);
  assert.equal(release.serverProgressionWritesEnabled, false, `${name} run progression writes must remain fail-closed`);
  assert.equal(release.appCheckEnforced, false, `${name} App Check must not be claimed as enforced`);
  return release;
}

async function requireGoogleAuthOrigin() {
  const configResponse = await request(`${baseUrl}/__/firebase/init.json`, { cache: "no-store" });
  assert.equal(configResponse.status, 200, "Firebase Hosting init config must return 200");
  const config = await configResponse.json();
  assert.equal(config.projectId, projectId, "Firebase Hosting init config project differs");
  assert.ok(typeof config.apiKey === "string" && config.apiKey.length > 10, "Firebase browser API key is missing");

  let response = null;
  let body = {};
  for (let attempt = 1; attempt <= readinessAttempts; attempt++) {
    response = await request(
      `${identityToolkitBaseUrl}/v1/accounts:createAuthUri?key=${encodeURIComponent(config.apiKey)}`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          referer: `${baseUrl}/`
        },
        body: JSON.stringify({
          continueUri: `${baseUrl}/`,
          providerId: "google.com"
        })
      }
    );
    body = {};
    try {
      body = await response.json();
    } catch {}
    if (response.status === 200) break;
    const retryableStatus = [403, 404, 429, 500, 502, 503, 504].includes(response.status);
    if (!retryableStatus || attempt === readinessAttempts) break;
    console.error(`Google Auth origin not ready (attempt ${attempt}/${readinessAttempts}); retrying.`);
    await new Promise((resolve) => setTimeout(resolve, readinessDelayMs));
  }
  assert.equal(
    response.status,
    200,
    `Google Auth must accept the staged origin${body?.error?.message ? `: ${body.error.message}` : ""}`
  );
  assert.ok(typeof body.authUri === "string" && body.authUri.startsWith("https://accounts.google.com/"));
}

(async () => {
  const [root, version] = await waitForHostingRelease();
  assert.equal(root.status, 200, "root must return 200");
  assert.equal(version.status, 200, "version.json must return 200");
  const release = await version.json();
  assert.equal(release.commitSha, expectedCommit, "deployed version.json commit differs");
  assert.equal(release.progressionMode, "explicit_account_or_device");
  assert.equal(release.competitionMode, "paused_pending_authoritative_verifier");
  assert.match(root.headers.get("cache-control") || "", /no-store/i, "HTML must be no-store");
  assert.match(version.headers.get("cache-control") || "", /no-store/i, "version.json must be no-store");

  for (const header of [
    "content-security-policy",
    "cross-origin-opener-policy",
    "cross-origin-resource-policy",
    "permissions-policy",
    "referrer-policy",
    "x-content-type-options"
  ]) {
    assert.ok(root.headers.get(header), `${header} must be present`);
  }
  assert.match(root.headers.get("content-security-policy"), /frame-ancestors 'none'/);

  await Promise.all([
    requirePrivate404("/README.md"),
    requirePrivate404("/firestore.rules"),
    requirePrivate404("/functions/index.js"),
    requirePrivate404("/tests/release-integrity.test.js"),
    requirePrivate404("/source-art/README.md")
  ]);
  await requireGoogleAuthOrigin();

  let backendRelease = null;
  if (verifyCallables) {
    const releases = await Promise.all([
      ...[
        "syncPilotProfile",
        "claimPilotHandle",
        "chooseProgressionSource",
        "requestAccountDeletion",
        "cancelAccountDeletion"
      ].map((name) => requireCallableError(name, "UNAUTHENTICATED")),
      ...[
        "listWeeklyLeagues",
        "joinWeeklyLeague",
        "startVerifiedRun",
        "submitRunReceipt"
      ].map((name) => requireCallableError(name, "FAILED_PRECONDITION")),
      requireCallableError("claimSeasonReward", "FAILED_PRECONDITION", { rewardId: "season_01_tier_1" })
    ]);
    backendRelease = releases[0];
    for (const releaseIdentity of releases.slice(1)) {
      assert.deepEqual(releaseIdentity, backendRelease, "paused callable backend release identities differ");
    }
  }
  console.log(JSON.stringify({
    ok: true,
    baseUrl,
    commitSha: release.commitSha,
    progressionMode: release.progressionMode,
    competitionMode: release.competitionMode,
    googleAuthOriginVerified: true,
    callablesVerified: verifyCallables,
    backendCommitSha: backendRelease && backendRelease.commitSha || null
  }));
})().catch((error) => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
