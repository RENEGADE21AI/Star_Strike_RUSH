# Star Strike RUSH

A mobile-first HTML5 canvas space fighter game.

## Project structure

```text
index.html                       Page shell only, or generated ordered script loader after split
css/style.css                    Page, canvas, hidden input, and load-error styles
js/game.js                       Main JavaScript entry point for the module-loader stage
js/config.js                     Shared loader configuration
js/legacyLoader.js               Coordinates loading the stable legacy game build
js/legacyGame.js                 Checked-in extracted legacy game script
js/legacyParser.js               Extracts the inline game script from legacy HTML
js/legacyCache.js                Caches the extracted script for the browser session
js/errorView.js                  Displays a readable load error if boot fails
scripts/extract-legacy-game.mjs  Local helper for extracting a legacy inline script
scripts/use-local-legacy-game.mjs  Switches the loader to checked-in legacyGame.js
scripts/split-legacy-game.mjs    Splits legacyGame.js into ordered browser script parts
.github/workflows/extract-legacy-game.yml  Manual workflow for full legacy extraction
.github/workflows/split-legacy-game.yml    Manual workflow for generating ordered game parts
.github/workflows/smoke-test.yml            Basic file and syntax checks
```

## Current refactor status

The old single-file shell has been split into separate HTML, CSS, JavaScript, scripts, and workflows.

The legacy game script has been extracted into a checked-in local file by GitHub Actions. The current loader can run the local script without depending on `raw.githubusercontent.com`.

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

## Next deeper cleanup step

After the generated `js/game-parts/` files exist, the next refactor should replace those generated chunks with meaningful gameplay modules, for example:

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
