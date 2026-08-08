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
  ".png": "image/png",
  ".webmanifest": "application/manifest+json; charset=utf-8"
};

let browser;
let server;
let baseUrl;

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

async function debugSnapshot(page) {
  return page.evaluate(() => JSON.parse(document.querySelector("#debugSnapshot").textContent));
}

async function openGame(context, route = "/?debug=1") {
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error" && !message.text().includes("404")) errors.push(message.text());
  });
  await page.goto(`${baseUrl}${route}`, { waitUntil: "commit" });
  await page.waitForFunction(() => document.querySelector("#debugSnapshot")?.textContent, null, { timeout: 90_000 });
  return { page, errors };
}

before(async () => {
  server = http.createServer(staticResponse);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({ headless: true });
});

test("a fresh player explicitly chooses First Flight before the separate call-sign briefing", { timeout: 120_000 }, async () => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  try {
    await page.goto(baseUrl, { waitUntil: "commit" });
    const yes = page.getByRole("button", { name: "YES — START FIRST FLIGHT" });
    await yes.waitFor({ state: "visible", timeout: 90_000 });
    assert.equal(
      await page.locator("#tutorialLiveRegion").textContent(),
      "COLONEL ARISAKA: Is this your first time here, pilot?"
    );
    assert.equal(await page.getByRole("button", { name: "NO — GO TO TITLE" }).isVisible(), true);
    await page.waitForFunction(() => document.activeElement?.textContent === "YES — START FIRST FLIGHT");
    await yes.click();
    const begin = page.getByRole("button", { name: "Begin Flight Training" });
    await begin.waitFor({ state: "visible" });
    assert.match(await page.locator("#tutorialLiveRegion").textContent(), /Colonel Arisaka/i);
    await begin.click();
    await page.waitForFunction(() => document.body.dataset.gameRunMode === "tutorial", null, { timeout: 8_000 });
    assert.equal(await page.locator("#tutorialLiveRegion").getAttribute("aria-live"), "polite");
    assert.deepEqual(errors, []);
  } finally {
    await context.close();
  }
});

test("NO stores the one-time decision and reload returns directly to the ordinary title", { timeout: 120_000 }, async () => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await context.addInitScript(() => {
    localStorage.setItem("star_strike_rush_high_score_v1", "9000");
    localStorage.setItem("star_strike_rush_local_achievements_v1", JSON.stringify(["first_sortie"]));
  });
  const page = await context.newPage();
  try {
    await page.goto(baseUrl, { waitUntil: "commit" });
    const no = page.getByRole("button", { name: "NO — GO TO TITLE" });
    await no.waitFor({ state: "visible", timeout: 90_000 });
    await no.focus();
    await page.keyboard.press("Enter");
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem("star_strike_rush_onboarding_v1")).status), "skipped");
    await page.reload({ waitUntil: "commit" });
    await page.waitForTimeout(300);
    assert.equal(await page.getByRole("button", { name: "YES — START FIRST FLIGHT" }).isVisible().catch(() => false), false);
    assert.equal(await page.evaluate(() => localStorage.getItem("star_strike_rush_high_score_v1")), "9000");
    await page.waitForFunction(() => onboardingUiMode === "none" && state.gameState === "start" && state.sceneTransition.mode === "idle");
    const play = page.getByRole("button", { name: "Play", exact: true });
    await play.waitFor({ state: "visible" });
    await play.focus();
    await page.keyboard.press("Enter");
    await page.waitForFunction(() => state.sceneTransition.mode === "title_launch" || state.gameState === "playing");
  } finally {
    await context.close();
  }
});

test("completed First Flight state restores an interactive ordinary title", { timeout: 120_000 }, async () => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await context.addInitScript(() => {
    localStorage.setItem("star_strike_rush_onboarding_v1", JSON.stringify({
      schemaVersion: 1,
      tutorialVersion: 1,
      status: "completed",
      checkpoint: "graduation",
      startedAtMs: Date.now() - 60_000,
      updatedAtMs: Date.now(),
      completedAtMs: Date.now(),
      accountOfferShown: true,
      codexGraduationApplied: true
    }));
  });
  const page = await context.newPage();
  try {
    await page.goto(baseUrl, { waitUntil: "commit" });
    await page.waitForFunction(() => typeof onboardingUiMode !== "undefined" && onboardingUiMode === "none" && state.gameState === "start" && state.sceneTransition.mode === "idle");
    assert.equal(await page.getByRole("button", { name: "YES — START FIRST FLIGHT" }).isVisible().catch(() => false), false);
    const play = page.getByRole("button", { name: "Play", exact: true });
    await play.waitFor({ state: "visible" });
    await play.focus();
    await page.keyboard.press("Enter");
    await page.waitForFunction(() => state.sceneTransition.mode === "title_launch" || state.gameState === "playing");
  } finally {
    await context.close();
  }
});

