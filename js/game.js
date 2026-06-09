// Star Strike RUSH game bootstrap
//
// This file keeps index.html small while preserving the current working game code.
// It loads the last known-good single-file build, extracts its inline <script>,
// and runs it on this page. The next cleanup step should move the extracted
// game systems into dedicated modules instead of loading the legacy build.

const LEGACY_BUILD_URL = "https://raw.githubusercontent.com/RENEGADE21AI/Star_Strike_RUSH/a5cf58cf7acb72db2dc147261d3dc28f094794b7/index.html";

async function bootStarStrikeRush() {
  const response = await fetch(LEGACY_BUILD_URL, { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`Failed to load Star Strike RUSH legacy build: ${response.status}`);
  }

  const html = await response.text();
  const match = html.match(/<script>([\s\S]*)<\/script>\s*<\/body>/i);

  if (!match || !match[1]) {
    throw new Error("Could not find the game script in the legacy build.");
  }

  // Run the original game script in the page context so it can access the
  // existing canvas and callsign input elements exactly like it did before.
  const script = document.createElement("script");
  script.textContent = match[1];
  document.body.appendChild(script);
}

bootStarStrikeRush().catch((error) => {
  console.error(error);
  const message = document.createElement("pre");
  message.textContent = "Star Strike RUSH failed to load. Check the console for details.";
  message.style.position = "fixed";
  message.style.inset = "16px";
  message.style.color = "white";
  message.style.font = "16px Arial, sans-serif";
  message.style.whiteSpace = "pre-wrap";
  document.body.appendChild(message);
});
