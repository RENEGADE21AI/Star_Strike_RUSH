const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const repoRoot = path.resolve(__dirname, "..");
const releaseScript = fs.readFileSync(path.join(repoRoot, "scripts", "release.ps1"), "utf8");
const smokeScript = fs.readFileSync(path.join(repoRoot, "scripts", "smoke-release.js"), "utf8");
const packageJson = require("../package.json");

test("release tooling separates backend staging from approval-gated production Hosting", () => {
  assert.match(releaseScript, /\[switch\]\$Production/);
  assert.match(releaseScript, /\[switch\]\$CheckOnly/);
  assert.match(releaseScript, /\[switch\]\$StageBackendPreview/);
  assert.match(releaseScript, /\[string\]\$ApprovalFile/);
  assert.match(releaseScript, /\[string\]\$BaselineCommit/);
  assert.match(releaseScript, /Worktree must be clean/);
  assert.match(releaseScript, /ExpectedBranch/);
  assert.match(releaseScript, /Node\.js 22 is required/);
  assert.match(releaseScript, /Verified release Node runtime/);
  assert.match(releaseScript, /git fetch origin --prune/);
  assert.match(releaseScript, /Local main .* differs from origin\/main/);
  assert.match(releaseScript, /Verified Firebase project/);
  assert.match(releaseScript, /release-plan\.js/);
  assert.match(releaseScript, /generate-backend-release\.js/);
  assert.match(releaseScript, /validate-release-approval\.js/);
  assert.match(releaseScript, /hosting:channel:deploy/);
  assert.match(releaseScript, /if \(\$StageBackendPreview\)[\s\S]*deploy --only functions/);
  assert.ok(releaseScript.indexOf("deploy --only functions") < releaseScript.indexOf("deploy --only firestore:rules"));
  assert.ok(releaseScript.indexOf("deploy --only firestore:rules") < releaseScript.indexOf("deploy --only firestore:indexes"));
  assert.ok(releaseScript.indexOf("deploy --only firestore:rules") < releaseScript.indexOf("deploy --only hosting:app"));
  assert.doesNotMatch(releaseScript, /HEAD\^/);
  assert.match(releaseScript, /Production Hosting remains withheld/);
  assert.doesNotMatch(releaseScript, /firebase token|FIREBASE_TOKEN/i);
});

test("release smoke verifies SHA, authority, cache, headers, private 404s, and closed callables", () => {
  assert.match(smokeScript, /release\.commitSha, expectedCommit/);
  assert.match(smokeScript, /backend commit SHA differs/);
  assert.match(smokeScript, /device_local_preseason/);
  assert.match(smokeScript, /competitionMode, "paused"/);
  assert.match(smokeScript, /cache-control/);
  assert.match(smokeScript, /content-security-policy/);
  assert.match(smokeScript, /requirePrivate404\("\/firestore\.rules"\)/);
  for (const callable of ["submitRunReceipt", "joinWeeklyLeague", "claimSeasonReward"]) {
    assert.match(smokeScript, new RegExp(`requirePausedCallable\\("${callable}"`));
  }
});

test("package scripts expose check, preview, production, visual, and emulator workflows", () => {
  for (const script of [
    "release:check",
    "deploy:preview",
    "deploy:production",
    "test:visual",
    "test:firebase-client",
    "test:secret"
  ]) {
    assert.equal(typeof packageJson.scripts[script], "string", script);
  }
  assert.match(packageJson.scripts["deploy:production"], /-Production/);
  assert.match(packageJson.scripts["deploy:preview"], /-StageBackendPreview/);
});
