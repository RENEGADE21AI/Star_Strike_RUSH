# Star Strike RUSH Meta-Screen Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan one item at a time. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the title and meta layer feel like a spacious arcade command deck while preserving the canvas architecture and all in-run visuals.

**Architecture:** `08-title-screen.js` owns responsive geometry, `12-rendering-title-panels.js` owns shared screen and destination rendering, `12-rendering-progress-road.js` owns Road-specific rendering, and `18-title-input.js` owns interaction routing. Pure browser-global helpers remain testable through the existing Node VM suite.

**Tech Stack:** HTML5 Canvas, ordered browser scripts, Node assert/vm tests, existing Firebase client fallback.

## Global Constraints

- Preserve 375 x 667 portrait as the primary layout.
- Do not modify in-run renderer, enemy/boss art, or balance modules.
- Keep Play as the largest title action and preserve visible Glory, Credits, and Season Tier.
- No cosmetics, UGC, new currencies, payments, secrets, or client-authoritative online grants.
- Meta screens require a stable back target, labeled context, and scroll-safe content.
- Road continues upward: current ship lower in view, unreached milestones above.
- Update the GDD and repo-native blueprint as behavior changes.

---

### Task 1: Build a responsive meta-screen layout contract

**Files:**
- Modify: `src/08-title-screen.js`
- Modify: `tests/progression-road.test.js`

**Interfaces:**
- Produce `getMetaScreenMetrics(panel)` returning header and action-zone bounds.
- Produce `getMetaScreenContentRect(panel, topInset, bottomInset)` returning the content viewport.

- [ ] **Step 1: Write the failing test**

```js
test("meta screens reserve header and action zones", () => {
  const context = loadGameContext();
  const result = runInGame(context, `
    W = 375; H = 667;
    const panel = getTitlePanelRect();
    const metrics = getMetaScreenMetrics(panel);
    const content = getMetaScreenContentRect(panel, 0, 0);
    JSON.stringify({ panel, metrics, content });
  `);
  const data = JSON.parse(result);
  assert.ok(data.metrics.headerH >= 66);
  assert.ok(data.content.y >= data.panel.y + data.metrics.headerH);
  assert.ok(data.content.y + data.content.h <= data.metrics.actionY);
});
```

- [ ] **Step 2: Verify the test fails**

Run: `node tests/progression-road.test.js`

Expected: `ReferenceError: getMetaScreenMetrics is not defined`.

- [ ] **Step 3: Add the helpers**

```js
function getMetaScreenMetrics(panel = getTitlePanelRect()) {
  const compact = panel.h < 620;
  const headerH = compact ? 70 : 76;
  const actionH = compact ? 46 : 52;
  return {
    headerH,
    statusY: panel.y + 48,
    contentTop: panel.y + headerH,
    contentBottom: panel.y + panel.h - actionH,
    contentH: Math.max(0, panel.h - headerH - actionH),
    actionY: panel.y + panel.h - actionH
  };
}

function getMetaScreenContentRect(panel, topInset = 0, bottomInset = 0) {
  const metrics = getMetaScreenMetrics(panel);
  const y = metrics.contentTop + topInset;
  return { x: panel.x + 18, y, w: panel.w - 36, h: Math.max(0, metrics.actionY - bottomInset - y) };
}
```

- [ ] **Step 4: Verify green and commit**

Run: `node tests/progression-road.test.js`

Expected: all tests pass.

Commit: `git add src/08-title-screen.js tests/progression-road.test.js; git commit -m "Add responsive meta screen layout metrics"`

### Task 2: Promote floating panels into destination screens

**Files:**
- Modify: `src/08-title-screen.js`
- Modify: `src/12-rendering-title-panels.js`
- Modify: `src/18-title-input.js`
- Modify: `tests/progression-road.test.js`

**Interfaces:**
- Produce `getMetaScreenHeaderRects(panel)` with `header` and `back` rectangles.
- Extend `drawTitlePanelFrame(panel, title, accent, subtitle)`.

- [ ] **Step 1: Write the failing test**

```js
test("meta screen back target fits every portrait panel", () => {
  const context = loadGameContext();
  const result = runInGame(context, `
    JSON.stringify([500, 667, 900].map((height) => {
      W = 375; H = height;
      const panel = getTitlePanelRect();
      return { panel, header: getMetaScreenHeaderRects(panel) };
    }));
  `);
  for (const item of JSON.parse(result)) {
    assert.ok(item.header.back.x >= item.panel.x);
    assert.ok(item.header.back.y >= item.panel.y);
    assert.ok(item.header.back.x + item.header.back.w <= item.panel.x + item.panel.w);
  }
});
```

