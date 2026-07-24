# Asset Manifest

Audited on 2026-07-23 against the final polish branch.

## Inventory

The project owner supplied 45 original PNG files. They are preserved unchanged
under `source-art/` alongside a short archive README and are excluded from the
Firebase Hosting payload.

The public runtime contains 47 optimized PNG derivatives:

- `assets/sprites/`: 26 player, wingman, enemy, boss, and asteroid sprites.
- `assets/powerups/`: 13 powerup icons.
- `assets/ui/`: 8 menu, favicon, and PWA icons.

Two owner-supplied MP3 tracks live under `assets/audio/`: Hangar Bay Seven for
title/profile navigation and Gravity's Edge for active play.

The derivative count is larger because the supplied favicon generates multiple
PWA sizes. No authorship or third-party-license claim is inferred from a file
name; these files are documented only as artwork supplied by the project owner.

## Runtime contract

`src/00-asset-manifest.js` is authoritative. Every registered entity defines:

- a case-safe deployed source path;
- intended render size, anchor, and optional glow;
- explicit art orientation and gameplay forward direction;
- one or more collision circles that exclude transparent padding and
  decorative silhouette mass;
- optional projectile and exhaust origins.

Powerup images render at 28 logical pixels—smaller than primary ship art—while
pickup collision stays at an independent 18-pixel radius. Each drop advances a
simulation-owned rotation while falling. The renderer intentionally has no
dotted energy orbit behind powerup art.

## Import pipeline

Run `scripts/import_user_art.py` with Pillow available to rebuild derivatives.
The script:

1. loads originals from the configured source-art/Downloads locations;
2. converts baked light checkerboards to transparency;
3. trims excess transparent space around the visible subject;
4. adds consistent safe padding;
5. rotates every ship derivative to the canonical nose-up orientation;
6. creates browser-sized PNGs in `assets/`.

The originals are never rewritten. Collision geometry must be tuned in the
manifest after visual inspection; it is never inferred from the full image
rectangle.

Friendly ships use the canonical PNG orientation in play. Hostile ships receive
one manifest-owned 180-degree gameplay rotation so they face down toward the
player; title-screen patrols and Codex previews deliberately cancel that combat
rotation and display the canonical nose-up art.

## Validation

- `tests/powerup-art.test.js` verifies every gameplay powerup source, size,
  collision metadata, falling rotation, and removal of the dotted ring.
- `tests/sprite-orientation.test.js` verifies forward, weapon, and exhaust
  orientation contracts.
- `tests/collision-contract.test.js` verifies object-only collision calls,
  boss circles, and asteroid spawn-scale collision growth.
- Local `?debug=1&scenario=powerups` renders all 13 supplied powerups together.
- Local `?debug=1&scenario=wingman` renders two compact supplied-art wingmen
  beside the player and confirms all three friendly craft face forward/up.
- Local `?debug=1&hitboxes=1` shows hit circles, anchors, origins, and safe lanes.

Procedural Canvas drawings remain decode-failure fallbacks; the normal runtime
path uses the optimized supplied artwork.
