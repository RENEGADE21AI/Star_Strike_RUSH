# Star Strike RUSH

Star Strike RUSH is a portrait-first Canvas 2D arcade shooter. Automatic fire,
responsive movement, powerup builds, adaptive pressure, achievements, upward
progression roads, and staged boss encounters are designed for short keyboard
or touch runs.

Hangar Bay Seven scores title/profile navigation; Gravity's Edge takes over
during gameplay with a time-based crossfade. The first meaningful gesture
unlocks and loads title music; gameplay music is deferred until launch. Music
and Effects have independent persisted controls.

On devices with no saved onboarding decision, **Colonel Arisaka** asks one
explicit question: “Is this your first time here, pilot?” Choosing Yes opens a
separate prelaunch briefing and the four-to-six-minute **First Flight**;
choosing No stores the decision and opens the normal title. First Flight teaches movement,
automatic weapons, Ghost Shift, a staged Command Ship, Realm Hop, and the
Wraith Sovereign through deterministic gameplay. Training is skippable,
checkpointed, replayable from Settings, and cannot change normal score,
progression, achievements, receipts, competition state, or Firebase
progression. Optional Google identity appears only after graduation.

Play: https://star-strike-rush.web.app

## Controls

- Move: WASD or arrow keys.
- Ability: Space, Shift, or E.
- During the Debris Warden encounter the ability becomes a fast, non-phasing
  `DASH`; asteroids remain solid hazards.
- Touch or pen: use the virtual joystick and ability button. They appear only
  after meaningful touch/pen gameplay input.
- Pause: the top-left HUD control or Escape. A deliberate standard-run pause
  costs one Health bar and reports the cost. Manual pauses are free during
  First Flight, while automatic focus/visibility pauses still cost one Health.
  Gameplay resumes through a short countdown.
- HUD: Energy sits above segmented Health in the classic bottom-left layout;
  Score, Hi-Score, and Combo stay compact at the top-right.

Boss encounters render their supplied boss artwork. The Wraith Sovereign uses
physical and ghost palettes derived from one canonical sprite with identical
dimensions and alpha at every pixel, preserving the exact silhouette and weapon
geometry while changing only realm color. Ghost Shift renders one translucent,
brightly glowing fighter rather than a stack of afterimages.

The presentation uses one compact visual language from first launch through
Game Over: glass-edged panels, clear primary and destructive actions, readable
single-column mobile achievement cards, an unobtrusive combat HUD, and a
score-focused end-of-run summary. Settings expose explicit ON/OFF state and
apply immediately on this device. Reset Local Data remains a separate,
plain-language destructive confirmation.

## Run locally

Install dependencies, start the repository's safe static server, then open
`http://127.0.0.1:4173`:

```powershell
npm ci
node scripts/serve-static.js 4173
```

The app must be served over HTTP; `file://` is not supported. Automated browser
and visual suites own their localhost-only deterministic instrumentation.
Developer phase skips, hitbox toggles, and player-facing debug controls have
been removed. The production build strips QA scenarios and debug snapshots.

## Verify and build

```powershell
npm test
npm run test:rules
npm run test:firebase-client
npm run test:visual
npm run build
```

`npm test` runs the Node contract tests and real Chromium gameplay tests.
Its First Flight coverage completes the entire tutorial through real keyboard
and touch input, including actual movement, automatic-fire kills, Ghost Shift,
pickup collision, and both bosses.
`npm run test:rules` starts the Firestore emulator and verifies the deployed
read/write authorization boundary with authenticated and unauthenticated users.
`npm run test:firebase-client` runs the browser Firebase SDK against Auth,
Firestore, and Functions emulators. It verifies account switching, one-owner
hydration, pending call-sign publication, the achievement aggregate, and that
account actions never replace device progress. `npm run test:visual` starts its
own local server, drives layout-derived controls in Chromium, asserts touch
scrolling, HUD clearance, terminal states, panel navigation, and motion
behavior, and writes screenshots plus a JSON report under
`test-artifacts/visual-qa/` (with traces on failure).
`npm run build` creates a deployment-only `dist/` directory containing the
runtime, optimized assets, manifest, styles, and `version.json`. HTML, scripts,
styles, manifest assets, and runtime assets receive one commit-version tag;
HTML and `version.json` are served with `Cache-Control: no-store`. The build
excludes original artwork, tests, documentation, local Firebase configuration,
and backend source.

