"use strict";

const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..");
const tracked = execFileSync("git", ["ls-files", "-z"], { cwd: repoRoot })
  .toString("utf8")
  .split("\0")
  .filter(Boolean);
const forbiddenNames = new Set([".env", ".env.local", "service-account.json", "firebase-token.txt"]);
const patterns = [
  ["private key", new RegExp(`-----BEGIN ${"PRIVATE"} KEY-----`)],
  ["OpenAI secret key", new RegExp(`\\b${"sk"}-(?:proj-)?[A-Za-z0-9_-]{20,}`)],
  ["GitHub personal token", new RegExp(`\\b${"gh"}[pousr]_[A-Za-z0-9]{30,}`)],
  ["Slack token", new RegExp(`\\b${"xox"}[abprs]-[A-Za-z0-9-]{20,}`)],
  ["Firebase CLI refresh token", new RegExp(`\\b1\\/\\/[A-Za-z0-9_-]{30,}`)]
];
const findings = [];

for (const relative of tracked) {
  const normalized = relative.replaceAll("\\", "/");
  const basename = path.basename(normalized).toLowerCase();
  if (forbiddenNames.has(basename)) findings.push(`${normalized}: tracked secret-bearing filename`);
  const absolute = path.join(repoRoot, relative);
  if (!fs.existsSync(absolute) || fs.statSync(absolute).size > 2_000_000) continue;
  const content = fs.readFileSync(absolute, "utf8");
  for (const [label, pattern] of patterns) {
    if (pattern.test(content)) findings.push(`${normalized}: possible ${label}`);
  }
}

if (findings.length) {
  console.error(findings.join("\n"));
  process.exitCode = 1;
} else {
  console.log(`Secret scan passed across ${tracked.length} tracked files.`);
}
