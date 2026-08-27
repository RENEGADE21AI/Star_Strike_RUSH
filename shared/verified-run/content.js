"use strict";

(function initializeVerifiedRunContent(root, factory) {
  const constants = typeof module === "object" && module.exports
    ? require("./constants")
    : root.StarStrikeVerifiedRunConstants;
  const api = factory(constants);
  if (typeof module === "object" && module.exports) module.exports = api;
  Object.assign(root, api);
})(globalThis, function buildVerifiedRunContent(constants) {

if (!constants) throw new Error("Verified run constants must load before content.");
const { POSITION_UNITS_PER_PIXEL } = constants;

const AUTHORITATIVE_ENEMY_ARCHETYPES = Object.freeze({
  red: Object.freeze({ threatHundredths: 105, score: 30, radiusPixels: 12, hp: 2 }),
  orange: Object.freeze({ threatHundredths: 80, score: 20, radiusPixels: 10, hp: 1 }),
  purple: Object.freeze({ threatHundredths: 355, score: 150, radiusPixels: 17, hp: 5 }),
  phantom: Object.freeze({ threatHundredths: 235, score: 100, radiusPixels: 14, hp: 3 }),
  splitter: Object.freeze({ threatHundredths: 220, score: 120, radiusPixels: 15, hp: 3 }),
  splitter_shard: Object.freeze({ threatHundredths: 45, score: 10, radiusPixels: 8, hp: 1 }),
  carrier: Object.freeze({ threatHundredths: 430, score: 300, radiusPixels: 23, hp: 6 }),
  siphon: Object.freeze({ threatHundredths: 270, score: 130, radiusPixels: 14, hp: 3 }),
  leech: Object.freeze({ threatHundredths: 380, score: 190, radiusPixels: 16, hp: 4 }),
  minecaster: Object.freeze({ threatHundredths: 265, score: 140, radiusPixels: 15, hp: 3 }),
  shieldbearer: Object.freeze({ threatHundredths: 245, score: 150, radiusPixels: 16, hp: 4 }),
  railgunner: Object.freeze({ threatHundredths: 350, score: 220, radiusPixels: 15, hp: 3 }),
  repair_drone: Object.freeze({ threatHundredths: 145, score: 90, radiusPixels: 11, hp: 2 })
});

const AUTHORITATIVE_BOSS_ARCHETYPES = Object.freeze({
  standard: Object.freeze({ hp: 100, score: 1000 }),
  wraith: Object.freeze({ hp: 130, score: 1700 }),
  debris_warden: Object.freeze({ hp: 150, score: 1800 }),
  mothership: Object.freeze({ hp: 160, score: 1900 }),
  siphon_core: Object.freeze({ hp: 165, score: 2000 }),
  hive_breaker: Object.freeze({ hp: 170, score: 2100 }),
  rail_tyrant: Object.freeze({ hp: 175, score: 2200 }),
  gravity_well: Object.freeze({ hp: 180, score: 2300 })
});

function circles(...entries) {
  return Object.freeze(entries.map(([offsetX, offsetY, radius]) => Object.freeze({ offsetX, offsetY, radius })));
}

const AUTHORITATIVE_COLLISION_CIRCLES_PIXELS = Object.freeze({
  player: circles([0, -9, 5], [0, 1, 7], [-9, 5, 4.5], [9, 5, 4.5], [0, 11, 5]),
  red: circles([0, 1, 10]),
  orange: circles([0, 1, 8.5]),
  purple: circles([0, 1, 14]),
  phantom: circles([0, 0, 11.5]),
  splitter: circles([0, 0, 17]),
  splitter_shard: circles([0, 1, 9]),
  carrier: circles([0, 1, 18], [-17, 4, 9], [17, 4, 9]),
  siphon: circles([0, 0, 11]),
  leech: circles([0, 0, 13]),
  minecaster: circles([0, 0, 12]),
  shieldbearer: circles([0, 0, 13]),
  railgunner: circles([0, 2, 11]),
  repair_drone: circles([0, 0, 9]),
  boss_standard: circles([0, 0, 27], [-34, 1, 18], [34, 1, 18], [-57, 0, 7], [57, 0, 7], [0, 15, 17]),
  boss_wraith: circles([0, 0, 27], [-36, 2, 18], [36, 2, 18], [-59, 1, 9], [59, 1, 9], [0, -20, 13], [0, 21, 10]),
  boss_debris_warden: circles([0, 0, 29], [-43, 2, 21], [43, 2, 21], [-66, 0, 11], [66, 0, 11], [0, -28, 17], [0, 29, 17]),
  boss_mothership: circles([0, 0, 31], [-48, 3, 23], [48, 3, 23], [-74, 5, 11], [74, 5, 11], [0, -34, 16], [0, 38, 15]),
  boss_siphon_core: circles([0, -2, 31], [-38, -1, 19], [38, -1, 19], [-61, 2, 9], [61, 2, 9], [0, -27, 14], [0, 29, 13]),
  boss_hive_breaker: circles([0, 0, 29], [-38, 2, 20], [38, 2, 20], [-63, 2, 9], [63, 2, 9], [-24, -24, 12], [24, -24, 12], [0, 29, 13]),
  boss_rail_tyrant: circles([0, 0, 29], [-35, 2, 20], [35, 2, 20], [-62, 1, 13], [62, 1, 13], [0, -24, 13], [0, 26, 13]),
  boss_gravity_well: circles([0, 0, 31], [-39, 1, 19], [39, 1, 19], [-63, 2, 10], [63, 2, 10], [0, -25, 13], [0, 26, 12]),
  small_debris: circles([0, 0, 9.5]),
  rock_asteroid: circles([0, 0, 15.5]),
  iron_asteroid: circles([0, 0, 20.5]),
  boss_wall: circles([0, 0, 20.5]),
  comet_shard: circles([0, 0, 11]),
  mine: circles([0, 0, 10]),
  energy_mine: circles([0, 0, 10.5]),
  player_bullet: circles([0, 2, 2.4]),
  enemy_bullet: circles([0, 1, 3.4]),
  drainShot: circles([0, 0, 4.3]),
  powerup: circles([0, 0, 17])
});

const CANONICAL_COLLISION_CIRCLES = Object.freeze(Object.fromEntries(
  Object.entries(AUTHORITATIVE_COLLISION_CIRCLES_PIXELS).map(([key, source]) => [key, Object.freeze(source.map((circle) => Object.freeze({
    offsetX: Math.round(circle.offsetX * POSITION_UNITS_PER_PIXEL),
    offsetY: Math.round(circle.offsetY * POSITION_UNITS_PER_PIXEL),
    radius: Math.round(circle.radius * POSITION_UNITS_PER_PIXEL)
  })))])
));

function collisionCirclesFor(key) {
  const circlesForKey = CANONICAL_COLLISION_CIRCLES[String(key || "")];
  if (!circlesForKey) throw new RangeError(`Unknown authoritative collision key: ${key}`);
  return circlesForKey;
}

return Object.freeze({
  AUTHORITATIVE_BOSS_ARCHETYPES,
  AUTHORITATIVE_COLLISION_CIRCLES_PIXELS,
  AUTHORITATIVE_ENEMY_ARCHETYPES,
  CANONICAL_COLLISION_CIRCLES,
  collisionCirclesFor
});
});
