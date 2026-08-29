# Validation report

Status: PASS for the cycle 33 source and local-build gate.

## Implemented evidence

- Cursor payloads now use version 2 and include a SHA-256-derived, base64url scope fingerprint.
- Patient allow-list fingerprints sort IDs before hashing; owner and global scopes use disjoint canonical prefixes.
- Decode rejects any version, date, scope, or keyset-ID mismatch without exposing cursor internals.
- The therapy route computes access once and uses it for decode, `buildTherapySlotPage`, and next-cursor encoding.
- The underlying page query still applies patient ACL independently, so cursor state cannot grant access.

## Verification

- Focused cursor/scope tests: 6/6 PASS.
- Backend TypeScript/Prisma build: PASS.
- Changed backend ESLint: PASS.
- `git diff --check`: PASS.
- Security reviewer: PASS, no P0/P1.
- UX/performance reviewer: PASS, no P0/P1/P2.

## Environment gates

- Production deploy remains blocked until Vercel/Railway project credentials, target Entra configuration, PostgreSQL access, and rollback authority are available.
