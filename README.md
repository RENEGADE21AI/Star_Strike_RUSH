# Star Strike RUSH

Star Strike RUSH is a portrait-first Canvas 2D arcade shooter. Automatic fire,
responsive movement, powerup builds, adaptive pressure, achievements, upward
progression roads, and staged boss encounters are designed for short keyboard
or touch runs.

Play: https://star-strike-rush.web.app

## Controls

- Move: WASD or arrow keys.
- Ability: Space, Shift, or E.
- During the Debris Warden encounter the ability becomes a fast, non-phasing
  `DASH`; asteroids remain solid hazards.
- Touch or pen: use the virtual joystick and ability button. They appear only
  after meaningful touch/pen gameplay input.
- Pause: the HUD pause control or Escape. Gameplay time freezes while paused
  and resumes through a short countdown.

## Run locally

Install dependencies, serve the repository root, then open
`http://127.0.0.1:4173`:

```powershell
npm ci
python -m http.server 4173
```

The app must be served over HTTP; `file://` is not supported. Local-only QA
scenarios include:

- `?debug=1&scenario=siphon`
- `?debug=1&scenario=debris`
- `?debug=1&scenario=debris-incoming`
- `?debug=1&scenario=powerups`
- append `&hitboxes=1` to inspect collision geometry

Debug snapshots, scenarios, hitboxes, and developer shortcuts are gated to
`localhost` and `127.0.0.1`.

## Verify and build

```powershell
npm test
npm run build
```

`npm test` runs the Node contract tests and real Chromium gameplay tests.
`npm run build` creates a deployment-only `dist/` directory containing the
runtime, optimized assets, manifest, and styles. It excludes original artwork,
tests, documentation, local Firebase configuration, and backend source.

For a Hosting-only release:

```powershell
firebase deploy --only hosting
```

Do not deploy Firestore rules by themselves. Backend changes must be reviewed
and deployed together with their matching Functions contract.

## Architecture

The project deliberately keeps a small ordered-script architecture rather than
introducing a framework rewrite. Pure contracts load first: assets/collisions,
identity, competition gates, gameplay rules, input actions, and the fixed-step
clock. Stateful entity, boss, UI, rendering, session, and Firebase modules then
load in the order listed by `index.html`.

Important runtime guarantees include:

- a fixed 60 Hz simulation independent of display refresh rate;
- object-based collision calls with explicit visual/collision scaling;
- per-sprite orientation, anchor, weapon, exhaust, and hitbox metadata;
- boss vulnerability only after staging and the first attack begin;
- automatic pause on focus loss and no in-run announcement popups;
- graceful local play when Firebase is unavailable.

See `src/README.md`, `docs/ASSET_MANIFEST.md`, and `PROJECT_STATUS.md` for the
detailed contracts and current support boundary.

## Current online status

Local play, local progression, editable call signs, settings, achievements, and
the Codex are active. Google sign-in, private profile sync, and unique handle
claims remain configuration-dependent.

Public score submission and weekly Flight League scoring are intentionally
disabled in the recovery client. Existing callable source validates receipts,
but a browser can still fabricate a plausible run; public competition will not
be re-enabled until server-issued run sessions, replay/telemetry verification,
App Check, and abuse controls are implemented and tested. The UI labels this as
a preseason/fair-play hold instead of pretending the leaderboard is verified.

## Artwork

The repository preserves 43 supplied original images under ignored-from-Hosting
`source-art/` and ships 45 optimized derivatives under `assets/`: 25 gameplay
sprites, 13 powerup icons, and 7 menu/PWA icons. The import pipeline removes
baked checkerboards, trims transparent padding, downsizes files, and keeps
collision geometry separate from decorative pixels. Procedural Canvas art
remains a resilient fallback only.

The game is deterministic/rule-based; no AI model runs inside the game.
