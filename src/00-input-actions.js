const GAME_ACTION_KEYS = Object.freeze({
  ArrowUp: "move_up", w: "move_up", W: "move_up",
  ArrowDown: "move_down", s: "move_down", S: "move_down",
  ArrowLeft: "move_left", a: "move_left", A: "move_left",
  ArrowRight: "move_right", d: "move_right", D: "move_right",
  " ": "ability", Shift: "ability", e: "ability", E: "ability",
  Escape: "pause"
});

function gameplayActionForKey(key) {
  return GAME_ACTION_KEYS[key] || null;
}

function nextGameplayInputMode(currentMode, eventKind, nowMs, lastTouchAt = -Infinity, buttons = 0) {
  if (eventKind === "touch" || eventKind === "pen") return { mode: "touch", lastTouchAt: nowMs };
  if (eventKind === "keyboard") return { mode: "keyboard", lastTouchAt };
  if (eventKind === "mouse_down") return { mode: "pointer", lastTouchAt };
  if (eventKind === "mouse_move" && buttons && nowMs - lastTouchAt > 1200) return { mode: "pointer", lastTouchAt };
  return { mode: currentMode || "keyboard", lastTouchAt };
}

function touchControlsVisible(inputMode, gameState) {
  return inputMode === "touch" && gameState === "playing";
}

globalThis.GAME_ACTION_KEYS = GAME_ACTION_KEYS;
globalThis.gameplayActionForKey = gameplayActionForKey;
globalThis.nextGameplayInputMode = nextGameplayInputMode;
globalThis.touchControlsVisible = touchControlsVisible;

