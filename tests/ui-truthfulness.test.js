const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");

const repoRoot = path.resolve(__dirname, "..");

test("competitive scoring remains explicitly gated until verified sessions ship", () => {
  const evaluateCompetitionGate = (verifiedRunSessionsEnabled) => {
    const context = {
      globalThis: null,
      Set,
      String,
      Number,
      Math,
      Date,
      CLIENT_COMPETITION_WRITES_ENABLED: true,
      VERIFIED_RUN_SESSIONS_ENABLED: verifiedRunSessionsEnabled
    };
    context.globalThis = context;
    vm.createContext(context);
    vm.runInContext(fs.readFileSync(path.join(repoRoot, "src/00-competition.js"), "utf8"), context);
    return context.COMPETITIVE_MODE_ENABLED;
  };

  assert.equal(evaluateCompetitionGate(false), false);
  assert.equal(evaluateCompetitionGate(true), true);
});

test("Pilot Dossier does not expose manual sync or refresh controls", () => {
  const source = fs.readFileSync(path.join(repoRoot, "src/12-rendering-title-panels.js"), "utf8");
  assert.doesNotMatch(source, /SYNC PILOT|REFRESH ONLINE DATA|REFRESH RECORDS|REFRESH WEEKLY STANDINGS/);
  assert.match(source, /AUTOSAVES/);
  assert.match(source, /PUBLIC: CALL SIGN \+ @HANDLE/);
});

test("primary title hierarchy hides unused Credits", () => {
  const titleSource = fs.readFileSync(path.join(repoRoot, "src/13-rendering-title-screens.js"), "utf8");
  const primaryTitle = titleSource.slice(
    titleSource.indexOf("function drawTitleAndButtons"),
    titleSource.indexOf("function drawStartScreen")
  );
  assert.doesNotMatch(primaryTitle, /CREDITS/);
  assert.match(primaryTitle, /DEVICE BEST/);
});

test("Codex uses categorized two-column cards with scrollable wrapped detail", () => {
  const source = fs.readFileSync(path.join(repoRoot, "src/12-rendering-title-panels.js"), "utf8");
  assert.match(source, /const cols = 2/);
  assert.match(source, /codexCategory/);
  assert.match(source, /codexScroll/);
  assert.match(source, /drawWrappedPanelText/);
  assert.doesNotMatch(source, /tactics\[0\].*slice\(0, 42\)/);
});
