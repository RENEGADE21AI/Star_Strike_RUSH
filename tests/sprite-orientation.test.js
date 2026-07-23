const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");

const repoRoot = path.resolve(__dirname, "..");
const context = { console, Math, Number, String, Object, Array, Map, Set, Promise };
context.globalThis = context;
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(repoRoot, "src/00-asset-manifest.js"), "utf8"), context);

test("every sprite exposes one explicit orientation contract", () => {
  for (const [key, meta] of Object.entries(context.SPRITE_MANIFEST)) {
    assert.equal(typeof meta.orientation.baseRotation, "number", `${key} baseRotation`);
    assert.equal(typeof meta.orientation.flipX, "boolean", `${key} flipX`);
    assert.equal(typeof meta.orientation.flipY, "boolean", `${key} flipY`);
    assert.ok(Number.isFinite(meta.orientation.forwardX), `${key} forwardX`);
    assert.ok(Number.isFinite(meta.orientation.forwardY), `${key} forwardY`);
    assert.equal(typeof meta.orientation.codexRotation, "number", `${key} codexRotation`);
    assert.equal(typeof meta.orientation.titleRotation, "number", `${key} titleRotation`);
  }
});

test("friendly and hostile artwork have coherent forward, weapon, and exhaust directions", () => {
  const player = context.SPRITE_MANIFEST.player;
  assert.equal(player.orientation.forwardY, -1);
  assert.ok(player.projectileOrigin.offsetY < 0);
  assert.ok(player.exhaustOrigin.offsetY > 0);
  const wingman = context.SPRITE_MANIFEST.wingman;
  assert.equal(wingman.orientation.forwardY, -1);
  assert.equal(wingman.orientation.baseRotation, Math.PI);
  assert.ok(wingman.projectileOrigin.offsetY < 0);
  assert.ok(wingman.exhaustOrigin.offsetY > 0);

  for (const key of ["red", "orange", "siphon", "leech", "carrier", "boss_debris_warden"]) {
    const meta = context.SPRITE_MANIFEST[key];
    assert.equal(meta.orientation.forwardY, 1, key);
    assert.ok(meta.exhaustOrigin.offsetY < 0, `${key} exhaust should trail above downward travel`);
  }
  assert.ok(context.SPRITE_MANIFEST.siphon.projectileOrigin.offsetY > 0);
});

test("player base orientation is centralized instead of scattered through renderers", () => {
  assert.equal(context.SPRITE_MANIFEST.player.orientation.baseRotation, Math.PI);
  const playerRenderer = fs.readFileSync(path.join(repoRoot, "src/14-rendering-player.js"), "utf8");
  const dossierRenderer = fs.readFileSync(path.join(repoRoot, "src/12-rendering-title-panels.js"), "utf8");
  assert.doesNotMatch(playerRenderer, /rotation:\s*tilt\s*\+\s*Math\.PI/);
  assert.doesNotMatch(dossierRenderer, /rotation:\s*Math\.PI/);
});
