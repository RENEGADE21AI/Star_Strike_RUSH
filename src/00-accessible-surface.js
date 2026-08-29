let gameAccessibilityDom = null;
let gameAccessibilityMode = "";
let gameAccessibilitySignature = "";
let gameAccessibilityEscape = null;
let gameAccessibilityRestoreFocus = null;
let gameAccessibilityRestoreActionId = "";

function createGameAccessibilityDom() {
  if (gameAccessibilityDom) return gameAccessibilityDom;
  const root = document.createElement("section");
  root.id = "gameAccessibility";
  root.hidden = true;

  const live = document.createElement("div");
  live.id = "gameAccessibilityLive";
  live.className = "game-sr-only";
  live.setAttribute("role", "status");
  live.setAttribute("aria-live", "polite");
  live.setAttribute("aria-atomic", "true");

  const actions = document.createElement("div");
  actions.id = "gameAccessibilityActions";
  root.append(live, actions);
  document.body.appendChild(root);

  root.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && typeof gameAccessibilityEscape === "function") {
      const handled = gameAccessibilityEscape();
      if (handled !== false) event.preventDefault();
      return;
    }
    if (event.key !== "Tab" || root.getAttribute("aria-modal") !== "true") return;
    const buttons = Array.from(actions.querySelectorAll("button:not([disabled])"));
    if (!buttons.length) return;
    const first = buttons[0];
    const last = buttons[buttons.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus({ preventScroll: true });
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus({ preventScroll: true });
    }
  });

  gameAccessibilityDom = { root, live, actions };
  return gameAccessibilityDom;
}

function accessibleActionSignature(options) {
  return JSON.stringify({
    mode: options.mode || "",
    label: options.label || "",
    modal: options.modal === true,
    actions: (options.actions || []).map((action) => ({
      id: action.id,
      label: action.label,
      rect: action.rect && [action.rect.x, action.rect.y, action.rect.w, action.rect.h].map((value) => Math.round(Number(value) * 10) / 10)
    }))
  });
}

function scheduleAccessibleActionFocus(action, actions) {
  requestAnimationFrame(() => {
    if (!action || !action.isConnected) return;
    const active = document.activeElement;
    if (active && actions.contains(active) && active !== action) return;
    action.focus({ preventScroll: true });
  });
}

function setGameAccessibleSurface(options = {}) {
  const dom = createGameAccessibilityDom();
  const mode = String(options.mode || "");
  const signature = accessibleActionSignature(options);
  const modeChanged = mode !== gameAccessibilityMode;
  const leavingModal = dom.root.getAttribute("aria-modal") === "true" && options.modal !== true;
  const priorAction = dom.actions.contains(document.activeElement) ? document.activeElement.dataset.gameAction : "";

  gameAccessibilityEscape = typeof options.onEscape === "function" ? options.onEscape : null;
  if (modeChanged && options.modal === true) {
    if (dom.actions.contains(document.activeElement)) {
      gameAccessibilityRestoreActionId = String(document.activeElement.dataset.gameAction || "");
      gameAccessibilityRestoreFocus = null;
    } else {
      gameAccessibilityRestoreActionId = "";
      gameAccessibilityRestoreFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    }
  }
  dom.root.hidden = false;
  dom.root.setAttribute("aria-label", String(options.label || "Star Strike RUSH controls"));
  if (options.modal === true) {
    dom.root.setAttribute("role", "dialog");
    dom.root.setAttribute("aria-modal", "true");
  } else {
    dom.root.setAttribute("role", "navigation");
    dom.root.removeAttribute("aria-modal");
  }
  if (options.message && (modeChanged || dom.live.textContent !== options.message)) dom.live.textContent = String(options.message);

  if (signature !== gameAccessibilitySignature) {
    dom.actions.replaceChildren();
    for (const action of options.actions || []) {
      if (!action || !action.rect || typeof action.handler !== "function") continue;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "game-accessible-action";
      button.dataset.gameAction = String(action.id || action.label || "action");
      button.setAttribute("aria-label", String(action.label || "Game action"));
      button.textContent = String(action.label || "Game action");
      button.style.left = `${Number(action.rect.x) || 0}px`;
      button.style.top = `${Number(action.rect.y) || 0}px`;
      button.style.width = `${Math.max(1, Number(action.rect.w) || 1)}px`;
      button.style.height = `${Math.max(1, Number(action.rect.h) || 1)}px`;
      button.addEventListener("click", (event) => {
        event.preventDefault();
        action.handler();
      });
      dom.actions.appendChild(button);
    }
    gameAccessibilitySignature = signature;
    const retained = priorAction && dom.actions.querySelector(`[data-game-action="${CSS.escape(priorAction)}"]`);
    if (retained) scheduleAccessibleActionFocus(retained, dom.actions);
  }

  if (modeChanged && options.modal === true && options.focusFirst !== false) {
    const first = dom.actions.querySelector("button");
    if (first) scheduleAccessibleActionFocus(first, dom.actions);
  }
  if (leavingModal) {
    const restoredAction = gameAccessibilityRestoreActionId
      ? dom.actions.querySelector(`[data-game-action="${CSS.escape(gameAccessibilityRestoreActionId)}"]`)
      : null;
    const restoreTarget = restoredAction || (
      gameAccessibilityRestoreFocus && document.contains(gameAccessibilityRestoreFocus)
        ? gameAccessibilityRestoreFocus
        : document.getElementById("game")
    );
    if (restoreTarget) requestAnimationFrame(() => restoreTarget.focus({ preventScroll: true }));
    gameAccessibilityRestoreFocus = null;
    gameAccessibilityRestoreActionId = "";
  }
  gameAccessibilityMode = mode;
}

function clearGameAccessibleSurface(message = "", restoreFocus = false) {
  const dom = createGameAccessibilityDom();
  if (message) dom.live.textContent = String(message);
  dom.actions.replaceChildren();
  dom.root.hidden = true;
  dom.root.removeAttribute("role");
  dom.root.removeAttribute("aria-modal");
  gameAccessibilityMode = "";
  gameAccessibilitySignature = "";
  gameAccessibilityEscape = null;
  if (restoreFocus && gameAccessibilityRestoreFocus && document.contains(gameAccessibilityRestoreFocus)) {
    gameAccessibilityRestoreFocus.focus({ preventScroll: true });
  }
  gameAccessibilityRestoreFocus = null;
  gameAccessibilityRestoreActionId = "";
}

function gameAccessibilitySnapshot() {
  const dom = createGameAccessibilityDom();
  return {
    mode: gameAccessibilityMode,
    hidden: dom.root.hidden,
    modal: dom.root.getAttribute("aria-modal") === "true",
    actions: Array.from(dom.actions.querySelectorAll("button")).map((button) => ({
      id: button.dataset.gameAction,
      label: button.getAttribute("aria-label"),
      focused: document.activeElement === button
    }))
  };
}

globalThis.setGameAccessibleSurface = setGameAccessibleSurface;
globalThis.clearGameAccessibleSurface = clearGameAccessibleSurface;
globalThis.gameAccessibilitySnapshot = gameAccessibilitySnapshot;
