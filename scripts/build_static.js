const fs = require("node:fs");
const path = require("node:path");

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

const forbidden = ["tests", "source-art", "functions", "docs", ".git", "gdd", "readme.md"];
for (const entry of forbidden) {
  if (fs.existsSync(path.join(out, entry))) throw new Error(`Private build entry leaked into dist: ${entry}`);
}

const countFiles = (directory) => fs.readdirSync(directory, { withFileTypes: true }).reduce(
  (count, entry) => count + (entry.isDirectory() ? countFiles(path.join(directory, entry.name)) : 1),
  0
);
console.log(`Built ${countFiles(out)} public files in ${path.relative(root, out)}`);
