# Star Strike RUSH

A mobile-first HTML5 canvas space fighter game.

## Project structure

```text
index.html                       Page shell that loads generated ordered script parts
css/style.css                    Page, canvas, and hidden input styles
js/legacyGame.js                 Checked-in extracted legacy game script source
js/game-parts/                   Generated ordered browser script parts loaded by index.html
scripts/extract-legacy-game.mjs  Local helper for extracting a legacy inline script
scripts/split-legacy-game.mjs    Splits legacyGame.js into ordered browser script parts
scripts/validate-split.mjs       Verifies index.html and js/game-parts stay in sync
.github/workflows/extract-legacy-game.yml  Manual workflow for full legacy extraction
.github/workflows/split-legacy-game.yml    Manual workflow for generating ordered game parts
.github/workflows/smoke-test.yml            Basic file, syntax, and split validation checks
```

## Current refactor status

The old single-file shell has been split into separate HTML, CSS, JavaScript, scripts, and workflows.

The legacy game script has been extracted into `js/legacyGame.js`, then generated into ordered browser script files under `js/game-parts/`. The page now loads those ordered parts directly, so it no longer depends on `raw.githubusercontent.com` or the temporary module-loader stage.

## GitHub Actions helpers

To extract the full old inline game script into `js/legacyGame.js`, run:

```text
Actions -> Extract legacy game script -> Run workflow
```

To split `js/legacyGame.js` into generated ordered files under `js/game-parts/`, run:

```text
Actions -> Split legacy game -> Run workflow
```

The split workflow rewrites `index.html` to load the generated parts in order.

## Local helper commands

After cloning the repository locally, you can extract an inline legacy script with:

```bash
node scripts/extract-legacy-game.mjs path/to/legacy-index.html js/legacyGame.js
```

You can split the checked-in legacy script locally with:

```bash
node scripts/split-legacy-game.mjs
```

You can validate the generated split with:

```bash
node scripts/validate-split.mjs
```

## Next deeper cleanup step

The next refactor should replace the generated chunks with meaningful gameplay modules, for example:

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

That deeper step should be done gradually so each commit is easy to test and gameplay regressions are easier to spot.