- [ ] **Step 2: Verify red**

Run: `node tests/progression-road.test.js`

Expected: `ReferenceError: getMetaScreenHeaderRects is not defined`.

- [ ] **Step 3: Implement header geometry and rendering**

```js
function getMetaScreenHeaderRects(panel = getTitlePanelRect()) {
  const metrics = getMetaScreenMetrics(panel);
  return {
    header: { x: panel.x, y: panel.y, w: panel.w, h: metrics.headerH },
    back: { x: panel.x + 14, y: panel.y + 14, w: 64, h: 30 }
  };
}
```

Use this back rect in every `get*Rects()` function. Update the frame to render a full-screen background, edge-lit header, destination accent, subtitle, and existing currency strip. Supply subtitle/accent pairs: `SYNC AND SETTINGS`, `MILESTONE ARCHIVE`, `GLOBAL FLIGHT LADDER`, `THREAT ARCHIVE`, and `ASCENT ROUTE`.

- [ ] **Step 4: Verify and commit**

Run: `node --check src/08-title-screen.js; node --check src/12-rendering-title-panels.js; node --check src/18-title-input.js; node tests/progression-road.test.js`

Expected: exit code 0.

Commit: `git add src/08-title-screen.js src/12-rendering-title-panels.js src/18-title-input.js tests/progression-road.test.js; git commit -m "Polish title meta screen headers"`

### Task 3: Improve title hierarchy and destination dock

**Files:**
- Modify: `src/08-title-screen.js`
- Modify: `src/13-rendering-title-screens.js`
- Modify: `tests/progression-road.test.js`

**Interfaces:**
- Produce `getTitleMetaDockRect()` from existing icon geometry.

- [ ] **Step 1: Write the failing test**

```js
test("title meta dock holds all four labeled destinations below Play", () => {
  const context = loadGameContext();
  const result = runInGame(context, `
    W = 375; H = 667;
    JSON.stringify({ dock: getTitleMetaDockRect(), icons: getTitleIconRects(), play: getPlayButtonRect() });
  `);
  const data = JSON.parse(result);
  assert.ok(data.dock.y > data.play.y + data.play.h);
  for (const key of ["achievements", "progress", "records", "codex"]) {
    const icon = data.icons[key];
    assert.ok(icon.x >= data.dock.x && icon.x + icon.w <= data.dock.x + data.dock.w);
  }
});
```

- [ ] **Step 2: Verify red**

Run: `node tests/progression-road.test.js`

Expected: `ReferenceError: getTitleMetaDockRect is not defined`.

- [ ] **Step 3: Implement and render the dock**

```js
function getTitleMetaDockRect() {
  const icons = getTitleIconRects();
  return {
    x: icons.achievements.x - 10,
    y: icons.achievements.y - 22,
    w: icons.codex.x + icons.codex.w - icons.achievements.x + 20,
    h: 88
  };
}
```

Render this dock in `drawTitleAndButtons()`, preserve text labels, use a thin active accent, and apply only a low-amplitude active pulse. Do not add idle motion to inactive controls.

- [ ] **Step 4: Verify and commit**

Run: `node --check src/13-rendering-title-screens.js; node tests/progression-road.test.js`

Expected: exit code 0.

Commit: `git add src/08-title-screen.js src/13-rendering-title-screens.js tests/progression-road.test.js; git commit -m "Improve title meta hierarchy"`

### Task 4: Give static meta screens their own breathable content layouts

**Files:**
- Modify: `src/08-title-screen.js`
- Modify: `src/12-rendering-title-panels.js`
- Modify: `src/18-title-input.js`

**Interfaces:**
- All static screen content uses `getMetaScreenContentRect(panel)`.
- `getOnlineRects()` and `getRecordsRects()` calculate primary action positions from `getMetaScreenMetrics(panel).actionY`.

- [ ] **Step 1: Write the failing layout test**

```js
test("account and records actions occupy the shared bottom action zone", () => {
  const context = loadGameContext();
  const result = runInGame(context, `
    W = 375; H = 667;
    const panel = getTitlePanelRect();
    const metrics = getMetaScreenMetrics(panel);
    JSON.stringify({ metrics, account: getOnlineRects(), records: getRecordsRects() });
  `);
  const data = JSON.parse(result);
  assert.ok(data.account.refresh.y >= data.metrics.actionY);
  assert.ok(data.records.refresh.y >= data.metrics.actionY);
});
```

- [ ] **Step 2: Verify red**

Run: `node tests/progression-road.test.js`

Expected: failure until rect builders use the action-zone contract.

