# Star Strike RUSH

Star Strike RUSH is a portrait-first browser arcade shooter built with the
Canvas 2D API. Short runs combine automatic fire, readable enemy formations,
energy-powered Ghost movement, boss encounters, achievements, Glory ranks, and
optional Firebase-backed records.

Play: https://star-strike-rush.web.app

## Controls

- Move: WASD or arrow keys
- Ghost Dash / realm hop: Space, Shift, or E
- Debris Warden encounter: the action becomes `DASH`; it boosts movement but
  does not phase through asteroids
- Touch or pen: virtual joystick and action button appear after meaningful
  touch gameplay input and stay hidden for ordinary desktop input

## Run locally

Serve the repository root over HTTP; opening `index.html` through `file://` is
not supported.

```powershell
python -m http.server 4173
```

Then open `http://127.0.0.1:4173`.

## Test

```powershell
$testFiles = Get-ChildItem tests -Filter *.test.js | ForEach-Object { $_.FullName }
node --test $testFiles
```

Syntax-check all browser scripts with `node --check src/<file>.js`. Firebase
callable code lives in `functions/` and uses Node 20.

## Architecture

The game remains a lightweight ordered-script Canvas application. Pure runtime
contracts are isolated in `src/00-*.js`: asset metadata and hitboxes, public
identity and weekly competition rules, boss fairness/Siphon rules, and input actions. Stateful systems remain
split by responsibility across entity, collision, boss, rendering, title, and
online modules. See `src/README.md` and `docs/ASSET_MANIFEST.md`.

Debug URLs are development-only behavior: `?debug=1&scenario=siphon` and
`?debug=1&scenario=debris` create deterministic encounters. `H` toggles the
hitbox/safe-lane overlay, or `&hitboxes=1` opens directly with it visible.

## Current feature status

- Signed-out local play, call-sign persistence, achievements, Glory, Season
  Road, and settings work without Firebase.
- Google sign-in and online records degrade to an explicit unavailable state
  when Firebase configuration is missing.
- Public records contain only call sign and game statistics; provider identity
  remains private.
- Optimized transparent player, enemy, boss, and asteroid sprites live in
  `assets/sprites/`; procedural Canvas art remains a resilient fallback.
- Editable call signs are local-first. Unique account-bound `@handles` and
  prior-performance weekly leagues are implemented behind server callables.
- Competition callables are not live until the Firebase project is upgraded to
  Blaze. The client reports this honestly and keeps local play available.
- The game is rule-based; no AI model runs inside the game.

See `BUILD_WEEK_2026.md` for the competition transformation and verification
record.
