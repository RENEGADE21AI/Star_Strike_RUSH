import { readFile, readdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const currentDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(currentDir, '..');

const indexHtml = await readFile(resolve(repoRoot, 'index.html'), 'utf8');
const partDir = resolve(repoRoot, 'js/game-parts');
const files = (await readdir(partDir))
  .filter((name) => /^\d{2}-legacy-game-part\.js$/.test(name))
  .sort();

if (files.length === 0) {
  throw new Error('No generated game part files found in js/game-parts.');
}

files.forEach((file, index) => {
  const expectedPrefix = String(index).padStart(2, '0');
  if (!file.startsWith(expectedPrefix)) {
    throw new Error(`Game part ${file} is out of order. Expected prefix ${expectedPrefix}.`);
  }

  const scriptTag = `<script src="js/game-parts/${file}"></script>`;
  if (!indexHtml.includes(scriptTag)) {
    throw new Error(`index.html is missing script tag: ${scriptTag}`);
  }
});

const scriptTagCount = (indexHtml.match(/<script src="js\/game-parts\//g) || []).length;
if (scriptTagCount !== files.length) {
  throw new Error(`index.html references ${scriptTagCount} game parts, but ${files.length} files exist.`);
}

console.log(`Validated ${files.length} ordered game part files.`);
