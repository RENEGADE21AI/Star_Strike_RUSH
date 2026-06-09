import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const currentDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(currentDir, '..');

const inputPath = process.argv[2]
  ? resolve(process.cwd(), process.argv[2])
  : resolve(repoRoot, 'index.html');

const outputPath = process.argv[3]
  ? resolve(process.cwd(), process.argv[3])
  : resolve(repoRoot, 'js/legacyGame.js');

const html = await readFile(inputPath, 'utf8');
const startTag = '<script>';
const endTag = '</script>';
const start = html.indexOf(startTag);
const end = html.lastIndexOf(endTag);

if (start === -1 || end === -1 || end <= start) {
  throw new Error(`No inline game script found in ${inputPath}`);
}

const source = html.slice(start + startTag.length, end).trim();

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${source}\n`, 'utf8');

console.log(`Extracted legacy game script to ${outputPath}`);
