"use strict";

const assert = require("node:assert/strict");

const baseUrl = String(process.argv[2] || "").replace(/\/$/, "");
const expectedCommit = String(process.argv[3] || "");
const verifyCallables = process.argv.includes("--verify-callables");
const projectId = "star-strike-rush";

if (!/^https:\/\//.test(baseUrl)) throw new Error("Usage: node scripts/smoke-release.js https://host SHA [--verify-callables]");
if (!/^[0-9a-f]{40}$/i.test(expectedCommit)) throw new Error("Expected commit must be a full 40-character SHA.");

async function request(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    redirect: "follow",
    signal: AbortSignal.timeout(30000)
  });
  return response;
}

async function requirePrivate404(pathname) {
  const response = await request(`${baseUrl}${pathname}?smoke=${Date.now()}`);
  assert.equal(response.status, 404, `${pathname} must return 404`);
}

async function requirePausedCallable(name, data = {}) {
  const response = await request(`https://us-central1-${projectId}.cloudfunctions.net/${name}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ data })
  });
  const body = await response.json();
  assert.equal(body?.error?.status, "FAILED_PRECONDITION", `${name} must reject with FAILED_PRECONDITION`);
  assert.match(body.error.message, /paused|preseason/i, `${name} must use accurate preseason wording`);
}

(async () => {
  const cacheBuster = `smoke=${Date.now()}`;
  const [root, version] = await Promise.all([
    request(`${baseUrl}/?${cacheBuster}`, { cache: "no-store" }),
    request(`${baseUrl}/version.json?${cacheBuster}`, { cache: "no-store" })
  ]);
  assert.equal(root.status, 200, "root must return 200");
  assert.equal(version.status, 200, "version.json must return 200");
  const release = await version.json();
  assert.equal(release.commitSha, expectedCommit, "deployed version.json commit differs");
  assert.equal(release.progressionMode, "device_local_preseason");
  assert.equal(release.competitionMode, "paused");
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

  if (verifyCallables) {
    await Promise.all([
      requirePausedCallable("submitRunReceipt"),
      requirePausedCallable("joinWeeklyLeague"),
      requirePausedCallable("claimSeasonReward", { rewardId: "season_01_tier_1" })
    ]);
  }
  console.log(JSON.stringify({
    ok: true,
    baseUrl,
    commitSha: release.commitSha,
    progressionMode: release.progressionMode,
    competitionMode: release.competitionMode,
    callablesVerified: verifyCallables
  }));
})().catch((error) => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
