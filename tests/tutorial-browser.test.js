const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { after, before, test } = require("node:test");
const { chromium } = require("playwright");

const repoRoot = path.resolve(__dirname, "..");
const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mp3": "audio/mpeg",
  ".png": "image/png",
  ".webmanifest": "application/manifest+json; charset=utf-8"
};

let browser;
let server;
let baseUrl;
const GHOST_LANE_APPROACH_X = 140;
const GHOST_LANE_SAFE_TRIGGER_MIN_X = 118;
const GHOST_LANE_SAFE_TRIGGER_MAX_X = 165;

function staticResponse(request, response) {
  const url = new URL(request.url, "http://127.0.0.1");
  const requested = url.pathname === "/" ? "index.html" : decodeURIComponent(url.pathname.slice(1));
  const resolved = path.resolve(repoRoot, requested);
  if (!resolved.startsWith(`${repoRoot}${path.sep}`) || !fs.existsSync(resolved) || fs.statSync(resolved).isDirectory()) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }
  response.writeHead(200, {
    "Content-Type": mimeTypes[path.extname(resolved).toLowerCase()] || "application/octet-stream",
    "Cache-Control": "no-store"
  });
  fs.createReadStream(resolved).pipe(response);
}

async function snapshot(page) {
  return page.evaluate(() => JSON.parse(document.querySelector("#debugSnapshot").textContent));
}

async function pressContinue(page) {
  const button = page.getByRole("button", { name: "Continue" });
  if (!(await button.isVisible().catch(() => false))) return false;
  await button.click();
  await page.waitForTimeout(45);
  if (await button.isVisible().catch(() => false)) await button.click();
  await page.waitForTimeout(90);
  return true;
}

async function desktopMove(page, current, target) {
  const keys = [];
  if (target.x < current.x - 8) keys.push("ArrowLeft");
  if (target.x > current.x + 8) keys.push("ArrowRight");
  if (target.y < current.y - 8) keys.push("ArrowUp");
  if (target.y > current.y + 8) keys.push("ArrowDown");
  for (const key of keys) await page.keyboard.down(key);
  await page.waitForTimeout(130);
  for (const key of keys) await page.keyboard.up(key);
}

async function touchMove(page, cdp, layout, current, target) {
  const dx = Math.max(-1, Math.min(1, (target.x - current.x) / 70));
  const dy = Math.max(-1, Math.min(1, (target.y - current.y) / 70));
  const scale = layout.scale;
  const origin = {
    x: layout.offsetX + 76 * scale,
    y: layout.offsetY + (667 - 76) * scale
  };
  const point = {
    x: origin.x + dx * 46 * scale,
    y: origin.y + dy * 46 * scale
  };
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ ...origin, id: 1 }] });
  await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ ...point, id: 1 }] });
  await page.waitForTimeout(150);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
}

async function useAbility(page, mode, cdp, layout) {
  if (mode === "desktop") {
    await page.keyboard.press("Space");
    return;
  }
  const x = layout.offsetX + (375 - 76) * layout.scale;
  const y = layout.offsetY + (667 - 76) * layout.scale;
  await page.touchscreen.tap(x, y);
  await page.waitForTimeout(80);
}

async function desktopGhostCross(page) {
  await page.keyboard.down("ArrowRight");
  await page.keyboard.press("Space");
  await page.waitForFunction(() => {
    const current = JSON.parse(document.querySelector("#debugSnapshot").textContent);
    return current.tutorial?.director?.stepId !== "ghost_shift" || current.player.x > 225;
  }, null, { timeout: 2500 }).catch(() => {});
  await page.keyboard.up("ArrowRight");
}

