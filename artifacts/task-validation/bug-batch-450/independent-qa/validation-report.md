# Independent QA — FAILED VALIDATION

Batch: bug-batch-450; issues #450, #472, #473, #475, #476. Implementation/validation attempt 1. Reviewer: independent intake_450_qa session. Baseline a516d42e31f6674c39c1d130c9706cd80a7ab4c6. Root's stable-source authorization was received before any execution. All 47 authorized source hashes and seven frozen packet hashes match before/after; see `candidate-before.json` and `candidate-after.json`.

## QA450-1 — rejected close/save can overwrite the operator's later conflict decision

Severity: high correctness/clinical review integrity. Introduced caller path: `frontend/src/components/shared/DischargeImportModal.tsx:72` and `frontend/src/components/shared/import/ImportReviewWorkspace.tsx:284`.

The new header/footer/Escape close callback invokes the registered draft saver even when review conflicts remain unresolved (`canProceed=false`). Unlike normal `proceed` at line 104, `onSaveDraft` does not guard this condition. The backend rejects draft creation with `409 unresolved_conflicts`; however the existing `ImportReviewHandoff.complete` has already stored the rejected patient/cartella intent and retains `pending=true` (handoff source lines 44–57). Resolving a conflict updates `_review` and `reviewHash`, while preserving the extraction's `_source.resultHash` (`backend/src/ai/upload/pages/review.ts:84`). A subsequent retry therefore accepts the same source and patches the newly seeded, correctly resolved draft with the old rejected review intent. This can silently replace the operator's resolved identity/clinical review values with earlier values.

The diagnostic test `unresolved-save-reproduction.test.ts` invokes the actual production `ImportReviewHandoff` class and API client. Only HTTP replies are controlled: first POST is the backend's definitive 409; after resolution the second POST returns a draft seeded with `firstName=Corretto`. The subsequent actual PATCH instead contains `firstName=Prima`, even when the retry supplies the updated `Corretto` review. `logs/unresolved-save-reproduction.log` records one passing **bug reproduction**, not a passing application acceptance test. Source review traces the newly reachable close/save callback to this behavior.

Required correction: prevent this unready close/save path from starting a handoff or otherwise safely distinguish a definitive refusal from an uncertain write, without weakening conflict gates, losing reviewed edits or breaking existing lost-response recovery. Add a real regression for close/save with unresolved/unsaved decisions followed by explicit conflict resolution and continuation. Do not copy an old review over the resolved source. Root must reserve the next attempt before implementation changes.

## Phase results

| Phase | Result | Evidence |
| --- | --- | --- |
| 0 Contract | PASS | `task-contract.md`; all five current issues/comments, including owner override for #450 |
| 1 Diff review | FAIL | QA450-1 above; full current diff reviewed, 47-path scope check and seven frozen hashes valid |
| 2 Build/tests | Partial PASS; full gate incomplete | Frontend typecheck PASS, frontend build PASS, full frontend 1386/1386 PASS, backend typecheck PASS; targeted backend 63 PASS plus corrected mocked-router recheck 6/6 PASS. Historical proactive suite unrun after driver stopped. |
| 3 Playwright | UNRUN | Canonical browser was never started in this independent run. Author screenshots/traces/video remain historical, not independent proof. |
| 4 Security | Source review PASS; runtime phase incomplete | No new secrets/dependency/schema/auth/CORS/TLS weakening. Source owners, byte bounds, no-store and cache cleanup retained. Real fonts independently verified. Canonical live HTTP source isolation/security evidence not run. |

### Commands and exact limitations

- `frontend-commands.json` and `logs/frontend-{tsc,build,all-units}.log`: all exit 0; 1386 tests, 0 fail, 0 skip.
- `backend-tsc.json`, `logs/backend-tsc.log`: exit 0.
- `commands.json` records the outer-serialized owned PostgreSQL16 container on 127.0.0.1:55450, SQL database/version check, migrations, targeted run, ownership check and successful container stop. The development database on port 5432 was not accessed. No services from this independent reviewer remain running.
- The first focused backend command had 69 tests: 63 pass, 6 fail. Those six failures were a QA helper configuration error: the mocked-router fixture posts legacy demo headers but the helper had incorrectly forced the Role Simulator flag true. The six unchanged tests were rerun in their existing demo-header fixture mode (`ROLE_SIMULATOR_ENABLED=false`, `AUTH_MODE=demo`, `NODE_ENV=test`) and all passed. See `backend-fixture-correction.json`, the original failed log and `logs/backend-legacy-header-fixture-recheck.log`. No application authorization code or production configuration was modified.
- The helper stopped on that first failed command and cleaned its owned database container in `finally`; consequently proactive 23/U and canonical full-stack browser tests are explicitly unrun. They must run after correction. This report does not claim 69 passed in one initial command.
- `font-provenance-independent.json`: seven actual WOFF2 files match the retained npm package bytes, both package SHA512 integrities and two OFL licenses verified independently. No blank font substitution or TLS bypass.

The root coordinator owns durable attempt accounting, correction assignment, later independent validation, publication, exact-SHA Claude review and verified release. No GitHub issue/PR/state mutation, commit, push, Claude invocation, deployment or closure was performed by this reviewer.

**FAILED VALIDATION**
