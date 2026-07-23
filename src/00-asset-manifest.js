const RAW_SPRITE_MANIFEST = {
  player: {
    source: "assets/sprites/player.png",
    render: { width: 40, height: 48, anchorX: 0.5, anchorY: 0.5, rotationOriginX: 0.5, rotationOriginY: 0.5, glow: "#78f6ff" },
    collision: [{ offsetX: 0, offsetY: 1, radius: 9 }],
    projectileOrigin: { offsetX: 0, offsetY: -18 }
  },
  wingman: {
    source: "assets/sprites/wingman.png",
    render: { width: 27, height: 31, anchorX: 0.5, anchorY: 0.5, glow: "#ff78ef" },
    collision: [{ offsetX: 0, offsetY: 1, radius: 8.5 }],
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
  powerup_spread: { source: "assets/powerups/spread.png", render: { width: 28, height: 28, anchorX: 0.5, anchorY: 0.5, glow: "#64ff56" }, collision: [{ offsetX: 0, offsetY: 0, radius: 18 }] },
  powerup_rapid: { source: "assets/powerups/rapid.png", render: { width: 28, height: 28, anchorX: 0.5, anchorY: 0.5, glow: "#ffd64a" }, collision: [{ offsetX: 0, offsetY: 0, radius: 18 }] },
  powerup_repair: { source: "assets/powerups/repair.png", render: { width: 28, height: 28, anchorX: 0.5, anchorY: 0.5, glow: "#4f8fff" }, collision: [{ offsetX: 0, offsetY: 0, radius: 18 }] },
  powerup_wingman: { source: "assets/powerups/wingman.png", render: { width: 28, height: 28, anchorX: 0.5, anchorY: 0.5, glow: "#ff52e8" }, collision: [{ offsetX: 0, offsetY: 0, radius: 18 }] },
  powerup_dual: { source: "assets/powerups/dual.png", render: { width: 28, height: 28, anchorX: 0.5, anchorY: 0.5, glow: "#ff52e8" }, collision: [{ offsetX: 0, offsetY: 0, radius: 18 }] },
  powerup_energy_cell: { source: "assets/powerups/energy-cell.png", render: { width: 28, height: 28, anchorX: 0.5, anchorY: 0.5, glow: "#4bdcff" }, collision: [{ offsetX: 0, offsetY: 0, radius: 18 }] },
  powerup_overcharge: { source: "assets/powerups/overcharge.png", render: { width: 28, height: 28, anchorX: 0.5, anchorY: 0.5, glow: "#80ff35" }, collision: [{ offsetX: 0, offsetY: 0, radius: 18 }] },
  powerup_phase_shield: { source: "assets/powerups/phase-shield.png", render: { width: 28, height: 28, anchorX: 0.5, anchorY: 0.5, glow: "#78aaff" }, collision: [{ offsetX: 0, offsetY: 0, radius: 18 }] },
  powerup_magnet: { source: "assets/powerups/magnet.png", render: { width: 28, height: 28, anchorX: 0.5, anchorY: 0.5, glow: "#ff4bd8" }, collision: [{ offsetX: 0, offsetY: 0, radius: 18 }] },
  powerup_piercing: { source: "assets/powerups/piercing.png", render: { width: 28, height: 28, anchorX: 0.5, anchorY: 0.5, glow: "#8dc8ff" }, collision: [{ offsetX: 0, offsetY: 0, radius: 18 }] },
  powerup_ion_burst: { source: "assets/powerups/ion-burst.png", render: { width: 28, height: 28, anchorX: 0.5, anchorY: 0.5, glow: "#34caff" }, collision: [{ offsetX: 0, offsetY: 0, radius: 18 }] },
  powerup_stabilizer: { source: "assets/powerups/stabilizer.png", render: { width: 28, height: 28, anchorX: 0.5, anchorY: 0.5, glow: "#54f4d2" }, collision: [{ offsetX: 0, offsetY: 0, radius: 18 }] },
  powerup_score_surge: { source: "assets/powerups/score-surge.png", render: { width: 28, height: 28, anchorX: 0.5, anchorY: 0.5, glow: "#ffd325" }, collision: [{ offsetX: 0, offsetY: 0, radius: 18 }] },
  ui_trophy: { source: "assets/ui/menu-trophy.png", render: { width: 38, height: 38, anchorX: 0.5, anchorY: 0.5 }, collision: [{ offsetX: 0, offsetY: 0, radius: 1 }] },
  ui_road: { source: "assets/ui/menu-road.png", render: { width: 38, height: 38, anchorX: 0.5, anchorY: 0.5 }, collision: [{ offsetX: 0, offsetY: 0, radius: 1 }] },
  ui_world: { source: "assets/ui/menu-world.png", render: { width: 38, height: 38, anchorX: 0.5, anchorY: 0.5 }, collision: [{ offsetX: 0, offsetY: 0, radius: 1 }] },
  ui_codex: { source: "assets/ui/menu-codex.png", render: { width: 38, height: 38, anchorX: 0.5, anchorY: 0.5 }, collision: [{ offsetX: 0, offsetY: 0, radius: 1 }] }
};

const FRIENDLY_SPRITES = new Set(["player", "wingman"]);
const HOSTILE_SPRITES = new Set([
  "red", "orange", "purple", "phantom", "splitter", "splitter_shard", "carrier", "siphon",
  "leech", "minecaster", "shieldbearer", "railgunner", "repair_drone", "boss_standard",
  "boss_wraith", "boss_debris_warden", "boss_mothership", "boss_siphon_core", "boss_hive_breaker",
  "boss_rail_tyrant", "boss_gravity_well"
]);
const SHIP_SPRITES = new Set([...FRIENDLY_SPRITES, ...HOSTILE_SPRITES]);

function normalizeSpriteEntry(key, entry) {
  const render = { ...entry.render };
  const friendly = FRIENDLY_SPRITES.has(key);
  const hostile = HOSTILE_SPRITES.has(key);
  const ship = SHIP_SPRITES.has(key);
  const direction = friendly ? -1 : hostile ? 1 : 0;
  const orientationInput = entry.orientation || {};
  const orientation = Object.freeze({
    baseRotation: Number.isFinite(Number(orientationInput.baseRotation))
      ? Number(orientationInput.baseRotation)
      : (hostile ? Math.PI : 0),
    flipX: orientationInput.flipX === true,
    flipY: orientationInput.flipY === true,
    artworkForwardX: Number.isFinite(Number(orientationInput.artworkForwardX))
      ? Number(orientationInput.artworkForwardX)
      : 0,
    artworkForwardY: Number.isFinite(Number(orientationInput.artworkForwardY))
      ? Number(orientationInput.artworkForwardY)
      : (ship ? -1 : 0),
    forwardX: Number.isFinite(Number(orientationInput.forwardX)) ? Number(orientationInput.forwardX) : 0,
    forwardY: Number.isFinite(Number(orientationInput.forwardY)) ? Number(orientationInput.forwardY) : direction,
    codexRotation: Number.isFinite(Number(orientationInput.codexRotation))
      ? Number(orientationInput.codexRotation)
      : (hostile ? -Math.PI : 0),
    titleRotation: Number.isFinite(Number(orientationInput.titleRotation))
      ? Number(orientationInput.titleRotation)
      : (hostile ? -Math.PI : 0)
  });
  const projectileOrigin = entry.projectileOrigin || {
    offsetX: 0,
    offsetY: direction * Math.round(render.height * 0.36)
  };
  const exhaustOrigin = entry.exhaustOrigin || {
    offsetX: 0,
    offsetY: -direction * Math.round(render.height * 0.34)
  };
  return Object.freeze({ ...entry, render: Object.freeze(render), orientation, projectileOrigin: Object.freeze(projectileOrigin), exhaustOrigin: Object.freeze(exhaustOrigin) });
}

const SPRITE_MANIFEST = Object.freeze(Object.fromEntries(
  Object.entries(RAW_SPRITE_MANIFEST).map(([key, entry]) => [key, normalizeSpriteEntry(key, entry)])
));

const spriteAssetRuntime = {
  ready: false,
  status: "idle",
  total: 0,
  completed: 0,
  images: new Map(),
  failed: new Set()
};

function spriteMeta(key) {
  return SPRITE_MANIFEST[key] || null;
}

function normalizeCollisionBody(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new TypeError("Collision body must be an object with key, x, and y");
  }
  const x = Number(body.x);
  const y = Number(body.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    throw new TypeError("Collision body x and y must be finite numbers");
  }
  return {
    key: typeof body.key === "string" ? body.key : "",
    x,
    y,
    scale: Number.isFinite(Number(body.scale)) ? Math.max(0, Number(body.scale)) : 1,
    fallbackRadius: Number.isFinite(Number(body.fallbackRadius)) ? Math.max(0, Number(body.fallbackRadius)) : 0
  };
}