async function touchGhostCross(page, cdp, layout) {
  const scale = layout.scale;
  const joystickOrigin = {
    x: layout.offsetX + 76 * scale,
    y: layout.offsetY + (667 - 76) * scale
  };
  const joystickRight = { x: joystickOrigin.x + 46 * scale, y: joystickOrigin.y };
  const action = {
    x: layout.offsetX + (375 - 76) * scale,
    y: layout.offsetY + (667 - 76) * scale
  };
  await page.dispatchEvent("canvas", "pointerdown", {
    pointerId: 31,
    pointerType: "touch",
    clientX: joystickOrigin.x,
    clientY: joystickOrigin.y,
    buttons: 1,
    isPrimary: true
  });
  await page.dispatchEvent("canvas", "pointermove", {
    pointerId: 31,
    pointerType: "touch",
    clientX: joystickRight.x,
    clientY: joystickRight.y,
    buttons: 1,
    isPrimary: true
  });
  await page.dispatchEvent("canvas", "pointerdown", {
    pointerId: 32,
    pointerType: "touch",
    clientX: action.x,
    clientY: action.y,
    buttons: 1,
    isPrimary: false
  });
  await page.waitForFunction(() => {
    const current = JSON.parse(document.querySelector("#debugSnapshot").textContent);
    return current.tutorial?.director?.stepId !== "ghost_shift" || current.player.x > 225;
  }, null, { timeout: 2500 }).catch(() => {});
  await page.dispatchEvent("canvas", "pointerup", {
    pointerId: 32,
    pointerType: "touch",
    clientX: action.x,
    clientY: action.y,
    buttons: 0,
    isPrimary: false
  });
  await page.dispatchEvent("canvas", "pointerup", {
    pointerId: 31,
    pointerType: "touch",
    clientX: joystickRight.x,
    clientY: joystickRight.y,
    buttons: 0,
    isPrimary: true
  });
}

