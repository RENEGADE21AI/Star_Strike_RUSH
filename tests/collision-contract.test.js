const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");

const context = { console, Math, Number, String, Object, Array, Map, Set, Promise };
context.globalThis = context;
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.resolve(__dirname, "../src/00-asset-manifest.js"), "utf8"), context);

function entity(key, x, y, fallbackRadius = 0, scale = 1, rotation = 0) {
  return { key, x, y, fallbackRadius, scale, rotation };
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
  assert.equal(context.manifestCollision(entity("boss_wall", 126, 100, 20.5, 0.25), player), false);
  assert.equal(context.manifestCollision(entity("boss_wall", 126, 100, 20.5, 1), player), true);
});

test("collision API rejects positional arguments", () => {
  assert.throws(() => context.manifestCollision("red", 0, 0, 10, "player", 0, 0, 9), /collision body/i);
});

test("artwork-aligned collision offsets rotate with a turning ship", () => {
  const unrotated = context.collisionCirclesFor(entity("carrier", 100, 100));
  const quarterTurn = context.collisionCirclesFor(entity("carrier", 100, 100, 0, 1, Math.PI / 2));
  assert.deepEqual(
    { x: Math.round(unrotated[2].x), y: Math.round(unrotated[2].y) },
    { x: 117, y: 104 }
  );
  assert.deepEqual(
    { x: Math.round(quarterTurn[2].x), y: Math.round(quarterTurn[2].y) },
    { x: 96, y: 117 }
  );
});

test("player collision covers the visible wing roots without claiming transparent corners", () => {
  const tinyShot = entity("player_bullet", 110, 105, 1);
  const transparentCorner = entity("player_bullet", 118, 80, 1);
  const player = entity("player", 100, 100, 0);
  assert.equal(context.manifestCollision(tinyShot, player), true, "visible right wing root was not hittable");
  assert.equal(context.manifestCollision(transparentCorner, player), false, "transparent player corner became hittable");
});

test("boss collision covers solid outer weapon geometry without using a rectangular hitbox", () => {
  const boss = entity("boss_standard", 100, 100, 0);
  assert.equal(
    context.manifestCollision(entity("player_bullet", 160, 100, 1), boss),
    true,
    "solid outer boss weapon was not hittable"
  );
  assert.equal(
    context.manifestCollision(entity("player_bullet", 174, 130, 1), boss),
    false,
    "transparent boss corner became hittable"
  );
});

test("every boss uses a deliberate multi-part silhouette and Wraith realms stay mechanically identical", () => {
  const bossKeys = Object.keys(context.SPRITE_MANIFEST).filter((key) => key.startsWith("boss_") && key !== "boss_wall");
  for (const key of bossKeys) {
    assert.ok(context.SPRITE_MANIFEST[key].collision.length >= 6, `${key} collision silhouette is under-specified`);
  }
  const physical = JSON.parse(JSON.stringify(context.SPRITE_MANIFEST.boss_wraith_physical.collision));
  const ghost = JSON.parse(JSON.stringify(context.SPRITE_MANIFEST.boss_wraith_ghost.collision));
  assert.deepEqual(physical, ghost, "realm art changed the Wraith's mechanical silhouette");
});
