const SPRITE_MANIFEST = Object.freeze({
  player: {
    source: null,
    render: { width: 40, height: 48, anchorX: 0.5, anchorY: 0.5, rotationOriginX: 0.5, rotationOriginY: 0.5, glow: "#78f6ff" },
    collision: [{ offsetX: 0, offsetY: 1, radius: 9 }],
    projectileOrigin: { offsetX: 0, offsetY: -18 }
  },
  wingman: {
    source: null,
    render: { width: 24, height: 30, anchorX: 0.5, anchorY: 0.5, glow: "#ff78ef" },
    collision: [{ offsetX: 0, offsetY: 1, radius: 9 }],
    projectileOrigin: { offsetX: 0, offsetY: -13 }
  },
  red: { source: null, render: { width: 34, height: 32, anchorX: 0.5, anchorY: 0.5 }, collision: [{ offsetX: 0, offsetY: 1, radius: 10 }] },
  orange: { source: null, render: { width: 31, height: 30, anchorX: 0.5, anchorY: 0.5 }, collision: [{ offsetX: 0, offsetY: 1, radius: 8.5 }] },
  purple: { source: null, render: { width: 43, height: 38, anchorX: 0.5, anchorY: 0.5 }, collision: [{ offsetX: 0, offsetY: 1, radius: 14 }] },
  phantom: { source: null, render: { width: 39, height: 38, anchorX: 0.5, anchorY: 0.5 }, collision: [{ offsetX: 0, offsetY: 0, radius: 11.5 }] },
  splitter: { source: null, render: { width: 34, height: 34, anchorX: 0.5, anchorY: 0.5 }, collision: [{ offsetX: 0, offsetY: 0, radius: 12 }] },
  splitter_shard: { source: null, render: { width: 18, height: 20, anchorX: 0.5, anchorY: 0.5 }, collision: [{ offsetX: 0, offsetY: 1, radius: 6 }] },
  carrier: { source: null, render: { width: 56, height: 39, anchorX: 0.5, anchorY: 0.5 }, collision: [{ offsetX: 0, offsetY: 1, radius: 20 }] },
  siphon: { source: null, render: { width: 40, height: 36, anchorX: 0.5, anchorY: 0.5 }, collision: [{ offsetX: 0, offsetY: 0, radius: 11 }] , projectileOrigin: { offsetX: 0, offsetY: 11 } },
  leech: { source: null, render: { width: 39, height: 38, anchorX: 0.5, anchorY: 0.5 }, collision: [{ offsetX: 0, offsetY: 0, radius: 13 }] },
  minecaster: { source: null, render: { width: 34, height: 32, anchorX: 0.5, anchorY: 0.5 }, collision: [{ offsetX: 0, offsetY: 0, radius: 12 }] },
  shieldbearer: { source: null, render: { width: 39, height: 38, anchorX: 0.5, anchorY: 0.5 }, collision: [{ offsetX: 0, offsetY: 0, radius: 13 }] },
  railgunner: { source: null, render: { width: 29, height: 48, anchorX: 0.5, anchorY: 0.5 }, collision: [{ offsetX: 0, offsetY: 2, radius: 11 }] , projectileOrigin: { offsetX: 0, offsetY: 14 } },
  repair_drone: { source: null, render: { width: 28, height: 27, anchorX: 0.5, anchorY: 0.5 }, collision: [{ offsetX: 0, offsetY: 0, radius: 9 }] },
  boss_standard: {
    source: null,
    render: { width: 144, height: 82, anchorX: 0.5, anchorY: 0.5, glow: "#78efff" },
    collision: [{ offsetX: 0, offsetY: 0, radius: 27 }, { offsetX: -34, offsetY: 1, radius: 16 }, { offsetX: 34, offsetY: 1, radius: 16 }, { offsetX: 0, offsetY: 15, radius: 17 }],
    healthBarOffset: { offsetY: -62 }
  },
  boss_wraith: {
    source: null,
    render: { width: 150, height: 86, anchorX: 0.5, anchorY: 0.5, glow: "#d9b6ff" },
    collision: [{ offsetX: 0, offsetY: 0, radius: 27 }, { offsetX: -36, offsetY: 2, radius: 16 }, { offsetX: 36, offsetY: 2, radius: 16 }, { offsetX: 0, offsetY: -18, radius: 14 }],
    healthBarOffset: { offsetY: -64 }
  },
  boss_debris_warden: { source: null, render: { width: 158, height: 86, anchorX: 0.5, anchorY: 0.5, glow: "#b68a60" }, collision: [{ offsetX: 0, offsetY: 0, radius: 28 }, { offsetX: -45, offsetY: 3, radius: 19 }, { offsetX: 45, offsetY: 3, radius: 19 }] },
  boss_mothership: { source: null, render: { width: 174, height: 76, anchorX: 0.5, anchorY: 0.5, glow: "#d6a246" }, collision: [{ offsetX: 0, offsetY: 0, radius: 30 }, { offsetX: -52, offsetY: 1, radius: 20 }, { offsetX: 52, offsetY: 1, radius: 20 }] },
  boss_siphon_core: { source: null, render: { width: 138, height: 86, anchorX: 0.5, anchorY: 0.5, glow: "#61ff72" }, collision: [{ offsetX: 0, offsetY: -2, radius: 33 }, { offsetX: -39, offsetY: -2, radius: 18 }, { offsetX: 39, offsetY: -2, radius: 18 }] },
  boss_hive_breaker: { source: null, render: { width: 142, height: 91, anchorX: 0.5, anchorY: 0.5, glow: "#c9f246" }, collision: [{ offsetX: 0, offsetY: 0, radius: 29 }, { offsetX: -37, offsetY: 3, radius: 18 }, { offsetX: 37, offsetY: 3, radius: 18 }] },
  boss_rail_tyrant: { source: null, render: { width: 126, height: 104, anchorX: 0.5, anchorY: 0.5, glow: "#ff3046" }, collision: [{ offsetX: 0, offsetY: 0, radius: 29 }, { offsetX: -30, offsetY: 5, radius: 17 }, { offsetX: 30, offsetY: 5, radius: 17 }] },
  boss_gravity_well: { source: null, render: { width: 148, height: 86, anchorX: 0.5, anchorY: 0.5, glow: "#a45cff" }, collision: [{ offsetX: 0, offsetY: 0, radius: 32 }, { offsetX: -41, offsetY: 0, radius: 17 }, { offsetX: 41, offsetY: 0, radius: 17 }] },
  small_debris: { source: null, render: { width: 25, height: 25, anchorX: 0.5, anchorY: 0.5 }, collision: [{ offsetX: 0, offsetY: 0, radius: 9.5 }] },
  rock_asteroid: { source: null, render: { width: 40, height: 40, anchorX: 0.5, anchorY: 0.5 }, collision: [{ offsetX: 0, offsetY: 0, radius: 15.5 }] },
  iron_asteroid: { source: null, render: { width: 53, height: 53, anchorX: 0.5, anchorY: 0.5 }, collision: [{ offsetX: 0, offsetY: 0, radius: 20.5 }] },
  boss_wall: { source: null, render: { width: 53, height: 53, anchorX: 0.5, anchorY: 0.5 }, collision: [{ offsetX: 0, offsetY: 0, radius: 20.5 }] },
  comet_shard: { source: null, render: { width: 29, height: 29, anchorX: 0.5, anchorY: 0.5 }, collision: [{ offsetX: 0, offsetY: 0, radius: 11 }] },
  mine: { source: null, render: { width: 27, height: 27, anchorX: 0.5, anchorY: 0.5 }, collision: [{ offsetX: 0, offsetY: 0, radius: 10 }] },
  energy_mine: { source: null, render: { width: 29, height: 29, anchorX: 0.5, anchorY: 0.5 }, collision: [{ offsetX: 0, offsetY: 0, radius: 10.5 }] },
  player_bullet: { source: null, render: { width: 4, height: 12, anchorX: 0.5, anchorY: 0.5 }, collision: [{ offsetX: 0, offsetY: 2, radius: 2.4 }] },
  enemy_bullet: { source: null, render: { width: 7, height: 11, anchorX: 0.5, anchorY: 0.5 }, collision: [{ offsetX: 0, offsetY: 1, radius: 3.4 }] },
  drainShot: { source: null, render: { width: 13, height: 13, anchorX: 0.5, anchorY: 0.5, glow: "#70ff45" }, collision: [{ offsetX: 0, offsetY: 0, radius: 4.3 }] },
  powerup: { source: null, render: { width: 25, height: 25, anchorX: 0.5, anchorY: 0.5 }, collision: [{ offsetX: 0, offsetY: 0, radius: 17 }] }
});