async function completeTutorial(page, mode) {
  const startedAt = Date.now();
  const cdp = mode === "touch" ? await page.context().newCDPSession(page) : null;
  const evidence = {
    steps: new Set(),
    commandOverrideSeen: false,
    wraithOverrideSeen: false,
    matchingRealmDamageSeen: false
  };
  const explicitChoice = page.getByRole("button", { name: "YES — START FIRST FLIGHT" });
  await explicitChoice.waitFor({ state: "visible" });
  await explicitChoice.click();
  await page.getByRole("button", { name: "Begin Flight Training" }).click();
  await page.waitForFunction(() => {
    const data = JSON.parse(document.querySelector("#debugSnapshot").textContent);
    return data.runMode === "tutorial" && data.tutorial?.director?.stepId === "movement";
  }, null, { timeout: 12_000 });

  // The production clock intentionally drops excess catch-up work after a
  // runner stall. Keep the journey action-driven while allowing the same
  // four-to-six-minute completion envelope promised to real players on a
  // throttled host; no tutorial step advances synthetically.
  const deadline = Date.now() + 330_000;
  let lastStep = "";
  while (Date.now() < deadline) {
    const data = await snapshot(page);
    const director = data.tutorial && data.tutorial.director;
    if (!director) throw new Error("Tutorial director disappeared");
    evidence.steps.add(director.stepId);
    if (director.stepId === "command_boss" && data.encounter.boss?.tutorialOverride) evidence.commandOverrideSeen = true;
    if (director.stepId === "wraith_boss" && data.encounter.boss?.tutorialOverride) evidence.wraithOverrideSeen = true;
    if (data.tutorial.runtime?.matchingRealmDamage) evidence.matchingRealmDamageSeen = true;
    lastStep = director.stepId;
    if (director.dialogueVisible) {
      await pressContinue(page);
      continue;
    }
    if (director.stepId === "graduation" && director.dialogueVisible === false) break;

    let target = null;
    if (director.stepId === "movement") {
      const beacon = data.tutorial.runtime.activeBeacon;
      target = beacon ? { x: beacon.x, y: beacon.y } : null;
    } else if (director.stepId === "auto_weapons" || director.stepId === "controlled_wave") {
      const enemy = data.encounter.enemies.find((item) => item.y < data.player.y - 60);
      target = enemy ? { x: enemy.x, y: data.player.y } : { x: 187.5, y: data.player.y };
    } else if (director.stepId === "evasion") {
      target = { x: 295, y: data.player.y };
    } else if (director.stepId === "ghost_shift") {
      if (
        mode === "touch" &&
        data.player.x >= GHOST_LANE_SAFE_TRIGGER_MIN_X &&
        data.player.x < GHOST_LANE_SAFE_TRIGGER_MAX_X &&
        data.player.energy >= 35
      ) {
        await touchGhostCross(page, cdp, data.layout);
        target = null;
      } else if (
        mode === "desktop" &&
        data.player.x >= GHOST_LANE_SAFE_TRIGGER_MIN_X &&
        data.player.x < GHOST_LANE_SAFE_TRIGGER_MAX_X &&
        data.player.energy >= 35
      ) {
        await desktopGhostCross(page);
        target = null;
      } else {
        target = {
          x: data.player.x < GHOST_LANE_SAFE_TRIGGER_MIN_X ? GHOST_LANE_APPROACH_X : 130,
          y: data.player.y
        };
      }
    } else if (director.stepId === "powerup") {
      const powerup = data.encounter.powerups[0];
      target = powerup ? { x: powerup.x, y: powerup.y } : { x: 187.5, y: 470 };
    } else if (director.stepId === "command_boss") {
      target = data.encounter.boss ? { x: data.encounter.boss.x, y: data.player.y } : { x: 187.5, y: data.player.y };
    } else if (director.stepId === "realm_practice" || director.stepId === "wraith_boss") {
      if (data.encounter.boss && data.player.realm !== data.encounter.boss.realm && data.player.energy >= 18) {
        await useAbility(page, mode, cdp, data.layout);
      }
      target = data.encounter.boss ? { x: data.encounter.boss.x, y: data.player.y } : { x: 187.5, y: data.player.y };
    }

    if (target) {
      if (mode === "touch") await touchMove(page, cdp, data.layout, data.player, target);
      else await desktopMove(page, data.player, target);
    } else {
      await page.waitForTimeout(120);
    }
  }
  if (lastStep !== "graduation") throw new Error(`Tutorial did not graduate; last step ${lastStep}`);
  await pressContinue(page);
  await page.getByRole("button", { name: "Confirm Call Sign" }).click();
  await page.getByRole("button", { name: "Continue With Device Pilot" }).click();
  await page.waitForFunction(() => document.body.dataset.gameRunMode === "standard");
  evidence.durationSeconds = (Date.now() - startedAt) / 1000;
  return evidence;
}

before(async () => {
  server = http.createServer(staticResponse);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({ headless: true });
});

after(async () => {
  if (browser) await browser.close();
  if (server) await new Promise((resolve) => server.close(resolve));
});