function powerupSpriteKey(type) {
  const key = `powerup_${String(type || "").toLowerCase()}`;
  return SPRITE_MANIFEST[key] ? key : "powerup";
}

function collisionCirclesFor(body) {
  const normalized = normalizeCollisionBody(body);
  const meta = spriteMeta(normalized.key);
  const circles = meta && Array.isArray(meta.collision) && meta.collision.length
    ? meta.collision
    : [{ offsetX: 0, offsetY: 0, radius: normalized.fallbackRadius }];
  return circles.map((circle) => ({
    x: normalized.x + Number(circle.offsetX || 0) * normalized.scale,
    y: normalized.y + Number(circle.offsetY || 0) * normalized.scale,
    r: Math.max(0, Number(circle.radius || normalized.fallbackRadius || 0) * normalized.scale)
  }));
}

function collisionCircleFor(body) {
  return collisionCirclesFor(body)[0];
}

function hitCirclesOverlap(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y) < a.r + b.r;
}

function manifestCollision(leftBody, rightBody) {
  const a = collisionCirclesFor(leftBody);
  const b = collisionCirclesFor(rightBody);
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

function assetLoadSnapshot() {
  return {
    ready: spriteAssetRuntime.ready,
    status: spriteAssetRuntime.status,
    total: spriteAssetRuntime.total,
    completed: spriteAssetRuntime.completed,
    failed: Array.from(spriteAssetRuntime.failed)
  };
}

function loadSpriteAttempt(key, meta, ImageCtor, timeoutMs) {
  return new Promise((resolve) => {
    const image = new ImageCtor();
    image.decoding = "async";
    let settled = false;
    const finish = (ok) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      image.onload = null;
      image.onerror = null;
      if (ok) spriteAssetRuntime.images.set(key, image);
      resolve(ok);
    };
    const timer = setTimeout(() => finish(false), Math.max(1, timeoutMs));
    image.onload = () => finish(true);
    image.onerror = () => finish(false);
    image.src = meta.source;
  });
}

