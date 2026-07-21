# Asset Manifest

Audited against repository commit `529aca1` and its reachable Git history on
2026-07-21.

## Inventory result

No PNG, JPEG, WebP, GIF, SVG, or Git LFS image objects are present in this
checkout or its reachable history. There are therefore no file dimensions,
alpha channels, subjects, authors, or provenance claims to record. Star Strike
RUSH currently renders its ships, hazards, icons, backgrounds, particles, and
interface with Canvas primitives.

The runtime registry in `src/00-asset-manifest.js` is the authoritative asset
contract. Every registered gameplay entity has:

- a nullable source path;
- intended render width, height, anchor, and optional glow;
- one or more collision circles that exclude decorative mass;
- optional projectile origin and health-bar metadata.

All current `source` fields are intentionally `null`. The procedural art is the
verified fallback and remains the primary renderer until actual image files are
added. The preload gate completes before the animation loop begins, tolerates a
failed noncritical image, and the renderer automatically falls back to Canvas.

## Adding future art safely

1. Add the file using a lowercase, case-safe path such as `assets/ships/red.png`.
2. Visually inspect its subject, transparent padding, and orientation.
3. Set only that entity's `source` and tune its manifest render metadata.
4. Keep collision geometry based on visible solid mass, not the image rectangle.
5. Run `node --test` over every file in `tests/` and inspect the hitbox overlay
   at `?debug=1&hitboxes=1` or toggle it with `H`.

No user-provided images were deleted or replaced during this work because none
were present.