for (const scenario of [
  { name: "desktop", viewport: { width: 1440, height: 900 }, context: {} },
  { name: "touch", viewport: { width: 390, height: 844 }, context: { hasTouch: true, isMobile: true } }
]) {
  test(`fresh ${scenario.name} player completes First Flight through real game actions`, { timeout: 380_000 }, async () => {
    const context = await browser.newContext({ viewport: scenario.viewport, ...scenario.context });
    const page = await context.newPage();
    const errors = [];
    const progressionRequests = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("request", (request) => {
      if (/submitRunReceipt|joinWeeklyLeague|claimSeasonReward/i.test(request.url())) progressionRequests.push(request.url());
    });
    try {
      await page.goto(`${baseUrl}/?debug=1&scenario=tutorial${scenario.name === "touch" ? "&input=touch" : ""}`, { waitUntil: "commit" });
      await page.waitForFunction(() => document.querySelector("#debugSnapshot")?.textContent, null, { timeout: 90_000 });
      const before = await page.evaluate(() => ({
        highScore: localStorage.getItem("star_strike_rush_high_score_v1"),
        meta: localStorage.getItem("star_strike_rush_meta_v1"),
        achievements: localStorage.getItem("star_strike_rush_achievements_v1")
      }));
      const evidence = await completeTutorial(page, scenario.name);
      const afterState = await page.evaluate(() => ({
        highScore: localStorage.getItem("star_strike_rush_high_score_v1"),
        meta: localStorage.getItem("star_strike_rush_meta_v1"),
        achievements: localStorage.getItem("star_strike_rush_achievements_v1"),
        onboarding: JSON.parse(localStorage.getItem("star_strike_rush_onboarding_v1"))
      }));
      assert.deepEqual(
        { highScore: afterState.highScore, meta: afterState.meta, achievements: afterState.achievements },
        before
      );
      assert.equal(afterState.onboarding.status, "completed");
      assert.equal(afterState.onboarding.checkpoint, "graduation");
      assert.deepEqual(
        Array.from(evidence.steps),
        ["movement", "auto_weapons", "evasion", "ghost_shift", "powerup", "controlled_wave", "command_boss", "wraith_briefing", "realm_practice", "wraith_boss", "graduation"]
      );
      assert.equal(evidence.commandOverrideSeen, true);
      assert.equal(evidence.wraithOverrideSeen, true);
      assert.equal(evidence.matchingRealmDamageSeen, true);
      assert.ok(evidence.durationSeconds >= 45 && evidence.durationSeconds <= 360, `unexpected tutorial duration ${evidence.durationSeconds}s`);
      assert.deepEqual(progressionRequests, []);
      assert.deepEqual(errors, []);
    } finally {
      await context.close();
    }
  });
}

test("existing local progress does not answer the one-time first-flight question", { timeout: 90_000 }, async () => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await context.addInitScript(() => localStorage.setItem("star_strike_rush_high_score_v1", "1200"));
  const page = await context.newPage();
  try {
    await page.goto(baseUrl, { waitUntil: "commit" });
    await assert.doesNotReject(() => page.getByRole("button", { name: "YES — START FIRST FLIGHT" }).waitFor());
    assert.equal(await page.getByRole("button", { name: "NO — GO TO TITLE" }).isVisible(), true);
    await page.getByRole("button", { name: "NO — GO TO TITLE" }).click();
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem("star_strike_rush_onboarding_v1")).status), "skipped");
  } finally {
    await context.close();
  }
});

test("First Flight actions expose modal semantics and keep keyboard focus contained", { timeout: 90_000 }, async () => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  try {
    await page.goto(baseUrl, { waitUntil: "commit" });
    const root = page.locator("#tutorialAccessibility");
    const yes = page.locator('[data-onboarding-action="first-flight-yes"]');
    const no = page.locator('[data-onboarding-action="first-flight-no"]');
    await yes.waitFor({ state: "visible", timeout: 90_000 });
    await page.waitForFunction(() => document.activeElement?.dataset?.onboardingAction === "first-flight-yes");

    assert.equal(await root.getAttribute("role"), "dialog");
    assert.equal(await root.getAttribute("aria-modal"), "true");
    assert.equal(await root.getAttribute("aria-describedby"), "tutorialLiveRegion");

    await page.keyboard.press("Shift+Tab");
    assert.equal(await page.evaluate(() => document.activeElement?.dataset?.onboardingAction), "first-flight-no");
    await page.keyboard.press("Tab");
    assert.equal(await page.evaluate(() => document.activeElement?.dataset?.onboardingAction), "first-flight-yes");
    await no.focus();
    await page.keyboard.press("Tab");
    assert.equal(await page.evaluate(() => document.activeElement?.dataset?.onboardingAction), "first-flight-yes");
  } finally {
    await context.close();
  }
});

