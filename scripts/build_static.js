const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const out = path.join(root, "dist");
const files = ["index.html", "styles.css", "site.webmanifest"];
const directories = ["assets", "src"];

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

for (const file of files) fs.copyFileSync(path.join(root, file), path.join(out, file));
for (const directory of directories) {
  fs.cpSync(path.join(root, directory), path.join(out, directory), {
    recursive: true,
    filter(source) {
      const name = path.basename(source).toLowerCase();
      return name !== "firebase-config.local.js" && name !== "firebase-config.local.json" && !name.endsWith(".map") && !name.endsWith(".md");
    }
  });
}

const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const releaseConfig = JSON.parse(fs.readFileSync(path.join(root, "shared", "release-integrity.json"), "utf8"));
const commitSha = String(process.env.RELEASE_COMMIT_SHA || execFileSync(
  "git",
  ["rev-parse", "HEAD"],
  { cwd: root, encoding: "utf8" }
)).trim();
if (!/^[0-9a-f]{40}$/i.test(commitSha)) throw new Error(`Invalid release commit SHA: ${commitSha}`);
const versionTag = commitSha.slice(0, 12);
const withVersion = (url) => {
  const value = String(url || "");
  if (!value || /^(?:[a-z]+:|#|data:)/i.test(value) || value.includes("?v=")) return value;
  return `${value}${value.includes("?") ? "&" : "?"}v=${versionTag}`;
};

const htmlPath = path.join(out, "index.html");
let html = fs.readFileSync(htmlPath, "utf8");
html = html.replace(/\b(src|href)="((?:src\/|assets\/|styles\.css|site\.webmanifest)[^"]*)"/g, (_, attribute, url) => (
  `${attribute}="${withVersion(url)}"`
));
fs.writeFileSync(htmlPath, html, "utf8");

for (const entry of fs.readdirSync(path.join(out, "src"))) {
  if (!entry.endsWith(".js")) continue;
  const filePath = path.join(out, "src", entry);
  let content = fs.readFileSync(filePath, "utf8").replace(
    /(["'`])(assets\/[A-Za-z0-9_./-]+\.(?:png|webp|jpg|jpeg|mp3|svg))\1/g,
    (_, quote, url) => `${quote}${withVersion(url)}${quote}`
  );
  content = content.replace(
    /\/\* DEVELOPMENT_QA_START \*\/[\s\S]*?\/\* DEVELOPMENT_QA_END \*\//g,
    ""
  );
  content = content.replace(/^.*\/\* DEVELOPMENT_QA_CALL \*\/.*(?:\r?\n|$)/gm, "");
  fs.writeFileSync(filePath, content, "utf8");
}

const cssPath = path.join(out, "styles.css");
const css = fs.readFileSync(cssPath, "utf8").replace(
  /url\((["']?)(assets\/[^)"']+)\1\)/g,
  (_, quote, url) => `url(${quote}${withVersion(url)}${quote})`
);
fs.writeFileSync(cssPath, css, "utf8");

const manifestPath = path.join(out, "site.webmanifest");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
if (Array.isArray(manifest.icons)) {
  manifest.icons = manifest.icons.map((icon) => ({ ...icon, src: withVersion(icon.src) }));
}
fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

fs.writeFileSync(path.join(out, "version.json"), `${JSON.stringify({
  commitSha,
  buildTimestamp: new Date().toISOString(),
  packageVersion: packageJson.version,
  progressionMode: releaseConfig.progressionAuthority,
  competitionMode: String(releaseConfig.competitionMode || "paused")
}, null, 2)}\n`, "utf8");

const forbidden = ["tests", "source-art", "functions", "docs", ".git", "gdd", "readme.md"];
for (const entry of forbidden) {
  if (fs.existsSync(path.join(out, entry))) throw new Error(`Private build entry leaked into dist: ${entry}`);
}

const countFiles = (directory) => fs.readdirSync(directory, { withFileTypes: true }).reduce(
  (count, entry) => count + (entry.isDirectory() ? countFiles(path.join(directory, entry.name)) : 1),
  0
);
console.log(`Built ${countFiles(out)} public files in ${path.relative(root, out)}`);
