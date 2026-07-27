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
    await page.waitForFunction(() => JSON.parse(document.querySelector("#debugSnapshot").textContent).gameState === "playing");
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
    await page.waitForFunction(() => JSON.parse(document.querySelector("#debugSnapshot").textContent).gameState === "playing");
    snapshot = await debugSnapshot(page);
    assert.equal(snapshot.transition.duration, 1);
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
    await page.waitForFunction(() => JSON.parse(document.querySelector("#debugSnapshot").textContent).gameState === "playing");
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
    assert.equal(paused.layout.hud.health.orientation, "vertical");
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
    const refused = await debugSnapshot(page);
    assert.equal(refused.gameState, "playing");
    assert.equal(refused.player.hp, 1);
    assert.equal(refused.ui.pauseNotice, "PAUSE NEEDS 1 SPARE HEALTH BAR");

    await page.evaluate(() => {
      state.player.hp = 3;
      pauseGame("visibility");
    });
    const automatic = await debugSnapshot(page);
    assert.equal(automatic.gameState, "paused");
    assert.equal(automatic.player.hp, 3, "automatic safety pauses must not cost health");
    assert.equal(automatic.ui.pauseNotice, "AUTO-PAUSE: NO HEALTH COST");
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
    await page.waitForFunction(() => JSON.parse(document.querySelector("#debugSnapshot").textContent).gameState === "playing");
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
    await page.waitForFunction(() =>
      state.player.rapid > 0 &&
      state.powerups.length === 0 &&
      state.particles.some((particle) => particle.kind === "ring")
    );
    const feedback = await page.evaluate(() => ({
      rapid: state.player.rapid,
      rings: state.particles.filter((particle) => particle.kind === "ring").length,
      particles: state.particles.length
    }));
    assert.ok(feedback.rapid > 0);
    assert.ok(feedback.rings >= 1);
    assert.ok(feedback.particles >= 20);
    assert.deepEqual(errors, []);
  } finally {
    await context.close();
  }
});