async function preloadGameAssets(options = {}) {
  const ImageCtor = options.ImageCtor || Image;
  const timeoutMs = Math.max(1, Number(options.timeoutMs) || 6500);
  const retries = Math.max(0, Math.floor(Number(options.retries == null ? 1 : options.retries)));
  const onProgress = typeof options.onProgress === "function" ? options.onProgress : () => {};
  const onlyKeys = options.onlyKeys ? new Set(options.onlyKeys) : null;
  const entries = Object.entries(SPRITE_MANIFEST).filter(([key, meta]) => meta.source && (!onlyKeys || onlyKeys.has(key)));
  spriteAssetRuntime.ready = false;
  spriteAssetRuntime.status = "loading";
  spriteAssetRuntime.total = entries.length;
  spriteAssetRuntime.completed = 0;
  onProgress(assetLoadSnapshot());
  await Promise.all(entries.map(async ([key, meta]) => {
    let loaded = false;
    for (let attempt = 0; attempt <= retries && !loaded; attempt++) {
      loaded = await loadSpriteAttempt(key, meta, ImageCtor, timeoutMs);
    }
    if (loaded) spriteAssetRuntime.failed.delete(key);
    else spriteAssetRuntime.failed.add(key);
    spriteAssetRuntime.completed++;
    onProgress(assetLoadSnapshot());
  }));
  spriteAssetRuntime.ready = true;
  spriteAssetRuntime.status = spriteAssetRuntime.failed.size ? "fallback" : "ready";
  const result = assetLoadSnapshot();
  onProgress(result);
  return result;
}

async function retryFailedAssets(options = {}) {
  return preloadGameAssets({ ...options, onlyKeys: Array.from(spriteAssetRuntime.failed) });
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
  const orientation = meta.orientation;
  const contextRotation = options.orientationContext === "codex"
    ? orientation.codexRotation
    : options.orientationContext === "title" ? orientation.titleRotation : 0;
  targetContext.translate(x, y);
  targetContext.rotate(orientation.baseRotation + contextRotation + Number(options.rotation || 0));
  targetContext.scale(orientation.flipX ? -1 : 1, orientation.flipY ? -1 : 1);
  targetContext.drawImage(image, -width * render.anchorX, -height * render.anchorY, width, height);
  targetContext.restore();
  return true;
}

globalThis.SPRITE_MANIFEST = SPRITE_MANIFEST;
globalThis.spriteMeta = spriteMeta;
globalThis.powerupSpriteKey = powerupSpriteKey;
globalThis.normalizeCollisionBody = normalizeCollisionBody;
globalThis.collisionCircleFor = collisionCircleFor;
globalThis.collisionCirclesFor = collisionCirclesFor;
globalThis.hitCirclesOverlap = hitCirclesOverlap;
globalThis.manifestCollision = manifestCollision;
globalThis.validateSpriteManifest = validateSpriteManifest;
globalThis.preloadGameAssets = preloadGameAssets;
globalThis.retryFailedAssets = retryFailedAssets;
globalThis.getAssetLoadState = assetLoadSnapshot;
globalThis.drawSpriteAsset = drawSpriteAsset;
