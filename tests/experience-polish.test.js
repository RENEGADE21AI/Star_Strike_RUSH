"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");

const repoRoot = path.resolve(__dirname, "..");

test("combat HUD protects touch controls and keeps the classic status order", () => {
  const source = fs.readFileSync(path.join(repoRoot, "src", "16-rendering-hud.js"), "utf8");
  const context = {
    H: 667,
    W: 375,
    state: { inputMode: "touch" },
    bossHudOffset: () => 0
  };
  vm.createContext(context);
  vm.runInContext(source, context);
  const touch = vm.runInContext("getGameplayHudLayout()", context);
  assert.equal(touch.energy.y < touch.health.y, true);
  assert.equal(touch.health.orientation, "horizontal");
  assert.equal(touch.status.y + touch.status.h <= 535, true, "status must finish above the joystick zone");
  assert.equal(touch.pause.x, 10);
  assert.equal(touch.pause.y, 10);

  context.state.inputMode = "keyboard";
  const desktop = vm.runInContext("getGameplayHudLayout()", context);
  assert.equal(desktop.status.y + desktop.status.h < 637, true, "status must not collide with the transient desktop hint");
});

test("phone achievement cards use a readable single-column rhythm", () => {
  const source = fs.readFileSync(path.join(repoRoot, "src", "08-title-screen.js"), "utf8");
  const context = {
    achievementCategory: "all",
    getAchievementDefinitions: () => [{ id: "a" }, { id: "b" }, { id: "c" }]
  };
  vm.createContext(context);
  vm.runInContext(source, context);
  assert.equal(vm.runInContext("getAchievementContentHeight()", context), 276);
  const panelSource = fs.readFileSync(path.join(repoRoot, "src", "12-rendering-title-panels.js"), "utf8");
  const achievementRenderer = panelSource.slice(
    panelSource.indexOf("function drawAchievementsPanel"),
    panelSource.indexOf("function drawSettingsAndCodexPanels")
  );
  assert.match(achievementRenderer, /const cardW = r\.contentRect\.w - 4/);
  assert.match(achievementRenderer, /index \* \(cardH \+ gap\)/);
  assert.doesNotMatch(achievementRenderer, /index % 2|Math\.floor\(index \/ 2\)/);
});

test("settings and destructive actions use distinct, truthful controls", () => {
  const source = fs.readFileSync(path.join(repoRoot, "src", "12-rendering-title-panels.js"), "utf8");
  const layoutSource = fs.readFileSync(path.join(repoRoot, "src", "08-title-screen.js"), "utf8");
  const context = { W: 390, H: 667 };
  vm.createContext(context);
  vm.runInContext(layoutSource, context);
  const layout = vm.runInContext("getOnlineRects()", context);
  assert.match(source, /function drawSettingsToggle/);
  assert.match(source, /function drawDangerActionButton/);
  assert.match(source, /RESET LOCAL DATA/);
  assert.match(source, /SETTINGS SAVE ON THIS DEVICE AND APPLY IMMEDIATELY/);
  assert.match(source, /drawSimpleButton\(r\.no, "KEEP DATA"/);
  assert.match(source, /drawPressButton\(r\.yes, "ERASE DATA"/);
  assert.equal(layout.shake.w, layout.reset.w, "Screen Shake and the danger action should use the full content width");
  assert.ok(layout.reset.y > layout.replayTraining.y + layout.replayTraining.h, "Reset must be isolated below routine settings");
  assert.ok(layout.reset.y + layout.reset.h < layout.panel.y + layout.panel.h, "Reset must remain inside the panel");
});

test("Records separates this device's best from the unverified public archive", () => {
  const source = fs.readFileSync(path.join(repoRoot, "src", "12-rendering-title-panels.js"), "utf8");
  assert.match(source, /DEVICE RECORD • THIS DEVICE/);
  assert.match(source, /LEGACY\/PRESEASON ARCHIVE • UNVERIFIED/);
  assert.match(source, /PUBLIC ARCHIVE WRITES PAUSED/);
  assert.match(source, /DEVICE PROGRESS ACTIVE • PUBLIC WRITES PAUSED/);
  assert.match(source, /VERIFIED BEST SETS YOUR DIVISION/);
  assert.doesNotMatch(source, /CONNECT TO PUBLISH RECORDS/);
  assert.doesNotMatch(source, /PRIOR BEST SCORE SETS YOUR DIVISION/);
});

test("visual QA covers the full player journey and polished terminal states", () => {
  const source = fs.readFileSync(path.join(repoRoot, "scripts", "visual_qa.js"), "utf8");
  for (const scenario of [
    "pilot-dossier",
    "codex-overview",
    "records-network",
    "progress-road",
    "title-landscape-844x390",
    "settings-mobile-375x667",
    "gameplay-hud-touch-390x844",
    "game-over-summary",
    "reset-local-data-confirmation"
  ]) {
    assert.match(source, new RegExp(scenario));
  }
  const titleSource = fs.readFileSync(path.join(repoRoot, "src", "13-rendering-title-screens.js"), "utf8");
  assert.match(titleSource, /FLIGHT RECORD CLOSED/);
  assert.match(titleSource, /NEW DEVICE RECORD/);
  assert.match(titleSource, /DEVICE BEST/);
});