test("held movement and ability input cannot affect the ship during game arrival", { timeout: 120_000 }, async () => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const { page, errors } = await openGame(context, "/?debug=1");
  try {
    await page.keyboard.down("ArrowRight");
    await page.keyboard.down("Space");
    await page.evaluate(() => {
      startPlayingSession();
      // Keep the real arrival policy active long enough for this browser test
      // to inspect multiple rendered frames on slower CI workers.
      state.sceneTransition.duration = SIMULATION_HZ;
      state.sceneTransition.durationSeconds = 1;
      state.sceneTransition.elapsedSeconds = 0;
    });
    await page.waitForFunction(() => state.sceneTransition.mode === "game_arrival");
    const before = await debugSnapshot(page);
    await page.waitForTimeout(180);
    const during = await debugSnapshot(page);
    assert.equal(during.player.x, before.player.x);
    assert.equal(during.player.ghostTimer, 0);
    assert.equal(during.score, before.score);
    assert.equal(during.counts.enemies, before.counts.enemies);
    await page.keyboard.up("ArrowRight");
    await page.keyboard.up("Space");
    await page.waitForFunction(() => JSON.parse(document.querySelector("#debugSnapshot").textContent).transition.mode === "idle");
    assert.deepEqual(errors, []);
  } finally {
    await context.close();
  }
});

test("development powerup gallery loads every supplied powerup without fallback errors", { timeout: 120_000 }, async () => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const { page, errors } = await openGame(context, "/?debug=1&scenario=powerups");
  try {
    await page.waitForFunction(() => JSON.parse(document.querySelector("#debugSnapshot").textContent).counts.powerups === 13);
    const snapshot = await debugSnapshot(page);
    assert.equal(snapshot.runMode, "debug");
    assert.equal(snapshot.counts.powerups, 13);
    assert.deepEqual(errors, []);
    assert.deepEqual(snapshot.runtimeErrors, []);
  } finally {
    await context.close();
  }
});

test("high-density displays use a crisp backing canvas without changing logical gameplay coordinates", { timeout: 120_000 }, async () => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const { page, errors } = await openGame(context);
  try {
    const metrics = await page.evaluate(() => {
      const canvas = document.querySelector("canvas");
      const rect = canvas.getBoundingClientRect();
      return { backingWidth: canvas.width, backingHeight: canvas.height, cssWidth: rect.width, cssHeight: rect.height };
    });
    assert.equal(metrics.cssWidth, 390);
    assert.equal(metrics.cssHeight, 844);
    assert.equal(metrics.backingWidth, 780);
    assert.equal(metrics.backingHeight, 1688);
    const snapshot = await debugSnapshot(page);
    assert.equal(snapshot.player.x, 187.5);
    assert.equal(snapshot.player.y, 533.6);
    assert.deepEqual(errors, []);
  } finally {
    await context.close();
  }
});

test("title launch and panel close use stateful spatial transitions", { timeout: 120_000 }, async () => {
  const context = await browser.newContext({ viewport: { width: 375, height: 667 } });
  const first = await openGame(context);
  try {
    await first.page.mouse.click(187, 310);
    await first.page.waitForTimeout(100);
    const launching = await debugSnapshot(first.page);
    assert.equal(launching.gameState, "start");
    assert.equal(launching.transition.mode, "title_launch");
    assert.ok(launching.transition.progress > 0 && launching.transition.progress < 1);
    await first.page.waitForFunction(() => JSON.parse(document.querySelector("#debugSnapshot").textContent).gameState === "playing", null, { timeout: 5_000 });
    assert.deepEqual(first.errors, []);
  } finally {
    await first.page.close();
  }

  const second = await openGame(context);
  try {
    await second.page.mouse.click(38, 237);
    await second.page.waitForTimeout(350);
    const opened = await debugSnapshot(second.page);
    assert.equal(opened.ui.titleSubState, "online");
    assert.ok(opened.ui.titlePanelAnim > 0.8);
    assert.ok(opened.ui.titlePanelOrigin.x < 60);
    await second.page.mouse.click(38, 31);
    await second.page.waitForTimeout(180);
    const closing = await debugSnapshot(second.page);
    assert.ok(closing.ui.titlePanelAnim < opened.ui.titlePanelAnim);
    assert.equal(closing.ui.titlePanelTarget, 0);
    assert.deepEqual(second.errors, []);
  } finally {
    await second.page.close();
    await context.close();
  }
});

test("call sign autosaves on blur and gameplay announcements stay out of the playfield", { timeout: 120_000 }, async () => {
  const context = await browser.newContext({ viewport: { width: 375, height: 667 } });
  const { page, errors } = await openGame(context);
  try {
    await page.mouse.click(187, 237);
    await page.locator("#callSignInput").fill("NOVA_7");
    await page.mouse.click(350, 640);
    await page.waitForFunction(() => JSON.parse(document.querySelector("#debugSnapshot").textContent).ui.callSign === "NOVA_7");
    let snapshot = await debugSnapshot(page);
    assert.equal(snapshot.ui.callSignEditing, false);

    await page.keyboard.press("Enter");
    await page.waitForFunction(() => {
      const snapshot = JSON.parse(document.querySelector("#debugSnapshot").textContent);
      return snapshot.gameState === "playing" && snapshot.input.gameplayControlEnabled === true;
    });
    await page.evaluate(() => window.showMessage("DISTRACTING POPUP", 120));
    await page.waitForTimeout(60);
    snapshot = await debugSnapshot(page);
    assert.equal(snapshot.ui.message, "");
    assert.deepEqual(errors, []);
  } finally {
    await context.close();
  }
});