test("First Flight keeps status mounted and restores focus when actions dismiss", { timeout: 90_000 }, async () => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await context.addInitScript(() => {
    localStorage.setItem("star_strike_rush_onboarding_v1", JSON.stringify({
      schemaVersion: 1,
      status: "completed",
      checkpoint: "graduation",
      startedAtMs: 1,
      updatedAtMs: 2,
      completedAtMs: 2
    }));
  });
  const page = await context.newPage();
  try {
    await page.goto(`${baseUrl}/?debug=1`, { waitUntil: "commit" });
    await page.waitForFunction(() => document.querySelector("#debugSnapshot")?.textContent, null, { timeout: 90_000 });
    await page.evaluate(() => {
      const probe = document.createElement("button");
      probe.id = "tutorialFocusReturnProbe";
      probe.textContent = "Focus return probe";
      document.body.appendChild(probe);
      probe.focus();
      setTutorialAccessibleSurface("Modal focus test", [
        { label: "Confirm", action: "focus-test", primary: true, handler: () => {} }
      ]);
    });
    await page.waitForFunction(() => document.activeElement?.dataset?.onboardingAction === "focus-test");
    await page.evaluate(() => hideTutorialAccessibleSurface("Modal closed; status remains available."));
    await page.waitForFunction(() => document.activeElement?.id === "tutorialFocusReturnProbe");

    const state = await page.evaluate(() => {
      const root = document.querySelector("#tutorialAccessibility");
      const actions = document.querySelector("#tutorialAccessibleActions");
      const live = document.querySelector("#tutorialLiveRegion");
      return {
        rootDisplay: getComputedStyle(root).display,
        actionsDisplay: getComputedStyle(actions).display,
        role: root.getAttribute("role"),
        modal: root.getAttribute("aria-modal"),
        liveRole: live.getAttribute("role"),
        liveText: live.textContent
      };
    });
    assert.equal(state.rootDisplay, "block");
    assert.equal(state.actionsDisplay, "none");
    assert.equal(state.role, null);
    assert.equal(state.modal, null);
    assert.equal(state.liveRole, "status");
    assert.equal(state.liveText, "Modal closed; status remains available.");
  } finally {
    await context.close();
  }
});

test("a local call sign can be edited inline before training launch", { timeout: 90_000 }, async () => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  try {
    await page.goto(`${baseUrl}/?debug=1&scenario=tutorial`, { waitUntil: "commit" });
    const yes = page.getByRole("button", { name: "YES — START FIRST FLIGHT" });
    await yes.waitFor({ state: "visible", timeout: 90_000 });
    await yes.click();
    await page.getByRole("button", { name: "Edit Call Sign" }).waitFor();
    await page.getByRole("button", { name: "Edit Call Sign" }).click();
    await page.waitForFunction(() => document.activeElement?.id === "callSignInput");
    const input = page.locator("#callSignInput");
    await input.fill("NOVA_7", { force: true });
    assert.equal(await input.inputValue(), "NOVA_7");
    await input.press("Enter");
    await page.waitForFunction(() => JSON.parse(document.querySelector("#debugSnapshot").textContent).ui.callSign === "NOVA_7");
    assert.equal(await page.evaluate(() => localStorage.getItem("star_strike_rush_callsign_v1")), "NOVA_7");
    await page.getByRole("button", { name: "Begin Flight Training" }).click();
    await page.waitForFunction(() => JSON.parse(document.querySelector("#debugSnapshot").textContent).runMode === "tutorial", null, { timeout: 12_000 });
    assert.equal((await snapshot(page)).ui.callSign, "NOVA_7");
  } finally {
    await context.close();
  }
});

