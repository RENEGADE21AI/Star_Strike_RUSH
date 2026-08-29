# Source Layout

The game still runs as ordered browser scripts. Keep new files loaded in `index.html`
after the files they depend on, because the current code intentionally shares globals.

- `00-asset-manifest.js`: sprite render metadata, anchors, projectile origins,
  tuned collision circles, preload state, and procedural fallback bridge.
- `00-accessible-surface.js`: semantic action overlays, live status, modal focus
  containment, and focus restoration for the Canvas interface.
- `00-competition.js`: unique changeable public-handle normalization, UTC weekly
  windows, verified-session activation gates, performance bands, and league labels.
- `00-identity.js`: call-sign validation, neutral identity generation, and the
  public-profile field whitelist.
- `00-gameplay-rules.js`: deterministic Debris Warden routes, Siphon aim/range,
  forward-thrust spacecraft steering, asteroid durability, and boss actions.
- `00-input-actions.js`: explicit gameplay actions and meaningful-input mode
  switching for keyboard, mouse, touch, and pen.
- `00-onboarding-state.js`: versioned First Flight persistence, explicit
  one-time choice routing, centralized instructor identity, checkpoint mapping,
  post-graduation identity routing, input-specific prompts, launch timing, and the
  tutorial no-progression gates.
- `00-runtime.js`: deterministic fixed-step simulation clock, render-rate
  independence, long-background-gap clamping, and bounded backing-canvas DPR.
- `00-verified-run-runtime.js`: browser boundary for versioned run random
  streams and compact RLE/IndexedDB canonical input recording; competition remains gated
  until the headless replay worker is authoritative.
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
  spawn plans, action completion predicates, reusable arrival/dissipation math,
  isolated boss overrides, recovery, and one-time graduation Codex policy.
- `08-title-screen.js`: title formations, title input geometry, menu hit testing.
- `09-rendering-controls.js`: shared rounded glass button, pressed-state, and
  icon drawing helpers used across title panels and terminal states.
- `10-rendering-ships.js`: enemy, boss, formation, and menu ship art.
- `11-rendering-title-effects.js`: title sun, menu flights, encounter cards.
- `12-rendering-title-panels.js`: identity/settings, explicit ON/OFF controls,
  global and weekly records, the categorized achievement vault, Codex, and
  isolated destructive reset confirmation.
- `00-glory-progression.js`: canonical browser Glory Road, Prestige, rank, and
  repeating milestone math.
- `12-progress-road-data.js`: the single Glory Road's continuous absolute
  rank/checkpoint nodes and scalable Prestige-aware detail payloads.
- `12-rendering-progress-road.js`: winding Glory Road layout and rendering.
- `12-glory-celebration.js`: ordered checkpoint, rank-up, and Prestige rollover
  presentation after progression is applied at Game Over.
- `13-rendering-title-screens.js`: title identity hierarchy and the score-first
  end-of-run flight-record composition.
- `14-rendering-player.js`: background and player ship rendering.
- `15-rendering-entities.js`: wingmen, bullets, enemies, bosses, powerups, particles.
- `16-rendering-hud.js`: top-left paid pause control, guarded restart/exit
  confirmation, compact backed top-right score block, edge-safe bottom-left
  Ghost/Health instrument, inactivity-only controls hint, touch controls,
  warnings, and damage flash.
- `17-rendering-scene.js`: outer fog, top-level draw orchestration, and the
  time-based top-down galaxy transit shared by title Play and First Flight.
- `17-tutorial-onboarding.js`: First Flight runtime director, accessible
  Colonel/objective surfaces, replaceable Colonel Arisaka portrait boundary
  with the registered owner-supplied portrait and geometric load-failure
  fallback, eased player/enemy lesson staging, checkpoints, tutorial
  presentation, and adaptive optional post-graduation identity flow.
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
- `18-accessible-actions.js`: semantic keyboard and assistive-technology routes
  that invoke the existing title, panel, pause, reset, and Game Over actions.
- `18-session-input-loop.js`: session setup, resize, input events, arrival and
  dialogue control/simulation locks, reconnect asset recovery, resize-safe
  pointer cancellation, update loop,
  and localhost-only automated QA instrumentation. The production build removes
  scenarios and hidden snapshots. Player-facing phase skips, hitbox toggles,
  and developer stat controls are not part of the runtime.
- `19-game-achievements.js`: per-run and lifetime achievement ladders, progress
  metrics, run stat payloads, and account-identity hooks called by the game loop.
- `20-firebase-online.js`: Firebase Auth, unique mutable handles, automatic
  strongest whole-save account/device resolution, 72-hour deletion controls,
  server-issued run sessions, World Records, Weekly Leagues, and graceful
  backend-unavailable state. It intentionally does not commit Firebase API keys;
  it loads config from Firebase Hosting
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
