# Security Review — 2026-08-20

A genuine Codex Security diff scan reviewed all 46 changed security-relevant
source files in this release candidate. The scan completed with one High and
one Medium finding. This repository document is a sanitized resolution summary;
it contains no account identifiers, credentials, or local filesystem paths.

## Validated findings and resolution

### Browser event telemetry was not authoritative (High)

The proposed record path ignored a caller-supplied numeric score, but a modified
browser could still fabricate plausible kill events. An executable proof showed
that 24 invented Splitter events passed the ledger validator and produced a
calculated score. That is not sufficient integrity for public World Records.

Resolution: client competition writes, server competition writes, verified-run
sessions, and run-progression writes are all fail-closed. The Records Network
labels existing server entries as an archive and states that public writes and
Weekly Leagues are paused. The callable gate rejects before authentication or
Firestore access. Re-enabling requires a trusted authoritative run verifier,
not another browser plausibility check.

### Abandoned run sessions could accumulate (Medium)

The dormant start endpoint created a new persistent session for every allowed
request. A per-UID throttle bounded bursts but did not bound retained abandoned
documents.

Resolution: the future-facing implementation now reuses one active unexpired
session per UID, clears the active pointer on submission, and schedules bounded
cleanup of expired session documents. The public gates remain closed.

## Preserved controls

- Firestore browser writes remain denied.
- Provider email, Google name, avatar, Firebase UID, and credentials are not
  exposed as public pilot identity.
- Callable payload and per-UID rate limits remain enforced.
- Handle changes remain transactional and globally unique.
- Account deletion retains its 72-hour cancellation period and Admin-only purge.
- App Check is prepared but not claimed as enforced.
- Hosting/backend release markers must match the exact release commit.

## Release gate

No production release may advertise public records as authoritative or enable
Weekly League scoring while the authoritative-verifier gate remains unmet.