test("NO is immediate and replay starts from Settings without account setup", { timeout: 120_000 }, async () => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  try {
    await page.goto(`${baseUrl}/?debug=1&scenario=tutorial`, { waitUntil: "commit" });
    await page.getByRole("button", { name: "NO — GO TO TITLE" }).waitFor();
    await page.getByRole("button", { name: "NO — GO TO TITLE" }).click();
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem("star_strike_rush_onboarding_v1")).status), "skipped");

    await page.evaluate(() => localStorage.setItem("star_strike_rush_onboarding_v1", JSON.stringify({
      schemaVersion: 1,
      tutorialVersion: 1,
      status: "completed",
      checkpoint: "graduation",
      startedAtMs: 1,
      updatedAtMs: 2,
      completedAtMs: 2
    })));
    await page.goto(`${baseUrl}/?debug=1`, { waitUntil: "commit" });
    await page.waitForFunction(() => document.querySelector("#debugSnapshot")?.textContent, null, { timeout: 90_000 });
    let data = await snapshot(page);
    await page.mouse.click(data.layout.account.x + data.layout.account.w / 2, data.layout.account.y + data.layout.account.h / 2);
    await page.waitForFunction(() => JSON.parse(document.querySelector("#debugSnapshot").textContent).ui.titleSubState === "online");
    data = await snapshot(page);
    await page.mouse.click(data.layout.accountSettingsTab.x + data.layout.accountSettingsTab.w / 2, data.layout.accountSettingsTab.y + data.layout.accountSettingsTab.h / 2);
    await page.waitForTimeout(150);
    data = await snapshot(page);
    const replay = data.layout.replayTraining;
    assert.ok(replay);
    await page.mouse.click(replay.x + replay.w / 2, replay.y + replay.h / 2);
    await page.waitForFunction(() => JSON.parse(document.querySelector("#debugSnapshot").textContent).transition.mode === "title_launch");
    assert.equal((await snapshot(page)).tutorial.uiMode, "none");
  } finally {
    await context.close();
  }
});

test("reload after resuming preserves the checkpoint offer", { timeout: 120_000 }, async () => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  try {
    await page.goto(`${baseUrl}/?debug=1&scenario=tutorial-resume`, { waitUntil: "commit" });
    await page.getByRole("button", { name: "Resume Training" }).waitFor();
    await page.getByRole("button", { name: "Skip For Now" }).click();
    await page.getByRole("button", { name: "Keep Training" }).click();
    await page.waitForFunction(() => onboardingUiMode === "resume_training");
    assert.equal(await page.getByRole("button", { name: "Resume Training" }).isVisible(), true);
    await page.getByRole("button", { name: "Skip For Now" }).click();
    await page.keyboard.press("Escape");
    await page.waitForFunction(() => onboardingUiMode === "resume_training");
    assert.equal(await page.getByRole("button", { name: "Resume Training" }).isVisible(), true);
    await page.getByRole("button", { name: "Resume Training" }).click();
    await page.waitForFunction(() => JSON.parse(document.querySelector("#debugSnapshot").textContent).runMode === "tutorial", null, { timeout: 12_000 });
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem("star_strike_rush_onboarding_v1")).checkpoint), "before_wraith");
    await page.keyboard.press("Escape");
    await page.waitForFunction(() => state.gameState === "paused" && gameAccessibilitySnapshot().mode === "pause");
    assert.equal(await page.evaluate(() => gameAccessibilitySnapshot().actions.some((action) => action.id === "restart-checkpoint")), true);
    const restartCheckpoint = page.getByRole("button", { name: "Restart tutorial checkpoint", exact: true });
    await restartCheckpoint.waitFor();
    await restartCheckpoint.focus();
    await page.keyboard.press("Enter");
    await page.waitForFunction(() => {
      const state = JSON.parse(document.querySelector("#debugSnapshot").textContent);
      return state.gameState === "playing" &&
        state.tutorial?.director?.stepId === "wraith_briefing" &&
        state.tutorial?.director?.recoveryCount === 1;
    });
    assert.match(await page.getByRole("status").textContent(), /Training craft restored/i);
    await page.goto(baseUrl, { waitUntil: "commit" });
    await page.getByRole("button", { name: "Resume Training" }).waitFor();
    assert.match(await page.getByRole("status").textContent(), /before_wraith/i);
  } finally {
    await context.close();
  }
});

