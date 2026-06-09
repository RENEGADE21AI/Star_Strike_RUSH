# Star Strike RUSH

A mobile-first HTML5 canvas space fighter game.

## Project structure

```text
index.html                  Page shell only
css/style.css               Page, canvas, hidden input, and load-error styles
js/game.js                  Main JavaScript entry point
js/config.js                Shared loader configuration
js/legacyLoader.js          Coordinates loading the stable legacy game build
js/legacyParser.js          Extracts the inline game script from legacy HTML
js/legacyCache.js           Caches the extracted script for the browser session
js/errorView.js             Displays a readable load error if boot fails
scripts/extract-legacy-game.mjs  Local helper for extracting a legacy inline script
```

## Current refactor status

The old single-file shell has been split into separate HTML, CSS, and JavaScript files.

The current loader keeps gameplay behavior stable by loading the last known-good legacy build, extracting its game script, caching it for the current browser session, and running it on the new page shell.

This gives the project a cleaner multi-file structure without risking gameplay regressions from manually rewriting thousands of lines at once.

## Local extraction helper

After cloning the repository locally, you can extract an inline legacy script with:

```bash
node scripts/extract-legacy-game.mjs path/to/legacy-index.html js/legacyGame.js
```

## Next deeper cleanup step

The next refactor should replace the remote legacy loader with a checked-in local `js/legacyGame.js`, then gradually split that file into dedicated gameplay modules, for example:

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

That deeper step should be done with a local clone or another full-source extraction path so the full legacy source can be split without accidentally dropping lines.
