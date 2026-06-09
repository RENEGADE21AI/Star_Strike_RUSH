import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const currentDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(currentDir, '..');

function extractInlineGameScript(html) {
  const startTag = '<script>';
  const endTag = '</script>';
  const start = html.indexOf(startTag);
  const end = html.lastIndexOf(endTag);

  if (start === -1 || end === -1 || end <= start) {
    throw new Error('No inline game script found in legacy HTML.');
  }

  return html.slice(start + startTag.length, end).trim();
}

const expectedPath = process.argv[2]
  ? resolve(process.cwd(), process.argv[2])
  : resolve(repoRoot, 'test-fixtures/legacy-index.html');

const actualPath = resolve(repoRoot, 'js/legacyGame.js');

const legacyHtml = await readFile(expectedPath, 'utf8');
const expected = extractInlineGameScript(legacyHtml).trim();
const actual = (await readFile(actualPath, 'utf8')).trim();

if (expected !== actual) {
  throw new Error('js/legacyGame.js does not exactly match the original inline legacy script.');
}

console.log('js/legacyGame.js exactly matches the original inline legacy script.');
