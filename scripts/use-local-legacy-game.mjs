import { readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const currentDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(currentDir, '..');

const loaderPath = resolve(repoRoot, 'js/legacyLoader.js');
const localLoader = `import './legacyGame.js';

export async function loadLegacyGame() {
  // The legacy game script is checked in locally and executes as a side effect
  // when this module is imported. This keeps the public game load independent
  // from raw.githubusercontent.com.
}
`;

await readFile(resolve(repoRoot, 'js/legacyGame.js'), 'utf8');
await writeFile(loaderPath, localLoader, 'utf8');

console.log('Updated js/legacyLoader.js to use local js/legacyGame.js');
