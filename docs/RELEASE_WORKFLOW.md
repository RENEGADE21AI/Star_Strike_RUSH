# Firebase Release Workflow

Star Strike RUSH uses Node.js 22 and the locked repository Firebase CLI. The
release model is `automatic_best_account_or_device`. Whole-save automatic
account/device replacement is enabled. World Record publication, Weekly Leagues, and run-progression
writes are fail-closed pending an authoritative verifier. App Check enforcement
remains disabled and must not be claimed live.

## Release stages

Run from a clean `main` whose commit matches `origin/main`:

```powershell
.\scripts\release.ps1 -CheckOnly
.\scripts\release.ps1 -StageBackendPreview
```

`-CheckOnly` needs no Firebase credentials, validates the configured project
locally, and changes no resources. `-StageBackendPreview`:

1. verifies repository, branch, Node 22, clean state, origin, and authenticated
   access to Firebase project `star-strike-rush`;
2. runs dependencies, unit/browser tests, Rules and real-client emulators,
   asserted visual QA, production dependency audits, build, and secret scan;
3. reads the last production SHA from `/version.json`, or accepts a reviewed
   full SHA through `-BaselineCommit`;
4. compares the complete `baseline...release` range for Functions, Rules,
   indexes, and Hosting;
5. generates a backend identity from the exact release SHA and deploys
   Functions;
6. deploys the exact emulator-tested Rules idempotently after Functions;
7. deploys indexes only when the complete range changed them;
8. deploys a commit-named Hosting preview and verifies headers, private 404s,
   release identity for every active callable, retirement of the Season
   compatibility callable, Google Identity acceptance of the exact preview origin, and
   equality of intended, Hosting, and backend SHAs;
9. writes a sanitized ignored staging report and stops before live Hosting.

If production has no readable `version.json`, pass a reviewed ancestor:

```powershell
.\scripts\release.ps1 -StageBackendPreview -BaselineCommit <full-40-character-sha>
```

Do not use the previous commit as an implicit baseline.

## Release approval

Copy `release-approval.template.json` to `release-approval.local.json`. The
local file is ignored by Git. Record only directly verified booleans and
sanitized counts—never emails, Firebase UIDs, names, avatars, tokens, cookies,
auth headers, or passwords.

The approval must match the exact staged SHA and preview URL. By default it
must cover:

- Account A sign-in, call-sign publication, sign-out, and re-entry;
- Account B identity isolation;
- byte-for-byte unchanged device progression through all account actions;
- no provider identity in public game data;
- achievement migration disposition;
- explicit project-owner authorization to publicly distribute both MP3 files.

An explicit project-owner decision may waive only the real Account A/B smoke
portion. A waiver is not a test result: every unverified account-result boolean
must remain `false`. Set the schema-v2 `accountSmokeWaiver` disposition to
`owner_waived`, record the UTC authorization time, and invoke production with
the additional `-AcceptOwnerAccountSmokeWaiver` switch. The validator requires
both the sanitized waiver record and the conscious command-line switch; it
continues to require exact preview/backend SHA parity, migration disposition,
music authorization, build integrity, security headers, private 404s, and all
closed callable checks.

The 2026-07-28 owner authorization covers
`assets/audio/hangar-bay-seven.mp3` and
`assets/audio/gravitys-edge.mp3` for public distribution as part of Star Strike
RUSH. It does not assert an artist, source URL, or named license.

Production then uses:

```powershell
.\scripts\release.ps1 -Production -ApprovalFile .\release-approval.local.json
```

For an explicitly owner-waived account smoke:

```powershell
.\scripts\release.ps1 -Production `
  -ApprovalFile .\release-approval.local.json `
  -AcceptOwnerAccountSmokeWaiver
```

The script validates the approval, re-verifies the preview/backend SHA pair,
rebuilds the exact commit, deploys production Hosting last, and smoke-tests the
live URL. It never deploys production Functions or Rules from the approval
step; those must already be the exact staged backend.

The Google Identity smoke is non-account and transmits no pilot identity. It
reads `/__/firebase/init.json`, then asks Identity Toolkit to create the Google
authorization URI using the deployed origin as both the referrer and continue
URI. A blocked browser-key referrer or unauthorized origin fails staging before
the Account A/B checkpoint.

## Admin migrations

Use Application Default Credentials or another owner-approved ephemeral Admin
credential flow. Do not create or commit a service-account JSON key.

```powershell
npm run migrate:achievements --prefix functions
npm run migrate:public-profiles --prefix functions
```

Both are dry-run by default. Review only sanitized totals. Run either command
with `-- --apply` only after explicit owner approval, then rerun its dry-run and
require zero remaining changes.

For the currently approved achievement migration, apply is authorized only if
the fresh production dry run remains exactly one account, 15 valid unlocks,
zero invalid IDs, and one aggregate reconstruction. Any material difference
stops the apply.

First Flight preview staging follows the same exact-SHA flow. Tutorial browser
and visual evidence must be green before merging, and the preview may be
deployed after merge. Account smoke remains the default production gate; any
owner waiver is recorded separately and never represented as a passed test.

The public-profile cleanup preserves the maximum legacy score and phase in
`legacyBestScore` and `legacyPhase`, retains verified fields without deriving
them from legacy data, creates an opaque `publicPilotId`, and deletes redundant
or ambiguous public fields. It does not delete `leaderboard_scores`.
