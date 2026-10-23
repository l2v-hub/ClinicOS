# PR483 clinical continuation — author handoff

**READY FOR CODEX QA. Independent QA is pending.** Application and test source is stopped. No commit, push, GitHub/controller update, production query, deployment, or paid-provider operation was performed. This is the same reserved continuation round 5 on the original batch, with all earlier review cycles and runtime failures retained.

The two reviewed findings are implemented: explicit refused-dose correction carries an observed `non_erogata` precondition, and ambiguous one-off prescriptions use a distinct read-only verification union across authorized SQL/read models and their consumers. No clock, band, quantity, or administration action is invented for verification items. Existing five writable bands, daily one-off identity, authoritative dosage, ACL checks, immutable receipts, and valid periodic multidose behavior remain intact.

## Frozen candidate

- Worktree: `/workspace/ClinicOS/agent-team/.worktrees/bug-batch-432`; HEAD/base `34c865233df53a3930f29c8b7befc02208588d64`.
- Forty-one changed/new application and test files; no schema, dependency or generated-client change.
- Changed source digest: `333b7c06f4d16e1ba54f857f594093008758e2a2165c3962a623e82f9d6a57f0`.
- [source-handoff.json](source-handoff.json) contains every changed file SHA256, the digest algorithm, exact 4,736-file code/config/test/fixture input provenance, contract/amendment hashes and successful phase origins. Reused phases are explicitly marked `executedHere:false`; complete input equality was checked before reuse and source equality after each run.
- [implementation-matrix.md](implementation-matrix.md) was copied into this new packet before code. [scope-amendment-1.md](scope-amendment-1.md) additionally authorizes the cartella anomaly hook and focused test. The old packet/contract/reservation was not rewritten.

## Implementation and acceptance mapping

| AC | Concrete implementation | Author evidence |
| --- | --- | --- |
| AC1 | Client builder defaults to pending; only `PatientTherapySlotDetail.administerAgain` supplies refused state, including confirmation/glucose branches. Parser permits refused state only on confirm. Writer requires an actual refused record before update, preserves current-scope replay, already-given denial and immutable receipt semantics. Request identity includes expected state. | Full backend run 4 includes actual client-built correction, missing refusal409, pending-only refusal409, not-administered correction400, two concurrent identical requests returning one immutable result, one record/receipt, stale/new-key/payload409 and revoked-scope404. Actual browser run 10 refuses, clicks Somministra ora, asserts body/state200, reloads the administered nurse/time badge, checks same SQL record and receipt, then replays200 without mutation. |
| AC2 | `TherapyReadGroup` separates scheduled slots from verification groups: null time/band/dose/quantity, `canAdminister:false`, one therapy item/day. Strict parser rejects writable/malformed verification fields. Missing, invalid, conflicting and multiple schedules are excluded from writer resolution. | Pure classifier/parser tests; real backend SQL/read/summary/page and denied-write tests. Run 10 shows four categories and directly checks null fields, eight HTTP409 writes and zero records. |
| AC3 | Valid H:MM canonicalization agrees between TS and parameterized SQL and is used by reads, authoritative writes and new save paths. Patient calendar classifies one-offs before generic schedules. Scheduled page merge preserves same-therapy distinct times. | Full backend: legacy8:30, valid explicit one-offs in every band, exact quantities and independent same-band periodic writes. Full frontend: calendar conflict/agreeing schedule, parser/merge and periodic multidose regressions. Run 10 checks legacy8:30→08:30 and no fabricated12:30 event. |
| AC4 | Exact authorized count-before-limit verification SQL; same candidate-page details and roster transaction; first-page summary preserved across continuation merge. Due query, facility snapshot, operator queue, visible Agnos brief, dashboard, calendar, Giro/week, Agenda/admin and drug detail partition verification from timed actions. Proactive timestamps use scheduled groups only. Hook retains readonly drug references with null dose and catalog-empty dedup behavior. | Actual SQL/page/ACL tests and full types/builds; frontend parser/merge/render/builder/calendar/hook tests. Run 10 visibly checks cartella calendar, Giro, Turno and actual sidebar Agnos brief; no verification buttons and no mobile overflow. Agenda/admin/week/drug surfaces were compiled and reviewed but do not have dedicated new browser captures; independent QA should inspect them. |
| AC5 | All seven original issue assertions retained; new correction/verification scenarios appended in a versioned harness. | Fresh full backend run 4, source-identical full frontend/build run 3, unchanged canonical browser run 6 and dedicated clinical/browser/SQL run 10, listed below. |
| AC6 | No inferred route/prescription/quantity; no schema change. Route-policy work in #486 is separate. Old artifacts are never execution targets. Fixed-path suites run inside an owned source snapshot with fresh outputs. | Final SHA check of all 7,119 prior proof files: zero missing/changed. Original and executed source unchanged on successful runs. New artifact decode/CRC/secret-pattern audit passed. |

Production file map is the authoritative 41-file mapping in `source-handoff.json`; the detailed producer/consumer rationale and tests are in the implementation matrix. `backend/src/skills/http.ts`, UX447/481 and unrelated worktrees were untouched.

## Actual validation

All paths below are under `/workspace/.clinicos-cloud/pr483-codex-followup-20261018/runs/`.

