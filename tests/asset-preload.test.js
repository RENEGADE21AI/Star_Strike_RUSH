const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");

const repoRoot = path.resolve(__dirname, "..");

function loadManifest(ImageCtor) {
  const context = {
    globalThis: null,
    Image: ImageCtor,
    Map,
    Set,
    Object,
    Array,
    Number,
    String,
    Math,
    Promise,
    setTimeout,
    clearTimeout
  };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(repoRoot, "src", "00-asset-manifest.js"), "utf8"), context);
  return context;
}

test("asset preload reports progress and times out stalled images without blocking play", async () => {
  class StalledImage {
    set src(_value) {}
  }
  const context = loadManifest(StalledImage);
  const progress = [];
  const result = await context.preloadGameAssets({
    ImageCtor: StalledImage,
    timeoutMs: 5,
    retries: 0,
    onProgress: (snapshot) => progress.push({ ...snapshot })
  });
  assert.equal(result.ready, true);
  assert.ok(result.failed.length > 0);
  assert.ok(progress.length > 1);
  assert.equal(progress.at(-1).completed, progress.at(-1).total);
});

test("failed images can retry and become available", async () => {
  let attempts = 0;
  class RetryImage {
    set src(_value) {
      attempts++;
      queueMicrotask(() => attempts === 1 ? this.onerror?.() : this.onload?.());
    }
  }
  const context = loadManifest(RetryImage);
  const result = await context.preloadGameAssets({ ImageCtor: RetryImage, timeoutMs: 20, retries: 1 });
  assert.equal(result.ready, true);
  assert.equal(result.failed.length, 0);
  assert.ok(attempts > 1);
});