test("accessibility settings persist, reduce transition motion, and apply high contrast", { timeout: 120_000 }, async () => {
  const context = await browser.newContext({ viewport: { width: 375, height: 667 } });
  await context.addInitScript(() => {
    // This regression exercises the established-pilot Settings flow, not
    // first-launch routing. A prior record is meaningful local progress.
    localStorage.setItem("star_strike_rush_high_score_v1", "100");
  });
  const { page, errors } = await openGame(context);
  try {
    await page.mouse.click(38, 237);
    await page.waitForFunction(() => JSON.parse(document.querySelector("#debugSnapshot").textContent).ui.titlePanelAnim > 0.8);
    await page.mouse.click(295, 78);
    await page.mouse.click(187, 275);
    await page.waitForFunction(() => JSON.parse(document.querySelector("#debugSnapshot").textContent).ui.settingReducedMotion === true);
    await page.mouse.click(187, 313);
    await page.waitForFunction(() => JSON.parse(document.querySelector("#debugSnapshot").textContent).ui.settingReducedFlash === true);
    await page.mouse.click(187, 351);
    await page.waitForFunction(() => JSON.parse(document.querySelector("#debugSnapshot").textContent).ui.settingHighContrast === true);

    let snapshot = await debugSnapshot(page);
    assert.equal(snapshot.ui.settingReducedMotion, true);
    assert.equal(snapshot.ui.settingReducedFlash, true);
    assert.equal(snapshot.ui.settingHighContrast, true);
    assert.match(await page.locator("canvas").evaluate((canvas) => canvas.style.filter), /contrast/);

    await page.reload({ waitUntil: "commit" });
    await page.waitForFunction(() => document.querySelector("#debugSnapshot")?.textContent);
    snapshot = await debugSnapshot(page);
    assert.equal(snapshot.ui.settingReducedMotion, true);
    assert.equal(snapshot.ui.settingReducedFlash, true);
    assert.equal(snapshot.ui.settingHighContrast, true);

    await page.keyboard.press("Enter");
    await page.waitForFunction(() => {
      const snapshot = JSON.parse(document.querySelector("#debugSnapshot").textContent);
      return snapshot.gameState === "playing" && snapshot.input.gameplayControlEnabled === true;
    });
    snapshot = await debugSnapshot(page);
    assert.equal(snapshot.transition.lastLaunchDurationSeconds, 0.42);
    assert.equal(snapshot.transition.lastLaunchReducedMotion, true);
    assert.deepEqual(errors, []);
  } finally {
    await context.close();
  }
});

test("debug runs cannot persist records or progression across reload", { timeout: 120_000 }, async () => {
  const context = await browser.newContext({ viewport: { width: 375, height: 667 } });
  await context.addInitScript(() => {
    localStorage.setItem("star_strike_rush_high_score_v1", "100");
    localStorage.setItem("star_strike_rush_meta_v1", JSON.stringify({
      totalGlory: 55,
      credits: 12,
      currentSeason: { id: "season_01", name: "Launch Flight", xp: 77, claimedRewardIds: [] },
      lifetime: { runs: 2, score: 100, bestScore: 100, bestPhase: 2 }
    }));
    localStorage.setItem("star_strike_rush_achievements_v1", JSON.stringify(["first_sortie"]));
  });
  const { page, errors } = await openGame(context, "/?debug=1&scenario=siphon");
  try {
    const before = await debugSnapshot(page);
    await page.evaluate(() => {
      addScore(50000);
      saveMilestone();
      window.dispatchEvent(new Event("beforeunload"));
    });
    const during = await debugSnapshot(page);
    assert.ok(during.score >= 50000);
    assert.equal(during.highScore, 100);
    assert.deepEqual(during.deviceProgress, before.deviceProgress);
    assert.equal(await page.evaluate(() => localStorage.getItem("star_strike_rush_high_score_v1")), "100");

    await page.reload({ waitUntil: "commit" });
    await page.waitForFunction(() => document.querySelector("#debugSnapshot")?.textContent);
    const reloaded = await debugSnapshot(page);
    assert.equal(reloaded.highScore, 100);
    assert.equal(reloaded.deviceProgress.totalGlory, 55);
    assert.equal(reloaded.deviceProgress.lifetime.runs, 2);
    assert.deepEqual(reloaded.localAchievements, ["first_sortie"]);
    assert.deepEqual(errors, []);
  } finally {
    await context.close();
  }
});

