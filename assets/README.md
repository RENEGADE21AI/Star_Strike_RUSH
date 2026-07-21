# Game artwork

The files in `sprites/` are optimized derivatives of the artwork supplied by
the project owner in their Downloads folder. The original source files are not
modified or committed.

Run `scripts/import_user_art.py` with Pillow available to rebuild the sprites.
It converts baked checkerboard backgrounds to transparency, trims excess
canvas space, applies consistent padding, and downsizes the large source files
for browser delivery.

Hitboxes are intentionally defined separately in `src/00-asset-manifest.js`.
Visible wings and decorative silhouettes do not automatically enlarge combat
collision geometry.
