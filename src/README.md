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
- `00-onboarding-state.js`: versioned First Flight persistence, explicit
  one-time choice routing, centralized instructor identity, checkpoint mapping,
  post-graduation identity routing, input-specific prompts, launch timing, and the
  tutorial no-progression gates.
- `00-runtime.js`: deterministic fixed-step simulation clock, render-rate
  independence, and long-background-gap clamping.
- `01-core.js`: canvas handles, constants, persistent settings, global state, scoring.
- `02-audio.js`: throttled procedural Web Audio effects, gesture-safe looping
  title/gameplay music with state crossfades, and the persisted audio preference.
- `02-effects-powerups.js`: particles, rotating artwork-backed drops, wingmen,
  pickup bursts, ghost action, and star updates.
- `03-pacing.js`: phase timing, pressure, difficulty, and bullet budget.
- `04-waves.js`: wave templates, wave selection, codex discovery, wave spawning.
- `05-entities.js`: enemy spawning, player shots, bullet and wingman updates.
- `06-bosses.js`: boss spawning, boss attacks, boss death effects.
- `07-gameplay-systems.js`: enemy movement, collisions, powerups, phase/wave loop.
- `07-tutorial-director.js`: immutable tutorial step definitions, deterministic
  spawn plans, action completion predicates, isolated boss overrides, recovery,
  and one-time graduation Codex policy.
- `08-title-screen.js`: title formations, title input geometry, menu hit testing.
- `09-rendering-controls.js`: shared button and icon drawing helpers.
- `10-rendering-ships.js`: enemy, boss, formation, and menu ship art.
- `11-rendering-title-effects.js`: title sun, menu flights, encounter cards.
- `12-rendering-title-panels.js`: identity/settings, global and weekly records,
  the categorized achievement vault, Codex, and reset-confirm panels.
- `12-progress-road-data.js`: Glory Road and Season Road reward tables, detail
  payloads, and local reward claim logic.
- `12-rendering-progress-road.js`: Glory Road and Season Road layout and rendering.
- `13-rendering-title-screens.js`: title screen and game-over screen composition.
- `14-rendering-player.js`: background and player ship rendering.
- `15-rendering-entities.js`: wingmen, bullets, enemies, bosses, powerups, particles.
- `16-rendering-hud.js`: top-left paid pause control, compact top-right score
  block, classic bottom-left Energy/Health status, warnings, and damage flash.
- `17-rendering-scene.js`: outer fog, top-level draw orchestration, and the
  time-based top-down galaxy transit shared by title Play and First Flight.
- `17-tutorial-onboarding.js`: First Flight runtime director, accessible
  Colonel/objective surfaces, replaceable Colonel Arisaka portrait boundary
  with the registered owner-supplied portrait and geometric load-failure
  fallback, checkpoints, tutorial presentation, and adaptive optional
  post-graduation identity flow.
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
- `18-session-input-loop.js`: session setup, resize, input events, arrival and
  dialogue control/simulation locks, update loop,
  and localhost-only automated QA instrumentation. The production build removes
  scenarios and hidden snapshots. Player-facing phase skips, hitbox toggles,
  and developer stat controls are not part of the runtime.
- `19-game-achievements.js`: per-run and lifetime achievement ladders, progress
  metrics, run stat payloads, and account-identity hooks called by the game loop.
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
