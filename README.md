# Star Strike RUSH

A mobile-first HTML5 canvas space fighter game.

## Project structure

```text
index.html          Page shell only
css/style.css       Page, canvas, and hidden callsign input styles
js/game.js          Main JavaScript entry point
js/config.js        Shared loader configuration
js/legacyLoader.js  Loads the last known-good legacy game build
js/errorView.js     Displays a readable load error if boot fails
```

## Current refactor status

The game has been split out of the old single-file `index.html` shell into separate HTML, CSS, and JavaScript files.

The current `js/legacyLoader.js` keeps gameplay behavior stable by loading the last known-good legacy build and running its game script on the new page shell. This avoids changing gameplay logic while the repository structure is being cleaned up.

## Next cleanup step

The next deeper refactor should extract the legacy game script into dedicated gameplay modules, for example:

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

That deeper step should be done with a local clone or an automated extraction script so the full legacy source can be split without accidentally dropping lines.
