"use strict";

const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { chromium } = require("playwright");

const repoRoot = path.resolve(__dirname, "..");
const externalBaseUrl = /^https?:\/\//i.test(process.argv[2] || "") ? process.argv[2].replace(/\/$/, "") : "";
const outputArgIndex = externalBaseUrl ? 3 : 2;
const outputDir = path.resolve(process.argv[outputArgIndex] || path.join(repoRoot, "test-artifacts", "visual-qa"));
const caseFilter = process.argv[outputArgIndex + 1] || "";
const localFallbackPaths = ["/__/firebase/init.json", "/src/firebase-config.local.json"];
const mimeTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".mp3", "audio/mpeg"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".webp", "image/webp"]
]);

const cases = [
  { name: "title-375x667", width: 375, height: 667, kind: "title" },
  { name: "title-390x844", width: 390, height: 844, kind: "title" },
  { name: "title-430x932", width: 430, height: 932, kind: "title" },
  { name: "title-768x1024", width: 768, height: 1024, kind: "title" },
  { name: "title-1440x900", width: 1440, height: 900, kind: "title" },
  { name: "title-landscape-844x390", width: 844, height: 390, kind: "title" },
  { name: "vault-touch-375x667", width: 375, height: 667, kind: "scroll", target: "achievements" },
  { name: "vault-touch-390x844", width: 390, height: 844, kind: "scroll", target: "achievements" },
  { name: "vault-touch-430x932", width: 430, height: 932, kind: "scroll", target: "achievements" },
  { name: "codex-touch-375x667", width: 375, height: 667, kind: "scroll", target: "codex" },
  { name: "codex-touch-390x844", width: 390, height: 844, kind: "scroll", target: "codex" },
  { name: "codex-touch-430x932", width: 430, height: 932, kind: "scroll", target: "codex" },
  { name: "reduced-motion", width: 390, height: 844, kind: "reduced-motion" },
  { name: "audio-settings", width: 390, height: 844, kind: "audio-settings" },
  { name: "settings-mobile-375x667", width: 375, height: 667, kind: "audio-settings" },
  { name: "reset-local-data-confirmation", width: 390, height: 844, kind: "reset-confirmation" },
  { name: "pilot-dossier", width: 390, height: 844, kind: "panel", target: "account" },
  { name: "pilot-dossier-connected", width: 390, height: 844, kind: "connected-panel", target: "account" },
  { name: "codex-overview", width: 390, height: 844, kind: "panel", target: "codex" },
  { name: "codex-command-ship-detail", width: 390, height: 844, kind: "codex-detail", target: "codex" },
  { name: "records-network", width: 390, height: 844, kind: "panel", target: "records" },
  { name: "records-weekly-connected", width: 390, height: 844, kind: "connected-panel", target: "records" },
  { name: "progress-road", width: 390, height: 844, kind: "panel", target: "progress" },
  { name: "glory-road-early-prestige-0", width: 375, height: 667, kind: "scenario", scenario: "glory-road-early", expectedGlory: 2500, expectedPrestige: 0 },
  { name: "glory-road-high-prestige-0", width: 390, height: 844, kind: "scenario", scenario: "glory-road-high", expectedGlory: 250000, expectedPrestige: 0 },
  { name: "glory-road-beginning-prestige-1", width: 430, height: 932, kind: "scenario", scenario: "glory-road-prestige-1", expectedGlory: 300200, expectedPrestige: 1 },
  { name: "glory-road-mid-prestige-3", width: 390, height: 844, kind: "scenario", scenario: "glory-road-prestige-3", expectedGlory: 925000, expectedPrestige: 3 },
  { name: "play-immediate", width: 390, height: 844, kind: "play" },
  { name: "gameplay-hud-375x667", width: 375, height: 667, kind: "gameplay-hud" },
  { name: "gameplay-hud-touch-390x844", width: 390, height: 844, kind: "gameplay-hud", touch: true },
  { name: "paused-hud-375x667", width: 375, height: 667, kind: "paused-hud" },
  { name: "pause-restart-confirmation", width: 375, height: 667, kind: "pause-confirm" },
  { name: "game-over-summary", width: 390, height: 844, kind: "scenario", scenario: "gameover" },
  { name: "game-over-rank-up", width: 390, height: 844, kind: "scenario", scenario: "gameover-rank" },
  { name: "game-over-prestige-rollover", width: 390, height: 844, kind: "scenario", scenario: "gameover-prestige" },
  { name: "glory-checkpoint-celebration", width: 375, height: 667, kind: "scenario", scenario: "glory-celebration-checkpoint", expectedCelebration: "checkpoint" },
  { name: "glory-rank-up-celebration", width: 390, height: 844, kind: "scenario", scenario: "glory-celebration-rank", expectedCelebration: "rank" },
  { name: "glory-late-rank-celebration", width: 430, height: 932, kind: "scenario", scenario: "glory-celebration-late", expectedCelebration: "rank" },
  { name: "glory-road-complete-celebration", width: 390, height: 844, kind: "scenario", scenario: "glory-celebration-prestige", expectedCelebration: "prestige" },
  { name: "glory-celebration-reduced-motion", width: 390, height: 844, kind: "scenario", scenario: "glory-celebration-prestige-reduced", expectedCelebration: "prestige" },
  { name: "debris-staging", width: 375, height: 667, kind: "scenario", scenario: "debris-incoming" },
  { name: "powerup-gallery", width: 390, height: 844, kind: "scenario", scenario: "powerups" },
  { name: "first-flight-galaxy-arrival", width: 390, height: 844, kind: "onboarding-arrival", scenario: "tutorial", touch: true },
  { name: "first-flight-question-375x667", width: 375, height: 667, kind: "tutorial-question", scenario: "tutorial", touch: true },
  { name: "first-flight-question-390x844", width: 390, height: 844, kind: "tutorial-question", scenario: "tutorial", touch: true },
  { name: "first-flight-question-430x932", width: 430, height: 932, kind: "tutorial-question", scenario: "tutorial", touch: true },
  { name: "first-flight-question-1440x900", width: 1440, height: 900, kind: "tutorial-question", scenario: "tutorial" },
  { name: "colonel-arisaka-call-sign-briefing", width: 390, height: 844, kind: "tutorial-prelaunch", scenario: "tutorial", touch: true },
  { name: "tutorial-navigation", width: 390, height: 844, kind: "tutorial-step", scenario: "tutorial", step: "movement", touch: true, activate: true },
  { name: "tutorial-target-arrival", width: 390, height: 844, kind: "tutorial-step", scenario: "tutorial", step: "auto_weapons", touch: true, activate: true },
  { name: "tutorial-ghost-shift", width: 390, height: 844, kind: "tutorial-step", scenario: "tutorial", step: "ghost", touch: true, activate: true, ghostVisual: true },
  { name: "tutorial-evasion-retry", width: 390, height: 844, kind: "tutorial-retry", scenario: "tutorial", step: "evasion", touch: true },
  { name: "tutorial-ghost-retry", width: 390, height: 844, kind: "tutorial-retry", scenario: "tutorial", step: "ghost", touch: true },
  { name: "tutorial-powerup", width: 390, height: 844, kind: "tutorial-step", scenario: "tutorial", step: "powerup", touch: true, activate: true },
  { name: "tutorial-command-ship", width: 1440, height: 900, kind: "tutorial-step", scenario: "tutorial", step: "command-boss", activate: true },
  { name: "tutorial-wraith-briefing", width: 390, height: 844, kind: "tutorial-step", scenario: "tutorial", step: "wraith", touch: true },
  { name: "tutorial-realm-indicator", width: 390, height: 844, kind: "tutorial-step", scenario: "tutorial", step: "realm_practice", touch: true, activate: true },
  { name: "tutorial-wraith-physical-art", width: 1440, height: 900, kind: "tutorial-step", scenario: "tutorial", step: "realm_practice", activate: true, realmOverride: 0 },
  { name: "tutorial-graduation", width: 1440, height: 900, kind: "tutorial-step", scenario: "tutorial", step: "graduation", complete: true },
  { name: "tutorial-call-sign-confirmation", width: 390, height: 844, kind: "tutorial-callsign", scenario: "tutorial-post-callsign", touch: true },
  { name: "tutorial-account-offer", width: 390, height: 844, kind: "tutorial-account", scenario: "tutorial-post", touch: true },
  { name: "tutorial-identity-confirmed", width: 390, height: 844, kind: "tutorial-identity-confirmed", scenario: "tutorial-identity-confirmed", touch: true },
  { name: "tutorial-arrival-input-lock", width: 390, height: 844, kind: "tutorial-arrival-lock", scenario: "tutorial", touch: true },
  { name: "tutorial-launch-desktop", width: 1440, height: 900, kind: "tutorial-launch", scenario: "tutorial" },
  { name: "tutorial-launch-mobile", width: 390, height: 844, kind: "tutorial-launch", scenario: "tutorial", touch: true },
  { name: "tutorial-launch-reduced-motion", width: 390, height: 844, kind: "tutorial-launch", scenario: "tutorial", touch: true, reduced: true },
  { name: "tutorial-resume-checkpoint", width: 390, height: 844, kind: "tutorial-resume", scenario: "tutorial-resume", touch: true }
];
const selectedCases = caseFilter ? cases.filter((item) => item.name === caseFilter) : cases;
if (!selectedCases.length) throw new Error(`Unknown visual QA case: ${caseFilter}`);