Use the guarded release workflow rather than deploying individual resources:

```powershell
.\scripts\release.ps1 -CheckOnly
.\scripts\release.ps1 -StageBackendPreview
# Only after exact-preview human evidence and owner approval:
.\scripts\release.ps1 -Production -ApprovalFile .\release-approval.local.json
```

Run releases with Node.js 22, matching the Functions runtime and GitHub
verification job. The script refuses other Node majors before contacting
Firebase so a host-runtime mismatch cannot produce a partial release.
Check-only is the safe default. Staging calculates the full release range from
the current production `version.json` (or a reviewed explicit full SHA), deploys
the exact-SHA Functions, deploys the tested Rules idempotently, deploys changed
indexes, creates a commit-named Hosting preview, verifies Hosting and backend
SHAs, proves that Google Identity accepts the exact preview origin, then stops.
Production requires a local ignored approval file tied to that exact SHA and
preview. Hosting deploys last. See
`docs/RELEASE_WORKFLOW.md`.

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
- no player-facing developer shortcuts or phase skips in the shipped build.

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

Pending local call-sign intent temporarily wins so an offline edit remains
visible. When no pending intent exists, the server-confirmed call sign is
authoritative and refreshes the UID-scoped published cache. Sign-out clears the
runtime pending indicator but preserves that account's private pending entry for
retry when the same account returns.

Ordinary clients cannot invoke the achievement migration. The Admin-only,
dry-run-by-default command is:

```powershell
npm run migrate:achievements --prefix functions
npm run migrate:achievements --prefix functions -- --apply
npm run migrate:public-profiles --prefix functions
npm run migrate:public-profiles --prefix functions -- --apply
```

Both commands default to a dry run, require Admin credentials, and refuse an
unexpected Firebase project. Never commit a service-account key. Achievement
apply requires explicit owner approval after reviewing the sanitized dry-run.

App Check support is prepared behind
`serverAppCheckEnforced = false`. To enable it in a future verified release,
register the web app and provider in Firebase Console, monitor App Check
metrics, configure callable enforcement, test emulator/local exemptions, and
only then change and deploy the flag. This repository does not claim live App
Check enforcement.

Google auth requires every Hosting preview/custom domain used for sign-in to be
listed under Firebase Console → Authentication → Settings → Authorized
domains and allowed by the Firebase browser API key's referrer restrictions.
The release smoke reads Hosting's generated Firebase config and performs a
non-account Identity Toolkit initiation check from the exact staged origin;
staging fails before human testing when either boundary rejects it.
Popup-blocked/mobile environments fall back to redirect, boot consumes
`getRedirectResult()` without starting a second hydration owner, and failed
sign-in details remain sanitized and visible beside `SIGN IN FAILED`.

## Artwork

The repository preserves 45 supplied original images under ignored-from-Hosting
`source-art/` and ships 47 optimized derivatives under `assets/`: 26 gameplay
sprites, 13 powerup icons, and 8 menu/PWA icons. The import pipeline removes
baked checkerboards, trims transparent padding, downsizes files, and keeps
collision geometry separate from decorative pixels. Procedural Canvas art
remains a resilient fallback only.

The game is deterministic/rule-based; no AI model runs inside the game.

On 2026-07-28, the project owner explicitly confirmed authorization to publicly
distribute both MP3 files as part of the Star Strike RUSH website. No artist,
source URL, or formal license name is inferred; see `docs/ASSET_MANIFEST.md`.
