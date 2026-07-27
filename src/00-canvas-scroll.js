function createCanvasScrollController(options = {}) {
  const threshold = Math.max(1, Number(options.threshold || 7));
  const momentum = Math.min(0.98, Math.max(0, Number(options.momentum || 0.88)));
  const state = {
    active: false,
    pointerId: null,
    startX: 0,
    startY: 0,
    lastY: 0,
    moved: false,
    velocity: 0,
    captureElement: null
  };

  const maxValue = () => Math.max(0, Number(options.getMax && options.getMax()) || 0);
  const getValue = () => Number(options.getValue && options.getValue()) || 0;
  const setValue = (value) => {
    const next = Math.max(0, Math.min(maxValue(), Number(value) || 0));
    if (options.setValue) options.setValue(next);
    return next;
  };

  function begin(pointerId, x, y, captureElement = null) {
    state.active = true;
    state.pointerId = pointerId;
    state.startX = Number(x) || 0;
    state.startY = Number(y) || 0;
    state.lastY = state.startY;
    state.moved = false;
    state.velocity = 0;
    state.captureElement = captureElement;
    if (captureElement && pointerId !== null && pointerId !== undefined) {
      try { captureElement.setPointerCapture(pointerId); } catch {}
    }
    return true;
  }

  function move(pointerId, x, y) {
    if (!state.active || (state.pointerId !== null && pointerId !== state.pointerId)) return false;
    const currentX = Number(x) || 0;
    const currentY = Number(y) || 0;
    if (!state.moved && Math.hypot(currentX - state.startX, currentY - state.startY) >= threshold) {
      state.moved = true;
    }
    const delta = state.lastY - currentY;
    state.lastY = currentY;
    if (state.moved) {
      const before = getValue();
      const after = setValue(before + delta);
      state.velocity = after === before ? 0 : delta;
      if (options.onMove) options.onMove(after);
    }
    return true;
  }

  function end(pointerId, cancelled = false) {
    if (!state.active || (state.pointerId !== null && pointerId !== state.pointerId)) {
      return { handled: false, moved: false, cancelled };
    }
    const moved = state.moved;
    if (state.captureElement && state.pointerId !== null && state.pointerId !== undefined) {
      try { state.captureElement.releasePointerCapture(state.pointerId); } catch {}
    }
    state.active = false;
    state.pointerId = null;
    state.captureElement = null;
    state.moved = false;
    if (cancelled) state.velocity = 0;
    return { handled: true, moved, cancelled };
  }

  function tick() {
    if (state.active || Math.abs(state.velocity) < 0.08) {
      if (!state.active) state.velocity = 0;
      return getValue();
    }
    const before = getValue();
    const after = setValue(before + state.velocity);
    state.velocity = after === before ? 0 : state.velocity * momentum;
    return after;
  }

  function scrollBy(delta) {
    state.velocity = 0;
    return setValue(getValue() + Number(delta || 0));
  }

  function cancel() {
    if (state.active) end(state.pointerId, true);
    state.velocity = 0;
  }

  function snapshot() {
    return {
      active: state.active,
      moved: state.moved,
      value: getValue(),
      max: maxValue(),
      velocity: state.velocity
    };
  }

  return { begin, move, end, tick, scrollBy, cancel, snapshot };
}

globalThis.createCanvasScrollController = createCanvasScrollController;
