# Source Layout

The game still runs as ordered browser scripts. Keep new files loaded in `index.html`
after the files they depend on, because the current code intentionally shares globals.

- `00-asset-manifest.js`: sprite render metadata, anchors, projectile origins,
  tuned collision circles, preload state, and procedural fallback bridge.
- `00-competition.js`: public-handle normalization, UTC weekly windows,
  performance bands, and league labels shared by client UI rules.
- `00-identity.js`: call-sign validation, neutral identity generation, and the
  public-profile field whitelist.
- `00-gameplay-rules.js`: deterministic Debris Warden route generation, Siphon
  aim/range calculations, and boss-specific action profiles.
- `00-input-actions.js`: explicit gameplay actions and meaningful-input mode
  switching for keyboard, mouse, touch, and pen.
- `00-runtime.js`: deterministic fixed-step simulation clock, render-rate
  independence, and long-background-gap clamping.
- `01-core.js`: canvas handles, constants, persistent settings, global state, scoring.
- `02-effects-powerups.js`: particles, rotating artwork-backed drops, wingmen,
  ghost action, and star updates.
- `03-pacing.js`: phase timing, pressure, difficulty, bullet budget, dev skip.
- `04-waves.js`: wave templates, wave selection, codex discovery, wave spawning.
- `05-entities.js`: enemy spawning, player shots, bullet and wingman updates.
- `06-bosses.js`: boss spawning, boss attacks, boss death effects.
- `07-gameplay-systems.js`: enemy movement, collisions, powerups, phase/wave loop.
- `08-title-screen.js`: title formations, title input geometry, menu hit testing.
- `09-rendering-controls.js`: shared button and icon drawing helpers.
- `10-rendering-ships.js`: enemy, boss, formation, and menu ship art.
- `11-rendering-title-effects.js`: title sun, menu flights, encounter cards.
- `12-rendering-title-panels.js`: account/settings, records, achievements, codex,
  and reset-confirm panels.
- `12-progress-road-data.js`: Glory Road and Season Road reward tables, detail
  payloads, and local reward claim logic.
- `12-rendering-progress-road.js`: Glory Road and Season Road layout and rendering.
- `13-rendering-title-screens.js`: title screen and game-over screen composition.
- `14-rendering-player.js`: background and player ship rendering.
- `15-rendering-entities.js`: wingmen, bullets, enemies, bosses, powerups, particles.
- `16-rendering-hud.js`: controls, HUD, warnings, and damage flash overlays.
- `17-rendering-scene.js`: outer fog and top-level draw orchestration.
- `18-expansion-data.js`: expansion roster constants, codex metadata, spawn
  caps, and enemy setup defaults.
- `18-expansion-enemies-powerups.js`: expansion enemy behavior, support effects,
  energy drain, added powerups, and shared enemy-destruction rules.
- `18-expansion-hazards-bosses.js`: mines, asteroids, debris fields, beams,
  gravity wells, and expansion boss attack scripts.
- `18-expansion-rendering-waves.js`: expansion rendering helpers, boss art,
  hazard drawing, overlays, and expansion wave template registration.
- `18-title-input.js`: title-screen meta panel routing, account/settings actions,
  progress-road drag/claim input, and reset-progress confirmation.
- `18-session-input-loop.js`: session setup, resize, input events, update loop,
  and the hidden `#debugSnapshot` smoke-test state when loaded with `?debug=1`.
  Local debug-only `scenario=siphon`, `scenario=debris`,
  `scenario=debris-incoming`, and `scenario=powerups` URLs create deterministic
  QA encounters; `H` toggles hitboxes, anchors, origins, and safe lanes.
- `19-game-achievements.js`: run stat payloads, achievement definitions, and
  online sync hooks called by the game loop.
- `20-firebase-online.js`: Firebase Auth, callable profile/handle services,
  graceful backend-unavailable state, and the explicit recovery competition
  gate. Public score/league submission and leaderboard subscription remain
  disabled until server-issued run verification ships. It intentionally does
  not commit Firebase API keys; it loads config from Firebase Hosting
  `/__/firebase/init.json` or ignored `src/firebase-config.local.json`.

## Firebase Config

Do not commit real Firebase API keys. After rotating the browser key, copy
`src/firebase-config.example.json` to `src/firebase-config.local.json` for local
testing, or deploy on Firebase Hosting so `/__/firebase/init.json` supplies the
config at runtime. Restrict the rotated key in Google Cloud to the intended web
origins and Firebase APIs.

When expanding the game, prefer adding new behavior to the nearest existing system
file. If a file grows past a single clear responsibility, split it by entity type,
screen, or rendering layer before adding more unrelated code.
