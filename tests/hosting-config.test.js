const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const repoRoot = path.resolve(__dirname, "..");

test("Hosting serves the allowlisted build with global security headers", () => {
  const config = JSON.parse(fs.readFileSync(path.join(repoRoot, "firebase.json"), "utf8"));
  const hosting = config.hosting;
  assert.equal(hosting.public, "dist");
  assert.equal(hosting.rewrites, undefined);

  const globalHeaders = hosting.headers.find((entry) => entry.source === "**")?.headers || [];
  const globalKeys = new Set(globalHeaders.map((header) => header.key));
  for (const key of ["Content-Security-Policy", "X-Content-Type-Options", "Referrer-Policy", "Permissions-Policy"]) {
    assert.equal(globalKeys.has(key), true, `${key} must cover the extensionless entry route`);
  }

  const rootHeaders = hosting.headers.find((entry) => entry.source === "/")?.headers || [];
  assert.equal(rootHeaders.some((header) => header.key === "Cache-Control" && header.value === "no-store"), true);
  assert.equal(hosting.ignore.includes("source-art/**"), true);
  assert.equal(hosting.ignore.includes("tests/**"), true);
});
