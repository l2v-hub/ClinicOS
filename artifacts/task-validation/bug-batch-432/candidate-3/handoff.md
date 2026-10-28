# Candidate3 handoff — IMPLEMENTED / NOT VERIFIED

Implementation3/4, review0/4. Candidate2 checkpoint `5a250319bae5b3f61f2c5864aee438f04d948df5`. Independent QA2 is FAILED VALIDATION and its reports, canonical attempts, original candidate2 seal/source manifest and all previous history remain untouched.

## Narrow correction

Only two scoped source files changed: `backend/src/skills/__tests__/skills-e2e.test.ts` and `e2e/qa-bug-batch-432-browser.mjs`. Both helpers replace the unbounded callback wait with `bounded(Promise.resolve().then(run), 'Confirmation callback did not complete')`. Rejection handlers attach before invocation, including eventual rejection after callback timeout; every async entry/run/assertion/timeout failure reaches barrier release and bounded correction settlement. Primary error identity is retained, or both failures are retained through AggregateError with the primary as cause. The existing5s phase bounds and original20s clinical outer timeout remain unchanged (at most15s for the three helper phases).

Actual-helper adversarial checks cover never-settling callback after entry, callback rejection after timeout without unhandled rejection, callback rejection before timeout preserving its identity, callback timeout plus correction cleanup rejection, and never-settling correction cleanup preserving the callback primary failure. Existing entry/rejection/completion and cleanup checks remain. The original real clinical H1 body is byte-identical, including120/80, actor, late correction/replay completion, exactly one reading and immutable first-record assertions.

## Evidence

- `red-callback-timeout.txt` and `red-{backend,browser}-observation.json`: actual OLD helpers extracted before editing, strict-unhandled run exit1, two cancelled tests, both measured released=false/settled=false. Synthetic lifecycle evidence only, no DB/application claim.
- `green-lifecycle.txt`: actual NEW helpers extracted from both scoped files plus existing/new adversarial tests,4/4 pass, zero fail/cancel/skip under `--unhandled-rejections=strict`. Synthetic Promise lifecycle only.
- `backend-types.txt`: actual `tsc -p backend/tsconfig.json --noEmit` exit0.
- `real-h1/test-results/focused-real-h1.txt`:3/3 actual selected H1 tests pass against a freshly created owned PostgreSQL16 database and the local mock runtime; clinical race590ms, original120/80, actor, replay, one-write/immutable-record assertions retained. The explicit test-name pattern selects H1 only; other tests are not claimed executed.
- `real-h1/test-results/validation-summary.json`: focusedOnly=true, targetedAssertionsPassed=true, lifecycleAndScopeClean=true, verified=false. Source hashes matched before/after; the whole Docker lifecycle stayed under the global browser flock. Owned resources were cleaned. No frontend/browser or full suite was repeated by this implementer.
- `source-manifest.json` and `seal.json`:37 current source hashes, exactly2 changes relative to candidate2,35 unchanged; zero outside-scope paths. `preserved-packet-hashes.json` checks old contracts/notes/candidate2 seal/source manifest unchanged. Original clinical H1 source hash is also recorded.

Node syntax, Prettier and git diff checks pass. No application implementation, lockfile, dependency, public limiter, outer clinical timeout, skip, credential or production configuration was changed. No commit/push/GitHub mutation/model call/deployment/issue closure was performed.

## Next gate

Source is sealed; author runtime and edits STOP. A fresh independent QA3 must review all37 source paths and run the complete canonical workflow. QA2's1932 backend results and partial browser flows remain historical and failed overall; they do not certify candidate3. All seven issue acceptance scenarios and evidence require the new full QA3.

For this cloud, export the existing browser paths BEFORE the Node process imports Playwright:

```sh
QA_PYTHON=/workspace/.venvs/clinicos-ai/bin/python3 PLAYWRIGHT_BROWSERS_PATH=/workspace/.cache/clinicos-batch432-playwright PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium node e2e/qa-bug-batch-432.mjs --test
```

Trusted hosted CI should retain its own supported installed browser-cache path. No download/trust bypass is needed. Root owns checkpoint/integration into447, independent QA3, exact-SHA external review, required CI, migration/backend/frontend rollout and verified deployment before closure.
