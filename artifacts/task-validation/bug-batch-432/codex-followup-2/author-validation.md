# Author validation — PR483 continuation6

Source is frozen and ready for a new independent QA6 session. This report records author validation, not independent certification or release approval. Global QA5 remains FAILED with its original seal unchanged.

The six-file source digest is `1101ac764318611bfac1e4799c245823a23cad4fd19b48b6dbd940ffe99ad95f`. Exact file hashes, all4,743 source/config/test/fixture/harness inputs and phase origins are in the already frozen `source-handoff.json`. Root reservation nonce is `f4d74317-96d1-4111-a80d-a7ec1acde163`; base proof commit is `c212e3141b6c7fdd88b4b1a4eaef73e5616a04f7`. Candidate5 source `2c8a4b2b91fcda5e527b323031992a757e47fe90` and its failed independent outcome remain preserved.

## Final change

Exactly four production paths and two test paths changed:

- `frontend/src/App.tsx` supplies a required read-only verification feed at both actual Agenda call sites. The projection contains only verification groups. The existing bounded loader now tracks accepted and requested day/scope, rejects mismatched append, and clears obsolete continuation loading on a new first-page request. Existing parser, roster recovery, abort, sequence and epoch guards remain in use. The optional day argument ignores a React click event so existing Terapia continuation remains functional.
- `frontend/src/components/operator/OperatorAgenda.tsx` and `frontend/src/components/admin/AdminAgenda.tsx` render the shared read-only feed for the selected day. Legacy timed props remain unwired in App.
- New `frontend/src/components/shared/AgendaTherapyVerification.tsx` owns day-view initial/re-entry/reload and scope effects, renders explicit pending/error/denied/accepted-empty states, and guards accepted date/scope before the effect can run. Append retains accepted rows and exact totals on failure.
- New `frontend/src/components/shared/__tests__/agendaTherapyVerification.test.ts` exercises the actual guard and server-rendered block; `frontend/src/lib/__tests__/therapyNavigationGuard.test.ts` checks the actual App call sites and retained bounded-loader/navigation protections.

No backend, schema, generated client, dependency, wire representation, policy/#486, old therapy panel/modal, old date guard, UX447 worktree or unrelated source changed. App supplies no timed slots or administration callbacks to either Agenda. Existing appointment grids and filters remain independent.

## Acceptance mapping

| AC | Source and actual author evidence |
| --- | --- |
| AC1 reachability | Required feed at both App JSX sites; full type check; final actual cold `#/agenda-operatore` and `#/agenda-admin` without Terapia, selected-day bounded read, exact five verification items after continuation, actual route reload through authentication. |
| AC2 UX447/read-only | Verification-only projection and shared panel. Both real Agenda DOMs: zero timed therapy cards, zero administration POSTs; SQL after all cases: zero administrations and zero receipts. Real null time/band/dose/read-only items and ten denied write attempts are asserted. |
| AC3 date/scope | Initial, tomorrow/next/today, week/month/day, Terapia return, actual reload and mobile are exercised for both routes. Held old-day and append responses cannot replace/merge the new day; old-session five-item response cannot repopulate a deleted item after new-role login loads four. Week/month hide single-day controls. |
| AC4 errors/partial/ACL | More than105 eligible synthetic candidates; first page contains one of five verification details, exact total remains five, continuation yields every item once. Persistent initial503, append503 and403 are deliberately intercepted and disclosed; retry and stale-name exclusion pass. Real owned SQL roster epoch mutation produces actual409 `roster_changed`, then bounded recovery. Direct real SQL read-model ACL denies empty/cross-owner intersections; ten actual ambiguous HTTP writes are denied. |
| AC5 regression/validation | Fresh full frontend1,400 PASS, types/build PASS. Fresh round6 backend1,932 PASS plus five unchanged optional skips with explicit later phase inheritance. Canonical seven-issue and clinical browser phases ran on the final product source; final dedicated Agenda browser/SQL ran in a fresh owned stack. Independent QA6 is pending and must judge the fixed candidate separately. |
| AC6 provenance/history | Source-before/after manifests, dependency/borrowed-input closure, per-phase reuse receipts, immutable source-handoff, separate failed attempts and media audit retained. All7,218 prior proof files and four hardlinked prior snapshot targets verified unchanged. No counter reset and no relabeling QA5. |

## Execution origins and preserved failures

All runs are under `/workspace/.clinicos-cloud/pr483-codex-followup2-20261018/runs/`. Runtime below each `author-N/source/artifacts/task-validation/bug-batch-432/codex-followup-2/runtime/` is a fresh output namespace, not a historical writable path.

| Phase | Exact origin | Result and inheritance |
| --- | --- | --- |
| Final frontend | Packet `frontend-phase-2/` logs | Fresh1,400 PASS/0FAIL/0SKIP; noEmit and build PASS. Earlier frontend logs remain retained, superseded by this final-source execution. |
| Backend full suite | `author-1` actual backend phase | Concurrent1,884 PASS plus five optional skips; serialized48 PASS; total1,932 PASS/0FAIL/5SKIP. Later stacks explicitly mark this phase `executedHere:false`. |
| Canonical seven-issue browser and clinical findings | `author-2` actual browser phases | Both PASS on final product/config/test/fixture identity. `author-3/current-round6-browser-phase-origins.json` records source hashes and origin; these are not fresh executions inside run3. |
| Final actual-App Agenda | `author-3` actual migration/import/seed/browser/SQL | Five scenarios PASS; actual final source-after exit0, changed=[], originChanged=[]; all owned services/container/browser removed and lifecycle lock released. |

