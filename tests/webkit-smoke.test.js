const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { after, before, test } = require("node:test");
const { webkit } = require("playwright");

const repoRoot = path.resolve(__dirname, "..");
const mime = new Map([
  [".css", "text/css; charset=utf-8"], [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"], [".json", "application/json; charset=utf-8"],
  [".png", "image/png"], [".webp", "image/webp"], [".svg", "image/svg+xml"], [".mp3", "audio/mpeg"]
]);
let browser;
let server;
let baseUrl;

function staticServer(request, response) {
  const url = new URL(request.url || "/", "http://127.0.0.1");
  const relative = url.pathname === "/" ? "index.html" : decodeURIComponent(url.pathname).replace(/^\/+/, "");
  const file = path.resolve(repoRoot, relative);
  if (!file.startsWith(`${repoRoot}${path.sep}`) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    response.writeHead(404).end("Not found");
    return;
  }
  response.writeHead(200, { "cache-control": "no-store", "content-type": mime.get(path.extname(file)) || "application/octet-stream" });
  fs.createReadStream(file).pipe(response);
}

async function snapshot(page) {
  return page.evaluate(() => JSON.parse(document.querySelector("#debugSnapshot").textContent));
}

before(async () => {
  server = http.createServer(staticServer);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
  browser = await webkit.launch({ headless: true });
});

after(async () => {
  if (browser) await browser.close();
  if (server) await new Promise((resolve) => server.close(resolve));
});

for (const scenario of [
  { name: "desktop", viewport: { width: 1440, height: 900 }, touch: false },
  { name: "iPhone-like touch", viewport: { width: 390, height: 844 }, touch: true }
]) {
  test(`WebKit ${scenario.name} supports first load, launch, controls, pause, and resize`, { timeout: 90_000 }, async () => {
    const context = await browser.newContext({ viewport: scenario.viewport, hasTouch: scenario.touch, isMobile: scenario.touch });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    // Use the production first-load router while enabling only the tutorial QA
    // snapshot. A bare `debug=1` intentionally bypasses onboarding.
    await page.goto(`${baseUrl}/?debug=1&scenario=tutorial`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => document.querySelector("#debugSnapshot")?.textContent, null, { timeout: 60000 });
    await page.getByRole("button", { name: "NO — GO TO TITLE" }).click();
    // Canvas-mapped accessible actions deliberately ignore pointer events so
    // physical input continues to land on the Canvas; assistive activation is
    // equivalent to a programmatic button click.
    await page.getByRole("button", { name: "Play" }).evaluate((button) => button.click());
    await page.waitForFunction(() => {
      const data = JSON.parse(document.querySelector("#debugSnapshot").textContent);
      return data.gameState === "playing" && data.transition.mode === "idle";
    }, null, { timeout: 30000 });
    const before = await snapshot(page);
    if (scenario.touch) {
      const canvas = await page.locator("#game").boundingBox();
      assert.ok(canvas);
      const sx = canvas.width / 375;
      const sy = canvas.height / 667;
      await page.touchscreen.tap(canvas.x + 76 * sx, canvas.y + (844 > 667 ? 591 : 591) * sy);
      await page.locator("#game").dispatchEvent("pointerdown", {
        pointerType: "touch", pointerId: 31, clientX: canvas.x + 76 * sx, clientY: canvas.y + 591 * sy, buttons: 1
      });
      await page.locator("#game").dispatchEvent("pointermove", {
        pointerType: "touch", pointerId: 31, clientX: canvas.x + 112 * sx, clientY: canvas.y + 591 * sy, buttons: 1
      });
      await page.waitForTimeout(220);
      await page.locator("#game").dispatchEvent("pointerup", {
        pointerType: "touch", pointerId: 31, clientX: canvas.x + 112 * sx, clientY: canvas.y + 591 * sy, buttons: 0
      });
    } else {
      await page.keyboard.down("ArrowLeft");
      await page.waitForTimeout(220);
      await page.keyboard.up("ArrowLeft");
      await page.keyboard.press("Space");
    }
    const afterInput = await snapshot(page);
    assert.notEqual(afterInput.player.x, before.player.x, "WebKit gameplay input did not move the fighter");
    await page.getByRole("button", { name: /Pause flight, costs one health bar/ }).evaluate((button) => button.click());
    await page.waitForFunction(() => JSON.parse(document.querySelector("#debugSnapshot").textContent).gameState === "paused");
    const paused = await snapshot(page);
    assert.equal(paused.gameState, "paused");
    assert.equal(paused.player.hp, before.player.hp - 1);
    await page.getByRole("button", { name: "Resume flight" }).evaluate((button) => button.click());
    await page.setViewportSize({ width: 844, height: 390 });
    await page.waitForTimeout(100);
    await page.setViewportSize(scenario.viewport);
    assert.equal(JSON.parse(await page.evaluate(() => localStorage.getItem("star_strike_rush_onboarding_v1"))).status, "skipped");
    assert.deepEqual(errors, []);
    await context.close();
  });
}