| Executed phase | Actual result and retained origin |
| --- | --- |
| Backend and frontend types/builds | PASS; actual complete builds in `author-3/runtime-packet/test-results/`. Existing matching generated Prisma client used without regeneration. Later source-bound comparisons exclude only changed backend test expectations from build/frontend reuse; root tsconfig is also checked. |
| Full frontend | **1,396 passed, zero failed/skipped**, executed in author-3. All frontend source/config/tests stayed identical through final source. Earlier obsolete contradictory-schedule expectation failure is retained separately. |
| Full backend | **1,932 passed, zero failed, five unchanged opt-in skips**: author-4 `backend-unit.txt` contains concurrent1,889/1,884PASS/5skip and serialized48/48PASS. Both new clinical regressions passed under full suite load. |
| Canonical seven-issue browser/SQL | PASS in `author-6/runtime-packet/`: unchanged inventory/retry browser assertions, thirteen additional scenarios, real held-runtime correction and midnight/DST SQL assertions. Fresh migration/import/seed and current synthetic stack. |
| Dedicated clinical browser/SQL | **PASS** in `author-10/runtime-packet/clinical-followup/results.json`: one corrected record/receipt/replay; four readonly ambiguous items; eight denied writes; no unwanted records; canonical08:30; no mobile overflow; both contexts have `browser-errors.json=[]`. Migration/import/seed actually executed anew. |
| Import reconciliation | Each successful lifecycle actual HTTP+SQL: five detected, three reviewed/persisted, two explicitly deferred; replay idempotent; missing included rows and stale omission lists rejected. |

The final dedicated run explicitly inherits full backend from author-4, frontend/builds from author-3, and canonical browser from author-6 only after complete relevant source/config/test/fixture equality. Its `reused-*-provenance.json`, `run-results.json`, exact copied backend transcript inheritance sidecar and before/after manifests state those origins. It does not claim repeated fresh execution of inherited phases. Independent QA must rerun the full applicable suites in its own session.

### Seven issue regressions

| Issue | Retained fresh result |
| --- | --- |
| 432 | Complete105/106 inventory coverage, paginated patient/foreign/short-page fail-closed retry, patient switch/mobile/print and5→3+2 import reconciliation; verification count/page details added. |
| 441 | Valid explicit one-offs with empty flags, authoritative clocks in every band, TS/SQL/read/write parity; four readonly ambiguity forms and normalized8:30 in new browser/SQL. |
| 442 | Full-load deterministic interpreter barrier plus actual runtime late correction/replay in canonical browser: one clinical write, persisted120/80 and original nurse author. |
| 460 | Existing lost-response/reload retry browser and immutable receipt regressions; explicit refused correction concurrency/missing/stale/ACL cases and new real browser correction. |
| 463 | Empty catalog makes zero lookups for nurse/doctor/OSS/supervisor; available/malformed/unreachable catalog real-name search retained; public throttling and new hook readonly references pass. |
| 464 | Clinical midnight00:30→00:45 dueSoon15 and00:46 overdue1; Rome DST boundaries pass; verification creates no minute arithmetic. |
| 467 | One daily one-off record across time/band edits; refusal updated in place; periodic08:00/10:00 same-band quantities, independent writes and paged merge preserved. |

## Evidence and preserved failures

[artifact-manifest.json](artifact-manifest.json) binds58 media paths from successful canonical author-6 and dedicated author-10. The audit in `/workspace/.clinicos-cloud/pr483-codex-followup-20261018/analysis/author-evidence-audit.json` decoded1,334 images including trace members, decoded8 unique videos, CRC-checked8 unique ZIPs/1,690 members, found no secret-pattern matches and confirmed each media file≤25MiB. Correction, assistant and mobile screenshots were visually inspected. All records are owned synthetic fixtures or seeded demo records; no real patient/provider data was accessed.

Every failed runtime attempt remains separately retained with logs, harness variants and source provenance: author-1 initial disk failure; author-2 generated build disk failure; author-3 omitted copied catalog and obsolete test expectations; author-4 default recorder-cache path; author-5 absent inherited backend transcript for canonical summary; author-6 dedicated protected-link-before-login; author-7 missing simulator identity setup after canonical reuse; author-8 nonexistent status-text locator; author-9 overlapping temporary disk allocation. These are not new review cycles or reset counters. Final author-10 completed. Verified hardlink dedup only shared byte-identical author-4/5 media; every original path/hash was preserved and linked media is immutable.

## Runtime and remaining gates

The actual isolated database used the preexisting pinned official PostgreSQL16 Alpine image `postgres@sha256:721873c34ceb9f8d8fc265984940dc982404c105f19ad51be9fdc5970a6080ea`, asserted image ID `sha256:81bd698b4594e751a3269e4dcd3e03a4a0ec0daf7b72e7aa1abd43cce9887542`, `--pull=never`, SQL major16, owner-marked `clinicos_qa_batch432`, loopback55432 and bounded512MiB tmpfs data. Alpine/libc differs from the earlier Debian fixture; all claimed SQL results here executed on this actual runtime. State persisted across app/browser reload; no database-container restart or disk durability is claimed.

The isolated app alone enabled its documented facility-read flag. Browser video used the existing cache at `/workspace/.cache/clinicos-batch450-playwright`; no install. Runtime providers were local synthetic mocks. The full lifecycle lock covered snapshot, DB, services, browser and teardown. All owned services/container/browser were removed and lock released; baseline `clinicos-postgres` remains untouched. Remaining disk after teardown was approximately643MiB; independent QA must budget the measured fixture footprint and avoid concurrent temporary allocations.

Pending: fresh independent QA, exact-source review/publication and root-owned release gates. This author report does not certify independent QA, production/provider behavior or deployment readiness.
