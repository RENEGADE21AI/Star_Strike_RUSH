const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");

const context = { console, Math, Number, String, Object, Array, Map, Set, Promise };
context.globalThis = context;
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.resolve(__dirname, "../src/00-asset-manifest.js"), "utf8"), context);

function entity(key, x, y, fallbackRadius = 0, scale = 1) {
  return { key, x, y, fallbackRadius, scale };
}

test("object-based collision contract handles overlap and near misses", () => {
  assert.equal(context.manifestCollision(entity("player_bullet", 100, 100, 3), entity("red", 100, 108, 10)), true);
  assert.equal(context.manifestCollision(entity("player_bullet", 100, 100, 3), entity("red", 100, 122, 10)), false);
});

test("object-based collision contract checks every boss circle", () => {
  assert.equal(context.manifestCollision(entity("player_bullet", 145, 100, 3), entity("boss_standard", 100, 100, 30)), true);
  assert.equal(context.manifestCollision(entity("player_bullet", 173, 100, 3), entity("boss_standard", 100, 100, 30)), false);
});

test("collision scale grows asteroid danger with its visual spawn scale", () => {
  const player = entity("player", 100, 100, 9);
  assert.equal(context.manifestCollision(entity("boss_wall", 129, 100, 20.5, 0.25), player), false);
  assert.equal(context.manifestCollision(entity("boss_wall", 129, 100, 20.5, 1), player), true);
});

test("collision API rejects positional arguments", () => {
  assert.throws(() => context.manifestCollision("red", 0, 0, 10, "player", 0, 0, 9), /collision body/i);
});
