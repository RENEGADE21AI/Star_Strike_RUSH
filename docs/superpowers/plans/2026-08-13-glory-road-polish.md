# Glory Road General Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove visible celebration collisions and make Glory Road position and hierarchy accurately reflect cumulative progress.

**Architecture:** Add pure layout/derivation helpers beside the existing Glory UI modules, then make Canvas rendering and semantic controls consume those helpers. Preserve every progression and release boundary.

**Tech Stack:** JavaScript, Canvas 2D, semantic DOM accessibility controls, Node test runner, Playwright visual QA.

## Global Constraints

- Do not change cumulative Glory, Prestige, rank, milestone, reward, or combat semantics.
- Preserve device-local preseason progression and all closed Firebase gates.
- Respect Reduced Motion, Reduced Flash, Effects, and screen-shake settings.
- Protect 375x667 mobile layout and keyboard focus visibility.

---

### Task 1: Celebration layout and focus geometry

**Files:**
- Modify: `tests/glory-celebration.test.js`
- Modify: `src/12-glory-celebration.js`
- Modify: `src/18-accessible-actions.js`

**Interfaces:**
- Produces: `gloryCelebrationLayout(event, width, height)` with panel, copy, and Continue rectangles.
- Consumes: existing celebration event type and current Canvas dimensions.

- [x] Add failing behavior tests proving copy baselines are ordered and the Continue rectangle remains inside the panel.
- [x] Run `node --test tests/glory-celebration.test.js` and confirm the helper is missing.
- [x] Implement the shared layout and use it in Canvas and semantic action geometry.
- [x] Rerun the focused test and verify it passes.

### Task 2: Exact Road marker and Road-specific header

**Files:**
- Modify: `tests/glory-ui.test.js`
- Modify: `src/12-progress-road-data.js`
- Modify: `src/12-rendering-progress-road.js`

**Interfaces:**
- Produces: `roadMarkerPositionForGlory(layout, roadGlory)` and `gloryRoadHeaderChips(meta)`.
- Consumes: existing Road layout entries and current meta snapshot.

- [x] Add failing tests for exact-node and between-node curve positions plus TOTAL/RANK/PRESTIGE header values.
- [x] Run `node --test tests/glory-ui.test.js` and confirm the new contracts fail.
- [x] Implement cubic interpolation along the existing path and a Road-specific strip.
- [x] Rerun the focused test and verify it passes.

### Task 3: Rendered verification

**Files:**
- Modify only if a reproduced defect remains after inspection.

**Interfaces:**
- Consumes: targeted visual QA case filters.
- Produces: asserted screenshots and reports under ignored `test-artifacts/`.

- [x] Run targeted checkpoint, rank, Prestige, and Road visual cases.
- [x] Inspect screenshots at original resolution for focus, clipping, hierarchy, and exact marker placement.
- [x] Run the complete `npm test` regression suite.
- [x] Run `npm run build`, `npm run test:secret`, syntax checks, and `git diff --check`.
