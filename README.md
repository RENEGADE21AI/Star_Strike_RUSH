# Star Strike RUSH

A mobile-first HTML5 canvas space fighter game.

## License and usage

Copyright (c) 2026 Michael Del Bianco. All rights reserved.

This project is proprietary. Use requires prior written permission from the copyright owner.

See `LICENSE` for the copyright notice.

## Project structure

```text
index.html                       Page shell that loads the exact extracted game script
css/style.css                    Page, canvas, and hidden input styles
js/legacyGame.js                 Checked-in extracted legacy game script source
scripts/extract-legacy-game.mjs  Local helper for extracting a legacy inline script
scripts/validate-legacy-integrity.mjs  Verifies legacyGame.js matches the known-good original script
.github/workflows/extract-legacy-game.yml  Manual workflow for full legacy extraction
.github/workflows/smoke-test.yml            Basic file, syntax, and integrity checks
```

## Current refactor status

The old single-file shell has been split into separate HTML, CSS, and JavaScript files.

The runtime path is intentionally simple so the game behaves exactly like the pre-refactor version:

```text
index.html -> css/style.css
index.html -> js/legacyGame.js
```

`js/legacyGame.js` is the original inline game script extracted from the known-good `index.html` commit. The smoke test restores that known-good file and verifies that `js/legacyGame.js` matches the original inline script exactly.

## GitHub Actions helpers

To re-extract the full old inline game script into `js/legacyGame.js`, run:

```text
Actions -> Extract legacy game script -> Run workflow
```

The smoke test runs on pushes and pull requests and checks:

```text
- required runtime files exist
- helper scripts parse
- js/legacyGame.js exactly matches the known-good original inline script
```

## Local helper commands

After cloning the repository locally, you can extract an inline legacy script with:

```bash
node scripts/extract-legacy-game.mjs path/to/legacy-index.html js/legacyGame.js
```

You can validate the extracted script with:

```bash
node scripts/validate-legacy-integrity.mjs path/to/legacy-index.html
```

## Next deeper cleanup step

The next refactor should be a gradual semantic split of `js/legacyGame.js` into meaningful gameplay modules, for example:

```text
js/core/state.js
js/core/storage.js
js/core/math.js
js/systems/player.js
js/systems/enemies.js
js/systems/bosses.js
js/systems/waves.js
js/systems/powerups.js
js/systems/collisions.js
js/render/drawPlayer.js
js/render/drawEnemies.js
js/render/drawUi.js
js/input/pointer.js
js/input/keyboard.js
```

Do that one system at a time with tests/playtesting between commits so behavior changes are easy to catch.
