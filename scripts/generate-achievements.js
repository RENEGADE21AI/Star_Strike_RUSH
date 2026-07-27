const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const sourcePath = path.join(root, "shared", "achievements.json");
const browserPath = path.join(root, "src", "00-achievement-catalog.js");
const serverPath = path.join(root, "functions", "achievement-catalog.js");
const checkOnly = process.argv.includes("--check");
const supportedCriteria = new Set([
  "minScore",
  "minPhase",
  "minBosses",
  "minGhostUses",
  "minPowerups",
  "minKills",
  "minCombo",
  "minRunDurationMs",
  "maxDamageTaken",
  "minLifetimeRuns",
  "minLifetimeScore",
  "minLifetimeKills",
  "minLifetimePowerups",
  "minLifetimeGhostUses",
  "minLifetimeBosses"
]);
const structuralFields = new Set(["id", "name", "description", "category", "tier"]);

function fail(message) {
  throw new Error(`Achievement catalog: ${message}`);
}

function validateCatalog(catalog) {
  if (!catalog || catalog.schemaVersion !== 2 || !Array.isArray(catalog.achievements)) {
    fail("schemaVersion 2 and an achievements array are required");
  }
  const achievements = catalog.achievements;
  if (achievements.length !== 79) fail(`expected exactly 79 entries, found ${achievements.length}`);
  const ids = new Set();
  const names = new Set();
  for (const achievement of achievements) {
    if (!/^[a-z0-9_]+$/.test(achievement.id || "")) fail(`invalid id ${achievement.id}`);
    if (ids.has(achievement.id)) fail(`duplicate id ${achievement.id}`);
    ids.add(achievement.id);
    if (!String(achievement.name || "").trim()) fail(`${achievement.id} has no name`);
    if (!String(achievement.description || "").trim()) fail(`${achievement.id} has no description`);
    const normalizedName = achievement.name.trim().toLowerCase();
    if (names.has(normalizedName)) fail(`duplicate name ${achievement.name}`);
    names.add(normalizedName);
    if (!["strike", "combat", "systems", "career"].includes(achievement.category)) {
      fail(`${achievement.id} has invalid category ${achievement.category}`);
    }
    if (!Number.isInteger(achievement.tier) || achievement.tier < 1 || achievement.tier > 5) {
      fail(`${achievement.id} has invalid tier ${achievement.tier}`);
    }
    const criteria = Object.keys(achievement).filter((key) => !structuralFields.has(key));
    if (!criteria.length) fail(`${achievement.id} has no unlock criterion`);
    for (const key of criteria) {
      if (!supportedCriteria.has(key)) fail(`${achievement.id} uses unsupported criterion ${key}`);
      if (!Number.isFinite(achievement[key]) || achievement[key] < 0) fail(`${achievement.id} has invalid ${key}`);
    }
    if (Object.hasOwn(achievement, "maxDamageTaken") && !achievement.minPhase) {
      fail(`${achievement.id} has maxDamageTaken without a phase target`);
    }
    if (achievement.minCombo && !/kill chain/i.test(achievement.description)) {
      fail(`${achievement.id} describes the kill-chain metric dishonestly`);
    }
    if (/warden/i.test(achievement.name) && achievement.minBosses) {
      fail(`${achievement.id} names a specific boss but measures arbitrary bosses`);
    }
  }
  return achievements;
}

function browserSource(catalog, achievements) {
  return [
    "// Generated from shared/achievements.json by scripts/generate-achievements.js.",
    `globalThis.STAR_STRIKE_ACHIEVEMENT_SCHEMA_VERSION = ${catalog.schemaVersion};`,
    `globalThis.STAR_STRIKE_ACHIEVEMENTS = Object.freeze(${JSON.stringify(achievements, null, 2)}.map((achievement) => Object.freeze(achievement)));`,
    ""
  ].join("\n");
}

function serverSource(catalog, achievements) {
  return [
    "// Generated from shared/achievements.json by scripts/generate-achievements.js.",
    `const ACHIEVEMENT_SCHEMA_VERSION = ${catalog.schemaVersion};`,
    `const ACHIEVEMENTS = Object.freeze(${JSON.stringify(achievements, null, 2)}.map((achievement) => Object.freeze(achievement)));`,
    "",
    "module.exports = { ACHIEVEMENT_SCHEMA_VERSION, ACHIEVEMENTS };",
    ""
  ].join("\n");
}

function verifyOrWrite(targetPath, content) {
  if (checkOnly) {
    const existing = fs.existsSync(targetPath) ? fs.readFileSync(targetPath, "utf8") : "";
    if (existing !== content) fail(`${path.relative(root, targetPath)} is stale; run npm run generate:achievements`);
    return;
  }
  fs.writeFileSync(targetPath, content, "utf8");
}

const catalog = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
const achievements = validateCatalog(catalog);
verifyOrWrite(browserPath, browserSource(catalog, achievements));
verifyOrWrite(serverPath, serverSource(catalog, achievements));
console.log(`${checkOnly ? "Verified" : "Generated"} ${achievements.length} achievements from ${path.relative(root, sourcePath)}`);
