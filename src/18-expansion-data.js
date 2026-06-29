const EXPANSION_ENEMY_TYPES = [
  "splitter",
  "splitter_shard",
  "carrier",
  "siphon",
  "leech",
  "minecaster",
  "shieldbearer",
  "railgunner",
  "repair_drone"
];

const EXPANSION_BOSS_MODES = [
  "debris_warden",
  "mothership",
  "siphon_core",
  "hive_breaker",
  "rail_tyrant",
  "gravity_well"
];

const CODEX_ORDER = [
  "red",
  "orange",
  "purple",
  "phantom",
  "splitter",
  "carrier",
  "siphon",
  "leech",
  "minecaster",
  "shieldbearer",
  "railgunner",
  "repair_drone",
  "boss_standard",
  "boss_wraith",
  "boss_debris_warden",
  "boss_mothership",
  "boss_siphon_core",
  "boss_hive_breaker",
  "boss_rail_tyrant",
  "boss_gravity_well"
];

const CODEX_META = {
  red: { name: "RED SCOUT", shortName: "RED", color: "#e44", trait: "Drifts and swarms", speed: 2, aggression: 2, fire: 1 },
  orange: { name: "ORANGE INTERCEPTOR", shortName: "ORANGE", color: "#f93", trait: "Fast, erratic movement", speed: 4, aggression: 2, fire: 1 },
  purple: { name: "PURPLE HEAVY", shortName: "PURPLE", color: "#b4f", trait: "Slow charged aimed shots", speed: 1, aggression: 3, fire: 3 },
  phantom: { name: "CYAN PHANTOM", shortName: "PHANTOM", color: "#0ff", trait: "Phase-shifts between realms", speed: 2, aggression: 3, fire: 2 },
  splitter: { name: "SPLITTER", shortName: "SPLIT", color: "#baff36", trait: "Breaks into diagonal shards", speed: 2, aggression: 3, fire: 0 },
  carrier: { name: "CARRIER", shortName: "CARRIER", color: "#d49a3a", trait: "Launches smaller enemies", speed: 1, aggression: 4, fire: 1 },
  siphon: { name: "SIPHON", shortName: "SIPHON", color: "#70ff45", trait: "Fires energy-drain shots", speed: 2, aggression: 3, fire: 3 },
  leech: { name: "LEECH", shortName: "LEECH", color: "#1cff78", trait: "Locks on with an energy tether", speed: 2, aggression: 4, fire: 1 },
  minecaster: { name: "MINECASTER", shortName: "MINE", color: "#ff6a2d", trait: "Drops arming mines", speed: 1, aggression: 3, fire: 1 },
  shieldbearer: { name: "SHIELDBEARER", shortName: "SHIELD", color: "#ffe45c", trait: "Protects nearby enemies", speed: 1, aggression: 2, fire: 0 },
  railgunner: { name: "RAILGUNNER", shortName: "RAIL", color: "#ff3046", trait: "Telegraphs narrow beams", speed: 1, aggression: 4, fire: 4 },
  repair_drone: { name: "REPAIR DRONE", shortName: "REPAIR", color: "#9fffc0", trait: "Repairs damaged enemies", speed: 2, aggression: 1, fire: 0 },
  boss_standard: { name: "COMMAND SHIP", shortName: "CMD SHIP", color: "#6ff", trait: "Heavy weapons platform", speed: 1, aggression: 4, fire: 4, hp: 100, threat: 4.5 },
  boss_wraith: { name: "WRAITH SOVEREIGN", shortName: "WRAITH", color: "#d9b6ff", trait: "Controls reality itself", speed: 2, aggression: 5, fire: 5, hp: 130, threat: 5.5 },
  boss_debris_warden: { name: "DEBRIS WARDEN", shortName: "WARDEN", color: "#a47b52", trait: "Summons asteroid gates", speed: 1, aggression: 5, fire: 2, hp: 150, threat: 5.6 },
  boss_mothership: { name: "MOTHERSHIP", shortName: "MOTHER", color: "#d6a246", trait: "Launches and repairs escorts", speed: 1, aggression: 5, fire: 2, hp: 160, threat: 5.8 },
  boss_siphon_core: { name: "SIPHON CORE", shortName: "CORE", color: "#61ff72", trait: "Attacks your energy economy", speed: 1, aggression: 5, fire: 4, hp: 165, threat: 6.0 },
  boss_hive_breaker: { name: "HIVE BREAKER", shortName: "HIVE", color: "#c9f246", trait: "Breaks into dangerous fragments", speed: 2, aggression: 5, fire: 3, hp: 170, threat: 6.1 },
  boss_rail_tyrant: { name: "RAIL TYRANT", shortName: "TYRANT", color: "#ff3046", trait: "Paints fair laser lanes", speed: 1, aggression: 5, fire: 5, hp: 175, threat: 6.3 },
  boss_gravity_well: { name: "GRAVITY WELL", shortName: "GRAVITY", color: "#a45cff", trait: "Bends movement with pull zones", speed: 1, aggression: 5, fire: 4, hp: 180, threat: 6.4 }
};

function isExpansionEnemyType(type) {
  return EXPANSION_ENEMY_TYPES.includes(type);
}

function isExpansionBossMode(mode) {
  return EXPANSION_BOSS_MODES.includes(mode);
}

function bossCodexType(mode) {
  if (mode === "standard") return "boss_standard";
  if (mode === "wraith") return "boss_wraith";
  return "boss_" + mode;
}

