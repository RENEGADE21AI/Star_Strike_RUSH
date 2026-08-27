"use strict";

const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const { chromium } = require("playwright");
const { evaluatePerformanceBudget, summarizePerformance } = require("./performance-metrics.js");

const repoRoot = path.resolve(__dirname, "..");
const outputDir = path.resolve(process.argv[2] || path.join(repoRoot, "test-artifacts", "performance-qa"));
const durationMs = Math.max(3000, Number(process.env.PERFORMANCE_QA_DURATION_MS) || 8000);
const warmupMs = Math.max(500, Number(process.env.PERFORMANCE_QA_WARMUP_MS) || 1500);
const expectedFrameMs = 1000 / 60;
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
  {
    name: "late-game-desktop-1440x900",
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    budget: {
      maxP95FrameMs: 1500,
      maxP99FrameMs: 2200,
      maxDroppedRenderRatio: 0.99,
      maxLongTaskMs: 2500,
      maxSimulationBacklogMs: 17
    }
  },
  {
    name: "late-game-mobile-430x932",
    viewport: { width: 430, height: 932 },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
    budget: {
      maxP95FrameMs: 2000,
      maxP99FrameMs: 3000,
      maxDroppedRenderRatio: 0.995,
      maxLongTaskMs: 3500,
      maxSimulationBacklogMs: 17
    }
  }
];

const minimumPressure = {
  bullets: 16,
  enemyBullets: 16,
  enemies: 8,
  debris: 6,
  beams: 1,
  gravityWells: 1,
  powerups: 4,
  particles: 100,
  wingmen: 2
};

function createStaticServer() {
  return http.createServer((request, response) => {
    const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
    const relative = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
    const file = path.resolve(repoRoot, relative);
    if (file !== repoRoot && !file.startsWith(`${repoRoot}${path.sep}`)) {
      response.writeHead(403).end("Forbidden");
      return;
    }
    fs.readFile(file, (error, body) => {
      if (error) {
        response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }).end("Not found");
        return;
      }
      response.writeHead(200, {
        "Cache-Control": "no-store",
        "Content-Type": mimeTypes.get(path.extname(file).toLowerCase()) || "application/octet-stream"
      });
      response.end(body);
    });
  });
}

