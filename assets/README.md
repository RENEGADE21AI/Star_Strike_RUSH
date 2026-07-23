# Game artwork

The files in `sprites/`, `powerups/`, and `ui/` are optimized derivatives of
artwork supplied by the project owner. Original source files are preserved
unchanged in `source-art/` and excluded from Firebase Hosting.

Run `scripts/import_user_art.py` with Pillow available to rebuild the sprites.
It converts baked checkerboard backgrounds to transparency, trims excess canvas
space, applies consistent padding, and downsizes large source files for browser
delivery. Every runtime ship derivative is also normalized with its nose pointing
up. Gameplay direction belongs to the manifest, so hostile ships rotate toward
the player without requiring differently oriented source files.

Hitboxes are intentionally defined separately in `src/00-asset-manifest.js`.
Visible wings and decorative silhouettes do not automatically enlarge combat
collision geometry.
