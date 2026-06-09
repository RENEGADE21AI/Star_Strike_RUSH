import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const currentDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(currentDir, '..');
const inputPath = resolve(repoRoot, 'js/legacyGame.js');
const outputDir = resolve(repoRoot, 'js/game-parts');
const indexPath = resolve(repoRoot, 'index.html');

const partSize = 450;
const source = await readFile(inputPath, 'utf8');
const lines = source.split('\n');

await rm(outputDir, { recursive: true, force: true });
await mkdir(outputDir, { recursive: true });

const partPaths = [];
for (let start = 0, part = 0; start < lines.length; start += partSize, part++) {
  const chunk = lines.slice(start, start + partSize).join('\n').trimEnd() + '\n';
  const filename = `${String(part).padStart(2, '0')}-legacy-game-part.js`;
  const relativePath = `js/game-parts/${filename}`;
  const banner = `// Star Strike RUSH legacy game part ${part + 1}\n// Generated from js/legacyGame.js by scripts/split-legacy-game.mjs.\n\n`;
  await writeFile(resolve(outputDir, filename), banner + chunk, 'utf8');
  partPaths.push(relativePath);
}

const scriptTags = partPaths.map((path) => `  <script src="${path}"></script>`).join('\n');
const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
  <title>Star Strike RUSH</title>
  <link rel="stylesheet" href="css/style.css">
</head>
<body>
  <canvas id="game"></canvas>
  <input
    type="text"
    id="callSignInput"
    class="visually-hidden-input"
    maxlength="12"
    autocomplete="off"
    autocorrect="off"
    autocapitalize="characters"
    spellcheck="false"
  >

${scriptTags}
</body>
</html>
`;

await writeFile(indexPath, indexHtml, 'utf8');
console.log(`Split ${lines.length} lines into ${partPaths.length} game part files.`);