- [ ] **Step 3: Implement visual hierarchy without changing routes**

Account: pilot card first, connectivity actions second, settings grouped below, and reset isolated. Achievements: full-width completion band, 30 px rows, earned and locked groups, upright trophy. Records: rank pills, aligned score column, highlighted player record, and dedicated signed-out/empty card. Codex: more open grid and full-content inspection view with role and counterplay.

- [ ] **Step 4: Verify and commit**

Run: `node --check src/08-title-screen.js; node --check src/12-rendering-title-panels.js; node --check src/18-title-input.js; node tests/progression-road.test.js; node tests/server-progression.test.js; node tests/difficulty-sampling.test.js`

Expected: exit code 0.

Commit: `git add src/08-title-screen.js src/12-rendering-title-panels.js src/18-title-input.js tests/progression-road.test.js; git commit -m "Improve title meta screen spacing"`

### Task 5: Refine Road screen flow and ascent focus

**Files:**
- Modify: `src/08-title-screen.js`
- Modify: `src/12-rendering-progress-road.js`
- Modify: `src/18-title-input.js`
- Modify: `tests/progression-road.test.js`

**Interfaces:**
- Keep `focusTitleProgressOnCurrent()`, `buildGloryRoadLayout()`, and `buildSeasonRoadLayout()` unchanged in behavior.
- Calculate Road tabs, summary, viewport, and detail from shared metrics.

- [ ] **Step 1: Write the failing detail-tray placement test**

```js
test("Road detail tray stays inside the content region", () => {
  const context = loadGameContext();
  const result = runInGame(context, `
    W = 375; H = 667;
    const panel = getTitlePanelRect();
    const metrics = getMetaScreenMetrics(panel);
    JSON.stringify({ metrics, detail: getProgressDetailRect() });
  `);
  const data = JSON.parse(result);
  assert.ok(data.detail.y >= data.metrics.contentTop);
  assert.ok(data.detail.y + data.detail.h <= data.metrics.actionY);
});
```

- [ ] **Step 2: Verify red**

Run: `node tests/progression-road.test.js`

Expected: failure until Road rects consume shared metrics.

- [ ] **Step 3: Implement the Road screen geometry**

Place tabs below the shared header, then summary, then a larger rail viewport. Place the selected-node inspection tray in the lower content region only after a tap. Strengthen the base-to-current trail and preserve future nodes above the ship. Preserve claim, drag, wheel, and focus-on-current behavior.

- [ ] **Step 4: Verify and commit**

Run: `node tests/progression-road.test.js`

Expected: all claim, merge, and upward-layout tests pass.

Commit: `git add src/08-title-screen.js src/12-rendering-progress-road.js src/18-title-input.js tests/progression-road.test.js; git commit -m "Refine progress road screen flow"`

### Task 6: Update the living design docs and perform screenshot QA

**Files:**
- Modify: `gameinfo.txt`
- Modify: `docs/design-blueprint.html`
- Modify: `docs/superpowers/specs/2026-07-10-meta-screen-polish-design.md`

- [ ] **Step 1: Update documentation**

Describe the shared screen header, title command dock, screen-specific hierarchy, responsive viewport, Road detail tray, and restrained transition rules. Remove any wording that calls meta destinations popups or overlays.

- [ ] **Step 2: Run full static verification**

Run: `Get-ChildItem -Path src -Filter *.js | ForEach-Object { node --check $_.FullName }; node --check functions\index.js; node --check functions\progression.js; node tests\progression-road.test.js; node tests\server-progression.test.js; node tests\difficulty-sampling.test.js; git diff --check`

Expected: exit code 0.

- [ ] **Step 3: Run secret scan and visual QA**

Run the repository's credential-pattern scan, excluding dependency lockfiles and dependencies.

Capture desktop and 375 x 667 title, Account, Achievements, Records, Codex, Glory Road, Season Road, selected reward, and game-over Road entry. Correct clipped copy, overlap, weak state hierarchy, or touch-target collisions before the final commit.

- [ ] **Step 4: Commit and push**

Commit: `git add gameinfo.txt docs/design-blueprint.html docs/superpowers/specs/2026-07-10-meta-screen-polish-design.md src tests; git commit -m "Polish Star Strike RUSH meta screens"; git push origin codex/progression-loop-v3`

## Plan Self-Review

- Tasks 1-5 cover shared screen navigation, title hierarchy, static screen density, Road ascent/inspection, responsive behavior, and motion boundaries.
- Task 6 covers documentation, security scan, and screenshot evidence.
- Each new helper is browser-global, matches the ordered script architecture, and has a Node VM test before implementation.
