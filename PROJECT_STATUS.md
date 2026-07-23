# Project Status

Last audited: 2026-07-23

This file is the release truth table. A feature listed as disabled or deferred
must not be described elsewhere as production-ready.

## Stable and verified

| Area | State | Evidence |
| --- | --- | --- |
| Local keyboard/touch play | Stable | Real Chromium start, move, ability, pause, resume, and touch tests |
| Runtime clock | Stable | Fixed-step equivalence at 30/60/90/120 Hz and long-gap clamping tests |
| Collision system | Stable | Object-only API, overlap/miss, boss-circle, and spawn-scale tests |
| Sprite presentation | Stable | Explicit player/wingman/hostile orientation, anchors, weapon/exhaust metadata |
| Powerups | Stable | 13 optimized icons, falling rotation, ship-safe size, no dotted ring |
| Boss staging | Stable | Incoming bosses remain at full HP and non-damageable until first attack |
| Debris Warden | Stable | Single-heavy rows, rare reachable doubles, HP speed scaling, growth-in |
| Pause/focus behavior | Stable | Simulation and active run duration freeze; focus loss auto-pauses |
| Local profile/meta | Stable | Call-sign autosave, achievements, Glory/Season roads, local settings |
| Accessibility toggles | Stable/local | Persisted reduced motion, reduced flash, high contrast; Chromium regression coverage |
| Existing leaderboard reads | Stable/authenticated | Authenticated users can read the existing public leaderboard |
| Firestore authorization | Stable | 4 emulator suites prove anonymous denial, owner privacy, bounded public reads, and browser-write denial |
| Callable resource policy | Stable | Five Functions share explicit timeout, concurrency, memory, and maximum-instance ceilings |
| Deployment payload | Stable | Allowlisted `dist/`; originals, tests, docs, backend, and local config excluded |

## Functional when Firebase is configured

| Area | State | Boundary |
| --- | --- | --- |
| Google sign-in/out | Configuration-dependent | Requires authorized domains and a human account smoke test |
| Private profile sync | Configuration-dependent | Uses callable Functions; local play remains available on failure |
| Unique `@handle` claim | Configuration-dependent | Atomic callable claim; immutable/account-bound by current UI contract |
| Season reward sync | Configuration-dependent | Callable source and Firestore model exist; signed-out claims remain local |

Provider display name, avatar, and email remain in Firebase Authentication only;
game profile documents no longer duplicate them. Public payload builders and
rules whitelist game identity and game stats only.

## Intentionally disabled

| Area | Reason |
| --- | --- |
| Public best-score submission | Plausibility checks cannot prove a browser run actually occurred |
| Weekly Flight League scoring/enrollment | Depends on trustworthy accepted runs; UI shows a preseason fair-play hold |

The client-side gate is `COMPETITIVE_MODE_ENABLED = false` in
`src/00-competition.js`. The matching server gate is closed in
`functions/competition.js` and runs before authentication or payload handling
in both competition callables. Re-enabling either is not a copy change; the
security work below must ship first.

## Deferred before public competition

- Server-issued, expiring run sessions bound to authenticated users.
- Replay or signed telemetry sufficient to validate movement, score, phase,
  duration, damage, drops, and boss outcomes.
- Firebase App Check enforcement and per-user/IP abuse throttles.
- Idempotent offline submission outbox with retry/backoff and expiry.
- Real-account auth, cross-device, reconnect, concurrency, and abuse testing.
- Account migration and handle recovery UX.
- Synced accessibility settings.
- Music and haptics. Procedural gameplay/UI sound effects now ship with an
  independent persisted on/off control.

## Verification commands

```powershell
npm ci
npm test
npm run build
npm audit --omit=dev --audit-level=high
npm audit --prefix functions --omit=dev --audit-level=high
```

Current local hardening evidence: 56/56 core tests and 4/4 Firestore emulator
authorization suites pass, while 15 browser visual states pass. The shipped root
dependency audit has zero production findings, and the Function audit has no
high/critical finding. Eight moderate transitive findings remain in the Function
tree; npm's suggested forced resolution is breaking, so they were not hidden by
an unsafe downgrade.

## Release policy

1. Merge only with green GitHub verification and secret scanning.
2. Build `dist/` from the merged commit.
3. Deploy matching Functions before Hosting when a client release changes the
   callable contract or competition state.
4. Never deploy restrictive Firestore rules without their matching Functions.
5. Smoke-test the public URL, required assets, security headers, and private-path
   404 behavior after deployment.