const spriteAssetRuntime = { ready: false, images: new Map(), failed: new Set() };

function spriteMeta(key) {
  return SPRITE_MANIFEST[key] || null;
}

function collisionCirclesFor(key, x, y, scaleValue = 1, fallbackRadius = 0) {
  const meta = spriteMeta(key);
  const circles = meta && Array.isArray(meta.collision) && meta.collision.length
    ? meta.collision
    : [{ offsetX: 0, offsetY: 0, radius: fallbackRadius }];
  return circles.map((circle) => ({
    x: x + Number(circle.offsetX || 0) * scaleValue,
    y: y + Number(circle.offsetY || 0) * scaleValue,
    r: Math.max(0, Number(circle.radius || fallbackRadius || 0) * scaleValue)
  }));
}

function collisionCircleFor(key, x, y, scaleValue = 1, fallbackRadius = 0) {
  return collisionCirclesFor(key, x, y, scaleValue, fallbackRadius)[0];
}

function hitCirclesOverlap(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y) < a.r + b.r;
}

function manifestCollision(keyA, xA, yA, fallbackA, keyB, xB, yB, fallbackB) {
  const a = collisionCirclesFor(keyA, xA, yA, 1, fallbackA);
  const b = collisionCirclesFor(keyB, xB, yB, 1, fallbackB);
  return a.some((left) => b.some((right) => hitCirclesOverlap(left, right)));
}

