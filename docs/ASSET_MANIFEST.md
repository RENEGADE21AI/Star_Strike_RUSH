# Asset Manifest

Audited on 2026-07-28 during the First Flight onboarding pass.

## Inventory

The project owner supplied 45 original PNG files. They are preserved unchanged
under `source-art/` alongside a short archive README and are excluded from the
Firebase Hosting payload.

The public runtime contains 47 optimized PNG derivatives:

- `assets/sprites/`: 26 player, wingman, enemy, boss, and asteroid sprites.
- `assets/powerups/`: 13 powerup icons.
- `assets/ui/`: 8 menu, favicon, and PWA icons.

Two owner-supplied MP3 tracks live under `assets/audio/`: Hangar Bay Seven for
title/profile navigation and Gravity's Edge for active play. On 2026-07-28, the
project owner explicitly confirmed that they own or are authorized to publicly
distribute both tracks as part of the public Star Strike RUSH website. No
artist, source URL, composition history, or formal license name was supplied,
so this manifest makes none of those claims.

The derivative count is larger because the supplied favicon generates multiple
PWA sizes. No authorship or third-party-license claim is inferred from a file
name; these files are documented only as assets supplied by the project owner.

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
- The asserted visual suite uses build-excluded localhost instrumentation to
  render all 13 powerups and the compact wingman formation.
- Collision, anchor, origin, and safe-lane contracts are verified through
  automated tests and visual artifacts; no player-facing hitbox toggle ships.

Procedural Canvas drawings remain decode-failure fallbacks; the normal runtime
path uses the optimized supplied artwork.

Colonel Vega is original procedural Canvas artwork created for First Flight.
The source is preserved in `src/17-tutorial-onboarding.js`; it uses geometric
helmet, high-collar, rank-bar, scanline, and hologram primitives and has no
external portrait or likeness dependency.
