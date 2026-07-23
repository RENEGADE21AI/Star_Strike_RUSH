const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");

const repoRoot = path.resolve(__dirname, "..");

function context() {
  const value = { globalThis: null, String, Number, Math };
  value.globalThis = value;
  vm.createContext(value);
  vm.runInContext(fs.readFileSync(path.join(repoRoot, "src", "00-notifications.js"), "utf8"), value);
  return value;
}

test("game notices are categorized and stay on edge rails instead of center cards", () => {
  const c = context();
  assert.equal(c.gameNoticeCategory("PHASE 3"), "phase");
  assert.equal(c.gameNoticeCategory("RAPID FIRE"), "powerup");
  assert.equal(c.gameNoticeCategory("BOSS DOWN"), "boss");
  assert.equal(c.gameNoticeCategory("DEBRIS FIELD"), "warning");
  assert.equal(c.gameNoticeCategory("ONLINE SYNC FAILED"), "system");
  assert.equal(c.createGameNotice("NEW ENEMY", "discovery").rail, "traverse");

  const hud = fs.readFileSync(path.join(repoRoot, "src", "16-rendering-hud.js"), "utf8");
  assert.match(hud, /function drawGameNotices/);
  assert.doesNotMatch(hud.match(/function drawGameNotices[\s\S]*?^}/m)[0], /fillRect|roundRect/);

  const waves = fs.readFileSync(path.join(repoRoot, "src", "04-waves.js"), "utf8");
  const discovery = waves.slice(waves.indexOf("function discoverCodex"), waves.indexOf("function spawnWave"));
  assert.doesNotMatch(discovery, /pushGameNotice|showMessage/);
  assert.match(discovery, /codexHasNew = true/);
});
