# Task Contract — maintenance #470 cleanup, attempt 3

## Task
- Title: Erase authorized demo clinical data, temporary sources and verified demo snapshots
- Slug: maintenance-470-cleanup
- Type: maintenance
- Date: 2026-10-17
- Parent frozen contract and attempt ledger: maintenance-470; attempts 1 failed, 2 passed, 3 running, maximum 4
- Baseline: 7c31be8f, branch codex/demo-470-completion

## Impact Classification
Database/Persistence, OCR/import retention, Privacy/Security, Config/Env: yes. Application UI/API/schema, production environment and auth policy: no changes.

## Current Behaviour
Live read-only run39016118678 verified43 public tables and the actual demo binding. Patients are already zero, but AiAuditEvent1533, ImportJob10, ImportMutation1 and PatientIntakeDraft3 remain. All43 tables are classified; patient-linked audit counts are zero, but unlinked audit payloads may still contain clinical content. Backups and temporary sources are unverified. No new consent is required: the user has authorized removal of all fictional demo clinical data and backups.

## Expected Behaviour
Erase only clinical/import/draft/mixed records on the exact verified demo. Preserve all13 account/catalog/configuration tables byte-for-byte. Independently prove zero clinical records, preserve schema/FKs/trigger states, inspect/erase actual temporary import files and snapshots only for the exact demo database volume, then verify the actual online empty UI after reload. No new persistent backup is created.

## Acceptance Criteria
- AC1: Pin project bddf5d1b-ee83-4362-8238-a79721f795e5; demo environment8021987e-8eaa-4bc8-a102-20566db5e6b4; backendc000f011-0349-4ea9-9b56-13c625b5767b and domainclinicos-backend-demo.up.railway.app; private Postgres hostpostgres.railway.internal/databaserailway. Require catalog43 SHA25614770fae19038e341ae47af4e4301536592b25cae25f14085260cd017df2e7d6. Every mismatch/unknown schema fails before data mutation.
- AC2: Preserve exactly AuthzPolicyVersion, Bed, Farmaco, FarmacoImport, FarmacoPrincipioAttivo, Operator, OperatorRosterPreference, OperatorSchedule, Room, RosterContext, RosterEpoch, User, _prisma_migrations. All other30 known tables, including the three mixed audit/note tables, are explicitly selected. Reject FK closure into preserved/unknown/cross-schema tables, inactive FK triggers, invalid constraints and unsupported row security.
- AC3: Lock all known tables against concurrent writes. In one transaction capture aggregate preserved-content digests and trigger states; temporarily disable only non-internal triggers on the30 targets; TRUNCATE the complete explicit target list WITHOUT CASCADE or RESTART IDENTITY; restore original trigger states; verify every target zero and preserved content/schema/FK invariants unchanged before commit. Any failure rolls back all changes. Do not increment preserved RosterEpoch; service memory/cache clearing is a separate verified step.
- AC4: Reuse reviewed read-only inventory for a fresh independent post-commit connection. Retain only metadata/counts in logs. Worker is private, volume-free, target-bound and uniquely owned; persist safe service ID metadata, eight-minute operational deadline and separate90-second cleanup budget. No secret values, rows, document bytes or raw driver errors enter artifacts.
- AC5: Actual source storage is not inferred from empty SQL. PatientDocument/ImportDocument bytes are persisted in Postgres; older temporary source files use backend AI_UPLOAD_DIR, default /tmp/clinicos-imports. Verify demo service/volume identity, use ordinary Railway service access for aggregate file inventory and exact default-directory removal without following symlinks; reject custom/unexpected paths, volumes or permission failures. Verify the resulting directory empty. Runtime in-memory job caches need a verified fresh process/restart and demo binding/volume checks; no unknown mounted storage may be claimed empty.
- AC6: Read demo-native volume metadata. Resolve the actual PostgreSQL service by private hostname and identical database binding, then select only its unique exact demo volume instance. Delete only native snapshot IDs returned for that verified instance, and independently re-query zero. Unrecognized additional volumes, external persistence, denied access or unresolved snapshot IDs block complete closure. Preserve the database volume itself, credentials, accounts and unrelated environments. No production operation is repeated.
- AC7: New workflow operations/jobs are exact-branch and exact-demo-environment restricted. Existing production operations and immutable read-only inventory source are unchanged. Browser verification runs in hosted GitHub Ubuntu with standard TLS and pinned Playwright1.61.1. Use the normal simulator admin UI; assert actual expected backend and empty patients/therapy/drafts as supported; screenshot after reload, safe trace/video without credential-bearing request capture, no relevant console/page/HTTP errors, logout finally.
- AC8: Full synthetic PostgreSQL tests cover all43 tables, multi-level cascade/restrict/self relations, orphan imports/drafts/mixed records, rollback and exact preserved content/trigger/FK invariants. Add negative target/catalog/preserved-FK and storage/snapshot scope tests. Root reviews source plus new independent QA BEFORE any new remote execution. Only root can publish/dispatch/close based on actual live evidence.

## Test Plan
Unit + isolated PostgreSQL integration + controlled filesystem fixtures + browser fixture tests + workflow guard tests + independent QA mandatory. Actual live tests occur only after source/QA review. No real patient fixture is used.

## Evidence Plan
Keep live-inventory.json, new source hashes, unit/runtime outputs, before/after aggregate counts, preserved/FK/trigger verification, volume/snapshot metadata/counts, temporary-file aggregate counts, actual demo screenshot/video and sanitized trace, logout proof, independent QA report, final root decision. Do not claim source/backup cleanup from SQL-only success. The SHA manifest is consistency metadata from trusted reviewed code, not a cryptographic oracle against a replaced worker.

## Risks
Demo and production share service/project IDs; environment guards are mandatory at every mutation boundary. Temporary file paths and volume bindings are untrusted configuration until checked. Native backup deletion is irreversible and already user-authorized for this exact demo; unrelated volumes are preserved. Railway permissions may still block filesystem/volume access: report the concrete blocker and leave the issue open. No shared NSS trust change or TLS bypass is permitted; use hosted standard TLS.

## Gate Status
READY FOR IMPLEMENTATION — remote execution blocked pending root review and independent QA