test("Firebase identity failure cannot block post-flight device continuation", { timeout: 120_000 }, async () => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  try {
    await page.goto(`${baseUrl}/?debug=1&scenario=tutorial-post`, { waitUntil: "commit" });
    await page.getByRole("button", { name: "Connect Google Account" }).waitFor();
    await page.getByRole("button", { name: "Connect Google Account" }).click();
    await page.waitForFunction(() => /unavailable|not completed/i.test(document.querySelector("#tutorialLiveRegion")?.textContent || ""));
    assert.equal(await page.getByRole("button", { name: "Continue With Device Pilot" }).isVisible(), true);
    const progressBefore = await page.evaluate(() => JSON.stringify(currentMetaSnapshot()));
    await page.getByRole("button", { name: "Continue With Device Pilot" }).click();
    const continuation = await page.evaluate(() => ({
      runMode: document.body.dataset.gameRunMode,
      gameState: state.gameState,
      uiMode: onboardingUiMode,
      accountPulseFrames: onboardingAccountPulseFrames,
      progress: JSON.stringify(currentMetaSnapshot())
    }));
    assert.equal(continuation.runMode, "standard");
    assert.equal(continuation.gameState, "start");
    assert.equal(continuation.uiMode, "none");
    assert.ok(continuation.accountPulseFrames > 0);
    assert.equal(continuation.progress, progressBefore);
  } finally {
    await context.close();
  }
});

test("tutorial dialogue blocks held keyboard and touch input without leaking after Continue", { timeout: 120_000 }, async () => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  try {
    await page.goto(`${baseUrl}/?debug=1&scenario=tutorial&step=movement&input=touch`, { waitUntil: "commit" });
    await page.waitForFunction(() => {
      const raw = document.querySelector("#debugSnapshot")?.textContent;
      if (!raw) return false;
      const current = JSON.parse(raw);
      return current.runMode === "tutorial" && current.tutorial?.director?.dialogueVisible;
    }, null, { timeout: 90_000 });
    const before = await snapshot(page);
    await page.keyboard.down("ArrowRight");
    const origin = {
      x: before.layout.offsetX + 76 * before.layout.scale,
      y: before.layout.offsetY + (667 - 76) * before.layout.scale
    };
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ ...origin, id: 1 }] });
    await page.waitForTimeout(160);
    const blocked = await snapshot(page);
    assert.equal(blocked.player.x, before.player.x);
    assert.equal(blocked.input.gameplayControlEnabled, false);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await pressContinue(page);
    await page.keyboard.up("ArrowRight");
    await page.waitForFunction(() => JSON.parse(document.querySelector("#debugSnapshot").textContent).transition.mode === "idle");
    const released = await snapshot(page);
    await page.waitForTimeout(120);
    assert.equal((await snapshot(page)).player.x, released.player.x);
  } finally {
    await context.close();
  }
});

test("tutorial pause runtime and accessible Resume flight remain free when repeated", { timeout: 120_000 }, async () => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  try {
    await page.goto(`${baseUrl}/?debug=1&scenario=tutorial&step=movement`, { waitUntil: "commit" });
    await page.waitForFunction(() => {
      const raw = document.querySelector("#debugSnapshot")?.textContent;
      return !!raw && JSON.parse(raw).runMode === "tutorial";
    }, null, { timeout: 90_000 });
    await pressContinue(page);
    await page.waitForFunction(() => {
      const current = JSON.parse(document.querySelector("#debugSnapshot").textContent);
      return current.runMode === "tutorial" &&
        current.gameState === "playing" &&
        current.transition.mode === "idle" &&
        current.input.gameplayControlEnabled === true;
    });
    const healthBefore = (await snapshot(page)).player.hp;
    for (let count = 0; count < 2; count++) {
      assert.equal(await page.evaluate(() => pauseGame("manual")), true);
      await page.waitForFunction(() => {
        const current = JSON.parse(document.querySelector("#debugSnapshot").textContent);
        return current.gameState === "paused" &&
          current.ui.pauseNotice === "TRAINING PAUSED: NO HEALTH COST";
      });
      assert.equal((await snapshot(page)).player.hp, healthBefore);
      assert.equal((await snapshot(page)).ui.pauseNotice, "TRAINING PAUSED: NO HEALTH COST");
      const resumeFlight = page.getByRole("button", { name: "Resume flight", exact: true });
      await resumeFlight.focus();
      await page.keyboard.press("Enter");
      await page.waitForFunction(() => {
        const current = JSON.parse(document.querySelector("#debugSnapshot").textContent);
        return current.gameState === "playing" && current.input.gameplayControlEnabled === true;
      });
    }
    assert.equal((await snapshot(page)).player.hp, healthBefore);
  } finally {
    await context.close();
  }
});

