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

const powerupTypes = [
  "spread", "rapid", "repair", "wingman", "dual", "energy_cell", "overcharge",
  "phase_shield", "magnet", "piercing", "ion_burst", "stabilizer", "score_surge"
];

test("all gameplay powerups have optimized artwork and collision metadata", () => {
  for (const type of powerupTypes) {
    const key = context.powerupSpriteKey(type);
    const meta = context.SPRITE_MANIFEST[key];
    assert.ok(meta, `${type} is missing manifest metadata`);
    assert.ok(meta.source, `${type} is missing artwork`);
    assert.equal(fs.existsSync(path.join(repoRoot, meta.source)), true, `${type} asset does not exist`);
    assert.ok(meta.collision[0].radius >= 16, `${type} pickup radius should remain forgiving`);
    assert.ok(meta.render.width <= 28 && meta.render.height <= 28, `${type} should render smaller than a fighter`);
  }
});

test("powerup artwork spins without the old dotted orbit ring", () => {
  const renderSource = fs.readFileSync(path.join(repoRoot, "src/15-rendering-entities.js"), "utf8");
  const powerupRenderer = renderSource.slice(renderSource.indexOf("function drawPowerups"), renderSource.indexOf("function drawParticles"));
  assert.match(powerupRenderer, /rotation:\s*spin/);
  assert.doesNotMatch(powerupRenderer, /setLineDash|arc\(0, 0, p\.size \+ 7/);
});

test("unknown powerups retain the generic resilient fallback", () => {
  assert.equal(context.powerupSpriteKey("unknown"), "powerup");
});