test("Reset Local Data clears every progression store and preserves settings and identities after reload", { timeout: 120_000 }, async () => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await context.addInitScript(() => {
    if (sessionStorage.getItem("reset-fixture-seeded") === "1") return;
    sessionStorage.setItem("reset-fixture-seeded", "1");
    localStorage.setItem("star_strike_rush_high_score_v1", "12345");
    localStorage.setItem("star_strike_rush_meta_v1", JSON.stringify({
      totalGlory: 999,
      credits: 222,
      currentSeason: { id: "season_01", name: "Launch Flight", xp: 3333, claimedRewardIds: ["season_01_tier_1"] },
      lifetime: { runs: 9, score: 12345, kills: 80, bestScore: 12345, bestPhase: 8 },
      recentReceipts: [{ receiptId: "local-old" }]
    }));
    localStorage.setItem("star_strike_rush_achievements_v1", JSON.stringify(["first_sortie", "mythic_score"]));
    localStorage.setItem("star_strike_rush_codex_v1", JSON.stringify({ red: true, boss_standard: true }));
    localStorage.setItem("star_strike_rush_last_run_v1", JSON.stringify({ score: 12345 }));
    localStorage.setItem("star_strike_rush_callsign_v1", "GUEST_KEEP");
    localStorage.setItem("star_strike_rush_settings_v1", JSON.stringify({
      settingMaxParticles: 600,
      settingScreenShake: false,
      settingReducedMotion: true,
      settingReducedFlash: true,
      settingHighContrast: true,
      settingMusicEnabled: false,
      settingEffectsEnabled: true
    }));
    localStorage.setItem("star_strike_rush_account_identity_v1:account-a", JSON.stringify({
      uid: "account-a",
      desiredCallSign: "ACCOUNT_KEEP",
      publishedCallSign: "ACCOUNT_KEEP",
      pending: false,
      status: "published",
      updatedAtMs: 100
    }));
  });
  const { page, errors } = await openGame(context);
  try {
    await page.evaluate(() => resetProgressData());
    await page.reload({ waitUntil: "commit" });
    await page.waitForFunction(() => document.querySelector("#debugSnapshot")?.textContent);
    const reset = await debugSnapshot(page);
    assert.equal(reset.highScore, 0);
    assert.equal(reset.deviceProgress.totalGlory, 0);
    assert.equal(reset.deviceProgress.seasonXP, 0);
    assert.equal(reset.deviceProgress.credits, 0);
    assert.equal(reset.deviceProgress.lifetime.runs, 0);
    assert.deepEqual(reset.deviceProgress.seasonClaimedRewardIds, []);
    assert.deepEqual(reset.localAchievements, []);
    const preserved = await page.evaluate(() => ({
      callSign: localStorage.getItem("star_strike_rush_callsign_v1"),
      settings: JSON.parse(localStorage.getItem("star_strike_rush_settings_v1")),
      account: JSON.parse(localStorage.getItem("star_strike_rush_account_identity_v1:account-a")),
      achievements: localStorage.getItem("star_strike_rush_achievements_v1"),
      lastRun: localStorage.getItem("star_strike_rush_last_run_v1"),
      codex: JSON.parse(localStorage.getItem("star_strike_rush_codex_v1"))
    }));
    assert.equal(preserved.callSign, "GUEST_KEEP");
    assert.equal(preserved.settings.settingMusicEnabled, false);
    assert.equal(preserved.settings.settingEffectsEnabled, true);
    assert.equal(preserved.account.publishedCallSign, "ACCOUNT_KEEP");
    assert.equal(preserved.achievements, null);
    assert.equal(preserved.lastRun, null);
    assert.deepEqual(preserved.codex, {});
    assert.deepEqual(errors, []);
  } finally {
    await context.close();
  }
});

after(async () => {
  if (browser) await browser.close();
  if (server) await new Promise((resolve) => server.close(resolve));
});

test("a clean browser can start, move, pause, resume, and keep time frozen while paused", { timeout: 120_000 }, async () => {
  const context = await browser.newContext({ viewport: { width: 375, height: 667 } });
  const { page, errors } = await openGame(context);
  try {
    await page.keyboard.press("Enter");
    await page.waitForFunction(() => {
      const snapshot = JSON.parse(document.querySelector("#debugSnapshot").textContent);
      return snapshot.gameState === "playing" && snapshot.input.gameplayControlEnabled === true;
    });
    const started = await debugSnapshot(page);
    await page.keyboard.down("ArrowLeft");
    await page.waitForTimeout(250);
    await page.keyboard.up("ArrowLeft");
    const moved = await debugSnapshot(page);
    assert.ok(moved.player.x < started.player.x - 8, "keyboard movement should change the player position");

    await page.keyboard.press("Escape");
    await page.waitForTimeout(120);
    const paused = await debugSnapshot(page);
    assert.equal(paused.gameState, "paused");
    assert.equal(paused.player.hp, moved.player.hp - 1, "a deliberate pause must cost exactly one health bar");
    assert.equal(paused.ui.pauseNotice, "PAUSE COST: 1 HEALTH BAR");
    assert.ok(paused.layout.pause.x < 60, "pause control must be in the top-left");
    assert.ok(paused.layout.hud.energy.y < paused.layout.hud.health.y, "energy must render above health");
    assert.ok(paused.layout.hud.energy.y > 400, "classic status bars must sit in the bottom-left");
    assert.equal(paused.layout.hud.health.orientation, "horizontal");
    await page.waitForTimeout(180);
    const stillPaused = await debugSnapshot(page);
    assert.equal(stillPaused.frame, paused.frame, "simulation frames must freeze while paused");
    assert.equal(stillPaused.player.hp, paused.player.hp, "a paused frame must not charge health again");

    await page.keyboard.press("Escape");
    await page.waitForFunction(() => JSON.parse(document.querySelector("#debugSnapshot").textContent).gameState === "playing");

    await page.evaluate(() => {
      state.player.hp = 1;
      pauseGame("manual");
    });
    await page.waitForFunction(() => {
      const snapshot = JSON.parse(document.querySelector("#debugSnapshot").textContent);
      return snapshot.gameState === "playing"
        && snapshot.player.hp === 1
        && snapshot.ui.pauseNotice === "PAUSE NEEDS 1 SPARE HEALTH BAR";
    });
    const refused = await debugSnapshot(page);
    assert.equal(refused.gameState, "playing");
    assert.equal(refused.player.hp, 1);
    assert.equal(refused.ui.pauseNotice, "PAUSE NEEDS 1 SPARE HEALTH BAR");

    await page.evaluate(() => {
      state.player.hp = 3;
      pauseGame("visibility");
    });
    await page.waitForFunction(() => {
      const snapshot = JSON.parse(document.querySelector("#debugSnapshot").textContent);
      return snapshot.gameState === "paused"
        && snapshot.player.hp === 2
        && snapshot.ui.pauseNotice === "AUTO-PAUSE COST: 1 HEALTH BAR";
    });
    const automatic = await debugSnapshot(page);
    assert.equal(automatic.gameState, "paused");
    assert.equal(automatic.player.hp, 2, "automatic pauses must deduct one health bar");
    assert.equal(automatic.ui.pauseNotice, "AUTO-PAUSE COST: 1 HEALTH BAR");

    const lethalAutomatic = await page.evaluate(() => {
      state.gameState = "playing";
      state.player.hp = 1;
      pauseGame("visibility");
      return { hp: state.player.hp, gameState: state.gameState };
    });
    assert.equal(lethalAutomatic.hp, 0, "the final automatic-pause cost must not be silently waived");
    assert.equal(lethalAutomatic.gameState, "gameover", "a lethal automatic-pause cost must end a standard run cleanly");
    assert.deepEqual(errors, []);
  } finally {
    await context.close();
  }
});

