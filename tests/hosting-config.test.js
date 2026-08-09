const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const repoRoot = path.resolve(__dirname, "..");

function cacheControlFor(hosting, source) {
  return hosting.headers
    .find((entry) => entry.source === source)
    ?.headers.find((header) => header.key === "Cache-Control")
    ?.value;
}

test("Hosting serves the allowlisted build with global security headers", () => {
  const config = JSON.parse(fs.readFileSync(path.join(repoRoot, "firebase.json"), "utf8"));
  const hosting = config.hosting;
  assert.equal(hosting.public, "dist");
  assert.equal(hosting.rewrites, undefined);

  const globalHeaders = hosting.headers.find((entry) => entry.source === "**")?.headers || [];
  const globalKeys = new Set(globalHeaders.map((header) => header.key));
  for (const key of [
    "Content-Security-Policy",
    "Cross-Origin-Opener-Policy",
    "Cross-Origin-Resource-Policy",
    "Origin-Agent-Cluster",
    "Permissions-Policy",
    "Referrer-Policy",
    "X-Content-Type-Options",
    "X-Permitted-Cross-Domain-Policies"
  ]) {
    assert.equal(globalKeys.has(key), true, `${key} must cover the extensionless entry route`);
  }
  const csp = globalHeaders.find((header) => header.key === "Content-Security-Policy")?.value || "";
  assert.match(csp, /script-src [^;]*https:\/\/apis\.google\.com/);
  assert.match(csp, /script-src-attr 'none'/);
  assert.match(csp, /frame-src [^;]*https:\/\/accounts\.google\.com [^;]*https:\/\/\*\.firebaseapp\.com/);
  assert.match(csp, /object-src 'none'/);
  assert.match(csp, /frame-ancestors 'none'/);

  const rootHeaders = hosting.headers.find((entry) => entry.source === "/")?.headers || [];
  assert.equal(rootHeaders.some((header) => header.key === "Cache-Control" && header.value === "no-store"), true);
  assert.equal(cacheControlFor(hosting, "**/*.html"), "no-store");
  assert.equal(cacheControlFor(hosting, "/version.json"), "no-store");
  assert.equal(hosting.ignore.includes("source-art/**"), true);
  assert.equal(hosting.ignore.includes("tests/**"), true);
});

test("production build pins every runtime entry to one commit and describes its authority", () => {
  const { execFileSync } = require("node:child_process");
  const expectedCommit = execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: repoRoot,
    encoding: "utf8"
  }).trim();
  execFileSync(process.execPath, ["scripts/build_static.js"], {
    cwd: repoRoot,
    env: { ...process.env, RELEASE_COMMIT_SHA: expectedCommit },
    stdio: "pipe"
  });

  const version = JSON.parse(fs.readFileSync(path.join(repoRoot, "dist", "version.json"), "utf8"));
  assert.equal(version.commitSha, expectedCommit);
  assert.equal(version.packageVersion, "1.1.0");
  assert.equal(version.progressionMode, "device_local_preseason");
  assert.equal(version.competitionMode, "paused");
  assert.equal(Number.isNaN(Date.parse(version.buildTimestamp)), false);

  const html = fs.readFileSync(path.join(repoRoot, "dist", "index.html"), "utf8");
  const productionLoop = fs.readFileSync(path.join(repoRoot, "dist", "src", "18-session-input-loop.js"), "utf8");
  assert.doesNotMatch(productionLoop, /DEVELOPMENT_QA_START|DEBUG_SNAPSHOT_ENABLED|scenario=siphon|applyDevelopmentQaScenario|qaHoldStaging/);
  const expectedTag = expectedCommit.slice(0, 12);
  const runtimeReferences = Array.from(
    html.matchAll(/\b(?:src|href)="((?:src\/|assets\/|styles\.css|site\.webmanifest)[^"]*)"/g),
    (match) => match[1]
  );
  assert.ok(runtimeReferences.length > 20);
  for (const reference of runtimeReferences) {
    assert.match(reference, new RegExp(`[?&]v=${expectedTag}(?:&|$)`), reference);
  }
  assert.equal(new Set(runtimeReferences.map((reference) => new URL(reference, "https://build.invalid").searchParams.get("v"))).size, 1);
  assert.match(html, new RegExp(`href="assets/tutorial/colonel-arisaka\\.png\\?v=${expectedTag}"`));
});
