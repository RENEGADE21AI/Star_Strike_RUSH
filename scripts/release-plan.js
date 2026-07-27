"use strict";

const { execFileSync } = require("node:child_process");
const path = require("node:path");

function classifyReleaseChanges(changedPaths) {
  const paths = Array.from(new Set(changedPaths.map((value) => String(value).replaceAll("\\", "/")))).sort();
  const firebaseConfigChanged = paths.includes("firebase.json");
  const functions = firebaseConfigChanged || paths.some((value) => (
    value.startsWith("functions/") ||
    value === "shared/release-integrity.json"
  ));
  const rules = firebaseConfigChanged || paths.includes("firestore.rules");
  const indexes = firebaseConfigChanged || paths.includes("firestore.indexes.json");
  const hosting = firebaseConfigChanged || paths.some((value) => (
    value === "index.html" ||
    value === "styles.css" ||
    value === "site.webmanifest" ||
    value === "package.json" ||
    value === "package-lock.json" ||
    value.startsWith("src/") ||
    value.startsWith("assets/") ||
    value.startsWith("shared/") ||
    value === "scripts/build_static.js"
  ));
  return { functions, rules, indexes, hosting };
}

function git(repo, args) {
  return execFileSync("git", args, { cwd: repo, encoding: "utf8" }).trim();
}

function releasePlan(baselineSha, releaseSha, repo = process.cwd()) {
  if (!/^[0-9a-f]{40}$/i.test(baselineSha)) throw new Error("Baseline commit must be a full 40-character SHA.");
  if (!/^[0-9a-f]{40}$/i.test(releaseSha)) throw new Error("Release commit must be a full 40-character SHA.");
  const resolvedRepo = path.resolve(repo);
  git(resolvedRepo, ["cat-file", "-e", `${baselineSha}^{commit}`]);
  git(resolvedRepo, ["cat-file", "-e", `${releaseSha}^{commit}`]);
  try {
    git(resolvedRepo, ["merge-base", "--is-ancestor", baselineSha, releaseSha]);
  } catch {
    throw new Error(`Baseline ${baselineSha} is not an ancestor of release ${releaseSha}.`);
  }
  const output = git(resolvedRepo, ["diff", "--name-only", `${baselineSha}...${releaseSha}`]);
  const changedPaths = output ? output.split(/\r?\n/).filter(Boolean).sort() : [];
  return {
    schemaVersion: 1,
    baselineSha: baselineSha.toLowerCase(),
    releaseSha: releaseSha.toLowerCase(),
    changedPaths,
    components: classifyReleaseChanges(changedPaths)
  };
}

function parseArguments(argv) {
  const [baselineSha, releaseSha, ...rest] = argv;
  let repo = process.cwd();
  for (let index = 0; index < rest.length; index++) {
    if (rest[index] === "--repo") repo = rest[++index];
    else throw new Error(`Unknown argument: ${rest[index]}`);
  }
  return { baselineSha: String(baselineSha || ""), releaseSha: String(releaseSha || ""), repo };
}

if (require.main === module) {
  try {
    const options = parseArguments(process.argv.slice(2));
    process.stdout.write(`${JSON.stringify(releasePlan(options.baselineSha, options.releaseSha, options.repo))}\n`);
  } catch (error) {
    process.stderr.write(`${error && error.message ? error.message : error}\n`);
    process.exitCode = 1;
  }
}

module.exports = {
  classifyReleaseChanges,
  parseArguments,
  releasePlan
};