test("resume countdown can be cancelled without hidden actions or an additional health charge", { timeout: 120_000 }, async () => {
  const context = await browser.newContext({ viewport: { width: 375, height: 667 }, hasTouch: true, isMobile: true });
  const { page, errors } = await openGame(context);
  try {
    const initial = await page.evaluate(() => {
      startPlayingSession();
      state.sceneTransition = { mode: "idle", frame: 0, duration: 1, elapsedSeconds: 0, durationSeconds: 0 };
      state.player.hp = 4;
      pauseGame("manual");
      return getDebugSnapshot();
    });
    assert.equal(initial.gameState, "paused");
    assert.equal(initial.player.hp, 3, "the original deliberate pause should charge exactly once");

    const overlay = await page.evaluate(() => {
      resumeGame();
      state.resumeCountdown = 99999;
      const rects = getPauseOverlayRects();
      const screenRect = (rect) => ({
        x: offsetX + rect.x * scale,
        y: offsetY + rect.y * scale,
        w: rect.w * scale,
        h: rect.h * scale
      });
      return { restart: screenRect(rects.restart), resume: screenRect(rects.resume) };
    });
    await page.dispatchEvent("canvas", "pointerdown", {
      pointerId: 51,
      pointerType: "touch",
      clientX: overlay.restart.x + overlay.restart.w / 2,
      clientY: overlay.restart.y + overlay.restart.h / 2,
      buttons: 1
    });
    await page.dispatchEvent("canvas", "pointerup", {
      pointerId: 51,
      pointerType: "touch",
      clientX: overlay.restart.x + overlay.restart.w / 2,
      clientY: overlay.restart.y + overlay.restart.h / 2,
      buttons: 0
    });
    await page.waitForTimeout(60);
    let snapshot = await debugSnapshot(page);
    assert.equal(snapshot.gameState, "resuming", "invisible restart and title hit areas must be inert during countdown");
    assert.equal(snapshot.player.hp, 3);

    await page.dispatchEvent("canvas", "pointerdown", {
      pointerId: 52,
      pointerType: "touch",
      clientX: overlay.resume.x + overlay.resume.w / 2,
      clientY: overlay.resume.y + overlay.resume.h / 2,
      buttons: 1
    });
    await page.dispatchEvent("canvas", "pointerup", {
      pointerId: 52,
      pointerType: "touch",
      clientX: overlay.resume.x + overlay.resume.w / 2,
      clientY: overlay.resume.y + overlay.resume.h / 2,
      buttons: 0
    });
    await page.waitForFunction(() => state.gameState === "paused");
    snapshot = await page.evaluate(() => getDebugSnapshot());
    assert.equal(snapshot.gameState, "paused", "the visible Stay Paused action should cancel the countdown");
    assert.equal(snapshot.player.hp, 3);
    assert.equal(snapshot.ui.pauseNotice, "RESUME CANCELLED — NO ADDITIONAL HEALTH COST");

    await page.evaluate(() => {
      resumeGame();
      state.resumeCountdown = 99999;
    });
    await page.keyboard.press("Escape");
    snapshot = await page.evaluate(() => getDebugSnapshot());
    assert.equal(snapshot.gameState, "paused", "Escape should return to the pause menu");
    assert.equal(snapshot.player.hp, 3, "cancelling resume must never charge another health bar");
    const pauseExplanationBeforeConfirm = snapshot.ui.pauseNotice;

    const destructiveRequest = await page.evaluate(() => {
      const restart = getPauseOverlayRects().restart;
      const handled = handlePausePointerDown(restart.x + restart.w / 2, restart.y + restart.h / 2);
      return { handled, gameState: state.gameState, runMode: state.runMode, pauseConfirmAction };
    });
    assert.deepEqual(destructiveRequest, { handled: true, gameState: "paused", runMode: "standard", pauseConfirmAction: "restart" });
    snapshot = await page.evaluate(() => getDebugSnapshot());
    assert.equal(snapshot.gameState, "paused", "the first destructive pause action must not discard the run");
    assert.equal(snapshot.ui.pauseConfirmAction, "restart");
    assert.equal(snapshot.player.hp, 3);
    await page.keyboard.press("Escape");
    snapshot = await page.evaluate(() => getDebugSnapshot());
    assert.equal(snapshot.gameState, "paused");
    assert.equal(snapshot.ui.pauseConfirmAction, "");
    assert.equal(snapshot.ui.pauseNotice, pauseExplanationBeforeConfirm, "cancelling a destructive action must restore the current pause explanation");
    assert.deepEqual(errors, []);
  } finally {
    await context.close();
  }
});

