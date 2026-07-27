# Star Strike RUSH

Star Strike RUSH is a portrait-first Canvas 2D arcade shooter. Automatic fire,
responsive movement, powerup builds, adaptive pressure, achievements, upward
progression roads, and staged boss encounters are designed for short keyboard
or touch runs.

Hangar Bay Seven scores title/profile navigation; Gravity's Edge takes over
during gameplay with a time-based crossfade. The first meaningful gesture
unlocks and loads title music; gameplay music is deferred until launch. Music
and Effects have independent persisted controls.

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
- `?debug=1&scenario=wingman`
- append `&hitboxes=1` to inspect collision geometry

Debug snapshots, scenarios, hitboxes, and developer shortcuts are gated to
`localhost` and `127.0.0.1`.

## Verify and build

```powershell
npm test
npm run test:rules
npm run test:firebase-client
npm run test:visual
npm run build
```

`npm test` runs the Node contract tests and real Chromium gameplay tests.
`npm run test:rules` starts the Firestore emulator and verifies the deployed
read/write authorization boundary with authenticated and unauthenticated users.
`npm run test:firebase-client` runs the browser Firebase SDK against Auth,
Firestore, and Functions emulators. It verifies account switching, one-owner
hydration, pending call-sign publication, the achievement aggregate, and that
account actions never replace device progress. `npm run test:visual` starts its
own local server, drives layout-derived controls in Chromium, asserts touch
scrolling and motion behavior, and writes screenshots plus a JSON report under
`test-artifacts/visual-qa/` (with traces on failure).
`npm run build` creates a deployment-only `dist/` directory containing the
runtime, optimized assets, manifest, styles, and `version.json`. HTML, scripts,
styles, manifest assets, and runtime assets receive one commit-version tag;
HTML and `version.json` are served with `Cache-Control: no-store`. The build
excludes original artwork, tests, documentation, local Firebase configuration,
and backend source.

Use the guarded release workflow rather than deploying individual resources:

```powershell
.\scripts\release.ps1
# Only after preview evidence and explicit approval:
.\scripts\release.ps1 -Production
```

Run releases with Node.js 22, matching the Functions runtime and GitHub
verification job. The script refuses other Node majors before contacting
Firebase so a host-runtime mismatch cannot produce a partial release.
Preview is the default. The script verifies repository/branch/clean-state
invariants, uses the locked CLI through `npx firebase`, runs tests, emulators,
audits, build, and smoke checks, and requires `-Production` for a live release.
Functions deploy before matching Firestore rules; Hosting deploys last.

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
- device-local gameplay progression that account operations cannot replace;
- exact browser/test Firebase SDK parity at `12.16.0`;
- one canonical 79-entry achievement catalog generated for browser and server.

See `src/README.md`, `docs/ASSET_MANIFEST.md`, and `PROJECT_STATUS.md` for the
detailed contracts and current support boundary.

## Preseason authority and Firebase boundary

`PROGRESSION_AUTHORITY = "device_local_preseason"` is the release model until
verified run sessions exist:

- Gameplay progression is **DEVICE PROGRESS** and authoritative on this device.
- Firebase provides **ACCOUNT IDENTITY** and a **LEGACY ACCOUNT ARCHIVE**.
- Sign-in, auth restoration, refresh, account switching, and account call-sign
  publication do not change Glory, Season XP, Credits, lifetime statistics,
  high score, claimed rewards, local achievements, or Codex discovery.
- Season rewards always use the device-local path, signed in or signed out.
- Existing `leaderboard_scores` documents are preserved and shown only as a
  **LEGACY/PRESEASON ARCHIVE** with `recordTrust = "legacy_unverified"`.
- New run progression does not publish to Firebase. Public competition, weekly
  enrollment, run receipt, and server Season reward writes are paused by
  separate closed client, competition, and server-progression gates.

Google sign-in activates account identity, an account-scoped published call
sign, an optional immutable `@handle`, one achievement archive aggregate, and
authenticated legacy-archive reads. A failed signed-in call-sign publication is
stored under that Firebase UID and retried after reconnect or restored auth; it
never changes the guest call sign or device progression.

Ordinary clients cannot invoke the achievement migration. The Admin-only,
dry-run-by-default command is:

```powershell
npm run migrate:achievements --prefix functions
npm run migrate:achievements --prefix functions -- --apply
```

App Check support is prepared behind
`serverAppCheckEnforced = false`. To enable it in a future verified release,
register the web app and provider in Firebase Console, monitor App Check
metrics, configure callable enforcement, test emulator/local exemptions, and
only then change and deploy the flag. This repository does not claim live App
Check enforcement.

Google auth requires every Hosting preview/custom domain used for sign-in to be
listed under Firebase Console → Authentication → Settings → Authorized
domains. Popup-blocked/mobile environments fall back to redirect, and boot
consumes `getRedirectResult()` without starting a second hydration owner.

## Artwork

The repository preserves 45 supplied original images under ignored-from-Hosting
`source-art/` and ships 47 optimized derivatives under `assets/`: 26 gameplay
sprites, 13 powerup icons, and 8 menu/PWA icons. The import pipeline removes
baked checkerboards, trims transparent padding, downsizes files, and keeps
collision geometry separate from decorative pixels. Procedural Canvas art
remains a resilient fallback only.

The game is deterministic/rule-based; no AI model runs inside the game.

The two MP3 files were supplied by the project owner. The repository does not
contain an independently verified public-distribution license, authorship
record, or source URL for either track; see `docs/ASSET_MANIFEST.md`.
