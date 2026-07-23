const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");

const repoRoot = path.resolve(__dirname, "..");

test("title hierarchy is dominant and contains no permanent editing instructions", () => {
  const source = fs.readFileSync(path.join(repoRoot, "src", "13-rendering-title-screens.js"), "utf8");
  assert.doesNotMatch(source, /Math\.min\(0\.55/);
  assert.doesNotMatch(source, /TAP TO EDIT|ENTER SAVES/);
  assert.match(source, /W - 32/);
  assert.match(source, /RUSH/);
});

test("ambient title traffic is visible, depth-calibrated, and path-reserved", () => {
  const title = fs.readFileSync(path.join(repoRoot, "src", "08-title-screen.js"), "utf8");
  const render = fs.readFileSync(path.join(repoRoot, "src", "11-rendering-title-effects.js"), "utf8");
  assert.match(title, /function titlePathReservationConflict/);
  assert.match(title, /scale:\s*rand\(1\.12,\s*1\.42\)/);
  assert.match(title, /traversalFrames/);
  assert.doesNotMatch(render, /overPrimaryUi \? 0\.03/);
  assert.match(render, /overPrimaryUi \? 0\.22/);
});