test("title panels and reset confirmation absorb launch keys and close predictably with Escape", { timeout: 120_000 }, async () => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const { page, errors } = await openGame(context);
  try {
    await page.evaluate(() => {
      setupSession("start");
      state.sceneTransition = { mode: "idle", frame: 0, duration: 1, elapsedSeconds: 0, durationSeconds: 0 };
      openTitleMetaScreen("online");
      titlePanelAnim = 1;
      titlePanelTarget = 1;
    });
    await page.keyboard.press("Enter");
    await page.keyboard.press("Space");
    let snapshot = await debugSnapshot(page);
    assert.equal(snapshot.gameState, "start");
    assert.equal(snapshot.transition.mode, "idle", "launch keys must not start a run through an open title panel");
    assert.equal(snapshot.ui.titlePanelTarget, 1);

    await page.keyboard.press("Escape");
    snapshot = await debugSnapshot(page);
    assert.equal(snapshot.ui.titlePanelTarget, 0, "Escape should close the active title panel");

    await page.evaluate(() => {
      openTitleMetaScreen("online");
      titlePanelAnim = 1;
      titlePanelTarget = 1;
      resetProgressConfirm = true;
    });
    await page.waitForFunction(() => gameAccessibilitySnapshot().mode === "reset-confirmation");
    await page.keyboard.press("Enter");
    snapshot = await debugSnapshot(page);
    assert.equal(snapshot.gameState, "start");
    assert.equal(snapshot.transition.mode, "idle");
    assert.equal(snapshot.ui.resetProgressConfirm, false, "the safely focused Keep Data action should cancel without erasing or launching");

    await page.evaluate(() => { resetProgressConfirm = true; });
    await page.waitForFunction(() => gameAccessibilitySnapshot().mode === "reset-confirmation");
    await page.keyboard.press("Escape");
    snapshot = await debugSnapshot(page);
    assert.equal(snapshot.ui.resetProgressConfirm, false, "Escape should cancel reset without closing the parent settings panel");
    assert.equal(snapshot.ui.titlePanelTarget, 1);
    assert.deepEqual(errors, []);
  } finally {
    await context.close();
  }
});

test("semantic title, settings, reset, pause, and game-over actions are keyboard operable", { timeout: 120_000 }, async () => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const { page, errors } = await openGame(context);
  try {
    await page.getByRole("button", { name: "Play" }).waitFor({ state: "attached" });
    const titleAccessibilitySnapshots = await page.evaluate(() => {
      const original = accountIdentitySnapshot;
      let calls = 0;
      accountIdentitySnapshot = (...args) => {
        calls++;
        return original(...args);
      };
      lastGameAccessibilitySyncKey = "";
      syncGameAccessibleSurface();
      accountIdentitySnapshot = original;
      return calls;
    });
    assert.equal(titleAccessibilitySnapshots, 0, "the title accessibility path must not clone the full account archive");
    const editingSurface = await page.evaluate(() => {
      callSignEditing = true;
      lastGameAccessibilitySyncKey = "";
      syncGameAccessibleSurface();
      const callSign = gameAccessibilitySnapshot();
      callSignEditing = false;
      handleEditing = true;
      syncGameAccessibleSurface();
      const handle = gameAccessibilitySnapshot();
      handleEditing = false;
      lastGameAccessibilitySyncKey = "";
      syncGameAccessibleSurface();
      return { callSign, handle };
    });
    assert.equal(editingSurface.callSign.hidden, true, "call-sign editing must hide stale Canvas actions");
    assert.equal(editingSurface.handle.hidden, true, "handle editing must hide stale Canvas actions");
    assert.deepEqual(await page.evaluate(() => ({
      callSignTabIndex: document.querySelector("#callSignInput").tabIndex,
      handleTabIndex: document.querySelector("#handleInput").tabIndex
    })), { callSignTabIndex: -1, handleTabIndex: -1 });

    await page.keyboard.press("Tab");
    assert.equal(await page.evaluate(() => document.activeElement?.getAttribute("aria-label")), "Play");
    const dossier = page.getByRole("button", { name: "Open Pilot Dossier" });
    await dossier.focus();
    await page.keyboard.press("Enter");
    await page.waitForFunction(() => titleSubState === "online" && titlePanelAnim >= 0.9);
    let snapshot = await debugSnapshot(page);
    assert.equal(snapshot.gameState, "start", "activating a semantic title control must not leak through to Play");
    assert.equal(snapshot.transition.mode, "idle");

    const settings = page.getByRole("button", { name: "Settings tab" });
    await settings.focus();
    await page.keyboard.press("Enter");
    await page.waitForFunction(() => accountPanelTab === "settings");
    const musicWasEnabled = (await debugSnapshot(page)).ui.settingMusicEnabled;
    const music = page.getByRole("button", { name: musicWasEnabled ? "Disable music" : "Enable music" });
    await music.focus();
    await page.keyboard.press("Space");
    await page.waitForFunction((before) => JSON.parse(document.querySelector("#debugSnapshot").textContent).ui.settingMusicEnabled !== before, musicWasEnabled);

    const reset = page.getByRole("button", { name: "Reset local gameplay data" });
    await reset.focus();
    await page.keyboard.press("Enter");
    const keep = page.getByRole("button", { name: "Keep data" });
    const erase = page.getByRole("button", { name: "Erase local gameplay data" });
    await keep.waitFor({ state: "attached" });
    assert.equal(await page.locator("#gameAccessibility").getAttribute("aria-modal"), "true");
    await page.waitForFunction(() => document.activeElement?.getAttribute("aria-label") === "Keep data");
    await erase.focus();
    await page.keyboard.press("Tab");
    assert.equal(await page.evaluate(() => document.activeElement?.getAttribute("aria-label")), "Keep data", "modal Tab should wrap to its safe first action");
    await page.keyboard.press("Escape");
    await page.waitForFunction(() => resetProgressConfirm === false);
    await page.waitForFunction(() => document.activeElement?.getAttribute("aria-label") === "Reset local gameplay data");
    snapshot = await debugSnapshot(page);
    assert.equal(snapshot.gameState, "start");

    await page.evaluate(() => {
      startPlayingSession();
      state.sceneTransition = { mode: "idle", frame: 0, duration: 1, elapsedSeconds: 0, durationSeconds: 0 };
      state.player.hp = 4;
    });
    await page.keyboard.press("Escape");
    const resume = page.getByRole("button", { name: "Resume flight" });
    await resume.waitFor({ state: "attached" });
    await page.waitForFunction(() => document.activeElement?.getAttribute("aria-label") === "Resume flight");
    assert.equal((await debugSnapshot(page)).player.hp, 3);
    const restartRun = page.getByRole("button", { name: "Restart run" });
    await restartRun.focus();
    await page.keyboard.press("Enter");
    const keepRun = page.getByRole("button", { name: "Keep run" });
    await keepRun.waitFor({ state: "attached" });
    assert.equal((await debugSnapshot(page)).gameState, "paused");
    await page.keyboard.press("Escape");
    await page.waitForFunction(() => pauseConfirmAction === "" && gameAccessibilitySnapshot().mode === "pause");
    await page.keyboard.press("Escape");
    await page.waitForFunction(() => JSON.parse(document.querySelector("#debugSnapshot").textContent).gameState === "resuming");
    await page.keyboard.press("Escape");
    await page.waitForFunction(() => JSON.parse(document.querySelector("#debugSnapshot").textContent).gameState === "paused");
    assert.equal((await debugSnapshot(page)).player.hp, 3, "semantic modal Escape must not double-charge pause Health");

    await page.evaluate(() => {
      setupSession("playing");
      state.runMode = "debug";
      state.gameState = "gameover";
      state.score = 12345;
    });
    const road = page.getByRole("button", { name: "Open Progress Road" });
    await road.waitFor({ state: "attached" });
    await road.focus();
    await page.keyboard.press("Enter");
    await page.waitForFunction(() => state.gameState === "start" && titleSubState === "progress" && titlePanelAnim > 0.02);
    await page.keyboard.press("PageDown");
    assert.ok(await page.evaluate(() => titleProgressScroll > 0), "Progress Road must scroll from the keyboard");
    assert.deepEqual(errors, []);
  } finally {
    await context.close();
  }
});