async function stageLateGamePressure(page) {
  await page.evaluate(() => {
    setupSession("playing");
    state.runMode = "debug";
    document.body.dataset.gameRunMode = state.runMode;
    state.sceneTransition = { mode: "idle", frame: 0, duration: 1, elapsedSeconds: 0, durationSeconds: 0 };
    state.phase = 20;
    state.phaseTimer = -999999;
    state.waveRest = 999999;
    state.player.hp = state.player.maxHp;
    state.player.inv = 1_000_000;
    state.player.fire = 1_000_000;
    state.player.x = W / 2;
    state.player.y = H - 54;
    state.player.phaseShield = 1_000_000;
    settingMaxParticles = 900;
    MAX_PARTICLES = 900;

    const enemyTypes = [
      "red", "orange", "purple", "phantom", "carrier", "leech", "minecaster", "shieldbearer",
      "repair_drone", "splitter", "splitter_shard", "railgunner", "siphon"
    ];
    for (let index = 0; index < 12; index++) {
      const column = index % 7;
      const row = Math.floor(index / 7);
      spawnEnemy(enemyTypes[index % enemyTypes.length], 54 + column * ((W - 108) / 6), 100 + row * 78, {
        forceSpawn: true,
        noCodex: true,
        entryFrames: 0,
        recover: 1_000_000,
        shoot: 1_000_000,
        fireTimer: 1_000_000,
        noPowerup: true
      });
    }

    spawnExpansionBoss("gravity_well");
    if (state.boss) {
      state.boss.y = state.boss.targetY;
      state.boss.entered = true;
      state.boss.combatActive = true;
      state.boss.cooldown = 1_000_000;
      state.boss.warn = 0;
    }

    const bulletKinds = ["boss", "aimed", "phantomShot", "purple", "wraithPhysical", "drainShot"];
    state.enemyBullets = Array.from({ length: 24 }, (_, index) => ({
      x: 18 + (index % 12) * ((W - 36) / 11),
      y: 145 + Math.floor(index / 12) * 42,
      vx: 0,
      vy: 0,
      life: 1_000_000,
      r: 4,
      kind: bulletKinds[index % bulletKinds.length],
      realm: index % 2
    }));
    state.bullets = Array.from({ length: 24 }, (_, index) => ({
      x: 28 + (index % 10) * ((W - 56) / 9),
      y: 125 + Math.floor(index / 10) * 66,
      vx: 0,
      vy: 0,
      life: 1_000_000,
      r: 3,
      kind: index % 3 === 0 ? "ghost" : "physical",
      realm: index % 2,
      damage: 0
    }));

    for (let index = 0; index < 8; index++) {
      const kinds = ["small_debris", "rock_asteroid", "iron_asteroid", "comet_shard"];
      spawnAsteroid(kinds[index % kinds.length], 36 + (index % 6) * ((W - 72) / 5), 170 + Math.floor(index / 6) * 190, {
        vx: 0,
        vy: 0,
        hp: 999999,
        maxHp: 999999,
        life: 1_000_000,
        noScore: true
      });
    }
    spawnEnemyBeam(W * 0.5, 100, Math.PI / 2, { active: 1_000_000, damage: 0, width: 10, color: "#ff3046" });
    spawnGravityWell(W * 0.5, H * 0.44, { warn: 0, life: 1_000_000, strength: 0, r: 82 });

    const powerupTypes = [
      "spread", "rapid", "repair", "wingman", "dual", "energy_cell", "overcharge",
      "phase_shield", "magnet", "piercing", "ion_burst", "stabilizer", "score_surge"
    ];
    state.powerups = powerupTypes.map((type, index) => ({
      type,
      x: 40 + (index % 7) * ((W - 80) / 6),
      y: H * 0.56 + Math.floor(index / 7) * 54,
      vy: 0,
      size: 11,
      life: 1_000_000,
      rotation: index * 0.4,
      spinSpeed: 0.01
    }));

    spawnWingmen(2);
    for (const wingman of state.wingmen) {
      wingman.phase = "active";
      wingman.timer = 1_000_000;
      wingman.fire = 1_000_000;
    }

    const particleColors = ["#ffffff", "#55e8ff", "#ff4fb8", "#ffe45c", "#70ff45"];
    state.particles = Array.from({ length: 120 }, (_, index) => ({
      x: (index * 47) % W,
      y: (index * 83) % H,
      vx: 0,
      vy: 0,
      life: 1_000_000,
      size: 1.5 + (index % 4) * 0.5,
      color: particleColors[index % particleColors.length]
    }));
  });
}

async function capturePerformance(page) {
  return page.evaluate(async ({ durationMs }) => {
    const samples = [];
    const longTasks = [];
    let observer = null;
    if (typeof PerformanceObserver === "function" && PerformanceObserver.supportedEntryTypes?.includes("longtask")) {
      observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) longTasks.push({ startTimeMs: entry.startTime, durationMs: entry.duration });
      });
      observer.observe({ entryTypes: ["longtask"] });
    }
    const start = performance.now();
    await new Promise((resolve) => {
      const sample = (timestamp) => {
        state.player.hp = state.player.maxHp;
        state.player.inv = Math.max(state.player.inv, 1_000_000);
        const debug = getDebugSnapshot();
        samples.push({
          timestampMs: timestamp,
          simulationFrame: state.frame,
          simulationBacklogMs: Number(simulationClock.accumulator || 0),
          heapUsedBytes: Number(performance.memory && performance.memory.usedJSHeapSize),
          counts: debug.counts
        });
        if (timestamp - start >= durationMs) resolve();
        else requestAnimationFrame(sample);
      };
      requestAnimationFrame(sample);
    });
    if (observer) observer.disconnect();
    return { samples, longTasks, runtimeErrors: state.debugErrors.slice() };
  }, { durationMs });
}

