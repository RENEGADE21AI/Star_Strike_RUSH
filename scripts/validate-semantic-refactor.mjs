import { readFile, readdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const currentDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(currentDir, '..');
const legacyPath = resolve(repoRoot, 'js/legacyGame.js');
const gameDir = resolve(repoRoot, 'js/game');
const indexPath = resolve(repoRoot, 'index.html');

function isGeneratedGameFile(file) {
  return file.endsWith('.js') && file.slice(0, 2) >= '00' && file.slice(0, 2) <= '99';
}

function stripGeneratedBanner(text) {
  const lines = text.split('\n');
  let start = 0;

  while (start < lines.length && lines[start].startsWith('//')) {
    start++;
  }

  if (lines[start] === '') {
    start++;
  }

  return lines.slice(start).join('\n').trim();
}

const files = (await readdir(gameDir)).filter(isGeneratedGameFile).sort();

if (files.length === 0) {
  throw new Error('No semantic game files found in js/game.');
}

const indexHtml = await readFile(indexPath, 'utf8');
for (const file of files) {
  const tag = `<script src="js/game/${file}"></script>`;
  if (!indexHtml.includes(tag)) {
    throw new Error(`index.html is missing script tag: ${tag}`);
  }
}

const scriptTagCount = indexHtml.split('<script src="js/game/').length - 1;
if (scriptTagCount !== files.length) {
  throw new Error(`index.html references ${scriptTagCount} semantic files, but ${files.length} files exist.`);
}

const parts = [];
for (const file of files) {
  const text = await readFile(resolve(gameDir, file), 'utf8');
  parts.push(stripGeneratedBanner(text));
}

const reconstructed = parts.join('\n').trim();
const original = (await readFile(legacyPath, 'utf8')).trim();

if (reconstructed !== original) {
  throw new Error('Semantic files do not exactly reconstruct js/legacyGame.js.');
}

console.log(`Validated ${files.length} semantic game files against js/legacyGame.js.`);