function validateSpriteManifest(manifest = SPRITE_MANIFEST) {
  const errors = [];
  for (const [key, value] of Object.entries(manifest || {})) {
    if (!value || !value.render) { errors.push(`${key}: missing render metadata`); continue; }
    if (!(value.render.width > 0) || !(value.render.height > 0)) errors.push(`${key}: invalid render size`);
    if (!Array.isArray(value.collision) || !value.collision.length) errors.push(`${key}: missing collision metadata`);
    for (const circle of value.collision || []) if (!(circle.radius > 0)) errors.push(`${key}: invalid collision radius`);
  }
  return { ok: errors.length === 0, errors };
}

async function preloadGameAssets() {
  const entries = Object.entries(SPRITE_MANIFEST).filter(([, meta]) => meta.source);
  await Promise.all(entries.map(([key, meta]) => new Promise((resolve) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => { spriteAssetRuntime.images.set(key, image); resolve(); };
    image.onerror = () => { spriteAssetRuntime.failed.add(key); resolve(); };
    image.src = meta.source;
  })));
  spriteAssetRuntime.ready = true;
  return { ready: true, failed: Array.from(spriteAssetRuntime.failed) };
}

function drawSpriteAsset(targetContext, key, x, y, options = {}) {
  const image = spriteAssetRuntime.images.get(key);
  const meta = spriteMeta(key);
  if (!image || !meta) return false;
  const render = meta.render;
  const drawScale = Number(options.scale || 1);
  const width = render.width * drawScale;
  const height = render.height * drawScale;
  targetContext.save();
  targetContext.globalAlpha = options.alpha == null ? 1 : options.alpha;
  if (render.glow && options.glow !== false) {
    targetContext.shadowColor = render.glow;
    targetContext.shadowBlur = 10 * drawScale;
  }
  targetContext.translate(x, y);
  targetContext.rotate(Number(options.rotation || 0));
  targetContext.drawImage(image, -width * render.anchorX, -height * render.anchorY, width, height);
  targetContext.restore();
  return true;
}

globalThis.SPRITE_MANIFEST = SPRITE_MANIFEST;
globalThis.spriteMeta = spriteMeta;
globalThis.collisionCircleFor = collisionCircleFor;
globalThis.collisionCirclesFor = collisionCirclesFor;
globalThis.hitCirclesOverlap = hitCirclesOverlap;
globalThis.manifestCollision = manifestCollision;
globalThis.validateSpriteManifest = validateSpriteManifest;
globalThis.preloadGameAssets = preloadGameAssets;
globalThis.drawSpriteAsset = drawSpriteAsset;

