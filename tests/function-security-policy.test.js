const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");

const repoRoot = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(repoRoot, "functions", "index.js"), "utf8");

test("callable Functions use one bounded production resource policy", () => {
  assert.match(source, /const CALLABLE_OPTIONS = Object\.freeze\(\{/);
  assert.match(source, /maxInstances:\s*10/);
  assert.match(source, /concurrency:\s*40/);
  assert.match(source, /timeoutSeconds:\s*30/);
  assert.equal((source.match(/onCall\(CALLABLE_OPTIONS/g) || []).length, 5);
  assert.equal((source.match(/onCall\(\{\s*region:/g) || []).length, 0);
});

test("profile sync minimizes provider PII and purges legacy duplicate fields", () => {
  const authBlock = source.slice(source.indexOf("function authContext"), source.indexOf("function profileFromSnapshots"));
  assert.doesNotMatch(authBlock, /request\.auth\.token|email|displayName|photoURL/);
  assert.match(authBlock, /return \{\s*uid: request\.auth\.uid\s*\}/);

  const privatePayload = source.slice(source.indexOf("function privatePayloadFor"), source.indexOf("function publicPayloadFor"));
  for (const field of ["email", "displayName", "photoURL"]) {
    assert.match(privatePayload, new RegExp(`${field}: FieldValue\\.delete\\(\\)`));
  }
});