test("post-graduation identity routing adapts to signed-out, no-handle, and confirmed accounts", { timeout: 120_000 }, async () => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  try {
    await page.goto(`${baseUrl}/?debug=1&scenario=tutorial-post-callsign`, { waitUntil: "commit" });
    await page.getByRole("button", { name: "Confirm Call Sign" }).waitFor();
    assert.equal(await page.getByRole("button", { name: "Confirm Call Sign" }).isVisible(), true);

    await page.evaluate(() => {
      window.starStrikeOnline = { getState: () => ({ user: { account: true }, profileHandle: "", pendingCallSign: false }) };
      tutorialRuntime = { replay: false };
      beginPostTutorialIdentityFlow();
    });
    await page.getByRole("button", { name: "Claim Unique Handle" }).waitFor();
    assert.equal(await page.getByRole("button", { name: "Connect Google Account" }).isVisible().catch(() => false), false);

    await page.evaluate(() => {
      window.starStrikeOnline = { getState: () => ({ user: { account: true }, profileHandle: "NOVA", pendingCallSign: false }) };
      tutorialRuntime = { replay: false };
      beginPostTutorialIdentityFlow();
    });
    await page.getByRole("button", { name: "Enter Hangar" }).waitFor();
    assert.equal(await page.getByRole("button", { name: "Claim Unique Handle" }).isVisible().catch(() => false), false);
  } finally {
    await context.close();
  }
});

test("touch ability reaches the real Ghost lesson action control", { timeout: 120_000 }, async () => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  try {
    await page.goto(`${baseUrl}/?debug=1&scenario=tutorial&step=ghost&input=touch`, { waitUntil: "commit" });
    await page.waitForFunction(() => {
      const raw = document.querySelector("#debugSnapshot")?.textContent;
      return !!raw && JSON.parse(raw).tutorial?.director?.stepId === "ghost_shift";
    }, null, { timeout: 90_000 });
    await pressContinue(page);
    await page.waitForFunction(() => JSON.parse(document.querySelector("#debugSnapshot").textContent).transition.mode === "idle");
    for (let attempt = 0; attempt < 3; attempt++) {
      let before = await snapshot(page);
      while (
        before.tutorial?.director?.stepId === "ghost_shift" &&
        !before.tutorial.director.dialogueVisible &&
        (
          before.player.x < GHOST_LANE_SAFE_TRIGGER_MIN_X ||
          before.player.x >= GHOST_LANE_SAFE_TRIGGER_MAX_X
        )
      ) {
        await touchMove(page, cdp, before.layout, before.player, {
          x: before.player.x < GHOST_LANE_SAFE_TRIGGER_MIN_X ? GHOST_LANE_APPROACH_X : 130,
          y: before.player.y
        });
        before = await snapshot(page);
      }
      if (before.tutorial?.director?.dialogueVisible) await pressContinue(page);
      if (before.tutorial?.director?.stepId !== "ghost_shift") break;
      await touchGhostCross(page, cdp, before.layout);
      await page.waitForTimeout(100);
      const after = await snapshot(page);
      if (after.tutorial?.director?.stepId === "powerup") break;
      if (after.tutorial?.director?.dialogueVisible) await pressContinue(page);
    }
    const completed = await snapshot(page);
    assert.equal(completed.tutorial?.director?.stepId, "powerup");
  } finally {
    await context.close();
  }
});
