# Project Status

Last audited: 2026-07-22

This file is the release truth table. A feature listed as disabled or deferred
must not be described elsewhere as production-ready.

## Stable and verified

| Area | State | Evidence |
| --- | --- | --- |
| Local keyboard/touch play | Stable | Real Chromium start, move, ability, pause, resume, and touch tests |
| Runtime clock | Stable | Fixed-step equivalence at 30/60/90/120 Hz and long-gap clamping tests |
| Collision system | Stable | Object-only API, overlap/miss, boss-circle, and spawn-scale tests |
| Sprite presentation | Stable | Explicit player/hostile orientation, anchors, weapon/exhaust metadata |
| Powerups | Stable | 13 optimized icons, falling rotation, ship-safe size, no dotted ring |
| Boss staging | Stable | Incoming bosses remain at full HP and non-damageable until first attack |
| Debris Warden | Stable | Single-heavy rows, rare reachable doubles, HP speed scaling, growth-in |
| Pause/focus behavior | Stable | Simulation and active run duration freeze; focus loss auto-pauses |
| Local profile/meta | Stable | Call-sign autosave, achievements, Glory/Season roads, local settings |
| Accessibility toggles | Stable/local | Reduced motion, reduced flash, high contrast |
| Deployment payload | Stable | Allowlisted `dist/`; originals, tests, docs, backend, and local config excluded |

## Functional when Firebase is configured

| Area | State | Boundary |
| --- | --- | --- |
| Google sign-in/out | Configuration-dependent | Requires authorized domains and a human account smoke test |
| Private profile sync | Configuration-dependent | Uses callable Functions; local play remains available on failure |
| Unique `@handle` claim | Configuration-dependent | Atomic callable claim; immutable/account-bound by current UI contract |
| Season reward sync | Configuration-dependent | Callable source and Firestore model exist; signed-out claims remain local |

Provider display name, avatar, and email are private. Public payload builders and
rules whitelist game identity and game stats only.

## Intentionally disabled

| Area | Reason |
| --- | --- |
| Public best-score submission | Plausibility checks cannot prove a browser run actually occurred |
| Weekly Flight League scoring/enrollment | Depends on trustworthy accepted runs; UI shows a preseason fair-play hold |
| Public leaderboard subscription | Avoids presenting stale/unverified scores as a live competition |

The client-side gate is `COMPETITIVE_MODE_ENABLED = false` in
`src/00-competition.js` and is covered by automated tests. Re-enabling it is not
a copy change; the security work below must ship first.

## Deferred before public competition

- Server-issued, expiring run sessions bound to authenticated users.
- Replay or signed telemetry sufficient to validate movement, score, phase,
  duration, damage, drops, and boss outcomes.
- Firebase App Check enforcement and per-user/IP abuse throttles.
- Idempotent offline submission outbox with retry/backoff and expiry.
- Real-account auth, cross-device, reconnect, concurrency, and abuse testing.
- Account migration and handle recovery UX.
- Synced accessibility settings.
- Audio, music, and haptics with independent accessible controls.

## Verification commands

```powershell
npm ci
npm test
npm run build
npm audit --omit=dev --audit-level=high
npm audit --prefix functions --omit=dev --audit-level=high
```

Current local recovery evidence: 30/30 tests pass, 11 browser visual states pass,
the root dependency audit has zero findings, and the Function audit has no
high/critical finding. Nine moderate transitive findings remain in the Function
tree; npm's suggested forced resolution is breaking, so they were not hidden by
an unsafe downgrade.

## Release policy

1. Merge only with green GitHub verification and secret scanning.
2. Build `dist/` from the merged commit.
3. Deploy Hosting only for client/visual releases.
4. Never deploy restrictive Firestore rules without their matching Functions.
5. Smoke-test the public URL, required assets, security headers, and private-path
   404 behavior after deployment.