function createStaticServer() {
  return http.createServer((request, response) => {
    const requestUrl = new URL(request.url || "/", "http://127.0.0.1");
    const relative = requestUrl.pathname === "/" ? "index.html" : decodeURIComponent(requestUrl.pathname).replace(/^\/+/, "");
    const resolved = path.resolve(repoRoot, relative);
    if (!resolved.startsWith(`${repoRoot}${path.sep}`) || !fs.existsSync(resolved) || fs.statSync(resolved).isDirectory()) {
      response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      response.end("Not found");
      return;
    }
    response.writeHead(200, {
      "cache-control": "no-store",
      "content-type": mimeTypes.get(path.extname(resolved).toLowerCase()) || "application/octet-stream"
    });
    fs.createReadStream(resolved).pipe(response);
  });
}

async function snapshot(page) {
  return page.evaluate(() => JSON.parse(document.querySelector("#debugSnapshot").textContent));
}

function center(rect) {
  if (!rect) throw new Error("Required debug layout rectangle is missing");
  return { x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 };
}

async function clickLayout(page, name, touch = false) {
  const state = await snapshot(page);
  const point = center(state.layout[name]);
  if (touch) await page.touchscreen.tap(point.x, point.y);
  else await page.mouse.click(point.x, point.y);
}

async function openPanel(page, target, touch = false) {
  await clickLayout(page, target, touch);
  const expectedState = target === "account" ? "online" : target;
  await page.waitForFunction((expected) => {
    const state = JSON.parse(document.querySelector("#debugSnapshot").textContent);
    return state.ui.titleSubState === expected && state.ui.titlePanelAnim > 0.94;
  }, expectedState);
}

async function waitForPaintedFrames(page, count = 2) {
  await page.evaluate((frameCount) => new Promise((resolve) => {
    let painted = 0;
    const next = () => {
      painted += 1;
      if (painted >= frameCount) {
        // requestAnimationFrame runs before paint. Yield once more so the final
        // Canvas upload and DOM overlay reach the compositor before capture.
        setTimeout(resolve, 34);
      }
      else requestAnimationFrame(next);
    };
    requestAnimationFrame(next);
  }), count);
}

async function waitForRequiredVisualAssets(page, assetIds, errors) {
  await page.waitForFunction(() => (
    typeof getAssetLoadState === "function" && getAssetLoadState().ready === true
  ));
  const result = await page.evaluate((requiredIds) => {
    const assets = getAssetLoadState();
    const loaded = Array.isArray(assets.loaded) ? assets.loaded : [];
    const failed = Array.isArray(assets.failed) ? assets.failed : [];
    return {
      missing: requiredIds.filter((id) => !loaded.includes(id)),
      failed: requiredIds.filter((id) => failed.includes(id))
    };
  }, assetIds);
  if (result.missing.length || result.failed.length) {
    errors.push(`required visual assets unavailable: ${Array.from(new Set([...result.missing, ...result.failed])).join(", ")}`);
  }
  return result;
}

async function waitForTutorialInstructorPaint(page, completeDialogue = false, errors = []) {
  await waitForRequiredVisualAssets(page, ["tutorial_instructor"], errors);
  await page.waitForFunction((requireCompleteDialogue) => {
    if (!requireCompleteDialogue) return true;
    const current = JSON.parse(document.querySelector("#debugSnapshot")?.textContent || "{}");
    return current.tutorial?.director?.dialogueVisible === true
      && current.tutorial?.director?.dialogueReveal >= 0.999;
  }, completeDialogue);
  await waitForPaintedFrames(page, 2);
}

async function touchDrag(page, rect) {
  const x = rect.x + rect.w * 0.5;
  const startY = rect.y + rect.h * 0.78;
  const endY = rect.y + rect.h * 0.22;
  await page.evaluate(({ x, startY, endY }) => {
    const canvas = document.querySelector("canvas");
    const dispatch = (type, clientY, buttons) => canvas.dispatchEvent(new PointerEvent(type, {
      bubbles: true,
      cancelable: true,
      clientX: x,
      clientY,
      pointerId: 41,
      pointerType: "touch",
      isPrimary: true,
      buttons
    }));
    dispatch("pointerdown", startY, 1);
    for (let step = 1; step <= 8; step++) {
      dispatch("pointermove", startY + (endY - startY) * (step / 8), 1);
    }
    dispatch("pointerup", endY, 0);
  }, { x, startY, endY });
  await page.waitForTimeout(450);
}

function titleTrafficAssertions(state, errors) {
  const ranges = {
    distant: [23, 31],
    midground: [17, 23],
    foreground: [13, 17]
  };
  for (const formation of state.titleTraffic) {
    const range = ranges[formation.depth];
    if (!range || formation.durationSeconds < range[0] || formation.durationSeconds > range[1]) {
      errors.push(`invalid ${formation.depth} traversal duration ${formation.durationSeconds}`);
    }
    if (formation.scale > 1.001) errors.push(`${formation.depth} patrol exceeds normal fighter scale`);
  }
  for (let first = 0; first < state.titleTraffic.length; first++) {
    for (let second = first + 1; second < state.titleTraffic.length; second++) {
      const a = state.titleTraffic[first];
      const b = state.titleTraffic[second];
      if (a.depth !== b.depth) continue;
      if (Math.hypot(a.x - b.x, a.y - b.y) < a.radius + b.radius + 18) {
        errors.push(`same-depth ${a.depth} formations overlap`);
      }
    }
  }
}

