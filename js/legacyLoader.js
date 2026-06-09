import './legacyGame.js';

export async function loadLegacyGame() {
  // The legacy game script is checked in locally and executes as a side effect
  // when this module is imported. This keeps the public game load independent
  // from raw.githubusercontent.com.
}
