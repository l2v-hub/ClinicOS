# Task Contract

## Task
- Title: Demo #470 read-only completion inventory
- Slug: maintenance-470
- Type: maintenance
- Date: 2026-10-17
- Owner: Codex root, durable claim `maintenance-470`
- Branch: `codex/demo-470-completion`
- Baseline: `ca7783718ed6c1834dc87194cbe96093e5bc9517`

## Impact Classification

| Area | Impacted |
|---|---:|
| Frontend/UI | no |
| Backend/API | no |
| Database/Persistence | yes |
| Agnos AI / Chatbot | no |
| Voice | no |
| OCR / Import | yes |
| Auth / Permissions | yes |
| Privacy / Security | yes |
| Config / Env | yes |

## Current Behaviour

The actual demo patient API is empty and the existing `RAILWAY_DEMO_TOKEN` binding now verifies the online target, observed in Actions run 39015026575 (`deleted: 0`). This does not establish that import/draft/orphan data or backups are empty. Production was already cleaned and is excluded. Prior issue #470's credential blocker is no longer current.

## Expected Behaviour

A private, temporary read-only worker inventories every public demo table and patient-linked counts, without printing credentials, document bytes or patient rows. Unknown schema or any possible clinical content prevents an empty-data claim. No cleanup/deletion is implemented by this patch. No production operation, persistent backup, volume or public endpoint is created.

## Acceptance Criteria

- AC1: Exact authorized target is verified before infrastructure mutation: project `bddf5d1b-ee83-4362-8238-a79721f795e5`; environment `8021987e-8eaa-4bc8-a102-20566db5e6b4` named `demo`; backend service `c000f011-0349-4ea9-9b56-13c625b5767b` named `clinicos-backend`; required domain `clinicos-backend-demo.up.railway.app`; PostgreSQL private host `postgres.railway.internal`, database `railway`.
- AC2: The worker independently verifies runtime project/environment/service identity, database name and read-only transaction. All data queries return aggregate counts only; catalog queries return schema/FK metadata. Rollback and connection close are attempted after every connected result/failure.
- AC3: Every public table is inventoried; missing required tables, unknown classifications, any patient/import/draft count, or any mixed audit/note/recipient-state count prevents a complete empty-data claim. Parent log validation recomputes this result, rejects duplicate/omitted/misclassified tables and contradictory empty claims, and projects only allowed fields.
- AC4: Only a newly created uniquely named private service receives the existing backend database reference. No credential values are exported. The worker has no persistent volume or public endpoint. `finally` deletes exactly that service in the demo environment and verifies explicit demo-scoped absence and affirmative API deletion.
- AC5: The workflow adds only `demo-inventory`, restricted to `codex/demo-470-completion`, the existing demo environment and secret. Every old production/backup/snapshot branch guard remains unchanged. This maintenance workflow must never replace main's deploy workflow.
- AC6: Root reviews the final diff and dedicated independent QA before any commit/push/new-code dispatch. No issue closure is justified by API-only evidence; backup removal remains an explicitly separate unverified requirement.

## Test Plan

| Test type | Required | Reason |
|---|---:|---|
| Unit | yes | Wrong-target rejection, result validation, failure cleanup, workflow guards |
| Integration | yes | Disposable synthetic PostgreSQL inventory, orphan detection, READ ONLY boundary |
| API | yes | Existing trusted workflow confirms binding and empty actual patient API |
| Playwright | yes | Actual online empty list and reload, when official CA trust is available |
| Persistence after refresh | yes | Browser must reload empty list; inventory performs no writes |
| Agnos action registry | no | No AI action changes |
| Voice simulation | no | No voice changes |
| OCR/import test | no | Inventory counts import records only, no parsing changes |
| Security/privacy scan | yes | No secrets, PHI, raw errors, credentials or writes in new source/logs |

## Evidence Plan

Required evidence: unit/runtime test outputs, exact target/source SHA, sanitized Actions run results, root diff review and independent QA report, final actual demo screenshot with no patient records, and explicit remaining backup scope. Trace/video must never capture real credential-bearing network traffic. Use a safe synthetic QA-only surface for internal inventory evidence if needed. Never claim a screenshot exists when browser trust fails.

## Risks

Demo and production share a Railway project/service identity but have distinct environment IDs; all mutation/worker guards therefore pin the exact demo environment. Mixed records might contain clinical text without IDs: conservative nonzero counts block the empty claim. Unknown schema is a blocker. API deletion rejection or unavailable binding must remain visible. The unrelated root cleanup SQL and original maintenance branch remain untouched.

## Gate Status

READY FOR IMPLEMENTATION