test("online recovery waits for active preload and then retries only failed artwork", { timeout: 120_000 }, async () => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const { page, errors } = await openGame(context);
  try {
    const result = await page.evaluate(async () => {
      const originalGetState = getAssetLoadState;
      const originalRetry = retryFailedAssets;
      const originalStartup = startupAssetPreloadPromise;
      let status = "loading";
      let failed = [];
      let retryCalls = 0;
      let resolveInitial;
      startupAssetPreloadPromise = new Promise((resolve) => { resolveInitial = resolve; });
      getAssetLoadState = () => ({ ready: status !== "loading", status, total: 2, completed: status === "loading" ? 1 : 2, failed: failed.slice() });
      retryFailedAssets = async () => {
        retryCalls++;
        failed = [];
        status = "ready";
        return getAssetLoadState();
      };
      const recovery = retryFailedGameAssetsAfterReconnect();
      await Promise.resolve();
      const callsBeforeSettle = retryCalls;
      failed = ["enemy_scout"];
      status = "fallback";
      resolveInitial(getAssetLoadState());
      const settled = await recovery;
      getAssetLoadState = originalGetState;
      retryFailedAssets = originalRetry;
      startupAssetPreloadPromise = originalStartup;
      return { callsBeforeSettle, retryCalls, settled };
    });
    assert.equal(result.callsBeforeSettle, 0, "recovery must not race the active preload");
    assert.equal(result.retryCalls, 1, "recovery should retry once after preload settles with failures");
    assert.equal(result.settled.status, "ready");
    assert.deepEqual(result.settled.failed, []);
    assert.deepEqual(errors, []);
  } finally {
    await context.close();
  }
});

