# Independent contract, diff and security review

QA session: ci_note_isolation_qa1. Reviewed baseline 8124b1bc88c0f086b1ee328214f87f4802005d11 and the unstaged one-file candidate. The task is a new bounded operational test-isolation fix; it does not consume, restart or replace the frozen release-guard, maintenance, clinical or review budgets.

## Contract and observed failure

Both frozen task-contract.md and implementation-plan.md were read independently. The private actual native run 39028043893 log was inspected: `notes keyset pagination, exact summary, indexed search and malformed queries` failed with actual 58 versus expected 57 at the original notes privacy assertion. The original Git blob still contains exact `assert.equal(first.summary.unread, 57)`. No source issue is independently claimed or closed by this operational packet. Full native backend and browser CI are separate required gates after publication; the synthetic scheduling evidence below does not establish that they passed.

## Diff

PASS — scripts/run-node-tests.mjs lines 66–67 add only the factual shared-broadcast comment and the existing notes privacy suite path to DATABASE_ISOLATED. Removing exactly these two lines reconstructs all original source bytes. All nine preexisting isolated suite names, discovery, CSS loader, backend defaults, frontend config selection, parallel phase, serial phase and `process.exit(first || second)` remain byte-identical. There is no production application, test assertion/body, package, schema, workflow or release-guard edit. The sparse checkout intentionally excludes application trees; these are not deleted tracked files. All 19 guard source Git object hashes match the accepted candidate-4 manifest.

The added suite runs after the complete concurrent phase and serially with existing global database suites. This removes the observed global-mailbox interleaving without weakening unread totals or privacy assertions. The independent fixture probes use real production-runner child processes and synthetic local files; no database access, network fixture, process mocking or source-string-only pass is used. Source reconstruction is an additional scope check, not the scheduling proof.

## Security checklist

- Secrets: PASS. The diff contains one existing test path and a comment, with no credentials. Child fixture environments use an explicit minimal allowlist; no inherited GitHub, provider or database credentials are copied to fixture logs.
- PHI: PASS. Only synthetic process/event labels and generated local fixture markers; no patient records or production database access.
- Logging: PASS. No product logging change. QA output contains test labels, statuses, process IDs and local paths only.
- Validation: PASS. No new production input boundary. QA executes fixed fixture code under generated owned temporary paths, finite per-test deadlines and a 20-second outer process bound.
- AuthZ: PASS. Original backend fail-closed/default handling retained byte-for-byte; explicit child environment overrides are separately verified.
- Injection/XSS: PASS. No new SQL, shell interpolation of user input or product HTML. QA surface serves fixed HTML and writes only numeric/status values through textContent; executes a fixed production runner path.
- Dependencies: PASS. No package/lock changes or installation. Existing tsx, Playwright and Chromium only.
- Config: PASS. No weakened TLS, CORS, checks, release gate or production setting. QA HTTP server binds only 127.0.0.1 on an ephemeral port, uses no-store, requires a synthetic fixed header for its fixed POST action, and is closed in finally. Browser lifetime is serialized under the shared lock.

## QA fixture history

The initial independent frontend overlap oracle relied on a 150 ms delay. The actual fixture passed its runner tests but process startup skew made the event-order oracle fail. The full initial logs are preserved under history/initial-frontend-overlap-oracle/. The QA-only fixture now uses a bounded two-child barrier, which tests concurrent execution directly rather than assuming a startup latency. No candidate source or product test changed. The original old-runner RED and candidate GREEN use identical fixture test bodies.
