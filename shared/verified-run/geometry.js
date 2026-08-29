"use strict";

(function initializeVerifiedRunGeometry(root, factory) {
  const constants = typeof module === "object" && module.exports
    ? require("./constants")
    : root.StarStrikeVerifiedRunConstants;
  const trig = typeof module === "object" && module.exports ? require("./trig-table") : root;
  const content = typeof module === "object" && module.exports ? require("./content") : root;
  const api = factory(constants, trig, content);
  if (typeof module === "object" && module.exports) module.exports = api;
  Object.assign(root, api);
})(globalThis, function buildVerifiedRunGeometry(constants, trig, content) {

if (!constants || !trig || !content) throw new Error("Verified run geometry dependencies are missing.");
const { ANGLE_UNITS, TRIG_UNITS } = constants;
const { cosForAngle, sinForAngle } = trig;
const { collisionCirclesFor } = content;

function roundDivide(numerator, denominator) {
  return numerator < 0
    ? -Math.floor((-numerator + Math.floor(denominator / 2)) / denominator)
    : Math.floor((numerator + Math.floor(denominator / 2)) / denominator);
}

function canonicalInteger(value, label) {
  const number = Number(value);
  if (!Number.isSafeInteger(number)) throw new TypeError(`${label} must be a safe integer.`);
  return number;
}

function rotateCanonicalOffset(x, y, angle) {
  const offsetX = canonicalInteger(x, "Collision offset X");
  const offsetY = canonicalInteger(y, "Collision offset Y");
  const canonicalAngle = canonicalInteger(angle, "Collision angle");
  const sine = sinForAngle(canonicalAngle);
  const cosine = cosForAngle(canonicalAngle);
  return Object.freeze({
    x: roundDivide(offsetX * cosine - offsetY * sine, TRIG_UNITS),
    y: roundDivide(offsetX * sine + offsetY * cosine, TRIG_UNITS)
  });
}

function collisionBodyFor(key, x, y, angle = 0) {
  return Object.freeze({
    x: canonicalInteger(x, "Collision body X"),
    y: canonicalInteger(y, "Collision body Y"),
    angle: ((canonicalInteger(angle, "Collision body angle") % ANGLE_UNITS) + ANGLE_UNITS) % ANGLE_UNITS,
    circles: collisionCirclesFor(key)
  });
}

function worldCircle(body, circle) {
  const rotated = rotateCanonicalOffset(circle.offsetX, circle.offsetY, body.angle || 0);
  return {
    x: canonicalInteger(body.x, "Collision body X") + rotated.x,
    y: canonicalInteger(body.y, "Collision body Y") + rotated.y,
    radius: canonicalInteger(circle.radius, "Collision radius")
  };
}

function bodiesOverlap(first, second) {
  if (!first || !second || !Array.isArray(first.circles) || !Array.isArray(second.circles)) {
    throw new TypeError("Canonical collision bodies require circle arrays.");
  }
  for (const firstSource of first.circles) {
    const a = worldCircle(first, firstSource);
    for (const secondSource of second.circles) {
      const b = worldCircle(second, secondSource);
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      const radii = a.radius + b.radius;
      if (dx * dx + dy * dy <= radii * radii) return true;
    }
  }
  return false;
}

return Object.freeze({ bodiesOverlap, collisionBodyFor, rotateCanonicalOffset });
});
