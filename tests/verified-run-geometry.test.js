"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  ANGLE_UNITS,
  POSITION_UNITS_PER_PIXEL,
  TRIG_UNITS
} = require("../shared/verified-run/constants");
const { SIN_TABLE, cosForAngle, sinForAngle } = require("../shared/verified-run/trig-table");
const {
  AUTHORITATIVE_BOSS_ARCHETYPES,
  AUTHORITATIVE_COLLISION_CIRCLES_PIXELS,
  AUTHORITATIVE_ENEMY_ARCHETYPES,
  collisionCirclesFor
} = require("../shared/verified-run/content");
const {
  bodiesOverlap,
  collisionBodyFor,
  rotateCanonicalOffset
} = require("../shared/verified-run/geometry");

test("checked-in trigonometry has exact cardinal values", () => {
  assert.equal(SIN_TABLE.length, ANGLE_UNITS);
  assert.equal(sinForAngle(0), 0);
  assert.equal(sinForAngle(ANGLE_UNITS / 4), TRIG_UNITS);
  assert.equal(sinForAngle(ANGLE_UNITS / 2), 0);
  assert.equal(sinForAngle(ANGLE_UNITS * 3 / 4), -TRIG_UNITS);
  assert.equal(cosForAngle(0), TRIG_UNITS);
  assert.equal(cosForAngle(ANGLE_UNITS / 2), -TRIG_UNITS);
});

test("canonical offsets rotate using only versioned integer tables", () => {
  const scale = POSITION_UNITS_PER_PIXEL;
  assert.deepEqual(rotateCanonicalOffset(10 * scale, 0, 0), { x: 10 * scale, y: 0 });
  assert.deepEqual(rotateCanonicalOffset(10 * scale, 0, ANGLE_UNITS / 4), { x: 0, y: 10 * scale });
  assert.deepEqual(rotateCanonicalOffset(0, -7 * scale, ANGLE_UNITS / 2), { x: 0, y: 7 * scale });
});

test("every gameplay ship and hazard has authoritative collision content", () => {
  const required = [
    "player", "wingman", "red", "orange", "purple", "phantom", "splitter", "splitter_shard",
    "carrier", "siphon", "leech", "minecaster", "shieldbearer", "railgunner", "repair_drone",
    "boss_standard", "boss_wraith", "boss_debris_warden", "boss_mothership", "boss_siphon_core",
    "boss_hive_breaker", "boss_rail_tyrant", "boss_gravity_well", "small_debris", "rock_asteroid",
    "iron_asteroid", "boss_wall", "comet_shard", "mine", "energy_mine", "player_bullet",
    "enemy_bullet", "drainShot", "powerup"
  ];
  for (const key of required) {
    assert.ok(Array.isArray(AUTHORITATIVE_COLLISION_CIRCLES_PIXELS[key]), `${key} collision content missing`);
    const circles = collisionCirclesFor(key);
    assert.ok(circles.length >= 1);
    for (const circle of circles) {
      assert.equal(Number.isSafeInteger(circle.offsetX), true);
      assert.equal(Number.isSafeInteger(circle.offsetY), true);
      assert.equal(Number.isSafeInteger(circle.radius), true);
    }
  }
  assert.deepEqual(Object.keys(AUTHORITATIVE_ENEMY_ARCHETYPES).sort(), [
    "carrier", "leech", "minecaster", "orange", "phantom", "purple", "railgunner", "red",
    "repair_drone", "shieldbearer", "siphon", "splitter", "splitter_shard"
  ]);
  assert.equal(Object.keys(AUTHORITATIVE_BOSS_ARCHETYPES).length, 8);
});

test("multi-circle collisions rotate artwork-aligned offsets and reject near misses", () => {
  const scale = POSITION_UNITS_PER_PIXEL;
  const carrier = collisionBodyFor("carrier", 100 * scale, 100 * scale, ANGLE_UNITS / 4);
  const touchingWing = {
    x: 96 * scale,
    y: 117 * scale,
    angle: 0,
    circles: [{ offsetX: 0, offsetY: 0, radius: 2 * scale }]
  };
  const nearMiss = {
    x: 65 * scale,
    y: 100 * scale,
    angle: 0,
    circles: [{ offsetX: 0, offsetY: 0, radius: 2 * scale }]
  };
  assert.equal(bodiesOverlap(carrier, touchingWing), true);
  assert.equal(bodiesOverlap(carrier, nearMiss), false);
});

test("boss silhouettes retain deliberate multi-circle authority", () => {
  for (const mode of Object.keys(AUTHORITATIVE_BOSS_ARCHETYPES)) {
    const key = mode === "standard" ? "boss_standard" : `boss_${mode}`;
    assert.ok(collisionCirclesFor(key).length >= 6, `${mode} silhouette is too coarse`);
  }
});
