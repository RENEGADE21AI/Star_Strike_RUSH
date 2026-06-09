import { LEGACY_BUILD_URL } from './config.js';
import { readCachedLegacyScript, writeCachedLegacyScript } from './legacyCache.js';
import { extractInlineGameScript } from './legacyParser.js';

function runScriptInPageContext(source) {
  const script = document.createElement('script');
  script.textContent = source;
  document.body.appendChild(script);
}

async function fetchLegacyScript() {
  const response = await fetch(LEGACY_BUILD_URL, { cache: 'no-store' });

  if (!response.ok) {
    throw new Error(`Failed to load Star Strike RUSH legacy build: ${response.status}`);
  }

  const html = await response.text();
  return extractInlineGameScript(html);
}

export async function loadLegacyGame() {
  const cachedSource = readCachedLegacyScript();

  if (cachedSource) {
    runScriptInPageContext(cachedSource);
    return;
  }

  const source = await fetchLegacyScript();
  writeCachedLegacyScript(source);
  runScriptInPageContext(source);
}
