import { LEGACY_BUILD_URL } from "./config.js";

function extractInlineGameScript(html) {
  const match = html.match(/<script>([\s\S]*)<\/script>\s*<\/body>/i);

  if (!match || !match[1]) {
    throw new Error("Could not find the game script in the legacy build.");
  }

  return match[1];
}

function runScriptInPageContext(source) {
  const script = document.createElement("script");
  script.textContent = source;
  document.body.appendChild(script);
}

export async function loadLegacyGame() {
  const response = await fetch(LEGACY_BUILD_URL, { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`Failed to load Star Strike RUSH legacy build: ${response.status}`);
  }

  const html = await response.text();
  const source = extractInlineGameScript(html);
  runScriptInPageContext(source);
}