test("touch can start a run, move with the joystick, and activate the ability without runtime errors", { timeout: 120_000 }, async () => {
  const context = await browser.newContext({
    viewport: { width: 375, height: 667 },
    hasTouch: true,
    isMobile: true
  });
  const { page, errors } = await openGame(context);
  try {
    await page.touchscreen.tap(187, 310);
    await page.waitForFunction(() => {
      const snapshot = JSON.parse(document.querySelector("#debugSnapshot").textContent);
      return snapshot.gameState === "playing" && snapshot.input.gameplayControlEnabled === true;
    });
    const started = await debugSnapshot(page);

    await page.dispatchEvent("canvas", "pointerdown", { pointerId: 21, pointerType: "touch", clientX: 76, clientY: 591, buttons: 1 });
    await page.dispatchEvent("canvas", "pointermove", { pointerId: 21, pointerType: "touch", clientX: 126, clientY: 591, buttons: 1 });
    await page.waitForTimeout(220);
    await page.dispatchEvent("canvas", "pointerup", { pointerId: 21, pointerType: "touch", clientX: 126, clientY: 591, buttons: 0 });
    const moved = await debugSnapshot(page);
    assert.ok(moved.player.x > started.player.x + 5, "touch joystick should move the player");

    const energyBefore = moved.player.energy;
    await page.touchscreen.tap(299, 591);
    await page.waitForTimeout(120);
    const activated = await debugSnapshot(page);
    assert.equal(activated.input.mode, "touch");
    assert.equal(activated.input.touchControlsVisible, true);
    assert.ok(activated.player.energy < energyBefore, "touch action should spend ability energy");
    assert.deepEqual(errors, []);
    assert.deepEqual(activated.runtimeErrors, []);
  } finally {
    await context.close();
  }
});

test("resize clears held joystick and armed canvas actions before coordinates change", { timeout: 120_000 }, async () => {
  const context = await browser.newContext({ viewport: { width: 375, height: 667 }, hasTouch: true, isMobile: true });
  const { page, errors } = await openGame(context);
  try {
    const play = (await debugSnapshot(page)).layout.play;
    await page.dispatchEvent("canvas", "pointerdown", {
      pointerId: 61,
      pointerType: "touch",
      clientX: play.x + play.w / 2,
      clientY: play.y + play.h / 2,
      buttons: 1
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForFunction(() => {
      const current = JSON.parse(document.querySelector("#debugSnapshot").textContent);
      return current.layout.scale > 1.03 && current.layout.offsetY > 70;
    });
    await page.dispatchEvent("canvas", "pointerup", {
      pointerId: 61,
      pointerType: "touch",
      clientX: play.x + play.w / 2,
      clientY: play.y + play.h / 2,
      buttons: 0
    });
    let snapshot = await debugSnapshot(page);
    assert.equal(snapshot.gameState, "start", "a stale Play pointer must not launch after the layout changes");
    assert.equal(snapshot.transition.mode, "idle");

    await page.evaluate(() => {
      startPlayingSession();
      state.sceneTransition = { mode: "idle", frame: 0, duration: 1, elapsedSeconds: 0, durationSeconds: 0 };
    });
    const touchLayout = await page.evaluate(() => ({
      x: offsetX + 76 * scale,
      y: offsetY + (H - 76) * scale,
      scale
    }));
    await page.dispatchEvent("canvas", "pointerdown", {
      pointerId: 62,
      pointerType: "touch",
      clientX: touchLayout.x,
      clientY: touchLayout.y,
      buttons: 1
    });
    await page.dispatchEvent("canvas", "pointermove", {
      pointerId: 62,
      pointerType: "touch",
      clientX: touchLayout.x + 50 * touchLayout.scale,
      clientY: touchLayout.y,
      buttons: 1
    });
    await page.waitForTimeout(80);
    snapshot = await debugSnapshot(page);
    assert.equal(snapshot.input.joystick.active, true);
    assert.ok(snapshot.input.joystick.ax > 0.2);

    await page.setViewportSize({ width: 844, height: 390 });
    await page.waitForFunction(() => {
      const current = JSON.parse(document.querySelector("#debugSnapshot").textContent);
      return current.layout.scale < 0.59
        && current.layout.offsetX > 300
        && current.input.joystick.active === false
        && current.input.joystick.ax === 0
        && current.input.joystick.ay === 0;
    });
    snapshot = await debugSnapshot(page);
    const xAfterResize = snapshot.player.x;
    assert.deepEqual(snapshot.input.joystick, { active: false, ax: 0, ay: 0 });
    await page.waitForTimeout(180);
    const settled = await debugSnapshot(page);
    assert.equal(settled.player.x, xAfterResize, "the ship must not drift from a pointer held through orientation change");
    assert.deepEqual(errors, []);
  } finally {
    await context.close();
  }
});

test("collecting a powerup applies its effect and emits visible pickup feedback", { timeout: 120_000 }, async () => {
  const context = await browser.newContext({ viewport: { width: 375, height: 667 } });
  const { page, errors } = await openGame(context);
  try {
    await page.keyboard.press("Enter");
    await page.waitForFunction(() => JSON.parse(document.querySelector("#debugSnapshot").textContent).gameState === "playing");
    await page.evaluate(() => {
      state.player.rapid = 0;
      state.particles = [];
      state.powerups = [{
        x: state.player.x,
        y: state.player.y,
        type: "rapid",
        vy: 0,
        size: 11,
        life: 900,
        rotation: 0,
        spinSpeed: 0.02
      }];
    });
    const feedbackHandle = await page.waitForFunction(() => {
      const feedback = {
        rapid: state.player.rapid,
        rings: state.lastPickupFeedback?.rings || 0,
        particles: state.lastPickupFeedback?.particles || 0
      };
      return feedback.rapid > 0 &&
        state.powerups.length === 0 &&
        state.lastPickupFeedback?.type === "rapid" &&
        feedback.rings >= 1 &&
        feedback.particles >= 20
        ? feedback
        : null;
    });
    const feedback = await feedbackHandle.jsonValue();
    assert.ok(feedback.rapid > 0);
    assert.ok(feedback.rings >= 1);
    assert.ok(feedback.particles >= 20);
    assert.deepEqual(errors, []);
  } finally {
    await context.close();
  }
});