function getCodexTypes() {
  return CODEX_ORDER.slice();
}

function getCodexMeta(type) {
  const meta = CODEX_META[type] || {};
  const enemyType = type && type.startsWith("boss_") ? null : type;
  const enemy = enemyType ? ENEMY_DATA[enemyType] : null;
  return {
    name: meta.name || String(type || "").replace(/_/g, " ").toUpperCase(),
    shortName: meta.shortName || String(type || "").replace(/_/g, " ").toUpperCase().slice(0, 8),
    color: meta.color || "#fff",
    trait: meta.trait || "",
    speed: meta.speed || 2,
    aggression: meta.aggression || 2,
    fire: meta.fire || 1,
    hp: meta.hp || (enemy ? enemy.hp : 1),
    threat: meta.threat || (enemy ? enemy.threat : 1)
  };
}

function activeEnemyTypeCount(type) {
  let n = 0;
  for (const e of state.enemies) if (e.type === type) n++;
  return n;
}

function activeExpansionSupportCount(type) {
  return activeEnemyTypeCount(type) + state.pendingSpawns.filter((s) => s.type === type).length;
}

function canSpawnExpansionEnemy(type, extra = {}) {
  if (!isExpansionEnemyType(type)) return true;
  if (type === "splitter_shard") return true;
  if (extra.forceSpawn || extra.bossSpawn || extra.fromCarrier || extra.fromBoss) return true;
  const minimumPhase = {
    splitter: 3,
    minecaster: 4,
    siphon: 5,
    shieldbearer: 5,
    carrier: 6,
    leech: 6,
    repair_drone: 6,
    railgunner: 7
  }[type] || 1;
  if (state.phase < minimumPhase) return false;
  if (type === "carrier" && activeExpansionSupportCount("carrier") >= 1) return false;
  if (type === "leech" && activeExpansionSupportCount("leech") >= (state.phase >= 11 ? 2 : 1)) return false;
  if (type === "railgunner" && activeExpansionSupportCount("railgunner") >= (state.phase >= 12 ? 2 : 1)) return false;
  if (type === "minecaster" && (activeExpansionSupportCount("minecaster") >= 2 || state.debris.length > 5)) return false;
  if (type === "shieldbearer" && activeExpansionSupportCount("shieldbearer") >= 2) return false;
  if (type === "repair_drone" && activeExpansionSupportCount("repair_drone") >= 2) return false;
  if (type === "splitter" && activeExpansionSupportCount("splitter") >= 3) return false;
  return true;
}

function configureExpansionEnemy(e, type, extra = {}, phaseBoost = 0) {
  if (!isExpansionEnemyType(type)) return e;
  e.motion = type;
  e.entryFrames = extra.bossSpawn ? 0 : (type === "railgunner" ? 8 : 6);
  if (type === "splitter") {
    e.vy = 1.15 + phaseBoost * 0.16;
    e.r = 15;
    e.hp = e.maxHp = 3;
    e.crackSeed = rand(0, TAU);
  } else if (type === "splitter_shard") {
    e.vx = extra.vx != null ? extra.vx : (Math.random() < 0.5 ? -1.7 : 1.7);
    e.vy = extra.vy != null ? extra.vy : 2.75 + state.phase * 0.035;
    e.r = 8;
    e.hp = e.maxHp = 1;
    e.reward = 10;
    e.noPowerup = true;
    e.noCodex = true;
    e.entryFrames = 0;
    e.launchFrames = 0;
  } else if (type === "carrier") {
    e.vy = 0.55 + phaseBoost * 0.05;
    e.r = 23;
    e.hp = e.maxHp = 6;
    e.launchTimer = extra.launchTimer || Math.floor(rand(86, 124));
    e.launchCount = 0;
    e.bayOpen = 0;
  } else if (type === "siphon") {
    e.vy = 1.05 + phaseBoost * 0.12;
    e.r = 14;
    e.hp = e.maxHp = 3;
    e.fireTimer = extra.fireTimer || Math.floor(rand(58, 98));
  } else if (type === "leech") {
    e.vy = 0.70 + phaseBoost * 0.05;
    e.r = 16;
    e.hp = e.maxHp = 4;
    e.lockTimer = extra.lockTimer || 78;
    e.tetherActive = false;
    e.tetherDrainFrame = 0;
  } else if (type === "minecaster") {
    e.vy = 0.82 + phaseBoost * 0.05;
    e.r = 15;
    e.hp = e.maxHp = 3;
    e.mineTimer = extra.mineTimer || Math.floor(rand(70, 110));
    e.minesDropped = 0;
  } else if (type === "shieldbearer") {
    e.vy = 0.75 + phaseBoost * 0.04;
    e.r = 16;
    e.hp = e.maxHp = 4;
    e.shieldPulse = rand(0, TAU);
  } else if (type === "railgunner") {
    e.vy = 0.72 + phaseBoost * 0.04;
    e.r = 15;
    e.hp = e.maxHp = 3;
    e.railCooldown = extra.railCooldown || Math.floor(rand(85, 130));
    e.railWarn = 0;
    e.railAngle = Math.PI / 2;
  } else if (type === "repair_drone") {
    e.vy = 1.05 + phaseBoost * 0.06;
    e.r = 11;
    e.hp = e.maxHp = 2;
    e.repairTimer = 38;
    e.repairTargetId = null;
  }
  return e;
}
