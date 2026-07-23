"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright");

const baseUrl = (process.argv[2] || "http://127.0.0.1:4175").replace(/\/$/, "");
const outputDir = path.resolve(process.argv[3] || path.join("outputs", "visual-qa"));
const caseFilter = process.argv[4] || "";
const localFallbackPaths = ["/__/firebase/init.json", "/src/firebase-config.local.json"];
const isLocal = /^https?:\/\/(127\.0\.0\.1|localhost)(:|\/|$)/.test(baseUrl);

const cases = [
  { name: "mobile-title", width: 375, height: 667, route: "/" },
  { name: "mobile-dossier", width: 375, height: 667, route: "/", click: { x: 38, y: 237 } },
  { name: "mobile-road", width: 375, height: 667, route: "/", click: { x: 165, y: 405 } },
  { name: "mobile-codex", width: 375, height: 667, route: "/", click: { x: 266, y: 408 } },
  { name: "mobile-settings", width: 375, height: 667, route: "/", clicks: [{ x: 38, y: 237 }, { x: 295, y: 78 }] },
  { name: "mobile-siphon", width: 375, height: 667, route: "/?debug=1&scenario=siphon" },
  { name: "mobile-debris", width: 375, height: 667, route: "/?debug=1&scenario=debris" },
  { name: "mobile-boss-staging", width: 375, height: 667, route: "/?debug=1&scenario=debris-incoming" },
  { name: "mobile-powerups", width: 390, height: 844, route: "/?debug=1&scenario=powerups" },
  { name: "desktop-title", width: 1440, height: 900, route: "/" },
  { name: "desktop-debris", width: 1440, height: 900, route: "/?debug=1&scenario=debris" },
];
const selectedCases = caseFilter ? cases.filter((item) => item.name === caseFilter) : cases;
if (!selectedCases.length) throw new Error(`Unknown visual QA case: ${caseFilter}`);

(async () => {
  fs.mkdirSync(outputDir, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ deviceScaleFactor: 1 });
  const failures = [];
  const report = [];
  try {
    for (const item of selectedCases) {
      const page = await context.newPage();
      page.setDefaultTimeout(90000);
      await page.setViewportSize({ width: item.width, height: item.height });
      const errors = [];
      page.on("console", (message) => {
        const text = message.text();
        const expectedLocal404 = isLocal && text.startsWith("Failed to load resource: the server responded with a status of 404");
        if (message.type() === "error" && !expectedLocal404) errors.push(`console: ${text}`);
      });
      page.on("pageerror", (error) => errors.push(`page: ${error.message}`));
      page.on("requestfailed", (request) => errors.push(`request: ${request.url()} ${request.failure()?.errorText || "failed"}`));
      page.on("response", (result) => {
        const url = new URL(result.url());
        const expectedLocal404 = isLocal && result.status() === 404 && localFallbackPaths.includes(url.pathname);
        if (result.status() >= 400 && !expectedLocal404) errors.push(`response: ${result.status()} ${result.url()}`);
      });
      const response = await page.goto(`${baseUrl}${item.route}`, { waitUntil: "commit", timeout: 90000 });
      await page.waitForSelector("canvas", { state: "visible", timeout: 90000 });
      await page.waitForFunction((needsDebug) => {
        const canvas = document.querySelector("canvas");
        const initialized = !!canvas && canvas.width > 300 && canvas.height > 150;
        const debugReady = !needsDebug || !!document.querySelector("#debugSnapshot")?.textContent;
        return initialized && debugReady;
      }, item.route.includes("debug=1"), { timeout: 90000 });
      const clicks = item.clicks || (item.click ? [item.click] : []);
      for (const click of clicks) {
        await page.waitForTimeout(350);
        await page.mouse.click(click.x, click.y);
        await page.waitForTimeout(900);
      }
      await page.waitForTimeout(item.route.includes("scenario") ? 1400 : 700);
      const state = await page.evaluate(() => {
        const canvas = document.querySelector("canvas");
        const debug = document.querySelector("#debugSnapshot")?.textContent || "";
        return {
          title: document.title,
          canvas: canvas ? { width: canvas.width, height: canvas.height } : null,
          debug: debug ? JSON.parse(debug) : null,
        };
      });
      await page.screenshot({ path: path.join(outputDir, `${item.name}.png`), fullPage: true, timeout: 90000 });
      if (!response || !response.ok()) errors.push(`HTTP ${response?.status() || "no response"}`);
      if (!state.canvas) errors.push("missing canvas");
      if (item.name === "mobile-boss-staging") {
        const boss = state.debug?.encounter?.boss;
        if (!boss || boss.damageable || boss.hp !== boss.maxHp) errors.push("incoming boss was damageable");
      }
      if (errors.length) failures.push({ name: item.name, errors });
      report.push({ name: item.name, url: `${baseUrl}${item.route}`, state, errors });
      await page.close();
    }
  } finally {
    await context.close();
    await browser.close();
  }
  const reportName = caseFilter ? `report-${caseFilter}.json` : "report.json";
  fs.writeFileSync(path.join(outputDir, reportName), `${JSON.stringify(report, null, 2)}\n`);
  if (failures.length) {
    console.error(JSON.stringify(failures, null, 2));
    process.exitCode = 1;
  } else {
    console.log(`Visual QA passed: ${selectedCases.length} cases -> ${outputDir}`);
  }
})();
