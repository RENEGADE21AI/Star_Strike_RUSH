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
  { name: "vault-touch-375x667", width: 375, height: 667, kind: "scroll", target: "achievements" },
  { name: "vault-touch-390x844", width: 390, height: 844, kind: "scroll", target: "achievements" },
  { name: "vault-touch-430x932", width: 430, height: 932, kind: "scroll", target: "achievements" },
  { name: "codex-touch-375x667", width: 375, height: 667, kind: "scroll", target: "codex" },
  { name: "codex-touch-390x844", width: 390, height: 844, kind: "scroll", target: "codex" },
  { name: "codex-touch-430x932", width: 430, height: 932, kind: "scroll", target: "codex" },
  { name: "reduced-motion", width: 390, height: 844, kind: "reduced-motion" },
  { name: "audio-settings", width: 390, height: 844, kind: "audio-settings" },
  { name: "play-immediate", width: 390, height: 844, kind: "play" },
  { name: "gameplay-hud-375x667", width: 375, height: 667, kind: "gameplay-hud" },
  { name: "paused-hud-375x667", width: 375, height: 667, kind: "paused-hud" },
  { name: "debris-staging", width: 375, height: 667, kind: "scenario", scenario: "debris-incoming" },
  { name: "powerup-gallery", width: 390, height: 844, kind: "scenario", scenario: "powerups" }
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
    distant: [20, 27],
    midground: [13, 18],
    foreground: [10, 14]
  };
  for (const formation of state.titleTraffic) {
    const range = ranges[formation.depth];
    if (!range || formation.durationSeconds < range[0] || formation.durationSeconds > range[1]) {
      errors.push(`invalid ${formation.depth} traversal duration ${formation.durationSeconds}`);
    }
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
  const context = await browser.newContext({
    deviceScaleFactor: 1,
    hasTouch: item.kind === "scroll",
    viewport: { width: item.width, height: item.height }
  });
  await context.tracing.start({ screenshots: true, snapshots: true, sources: true });
  const page = await context.newPage();
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

  const route = `/?debug=1${item.scenario ? `&scenario=${encodeURIComponent(item.scenario)}` : ""}`;
  const response = await page.goto(`${baseUrl}${route}`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("canvas", { state: "visible" });
  await page.waitForFunction(() => document.querySelector("#debugSnapshot")?.textContent);
  const initialSettleMs = item.scenario === "debris-incoming" ? 50 : 500;
  await page.waitForTimeout(initialSettleMs);

  let before = await snapshot(page);
  const evidence = { before };
  if (!response || !response.ok()) errors.push(`HTTP ${response?.status() || "no response"}`);
  if (before.runtimeErrors.length) errors.push(...before.runtimeErrors.map((error) => `runtime: ${error}`));

  if (item.kind === "title") {
    const title = before.layout.title;
    const widthRatio = title?.screenBounds?.w / Math.max(1, title?.playableScreenWidth || 0);
    if (!title || widthRatio < 0.88) errors.push(`title width ratio ${widthRatio || 0} is below 0.88`);
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
    const observedWindowSeconds = Math.max(0, after.timestampMs - before.timestampMs) / 1000;
    evidence.traversalMeasurements = before.titleTraffic.map((formation) => {
      const match = after.titleTraffic.find((candidate) => candidate.depth === formation.depth);
      const progressDelta = match ? match.normalizedProgress - formation.normalizedProgress : 0;
      return {
        depth: formation.depth,
        configuredSeconds: formation.durationSeconds,
        observedSeconds: progressDelta > 0 ? Number((observedWindowSeconds / progressDelta).toFixed(2)) : null
      };
    });
    for (const measurement of evidence.traversalMeasurements) {
      if (measurement.observedSeconds !== null && Math.abs(measurement.observedSeconds - measurement.configuredSeconds) > 1.2) {
        errors.push(`${measurement.depth} observed traversal differs from configured duration`);
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
    if (musicAfter.ui.settingMusicEnabled === settingsBefore.ui.settingMusicEnabled) errors.push("Music control did not toggle");
    if (musicAfter.ui.settingEffectsEnabled !== settingsBefore.ui.settingEffectsEnabled) errors.push("Music control changed Effects");
    if (effectsAfter.ui.settingEffectsEnabled === musicAfter.ui.settingEffectsEnabled) errors.push("Effects control did not toggle");
  } else if (item.kind === "play") {
    await clickLayout(page, "play");
    await page.waitForFunction(() => {
      const state = JSON.parse(document.querySelector("#debugSnapshot").textContent);
      return state.transition.mode === "title_launch" || state.gameState === "playing";
    });
    await page.waitForFunction(() => JSON.parse(document.querySelector("#debugSnapshot").textContent).gameState === "playing");
    evidence.after = await snapshot(page);
  } else if (item.kind === "gameplay-hud" || item.kind === "paused-hud") {
    await clickLayout(page, "play");
    await page.waitForFunction(() => JSON.parse(document.querySelector("#debugSnapshot").textContent).gameState === "playing");
    const playing = await snapshot(page);
    evidence.playing = playing;
    if (!(playing.layout.pause?.x < 60 && playing.layout.pause?.y < 60)) errors.push("pause button is not top-left");
    if (!(playing.layout.hud?.energy?.y < playing.layout.hud?.health?.y)) errors.push("energy is not above health");
    if (!(playing.layout.hud?.energy?.y > item.height * 0.58)) errors.push("energy and health are not bottom-left");
    if (playing.layout.hud?.health?.orientation !== "horizontal") errors.push("health is not a classic horizontal layout");
    if (!(playing.layout.hud?.score?.x > item.width / 2)) errors.push("score cluster is not top-right");
    if (item.kind === "paused-hud") {
      await clickLayout(page, "pause");
      await page.waitForFunction(() => JSON.parse(document.querySelector("#debugSnapshot").textContent).gameState === "paused");
      const paused = await snapshot(page);
      evidence.after = paused;
      if (paused.player.hp !== playing.player.hp - 1) errors.push("manual pause did not cost exactly one health bar");
      if (paused.ui.pauseNotice !== "PAUSE COST: 1 HEALTH BAR") errors.push("pause cost was not explained");
    } else {
      evidence.after = playing;
    }
  } else if (item.kind === "scenario") {
    if (item.scenario === "debris-incoming") {
      const boss = before.encounter.boss;
      if (!boss || boss.damageable || boss.hp !== boss.maxHp) errors.push("incoming boss was damageable");
    }
    if (item.scenario === "powerups" && before.counts.powerups !== 13) errors.push("powerup gallery did not show all 13 powerups");
  }

  const finalState = evidence.after || await snapshot(page);
  if (finalState.runtimeErrors.length) errors.push(...finalState.runtimeErrors.map((error) => `runtime: ${error}`));
  const screenshotPath = path.join(outputDir, `${item.name}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: true });
  const tracePath = errors.length ? path.join(outputDir, `${item.name}-trace.zip`) : "";
  await context.tracing.stop(tracePath ? { path: tracePath } : undefined);
  await context.close();
  return {
    name: item.name,
    viewport: { width: item.width, height: item.height },
    url: `${baseUrl}${route}`,
    screenshot: path.basename(screenshotPath),
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
    for (const item of selectedCases) report.push(await runCase(browser, baseUrl, item));
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
