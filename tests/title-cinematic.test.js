const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");

const repoRoot = path.resolve(__dirname, "..");

test("title hierarchy is dominant and contains no permanent editing instructions", () => {
  const source = fs.readFileSync(path.join(repoRoot, "src", "13-rendering-title-screens.js"), "utf8");
  assert.doesNotMatch(source, /Math\.min\(0\.55/);
  assert.doesNotMatch(source, /TAP TO EDIT|ENTER SAVES/);
  assert.match(source, /nameTargetWidth/);
  assert.match(source, /state\.titleMetrics/);
  assert.match(source, /RUSH/);
});

test("ambient title traffic is visible, depth-calibrated, and path-reserved", () => {
  const title = fs.readFileSync(path.join(repoRoot, "src", "08-title-traffic.js"), "utf8");
  const render = fs.readFileSync(path.join(repoRoot, "src", "11-rendering-title-effects.js"), "utf8");
  assert.match(title, /function titlePathReservationConflict/);
  assert.match(title, /durationSeconds/);
  assert.match(title, /normalizedProgress/);
  assert.match(title, /function titleFormationPositionAt/);
  assert.match(render, /titleFormationVisualRadius/);
  assert.match(render, /overPrimaryUi \? 0\.04/);
  assert.match(title, /scale:\s*\[0\.82,\s*1\.00\]/);
  assert.doesNotMatch(title, /scale:\s*\[[^\]]*,\s*1\.(?!00)[0-9]/);
  assert.match(title, /Math\.atan2\(after\.y - before\.y, after\.x - before\.x\) \+ Math\.PI \/ 2/);
});

test("title wordmark measures a real gap between STAR STRIKE and RUSH", () => {
  const source = fs.readFileSync(path.join(repoRoot, "src", "13-rendering-title-screens.js"), "utf8");
  const offset = source.match(/const rushOffsetY = (\d+)/);
  assert.ok(offset, "RUSH offset should be explicit and measurable");
  assert.ok(Number(offset[1]) >= 96, "RUSH should retain a comfortably separated baseline");
  assert.match(source, /nameBounds/);
  assert.match(source, /rushBounds/);
  assert.match(source, /lineGap:/);
});

test("signed-out Pilot Dossier hides irrelevant account actions", () => {
  const panel = fs.readFileSync(path.join(repoRoot, "src", "12-rendering-title-panels.js"), "utf8");
  const onlinePanel = panel.slice(panel.indexOf("function drawOnlinePanel"), panel.indexOf("function drawRecordsPanel"));
  assert.match(onlinePanel, /if \(!user\) drawOnlineActionButton\(r\.signIn/);
  assert.match(onlinePanel, /if \(user\) drawOnlineActionButton\(r\.signOut/);
  assert.doesNotMatch(onlinePanel, /drawOnlineActionButton\(r\.signOut, "SIGN OUT", !!user\)/);
});