Backend inheritance is bound to24,182 installed dependency file hashes,98 generated Prisma/client/adapter file identities and the27-file transitive frontend input closure actually imported/read by backend tests, with source/config/test/fixture identity checked. App.tsx is outside that closure. No backend result is inherited from the global failed QA5. Existing generated Prisma schema formatting is not raw-byte-equal to the source schema; client bytes were held unchanged and the real backend suite executed successfully with that existing client. No regeneration occurred.

`author-1` remains a failed overall invocation: backend phase passed, then the copied import helper rejected its redirected new output path before browser. Only the new owned copied helper's fixed-path assertion was corrected. `author-2` remains a failed overall invocation: canonical/clinical and both positive Agenda flows passed, then the initial negative one-shot503 was consumed by an obsolete bootstrap request. A subsequent legitimate read succeeded, so the retry-button oracle failed. Run3 corrected only the new harness interception ledger/persistence. No application fix or weakening of product assertions followed these setup failures. Both logs, traces, manifests and outputs remain untouched.

## Seven original issue regressions and clinical follow-up

The unchanged canonical browser assertion phase ran afresh in round6 run2; per-issue PNG/trace/WebM are under that runtime's `evidence/`. Full frontend/backend tests complement those browser assertions. Earlier issue closure requirements for independent review/deployment are still separate gates.

| Issue | Retained assertion/evidence mapping |
| --- | --- |
| #432 | Complete paginated saved inventory, PRN/bounds/read-only rows, malformed and stale patient responses, real import review/confirmation/replay and responsive/reload/print flows. `issue-432*` evidence plus actual import API phase. |
| #441 | Explicit one-off server identity and rejected contradictory/wrong schedules; fresh clinical read-only ambiguous calendar/giro/dashboard/assistant evidence; final actual Agenda adds missing production reachability. `issue-441*` and `clinical-followup/verification/`. |
| #442 | Interpreter/correction barrier safety under the real full backend suite; canonical retained assertions and `issue-442*` evidence. |
| #460 | Same immutable request replay and lost-response/reload retry, payload/auth conflict protection, first snapshot and receipt semantics. `issue-460*`, backend suite and fresh correction SQL. |
| #463 | Strict-empty catalog suppression distinct from unavailable/not-found, established lookup behavior preserved. `issue-463*` and full suites. |
| #464 | Facility Europe/Rome day/minute and boundary/DST expectations, shared assistant/feed/due behavior. `issue-464*` and full suites. |
| #467 | Recorded one-off status after schedule edits and distinct periodic/multidose identities remain guarded; reload evidence `issue-467*`. |

Fresh run2 `clinical-followup/results.json` confirms explicit refused-dose correction uses expectedStato=`non_erogata`, becomes `erogata`, survives reload/replay with exactly one record and one receipt. Its ambiguous-one-off scenario confirms four verification groups across calendar/giro/dashboard/assistant, eight denied writes, no unwanted records and no mobile overflow. The final Agenda fixture separately includes five ambiguous prescriptions and ten denied writes; counts refer to distinct isolated fixtures.

## Negative-test and platform limits

Initial503, append503 and403 UI responses are deliberate owned-browser interceptions. Their ledger distinguishes a canceled obsolete request from delivered failures; only delivered503/503/403 plus the real roster409 appear as expected console resource errors. Page errors are empty. The403 UI state is not claimed to be a live backend policy denial; actual ACL is independently asserted through the real scoped SQL read model and backend full suite. Positive admin-route testing uses the clinical Supervisor role, not a technical Admin user. Denied rendering is covered by guard tests; a fresh independent reviewer may additionally inspect technical/OSS role UI without inheriting an author verdict.

The owned PostgreSQL runtime used preexisting pinned official PostgreSQL16 Alpine image digest `postgres@sha256:721873c34ceb9f8d8fc265984940dc982404c105f19ad51be9fdc5970a6080ea` with asserted imageID/SQLmajor16, pull=never and bounded512MiB tmpfs. Alpine/libc differs from historical Debian runtime. All stated SQL assertions ran on this actual runtime; no DB-container restart or disk-durability claim is made. Existing Node24.19/npm11.9, Chromium/cache and dependencies were reused without installs; only isolated synthetic services/mock providers were used. Baseline clinicos-postgres was untouched.

Independent QA6 must run its fresh full frontend and actual-App/browser/SQL evaluation in a new session and output namespace. Author's run3 global summary is not independent certification. Root owns further state, review, commits, publication and deployment.

## Media and immutable handoff

`author-artifact-audit.json` records hashes for successful run2 canonical/clinical and final run3 Agenda media:44 unique media hashes,1,848 decoded images including trace members, nine decoded unique videos, ten CRC-checked unique ZIPs/2,279 members, no secret-pattern findings, synthetic-only data, every media file at most25MiB. Failed-attempt artifacts remain private and unchanged. Representative final operator/admin readonly, initial-error and held-old-session screenshots were also visually inspected.

This report and `author-report-seal.json` are new metadata created after source freeze. They do not modify the frozen source-handoff, contract, plan, harnesses or provenance. All application/test/harness writes and runtime execution have stopped.
