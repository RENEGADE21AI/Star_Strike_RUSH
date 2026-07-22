const SPRITE_MANIFEST = Object.freeze({
  player: {
    source: "assets/sprites/player.png",
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
  red: { source: "assets/sprites/enemy-red.png", render: { width: 36, height: 32, anchorX: 0.5, anchorY: 0.5 }, collision: [{ offsetX: 0, offsetY: 1, radius: 10 }] },
  orange: { source: "assets/sprites/enemy-orange.png", render: { width: 33, height: 29, anchorX: 0.5, anchorY: 0.5 }, collision: [{ offsetX: 0, offsetY: 1, radius: 8.5 }] },
  purple: { source: "assets/sprites/enemy-purple.png", render: { width: 43, height: 38, anchorX: 0.5, anchorY: 0.5 }, collision: [{ offsetX: 0, offsetY: 1, radius: 14 }] },
  phantom: { source: "assets/sprites/enemy-phantom.png", render: { width: 37, height: 39, anchorX: 0.5, anchorY: 0.5 }, collision: [{ offsetX: 0, offsetY: 0, radius: 11.5 }] },
  splitter: { source: "assets/sprites/enemy-splitter.png", render: { width: 36, height: 37, anchorX: 0.5, anchorY: 0.5 }, collision: [{ offsetX: 0, offsetY: 0, radius: 12 }] },
  splitter_shard: { source: "assets/sprites/enemy-splitter-shard.png", render: { width: 15, height: 20, anchorX: 0.5, anchorY: 0.5 }, collision: [{ offsetX: 0, offsetY: 1, radius: 6 }] },
  carrier: { source: "assets/sprites/enemy-carrier.png", render: { width: 58, height: 55, anchorX: 0.5, anchorY: 0.5 }, collision: [{ offsetX: 0, offsetY: 1, radius: 18 }, { offsetX: -17, offsetY: 4, radius: 9 }, { offsetX: 17, offsetY: 4, radius: 9 }] },
  siphon: { source: "assets/sprites/enemy-siphon.png", render: { width: 27, height: 40, anchorX: 0.5, anchorY: 0.5 }, collision: [{ offsetX: 0, offsetY: 0, radius: 11 }] , projectileOrigin: { offsetX: 0, offsetY: 11 } },
  leech: { source: "assets/sprites/enemy-leech.png", render: { width: 43, height: 39, anchorX: 0.5, anchorY: 0.5 }, collision: [{ offsetX: 0, offsetY: 0, radius: 13 }] },
  minecaster: { source: "assets/sprites/enemy-minecaster.png", render: { width: 36, height: 32, anchorX: 0.5, anchorY: 0.5 }, collision: [{ offsetX: 0, offsetY: 0, radius: 12 }] },
  shieldbearer: { source: "assets/sprites/enemy-shieldbearer.png", render: { width: 42, height: 39, anchorX: 0.5, anchorY: 0.5 }, collision: [{ offsetX: 0, offsetY: 0, radius: 13 }] },
  railgunner: { source: "assets/sprites/enemy-railgunner.png", render: { width: 30, height: 42, anchorX: 0.5, anchorY: 0.5 }, collision: [{ offsetX: 0, offsetY: 2, radius: 11 }] , projectileOrigin: { offsetX: 0, offsetY: 14 } },
  repair_drone: { source: "assets/sprites/enemy-repair-drone.png", render: { width: 29, height: 29, anchorX: 0.5, anchorY: 0.5 }, collision: [{ offsetX: 0, offsetY: 0, radius: 9 }] },
  boss_standard: {
    source: "assets/sprites/boss-standard.png",
    render: { width: 154, height: 69, anchorX: 0.5, anchorY: 0.5, glow: "#ff3d55" },
    collision: [{ offsetX: 0, offsetY: 0, radius: 27 }, { offsetX: -34, offsetY: 1, radius: 16 }, { offsetX: 34, offsetY: 1, radius: 16 }, { offsetX: 0, offsetY: 15, radius: 17 }],
    healthBarOffset: { offsetY: -62 }
  },
  boss_wraith: {
    source: "assets/sprites/boss-wraith.png",
    render: { width: 158, height: 70, anchorX: 0.5, anchorY: 0.5, glow: "#5cf6ff" },
    collision: [{ offsetX: 0, offsetY: 0, radius: 27 }, { offsetX: -36, offsetY: 2, radius: 16 }, { offsetX: 36, offsetY: 2, radius: 16 }, { offsetX: 0, offsetY: -18, radius: 14 }],
    healthBarOffset: { offsetY: -64 }
  },
  boss_debris_warden: { source: "assets/sprites/boss-debris-warden.png", render: { width: 158, height: 96, anchorX: 0.5, anchorY: 0.5, glow: "#f2a33b" }, collision: [{ offsetX: 0, offsetY: 0, radius: 28 }, { offsetX: -45, offsetY: 3, radius: 19 }, { offsetX: 45, offsetY: 3, radius: 19 }] },
  boss_mothership: { source: "assets/sprites/boss-mothership.png", render: { width: 174, height: 116, anchorX: 0.5, anchorY: 0.5, glow: "#4cf5ff" }, collision: [{ offsetX: 0, offsetY: 0, radius: 30 }, { offsetX: -52, offsetY: 1, radius: 20 }, { offsetX: 52, offsetY: 1, radius: 20 }] },
  boss_siphon_core: { source: "assets/sprites/boss-siphon-core.png", render: { width: 144, height: 91, anchorX: 0.5, anchorY: 0.5, glow: "#61ff72" }, collision: [{ offsetX: 0, offsetY: -2, radius: 33 }, { offsetX: -39, offsetY: -2, radius: 18 }, { offsetX: 39, offsetY: -2, radius: 18 }] },
  boss_hive_breaker: { source: "assets/sprites/boss-hive-breaker.png", render: { width: 148, height: 90, anchorX: 0.5, anchorY: 0.5, glow: "#77ff65" }, collision: [{ offsetX: 0, offsetY: 0, radius: 29 }, { offsetX: -37, offsetY: 3, radius: 18 }, { offsetX: 37, offsetY: 3, radius: 18 }] },
  boss_rail_tyrant: { source: "assets/sprites/boss-rail-tyrant.png", render: { width: 158, height: 86, anchorX: 0.5, anchorY: 0.5, glow: "#ff3046" }, collision: [{ offsetX: 0, offsetY: 0, radius: 29 }, { offsetX: -30, offsetY: 5, radius: 17 }, { offsetX: 30, offsetY: 5, radius: 17 }] },
  boss_gravity_well: { source: "assets/sprites/boss-gravity-well.png", render: { width: 150, height: 81, anchorX: 0.5, anchorY: 0.5, glow: "#a45cff" }, collision: [{ offsetX: 0, offsetY: 0, radius: 32 }, { offsetX: -41, offsetY: 0, radius: 17 }, { offsetX: 41, offsetY: 0, radius: 17 }] },
  small_debris: { source: "assets/sprites/asteroid-rock-3.png", render: { width: 25, height: 25, anchorX: 0.5, anchorY: 0.5 }, collision: [{ offsetX: 0, offsetY: 0, radius: 9.5 }] },
  rock_asteroid: { source: "assets/sprites/asteroid-rock-1.png", render: { width: 40, height: 40, anchorX: 0.5, anchorY: 0.5 }, collision: [{ offsetX: 0, offsetY: 0, radius: 15.5 }] },
  iron_asteroid: { source: "assets/sprites/asteroid-rock-2.png", render: { width: 53, height: 53, anchorX: 0.5, anchorY: 0.5 }, collision: [{ offsetX: 0, offsetY: 0, radius: 20.5 }] },
  boss_wall: { source: "assets/sprites/asteroid-rock-3.png", render: { width: 53, height: 53, anchorX: 0.5, anchorY: 0.5 }, collision: [{ offsetX: 0, offsetY: 0, radius: 20.5 }] },
  comet_shard: { source: null, render: { width: 29, height: 29, anchorX: 0.5, anchorY: 0.5 }, collision: [{ offsetX: 0, offsetY: 0, radius: 11 }] },
  mine: { source: null, render: { width: 27, height: 27, anchorX: 0.5, anchorY: 0.5 }, collision: [{ offsetX: 0, offsetY: 0, radius: 10 }] },
  energy_mine: { source: null, render: { width: 29, height: 29, anchorX: 0.5, anchorY: 0.5 }, collision: [{ offsetX: 0, offsetY: 0, radius: 10.5 }] },
  player_bullet: { source: null, render: { width: 4, height: 12, anchorX: 0.5, anchorY: 0.5 }, collision: [{ offsetX: 0, offsetY: 2, radius: 2.4 }] },
  enemy_bullet: { source: null, render: { width: 7, height: 11, anchorX: 0.5, anchorY: 0.5 }, collision: [{ offsetX: 0, offsetY: 1, radius: 3.4 }] },
  drainShot: { source: null, render: { width: 13, height: 13, anchorX: 0.5, anchorY: 0.5, glow: "#70ff45" }, collision: [{ offsetX: 0, offsetY: 0, radius: 4.3 }] },
  powerup: { source: null, render: { width: 25, height: 25, anchorX: 0.5, anchorY: 0.5 }, collision: [{ offsetX: 0, offsetY: 0, radius: 17 }] },
  ui_trophy: { source: "assets/ui/menu-trophy.png", render: { width: 38, height: 38, anchorX: 0.5, anchorY: 0.5 }, collision: [{ offsetX: 0, offsetY: 0, radius: 1 }] },
  ui_road: { source: "assets/ui/menu-road.png", render: { width: 38, height: 38, anchorX: 0.5, anchorY: 0.5 }, collision: [{ offsetX: 0, offsetY: 0, radius: 1 }] },
  ui_world: { source: "assets/ui/menu-world.png", render: { width: 38, height: 38, anchorX: 0.5, anchorY: 0.5 }, collision: [{ offsetX: 0, offsetY: 0, radius: 1 }] },
  ui_codex: { source: "assets/ui/menu-codex.png", render: { width: 38, height: 38, anchorX: 0.5, anchorY: 0.5 }, collision: [{ offsetX: 0, offsetY: 0, radius: 1 }] }
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

function manifestCollision(keyA, xA, yA, fallbackA, keyB, xB, yB, fallbackB, scaleA = 1, scaleB = 1) {
  const a = collisionCirclesFor(keyA, xA, yA, scaleA, fallbackA);
  const b = collisionCirclesFor(keyB, xB, yB, scaleB, fallbackB);
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
  const drawScale = options.scale == null ? 1 : Math.max(0, Number(options.scale));
  const width = render.width * drawScale;
  const height = render.height * drawScale;
  targetContext.save();
  targetContext.globalAlpha = options.alpha == null ? 1 : options.alpha;
  if (options.filter) targetContext.filter = String(options.filter);
  else if (options.hitFlash > 0) {
    const flash = Math.max(0, Math.min(1, Number(options.hitFlash)));
    targetContext.filter = `brightness(${1 + flash * 1.25}) saturate(${1 - flash * 0.35})`;
  }
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
