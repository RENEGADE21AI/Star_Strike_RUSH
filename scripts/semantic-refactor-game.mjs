import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const currentDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(currentDir, '..');
const inputPath = resolve(repoRoot, 'js/legacyGame.js');
const outputDir = resolve(repoRoot, 'js/game');
const indexPath = resolve(repoRoot, 'index.html');

const source = await readFile(inputPath, 'utf8');

const sections = [
  {
    file: '00-core-bootstrap.js',
    label: 'Core bootstrap, shared constants, storage, state, and early listeners',
    marker: null,
  },
  {
    file: '01-player-powerups-particles.js',
    label: 'Player model, scoring, particles, powerups, and support helpers',
    marker: 'function makePlayer()',
  },
  {
    file: '02-pacing-waves-difficulty.js',
    label: 'Stars, pacing, pressure, adaptive difficulty, and wave management',
    marker: 'function updateStars()',
  },
  {
    file: '03-bosses.js',
    label: 'Boss selection, standard boss, Wraith boss, and boss attacks',
    marker: 'function spawnWraithBoss()',
  },
  {
    file: '04-collisions-phase-title-systems.js',
    label: 'Collisions, pending spawns, phase progression, and title formations',
    marker: 'function updateCollisions()',
  },
  {
    file: '05-title-screen.js',
    label: 'Title screen formations, panels, codex, settings, and menu drawing',
    marker: 'const TITLE_PATTERNS =',
  },
  {
    file: '06-ship-rendering.js',
    label: 'Enemy, boss, player, and ship geometry rendering helpers',
    marker: 'function drawBossStandardShip',
  },
  {
    file: '07-entity-rendering.js',
    label: 'Bullet, enemy, boss, particle, HUD, and game rendering functions',
    marker: 'function drawBullets()',
  },
  {
    file: '08-input-main-loop.js',
    label: 'Pointer input, keyboard input, persistence hooks, update loop, and boot',
    marker: 'function handleGameOverPointerDown',
  },
];

const boundaries = sections.map((section) => {
  if (!section.marker) return 0;
  const index = source.indexOf(section.marker);
  if (index === -1) {
    throw new Error(`Could not find semantic split marker: ${section.marker}`);
  }
  return index;
});

for (let i = 1; i < boundaries.length; i++) {
  if (boundaries[i] <= boundaries[i - 1]) {
    throw new Error(`Split marker order is invalid at ${sections[i].file}.`);
  }
}

await rm(outputDir, { recursive: true, force: true });
await mkdir(outputDir, { recursive: true });

const writtenFiles = [];
for (let i = 0; i < sections.length; i++) {
  const start = boundaries[i];
  const end = i + 1 < sections.length ? boundaries[i + 1] : source.length;
  const body = source.slice(start, end).trimEnd() + '\n';
  const banner = `// Star Strike RUSH - ${sections[i].label}\n// Generated from js/legacyGame.js by scripts/semantic-refactor-game.mjs.\n// Keep script order in index.html unchanged unless this file is regenerated.\n\n`;
  await writeFile(resolve(outputDir, sections[i].file), banner + body, 'utf8');
  writtenFiles.push(`js/game/${sections[i].file}`);
}

const scriptTags = writtenFiles.map((file) => `  <script src="${file}"></script>`).join('\n');
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
console.log(`Wrote ${writtenFiles.length} semantic game files.`);
