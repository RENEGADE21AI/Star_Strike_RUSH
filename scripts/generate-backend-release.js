"use strict";

const fs = require("node:fs");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..");

function parseArguments(argv) {
  const options = {
    sha: "",
    output: path.join(repoRoot, "functions", "release-identity.generated.js")
  };
  for (let index = 0; index < argv.length; index++) {
    if (argv[index] === "--sha") options.sha = String(argv[++index] || "").trim().toLowerCase();
    else if (argv[index] === "--output") options.output = path.resolve(String(argv[++index] || ""));
    else throw new Error(`Unknown argument: ${argv[index]}`);
  }
  if (!/^[0-9a-f]{40}$/.test(options.sha)) throw new Error("Release commit SHA must be a full 40-character SHA.");
  return options;
}

function releaseIdentity(sha) {
  const packageJson = JSON.parse(fs.readFileSync(path.join(repoRoot, "package.json"), "utf8"));
  const integrity = JSON.parse(fs.readFileSync(path.join(repoRoot, "shared", "release-integrity.json"), "utf8"));
  return {
    commitSha: sha,
    packageVersion: String(packageJson.version || ""),
    progressionAuthority: String(integrity.progressionAuthority || ""),
    competitionMode: String(integrity.competitionMode || "paused"),
    competitionWritesEnabled: integrity.serverCompetitionWritesEnabled === true,
    serverProgressionWritesEnabled: integrity.serverProgressionWritesEnabled === true,
    appCheckEnforced: integrity.serverAppCheckEnforced === true
  };
}

function main(argv) {
  const options = parseArguments(argv);
  const identity = releaseIdentity(options.sha);
  const source = [
    '"use strict";',
    "",
    "// Generated at release time from the exact Git commit. Do not edit.",
    `module.exports = Object.freeze(${JSON.stringify(identity, null, 2)});`,
    ""
  ].join("\n");
  fs.mkdirSync(path.dirname(options.output), { recursive: true });
  fs.writeFileSync(options.output, source, "utf8");
  return { ok: true, output: options.output, release: identity };
}

if (require.main === module) {
  try {
    process.stdout.write(`${JSON.stringify(main(process.argv.slice(2)))}\n`);
  } catch (error) {
    process.stderr.write(`${error && error.message ? error.message : error}\n`);
    process.exitCode = 1;
  }
}

module.exports = {
  main,
  parseArguments,
  releaseIdentity
};
