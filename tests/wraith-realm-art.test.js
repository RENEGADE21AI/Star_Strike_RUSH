const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const zlib = require("node:zlib");
const { test } = require("node:test");

const repoRoot = path.resolve(__dirname, "..");

function paeth(left, up, upLeft) {
  const estimate = left + up - upLeft;
  const leftDistance = Math.abs(estimate - left);
  const upDistance = Math.abs(estimate - up);
  const diagonalDistance = Math.abs(estimate - upLeft);
  if (leftDistance <= upDistance && leftDistance <= diagonalDistance) return left;
  return upDistance <= diagonalDistance ? up : upLeft;
}

function decodeRgbaPng(filePath) {
  const png = fs.readFileSync(filePath);
  assert.deepEqual(Array.from(png.subarray(0, 8)), [137, 80, 78, 71, 13, 10, 26, 10]);
  let offset = 8;
  let width = 0;
  let height = 0;
  const compressed = [];
  while (offset < png.length) {
    const length = png.readUInt32BE(offset);
    const type = png.toString("ascii", offset + 4, offset + 8);
    const data = png.subarray(offset + 8, offset + 8 + length);
    offset += 12 + length;
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      assert.equal(data[8], 8, "realm art must remain 8-bit");
      assert.equal(data[9], 6, "realm art must remain RGBA");
      assert.equal(data[12], 0, "realm art must remain non-interlaced");
    } else if (type === "IDAT") compressed.push(data);
    else if (type === "IEND") break;
  }
  const inflated = zlib.inflateSync(Buffer.concat(compressed));
  const bytesPerPixel = 4;
  const stride = width * bytesPerPixel;
  const rgba = Buffer.alloc(stride * height);
  let sourceOffset = 0;
  let previous = Buffer.alloc(stride);
  for (let y = 0; y < height; y++) {
    const filter = inflated[sourceOffset++];
    const row = Buffer.alloc(stride);
    for (let x = 0; x < stride; x++) {
      const value = inflated[sourceOffset++];
      const left = x >= bytesPerPixel ? row[x - bytesPerPixel] : 0;
      const up = previous[x];
      const upLeft = x >= bytesPerPixel ? previous[x - bytesPerPixel] : 0;
      const predictor = filter === 0 ? 0
        : filter === 1 ? left
          : filter === 2 ? up
            : filter === 3 ? Math.floor((left + up) / 2)
              : filter === 4 ? paeth(left, up, upLeft)
                : (() => { throw new Error(`Unsupported PNG filter ${filter}`); })();
      row[x] = (value + predictor) & 255;
    }
    row.copy(rgba, y * stride);
    previous = row;
  }
  const alpha = Buffer.alloc(width * height);
  for (let index = 0; index < width * height; index++) alpha[index] = rgba[index * 4 + 3];
  return { width, height, rgba, alpha };
}

test("Wraith realm variants preserve the canonical silhouette and weapon geometry byte-for-byte", () => {
  const spriteDir = path.join(repoRoot, "assets", "sprites");
  const manifest = JSON.parse(fs.readFileSync(path.join(spriteDir, "boss-wraith-realms.json"), "utf8"));
  const canonical = decodeRgbaPng(path.join(spriteDir, manifest.source));
  const physical = decodeRgbaPng(path.join(spriteDir, manifest.physical));
  const ghost = decodeRgbaPng(path.join(spriteDir, manifest.ghost));
  assert.equal(canonical.width, 640);
  assert.equal(canonical.height, 282);
  assert.equal(physical.width, canonical.width);
  assert.equal(physical.height, canonical.height);
  assert.equal(ghost.width, canonical.width);
  assert.equal(ghost.height, canonical.height);
  assert.deepEqual(physical.alpha, canonical.alpha);
  assert.deepEqual(ghost.alpha, canonical.alpha);
  const alphaSha = crypto.createHash("sha256").update(canonical.alpha).digest("hex");
  assert.equal(alphaSha, manifest.alphaSha256);
  assert.equal(manifest.geometryContract, "identical_dimensions_and_alpha_mask");
});

test("base boss runtime renders registered boss art and keeps procedures as load-failure fallbacks", () => {
  const manifest = fs.readFileSync(path.join(repoRoot, "src", "00-asset-manifest.js"), "utf8");
  const renderer = fs.readFileSync(path.join(repoRoot, "src", "15-rendering-entities.js"), "utf8");
  assert.match(manifest, /boss_wraith_physical/);
  assert.match(manifest, /boss_wraith_ghost/);
  assert.match(renderer, /drawSpriteAsset\(ctx,\s*"boss_standard"/);
  assert.match(renderer, /b\.realm === 1 \? "boss_wraith_ghost" : "boss_wraith_physical"/);
  assert.match(renderer, /if \(!drewBossArt\) drawBossStandardShip/);
  assert.match(renderer, /if \(!drewRealmArt\) drawBossWraithShip/);
});