async function runCase(browser, baseUrl, item) {
  const errors = [];
  let capturedScreenshotDataUrl = "";
  const context = await browser.newContext({
    deviceScaleFactor: 1,
    hasTouch: item.kind === "scroll" || item.touch === true,
    viewport: { width: item.width, height: item.height }
  });
  await context.tracing.start({ screenshots: true, snapshots: true, sources: true });
  const page = await context.newPage();
  if (item.reduced) {
    await page.addInitScript(() => {
      localStorage.setItem("star_strike_rush_settings_v1", JSON.stringify({
        settingReducedMotion: true,
        settingReducedFlash: true
      }));
    });
  }
  page.setDefaultTimeout(90000);
  page.on("console", (message) => {
    const messageText = message.text();
    const expectedLocal404 = !externalBaseUrl && message.type() === "error" && messageText.includes("404");
    if (message.type() === "error" && !expectedLocal404) errors.push(`console: ${messageText}`);
  });
  page.on("pageerror", (error) => errors.push(`page: ${error.message}`));
  page.on("requestfailed", (request) => errors.push(`request: ${request.url()} ${request.failure()?.errorText || "failed"}`));
  page.on("response", (response) => {
    const pathname = new URL(response.url()).pathname;
    const expected404 = response.status() === 404 && localFallbackPaths.includes(pathname);
    if (response.status() >= 400 && !expected404) errors.push(`response: ${response.status()} ${response.url()}`);
  });

  const route = `/?debug=1${item.scenario ? `&scenario=${encodeURIComponent(item.scenario)}` : ""}${item.step ? `&step=${encodeURIComponent(item.step)}` : ""}${item.touch ? "&input=touch" : ""}`;
  const response = await page.goto(`${baseUrl}${route}`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("canvas", { state: "visible" });
  await page.waitForFunction(() => document.querySelector("#debugSnapshot")?.textContent);
  const initialSettleMs = item.kind === "onboarding-arrival" ? 0 : item.scenario === "debris-incoming" ? 50 : 500;
  await page.waitForTimeout(initialSettleMs);

  let before = await snapshot(page);
  const evidence = { before };
  if (!response || !response.ok()) errors.push(`HTTP ${response?.status() || "no response"}`);
  if (before.runtimeErrors.length) errors.push(...before.runtimeErrors.map((error) => `runtime: ${error}`));

  if (item.kind === "title") {
    const title = before.layout.title;
    const orientationHint = await page.evaluate(() => typeof getLandscapeOrientationHintLayout === "function"
      ? getLandscapeOrientationHintLayout()
      : null);
    evidence.orientationHint = orientationHint;
    if (item.name === "title-landscape-844x390") {
      if (!orientationHint) errors.push("landscape viewport did not show portrait-flight guidance");
      else {
        const game = orientationHint.gameRect;
        for (const [name, rect] of [["icon", orientationHint.icon], ["copy", orientationHint.copy]]) {
          const overlaps = !(rect.x + rect.w <= game.x || game.x + game.w <= rect.x);
          if (overlaps) errors.push(`landscape ${name} entered the playfield`);
          if (rect.x < 0 || rect.y < 0 || rect.x + rect.w > item.width || rect.y + rect.h > item.height) {
            errors.push(`landscape ${name} left the viewport`);
          }
        }
      }
    } else if (orientationHint) {
      errors.push("portrait viewport showed landscape orientation guidance");
    }
    const widthRatio = title?.screenBounds?.w / Math.max(1, title?.playableScreenWidth || 0);
    if (!title || widthRatio < 0.88) errors.push(`title width ratio ${widthRatio || 0} is below 0.88`);
    if (!(title?.lineGap >= 4)) errors.push(`STAR STRIKE / RUSH gap ${title?.lineGap} is below 4px`);
    if (title?.screenBounds?.x < -1 || title?.screenBounds?.x + title?.screenBounds?.w > item.width + 1) {
      errors.push("title bounds leave the viewport");
    }
    if (!before.titleTraffic.some((formation) => ["midground", "foreground"].includes(formation.depth))) {
      errors.push("no readable midground or foreground formation");
    }
    titleTrafficAssertions(before, errors);
    await page.waitForTimeout(1200);
    const after = await snapshot(page);
    evidence.after = after;
    const wallWindowSeconds = Math.max(0, after.timestampMs - before.timestampMs) / 1000;
    evidence.traversalMeasurements = before.titleTraffic.map((formation) => {
      const match = after.titleTraffic.find((candidate) => candidate.id === formation.id);
      const progressDelta = match ? match.normalizedProgress - formation.normalizedProgress : 0;
      const simulationWindowSeconds = match ? Math.max(0, match.ageSeconds - formation.ageSeconds) : 0;
      return {
        depth: formation.depth,
        configuredSeconds: formation.durationSeconds,
        simulatedObservedSeconds: progressDelta > 0
          ? Number((simulationWindowSeconds / progressDelta).toFixed(2))
          : null,
        wallObservedSeconds: progressDelta > 0
          ? Number((wallWindowSeconds / progressDelta).toFixed(2))
          : null,
        simulationWindowSeconds: Number(simulationWindowSeconds.toFixed(3)),
        wallWindowSeconds: Number(wallWindowSeconds.toFixed(3))
      };
    });
    for (const measurement of evidence.traversalMeasurements) {
      if (
        measurement.simulatedObservedSeconds !== null &&
        Math.abs(measurement.simulatedObservedSeconds - measurement.configuredSeconds) > 0.25
      ) {
        errors.push(`${measurement.depth} simulated traversal differs from configured duration`);
      }
    }
  } else if (item.kind === "scroll") {
    await openPanel(page, item.target, true);
    before = await snapshot(page);
    const scrollKey = item.target === "achievements" ? "achievements" : "codex";
    const contentKey = item.target === "achievements" ? "achievementContent" : "codexContent";
    if (!(before.scrolling[scrollKey]?.max > 0)) errors.push(`${item.target} has no scrollable range`);
    await touchDrag(page, before.layout[contentKey]);
    const after = await snapshot(page);
    evidence.panelBefore = before;
    evidence.after = after;
    if (after.ui.titleSubState !== item.target) errors.push(`${item.target} panel closed during drag`);
    if (!(after.scrolling[scrollKey]?.value > before.scrolling[scrollKey]?.value)) {
      errors.push(`${item.target} touch drag did not change scroll state`);
    }
  } else if (item.kind === "reduced-motion") {
    await openPanel(page, "account");
    await clickLayout(page, "accountSettingsTab");
    await page.waitForTimeout(200);
    await clickLayout(page, "reducedMotion");
    await page.waitForFunction(() => JSON.parse(document.querySelector("#debugSnapshot").textContent).ui.settingReducedMotion === true);
    const reducedBefore = await snapshot(page);
    await page.waitForTimeout(1000);
    const reducedAfter = await snapshot(page);
    evidence.reducedBefore = reducedBefore;
    evidence.after = reducedAfter;
    if (reducedAfter.titleTraffic.length > 1) errors.push("Reduced Motion left multiple title formations active");
    if (
      reducedBefore.titleTraffic[0] &&
      reducedAfter.titleTraffic[0] &&
      reducedBefore.titleTraffic[0].normalizedProgress !== reducedAfter.titleTraffic[0].normalizedProgress
    ) errors.push("Reduced Motion title formation continued traversing");
  } else if (item.kind === "audio-settings") {
    await openPanel(page, "account");
    await clickLayout(page, "accountSettingsTab");
    const settingsBefore = await snapshot(page);
    await clickLayout(page, "music");
    const musicAfter = await snapshot(page);
    await clickLayout(page, "effects");
    const effectsAfter = await snapshot(page);
    evidence.settingsBefore = settingsBefore;
    evidence.after = effectsAfter;
    if (!effectsAfter.layout.replayTraining) errors.push("Replay Flight Training control is missing from Settings");
    else if (effectsAfter.layout.replayTraining.y + effectsAfter.layout.replayTraining.h > item.height) errors.push("Replay Flight Training control leaves the viewport");
    if (!effectsAfter.layout.resetData) errors.push("Reset Local Data control is missing from Settings");
    else {
      if (effectsAfter.layout.resetData.y <= effectsAfter.layout.replayTraining.y + effectsAfter.layout.replayTraining.h) {
        errors.push("Reset Local Data is not isolated below Replay Flight Training");
      }
      if (Math.abs(effectsAfter.layout.resetData.w - effectsAfter.layout.screenShake.w) > 1) {
        errors.push("Reset Local Data is not a deliberate full-width danger action");
      }
      if (effectsAfter.layout.resetData.y + effectsAfter.layout.resetData.h > item.height) {
        errors.push("Reset Local Data leaves the viewport");
      }
    }
    if (musicAfter.ui.settingMusicEnabled === settingsBefore.ui.settingMusicEnabled) errors.push("Music control did not toggle");
    if (musicAfter.ui.settingEffectsEnabled !== settingsBefore.ui.settingEffectsEnabled) errors.push("Music control changed Effects");
    if (effectsAfter.ui.settingEffectsEnabled === musicAfter.ui.settingEffectsEnabled) errors.push("Effects control did not toggle");
  } else if (item.kind === "reset-confirmation") {
    await openPanel(page, "account");
    await clickLayout(page, "accountSettingsTab");
    await page.waitForTimeout(120);
    await page.evaluate(() => {
      resetProgressConfirm = true;
      updateDebugSnapshot();
    });
    const confirmation = await snapshot(page);
    evidence.after = confirmation;
    if (confirmation.ui.resetProgressConfirm !== true) errors.push("reset confirmation did not open");
    if (confirmation.runtimeErrors.length) errors.push("reset confirmation produced a runtime error");
  } else if (item.kind === "connected-panel") {
    await page.evaluate(() => {
      const base = window.starStrikeOnline && typeof window.starStrikeOnline.getState === "function"
        ? window.starStrikeOnline.getState()
        : {};
      window.starStrikeOnline = {
        ...(window.starStrikeOnline || {}),
        getState: () => ({
          ...base,
          ready: true,
          user: { uid: "sanitized-qa-account" },
          profileCallSign: "RENEGADE_21",
          profileHandle: "renegade21",
          identityService: "available",
          accountArchive: "loaded",
          progressionMode: "automatic_best_account_or_device",
          competitionMode: "paused",
          lastStatus: "PILOT IDENTITY ACTIVE",
          lastError: "",
          weeklyLeague: {
            id: "weekly_qa",
            weekId: "week_qa",
            weekLabel: "MONDAY — SUNDAY UTC",
            division: "OPEN",
            memberCount: 3,
            capacity: 30,
            recordTrust: "verified_run_session",
            members: [
              { publicPilotId: "pilot_alpha", callSign: "NOVA_7", handle: "nova_7", weeklyPoints: 4825 },
              { publicPilotId: "pilot_beta", callSign: "RIFT_2", handle: "rift_2", weeklyPoints: 3100 }
            ]
          }
        })
      };
    });
    if (item.target === "records") await page.evaluate(() => { recordsPanelTab = "weekly"; });
    await openPanel(page, item.target, item.touch === true);
    const panelState = await snapshot(page);
    evidence.after = panelState;
    const expected = item.target === "account" ? "online" : item.target;
    if (panelState.ui.titleSubState !== expected || panelState.ui.titlePanelAnim < 0.94) errors.push(`${item.target} connected panel did not open`);
    if (item.target === "account") {
      const textFit = await page.evaluate(() => {
        const panel = getOnlineRects().panel;
        const rect = { x: panel.x + 20, y: panel.y + 452, w: panel.w - 40, h: 112 };
        const maxWidth = Math.max(72, rect.w - 128);
        ctx.save();
        const size = fitCondensedCanvasFont("ACCOUNT CONNECTED", maxWidth, 18, 12);
        const width = ctx.measureText("ACCOUNT CONNECTED").width;
        ctx.restore();
        return { width, maxWidth, size };
      });
      evidence.accountConnectedTextFit = textFit;
      if (textFit.width > textFit.maxWidth + 0.5) errors.push("ACCOUNT CONNECTED exceeds its measured card lane");
    }
    if (panelState.runtimeErrors.length) errors.push(`${item.target} connected panel produced a runtime error`);
  } else if (item.kind === "codex-detail") {
    await openPanel(page, "codex");
    await page.evaluate(() => {
      setCodexCategory("bosses");
      codexDiscovered.boss_standard = true;
      codexDetailType = "boss_standard";
      codexDetailScroll = 0;
      updateDebugSnapshot();
    });
    await page.waitForTimeout(120);
    const detailState = await snapshot(page);
    const layout = await page.evaluate(() => codexDetailLayout(getTitlePanelRect(), "boss_standard"));
    evidence.after = detailState;
    evidence.codexDetailLayout = layout;
    if (detailState.ui.titleSubState !== "codex") errors.push("Codex detail did not remain open");
    if (!(layout.graphic.y > layout.title.y && layout.stats.y > layout.graphic.y && layout.brief.y > layout.stats.y)) {
      errors.push("Codex encounter art, stats, and brief are not vertically ordered");
    }
    if (detailState.runtimeErrors.length) errors.push("Codex detail produced a runtime error");
  } else if (item.kind === "panel") {
    await openPanel(page, item.target, item.touch === true);
    const panelState = await snapshot(page);
    evidence.after = panelState;
    const expected = item.target === "account" ? "online" : item.target;
    if (panelState.ui.titleSubState !== expected || panelState.ui.titlePanelAnim < 0.94) {
      errors.push(`${item.target} panel did not finish opening`);
    }
    if (panelState.runtimeErrors.length) errors.push(`${item.target} panel produced a runtime error`);
  } else if (item.kind === "play") {
    await clickLayout(page, "play");
    await page.waitForFunction(() => {
      const state = JSON.parse(document.querySelector("#debugSnapshot").textContent);
      return state.transition.mode === "title_launch" || state.gameState === "playing";
    });
    await page.waitForFunction(() => JSON.parse(document.querySelector("#debugSnapshot").textContent).gameState === "playing");
    evidence.after = await snapshot(page);
  } else if (item.kind === "gameplay-hud" || item.kind === "paused-hud" || item.kind === "pause-confirm") {
    await clickLayout(page, "play");
    await page.waitForFunction(() => JSON.parse(document.querySelector("#debugSnapshot").textContent).gameState === "playing");
    const playing = await snapshot(page);
    evidence.playing = playing;
    const playfieldTopLeftLimit = {
      x: Number(playing.layout.offsetX || 0) + Number(playing.layout.scale || 1) * 60,
      y: Number(playing.layout.offsetY || 0) + Number(playing.layout.scale || 1) * 60
    };
    if (!(playing.layout.pause?.x < playfieldTopLeftLimit.x && playing.layout.pause?.y < playfieldTopLeftLimit.y)) {
      errors.push("pause button is not top-left");
    }
    if (!(playing.layout.hud?.energy?.y < playing.layout.hud?.health?.y)) errors.push("energy is not above health");
    if (!(playing.layout.hud?.energy?.y > 667 * 0.58)) errors.push("energy and health are not bottom-left");
    if (playing.layout.hud?.health?.orientation !== "horizontal") errors.push("health is not a classic horizontal layout");
    if (!(playing.layout.hud?.score?.x > 375 / 2)) errors.push("score cluster is not top-right");
    if (item.touch) {
      const status = playing.layout.hud?.status;
      if (!status || status.y + status.h > 535) errors.push("touch HUD overlaps the virtual joystick zone");
    }
    if (item.kind === "paused-hud" || item.kind === "pause-confirm") {
      await clickLayout(page, "pause");
      await page.waitForFunction(() => JSON.parse(document.querySelector("#debugSnapshot").textContent).gameState === "paused");
      if (item.kind === "pause-confirm") {
        await page.evaluate(() => {
          const restart = getPauseOverlayRects().restart;
          handlePausePointerDown(restart.x + restart.w / 2, restart.y + restart.h / 2);
        });
        await page.waitForFunction(() => JSON.parse(document.querySelector("#debugSnapshot").textContent).ui.pauseConfirmAction === "restart");
      }
      const paused = await snapshot(page);
      evidence.after = paused;
      if (paused.player.hp !== playing.player.hp - 1) errors.push("manual pause did not cost exactly one health bar");
      if (item.kind === "pause-confirm") {
        if (paused.gameState !== "paused" || paused.ui.pauseConfirmAction !== "restart") errors.push("restart confirmation did not preserve the active paused run");
      } else if (paused.ui.pauseNotice !== "PAUSE COST: 1 HEALTH BAR") errors.push("pause cost was not explained");
    } else {
      evidence.after = playing;
    }
  } else if (item.kind === "scenario") {
    if (item.scenario === "debris-incoming") {
      const boss = before.encounter.boss;
      if (!boss || boss.damageable || boss.hp !== boss.maxHp) errors.push("incoming boss was damageable");
    }
    if (item.scenario === "powerups" && before.counts.powerups !== 13) errors.push("powerup gallery did not show all 13 powerups");
    if (item.scenario.startsWith("glory-road-")) {
      if (before.gameState !== "start" || before.ui.titleSubState !== "progress") errors.push("Glory Road scenario did not open the Road panel");
      if (before.deviceProgress.totalGlory !== item.expectedGlory) errors.push("Glory Road scenario lost cumulative Glory");
      if (before.deviceProgress.prestige !== item.expectedPrestige) errors.push("Glory Road scenario derived the wrong Prestige");
      if (before.deviceProgress.roadGlory !== item.expectedGlory % 300000) errors.push("Glory Road scenario used cumulative rather than modulo Road progress");
    }
    if (item.scenario.startsWith("glory-celebration-")) {
      if (before.gameState !== "gameover" || !before.gloryCelebration.active) errors.push("Glory celebration overlay did not open over Game Over");
      if (before.gloryCelebration.event?.type !== item.expectedCelebration) errors.push(`Expected ${item.expectedCelebration} celebration`);
      if (item.scenario.endsWith("reduced") && before.ui.settingReducedMotion !== true) errors.push("Reduced Motion celebration did not preserve the setting");
    }
    if (item.scenario === "gameover" || item.scenario === "gameover-rank" || item.scenario === "gameover-prestige") {
      if (before.gameState !== "gameover") errors.push("game-over summary did not open");
      if (before.score !== 48250 || before.highScore !== 48250) errors.push("game-over summary lost score evidence");
      if (before.runtimeErrors.length) errors.push("game-over summary produced a runtime error");
    }
  } else if (item.kind === "onboarding-arrival") {
    await waitForRequiredVisualAssets(page, ["player"], errors);
    const arrivalState = await page.evaluate(() => {
      onboardingUiMode = "first_time_question";
      onboardingIntroFlight.active = true;
      onboardingIntroFlight.durationSeconds = 1.25;
      onboardingIntroFlight.elapsedSeconds = 0.62;
      renderOnboardingAccessibleMode();
      draw();
      updateDebugSnapshot();
      window.__visualOnboardingFrame = document.querySelector("canvas").toDataURL("image/png");
      return {
        snapshot: JSON.parse(document.querySelector("#debugSnapshot").textContent),
        actionCount: document.querySelectorAll("#tutorialAccessibleActions button").length
      };
    });
    evidence.after = arrivalState.snapshot;
    capturedScreenshotDataUrl = await page.evaluate(() => window.__visualOnboardingFrame || "");
    if (evidence.after.tutorial?.uiMode !== "first_time_question") errors.push("galaxy arrival lost the first-time route");
    if (evidence.after.renderFrame?.titleUi) errors.push("title wordmark was rendered behind onboarding arrival");
    if (!evidence.after.renderFrame?.onboardingGalaxy) errors.push("normal galaxy arrival scene was not rendered");
    if (arrivalState.actionCount !== 0) {
      errors.push("Colonel question appeared before the player ship arrived");
    }
  } else if (item.kind === "tutorial-question") {
    await waitForTutorialInstructorPaint(page, false, errors);
    await page.waitForFunction(() => {
      const current = JSON.parse(document.querySelector("#debugSnapshot")?.textContent || "{}");
      return current.tutorial?.uiMode === "first_time_question"
        && current.tutorial?.introFlight?.active === false;
    });
    evidence.after = await snapshot(page);
    if (evidence.after.tutorial?.uiMode !== "first_time_question") errors.push("first-time question was not active");
    if (!evidence.after.layout.onboardingPanel) errors.push("onboarding panel bounds were not exposed");
    const yes = page.getByRole("button", { name: "YES — START FIRST FLIGHT" });
    const no = page.getByRole("button", { name: "NO — GO TO TITLE" });
    await yes.waitFor({ state: "visible" });
    await no.waitFor({ state: "visible" });
    if (!(await yes.isVisible())) errors.push("YES action was not accessible");
    if (!(await no.isVisible())) errors.push("NO action was not accessible");
    if ((await page.getByRole("status").textContent()) !== "COLONEL ARISAKA: Is this your first time here, pilot?") {
      errors.push("first-time question copy was not exact");
    }
    const portrait = evidence.after.layout.onboardingPortrait;
    const question = evidence.after.layout.onboardingQuestion;
    if (!portrait || !question) errors.push("portrait or question bounds were not exposed");
    else if (!(portrait.y + portrait.h <= question.y)) errors.push("placeholder overlaps the first-time question");
    for (const [name, button] of [["YES", yes], ["NO", no]]) {
      const bounds = await button.boundingBox();
      if (!bounds || bounds.x < 0 || bounds.y < 0 || bounds.x + bounds.width > item.width || bounds.y + bounds.height > item.height) {
        errors.push(`${name} button leaves the viewport`);
      }
    }
  } else if (item.kind === "tutorial-prelaunch") {
    await waitForTutorialInstructorPaint(page, false, errors);
    await page.waitForFunction(() => {
      const current = JSON.parse(document.querySelector("#debugSnapshot")?.textContent || "{}");
      return current.tutorial?.uiMode === "first_time_question"
        && current.tutorial?.introFlight?.active === false;
    });
    await page.getByRole("button", { name: "YES — START FIRST FLIGHT" }).click();
    await page.waitForFunction(() => {
      const current = JSON.parse(document.querySelector("#debugSnapshot")?.textContent || "{}");
      return current.tutorial?.uiMode === "prelaunch_briefing";
    });
    await page.getByRole("button", { name: "Begin Flight Training" }).waitFor({ state: "visible" });
    evidence.after = await snapshot(page);
    if (evidence.after.tutorial?.uiMode !== "prelaunch_briefing") errors.push("call-sign prelaunch briefing was not active");
    if (!(await page.getByRole("button", { name: "Edit Call Sign" }).isVisible())) errors.push("call-sign edit was not accessible");
    if ((await page.getByRole("status").textContent()).includes("Vega")) errors.push("stale instructor name was visible");
  } else if (item.kind === "tutorial-step") {
    await page.waitForFunction((step) => {
      const state = JSON.parse(document.querySelector("#debugSnapshot").textContent);
      return state.runMode === "tutorial" && state.tutorial?.director?.stepId === step;
    }, item.step === "ghost" ? "ghost_shift" : item.step === "command-boss" ? "command_boss" : item.step === "wraith" ? "wraith_briefing" : item.step);
    if (item.complete) {
      for (let attempt = 0; attempt < 3; attempt++) {
        const state = await snapshot(page);
        if (state.tutorial?.onboarding?.status === "completed") break;
        await page.getByRole("button", { name: "Continue" }).click();
        await page.waitForTimeout(90);
      }
    } else if (item.activate) {
      const button = page.getByRole("button", { name: "Continue" });
      await button.click();
      if (await button.isVisible()) await button.click();
      await page.waitForTimeout(180);
    }
    if (item.step === "auto_weapons") {
      evidence.arrivalState = await page.evaluate(() => {
        state.bullets = [];
        tutorialRuntime.weaponsLocked = true;
        for (const enemy of state.enemies) {
          if (!enemy.tutorialTarget || !enemy.tutorialArrival) continue;
          enemy.tutorialArrivalComplete = false;
          enemy.tutorialArrival.duration = 1000000;
          enemy.tutorialArrival.elapsed = 450000;
        }
        updateDebugSnapshot();
        return state.enemies.map((enemy) => ({
          tutorialTarget: enemy.tutorialTarget === true,
          arrivalComplete: enemy.tutorialArrivalComplete === true
        }));
      });
      await page.waitForTimeout(180);
    }
    if (item.realmOverride != null) {
      await waitForRequiredVisualAssets(page, [item.realmOverride === 0 ? "boss_wraith_physical" : "boss_wraith_ghost"], errors);
      await page.waitForFunction(() => state.boss && state.boss.mode === "wraith" && state.boss.y > 42);
      await page.evaluate((realm) => {
        if (state.boss && state.boss.mode === "wraith") state.boss.realm = realm;
      }, item.realmOverride);
      await page.waitForTimeout(80);
    }
    if (item.step === "command-boss") {
      await page.waitForFunction(() => {
        const current = JSON.parse(document.querySelector("#debugSnapshot").textContent);
        return current.encounter.boss && current.encounter.boss.y > 42;
      });
    }
    if (item.ghostVisual) {
      await page.evaluate(() => {
        // Keep this development-only visual state alive long enough to survive
        // slow CI screenshots without changing the production ability duration.
        state.player.ghostTimer = 600;
        state.player.ghostCooldown = Math.max(state.player.ghostCooldown, 600);
      });
      await page.waitForTimeout(80);
    }
    const tutorial = await snapshot(page);
    evidence.after = tutorial;
    if (tutorial.encounter.boss) {
      const bossHud = await page.evaluate(() => typeof getBossHealthBarLayout === "function" ? getBossHealthBarLayout() : null);
      evidence.bossHud = bossHud;
      const pause = tutorial.layout.pause;
      const frame = bossHud && bossHud.frame;
      if (!frame) errors.push("boss Health HUD layout was not exposed");
      else if (pause && !(
        pause.x + pause.w <= frame.x ||
        frame.x + frame.w <= pause.x ||
        pause.y + pause.h <= frame.y ||
        frame.y + frame.h <= pause.y
      )) errors.push("boss Health HUD overlaps the Pause control");
    }
    const dialogue = tutorial.layout.tutorialDialogue;
    const objective = tutorial.layout.tutorialObjective;
    const controls = tutorial.layout.tutorialControls;
    if (!dialogue && !objective) errors.push("tutorial has neither dialogue nor objective bounds");
    if (dialogue && dialogue.y + dialogue.h > item.height * 0.62) errors.push("dialogue obstructs the lower playfield");
    if (objective && objective.y + objective.h > item.height * 0.45) errors.push("objective chip obstructs the playfield");
    if (controls && dialogue) {
      for (const [name, rect] of Object.entries(controls)) {
        const overlaps = !(dialogue.x + dialogue.w <= rect.x || rect.x + rect.w <= dialogue.x || dialogue.y + dialogue.h <= rect.y || rect.y + rect.h <= dialogue.y);
        if (overlaps) errors.push(`dialogue overlaps ${name} control`);
      }
    }
    if (item.complete && tutorial.tutorial?.onboarding?.status !== "completed") errors.push("graduation did not persist completion");
    if (item.step === "command-boss" && tutorial.encounter.boss && !tutorial.encounter.boss.tutorialOverride) errors.push("Command Ship lacks tutorial override");
    if (item.step === "movement") {
      const beacon = tutorial.tutorial?.runtime?.activeBeacon;
      if (!beacon) errors.push("navigation lesson lacks an active beacon");
      else if (Math.hypot(tutorial.player.x - beacon.x, tutorial.player.y - beacon.y) < 80) errors.push("first navigation beacon overlaps the fighter");
    }
    if (item.step === "auto_weapons") {
      if (tutorial.counts.enemies !== 3) errors.push("training targets did not enter as a complete formation");
      if (!evidence.arrivalState?.every((enemy) => enemy.tutorialTarget && !enemy.arrivalComplete)) {
        errors.push("training targets were not held in a deterministic arrival state");
      }
      if (!tutorial.tutorial?.runtime?.weaponsLocked) errors.push("weapons unlocked before training targets completed arrival");
      if (tutorial.counts.bullets !== 0) errors.push("weapons fired during target arrival");
    }
    if (item.step === "powerup") {
      const powerup = tutorial.encounter.powerups[0];
      if (!powerup) errors.push("Phase Shield was not staged");
      else if (Math.hypot(tutorial.player.x - powerup.x, tutorial.player.y - powerup.y) < 90) errors.push("Phase Shield appeared on top of the fighter");
    }
    if (item.step === "realm_practice" && (!tutorial.encounter.boss || tutorial.encounter.boss.realm == null)) errors.push("realm practice lacks a realm target");
    if (item.realmOverride != null && tutorial.encounter.boss?.realm !== item.realmOverride) errors.push("Wraith realm art case did not hold the requested realm");
    if (item.realmOverride != null && tutorial.encounter.boss?.y <= 42) errors.push("Wraith realm art remained outside the visible playfield");
    if (item.ghostVisual && tutorial.player.ghostTimer <= 0) errors.push("Ghost visual case was not active");
  } else if (item.kind === "tutorial-retry") {
    const button = page.getByRole("button", { name: "Continue" });
    await button.click();
    if (await button.isVisible()) await button.click();
    await page.waitForTimeout(120);
    if (item.step === "evasion") {
      await page.evaluate(() => { state.runStats.damageTaken += 1; });
    } else {
      await page.waitForFunction(() => {
        const current = JSON.parse(document.querySelector("#debugSnapshot").textContent);
        return current.tutorial?.runtime?.playerTransit == null && current.tutorial?.runtime?.ghostBarrierProgress >= 1;
      });
      await page.evaluate(() => {
        tutorialRuntime.ghostPreviousX = tutorialRuntime.plan.ghost_shift.laneX - 2;
        state.player.x = tutorialRuntime.plan.ghost_shift.laneX + 2;
        state.player.ghostTimer = 0;
      });
    }
    await page.waitForFunction(() => {
      const current = JSON.parse(document.querySelector("#debugSnapshot").textContent);
      return current.tutorial?.director?.dialogueVisible === true;
    });
    await waitForTutorialInstructorPaint(page, true, errors);
    evidence.after = await snapshot(page);
    const correction = await page.getByRole("status").textContent();
    if (item.step === "evasion" && !/lane was live/i.test(correction)) errors.push("evasion correction was not shown");
    if (item.step === "ghost" && !/Ghost must cover/i.test(correction)) errors.push("Ghost correction was not shown");
    const health = evidence.after.layout.hud?.health;
    if (
      health &&
      evidence.after.player.x >= health.x - 14 &&
      evidence.after.player.x <= health.x + health.w + 14 &&
      evidence.after.player.y >= health.y - 14 &&
      evidence.after.player.y <= health.y + health.h + 14
    ) errors.push("lesson retry places the fighter over the Health HUD");
  } else if (item.kind === "tutorial-callsign") {
    const callSign = await snapshot(page);
    evidence.after = callSign;
    if (callSign.tutorial?.uiMode !== "post_callsign") errors.push("post-flight call-sign confirmation was not active");
    if (!(await page.getByRole("button", { name: "Confirm Call Sign" }).isVisible())) errors.push("call-sign confirmation was not accessible");
    if (!(await page.getByRole("button", { name: "Edit Call Sign" }).isVisible())) errors.push("call-sign edit was not accessible");
  } else if (item.kind === "tutorial-account") {
    const account = await snapshot(page);
    evidence.after = account;
    if (account.tutorial?.uiMode !== "post_identity") errors.push("post-flight identity offer was not active");
    if (!(await page.getByRole("button", { name: "Connect Google Account" }).isVisible())) errors.push("Google identity option was not accessible");
    if (!(await page.getByRole("button", { name: "Continue With Device Pilot" }).isVisible())) errors.push("device pilot option was not accessible");
  } else if (item.kind === "tutorial-identity-confirmed") {
    const account = await snapshot(page);
    evidence.after = account;
    if (account.tutorial?.uiMode !== "identity_confirmed") errors.push("identity-confirmed graduation was not active");
    if (!(await page.getByRole("button", { name: "Enter Hangar" }).isVisible())) errors.push("Enter Hangar was not accessible");
    if (await page.getByRole("button", { name: "Connect Google Account" }).isVisible().catch(() => false)) errors.push("redundant Google connection was visible");
    if (await page.getByRole("button", { name: "Claim Unique Handle" }).isVisible().catch(() => false)) errors.push("redundant handle claim was visible");
  } else if (item.kind === "tutorial-arrival-lock") {
    await waitForRequiredVisualAssets(page, ["player", "tutorial_instructor"], errors);
    await page.evaluate(() => {
      window.__visualArrivalSnapshot = "";
      window.__visualArrivalObserver?.disconnect();
      const target = document.querySelector("#debugSnapshot");
      const capture = () => {
        const raw = target?.textContent || "";
        if (!raw || window.__visualArrivalSnapshot) return;
        const current = JSON.parse(raw);
        if (current.runMode === "tutorial" && current.transition?.mode === "game_arrival") {
          window.__visualArrivalSnapshot = raw;
          window.__visualArrivalObserver?.disconnect();
        }
      };
      window.__visualArrivalObserver = new MutationObserver(capture);
      window.__visualArrivalObserver.observe(target, { childList: true, subtree: true, characterData: true });
      capture();
    });
    await page.getByRole("button", { name: "YES — START FIRST FLIGHT" }).click();
    await page.getByRole("button", { name: "Begin Flight Training" }).click();
    await page.waitForFunction(() => {
      const current = JSON.parse(document.querySelector("#debugSnapshot").textContent);
      return Boolean(window.__visualArrivalSnapshot) ||
        (current.runMode === "tutorial" && current.transition.mode === "game_arrival");
    });
    evidence.after = await page.evaluate(() => {
      const raw = window.__visualArrivalSnapshot || document.querySelector("#debugSnapshot").textContent;
      window.__visualArrivalObserver?.disconnect();
      return JSON.parse(raw);
    });
    if (evidence.after.input.gameplayControlEnabled !== false) errors.push("arrival left gameplay controls enabled");
    if (evidence.after.input.gameplaySimulationEnabled !== false) errors.push("arrival left gameplay simulation enabled");
    if (evidence.after.transition.continuity?.starsPreserved !== true) errors.push("galaxy star field jumped at arrival");
    if (Math.abs(evidence.after.transition.continuity?.playerX - 187.5) > 0.01) errors.push("transition ship missed gameplay X");
    if (Math.abs(evidence.after.transition.continuity?.playerY - 533.6) > 0.01) errors.push("transition ship missed gameplay Y");
  } else if (item.kind === "tutorial-launch") {
    await waitForRequiredVisualAssets(page, ["player", "tutorial_instructor"], errors);
    await page.evaluate(() => {
      window.__visualLaunchFrame = "";
      clearInterval(window.__visualLaunchWatch);
      window.__visualLaunchWatch = setInterval(() => {
        const raw = document.querySelector("#debugSnapshot")?.textContent;
        if (!raw || window.__visualLaunchFrame) return;
        const state = JSON.parse(raw);
        if (state.transition?.mode === "title_launch" && state.transition.progress >= 0.72) {
          window.__visualLaunchFrame = document.querySelector("canvas")?.toDataURL("image/png") || "";
        }
      }, 16);
    });
    const yes = page.getByRole("button", { name: "YES — START FIRST FLIGHT" });
    await yes.waitFor({ state: "visible" });
    await yes.click();
    await page.getByRole("button", { name: "Begin Flight Training" }).click();
    const launchHandle = await page.waitForFunction(() => {
      const state = JSON.parse(document.querySelector("#debugSnapshot").textContent);
      const visibleLaunch = state.transition.mode === "title_launch" && state.transition.progress >= 0.72;
      const reducedArrival = state.transition.lastLaunchReducedMotion && state.runMode === "tutorial";
      if (visibleLaunch && !window.__visualLaunchFrame) {
        window.__visualLaunchFrame = document.querySelector("canvas").toDataURL("image/png");
      }
      const launchCompleted = state.runMode === "tutorial" && state.transition.lastLaunchDurationSeconds > 0;
      return visibleLaunch || reducedArrival || (launchCompleted && !!window.__visualLaunchFrame) ? state : false;
    });
    await page.evaluate(() => clearInterval(window.__visualLaunchWatch));
    let launch = await launchHandle.jsonValue();
    if (item.reduced) {
      await page.waitForFunction(() => {
        const state = JSON.parse(document.querySelector("#debugSnapshot").textContent);
        return state.runMode === "tutorial" && state.tutorial?.director?.dialogueReveal === 1;
      });
      launch = await snapshot(page);
    }
    capturedScreenshotDataUrl = await page.evaluate(() => window.__visualLaunchFrame || "");
    evidence.after = launch;
    const expectedDuration = item.reduced ? 0.42 : 2.0;
    const actualDuration = launch.transition.lastLaunchDurationSeconds;
    if (Math.abs(actualDuration - expectedDuration) > 0.03) errors.push(`launch duration ${actualDuration} differs from ${expectedDuration}`);
    if (item.reduced && !launch.transition.lastLaunchReducedMotion) errors.push("Reduced Motion launch contract was not active");
    if (item.reduced && launch.ui.settingReducedFlash !== true) errors.push("Reduced Flash launch contract was not active");
    if (item.reduced && launch.tutorial?.director?.dialogueReveal !== 1) errors.push("Reduced Motion left tutorial text animating");
    if (!item.reduced && launch.transition.titleUiAlpha > 0.01) errors.push("title controls remained visible through galaxy transit");
    if (launch.tutorial?.uiMode !== "none") errors.push("title onboarding UI remained active through launch");
  } else if (item.kind === "tutorial-resume") {
    const resumed = await snapshot(page);
    evidence.after = resumed;
    if (resumed.tutorial?.uiMode !== "resume_training") errors.push("checkpoint resume offer was not active");
    if (resumed.tutorial?.onboarding?.checkpoint !== "before_wraith") errors.push("checkpoint was not preserved");
    if (!(await page.getByRole("button", { name: "Resume Training" }).isVisible())) errors.push("resume action was not accessible");
  }

  await page.waitForFunction(() => (
    typeof getAssetLoadState !== "function" || getAssetLoadState().ready === true
  ));
  // A long asserted run can briefly outpace image decoding on constrained CI
  // hosts. Exercise the production failed-only retry path once with a larger
  // bounded window, then keep the same strict zero-failure assertion below.
  await page.evaluate(async () => {
    if (typeof getAssetLoadState !== "function" || typeof retryFailedAssets !== "function") return;
    const state = getAssetLoadState();
    if (Array.isArray(state.failed) && state.failed.length > 0) {
      await retryFailedAssets({ timeoutMs: 20000, retries: 1 });
    }
  });
  const assetState = await page.evaluate(() => (
    typeof getAssetLoadState === "function" ? getAssetLoadState() : { ready: true, loaded: [], failed: [] }
  ));
  evidence.assets = assetState;
  if (Array.isArray(assetState.failed) && assetState.failed.length) {
    errors.push(`asset preload failures: ${assetState.failed.join(", ")}`);
  }
  const finalState = await snapshot(page);
  evidence.final = finalState;
  if (finalState.runtimeErrors.length) errors.push(...finalState.runtimeErrors.map((error) => `runtime: ${error}`));
  const screenshotPath = path.join(outputDir, `${item.name}.png`);
  const pageScreenshotPath = path.join(outputDir, `${item.name}-page.png`);
  let canonicalCanvasDataUrl = capturedScreenshotDataUrl;
  if (capturedScreenshotDataUrl) {
    await page.screenshot({ path: pageScreenshotPath, fullPage: true });
  } else {
    await waitForPaintedFrames(page, 2);
    const canvasCapture = await page.evaluate(() => {
      if (typeof draw === "function") draw();
      const first = document.querySelector("canvas")?.toDataURL("image/png") || "";
      if (typeof draw === "function") draw();
      const second = document.querySelector("canvas")?.toDataURL("image/png") || "";
      return { dataUrl: first, stable: first === second };
    });
    if (!canvasCapture.dataUrl) errors.push("Canvas raster capture was unavailable");
    if (!canvasCapture.stable) errors.push("Two same-state Canvas draws produced different raster output");
    canonicalCanvasDataUrl = canvasCapture.dataUrl;
    await page.screenshot({ path: pageScreenshotPath, fullPage: true });
  }
  if (canonicalCanvasDataUrl) {
    const canonicalBuffer = Buffer.from(canonicalCanvasDataUrl.split(",", 2)[1], "base64");
    if (canonicalBuffer.length < 10_000) errors.push(`Canvas raster was unexpectedly small (${canonicalBuffer.length} bytes)`);
    fs.writeFileSync(screenshotPath, canonicalBuffer);
  }
  const tracePath = errors.length ? path.join(outputDir, `${item.name}-trace.zip`) : "";
  await context.tracing.stop(tracePath ? { path: tracePath } : undefined);
  await context.close();
  return {
    name: item.name,
    viewport: { width: item.width, height: item.height },
    url: `${baseUrl}${route}`,
    screenshot: path.basename(screenshotPath),
    canvasScreenshot: path.basename(screenshotPath),
    pageScreenshot: path.basename(pageScreenshotPath),
    trace: tracePath ? path.basename(tracePath) : null,
    evidence,
    errors
  };
}

(async () => {
  fs.mkdirSync(outputDir, { recursive: true });
  let staticServer = null;
  let baseUrl = externalBaseUrl;
  if (!baseUrl) {
    staticServer = createStaticServer();
    await new Promise((resolve) => staticServer.listen(0, "127.0.0.1", resolve));
    baseUrl = `http://127.0.0.1:${staticServer.address().port}`;
  }

  const browser = await chromium.launch({ headless: true });
  const report = [];
  try {
    for (let index = 0; index < selectedCases.length; index++) {
      const item = selectedCases[index];
      console.log(`Visual QA ${index + 1}/${selectedCases.length}: ${item.name}`);
      report.push(await runCase(browser, baseUrl, item));
    }
  } finally {
    await browser.close();
    if (staticServer) await new Promise((resolve) => staticServer.close(resolve));
  }

  const reportName = caseFilter ? `report-${caseFilter}.json` : "report.json";
  fs.writeFileSync(path.join(outputDir, reportName), `${JSON.stringify({
    generatedAt: new Date().toISOString(),
    baseUrl,
    passed: report.every((item) => item.errors.length === 0),
    cases: report
  }, null, 2)}\n`);
  const failures = report.filter((item) => item.errors.length);
  if (failures.length) {
    console.error(JSON.stringify(failures.map(({ name, errors, trace }) => ({ name, errors, trace })), null, 2));
    process.exitCode = 1;
  } else {
    console.log(`Visual QA passed: ${report.length} asserted cases -> ${outputDir}`);
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