async function runCase(browser, baseUrl, item) {
  const context = await browser.newContext({
    viewport: item.viewport,
    deviceScaleFactor: item.deviceScaleFactor,
    isMobile: item.isMobile === true,
    hasTouch: item.hasTouch === true
  });
  const page = await context.newPage();
  const browserErrors = [];
  page.on("pageerror", (error) => browserErrors.push(`page: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error" && !message.text().includes("404")) browserErrors.push(`console: ${message.text()}`);
  });
  try {
    const response = await page.goto(`${baseUrl}/?debug=1`, { waitUntil: "domcontentloaded" });
    if (!response || !response.ok()) browserErrors.push(`HTTP ${response?.status() || "no response"}`);
    await page.waitForFunction(() => document.querySelector("#debugSnapshot")?.textContent, null, { timeout: 90_000 });
    await stageLateGamePressure(page);
    await page.waitForTimeout(warmupMs);
    const capture = await capturePerformance(page);
    const summary = summarizePerformance(capture.samples, { expectedFrameMs, longTasks: capture.longTasks });
    const budget = { ...item.budget, minSamples: Math.max(3, Math.floor(durationMs / 2500)) };
    const budgetResult = evaluatePerformanceBudget(summary, budget);
    const pressureFailures = Object.entries(minimumPressure)
      .filter(([key, minimum]) => Number(summary.maxCounts[key] || 0) < minimum)
      .map(([key, minimum]) => `${key} pressure ${summary.maxCounts[key] || 0} is below ${minimum}`);
    const failures = [
      ...browserErrors,
      ...capture.runtimeErrors.map((error) => `runtime: ${error}`),
      ...pressureFailures,
      ...budgetResult.failures
    ];
    const screenshot = path.join(outputDir, `${item.name}.png`);
    try {
      await page.screenshot({ path: screenshot, fullPage: true, timeout: 30_000 });
    } catch (error) {
      failures.push(`screenshot: ${String(error && error.message || error).split("\n")[0]}`);
    }
    return {
      name: item.name,
      viewport: item.viewport,
      deviceScaleFactor: item.deviceScaleFactor,
      durationMs,
      warmupMs,
      budget,
      summary,
      failures,
      pass: failures.length === 0,
      screenshot: path.relative(repoRoot, screenshot).replaceAll(path.sep, "/")
    };
  } finally {
    await context.close();
  }
}

async function main() {
  fs.rmSync(outputDir, { recursive: true, force: true });
  fs.mkdirSync(outputDir, { recursive: true });
  const server = createStaticServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ headless: true, args: ["--enable-precise-memory-info"] });
  const results = [];
  try {
    for (const item of cases) {
      const result = await runCase(browser, baseUrl, item);
      results.push(result);
      console.log(`${result.pass ? "PASS" : "FAIL"} ${result.name}: p95=${result.summary.p95FrameMs}ms p99=${result.summary.p99FrameMs}ms dropped=${result.summary.droppedRenderRatio}`);
      for (const failure of result.failures) console.error(`  ${failure}`);
    }
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }

  const report = {
    schemaVersion: 1,
    commitSha: execFileSync("git", ["rev-parse", "HEAD"], { cwd: repoRoot, encoding: "utf8" }).trim(),
    generatedAtUtc: new Date().toISOString(),
    pass: results.every((result) => result.pass),
    cases: results
  };
  const reportPath = path.join(outputDir, "performance-report.json");
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(`Performance evidence: ${path.relative(repoRoot, reportPath)}`);
  if (!report.pass) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error && error.stack || error);
  process.exitCode = 1;
});
